/* Pattern grid layouts — circle burst map (UTF-8) */
const SHELL_COUNT = 5;

const SHELL_POSITION_LABELS = [
  { en: 'Far Left', zh: '\u6700\u5DE6' },
  { en: 'Left', zh: '\u5DE6' },
  { en: 'Centre', zh: '\u4E2D' },
  { en: 'Right', zh: '\u53F3' },
  { en: 'Far Right', zh: '\u6700\u53F3' },
];
const PANEL_ROWS = 16;
const PANEL_COLS = 16;
const CIRCLE_RADIUS = 7;
const PANEL_GAP = 4;
const GRID_TYPE = 'circle';

const PATTERN_TEMPLATES = [
  { id: 'ring', labelEn: 'Ring', labelZh: '\u74B0\u5F62' },
  { id: 'diamond', labelEn: 'Diamond', labelZh: '\u83F1\u5F62' },
  { id: 'cross', labelEn: 'Cross', labelZh: '\u5341\u5B57' },
];

function cellPitch(cellSize, gap) {
  return cellSize * 2 + gap;
}

function buildCircleCells() {
  const cells = [];
  const cx = (PANEL_COLS - 1) / 2;
  const cy = (PANEL_ROWS - 1) / 2;
  for (let row = 0; row < PANEL_ROWS; row++) {
    for (let col = 0; col < PANEL_COLS; col++) {
      const dx = col - cx;
      const dy = row - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= CIRCLE_RADIUS) {
        cells.push({ id: `${row},${col}`, row, col });
      }
    }
  }
  return cells;
}

const CIRCLE_CELLS = buildCircleCells();

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

function squareToPixel(row, col, cellSize, rows, cols, gap) {
  const pitch = cellPitch(cellSize, gap);
  const colCenter = (cols - 1) / 2;
  const rowCenter = (rows - 1) / 2;
  return {
    x: (col - colCenter) * pitch,
    y: (row - rowCenter) * pitch,
  };
}

function cellToPixel(cell, gridType, cellSize) {
  return squareToPixel(cell.row, cell.col, cellSize, PANEL_ROWS, PANEL_COLS, PANEL_GAP);
}

function getPatternPixelRadius(cellSize) {
  const pitch = cellPitch(cellSize, PANEL_GAP);
  return CIRCLE_RADIUS * pitch;
}

function getPanelLayoutSize(cellSize, gap = PANEL_GAP) {
  const pitch = cellPitch(cellSize, gap);
  const cell = cellSize * 2;
  return {
    width: (PANEL_COLS - 1) * pitch + cell,
    height: (PANEL_ROWS - 1) * pitch + cell,
    pitch,
    gap,
    cellSize,
  };
}

function cellNorm(cell) {
  const cx = (PANEL_COLS - 1) / 2;
  const cy = (PANEL_ROWS - 1) / 2;
  return {
    nx: (cell.col - cx) / CIRCLE_RADIUS,
    ny: (cell.row - cy) / CIRCLE_RADIUS,
  };
}

function matchesTemplate(cell, templateId) {
  const { nx, ny } = cellNorm(cell);

  switch (templateId) {
    case 'ring': {
      const target = CIRCLE_RADIUS * 0.72;
      const dist = Math.sqrt(
        (cell.col - (PANEL_COLS - 1) / 2) ** 2 + (cell.row - (PANEL_ROWS - 1) / 2) ** 2
      );
      return Math.abs(dist - target) < 0.85;
    }
    case 'diamond': {
      const manhattan = Math.abs(nx) + Math.abs(ny);
      return Math.abs(manhattan - 0.88) < 0.18;
    }
    case 'cross': {
      const arm = 0.22;
      return Math.abs(nx) < arm || Math.abs(ny) < arm;
    }
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

function applySymmetryShell(shell, gridType) {
  const mid = Math.floor(PANEL_COLS / 2);
  CIRCLE_CELLS.forEach((cell) => {
    if (cell.col >= mid) return;
    const mirrorCol = PANEL_COLS - 1 - cell.col;
    const mirrorId = `${cell.row},${mirrorCol}`;
    if (shell[cell.id]) shell[mirrorId] = shell[cell.id];
    else if (shell[mirrorId]) shell[cell.id] = shell[mirrorId];
  });
}
