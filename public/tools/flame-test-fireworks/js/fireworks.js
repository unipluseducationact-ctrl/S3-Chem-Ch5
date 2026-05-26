/* Canvas firework simulator */
const ROCKET_SPEED = -11;
const ROCKET_FRAME_MS = 16;
/** Cumulative launch delay (ms) per active shell index — tail layers stay tight. */
const SHELL_STAGGER_CUMULATIVE_MS = [0, 52, 98, 118, 132];
/** Hold full pattern after every shell has burst, then fade together. */
const PATTERN_HOLD_MS = 2000;
const PATTERN_FADE_MS = 2800;
const SPARK_FADE_MS = 1600;
const TRAIL_FADE_ALPHA = 0.2;
const FADE_ALPHA_CUTOFF = 0.025;

/** Smooth 0→1 ease for alpha (soft shoulder, gentle tail). */
function smoothFade01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Progress 0→1 (age) → display alpha. */
function fadeAlphaFromProgress(progress) {
  const t = Math.max(0, Math.min(1, 1 - progress));
  return smoothFade01(Math.pow(t, 0.8));
}

/** Fast radial glow — no shadowBlur (keeps fade phase at 60fps). */
function drawSoftGlow(ctx, x, y, color, radius, alpha) {
  if (alpha < FADE_ALPHA_CUTOFF) return;
  ctx.globalCompositeOperation = 'lighter';
  if (alpha < 0.22) {
    ctx.globalAlpha = alpha * 0.88;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const outer = radius * 2.1;
  const g = ctx.createRadialGradient(x, y, 0, x, y, outer);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Full glow for peak brightness (launch / fresh burst). */
function drawLuminousDot(ctx, x, y, color, radius, alpha = 1) {
  if (alpha < FADE_ALPHA_CUTOFF) return;
  if (alpha < 0.55) {
    drawSoftGlow(ctx, x, y, color, radius, alpha);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = radius * 5;
  ctx.shadowColor = color;
  ctx.globalAlpha = alpha * 0.45;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = radius * 1.2;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

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
  /** Per-shell pattern scale — centre largest */
  layerPatternScale: [0.88, 0.94, 1.15, 0.94, 0.88],
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
    this.lastFrameTime = 0;
    this.patternFadeBegin = null;
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
    this.patternFadeBegin = null;
    this.snapshotCanvas = null;
    this.clearCanvas();

    const activeLayerCount = nonEmpty.length;
    const launchY = this.h - 20;
    let activeIndex = 0;
    let referenceFlightMs = null;

    shellsData.forEach((shell, layerIndex) => {
      if (!shellHasCells(shell, gridType)) return;
      const { x: burstX, y: burstY } = this.getBurstPositionForLayer(layerIndex);
      const dist = launchY - burstY;
      if (referenceFlightMs === null) {
        referenceFlightMs = Math.max(
          280,
          Math.ceil(dist / Math.abs(ROCKET_SPEED)) * ROCKET_FRAME_MS
        );
      }
      const staggerTable = SHELL_STAGGER_CUMULATIVE_MS;
      const startDelay =
        staggerTable[activeIndex] ??
        staggerTable[staggerTable.length - 1] +
          (activeIndex - staggerTable.length + 1) * 28;

      this.rockets.push({
        x: burstX,
        y: launchY,
        launchY,
        targetY: burstY,
        burstX,
        burstY,
        flightMs: referenceFlightMs,
        flightElapsed: 0,
        trail: [],
        fired: false,
        startDelay,
        elapsed: 0,
        shell,
        gridType,
        layerIndex,
        shellCount: activeLayerCount,
      });
      activeIndex += 1;
    });

    this.lastFrameTime = performance.now();
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

  getLayerScale(layerIndex) {
    return SKY_LAYOUT.layerPatternScale?.[layerIndex] ?? 1;
  }

  getCellSize(layerIndex = 2) {
    const gap = PANEL_GAP;
    const layerScale = this.getLayerScale(layerIndex);
    const radiusCells = CIRCLE_RADIUS;
    const maxOuter = this.getMaxPatternOuterRadius() / layerScale;
    let cellSize = Math.max(4.2, (maxOuter / radiusCells - gap) / 2);

    let outerR = getPatternPixelRadius(cellSize, layerScale) + cellSize * 0.45;
    if (outerR > maxOuter) {
      cellSize *= maxOuter / outerR;
      cellSize = Math.max(4.2, cellSize);
    }
    return cellSize;
  }

  burst(shell, burstX, burstY, shellCount, gridType, layerIndex = 2) {
    const layerScale = this.getLayerScale(layerIndex);
    const cellSize = this.getCellSize(layerIndex);

    getCellsForType(gridType).forEach((cell) => {
      const metalId = shell[cell.id];
      if (!metalId || !METALS[metalId]) return;

      const metal = METALS[metalId];
      const { x, y } = cellToPixel(cell, gridType, cellSize, layerScale);
      const target = { x: burstX + x, y: burstY + y };

      this.patternDots.push({
        startX: burstX,
        startY: burstY,
        targetX: target.x,
        targetY: target.y,
        expand: 0,
        expandSpeed: 0.38,
        color: metal.color,
        size: cellSize * 0.5,
        layerIndex,
      });
    });
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  updatePatternDot(dot, dt = ROCKET_FRAME_MS) {
    if (dot.expand >= 1) return;
    const step = dt / ROCKET_FRAME_MS;
    dot.expand = Math.min(1, dot.expand + dot.expandSpeed * step);
  }

  getPatternDotPosition(dot) {
    const t = this.easeOutCubic(Math.min(1, dot.expand));
    return {
      x: dot.startX + (dot.targetX - dot.startX) * t,
      y: dot.startY + (dot.targetY - dot.startY) * t,
    };
  }

  allPatternDotsExpanded() {
    return (
      this.patternDots.length > 0 &&
      this.patternDots.every((dot) => dot.expand >= 1)
    );
  }

  schedulePatternFade(now) {
    if (this.patternFadeBegin != null) return;
    if (!this.rockets.every((r) => r.fired)) return;
    if (!this.allPatternDotsExpanded()) return;
    this.patternFadeBegin = now + PATTERN_HOLD_MS;
  }

  getPatternDotAlpha(now) {
    if (this.patternFadeBegin == null) return 1;
    if (now < this.patternFadeBegin) return 1;
    const progress = Math.min(1, (now - this.patternFadeBegin) / PATTERN_FADE_MS);
    return fadeAlphaFromProgress(progress);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  getSparkFadeProgress(spark, now) {
    if (spark.fadeBegin == null) spark.fadeBegin = now;
    return Math.min(1, (now - spark.fadeBegin) / spark.fadeMs);
  }

  drawEffects(ctx, now = performance.now()) {
    this.schedulePatternFade(now);
    const patternAlpha = this.getPatternDotAlpha(now);
    const fadePhase = this.patternFadeBegin != null && now >= this.patternFadeBegin;
    const useLiteDraw = fadePhase || this.patternDots.length > 80;
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

    if (patternAlpha < FADE_ALPHA_CUTOFF) {
      // skip dot draws
    } else {
      this.patternDots.forEach((dot) => {
        const { x, y } = this.getPatternDotPosition(dot);
        const expanding = dot.expand < 1;
        const alpha = patternAlpha * 0.94;
        const size = dot.size * (expanding ? 1 : 0.82 + 0.18 * alpha);
        const drawFn =
          expanding || (!useLiteDraw && alpha >= 0.55)
            ? drawLuminousDot
            : drawSoftGlow;
        drawFn(ctx, x, y, dot.color, size, alpha);
      });
    }

    this.particles.forEach((p) => {
      const progress = this.getSparkFadeProgress(p, now);
      if (progress >= 1) return;
      const alpha = fadeAlphaFromProgress(progress);
      drawSoftGlow(ctx, p.x, p.y, p.color, p.size * (0.75 + 0.25 * alpha), alpha);
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
          layerIndex,
        };
      });
  }

  drawShellPattern(ctx, shell, burstX, burstY, shellCount, gridType, layerIndex = 2) {
    const layerScale = this.getLayerScale(layerIndex);
    const cellSize = this.getCellSize(layerIndex);

    getCellsForType(gridType).forEach((cell) => {
      const metalId = shell[cell.id];
      if (!metalId || !METALS[metalId]) return;

      const metal = METALS[metalId];
      const { x, y } = cellToPixel(cell, gridType, cellSize, layerScale);
      const tx = burstX + x;
      const ty = burstY + y;
      const dotSize = cellSize * 0.5;

      drawLuminousDot(ctx, tx, ty, metal.color, dotSize, 1);
    });
  }

  /** Full-opacity pattern for export (from saved editor design). */
  drawFrozenPattern(ctx) {
    this.getBurstLayouts().forEach(
      ({ shell, burstX, burstY, shellCount, gridType, layerIndex }) => {
        this.drawShellPattern(ctx, shell, burstX, burstY, shellCount, gridType, layerIndex);
      }
    );
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

  loop(now = performance.now()) {
    const dt = Math.min(48, Math.max(8, now - (this.lastFrameTime || now)));
    this.lastFrameTime = now;

    this.clearCanvas();

    let active = false;

    this.rockets.forEach((rocket) => {
      rocket.elapsed += dt;
      if (rocket.elapsed < rocket.startDelay) {
        active = true;
        return;
      }

      if (!rocket.fired) {
        rocket.flightElapsed += dt;
        const t = Math.min(1, rocket.flightElapsed / rocket.flightMs);
        const eased = this.easeOutCubic(t);
        rocket.y = rocket.launchY + (rocket.targetY - rocket.launchY) * eased;

        if (t >= 0.04 && t < 1) {
          rocket.trail.push({ x: rocket.x, y: rocket.y, life: 1 });
          if (rocket.trail.length > 20) rocket.trail.shift();
        }

        if (t >= 1) {
          rocket.y = rocket.targetY;
          rocket.fired = true;
          this.burst(
            rocket.shell,
            rocket.burstX,
            rocket.burstY,
            rocket.shellCount,
            rocket.gridType,
            rocket.layerIndex
          );
        } else {
          active = true;
        }
      }
    });

    const allRocketsFired = this.rockets.every((r) => r.fired);
    this.schedulePatternFade(now);

    if (this.patternDots.length > 0) {
      this.patternDots.forEach((dot) => this.updatePatternDot(dot, dt));
      const patternVisible =
        this.patternFadeBegin == null ||
        now < this.patternFadeBegin + PATTERN_FADE_MS;
      if (patternVisible) active = true;
      if (
        this.patternFadeBegin != null &&
        now >= this.patternFadeBegin + PATTERN_FADE_MS
      ) {
        this.patternDots = [];
      }
    }

    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.985;
      p.vy *= 0.985;
      if (this.getSparkFadeProgress(p, now) >= 1) return false;
      active = true;
      return true;
    });

    if (!allRocketsFired && Math.random() < 0.012) {
      const expanded = this.patternDots.filter((d) => d.expand >= 0.85);
      if (expanded.length > 0) {
        const d = expanded[(Math.random() * expanded.length) | 0];
        const pos = this.getPatternDotPosition(d);
        this.particles.push({
          x: pos.x,
          y: pos.y,
          vx: (Math.random() - 0.5) * 0.6,
          vy: Math.random() * 0.4,
          fadeMs: SPARK_FADE_MS,
          fadeBegin: now,
          color: d.color,
          size: d.size * 0.55,
        });
      }
    }

    const trailAlpha = 1 - Math.pow(1 - TRAIL_FADE_ALPHA, dt / ROCKET_FRAME_MS);
    this.ctx.fillStyle = `rgba(5, 8, 24, ${trailAlpha})`;
    this.ctx.fillRect(0, 0, this.w, this.h);

    this.drawEffects(this.ctx, now);

    if (active) {
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    } else {
      this.running = false;
      this.rafId = null;
      this.hasFinishedLaunch = true;
      this.saveSnapshotFrame();
      this.buildFrozenSnapshot();
      if (this.onComplete) this.onComplete();
    }
  }

  clear() {
    this.clearCanvas();
    this.particles = [];
    this.rockets = [];
    this.patternDots = [];
    this.patternFadeBegin = null;
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
