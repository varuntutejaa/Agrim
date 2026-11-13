// Colours for the map. MapLibre can't read OKLCH, so these are hex copies of
// the tokens in tokens.css and index.css. Change both together.
export const MAP = {
  paper: "#edf0f4",      // --color-paper
  paper3: "#fbfeff",     // --color-paper-3
  ink: "#0a0d13",        // --color-ink
  ink2: "#282b32",       // --color-ink-2
  muted: "#565b64",      // --color-muted
  red: "#be2323",        // --color-risk-red
  amber: "#c46d00",      // --color-risk-amber (marks)
  green: "#287c42",      // --color-risk-green
  none: "#9fa5ac",       // --color-risk-none
  water: "#255c87",      // --color-water
  drain: "#2f6f73",      // --color-drain
  canal: "#86693a",      // --color-canal
  // The basemap, recoloured to the page's cool grey.
  base: {
    background: "#e8ebef",
    water: "#c6d5e2",
    waterLine: "#adc1d3",
    building: "#dadee3",
    green: "#e1e5e8",
    boundary: "#a9b0b8",
    label: "#5f646d",
  },
  // Forecast rain on the grid, light to deep water.
  rain: ["#dbe5ee", "#a6bfd4", "#5c87ab", "#255c87"],
} as const;
