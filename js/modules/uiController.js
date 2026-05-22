// =============================================================================
// UI Controller - Periodic Table Grid & Element Modal
// Extracted from script.js: grid generation, modal population, level system
// =============================================================================

import { finallyData, elements } from "../data/elementsData.js";
import { translations } from "../data/translations.js";
import {
  ensureThreeLibLoaded,
  init3DScene,
  updateAtomStructure,
  onWindowResize,
  reset3DView,
  animateAtom,
  cleanup3D,
  clearCurrentAtom,
  renderScene,
} from "./threeRenderer.js";
import { initCardSlider } from "./cardSliderController.js";
import { createEITController } from "./ui/eitController.js";
import { initElementTutorial } from "./tutorialController.js";
import {
  t,
  onLangChange,
  getLang,
  elementLocales,
  fetchElementLocale,
} from "./langController.js";
import {
  ELEMENT_NAMES_ZH_HANT,
  ISOTOPE_ZH_HANT,
  COMMON_ION_ZH_HANT,
} from "../data/locales/zhHantUi.js";


// v2 dataset stub — file removed; branches gated by uniplusVersion === 'new' are inert.
const elementsData_v2 = [];
const REPRESENTATIVE_MASS_NUMBERS = [
  1, 4, 7, 9, 11, 12, 14, 16, 19, 20,
  23, 24, 27, 28, 31, 32, 35, 40, 39, 40,
  45, 48, 51, 52, 55, 56, 59, 59, 64, 65,
  70, 73, 75, 79, 80, 84, 85, 88, 89, 91,
  93, 96, 98, 101, 103, 106, 108, 112, 115, 119,
  122, 128, 127, 131, 133, 137, 139, 140, 141, 144,
  145, 150, 152, 157, 159, 163, 165, 167, 169, 173,
  175, 178, 181, 184, 186, 190, 192, 195, 197, 201,
  204, 207, 209, 209, 210, 222, 223, 226, 227, 232,
  231, 238, 237, 244, 243, 247, 247, 251, 252, 257,
  258, 259, 266, 267, 268, 269, 270, 277, 278, 281,
  282, 285, 286, 289, 290, 293, 294, 294,
];

// ===== Legend & Category Highlighting =====
let activeLegendCategory = null;
let headlineResizeHandler = null;
let levelSystemBound = false;

// ===== Expandable Ion / Isotope Pill Helpers =====
const ION_SUBSCRIPT_MAP = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};
const ION_SUPERSCRIPT_MAP = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-",
};

const COMMON_ION_DETAIL_OVERRIDES = {
  H: { "H⁺": { note: "Usually behaves as an acidic proton in water, often represented by hydronium." }, "H⁻": { note: "A strongly basic hydride ion found mainly in ionic hydrides such as NaH." } },
  Fe: { "Fe²⁺": { note: "Ferrous iron; common in reducing environments and easily oxidized to Fe³⁺." }, "Fe³⁺": { note: "Ferric iron; the more oxidized common state in many salts and oxides." } },
  Ti: { "Ti³⁺": { note: "A less stable reducing state that is readily oxidized to Ti⁴⁺." }, "Ti⁴⁺": { note: "The dominant titanium oxidation state, especially in TiO₂ and TiCl₄ chemistry." } },
  Na: { "Na⁺": { note: "A very stable +1 ion commonly found in salts and aqueous solution." } },
  Li: { "Li⁺": { note: "The only common lithium ion in ordinary compounds and many battery materials." } },
  K: { "K⁺": { note: "The usual potassium ion in salts and a major biological electrolyte." } },
  Mg: { "Mg²⁺": { note: "The normal magnesium ion in salts and an essential ion in biological systems." } },
  Ca: { "Ca²⁺": { note: "The normal calcium ion in minerals, hard water, and biological signalling." } },
  Al: { "Al³⁺": { note: "The usual aluminum ion in many salts, though it hydrolyses strongly in water." } },
  O: { "O²⁻": { note: "The oxide ion is the common oxygen anion in many metal oxides." } },
  N: { "N³⁻": { note: "Nitride occurs mainly in compounds with very electropositive metals." } },
  P: { "P³⁻": { note: "Phosphide is mainly found in metal phosphides rather than free in water." } },
  S: { "S²⁻": { note: "Sulfide is the common sulfur anion in metal sulfides and H2S chemistry." } },
  F: { "F⁻": { note: "Fluoride is the stable halide ion found in minerals, water treatment, and enamel chemistry." } },
  Cl: { "Cl⁻": { note: "The most common halide anion, stable in many salts and aqueous systems." } },
  Br: { "Br⁻": { note: "Bromide is the common bromine anion found in salts and natural bromide-rich brines." } },
  I: { "I⁻": { note: "Iodide is the stable iodine anion and the form used by the thyroid." } },
  Sc: { "Sc³⁺": { note: "Scandium is found almost entirely in the +3 state in its compounds." } },
  V: { "V²⁺": { note: "Vanadium(II) is a lower, reducing state that oxidizes readily in air." }, "V³⁺": { note: "Vanadium(III) is one of the common lower oxidation states in compounds." } },
  Cr: { "Cr²⁺": { note: "Chromium(II) is a reducing ion that is readily oxidized to Cr3+." }, "Cr³⁺": { note: "Chromium(III) is the more stable common chromium ion in many salts." } },
  Mn: { "Mn²⁺": { note: "Mn2+ is the most common simple manganese ion in ordinary chemistry." }, "Mn³⁺": { note: "Mn3+ is less stable than Mn2+ and is often stabilized in solids or complexes." } },
  Co: { "Co²⁺": { note: "Cobalt(II) is the more common simple cobalt ion in salts." }, "Co³⁺": { note: "Cobalt(III) is more often stabilized in coordination complexes." } },
  Ni: { "Ni²⁺": { note: "Nickel(II) is the most common nickel ion in ordinary compounds." }, "Ni³⁺": { note: "Nickel(III) exists, but it is less common than the Ni2+ state." } },
  Cu: { "Cu⁺": { note: "Copper(I) appears in some minerals and coordination compounds." }, "Cu²⁺": { note: "Copper(II) is the more common simple copper ion in many salts." } },
  Zn: { "Zn²⁺": { note: "Zinc almost always appears as Zn²⁺ in simple compounds and biology." } },
  Ga: { "Ga³⁺": { note: "Gallium usually appears in the +3 state in its compounds." } },
  Ag: { "Ag⁺": { note: "Silver usually appears as Ag+ in salts such as silver nitrate and silver halides." } },
  Rb: { "Rb⁺": { note: "Rubidium forms the normal +1 alkali-metal ion, much like potassium." } },
  Sr: { "Sr²⁺": { note: "Strontium commonly occurs as the +2 ion in salts and minerals." } },
  Y: { "Y³⁺": { note: "Yttrium is normally found in the +3 state in compounds and minerals." } },
  Cd: { "Cd²⁺": { note: "Cadmium usually occurs as Cd2+ in its compounds." } },
  In: { "In³⁺": { note: "Indium commonly occurs as In3+, though In+ compounds are also known." } },
  Sn: { "Sn²⁺": { note: "Tin(II) is one of the two common tin ion states in salts and reducing compounds." }, "Sn⁴⁺": { note: "Tin(IV) is the more oxidized common state found in compounds such as SnO₂." } },
  Pb: { "Pb²⁺": { note: "Lead(II) is the more common simple lead ion in many salts and minerals." }, "Pb⁴⁺": { note: "Lead(IV) occurs in more strongly oxidized lead compounds." } },
  Ba: { "Ba²⁺": { note: "Barium commonly occurs as the +2 ion in salts such as sulfate and carbonate." } },
  Hg: { "Hg₂²⁺": { note: "Mercury(I) commonly exists as the dimeric mercurous ion Hg₂²⁺." }, "Hg²⁺": { note: "Mercury(II) is the more oxidized common mercury ion in many compounds." } },
  Au: { "Au⁺": { note: "Gold(I) is one of the common oxidation states in gold coordination chemistry." }, "Au³⁺": { note: "Gold(III) is the higher common state in many gold complexes." } },
  Tl: { "Tl⁺": { note: "Thallium(I) is the more stable common thallium ion in many compounds." }, "Tl³⁺": { note: "Thallium(III) is the more oxidized and less stable common state." } },
  Bi: { "Bi³⁺": { note: "Bismuth(III) is the most common oxidation state of bismuth in compounds." } },
  At: { "At⁻": { note: "Astatide is a predicted halide-like anion, expected to resemble iodide." } },
  U: { "U⁴⁺": { note: "Uranium(IV) is important in UO2, a major nuclear fuel material." } },
};

const ISOTOPE_DETAIL_OVERRIDES = {
  H: { "H-1": "Protium is the most abundant hydrogen isotope in nature.", "H-2": "Deuterium is stable and commonly used in heavy water and tracing studies.", "H-3": "Tritium is radioactive and widely known from fusion and tracing applications." },
  Li: { "Li-6": "Lithium-6 is important in neutron reactions and tritium production.", "Li-7": "Lithium-7 is the more abundant natural isotope of lithium." },
  C: { "C-13": "Carbon-13 is stable and widely used in NMR and isotope tracing.", "C-14": "Carbon-14 is radioactive and well known for radiocarbon dating." },
  Fe: { "Fe-56": "Iron-56 is the most abundant natural isotope of iron." },
  Mn: { "Mn-55": "Manganese-55 is the only stable natural isotope of manganese." },
  Co: { "Co-59": "Cobalt-59 is the only stable natural isotope of cobalt." },
  I: { "I-127": "Iodine-127 is the only stable natural isotope of iodine." },
  U: { "U-235": "Uranium-235 is the key fissile isotope used in many nuclear applications.", "U-238": "Uranium-238 is the most abundant uranium isotope and is weakly radioactive." },
  Tc: { "Tc-99": "Technetium-99 is a long-lived radioactive isotope of a fully radioactive element." },
};

const ELEMENT_NAMES_ZH = [
  "", "氢", "氦", "锂", "铍", "硼", "碳", "氮", "氧", "氟", "氖",
  "钠", "镁", "铝", "硅", "磷", "硫", "氯", "氩",
  "钾", "钙", "钪", "钛", "钒", "铬", "锰", "铁", "钴", "镍", "铜", "锌", "镓", "锗", "砷", "硒", "溴", "氪",
  "铷", "锶", "钇", "锆", "铌", "钼", "锝", "钌", "铑", "钯", "银", "镉", "铟", "锡", "锑", "碲", "碘", "氙",
  "铯", "钡", "镧", "铈", "镨", "钕", "钷", "钐", "铕", "钆", "铽", "镝", "钬", "铒", "铥", "镱", "镥", "铪", "钽", "钨", "铼", "锇", "铱", "铂", "金", "汞", "铊", "铅", "铋", "钋", "砹", "氡",
  "钫", "镭", "锕", "钍", "镤", "铀", "镎", "钚", "镅", "锔", "锫", "锎", "锿", "镄", "钔", "锘", "铹", "𬬻", "𬭊", "𬭳", "𬭛", "𬭤", "䥑", "𫟼", "𬬭", "鎶", "鿭", "𫓧", "镆", "𫟷", "鿬", "鿫"
];

const ELEMENT_PINYIN_ZH = [
  "", "qīng", "hài", "lǐ", "pí", "péng", "tàn", "dàn", "yǎng", "fú", "nǎi",
  "nà", "měi", "lǚ", "guī", "lín", "liú", "lǜ", "yà",
  "jiǎ", "gài", "kàng", "tài", "fán", "gè", "měng", "tiě", "gǔ", "niè", "tóng", "xīn", "jiā", "zhě", "shēn", "xī", "xiù", "kè",
  "rú", "sī", "yǐ", "gào", "ní", "mù", "dé", "liǎo", "lǎo", "bǎ", "yín", "gé", "yīn", "xī", "tī", "dì", "diǎn", "xiān",
  "sè", "bèi", "lán", "shì", "pǔ", "nǚ", "pǒ", "shān", "yǒu", "gá", "tè", "dī", "huǒ", "ěr", "diū", "yì", "lǔ", "hā", "tǎn", "wū", "lái", "é", "yī", "bó", "jīn", "gǒng", "tā", "qiān", "bì", "pō", "ài", "dōng",
  "fāng", "léi", "ā", "tǔ", "pú", "yóu", "ná", "bù", "méi", "jū", "pèi", "kāi", "āi", "fèi", "mén", "nuò", "láo", "lú", "dū", "xǐ", "bō", "hēi", "mài", "dá", "lún", "gē", "nǐ", "fū", "mò", "lì", "tián", "ào"
];

function getElementAnnotation(number, lang) {
  if (lang === "zh") return ELEMENT_PINYIN_ZH[number] || "";
  // Traditional Chinese should prefer zhuyin rather than pinyin.
  return "";
}

function localizeElementName(element) {
  if (!element || !element.number) return "";
  
  // Special translation for Lanthanide/Actinide block placeholders
  if (element.symbol === "La-Lu") return t("tableLegend.lanthanide");
  if (element.symbol === "Ac-Lr") return t("tableLegend.actinide");

  const lang = getLang();
  if (lang.startsWith("zh")) {
    const useTraditionalChinese = lang === "zh-Hant";
    const localizedNames = useTraditionalChinese ? ELEMENT_NAMES_ZH_HANT : ELEMENT_NAMES_ZH;
    return localizedNames[element.number] || element.name;
  }
  if (elementLocales[lang]?.[element.number]?.name) {
    return elementLocales[lang][element.number].name;
  }
  return element.name;
}

const ISOTOPE_ZH = {
  H: { "H-1": "氕是自然界中最丰富的氢同位素。", "H-2": "氘是稳定的同位素，广泛用于重水和示踪研究。", "H-3": "氚具有放射性，被广泛应用于核聚变和示踪技术。" },
  Li: { "Li-6": "锂-6 在中子反应和氚的生产中非常重要。", "Li-7": "锂-7 是自然界中更丰富的锂同位素。" },
  C: { "C-13": "碳-13 是稳定的同位素，广泛用于核磁共振（NMR）和同位素示踪。", "C-14": "碳-14 具有放射性，因用于放射性碳定年法而闻名。" },
  Fe: { "Fe-56": "铁-56 是自然界中最丰富的铁同位素。" },
  Mn: { "Mn-55": "锰-55 是锰唯一的天然稳定同位素。" },
  Co: { "Co-59": "钴-59 是钴唯一的天然稳定同位素。" },
  I: { "I-127": "碘-127 是碘唯一的天然稳定同位素。" },
  U: { "U-235": "铀-235 是用于许多核应用的关键裂变同位素。", "U-238": "铀-238 是最丰富的铀同位素，具有微弱的放射性。" },
  Tc: { "Tc-99": "锝-99 是一种长寿命的放射性同位素，也是锝元素的代表。" },
};

const COMMON_ION_ZH = {
  H: { "H⁺": "在水中通常作为酸性质子存在，常以水合氢离子表示。", "H⁻": "强碱性的氢负离子，主要存在于如 NaH 这样的离子型氢化物中。" },
  Fe: { "Fe²⁺": "亚铁离子；常见于还原环境，容易被氧化为 Fe³⁺。", "Fe³⁺": "铁离子；是许多铁盐和氧化物中更常见的较高氧化态。" },
  Ti: { "Ti³⁺": "不太稳定的还原态，容易被氧化为 Ti⁴⁺。", "Ti⁴⁺": "钛的主要氧化态，尤其在 TiO₂ 和 TiCl₄ 中最常见。" },
  Na: { "Na⁺": "非常稳定的 +1 价离子，广泛存在于盐和水溶液中。" },
  Li: { "Li⁺": "在普通化合物和许多电池材料中唯一的常见锂离子。" },
  K: { "K⁺": "这是一种稳定的钾离子，也是一种重要的生物电解质。" },
  Mg: { "Mg²⁺": "普通镁离子，是生物系统中必不可少的离子。" },
  Ca: { "Ca²⁺": "常见的钙离子，存在于矿物质、硬水和生物信号传导中。" },
  Al: { "Al³⁺": "铝的常见离子形式，在水中会发生强烈水解。" },
  O: { "O²⁻": "氧离子是许多金属氧化物中的常见阴离子。" },
  N: { "N³⁻": "氮离子主要存在于由极度电正性金属组成的化合物中。" },
  P: { "P³⁻": "磷离子主要存在于金属磷化物中，很少游离在水中。" },
  S: { "S²⁻": "硫离子是金属硫化物和 H2S 化学中的常见硫阴离子。" },
  F: { "F⁻": "氟离子是稳定的卤素离子，存在于矿物、水处理和牙釉质中。" },
  Cl: { "Cl⁻": "最常见的卤素阴离子，在许多盐和水体系中非常稳定。" },
  Br: { "Br⁻": "溴离子，常见于盐和天然富溴卤水中。" },
  I: { "I⁻": "碘离子，是甲状腺利用的稳定形态。" },
  Sc: { "Sc³⁺": "钪在其化合物中几乎全部以 +3 价状态存在。" },
  V: { "V²⁺": "钒(II) 是一种较低的还原态，在空气中容易被氧化。", "V³⁺": "钒(III) 是化合物中常见的低氧化态之一。" },
  Cr: { "Cr²⁺": "铬(II) 是一种还原性离子，极易被氧化为 Cr³⁺。", "Cr³⁺": "铬(III) 是许多盐中更稳定的常见铬离子态。" },
  Mn: { "Mn²⁺": "Mn²⁺ 是普通化学中最常见、最简单的锰离子。", "Mn³⁺": "Mn³⁺ 不及 Mn²⁺ 稳定，常被固定在固体或配合物中。" },
  Co: { "Co²⁺": "钴(II) 是盐中更常见的简单钴离子态。", "Co³⁺": "钴(III) 更常在配位配合物中被稳定下来。" },
  Ni: { "Ni²⁺": "镍(II) 是普通化合物中最常用的镍离子。", "Ni³⁺": "存在镍(III)，但不如 Ni²⁺ 常见。" },
  Cu: { "Cu⁺": "铜(I) 出现在部分矿物和配位化合物中。", "Cu²⁺": "铜(II) 是许多盐中更常见的简单铜离子。" },
  Zn: { "Zn²⁺": "锌在简单化合物和生物体内几乎总是以 Zn²⁺ 形式存在。" },
  Ga: { "Ga³⁺": "镓在其化合物中通常表现为 +3 价。" },
  Ag: { "Ag⁺": "银通常以 Ag⁺ 的形式存在于硝酸银和卤化银等盐中。" },
  Rb: { "Rb⁺": "铷形成普通的 +1 价碱金属离子，性质与钾非常相似。" },
  Sr: { "Sr²⁺": "锶通常以 +2 价离子的形式存在于盐和矿物中。" },
  Y: { "Y³⁺": "钇通常在其化合物和矿石中表现为 +3 价态。" },
  Cd: { "Cd²⁺": "镉通常在其化合物中以 Cd²⁺ 的形式出现。" },
  In: { "In³⁺": "铟通常以 In³⁺ 的形式出现，尽管也存在 In⁺ 化合物。" },
  Sn: { "Sn²⁺": "锡(II) 是盐和还原性物质中两种常见的锡离子之一。", "Sn⁴⁺": "锡(IV) 是更高氧化态的离子，见于如 SnO₂ 这样的化合物。" },
  Pb: { "Pb²⁺": "铅(II) 是许多铅盐和矿石中更常见的简单铅离子。", "Pb⁴⁺": "铅(IV) 出现在氧化性极强的铅化合物中。" },
  Ba: { "Ba²⁺": "钡通常以 +2 价离子的形式存在于硫酸盐和碳酸盐等盐中。" },
  Hg: { "Hg₂²⁺": "亚汞通常以二聚体离子 Hg₂²⁺ 的形式存在。", "Hg²⁺": "汞(II) 是许多化合物中更常见的较高氧化态汞离子。" },
  Au: { "Au⁺": "金(I) 是金配位化学中常见的氧化态之一。", "Au³⁺": "金(III) 是许多金络合物中较高级别的常见状态。" },
  Tl: { "Tl⁺": "在许多化合物中，铊(I) 是比铊(III) 更稳定的普通铊离子。", "Tl³⁺": "铊(III) 是氧化程度更高但不太稳定的常见状态。" },
  Bi: { "Bi³⁺": "铋(III) 是化合物中最常表现出的铋氧化态。" },
  At: { "At⁻": "砹离子被预测具有类似卤素的阴离子结构，可能类似于碘离子。" },
  U: { "U⁴⁺": "铀(IV) 在 UO₂ 中十分重要，这是一种主要的核燃料。" }
};

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function unicodeToHtmlGlobal(text) {
  let result = "", i = 0;
  while (i < text.length) {
    if (ION_SUBSCRIPT_MAP[text[i]] !== undefined) {
      let sub = "";
      while (i < text.length && ION_SUBSCRIPT_MAP[text[i]] !== undefined) { sub += ION_SUBSCRIPT_MAP[text[i]]; i++; }
      result += `<sub>${sub}</sub>`; continue;
    }
    if (ION_SUPERSCRIPT_MAP[text[i]] !== undefined) {
      let sup = "";
      while (i < text.length && ION_SUPERSCRIPT_MAP[text[i]] !== undefined) { sup += ION_SUPERSCRIPT_MAP[text[i]]; i++; }
      result += `<sup>${sup}</sup>`; continue;
    }
    result += text[i]; i++;
  }
  return result;
}

