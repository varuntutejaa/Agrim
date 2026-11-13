import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are self-hosted (no request to a font CDN): Chivo Mono for everything,
// IBM Plex Sans Devanagari for Hindi (Chivo Mono has no Devanagari).
import "@fontsource/chivo-mono/400.css";
import "@fontsource/chivo-mono/500.css";
import "@fontsource/chivo-mono/800.css";
import "@fontsource/ibm-plex-sans-devanagari/400.css";
import "@fontsource/ibm-plex-sans-devanagari/500.css";
import "@fontsource/ibm-plex-sans-devanagari/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
