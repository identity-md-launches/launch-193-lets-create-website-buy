# Reproducing browser checks

Build with `npm ci && npm run typecheck && npm test && npm run build`, then serve `dist/` with an HTTP server. Also serve it under a subpath (the worker used `/dist/`) to validate relative URLs. This file and the wallet fixture are test material; neither is imported into the production app.

## Real public reads

1. With no injected wallet, enter `0.01` ETH. Wait for the live quote; record the output's full `title` value, fee, route, and minimum.
2. Select Sell IMD; confirm the old amount clears. Enter `10` IMD and verify a live ETH estimate.
3. Wait 30 seconds; refresh the quote without connecting. Disable RPC network requests and confirm that the estimate clears and Retry quote is available; restore requests and retry.
4. Copy the contract address, follow the Pool anchor, and inspect the full address and external destinations.
5. Open settings using the keyboard, use arrow keys to select slippage, save, and verify focus returns. Escape and Tab/Shift+Tab should respect the native dialog boundary.

## Isolated transaction UI

Use a fresh local test-browser context with **no installed wallet**. Run the contents of `test/wallet-fixture.js` in that page's developer console, or load it with Playwright `page.addInitScript`. It replaces `window.ethereum` with a fixture whose requests never leave the browser. Reload afterward to remove it. Never load this fixture in a real-wallet context.

The fixture starts on Sepolia. Connect, then use Switch to Ethereum and confirm `window.__imdTest.chain === '0x1'`. Its local fake balance is 2 ETH and 1000 IMD. The local quote rate is deliberately synthetic and used only for interaction validation.

- Enter an invalid amount and submit. Check `aria-invalid`, error text and focus on `#amount`.
- Review a buy. Set `window.__imdTest.rejectSend = true`, confirm, and check the rejection error. The transaction array must stay empty. Clear the flag and repeat to exercise confirmation.
- Sell `10` IMD. The buttons progress through Approve IMD amount, Approve router amount, then Confirm swap. Inspect `window.__imdTest.transactions` and verify that approval amounts equal `10000000000000000000`, approvals target IMD and Permit2, and the swap targets the pinned router with zero native value.
- Set `window.__imdTest.receipt = 'reverted'`; verify the revert error appears and the waiting status clears.
- Set `receipt = 'pending'`; verify the transaction hash is retained in `sessionStorage['imd.pending']`, amounts are locked, and a transaction link remains available. Set `receipt = 'success'`, then use Check transaction to recover. The fixture does not implement full block polling, so it intentionally reaches the recoverable confirmation-error branch.
- Set `window.__imdTest.failReads = true`, change the amount and observe the error. Restore it and retry.
- Set `window.__imdTest.account` to another valid address and call `window.__imdTest.emit('accountsChanged', [window.__imdTest.account])` while review is open. Review must close and stale account state must clear.

To avoid waiting for expiry in a test, temporarily advance `Date.now` by 31 seconds. Leave the clock advanced while requesting the next quote, then restore it; never use this modification for a real transaction.

## Theme and restyle checks (2026-09-30)

The site now defaults to the dark imd.fun theme and stores a light choice under `localStorage["imd-theme"]`. Toggle the theme from the header button and confirm `document.documentElement.dataset.theme`, the stored value and `meta[name=theme-color]` change together, then repeat the layout checks below in both themes. The 2026-09-30 worker ran the direction, preset, reverse, wallet-dialog, settings-focus and hash-navigation checks with real browser clicks and DOM readback, because the recorded script below could not be executed in that session; see `validation.md`.

## Layout and accessibility

Inspect actual screenshots at 1440, 1024, 768, 390, and 320 CSS pixels; compare `document.documentElement.scrollWidth` with the viewport width. Check the main page and open dialogs, not only an accessibility tree. Inspect 200% text enlargement separately from native browser zoom. Emulate reduced motion and forced colors; confirm visible keyboard focus and selected radio state.

The worker ran axe-core 4.11.0 with WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags, then manually checked its findings. An automated pass is not a screen-reader or full WCAG conformance claim. Results and remaining limitations are in `validation.md`.

## Recorded regression script

`test/browser-validation.js` contains an async Playwright page function. For this script, serve the **repository root** locally so both `/dist/` and `/test/wallet-fixture.js` are reachable, navigate to `/dist/`, then pass the script path as `filename` to Playwright MCP's `browser_run_code_unsafe` tool. It refuses an initially injected real wallet and installs the fixture only in the test page. It is never bundled into `dist/`. Do not run it against a real-wallet browser.

The 2026-09-29 run passed 22 assertions. It covers missing-wallet recovery, settings keyboard behavior/focus return, chain switching, amount validation, rejected and successful buys, exact sell approvals, successful sell, revert, account change, review quote failure/retry, delayed signing after quote expiry, and acknowledgment-based pending recovery after reload. The first run reached recovery but timed out because the test searched for the wrong link label; the selector was corrected and the complete script reran successfully. This was a test selector error.

For the delayed-signing regression, the fixture exposes `holdSend` and `releaseSend`; the script advances its page clock and verifies the amounts remain unchanged and refresh disabled. For pending recovery, it reloads with a synthetic unresolved hash, checks that trading is locked, verifies the exact explorer link and required checkbox, then checks tracking is cleared without claiming cancellation.

The settings and pending dialogs produced axe `color-contrast` incomplete results due to overlap detection; their opaque rendered foreground/background pairs were measured separately. No screen reader was used. Native dialog Tab/Shift+Tab can reach browser chrome at the boundary; background app controls remained outside the modal tab sequence, and Tab returned to the dialog. See `validation.md` for precise evidence.