function localizeNoAdditionalData() {
  const lang = getLang();
  if (lang === "zh-Hant") return "暫無更多詳細資料。";
  if (lang.startsWith("zh")) return "暂无更多详细数据。";
  if (lang.startsWith("ru")) return "Дополнительные данные отсутствуют.";
  if (lang.startsWith("fr")) return "Aucune information supplementaire disponible.";
  if (lang.startsWith("fa")) return "اطلاعات تکمیلی موجود نیست.";
  if (lang.startsWith("ur")) return "مزید تفصیلی معلومات دستیاب نہیں۔";
  if (lang.startsWith("tl")) return "Wala pang karagdagang detalye.";
  return "No additional data available.";
}

function buildLocalizedCommonIonNote(element, symbol) {
  const lang = getLang();
  const localizedName = localizeElementName(element);

  if (lang.startsWith("fr")) {
    return `${symbol} est un ion courant de l'element ${localizedName} dans ses composes usuels.`;
  }
  if (lang.startsWith("ru")) {
    return `${symbol} — распространенный ион элемента ${localizedName} в его обычных соединениях.`;
  }
  if (lang.startsWith("fa")) {
    return `${symbol} یکی از یون‌های رایج ${localizedName} در ترکیبات معمول آن است.`;
  }
  if (lang.startsWith("ur")) {
    return `${symbol} ${localizedName} کا ایک عام آئن ہے جو اس کے عام مرکبات میں پایا جاتا ہے۔`;
  }
  if (lang.startsWith("tl")) {
    return `${symbol} ay isang karaniwang ion ng ${localizedName} sa mga karaniwang compound nito.`;
  }
  return `${symbol} is a common ion of ${element.name} in its usual compounds.`;
}

function buildCommonIonDetailMarkup(element, symbol) {
  const override = COMMON_ION_DETAIL_OVERRIDES[element.symbol]?.[symbol];
  let note = override?.note || localizeNoAdditionalData();
  
  const lang = getLang();
  if (lang.startsWith("zh")) {
    const commonIonNotes = lang === "zh-Hant" ? COMMON_ION_ZH_HANT : COMMON_ION_ZH;
    if (!override?.note) {
      note = localizeNoAdditionalData();
    } else if (commonIonNotes[element.symbol]?.[symbol]) {
      note = commonIonNotes[element.symbol][symbol];
    }
  } else if (lang !== "en") {
    note = buildLocalizedCommonIonNote(element, symbol);
  }
  
  return `<div class="ion-item-detail-inner"><p class="ion-detail-note">${escapeHtml(note)}</p></div>`;
}

function localizeSimpleStatusText(value, fallback = "—") {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  if (/^unknown$/i.test(normalized)) return t("elementL1.unknown");
  if (/^no common ions$/i.test(normalized)) return t("elementL1.noCommonIons");
  
  // Phase handling with proper short-circuit fallback
  const phaseMap = { Solid: 1, Liquid: 1, Gas: 1 };
  if (phaseMap[normalized]) {
    let localizedPhase = t(`eit.propertyVal.basic.phaseAtSTP.${normalized}`);
    if (localizedPhase === `eit.propertyVal.basic.phaseAtSTP.${normalized}`) {
      localizedPhase = t(`eit.propertyVal.${normalized}`);
    }
    if (localizedPhase && localizedPhase !== `eit.propertyVal.${normalized}`) {
      return localizedPhase;
    }
  }

  // Category handling
  const catKey = "tableLegend." + normalized.replace(/[- ](.)/g, (match, grp) => grp.toUpperCase()).replace(/^(.)/, (match, grp) => grp.toLowerCase());
  const localizedCat = t(catKey);
  if (localizedCat && localizedCat !== catKey) {
    return localizedCat;
  }

  return normalized;
}

function localizeValence(val) {
  if (!val || val === "—") return "—";
  if (val === "Unknown") return t("elementL1.unknown");
  const lang = getLang();
  if (lang.startsWith("zh")) {
    const replacements = lang === "zh-Hant"
      ? [
          [/Variable \(outer s \+ d \+ f\)/i, "可變 (外層 s + d + f)"],
          [/Variable \(outer s \+ d\)/i, "可變 (外層 s + d)"],
          [/Variable \(outer s \+ f\)/i, "可變 (外層 s + f)"],
          [/Variable \(outer d only here\)/i, "可變 (僅外層 d)"],
          [/Variable/i, "可變"],
          [/\(d-subshell is full\)/gi, "(d 子殼層已充滿)"],
          [/\(s-subshell only\)/gi, "(僅 s 子殼層)"],
          [/\(f-subshell filling\)/gi, "(f 子殼層填充中)"],
          [/\(half-filled d\)/gi, "(d 半填充)"],
          [/\(full d before s\)/gi, "(d 先於 s 充滿)"],
          [/\(d-subshell\)/gi, "(d 子殼層)"],
          [/subshell/gi, "子殼層"],
          [/outer/gi, "外層"],
        ]
      : [
          [/Variable \(outer s \+ d \+ f\)/i, "可变 (外层 s + d + f)"],
          [/Variable \(outer s \+ d\)/i, "可变 (外层 s + d)"],
          [/Variable \(outer s \+ f\)/i, "可变 (外层 s + f)"],
          [/Variable \(outer d only here\)/i, "可变 (仅外层 d)"],
          [/Variable/i, "可变"],
          [/\(d-subshell is full\)/gi, "(d 子壳层已充满)"],
          [/\(s-subshell only\)/gi, "(仅 s 子壳层)"],
          [/\(f-subshell filling\)/gi, "(f 子壳层填充中)"],
          [/\(half-filled d\)/gi, "(d 半填充)"],
          [/\(full d before s\)/gi, "(d 先于 s 充满)"],
          [/\(d-subshell\)/gi, "(d 子壳层)"],
          [/subshell/gi, "子壳层"],
          [/outer/gi, "外层"],
        ];

    return replacements.reduce(
      (localized, [pattern, replacement]) => localized.replace(pattern, replacement),
      String(val),
    );
  }
  if (lang.startsWith("ru")) {
    return String(val)
      .replace(/Variable \(outer s \+ d \+ f\)/i, "Переменная (внешние s + d + f)")
      .replace(/Variable \(outer s \+ d\)/i, "Переменная (внешние s + d)")
      .replace(/Variable \(outer s \+ f\)/i, "Переменная (внешние s + f)")
      .replace(/Variable \(outer d only here\)/i, "Переменная (только внешние d)")
      .replace(/Variable/i, "Переменная")
      .replace(/\(d-subshell is full\)/gi, "(d-подоболочка заполнена)")
      .replace(/\(s-subshell only\)/gi, "(только s-подоболочка)")
      .replace(/\(f-subshell filling\)/gi, "(f-подоболочка заполняется)")
      .replace(/subshell/gi, "подоболочка")
      .replace(/outer/gi, "внешние");
  }

  if (lang === "ur") {
    return String(val)
      .replace(/Variable \(outer s \+ d \+ f\)/i, "متغیر (بیرونی s + d + f)")
      .replace(/Variable \(outer s \+ d\)/i, "متغیر (بیرونی s + d)")
      .replace(/Variable \(outer s \+ f\)/i, "متغیر (بیرونی s + f)")
      .replace(/Variable \(outer d only here\)/i, "متغیر (یہاں صرف بیرونی d)")
      .replace(/Variable/i, "متغیر")
      .replace(/\(d-subshell is full\)/gi, "(d-سب شیل بھرا ہوا ہے)")
      .replace(/\(s-subshell only\)/gi, "(صرف s-سب شیل)")
      .replace(/\(f-subshell filling\)/gi, "(f-سب شیل بھر رہا ہے)")
      .replace(/\(acts like 1\)/gi, "(1 کی طرح کام کرتا ہے)")
      .replace(/subshell/gi, "سب شیل")
      .replace(/outer/gi, "بیرونی");
  }
  if (lang === "fa") {
    return String(val)
      .replace(/Variable \(outer s \+ d \+ f\)/i, "متغیر (خارجی s + d + f)")
      .replace(/Variable \(outer s \+ d\)/i, "متغیر (خارجی s + d)")
      .replace(/Variable \(outer s \+ f\)/i, "متغیر (خارجی s + f)")
      .replace(/Variable \(outer d only here\)/i, "متغیر (فقط خارجی d اینجا)")
      .replace(/Variable/i, "متغیر")
      .replace(/\(d-subshell is full\)/gi, "(زیرلایه d پر است)")
      .replace(/\(s-subshell only\)/gi, "(فقط زیرلایه s)")
      .replace(/\(f-subshell filling\)/gi, "(در حال پر شدن زیرلایه f)")
      .replace(/\(acts like 1\)/gi, "(مانند 1 عمل می کند)")
      .replace(/subshell/gi, "زیرلایه")
      .replace(/outer/gi, "خارجی");
  }
  if (lang === "fr") {
    return String(val)
      .replace(/Variable \(outer s \+ d \+ f\)/i, "Variable (s + d + f externes)")
      .replace(/Variable \(outer s \+ d\)/i, "Variable (s + d externes)")
      .replace(/Variable \(outer s \+ f\)/i, "Variable (s + f externes)")
      .replace(/Variable \(outer d only here\)/i, "Variable (seulement d externe ici)")
      .replace(/Variable/i, "Variable")
      .replace(/\(d-subshell is full\)/gi, "(la sous-couche d est pleine)")
      .replace(/\(acts like 1\)/gi, "(agit comme 1)")
      .replace(/subshell/gi, "sous-couche")
      .replace(/outer/gi, "externe");
  }
  if (lang === "tl") {
    return String(val)
      .replace(/Variable \(outer s \+ d \+ f\)/i, "Nagbabago (panlabas na s + d + f)")
      .replace(/Variable \(outer s \+ d\)/i, "Nagbabago (panlabas na s + d)")
      .replace(/Variable \(outer s \+ f\)/i, "Nagbabago (panlabas na s + f)")
      .replace(/Variable \(outer d only here\)/i, "Nagbabago (d lang panlabas dito)")
      .replace(/Variable/i, "Nagbabago")
      .replace(/\(d-subshell is full\)/gi, "(puno na ang d-subshell)")
      .replace(/\(acts like 1\)/gi, "(kumikilos bilang 1)")
      .replace(/subshell/gi, "subshell")
      .replace(/outer/gi, "panlabas");
  }
  return val;
}

function localizeNA() {
  const lang = getLang();
  if (lang === "zh-Hant") return "暫無";
  if (lang.startsWith("zh")) return "暂无";
  if (lang.startsWith("ru")) return "Н/Д";
  if (lang.startsWith("fr")) return "N/D";
  if (lang.startsWith("fa")) return "ناموجود";
  if (lang.startsWith("ur")) return "دستیاب نہیں";
  if (lang.startsWith("tl")) return "Wala";
  return "N/A";
}

function localizeIsotopeStability(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const lang = getLang();
  const lower = normalized.toLowerCase();

  if (/(radioactive|放射)/i.test(lower)) {
    return t("elementModal.radioactive");
  }
  if (/(stable|穩定|稳定)/i.test(lower)) {
    return t("elementModal.stable");
  }

  if (lang === "zh-Hant") {
    return normalized
      .replace(/稳定/g, "穩定")
      .replace(/鲍林/g, "鮑林");
  }

  return normalized;
}

