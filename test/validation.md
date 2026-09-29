# IMD Market — implementation and validation

Worker review on 2026-09-29. This is recorded worker evidence, not independent certification.

## Scope and assumptions

The existing React 19 / TypeScript / Vite app was retained and repaired. Scope: one static page, native ETH ↔ IMD on Ethereum mainnet through the fixed POOL4 Uniswap v4 pool; injected EIP-1193 wallets; public quotes; amount entry, settings, approvals, review, receipts and recovery. Existing build configuration, package manifest and lockfile were preserved. English, light theme and modern browsers are the implemented variants. WalletConnect, arbitrary tokens, staking, bridging, localization and dark mode are not part of this interface.

`dist/` is the complete production export, with local assets and relative URLs. It is ready for the assignment publisher or IPFS folder upload. Public IPFS publication was not performed because no persistent node or pinning-service destination was supplied. No public CID or availability claim is made.

## Better Interface coverage

Read the pinned workflow and core principles in all six domains, then the implemented-design documentation method. Existing tokens and components were preserved during repairs. Two independent source reviews supplemented the rendered checks.

| Domain | Coverage and evidence | Unperformed / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native buttons, links, labels, radios, checkbox and modal dialogs; persistent amount label; field errors and focus; descriptive accessible names; keyboard settings/radio selection, Escape and restored focus; visible radio and close-button outlines inspected; automated main/settings/recovery scans; reduced motion and forced colors | No screen-reader session, physical device, vendor wallet accessibility check or full keyboard traversal of every transaction state. Native modal focus can reach browser chrome at the Tab boundary; background app controls were not in the modal tab sequence. |
| Layout — Checked | DOM reading order, shared alignment/gutters, responsive grids, wrapping addresses; measured document overflow at 1440, 1024, 768, 390, 320; screenshots inspected at 1440, 768, 390, 320; 320px settings and pending recovery dialogs both clientWidth=scrollWidth=280 | Browser-native zoom unperformed; 200% root-font enlargement was inspected separately at 1440. RTL and localized variants not applicable. 1024 had an overflow measurement, not separate visual inspection. |
| Writing — Checked | Action labels, fee/minimum disclosures, approval limits, wallet rejection, quote failure/retry, unavailable estimate, pending/revert/success text. Stop tracking explicitly states it does not cancel and may allow both transactions to complete | No user comprehension study. |
| Typography — Checked | Local Manrope WOFF2 observed loaded; semantic scale, tabular numbers, responsive type, selectable/wrapping contract identifiers; amounts reviewed with exact decimals; text enlargement did not cause document overflow | Fallback-font rendering on other platforms not inspected. |
| Colors — Checked | Semantic token usage and redundant text status; actual computed foreground/background pairs measured below; forced-colors selected radio and focus ring inspected | Measurements cover listed states/pairs, not every possible hover/disabled combination. One light theme; dark theme not applicable. |
| UI — Checked | Loading/empty/error/confirmed/pending states; precise disabled refresh during signing; native dialog presentation, outlines, restrained shadows, consistent icons; reduced-motion computed transitions were 0s | No slowed Animations-panel replay. There are no staged entrances, autoplay or theme transitions. |

Axe-core 4.11.0, WCAG 2 A/AA, 2.1 AA and 2.2 AA tags: main page at 1440 (27 passes) and 320 (28 passes) had zero violations and zero incomplete rules. Settings (16 passes) and pending recovery (17 passes) had zero violations, with `color-contrast` incomplete due to overlap detection. Pending dialog text backgrounds were inspected as opaque white/accent-soft and measured independently below. An axe pass is not full accessibility conformance.

## Findings, fixes and rechecks

Locations below identify the final source; descriptions record the earlier defect.

