import {
  createPublicClient,
  custom,
  erc20Abi,
  fallback,
  http,
  type Address,
  type EIP1193Provider,
} from "viem";
import { mainnet } from "viem/chains";
import { CONTRACTS, POOL_ID, POOL_KEY, quoteAbi, stateAbi } from "./contracts";
import type { Direction } from "./trade";

export type WalletProvider = EIP1193Provider & {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
};
declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}

export function readClient(provider?: WalletProvider) {
  return createPublicClient({
    chain: mainnet,
    transport: provider
      ? custom(provider, { retryCount: 0 })
      : fallback(
          [
            http("https://ethereum-rpc.publicnode.com", {
              timeout: 7000,
              retryCount: 0,
            }),
            http("https://eth.llamarpc.com", { timeout: 7000, retryCount: 0 }),
          ],
          { retryCount: 0 },
        ),
  });
}

export type Quote = {
  input: bigint;
  output: bigint;
  gas: bigint;
  direction: Direction;
  at: number;
};
export async function getQuote(
  direction: Direction,
  amount: bigint,
  provider?: WalletProvider,
): Promise<Quote> {
  const client = readClient(provider);
  if ((await client.getChainId()) !== 1)
    throw new Error("Switch your wallet to Ethereum mainnet.");
  const { result } = await client.simulateContract({
    address: CONTRACTS.quoter,
    abi: quoteAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: POOL_KEY,
        zeroForOne: direction === "buy",
        exactAmount: amount,
        hookData: "0x",
      },
    ],
  });
  if (result[0] <= 0n) throw new Error("No output available.");
  return {
    input: amount,
    output: result[0],
    gas: result[1],
    direction,
    at: Date.now(),
  };
}

export async function getMarket(provider?: WalletProvider) {
  const client = readClient(provider);
  if ((await client.getChainId()) !== 1) throw new Error("Wrong network");
  const [slot, liquidity, block] = await Promise.all([
    client.readContract({
      address: CONTRACTS.stateView,
      abi: stateAbi,
      functionName: "getSlot0",
      args: [POOL_ID],
    }),
    client.readContract({
      address: CONTRACTS.stateView,
      abi: stateAbi,
      functionName: "getLiquidity",
      args: [POOL_ID],
    }),
    client.getBlockNumber(),
  ]);
  if (slot[0] === 0n || liquidity === 0n)
    throw new Error("Pool liquidity unavailable");
  const sqrt = Number(slot[0]) / 2 ** 96;
  return {
    priceEth: 1 / (sqrt * sqrt),
    block: block.toString(),
    at: Date.now(),
  };
}

export async function getBalances(account: Address, provider: WalletProvider) {
  const client = readClient(provider);
  const [eth, imd] = await Promise.all([
    client.getBalance({ address: account }),
    client.readContract({
      address: CONTRACTS.token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account],
    }),
  ]);
  return { eth, imd };
}
