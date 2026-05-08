import { finallyData } from "../../data/elementsData.js";
import { t, onLangChange } from "../langController.js";

function defaultNormalizeCategoryClass(catClass) {
  const aliasMap = {
    "non-metal": "other-nonmetal",
  };
  return aliasMap[catClass] || catClass;
}

export function createEITController(options = {}) {
  const {
    onLegendLockChange = () => {},
    onLegendReset = () => {},
    normalizeCategoryClass = defaultNormalizeCategoryClass,
  } = options;

const EIT_PROPERTY_CONFIG = [
  { key: "category", labelKey: "eit.property.category", label: "Category", type: "category", group: "classification" },
  { key: "metalType", labelKey: "eit.property.metalType", label: "Metal Type", type: "category", group: "classification" },
  { key: "state", labelKey: "eit.property.state", label: "State", type: "category", group: "classification" },
  {
    key: "meltingPoint",
    labelKey: "eit.property.meltingPoint",
    label: "Melting Point",
    type: "numeric",
    group: "property",
    unit: "°C",
    digits: 0,
    source: "meltingPoint",
    units: [
      { unit: "°C", digits: 0, convert: (v) => v },
      { unit: "°F", digits: 0, convert: (v) => v * 9 / 5 + 32 },
      { unit: "K", digits: 0, convert: (v) => v + 273.15 },
    ],
  },
  {
    key: "density",
    labelKey: "eit.property.density",
    label: "Density",
    type: "numeric",
    group: "property",
    unit: "g/cm³",
    digits: 2,
    source: "density",
    units: [
      { unit: "g/cm³", digits: 2, convert: (v) => v },
      { unit: "kg/m³", digits: 0, convert: (v) => v * 1000 },
      { unit: "lb/ft³", digits: 2, convert: (v) => v * 62.42796 },
    ],
  },
  {
    key: "boilingPoint",
    labelKey: "eit.property.boilingPoint",
    label: "Boiling Point",
    type: "numeric",
    group: "property",
    unit: "°C",
    digits: 0,
    source: "boilingPoint",
    units: [
      { unit: "°C", digits: 0, convert: (v) => v },
      { unit: "°F", digits: 0, convert: (v) => v * 9 / 5 + 32 },
      { unit: "K", digits: 0, convert: (v) => v + 273.15 },
    ],
  },
  {
    key: "electronegativity",
    labelKey: "eit.property.electronegativity",
    label: "Electronegativity",
    type: "numeric",
    group: "property",
    unit: "",
    digits: 2,
    source: "electronegativity",
  },
  {
    key: "atomicRadius",
    labelKey: "eit.property.atomicRadius",
    label: "Atomic Radius",
    type: "numeric",
    group: "property",
    unit: "pm",
    digits: 0,
    source: "atomicRadius",
    units: [
      { unit: "pm", digits: 0, convert: (v) => v },
      { unit: "Å", digits: 2, convert: (v) => v / 100 },
      { unit: "nm", digits: 3, convert: (v) => v / 1000 },
    ],
  },
  // Note: removed firstIonization / electronAffinity / specificHeat options per Uni+ product requirements.
];
const EIT_PROPERTY_MAP = new Map(EIT_PROPERTY_CONFIG.map((cfg) => [cfg.key, cfg]));

function getPropertyLabel(config) {
  return (config?.labelKey ? t(config.labelKey) : "") || config?.label || "";
}

let eitRegistry = [];
let eitUI = null;
let eitState = {
  property: "category",
  mode: "color",
  numericRanges: new Map(),
  unitIndex: new Map(),   // tracks which unit is active per property key
};
let first20OverlayActive = false;
let tableElectronStyleActive = false;
let s3ModeActive = false;

const TABLE_STYLE_STORAGE_KEY = "uniplus_table_style";
const TABLE_STYLE_ELECTRONS_VALUE = "electrons";

function applyTableStyleClass(tableContainer) {
  if (!tableContainer) return;
  tableContainer.classList.toggle("table-style-electrons", tableElectronStyleActive === true);
}

function captureS3OriginalLayout(tableContainer) {
  if (!tableContainer) return;
  if (tableContainer.dataset.s3OrigCaptured === "true") return;
  Array.from(tableContainer.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.s3OrigGridColumn === undefined) node.dataset.s3OrigGridColumn = node.style.gridColumn || "";
    if (node.dataset.s3OrigGridRow === undefined) node.dataset.s3OrigGridRow = node.style.gridRow || "";
    if (node.dataset.s3OrigDisplay === undefined) node.dataset.s3OrigDisplay = node.style.display || "";
  });
  tableContainer.dataset.s3OrigCaptured = "true";
}

function mapS3Column(originalCol) {
  // originalCol: 1..18 (periodic-table columns, excluding the period-label column)
  if (originalCol === 1 || originalCol === 2) return originalCol; // Groups I, II stay
  if (originalCol >= 13 && originalCol <= 18) return originalCol - 10; // Groups III..0 shift left
  return null; // Collapse d-block (3..12)
}

