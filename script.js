import { getChemToolContent } from "./js/modules/chemToolContent.js";
import { attachToolEventListeners } from "./js/modules/chemToolInteractions.js";
import {
  buildPeriodicTable,
  eitController,
  initModalUI,
  reRenderCurrentAtomModal,
  setGlobalUnit,
  l3UnitState
} from "./js/modules/uiController.js";
import { syncEitMobileMount } from "./js/modules/ui/eitMobileController.js";
import { initPageController } from "./js/modules/pageController.js";
import { initChemFlashcard } from "./js/modules/chemFlashcardApp.js";
import { createToolsModalController } from "./js/modules/toolsModalController.js";
import {
  applyAnimationPauseState,
  getSavedAnimationState,
  initSettingsController,
} from "./js/modules/settingsController.js";
import { initMascotController } from "./js/modules/mascotController.js";
import { initElementSearch } from "./js/modules/elementSearchController.js";
import {
  initLangController,
  onLangChange,
  registerCacheCleanup,
  t
} from "./js/modules/langController.js";
import { initEntryLanding } from "./js/modules/onboardingController.js";
import {
  initWorksheetHub,
  applyWorksheetEmbedIframesLang,
} from "./js/modules/worksheetHubController.js";
import { initChapterDrawOverlays } from "./js/modules/chapterDrawOverlay.js";

function isRealMobileDevice() {
  // Wide viewports (> 1024px) get the full desktop app, even on touch devices like iPad.
  // This must stay in sync with the CSS breakpoint in mobile-landing.css.
  if (window.innerWidth > 1024) return false;

  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasTouchScreen = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIPad = /Macintosh/i.test(navigator.userAgent) && hasTouchScreen;
  return hasCoarsePointer && (mobileUA || isIPad);
}


// ========================================
// Welcome Modal - Intro Page
// ========================================
// ========================================
// Global Dragging State (used to prevent accidental panel close)
// ========================================
window._uniplusIsDragging = false;
(function initGlobalDragTracking() {
  let pointerDown = false;
  let startX = 0, startY = 0;
  let skipDragDetectionForThisPointer = false;
  const DRAG_THRESHOLD = 5;
  document.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    // iPad Safari: slight finger jitter can exceed DRAG_THRESHOLD and wrongly suppress taps.
    // For key UI controls, never classify the gesture as a "drag".
    const t = e.target;
    skipDragDetectionForThisPointer = !!(
      t &&
      typeof t.closest === "function" &&
      t.closest("#eit-controller, .eit-property-panel, .eit-chip, .eit-reset-btn, .eit-mode-btn, .eit-property-trigger, .l3-stat-item.l3-clickable")
    );
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    if (skipDragDetectionForThisPointer) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      window._uniplusIsDragging = true;
    }
  }, true);
  document.addEventListener('pointerup', () => {
    pointerDown = false;
    skipDragDetectionForThisPointer = false;
    // Delay clearing drag state so click handlers see it
    // For key UI controls (EIT + stat tiles), clear immediately so taps feel instant on iPad.
    setTimeout(() => { window._uniplusIsDragging = false; }, 10);
  }, true);
  document.addEventListener('pointercancel', () => {
    pointerDown = false;
    skipDragDetectionForThisPointer = false;
    setTimeout(() => { window._uniplusIsDragging = false; }, 10);
  }, true);
  window.addEventListener('blur', () => {
    pointerDown = false;
    skipDragDetectionForThisPointer = false;
    // Don't close panels on blur
  });
})();

// ========================================
// Global Animation Speed State
// ========================================
const savedAnimationState = getSavedAnimationState();
window._uniplusAnimPaused = savedAnimationState.paused;
window._uniplusAnimSpeed = savedAnimationState.speed;
applyAnimationPauseState(window._uniplusAnimPaused);

// ========================================
// Lazy module loaders (performance)
// ========================================
/** Vite-bundled worksheet chunk — do NOT use a raw <script src="js/worksheet-generator.js">; that file is not emitted in `dist/`. */
let worksheetModulePromise = null;
let heroAtomModulePromise = null;

async function ensureWorksheetReady() {
  if (!worksheetModulePromise) {
    worksheetModulePromise = import("./js/worksheet-generator.js");
  }
  await worksheetModulePromise;
  window.initWorksheetGenerator?.();
}

window.ensureWorksheetReady = ensureWorksheetReady;

