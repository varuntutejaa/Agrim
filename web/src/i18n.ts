// English / Hindi wording for the public views (Forecast view, masthead, map).
// The officer and jury tools (Simulator, Drainage, MCG desk, Data) stay in
// English. Hindi text should be reviewed by a native speaker before launch.
import type { RiskLevel, WindowRisk } from "./types";

export type Lang = "en" | "hi";

const LANG_KEY = "agrim.lang";
export const savedLang = (): Lang => {
  try { return localStorage.getItem(LANG_KEY) === "hi" ? "hi" : "en"; } catch { return "en"; }
};
export const saveLang = (l: Lang) => {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ }
};

export const locale = (l: Lang) => (l === "hi" ? "hi-IN" : "en-IN");

const STR = {
  en: {
    subtitle: "Gurugram waterlogging forecast",
    tabs: { home: "Home", forecast: "Forecast", simulator: "Simulator", drainage: "Drainage", ops: "MCG desk", about: "About" },
    updated: "Updated",
    forecast: "Forecast",
    next24: "Next 24 h",
    day2: "Day 2",
    allHotspots: "All hotspots, highest risk first",
    rainLayer: "Rain layer",
    off: "Off",
    past72: "Past 72 h",
    rainLayerNote: "Average of the three forecast models on a ~2 km grid. The models themselves are ~9–25 km across, so neighbouring points often match.",
    wettest: (mm: number) => `Wettest hotspot: ${mm} mm forecast.`,
    noRain: "No rain forecast at any hotspot.",
    fetched: (d: string, t: string) => `Forecast from ECMWF, GFS and ICON, fetched ${d} at ${t} IST.`,
    methodNote: "Each forecast is compared with ECMWF's 2018–2026 monsoon record at that hotspot, then combined with terrain (Copernicus DEM), drains (OpenStreetMap) and built-up land (ESA WorldCover). Method in docs/MODEL.md; sources in docs/SOURCES.md.",
    rulesNote: null as string | null, // English uses the server's note
    level: { red: "High", amber: "Medium", green: "Low" } as Record<RiskLevel, string>,
    levelLong: { red: "High · flooding likely", amber: "Medium · flooding possible", green: "Low risk" } as Record<RiskLevel, string>,
    countLabel: { red: "High · likely", amber: "Medium · possible", green: "Low" } as Record<RiskLevel, string>,
    col: { hotspot: "Hotspot", rain: "Rain 24h", status: "Status" },
    mm: "mm",
    needsPin: "Needs a pin",
    action: "Action",
    why: "Why",
    whyWatched: "Why it is watched",
    modelEstimate: "Model estimate",
    chance: "chance of flooding",
    wettestAt: "Wettest",
    score: "Score",
    pinUnchecked: "Map pin not yet checked by the team.",
    adjusted: "Adjusted by MCG",
    adjustedText: (who: string, from: string) => `${who} changed this from ${from}`,
    confidence: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
    downstream: "Risk travels downstream",
    downstreamNote: "Clearing drains at the first hotspot also eases the second.",
    avoid: "Roads to avoid",
    avoidLevel: { red: "Avoid", amber: "Take care" } as Record<"red" | "amber", string>,
    avoidNote: "From Agrim's forecast (a pilot, not an official MCG warning).",
    headline: (c: Record<RiskLevel, number>, lead: string) => {
      const total = c.red + c.amber + c.green;
      const plural = (n: number) => `${n} hotspot${n === 1 ? "" : "s"}`;
      const start = lead ? `${lead} f` : "F";
      if (c.red + c.amber === 0) return `${lead ? `${lead} n` : "N"}o waterlogging expected at any of the ${total} hotspots.`;
      if (c.red === 0) return `${start}looding possible at ${plural(c.amber)}.`;
      return `${start}looding likely at ${plural(c.red)}${c.amber ? `, possible at ${c.amber} more` : ""}.`;
    },
    key: { red: "High · flooding likely", amber: "Medium · flooding possible", green: "Low risk", flow: "Risk flowing downstream" },
    models: (n: number, total: number) => `${n} of ${total} weather models show flooding`,
    coverage: "21 of MCG's 159 hotspots are mapped, from public reports. The full list needs MCG data.",
    stale: (h: number, when: string) => `Last updated ${h} hours ago (${when}). The forecast refresh is delayed; treat this as old.`,
    popupRain: (mm: number, peak: number) => `${mm} mm in 24 h · peak ${peak} mm/h`,
    flowsTo: (names: string) => `Water flows on to ${names}.`,
    receivesFrom: (names: string) => `Receives water from ${names}.`,
  },
  hi: {
    subtitle: "गुरुग्राम जलभराव पूर्वानुमान",
    tabs: { home: "होम", forecast: "पूर्वानुमान", simulator: "सिम्युलेटर", drainage: "जल निकासी", ops: "MCG डेस्क", about: "परिचय" },
    updated: "अपडेट",
    forecast: "पूर्वानुमान",
    next24: "अगले 24 घंटे",
    day2: "दूसरा दिन",
    allHotspots: "सभी हॉटस्पॉट, सबसे ज़्यादा जोखिम पहले",
    rainLayer: "बारिश की परत",
    off: "बंद",
    past72: "पिछले 72 घंटे",
    rainLayerNote: "तीन मौसम मॉडलों का औसत, लगभग 2 किमी के ग्रिड पर। मॉडल खुद 9–25 किमी के होते हैं, इसलिए पास-पास के बिंदु अक्सर एक जैसे दिखते हैं।",
    wettest: (mm: number) => `सबसे ज़्यादा बारिश वाला हॉटस्पॉट: ${mm} मिमी अनुमानित।`,
    noRain: "किसी भी हॉटस्पॉट पर बारिश का अनुमान नहीं।",
    fetched: (d: string, t: string) => `ECMWF, GFS और ICON का पूर्वानुमान, ${d} को ${t} बजे (IST) लिया गया।`,
    methodNote: "हर पूर्वानुमान की तुलना उस हॉटस्पॉट के 2018–2026 के मानसूनी रिकॉर्ड से की जाती है, फिर ज़मीन की ऊँचाई, नालों और पक्की ज़मीन के आँकड़े जोड़े जाते हैं। तरीका: docs/MODEL.md; स्रोत: docs/SOURCES.md।",
    rulesNote: "ये स्कोर लिखित नियमों से बनते हैं; इन्हें अभी पिछली बाढ़ की घटनाओं से जाँचा नहीं गया है। ये प्रायिकता (probability) नहीं हैं।",
    level: { red: "उच्च", amber: "मध्यम", green: "कम" } as Record<RiskLevel, string>,
    levelLong: { red: "उच्च · जलभराव की प्रबल संभावना", amber: "मध्यम · जलभराव की संभावना", green: "कम जोखिम" } as Record<RiskLevel, string>,
    countLabel: { red: "उच्च · प्रबल", amber: "मध्यम · संभव", green: "कम" } as Record<RiskLevel, string>,
    col: { hotspot: "हॉटस्पॉट", rain: "24 घं. बारिश", status: "स्थिति" },
    mm: "मिमी",
    needsPin: "स्थान तय नहीं",
    action: "क्या करें",
    why: "क्यों",
    whyWatched: "इस पर नज़र क्यों",
    modelEstimate: "मॉडल का अनुमान",
    chance: "जलभराव की संभावना",
    wettestAt: "सबसे तेज़ बारिश",
    score: "स्कोर",
    pinUnchecked: "नक्शे पर स्थान की जाँच अभी बाकी है।",
    adjusted: "MCG ने बदला",
    adjustedText: (who: string, from: string) => `${who} ने इसे ${from} से बदला`,
    confidence: { high: "भरोसा: ऊँचा", medium: "भरोसा: मध्यम", low: "भरोसा: कम" },
    downstream: "जोखिम नीचे की ओर बहता है",
    downstreamNote: "पहले हॉटस्पॉट पर नाले साफ़ करने से दूसरे पर भी राहत मिलती है।",
    avoid: "इन रास्तों से बचें",
    avoidLevel: { red: "बचें", amber: "सावधानी रखें" } as Record<"red" | "amber", string>,
    avoidNote: "Agrim के पूर्वानुमान से (यह एक पायलट है, MCG की आधिकारिक चेतावनी नहीं)।",
    headline: (c: Record<RiskLevel, number>, _lead: string) => {
      const total = c.red + c.amber + c.green;
      if (c.red + c.amber === 0) return `${total} में से किसी भी हॉटस्पॉट पर जलभराव की आशंका नहीं।`;
      if (c.red === 0) return `${c.amber} हॉटस्पॉट पर जलभराव की संभावना।`;
      return `${c.red} हॉटस्पॉट पर जलभराव की प्रबल संभावना${c.amber ? `, ${c.amber} और पर संभावना` : ""}।`;
    },
    key: { red: "उच्च · जलभराव की प्रबल संभावना", amber: "मध्यम · जलभराव की संभावना", green: "कम जोखिम", flow: "जोखिम नीचे की ओर" },
    models: (n: number, total: number) => `${total} में से ${n} मौसम मॉडल जलभराव दिखाते हैं`,
    coverage: "MCG के 159 में से 21 हॉटस्पॉट सार्वजनिक रिपोर्टों से नक्शे पर हैं। पूरी सूची के लिए MCG का डेटा चाहिए।",
    stale: (h: number, when: string) => `आखिरी अपडेट ${h} घंटे पहले (${when})। पूर्वानुमान अपडेट होने में देरी है; इसे पुराना मानें।`,
    popupRain: (mm: number, peak: number) => `24 घंटे में ${mm} मिमी · सबसे तेज़ ${peak} मिमी/घंटा`,
    flowsTo: (names: string) => `यहाँ से पानी ${names} की ओर जाता है।`,
    receivesFrom: (names: string) => `यहाँ ${names} से पानी आता है।`,
  },
};

