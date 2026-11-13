# Design notes

Agrim reads like public signage: a station board you can read in daylight,
at a glance, from across a control room. One monospace face, square 2px ink
borders, ink plates that carry a sign, cobalt for what is live and amber for
figures on ink. Keep to these rules when adding screens.

## Tokens

`web/src/tokens.css` holds the system (colour, type scale, spacing, motion,
layers); `web/src/index.css` adds Agrim's data colours and the shared
components. Everything is an OKLCH token; no colour or font is written
anywhere else.

| Token | Value | Use |
|-------|-------|-----|
| `paper` / `paper-2` / `paper-3` | oklch 95.5% / 91% / 99.5%, cool grey | Page / selected rows and wells / inputs, cells, plates on paper |
| `ink` / `ink-2` / `muted` | oklch 16% / 29% / 47%, blue-black | Text and borders / secondary text / labels and captions |
| `rule` / `ink-rule` | oklch 80% / 34% | Hairlines on paper / rules on ink |
| `accent` | oklch 51% 0.22 264 (cobalt) | The one primary button, focus, what is live |
| `accent-2` | oklch 81% 0.16 82 (amber) | Figures on ink; the Medium status fill and the exercise label, always under ink text |
| `paper-dim` | oklch 80% | Secondary text on the ink bar and plates |
| `risk-red` / `risk-amber` / `risk-green` | oklch 52% 0.19 27 / 62% 0.15 62 / 52% 0.12 150 | Risk only, never decoration |
| `water`, `drain`, `canal` | blues, teal, brown | Rain, flow lines, mapped drains |

MapLibre can't read OKLCH, so `web/src/mapColors.ts` holds hex copies for
the map (and `risk.ts` takes the risk colours from it). Change both together.

## Type

- **Chivo Mono** for everything, in three weights: 400 for reading, 500 for
  labels and names, 800 for heads, figures and buttons. Self-hosted.
- **IBM Plex Sans Devanagari** is the fallback in the same stack, so Hindi
  renders without a second switch.
- Heads: 800, tracked tight (-0.03em), one weight and one colour, sentence case.
  Panel heads 26px (`.h-panel`), page heads up to 44px (`.h-page`), section
  heads 20px (`.h-sub`).
- Labels, captions and table heads (`.label`): 13px, 500, muted, sentence case.
  Never uppercase, never letter-spaced.
- Figures use tabular numerals everywhere and sit a non-breaking space from
  their unit (`62 mm`).

## Components (`web/src/index.css`, `@layer components`)

- `.btn`, `.btn--primary`, `.btn--sm`, `.btn--lg`: square, 2px border, 800.
  One cobalt primary per screen; everything else is outlined ink.
- `.cells` + `.cell`: a choice between a few (tabs, windows, zones, levels).
  Cells share their 2px borders; the chosen one fills ink. `.cell--on-ink`
  for the top bar, `.cells-grid` when they wrap to two columns.
- `.plate`: a square field of ink holding one sign (the landing board, roads to
  avoid, the scenario stamp on the map).
- `.status--red|amber|green`: the status plate on every hotspot row. Red fills
  red with paper text; Medium fills amber under ink text; Low is a green
  square and a word.
- `.field`, `.check`, `.link`, `.row-btn`, `.agrim-range`: inputs, checkboxes,
  text links, whole-row buttons, sliders. Every control has hover, focus
  (2px cobalt outline, instant), active and disabled states.

## Rules

- Borders and space, not shadows. 2px ink under table heads and around plates
  and cells; 1px `rule` between rows. Square corners everywhere.
- Lead with a sentence that answers the question, then the numbers, then the list.
- Colour is never the only signal: every risk colour sits next to a word
  (High, Medium, Low).
- No small uppercase labels, no lines of text joined by middle dots, no
  arrows glued to link text, no dashes in copy ("24 to 48 hours").
- Anything simulated carries the **Exercise / अभ्यास** band (an ink band with
  an amber plate), on the panel and on the map. Proposed sensor sites carry
  **Proposed, illustrative** the same way.
- Motion is stiff, like a departure board: colour changes step, nothing
  pulses. The one moving thing is the dashes on at-risk flow paths, which
  show risk travelling downstream; they stop for readers who ask for reduced
  motion.
- Phone first: the map takes the top ~46% of the screen, the destinations
  become a row of cells that scrolls sideways (the current one is kept in
  view), and nothing else scrolls sideways.
- Language: the public Forecast view and the top bar switch between English
  and Hindi (`web/src/i18n.ts`). Officer tools stay in English. Reasons come
  from the server as numbers (`driver_facts`) so each language words them
  itself. Have a native speaker review the Hindi before launch.