function applyS3Mode(tableContainer) {
  if (!tableContainer) return;
  const root = document.getElementById("eit-controller");
  const active = s3ModeActive === true;

  captureS3OriginalLayout(tableContainer);
  document.body?.classList.toggle("s3-mode", active);
  root?.classList.toggle("s3-mode", active);
  tableContainer.classList.toggle("s3-mode", active);

  Array.from(tableContainer.children).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const restore = () => {
      node.style.display = node.dataset.s3OrigDisplay || "";
      node.style.gridColumn = node.dataset.s3OrigGridColumn || "";
      node.style.gridRow = node.dataset.s3OrigGridRow || "";
      node.classList.remove("s3-in", "s3-hidden");
    };

    if (!active) {
      restore();
      return;
    }

    const cl = node.classList;
    const isElementCell = cl.contains("element") && !!node.dataset.elementNumber;
    const isGroupLabel = cl.contains("group-label");
    const isPeriodLabel = cl.contains("period-label");
    const isCorner = cl.contains("empty") && node.style.gridRow === "1" && node.style.gridColumn === "1";
    const isEitController = node.id === "eit-controller";

    if (isCorner) return;

    // Hide all non-table utility blocks (empty placeholders, legend, controller, etc.)
    if (!isElementCell && !isGroupLabel && !isPeriodLabel && !isEitController) {
      node.style.display = "none";
      node.classList.add("s3-hidden");
      return;
    }

    if (isEitController) {
      node.style.display = "";
      node.classList.remove("s3-hidden");
      return;
    }

    if (isElementCell) {
      const z = Number.parseInt(node.dataset.elementNumber || "", 10);
      const keep = Number.isFinite(z) && z >= 1 && z <= 20;
      if (!keep) {
        node.style.display = "none";
        node.classList.add("s3-hidden");
        return;
      }

      const origGridCol = Number.parseInt((node.dataset.s3OrigGridColumn || node.style.gridColumn || "").split("/")[0], 10);
      const origCol = Number.isFinite(origGridCol) ? (origGridCol - 1) : null;
      const mapped = origCol ? mapS3Column(origCol) : null;
      if (!mapped) {
        node.style.display = "none";
        node.classList.add("s3-hidden");
        return;
      }

      node.style.gridColumn = String(mapped + 1);
      node.style.display = "";
      node.classList.add("s3-in");
      return;
    }

    if (isGroupLabel) {
      const origGridCol = Number.parseInt((node.dataset.s3OrigGridColumn || node.style.gridColumn || "").split("/")[0], 10);
      const origCol = Number.isFinite(origGridCol) ? (origGridCol - 1) : null;
      const mapped = origCol ? mapS3Column(origCol) : null;
      if (!mapped) {
        node.style.display = "none";
        node.classList.add("s3-hidden");
        return;
      }
      node.style.gridColumn = String(mapped + 1);
      node.style.display = "";
      return;
    }

    if (isPeriodLabel) {
      const origGridRow = Number.parseInt((node.dataset.s3OrigGridRow || node.style.gridRow || "").split("/")[0], 10);
      const origRow = Number.isFinite(origGridRow) ? (origGridRow - 1) : null;
      const keep = origRow !== null && origRow >= 1 && origRow <= 4;
      node.style.display = keep ? "" : "none";
      if (!keep) node.classList.add("s3-hidden");
    }
  });
}

function applyFirst20Overlay(tableContainer) {
  if (!tableContainer) return;
  const root = document.getElementById("eit-controller");
  const active = first20OverlayActive === true;
  root?.classList.toggle("eit-first20-active", active);
  tableContainer.classList.toggle("eit-first20-active", active);

  // Range-block placeholders (La-Lu / Ac-Lr) are not real Z elements — always dim them when overlay is active.
  const rangeBlocks = tableContainer.querySelectorAll(".element.range-block");
  rangeBlocks.forEach((cell) => {
    cell.classList.toggle("eit-first20-in", false);
    cell.classList.toggle("eit-first20-out", active);
    if (!active) cell.classList.remove("eit-first20-out");
  });

  for (let i = 0; i < eitRegistry.length; i++) {
    const entry = eitRegistry[i];
    const cell = entry?.cell;
    if (!cell) continue;
    const isIn = typeof entry.number === "number" && entry.number >= 1 && entry.number <= 20;
    cell.classList.toggle("eit-first20-in", active && isIn);
    cell.classList.toggle("eit-first20-out", active && !isIn);
    if (!active) {
      cell.classList.remove("eit-first20-in", "eit-first20-out");
    }
  }
}

/** Get the active unit config for a property (with conversion function) */
function getActiveUnit(config) {
  if (!config?.units || !config.units.length) return null;
  const idx = eitState.unitIndex.get(config.key) || 0;
  return config.units[idx];
}

/** Cycle to the next unit for this property and return the new unit config */
function cycleUnit(config) {
  if (!config?.units || config.units.length <= 1) return null;
  const currentIdx = eitState.unitIndex.get(config.key) || 0;
  const nextIdx = (currentIdx + 1) % config.units.length;
  eitState.unitIndex.set(config.key, nextIdx);
  // Clear stored range so slider resets to new unit bounds
  eitState.numericRanges.delete(config.key);
  return config.units[nextIdx];
}

/** Get the effective unit string for display */
function getEffectiveUnit(config) {
  const alt = getActiveUnit(config);
  return alt ? alt.unit : (config?.unit || "");
}

/** Get the effective digits for display */
function getEffectiveDigits(config) {
  const alt = getActiveUnit(config);
  return alt ? alt.digits : (config?.digits ?? 2);
}

/** Convert a raw value (always stored in base unit like °C) to the active display unit */
function convertToActiveUnit(value, config) {
  if (!Number.isFinite(value)) return value;
  const alt = getActiveUnit(config);
  return alt ? alt.convert(value) : value;
}
let eitPanelOpen = false;
let lockLegendInteractions = false;
let _numericApplyToken = 0;

function normalizeCategoryLabel(category) {
  return normalizeCategoryClass(String(category || "Unknown")
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, ""));
}

function getElectronBlock(z, col) {
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return "f";
  if (z === 2) return "s";
  if (col >= 1 && col <= 2) return "s";
  if (col >= 3 && col <= 12) return "d";
  if (col >= 13 && col <= 18) return "p";
  return "—";
}

function getMetalType(catClass) {
  if (["alkali-metal", "alkaline-earth-metal", "transition-metal", "post-transition-metal", "lanthanide", "actinide"].includes(catClass)) return "Metal";
  if (catClass === "metalloid") return "Metalloid";
  if (["other-nonmetal", "non-metal", "halogen", "noble-gas"].includes(catClass)) return "Nonmetal";
  return "Unknown";
}

function parseNumericMetric(rawValue, metricKey) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? { value: rawValue, min: rawValue, max: rawValue } : null;
  }
  const text = String(rawValue).trim();
  if (!text) return null;
  if (text === "N/A" || text === "Unknown" || text === "—") return null;

  const normalized = text.replace(/−/g, "-").replace(/,/g, "");
  const matches = [...normalized.matchAll(/-?\d+(?:\.\d+)?/g)];
  if (matches.length === 0) return null;

  let min = Number.parseFloat(matches[0][0]);
  let max = min;
  if (matches.length >= 2) {
    max = Number.parseFloat(matches[1][0]);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  min = Math.min(min, max);
  max = Math.max(min, max);

  if (metricKey === "firstIonization" && /ev/i.test(normalized)) {
    min *= 96.485;
    max *= 96.485;
  }
  return { value: (min + max) / 2, min, max };
}

function getMetricValue(elementNumber, metricKey) {
  const physical = finallyData[elementNumber]?.level3_properties?.physical || {};
  return parseNumericMetric(physical[metricKey], metricKey);
}

