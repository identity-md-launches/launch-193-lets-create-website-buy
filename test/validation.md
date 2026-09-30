# IMD Market — restyle implementation and validation

Worker review on 2026-09-30 for the request "change the theme and styling of all the site to match imd.fun and pepe general theme too". This is recorded worker evidence, not independent certification. The 2026-09-29 functional validation of the trading logic (recorded in the previous revision of this file and summarized in the README) is not repeated here; no trading, RPC or encoding code changed in this job.

## Scope and assumptions

Changed surfaces: the whole visual system (`src/style.css`), the header, hero, market card, swap box structure, steps, footer and theme toggle in `src/App.tsx`, icons/mascot in `src/Icons.tsx`, the pre-paint theme script and metadata in `index.html`, the favicon, and the bundled font. `src/chain.ts`, `src/contracts.ts`, `src/trade.ts` and the unit tests are unchanged. Build configuration, `package.json` and the lockfile are unchanged; the font was added as static files, not as a dependency.

Inferred choices:

- The imd.fun reference was taken from its live HTML and CSS on 2026-09-30: dark default with a light theme stored as `imd-theme`, IBM Plex Mono, paper/ink neutrals, 1.5px rules, 40px square pills, 11px tracked uppercase labels, ruled cards and footer rows. Those values were reproduced as this project's tokens.
- "Pepe general theme" was implemented as one green accent (`#5dbb46` dark, `#2f7a22` light) used for the primary action, focus ring, IMD mark and highlights, plus an original SVG frog mascot and a light meme voice in the hero eyebrow only. Errors and transaction copy keep their plain, serious tone.
- Product copy now echoes imd.fun's token page ("Get IMD. Buy it. Hold it.", "Every sell burns supply") because the site is about IMD; the burn claim is imd.fun's own description of POOL4 and is not computed here.
- Two themes are now supported variants. English, left-to-right and modern browsers remain the only implemented variants.

## Better Interface coverage

Read the pinned workflow, the six domains' core principles and the documentation method before editing. Applied while building: native controls, semantic tokens with a primitive seam, one filled action, tracked uppercase via CSS only, 16px+ amount inputs, reduced-motion guards, `:focus-visible` ring, theme-switch transition suppression.

| Domain | Coverage and evidence | Unperformed / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Every button and link has a name (0 unlabeled in a DOM scan of the export); theme toggle names the theme it switches to; skip link is the first Tab stop and was seen rendered; dialog Escape closes and focus returns to the trigger (amount input observed as `activeElement` after closing); visible green focus ring seen on the settings radio, dialog close button and pill cells; native radios/checkbox/dialog retained; `prefers-reduced-motion` guard read from source; forced-colors rules retained for inverted tab, nav cell and selected radio | No screen-reader session, no automated axe run this session (the QA harness of the previous job was not reinstalled), no physical device, no full Tab traversal of every transaction state |
| Layout — Checked | `scrollWidth` equal to viewport at 1440, 768, 390 and 320; full-page screenshots inspected at 1440, 768 and 390, viewport screenshots at 320 in both themes; the settings and wallet dialog content had `scrollWidth == clientWidth` at 320 and 1440; two-column grid holds to 44rem then stacks; ruled steps/footer stack cleanly | Browser-native zoom and 200% text enlargement not performed this session; RTL not applicable |
| Writing — Checked | Verb-first actions retained; new labels ("Switch to light theme", "Read about $IMD on imd.fun", "imd.fun", "Docs", "Explorer") name their destination; one capitalization policy (sentence case in copy, uppercase applied by CSS); meme voice limited to the hero eyebrow; error and transaction copy untouched | No comprehension study |
| Typography — Checked | All four IBM Plex Mono faces observed loaded via `document.fonts`; computed `h1` family is the bundled font; heading sizes descend (display → 18px h2 → 14px h3); headline holds two lines at 1440 and 768 after the fix below; tabular numerals on amounts, prices and addresses; measures capped; 320 wrapping inspected | Fallback-font rendering on other platforms not inspected |
| Colors — Checked | Both theme blocks define every primitive; contrast measured from computed colors against the actual opaque ancestor background in both themes (table below); status dots always paired with text; theme switch verified to update `data-theme`, `localStorage` and `theme-color` | Hover and disabled pairs were not measured; overlay backdrop pairs not applicable to text |
| UI — Checked | Flat ruled surfaces, radius 0, one icon set at 1.5px stroke, inverted selected states, 150ms color transitions and 0.96 press scale only under `no-preference`; theme switch suppresses transitions for a frame; loading/empty/error states of the swap box exercised offline | No Animations-panel replay; no wallet-connected states rendered this session (no injected wallet in the browser tool) |

## Findings, fixes and rechecks

