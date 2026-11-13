# Design notes

Agrim reads like a calm night desk: slate surfaces, the product in smoked
glass, one periwinkle action and one apricot signal, and a city map at
night where the risk dots are the brightest things on screen. It should feel
unhurried and exact, never a neon control room or a dashboard of tiles.
Keep to these rules when adding screens.

## Tokens

`web/src/tokens.css` holds the system (colour, type scale, spacing, radii,
glass, motion, layers); `web/src/index.css` adds Agrim's data colours and the
shared components. Everything is an OKLCH token; no colour or font is written
anywhere else.

| Token | Value | Use |
|-------|-------|-----|
| `paper` / `paper-2` / `paper-3` | oklch 17.5% / 21% / 25%, slate | Page / bars, wells and selected rows / inputs and raised surfaces |
| `ink` / `ink-2` / `muted` | oklch 96% / 85% / 70% | Text / secondary text / labels and captions |
| `rule`, `field-edge` | oklch 30%, 50% | Hairlines / the edge of an input (3:1 on slate) |
| `accent` (periwinkle) | oklch 77% 0.10 274 | The one primary button, focus, the chosen tab, what is done |
| `accent-2` (apricot) | oklch 83% 0.095 62 | What is open or waiting: the Exercise and Proposed tags, notices |
| `well`, `well-ink` | bone, oklch 95.5% / 21% | Light cards for messages the product sends (crew SMS, citizen alerts) |
| `risk-red` / `risk-amber` / `risk-green` | oklch 68% 0.17 25 / 80% 0.12 68 / 74% 0.12 155 | Risk only, never decoration |
| `water`, `drain`, `canal` | blues, teal, brown | Rain, flow lines, mapped drains |

MapLibre can't read OKLCH, so `web/src/mapColors.ts` holds hex copies for
the map (and `risk.ts` takes the risk colours from it). Change both together.

## Type

- **Wix Madefor Display 500** for heads: modest sizes, tracking -0.022em,
  sentence case. The board and the map are the loud parts.
- **Wix Madefor Text 400, 500 and 600** for everything else; 600 for buttons
  and names that need weight.
- **IBM Plex Sans Devanagari** is the fallback in both stacks, so Hindi
  renders without a second switch.
- Labels, captions and column heads (`.label`): 13px, 500, muted, sentence
  case. Never uppercase, never letter-spaced, never mono.
- Figures use tabular numerals and sit a non-breaking space from their unit
  (`62 mm`).

## Components (`web/src/index.css`, `@layer components`)

- `.btn`, `.btn--primary`, `.btn--sm`, `.btn--lg`: pills. One periwinkle
  primary per screen (dark text, a lit top edge); everything else a ghost pill.
- `.cells` + `.cell`: tabs as a ruled row; the chosen one carries a periwinkle
  dot and an underline, never a boxed segment. `.cells-grid` turns a choice
  that wraps into two columns of pills.
- `.plate`: smoked glass with a lit top edge (the landing board, roads to
  avoid, the scenario stamp and key on the map, map popups). Never glass on glass.
- `.status--red|amber|green`: a status word with its dot in a hairline pill,
  on every hotspot row.
- `.tag`: a small apricot pill (Exercise / अभ्यास, Proposed, illustrative).
- `.notice`: an apricot hairline around slate, for an old forecast or a failed request.
- `.field`, `.check`, `.link`, `.row-btn`, `.agrim-range`: inputs, checkboxes,
  text links, whole-row buttons, sliders. Every control has hover, focus
  (2px periwinkle outline, instant), active and disabled states.

## Rules

- Figures live in rows, lists and one ruled tally (the High / Medium / Low
  counts), never a grid of stat tiles.
- Lead with a sentence that answers the question, then the numbers, then the list.
- Colour is never the only signal: every risk colour sits next to a word
  (High, Medium, Low).
- Red, amber and green stay for risk even though the theme avoids a red:
  they are the product's safety meaning.
- No small uppercase labels, no lines of text joined by middle dots, no
  arrows glued to link text, no dashes in copy ("24 to 48 hours").
- Anything simulated carries the **Exercise / अभ्यास** band (slate with an
  apricot rule and tag), on the panel and on the map. Proposed sensor sites
  carry **Proposed, illustrative** the same way.
- The map is a city at night: the basemap is recoloured dark, road shields are
  hidden, and the hotspot dots, flow paths and catchments carry the colour.
- Motion is quiet. The one moving thing is the dashes on at-risk flow paths,
  which show risk travelling downstream; they stop for readers who ask for
  reduced motion.
- Phone first: the map takes the top ~46% of the screen, the destinations
  are a ruled row that scrolls sideways if it must (the current one is kept
  in view), and nothing else scrolls sideways.
- Language: the public Forecast view and the top bar switch between English
  and Hindi (`web/src/i18n.ts`). Officer tools stay in English. Reasons come
  from the server as numbers (`driver_facts`) so each language words them
  itself. Have a native speaker review the Hindi before launch.
