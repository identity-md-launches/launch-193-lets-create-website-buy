# IMD Market

A static, responsive React + TypeScript application for buying and selling IMD against native ETH in its Ethereum mainnet Uniswap v4 pool. The finished website is in **`dist/`**; the publisher must serve that directory, without rebuilding it.

## Run locally

Use Node.js 22.12+ (Node 24.21.0 was used for validation) and npm.

```sh
npm ci
npm run dev
```

To check and rebuild the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Open the preview URL printed by Vite. Serve the site over HTTP locally or HTTPS when published; opening `index.html` directly as a `file:` URL does not support module loading and wallet integrations reliably. No environment files, private keys, backend, API credentials, or vendored package registry are required.

## Publish

Upload **the contents of `dist/`**, preserving `assets/` and `favicon.svg`, to a static HTTPS host or IPFS. Use the resulting directory CID for an ENS contenthash. `base: './'` in `vite.config.ts` produces relative script, stylesheet, font, and chunk URLs. Navigation uses in-page hashes, so server-side route rewrites are unnecessary. Check the published site at its actual gateway subpath.

After a source change, rebuild and include the complete new `dist/` alongside the source, `package.json`, and `package-lock.json`. Remove obsolete export files when replacing it. Do not include `node_modules/`, caches, temporary browser output, or package archives in a submission. No ignore file was created or changed for this assignment. Dependencies used during this work were installed in `/tmp/imd-market-build`, outside the submitted tree.

## What works

- Public on-chain quotes for both directions, precise integer amount handling, amount presets, and explicit quote refresh/retry without a wallet.
- Injected EIP-1193 Ethereum wallets, network switching, account-change handling, and native ETH / IMD balances.
- Slippage choices of 0.1%, 0.5% (default), and 1%; minimum output shown before confirmation. Quotes expire after 30 seconds.
- Review and simulation before wallet submission. Sells request only the entered amount in each necessary approval, with a 20-minute Permit2 router permission. Each approval is a separate user action and refreshes the quote.
- Direct Universal Router V2 execution for the configured pool, bounded input settlement, minimum output enforcement, and an ETH refund sweep on buys.
- Pending receipt checks, reverts, wallet rejection, transaction links, and pending transaction recovery within the same browser tab via session storage.

The integration uses native ETH and one fixed IMD pool. It does not offer arbitrary tokens, other networks, staking, bridging, WalletConnect, or liquidity provision. On mobile, use an Ethereum wallet's in-app browser that exposes `window.ethereum`. If multiple extensions are installed, their chosen injected provider is used; there is no separate wallet discovery chooser.

## Pool configuration

Source of truth: [`src/contracts.ts`](src/contracts.ts). Address provenance and verification are in [`artifacts/validation.md`](artifacts/validation.md).

| Item | Value |
| --- | --- |
| Chain | Ethereum mainnet, chain ID 1 |
| IMD | `0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7` · 18 decimals |
| Native ETH | `0x0000000000000000000000000000000000000000` |
| Pool fee / tick spacing | `10000` (1%) / `60` |
| Hook | `0xc6c965bd164c483e87d0b550671798e9a3602840` |
| Pool ID | `0x415829f72e9f54531c26eae76f107618540e898a45d6ae35959e143f5faca704` |
| Universal Router V2 | `0x66a9893cc07d91d95644aedd05d03f95e1dba8af` |

Before connection, reads use PublicNode with LlamaRPC as a fallback. After connection to Ethereum, reads use the wallet's provider. Availability, CORS, rate limits, wallet support, pool liquidity, and network fees depend on these external services. The site does not display invented fallback prices. Its full local interface loads without RPC access, but quoting and trading require Ethereum connectivity.

## Actual validation

On 2026-09-26, against the production export served under `/preview/`:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0 |
| `npm test` | 8 tests passed, 0 failed |
| `npm run build` | Passed, exit 0; Vite 7.3.6; no final chunk-size warning |
| Dependency audit after updating packages | 0 known vulnerabilities reported |
| Browser interactions | Live buy/sell quotes; settings; keyboard and modal focus; copy/navigation; fixture wallet connect, chain switch, rejection, approvals, swap, revert, pending recovery, account changes, and failed-read recovery |
| Production layout | Inspected at 1440, 1024, 768, 390, and 320 CSS pixels; no document horizontal overflow at checked widths |
| Accessibility | axe-core 4.11.0 scan: no violations in final checked page states; keyboard, reduced motion, and forced colors checked |
| Mainnet read-only simulation | Buy execution including ETH sweep succeeded; impossible minimum output reverted, at block `0x18db185` |

The build, typecheck, and test scripts ran in an isolated copy at `/tmp/imd-market-build`; the exact output was copied into this repository's `dist/`. Normal `npm ci` and the commands above reproduce that workflow without the temporary path. Nothing in `test/scratch/` is needed to build or run the website.

**No funded wallet transaction was signed or broadcast.** Wallet transaction paths were exercised with the local-only fixture in [`test/wallet-fixture.js`](test/wallet-fixture.js); the live router checks used `eth_call` with a temporary balance override. These checks do not establish live wallet compatibility across vendors or constitute a contract audit. Physical mobile devices, assistive screen readers, native browser zoom, and post-publication behavior were not tested. See the consolidated [six-domain review, fixes, evidence, and limitations](artifacts/validation.md) and [browser reproduction notes](test/browser-checks.md).

## Source map

- `src/App.tsx`: interface, wallet lifecycle, transaction review, approvals, and receipt state.
- `src/chain.ts`: public / wallet RPC clients, quote and balance reads.
- `src/contracts.ts`: explicitly pinned addresses, ABIs, and pool ID derivation.
- `src/trade.ts`: amount validation, integer slippage math, router encoding.
- `src/style.css`, `src/Icons.tsx`, `src/assets/`: design tokens, responsive rules, SVG icons, and local Manrope font.
- `DESIGN.md`: the implemented visual system.

Manrope is locally bundled under its SIL Open Font License, included in `src/assets/OFL.txt` and published as `dist/manrope-OFL.txt`. The UI icons and decorative pool illustration are original SVG/CSS assets. Better Interface and Impeccable design-reference attribution is recorded in `DESIGN.md`.
