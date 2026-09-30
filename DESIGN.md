# IMD Market design system

## Overview

IMD Market is the trading interface for IMD on Ethereum. Since the 2026-09-30 restyle it follows the visual system of [imd.fun](https://imd.fun), the token's home: black paper and white ink in a dark-by-default theme with a light alternative, IBM Plex Mono for every piece of text, 1.5px solid rules instead of shadows or rounded corners, square "pill" navigation cells, and small tracked uppercase labels. On top of that system sits one accent, Pepe green, which carries the meme identity of the token: the filled primary action, the focus ring, the IMD token mark, status dots, and an original frog mascot drawn as SVG.

The composition is dense and flat. Structure is drawn with rules and bordered boxes rather than tonal layers. The main page places the introduction and live market card beside the swap box; explanations and full pool identifiers follow in normal flow. The reusable system lives in `src/style.css`; the page and dialog patterns live in `src/App.tsx`; icons, the token marks and the frog live in `src/Icons.tsx`.

The imd.fun tokens were read from its live stylesheet on 2026-09-30 (paper/ink/dim/faint/mute/soft/hover, `--ok`, `--alarm`, the 1.5px rule, IBM Plex Mono, 40px pills, 11px labels at 0.06em tracking, a 0.24em eyebrow). The green accent, the frog and the light-theme green values are this project's additions, chosen and measured here. The footer keeps the "independent interface" statement so the site does not claim to be imd.fun itself.

## Colors

All colors are sRGB hex. Primitives (`--paper`, `--ink`, `--dim`, `--soft`, `--pepe`, …) are declared once per theme in `src/style.css:30` (dark, the default on `:root`) and `src/style.css:99` (`:root[data-theme="light"]`). Components reference only the semantic tokens below, which point at the primitives, so the theme switch changes primitives alone.

| Semantic token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--bg`, `--surface` | `#000000` | `#ffffff` | Page canvas, cards, swap box, dialogs |
| `--surface-hover` | `#141414` | `#f4f4f4` | Focused amount row background |
| `--surface-inset` | `#262626` | `#e6e6e6` | Disabled primary action fill |
| `--text` | `#ffffff` | `#000000` | Headings, values, control labels |
| `--text-secondary` | `#9a9a9a` | `#555555` | Descriptions, labels, captions, placeholders |
| `--border` (`--rule`) | `#ffffff` | `#000000` | Every structural 1.5px rule and box border |
| `--border-soft` | `#262626` | `#e6e6e6` | Quiet dividers inside dialogs, full-address box |
| `--accent`, `--focus` | `#5dbb46` | `#2f7a22` | Primary action fill, focus ring, green headline line, token mark, step icons, selected slippage |
| `--accent-hover` | `#3e8f31` | `#245f1a` | Primary action hover |
| `--accent-tint` | `#0d1a0a` | `#e9f4e5` | Approval-note background |
| `--on-accent` | `#000000` | `#ffffff` | Text on the accent fill |
| `--inverse` / `--on-inverse` | `#ffffff` / `#000000` | `#000000` / `#ffffff` | Selected direction tab and current nav cell |
| `--positive` | `#3ecf7a` | `#1f9d55` | Success text, connected/live status dots |
| `--error` | `#ff6b62` | `#b3261e` | Field, quote and transaction errors; unavailable-data dot |
| `--backdrop` | `#000000b3` | `#00000080` | Dialog backdrop |
| `--lips` | `#c8443b` | same | Frog mouth only |

Hover on neutral controls uses `color-mix(in srgb, var(--ink) 14%, var(--paper))`, the same formula as imd.fun. Status always has adjacent text; a dot alone never carries meaning. Rendered contrast was measured in the browser for both themes; the lowest text pair is the light-theme accent on white at 5.35:1 and every measured pair is listed in `test/validation.md`. Forced-colors mode keeps system colors and outlines the selected tab, nav cell and slippage option.

The theme is stored under the localStorage key `imd-theme` and applied as `data-theme` on `<html>` by an inline script in `index.html` before paint, the same mechanism imd.fun uses. `applyTheme` in `src/App.tsx` adds a `theme-switching` class that suppresses transitions for one frame so the switch snaps rather than smears.

## Typography

- **Family:** IBM Plex Mono, then `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Four static latin faces are bundled from `src/assets/ibm-plex-mono-latin-{400,500,600,700}-normal.woff2` (SIL OFL 1.1, license in `src/assets/IBM-Plex-Mono-OFL.txt` and published as `dist/ibm-plex-mono-OFL.txt`). `font-display: swap`; no remote font at runtime. All four faces were observed loaded in the production export.
- **Scale** (`src/style.css:69`): `--text-label` 11px, `--text-xs` 12px, `--text-sm` 13px (body default on `<body>`), `--text-body` 14px, `--text-lg` 16px, `--text-h2` 18px, `--text-amount` 28px, `--text-display` `clamp(2.25rem, 5vw, 3.5rem)`.
- **Display (`h1`):** weight 700, line-height 1.05, letter-spacing -0.03em; the second line is in the accent color. 2rem between 44rem and 54rem so the two lines hold beside the swap box.
- **Section headings (`h2`):** 18px, weight 600, -0.01em, line-height 1.2. The swap box title is 16px 700; dialog headings are 18px 600. `h3` step titles are 14px 600.
- **Labels:** the `.label`, `.eyebrow`, `.pill-cell`, `.amount-label-row`, `.chain-badge`, `dt` and similar selectors share 11px uppercase with 0.06em tracking (`src/style.css:211`). The hero eyebrow uses 0.24em tracking, 0.18em below 54rem.
- **Body and captions:** 13px descriptions at 1.6–1.75 line-height with measures capped at 34–52ch; 12px captions and metadata.
- **Amounts:** 28px weight 700, -0.02em, tabular numerals; the estimate output clamps to 22–28px and 24px at the narrowest breakpoint. Prices, balances, addresses and hashes use `font-variant-numeric: tabular-nums`. Full addresses wrap with `overflow-wrap: anywhere`.
- Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. Links inside content are underlined with a 3px offset; navigation cells and buttons are not.

Copy is stored in natural case; uppercase is applied by CSS only.

## Layout

The declared spacing scale is 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64px (`--space-*`); components mostly use those literals directly, with 14px and 18px paddings inside ruled boxes. `--gutter: clamp(16px, 4vw, 34px)` is the page gutter for the header, main and footer.

- Header: flex row that wraps; brand pill and navigation pill on the left, theme toggle and wallet pill on the right; a rule closes it.
- Main: max-width 1180px plus gutters. Trade grid: flexible intro column and a 440px swap column, 64px gap, 56px top padding.
- `68rem` / 1088px: gap 40px, swap column 420px.
- `54rem` / 864px: swap column 340px, gap 24px, display 2rem, market badge hidden, mascot 72px.
- `44rem` / 704px: single column, main max-width 560px; the market card and short address row are hidden so the swap box comes first (full identifiers stay in Pool details); steps stack as ruled rows; pool grid and footer stack.
- `23rem` / 368px: tighter pill cells at 10px, amounts 24px, review details wrap.

Rendered checks: no horizontal overflow at 1440, 768, 390 and 320 CSS pixels; screenshots inspected at 1440 (both themes), 768, 390 and 320 (both themes). Dialogs stay within `calc(100dvh - 32px)` and scroll internally; at 320 the settings and wallet dialog content had `scrollWidth` equal to `clientWidth`. The page is English only, left-to-right; logical properties are used for inline spacing.

## Elevation & depth

There are no shadows. Depth is structural: every container is a 1.5px `--rule` box, rows are separated by rules, and selected states invert paper and ink. Dialogs sit in the browser top layer over a translucent black backdrop (`--backdrop`), without blur. The direction-reverse button overlaps the rule between the two amount rows with a bordered square; it is the only overlapping control. The field-error state adds a 3px inset accent bar in `--error` on the leading edge instead of changing the border.

## Shapes

Border radius is 0 everywhere, including buttons, inputs, token marks and dialogs. Pills are 40px-tall bordered rows whose cells are divided by rules. Token marks are bordered squares (36px, 24px small, 30px inside the token label). Status and route dots are 7px squares. The frog mascot is the only rounded form.

## Components

| Pattern | Source | Behavior |
| --- | --- | --- |
| `Icon` | `src/Icons.tsx` | Named 24-unit SVG icons on `currentColor`, 1.5px stroke, `aria-hidden`; includes `sun`, `moon`, `diamond` (the imd.fun mark) and `flame` |
| `Frog` | `src/Icons.tsx` | Original mascot; face in `currentColor` (accent), fixed black/white features and `--lips` mouth. Used at 96px in the market card and 36px in the footer; decorative only |
| `TokenIcon` | `src/Icons.tsx` | IMD = diamond mark on the accent square; ETH = diamond glyph on paper; `small` variant |
| Pill navigation | `.pill`, `.pill-mark`, `.pill-brand`, `.pill-cell` | Bordered 40px row; `aria-current="true"` cell inverts; external cells carry the external icon and hidden new-tab text; focus ring drawn inside the cell |
| Theme toggle | `.nav-icon` in `src/App.tsx` | Button with a sun/moon icon and a label naming the theme it switches to; persists `imd-theme` |
| Wallet pill | `.pill-cell.wallet-button` | Uppercase "Connect wallet" or the short address (`connected` variant, tabular, natural case) |
| Card | `.card`, `.card-head`, `.card-foot` | Ruled box with a head row and a foot row; the market card adds the price and mascot |
| Swap box | `.swap-card`, `.swap-title`, `.direction-switch`, `.amount-panel`, `.trade-meta`, `.swap-actions` | Stacked ruled rows; pressed direction tab inverts; amount row highlights on focus; presets are bordered buttons |
| Primary action | `.primary-button` | Only accent fill on the page; uppercase; labels follow connect, switch network, quote, review, approval, pending and confirm states; disabled = inset fill with secondary text |
| Secondary actions | `.secondary-button`, `.text-button`, `.icon-button`, `.inline-link`, `.slippage-button` | Bordered uppercase secondary, quiet text and icon buttons, inline underlined recovery links |
| Steps | `.steps` | Three ruled cells (rows below 44rem) with accent-bordered icons and a tracked step number |
| Pool details | `.pool-details` | Ruled definition list; long identifiers wrap; external links underlined |
| Footer | `footer`, `.foot-row`, `.foot-brand`, `.foot-links`, `.foot-bar` | Ruled rows in the imd.fun footer shape: brand column, site links, bar with the back-to-top link |
| `Modal` | `src/App.tsx` | Native `<dialog>`, ruled heading with close button, Escape closes, focus returns to the trigger |
| Slippage selection | `.slippage-options` | Native radios; the checked option fills with the accent; arrows move, Space selects |
| Pending recovery | `.pending-acknowledgment`, pending dialog in `src/App.tsx` | Full hash wraps; checkbox acknowledgment required before stopping local tracking |
| Feedback | `.global-feedback`, `.form-messages`, `.review-status` | Stable polite status regions and alerts; error text in `--error` with a retry link beside it |

Focus uses a 2px accent outline with 3px offset, drawn inside pill cells and tabs, and Highlight in forced colors. Touch targets are 40–48px for main controls; presets, the slippage button and text buttons meet the 24px minimum. Transitions are 150ms on color, background, border and press scale (0.96) only when reduced motion is not requested; there are no entrance animations.

## Do's and don'ts

- Start a new surface from `.card` or the swap-box row pattern; separate content with `--rule`, not with spacing tricks or shadows.
- Keep one accent-filled action per view. Peers use `.secondary-button` or pill cells. Never put the accent on static text other than the headline line.
- Reference semantic tokens only. Add a token for a missing role instead of using a primitive or a raw hex in a component; both theme blocks must define every primitive.
- Uppercase through the shared label selector list, never in copy. Keep labels at 11px or larger and body text at 13px.
- Keep the frog decorative (`aria-hidden`) and in the accent color; do not add other illustrations or a second hue.
- Keep addresses and hashes selectable and fully available; never round a value used as transaction input.
- Calculation and encoding stay in `src/trade.ts`, RPC reads in `src/chain.ts`; visual formatting is never transaction input.

To add a page: reuse the header pill navigation with the new cell marked `aria-current="true"`, wrap content in `main` with the same gutters, group it in `.card` boxes or `.section-heading` plus a ruled grid, end with the same footer, and check 320px and both themes before adding a breakpoint.

## Attribution

Design review follows the assignment's pinned adaptation of [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT. This documentation method follows the pinned [Impeccable document reference by Paul Bakaus](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0. No upstream guide text is redistributed in the website. IBM Plex Mono is bundled under the SIL Open Font License 1.1 (`src/assets/IBM-Plex-Mono-OFL.txt`). The frog, icons and token marks are original SVG assets made for this project.
