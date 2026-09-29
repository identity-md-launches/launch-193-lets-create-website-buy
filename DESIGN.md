# IMD Market design system

## Overview

This is a focused trading interface for people who already have, or want to acquire, IMD on Ethereum. It uses a pale neutral canvas, dark blue-gray text, a single blue action accent, and white contained surfaces. The main composition puts a short product introduction and live market information beside the swap form. Supporting explanations and full pool identifiers follow in normal document flow.

The visual direction was inferred for this assignment, not supplied as an existing brand standard. An independent-interface statement in the footer avoids implying ownership by IdentityMD or Uniswap. The reusable system lives in `src/style.css`; the page and dialog patterns live in `src/App.tsx`.

## Colors

The implementation uses sRGB hex values, with neutral/blue primitives mapped to semantic properties in `src/style.css:9`. Apply semantic tokens in components.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#f6f8fc` | Page canvas |
| `--surface` | `#ffffff` | Swap card, dialog, selected segment |
| `--surface-soft` | `#fafbfe` | Pay panel and quiet surface |
| `--surface-inset` | `#eef1f7` | Receive panel and control track |
| `--text` | `#16223a` | Headings and primary text |
| `--text-secondary` | `#566278` | Explanations and secondary labels |
| `--text-muted` | `#616d82` | Captions, balance labels, metadata |
| `--border` | `#e1e6ef` | Surface separation |
| `--border-strong` | `#c8d0df` | Secondary control boundaries |
| `--accent`, `--focus` | `#245ae8` | Primary action and focus outline |
| `--accent-hover` | `#1948c7` | Hover fill and blue link text |
| `--accent-soft` | `#edf2ff` | Secondary action and icon backgrounds |
| `--accent-border` | `#dce6ff` | Accent-tinted border and decorative orbits |
| `--on-accent` | `#ffffff` | Text on the primary action |
| `--positive` | `#25734c` | Confirmation and connected data indicators |
| `--error` | `#b02c39` | Recoverable form/transaction errors |
| `--warning` | `#856222` | Unavailable market indicator |

The ETH token glyph additionally uses `#627493` on `#eaedf5` as an asset color. There is one light theme. Forced-colors mode preserves system colors and adds explicit selection outlines. Status always has adjacent text; a dot alone is never the only signal. Rendered contrast measurements and review limitations are in `test/validation.md`.

## Typography

- **Family:** local variable Manrope, then Arial and generic sans-serif. `src/assets/manrope-latin.woff2` provides normal weights 200–800; the UI uses 400–800. `font-display: swap`; no remote font service at runtime.
- **Display:** `--text-display: clamp(2.8rem, 4.6vw, 4rem)`, weight 650, line-height 1.14, letter-spacing -2.8px. Responsive overrides set 3.1rem, 2.65rem, or 2.7rem at the specified breakpoints.
- **Section heading:** 1.75rem, weight 650, line-height 1.3, letter-spacing -0.85px; 1.45rem at medium widths and 1.6rem on the stacked layout. Swap title is 1.25rem; dialog heading is 1.35rem.
- **Body:** 1rem; hero description 1.125rem on wide screens, 1rem on smaller screens. Paragraph line-height defaults to 1.65. Supporting short descriptions are 0.8125rem with 1.7 line-height, reduced to 0.75rem on mobile.
- **UI:** 0.875rem controls, 0.8125rem compact text, 0.75rem captions. The network badge at the narrowest breakpoint and the intro eyebrow below 54rem use 0.6875rem (11px).
- **Amounts:** 2rem at full width, 1.75rem at the smallest breakpoint, with tabular numerals. Transaction encoding always retains bigint precision; the public estimate is rounded for display and the review shows its exact decimal value.

Headings use balanced wrapping; descriptions use pretty wrapping. Full addresses and exact review amounts wrap with `overflow-wrap: anywhere`. Supporting paragraph measures are limited to roughly 32–51 characters. The local font was observed loaded in the production browser.

## Layout

The stylesheet declares a spacing scale of 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Component rules also use literal values from this scale and a few optical adjustments. Groups have more space between them than their internal controls.

- Header/footer maximum width: 1280px. Main maximum width: 1140px including 32px side padding.
- Wide trading grid: flexible introduction, 456px swap column, 84px gap. At very wide screens the section starts 83px below the header.
- `68rem` / 1088px: grid gap becomes 40px, swap column 420px, supporting gaps tighten.
- `54rem` / 864px: swap column becomes 380px; brand suffix and separate network label disappear; the decorative market orbits disappear.
- `44rem` / 704px: main becomes a single column, max-width 520px with 24px gutters. The redundant market card is hidden so the quote form comes first. Steps and pool details stack. Full contract identifiers remain available in Pool details.
- `23rem` / 368px: 16px gutters, smaller form padding and amount text; wrapping is enabled for compact form footers and review details. The brand icon is omitted to retain readable navigation and wallet controls.