function compactLocalizedHistoryText(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return normalized;

  const lang = getLang();
  if (!lang.startsWith("zh")) return normalized;

  return normalized
    .replace(/\s*\(([A-Za-z][A-Za-z0-9 .,'’"“”:&/+-]*)\)\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildTextDetailMarkup(note) {
  const normalizedNote = String(note || "").trim();
  if (!normalizedNote) return "";
  return `<div class="ion-item-detail-inner"><p class="ion-detail-note">${escapeHtml(normalizedNote)}</p></div>`;
}

function shortenDetailText(text, fallback) {
  if (!text) return fallback;
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  const firstSentence = normalized.match(/.*?[.!?](?:\s|$)/)?.[0]?.trim() || normalized;
  if (firstSentence.length <= 120) return firstSentence;
  return `${firstSentence.slice(0, 117).trimEnd()}...`;
}

function buildIsotopeFallbackNote(element, isotope) {
  const percentText = String(isotope.percent || "").trim();
  const abundanceMatch = percentText.match(/\(([^)]+)\)/);
  const abundance = abundanceMatch?.[1] || "";
  const isRadioactive = /radioactive|decay|t½|half-life/i.test(percentText);
  const isStable = /stable/i.test(percentText) && !isRadioactive;
  const lang = getLang();
  
  if (lang.startsWith("zh")) {
    if (lang === "zh-Hant") {
      if (isStable && abundance) return `穩定同位素；自然豐度 ${abundance}。`;
      if (isStable) return `${localizeElementName(element)} 的穩定同位素。`;
      if (isRadioactive && /trace/i.test(percentText)) return "放射性同位素，自然界中僅存在痕量。";
      if (isRadioactive && abundance) return `放射性同位素；自然豐度 ${abundance}。`;
      if (isRadioactive) return `${localizeElementName(element)} 的放射性同位素。`;
      return "暫無更多詳細資料。";
    }
    if (isStable && abundance) return `稳定同位素；自然丰度 ${abundance}。`;
    if (isStable) return `${localizeElementName(element)} 的稳定同位素。`;
    if (isRadioactive && /trace/i.test(percentText)) return "放射性同位素，自然界中仅存在痕量。";
    if (isRadioactive && abundance) return `放射性同位素；自然丰度 ${abundance}。`;
    if (isRadioactive) return `${localizeElementName(element)} 的放射性同位素。`;
    return "暂无更多详细数据。";
  }
  if (lang.startsWith("ru")) {
    if (isStable && abundance) return `Стабильный изотоп; природная распространенность ${abundance}.`;
    if (isStable) return `Стабильный изотоп ${localizeElementName(element)}.`;
    if (isRadioactive && /trace/i.test(percentText)) return "Радиоактивный изотоп, присутствует в природе в следовых количествах.";
    if (isRadioactive && abundance) return `Радиоактивный изотоп; природная распространенность ${abundance}.`;
    if (isRadioactive) return `Радиоактивный изотоп ${localizeElementName(element)}.`;
    return localizeNoAdditionalData();
  }
  if (lang.startsWith("fr")) {
    if (isStable && abundance) return `Isotope stable de ${localizeElementName(element)}; abondance naturelle ${abundance}.`;
    if (isStable) return `Isotope stable de ${localizeElementName(element)}.`;
    if (isRadioactive && /trace/i.test(percentText)) return "Isotope radioactif present seulement a l'etat de traces naturelles.";
    if (isRadioactive && abundance) return `Isotope radioactif de ${localizeElementName(element)}; abondance naturelle ${abundance}.`;
    if (isRadioactive) return `Isotope radioactif de ${localizeElementName(element)}.`;
    return localizeNoAdditionalData();
  }
  if (lang.startsWith("fa")) {
    if (isStable && abundance) return `ایزوتوپ پایدار ${localizeElementName(element)}؛ فراوانی طبیعی ${abundance}.`;
    if (isStable) return `ایزوتوپ پایدار ${localizeElementName(element)}.`;
    if (isRadioactive && /trace/i.test(percentText)) return "ایزوتوپ رادیواکتیو که در طبیعت فقط به مقدار ناچیز یافت می‌شود.";
    if (isRadioactive && abundance) return `ایزوتوپ رادیواکتیو ${localizeElementName(element)}؛ فراوانی طبیعی ${abundance}.`;
    if (isRadioactive) return `ایزوتوپ رادیواکتیو ${localizeElementName(element)}.`;
    return localizeNoAdditionalData();
  }
  if (lang.startsWith("ur")) {
    if (isStable && abundance) return `${localizeElementName(element)} کا مستحکم آئسوٹوپ؛ قدرتی فراوانی ${abundance}۔`;
    if (isStable) return `${localizeElementName(element)} کا مستحکم آئسوٹوپ۔`;
    if (isRadioactive && /trace/i.test(percentText)) return "تابکار آئسوٹوپ جو قدرتی طور پر صرف نہایت قلیل مقدار میں پایا جاتا ہے۔";
    if (isRadioactive && abundance) return `${localizeElementName(element)} کا تابکار آئسوٹوپ؛ قدرتی فراوانی ${abundance}۔`;
    if (isRadioactive) return `${localizeElementName(element)} کا تابکار آئسوٹوپ۔`;
    return localizeNoAdditionalData();
  }
  if (lang.startsWith("tl")) {
    if (isStable && abundance) return `Matatag na isotope ng ${localizeElementName(element)}; likas na kasaganaan ${abundance}.`;
    if (isStable) return `Matatag na isotope ng ${localizeElementName(element)}.`;
    if (isRadioactive && /trace/i.test(percentText)) return "Radyoaktibong isotope na matatagpuan lamang sa bakas na dami sa kalikasan.";
    if (isRadioactive && abundance) return `Radyoaktibong isotope ng ${localizeElementName(element)}; likas na kasaganaan ${abundance}.`;
    if (isRadioactive) return `Radyoaktibong isotope ng ${localizeElementName(element)}.`;
    return localizeNoAdditionalData();
  }

  if (isStable && abundance) return `Stable isotope; natural abundance ${abundance}.`;
  if (isStable) return `Stable isotope of ${element.name}.`;
  if (isRadioactive && /trace/i.test(percentText)) return "Radioactive isotope present only in trace natural amounts.";
  if (isRadioactive && abundance) return `Radioactive isotope; natural abundance ${abundance}.`;
  if (isRadioactive) return `Radioactive isotope of ${element.name}.`;
  return localizeNoAdditionalData();
}

function localizeIsotopeNotes(text) {
  if (!text) return "";
  const lang = getLang();
  if (lang.startsWith("zh")) {
    if (lang === "zh-Hant") {
      return String(text)
        .replace(/Synthetic element\.?\s*/gi, "人工合成元素。")
        .replace(/is the longest-lived isotope amenable to study/gi, "是目前可研究的半衰期最長的同位素")
        .replace(/is the longest-lived isotope/gi, "是目前已知半衰期最長的同位素")
        .replace(/is the longest-lived known isotope/gi, "是已知半衰期最長的同位素")
        .replace(/is the longest-lived confirmed isotope/gi, "是已確認的半衰期最長的同位素")
        .replace(/is among the longest-lived/gi, "是半衰期較長的同位素之一")
        .replace(/is a strong neutron source used industrially/gi, "是工業上使用的強中子源")
        .replace(/is used in smoke detectors/gi, "被廣泛用於煙霧報警器")
        .replace(/is the only confirmed isotope/gi, "是唯一已確認的同位素")
        .replace(/Chemical studies confirmed/gi, "化學研究證實")
        .replace(/Chemical experiments suggest/gi, "化學實驗表明")
        .replace(/No chemical properties have been experimentally verified/gi, "其化學性質尚未通過實驗驗證")
        .replace(/Predicted to be near the island of stability/gi, "預計接近穩定島")
        .replace(/Relativistic effects predict/gi, "相對論效應預測")
        .replace(/it may be a solid or a semiconductor rather than a noble gas/gi, "它可能是固體或半導體，而非貴氣體")
        .replace(/high volatility, possibly liquid or gaseous at STP/gi, "具有高揮發性，在標準狀態下可能為液態或氣態")
        .replace(/volatile/gi, "揮發性")
        .replace(/like osmium/gi, "與鋨類似")
        .replace(/forms/gi, "形成")
        .replace(/has t½/gi, "半衰期為");
    }
    return String(text)
      .replace(/Synthetic element\.?\s*/gi, "人工合成元素。")
      .replace(/is the longest-lived isotope amenable to study/gi, "是目前可研究的半衰期最长的同位素")
      .replace(/is the longest-lived isotope/gi, "是目前已知半衰期最长的同位素")
      .replace(/is the longest-lived known isotope/gi, "是已知半衰期最长的同位素")
      .replace(/is the longest-lived confirmed isotope/gi, "是已确认的半衰期最长的同位素")
      .replace(/is among the longest-lived/gi, "是半衰期较长的同位素之一")
      .replace(/is a strong neutron source used industrially/gi, "是工业上使用的强中子源")
      .replace(/is used in smoke detectors/gi, "被广泛用于烟雾报警器")
      .replace(/is the only confirmed isotope/gi, "是唯一已确认的同位素")
      .replace(/Chemical studies confirmed/gi, "化学研究证实")
      .replace(/Chemical experiments suggest/gi, "化学实验表明")
      .replace(/No chemical properties have been experimentally verified/gi, "其化学性质尚未通过实验验证")
      .replace(/Predicted to be near the island of stability/gi, "预计接近稳定岛")
      .replace(/Relativistic effects predict/gi, "相对论效应预测")
      .replace(/it may be a solid or a semiconductor rather than a noble gas/gi, "它可能是固体或半导体，而非稀有气体")
      .replace(/high volatility, possibly liquid or gaseous at STP/gi, "具有高挥发性，在标准状态下可能为液态或气态")
      .replace(/volatile/gi, "挥发性")
      .replace(/like osmium/gi, "与锇类似")
      .replace(/forms/gi, "形成")
      .replace(/has t½/gi, "半衰期为");
  }
  if (lang.startsWith("ru")) {
    return String(text)
      .replace(/Synthetic element\.?\s*/gi, "Синтетический элемент. ")
      .replace(/is the longest-lived isotope/gi, "— наиболее долгоживущий изотоп")
      .replace(/is the longest-lived known isotope/gi, "— наиболее долгоживущий известный изотоп")
      .replace(/No chemical properties have been experimentally verified/gi, "Химические свойства экспериментально не подтверждены");
  }
  return text;
}

function buildIsotopeDetailMarkup(element, isotope, isotopeNotes) {
  const override = ISOTOPE_DETAIL_OVERRIDES[element.symbol]?.[isotope.name];
  const lang = getLang();
  let note = override || shortenDetailText(localizeIsotopeNotes(isotopeNotes), "") || buildIsotopeFallbackNote(element, isotope);
  
  if (lang.startsWith("zh")) {
    const isotopeNotesByLang = lang === "zh-Hant" ? ISOTOPE_ZH_HANT : ISOTOPE_ZH;
    if (isotopeNotesByLang[element.symbol]?.[isotope.name]) {
      note = isotopeNotesByLang[element.symbol][isotope.name];
    }
  } else if (lang !== "en") {
    note = buildIsotopeFallbackNote(element, isotope);
  }
  
  return `<div class="ion-item-detail-inner"><p class="ion-detail-note">${escapeHtml(note)}</p></div>`;
}

function splitEntriesOutsideParentheses(text) {
  const entries = []; let depth = 0; let current = "";
  for (const char of String(text || "")) {
    if (char === "(") depth++;
    if (char === ")" && depth > 0) depth--;
    if (char === "," && depth === 0) { if (current.trim()) entries.push(current.trim()); current = ""; continue; }
    current += char;
  }
  if (current.trim()) entries.push(current.trim());
  return entries;
}

function closeExpandedDetailItems(container, except = null) {
  container.querySelectorAll(".ion-item-expandable.active").forEach((expandedItem) => {
    if (expandedItem === except) return;
    expandedItem.classList.remove("active");
    expandedItem.setAttribute("aria-expanded", "false");
  });
}

function createExpandablePill({ summaryHtml, detailMarkup, container }) {
  const item = document.createElement("div");
  item.className = "ion-item ion-item-expandable";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.setAttribute("aria-expanded", "false");
  item.innerHTML = `<div class="ion-item-summary">${summaryHtml}</div><div class="ion-item-detail">${detailMarkup}</div>`;

  const toggleItem = () => {
    const isActive = item.classList.contains("active");
    closeExpandedDetailItems(container, item);
    item.classList.toggle("active", !isActive);
    item.setAttribute("aria-expanded", String(!isActive));
  };

  const triggerBounce = () => {
    item.style.transition = "none";
    item.style.transform = "scale(0.94)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        item.style.transition = "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)";
        item.style.transform = "scale(1)";
        setTimeout(() => { item.style.transition = ""; item.style.transform = ""; }, 450);
      });
    });
  };

  item.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleItem();
    triggerBounce();
  });
  item.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); toggleItem();
  });
  return item;
}


function clearHeadlineResizeHandler() {
  if (!headlineResizeHandler) return;
  window.removeEventListener("resize", headlineResizeHandler);
  headlineResizeHandler = null;
}

function getRepresentativeMassNumber(atomicNumber, fallback = null) {
  if (atomicNumber < 1 || atomicNumber > REPRESENTATIVE_MASS_NUMBERS.length) {
    return fallback;
  }
  return REPRESENTATIVE_MASS_NUMBERS[atomicNumber - 1];
}

function formatAverageAtomicMass(value, atomicNumber, fallbackWeight = null) {
  const raw = value == null ? "" : String(value).trim();
  const fallbackMass = getRepresentativeMassNumber(
    atomicNumber,
    Number.isFinite(fallbackWeight) ? Math.round(fallbackWeight) : fallbackWeight,
  );

  if (!raw || raw === "—") {
    return fallbackMass != null ? String(fallbackMass) : "—";
  }

  const bracketedMatch = raw.match(/\[\s*(\d+(?:\.\d+)?)\s*\]/);
  if (bracketedMatch) {
    return bracketedMatch[1];
  }

  const cleaned = raw
    .replace(/\s*\((?:radioactive|highly radioactive)[^)]+\)\s*/i, "")
    .replace(/\s*\((?:radioactive|highly radioactive)\)\s*/i, "")
    .trim();

  if (cleaned && /^[\d.]+$/.test(cleaned)) {
    return cleaned;
  }

  if (/radioactive/i.test(raw) && fallbackMass != null) {
    return String(fallbackMass);
  }

  return cleaned || raw;
}

function bindKeyboardActivation(el, onActivate) {
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onActivate();
  });
}

function clearLegendSelection(container) {
  container.querySelectorAll(".legend-item.active").forEach((el) => {
    el.classList.remove("active");
    el.setAttribute("aria-pressed", "false");
  });
}

function setLegendSelection(container, catClass) {
  const legendItem = container.querySelector(
    `.legend-item[data-category="${catClass}"]`,
  );
  if (!legendItem) return;
  legendItem.classList.add("active");
  legendItem.setAttribute("aria-pressed", "true");
}

function normalizeCategoryClass(catClass) {
  const aliasMap = {
    "non-metal": "other-nonmetal",
  };
  return aliasMap[catClass] || catClass;
}

// ===== Display helpers: HKDSE-style group numbering =====
// - Transition metals (d-block, columns 3–12): no group number shown
// - Lanthanides/actinides (f-block): no group number shown
// - Main group: 1,2 then 3–7 for columns 13–17; noble gases are group 0 (column 18)
// - Hydrogen is not assigned to Group I (alkali metals) in HKDSE-style teaching
function getDisplayGroupHKDSE(element) {
  if (!element) return null;
  if (element.number === 1) return null;
  if (element.series === "lanthanide" || element.series === "actinide") return null;
  const col = element.column;
  if (!Number.isInteger(col)) return null;
  if (col >= 3 && col <= 12) return null;
  const toRoman = (n) => {
    const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII" };
    return map[n] || null;
  };
  if (col === 18) return "0";
  if (col === 13) return toRoman(3);
  if (col === 14) return toRoman(4);
  if (col === 15) return toRoman(5);
  if (col === 16) return toRoman(6);
  if (col === 17) return toRoman(7);
  if (col === 1) return toRoman(1);
  if (col === 2) return toRoman(2);
  return null;
}

// ===== Electron arrangement helpers (Bohr shell allocation) =====
const BOHR_SHELL_CAPACITIES = [2, 8, 8, 18, 18, 32, 32];

function getElectronArrangementByZ(z) {
  if (!Number.isFinite(z) || z <= 0) return [];
  let left = Math.floor(z);
  const out = [];
  for (let i = 0; i < BOHR_SHELL_CAPACITIES.length && left > 0; i++) {
    const cap = BOHR_SHELL_CAPACITIES[i];
    const take = Math.min(left, cap);
    out.push(take);
    left -= take;
  }
  return out;
}

function formatShellElectronsLabel(shells, label) {
  const lbl = label ?? t("elementL2.configuration");
  return shells?.length ? `${lbl}: ${shells.join(", ")}` : "—";
}

function renderMiniBohr(container, shells) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(shells) || shells.length === 0) return;

  const sizePx = 44;
  const center = sizePx / 2;
  const ringGap = shells.length <= 1 ? 0 : 6.8;

  container.style.width = `${sizePx}px`;
  container.style.height = `${sizePx}px`;

  shells.forEach((count, idx) => {
    const ring = document.createElement("div");
    ring.className = "electron-bohr-ring";
    const r = 10.2 + idx * ringGap;
    ring.style.width = `${r * 2}px`;
    ring.style.height = `${r * 2}px`;
    ring.style.left = `${center}px`;
    ring.style.top = `${center}px`;
    container.appendChild(ring);

    const n = Math.max(0, Math.floor(count || 0));
    if (n <= 0) return;

    // Pair electrons for shells 2+, but keep the first shell unpaired (even spacing).
    if (idx === 0) {
      for (let i = 0; i < n; i++) {
        const dot = document.createElement("span");
        dot.className = "electron-bohr-dot";
        const deg = (360 / n) * i;
        dot.style.left = `${center}px`;
        dot.style.top = `${center}px`;
        dot.style.transform = `translate(-50%, -50%) rotate(${deg}deg) translate(${r}px) rotate(${-deg}deg)`;
        container.appendChild(dot);
      }
      return;
    }

    const pairCount = Math.ceil(n / 2);
    const pairSpreadDeg = 8;
    for (let p = 0; p < pairCount; p++) {
      const baseDeg = (360 / pairCount) * p;
      const remaining = n - p * 2;
      const dotsInPair = remaining >= 2 ? 2 : 1;
      for (let k = 0; k < dotsInPair; k++) {
        const dot = document.createElement("span");
        dot.className = "electron-bohr-dot";
        const offset =
          dotsInPair === 2 ? (k === 0 ? -pairSpreadDeg / 2 : pairSpreadDeg / 2) : 0;
        const deg = baseDeg + offset;
        dot.style.left = `${center}px`;
        dot.style.top = `${center}px`;
        dot.style.transform = `translate(-50%, -50%) rotate(${deg}deg) translate(${r}px) rotate(${-deg}deg)`;
        container.appendChild(dot);
      }
    }
  });
}

let legendMeasureCanvas = null;

function getTranslationByPath(source, path) {
  return String(path || "")
    .split(".")
    .reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), source);
}

function measureLegendTextWidth(text) {
  if (!legendMeasureCanvas) {
    legendMeasureCanvas = document.createElement("canvas");
  }
  const ctx = legendMeasureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font =
    '600 11px "Inter", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';
  return Math.ceil(ctx.measureText(String(text || "")).width);
}

function getLegendItemMinWidth(nameKey) {
  const enLabel = getTranslationByPath(translations.en, nameKey) || "";
  const labelWidth = measureLegendTextWidth(enLabel);
  // 10(swatch) + 5(gap) + 16(horizontal padding) + 3(border breathing room)
  return labelWidth + 34;
}

function updateAlkalineEarthMarquee(item) {
  if (!item || !item.classList.contains("legend-marquee-item")) return;
  const label = item.querySelector(".legend-label");
  const labelText = item.querySelector(".legend-label-text");
  if (!label || !labelText) return;

  item.classList.remove("marquee-overflow");
  item.style.removeProperty("--legend-marquee-shift");

  const overflow = Math.ceil(labelText.scrollWidth - label.clientWidth);
  if (overflow > 1) {
    item.classList.add("marquee-overflow");
    item.style.setProperty("--legend-marquee-shift", `${overflow}px`);
  }
}

function highlightCategory(container, catClass) {
  const normalized = normalizeCategoryClass(catClass);
  container.classList.add("highlighting");
  const elements = container.querySelectorAll(".element");
  elements.forEach((el) => {
    if (el.classList.contains(catClass) || el.classList.contains(normalized)) {
      el.classList.add("highlighted");
    } else {
      el.classList.remove("highlighted");
    }
  });
}
function clearHighlights(container) {
  container.classList.remove("highlighting");
  const highlighted = container.querySelectorAll(".element.highlighted");
  highlighted.forEach((el) => el.classList.remove("highlighted"));
}

export const eitController = createEITController({
  normalizeCategoryClass,
  onLegendReset: (container) => {
    activeLegendCategory = null;
    clearLegendSelection(container);
    clearHighlights(container);
  },
});

function createLegend(container) {
  const legendContainer = document.createElement("div");
  legendContainer.id = "table-legend";
  
  window.createDefaultLegend = function() {
    const lg = document.getElementById("table-legend");
    if (!lg) return;
    lg.innerHTML = "";
    lg.className = ""; // clear possible custom classes
    populateLegend(lg);
  };

  function populateLegend(targetContainer) {
    const categories = [
    // Row 1 (4 items)
    { nameKey: "tableLegend.alkaliMetal", class: "alkali-metal" },
    { nameKey: "tableLegend.alkalineEarth", class: "alkaline-earth-metal" },
    { nameKey: "tableLegend.transitionMetal", class: "transition-metal" },
    { nameKey: "tableLegend.metalloid", class: "metalloid" },
    // Row 2 (4 items)
    { nameKey: "tableLegend.halogen", class: "halogen" },
    { nameKey: "tableLegend.nobleGas", class: "noble-gas" },
    { nameKey: "tableLegend.lanthanide", class: "lanthanide" },
    { nameKey: "tableLegend.actinide", class: "actinide" },
    // Row 3 (2 wider items)
    {
      nameKey: "tableLegend.otherNonmetal",
      class: "other-nonmetal",
      layoutClass: "legend-wide-left",
    },
    {
      nameKey: "tableLegend.postTransition",
      class: "post-transition-metal",
      layoutClass: "legend-wide-right",
    },
  ];
  categories.forEach((cat) => {
    const localizedName = t(cat.nameKey);
    const item = document.createElement("div");
    item.classList.add("legend-item");
    if (cat.layoutClass) item.classList.add(cat.layoutClass);
    item.setAttribute("data-category", cat.class);
    item.setAttribute("data-name-key", cat.nameKey);
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-pressed", "false");
    item.setAttribute(
      "aria-label",
      t("tableLegend.toggleHighlight").replace("{name}", localizedName),
    );
    const swatch = document.createElement("div");
    swatch.className = `legend-swatch ${cat.class}`;
    swatch.style.pointerEvents = "none";
    const label = document.createElement("span");
    label.className = "legend-label";
    const labelText = document.createElement("span");
    labelText.className = "legend-label-text";
    labelText.textContent = localizedName;
    label.appendChild(labelText);
    label.style.pointerEvents = "none";
    item.style.minWidth = `${getLegendItemMinWidth(cat.nameKey)}px`;
    if (cat.nameKey === "tableLegend.alkalineEarth") {
      item.classList.add("alkaline-earth-marquee");
    }
    item.classList.add("legend-marquee-item");
    item.appendChild(swatch);
    item.appendChild(label);
    requestAnimationFrame(() => updateAlkalineEarthMarquee(item));
    item.addEventListener("mouseenter", () => {
      if (eitController.isLegendLocked()) return;
      if (activeLegendCategory) return;
      highlightCategory(container, cat.class);
    });
    item.addEventListener("mouseleave", () => {
      if (eitController.isLegendLocked()) return;
      if (activeLegendCategory) return;
      clearHighlights(container);
    });
    const toggleLegendFilter = () => {
      if (eitController.isLegendLocked()) return;
      if (activeLegendCategory === cat.class) {
        activeLegendCategory = null;
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
        clearHighlights(container);
      } else {
        clearLegendSelection(container);
        activeLegendCategory = cat.class;
        item.classList.add("active");
        item.setAttribute("aria-pressed", "true");
        highlightCategory(container, cat.class);
      }
    };
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLegendFilter();
    });
    bindKeyboardActivation(item, toggleLegendFilter);
    targetContainer.appendChild(item);
  });
  }

  populateLegend(legendContainer);

  if (!legendContainer.dataset.langBound) {
    onLangChange(() => {
      legendContainer.querySelectorAll(".legend-item").forEach((item) => {
        const nameKey = item.getAttribute("data-name-key");
        if (!nameKey) return;
        const localizedName = t(nameKey);
        const labelText = item.querySelector(".legend-label-text");
        if (labelText) labelText.textContent = localizedName;
        requestAnimationFrame(() => updateAlkalineEarthMarquee(item));
        item.setAttribute(
          "aria-label",
          t("tableLegend.toggleHighlight").replace("{name}", localizedName),
        );
      });
    });
    legendContainer.dataset.langBound = "true";
  }

  if (!legendContainer.dataset.resizeBound) {
    window.addEventListener("resize", () => {
      legendContainer.querySelectorAll(".legend-marquee-item").forEach((item) => {
        updateAlkalineEarthMarquee(item);
      });
    });
    legendContainer.dataset.resizeBound = "true";
  }

  container.appendChild(legendContainer);
}

