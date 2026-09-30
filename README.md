# IMD Market

A static, responsive React + TypeScript application for buying and selling IMD against native ETH in its Ethereum mainnet Uniswap v4 pool. Since 2026-09-30 it wears the [imd.fun](https://imd.fun) visual system (black/white IBM Plex Mono, 1.5px rules, square pills, dark default with a light theme) with a Pepe-green accent and an original frog mascot. The finished website is in **`dist/`**; the publisher must serve that directory, without rebuilding it.

## Install and preview

Use Node.js 22.12+ (Node 22.23.2 and npm 10.9.8 were used for validation) and npm.

```sh
npm ci
npm run dev
```

## Check and rebuild

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Open the preview URL printed by Vite. Serve the site over HTTP locally or HTTPS when published; opening `index.html` directly as a `file:` URL does not support module loading and wallet integrations reliably. No environment files, private keys, backend, API credentials, or vendored package registry are required.

If `npm test` fails with `EPERM … listen` on a tsx IPC pipe (seen in a sandbox with a read-only `/tmp`), run the same tests with Node's test runner and the tsx loader:

```sh
node --import tsx --test test/trade.test.ts
```

## Publish to IPFS

The release is the complete **`dist/` directory**, including `index.html`, `assets/`, the favicon and the font license. The assignment publisher can serve this export directly under the existing name `site-f57a906e.site.identitymd.eth`. No public CID was published by this worker: no persistent IPFS node or pinning-service destination was supplied.

With [IPFS Desktop](https://docs.ipfs.tech/how-to/websites-on-ipfs/single-page-website/), import `dist` as a **folder**, pin it, and copy the folder's CID. Alternatively, with an initialized [Kubo node](https://docs.ipfs.tech/how-to/pin-files/) running, from the repository root:

```sh
ipfs add -Q -r --cid-version=1 dist
```

The command prints the directory CID and pins it locally. Keep that node online, or upload the full folder to your pinning service and confirm it is pinned there. Open `https://YOUR_GATEWAY/ipfs/YOUR_DIRECTORY_CID/`, with a trailing slash, and verify quotes, wallet connection, the theme toggle and all assets. An ENS contenthash can point to the same directory CID.

Vite uses `base: './'`; script, stylesheet, font and chunk URLs are relative. Navigation uses in-page hashes, so gateway subpaths work without server rewrites. Use HTTPS for the published gateway and a browser wallet or wallet in-app browser; there is no WalletConnect QR flow.

After a source change, rebuild and include the complete new `dist/` alongside source and the existing manifest/lockfile. Remove obsolete export files. Do not include dependency directories, caches or package archives.

## What works

- Public on-chain quotes for both directions, precise integer amount handling, amount presets, and explicit quote refresh/retry without a wallet.
- Injected EIP-1193 Ethereum wallets, network switching, account-change handling, and native ETH / IMD balances.
- Slippage choices of 0.1%, 0.5% (default), and 1%; minimum output shown before confirmation. Quotes expire after 30 seconds.
- Review and simulation before wallet submission. Sells request only the entered amount in each necessary approval, with a 20-minute Permit2 router permission.
- Direct Universal Router V2 execution for the configured pool, bounded input settlement, minimum output enforcement, and an ETH refund sweep on buys.
- Pending receipt checks, reverts, wallet rejection, transaction links, and pending transaction recovery within the same browser tab via session storage, with an acknowledged way to stop local tracking.
- Dark and light themes. The default is dark; the header toggle stores the choice under the same `imd-theme` key imd.fun uses, and an inline script applies it before first paint.

The integration uses native ETH and one fixed IMD pool. It does not offer arbitrary tokens, other networks, staking, bridging, WalletConnect, or liquidity provision. On mobile, use an Ethereum wallet's in-app browser that exposes `window.ethereum`.

## Pool configuration

Source of truth: [`src/contracts.ts`](src/contracts.ts). Address provenance and the 2026-09-29 mainnet verification are in `test/mainnet-check.json`.

| Item | Value |
| --- | --- |
| Chain | Ethereum mainnet, chain ID 1 |
| IMD | `0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7` · 18 decimals |
| Native ETH | `0x0000000000000000000000000000000000000000` |
| Pool fee / tick spacing | `10000` (1%) / `60` |
| Hook | `0xc6c965bd164c483e87d0b550671798e9a3602840` |
| Pool ID | `0x415829f72e9f54531c26eae76f107618540e898a45d6ae35959e143f5faca704` |
| Universal Router V2 | `0x66a9893cc07d91d95644aedd05d03f95e1dba8af` |

Before connection, reads use PublicNode with LlamaRPC as a fallback. After connection to Ethereum, reads use the wallet's provider. The site never displays invented fallback prices; its full interface loads without RPC access, but quoting and trading require Ethereum connectivity.

## Actual validation (2026-09-30 restyle)

The following ran against the final source and its export, served at a local `/dist/` subpath. Trading logic did not change in this job; its 2026-09-29 functional validation (fixture wallet script, mainnet checks) is summarized in `test/browser-checks.md` and was not repeated.

| Check | Actual result |
| --- | --- |
| `npm ci` | Installed the unchanged lockfile in an isolated temporary copy |
| `npm run typecheck` | Passed, exit 0 |
| Unit tests | `node --import tsx --test test/trade.test.ts`: 8 passed, 0 failed (`npm test` itself hit a sandbox `EPERM` on tsx's IPC pipe) |
| `npm run build` | Passed, exit 0; Vite 7.3.6; 11 export files, 609,868 bytes |
| Export | All references in `dist/index.html` relative and present; all nine local resources returned 200 in the browser; SHA-256 inventory in `test/export-manifest.json` |
| Fonts | Four IBM Plex Mono faces observed loaded from the local bundle |
| Browser interactions | Theme toggle (attribute, storage, theme-color), wallet dialog and no-wallet recovery, Escape with focus return, settings keyboard focus, Sell/Buy switch clearing the amount, presets, offline quote error with retry, reverse button, Pool hash navigation, skip link |
| Responsive layout | No document overflow at 1440, 768, 390 or 320 CSS pixels; screenshots inspected at those widths, 320 in both themes |
| Contrast | Measured in the browser in both themes; lowest text pair 5.35:1 (light accent), all others ≥ 7.46:1 |
| Better Interface review | Six domains covered; four findings fixed (headline wrap, eyebrow icon, swap-note icon, missing mascot on phones) and rechecked; details in `test/validation.md` |

**Not performed this session:** the recorded regression script `test/browser-validation.js` (the browser tool's code-execution method was not permitted), wallet-connected states in the browser, an axe scan, native zoom, a screen-reader session, a physical device, and screenshot files (the browser tool could not write into the repository). No transaction was signed or broadcast.

## Submission size

Source, export, tests and documentation total about 0.9 MiB (`dist/` is 609,868 bytes across 11 files; the four font files are 60 KB together). No dependency directory, cache, registry mirror, archive or symlink is included. Protected configuration and dependency files are unchanged; no ignore rule was changed.

## Source map

- `src/App.tsx`: interface, theme toggle, wallet lifecycle, transaction review, approvals, and receipt state.
- `src/chain.ts`: public / wallet RPC clients, quote and balance reads.
- `src/contracts.ts`: explicitly pinned addresses, ABIs, and pool ID derivation.
- `src/trade.ts`: amount validation, integer slippage math, router encoding.
- `src/style.css`, `src/Icons.tsx`, `src/assets/`: design tokens for both themes, responsive rules, SVG icons, the frog mascot, and the local IBM Plex Mono faces.
- `index.html`: pre-paint theme script and metadata. `public/favicon.svg`: green diamond mark.
- `DESIGN.md`: the implemented visual system. `test/validation.md`: the restyle review and evidence.

IBM Plex Mono is bundled under the SIL Open Font License 1.1, included in `src/assets/IBM-Plex-Mono-OFL.txt` and published as `dist/ibm-plex-mono-OFL.txt`. The icons, token marks and frog are original SVG assets. Better Interface and Impeccable design-reference attribution is recorded in `DESIGN.md`.