function loadHeroAtomModule() {
  if (heroAtomModulePromise) return heroAtomModulePromise;
  heroAtomModulePromise = import("./js/modules/heroAtomRenderer.js");
  return heroAtomModulePromise;
}

function initWelcomeModal() {
  // Deprecated: welcome modal removed (direct-to-app).
}

// ========================================
// Periodic Table Auto-Scale on Short Viewport
// ========================================
function initPeriodicTableScale() {
  const table = document.getElementById("periodic-table");
  const container = document.getElementById("main-container");
  if (!table || !container) return;

  const LOGICAL_WIDTH = 1240;
  const MAX_GAP = 96;
  const MIN_GAP = 24;
  let isScaling = false;
  let lastScaleSignature = "";
  let legendEl = null;

  // User-controlled zoom multiplier (separate from auto-fit scale).
  const USER_SCALE_KEY = "uniplus_user_scale";
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  let userScale = 1;
  try {
    const raw = parseFloat(localStorage.getItem(USER_SCALE_KEY) || "1");
    userScale = Number.isFinite(raw) ? clamp(raw, 0.7, 1.35) : 1;
  } catch (e) {
    userScale = 1;
  }

  function computeTvmin(tableW) {
    // Scale tvmin with table width to keep text proportional in cells
    const effectiveH = Math.max(window.innerHeight, 500);
    return Math.min(tableW, effectiveH) / 100;
  }

  function measureHeight(gap) {
    table.style.setProperty("--series-gap", `${gap}px`);
    table.style.transition = "none";
    table.style.transform = "none";
    void table.offsetHeight;
    return table.getBoundingClientRect().height;
  }

  function applyLayout(gap, scale, marginTop) {
    table.style.setProperty("--series-gap", `${gap}px`);
    table.style.transformOrigin = "top center";
    const finalScale = (scale < 0.999 ? scale : 1) * userScale;
    table.style.transform = Math.abs(finalScale - 1) > 0.001 ? `scale(${finalScale})` : "none";
    table.style.marginTop = `${marginTop}px`;

    const legend = document.getElementById("table-legend");
    if (legend) {
      // Allow CSS to control horizontal legend shift (e.g., on iPad) without
      // fighting this JS-driven layout pass.
      legend.style.transform = "translate(var(--legend-shift-x, 0px), 10px)";
      legend.style.transformOrigin = "top center";
    }
  }

  function scaleTable(force = false, opts = {}) {
    const { allowWhenViewportZoomed = false } = opts || {};
    if (isScaling) return;
    if (getComputedStyle(container).display === "none") return;
    if (table.children.length === 0) return;
    // On iPad/iOS, pinch-zoom changes viewport metrics and can trigger resize.
    // Do not override user zoom by re-scaling the table while visualViewport is zoomed.
    if (!allowWhenViewportZoomed && window.visualViewport && typeof window.visualViewport.scale === "number" && window.visualViewport.scale !== 1) {
      return;
    }

    const scaleSignature = [
      window.innerWidth,
      window.innerHeight,
      window.visualViewport && typeof window.visualViewport.scale === "number" ? window.visualViewport.scale : 1,
      container.clientWidth,
      container.clientHeight,
      table.childElementCount,
    ].join(":");

    if (!force && scaleSignature === lastScaleSignature) return;

    isScaling = true;
    try {
      lastScaleSignature = scaleSignature;
      // 1. Measure Environment
      const containerStyle = getComputedStyle(container);
      const padT = parseFloat(containerStyle.paddingTop) || 0;
      const padB = parseFloat(containerStyle.paddingBottom) || 0;
      const availH = Math.max(window.innerHeight - padT - padB, 100);

      const MIN_READABLE_SCALE = 0.65;
      const SCROLL_THRESHOLD = 1150; // Below this, always scroll

      // 2. Smart width decision: try fitting at current window width first
      let tableWidth;
      let useScrollMode = false;

      if (window.innerWidth < SCROLL_THRESHOLD) {
        // Very narrow window: always use scroll mode
        useScrollMode = true;
      } else {
        // Try fitting at current window width
        const tryWidth = window.innerWidth - 40;
        const tryTvmin = computeTvmin(tryWidth);
        table.style.setProperty("--tvmin", `${tryTvmin}px`);
        table.style.width = `${tryWidth}px`;
        const tryH = measureHeight(MIN_GAP);
        const tryScale = availH / tryH;

        if (tryScale >= MIN_READABLE_SCALE) {
          // Table fits at this width with acceptable scaling
          tableWidth = tryWidth;
          // Set container min-width to window width (no scroll)
          container.style.minWidth = `${window.innerWidth}px`;
        } else {
          // Scale too small — table would be unreadable. Use scroll mode.
          useScrollMode = true;
        }
      }

      if (useScrollMode) {
        // Scroll mode: use fullscreen-equivalent width
        const fullscreenRef = Math.max(screen.availWidth, 1280);
        tableWidth = Math.max(fullscreenRef - 40, LOGICAL_WIDTH);
        container.style.minWidth = `${tableWidth + 40}px`;
      }

      // 3. Apply width and tvmin
      const tvmin = computeTvmin(tableWidth);
      table.style.setProperty("--tvmin", `${tvmin}px`);
      table.style.width = `${tableWidth}px`;

      // 4. Measure base height with MIN gap
      const hMin = measureHeight(MIN_GAP);

      // 5. Adaptive Gap: expand gap to fill available height, maximizing the table
      let currentGap;
      let height;
      let scale = 1;

      if (hMin > availH) {
        // Even with min gap, too tall → need to scale
        currentGap = MIN_GAP;
        height = hMin;
        scale = Math.max(availH / height, 0.1);
      } else {
        // Table fits. Expand gap to fill remaining space.
        const extraSpace = availH - hMin;
        currentGap = Math.min(MAX_GAP, MIN_GAP + extraSpace);
        height = measureHeight(currentGap);
        // Fine-tune: if somehow still doesn't fit, clamp
        if (height > availH) {
          currentGap = MIN_GAP;
          height = hMin;
        }
      }

      // 6. Vertical Centering
      const scaledHeight = height * scale;
      let marginTop = 0;
      if (scaledHeight < availH) {
        marginTop = (availH - scaledHeight) / 2;
      }

      // 7. Fix scroll mode margins: match container to visual width
      if (useScrollMode && scale < 0.999) {
        const visualWidth = Math.ceil(tableWidth * scale);
        container.style.minWidth = `${visualWidth + 40}px`;
      }

      // 8. Legend layout: switch between 4-col and 2-col based on VISUAL width
      legendEl = legendEl || document.getElementById("table-legend");
      const legend = legendEl;
      if (legend) {
        // Legend spans grid-column 3/13 = 10 out of 18 columns
        // Use visual width (accounting for scale) to decide layout
        const legendVisualWidth = (10 / 18) * tableWidth * scale;
        // 4 columns need ~560px visual minimum (4 × 140px)
        if (legendVisualWidth < 560) {
          legend.classList.add("legend-compact");
        } else {
          legend.classList.remove("legend-compact");
        }
      }

      applyLayout(currentGap, scale, marginTop);

    } catch (e) {
      console.error("Scale Error:", e);
    } finally {
      isScaling = false;
    }
  }

  window._scalePeriodicTable = (force = false) => scaleTable(force);
  // Called by mobile "View by" zoom buttons.
  window._uniplusAdjustUserScale = (delta) => {
    const step = 0.06;
    const next = clamp((userScale || 1) + (delta > 0 ? step : -step), 0.7, 1.35);
    userScale = next;
    try {
      localStorage.setItem(USER_SCALE_KEY, String(userScale));
    } catch (e) {
      // ignore storage failures
    }
    scaleTable(true, { allowWhenViewportZoomed: true });
    return userScale;
  };
  window._uniplusGetUserScale = () => userScale;
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => requestAnimationFrame(() => scaleTable(true)), 50);
  });
  window.addEventListener("load", () => scaleTable(true));
  // Also run immediately
  requestAnimationFrame(() => scaleTable(true));
}

