# IMD Market

A static, responsive React + TypeScript application for buying and selling IMD against native ETH in its Ethereum mainnet Uniswap v4 pool. The finished website is in **`dist/`**; the publisher must serve that directory, without rebuilding it.

## Run locally

Use Node.js 22.12+ (Node 22.22.1 and npm 9.2.0 were used for validation) and npm.

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

## Publish to IPFS

The release is the complete **`dist/` directory**, including `index.html`, `assets/`, the favicon and font license. The assignment publisher can serve this export directly. No public CID was published by this worker: no persistent IPFS node or pinning-service destination was supplied.

With [IPFS Desktop](https://docs.ipfs.tech/how-to/websites-on-ipfs/single-page-website/), import `dist` as a **folder**, pin it, and copy the folder's CID. Alternatively, with an initialized [Kubo node](https://docs.ipfs.tech/how-to/pin-files/) running, from the repository root:

```sh
ipfs add -Q -r --cid-version=1 dist
```

The command prints the directory CID and pins it locally. Keep that node online, or upload the full folder to your pinning service and confirm it is pinned there. A CID alone does not guarantee public availability. Open `https://YOUR_GATEWAY/ipfs/YOUR_DIRECTORY_CID/`, with a trailing slash, and verify quotes, wallet connection and all assets. An ENS contenthash can point to the same directory CID. ENS publication and hosted pinning are separate deployment steps and were not performed here.

Vite already uses `base: './'`; script, stylesheet, font and chunk URLs are relative. Navigation uses in-page hashes, so gateway subpaths work without server rewrites. Use HTTPS for the published gateway and a browser wallet or wallet in-app browser; there is no WalletConnect QR flow.

After a source change, rebuild and include the complete new `dist/` alongside source and the existing manifest/lockfile. Remove obsolete export files. Do not include dependency directories, caches or package archives. No ignore file or protected build configuration was changed. Worker dependencies and npm caches stayed under `/tmp/`, outside the submitted tree.

## What works

- Public on-chain quotes for both directions, precise integer amount handling, amount presets, and explicit quote refresh/retry without a wallet.
- Injected EIP-1193 Ethereum wallets, network switching, account-change handling, and native ETH / IMD balances.
- Slippage choices of 0.1%, 0.5% (default), and 1%; minimum output shown before confirmation. Quotes expire after 30 seconds.
- Review and simulation before wallet submission. Sells request only the entered amount in each necessary approval, with a 20-minute Permit2 router permission. Each approval is a separate user action and refreshes the quote.
- Direct Universal Router V2 execution for the configured pool, bounded input settlement, minimum output enforcement, and an ETH refund sweep on buys.
- Pending receipt checks, reverts, wallet rejection, transaction links, and pending transaction recovery within the same browser tab via session storage. If a cancelled/replaced transaction cannot be resolved, Manage pending transaction provides an explicit, acknowledged way to stop local tracking. This does not cancel the transaction.
- Review values stay locked during wallet signing. Failed quote refreshes are shown inside the review dialog with a retry action.

The integration uses native ETH and one fixed IMD pool. It does not offer arbitrary tokens, other networks, staking, bridging, WalletConnect, or liquidity provision. On mobile, use an Ethereum wallet's in-app browser that exposes `window.ethereum`. If multiple extensions are installed, their chosen injected provider is used; there is no separate wallet discovery chooser.

## Pool configuration

Source of truth: [`src/contracts.ts`](src/contracts.ts). Address provenance and verification are in [`test/validation.md`](test/validation.md).

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

The following ran on **2026-09-29** against the final export served at a local `/dist/` subpath:

| Check | Actual result |
| --- | --- |
| `npm ci` | Installed the unchanged lockfile in `/tmp/imd-site-verify` |
| `npm run typecheck` | Passed, exit 0 |
| `npm test` | 8 tests passed, 0 failed |
| `npm run build` | Passed, exit 0; Vite 7.3.6 |
| `test/browser-validation.js` via Playwright MCP | 22 interaction assertions passed, including the repaired signing, quote-error and pending-recovery cases |
| Public browser quotes | Both buy and sell returned live mainnet estimates |
| Mainnet checks | `test/mainnet-check.ts` passed at block 26084489: deployment identity, both quotes, buy router `eth_call`, and expected rejection of an impossible minimum |
| Responsive layout | No document overflow at 1440, 1024, 768, 390 or 320 CSS pixels; screenshots inspected at 1440, 768, 390 and 320 |
| Accessibility | axe-core 4.11.0: zero violations in checked main/settings/recovery states; dialog contrast required manual measurement. Keyboard, reduced motion, forced colors and 200% root-font enlargement also checked |
| Export | Local assets resolve under `/dist/`; files match the production build. SHA-256 inventory in `test/export-manifest.json` |

The build ran in an isolated copy with the original configuration and dependencies, and its exact export was copied back. Ordinary `npm ci` plus the scripts above reproduces it. Additional read-only chain checks can be run with `npx tsx test/mainnet-check.ts 26084489`; historical RPC support is required. [Browser reproduction instructions](test/browser-checks.md) explain the fixture and script.

**No funded transaction was signed or broadcast.** Wallet sends and receipts were local fixture responses; the live buy simulation used `eth_call` with a hypothetical balance override. Sell execution was checked with the fixture, not a funded mainnet wallet. These checks are not a contract audit.

PublicNode intermittently returned HTTP 429; the LlamaRPC fallback returned CORS/TLS errors during this run. The interface remained usable, displayed unavailable/retry states and worked with the fixture wallet provider. Live trades require a working mainnet provider, wallet support, liquidity and ETH for fees. No vendor wallet matrix, physical-device test, screen-reader session, native browser zoom or public-IPFS retrieval was performed. See [the six-domain review and exact limitations](test/validation.md).

## Submission size

The final byte audit found the source/export snapshot below 0.82 MiB, with the separate evidence artifacts and existing Git metadata bringing the conservative combined raw total below 1.90 MiB (limit: 8 MiB). `dist/` is 571,654 bytes across eight files. No dependency directory, cache, registry mirror, archive or symlink is included. Protected configuration and dependency files are unchanged; no ignore rule was changed. Saved screenshots live in `artifacts/`; the validation report and JSON evidence are also included under `test/` so the source submission remains self-contained.

## Source map

- `src/App.tsx`: interface, wallet lifecycle, transaction review, approvals, and receipt state.
- `src/chain.ts`: public / wallet RPC clients, quote and balance reads.
- `src/contracts.ts`: explicitly pinned addresses, ABIs, and pool ID derivation.
- `src/trade.ts`: amount validation, integer slippage math, router encoding.
- `src/style.css`, `src/Icons.tsx`, `src/assets/`: design tokens, responsive rules, SVG icons, and local Manrope font.
- `DESIGN.md`: the implemented visual system.

Manrope is locally bundled under its SIL Open Font License, included in `src/assets/OFL.txt` and published as `dist/manrope-OFL.txt`. The UI icons and decorative pool illustration are original SVG/CSS assets. Better Interface and Impeccable design-reference attribution is recorded in `DESIGN.md`.
