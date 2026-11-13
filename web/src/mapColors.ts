// Colours for the map. MapLibre can't read OKLCH, so these are hex copies of
// the tokens in tokens.css and index.css. Change both together.
export const MAP = {
  paper: "#0e1017",      // --color-paper (slate)
  paper3: "#151820",     // dark stroke and halo around marks (--color-paper-2)
  ink: "#f4f1ed",        // --color-ink
  ink2: "#caced4",       // --color-ink-2
  muted: "#999fa9",      // --color-muted
  red: "#ef6661",        // --color-risk-red
  amber: "#f1af64",      // --color-risk-amber
  green: "#66c189",      // --color-risk-green
  none: "#6e7279",       // --color-risk-none
  water: "#6198c6",      // --color-water
  drain: "#61a6a6",      // --color-drain
  canal: "#b29267",      // --color-canal
  // The basemap, recoloured to a city at night.
  base: {
    background: "#12151c",
    land: "#14171e",
    water: "#152839",
    waterLine: "#1e384d",
    building: "#1b1e25",
    green: "#111c16",
    boundary: "#434853",
    road: "#272a31",
    roadMajor: "#343840",
    label: "#8d929c",
  },
  // Forecast rain on the grid, deep to bright water.
  rain: ["#193043", "#2f5677", "#4980ac", "#6dabdf"],
} as const;
