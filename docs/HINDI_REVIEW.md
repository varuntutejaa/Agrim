# Hindi text for a native speaker to check

Every Hindi line Agrim shows or sends, with its English original where there
is one. The public Forecast view, the masthead, the citizen SMS and the
voice-call script are in Hindi; officer tools stay in English. Placeholders
like `${mm}` or `{name}` are filled in by the app (numbers, place names,
times); keep them as they are.

Please write a better wording in the last column wherever a line sounds
machine-translated, too formal, or unclear to someone reading it on a phone
in a hurry. The lines in "Check these first" are the ones we already suspect.

Regenerate the full table after code changes with
`python scripts/hindi_lines.py .` (it reads `web/src/i18n.ts`, `model/alerts.py`
and every other file with Hindi text).

## Check these first

| # | Where | Hindi now | English meaning | Why it's flagged |
|---|---|---|---|---|
| 1 | `web/src/i18n.ts` `confidence` | भरोसा: ऊँचा / मध्यम / कम | High / medium / low confidence | "भरोसा: ऊँचा" sounds unnatural; perhaps "भरोसा: ज़्यादा" |
| 2 | `web/src/i18n.ts` `downstream`, `key.flow` | जोखिम नीचे की ओर बहता है | Risk travels downstream | Word-for-word from English; a reader may not get that water flows on to the next spot |
| 3 | `web/src/i18n.ts` `countLabel` | उच्च, प्रबल / मध्यम, संभव / कम | High, likely / Medium, possible / Low | "उच्च, प्रबल" is clipped |
| 4 | `web/src/i18n.ts` `level` | उच्च / मध्यम / कम | High / Medium / Low | Mixes formal (उच्च) and everyday (कम) Hindi |
| 5 | `model/alerts.py` SMS | Agrim पायलट: Hero Honda Chowk पर जलभराव की संभावना, … | Agrim pilot: waterlogging likely at Hero Honda Chowk, … | Place names stay in Latin script inside Hindi SMS; should they be in Devanagari (हीरो होंडा चौक)? |
| 6 | `web/src/i18n.ts` `rulesNote` | … ये संभावना का प्रतिशत नहीं हैं। | … they are not probabilities | Replaced the textbook "प्रायिकता"; check the new wording |
| 7 | `web/src/i18n.ts` `stored`, `waking`, `down`, `storedNote`, `retry`, `ago` | (see table) | Stored copy and server-waking banner | New on 16 Nov 2026 |
| 8 | `web/src/i18n.ts` public actions (lines 158 to 160) | बारिश से पहले MCG की टीम यहाँ पंप लगाए और नालियाँ साफ़ करे। | Before the rain, MCG crews should place a pump here and clear the drains | New on 16 Nov 2026 |
| 9 | `web/src/i18n.ts` `confidenceNote`, `imdNote` | (see table) | What confidence means; why not IMD yet | New on 16 Nov 2026; long sentences |
| 10 | `model/alerts.py` all-clear SMS | Agrim पायलट: {name} पर जलभराव का खतरा टल गया है और जगह की जाँच हो चुकी है। सावधानी से चलें। | All clear at {name}. The waterlogging risk has passed and the spot has been checked. Drive with care. | New on 16 Nov 2026; this goes out by SMS |
| 11 | `web/src/i18n.ts` `coverage` | MCG के 159 में से 21 हॉटस्पॉट … इनमें से 19 नक्शे पर। | 21 listed, 19 on the map, out of MCG's 159 hotspots | New wording on 16 Nov 2026 |

## Every Hindi line