function updatePeriodicTableLocalizedText(tableContainer) {
  if (!tableContainer) return;

  tableContainer.querySelectorAll(".element[data-element-number]").forEach((cell) => {
    const elementId = String(cell.dataset.elementNumber || "").trim();
    const element = elements.find((entry) => String(entry.number) === elementId);
    if (!element) return;

    const nameEl = cell.querySelector(".name");
    if (nameEl) {
      const locName = localizeElementName(element);
      nameEl.textContent = locName;
      const lang = document.documentElement.lang || "en";
      if (locName.length <= 6 && !lang.startsWith("zh")) {
        nameEl.classList.add("short-name");
      } else {
        nameEl.classList.remove("short-name");
      }
    }

    if (cell.classList.contains("range-block")) {
      cell.setAttribute(
        "aria-label",
        element.symbol === "La-Lu"
          ? t("tableLegend.toggleLanthanide")
          : t("tableLegend.toggleActinide"),
      );
      return;
    }

    cell.setAttribute(
      "aria-label",
      `${localizeElementName(element)} (${element.symbol}), atomic number ${element.number}`,
    );
  });
}

// ===== Periodic Table Grid Generation =====
export function buildPeriodicTable(tableContainer) {
  eitController.resetEITRegistry();
  eitController.resetEITState();

  // Clear previous build (including labels)
  tableContainer.innerHTML = "";

  // Top-left blank corner
  const corner = document.createElement("div");
  corner.className = "empty";
  corner.style.gridRow = 1;
  corner.style.gridColumn = 1;
  tableContainer.appendChild(corner);

  // Group labels (HKDSE: I, II, III–VII, 0)
  const groupLabelByColumn = {
    1: "I",
    2: "II",
    13: "III",
    14: "IV",
    15: "V",
    16: "VI",
    17: "VII",
    18: "0",
  };
  for (let c = 1; c <= 18; c++) {
    const label = groupLabelByColumn[c] || "";
    const cell = document.createElement("div");
    cell.className = "group-label";
    cell.textContent = label;
    cell.style.gridRow = 1;
    cell.style.gridColumn = c + 1; // +1 because col 1 is period labels
    tableContainer.appendChild(cell);
  }

  // Period labels (1–7)
  for (let r = 1; r <= 7; r++) {
    const cell = document.createElement("div");
    cell.className = "period-label";
    cell.textContent = String(r);
    cell.style.gridRow = r + 1; // +1 because row 1 is group labels
    cell.style.gridColumn = 1;
    tableContainer.appendChild(cell);
  }

  const bindTouchActivate = (el, handler) => {
    if (!el) return;
    let lastTouchUpAt = 0;
    // Dedupe: iPad Safari may fire a delayed click after pointerup.
    el.addEventListener("click", (e) => {
      if (lastTouchUpAt && (performance.now() - lastTouchUpAt) < 650) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }, { capture: true });
    el.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (window._uniplusIsDragging) return;
      e.preventDefault();
      e.stopPropagation();
      lastTouchUpAt = performance.now();
      handler();
    }, { passive: false });
  };

  const grid = {};
  elements.forEach((element) => {
    if (element.row && element.column) {
      grid[`${element.row}-${element.column}`] = element;
    }
  });
  for (let r = 1; r <= 7; r++) {
    for (let c = 1; c <= 18; c++) {
      const element = grid[`${r}-${c}`];
      const cell = document.createElement("div");
      if (element) {
        const relMass = finallyData?.[element.number]?.level2_atomic?.mass?.highSchool || "";
        const relMassHtml = relMass
          ? `<span class="rel-mass" aria-hidden="true" style="position:absolute;left:calc(var(--tvmin, 1vmin) * 0.6);bottom:calc(var(--tvmin, 1vmin) * 0.35);font-size:9cqi;font-weight:700;opacity:0.42;letter-spacing:-0.01em;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;">${escapeHtml(relMass)}</span>`
          : `<span class="rel-mass" aria-hidden="true" style="display:none;"></span>`;
        cell.classList.add("element");
        if (element.row === 7) cell.classList.add("period-7");
        cell.dataset.elementNumber = String(element.number);
        cell.setAttribute("role", "button");
        cell.setAttribute("tabindex", "0");
        if (element.category) {
          const catClass = normalizeCategoryClass(element.category
            .toLowerCase()
            .replace(/ /g, "-")
            .replace(/[^a-z0-9-]/g, ""));
          cell.classList.add(catClass);
        }
        const shells = getElectronArrangementByZ(element.number);
        const arrangementText = formatShellElectronsLabel(shells);
        const showGraph = typeof element.number === "number" && element.number <= 20;
        if (showGraph) cell.classList.add("electron-arrangement-has-graph");
        cell.innerHTML = `
                      <span class="number">${element.number}</span>
                      <span class="symbol">${element.symbol}</span>
                      <span class="name">${localizeElementName(element)}</span>
                      ${relMassHtml}
                      <span class="electron-arrangement" aria-hidden="true">
                        <span class="electron-arrangement-text">${arrangementText}</span>
                        ${
                          showGraph
                            ? `<span class="electron-bohr-wrap"><span class="electron-bohr" data-shells="${shells.join(",")}"></span><span class="electron-bohr-symbol">${element.symbol}</span></span>`
                            : ``
                        }
                      </span>
                  `;
        // Range blocks (La-Lu, Ac-Lr): toggle category highlight instead of modal
        if (element.symbol === "La-Lu" || element.symbol === "Ac-Lr") {
          cell.classList.add("range-block");
          const catClass = element.symbol === "La-Lu" ? "lanthanide" : "actinide";
          const toggleRangeHighlight = () => {
            if (eitController.isLegendLocked()) return;
            if (activeLegendCategory === catClass) {
              activeLegendCategory = null;
              clearLegendSelection(tableContainer);
              clearHighlights(tableContainer);
            } else {
              clearLegendSelection(tableContainer);
              activeLegendCategory = catClass;
              setLegendSelection(tableContainer, catClass);
              highlightCategory(tableContainer, catClass);
            }
          };
          cell.setAttribute(
            "aria-label",
            element.symbol === "La-Lu"
              ? t("tableLegend.toggleLanthanide")
              : t("tableLegend.toggleActinide"),
          );
          cell.addEventListener("click", toggleRangeHighlight);
          bindTouchActivate(cell, toggleRangeHighlight);
          bindKeyboardActivation(cell, toggleRangeHighlight);
        } else {
          const openElementModal = () => showModal(element);
          cell.setAttribute(
            "aria-label",
            `${localizeElementName(element)} (${element.symbol}), atomic number ${element.number}`,
          );
          cell.addEventListener("click", openElementModal);
          bindTouchActivate(cell, openElementModal);
          bindKeyboardActivation(cell, openElementModal);
          eitController.registerEITElementCell(cell, element);

        }
      } else {
        cell.classList.add("empty");
      }
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      tableContainer.appendChild(cell);
    }
  }
  createLegend(tableContainer);
  const lanthanides = elements
    .filter((e) => e.series === "lanthanide" && typeof e.number === "number")
    .sort((a, b) => a.number - b.number);
  const actinides = elements
    .filter((e) => e.series === "actinide" && typeof e.number === "number")
    .sort((a, b) => a.number - b.number);
  lanthanides.forEach((element, index) => {
    const cell = document.createElement("div");
    cell.classList.add("element", "lanthanide");
    const relMass = finallyData?.[element.number]?.level2_atomic?.mass?.highSchool || "";
    const relMassHtml = relMass
      ? `<span class="rel-mass" aria-hidden="true" style="position:absolute;left:calc(var(--tvmin, 1vmin) * 0.6);bottom:calc(var(--tvmin, 1vmin) * 0.35);font-size:9cqi;font-weight:700;opacity:0.42;letter-spacing:-0.01em;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;">${escapeHtml(relMass)}</span>`
      : `<span class="rel-mass" aria-hidden="true" style="display:none;"></span>`;
    cell.dataset.elementNumber = String(element.number);
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute(
      "aria-label",
      `${localizeElementName(element)} (${element.symbol}), atomic number ${element.number}`,
    );
    if (element.category) {
      const catClass = normalizeCategoryClass(element.category
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^a-z0-9-]/g, ""));
      cell.classList.add(catClass);
    }
    const shells = getElectronArrangementByZ(element.number);
    const arrangementText = formatShellElectronsLabel(shells);
    const showGraph = typeof element.number === "number" && element.number <= 20;
    if (showGraph) cell.classList.add("electron-arrangement-has-graph");
    cell.innerHTML = `
              <span class="number">${element.number}</span>
              <span class="symbol">${element.symbol}</span>
              <span class="name">${localizeElementName(element)}</span>
              ${relMassHtml}
              <span class="electron-arrangement" aria-hidden="true">
                <span class="electron-arrangement-text">${arrangementText}</span>
                ${
                  showGraph
                    ? `<span class="electron-bohr-wrap"><span class="electron-bohr" data-shells="${shells.join(",")}"></span><span class="electron-bohr-symbol">${element.symbol}</span></span>`
                    : ``
                }
              </span>
          `;
    const openElementModal = () => showModal(element);
    cell.addEventListener("click", openElementModal);
    bindTouchActivate(cell, openElementModal);
    bindKeyboardActivation(cell, openElementModal);
    eitController.registerEITElementCell(cell, element);

    // After adding header row: periods occupy rows 2–8, gap is row 9.
    // Place La–Lu on the first row after the gap.
    cell.style.gridRow = 10;
    cell.style.gridColumn = 5 + index;
    tableContainer.appendChild(cell);
  });
  actinides.forEach((element, index) => {
    const cell = document.createElement("div");
    cell.classList.add("element", "actinide");
    const relMass = finallyData?.[element.number]?.level2_atomic?.mass?.highSchool || "";
    const relMassHtml = relMass
      ? `<span class="rel-mass" aria-hidden="true" style="position:absolute;left:calc(var(--tvmin, 1vmin) * 0.6);bottom:calc(var(--tvmin, 1vmin) * 0.35);font-size:9cqi;font-weight:700;opacity:0.42;letter-spacing:-0.01em;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;">${escapeHtml(relMass)}</span>`
      : `<span class="rel-mass" aria-hidden="true" style="display:none;"></span>`;
    cell.dataset.elementNumber = String(element.number);
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute(
      "aria-label",
      `${localizeElementName(element)} (${element.symbol}), atomic number ${element.number}`,
    );
    if (element.category) {
      const catClass = normalizeCategoryClass(element.category
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^a-z0-9-]/g, ""));
      cell.classList.add(catClass);
    }
    const shells = getElectronArrangementByZ(element.number);
    const arrangementText = formatShellElectronsLabel(shells);
    const showGraph = typeof element.number === "number" && element.number <= 20;
    if (showGraph) cell.classList.add("electron-arrangement-has-graph");
    cell.innerHTML = `
              <span class="number">${element.number}</span>
              <span class="symbol">${element.symbol}</span>
              <span class="name">${localizeElementName(element)}</span>
              ${relMassHtml}
              <span class="electron-arrangement" aria-hidden="true">
                <span class="electron-arrangement-text">${arrangementText}</span>
                ${
                  showGraph
                    ? `<span class="electron-bohr-wrap"><span class="electron-bohr" data-shells="${shells.join(",")}"></span><span class="electron-bohr-symbol">${element.symbol}</span></span>`
                    : ``
                }
              </span>
          `;
    const openElementModal = () => showModal(element);
    cell.addEventListener("click", openElementModal);
    bindTouchActivate(cell, openElementModal);
    bindKeyboardActivation(cell, openElementModal);
    eitController.registerEITElementCell(cell, element);

    // Place Ac–Lr on the second row after the gap.
    cell.style.gridRow = 11;
    cell.style.gridColumn = 5 + index;
    tableContainer.appendChild(cell);
  });
  
  // Apply text cramping and correct language classes initially
  updatePeriodicTableLocalizedText(tableContainer);

  // Hydrate mini Bohr diagrams once per build (Z <= 20 only).
  tableContainer.querySelectorAll(".electron-bohr").forEach((node) => {
    const shells = String(node.dataset.shells || "")
      .split(",")
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    renderMiniBohr(node, shells);
  });

  if (!tableContainer.dataset.langBound) {
    onLangChange(() => {
      updatePeriodicTableLocalizedText(tableContainer);
    });
    tableContainer.dataset.langBound = "true";
  }

  fetchElementLocale(getLang()).finally(() => {
    updatePeriodicTableLocalizedText(tableContainer);
  });

  eitController.ensureEITController(tableContainer);
  const hash = window.location.hash.toLowerCase();
  if (hash === "#pb" || hash === "#lead") {
    const leadElement = elements.find((el) => el.symbol === "Pb");
    if (leadElement) {
      setTimeout(() => showModal(leadElement), 500);
    }
  }
}

// ===== Modal DOM References (assigned in initModalUI) =====
let modal, modalClose, modalSymbol, modalName, modalNumber, modalCategory,
  modalPhase, modalCategoryDisplay, modalConfigLarge, modalDiscovery,
  modalEtymology, modalDescription, modalDensity, modalMelt, modalBoil,
  modalNegativity, modalRadius, modalWatermark,
  atomContainer, modalCharge, modalP, modalE, modalN, modalPeriod,
  modalGroup, modalCompounds, modalUses, modalHazards,
  eduNames, eduIsotopes, eduCardsContainer;

// ===== Pure Helpers =====
export function reRenderCurrentAtomModal() {
  if (window.currentAtomElement) {
    let currentLevelIndex = null;
    const activeDot = document.querySelector(".slider-dots .dot.active");
    if (activeDot && activeDot.parentElement) {
      const dots = Array.from(activeDot.parentElement.querySelectorAll(".dot"));
      const idx = dots.indexOf(activeDot);
      if (idx >= 0) currentLevelIndex = idx;
    }
    if (currentLevelIndex === null) {
      const activeLevelBtn = document.querySelector(".level-btn.active[data-level]");
      if (activeLevelBtn) {
        const parsed = Number(activeLevelBtn.dataset.level) - 1;
        if (!Number.isNaN(parsed) && parsed >= 0) currentLevelIndex = parsed;
      }
    }
    if (currentLevelIndex === null) {
      const visibleLevel = Array.from(document.querySelectorAll(".level-content")).find(
        (content) => getComputedStyle(content).display !== "none",
      );
      if (visibleLevel && visibleLevel.id?.startsWith("level-")) {
        const parsed = Number(visibleLevel.id.replace("level-", "")) - 1;
        if (!Number.isNaN(parsed) && parsed >= 0) currentLevelIndex = parsed;
      }
    }
    if (currentLevelIndex !== null) {
      window._pendingLevelIndex = currentLevelIndex;
    }
    showModal(window.currentAtomElement);
  }
}

function getElementCategory(element) {
  if (element.number === 1) return "Other nonmetal";
  const c = element.column;
  const metalloids = [5, 14, 32, 33, 51, 52, 85];
  if (metalloids.includes(element.number)) return t("tableLegend.metalloid");
  if (c === 18) return "Other nonmetal (Noble Gas)";
  if (c === 17) return "Other nonmetal (Halogen)";
  const otherNonmetals = [6, 7, 8, 15, 16, 34];
  if (otherNonmetals.includes(element.number)) return "Other nonmetal";
  return "Metal";
}
// ===== L3 Stat Item: Clickable Unit Conversion =====
// Tracks the current unit index per metric key so cycling persists during a modal session
let savedUnits = null;
try {
  const stored = localStorage.getItem('uniplus_units');
  if (stored) savedUnits = JSON.parse(stored);
} catch (e) {
  // Ignore storage access failures and fall back to default units.
}
export const l3UnitState = savedUnits || { ie: 0, ea: 0, melt: 0, boil: 0, density: 0 };

function saveUnits() {
  try {
    localStorage.setItem('uniplus_units', JSON.stringify(l3UnitState));
  } catch (e) {
    // Ignore storage access failures so the UI keeps working.
  }
  if (window._syncGlobalUnitButtons) window._syncGlobalUnitButtons();
}

export function setGlobalUnit(type, idx) {
  if (type === 'temp') {
    l3UnitState.melt = idx;
    l3UnitState.boil = idx;
  } else if (type === 'density') {
    l3UnitState.density = idx;
  } else if (type === 'energy') {
    l3UnitState.ie = idx;
    l3UnitState.ea = idx;
  }
  saveUnits();
}