function initNavResponsive() {
  const nav = document.getElementById("global-nav");
  if (!nav) return;
  const root = document.documentElement;

  const SAFETY_GAP = 32;

  function syncGlobalNavScale() {
    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, 1);
    const aspectRatio = width / height;
    let scale = 1;

    if (width <= 1360) {
      scale = 0.88;
    } else if (width <= 1500) {
      scale = 0.94;
    }

    if (width > 1700 && aspectRatio > 1.7) {
      const aspectReduction = Math.min(0.07, (aspectRatio - 1.7) * 0.09);
      const widthReduction = Math.min(0.05, (width - 1700) / 1800 * 0.05);
      scale -= aspectReduction + widthReduction;
    }

    scale = Math.max(0.86, Math.min(1, scale));
    root.style.setProperty("--global-nav-scale", scale.toFixed(3));
  }

  function checkNavCollision() {
    syncGlobalNavScale();
    nav.classList.remove("nav-hide-brand");
    void nav.offsetWidth;

    const navInnerWidth = nav.clientWidth - 40;
    const logo = nav.querySelector(".nav-logo-link");
    const brand = nav.querySelector(".nav-brand");
    const pill = nav.querySelector(".global-nav-pill");

    const logoW = logo ? logo.offsetWidth : 0;
    const brandW = brand ? brand.offsetWidth : 0;
    const pillW = pill ? pill.offsetWidth : 0;
    const navGap = 12;
    const brandGap = brand && brandW > 0 ? 10 : 0;

    const totalNeeded = logoW + brandGap + brandW + navGap + pillW + SAFETY_GAP * 2;

    if (totalNeeded > navInnerWidth) {
      nav.classList.add("nav-hide-brand");
    }
  }

  let navResizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(navResizeTimer);
    navResizeTimer = setTimeout(checkNavCollision, 60);
  });
  window.addEventListener("load", checkNavCollision);
  onLangChange(() => requestAnimationFrame(checkNavCollision));
  requestAnimationFrame(checkNavCollision);
}