export const t = (l: Lang) => STR[l];

const ACTIONS_HI: Record<RiskLevel, string> = {
  red: "यहाँ पंप लगाएँ और T-12 घंटे तक नालियाँ साफ़ करें; T-3 घंटे पर पंप जाँचें।",
  amber: "T-12 घंटे तक नालियाँ साफ़ करें; पास में एक पंप तैयार रखें।",
  green: "कोई कार्रवाई ज़रूरी नहीं।",
};
export const actionText = (w: WindowRisk, l: Lang) => (l === "hi" ? ACTIONS_HI[w.level] : w.action);

/** "about once in 11 monsoons" in Hindi, from the rarity value e (see model/rules.how_often). */
function howOftenHi(e: number | null): string {
  if (e == null || e <= 0) return "आम मानसूनी दिन";
  if (e >= 3.5) return "2018 से अब तक के रिकॉर्ड से ज़्यादा";
  const days = 10 ** -e * 122;
  if (days >= 1.5) return `हर मानसून में लगभग ${Math.round(days)} दिन`;
  if (days >= 0.75) return "हर मानसून में लगभग एक बार";
  return `लगभग ${Math.round(1 / days)} मानसून में एक बार`;
}

/** The reasons for a hotspot's level, in the chosen language. */
export function reasons(w: WindowRisk, l: Lang): string[] {
  if (l === "en" || !w.driver_facts) return w.drivers;
  return w.driver_facts.map(({ key, value: v, e }) => {
    switch (key) {
      case "rain_24h": return `24 घंटे में ${Math.round(v)} मिमी बारिश (${howOftenHi(e)})`;
      case "peak1h": return `सबसे तेज़ घंटे में ${Math.round(v)} मिमी (${howOftenHi(e)})`;
      case "upstream_rain": return `यहाँ बहकर आने वाले इलाके पर ${Math.round(v)} मिमी बारिश`;
      case "wet_ground": return `ज़मीन पहले से गीली: पिछले 3 दिनों में ${Math.round(v)} मिमी`;
      case "low_spot": return `आसपास की ज़मीन से ${v.toFixed(1)} मीटर नीचे`;
      case "drain_level": return v < 0.1 ? "नज़दीकी नाले के स्तर पर" : `नज़दीकी नाले से सिर्फ़ ${v.toFixed(1)} मीटर ऊपर`;
      case "built_up": return `आसपास की ${Math.round(v * 100)}% ज़मीन पक्की/निर्मित`;
      case "upstream_area": return `${v.toFixed(1)} वर्ग किमी इलाके का पानी इधर बहता है`;
      default: return key;
    }
  });
}
