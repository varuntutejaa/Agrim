import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are self-hosted (no request to a font CDN): Wix Madefor Display for
// heads, Wix Madefor Text for everything else, IBM Plex Sans Devanagari for Hindi.
import "@fontsource/wix-madefor-display/500.css";
import "@fontsource/wix-madefor-text/400.css";
import "@fontsource/wix-madefor-text/500.css";
import "@fontsource/wix-madefor-text/600.css";
import "@fontsource/ibm-plex-sans-devanagari/400.css";
import "@fontsource/ibm-plex-sans-devanagari/500.css";
import "@fontsource/ibm-plex-sans-devanagari/600.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