// Global Data Version State
window.uniplusVersion = 'old';

function initMainApp() {
  // No welcome / notice pages — go straight to main app.

  initPeriodicTableScale();
  initNavResponsive();

  const tableContainer = document.getElementById("periodic-table");
  if (tableContainer) {
    buildPeriodicTable(tableContainer);
    syncEitMobileMount(tableContainer, eitController);
    let eitMobileResizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(eitMobileResizeTimer);
      eitMobileResizeTimer = setTimeout(() => {
        syncEitMobileMount(tableContainer, eitController);
      }, 150);
    });
  }
  initModalUI();

  const toolsModalController = createToolsModalController({
    getToolContent: getChemToolContent,
    attachToolEventListeners,
  });
  toolsModalController.init();

  // Register tool cache cleanup when language changes
  registerCacheCleanup(() => {
    toolsModalController.clearToolContentCache();
  });

  const worksheetHub = initWorksheetHub();

  const pageCtrl = initPageController({
    onTablePageShown: () => {
      if (window._scalePeriodicTable) window._scalePeriodicTable(true);
      if (tableContainer) syncEitMobileMount(tableContainer, eitController);
    },
    onToolsPageShown: () => {
      setTimeout(() => toolsModalController.initChemToolCards(), 100);
      if (tableContainer) syncEitMobileMount(tableContainer, eitController);
    },
    onWorksheetPageShown: () => {
      void ensureWorksheetReady()
        .then(() => {
          worksheetHub.resetWorksheetHub();
          applyWorksheetEmbedIframesLang();
        })
        .catch((e) => console.error("Worksheet lazy init error:", e));
      if (tableContainer) syncEitMobileMount(tableContainer, eitController);
    },
    onSettingsPageShown: () => {
      requestAnimationFrame(() => {
         if (window._syncGlobalUnitButtons) window._syncGlobalUnitButtons(true);
      });
      if (tableContainer) syncEitMobileMount(tableContainer, eitController);
    },
    onFlashcardsPageShown: () => {
      requestAnimationFrame(() => initChemFlashcard());
      if (tableContainer) syncEitMobileMount(tableContainer, eitController);
    },
  });

  // Initialize element search in navbar
  initElementSearch(pageCtrl);

  // Floating about button opens Welcome / Help
  const aboutBtn = document.getElementById("floating-about-btn");
  if (aboutBtn) {
    aboutBtn.addEventListener("click", () => {
      if (window._showWelcome) window._showWelcome();
    });
  }

  requestAnimationFrame(() => {
    if (window._scalePeriodicTable) window._scalePeriodicTable(true);
  });
  initSettingsController({
    onOpenWelcome: () => {
      // Welcome modal removed.
    },
    l3UnitState,
    setGlobalUnit,
  });

  // Initialize mascot chemistry assistant
  initMascotController();

  initChapterDrawOverlays();
}

function bootstrapApp() {
  initLangController();
  // Unified landing for desktop + mobile.
  // No intermediate pages; Start goes straight to main app.
  initEntryLanding(() => initMainApp());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp, { once: true });
} else {
  bootstrapApp();
}
