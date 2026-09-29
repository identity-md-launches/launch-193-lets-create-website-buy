/**
 * Read-only, pinned Ethereum validation. No signing keys or transaction submission.
 * Run: npx tsx test/mainnet-check.ts [blockNumber]
 * Defaults to the recorded validation block; stdout is a JSON report.
 */
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  decodeErrorResult,
  erc20Abi,
  fallback,
  http,
  parseAbi,
  parseEther,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import {
  CONTRACTS,
  POOL_ID,
  POOL_KEY,
  quoteAbi,
  routerAbi,
  stateAbi,
} from "../src/contracts";
import { buildSwap, minimumOutput } from "../src/trade";

const endpoints = [
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
  "https://rpc.flashbots.net",
];
const client = createPublicClient({
  chain: mainnet,
  transport: fallback(
    endpoints.map((url) => http(url, { timeout: 6000, retryCount: 0 })),
    { retryCount: 0 },
  ),
});
const blockNumber = BigInt(process.argv[2] ?? "26084489");
const checkedAt = new Date().toISOString();
const hookAbi = parseAbi([
  "function poolId() view returns (bytes32)",
  "function token() view returns (address)",
  "function lpFee() view returns (uint24)",
]);
const routerErrors = parseAbi([
  "error ExecutionFailed(uint256 commandIndex, bytes message)",
  "error V4TooLittleReceived(uint256 minAmountOutReceived, uint256 amountReceived)",
]);

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  check((await client.getChainId()) === 1, "Expected Ethereum mainnet");
  const block = await client.getBlock({ blockNumber });
  const poolId = await client.readContract({
    address: CONTRACTS.hook, abi: hookAbi, functionName: "poolId", blockNumber,
  });
  const token = await client.readContract({
    address: CONTRACTS.hook, abi: hookAbi, functionName: "token", blockNumber,
  });
  const lpFee = await client.readContract({
    address: CONTRACTS.hook, abi: hookAbi, functionName: "lpFee", blockNumber,
  });
  check(poolId === POOL_ID, "Configured pool key differs from hook.poolId()");
  check(token.toLowerCase() === CONTRACTS.token.toLowerCase(), "IMD token mismatch");
  check(lpFee === POOL_KEY.fee, "Pool fee mismatch");

  const codeBytes: Record<string, number> = {};
  // Sequential requests reduce load on the free public providers.
  for (const [name, address] of Object.entries(CONTRACTS)) {
    codeBytes[name] = ((await client.getCode({ address, blockNumber }))?.length ?? 2) / 2 - 1;
    check(codeBytes[name] > 0, `No deployed bytecode for ${name}`);
  }
  const slot0 = await client.readContract({
    address: CONTRACTS.stateView, abi: stateAbi, functionName: "getSlot0",
    args: [POOL_ID], blockNumber,
  });
  const liquidity = await client.readContract({
    address: CONTRACTS.stateView, abi: stateAbi, functionName: "getLiquidity",
    args: [POOL_ID], blockNumber,
  });
  const decimals = await client.readContract({
    address: CONTRACTS.token, abi: erc20Abi, functionName: "decimals", blockNumber,
  });
  check(decimals === 18, "Unexpected IMD decimals");
  check(slot0[0] > 0n && liquidity > 0n, "Pool has no active liquidity");
  check(slot0[3] === POOL_KEY.fee, "StateView LP fee mismatch");

  const quotes: Record<string, unknown> = {};
  let buyRouterSimulation: Record<string, unknown> = {};
  for (const direction of ["buy", "sell"] as const) {
    const amount = parseEther(direction === "buy" ? "0.001" : "1");
    const quote = await client.simulateContract({
      address: CONTRACTS.quoter, abi: quoteAbi, functionName: "quoteExactInputSingle",
      args: [{ poolKey: POOL_KEY, zeroForOne: direction === "buy", exactAmount: amount, hookData: "0x" }],
      blockNumber,
    });
    check(quote.result[0] > 0n, `No output for ${direction} quote`);
    quotes[direction] = { amountIn: amount, amountOut: quote.result[0], gasEstimate: quote.result[1] };
    if (direction === "buy") {
      const account = "0x000000000000000000000000000000000000dEaD" as const;
      // These overrides affect only this eth_call; they never modify chain state.
      const simulate = async (minimum: bigint) => {
        const swap = buildSwap(direction, amount, minimum, Number(block.timestamp) * 1000);
        await client.simulateContract({
          address: CONTRACTS.router,
          abi: [...routerAbi, ...routerErrors],
          functionName: "execute",
          args: [swap.commands, swap.inputs, swap.deadline],
          value: swap.value, account, blockNumber,
          stateOverride: [{ address: account, balance: parseEther("1") }],
        });
        return swap;
      };
      const minimum = minimumOutput(quote.result[0], 50);
      const swap = await simulate(minimum);
      const impossibleMinimum = (1n << 128n) - 1n;
      let rejection: { errorName: string; args?: readonly unknown[] } | undefined;
      try {
        await simulate(impossibleMinimum);
      } catch (error) {
        const reverted = error instanceof BaseError
          ? error.walk((cause) => cause instanceof ContractFunctionRevertedError)
          : undefined;
        if (!(reverted instanceof ContractFunctionRevertedError)) throw error;
        const decoded = reverted.data;
        if (decoded?.errorName === "ExecutionFailed") {
          const args = decoded.args as readonly [bigint, Hex];
          check(args[0] === 0n, "Unexpected command failed");
          rejection = decodeErrorResult({ abi: routerErrors, data: args[1] });
        } else if (decoded?.errorName === "V4TooLittleReceived") {
          rejection = decoded;
        } else {
          throw error;
        }
      }
      check(rejection?.errorName === "V4TooLittleReceived", "Impossible minimum did not reject with the expected slippage error");
      buyRouterSimulation = {
        status: "passed", method: "eth_call", account,
        stateOverride: { balance: parseEther("1") },
        commands: swap.commands, minimumOutput: minimum,
        impossibleMinimum: { status: "rejected as expected", minimumOutput: impossibleMinimum, ...rejection },
      };
    }
  }
  console.log(JSON.stringify({
    status: "passed", checkedAt, completedAt: new Date().toISOString(),
    chainId: 1, blockNumber, blockHash: block.hash,
    blockTimestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    endpoints, contracts: CONTRACTS, poolKey: POOL_KEY,
    computedPoolId: POOL_ID, onChainPoolId: poolId, onChainToken: token,
    lpFee, tokenDecimals: decimals, codeBytes, slot0, liquidity, quotes, buyRouterSimulation,
    limitations: [
      "Read-only calls; no transaction was signed or broadcast.",
      "Buy execution uses a hypothetical account balance override, not a funded wallet.",
      "Sell quote was simulated; sell router execution, approvals, wallet signing and receipts were not validated by this script.",
      "Public RPC availability, historical state and state overrides depend on provider support; individual successful endpoints are not logged.",
      "Nonempty bytecode is checked, not a deployed-bytecode audit against source.",
    ],
  }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof BaseError ? error.shortMessage : String(error));
  process.exitCode = 1;
});
