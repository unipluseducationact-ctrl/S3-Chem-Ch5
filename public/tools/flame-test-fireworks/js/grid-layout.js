/* Pattern grid layouts — polar concentric ring burst map (UTF-8) */
const SHELL_COUNT = 5;

const SHELL_POSITION_LABELS = [
  { en: 'Far Left', zh: '\u6700\u5DE6' },
  { en: 'Left', zh: '\u5DE6' },
  { en: 'Centre', zh: '\u4E2D' },
  { en: 'Right', zh: '\u53F3' },
  { en: 'Far Right', zh: '\u6700\u53F3' },
];

/** Dot count per ring: center + 5 concentric rings (101 cells total) */
const RING_DOT_COUNTS = [1, 8, 14, 20, 26, 32];
const MAX_RING_INDEX = RING_DOT_COUNTS.length - 1;
/** Alias used by fireworks sizing */
const CIRCLE_RADIUS = MAX_RING_INDEX;

const PANEL_GAP = 4;
const GRID_TYPE = 'circle';

const PATTERN_TEMPLATES = [
  { id: 'concentric', labelEn: 'All rings', labelZh: '\u5168\u74B0' },
  { id: 'ring', labelEn: 'Outer ring', labelZh: '\u5916\u74B0' },
];

function cellPitch(cellSize, gap) {
  return cellSize * 2 + gap;
}

function buildPolarRingCells() {
  const cells = [];
  RING_DOT_COUNTS.forEach((count, ring) => {
    const angleOffset = ring > 0 && ring % 2 === 1 ? Math.PI / count : 0;
    for (let i = 0; i < count; i++) {
      const angle = angleOffset + (2 * Math.PI * i) / count;
      cells.push({
        id: `r${ring},i${i}`,
        ring,
        angle,
        index: i,
      });
    }
  });
  return cells;
}

const CIRCLE_CELLS = buildPolarRingCells();

/** Per-shell metal per ring (center → outer) for reference-image demo */
const REFERENCE_DEMO_SHELLS = [
  ['Na', 'Fe', 'Na', 'Na', 'Na', 'Na'],
  ['Cs', 'Cs', 'K', 'K', 'K', 'K'],
  ['Ca', 'Na', 'Rb', 'Rb', 'Rb', 'Rb'],
  ['Cu', 'Cu', 'Cu', 'Cu', 'Cu', 'Cu'],
  ['Li', 'Ba', 'Mg', 'Mg', 'Mg', 'Mg'],
];

function getCellsForType(gridType) {
  return CIRCLE_CELLS;
}

function createEmptyShell(gridType) {
  const shell = {};
  CIRCLE_CELLS.forEach((cell) => {
    shell[cell.id] = null;
  });
  return shell;
}

function createEmptyShellSet() {
  return createEmptyShell(GRID_TYPE);
}

function shellHasCells(shell, gridType) {
  return CIRCLE_CELLS.some((cell) => shell[cell.id]);
}

function cloneShell(shell, gridType) {
  const copy = createEmptyShell(gridType);
  CIRCLE_CELLS.forEach((cell) => {
    copy[cell.id] = shell[cell.id] || null;
  });
  return copy;
}

function getPatternPixelRadius(cellSize, scale = 1) {
  const pitch = cellPitch(cellSize, PANEL_GAP);
  return MAX_RING_INDEX * pitch * scale;
}

function cellToPixel(cell, gridType, cellSize, scale = 1) {
  if (cell.ring === 0) {
    return { x: 0, y: 0 };
  }
  const maxR = getPatternPixelRadius(cellSize, scale);
  const r = (cell.ring / MAX_RING_INDEX) * maxR;
  return {
    x: r * Math.cos(cell.angle),
    y: r * Math.sin(cell.angle),
  };
}

function getPanelLayoutSize(cellSize, gap = PANEL_GAP) {
  const dotRadius = Math.max(8, cellSize * 1.22) / 2;
  const maxR = getPatternPixelRadius(cellSize) + dotRadius + 6;
  const size = maxR * 2;
  return {
    width: size,
    height: size,
    pitch: cellPitch(cellSize, gap),
    gap,
    cellSize,
    maxR,
  };
}

function normalizeAngle(a) {
  let x = a % (2 * Math.PI);
  if (x < 0) x += 2 * Math.PI;
  return x;
}

function findCellOnRing(ring, targetAngle) {
  const onRing = CIRCLE_CELLS.filter((c) => c.ring === ring);
  if (!onRing.length) return null;
  const t = normalizeAngle(targetAngle);
  let best = onRing[0];
  let bestDiff = Infinity;
  onRing.forEach((c) => {
    const diff = Math.min(
      Math.abs(normalizeAngle(c.angle) - t),
      2 * Math.PI - Math.abs(normalizeAngle(c.angle) - t)
    );
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  });
  return best;
}

function matchesTemplate(cell, templateId) {
  switch (templateId) {
    case 'concentric':
      return true;
    case 'ring':
      return cell.ring === MAX_RING_INDEX;
    default:
      return false;
  }
}

function fillTemplateShell(shell, templateId, metalId) {
  CIRCLE_CELLS.forEach((cell) => {
    if (matchesTemplate(cell, templateId)) shell[cell.id] = metalId;
  });
}

function fillRingShell(shell, gridType, metalId) {
  fillTemplateShell(shell, 'ring', metalId);
}

function fillShellFromRingMetals(shell, ringMetals) {
  CIRCLE_CELLS.forEach((cell) => {
    const metalId = ringMetals[cell.ring];
    shell[cell.id] = metalId && METALS[metalId] ? metalId : null;
  });
}

function buildReferenceDemoShells() {
  return REFERENCE_DEMO_SHELLS.map((ringMetals) => {
    const shell = createEmptyShellSet();
    fillShellFromRingMetals(shell, ringMetals);
    return shell;
  });
}

function applySymmetryShell(shell, gridType) {
  CIRCLE_CELLS.forEach((cell) => {
    if (cell.ring === 0) return;
    const a = normalizeAngle(cell.angle);
    if (a > Math.PI || (a === Math.PI && cell.index % 2 === 1)) return;
    const mirrorAngle = -cell.angle;
    const mirror = findCellOnRing(cell.ring, mirrorAngle);
    if (!mirror) return;
    if (shell[cell.id]) shell[mirror.id] = shell[cell.id];
    else if (shell[mirror.id]) shell[cell.id] = shell[mirror.id];
  });
}