| Where | Key | English | Hindi | Better wording (reviewer) |
|---|---|---|---|---|
| web/src/i18n.ts:84 | subtitle | Gurugram waterlogging forecast | गुरुग्राम जलभराव पूर्वानुमान | |
| web/src/i18n.ts:85 | tabs | Home / Forecast / Simulator / Drainage / MCG desk / About | होम / पूर्वानुमान / सिम्युलेटर / जल निकासी / MCG डेस्क / परिचय | |
| web/src/i18n.ts:86 | updated | Updated | अपडेट | |
| web/src/i18n.ts:87 | forecast | Forecast | पूर्वानुमान | |
| web/src/i18n.ts:88 | next24 | Next 24 h | अगले 24 घंटे | |
| web/src/i18n.ts:89 | day2 | Day 2 | दूसरा दिन | |
| web/src/i18n.ts:90 | allHotspots | All hotspots, highest risk first | सभी हॉटस्पॉट, सबसे ज़्यादा जोखिम पहले | |
| web/src/i18n.ts:91 | rainLayer | Rain layer | बारिश की परत | |
| web/src/i18n.ts:92 | off | Off | बंद | |
| web/src/i18n.ts:93 | past72 | Past 72 h | पिछले 72 घंटे | |
| web/src/i18n.ts:94 | rainLayerNote | Average of the three forecast models on a 2 km grid. The models themselves are about 9 to 25 km across, so neighbouring points often match. | तीन मौसम मॉडलों का औसत, लगभग 2 किमी के ग्रिड पर। मॉडल खुद 9 से 25 किमी के होते हैं, इसलिए पास-पास के बिंदु अक्सर एक जैसे दिखते हैं। | |
| web/src/i18n.ts:95 | wettest | Wettest hotspot: ${mm} mm forecast. | सबसे ज़्यादा बारिश वाला हॉटस्पॉट: ${mm} मिमी अनुमानित। | |
| web/src/i18n.ts:96 | noRain | No rain forecast at any hotspot. | किसी भी हॉटस्पॉट पर बारिश का अनुमान नहीं। | |
| web/src/i18n.ts:97 | fetched | Forecast from ECMWF, GFS and ICON, fetched ${d} at ${t} IST. | ECMWF, GFS और ICON का पूर्वानुमान, ${d} को ${t} बजे (IST) लिया गया। | |
| web/src/i18n.ts:98 | methodNote | Each forecast is compared with ECMWF's 2018 to 2026 monsoon record at that hotspot, then combined with terrain (Copernicus DEM), drains (OpenStreetMap) and built-up land (ESA WorldCover). Method in docs/MODEL.md; sources in docs/SOURCES.md. | हर पूर्वानुमान की तुलना उस हॉटस्पॉट के 2018 से 2026 के मानसूनी रिकॉर्ड से की जाती है, फिर ज़मीन की ऊँचाई, नालों और पक्की ज़मीन के आँकड़े जोड़े जाते हैं। तरीका: docs/MODEL.md; स्रोत: docs/SOURCES.md। | |
| web/src/i18n.ts:99 | confidenceNote | Confidence (the three dots) shows how many of the three weather models agree that the spot will flood. It is agreement between models, not a calibrated probability. | भरोसा (तीन बिंदु) बताता है कि तीन में से कितने मौसम मॉडल इस जगह जलभराव दिखाते हैं। यह मॉडलों की आपसी सहमति है, जाँची हुई संभावना नहीं। | |
| web/src/i18n.ts:100 | imdNote | Why not IMD yet: Agrim needs free, hourly, machine-readable rain for every hotspot, plus a 2018 to 2026 record at the same points to judge it against. Open-Meteo serves that for ECMWF, GFS and ICON. IMD gauge and nowcast data are the next input to add. | IMD का डेटा अभी क्यों नहीं: Agrim को हर हॉटस्पॉट के लिए मुफ़्त, घंटेवार और मशीन से पढ़ी जा सकने वाली बारिश चाहिए, और उन्हीं जगहों का 2018 से 2026 का रिकॉर्ड भी, ताकि उससे तुलना हो सके। Open-Meteo यह ECMWF, GFS और ICON के लिए देता है। IMD के रेन गेज और नाउकास्ट डेटा अगला कदम हैं। | |
| web/src/i18n.ts:101 | rulesNote | (server text) | ये स्कोर लिखित नियमों से बनते हैं; इन्हें अभी पिछली बाढ़ की घटनाओं से जाँचा नहीं गया है। ये संभावना का प्रतिशत नहीं हैं। | |
| web/src/i18n.ts:102 | level | High / Medium / Low | उच्च / मध्यम / कम | |
| web/src/i18n.ts:103 | levelLong | High, flooding likely / Medium, flooding possible / Low risk | उच्च, जलभराव की प्रबल संभावना / मध्यम, जलभराव की संभावना / कम जोखिम | |
| web/src/i18n.ts:104 | countLabel | High, likely / Medium, possible / Low | उच्च, प्रबल / मध्यम, संभव / कम | |
| web/src/i18n.ts:105 | col | Hotspot / Rain 24h / Status | हॉटस्पॉट / 24 घं. बारिश / स्थिति | |
| web/src/i18n.ts:106 | mm | mm | मिमी | |
| web/src/i18n.ts:107 | needsPin | Needs a pin | स्थान तय नहीं | |
| web/src/i18n.ts:108 | action | What MCG should do | MCG को क्या करना चाहिए | |
| web/src/i18n.ts:109 | why | Why | क्यों | |
| web/src/i18n.ts:110 | whyWatched | Why it is watched | इस पर नज़र क्यों | |
| web/src/i18n.ts:111 | modelEstimate | Model estimate | मॉडल का अनुमान | |
| web/src/i18n.ts:112 | chance | chance of flooding | जलभराव की संभावना | |
| web/src/i18n.ts:113 | wettestAt | Wettest | सबसे तेज़ बारिश | |
| web/src/i18n.ts:114 | pinUnchecked | Map pin not yet checked by the team. | नक्शे पर स्थान की जाँच अभी बाकी है। | |
| web/src/i18n.ts:115 | adjusted | Adjusted by MCG | MCG ने बदला | |
| web/src/i18n.ts:116 | adjustedText | ${who} changed this from ${from} | ${who} ने इसे ${from} से बदला | |
| web/src/i18n.ts:117 | confidence | High confidence / Medium confidence / Low confidence | भरोसा: ऊँचा / भरोसा: मध्यम / भरोसा: कम | |
| web/src/i18n.ts:118 | downstream | Risk travels downstream | जोखिम नीचे की ओर बहता है | |
| web/src/i18n.ts:119 | downstreamNote | Clearing drains at the first hotspot also eases the second. | पहले हॉटस्पॉट पर नाले साफ़ करने से दूसरे पर भी राहत मिलती है। | |
| web/src/i18n.ts:120 | avoid | Roads to avoid | इन रास्तों से बचें | |
| web/src/i18n.ts:121 | avoidLevel | Avoid / Take care / red / amber | बचें / सावधानी रखें / red / amber | |
| web/src/i18n.ts:122 | avoidNote | From Agrim's forecast (a pilot, not an official MCG warning). | Agrim के पूर्वानुमान से (यह एक पायलट है, MCG की आधिकारिक चेतावनी नहीं)। | |
| web/src/i18n.ts:123 | headline | No waterlogging expected at any of the N hotspots. / Flooding possible at N hotspots. / Flooding likely at N hotspots, possible at M more. | N में से किसी भी हॉटस्पॉट पर जलभराव की आशंका नहीं। / N हॉटस्पॉट पर जलभराव की संभावना। / N हॉटस्पॉट पर जलभराव की प्रबल संभावना, M और पर संभावना। | |
| web/src/i18n.ts:129 | key | High, flooding likely / Medium, flooding possible / Low risk / Risk flowing downstream | उच्च, जलभराव की प्रबल संभावना / मध्यम, जलभराव की संभावना / कम जोखिम / जोखिम नीचे की ओर | |
| web/src/i18n.ts:130 | models | ${n} of ${total} weather models show flooding | ${total} में से ${n} मौसम मॉडल जलभराव दिखाते हैं | |
| web/src/i18n.ts:131 | coverage | 21 listed, 19 on the map, out of MCG's 159 hotspots. Taken from public reports; the full list needs MCG data. | MCG के 159 में से 21 हॉटस्पॉट सार्वजनिक रिपोर्टों से सूची में हैं, इनमें से 19 नक्शे पर। पूरी सूची के लिए MCG का डेटा चाहिए। | |
| web/src/i18n.ts:132 | stale | Last updated ${ago} (${when}). The forecast refresh is delayed; treat this as old. | आखिरी अपडेट ${ago} (${when})। पूर्वानुमान अपडेट होने में देरी है; इसे पुराना मानें। | |
| web/src/i18n.ts:133 | storedTitle | Stored copy. | सहेजी गई प्रति। | |
| web/src/i18n.ts:134 | stored | Last updated ${ago} (${when}). Live data replaces it as soon as the server answers. | आखिरी अपडेट ${ago} (${when})। सर्वर के जवाब देते ही लाइव डेटा दिखेगा। | |
| web/src/i18n.ts:135 | waking | Connecting to the live server. The free server can take up to a minute to wake. | लाइव सर्वर से जुड़ रहे हैं। मुफ़्त सर्वर को चालू होने में एक मिनट तक लग सकता है। | |
| web/src/i18n.ts:136 | down | Can't reach the live server right now. | अभी लाइव सर्वर से संपर्क नहीं हो पा रहा। | |
| web/src/i18n.ts:137 | storedNote | Showing the stored copy from ${ago}. | ${ago} की सहेजी गई प्रति दिखाई जा रही है। | |
| web/src/i18n.ts:138 | retry | Try again | फिर कोशिश करें | |
| web/src/i18n.ts:139 | ago | ${Math.max(1, Math.round(hours * 60))} minutes ago / ${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago / ${Math.round(hours / 24)} days ago | ${Math.max(1, Math.round(hours * 60))} मिनट पहले / ${Math.round(hours)} घंटे पहले / ${Math.round(hours / 24)} दिन पहले | |
| web/src/i18n.ts:141 | popupRain | ${mm} mm in 24 h, peak ${peak} mm/h | 24 घंटे में ${mm} मिमी, सबसे तेज़ ${peak} मिमी/घंटा | |
| web/src/i18n.ts:142 | flowsTo | Water flows on to ${names}. | यहाँ से पानी ${names} की ओर जाता है। | |
| web/src/i18n.ts:143 | receivesFrom | Receives water from ${names}. | यहाँ ${names} से पानी आता है। | |
| model/alerts.py:10 |  |  | exercise messages are marked EXERCISE / अभ्यास. | |
| model/alerts.py:21 |  |  | हो सके तो इस रास्ते से बचें, या ज़्यादा समय लेकर चलें। | |
| model/alerts.py:33 |  |  | सुबह | |
| model/alerts.py:35 |  |  | दोपहर | |
| model/alerts.py:37 |  |  | शाम | |
| model/alerts.py:38 |  |  | रात | |
| model/alerts.py:46 |  |  | ('6–10 pm today', 'आज शाम 6–10 बजे'), from the hotspot's wettest hours. | |
| model/alerts.py:49 |  |  | अगले 24 घंटों में | |
| model/alerts.py:54 |  |  | आज / कल | |
| model/alerts.py:57 |  |  | {day_hi} दिन भर | |
| model/alerts.py:61 |  |  | {day_hi} {part_hi} {_clock(start)}–{_clock(end)} बजे | |
| model/alerts.py:86 |  |  | अभ्यास:  | |
| model/alerts.py:89 |  |  | {tag_hi}Agrim पायलट: {item['name']} पर जलभराव की संभावना, {item['when_hi']}।  | |
| model/alerts.py:105 |  |  | अभ्यास:  | |
| model/alerts.py:106 |  |  | {tag_hi}Agrim पायलट: {name} पर जलभराव का खतरा टल गया है और जगह की जाँच हो चुकी है। सावधानी से चलें। | |
| model/simulate.py:25 |  |  | EXERCISE / अभ्यास | |
| model/simulate.py:27 |  |  | यह अभ्यास है, वास्तविक बाढ़ चेतावनी नहीं। | |
| web/src/App.tsx:319 |  |  | EXERCISE / अभ्यास | |
| web/src/components/ForecastPanel.tsx:50 |  |  | से | |
| web/src/components/ForecastPanel.tsx:57 |  |  | पुराना पूर्वानुमान। | |
| web/src/components/HotspotMap.tsx:375 |  |  | ${s.wettestAt} ${hour(ww.start)} ${lang === "hi" ? "से" : "to"} ${hour(ww.end)} | |
| web/src/components/LandingPage.tsx:112 |  |  | Red, Amber or Green for every mapped hotspot, the reasons, and roads to avoid. English and हिन्दी. | |
| web/src/components/Masthead.tsx:31 |  |  | हिं | |
| web/src/components/Masthead.tsx:69 |  |  | सहेजी गई प्रति / , ${lang === "hi" ? "पुराना" : "old"} | |
| web/src/components/OpsDesk.tsx:136 |  |  | EXERCISE / अभ्यास | |
| web/src/components/RiskLedger.tsx:78 |  |  | ${hour(ww.start)} ${lang === "hi" ? "से" : "to"} ${hour(ww.end)} | |
| web/src/components/RiskLedger.tsx:80 |  |  | भरोसा | |
| web/src/components/SimulatorPanel.tsx:61 |  |  | EXERCISE / अभ्यास | |
| web/src/components/about/SourcesPage.tsx:63 |  |  | <li>Simulated storms and replays: labelled Exercise / अभ्यास.</li> | |
| web/src/components/ui.tsx:97 |  |  | EXERCISE / अभ्यास | |
| web/src/i18n.ts:158 |  |  | बारिश से पहले MCG की टीम यहाँ पंप लगाए और नालियाँ साफ़ करे। | |
| web/src/i18n.ts:159 |  |  | बारिश से पहले MCG की टीम यहाँ नालियाँ साफ़ करे और पास में पंप तैयार रखे। | |
| web/src/i18n.ts:160 |  |  | कोई कार्रवाई ज़रूरी नहीं। | |
| web/src/i18n.ts:168 |  |  | आम मानसूनी दिन | |
| web/src/i18n.ts:169 |  |  | 2018 से अब तक के रिकॉर्ड से ज़्यादा | |
| web/src/i18n.ts:171 |  |  | हर मानसून में लगभग ${Math.round(days)} दिन | |
| web/src/i18n.ts:172 |  |  | हर मानसून में लगभग एक बार | |
| web/src/i18n.ts:173 |  |  | लगभग ${Math.round(1 / days)} मानसून में एक बार | |
| web/src/i18n.ts:181 |  |  | 24 घंटे में ${Math.round(v)} मिमी बारिश (${howOftenHi(e)}) | |
| web/src/i18n.ts:182 |  |  | सबसे तेज़ घंटे में ${Math.round(v)} मिमी (${howOftenHi(e)}) | |
| web/src/i18n.ts:183 |  |  | यहाँ बहकर आने वाले इलाके पर ${Math.round(v)} मिमी बारिश | |
| web/src/i18n.ts:184 |  |  | ज़मीन पहले से गीली: पिछले 3 दिनों में ${Math.round(v)} मिमी | |
| web/src/i18n.ts:185 |  |  | आसपास की ज़मीन से ${v.toFixed(1)} मीटर नीचे | |
| web/src/i18n.ts:186 |  |  | नज़दीकी नाले के स्तर पर / नज़दीकी नाले से सिर्फ़ ${v.toFixed(1)} मीटर ऊपर | |
| web/src/i18n.ts:187 |  |  | आसपास की ${Math.round(v * 100)}% ज़मीन पक्की/निर्मित | |
| web/src/i18n.ts:188 |  |  | ${v.toFixed(1)} वर्ग किमी इलाके का पानी इधर बहता है | |