The main swap action remains in normal flow, inset from the viewport. Nothing is fixed over mobile content. Dialogs have a maximum height of `calc(100dvh - 32px)` and scroll internally. Market decoration uses a wrapping flex layout so it cannot obscure an enlarged price.

Production viewports at 1440, 1024, 768, 390, and 320 CSS pixels were checked for document overflow; screenshots were inspected at 1440, 768, 390, and 320 CSS pixels. A 200% root-font enlargement was also inspected; this is a text-resize check, not native browser zoom. The page is English and does not promise RTL/localization support.

## Elevation & depth

The swap card uses a restrained two-layer shadow: `0 12px 38px -20px #20396330, 0 2px 5px #20396303`. Market information uses a structural border instead. The active direction segment has a small `0 2px 3px #16223a07` shadow.

Native dialogs sit in the browser's top layer, with `0 24px 80px #14244330`, a `#16223a66` backdrop, and 4px backdrop blur. The swap-direction button overlaps the two amount panels with a white border; it is the only small overlapping control.

## Shapes

Swap and dialog shells use 22px corners. Amount panels use 12px; primary actions and direction tracks use 10px; selected direction buttons use 7px. Token labels are capsules, token symbols are circles, and utility controls are compact rounded rectangles. The outer and inner surfaces are inset consistently rather than sharing the same radius.

## Components

| Pattern | Source / reuse | Behavior |
| --- | --- | --- |
| `Icon` | `src/Icons.tsx` | Named SVG icons; `currentColor`, 1.6px stroke, configurable size, decorative `aria-hidden` |
| `TokenIcon` | `src/Icons.tsx` | IMD/ETH and small variants; never mistaken for a token picker |
| `External` | `src/App.tsx` | Named destination, external-link icon, hidden new-tab announcement, safe `rel` |
| `Modal` | `src/App.tsx`, `Modal` | Native dialog, labelled heading, close button, Escape, background inertness, focus restored to trigger |
| Direction switch | `.direction-switch` | Group of native pressed buttons; clears the previous amount and quote on direction change |
| Amount panel | `.amount-panel` | Persistent label, decimal keyboard, inline error association, focused input, tabular numbers; presets are real buttons |
| Primary action | `.primary-button` | One filled blue action; labels reflect connect, switch network, quote, review, approval, pending, or confirmation states |
| Secondary actions | `.wallet-button`, `.text-button`, `.icon-button`, `.inline-link` | Tinted wallet entry, neutral utility actions, explicitly labelled icons, in-context recovery |
| Slippage selection | `.slippage-options` | Native labelled radios; checked border/fill; arrows navigate and Space selects |
| Pending recovery | `.pending-acknowledgment` in `src/style.css`; pending modal in `src/App.tsx` | Full transaction hash wraps. A native checkbox with a padded wrapping label requires acknowledgment before stopping local tracking. The copy explicitly states this does not cancel the on-chain transaction. |
| Transaction feedback | `.global-feedback`, `.review-status` | Stable polite status regions; only the active surface speaks status; field and transaction errors use alerts |

Quote refresh is disabled while a wallet request is outstanding. Quote failures appear inside the review dialog with a retry action, and the unavailable estimate is labelled explicitly.

Focus uses a 3px blue perimeter with 4px offset, and system Highlight in forced colors. Inputs use a 2px focus outline. Most touch controls are 39–53px tall; compact presets and inline utility controls meet the 24px minimum or the inline-text exception. There are no autoplay, loading shimmer, or entrance animations. Color/background/press transitions are 150ms only when reduced motion is not requested; press scale is 0.96.

## Do's and don'ts

- Reuse semantic colors, the existing text scale, and `.section-heading` for a new section; keep addresses selectable and fully available.
- Keep the filled action reserved for the next consequential step. Label actual actions and explain recovery beside errors.
- Never supply example market values as a live fallback or mark a transaction successful before a successful receipt.
- Keep calculation/encoding logic in `trade.ts` and RPC reads in `chain.ts`; visual formatting must never be used as transaction input.
- Do not add remote fonts, an additional accent palette, unsupported network choices, or a dark theme without a concrete product need and another review.

For another page, retain the header/main/footer structure, use the same main width and gutter rules, add a section heading and grouped content, and check the smallest supported width before adding a new breakpoint.

## Attribution

Design review follows the assignment's pinned adaptation of [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT. This documentation method follows the pinned [Impeccable document reference by Paul Bakaus](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0. No upstream guide text is redistributed in the website. Manrope's license is included at `src/assets/OFL.txt`.
