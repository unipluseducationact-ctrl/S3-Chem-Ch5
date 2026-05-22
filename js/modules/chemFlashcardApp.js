// Chemistry flashcards — embedded app, scoped to #flashcards-page
import { finallyData } from "../data/elementsData.js";

function formatShellElectronsLabel(shells, label = "Shell electrons") {
  return shells?.length ? `${label}: ${shells.join(", ")}` : "—";
}

export function initChemFlashcard() {
  if (window.__chemFlashcardInited) return;
  window.__chemFlashcardInited = true;
  const flashPage = () => document.getElementById("flashcards-page");

  const LANG = { EN: "en", ZH: "zh" };

  const UI = {
    en: {
      appTitle: "Form 3 Chemistry — Flashcards",
      appSubtitle: "Four sets · First 20 elements · Square cards",
      deckS1: "Set 1 · Shell electrons & Bohr model",
      deckS2: "Set 2 · Melting / boiling / density / EN / radius",
      deckS3: "Set 3 · Category, metal type, state @ STP",
      deckS4: "Set 4 · Natural isotopes",
      question: "Question",
      answer: "Answer",
      tapToFlip: "Tap or Space to flip",
      prev: "Previous",
      next: "Next",
      shuffle: "Shuffle",
      kbdHint: "Space flip · ← → navigate",
      nucleus: "Nucleus (+)",
      filling: "Bohr model — electrons in shells",
      lblMelting: "Melting point",
      lblBoiling: "Boiling point",
      lblDensity: "Density",
      lblEn: "Electronegativity",
      lblRadius: "Atomic radius",
      lblCategory: "Category",
      lblMetalType: "Metal type",
      lblState: "State @ STP",
      lblShellArr: "Shell electrons",
      lblConfig: "Shell electrons",
      lblIsotopes: "Natural isotopes",
      noneIsotopes: "No isotope data",
    },
    zh: {
      appTitle: "中三化學 — 閃卡",
      appSubtitle: "四套 · 首 20 個元素 · 方形卡",
      deckS1: "套裝 1 · 電子層排佈與波爾模型",
      deckS2: "套裝 2 · 熔點、沸點、密度、電負性、原子半徑",
      deckS3: "套裝 3 · 類別、金屬類型、狀態（STP）",
      deckS4: "套裝 4 · 天然同位素",
      question: "問題",
      answer: "答案",
      tapToFlip: "輕按或空白鍵翻卡",
      prev: "上一張",
      next: "下一張",
      shuffle: "洗牌",
      kbdHint: "空白鍵翻卡 · ← → 換卡",
      nucleus: "原子核（+）",
      filling: "波爾模型 — 各層電子",
      lblMelting: "熔點",
      lblBoiling: "沸點",
      lblDensity: "密度",
      lblEn: "電負性",
      lblRadius: "原子半徑",
      lblCategory: "週期表類別",
      lblMetalType: "金屬／非金屬類型",
      lblState: "狀態（STP）",
      lblShellArr: "電子層排佈",
      lblConfig: "電子層排佈",
      lblIsotopes: "天然同位素",
      noneIsotopes: "無同位素資料",
    },
  };

  const SHELL_ROWS = [
    { z: 1, symbol: "H", notn: "<span class='notn'><sup>1</sup><sub>1</sub>H</span>", en: "Hydrogen", zh: "氫", shells: [1] },
    { z: 2, symbol: "He", notn: "<span class='notn'><sup>4</sup><sub>2</sub>He</span>", en: "Helium", zh: "氦", shells: [2] },
    { z: 3, symbol: "Li", notn: "<span class='notn'><sup>7</sup><sub>3</sub>Li</span>", en: "Lithium", zh: "鋰", shells: [2, 1] },
    { z: 4, symbol: "Be", notn: "<span class='notn'><sup>9</sup><sub>4</sub>Be</span>", en: "Beryllium", zh: "鈹", shells: [2, 2] },
    { z: 5, symbol: "B", notn: "<span class='notn'><sup>11</sup><sub>5</sub>B</span>", en: "Boron", zh: "硼", shells: [2, 3] },
    { z: 6, symbol: "C", notn: "<span class='notn'><sup>12</sup><sub>6</sub>C</span>", en: "Carbon", zh: "碳", shells: [2, 4] },
    { z: 7, symbol: "N", notn: "<span class='notn'><sup>14</sup><sub>7</sub>N</span>", en: "Nitrogen", zh: "氮", shells: [2, 5] },
    { z: 8, symbol: "O", notn: "<span class='notn'><sup>16</sup><sub>8</sub>O</span>", en: "Oxygen", zh: "氧", shells: [2, 6] },
    { z: 9, symbol: "F", notn: "<span class='notn'><sup>19</sup><sub>9</sub>F</span>", en: "Fluorine", zh: "氟", shells: [2, 7] },
    { z: 10, symbol: "Ne", notn: "<span class='notn'><sup>20</sup><sub>10</sub>Ne</span>", en: "Neon", zh: "氖", shells: [2, 8] },
    { z: 11, symbol: "Na", notn: "<span class='notn'><sup>23</sup><sub>11</sub>Na</span>", en: "Sodium", zh: "鈉", shells: [2, 8, 1] },
    { z: 12, symbol: "Mg", notn: "<span class='notn'><sup>24</sup><sub>12</sub>Mg</span>", en: "Magnesium", zh: "鎂", shells: [2, 8, 2] },
    { z: 13, symbol: "Al", notn: "<span class='notn'><sup>27</sup><sub>13</sub>Al</span>", en: "Aluminium", zh: "鋁", shells: [2, 8, 3] },
    { z: 14, symbol: "Si", notn: "<span class='notn'><sup>28</sup><sub>14</sub>Si</span>", en: "Silicon", zh: "硅", shells: [2, 8, 4] },
    { z: 15, symbol: "P", notn: "<span class='notn'><sup>31</sup><sub>15</sub>P</span>", en: "Phosphorus", zh: "磷", shells: [2, 8, 5] },
    { z: 16, symbol: "S", notn: "<span class='notn'><sup>32</sup><sub>16</sub>S</span>", en: "Sulfur", zh: "硫", shells: [2, 8, 6] },
    { z: 17, symbol: "Cl", notn: "<span class='notn'><sup>35</sup><sub>17</sub>Cl</span>", en: "Chlorine", zh: "氯", shells: [2, 8, 7] },
    { z: 18, symbol: "Ar", notn: "<span class='notn'><sup>40</sup><sub>18</sub>Ar</span>", en: "Argon", zh: "氬", shells: [2, 8, 8] },
    { z: 19, symbol: "K", notn: "<span class='notn'><sup>39</sup><sub>19</sub>K</span>", en: "Potassium", zh: "鉀", shells: [2, 8, 8, 1] },
    { z: 20, symbol: "Ca", notn: "<span class='notn'><sup>40</sup><sub>20</sub>Ca</span>", en: "Calcium", zh: "鈣", shells: [2, 8, 8, 2] },
  ];

  function physicalString(v) {
    if (v == null || v === "") return "—";
    return String(v);
  }

  function metalKindFromType(rawType) {
    const s = String(rawType || "").trim().toLowerCase();
    if (!s) return { en: "—", zh: "—" };
    if (s.includes("metalloid")) return { en: "Metalloid", zh: "半金屬" };
    if (s.includes("nonmetal") || s.includes("halogen") || s.includes("noble gas")) {
      return { en: "Nonmetal", zh: "非金屬" };
    }
    if (s.includes("metal") || s.includes("lanthanide") || s.includes("actinide")) {
      return { en: "Metal", zh: "金屬" };
    }
    return { en: "Nonmetal", zh: "非金屬" };
  }

  function localizeTypeZh(raw) {
    const s = String(raw || "").trim();
    const norm = s
      .replace(/\s+/g, " ")
      .replace(/\bOther Nonmetal\b/i, "Other nonmetal")
      .replace(/\bNoble Gas\b/i, "Noble gas");
    const map = {
      "Alkali Metal": "鹼金屬",
      "Alkaline Earth Metal": "鹼土金屬",
      "Transition Metal": "過渡金屬",
      "Post-transition Metal": "後過渡金屬",
      Metalloid: "半金屬",
      Halogen: "鹵素",
      "Noble gas": "貴氣體",
      Lanthanide: "鑭系",
      Actinide: "錒系",
      "Other nonmetal": "其他非金屬",
      Metal: "金屬",
      Nonmetal: "非金屬",
      Unknown: "未知",
    };
    return map[norm] || (norm || "未知");
  }

  function localizePhaseZh(raw) {
    const s = String(raw || "").trim();
    if (!s || s === "Unknown" || s === "N/A") return "未知";
    const map = { Solid: "固態", Liquid: "液態", Gas: "氣態" };
    return map[s] || s;
  }

  function formatElectronegativity(phy) {
    const v = phy && phy.electronegativity;
    if (v == null || v === "") return "—";
    if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(1) + " (Pauling)";
    return String(v);
  }

  function buildElementRows() {
    return SHELL_ROWS.map((row) => {
      const fd = finallyData[String(row.z)] || {};
      const basic = fd.level1_basic || {};
      const phy = fd.level3_properties?.physical || {};
      const atomic = fd.level2_atomic || {};
      const rawType = String(basic.type || "").trim();
      const mk = metalKindFromType(rawType);
      return {
        ...row,
        meltingPoint: physicalString(phy.meltingPoint),
        boilingPoint: physicalString(phy.boilingPoint),
        density: physicalString(phy.density),
        electronegativity: formatElectronegativity(phy),
        atomicRadius: physicalString(phy.atomicRadius),
        categoryEn: rawType || "—",
        phaseEn: String(basic.phaseAtSTP || "").trim() || "—",
        metalKindEn: mk.en,
        metalKindZh: mk.zh,
        isotopes: Array.isArray(atomic.naturalIsotopes) ? atomic.naturalIsotopes : [],
      };
    });
  }

  const ELEMENT_ROWS = buildElementRows();

  const DECKS = {
    s1: { type: "configBohr", data: ELEMENT_ROWS },
    s2: { type: "properties", data: ELEMENT_ROWS },
    s3: { type: "classify", data: ELEMENT_ROWS },
    s4: { type: "isotopes", data: ELEMENT_ROWS },
  };

  let lang = LANG.EN;
  let deckKey = "s1";
  let order = [];
  let index = 0;
  let flipped = false;

  const $ = (id) => document.getElementById("cf-" + id);

  function t(key) {
    const m = UI[lang === LANG.EN ? "en" : "zh"];
    return (m && m[key]) || key;
  }

  function currentDeck() {
    return DECKS[deckKey];
  }

  function currentLength() {
    const d = currentDeck();
    return d && d.data ? d.data.length : 0;
  }

  function showView(name) {
    const fp = flashPage();
    if (!fp) return;
    fp.querySelectorAll(".chem-fc-view").forEach((v) => {
      v.classList.toggle("is-active", v.dataset.view === name);
    });
  }

  function isFlashMode() {
    const d = currentDeck();
    return !!(d && d.data);
  }

  function fillDeckSelect() {
    const sel = $("deckSelect");
    const prev = sel.value || deckKey;
    const opts = [
      ["s1", "deckS1"],
      ["s2", "deckS2"],
      ["s3", "deckS3"],
      ["s4", "deckS4"],
    ];
    sel.innerHTML = "";
    opts.forEach(([val, tk]) => {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = t(tk);
      sel.appendChild(o);
    });
    const keys = opts.map((x) => x[0]);
    sel.value = keys.includes(prev) ? prev : "s1";
    deckKey = sel.value;
  }

  function buildOrder() {
    const n = currentLength();
    order = Array.from({ length: n }, (_, i) => i);
  }

  function shuffleOrder() {
    const n = currentLength();
    order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    index = 0;
    flipped = false;
    syncFlipClass();
  }

  function syncFlipClass() {
    $("cardFlip").classList.toggle("is-flipped", flipped);
  }

  function renderShellDiagram(container, shells, animKey, opts) {
    opts = opts || {};
    const firstShellNoPair = !!opts.firstShellNoPair;
    container.innerHTML = "";
    const cap = document.createElement("div");
    cap.className = "shell-caption";
    cap.textContent = t("filling");
    container.appendChild(cap);
    const nucLabel = document.createElement("div");
    nucLabel.className = "nucleus-label";
    nucLabel.textContent = t("nucleus");
    container.appendChild(nucLabel);

    const svgNS = "http://www.w3.org/2000/svg";
    const vb = 240;
    const cx = vb / 2;
    const cy = vb / 2;
    const startR = 28;
    const ringGap = 23;
    const eR = 5;
    const nucR = 9;

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + vb + " " + vb);
    svg.setAttribute("class", "bohr-svg");
    svg.setAttribute("aria-hidden", "true");

    const staticElectrons = opts.static !== false;

    shells.forEach((count, si) => {
      const r = startR + si * ringGap;
      const orbit = document.createElementNS(svgNS, "circle");
      orbit.setAttribute("cx", String(cx));
      orbit.setAttribute("cy", String(cy));
      orbit.setAttribute("r", String(r));
      orbit.setAttribute("class", "bohr-orbit");
      svg.appendChild(orbit);
    });

    const nucleus = document.createElementNS(svgNS, "circle");
    nucleus.setAttribute("cx", String(cx));
    nucleus.setAttribute("cy", String(cy));
    nucleus.setAttribute("r", String(nucR));
    nucleus.setAttribute("class", "bohr-nucleus");
    svg.appendChild(nucleus);

    shells.forEach((count, si) => {
      const r = startR + si * ringGap;
      const noPairHere = firstShellNoPair && si === 0;
      const pairs = noPairHere ? 0 : Math.floor(count / 2);
      const groups = noPairHere ? count : pairs + (count % 2);
      const pairDelta = 0.11;

      function addDot(angle) {
        const edx = cx + r * Math.cos(angle);
        const edy = cy + r * Math.sin(angle);
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", String(edx));
        dot.setAttribute("cy", String(edy));
        dot.setAttribute("r", String(eR));
        dot.setAttribute("class", staticElectrons ? "bohr-electron-static" : "bohr-electron");
        svg.appendChild(dot);
      }

      for (let g = 0; g < groups; g++) {
        const base = (2 * Math.PI * g) / groups - Math.PI / 2;
        if (g < pairs) {
          addDot(base - pairDelta);
          addDot(base + pairDelta);
        } else {
          addDot(base);
        }
      }
    });

    container.appendChild(svg);
  }

  function elementName(row) {
    return lang === LANG.EN ? row.en : row.zh;
  }

  function renderCard() {
    const d = currentDeck();
    if (!d) return;
    const i = order[index];
    flipped = false;
    syncFlipClass();
    $("backExtra").innerHTML = "";
    $("frontExtra").innerHTML = "";

    const row = d.data[i];

    $("frontLabel").textContent = t("question");
    $("backLabel").textContent = t("answer");
    $("frontHint").textContent = t("tapToFlip");
    $("backHint").textContent = "";

    if (d.type === "configBohr") {
      $("frontMain").innerHTML = row.notn;
      $("frontSub").hidden = false;
      $("frontSub").textContent = elementName(row);
      $("backMain").innerHTML = "";
      $("backMain").className = "card-main chem-fc-config-main";
      $("backMain").textContent = formatShellElectronsLabel(row.shells, t("lblShellArr"));
      $("backSub").textContent = "";
      $("backSub").hidden = true;
      const wrap = document.createElement("div");
      wrap.className = "shell-diagram";
      $("backExtra").appendChild(wrap);
      renderShellDiagram(wrap, row.shells, index + "-" + i, { firstShellNoPair: true, static: true });
    } else if (d.type === "properties") {
      $("frontMain").innerHTML = row.notn;
      $("frontSub").hidden = false;
      $("frontSub").textContent = elementName(row);
      $("backMain").innerHTML = "";
      $("backMain").className = "card-main";
      $("backMain").textContent = "";
      const lines = [
        t("lblMelting") + ": " + row.meltingPoint,
        t("lblBoiling") + ": " + row.boilingPoint,
        t("lblDensity") + ": " + row.density,
        t("lblEn") + ": " + row.electronegativity,
        t("lblRadius") + ": " + row.atomicRadius,
      ];
      $("backSub").hidden = false;
      $("backSub").textContent = lines.join("\n");
    } else if (d.type === "classify") {
      $("frontMain").innerHTML = row.notn;
      $("frontSub").hidden = false;
      $("frontSub").textContent = elementName(row);
      $("backMain").innerHTML = "";
      $("backMain").className = "card-main";
      $("backMain").textContent = "";
      const cat =
        lang === LANG.EN ? row.categoryEn : localizeTypeZh(row.categoryEn);
      const phase = lang === LANG.EN ? row.phaseEn : localizePhaseZh(row.phaseEn);
      const mk = lang === LANG.EN ? row.metalKindEn : row.metalKindZh;
      $("backSub").hidden = false;
      $("backSub").textContent =
        t("lblCategory") + ": " + cat + "\n" + t("lblMetalType") + ": " + mk + "\n" + t("lblState") + ": " + phase;
    } else if (d.type === "isotopes") {
      $("frontMain").innerHTML = row.notn;
      $("frontSub").hidden = false;
      $("frontSub").textContent = elementName(row);
      $("backMain").innerHTML = "";
      $("backMain").className = "card-main";
      $("backMain").textContent = t("lblIsotopes");
      $("backSub").hidden = false;
      if (!row.isotopes.length) {
        $("backSub").textContent = t("noneIsotopes");
      } else {
        $("backSub").textContent = row.isotopes
          .map((iso) => {
            const nm = iso.name != null ? String(iso.name) : "";
            const nn = iso.neutron != null ? String(iso.neutron) : "";
            const pct = iso.percent != null ? String(iso.percent) : "";
            return [nm, nn, pct].filter(Boolean).join(" · ");
          })
          .join("\n");
      }
    }
  }

  function updateProgress() {
    const d = currentDeck();
    if (!d) return;
    $("progress").textContent = index + 1 + " / " + currentLength();
  }

  function go(delta) {
    if (!isFlashMode()) return;
    const len = currentLength();
    index = (index + delta + len) % len;
    renderCard();
    updateProgress();
  }

  function toggleFlip() {
    if (!isFlashMode()) return;
    flipped = !flipped;
    syncFlipClass();
  }

  function setLang(next) {
    lang = next;
    flashPage().classList.toggle("chem-fc-lang-zh", lang === LANG.ZH);
    $("langEn").setAttribute("aria-pressed", lang === LANG.EN ? "true" : "false");
    $("langZh").setAttribute("aria-pressed", lang === LANG.ZH ? "true" : "false");
    $("appTitle").textContent = t("appTitle");
    $("appSubtitle").textContent = t("appSubtitle");
    fillDeckSelect();
    applyDeckUI();
  }

  function applyDeckUI() {
    $("btnPrev").style.display = "";
    $("btnNext").style.display = "";
    $("btnShuffle").style.display = "";
    $("kbdHint").style.display = "";
    showView("flash");
    buildOrder();
    index = 0;
    $("kbdHint").innerHTML =
      lang === LANG.EN
        ? "<kbd>Space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> navigate"
        : "<kbd>空白鍵</kbd> 翻卡 · <kbd>←</kbd> <kbd>→</kbd> 換卡";
    renderCard();
    updateProgress();
  }

  $("langEn").addEventListener("click", () => setLang(LANG.EN));
  $("langZh").addEventListener("click", () => setLang(LANG.ZH));

  $("deckSelect").addEventListener("change", () => {
    deckKey = $("deckSelect").value;
    applyDeckUI();
  });

  $("btnPrev").addEventListener("click", () => go(-1));
  $("btnNext").addEventListener("click", () => go(1));
  $("btnShuffle").addEventListener("click", () => {
    shuffleOrder();
    renderCard();
    updateProgress();
  });

  $("cardFlip").addEventListener("click", (e) => {
    e.preventDefault();
    toggleFlip();
  });

  document.addEventListener("keydown", (e) => {
    const fp = flashPage();
    if (!fp || !fp.classList.contains("active")) return;
    if (!isFlashMode()) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      toggleFlip();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      go(+1);
    }
  });

  fillDeckSelect();
  deckKey = $("deckSelect").value;
  applyDeckUI();
}
