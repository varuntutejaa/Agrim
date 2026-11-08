# Design notes

Agrim should read like a newsroom data desk: calm, exact and easy to act
on. It shouldn't look like a generic dashboard template. Keep to these rules
when adding screens (dashboard, alerts, Hindi).

## Tokens (`web/src/index.css`, `@theme`)

| Token | Value | Use |
|-------|-------|-----|
| `paper` / `paper-2` / `paper-3` | #f5f2eb / #ece7dc / #e2dccf | Page, selected rows, quiet fills |
| `ink` / `ink-2` / `ink-3` | #17191e / #4b5058 / #82868d | Text, secondary text, labels |
| `rule` | #d8d1c2 | Hairlines between rows |
| `risk-red` / `risk-amber` / `risk-green` | #b42318 / #c27a0e / #3f7a50 | Risk only. Never decoration |
| `water` | #24527a | Rain, drains, storm footprint |

`web/src/risk.ts` repeats the risk colours for the map; keep the two in step.

## Type

- **Newsreader** (serif) for headline sentences and big names, e.g. "Flooding likely at 3 hotspots."
- **IBM Plex Sans** for text. Plex Sans Devanagari matches it for Hindi (milestone 7).
- **IBM Plex Mono** with tabular figures for every number, so columns line up.
- Small-caps labels: the `.kicker` class.

## Rules

- Hairlines and space, not cards and shadows. 1 px `rule` between rows, 1 px `ink` under headers.
- Square corners. No gradients, glows, emoji or icon soup.
- Lead with a sentence that answers the question, then the numbers, then the list.
- Colour is never the only signal: every risk colour sits next to a word ("Likely", "Possible").
- Anything simulated carries the striped **EXERCISE / अभ्यास** band, on the panel and on the map.
- Phone first: the map takes the top ~46% of the screen, map overlays are hidden or compact, and nothing scrolls sideways.
- Language: the public Forecast view and the masthead switch between English and Hindi (`web/src/i18n.ts`, font IBM Plex Sans Devanagari). Officer tools stay in English. Reasons come from the server as numbers (`driver_facts`) so each language words them itself. Have a native speaker review the Hindi before launch.