function registerEITElementCell(cell, element) {
  if (!cell || !element || typeof element.number !== "number") return;
  const metrics = {};
  const ranges = {};
  const catClass = normalizeCategoryLabel(element.category);
  const block = getElectronBlock(element.number, element.column);
  const metalType = getMetalType(catClass);
  const state = finallyData[element.number]?.level1_basic?.phaseAtSTP || element.phase || "Unknown";

  EIT_PROPERTY_CONFIG.forEach((config) => {
    if (config.type !== "numeric") return;
    const res = getMetricValue(element.number, config.source);
    if (res) {
      metrics[config.key] = res.value;
      ranges[config.key] = res;
    } else {
      metrics[config.key] = null;
    }
  });
  eitRegistry.push({
    cell,
    number: element.number,
    categoryLabel: element.category || "Unknown",
    categoryClass: catClass,
    block,
    metalType,
    state,
    metrics,
    ranges,
  });
}

function resetEITState() {
  eitState = {
    property: "category",
    mode: "color",
    numericRanges: new Map(),
    unitIndex: new Map(),
  };
  eitPanelOpen = false;
}

function resetEITRegistry() {
  eitRegistry = [];
}

function formatEITValue(value, config, withUnit = false) {
  if (!Number.isFinite(value)) return "N/A";
  const displayValue = convertToActiveUnit(value, config);
  const digits = getEffectiveDigits(config);
  const valueText = displayValue.toFixed(digits);
  if (!withUnit) return valueText;
  const unit = getEffectiveUnit(config);
  return unit ? `${valueText} ${unit}` : valueText;
}