| Severity / domain | Source | Finding and correction | Recheck |
| --- | --- | --- | --- |
| High / consequential UI | `src/App.tsx:1504` | After 30 seconds, review refresh was enabled during unresolved wallet signing, so displayed amounts could differ from the submitted request. Refresh now respects `locked` and retains the awaiting-wallet label and values. | Fixture held `eth_sendTransaction`, advanced the page clock 31s; refresh stayed disabled and all review details stayed identical. |
| High / recoverability | `src/App.tsx:499`, `src/App.tsx:1258` | A replaced/cancelled hash restored after reload could leave trading locked indefinitely. Added Manage pending transaction: exact explorer hash, explanation, acknowledgment checkbox and Stop tracking. Clearing tracking never claims cancellation. | Restored synthetic unresolved hash; form locked; action disabled until checkbox; confirmed recovery cleared sessionStorage and unlocked form. |
| Medium / writing and UI | `src/App.tsx:1028`, `src/App.tsx:1435`, `src/App.tsx:1476` | Failed quote refresh appeared only behind review while the dialog said “Refreshing…”. Error now appears in review with Quote unavailable and Retry quote; background duplicate suppressed. | Failed fixture reads during expired-quote refresh, observed dialog error, restored reads and retried successfully. |
| Low / accessibility | `src/App.tsx:438`, `src/App.tsx:809`, `src/App.tsx:1008` | Minimum-output error omitted input focus; copy accessible name omitted visible abbreviated address; percentage-only settings action lacked purpose. Added focus and contextual names. | Source review, production accessibility tree; general invalid-amount focus checked in browser. Tiny-output branch was source-reviewed, not separately simulated. |
| Low / documentation | `DESIGN.md`, typography section | Existing section-heading size and narrow eyebrow size did not match source. Corrected to 1.75rem and documented the 11px eyebrow; added final recovery component behavior. | Compared against `src/style.css:50` and media rules; documented implemented values. |

No known unresolved application blocker was observed in the checked scope. Public RPC transport failures remain an external availability limitation.

## Actual commands and results

Node 22.22.1; npm 9.2.0. Dependencies installed under `/tmp/imd-site-verify`, npm cache under `/tmp/imd-npm-cache`; QA-only axe under `/tmp/imd-browser-qa`. No dependency/cache directory was added to the repository.

```sh
npm ci --prefix /tmp/imd-site-verify --cache /tmp/imd-npm-cache --no-audit --no-fund
npm run typecheck --prefix /tmp/imd-site-verify
npm test --prefix /tmp/imd-site-verify
npm run build --prefix /tmp/imd-site-verify
```

The unchanged manifests, config and current source/public/test files were copied to the isolated directory first. Install: 90 packages. Typecheck: exit 0. Tests: 8 passed / 0 failed. Build: exit 0, Vite 7.3.6, 1261 modules, 4.78s. Export has 8 files totaling 571,654 bytes. A final recursive comparison found no differences between current `src/` and built source, or current `dist/` and the build output. `git diff --check` passed. No dependency audit was run in this assignment.

Initial npm install failed because its default cache was read-only; retry with the `/tmp` cache succeeded. A default preview-port attempt failed because it was occupied. A bounded Python HTTP preview on port 48173 then served the repository, and browser inspection used `/dist/`. The server and browser were closed afterward. These environment attempts were not counted as successful validation.

### Browser interactions

Ran `test/browser-validation.js` with the available Playwright MCP `browser_run_code_unsafe` tool against the production export. Final result: **22 assertions passed**:

- Isolated browser/no real wallet; missing-wallet recovery; keyboard slippage radio; modal focus return.
- Fixture wallet connect and mainnet switch; invalid amount error/focus.
- Rejected buy sends nothing; delayed signing preserves amounts and prevents expired-quote refresh; confirmed buy.
- Direction change clears input; both sell approvals exactly 10 IMD; sell targets configured router with zero ETH input.
- Failed quote appears inside review and retries; reverted receipt reports error; account change closes review.
- Reloaded pending state locks form; acknowledgment required; exact explorer URL; stopping tracking unlocks and clears storage without claiming cancellation.

First run reached recovery but timed out on the test's incorrect link-name selector. Corrected that selector and reran the complete script successfully. Additional manual automation checked Pool/Trade hash navigation and the copy-address status. No full external-navigation or clipboard readback test was performed.

