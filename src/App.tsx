import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  isAddress,
  type Address,
  type Hash,
} from "viem";
import { mainnet } from "viem/chains";
import {
  getBalances,
  getMarket,
  getQuote,
  readClient,
  type Quote,
  type WalletProvider,
} from "./chain";
import {
  CONTRACTS,
  permitAbi,
  POOL_ID,
  POOL_URL,
  routerAbi,
} from "./contracts";
import {
  buildSwap,
  displayAmount,
  errorMessage,
  minimumOutput,
  parseAmount,
  QUOTE_LIFETIME,
  type Direction,
} from "./trade";
import { Icon, TokenIcon } from "./Icons";

type ModalType = "wallet" | "settings" | "review" | "pending" | null;
type Approval = "checking" | "token" | "permit" | "ready" | "error";
type Pending = { hash: Hash; kind: "approval" | "swap" };
const short = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

function External({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <Icon name="external" size={14} />
      <span className="sr-only"> (opens a new tab)</span>
    </a>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const trigger = document.activeElement as HTMLElement;
    el.showModal();
    return () => {
      el.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const [direction, setDirection] = useState<Direction>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(50);
  const [modal, setModal] = useState<ModalType>(null);
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [provider, setProvider] = useState<WalletProvider>();
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [balances, setBalances] = useState<{ eth: bigint; imd: bigint }>();
  const [balanceError, setBalanceError] = useState(false);
  const [quote, setQuote] = useState<Quote>();
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [retry, setRetry] = useState(0);
  const [market, setMarket] = useState<Awaited<ReturnType<typeof getMarket>>>();
  const [marketError, setMarketError] = useState(false);
  const [marketLoading, setMarketLoading] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [approval, setApproval] = useState<Approval>("checking");
  const [tradeError, setTradeError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingAcknowledged, setPendingAcknowledged] = useState(false);
  const [pending, setPending] = useState<Pending | undefined>(() => {
    try {
      const p = JSON.parse(sessionStorage.getItem("imd.pending") || "null");
      return p &&
        /^0x[\da-f]{64}$/i.test(p.hash) &&
        ["swap", "approval"].includes(p.kind)
        ? p
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [lastHash, setLastHash] = useState<Hash>();
  const inputRef = useRef<HTMLInputElement>(null);
  const session = useRef(0);
  const buy = direction === "buy";
  const payToken = buy ? "ETH" : "IMD";
  const receiveToken = buy ? "IMD" : "ETH";
  const walletReady = !!account && chainId === 1;
  const activeProvider = walletReady ? provider : undefined;
  let parsed = 0n;
  try {
    parsed = parseAmount(amount);
  } catch {
    /* Validate inline on submit. */
  }
  const currentQuote =
    quote && quote.input === parsed && quote.direction === direction
      ? quote
      : undefined;
  const expired = !!currentQuote && clock - currentQuote.at >= QUOTE_LIFETIME;
  const minimum = currentQuote
    ? minimumOutput(currentQuote.output, slippage)
    : 0n;
  const available = balances ? (buy ? balances.eth : balances.imd) : undefined;
  const locked = busy || !!pending;

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      if (pending)
        sessionStorage.setItem("imd.pending", JSON.stringify(pending));
      else sessionStorage.removeItem("imd.pending");
    } catch {
      /* Storage is optional. */
    }
  }, [pending]);

  useEffect(() => {
    if (!provider) return;
    const invalidate = () => {
      session.current++;
      setQuote(undefined);
      setBalances(undefined);
      setModal(null);
      setTradeError("");
    };
    const accountsChanged = (addresses: string[]) => {
      invalidate();
      setAccount(
        addresses[0] && isAddress(addresses[0])
          ? (addresses[0] as Address)
          : undefined,
      );
    };
    const chainChanged = (id: string) => {
      invalidate();
      setChainId(Number(id));
    };
    const disconnected = () => {
      invalidate();
      setAccount(undefined);
      setProvider(undefined);
    };
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnected);
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
      provider.removeListener?.("disconnect", disconnected);
    };
  }, [provider]);

  useEffect(() => {
    let active = true;
    setBalances(undefined);
    setBalanceError(false);
    if (account && activeProvider)
      getBalances(account, activeProvider)
        .then((value) => {
          if (active) setBalances(value);
        })
        .catch(() => {
          if (active) setBalanceError(true);
        });
    return () => {
      active = false;
    };
  }, [account, activeProvider, retry]);

  useEffect(() => {
    let active = true;
    setMarketLoading(true);
    setMarketError(false);
    setMarket(undefined);
    getMarket(activeProvider)
      .then((value) => {
        if (active) setMarket(value);
      })
      .catch(() => {
        if (active) setMarketError(true);
      })
      .finally(() => {
        if (active) setMarketLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeProvider, retry]);

  useEffect(() => {
    let active = true;
    setQuote(undefined);
    setQuoteError("");
    setQuoteLoading(false);
    if (!parsed) return;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      getQuote(direction, parsed, activeProvider)
        .then((value) => {
          if (active) {
            setQuote(value);
            setClock(Date.now());
          }
        })
        .catch(() => {
          if (active)
            setQuoteError(
              activeProvider
                ? "Couldn’t get a live quote. Check your wallet’s network connection, then retry."
                : "Couldn’t get a live quote. Retry, or connect your wallet to use its network connection.",
            );
        })
        .finally(() => {
          if (active) setQuoteLoading(false);
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [direction, parsed, activeProvider, retry]);

  useEffect(() => {
    if (modal !== "review" || !account || !provider) return;
    let active = true;
    setApproval("checking");
    const check = async () => {
      if (buy) return "ready" as const;
      const client = readClient(provider);
      const tokenAllowance = await client.readContract({
        address: CONTRACTS.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, CONTRACTS.permit2],
      });
      if (tokenAllowance < parsed) return "token" as const;
      const [value, expiration] = await client.readContract({
        address: CONTRACTS.permit2,
        abi: permitAbi,
        functionName: "allowance",
        args: [account, CONTRACTS.token, CONTRACTS.router],
      });
      return value < parsed || expiration <= Math.floor(Date.now() / 1000) + 60
        ? ("permit" as const)
        : ("ready" as const);
    };
    check()
      .then((value) => {
        if (active) setApproval(value);
      })
      .catch(() => {
        if (active) {
          setApproval("error");
          setTradeError(
            "Couldn’t check approvals. Close this window and retry the quote.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [modal, buy, account, provider, parsed, retry]);

  async function connect() {
    setWalletError("");
    const p = window.ethereum;
    if (!p) {
      setWalletError(
        "No browser wallet found. Open this site in your wallet’s browser, or install an Ethereum wallet.",
      );
      return;
    }
    setConnecting(true);
    try {
      const addresses = await p.request({ method: "eth_requestAccounts" });
      if (!addresses[0] || !isAddress(addresses[0]))
        throw new Error("No account");
      const id = await p.request({ method: "eth_chainId" });
      setProvider(p);
      setAccount(addresses[0]);
      setChainId(Number(id));
      setModal(null);
      session.current++;
    } catch (e) {
      setWalletError(
        errorMessage(e, "Couldn’t connect. Unlock your wallet and try again."),
      );
    } finally {
      setConnecting(false);
    }
  }

  async function switchNetwork() {
    if (!provider) return;
    setWalletError("");
    setTradeError("");
    setConnecting(true);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }],
      });
      setChainId(Number(await provider.request({ method: "eth_chainId" })));
    } catch (e) {
      setTradeError(
        errorMessage(
          e,
          "Switch to Ethereum mainnet in your wallet, then try again.",
        ),
      );
    } finally {
      setConnecting(false);
    }
  }

  function changeDirection(next: Direction) {
    setDirection(next);
    setAmount("");
    setFieldError("");
    setTradeError("");
    setStatus("");
    setQuote(undefined);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setFieldError("");
    setTradeError("");
    if (!account) {
      setWalletError("");
      setModal("wallet");
      return;
    }
    if (chainId !== 1) {
      void switchNetwork();
      return;
    }
    try {
      parseAmount(amount);
    } catch (e) {
      setFieldError((e as Error).message);
      inputRef.current?.focus();
      return;
    }
    if (available !== undefined && parsed > available) {
      setFieldError(
        `Your ${payToken} balance is too low. Enter a smaller amount.`,
      );
      inputRef.current?.focus();
      return;
    }
    if (!currentQuote || expired) {
      setRetry((n) => n + 1);
      return;
    }
    if (minimum <= 0n) {
      setFieldError("The output is too small. Enter a larger amount.");
      inputRef.current?.focus();
      return;
    }
    setStatus("");
    setModal("review");
  }

  async function assertWallet(expectedSession: number) {
    if (!provider || !account || session.current !== expectedSession)
      throw new Error("Wallet changed");
    const [accounts, id] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ]);
    if (
      Number(id) !== 1 ||
      accounts[0]?.toLowerCase() !== account.toLowerCase() ||
      expectedSession !== session.current
    )
      throw new Error("Wallet changed");
  }

  function completed(tx: Pending, success: boolean) {
    setPending(undefined);
    setLastHash(tx.hash);
    setBusy(false);
    setRetry((n) => n + 1);
    if (!success) {
      setStatus("");
      setTradeError(
        "Transaction reverted. No swap completed; network fees may still apply. Refresh the quote before trying again.",
      );
      return;
    }
    if (tx.kind === "swap") {
      setAmount("");
      setModal(null);
      setStatus("Swap confirmed on Ethereum. Your tokens are in your wallet.");
    } else
      setStatus("Approval confirmed. Review the refreshed quote to continue.");
  }

  async function checkPending() {
    if (!pending) return;
    setBusy(true);
    setTradeError("");
    try {
      const receipt = await readClient(activeProvider).getTransactionReceipt({
        hash: pending.hash,
      });
      completed(pending, receipt.status === "success");
    } catch {
      setStatus(
        "Still awaiting confirmation. Check the transaction on Etherscan, then check again.",
      );
      setBusy(false);
    }
  }

  function managePending() {
    if (!pending || busy) return;
    setPendingAcknowledged(false);
    setModal("pending");
  }

  function stopTrackingPending() {
    if (!pending || busy || !pendingAcknowledged) return;
    setLastHash(pending.hash);
    setPending(undefined);
    setModal(null);
    setTradeError("");
    setStatus(
      "Transaction tracking stopped. This does not cancel the transaction; it may still confirm. Check your wallet activity before starting another trade.",
    );
    setRetry((n) => n + 1);
  }

  async function confirm() {
    if (!provider || !account || !currentQuote || busy || pending) return;
    if (Date.now() - currentQuote.at >= QUOTE_LIFETIME) {
      setTradeError("This quote expired. Refresh it before continuing.");
      return;
    }
    const revision = session.current;
    setBusy(true);
    setTradeError("");
    setStatus("Review the request in your wallet.");
    let submitted: Pending | undefined;
    let replacementReason: string | undefined;
    try {
      await assertWallet(revision);
      const client = readClient(provider);
      const wallet = createWalletClient({
        chain: mainnet,
        account,
        transport: custom(provider, { retryCount: 0 }),
      });
      let hash: Hash;
      if (approval === "token") {
        const { request } = await client.simulateContract({
          account,
          address: CONTRACTS.token,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.permit2, parsed],
        });
        await assertWallet(revision);
        hash = await wallet.writeContract(request);
      } else if (approval === "permit") {
        const { request } = await client.simulateContract({
          account,
          address: CONTRACTS.permit2,
          abi: permitAbi,
          functionName: "approve",
          args: [
            CONTRACTS.token,
            CONTRACTS.router,
            parsed,
            Math.floor(Date.now() / 1000) + 1200,
          ],
        });
        await assertWallet(revision);
        hash = await wallet.writeContract(request);
      } else if (approval === "ready") {
        const swap = buildSwap(direction, parsed, minimum);
        const tx = {
          account,
          address: CONTRACTS.router,
          abi: routerAbi,
          functionName: "execute" as const,
          args: [swap.commands, swap.inputs, swap.deadline] as const,
          value: swap.value,
        };
        const { request } = await client.simulateContract(tx);
        const [gas, gasPrice, eth] = await Promise.all([
          client.estimateContractGas(tx),
          client.getGasPrice(),
          client.getBalance({ address: account }),
        ]);
        if (eth < swap.value + (gas * gasPrice * 12n) / 10n) {
          setTradeError(
            "Leave more ETH in your wallet for the swap and network fees.",
          );
          setStatus("");
          setBusy(false);
          return;
        }
        await assertWallet(revision);
        if (Date.now() - currentQuote.at >= QUOTE_LIFETIME) {
          setTradeError(
            "This quote expired during the check. Refresh it and review again.",
          );
          setStatus("");
          setBusy(false);
          return;
        }
        hash = await wallet.writeContract(request);
      } else throw new Error("Approvals unavailable");
      submitted = { hash, kind: approval === "ready" ? "swap" : "approval" };
      setPending(submitted);
      setLastHash(hash);
      setStatus("Transaction submitted. Waiting for Ethereum confirmation…");
      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 120000,
        confirmations: 1,
        onReplaced: (replacement) => {
          replacementReason = replacement.reason;
          submitted = {
            hash: replacement.transactionReceipt.transactionHash,
            kind: submitted!.kind,
          };
          setPending(submitted);
          setLastHash(submitted.hash);
        },
      });
      if (replacementReason && replacementReason !== "repriced") {
        setPending(undefined);
        setModal(null);
        setRetry((n) => n + 1);
        setStatus(
          "The transaction was cancelled or replaced in your wallet. Check Etherscan to see what settled.",
        );
        return;
      }
      completed(submitted, receipt.status === "success");
    } catch (e) {
      if (submitted)
        setStatus(
          "Confirmation is taking longer than expected. Check Etherscan before taking another action.",
        );
      else {
        setStatus("");
        setTradeError(
          errorMessage(
            e,
            "The transaction could not be prepared. Check your network, balance and approvals, then refresh the quote.",
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTRACTS.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatus(
        "Copy unavailable. Select the full token address in Pool details below.",
      );
    }
  }

  const primaryLabel = !account
    ? "Connect wallet"
    : chainId !== 1
      ? "Switch to Ethereum"
      : !parsed
        ? "Enter an amount"
        : quoteLoading
          ? "Getting quote…"
          : expired
            ? "Refresh quote"
            : !currentQuote
              ? "Get quote"
              : "Review swap";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <a href="#" className="brand" aria-label="IMD Market home">
            <span className="brand-mark">
              <TokenIcon token="IMD" />
            </span>
            <span>
              imd<span className="brand-dot">.</span>
            </span>
            <span className="brand-divider" />
            <span className="brand-product">market</span>
          </a>
          <nav aria-label="Main navigation">
            <a className="nav-active" href="#trade">
              Trade
            </a>
            <a href="#pool">Pool</a>
            <a href="#about">
              About IMD
              <Icon name="chevron" size={13} />
            </a>
          </nav>
          <div className="header-actions">
            <span className="network-label">
              <TokenIcon token="ETH" small />
              Ethereum
            </span>
            <button
              className="wallet-button"
              disabled={busy}
              onClick={() => {
                setWalletError("");
                setModal("wallet");
              }}
            >
              <Icon name="wallet" size={17} />
              <span>{account ? short(account) : "Connect wallet"}</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <section
          className="trade-layout"
          id="trade"
          aria-labelledby="hero-title"
        >
          <div className="intro">
            <div className="eyebrow">
              <span className="small-diamond" /> An open market. A shared
              future.
            </div>
            <h1 id="hero-title">
              Trade IMD.
              <br />
              <span>On your terms.</span>
            </h1>
            <p className="intro-copy">
              Buy and sell directly on Ethereum.
              <br />
              Your wallet. Your tokens. Your next move.
            </p>
            <div className="intro-features">
              <span>
                <Icon name="shield" size={16} />
                Self-custody
              </span>
              <span>
                <Icon name="layers" size={16} />
                Powered by Uniswap v4
              </span>
            </div>
            <div className="market-card">
              <div className="market-top">
                <div className="market-identity">
                  <TokenIcon token="IMD" />
                  <div>
                    <strong>IdentityMD</strong>
                    <span>IMD / ETH</span>
                  </div>
                </div>
                <span className="market-badge">Uniswap v4</span>
              </div>
              <div className="market-price">
                <div>
                  <span className="label">IMD pool price</span>
                  <div className="price-value">
                    {market
                      ? market.priceEth.toLocaleString("en-US", {
                          maximumSignificantDigits: 5,
                        })
                      : "—"}{" "}
                    <span>ETH</span>
                  </div>
                </div>
                <div className="market-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <span className="orbit-token">
                    <TokenIcon token="IMD" />
                  </span>
                  <span className="orbit-dot" />
                </div>
              </div>
              <div className="market-bottom">
                <span
                  className={
                    marketError ? "data-status unavailable" : "data-status"
                  }
                >
                  <span className="status-dot" />
                  {marketLoading
                    ? "Reading Ethereum…"
                    : marketError
                      ? "Live price unavailable"
                      : `Block ${Number(market?.block).toLocaleString("en-US")}`}
                </span>
                <button
                  className="text-button"
                  onClick={() => setRetry((n) => n + 1)}
                  disabled={marketLoading || locked}
                  aria-label="Refresh market data"
                >
                  <Icon name="refresh" size={14} />
                  Refresh
                </button>
              </div>
            </div>
            <div className="contract-short">
              <span>Ethereum token</span>
              <button
                onClick={copyAddress}
                aria-label={`Copy IMD contract address ${short(CONTRACTS.token)}`}
              >
                {short(CONTRACTS.token)}
                <Icon name={copied ? "check" : "copy"} size={14} />
              </button>
              <span className="sr-only" role="status">
                {copied ? "Token address copied." : ""}
              </span>
            </div>
          </div>

          <div className="swap-column">
            <div className="swap-card">
              <div className="swap-title">
                <h2>Swap</h2>
                <div>
                  <span className="chain-badge">
                    <span />
                    Ethereum mainnet
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Swap settings"
                    disabled={locked}
                    onClick={() => setModal("settings")}
                  >
                    <Icon name="settings" size={18} />
                  </button>
                </div>
              </div>
              <div
                className="direction-switch"
                role="group"
                aria-label="Trade direction"
              >
                <button
                  type="button"
                  aria-pressed={buy}
                  disabled={locked}
                  onClick={() => changeDirection("buy")}
                >
                  Buy IMD
                </button>
                <button
                  type="button"
                  aria-pressed={!buy}
                  disabled={locked}
                  onClick={() => changeDirection("sell")}
                >
                  Sell IMD
                </button>
              </div>
              <form onSubmit={submit} noValidate>
                <div
                  className={`amount-panel ${fieldError ? "has-error" : ""}`}
                >
                  <div className="amount-label-row">
                    <label htmlFor="amount">You pay</label>
                    <span>
                      {available !== undefined
                        ? `Balance: ${displayAmount(available)}`
                        : balanceError
                          ? "Balance unavailable"
                          : walletReady
                            ? "Loading balance…"
                            : "Balance: —"}
                    </span>
                  </div>
                  <div className="amount-row">
                    <input
                      id="amount"
                      ref={inputRef}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      name="amount"
                      placeholder="0.0"
                      maxLength={60}
                      value={amount}
                      disabled={locked}
                      aria-invalid={!!fieldError}
                      aria-describedby={
                        fieldError ? "amount-error" : "amount-help"
                      }
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setFieldError("");
                        setTradeError("");
                        setStatus("");
                      }}
                    />
                    <span className="token-label">
                      <TokenIcon token={payToken} small />
                      {payToken}
                    </span>
                  </div>
                  <div className="amount-footer">
                    <span id="amount-help">
                      {buy ? "Native Ethereum" : "IdentityMD token"}
                    </span>
                    <div className="presets">
                      {(buy
                        ? ["0.01", "0.05", "0.1"]
                        : ["10", "50", "100"]
                      ).map((value) => (
                        <button
                          type="button"
                          key={value}
                          disabled={locked}
                          onClick={() => {
                            setAmount(value);
                            setFieldError("");
                            setTradeError("");
                          }}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="switch-row">
                  <button
                    className="switch-button"
                    type="button"
                    aria-label="Reverse swap direction"
                    disabled={locked}
                    onClick={() => changeDirection(buy ? "sell" : "buy")}
                  >
                    <Icon name="down" size={18} />
                  </button>
                </div>
                <div className="amount-panel receive-panel">
                  <div className="amount-label-row">
                    <span>You receive</span>
                    <span>Estimated</span>
                  </div>
                  <div className="amount-row">
                    <output
                      className={!currentQuote ? "output-empty" : ""}
                      aria-live="polite"
                      aria-label={`Estimated ${receiveToken} received`}
                      title={
                        currentQuote
                          ? formatUnits(currentQuote.output, 18)
                          : undefined
                      }
                    >
                      {quoteLoading
                        ? "…"
                        : currentQuote
                          ? displayAmount(currentQuote.output)
                          : "—"}
                    </output>
                    <span className="token-label">
                      <TokenIcon token={receiveToken} small />
                      {receiveToken}
                    </span>
                  </div>
                  <div className="amount-footer">
                    <span>
                      {currentQuote
                        ? expired
                          ? "Quote expired"
                          : "Live quote · includes the pool fee"
                        : "Enter an amount for a live quote"}
                    </span>
                    {expired && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={locked}
                        onClick={() => setRetry((n) => n + 1)}
                      >
                        Refresh quote <Icon name="refresh" size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="trade-meta">
                  <div>
                    <span>Route</span>
                    <span>
                      <span className="route-dot" />
                      Uniswap v4
                      <Icon name="chevron" size={12} />
                      IMD / ETH
                    </span>
                  </div>
                  <div>
                    <span>Pool fee</span>
                    <span>1.00%</span>
                  </div>
                  <div>
                    <span>Max. slippage</span>
                    <button
                      type="button"
                      className="slippage-button"
                      disabled={locked}
                      aria-label={`Maximum slippage: ${slippage / 100}%, change settings`}
                      onClick={() => setModal("settings")}
                    >
                      {slippage / 100}%<Icon name="settings" size={12} />
                    </button>
                  </div>
                  {currentQuote && (
                    <div>
                      <span>Minimum received</span>
                      <span title={formatUnits(minimum, 18)}>
                        {displayAmount(minimum)} {receiveToken}
                      </span>
                    </div>
                  )}
                </div>
                <div className="form-messages">
                  <p id="amount-error" className="error" role="alert">
                    {fieldError}
                  </p>
                  <p className="error" role="alert">
                    {modal !== "review" ? quoteError : ""}
                    {quoteError && modal !== "review" && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="inline-link"
                          disabled={locked}
                          onClick={() => setRetry((n) => n + 1)}
                        >
                          Retry quote
                        </button>
                      </>
                    )}
                  </p>
                  {balanceError && (
                    <p className="error">
                      Balance unavailable.{" "}
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => setRetry((n) => n + 1)}
                      >
                        Retry balance
                      </button>
                    </p>
                  )}
                </div>
                {pending ? (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy}
                      onClick={checkPending}
                    >
                      {busy ? "Waiting for confirmation…" : "Check transaction"}
                      <Icon name="refresh" size={18} />
                    </button>
                    <button
                      type="button"
                      className="secondary-button full"
                      disabled={busy}
                      onClick={managePending}
                    >
                      Manage pending transaction
                    </button>
                  </>
                ) : (
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={
                      busy || connecting || (quoteLoading && walletReady)
                    }
                  >
                    {connecting ? "Opening wallet…" : primaryLabel}
                    <Icon name={!account ? "wallet" : "arrow"} size={18} />
                  </button>
                )}
                <p className="swap-note">
                  <Icon name="shield" size={13} />
                  You stay in control. Every trade is signed by you.
                </p>
              </form>
            </div>
            <div className="powered-line">
              <span className="uniswap-mark" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
                </svg>
              </span>
              Built on Uniswap v4<span className="middot">·</span>Settled on
              Ethereum
            </div>
          </div>
        </section>

        <div className="global-feedback">
          <p
            role="status"
            className={status.startsWith("Swap confirmed") ? "success" : ""}
          >
            {modal !== "review" ? status : ""}
          </p>
          <p role="alert" className="error">
            {modal !== "review" ? tradeError : ""}
          </p>
          {(lastHash || pending) && (
            <External
              href={`https://etherscan.io/tx/${pending?.hash || lastHash}`}
            >
              View transaction on Etherscan
            </External>
          )}
        </div>

        <section
          id="about"
          className="about-section"
          aria-labelledby="about-heading"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Less friction. More ownership.</span>
              <h2 id="about-heading">From your wallet. To your wallet.</h2>
            </div>
            <External href="https://imd.fun/token/">
              Explore IdentityMD
            </External>
          </div>
          <div className="steps">
            <article>
              <span className="step-icon">
                <Icon name="wallet" />
              </span>
              <span className="step-number">01</span>
              <h3>Bring your wallet</h3>
              <p>
                Connect an Ethereum wallet. Keep a little ETH available for
                network fees.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Icon name="layers" />
              </span>
              <span className="step-number">02</span>
              <h3>Make your move</h3>
              <p>
                Buy or sell IMD. Get a live pool quote and review what you’ll
                receive.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Icon name="shield" />
              </span>
              <span className="step-number">03</span>
              <h3>Keep control</h3>
              <p>
                Confirm in your wallet. Your tokens arrive directly when the
                swap settles.
              </p>
            </article>
          </div>
        </section>

        <section
          className="pool-section"
          id="pool"
          aria-labelledby="pool-heading"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Know what you’re trading</span>
              <h2 id="pool-heading">One pair. On Ethereum.</h2>
            </div>
            <External href={POOL_URL}>View Uniswap pool</External>
          </div>
          <div className="pool-grid">
            <div className="pool-description">
              <div className="token-pair">
                <TokenIcon token="ETH" />
                <TokenIcon token="IMD" />
                <span>ETH / IMD</span>
                <span className="market-badge">v4</span>
              </div>
              <p>
                This interface routes swaps through the IMD pool with the POOL4
                hook. The 1% pool fee is included in your quote; Ethereum
                network fees are separate.
              </p>
              <External href="https://pool4.imd.fun/docs">
                Read about the pool and its hook
              </External>
            </div>
            <dl className="pool-details">
              <div>
                <dt>Network</dt>
                <dd>Ethereum mainnet · Chain 1</dd>
              </div>
              <div>
                <dt>IMD contract</dt>
                <dd>
                  <External
                    href={`https://etherscan.io/token/${CONTRACTS.token}`}
                  >
                    {CONTRACTS.token}
                  </External>
                </dd>
              </div>
              <div>
                <dt>Pool ID</dt>
                <dd>
                  <External href={POOL_URL}>{POOL_ID}</External>
                </dd>
              </div>
              <div>
                <dt>Pool hook</dt>
                <dd>
                  <External
                    href={`https://etherscan.io/address/${CONTRACTS.hook}`}
                  >
                    {CONTRACTS.hook}
                  </External>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-brand">
          <TokenIcon token="IMD" small />
          <strong>imd market</strong>
          <span>An independent interface for the IMD community.</span>
        </div>
        <div>
          <External href="https://imd.fun">IdentityMD</External>
          <External href="https://pool4.imd.fun/docs">Pool docs</External>
          <a href="#trade">Back to trade ↑</a>
        </div>
      </footer>

      {modal === "pending" && pending && (
        <Modal title="Manage pending transaction" close={() => setModal(null)}>
          <p className="modal-description">
            Check this transaction in your wallet activity and on Etherscan. If
            it was replaced or cancelled while you were away, this site may be
            unable to find its final receipt.
          </p>
          <p className="address-full">
            <External href={`https://etherscan.io/tx/${pending.hash}`}>
              {pending.hash}
            </External>
          </p>
          <p className="approval-note">
            Stopping tracking only removes this site’s pending state. It does
            not cancel the transaction, which may still confirm. Starting
            another trade could result in both transactions completing.
          </p>
          <label className="pending-acknowledgment">
            <input
              type="checkbox"
              checked={pendingAcknowledged}
              onChange={(e) => setPendingAcknowledged(e.target.checked)}
            />
            <span>
              I checked my wallet activity and understand this transaction may
              still confirm.
            </span>
          </label>
          <button
            className="secondary-button full"
            disabled={busy || !pendingAcknowledged}
            onClick={stopTrackingPending}
          >
            Stop tracking transaction
          </button>
        </Modal>
      )}

      {modal === "wallet" && (
        <Modal
          title={account ? "Your wallet" : "Connect your wallet"}
          close={() => setModal(null)}
        >
          {account ? (
            <>
              <div className="account-display">
                <Icon name="wallet" size={28} />
                <strong>{short(account)}</strong>
                <span>
                  {chainId === 1
                    ? "Ethereum mainnet"
                    : "Switch to Ethereum to trade"}
                </span>
              </div>
              <p className="address-full">{account}</p>
              <External href={`https://etherscan.io/address/${account}`}>
                View wallet on Etherscan
              </External>
              <button
                className="secondary-button full"
                onClick={() => {
                  session.current++;
                  setAccount(undefined);
                  setProvider(undefined);
                  setBalances(undefined);
                  setQuote(undefined);
                  setModal(null);
                }}
              >
                Disconnect from this site
              </button>
            </>
          ) : (
            <>
              <p className="modal-description">
                Use your Ethereum wallet to trade. Connecting does not authorize
                a transaction.
              </p>
              <button
                className="wallet-option"
                disabled={connecting}
                onClick={connect}
              >
                <span className="step-icon">
                  <Icon name="wallet" />
                </span>
                <span>
                  <strong>
                    {connecting
                      ? "Waiting for your wallet…"
                      : "Connect browser wallet"}
                  </strong>
                  <small>MetaMask, Rabby & compatible wallets</small>
                </span>
                <Icon name="chevron" />
              </button>
              <p className="error" role="alert">
                {walletError}
              </p>
              <div className="wallet-help">
                <strong>New to Ethereum?</strong>
                <p>
                  Install a wallet, or open this page in your wallet’s in-app
                  browser.
                </p>
                <External href="https://ethereum.org/en/wallets/find-wallet/">
                  Find an Ethereum wallet
                </External>
              </div>
            </>
          )}
        </Modal>
      )}

      {modal === "settings" && (
        <Modal title="Swap settings" close={() => setModal(null)}>
          <div className="settings-label">
            <h3>Maximum slippage</h3>
            <span>{slippage / 100}%</span>
          </div>
          <p className="modal-description">
            Your swap reverts if the amount received falls below your minimum.
            Network fees may still apply.
          </p>
          <fieldset className="slippage-options">
            <legend className="sr-only">Maximum slippage</legend>
            {[10, 50, 100].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="slippage"
                  checked={slippage === value}
                  onChange={() => setSlippage(value)}
                />
                <span>
                  {value / 100}%{value === 50 && <small>Default</small>}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="settings-info">
            <Icon name="shield" size={18} />
            <p>
              The 1% pool fee is already included in the quote. Slippage is an
              additional limit on price movement.
            </p>
          </div>
          <button className="primary-button" onClick={() => setModal(null)}>
            Save settings
            <Icon name="check" size={18} />
          </button>
        </Modal>
      )}

      {modal === "review" && (
        <Modal title="Review your swap" close={() => setModal(null)}>
          <p className="modal-description">Ethereum mainnet · Uniswap v4</p>
          <div className="review-tokens">
            <div>
              <TokenIcon token={payToken} />
              <span>
                You pay
                <strong>
                  {amount} {payToken}
                </strong>
              </span>
            </div>
            <Icon name="down" size={18} />
            <div>
              <TokenIcon token={receiveToken} />
              <span>
                Estimated receive
                <strong>
                  {currentQuote
                    ? formatUnits(currentQuote.output, 18)
                    : quoteLoading
                      ? "Refreshing…"
                      : "Quote unavailable"}{" "}
                  {receiveToken}
                </strong>
              </span>
            </div>
          </div>
          <dl className="review-details">
            <div>
              <dt>Minimum received</dt>
              <dd>
                {currentQuote ? formatUnits(minimum, 18) : "—"} {receiveToken}
              </dd>
            </div>
            <div>
              <dt>Maximum slippage</dt>
              <dd>{slippage / 100}%</dd>
            </div>
            <div>
              <dt>Pool fee</dt>
              <dd>1% · included</dd>
            </div>
            <div>
              <dt>Network fee</dt>
              <dd>Shown in your wallet</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{account && short(account)}</dd>
            </div>
          </dl>
          {!buy && (
            <p className="approval-note">
              Selling may require two approvals: IMD to Permit2, then Permit2 to
              the Uniswap router. Each is limited to {amount} IMD; the router
              permission expires after 20 minutes.
            </p>
          )}
          <p className="error" role="alert">
            {tradeError}
          </p>
          <p className="error" role="alert">
            {quoteError}
          </p>
          <p role="status" className="review-status">
            {status}
          </p>
          {pending ? (
            <>
              <External href={`https://etherscan.io/tx/${pending.hash}`}>
                View pending transaction
              </External>
              <button
                className="primary-button"
                disabled={busy}
                onClick={checkPending}
              >
                {busy ? "Waiting for confirmation…" : "Check transaction"}
              </button>
              <button
                className="secondary-button full"
                disabled={busy}
                onClick={managePending}
              >
                Manage pending transaction
              </button>
            </>
          ) : expired || !currentQuote ? (
            <button
              className="primary-button"
              disabled={locked || quoteLoading}
              onClick={() => {
                setTradeError("");
                setRetry((n) => n + 1);
              }}
            >
              {busy
                ? "Check your wallet…"
                : quoteLoading
                  ? "Refreshing quote…"
                  : quoteError
                    ? "Retry quote"
                    : "Refresh expired quote"}
              <Icon name="refresh" size={18} />
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={busy || approval === "checking" || approval === "error"}
              onClick={confirm}
            >
              {busy
                ? "Check your wallet…"
                : approval === "checking"
                  ? "Checking approvals…"
                  : approval === "token"
                    ? "Approve IMD amount"
                    : approval === "permit"
                      ? "Approve router amount"
                      : "Confirm swap"}
              <Icon name="arrow" size={18} />
            </button>
          )}
          <p className="swap-note">
            Confirm amounts and fees in your wallet before signing.
          </p>
        </Modal>
      )}
    </>
  );
}
