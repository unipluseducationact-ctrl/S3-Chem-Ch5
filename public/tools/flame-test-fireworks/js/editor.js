/* Pattern grid editor — circle burst map */
class PatternEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.onChange = options.onChange || (() => {});
    this.shellCount = options.shellCount || SHELL_COUNT;
    this.selectedMetal = 'Na';
    this.tool = 'paint';
    this.currentShell = 0;
    this.gridType = 'circle';
    this.isPainting = false;
    this.cellSize = 14;

    this.shells = Array.from({ length: this.shellCount }, () => createEmptyShellSet());

    this.render();
    this.bindEvents();
  }

  getShell() {
    return this.shells[this.currentShell];
  }

  setSelectedMetal(id) {
    this.selectedMetal = id;
    this.updateStatus();
  }

  setTool(tool) {
    this.tool = tool;
    this.container.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  setShell(index) {
    this.currentShell = Math.max(0, Math.min(this.shellCount - 1, index));
    this.renderGrid();
    this.updateShellTabs();
    this.updateStatus();
  }

  paintCell(cellId, metalId) {
    const shell = this.getShell();
    if (!Object.prototype.hasOwnProperty.call(shell, cellId)) return;
    const next = this.tool === 'eraser' ? null : metalId;
    if (shell[cellId] === next) return;
    shell[cellId] = next;
    this.refreshCell(cellId);
    this.onChange();
    this.updateStatus();
  }

  clearShell() {
    this.shells[this.currentShell] = createEmptyShellSet();
    this.renderGrid();
    this.onChange();
    this.updateStatus();
  }

  applyTemplate(templateId) {
    fillTemplateShell(this.getShell(), templateId, this.selectedMetal);
    this.renderGrid();
    this.onChange();
    this.updateStatus();
  }

  applySymmetry() {
    applySymmetryShell(this.getShell(), this.gridType);
    this.renderGrid();
    this.onChange();
    this.updateStatus();
  }

  getLaunchPayload() {
    return {
      gridType: this.gridType,
      shells: this.shells.map((shell) => cloneShell(shell, this.gridType)),
    };
  }

  countCells(shellIndex = this.currentShell) {
    const shell = this.shells[shellIndex];
    return CIRCLE_CELLS.filter((cell) => shell[cell.id]).length;
  }

  render() {
    const templateButtons = PATTERN_TEMPLATES.map(
      (t) =>
        `<button type="button" class="action-btn template-btn" data-template="${t.id}">${t.labelEn} ${t.labelZh}</button>`
    ).join('');

    this.container.innerHTML = `
      <div class="editor-toolbar">
        <div class="shell-tabs" role="tablist" aria-label="Firework layers"></div>
        <div class="tool-group">
          <button type="button" class="tool-btn active" data-tool="paint" title="Paint">\uD83C\uDFA8 Paint \u7E6A\u88FD</button>
          <button type="button" class="tool-btn" data-tool="eraser" title="Eraser">\u232B Eraser \u6E05\u9664</button>
        </div>
        <div class="tool-group template-group" role="group" aria-label="Pattern templates">
          ${templateButtons}
        </div>
        <div class="tool-group">
          <button type="button" class="action-btn" data-action="clear">Clear \u5168\u90E8\u6E05\u9664</button>
          <button type="button" class="action-btn" data-action="symmetry">Symmetry \u5DE6\u53F3\u5C0D\u7A31</button>
        </div>
      </div>
      <div class="grid-wrap">
        <div class="pattern-grid-host" role="grid" aria-label="Burst pattern map"></div>
      </div>
      <p class="editor-status" aria-live="polite"></p>
    `;

    this.gridEl = this.container.querySelector('.pattern-grid-host');
    this.statusEl = this.container.querySelector('.editor-status');
    this.shellTabsEl = this.container.querySelector('.shell-tabs');

    this.updateShellTabs();
    this.renderGrid();
    this.updateStatus();
  }

  updateShellTabs() {
    this.shellTabsEl.innerHTML = '';
    for (let i = 0; i < this.shellCount; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shell-tab' + (i === this.currentShell ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === this.currentShell ? 'true' : 'false');
      const pos = SHELL_POSITION_LABELS[i];
      const posLabel = pos ? `${pos.en} ${pos.zh}` : `${i + 1}`;
      btn.textContent = `Layer ${i + 1} ${posLabel} \u7159\u706B\u5C64 ${i + 1}`;
      btn.addEventListener('click', () => this.setShell(i));
      this.shellTabsEl.appendChild(btn);
    }
  }

  renderGrid() {
    const cellSize = this.cellSize;
    const layout = getPanelLayoutSize(cellSize);
    const shell = this.getShell();
    const offsetX = layout.width / 2;
    const offsetY = layout.height / 2;

    this.gridEl.className = 'pattern-grid-host panel-shape-grid circle-grid';
    this.gridEl.style.width = `${layout.width}px`;
    this.gridEl.style.height = `${layout.height}px`;
    this.gridEl.innerHTML = '';

    CIRCLE_CELLS.forEach((cell) => {
      const { x, y } = squareToPixel(
        cell.row,
        cell.col,
        cellSize,
        PANEL_ROWS,
        PANEL_COLS,
        PANEL_GAP
      );
      const el = this.createCellElement('circle-cell', cell.id);
      el.style.left = `${offsetX + x - cellSize}px`;
      el.style.top = `${offsetY + y - cellSize}px`;
      el.style.width = `${cellSize * 2}px`;
      el.style.height = `${cellSize * 2}px`;
      this.applyCellStyle(el, shell[cell.id]);
      this.gridEl.appendChild(el);
    });
  }

  createCellElement(className, cellId) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = className;
    cell.dataset.cellId = cellId;
    cell.setAttribute('role', 'gridcell');
    return cell;
  }

  refreshCell(cellId) {
    const cell = this.gridEl.querySelector(`[data-cell-id="${cellId}"]`);
    if (cell) this.applyCellStyle(cell, this.getShell()[cellId]);
  }

  applyCellStyle(cell, metalId) {
    cell.classList.toggle('filled', !!metalId);
    if (metalId && METALS[metalId]) {
      cell.style.backgroundColor = METALS[metalId].color;
      cell.style.boxShadow = `0 0 8px ${METALS[metalId].color}`;
      cell.title = `${METALS[metalId].ion} ${METALS[metalId].nameZh}`;
    } else {
      cell.style.backgroundColor = '';
      cell.style.boxShadow = '';
      cell.title = '';
    }
  }

  updateStatus() {
    const m = METALS[this.selectedMetal];
    const cells = this.countCells();
    this.statusEl.textContent = `Layer ${this.currentShell + 1} \u7159\u706B\u5C64 ${this.currentShell + 1} \u00B7 ${cells} cells \u683C \u00B7 ${m.ion} ${m.nameEn} ${m.nameZh}`;
  }

  bindEvents() {
    this.container.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
    });

    this.container.querySelectorAll('[data-template]').forEach((btn) => {
      btn.addEventListener('click', () => this.applyTemplate(btn.dataset.template));
    });

    this.container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'clear') this.clearShell();
        if (action === 'symmetry') this.applySymmetry();
      });
    });

    const onPointer = (e) => {
      const cell = e.target.closest('[data-cell-id]');
      if (!cell) return;
      const cellId = cell.dataset.cellId;
      if (e.type === 'contextmenu') {
        e.preventDefault();
        this.paintCell(cellId, null);
        return;
      }
      if (e.buttons === 2) {
        this.paintCell(cellId, null);
        return;
      }
      this.paintCell(cellId, this.selectedMetal);
    };

    this.gridEl.addEventListener('mousedown', (e) => {
      if (e.button === 2) return;
      this.isPainting = true;
      onPointer(e);
    });
    this.gridEl.addEventListener('mousemove', (e) => {
      if (this.isPainting && e.buttons === 1) onPointer(e);
    });
    this.gridEl.addEventListener('mouseup', () => {
      this.isPainting = false;
    });
    this.gridEl.addEventListener('mouseleave', () => {
      this.isPainting = false;
    });
    this.gridEl.addEventListener('contextmenu', onPointer);

    this.gridEl.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const cell = el?.closest?.('[data-cell-id]');
        if (cell) {
          this.isPainting = true;
          this.paintCell(cell.dataset.cellId, this.selectedMetal);
        }
      },
      { passive: false }
    );
    this.gridEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const cell = el?.closest?.('[data-cell-id]');
      if (cell && this.isPainting) this.paintCell(cell.dataset.cellId, this.selectedMetal);
    });
    this.gridEl.addEventListener('touchend', () => {
      this.isPainting = false;
    });
  }
}