function getColorForRatio(ratio) {
  const bounded = Math.max(0, Math.min(1, ratio));
  const hue = 210 - bounded * 200;
  const saturation = 82;
  const lightness = 78 - bounded * 22;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getNumericRatio(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  if (Math.abs(max - min) < 1e-9) return 0.5;
  return (value - min) / (max - min);
}

function clearEITCellStyles() {
  eitRegistry.forEach(({ cell }) => {
    cell.classList.remove(
      "eit-colored",
      "eit-dimmed",
      "eit-focus",
      "eit-no-data",
      "eit-out-range",
    );
    cell.style.removeProperty("--eit-cell-color");
  });
}

function updateEITLegend({
  visible,
  title = "",
  note = "",
  min = null,
  max = null,
  mid = null,
}) {
  if (!eitUI) return;
  // Legend elements may not exist in inline layout
  if (!eitUI.legend) return;
  eitUI.legend.hidden = !visible;
  if (!visible) return;

  if (eitUI.legendTitle) eitUI.legendTitle.textContent = title;
  if (eitUI.legendNote) eitUI.legendNote.textContent = note;
  if (eitUI.legendMin) eitUI.legendMin.textContent = min ?? "N/A";
  if (eitUI.legendMid) eitUI.legendMid.textContent = mid ?? "N/A";
  if (eitUI.legendMax) eitUI.legendMax.textContent = max ?? "N/A";
  if (eitUI.legendBar) {
    eitUI.legendBar.style.background =
      `linear-gradient(90deg, ${getColorForRatio(0)} 0%, ${getColorForRatio(0.5)} 50%, ${getColorForRatio(1)} 100%)`;
  }
}

function getStoredNumericRange(propertyKey, minBound, maxBound) {
  const stored = eitState.numericRanges.get(propertyKey);
  if (!stored) return { min: minBound, max: maxBound };
  const min = Math.max(minBound, Math.min(stored.min, maxBound));
  const max = Math.max(minBound, Math.min(stored.max, maxBound));
  if (min > max) return { min: minBound, max: maxBound };
  return { min, max };
}

function setPropertyNote(message) {
  if (!eitUI?.propertyNote) return;
  eitUI.propertyNote.textContent = message || "";
}

function syncSliderVisuals(bounds, selected) {
  if (!eitUI || !bounds || !selected) return;
  const range = Math.max(bounds.max - bounds.min, 1e-9);
  const minPct = ((selected.min - bounds.min) / range) * 100;
  const maxPct = ((selected.max - bounds.min) / range) * 100;
  eitUI.sliderFill.style.left = `${Math.max(0, Math.min(100, minPct))}%`;
  eitUI.sliderFill.style.width =
    `${Math.max(0, Math.min(100, maxPct) - Math.max(0, Math.min(100, minPct)))}%`;

  // Fix overlapping thumbs: bring the correct thumb to the front
  if (selected.min === selected.max) {
    if (minPct > 50) {
      eitUI.rangeMinInput.style.zIndex = "10";
      eitUI.rangeMaxInput.style.zIndex = "5";
    } else {
      eitUI.rangeMinInput.style.zIndex = "5";
      eitUI.rangeMaxInput.style.zIndex = "10";
    }
  } else {
    eitUI.rangeMinInput.style.zIndex = "5";
    eitUI.rangeMaxInput.style.zIndex = "5";
  }
}

function syncNumericSlider(config, bounds, selected) {
  if (!eitUI) return;
  if (!bounds || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
    eitUI.sliderSection.hidden = true;
    return;
  }

  eitUI.sliderSection.hidden = false;
  eitUI.sliderBounds = bounds;
  const rangeSpan = bounds.max - bounds.min;
  if (Math.abs(rangeSpan) < 1e-9) {
    eitUI.selectedMin.textContent = formatEITValue(bounds.min, config, true);
    eitUI.selectedMax.textContent = formatEITValue(bounds.max, config, true);
    eitUI.rangeMinInput.disabled = true;
    eitUI.rangeMaxInput.disabled = true;
    eitUI.sliderFill.style.left = "0%";
    eitUI.sliderFill.style.width = "100%";
    return;
  }
  eitUI.rangeMinInput.disabled = false;
  eitUI.rangeMaxInput.disabled = false;

  let step = config.digits === 0 ? 1 : 1 / Math.pow(10, Math.min(config.digits || 2, 3));
  if (rangeSpan > 0 && rangeSpan < step) {
    step = Math.max(rangeSpan / 200, 1e-4);
  }

  const minInput = eitUI.rangeMinInput;
  const maxInput = eitUI.rangeMaxInput;
  minInput.min = String(bounds.min);
  minInput.max = String(bounds.max);
  minInput.step = String(step);
  maxInput.min = String(bounds.min);
  maxInput.max = String(bounds.max);
  maxInput.step = String(step);
  minInput.value = String(selected.min);
  maxInput.value = String(selected.max);

  eitUI.selectedMin.textContent = formatEITValue(selected.min, config, true);
  eitUI.selectedMax.textContent = formatEITValue(selected.max, config, true);
  syncSliderVisuals(bounds, selected);
}

function setEITPanelOpen(open) {
  if (!eitUI) return;
  eitPanelOpen = Boolean(open);
  eitUI.propertyTrigger.setAttribute("aria-expanded", eitPanelOpen ? "true" : "false");
  
  const tableContainer = document.querySelector("#periodic-table");

  if (eitPanelOpen) {
    eitUI.propertyPanel.classList.add("eit-panel-visible");
    if (tableContainer) tableContainer.classList.add("eit-menu-open");
  } else {
    eitUI.propertyPanel.classList.remove("eit-panel-visible");
    if (tableContainer) tableContainer.classList.remove("eit-menu-open");
  }
}

function syncEITControls(config) {
  if (!eitUI) return;
  // Update trigger label with current unit
  if (eitUI.currentProperty && config) {
    const unit = getEffectiveUnit(config);
    const label = getPropertyLabel(config);
    eitUI.currentProperty.textContent = unit
      ? `${label} ${unit}`
      : label;
  }
  // Sync chips — update unit display on each chip
  if (eitUI.chips) {
    eitUI.chips.forEach((chip) => {
      const isActive = chip.dataset.property === eitState.property;
      if (chip.classList.contains("active") !== isActive) {
        chip.classList.toggle("active", isActive);
      }
      
      const chipConfig = EIT_PROPERTY_MAP.get(chip.dataset.property);
      if (!chipConfig) return;
      const chipLabel = getPropertyLabel(chipConfig);
      
      if (chipConfig?.units && chipConfig.units.length > 1) {
        const currentUnit = getEffectiveUnit(chipConfig);
        const newHTML = `${chipLabel}<span class="eit-chip-unit">${currentUnit}</span>`;
        if (chip.innerHTML !== newHTML) {
          chip.innerHTML = newHTML;
          chip.setAttribute("title", t("eit.clickToChangeUnit"));
        }
      } else {
        if (chip.textContent !== chipLabel) {
          chip.textContent = chipLabel;
          chip.removeAttribute("title");
        }
      }
    });
  }
  // Sync mode buttons
  eitUI.modeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === eitState.mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  // Sync mode slider position
  syncModeSlider();
}

function syncModeSlider() {
  if (!eitUI || !eitUI.modeSlider) return;
  const activeBtn = eitUI.modeButtons.find((btn) => btn.classList.contains("active"));
  if (!activeBtn) return;
  
  // Skip expensive layout ops if mode group is completely hidden
  if (eitUI.modeGroup.hidden || eitUI.modeGroup.style.display === "none") return;
  
  // Use rAF to ensure we're measuring after a layout pass
  requestAnimationFrame(() => {
    if (!eitUI || !activeBtn) return;
    const offsetX = activeBtn.offsetLeft; // No longer needs -3 padding offset with left: 0 approach
    eitUI.modeSlider.style.width = `${activeBtn.offsetWidth}px`;
    eitUI.modeSlider.style.transform = `translateX(${offsetX}px)`;
  });
}

function applyCategoryEIT(config) {
  if (!eitUI) return;
  eitUI.sliderSection.hidden = true;
  eitUI.modeGroup.hidden = true; // hide coloring mode switch
  
  const legendContainer = document.getElementById("table-legend");

  if (config.key === "category") {
    clearEITCellStyles();
    updateEITLegend({ visible: false });
    setPropertyNote(t("eit.categoryDiscrete"));
    
    // Restore original legend items
    if (legendContainer) {
      Array.from(legendContainer.children).forEach(child => {
        if (child.id === "eit-custom-legend") child.style.display = "none";
        else child.style.display = "";
      });
      legendContainer.style.display = ""; // Ensure legend container stays visible
    }
    return;
  }

  const categoryConfigs = {
    block: {
      colors: { "s": "#ef4444", "p": "#3b82f6", "d": "#eab308", "f": "#22c55e", "—": "#e2e8f0" }
    },
    metalType: {
      colors: { "Metal": "#94a3b8", "Metalloid": "#fcd34d", "Nonmetal": "#86efac", "Unknown": "#e2e8f0" }
    },
    state: {
      colors: { "Solid": "#cbd5e1", "Liquid": "#93c5fd", "Gas": "#fca5a5", "Unknown": "#f1f5f9" },
      normalize: (v) => v === "Gas" ? "Gas" : (v === "Liquid" ? "Liquid" : (v === "Solid" ? "Solid" : "Unknown"))
    }
  };

  const scheme = categoryConfigs[config.key];
  if (!scheme) return;

  eitRegistry.forEach(({ cell, block, metalType, state }) => {
    let val = "Unknown";
    if (config.key === "block") val = block;
    if (config.key === "metalType") val = metalType;
    if (config.key === "state") val = state;

    if (scheme.normalize) val = scheme.normalize(val);

    const color = scheme.colors[val] || scheme.colors["Unknown"];
    cell.style.setProperty("--eit-cell-color", color);
    cell.classList.add("eit-colored");
    cell.classList.remove("eit-dimmed", "eit-no-data", "eit-out-range", "eit-focus");
  });

  // Generate dynamic custom legend instead of hiding it
  if (legendContainer) {
    legendContainer.style.display = "";
    Array.from(legendContainer.children).forEach(child => {
      if (child.id !== "eit-custom-legend") child.style.display = "none";
    });

    let customLegend = document.getElementById("eit-custom-legend");
    if (!customLegend) {
      customLegend = document.createElement("div");
      customLegend.id = "eit-custom-legend";
      customLegend.style.display = "flex";
      customLegend.style.justifyContent = "center";
      customLegend.style.alignItems = "center";
      customLegend.style.gap = "8px";
      customLegend.style.gridColumn = "1 / -1";
      customLegend.style.flexWrap = "wrap";
      legendContainer.appendChild(customLegend);
    }
    customLegend.style.display = "flex";
    customLegend.innerHTML = "";

    let activeCustomVal = null;

    Object.entries(scheme.colors).forEach(([val, color]) => {
      if (val === "Unknown" || val === "—") return;
      const chip = document.createElement("div");
      chip.className = "legend-item";
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      chip.setAttribute("aria-pressed", "false");
      // Translate values if possible, otherwise use source string
      const localizedLabel = t(`eit.propertyVal.${val.replace(/\s+/g, '')}`) || val;
      
      chip.innerHTML = `
        <div class="legend-swatch" style="background-color: ${color}"></div>
        <span class="legend-label" style="pointer-events: none">
          <span class="legend-label-text">${localizedLabel}</span>
        </span>
      `;
      
      const applyHighlight = (targetVal) => {
        document.getElementById("periodic-table").classList.add("highlighting");
        eitRegistry.forEach(entry => {
          let eVal = "Unknown";
          if (config.key === "block") eVal = entry.block;
          if (config.key === "metalType") eVal = entry.metalType;
          if (config.key === "state") eVal = entry.state;
          if (scheme.normalize) eVal = scheme.normalize(eVal);
          
          if (eVal === targetVal) {
            entry.cell.classList.add("highlighted");
          } else {
            entry.cell.classList.remove("highlighted");
          }
        });
      };

      const clearHighlight = () => {
        document.getElementById("periodic-table").classList.remove("highlighting");
        eitRegistry.forEach(entry => entry.cell.classList.remove("highlighted"));
      };

      chip.addEventListener("mouseenter", () => {
        if (activeCustomVal) return;
        applyHighlight(val);
      });
      chip.addEventListener("mouseleave", () => {
        if (activeCustomVal) return;
        clearHighlight();
      });
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        if (activeCustomVal === val) {
          activeCustomVal = null;
          chip.classList.remove("active");
          chip.setAttribute("aria-pressed", "false");
          clearHighlight();
        } else {
          activeCustomVal = val;
          Array.from(customLegend.children).forEach(c => {
            c.classList.remove("active");
            c.setAttribute("aria-pressed", "false");
          });
          chip.classList.add("active");
          chip.setAttribute("aria-pressed", "true");
          applyHighlight(val);
        }
      });
      // Allow keyboard activation
      chip.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chip.click();
        }
      });

      customLegend.appendChild(chip);
    });
  }

  updateEITLegend({ visible: false }); // hide numeric gradient legend
  setPropertyNote(t("eit.categoryDiscrete"));
}