All seven requested local document/runtime resources loaded with HTTP 200 on the initial final-export navigation, including the locally loaded Manrope font. Later cached loads returned 304. Console errors observed were PublicNode HTTP 429 and LlamaRPC CORS/network failures; no application JavaScript exception was observed. The website displays unavailable/retry states and can use a connected mainnet wallet's provider. Tests do not establish that a third-party RPC or gateway will remain available.

### Mainnet evidence

Browser public quotes at block 26084490 returned 0.01 ETH → 3.470192921935870961 IMD and 10 IMD → 0.028195626255550601 ETH. These are historical validation observations, never fallback UI prices.

`test/mainnet-check.ts` ran successfully at 17:08:23–17:08:27 UTC against block **26084489** (2026-09-29 17:02:23 UTC). See `test/mainnet-check.json` for exact results. It verified pool ID/token identity, 18 decimals, fee 10000, active liquidity, nonempty code for seven addresses, both quote directions, successful buy `eth_call` and explicit `V4TooLittleReceived` rejection of an impossible minimum. The script's standalone strict TypeScript check also passed. Buy execution used a hypothetical balance override; sell router execution was not simulated on mainnet. No transaction was signed or broadcast.

Primary sources: [Uniswap v4 deployment table](https://developers.uniswap.org/docs/protocols/v4/deployments), [Universal Router mapping](https://raw.githubusercontent.com/Uniswap/universal-router/main/deploy-addresses/mainnet.json), [original router struct](https://raw.githubusercontent.com/Uniswap/v4-periphery/444c526b77d804590f0d7bc5a481af5a3277c952/src/interfaces/IV4Router.sol), [v4 actions](https://raw.githubusercontent.com/Uniswap/v4-periphery/444c526b77d804590f0d7bc5a481af5a3277c952/src/libraries/Actions.sol), [router 2.0.0 commands](https://raw.githubusercontent.com/Uniswap/universal-router/2.0.0/contracts/libraries/Commands.sol). The original router requires the older struct without `minHopPriceX36`.

### Rendered contrast

WCAG sRGB relative-luminance contrast calculated from browser-computed colors and the actual opaque ancestor background; ratios rounded to two decimals. These text pairs exceed 4.5:1.

| Element | Foreground / background | Ratio |
| --- | --- | --- |
| Heading | #16223a / #f6f8fc | 14.92 |
| Intro copy | #566278 / #f6f8fc | 5.79 |
| Swap note | #616d82 / #ffffff | 5.23 |
| Receive caption | #616d82 / #eef1f7 | 4.62 |
| Primary action | #ffffff / #245ae8 | 5.67 |
| Slippage action | #1948c7 / #edf2ff | 6.71 |
| Pending description/acknowledgment | #566278 / #ffffff | 6.15 |
| Pending explanation | #566278 / #edf2ff | 5.49 |

### Saved artifacts

Screenshots: `artifacts/desktop-1440.webp`, `artifacts/mobile-390.webp`, `artifacts/mobile-320.webp`, `artifacts/settings-focus-320.webp`, `artifacts/pending-recovery-320.webp`. Screenshots were actually inspected. Desktop screenshot records an unavailable public price; mobile screenshots show the intentionally reduced market chrome. The displayed 1% slippage is a tested selection; the application default remains 0.5%.

`artifacts/export-manifest.json` records every export file's SHA-256 and byte count; HTML and CSS asset references were checked as relative and present. Reports and raw JSON also live under `test/` because this worker environment treats `artifacts/` as separate output rather than normal Git files. No ignore rules were changed.

## Completion and limits

**Complete for the stated website implementation/export/review scope.** Publication instructions are delivered; public IPFS pinning and post-publication retrieval remain unperformed. The source and locked dependencies can reproduce the complete export. The final byte audit is recorded in README.

No funded mainnet trade, wallet-vendor matrix, native browser zoom, screen-reader session or physical-device test was performed. Pending replacement detection after reload is not automatic: the explicit stop-tracking recovery requires the person to check wallet activity and acknowledge that the old transaction may still confirm. Quotes expire before preparation; a wallet can remain open afterward, so the on-chain minimum and 20-minute deadline remain the final execution constraints.