const L3_UNIT_CONFIGS = {
  // Helper to parse strings containing numbers, ranges, approx symbols, and pred flags
  _parseStr(raw, isEV_IE = false) {
    if (!raw || raw === "N/A" || raw === "Unknown" || String(raw).includes("Sublimes") || String(raw).includes("Pressurized")) return null;
    const s = String(raw).replace(/−/g, "-").replace(/,/g, "");
    const isPred = /pred/i.test(s);
    // Strip pred flags and standard units so they don't get into the template
    let clean = s.replace(/\(pred\)/ig, "")
                 .replace(/g\/cm³/g, "")
                 .replace(/kJ\/mol/g, "")
                 .replace(/eV/ig, "")
                 .replace(/°C/g, "")
                 .trim();

    if (clean === "—" || clean === "") return null;

    // Keep trailing notes like "(graphite)" or "(est)" and render them after the unit.
    const trailingNotes = [];
    let trailingMatch;
    while ((trailingMatch = clean.match(/\s*(\([^)]*\))\s*$/))) {
      trailingNotes.unshift(trailingMatch[1]);
      clean = clean.slice(0, trailingMatch.index).trim();
    }
    const postUnitNote = trailingNotes.length ? ` ${trailingNotes.join(" ")}` : "";

    const numMatches = [];
    // Match any float number
    const regex = /-?\d+\.?\d*/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      numMatches.push({ index: match.index, length: match[0].length, val: parseFloat(match[0]) });
    }

    if (numMatches.length === 0) return null;

    let template = clean;
    for (let i = numMatches.length - 1; i >= 0; i--) {
      const m = numMatches[i];
      template = template.substring(0, m.index) + `{${i}}` + template.substring(m.index + m.length);
    }

    const vals = numMatches.map(m => isEV_IE ? m.val * 96.485 : m.val);

    return { template, vals, isPred, postUnitNote };
  },

  density: {
    units: [
      { unit: "g/cm³", digits: 2 },
      { unit: "kg/m³", digits: 0 },
      { unit: "lb/ft³", digits: 2 },
    ],
    parse(raw) { return L3_UNIT_CONFIGS._parseStr(raw); },
    convert(baseObj, unitIdx) {
      if (!baseObj) return { text: localizeNA(), isPred: false };
      const { template, vals, isPred, postUnitNote = "" } = baseObj;
      const formattedVals = vals.map(baseVal => {
        if (unitIdx === 1) return (baseVal * 1000).toString();
        if (unitIdx === 2) return (baseVal * 62.42796).toFixed(2);
        return baseVal.toFixed(2);
      });
      let out = template;
      formattedVals.forEach((fv, i) => { out = out.replace(`{${i}}`, fv); });
      return { text: out, isPred, postUnitNote };
    },
  },
  ie: {
    units: [
      { unit: "kJ/mol", digits: 0 },
      { unit: "eV", digits: 2 },
    ],
    parse(raw) { 
        const isEV = String(raw).toLowerCase().includes("ev");
        return L3_UNIT_CONFIGS._parseStr(raw, isEV); 
    },
    convert(baseObj, unitIdx) {
      if (!baseObj) return { text: localizeNA(), isPred: false };
      const { template, vals, isPred, postUnitNote = "" } = baseObj;
      const formattedVals = vals.map(baseVal => {
        if (unitIdx === 1) return (baseVal / 96.485).toFixed(2);
        return Math.round(baseVal).toString();
      });
      let out = template;
      formattedVals.forEach((fv, i) => { out = out.replace(`{${i}}`, fv); });
      return { text: out, isPred, postUnitNote };
    },
  },
  ea: {
    units: [
      { unit: "kJ/mol", digits: 1 },
      { unit: "eV", digits: 2 },
    ],
    parse(raw) { return L3_UNIT_CONFIGS._parseStr(raw); },
    convert(baseObj, unitIdx) {
      if (!baseObj) return { text: localizeNA(), isPred: false };
      const { template, vals, isPred, postUnitNote = "" } = baseObj;
      const formattedVals = vals.map(baseVal => {
        if (unitIdx === 1) return (baseVal / 96.485).toFixed(2);
        return baseVal.toFixed(1);
      });
      let out = template;
      formattedVals.forEach((fv, i) => { out = out.replace(`{${i}}`, fv); });
      return { text: out, isPred, postUnitNote };
    },
  },
  melt: {
    units: [
      { unit: "°C", digits: 1 },
      { unit: "°F", digits: 1 },
      { unit: "K", digits: 1 },
    ],
    parse(raw) {
      if (!raw || raw === "N/A" || raw === "Unknown" || String(raw).includes("Sublimes") || String(raw).includes("Pressurized")) return null;
      const s = String(raw).replace(/−/g, "-").replace(/,/g, "");
      const isPred = /pred/i.test(s);
      const clean = s.replace(/\(pred\)/ig, "").trim();
      if (clean === "—" || clean === "") return null;

      // Normalize notations like "— (0.95 K at 2.5 MPa)" to plain text.
      let displayText = clean.replace(/^—\s*/, "").trim();
      if (displayText.startsWith("(") && displayText.endsWith(")")) {
        displayText = displayText.slice(1, -1).trim();
      }

      const hasSublimesNote = /\(sublimes\)/i.test(displayText);
      displayText = displayText.replace(/\(sublimes\)/ig, "").trim();

      const trailingNotes = [];
      let trailingMatch;
      while ((trailingMatch = displayText.match(/\s*(\([^)]*\))\s*$/))) {
        trailingNotes.unshift(trailingMatch[1]);
        displayText = displayText.slice(0, trailingMatch.index).trim();
      }

      const numRegex = /-?\d+\.?\d*/g;
      let match;
      let cursor = 0;
      let idx = 0;
      let template = "";
      const vals = [];
      const rawVals = [];
      const tempMask = [];

      while ((match = numRegex.exec(displayText)) !== null) {
        template += displayText.slice(cursor, match.index);

        const rawNum = match[0];
        const tail = displayText.slice(match.index + rawNum.length);
        const unitMatch = tail.match(/^\s*(°C|°F|K)\b/i);

        let baseC = parseFloat(rawNum);
        let isTempValue = false;
        let consumed = 0;

        if (unitMatch) {
          isTempValue = true;
          const unit = unitMatch[1].toUpperCase();
          if (unit === "K") baseC = baseC - 273.15;
          if (unit === "°F") baseC = (baseC - 32) * 5 / 9;
          consumed = unitMatch[0].length;
        }

        vals.push(baseC);
        rawVals.push(rawNum);
        tempMask.push(isTempValue);
        template += `{${idx}}`;

        cursor = match.index + rawNum.length + consumed;
        idx += 1;
      }

      if (idx === 0) return null;
      template += displayText.slice(cursor);
      const postUnitParts = [];
      if (hasSublimesNote) postUnitParts.push("(sublimes)");
      postUnitParts.push(...trailingNotes);
      return {
        template,
        vals,
        rawVals,
        tempMask,
        isPred,
        postUnitNote: postUnitParts.length ? ` ${postUnitParts.join(" ")}` : "",
      };
    },
    convert(baseObj, unitIdx) {
      if (!baseObj) return { text: localizeNA(), isPred: false };
      const { template, vals, rawVals, tempMask, isPred, postUnitNote = "" } = baseObj;
      const formattedVals = vals.map((baseVal, i) => {
        if (!tempMask?.[i]) return rawVals?.[i] ?? String(baseVal);
        if (unitIdx === 1) return (baseVal * 9 / 5 + 32).toFixed(1);
        if (unitIdx === 2) return (baseVal + 273.15).toFixed(1);
        return baseVal.toFixed(1);
      });
      let out = template;
      formattedVals.forEach((fv, i) => { out = out.replace(`{${i}}`, fv); });
      return { text: out, isPred, postUnitNote };
    },
  },
  boil: {
    get units() { return L3_UNIT_CONFIGS.melt.units; },
    parse(raw) { return L3_UNIT_CONFIGS.melt.parse(raw); },
    convert(baseObj, unitIdx) { return L3_UNIT_CONFIGS.melt.convert(baseObj, unitIdx); },
  },
};

let _globalExtremes = null;
function getGlobalPhysicalExtremes() {
  if (_globalExtremes) return _globalExtremes;
  const metrics = ['electronegativity', 'density', 'meltingPoint', 'boilingPoint', 'atomicRadius'];
  _globalExtremes = {};
  metrics.forEach(m => _globalExtremes[m] = { min: Infinity, max: -Infinity, minElements: new Set(), maxElements: new Set() });

  const eitRegistry = eitController.getRegistry();
  if (!eitRegistry.length) return _globalExtremes;

  const metricVals = {};
  metrics.forEach(m => metricVals[m] = []);

  eitRegistry.forEach(entry => {
    metrics.forEach(m => {
       const val = entry.metrics[m];
       if (Number.isFinite(val)) {
           metricVals[m].push({ num: entry.number, val });
       }
    });
  });

  metrics.forEach(m => {
     const arr = metricVals[m];
     if (arr.length === 0) return;
     let min = arr[0].val; let max = arr[0].val;
     arr.forEach(item => { if(item.val < min) min = item.val; if(item.val > max) max = item.val; });
     _globalExtremes[m].min = min;
     _globalExtremes[m].max = max;
     arr.forEach(item => {
        if(item.val === min) _globalExtremes[m].minElements.add(item.num);
        if(item.val === max) _globalExtremes[m].maxElements.add(item.num);
     });
  });

  return _globalExtremes;
}

function setupL3UnitConversion(blueCard, rawData, extData) {
  if (!blueCard) return;
  const items = blueCard.querySelectorAll(".l3-stat-item.l3-clickable[data-metric]");
  items.forEach((item) => {
    const metric = item.dataset.metric;
    const cfg = L3_UNIT_CONFIGS[metric];
    if (!cfg) return;
    const baseVal = cfg.parse(rawData[metric]);
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
    
    if (!baseVal) {
      newItem.style.cursor = "default";
      newItem.removeAttribute("title");
      // we do not remove l3-clickable so future elements can still be found
      return;
    }
    newItem._l3Base = baseVal;
    newItem._l3Metric = metric;
    newItem.style.cursor = "pointer";
    newItem.title = t("common.clickToChangeUnit");

    function triggerRender(el, unitIdx) {
      const c = L3_UNIT_CONFIGS[el._l3Metric];
      const val = el._l3Base;
      const res = c.convert(val, unitIdx);
      const textVal = (res && typeof res === 'object') ? res.text : res;
      const isPred = (res && typeof res === 'object' && res.isPred);
      const postUnitNote = (res && typeof res === 'object' && res.postUnitNote) ? res.postUnitNote : "";

      const valEl = el.querySelector(".l3-stat-value");
      const unitEl = el.querySelector(".l3-stat-unit");
      if (valEl) valEl.textContent = textVal;
      const suffix = isPred ? " (pred)" : "";
      let extSuffix = (extData && extData[el._l3Metric]) ? `<span class="l3-stat-ext">${extData[el._l3Metric]}</span>` : "";
      if (unitEl) unitEl.innerHTML = `${c.units[unitIdx].unit}${suffix}${postUnitNote} ${extSuffix}`;    }

    const currentIdx = l3UnitState[metric] || 0;
    if (baseVal && currentIdx >= 0) {
      triggerRender(newItem, currentIdx);
    } else {
        triggerRender(newItem, 0);
    }

    newItem.addEventListener("click", (e) => {
      e.stopPropagation();
      const m = newItem._l3Metric;
      const c = L3_UNIT_CONFIGS[m];
      if (!c) return;
      l3UnitState[m] = (l3UnitState[m] + 1) % c.units.length;
      saveUnits();
      triggerRender(newItem, l3UnitState[m]);
      newItem.style.transition = "transform 0.15s ease";
      newItem.style.transform = "scale(0.95)";
      setTimeout(() => { newItem.style.transform = "scale(1)"; }, 150);
    });

    // iPad Safari: make the whole stat tile reliably tappable
    newItem.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (window._uniplusIsDragging) return;
      e.preventDefault();
      e.stopPropagation();
      // Dedupe delayed click on iPad Safari
      newItem._lastTouchUpAt = performance.now();
      const m = newItem._l3Metric;
      const c = L3_UNIT_CONFIGS[m];
      if (!c) return;
      l3UnitState[m] = (l3UnitState[m] + 1) % c.units.length;
      saveUnits();
      triggerRender(newItem, l3UnitState[m]);
      newItem.style.transition = "transform 0.15s ease";
      newItem.style.transform = "scale(0.95)";
      setTimeout(() => { newItem.style.transform = "scale(1)"; }, 150);
    }, { passive: false });

    newItem.addEventListener("click", (e) => {
      if (newItem._lastTouchUpAt && (performance.now() - newItem._lastTouchUpAt) < 650) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }, { capture: true });
  });
}