| Severity / domain | Source | Finding and correction | Recheck |
| --- | --- | --- | --- |
| Medium / typography | `src/App.tsx:771`, `src/style.css:76` | The green headline line "Buy it and hold it." wrapped to a third line with a one-word orphan at 1440 and 768. Shortened to "Buy it. Hold it.", capped the display size at 3.5rem and set 2rem with a 340px swap column between 44rem and 54rem. | Rendered: two lines at 1440 and at 768 (`h1` height / line-height = 2). |
| Low / layout | `src/style.css:227` | The eyebrow's diamond icon centred vertically across two wrapped lines at 320. Aligned to the first line with `align-items: flex-start`. | Inspected at 320 after rebuild. |
| Low / UI | `src/style.css:805` | The swap-note shield icon sat centred beside two centred lines and read as a floating glyph. Made it inline with the text. | Inspected at 768 and 390 after rebuild. |
| Low / UI | `src/App.tsx:1283` | Below 44rem the market card, and with it the only frog, is hidden, so the Pepe identity vanished on phones. Added the frog to the footer brand at every width. | Inspected at 390 and 768. |

No unresolved blocker was observed in the checked scope.

## Actual commands and results

Node 22.23.2, npm 10.9.8. Dependencies were installed from the unchanged lockfile in an isolated copy under `$TMPDIR/imd-build` with an npm cache under `$TMPDIR/imd-npm-cache`; nothing was installed inside the repository.

```sh
npm ci --cache "$TMPDIR/imd-npm-cache" --no-audit --no-fund   # exit 0
npm run typecheck                                              # tsc --noEmit, exit 0
node --import tsx --test test/trade.test.ts                    # 8 passed, 0 failed
npm run build                                                  # Vite 7.3.6, exit 0
```

`npm test` (which runs `tsx --test`) failed in this sandbox with `EPERM` on `listen` for tsx's IPC pipe under `/tmp`; the same tests were run through Node's test runner with the tsx loader instead (`node --import tsx --test`), all 8 passing. The script itself was not changed.

The final export was copied back to `dist/` after the last source change. Export: 11 files. Asset references in `dist/index.html` are relative (`./favicon.svg`, `./assets/...`). `test/export-manifest.json` records every file's SHA-256 and byte count.

### Browser inspection

Playwright MCP browser tool serving the repository at `http://127.0.0.1:8899/dist/index.html` (a subpath, so relative URLs were exercised). The browser has no internet, so public RPC requests fail; the only console errors were the two RPC hosts unreachable, and no application exception. All nine local resources (HTML, CSS, three chunks, four fonts, favicon) returned 200.

Interactions performed with real browser clicks/keys and read back from the DOM:

- Theme toggle: dark → light → dark; `data-theme`, `localStorage["imd-theme"]` and `meta[name=theme-color]` updated each time.
- Enter in the amount field without a wallet opened the wallet dialog; Connect browser wallet produced "No browser wallet found…" (7.53:1 on black); Escape closed the dialog and focus returned to the amount input.
- Settings opened from its icon; Tab focused the checked 0.5% radio with a visible green ring; dialog content had no horizontal overflow at 320.
- Sell IMD: `aria-pressed` true, amount cleared, presets became 10/50/100, pay token IMD. Preset 50 filled the field and, offline, produced "Couldn't get a live quote…" with a Retry quote link. The reverse button returned to Buy and cleared the amount and error.
- Pool navigation cell set `location.hash` to `#pool`; the skip link rendered on the first Tab.

Screenshots were inspected inline at 1440 (dark, both full page and viewport; light not at 1440), 768 (dark, full page), 390 (dark, full page) and 320 (dark and light viewports, settings dialog in light). The browser tool could not write into the repository (`EROFS`), and its output directory is not readable from the shell, so no screenshot files are committed.

Not performed this session: the recorded regression script `test/browser-validation.js` (it needs the tool's code-execution method, which was not permitted here); wallet-connected, review, pending and approval states in the browser; axe scan; native zoom; screen reader; real device. Those states are unchanged in logic and were validated on 2026-09-29; their new styling was reviewed in source only.

### Rendered contrast

Computed foreground on the actual opaque ancestor background, WCAG relative luminance, rounded to two decimals.

| Element | Dark | Light |
| --- | --- | --- |
| Headline accent line | #5dbb46 / #000000 = 8.66 | #2f7a22 / #ffffff = 5.35 |
| Intro copy, eyebrow, labels, captions, step text, footer bar | #9a9a9a / #000000 = 7.46 | #555555 / #ffffff = 7.46 |
| Primary action label | #000000 / #5dbb46 = 8.66 | #ffffff / #2f7a22 = 5.35 |
| Selected direction tab and current nav cell | #000000 / #ffffff = 21.00 | #ffffff / #000000 = 21.00 |
| Idle tab, presets, values, footer links | 21.00 | 21.00 |
| Error text | #ff6b62 / #000000 = 7.53 | #b3261e / #ffffff (declared; not measured rendered) |

All measured text pairs exceed 4.5:1. The light-theme error pair was not rendered during the session and is reported as unmeasured.

## Completion and limits

**Complete for the stated restyle scope.** The full site now uses the imd.fun system with the Pepe accent in both themes, builds from the unchanged lockfile, typechecks, passes its unit tests, and was inspected in the browser at four widths. Limits: no committed screenshots, no scripted regression run, no wallet-connected rendering, no axe/zoom/screen-reader pass this session. Publication to IPFS/ENS remains the publisher's step.
