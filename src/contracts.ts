import {
  encodeAbiParameters,
  keccak256,
  parseAbi,
  parseAbiParameters,
  zeroAddress,
} from "viem";

// Deployment provenance and verification limits are recorded in artifacts/validation.md.
export const CONTRACTS = {
  token: "0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7",
  hook: "0xc6c965bd164c483e87d0b550671798e9a3602840",
  manager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
  stateView: "0x7ffe42c4a5deea5b0fec41c94c136cf115597227",
  quoter: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
  router: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} as const;

export const POOL_KEY = {
  currency0: zeroAddress,
  currency1: CONTRACTS.token,
  fee: 10000,
  tickSpacing: 60,
  hooks: CONTRACTS.hook,
} as const;
export const poolKeyType =
  "(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)";
export const POOL_ID = keccak256(
  encodeAbiParameters(parseAbiParameters(poolKeyType), [POOL_KEY]),
);
export const POOL_URL = `https://app.uniswap.org/explore/pools/ethereum/${POOL_ID}`;
export const stateAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getLiquidity(bytes32 poolId) view returns (uint128)",
]);
export const quoteAbi = parseAbi([
  "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
  "struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }",
  "function quoteExactInputSingle(QuoteExactSingleParams params) returns (uint256 amountOut, uint256 gasEstimate)",
]);
export const routerAbi = parseAbi([
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) payable",
]);
export const permitAbi = parseAbi([
  "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);
