import {
  encodeAbiParameters,
  formatUnits,
  parseAbiParameters,
  parseUnits,
  zeroAddress,
} from "viem";
import { CONTRACTS, POOL_KEY, poolKeyType } from "./contracts";

export type Direction = "buy" | "sell";
export const QUOTE_LIFETIME = 30_000;
const MAX_UINT128 = (1n << 128n) - 1n;

export function parseAmount(value: string): bigint {
  if (!/^(?:\d+(?:\.\d{0,18})?|\.\d{1,18})$/.test(value.trim()))
    throw new Error("Enter a number with up to 18 decimal places.");
  const amount = parseUnits(value.trim(), 18);
  if (amount <= 0n) throw new Error("Enter an amount greater than zero.");
  if (amount > MAX_UINT128)
    throw new Error("This amount is too large. Enter a smaller amount.");
  return amount;
}

export function minimumOutput(amount: bigint, slippage: number) {
  if (![10, 50, 100].includes(slippage))
    throw new Error("Choose an available slippage setting.");
  return (amount * BigInt(10000 - slippage)) / 10000n;
}

export function buildSwap(
  direction: Direction,
  amount: bigint,
  minimum: bigint,
  now = Date.now(),
) {
  if (
    amount <= 0n ||
    amount > MAX_UINT128 ||
    minimum <= 0n ||
    minimum > MAX_UINT128
  )
    throw new Error("Trade amount is outside the supported range.");
  const buy = direction === "buy";
  // Universal Router V2 uses the original v4 struct without minHopPriceX36.
  // 0x06 exact-input single, 0x0c settle all, 0x0f take all to msg.sender.
  const swap = encodeAbiParameters(
    parseAbiParameters(
      `(${poolKeyType} poolKey, bool zeroForOne, uint128 amountIn, uint128 amountOutMinimum, bytes hookData)`,
    ),
    [
      {
        poolKey: POOL_KEY,
        zeroForOne: buy,
        amountIn: amount,
        amountOutMinimum: minimum,
        hookData: "0x",
      },
    ],
  );
  const settle = encodeAbiParameters(
    parseAbiParameters("address currency, uint256 maxAmount"),
    [buy ? zeroAddress : CONTRACTS.token, amount],
  );
  const take = encodeAbiParameters(
    parseAbiParameters("address currency, uint256 minAmount"),
    [buy ? CONTRACTS.token : zeroAddress, minimum],
  );
  const input = encodeAbiParameters(
    parseAbiParameters("bytes actions, bytes[] params"),
    ["0x060c0f", [swap, settle, take]],
  );
  // Return any unspent native ETH. Universal Router maps recipient 0x1 to msg.sender.
  const refund = encodeAbiParameters(
    parseAbiParameters("address currency, address recipient, uint256 minimum"),
    [zeroAddress, "0x0000000000000000000000000000000000000001", 0n],
  );
  return {
    commands: buy ? ("0x1004" as const) : ("0x10" as const),
    inputs: buy ? [input, refund] : [input],
    deadline: BigInt(Math.floor(now / 1000) + 1200),
    value: buy ? amount : 0n,
  };
}

export function displayAmount(amount: bigint, maximumFractionDigits = 6) {
  const number = Number(formatUnits(amount, 18));
  return number > 0 && number < 0.000001
    ? "< 0.000001"
    : number.toLocaleString("en-US", { maximumFractionDigits });
}

export function errorMessage(error: unknown, fallback: string) {
  const e = error as { code?: number; message?: string; cause?: unknown };
  if (e?.code === 4001 || /rejected|denied/i.test(e?.message || ""))
    return "Request declined in your wallet. You can try again when ready.";
  return fallback;
}