// ===== Simplified View Population =====
function populateSimplifiedView(element) {
  const finallyElementData = finallyData[element.number] || {};
  const v2Data = elementsData_v2[element.number];
  const eduData = element.educational || {};
  const numberToSuperscript = (num) => {
    const map = {
      0: "⁰",
      1: "¹",
      2: "²",
      3: "³",
      4: "⁴",
      5: "⁵",
      6: "⁶",
      7: "⁷",
      8: "⁸",
      9: "⁹",
    };
    return num
      .toString()
      .split("")
      .map((d) => map[d] || d)
      .join("");
  };
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };
  const setStyle = (el, styles) => {
    if (el) Object.assign(el.style, styles);
  };
  const findContentDiv = (cell, colorFilter) => {
    const divs =
      cell?.querySelectorAll('div[style*="font-size: 0.95rem"]') || [];
    for (const div of divs) {
      const style = div.getAttribute("style") || "";
      if (
        !colorFilter ||
        (colorFilter === "stse" && style.includes("color: #064E3B")) ||
        (colorFilter === "hazards" && style.includes("color: #991B1B")) ||
        (colorFilter === "uses" &&
          !style.includes("color: #064E3B") &&
          !style.includes("color: #991B1B"))
      ) {
        return div;
      }
    }
    return divs[0] || null;
  };
  const formatTemp = (temp) => {
    if (!temp || typeof temp !== "string") return localizeNA();
    if (
      temp.includes("Pressurized") ||
      temp === "N/A" ||
      temp.includes("Unknown")
    )
      return localizeNA();
    return temp.replace(" °C", "").replace("°C", "").trim();
  };
  const formatDensity = (density) => {
    if (!density || density === "N/A" || density === "Unknown")
      return { value: localizeNA(), unit: "" };
    const parts = density.split(" ");
    return { value: parts[0], unit: parts.slice(1).join(" ") };
  };
  const formatElectronegativity = (en) => {
    if (en === null || en === undefined) return localizeNA();
    if (typeof en === "string") {
      if (en.includes("—") || en.trim() === "") return localizeNA();
      const num = en.match(/[\d.]+/);
      return num ? parseFloat(num[0]).toFixed(2) : localizeNA();
    }
    return en.toFixed(2);
  };
  const formatIonization = (ie) => {
    if (!ie) return localizeNA();
    if (typeof ie === "string") {
      const trimmed = ie.trim();
      if (
        trimmed === "" ||
        trimmed === "N/A" ||
        trimmed === "Unknown" ||
        trimmed === "—"
      ) {
        return localizeNA();
      }
      if (trimmed.includes("kJ/mol")) {
        return trimmed.replace(" kJ/mol", "").trim();
      }
      if (trimmed.includes("eV")) {
        const ev = parseFloat(trimmed);
        return !isNaN(ev) ? Math.round(ev * 96.485).toString() : localizeNA();
      }
      return trimmed;
    }
    if (typeof ie === "number") {
      return String(ie);
    }
    return ie;
  };
  const formatSTSE = (content) => {
    const sentences = content.split(/[;。]\s*/).filter((s) => s.trim());
    return sentences
      .map((s, i) => s.trim() + (i < sentences.length - 1 ? "<br>" : ""))
      .join("");
  };
  const formatElectronConfigurationHtml = (config) => {
    const safeConfig = config || "—";
    const supMap = {
      "¹": "<sup>1</sup>",
      "²": "<sup>2</sup>",
      "³": "<sup>3</sup>",
      "⁴": "<sup>4</sup>",
      "⁵": "<sup>5</sup>",
      "⁶": "<sup>6</sup>",
      "⁷": "<sup>7</sup>",
      "⁸": "<sup>8</sup>",
      "⁹": "<sup>9</sup>",
      "⁰": "<sup>0</sup>",
    };
    return Object.entries(supMap).reduce(
      (html, [u, h]) => html.replace(new RegExp(u, "g"), h),
      safeConfig,
    );
  };
  const greenCard = document.querySelector(
    ".green-rectangle .card-info-container",
  );
  if (greenCard) {
    let typeDisplay = element.category || "Unknown";
    let phaseDisplay = element.phase || "Unknown";

    if (window.uniplusVersion === 'new' && v2Data) {
      typeDisplay = v2Data.level1_basic.type || typeDisplay;
      phaseDisplay = v2Data.level1_basic.phaseAtSTP || phaseDisplay;
    }

    const localizeType = (rawType) => {
      if (!rawType) return t("elementL1.unknown");
      const s = String(rawType).trim();
      if (!s || s === "Unknown") return t("elementL1.unknown");
      // Normalize some legacy strings
      const norm = s
        .replace(/\s+/g, " ")
        .replace(/\bOther Nonmetal\b/i, "Other nonmetal")
        .replace(/\bNoble Gas\b/i, "Noble gas");
      const keyMap = {
        "Alkali Metal": "alkaliMetal",
        "Alkaline Earth Metal": "alkalineEarth",
        "Transition Metal": "transitionMetal",
        "Post-transition Metal": "postTransition",
        Metalloid: "metalloid",
        Halogen: "halogen",
        "Noble gas": "nobleGas",
        Lanthanide: "lanthanide",
        Actinide: "actinide",
        "Other nonmetal": "otherNonmetal",
        Metal: null,
        Nonmetal: null,
      };
      const k = keyMap[norm];
      if (k) return t(`tableLegend.${k}`);
      if (norm === "Metal" || norm === "Nonmetal" || norm === "Metalloid") {
        const vv = t(`eit.propertyVal.${norm}`);
        return vv && vv !== `eit.propertyVal.${norm}` ? vv : norm;
      }
      return norm;
    };

    setText("#l1-type-value", localizeType(typeDisplay));
    let displayRow = element.row;
    let displayCol = getDisplayGroupHKDSE(element);
    if (element.series === "lanthanide") {
      displayRow = 6;
    } else if (element.series === "actinide") {
      displayRow = 7;
    }

    setText("#l1-group-period-value", `${(displayCol ?? "-")} / ${displayRow || "-"}`);
    setText("#l1-phase-value", localizeSimpleStatusText(phaseDisplay, t("elementL1.unknown")));

    const ionsSection = greenCard.querySelector(".ions-section");
    if (ionsSection) {
      ionsSection
        .querySelectorAll(".ion-item")
        .forEach((item) => item.remove());
      let commonIonsText = finallyElementData.level1_basic?.commonIons || "";
      if (window.uniplusVersion === 'new' && v2Data) {
        commonIonsText = v2Data.level1_basic.commonIons || "";
      }
      const langCode = getLang();
      if (elementLocales[langCode] && elementLocales[langCode][element.number]?.ions) {
        commonIonsText = elementLocales[langCode][element.number].ions;
      }

      const normalizedCommonIonsText = String(commonIonsText || "").trim();
      const hasNoIons =
        !normalizedCommonIonsText ||
        /none|\/a|inert|unknown|does not form|no common ions/i.test(normalizedCommonIonsText);
      const createIonItem = (symbol, name, detailMarkup = "") => {
        if (detailMarkup) {
          return createExpandablePill({
            container: ionsSection,
            detailMarkup,
            summaryHtml: `
              <span class="ion-symbol">${unicodeToHtmlGlobal(symbol)}</span>
              <span class="ion-arrow">→</span>
              <span class="ion-name">${escapeHtml(name)}</span>
            `,
          });
        }
        const item = document.createElement("div");
        item.className = "ion-item";
        item.innerHTML = `<span class="ion-symbol">${unicodeToHtmlGlobal(symbol)}</span><span class="ion-arrow">→</span><span class="ion-name">${escapeHtml(name)}</span>`;
        return item;
      };
      if (hasNoIons) {
        const noIonsLabel = /unknown/i.test(normalizedCommonIonsText)
          ? t("elementL1.unknown")
          : t("elementL1.noCommonIons");
        const noIonsDetailMarkup = normalizedCommonIonsText
          ? buildTextDetailMarkup(noIonsLabel)
          : "";
        ionsSection.appendChild(
          createIonItem(element.symbol, noIonsLabel, noIonsDetailMarkup),
        );
      } else if (normalizedCommonIonsText) {
        const parseIon = (ionText) => {
          const symMatch = ionText.match(
            /([A-Za-z]+[₀₁₂₃₄₅₆₇₈₉]*[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/,
          );
          if (!symMatch) return { symbol: element.symbol, name: ionText };
          const symbol = symMatch[1];
          const afterSymbol = ionText.substring(ionText.indexOf(symbol) + symbol.length).trim();
          if (afterSymbol.startsWith('(')) {
            let depth = 0, end = -1;
            for (let i = 0; i < afterSymbol.length; i++) {
              if (afterSymbol[i] === '(') depth++;
              else if (afterSymbol[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
            }
            const name = end > 0 ? afterSymbol.substring(1, end) : afterSymbol.substring(1);
            return { symbol, name };
          }
          const lang = getLang();
          const baseName = localizeElementName(element);
          return { symbol, name: lang === "zh-Hant" || lang === "zh" ? `${baseName}離子` : `${baseName} ion` };
        };
        if (normalizedCommonIonsText.includes(",")) {
          splitEntriesOutsideParentheses(normalizedCommonIonsText)
            .map((s) => s.trim())
            .forEach((ionText) => {
              const { symbol, name } = parseIon(ionText);
              ionsSection.appendChild(
                createIonItem(symbol, name, buildCommonIonDetailMarkup(element, symbol)),
              );
            });
        } else {
          const { symbol, name } = parseIon(normalizedCommonIonsText);
          ionsSection.appendChild(
            createIonItem(symbol, name, buildCommonIonDetailMarkup(element, symbol)),
          );
        }
      }
    }
  }
  const yellowCard = document.querySelector(
    ".yellow-rectangle .card-info-container",
  );
  if (yellowCard) {
    let avgMass = finallyElementData.level2_atomic?.mass?.highSchool || "—";
    if (window.uniplusVersion === 'new' && v2Data && v2Data.level2_atomic.mass.standard) {
      avgMass = v2Data.level2_atomic.mass.standard;
    }
    const representativeMass = getRepresentativeMassNumber(element.number);
    const neutronCount = representativeMass !== null
      ? representativeMass - element.number
      : "—";
    let level2Config = finallyElementData.level3_properties?.electronic?.configuration || "—";
    if (window.uniplusVersion === 'new' && v2Data && v2Data.level3_properties?.electronic?.configuration) {
      level2Config = v2Data.level3_properties.electronic.configuration;
    }

    setText("#l2-avg-mass-value", formatAverageAtomicMass(avgMass, element.number, element.weight));
    setText("#l2-protons-value", element.number.toString());
    setText("#l2-neutrons-value", String(neutronCount));
    setText("#l2-electrons-value", element.number.toString());
    const level2ConfigNode = yellowCard.querySelector("#l2-configuration-value");
    if (level2ConfigNode) {
      const shells = getElectronArrangementByZ(element.number);
      level2ConfigNode.textContent = formatShellElectronsLabel(shells);
    }

    const isotopesSection = yellowCard.querySelector(".ions-section");
    if (isotopesSection) {
      isotopesSection
        .querySelectorAll(".ion-item")
        .forEach((item) => item.remove());
      let isotopesToDisplay =
        finallyElementData.level2_atomic?.naturalIsotopes?.length > 0
          ? finallyElementData.level2_atomic.naturalIsotopes
          : finallyElementData.level2_atomic?.naturallyOccurringRadioisotopes?.length > 0
            ? finallyElementData.level2_atomic.naturallyOccurringRadioisotopes
            : finallyElementData.level2_atomic?.representativeIsotopes?.length > 0
              ? finallyElementData.level2_atomic.representativeIsotopes
              : finallyElementData.level2_atomic?.longestLivedIsotopes?.length > 0
                ? finallyElementData.level2_atomic.longestLivedIsotopes
                : finallyElementData.level2_atomic?.mostStableIsotopes?.length > 0
                  ? finallyElementData.level2_atomic.mostStableIsotopes
                  : [];

      if (window.uniplusVersion === 'new' && v2Data) {
        isotopesToDisplay = v2Data.level2_atomic.naturalIsotopes || [];
      }
      isotopesToDisplay.forEach((iso) => {
        const parseMassNumber = () => {
          if (iso.name?.includes("-")) return iso.name.split("-")[1];
          if (iso.symbol) {
            const match = iso.symbol.match(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/);
            if (match) {
              const supToNum = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9" };
              return match[0].split("").map((c) => supToNum[c] || c).join("");
            }
          }
          return iso.name?.match(/\d+/)?.[0] || "";
        };
        const massNumber = parseMassNumber();
        if (!massNumber) return;
        const percent = (iso.percent || "").toLowerCase();
        const isStable = percent && !percent.includes("trace") && !percent.includes("radioactive");
        const neutronNumber = iso.neutron?.replace("n", "").replace("⁰", "0") || "";
        const isoItem = createExpandablePill({
          container: isotopesSection,
          detailMarkup: buildIsotopeDetailMarkup(
            element, iso,
            finallyElementData.isotopeNotes || "",
          ),
          summaryHtml: `
            <span class="ion-symbol ion-symbol-isotope"><span class="isotope-mass-number">${escapeHtml(massNumber)}</span><span class="isotope-element-symbol">${escapeHtml(element.symbol)}</span></span>
            <div class="ion-isotope-meta">
                              <span class="ion-isotope-neutron" style="line-height: 1; margin-bottom: 2px;">${neutronNumber} n⁰</span>
              <span class="ion-isotope-stability ${isStable ? "stable" : "radioactive"}" style="line-height: 1;">${isStable ? t("elementModal.stable") : t("elementModal.radioactive")}</span>
            </div>
          `,
        });
        isotopesSection.appendChild(isoItem);
      });
    }
  }
  const blueCard = document.querySelector(
    ".blue-rectangle .card-info-container",
  );
  if (blueCard) {
    const configHero = blueCard.querySelector(".config-hero");
    if (configHero) {
      const shells = getElectronArrangementByZ(element.number);
      configHero.textContent = formatShellElectronsLabel(shells);
    }
    const oxidationContainer = blueCard.querySelector(".oxidation-container");
    if (oxidationContainer) {
      oxidationContainer.innerHTML = "";
      let statesObj = finallyElementData.level3_properties?.electronic?.oxidationStates || { common: [], possible: [] };
      if (window.uniplusVersion === 'new' && v2Data) {
        const v2Ox = v2Data.level3_properties?.electronic?.oxidationStates;
        if (v2Ox && ((v2Ox.common && v2Ox.common.length > 0) || (v2Ox.possible && v2Ox.possible.length > 0))) {
          statesObj = v2Ox;
        }
      }
      // Support legacy flat array format
      if (Array.isArray(statesObj)) {
        statesObj = { common: statesObj.slice(0, 1), possible: statesObj.slice(1) };
      }
      const common = statesObj.common || [];
      const possible = statesObj.possible || [];
      const total = common.length + possible.length;
      if (total > 0) {
        common.forEach((state) => {
          const pill = document.createElement("div");
          pill.className = "ox-pill common";
          pill.textContent = state;
          oxidationContainer.appendChild(pill);
        });
        possible.forEach((state) => {
          const pill = document.createElement("div");
          pill.className = "ox-pill possible";
          pill.textContent = state;
          oxidationContainer.appendChild(pill);
        });
        const pills = oxidationContainer.querySelectorAll(".ox-pill");
        if (total > 8) {
          oxidationContainer.style.gap = "3px";
          pills.forEach((p) => {
            p.style.fontSize = p.classList.contains("common") ? "0.65rem" : "0.6rem";
            p.style.padding = "2px 5px";
          });
        } else if (total > 5) {
          oxidationContainer.style.gap = "4px";
          pills.forEach((p) => {
            p.style.fontSize = p.classList.contains("common") ? "0.75rem" : "0.68rem";
            p.style.padding = "3px 7px";
          });
        } else {
          oxidationContainer.style.gap = "6px";
          pills.forEach((p) => {
            p.style.fontSize = "";
            p.style.padding = "";
          });
        }
      }
    }
    let en = finallyElementData.level3_properties?.physical?.electronegativity ?? null;
    let den = finallyElementData.level3_properties?.physical?.density || "";
    let melt = finallyElementData.level3_properties?.physical?.meltingPoint || "";
    let boil = finallyElementData.level3_properties?.physical?.boilingPoint || "";
    let ar = finallyElementData.level3_properties?.physical?.atomicRadius || "";

    if (window.uniplusVersion === 'new' && v2Data) {
      en = v2Data.level3_properties.physical.electronegativity ?? en;
      den = v2Data.level3_properties.physical.density || den;
      melt = v2Data.level3_properties.physical.meltingPoint || melt;
      boil = v2Data.level3_properties.physical.boilingPoint || boil;
      ar = v2Data.level3_properties.physical.atomicRadius || ar;
    }

    const ext = getGlobalPhysicalExtremes();
    function getExt(metric) {
      return "";
    }

    const enText = formatElectronegativity(en);
    const enExt = getExt('electronegativity');
    const enTitleEl = blueCard.querySelector(".l3-stat-item:nth-child(1) .l3-stat-unit");
    setText(".blue-rectangle .l3-stat-item:nth-child(1) .l3-stat-value", enText);
    if (enTitleEl && enText !== "N/A" && enText !== localizeNA()) {
      enTitleEl.innerHTML = `${t("elementModal.pauling")} ${enExt ? `<span class="l3-stat-ext">${enExt}</span>` : ''}`;
    } else if (enTitleEl) {
      enTitleEl.innerHTML = t("elementModal.pauling");
    }

    const densityData = formatDensity(den);
    setText(".blue-rectangle .l3-stat-item:nth-child(2) .l3-stat-value", densityData.value);
    const densityUnit = blueCard.querySelector(".l3-stat-item:nth-child(2) .l3-stat-unit");
    if (densityUnit) densityUnit.textContent = densityData.unit;

    setText(".blue-rectangle .l3-stat-item:nth-child(3) .l3-stat-value", formatTemp(melt));
    setText(".blue-rectangle .l3-stat-item:nth-child(4) .l3-stat-value", formatTemp(boil));

    const arDisplay = ar && ar !== "N/A" ? ar.replace(" pm", "").trim() : localizeNA();
    setText(".blue-rectangle .l3-stat-item:nth-child(5) .l3-stat-value", arDisplay);
    const arUnitEl = blueCard.querySelector(".l3-stat-item:nth-child(5) .l3-stat-unit");
    const arExt = getExt('atomicRadius');
    if (arUnitEl && arDisplay !== "N/A" && arDisplay !== localizeNA()) {
        arUnitEl.innerHTML = `pm ${arExt ? `<span class="l3-stat-ext">${arExt}</span>` : ''}`;
    } else if (arUnitEl) {
        arUnitEl.innerHTML = "pm";
    }

    // ---- Clickable unit conversion on L3 stat items ----
    setupL3UnitConversion(blueCard, { melt, boil, density: den }, {
      density: getExt('density'),
      melt: getExt('meltingPoint'),
      boil: getExt('boilingPoint'),
    });
  }
  const redCard = document.querySelector(
    ".red-rectangle .card-info-container",
  );
  if (redCard) {
    setStyle(redCard, {
      width: "100%",
      maxWidth: "100%",
      overflowX: "hidden",
      boxSizing: "border-box",
    });
    const commonCellStyles = {
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
    };
    const commonContentStyles = {
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      wordWrap: "break-word",
      overflowWrap: "break-word",
      wordBreak: "break-word",
      overflow: "hidden",
    };
    redCard.querySelectorAll(".info-row").forEach((row) => {
      setStyle(row, {
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "max-content minmax(0, 1fr)",
        alignItems: "start",
        gap: "10px",
      });
      setStyle(row.querySelector(".info-label"), {
        flexShrink: "0",
        minWidth: "fit-content",
        whiteSpace: "nowrap",
      });
      setStyle(row.querySelector(".info-value"), {
        flex: "1 1 auto",
        minWidth: "0",
        maxWidth: "100%",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "normal",
        textAlign: "right",
        lineHeight: "1.35",
        overflow: "visible",
      });
    });
    let year = finallyElementData.level4_history_stse?.history?.discoveryYear || "—";
    if (window.uniplusVersion === 'new' && v2Data && v2Data.level4_history_stse.history.discoveryYear) {
      year = v2Data.level4_history_stse.history.discoveryYear;
    }

    setText("#el-modal-l4-year", year);
    
    let discoveredBy = finallyElementData.level4_history_stse?.history?.discoveredBy || "—";
    let namedBy = finallyElementData.level4_history_stse?.history?.namedBy || "—";

    if (window.uniplusVersion === 'new' && v2Data) {
      discoveredBy = v2Data.level4_history_stse.history.discoveredBy || "—";
      namedBy = v2Data.level4_history_stse.history.namedBy || "—";
    }

    const langCode = getLang();
    if (elementLocales[langCode] && elementLocales[langCode][element.number]?.history) {
      discoveredBy = elementLocales[langCode][element.number].history.discoveredBy || discoveredBy;
      namedBy = elementLocales[langCode][element.number].history.namedBy || namedBy;
    }

    discoveredBy = compactLocalizedHistoryText(discoveredBy);
    namedBy = compactLocalizedHistoryText(namedBy);

    setText("#el-modal-l4-discovered-by", discoveredBy);
    setText("#el-modal-l4-named-by", namedBy);

    const propGridSection = redCard.querySelector(".prop-grid-section");
    if (propGridSection) {
      setStyle(propGridSection, {
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: "0",
      });
      const stseCell = propGridSection.querySelector(".prop-cell:nth-child(1)");
      if (stseCell) {
        setStyle(stseCell, commonCellStyles);
        const stseContent = findContentDiv(stseCell, "stse");

        let stseVal = (finallyElementData.level4_history_stse?.stseContext || []).join("; ");
        if (window.uniplusVersion === 'new' && v2Data) {
          stseVal = v2Data.level4_history_stse.stseContext && v2Data.level4_history_stse.stseContext.length > 0
            ? v2Data.level4_history_stse.stseContext.join(" • ")
            : "";
        }

        const langCode = getLang();
        if (elementLocales[langCode] && elementLocales[langCode][element.number]?.stse) {
          stseVal = elementLocales[langCode][element.number].stse.join(" • ");
        }

        stseCell.style.display = "flex";
        if (stseContent) {
          setStyle(stseContent, commonContentStyles);
          if (stseVal) {
            stseContent.innerHTML = formatSTSE(stseVal);
          } else {
            stseContent.textContent = "—";
          }
        }
      }

      const usesCell = propGridSection.querySelector(".prop-cell:nth-child(2)");
      if (usesCell) {
        setStyle(usesCell, commonCellStyles);
        const usesContent = findContentDiv(usesCell, "uses");

        let usesVal = (finallyElementData.level4_history_stse?.commonUses || []).join(", ") || "—";
        if (window.uniplusVersion === 'new' && v2Data) {
          usesVal = v2Data.level4_history_stse.commonUses && v2Data.level4_history_stse.commonUses.length > 0
            ? v2Data.level4_history_stse.commonUses.join(", ")
            : "—";
        }

        const langCode = getLang();
        if (elementLocales[langCode] && elementLocales[langCode][element.number]?.uses) {
          usesVal = elementLocales[langCode][element.number].uses.join(", ");
        }

        if (usesContent) {
          setStyle(usesContent, commonContentStyles);
          usesContent.textContent = usesVal;
        }
      }

      const hazardsCell = propGridSection.querySelector(".prop-cell:nth-child(3)");
      if (hazardsCell) {
        setStyle(hazardsCell, commonCellStyles);
        const hazardsContent = findContentDiv(hazardsCell, "hazards");

        let hazardsVal = (finallyElementData.level4_history_stse?.hazards || []).join(", ") || "—";
        if (window.uniplusVersion === 'new' && v2Data) {
          hazardsVal = v2Data.level4_history_stse.hazards && v2Data.level4_history_stse.hazards.length > 0
            ? v2Data.level4_history_stse.hazards.join(", ")
            : "—";
        }

        const langCode = getLang();
        if (elementLocales[langCode] && elementLocales[langCode][element.number]?.hazards) {
          hazardsVal = elementLocales[langCode][element.number].hazards.join(", ");
        }

        if (hazardsContent) {
          setStyle(hazardsContent, commonContentStyles);
          hazardsContent.textContent = hazardsVal;
        }
      }
    }
  }
}

// ===== Periodic table focus (search / navigation) =====
export function scrollPeriodicTableToElement(element) {
  const n = element && typeof element.number === "number" ? element.number : null;
  if (!n) return;
  requestAnimationFrame(() => {
    const cell = document.querySelector(`#periodic-table [data-element-number="${n}"]`);
    cell?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
}

// ===== Show Modal (main element modal) =====
export function showModal(element) {
  // Blur the focused element cell so that subsequent space presses
  // don't re-trigger bindKeyboardActivation → showModal → 3D refresh
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  window.currentAtomElement = element;
  clearHeadlineResizeHandler();
  const finallyElementData = finallyData[element.number] || {};
  element.educational = element.educational || {};
  element.phase = element.phase || finallyElementData.level1_basic?.phaseAtSTP || "";
  element.electronConfig =
    finallyElementData.level3_properties?.electronic?.configuration || "";
  element.discovery =
    finallyElementData.level4_history_stse?.history?.discoveryYear || "";
  element.etymology =
    finallyElementData.level4_history_stse?.history?.namedBy || "";
  element.description = (finallyElementData.level4_history_stse?.stseContext || []).join("; ");
  
  const langCode = getLang();
  if (elementLocales[langCode]) {
    if (elementLocales[langCode][element.number]?.history) {
      element.etymology = elementLocales[langCode][element.number].history.namedBy || element.etymology;
    }
    if (elementLocales[langCode][element.number]?.stse) {
      element.description = elementLocales[langCode][element.number].stse.join("; ");
    }
  }
  initializeLevelSystem(element);
  if (window._uniplusAtomPauseBtn) {
    // Ensure the pause button is visible and label is up-to-date whenever the modal opens.
    const btn = window._uniplusAtomPauseBtn;
    btn.style.display = "block";
    const paused = !!window._uniplusAnimPaused;
    btn.textContent = paused ? "Resume" : "Stop";
    btn.classList.toggle("is-paused", paused);
    btn.setAttribute("aria-label", paused ? "Resume 3D animation" : "Pause 3D animation");
  }
  const isSimplifiedView = element.number <= 118;
  const elementContent = document.querySelector(".element-content");
  const simplifiedBox = document.querySelector(".simplified-element-box");
  const modalInfoPane = document.querySelector(".modal-info-pane");
  if (elementContent && simplifiedBox && modalInfoPane) {
    if (isSimplifiedView) {
      elementContent.style.display = "none";
      simplifiedBox.style.display = "grid";
      modalInfoPane.classList.add("no-scroll");
      populateSimplifiedView(element);
    } else {
      elementContent.style.display = "flex";
      simplifiedBox.style.display = "none";
      modalInfoPane.classList.remove("no-scroll");
    }
  }
  const eduData = element.educational;
  const headlineMass = document.getElementById("headline-mass");
  const headlineAtomic = document.getElementById("headline-atomic");
  const headlineSymbol = document.getElementById("headline-symbol");
  if (headlineMass) {
    const massNumber = getRepresentativeMassNumber(
      element.number,
      Math.round(element.weight),
    );
    headlineMass.textContent = massNumber;
  }
  if (headlineAtomic) {
    headlineAtomic.textContent = element.number;
  }
  if (headlineSymbol) {
    headlineSymbol.textContent = element.symbol;
  }
  const headlineName = document.getElementById("headline-name");
  if (headlineName) {
    const lang = getLang();
    let displayHeadline = localizeElementName(element);
    const annotation = getElementAnnotation(element.number, lang);
    if (annotation) {
      displayHeadline = `${displayHeadline} ${annotation}`;
    }
    headlineName.textContent = displayHeadline;
    const resizeFont = () => {
      const container = headlineName.parentElement;
      const leftGroup = container.querySelector(".headline-left-group");
      if (!container || !leftGroup) return;
      const containerWidth = container.offsetWidth;
      // Cap left group to 55% of container so name always gets space
      const leftGroupWidth = Math.min(leftGroup.offsetWidth, containerWidth * 0.55);
      let margins = 80;
      let fontSize = 2.5;
      headlineName.style.marginLeft = "40px";
      headlineName.style.marginRight = "40px";
      headlineName.style.fontSize = fontSize + "rem";
      let availableWidth = containerWidth - leftGroupWidth - margins;
      while (headlineName.scrollWidth > availableWidth && fontSize > 1.5) {
        fontSize -= 0.1;
        headlineName.style.fontSize = fontSize + "rem";
      }
      if (fontSize < 1.8) {
        margins = 40;
        headlineName.style.marginLeft = "20px";
        headlineName.style.marginRight = "20px";
        availableWidth = containerWidth - leftGroupWidth - margins;
        fontSize = Math.min(2.5, fontSize + 0.3);
        headlineName.style.fontSize = fontSize + "rem";
        while (headlineName.scrollWidth > availableWidth && fontSize > 1.5) {
          fontSize -= 0.1;
          headlineName.style.fontSize = fontSize + "rem";
        }
      }
    };
    setTimeout(resizeFont, 0);
    headlineResizeHandler = resizeFont;
    window.addEventListener("resize", headlineResizeHandler);
  }
  const elementText = document.querySelector(".element-text");
  const elementName = document.querySelector(".element-name");
  if (elementText && elementName) {
    const lang = getLang();
    let displayHeadline = localizeElementName(element);
    const annotation = getElementAnnotation(element.number, lang);
    if (annotation) {
      displayHeadline = `${displayHeadline} ${annotation}`;
    }
    const nameLength = displayHeadline.length;
    let lengthCategory;
    if (nameLength <= 4) {
      lengthCategory = "very-short";
    } else if (nameLength <= 6) {
      lengthCategory = "short";
    } else if (nameLength <= 10) {
      lengthCategory = "medium";
    } else {
      lengthCategory = "long";
    }
    elementText.setAttribute("data-name-length", lengthCategory);
  }
  if (modalCategory) {
    let cat = getElementCategory(element);
    if (eduData && eduData.amphoteric) {
      cat += " • Amphoteric";
    }
    modalCategory.textContent = cat;
  }
  if (modalWatermark) {
    modalWatermark.textContent = element.symbol;
  }
  if (modalPhase) modalPhase.textContent = localizeSimpleStatusText(element.phase, "—");
  if (modalCategoryDisplay) {
    modalCategoryDisplay.textContent = localizeSimpleStatusText(element.category, "—");
  }
  if (modalConfigLarge) {
    const shells = getElectronArrangementByZ(element.number);
    modalConfigLarge.textContent = formatShellElectronsLabel(shells);
  }
  if (modalDiscovery) modalDiscovery.textContent = element.discovery;
  if (modalEtymology) modalEtymology.textContent = element.etymology;
  if (modalDescription) modalDescription.textContent = element.description;
  // Optional helper to set up clickable unit toggling for arbitrary text elements
  function bindModalUnit(el, metricKey, rawVal, extLabel = "") {
    if (!el) return;
    const cfg = L3_UNIT_CONFIGS[metricKey];
    if (!cfg || !rawVal || rawVal === "—" || rawVal === "N/A") {
      el.textContent = rawVal;
      el.style.cursor = "default";
      el.removeAttribute("title");
      // Strip old listeners by cloning
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      // Update our reference
      if (metricKey === "density") modalDensity = newEl;
      if (metricKey === "melt") modalMelt = newEl;
      if (metricKey === "boil") modalBoil = newEl;
      return;
    }

    const baseObj = cfg.parse(rawVal);
    if (!baseObj) {
      el.textContent = rawVal;
      return;
    }

    // Determine current index from state
    let unitIdx = l3UnitState[metricKey] || 0;

    // Create new element to flush old listeners
    const newEl = el.cloneNode(true);
    newEl.style.cursor = "pointer";
    newEl.title = t("common.clickToChangeUnit");

    function render() {
      const res = cfg.convert(baseObj, unitIdx);
      const textVal = (res && typeof res === 'object') ? res.text : res;
      const isPred = (res && typeof res === 'object' && res.isPred);
      const postUnitNote = (res && typeof res === 'object' && res.postUnitNote) ? res.postUnitNote : "";
      const u = cfg.units[unitIdx].unit;
      const suffix = isPred ? " (pred)" : "";
      const extStr = extLabel ? ` <span class="l3-stat-ext">${extLabel}</span>` : "";
      newEl.innerHTML = `${textVal} ${u}${suffix}${postUnitNote}${extStr}`;
    }

    render();

    newEl.addEventListener("click", (e) => {
      e.stopPropagation();
      unitIdx = (unitIdx + 1) % cfg.units.length;
      l3UnitState[metricKey] = unitIdx;
      if (typeof saveUnits !== 'undefined') saveUnits();
      render();
    });

    el.parentNode.replaceChild(newEl, el);
    // Update references so future calls work
    if (metricKey === "density") modalDensity = newEl;
    if (metricKey === "melt") modalMelt = newEl;
    if (metricKey === "boil") modalBoil = newEl;
  }

  const ext = getGlobalPhysicalExtremes();
  function getExt(metric) {
    return "";
  }

  if (modalDensity) bindModalUnit(modalDensity, "density", finallyElementData.level3_properties?.physical?.density || "—", getExt('density'));
  if (modalMelt) bindModalUnit(modalMelt, "melt", finallyElementData.level3_properties?.physical?.meltingPoint || "—", getExt('meltingPoint'));
  if (modalBoil) bindModalUnit(modalBoil, "boil", finallyElementData.level3_properties?.physical?.boilingPoint || "—", getExt('boilingPoint'));

  if (modalNegativity) {
    let enVal = finallyElementData.level3_properties?.physical?.electronegativity ?? "—";
    const enExt = getExt('electronegativity');
    if (enVal !== "—" && enExt) {
      enVal += " " + enExt;
    }
    modalNegativity.textContent = enVal;
  }
  if (modalRadius) modalRadius.textContent = element.radius || "—";
  const grp = element.column;
  if (eduNames && modalCharge) {
    if (eduData && eduData.stockNames) {
      modalCharge.style.display = "none";
      eduNames.style.display = "block";
      eduNames.innerHTML = eduData.stockNames
        .map(
          (n) =>
            `<div class="stock-name-item"><span class="stock-ion">${element.symbol}<sup>${n.charge}</sup></span> <span class="stock-text">= ${n.name}</span></div>`,
        )
        .join("");
    } else {
      modalCharge.style.display = "block";
      eduNames.style.display = "none";
      let statesObj = finallyElementData.level3_properties?.electronic?.oxidationStates || { common: [], possible: [] };
      // Support legacy flat array format
      if (Array.isArray(statesObj)) {
        statesObj = { common: statesObj.slice(0, 1), possible: statesObj.slice(1) };
      }
      const common = statesObj.common || [];
      const possible = statesObj.possible || [];
      if (common.length > 0 || possible.length > 0) {
        let html = common.map(s => `<span class="charge-main">${s}</span>`).join("");
        html += possible.map(s => `<span class="charge-sub">${s}</span>`).join("");
        modalCharge.innerHTML = html;
      } else {
        modalCharge.innerHTML = `<span class="charge-main">—</span>`;
      }
    }
  }
  const atomicNum = element.number;
  if (modalP) modalP.textContent = atomicNum;
  if (modalE) modalE.textContent = atomicNum;
  if (modalN) {
    const massNumber = getRepresentativeMassNumber(atomicNum);
    modalN.textContent = massNumber !== null ? (massNumber - atomicNum) : "—";
  }

  // Correct display for Lanthanides and Actinides
  let displayPeriod = element.row;
  let displayGroup = getDisplayGroupHKDSE(element);
  if (element.series === "lanthanide") displayPeriod = 6;
  else if (element.series === "actinide") displayPeriod = 7;

  if (modalPeriod) modalPeriod.textContent = displayPeriod || "—";
  if (modalGroup) modalGroup.textContent = (displayGroup ?? "—");
  const amphotericCard = document.getElementById("amphoteric-card");
  if (amphotericCard) {
    if (eduData && eduData.amphoteric) {
      amphotericCard.style.display = "flex";
    } else {
      amphotericCard.style.display = "none";
    }
  }
  if (eduNames) {
    if (eduData && eduData.stockNames) {
      eduNames.style.display = "block";
      eduNames.innerHTML = eduData.stockNames
        .map(
          (n) =>
            `<div class="stock-name-item"><span class="stock-ion">${element.symbol}<sup>${n.charge}</sup></span> <span class="stock-text">= ${n.name}</span></div>`,
        )
        .join("");
    } else {
      eduNames.style.display = "none";
    }
  }
  if (eduIsotopes) {
    if (eduData && eduData.isotopesOverride) {
      eduIsotopes.style.display = "block";
      eduIsotopes.innerHTML = `
                  <div class="iso-title">Natural Isotopes</div>
                  <table class="iso-table">
                      ${eduData.isotopesOverride
          .map(
            (iso) => `
                          <tr>
                              <td class="iso-name">${iso.name}</td>
                              <td class="iso-detail"><span class="n-badge">${iso.neutron}n</span></td>
                              <td class="iso-percent">${iso.percent}</td>
                          </tr>
                      `,
          )
          .join("")}
                  </table>
                  <div class="iso-note">Average Mass: ${element.weight}</div>
              `;
    } else {
      eduIsotopes.style.display = "none";
    }
  }
  if (eduCardsContainer) {
    eduCardsContainer.style.display = "none";
    eduCardsContainer.innerHTML = "";
    eduCardsContainer.className = "edu-cards-grid";
    let advancedHtml = "";
    const hasAdvanced =
      eduData &&
      (eduData.equilibriums ||
        eduData.electrochemistry ||
        eduData.thermodynamics);
    if (hasAdvanced) {
      eduCardsContainer.className = "advanced-data-container";
      eduCardsContainer.style.display = "flex";
      eduCardsContainer.style.flexDirection = "column";
      eduCardsContainer.style.gap = "24px";
      if (eduData.equilibriums) {
        advancedHtml += `
                      <div class="data-section">
                          <div class="data-title">Solubility Equilibrium (25°C)</div>
                          <table class="data-table">
                              <thead><tr><th>Reaction</th><th>K<sub>sp</sub></th></tr></thead>
                              <tbody>
                                  ${eduData.equilibriums
            .map(
              (e) => `
                                      <tr>
                                          <td class="formula">${e.reaction}</td>
                                          <td class="value">${e.value}</td>
                                      </tr>
                                  `,
            )
            .join("")}
                              </tbody>
                          </table>
                      </div>
                  `;
      }
      if (eduData.electrochemistry) {
        advancedHtml += `
                      <div class="data-section">
                          <div class="data-title">Standard Reduction Potentials</div>
                          <table class="data-table">
                              <thead><tr><th style="text-align:left">Half-Reaction</th><th>Type</th><th>E° (V)</th></tr></thead>
                              <tbody>
                                  ${eduData.electrochemistry
            .map(
              (e) => `
                                      <tr>
                                          <td class="formula">${e.reaction}</td>
                                          <td class="meta">${e.type}</td>
                                          <td class="value ${e.potential.includes("+") ? "pos" : "neg"}">${e.potential}</td>
                                      </tr>
                                  `,
            )
            .join("")}
                              </tbody>
                          </table>
                      </div>
                  `;
      }
      if (eduData.thermodynamics) {
        advancedHtml += `
                      <div class="data-section">
                          <div class="data-title">Standard Enthalpy & Entropy</div>
                          <table class="data-table">
                              <thead><tr><th>Compound</th><th>ΔH<sub>f</sub>° (kJ/mol)</th><th>S° (J/mol·K)</th></tr></thead>
                              <tbody>
                                  ${eduData.thermodynamics
            .map(
              (e) => `
                                      <tr>
                                          <td class="formula">${e.compound}</td>
                                          <td class="value">${e.value}</td>
                                          <td class="value">${e.entropy || "-"}</td>
                                      </tr>
                                  `,
            )
            .join("")}
                              </tbody>
                          </table>
                      </div>
                  `;
      }
      if (eduData.stse) {
        advancedHtml += `
                      <div class="data-section stse-section">
                          <div class="data-title">${eduData.stse.title}</div>
                          <div class="stse-content">
                              ${eduData.stse.content}
                          </div>
                          <div class="stse-tags">
                              ${eduData.stse.tags.map((t) => `<span class="stse-tag">${t}</span>`).join("")}
                          </div>
                      </div>
                  `;
      }
      eduCardsContainer.innerHTML = advancedHtml;
    } else if (eduData && (eduData.solubility || eduData.safety)) {
      eduCardsContainer.style.display = "grid";
      let html = "";
      if (eduData.solubility) {
        const sol = eduData.solubility;
        html += `<div class="edu-card edu-solubility" style="grid-column: 1 / -1; width: 100%;">
                              <h4 class="edu-title">Reaction Prediction</h4>`;
        if (sol.insoluble) {
          html +=
            `<div class="sol-group"><span class="sol-label bad">Precipitates (Insoluble):</span>` +
            sol.insoluble
              .map(
                (i) => `<div class="sol-item">• ${i.ion} → ${i.result}</div>`,
              )
              .join("") +
            `</div>`;
        }
        if (sol.soluble) {
          html +=
            `<div class="sol-group"><span class="sol-label good">Soluble:</span>` +
            sol.soluble
              .map((i) => `<div class="sol-item">• ${i.ion}</div>`)
              .join("") +
            `</div>`;
        }
        html += `</div>`;
      }
      if (eduData.safety) {
        const safe = eduData.safety;
        html += `<div class="edu-card edu-safety" style="width: 100%;">
                              <h4 class="edu-title">Safety</h4>
                              <div class="safe-row"><strong>Toxicity:</strong> ${safe.toxicity}</div>
                              <div class="safe-row"><strong>Env:</strong> ${safe.env}</div>
                            </div>`;
      }
      eduCardsContainer.innerHTML = html;
    }
  }
  let compounds = "—";
  if (modalCompounds) modalCompounds.textContent = compounds;
  if (modalUses) {
    modalUses.textContent = (finallyElementData.level4_history_stse?.commonUses || []).join(", ") || "—";
  }
  if (modalHazards) {
    modalHazards.textContent = (finallyElementData.level4_history_stse?.hazards || []).join(", ") || "—";
  }
  const modalIsotopes = document.getElementById("modal-isotopes");
  if (modalIsotopes) {
    modalIsotopes.innerHTML = "";
    if (element.isotopes && element.isotopes.length > 0) {
      element.isotopes.forEach((iso) => {
        const row = document.createElement("div");
        row.classList.add("isotope-row");
        const info = document.createElement("div");
        info.classList.add("iso-info");
        const sym = document.createElement("span");
        sym.classList.add("iso-symbol");
        sym.textContent = iso.symbol;
        const isoName = document.createElement("span");
        isoName.classList.add("iso-name");
        isoName.textContent = iso.name || "";
        const abundance = document.createElement("span");
        abundance.classList.add("iso-abundance");
        abundance.textContent = iso.abundance || "";
        info.appendChild(sym);
        info.appendChild(isoName);
        info.appendChild(abundance);
        const tag = document.createElement("span");
        tag.classList.add("iso-tag");
        const isStable = /(stable|穩定|稳定)/i.test(String(iso.stability || ""));
        tag.classList.add(isStable ? "stable" : "radioactive");
        tag.textContent = localizeIsotopeStability(iso.stability) || t("elementModal.radioactive");
        row.appendChild(info);
        row.appendChild(tag);
        modalIsotopes.appendChild(row);
      });
    } else {
      modalIsotopes.innerHTML = `<div class="isotope-row no-data-message">${t("elementModal.noIsotopeData")}</div>`;
    }
  }
  let category = "Element";
  if (element.series) {
    category =
      element.series.charAt(0).toUpperCase() + element.series.slice(1);
  } else if (element.row === 7 && element.column === 18) {
    category = t("tableLegend.nobleGas");
  }
  if (element.isLanthanide) category = t("tableLegend.lanthanide");
  if (element.isActinide) category = t("tableLegend.actinide");
  if (modalCategory) {
    modalCategory.textContent = category;
  }
  const modalContent = modal.querySelector(".modal-content");
  if (modalContent) {
    modalContent.setAttribute(
      "data-element-name",
      `${element.symbol} - ${localizeElementName(element)}`,
    );
  }
  modal.classList.add("active");
  initElementTutorial();
  document.title = `Uni+ - ${localizeElementName(element)}`;
  document.body.classList.add("hide-nav");
  if (isSimplifiedView) {
    const slider = document.querySelector(".cards-slider");
    if (slider) {
      slider.style.visibility = "hidden";
    }
    requestAnimationFrame(() => {
      initSwipeSlider();
      if (slider) {
        slider.style.visibility = "visible";
      }
    });
  }
  if (element.number <= 118) {
    atomContainer.classList.add("visible");
    cleanup3D();
    clearCurrentAtom();
    renderScene();
    void atomContainer.offsetWidth;
    setTimeout(async () => {
      try {
        await ensureThreeLibLoaded();
        const contentHeight =
          modal.querySelector(".modal-content").clientHeight;
        if (atomContainer.clientHeight === 0) {
          const visualPane = atomContainer.parentElement;
          if (visualPane.clientHeight === 0) {
            visualPane.style.height = "100%";
            if (visualPane.clientHeight === 0) {
              atomContainer.style.height = contentHeight + "px";
            }
          } else {
            atomContainer.style.height = visualPane.clientHeight + "px";
          }
        }
        init3DScene(atomContainer);
        updateAtomStructure(element);
        onWindowResize();
        reset3DView();
        animateAtom();
        requestAnimationFrame(() => {
          atomContainer.style.opacity = "1";
        });
      } catch (e) {
        console.error("Three.js error:", e);
      }
    }, 100);
  } else {
    atomContainer.classList.remove("visible");
    cleanup3D();
  }
}

// ===== Level System =====
window.lockedLevelIndex = window.lockedLevelIndex ?? 0;
window.isLevelLocked = window.isLevelLocked ?? false;

function updateLevelButtons(activeLevel) {
  document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.level === activeLevel);
  });
}

function bindLevelSystemControls() {
  if (levelSystemBound) return;

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".level-btn[data-level]");
    if (!btn) return;
    if (modal && !modal.classList.contains("active")) return;
    if (!window.currentAtomElement) return;

    switchToLevel(btn.dataset.level, window.currentAtomElement);
  });

  levelSystemBound = true;
}

