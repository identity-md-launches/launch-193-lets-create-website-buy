import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeAbiParameters,
  parseAbiParameters,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  buildSwap,
  minimumOutput,
  parseAmount,
  errorMessage,
} from "../src/trade";
import { CONTRACTS, POOL_ID, poolKeyType } from "../src/contracts";
import { getQuote, type WalletProvider } from "../src/chain";

test("pool key derives the published IMD pool ID", () => {
  assert.equal(
    POOL_ID,
    "0x415829f72e9f54531c26eae76f107618540e898a45d6ae35959e143f5faca704",
  );
});

test("amount parsing preserves all 18 decimals and rejects invalid, zero and oversized amounts", () => {
  assert.equal(parseAmount("0.123456789012345678"), 123456789012345678n);
  assert.equal(parseAmount(" 1. "), 10n ** 18n);
  assert.equal(parseAmount(".5"), 5n * 10n ** 17n);
  for (const value of [
    "",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "1e3",
    "1,2",
    ".",
    "0.0000000000000000001",
    "9".repeat(60),
  ])
    assert.throws(() => parseAmount(value), Error, value);
});

test("slippage floors the minimum and refuses unsupported settings", () => {
  assert.equal(minimumOutput(10001n, 50), 9950n);
  assert.equal(minimumOutput(10000n, 10), 9990n);
  assert.equal(minimumOutput(10000n, 100), 9900n);
  assert.throws(() => minimumOutput(1000n, 10000));
});

for (const direction of ["buy", "sell"] as const)
  test(`${direction}: decode full Universal Router command and enforce exact input, minimum output, settlement and native value`, () => {
    const input = parseUnits(direction === "buy" ? "0.01" : "100", 18);
    const minimum = parseUnits(direction === "buy" ? "99.5" : "0.00995", 18);
    const built = buildSwap(direction, input, minimum, 1_700_000_000_000);
    assert.equal(built.commands, direction === "buy" ? "0x1004" : "0x10");
    assert.equal(built.inputs.length, direction === "buy" ? 2 : 1);
    if (direction === "buy") {
      const [currency, recipient, minimum] = decodeAbiParameters(
        parseAbiParameters("address, address, uint256"),
        built.inputs[1],
      );
      assert.equal(currency, zeroAddress);
      assert.equal(recipient, "0x0000000000000000000000000000000000000001");
      assert.equal(minimum, 0n);
    }
    assert.equal(built.value, direction === "buy" ? input : 0n);
    assert.equal(built.deadline, 1_700_001_200n);
    const [actions, params] = decodeAbiParameters(
      parseAbiParameters("bytes, bytes[]"),
      built.inputs[0],
    );
    assert.equal(actions, "0x060c0f");
    const [swap] = decodeAbiParameters(
      parseAbiParameters(
        `(${poolKeyType} poolKey, bool zeroForOne, uint128 amountIn, uint128 amountOutMinimum, bytes hookData)`,
      ),
      params[0],
    );
    assert.equal(swap.poolKey.currency0, zeroAddress);
    assert.equal(
      swap.poolKey.currency1.toLowerCase(),
      CONTRACTS.token.toLowerCase(),
    );
    assert.equal(swap.poolKey.hooks.toLowerCase(), CONTRACTS.hook);
    assert.equal(swap.poolKey.fee, 10000);
    assert.equal(swap.zeroForOne, direction === "buy");
    assert.equal(swap.amountIn, input);
    assert.equal(swap.amountOutMinimum, minimum);
    assert.equal(swap.hookData, "0x");
    const [settleCurrency, maximum] = decodeAbiParameters(
      parseAbiParameters("address, uint256"),
      params[1],
    );
    const [takeCurrency, min] = decodeAbiParameters(
      parseAbiParameters("address, uint256"),
      params[2],
    );
    assert.equal(
      settleCurrency.toLowerCase(),
      (direction === "buy" ? zeroAddress : CONTRACTS.token).toLowerCase(),
    );
    assert.equal(
      takeCurrency.toLowerCase(),
      (direction === "buy" ? CONTRACTS.token : zeroAddress).toLowerCase(),
    );
    assert.equal(maximum, input);
    assert.equal(min, minimum);
  });

test("zero-output or overflowing router requests cannot be built", () => {
  assert.throws(() => buildSwap("buy", 1n, 0n));
  assert.throws(() => buildSwap("sell", 0n, 1n));
  assert.throws(() => buildSwap("buy", 1n << 128n, 1n));
});

test("quotes refuse the wrong chain before calling contracts", async () => {
  const calls: string[] = [];
  const provider = {
    request: async ({ method }: { method: string }) => {
      calls.push(method);
      return "0xaa36a7";
    },
  } as WalletProvider;
  await assert.rejects(getQuote("buy", 10n, provider), /Ethereum mainnet/);
  assert.deepEqual(calls, ["eth_chainId"]);
});

test("wallet rejection is recoverable without leaking provider details", () => {
  assert.match(errorMessage({ code: 4001 }, "Fallback"), /declined/);
  assert.equal(
    errorMessage(new Error("secret provider diagnostics"), "Retry the quote."),
    "Retry the quote.",
  );
});
