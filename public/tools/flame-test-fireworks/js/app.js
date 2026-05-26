/* Main application wiring */
(function () {
  const I18N = {
    subtitle:
      '\u7130\u8272\u8A66\u9A57\u7159\u706B\u5DE5\u574A \u2014 Design your pattern with metal ions, then launch',
    editorTitle: 'Pattern Designer \u5716\u6848\u8A2D\u8A08\u5340',
    editorHint:
      'Circle burst grid. Click or drag to paint; right-click to erase. Use templates for quick shapes. \u5713\u5F62\u7DE6\u683C\uFF1B\u9EDE\u64CA\u6216\u62D6\u66F2\u7E6A\u88FD\uFF1B\u53F3\u9375\u6E05\u9664\uFF1B\u53EF\u7528\u6A21\u677F\u5FEB\u901F\u7E6A\u5716\u3002',
    skyTitle: 'Night Sky Display \u591C\u7A7A\u8868\u6F14\u5340',
    sceneTitle: 'Background Scene \u80CC\u666F\u5834\u666F',
    launch: 'Launch Firework \u767C\u5C04\u7159\u706B',
    replay: 'Replay \u91CD\u64AD',
    reset: 'Reset Sky \u91CD\u8A2D\u591C\u7A7A',
    download: 'Download Picture \u4E0B\u8F09\u5716\u7247',
    downloadHint:
      'Available after a launch finishes. \u767C\u5C04\u7D50\u675F\u5F8C\u53EF\u4E0B\u8F09\u5408\u6210\u5716\u7247\u3002',
    paletteTitle: 'Metal Ion Palette \u91D1\u5C6C\u96E2\u5B50\u8ABF\u8272\u677F',
    refToggle: 'Flame Test Reference \u7130\u8272\u8A66\u9A57\u5C0D\u7167\u8868 \u25BC',
    thIon: 'Ion \u96E2\u5B50',
    thMetal: 'Element \u5143\u7D20',
    thColour: 'Flame colour \u7130\u8272',
    thNotes: 'Notes \u5099\u8A3B',
  };

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (I18N[key]) {
      if (el.tagName === 'BUTTON' || el.tagName === 'H2' || el.tagName === 'P' || el.tagName === 'TH') {
        el.textContent = I18N[key];
      }
    }
  });
  document.title = 'HKDSE Flame Test Fireworks | \u7130\u8272\u8A66\u9A57\u7159\u706B\u5DE5\u574A';

  const editorContainer = document.getElementById('editor-root');
  const paletteContainer = document.getElementById('palette-root');
  const refBody = document.getElementById('ref-table-body');
  const canvas = document.getElementById('fireworks-canvas');
  const sceneBackground = document.getElementById('scene-background');
  const scenePicker = document.getElementById('scene-picker');
  const launchBtn = document.getElementById('btn-launch');
  const replayBtn = document.getElementById('btn-replay');
  const resetBtn = document.getElementById('btn-reset');
  const downloadBtn = document.getElementById('btn-download');
  const refToggle = document.getElementById('ref-toggle');
  const refPanel = document.getElementById('ref-panel');

  const editor = new PatternEditor(editorContainer);
  const simulator = new FireworkSimulator(canvas, sceneBackground);

  function buildScenePicker() {
    scenePicker.innerHTML = '';
    BACKGROUND_SCENES.forEach((scene, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scene-option' + (index === 0 ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
      btn.dataset.sceneId = scene.id;
      btn.title = `${scene.labelEn} ${scene.labelZh}`;
      btn.innerHTML = `<img src="${scene.src}" alt="${scene.labelEn}" width="72" height="48" loading="lazy" />`;
      btn.addEventListener('click', () => selectScene(scene.id));
      scenePicker.appendChild(btn);
    });
  }

  function selectScene(id) {
    scenePicker.querySelectorAll('.scene-option').forEach((el) => {
      const active = el.dataset.sceneId === id;
      el.classList.toggle('active', active);
      el.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    simulator.setScene(id).then(() => {
      if (!simulator.running) simulator.initScene();
    });
  }

  function buildPalette() {
    paletteContainer.innerHTML = '';
    METAL_ORDER.forEach((id) => {
      const m = METALS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-item' + (id === editor.selectedMetal ? ' active' : '');
      btn.dataset.metal = id;
      btn.setAttribute('aria-label', `${m.ion} ${m.nameEn} ${m.nameZh}`);
      btn.innerHTML = `
        <span class="swatch" style="background:${m.color}"></span>
        <span class="palette-text">
          <strong>${m.ion}</strong>
          <span>${m.nameEn} / ${m.nameZh}</span>
        </span>
      `;
      btn.addEventListener('click', () => selectMetal(id));
      paletteContainer.appendChild(btn);
    });
  }

  function selectMetal(id) {
    editor.setSelectedMetal(id);
    paletteContainer.querySelectorAll('.palette-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.metal === id);
    });
  }

  function buildReferenceTable() {
    refBody.innerHTML = '';
    METAL_ORDER.forEach((id) => {
      const m = METALS[id];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="ref-swatch" style="background:${m.color}"></span> ${m.ion}</td>
        <td>${m.nameEn}<br><span class="zh">${m.nameZh}</span></td>
        <td>${m.colorNameEn}<br><span class="zh">${m.colorNameZh}</span></td>
        <td class="note-cell">${m.noteEn}<br><span class="zh">${m.noteZh}</span></td>
      `;
      refBody.appendChild(tr);
    });
  }

  simulator.onComplete = () => {
    downloadBtn.disabled = false;
  };

  launchBtn.addEventListener('click', () => {
    const payload = editor.getLaunchPayload();
    const gridType = payload.gridType || 'circle';
    const hasCells = payload.shells.some((shell) => shellHasCells(shell, gridType));
    if (!hasCells) return;
    downloadBtn.disabled = true;
    simulator.launch(payload);
  });

  replayBtn.addEventListener('click', () => simulator.replay());

  resetBtn.addEventListener('click', () => {
    simulator.initScene();
    downloadBtn.disabled = true;
  });

  downloadBtn.addEventListener('click', async () => {
    if (!simulator.lastPattern) {
      return;
    }
    const filename = `fireworks-${simulator.currentSceneId}-${Date.now()}.png`;
    downloadBtn.disabled = true;
    try {
      const composite = simulator.captureSnapshot();
      await downloadCanvasPng(composite, filename);
    } catch (err) {
      console.error('Download failed:', err);
      alert(
        'Could not save the picture. Please wait until the launch finishes, then try again.\n\u7121\u6CD5\u5132\u5B58\u5716\u7247\uFF0C\u8ACB\u7B49\u5F85\u767C\u5C04\u7D50\u675F\u5F8C\u518D\u8A66\u3002'
      );
    } finally {
      downloadBtn.disabled = false;
    }
  });

  refToggle.addEventListener('click', () => {
    const open = refPanel.classList.toggle('open');
    refToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  buildScenePicker();
  buildPalette();
  buildReferenceTable();
  preloadAllScenes().then(() => {
    simulator.setScene(BACKGROUND_SCENES[0].id);
    simulator.initScene();
  });
  selectMetal('Na');
})();