function initializeLevelSystem(element) {
  bindLevelSystemControls();
  const pendingLevelIndex = Number.isInteger(window._pendingLevelIndex)
    ? Math.max(0, window._pendingLevelIndex)
    : null;
  const startLevel = pendingLevelIndex !== null
    ? String(pendingLevelIndex + 1)
    : window.isLevelLocked
      ? String(window.lockedLevelIndex + 1)
      : "1";
  switchToLevel(startLevel, element);
}
function switchToLevel(level, element) {
  const levelContents = document.querySelectorAll(".level-content");
  levelContents.forEach((content) => {
    content.style.display = "none";
  });
  const targetContent = document.getElementById(`level-${level}`);
  if (targetContent) {
    targetContent.style.display = "block";
    populateLevelContent(level, element);
  }
  updateLevelButtons(level);
}
function populateLevelContent(level, element) {
  const eduData = element.educational;
  if (level === "1") {
    populateLevel1(element, eduData);
  } else if (level === "2") {
    populateLevel2(element, eduData);
  } else if (level === "3") {
    populateLevel3(element, eduData);
  }
}
function populateLevel1(element, eduData) {
  const finallyElementData = finallyData[element.number] || {};
  const level1Protons = document.getElementById("level1-protons");
  const level1Electrons = document.getElementById("level1-electrons");
  const level1Neutrons = document.getElementById("level1-neutrons");
  const level1Mass = document.getElementById("level1-mass");
  const level1Density = document.getElementById("level1-density");
  const level1Melt = document.getElementById("level1-melt");
  if (level1Protons) level1Protons.textContent = element.number;
  if (level1Electrons) level1Electrons.textContent = element.number;
  if (level1Neutrons) {
    const massNumber = getRepresentativeMassNumber(element.number);
    level1Neutrons.textContent = massNumber !== null ? (massNumber - element.number) : "—";
  }
  if (level1Mass) level1Mass.textContent = finallyElementData.level2_atomic?.mass?.highSchool || "—";
  if (level1Density) {
    level1Density.textContent = finallyElementData.level3_properties?.physical?.density || "—";
  }
  if (level1Melt) {
    level1Melt.textContent = finallyElementData.level3_properties?.physical?.meltingPoint || "—";
  }
  const modalCategoryDisplay = document.getElementById(
    "modal-category-display",
  );
  const modalPhase = document.getElementById("modal-phase");
  const modalGroup = document.getElementById("modal-group");
  const amphotericCard = document.getElementById("amphoteric-card");
  if (modalCategoryDisplay)
    modalCategoryDisplay.textContent = localizeSimpleStatusText(element.category, "—");
  if (modalPhase) modalPhase.textContent = localizeSimpleStatusText(element.phase, "—");
  if (modalGroup) modalGroup.textContent = element.column || "—";
  if (amphotericCard) {
    if (eduData && eduData.amphoteric) {
      amphotericCard.style.display = "flex";
    } else {
      amphotericCard.style.display = "none";
    }
  }
}
function populateLevel2(element, eduData) { }
function populateLevel3(element, eduData) { }



