/* Canvas firework simulator */
const ROCKET_SPEED = -4.2;
const ROCKET_FRAME_MS = 16;
const SHELL_STAGGER_MS = 1400;

/** Sky band + burst layout (fractions of canvas w/h) */
const SKY_LAYOUT = {
  skyTop: 0.04,
  skyBottom: 2 / 3,
  marginX: 0.04,
  slotSpread: 0.94,
  patternScale: 1.0,
  /** Pattern diameter uses 3-slot spacing so adding outer layers does not shrink rings */
  patternSizeSlots: 3,
  /** X along spread (0–1); middle three match former 3-layer positions */
  layerXFraction: [0.06, 0.25, 0.5, 0.75, 0.94],
  /** Y within sky band — far-L, L, centre, R, far-R */
  layerYFraction: [0.52, 0.56, 0.36, 0.5, 0.48],
};

class FireworkSimulator {
  constructor(canvas, backgroundImg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.backgroundImg = backgroundImg;
    this.currentSceneId = BACKGROUND_SCENES[0].id;
    this.particles = [];
    this.rockets = [];
    this.patternDots = [];
    this.running = false;
    this.hasFinishedLaunch = false;
    this.lastPattern = null;
    this.onComplete = null;
    this.snapshotCanvas = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this.w = rect.width;
    this.h = rect.height;
    this.snapshotCanvas = null;
    this.cx = this.w / 2;
    const band = this.getSkyBand();
    this.cy = band.mid;
  }

  getSkyBand() {
    const top = this.h * SKY_LAYOUT.skyTop;
    const bottom = this.h * SKY_LAYOUT.skyBottom;
    return {
      top,
      bottom,
      height: bottom - top,
      mid: (top + bottom) / 2,
    };
  }

  setScene(id) {
    const scene = getSceneById(id);
    this.currentSceneId = scene.id;
    this.backgroundImg.src = scene.src;
    this.backgroundImg.alt = `${scene.labelEn} ${scene.labelZh}`;
    return loadSceneImage(scene);
  }

  getBurstPositionForLayer(layerIndex) {
    const slots = SHELL_COUNT;
    const band = this.getSkyBand();
    const inset = this.w * SKY_LAYOUT.marginX;
    const span = this.w - inset * 2;
    const spread = SKY_LAYOUT.slotSpread;
    const xStart = inset + span * ((1 - spread) / 2);
    const xFrac =
      SKY_LAYOUT.layerXFraction?.[layerIndex] ?? (layerIndex + 1) / (slots + 1);
    const x = xStart + span * spread * xFrac;

    const yFrac =
      SKY_LAYOUT.layerYFraction[layerIndex] ??
      (layerIndex + 1) / (slots + 1);
    const y = band.top + band.height * yFrac;
    return { x, y };
  }

  launch(payload) {
    if (this.running) return;
    const gridType = payload.gridType || 'circle';
    const shellsData = payload.shells || payload;
    const nonEmpty = shellsData.filter((shell) => shellHasCells(shell, gridType));
    if (nonEmpty.length === 0) return;

    this.lastPattern = {
      gridType,
      shells: shellsData.map((shell) => cloneShell(shell, gridType)),
    };
    this.running = true;
    this.hasFinishedLaunch = false;
    this.particles = [];
    this.rockets = [];
    this.patternDots = [];
    this.snapshotCanvas = null;
    this.clearCanvas();

    const activeLayerCount = nonEmpty.length;
    let delay = 0;

    shellsData.forEach((shell, layerIndex) => {
      if (!shellHasCells(shell, gridType)) return;
      const { x: burstX, y: burstY } = this.getBurstPositionForLayer(layerIndex);

      this.rockets.push({
        x: burstX,
        y: this.h - 20,
        targetY: burstY,
        burstX,
        burstY,
        vy: ROCKET_SPEED,
        trail: [],
        fired: false,
        startDelay: delay,
        elapsed: 0,
        shell,
        gridType,
        layerIndex,
        shellCount: activeLayerCount,
      });
      delay += SHELL_STAGGER_MS;
    });

    if (!this.rafId) this.loop();
  }

  replay() {
    if (this.lastPattern) this.launch(this.lastPattern);
  }

  getMaxPatternOuterRadius() {
    const band = this.getSkyBand();
    const scale = SKY_LAYOUT.patternScale;
    const inset = this.w * SKY_LAYOUT.marginX;
    const span = this.w - inset * 2;
    const sizeSlots = SKY_LAYOUT.patternSizeSlots || SHELL_COUNT;
    const slotSpacing = (span * SKY_LAYOUT.slotSpread) / (sizeSlots + 1);
    const maxFromWidth = slotSpacing * 0.6 * scale;

    let maxFromHeight = Infinity;
    SKY_LAYOUT.layerYFraction.forEach((yFrac) => {
      const y = band.top + band.height * yFrac;
      const clearance = Math.min(y - band.top, band.bottom - y);
      maxFromHeight = Math.min(maxFromHeight, clearance);
    });

    const maxFromBand = band.height * 0.4 * scale;
    return Math.min(maxFromWidth, maxFromHeight * 0.97, maxFromBand);
  }