function applyNumericEIT(config) {
  if (!eitUI) return;
  eitUI.modeGroup.hidden = false;

  const legendContainer = document.getElementById("table-legend");
  if (legendContainer) {
    Array.from(legendContainer.children).forEach(child => {
      if (child.id === "eit-custom-legend") child.style.display = "none";
      else child.style.display = "";
    });
  }

  const coarsePointer = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(pointer: coarse)").matches;

  // iPad/mobile fast path: avoid allocations and O(n log n) sorting.
  let min = Infinity;
  let max = -Infinity;
  let numericCount = 0;
  if (coarsePointer) {
    for (let i = 0, len = eitRegistry.length; i < len; i++) {
      const v = eitRegistry[i]?.metrics?.[config.key];
      if (!Number.isFinite(v)) continue;
      numericCount++;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const rows = coarsePointer ? null : eitRegistry.map((entry) => ({
    entry,
    value: entry.metrics[config.key],
  }));
  const numericValues = coarsePointer
    ? null
    : rows
      .map((row) => row.value)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

  const hasAnyNumeric = coarsePointer ? (numericCount > 0) : (numericValues.length > 0);
  if (!hasAnyNumeric) {
    // Mark all cells as no-data quickly
    for (let i = 0, len = eitRegistry.length; i < len; i++) {
      const cell = eitRegistry[i]?.cell;
      if (!cell) continue;
      cell.classList.add("eit-no-data", "eit-dimmed");
      cell.classList.remove("eit-colored", "eit-focus", "eit-out-range");
    }
    eitUI.sliderSection.hidden = true;
    setPropertyNote(t("eit.noUsableData"));
    updateEITLegend({
      visible: true,
      title: `${getPropertyLabel(config)} ${t("eit.rangeSuffix")}`,
      note: t("eit.noUsableDataShort"),
      min: "N/A",
      mid: "N/A",
      max: "N/A",
    });
    return;
  }

  if (!coarsePointer) {
    min = numericValues[0];
    max = numericValues[numericValues.length - 1];
    numericCount = numericValues.length;
  }
  const selected = getStoredNumericRange(config.key, min, max);
  eitState.numericRanges.set(config.key, selected);
  syncNumericSlider(config, { min, max }, selected);
  setPropertyNote(
    `${t("eit.selectedWindowPrefix")} ${formatEITValue(selected.min, config, true)} → ${formatEITValue(selected.max, config, true)}`,
  );
  const isFilter = eitState.mode === "filter";

  // iPad/mobile: batch DOM writes to avoid freezing the UI.
  const token = ++_numericApplyToken;
  const legendTitle = getPropertyLabel(config);
  updateEITLegend({
    visible: true,
    title: legendTitle,
    note: coarsePointer ? t("eit.loading") : `${numericCount} ${t("eit.inSelectedRange")}`,
    min: formatEITValue(selected.min, config, true),
    mid: t("eit.selected"),
    max: formatEITValue(selected.max, config, true),
  });

  let inRangeCount = 0;
  // Smaller batches on iPad to keep input responsive.
  const batchSize = coarsePointer ? 4 : eitRegistry.length;
  const len = eitRegistry.length;

  const applyBatch = (start) => {
    if (token !== _numericApplyToken) return; // cancelled by new apply
    const end = Math.min(start + batchSize, len);
    for (let i = start; i < end; i++) {
      const entry = eitRegistry[i];
      if (!entry || !entry.cell) continue;
      const value = entry.metrics[config.key];
      const cl = entry.cell.classList;
      const hasData = Number.isFinite(value);
      const inRange = hasData && value >= selected.min && value <= selected.max;

      // iPad: avoid style writes for cells that will be fully dimmed in filter mode.
      if (hasData && !(isFilter && !inRange)) {
        const ratio = getNumericRatio(value, min, max);
        entry.cell.style.setProperty("--eit-cell-color", getColorForRatio(ratio));
      }

      if (inRange) inRangeCount += 1;

      cl.toggle("eit-colored", hasData);
      cl.toggle("eit-no-data", !hasData);
      cl.toggle("eit-dimmed", !hasData || (isFilter && !inRange));
      cl.toggle("eit-focus", inRange);
      cl.toggle("eit-out-range", hasData && !inRange && !isFilter);
    }

    if (end < len) {
      requestAnimationFrame(() => applyBatch(end));
      return;
    }

    // Final legend note when finished applying.
    updateEITLegend({
      visible: true,
      title: legendTitle,
      note: `${inRangeCount}/${numericCount} ${t("eit.inSelectedRange")}`,
      min: formatEITValue(selected.min, config, true),
      mid: t("eit.selected"),
      max: formatEITValue(selected.max, config, true),
    });
  };

  if (coarsePointer) {
    requestAnimationFrame(() => applyBatch(0));
  } else {
    applyBatch(0);
  }
}

function applyEIT(tableContainer) {
  if (!tableContainer) return;
  const config = EIT_PROPERTY_MAP.get(eitState.property) || EIT_PROPERTY_CONFIG[0];
  if (!config) return;

  if (config.type === "category" && eitState.mode === "filter") {
    eitState.mode = "color";
  }

  syncEITControls(config);

  lockLegendInteractions = config.type !== "category";
  // Apply eit-active for ALL non-default properties (including classification ones like block/metalType/state)
  // so range-block cells (La-Lu, Ac-Lr) get their dimmed/striped style.
  const isNonDefault = config.key !== "category";
  tableContainer.classList.toggle("eit-active", isNonDefault);
  onLegendLockChange(lockLegendInteractions, tableContainer);

  if (lockLegendInteractions) {
    onLegendReset(tableContainer);
  }

  if (config.type === "category") {
    // clearEITCellStyles is purposefully isolated inside applyCategoryEIT's 'category' 
    // branch to completely eliminate extreme layout/paint thrashing when selecting
    // properties like 'State' or 'Metal Type'.
    applyCategoryEIT(config);
  } else {
    // DO NOT invoke clearEITCellStyles() here to prevent extreme layout thrashing and 
    // forced recalculation of 118 cell transitions. applyNumericEIT inherently toggles 
    // all classes and overwrites strictly what's necessary, resulting in butter-smooth FPS.
    applyNumericEIT(config);
  }

  if (first20OverlayActive) {
    applyFirst20Overlay(tableContainer);
  }
}

function ensureEITController(tableContainer) {
  if (!tableContainer) return;

  let root = document.getElementById("eit-controller");
  if (!root) {
    root = document.createElement("section");
    root.id = "eit-controller";
    root.className = "eit-controller";
    root.setAttribute("aria-label", t("eit.ariaController"));

    // Build property chips HTML grouped by classification and property
    const buildChipsForGroup = (groupKey) => {
      return EIT_PROPERTY_CONFIG.filter(c => c.group === groupKey).map((config) => {
        const hasMultiUnits = config.units && config.units.length > 1;
        const displayUnit = getEffectiveUnit(config);
        const unitSpan = displayUnit
          ? `<span class="eit-chip-unit">${displayUnit}</span>`
          : "";
        const label = `${getPropertyLabel(config)}${unitSpan}`;
        const extraAttrs = hasMultiUnits ? ` data-has-units="true" title="${t("eit.clickToChangeUnit")}"` : "";
        return `<button type="button" class="eit-chip${config.key === "category" ? " active" : ""}" data-property="${config.key}"${extraAttrs}>${label}</button>`;
      }).join("");
    };

    const chipsHTML = `
      <div class="eit-chip-group">
        <div class="eit-chip-group-label">${t("eit.group.property")}</div>
        <div class="eit-chip-list">${buildChipsForGroup("property")}</div>
      </div>
      <div class="eit-chip-group-divider"></div>
      <div class="eit-chip-group">
        <div class="eit-chip-group-label">${t("eit.group.classification")}</div>
        <div class="eit-chip-list">${buildChipsForGroup("classification")}</div>
      </div>
    `;

    root.innerHTML = `
      <button type="button" class="eit-property-trigger" id="eit-property-trigger" aria-controls="eit-property-panel" aria-expanded="false">
        <span class="eit-current-property" id="eit-current-property">${t("eit.property.category")}</span>
        <span class="eit-trigger-caret" aria-hidden="true">▾</span>
      </button>
      <div class="eit-slider-section" id="eit-slider-section" hidden>
        <span id="eit-selected-min"></span>
        <div class="eit-dual-slider" id="eit-dual-slider">
          <div class="eit-slider-track"></div>
          <div class="eit-slider-fill" id="eit-slider-fill"></div>
          <input type="range" id="eit-range-min" class="eit-range-input eit-range-input-min" />
          <input type="range" id="eit-range-max" class="eit-range-input eit-range-input-max" />
        </div>
        <span id="eit-selected-max"></span>
      </div>
      <div class="eit-mode-group" id="eit-mode-group" role="group" aria-label="${t("eit.ariaVisualizationMode")}">
        <div class="eit-mode-slider" id="eit-mode-slider"></div>
        <button type="button" class="eit-mode-btn active" data-mode="color" aria-pressed="true">${t("eit.color")}</button>
        <button type="button" class="eit-mode-btn" data-mode="filter" aria-pressed="false">${t("eit.filter")}</button>
      </div>
      <button type="button" class="eit-reset-btn" id="eit-reset-btn">${t("eit.reset")}</button>
      <button type="button" class="eit-reset-btn" id="eit-first20-btn" aria-pressed="false">${t("eit.first20")}</button>
      <button type="button" class="eit-reset-btn" id="eit-style-toggle-btn" aria-pressed="false">${t("eit.style.electrons")}</button>
      <button type="button" class="eit-reset-btn" id="eit-s3mode-btn" aria-pressed="false">S3 mode</button>
      <div class="eit-property-panel" id="eit-property-panel">
        <div class="eit-property-chips" id="eit-property-chips">
          ${chipsHTML}
        </div>
      </div>
      <div class="eit-property-note" id="eit-property-note" style="display:none"></div>
    `;

    // Hidden select for backwards compat
    const hiddenSelect = document.createElement("select");
    hiddenSelect.id = "eit-property-select";
    hiddenSelect.style.display = "none";
    root.appendChild(hiddenSelect);
  }

  if (root.parentElement !== tableContainer) {
    tableContainer.appendChild(root);
  }
  tableContainer.classList.add("has-eit");

  eitUI = {
    root,
    propertyTrigger: root.querySelector("#eit-property-trigger"),
    propertyPanel: root.querySelector("#eit-property-panel"),
    currentProperty: root.querySelector("#eit-current-property"),
    tip: null,
    propertySelect: root.querySelector("#eit-property-select"),
    chips: Array.from(root.querySelectorAll(".eit-chip")),
    sliderSection: root.querySelector("#eit-slider-section"),
    selectedMin: root.querySelector("#eit-selected-min"),
    selectedMax: root.querySelector("#eit-selected-max"),
    sliderFill: root.querySelector("#eit-slider-fill"),
    rangeMinInput: root.querySelector("#eit-range-min"),
    rangeMaxInput: root.querySelector("#eit-range-max"),
    propertyNote: root.querySelector("#eit-property-note"),
    modeGroup: root.querySelector("#eit-mode-group"),
    modeButtons: Array.from(root.querySelectorAll(".eit-mode-btn")),
    modeSlider: root.querySelector("#eit-mode-slider"),
    resetButton: root.querySelector("#eit-reset-btn"),
    first20Button: root.querySelector("#eit-first20-btn"),
    styleToggleButton: root.querySelector("#eit-style-toggle-btn"),
    s3ModeButton: root.querySelector("#eit-s3mode-btn"),
    closeButton: root.querySelector("#eit-panel-close"),
    legend: root.querySelector("#eit-legend"),
    legendTitle: root.querySelector("#eit-legend-title"),
    legendNote: root.querySelector("#eit-legend-note"),
    legendBar: root.querySelector("#eit-legend-bar"),
    legendMin: root.querySelector("#eit-legend-min"),
    legendMid: root.querySelector("#eit-legend-mid"),
    legendMax: root.querySelector("#eit-legend-max"),
  };

  // If the EIT toolbar DOM already existed (dataset.bound=true) but we shipped new controls later,
  // ensure new buttons still get listeners without duplicating the whole binding block.
  if (root.dataset.bound === "true" && eitUI.first20Button && root.dataset.first20Bound !== "true") {
    eitUI.first20Button.addEventListener("click", () => {
      first20OverlayActive = !first20OverlayActive;
      eitUI.first20Button?.setAttribute("aria-pressed", first20OverlayActive ? "true" : "false");
      applyFirst20Overlay(tableContainer);
    });
    root.dataset.first20Bound = "true";
  }

  if (root.dataset.bound === "true" && eitUI.styleToggleButton && root.dataset.styleToggleBound !== "true") {
    eitUI.styleToggleButton.addEventListener("click", () => {
      tableElectronStyleActive = !tableElectronStyleActive;
      try {
        localStorage.setItem(
          TABLE_STYLE_STORAGE_KEY,
          tableElectronStyleActive ? TABLE_STYLE_ELECTRONS_VALUE : "",
        );
      } catch (e) {
        // ignore storage failures
      }
      eitUI.styleToggleButton?.setAttribute("aria-pressed", tableElectronStyleActive ? "true" : "false");
      applyTableStyleClass(tableContainer);
    });
    root.dataset.styleToggleBound = "true";
  }

  if (root.dataset.bound === "true" && eitUI.s3ModeButton && root.dataset.s3ModeBound !== "true") {
    eitUI.s3ModeButton.addEventListener("click", () => {
      s3ModeActive = !s3ModeActive;
      eitUI.s3ModeButton?.setAttribute("aria-pressed", s3ModeActive ? "true" : "false");
      applyS3Mode(tableContainer);
      if (s3ModeActive) setEITPanelOpen(false);
    });
    root.dataset.s3ModeBound = "true";
  }

  // Populate hidden select (backwards compat)
  eitUI.propertySelect.innerHTML = "";
  EIT_PROPERTY_CONFIG.forEach((config) => {
    const option = document.createElement("option");
    option.value = config.key;
    const label = getPropertyLabel(config);
    option.textContent = config.unit ? `${label} (${config.unit})` : label;
    eitUI.propertySelect.appendChild(option);
  });

  if (!root.dataset.bound) {
    // iPad Safari sometimes fails to deliver reliable "click" events for UI inside
    // transformed/overlaid layouts. Bind a touch-friendly pointer handler as backup.
    const bindTap = (el, handler) => {
      if (!el) return;
      let lastTouchUpAt = 0;
      el.addEventListener("click", (e) => {
        if (lastTouchUpAt && (performance.now() - lastTouchUpAt) < 650) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        handler(e);
      });
      el.addEventListener("pointerup", (e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        if (window._uniplusIsDragging) return;
        e.preventDefault();
        e.stopPropagation();
        lastTouchUpAt = performance.now();
        handler(e);
      }, { passive: false });
    };

    // Trigger toggles dropdown
    bindTap(eitUI.propertyTrigger, () => setEITPanelOpen(!eitPanelOpen));
    // Prevent clicks inside panel from closing it
    eitUI.propertyPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    // Property chips — click active chip to cycle unit, click inactive to switch property
    eitUI.chips.forEach((chip) => {
      bindTap(chip, () => {
        const clickedProperty = chip.dataset.property;
        if (clickedProperty === eitState.property) {
          // Re-clicking active property → cycle unit
          const config = EIT_PROPERTY_MAP.get(clickedProperty);
          if (config?.units && config.units.length > 1) {
            cycleUnit(config);
            applyEIT(tableContainer);
          }
          // Don't close the panel so user can keep cycling
          return;
        }
        eitState.property = clickedProperty;
        applyEIT(tableContainer);
        setEITPanelOpen(false);
      });
    });
    // Range sliders — FAST PATH using requestAnimationFrame
    // Instead of calling applyEIT (which syncs controls, clears classes,
    // recomputes colors, updates legend), we use a dedicated function that
    // ONLY toggles the 3 range-dependent classes on each cell.
    let eitSliderRafId = null;
    let eitSliderPending = null; // { min, max, config }

    function updateCellRangeClasses(selMin, selMax, config) {
      const isFilter = eitState.mode === "filter";
      let inRangeCount = 0;
      const numericCount = eitRegistry.reduce((n, e) => n + (Number.isFinite(e.metrics[config.key]) ? 1 : 0), 0);

      for (let i = 0, len = eitRegistry.length; i < len; i++) {
        const entry = eitRegistry[i];
        const rangeObj = entry.ranges ? entry.ranges[config.key] : null;
        if (!rangeObj) continue;
        const inRange = rangeObj.min <= selMax && rangeObj.max >= selMin;
        if (inRange) inRangeCount++;
        const cl = entry.cell.classList;
        cl.toggle("eit-dimmed", isFilter && !inRange);
        cl.toggle("eit-focus", inRange);
        cl.toggle("eit-out-range", !inRange && !isFilter);
      }

      setPropertyNote(
        `${t("eit.selectedWindowPrefix")} ${formatEITValue(selMin, config, true)} → ${formatEITValue(selMax, config, true)}`,
      );
      updateEITLegend({
        visible: true,
        title: getPropertyLabel(config),
        note: `${inRangeCount}/${numericCount} ${t("eit.inSelectedRange")}`,
        min: formatEITValue(selMin, config, true),
        mid: t("eit.selected"),
        max: formatEITValue(selMax, config, true),
      });
    }

    const scheduleRangeUpdate = () => {
      if (eitSliderRafId) return;
      eitSliderRafId = requestAnimationFrame(() => {
        eitSliderRafId = null;
        if (eitSliderPending) {
          updateCellRangeClasses(eitSliderPending.min, eitSliderPending.max, eitSliderPending.config);
          eitSliderPending = null;
        }
      });
    };

    eitUI.rangeMinInput.addEventListener("input", () => {
      const config = EIT_PROPERTY_MAP.get(eitState.property);
      if (!config || config.type !== "numeric") return;
      let minValue = Number.parseFloat(eitUI.rangeMinInput.value);
      let maxValue = Number.parseFloat(eitUI.rangeMaxInput.value);
      if (minValue > maxValue) {
        minValue = maxValue;
        eitUI.rangeMinInput.value = String(minValue);
      }
      eitState.numericRanges.set(config.key, { min: minValue, max: maxValue });
      // Immediate lightweight visual sync
      syncSliderVisuals(eitUI.sliderBounds, { min: minValue, max: maxValue });
      eitUI.selectedMin.textContent = formatEITValue(minValue, config, true);
      // Schedule fast cell class updates
      eitSliderPending = { min: minValue, max: maxValue, config };
      scheduleRangeUpdate();
    });
    eitUI.rangeMaxInput.addEventListener("input", () => {
      const config = EIT_PROPERTY_MAP.get(eitState.property);
      if (!config || config.type !== "numeric") return;
      let minValue = Number.parseFloat(eitUI.rangeMinInput.value);
      let maxValue = Number.parseFloat(eitUI.rangeMaxInput.value);
      if (maxValue < minValue) {
        maxValue = minValue;
        eitUI.rangeMaxInput.value = String(maxValue);
      }
      eitState.numericRanges.set(config.key, { min: minValue, max: maxValue });
      // Immediate lightweight visual sync
      syncSliderVisuals(eitUI.sliderBounds, { min: minValue, max: maxValue });
      eitUI.selectedMax.textContent = formatEITValue(maxValue, config, true);
      // Schedule fast cell class updates
      eitSliderPending = { min: minValue, max: maxValue, config };
      scheduleRangeUpdate();
    });
    // Mode buttons
    eitUI.modeButtons.forEach((button) => {
      bindTap(button, () => {
        eitState.mode = button.dataset.mode === "filter" ? "filter" : "color";
        applyEIT(tableContainer);
      });
    });
    // Reset
    bindTap(eitUI.resetButton, () => {
      first20OverlayActive = false;
      applyFirst20Overlay(tableContainer);
      s3ModeActive = false;
      eitUI.s3ModeButton?.setAttribute("aria-pressed", "false");
      applyS3Mode(tableContainer);
      resetEITState();
      applyEIT(tableContainer);
    });

    // First 20 toggle
    bindTap(eitUI.first20Button, () => {
      first20OverlayActive = !first20OverlayActive;
      eitUI.first20Button?.setAttribute("aria-pressed", first20OverlayActive ? "true" : "false");
      applyFirst20Overlay(tableContainer);
    });
    root.dataset.first20Bound = "true";

    // Table style toggle (symbol + electron arrangement view)
    bindTap(eitUI.styleToggleButton, () => {
      tableElectronStyleActive = !tableElectronStyleActive;
      try {
        localStorage.setItem(
          TABLE_STYLE_STORAGE_KEY,
          tableElectronStyleActive ? TABLE_STYLE_ELECTRONS_VALUE : "",
        );
      } catch (e) {
        // ignore storage failures
      }
      eitUI.styleToggleButton?.setAttribute("aria-pressed", tableElectronStyleActive ? "true" : "false");
      applyTableStyleClass(tableContainer);
    });
    root.dataset.styleToggleBound = "true";

    // S3 mode toggle
    bindTap(eitUI.s3ModeButton, () => {
      s3ModeActive = !s3ModeActive;
      eitUI.s3ModeButton?.setAttribute("aria-pressed", s3ModeActive ? "true" : "false");
      applyS3Mode(tableContainer);
      if (s3ModeActive) setEITPanelOpen(false);
    });
    root.dataset.s3ModeBound = "true";
    // Close on outside click
    document.addEventListener("click", (event) => {
      if (!eitUI || !eitUI.root.contains(event.target)) {
        setEITPanelOpen(false);
      }
    });

    // Handle resize/layout changes more robustly with ResizeObserver
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        if (eitState.mode) syncModeSlider();
      });
      observer.observe(eitUI.modeGroup);
    } else {
      window.addEventListener("resize", syncModeSlider);
    }

    if (!root.dataset.langBound) {
      onLangChange(() => {
        root.setAttribute("aria-label", t("eit.ariaController"));
        const modeGroup = root.querySelector(".eit-mode-group");
        if (modeGroup) modeGroup.setAttribute("aria-label", t("eit.ariaVisualizationMode"));
        const colorBtn = root.querySelector('.eit-mode-btn[data-mode="color"]');
        const filterBtn = root.querySelector('.eit-mode-btn[data-mode="filter"]');
        if (colorBtn) colorBtn.textContent = t("eit.color");
        if (filterBtn) filterBtn.textContent = t("eit.filter");
        if (eitUI?.resetButton) eitUI.resetButton.textContent = t("eit.reset");
        if (eitUI?.first20Button) eitUI.first20Button.textContent = t("eit.first20");
        if (eitUI?.styleToggleButton) eitUI.styleToggleButton.textContent = t("eit.style.electrons");
        
        // Update group labels
        const groupLabels = root.querySelectorAll(".eit-chip-group-label");
        if (groupLabels.length >= 2) {
          groupLabels[0].textContent = t("eit.group.property");
          groupLabels[1].textContent = t("eit.group.classification");
        }
        
        applyEIT(tableContainer);
      });
      root.dataset.langBound = "true";
    }
    root.dataset.bound = "true";
  }

  applyEIT(tableContainer);
  applyFirst20Overlay(tableContainer);
  // Apply persisted table style
  try {
    tableElectronStyleActive =
      localStorage.getItem(TABLE_STYLE_STORAGE_KEY) === TABLE_STYLE_ELECTRONS_VALUE;
  } catch (e) {
    tableElectronStyleActive = false;
  }
  eitUI?.styleToggleButton?.setAttribute("aria-pressed", tableElectronStyleActive ? "true" : "false");
  applyTableStyleClass(tableContainer);
  eitUI?.s3ModeButton?.setAttribute("aria-pressed", s3ModeActive ? "true" : "false");
  applyS3Mode(tableContainer);
  if (typeof window._scalePeriodicTable === "function") {
    requestAnimationFrame(() => {
      window._scalePeriodicTable();
    });
  }
}

  return {
    EIT_PROPERTY_CONFIG,
    registerEITElementCell,
    resetEITState,
    resetEITRegistry,
    ensureEITController,
    isLegendLocked: () => lockLegendInteractions,
    getRegistry: () => eitRegistry,
  };
}