// ===== Swipe Slider =====
function initSwipeSlider() {
  const slider = document.querySelector(".cards-slider");
  const dots = [...document.querySelectorAll(".slider-dots .dot")];
  const slides = [...document.querySelectorAll(".card-slide")];
  const lockBtn = document.getElementById("level-lock-btn");

  if (!slider || slides.length < 2) return;

  const maxIndex = Math.min(slides.length - 1, 3);

  initCardSlider({
    abortKey: "_elementSliderAbort",
    slider,
    dots,
    slides,
    lockButton: lockBtn,
    maxIndex,
    enableWheel: true,
    getInitialIndex: () => {
      const hasPendingLevel = Number.isInteger(window._pendingLevelIndex);
      const initialIndex = hasPendingLevel
        ? Math.min(Math.max(window._pendingLevelIndex, 0), maxIndex)
        : window.isLevelLocked
          ? Math.min(window.lockedLevelIndex, maxIndex)
          : 0;
      window._pendingLevelIndex = null;
      return initialIndex;
    },
    getLockState: () => ({
      locked: window.isLevelLocked,
      index: Math.min(window.lockedLevelIndex, maxIndex),
    }),
    setLockState: (locked, index) => {
      window.isLevelLocked = locked;
      window.lockedLevelIndex = index;
    },
    isModalActive: () => !!modal?.classList.contains("active"),
    onIndexChange: (index) => {
      const element = window.currentAtomElement;
      if (element) switchToLevel(String(index + 1), element);
    },
  });


}

// ===== Initialize Modal UI (call on DOMContentLoaded) =====
export function initModalUI() {
  modal = document.getElementById("element-modal");
  modalClose = document.getElementById("modal-close");
  modalSymbol = document.getElementById("modal-symbol");
  modalName = document.getElementById("modal-name");
  modalNumber = document.getElementById("modal-number");
  modalCategory = document.getElementById("modal-category");
  modalPhase = document.getElementById("modal-phase");
  modalCategoryDisplay = document.getElementById("modal-category-display");
  modalConfigLarge = document.getElementById("modal-config-large");
  modalDiscovery = document.getElementById("modal-discovery");
  modalEtymology = document.getElementById("modal-etymology");
  modalDescription = document.getElementById("modal-description");
  modalDensity = document.getElementById("modal-density");
  modalMelt = document.getElementById("modal-melt");
  modalBoil = document.getElementById("modal-boil");
  modalNegativity = document.getElementById("modal-electronegativity");
  modalRadius = document.getElementById("modal-radius");
  modalWatermark = document.getElementById("modal-watermark");
  atomContainer = document.getElementById("atom-container");
  modalCharge = document.getElementById("modal-charge");
  modalP = document.getElementById("modal-p");
  modalE = document.getElementById("modal-e");
  modalN = document.getElementById("modal-n");
  modalPeriod = document.getElementById("modal-period");
  modalGroup = document.getElementById("modal-group");
  modalCompounds = document.getElementById("modal-compounds");
  modalUses = document.getElementById("modal-uses");
  modalHazards = document.getElementById("modal-hazards");
  eduNames = document.getElementById("edu-names");
  eduIsotopes = document.getElementById("edu-isotopes");
  eduCardsContainer = document.getElementById("edu-cards-container");
  // Always render pause button at document level so it never gets covered by the 3D canvas/layout.
  let atomPauseBtn = document.getElementById("atom-pause-btn");
  if (!atomPauseBtn) {
    atomPauseBtn = document.createElement("button");
    atomPauseBtn.id = "atom-pause-btn";
    atomPauseBtn.type = "button";
    atomPauseBtn.textContent = "Stop";
    document.body.appendChild(atomPauseBtn);
  }
  atomPauseBtn.className = "atom-pause-btn";
  atomPauseBtn.style.cssText = [
    "position:fixed",
    "left:12px",
    "bottom:12px",
    "z-index:2147483647",
    "display:none",
    "pointer-events:auto",
    "height:38px",
    "padding:0 14px",
    "border-radius:999px",
    "border:1px solid rgba(0,0,0,0.12)",
    "background:rgba(255,255,255,0.92)",
    "color:rgba(17,24,39,0.95)",
    "font-weight:800",
    "font-size:14px",
    "letter-spacing:-0.01em",
    "cursor:pointer",
    "backdrop-filter:blur(10px)",
    "-webkit-backdrop-filter:blur(10px)",
    "box-shadow:0 10px 24px rgba(0,0,0,0.12)",
    "user-select:none",
  ].join(";");
  window._uniplusAtomPauseBtn = atomPauseBtn;

  // Modal close handler
  function resetModalUI() {
    const slider = document.querySelector(".cards-slider");
    const dots = document.querySelectorAll(".slider-dots .dot");
    if (slider) {
      slider.scrollTo({ left: 0 });
      if (dots.length > 0) {
        dots.forEach((d) => d.classList.remove("active"));
        dots[0].classList.add("active");
      }
    }
    const levelBtns = document.querySelectorAll(".level-btn");
    const levelContents = document.querySelectorAll(".level-content");
    levelBtns.forEach((btn) => btn.classList.remove("active"));
    levelContents.forEach((content) => (content.style.display = "none"));
    const level1Btn = document.querySelector('.level-btn[data-level="1"]');
    const level1Content = document.getElementById("level-1");
    if (level1Btn) level1Btn.classList.add("active");
    if (level1Content) level1Content.style.display = "block";
  }

  function closeElementModal() {
    modal.classList.remove("active");
    document.body.classList.remove("hide-nav");
    document.title = "Uni+";
    clearHeadlineResizeHandler();
    cleanup3D(true);
    atomContainer.classList.remove("visible");
    if (window._uniplusAtomPauseBtn) window._uniplusAtomPauseBtn.style.display = "none";
    resetModalUI();
  }

  modalClose.addEventListener("click", () => {
    closeElementModal();
  });

  if (atomPauseBtn) {
    const renderPauseBtn = () => {
      const paused = !!window._uniplusAnimPaused;
      atomPauseBtn.textContent = paused ? "Resume" : "Stop";
      atomPauseBtn.classList.toggle("is-paused", paused);
      atomPauseBtn.setAttribute("aria-label", paused ? "Resume 3D animation" : "Pause 3D animation");
      atomPauseBtn.style.background = paused ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.92)";
      atomPauseBtn.style.color = paused ? "#fff" : "rgba(17,24,39,0.95)";
    };
    renderPauseBtn();

    atomPauseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window._uniplusAnimPaused = !window._uniplusAnimPaused;
      try {
        localStorage.setItem("uniplus_anim_paused", String(window._uniplusAnimPaused));
      } catch (err) {
        // ignore storage errors
      }
      renderPauseBtn();
    });

    // Keep label in sync if settings page toggles it
    window.addEventListener("storage", (e) => {
      if (e && e.key === "uniplus_anim_paused") {
        renderPauseBtn();
      }
    });
  }


  const tutorialBtn = document.getElementById("element-tutorial-btn");
  if (tutorialBtn) {
    tutorialBtn.addEventListener("click", () => {
      initElementTutorial(true); // pass true to force the tutorial
    });
  }

  modal.addEventListener("click", (e) => {
    if (window._uniplusIsDragging) return;
    if (e.target === modal) {
      closeElementModal();
    }
  });

  // Re-render modal labels when language changes
  onLangChange(() => {
    if (modal && modal.classList.contains("active") && window.currentAtomElement) {
      reRenderCurrentAtomModal();
    }
  });
}

// =============================================================================
// Flashcards embed: reuse modal UI inline (no overlay)
// =============================================================================

let _inlineMountState = null;

/**
 * Move the existing element modal panes into a target container and render the
 * same simplified info UI + 3D atom, without opening the modal overlay.
 *
 * This avoids duplicating element mapping logic: it reuses `populateSimplifiedView`
 * and the same Three.js initialization path as `showModal`.
 */
export async function mountElementDetailsInline(targetContainer, element) {
  if (!targetContainer || !element) return;

  // If something is already mounted, restore first (safe no-op otherwise).
  unmountElementDetailsInline();

  const elementModal = document.getElementById("element-modal");
  if (!elementModal) return;

  const simplifiedBox = elementModal.querySelector(".modal-info-pane .simplified-element-box");
  const visualPane = elementModal.querySelector(".modal-visual-pane");
  const atomHost = elementModal.querySelector("#atom-container");

  if (!simplifiedBox || !visualPane || !atomHost) return;

  _inlineMountState = {
    simplifiedBox,
    visualPane,
    simplifiedBoxParent: simplifiedBox.parentNode,
    simplifiedBoxNext: simplifiedBox.nextSibling,
    visualPaneParent: visualPane.parentNode,
    visualPaneNext: visualPane.nextSibling,
    wrapper: null,
  };

  const wrapper = document.createElement("div");
  wrapper.className = "cf-embedded-element-modal";
  _inlineMountState.wrapper = wrapper;
  targetContainer.innerHTML = "";
  targetContainer.appendChild(wrapper);

  // Ensure the simplified box is visible when embedded.
  simplifiedBox.style.display = "grid";

  // Move the existing nodes (no cloning → no duplicate IDs).
  wrapper.appendChild(simplifiedBox);
  wrapper.appendChild(visualPane);

  // Populate the same simplified UI (fills IDs inside the moved subtree).
  populateSimplifiedView(element);

  // Flashcards embed only shows the first simplified "page".
  // If the user previously swiped to another page in the modal, the slider can
  // remain scrolled — but embedded mode hides non-first slides, making the pane
  // look blank. Force the slider back to the first slide.
  try {
    const slider = simplifiedBox.querySelector(".cards-slider");
    if (slider) {
      // Use both direct assignment + scrollTo for maximum browser coverage.
      slider.scrollLeft = 0;
      slider.scrollTo?.({ left: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        slider.scrollLeft = 0;
        slider.scrollTo?.({ left: 0, behavior: "auto" });
      });
    }
  } catch {
    /* ignore */
  }

  // Init 3D atom inside embedded visual pane.
  try {
    await ensureThreeLibLoaded();
    cleanup3D(true);
    clearCurrentAtom();
    renderScene();

    // Give the embedded pane a deterministic size so init3DScene can measure.
    visualPane.style.height = "100%";
    atomHost.style.height = "100%";
    atomHost.style.opacity = "1";

    init3DScene(atomHost);
    updateAtomStructure(element);
    onWindowResize();
    reset3DView();
    animateAtom();
  } catch (e) {
    console.error("Inline element 3D init failed:", e);
  }
}

export function unmountElementDetailsInline() {
  const st = _inlineMountState;
  if (!st) return;

  try {
    cleanup3D(true);
  } catch {
    /* ignore */
  }

  // Remove wrapper first (it only contains moved nodes).
  if (st.wrapper && st.wrapper.parentNode) {
    st.wrapper.parentNode.removeChild(st.wrapper);
  }

  // Restore nodes to their original positions in the modal DOM.
  try {
    if (st.simplifiedBoxParent) {
      st.simplifiedBoxParent.insertBefore(st.simplifiedBox, st.simplifiedBoxNext);
    }
    if (st.visualPaneParent) {
      st.visualPaneParent.insertBefore(st.visualPane, st.visualPaneNext);
    }
  } catch (e) {
    console.error("Inline element UI restore failed:", e);
  } finally {
    _inlineMountState = null;
  }
}

// =============================================================================
// Flashcards embed: 3D atom only (custom info pane rendered elsewhere)
// =============================================================================

let _inlineAtomOnlyState = null;

export async function mountAtom3DInline(targetContainer, element) {
  if (!targetContainer || !element) return;

  unmountAtom3DInline();

  const elementModal = document.getElementById("element-modal");
  if (!elementModal) return;

  const visualPane = elementModal.querySelector(".modal-visual-pane");
  const atomHost = elementModal.querySelector("#atom-container");
  if (!visualPane || !atomHost) return;

  _inlineAtomOnlyState = {
    visualPane,
    visualPaneParent: visualPane.parentNode,
    visualPaneNext: visualPane.nextSibling,
    wrapper: null,
    pauseBtn: null,
  };

  const wrapper = document.createElement("div");
  wrapper.className = "cf-embedded-atom-only";
  _inlineAtomOnlyState.wrapper = wrapper;
  targetContainer.innerHTML = "";
  targetContainer.appendChild(wrapper);

  wrapper.appendChild(visualPane);

  // Inline pause button (flashcards/back-side embed).
  const pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.className = "cf-atom-pause-btn";
  const renderPauseBtn = () => {
    const paused = !!window._uniplusAnimPaused;
    pauseBtn.textContent = paused ? "Resume" : "Stop";
    pauseBtn.classList.toggle("is-paused", paused);
    pauseBtn.setAttribute("aria-label", paused ? "Resume 3D animation" : "Pause 3D animation");
  };
  renderPauseBtn();
  // Prevent flashcard flip on touch/pointer down and click bubbling.
  const stopEvt = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  pauseBtn.addEventListener("pointerdown", stopEvt, { passive: false });
  pauseBtn.addEventListener("touchstart", stopEvt, { passive: false });
  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window._uniplusAnimPaused = !window._uniplusAnimPaused;
    try {
      localStorage.setItem("uniplus_anim_paused", String(window._uniplusAnimPaused));
    } catch {
      /* ignore */
    }
    renderPauseBtn();
  });
  // Keep label in sync if settings page toggles it
  window.addEventListener("storage", (e) => {
    if (e && e.key === "uniplus_anim_paused") renderPauseBtn();
  });
  wrapper.appendChild(pauseBtn);
  _inlineAtomOnlyState.pauseBtn = pauseBtn;
  _inlineAtomOnlyState.renderPauseBtn = renderPauseBtn;

  try {
    await ensureThreeLibLoaded();
    cleanup3D(true);
    clearCurrentAtom();
    renderScene();

    visualPane.style.height = "100%";
    atomHost.style.height = "100%";
    atomHost.style.opacity = "1";

    init3DScene(atomHost);
    updateAtomStructure(element);
    onWindowResize();
    reset3DView();
    animateAtom();
  } catch (e) {
    console.error("Inline atom-only 3D init failed:", e);
  }
}

export function unmountAtom3DInline() {
  const st = _inlineAtomOnlyState;
  if (!st) return;

  try {
    cleanup3D(true);
  } catch {
    /* ignore */
  }

  if (st.wrapper && st.wrapper.parentNode) {
    st.wrapper.parentNode.removeChild(st.wrapper);
  }

  try {
    if (st.visualPaneParent) {
      st.visualPaneParent.insertBefore(st.visualPane, st.visualPaneNext);
    }
  } catch (e) {
    console.error("Inline atom-only UI restore failed:", e);
  } finally {
    _inlineAtomOnlyState = null;
  }
}

// Texture Toggle Logic
const textureModes = [
  { class: '', nameKey: 'texture.defaultSmooth' },
  { class: 'texture-cardboard', nameKey: 'texture.cardboard' },
  { class: 'texture-matte', nameKey: 'texture.matte' },
  { class: 'texture-metal', nameKey: 'texture.metal' }
];
let currentTextureIndex = 0;

function applyTexture() {
    const rectangles = document.querySelectorAll('.green-rectangle, .yellow-rectangle, .blue-rectangle, .red-rectangle');
    const currentMode = textureModes[currentTextureIndex];
    
    rectangles.forEach(rect => {
        textureModes.forEach(mode => {
            if (mode.class) rect.classList.remove(mode.class);
        });
        if (currentMode.class) {
            rect.classList.add(currentMode.class);
        }
    });

    const toggleBtns = document.querySelectorAll('.texture-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.textContent = '✨ ' + t(currentMode.nameKey);
    });
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.texture-toggle-btn')) {
        currentTextureIndex = (currentTextureIndex + 1) % textureModes.length;
        applyTexture();
    }
});