  getCellSize() {
    const gap = PANEL_GAP;
    const radiusCells = CIRCLE_RADIUS;
    const maxOuter = this.getMaxPatternOuterRadius();
    let cellSize = Math.max(3.5, (maxOuter / radiusCells - gap) / 2);

    let outerR = getPatternPixelRadius(cellSize) + cellSize * 0.45;
    if (outerR > maxOuter) {
      cellSize *= maxOuter / outerR;
      cellSize = Math.max(3.5, cellSize);
    }
    return cellSize;
  }

  burst(shell, burstX, burstY, shellCount, gridType) {
    const cellSize = this.getCellSize();

    getCellsForType(gridType).forEach((cell) => {
      const metalId = shell[cell.id];
      if (!metalId || !METALS[metalId]) return;

      const metal = METALS[metalId];
      const { x, y } = cellToPixel(cell, gridType, cellSize);
      const target = { x: burstX + x, y: burstY + y };

      this.particles.push({
        x: burstX,
        y: burstY,
        startX: burstX,
        startY: burstY,
        targetX: target.x,
        targetY: target.y,
        expand: 0,
        expandSpeed: 0.14,
        vx: 0,
        vy: 0,
        life: 1,
        decay: 0.004 + Math.random() * 0.002,
        color: metal.color,
        size: metal.id === 'Mg' ? 4 : 2.8 + Math.random() * 0.4,
        metalId,
        willow: metal.willow,
        isPattern: true,
      });

      this.patternDots.push({
        x: target.x,
        y: target.y,
        color: metal.color,
        life: 150,
        size: cellSize * 0.38,
      });
    });
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  updatePatternParticle(p) {
    if (p.expand < 1) {
      p.expand = Math.min(1, p.expand + p.expandSpeed);
      const t = this.easeOutCubic(p.expand);
      p.x = p.startX + (p.targetX - p.startX) * t;
      p.y = p.startY + (p.targetY - p.startY) * t;
      return;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.vy += 0.012;
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  drawEffects(ctx) {
    this.rockets.forEach((rocket) => {
      if (rocket.elapsed < rocket.startDelay || rocket.fired) return;

      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      rocket.trail.forEach((t, i) => {
        const alpha = (i + 1) / rocket.trail.length;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha * 0.5})`;
        ctx.fill();
      });
    });

    this.patternDots.forEach((dot) => {
      const alpha = Math.min(0.55, dot.life / 90) * 0.65;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fillStyle = dot.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    this.particles.forEach((p) => {
      if (p.life <= 0) return;

      const alpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  renderEffectsToContext(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawEffects(ctx);
  }

  getBurstLayouts() {
    if (!this.lastPattern) return [];
    const gridType = this.lastPattern.gridType || 'circle';
    const activeLayerCount = this.lastPattern.shells.filter((shell) =>
      shellHasCells(shell, gridType)
    ).length;

    return this.lastPattern.shells
      .map((shell, layerIndex) => ({ shell, layerIndex }))
      .filter(({ shell }) => shellHasCells(shell, gridType))
      .map(({ shell, layerIndex }) => {
        const { x: burstX, y: burstY } = this.getBurstPositionForLayer(layerIndex);
        return {
          shell,
          burstX,
          burstY,
          shellCount: activeLayerCount,
          gridType,
        };
      });
  }

  drawShellPattern(ctx, shell, burstX, burstY, shellCount, gridType) {
    const cellSize = this.getCellSize();

    getCellsForType(gridType).forEach((cell) => {
      const metalId = shell[cell.id];
      if (!metalId || !METALS[metalId]) return;

      const metal = METALS[metalId];
      const { x, y } = cellToPixel(cell, gridType, cellSize);
      const tx = burstX + x;
      const ty = burstY + y;
      const dotSize = cellSize * 0.38;

      ctx.beginPath();
      ctx.arc(tx, ty, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = metal.color;
      ctx.globalAlpha = 1;
      ctx.fill();
    });
  }

  /** Full-opacity pattern for export (from saved editor design). */
  drawFrozenPattern(ctx) {
    this.getBurstLayouts().forEach(({ shell, burstX, burstY, shellCount, gridType }) => {
      this.drawShellPattern(ctx, shell, burstX, burstY, shellCount, gridType);
    });
  }

  renderFrozenPatternToContext(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawFrozenPattern(ctx);
  }

  buildFrozenSnapshot() {
    if (!this.lastPattern) return;
    if (!this.snapshotCanvas) {
      this.snapshotCanvas = document.createElement('canvas');
    }
    if (
      this.snapshotCanvas.width !== this.canvas.width ||
      this.snapshotCanvas.height !== this.canvas.height
    ) {
      this.snapshotCanvas.width = this.canvas.width;
      this.snapshotCanvas.height = this.canvas.height;
    }
    this.renderFrozenPatternToContext(this.snapshotCanvas.getContext('2d'));
  }

  saveSnapshotFrame() {
    if (!this.snapshotCanvas) {
      this.snapshotCanvas = document.createElement('canvas');
    }
    if (
      this.snapshotCanvas.width !== this.canvas.width ||
      this.snapshotCanvas.height !== this.canvas.height
    ) {
      this.snapshotCanvas.width = this.canvas.width;
      this.snapshotCanvas.height = this.canvas.height;
    }
    const snapCtx = this.snapshotCanvas.getContext('2d');
    this.renderEffectsToContext(snapCtx);
  }

  loop() {
    this.clearCanvas();
    this.ctx.fillStyle = 'rgba(5, 8, 24, 0.22)';
    this.ctx.fillRect(0, 0, this.w, this.h);

    let active = false;

    this.rockets.forEach((rocket) => {
      rocket.elapsed += ROCKET_FRAME_MS;
      if (rocket.elapsed < rocket.startDelay) {
        active = true;
        return;
      }

      if (!rocket.fired) {
        rocket.y += rocket.vy;
        rocket.trail.push({ x: rocket.x, y: rocket.y, life: 1 });
        if (rocket.trail.length > 24) rocket.trail.shift();

        if (rocket.y <= rocket.targetY) {
          rocket.fired = true;
          this.burst(rocket.shell, rocket.burstX, rocket.burstY, rocket.shellCount, rocket.gridType);
        } else {
          active = true;
        }
      }
    });

    this.patternDots = this.patternDots.filter((dot) => {
      dot.life -= 1;
      if (dot.life <= 0) return false;
      active = true;
      return true;
    });

    this.particles = this.particles.filter((p) => {
      if (p.isPattern) {
        this.updatePatternParticle(p);
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.985;
        p.vy *= 0.985;
      }
      p.life -= p.decay;

      if (p.life <= 0) return false;

      if (p.willow && p.life > 0.3 && Math.random() < 0.08) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: p.vx * 0.3 + (Math.random() - 0.5) * 0.5,
          vy: p.vy * 0.5 + 0.3,
          life: p.life * 0.7,
          decay: p.decay * 1.2,
          color: p.color,
          size: p.size * 0.7,
          metalId: p.metalId,
          willow: true,
        });
      }

      active = true;
      return true;
    });

    this.drawEffects(this.ctx);

    const hasVisibleContent =
      active ||
      this.particles.length > 0 ||
      this.patternDots.length > 0 ||
      this.rockets.some((r) => r.elapsed >= r.startDelay && !r.fired);
    if (hasVisibleContent) {
      this.saveSnapshotFrame();
    }

    if (active) {
      this.rafId = requestAnimationFrame(() => this.loop());
    } else {
      this.running = false;
      this.rafId = null;
      this.hasFinishedLaunch = true;
      this.buildFrozenSnapshot();
      if (this.onComplete) this.onComplete();
    }
  }

  clear() {
    this.clearCanvas();
    this.particles = [];
    this.rockets = [];
    this.patternDots = [];
    this.snapshotCanvas = null;
    this.running = false;
    this.hasFinishedLaunch = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  initScene() {
    this.clear();
  }

  getBackgroundSource() {
    const scene = getSceneById(this.currentSceneId);
    const cached = sceneImageCache.get(scene.id);
    if (cached && cached.naturalWidth) return cached;
    return null;
  }

  compositeToCanvas(targetCanvas) {
    const w = targetCanvas.width;
    const h = targetCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bg = this.getBackgroundSource();
    if (bg) {
      drawImageCover(ctx, bg, w, h);
    } else if (this.backgroundImg.complete && this.backgroundImg.naturalWidth) {
      drawImageCover(ctx, this.backgroundImg, w, h);
    } else {
      ctx.fillStyle = '#050818';
      ctx.fillRect(0, 0, w, h);
    }

    const fx = document.createElement('canvas');
    fx.width = w;
    fx.height = h;

    if (this.lastPattern) {
      this.renderFrozenPatternToContext(fx.getContext('2d'));
    } else if (this.snapshotCanvas && this.snapshotCanvas.width > 0) {
      fx.getContext('2d').drawImage(this.snapshotCanvas, 0, 0);
    } else {
      this.renderEffectsToContext(fx.getContext('2d'));
    }

    ctx.drawImage(fx, 0, 0);
    return targetCanvas;
  }

  captureSnapshot() {
    if (this.lastPattern) {
      this.buildFrozenSnapshot();
    }
    const off = document.createElement('canvas');
    off.width = this.canvas.width;
    off.height = this.canvas.height;
    this.compositeToCanvas(off);
    return off;
  }
}
