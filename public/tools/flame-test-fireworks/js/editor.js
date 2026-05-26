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
    this.cellSize = 18;

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

  loadReferenceDemo() {
    this.shells = buildReferenceDemoShells();
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
        `<button type="button" class="action-btn template-btn" data-template="${t.id}" title="${t.labelEn} ${t.labelZh}">
          <span class="btn-label">${t.labelEn}</span>
          <span class="btn-label-zh">${t.labelZh}</span>
        </button>`
    ).join('');

    this.container.innerHTML = `
      <div class="editor-toolbar">
        <div class="toolbar-section">
          <span class="toolbar-label">Layers <span class="toolbar-label-zh">\u7159\u706B\u5C64</span></span>
          <div class="shell-tabs" role="tablist" aria-label="Firework layers"></div>
        </div>
        <div class="toolbar-section toolbar-row">
          <div class="tool-group tool-group-primary" role="group" aria-label="Draw tools">
            <button type="button" class="tool-btn active" data-tool="paint" title="Paint \u7E6A\u88FD">
              <span class="btn-icon" aria-hidden="true">\uD83C\uDFA8</span>
              <span class="btn-label">Paint</span>
            </button>
            <button type="button" class="tool-btn" data-tool="eraser" title="Eraser \u6E05\u9664">
              <span class="btn-icon" aria-hidden="true">\u232B</span>
              <span class="btn-label">Eraser</span>
            </button>
          </div>
          <div class="tool-group template-group" role="group" aria-label="Pattern templates">
            ${templateButtons}
          </div>
        </div>
        <div class="toolbar-section">
          <div class="tool-group tool-group-actions">
            <button type="button" class="action-btn" data-action="demo" title="Reference demo \u53C3\u8003\u5716\u6848">
              <span class="btn-label">Demo</span>
              <span class="btn-label-zh">\u53C3\u8003</span>
            </button>
            <button type="button" class="action-btn" data-action="clear" title="Clear \u5168\u90E8\u6E05\u9664">
              <span class="btn-label">Clear</span>
              <span class="btn-label-zh">\u6E05\u9664</span>
            </button>
            <button type="button" class="action-btn" data-action="symmetry" title="Symmetry \u5DE6\u53F3\u5C0D\u7A31">
              <span class="btn-label">Mirror</span>
              <span class="btn-label-zh">\u5C0D\u7A31</span>
            </button>
          </div>
        </div>
      </div>
      <div class="grid-wrap">
        <div class="grid-stage">
          <div class="pattern-grid-host" role="grid" aria-label="Burst pattern map"></div>
        </div>
      </div>
      <div class="editor-status" aria-live="polite"></div>
    `;

    this.gridWrapEl = this.container.querySelector('.grid-wrap');
    this.gridStageEl = this.container.querySelector('.grid-stage');
    this.gridEl = this.container.querySelector('.pattern-grid-host');
    this.statusEl = this.container.querySelector('.editor-status');
    this.shellTabsEl = this.container.querySelector('.shell-tabs');

    this.updateShellTabs();
    this.renderGrid();
    this.updateStatus();
    this.bindGridResize();
  }

  bindGridResize() {
    if (this._gridResizeObserver) return;
    const onResize = () => this.fitGridLayout();
    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined' && this.gridWrapEl) {
      this._gridResizeObserver = new ResizeObserver(onResize);
      this._gridResizeObserver.observe(this.gridWrapEl);
    }
  }

  fitGridLayout() {
    if (!this.gridWrapEl || !this.gridEl) return;
    const layout = getPanelLayoutSize(this.cellSize);
    const dotPx = Math.max(8, this.cellSize * 1.22);
    const naturalW = layout.width + 4;
    const naturalH = layout.height + dotPx * 0.5;

    const pad =
      parseFloat(getComputedStyle(this.gridWrapEl).paddingLeft) +
      parseFloat(getComputedStyle(this.gridWrapEl).paddingRight);
    const availW = this.gridWrapEl.clientWidth - pad;
    const scale = availW > 0 ? Math.min(1, availW / naturalW) : 1;

    if (scale < 0.999) {
      this.gridEl.style.transform = `scale(${scale})`;
      this.gridEl.style.transformOrigin = 'center top';
    } else {
      this.gridEl.style.transform = '';
    }

    const scaledH = Math.ceil(naturalH * scale);
    if (this.gridStageEl) {
      this.gridStageEl.style.minHeight = `${scaledH}px`;
    }
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
      const posEn = pos ? pos.en : `Layer ${i + 1}`;
      const posZh = pos ? pos.zh : `${i + 1}`;
      btn.title = `Layer ${i + 1} \u2014 ${posEn} (${posZh})`;
      btn.innerHTML = `<span class="shell-num">${i + 1}</span><span class="shell-pos">${posZh}</span>`;
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

    const dotPx = Math.max(8, cellSize * 1.22);

    CIRCLE_CELLS.forEach((cell) => {
      const { x, y } = cellToPixel(cell, this.gridType, cellSize);
      const el = this.createCellElement('circle-cell', cell.id);
      el.style.left = `${offsetX + x - dotPx / 2}px`;
      el.style.top = `${offsetY + y - dotPx / 2}px`;
      el.style.width = `${dotPx}px`;
      el.style.height = `${dotPx}px`;
      this.applyCellStyle(el, shell[cell.id]);
      this.gridEl.appendChild(el);
    });

    this.fitGridLayout();
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
      const c = METALS[metalId].color;
      cell.style.backgroundColor = c;
      cell.style.boxShadow = `0 0 12px ${c}, 0 0 4px rgba(255,255,255,0.5)`;
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
    const total = CIRCLE_CELLS.length;
    const pos = SHELL_POSITION_LABELS[this.currentShell];
    const posZh = pos ? pos.zh : '';
    this.statusEl.innerHTML = `
      <span class="status-chip status-layer">L${this.currentShell + 1} ${posZh}</span>
      <span class="status-chip status-count">${cells} / ${total}</span>
      <span class="status-chip status-metal" style="--metal:${m.color}">${m.ion}</span>
    `;
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
        if (action === 'demo') this.loadReferenceDemo();
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
