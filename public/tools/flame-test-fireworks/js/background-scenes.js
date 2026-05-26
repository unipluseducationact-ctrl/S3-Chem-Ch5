/* Background scene registry (UTF-8) */
const BACKGROUND_SCENES = [
  {
    id: 'city-skyline',
    src: 'assets/backgrounds/city-skyline.png',
    labelEn: 'City Skyline (Dimmer)',
    labelZh: '\u57CE\u5E02\u591C\u666F\uFF08\u8F03\u6697\uFF09',
  },
  {
    id: 'city-skyline-1',
    src: 'assets/backgrounds/city-skyline-1.png',
    labelEn: 'City Skyline',
    labelZh: '\u57CE\u5E02\u591C\u666F',
  },
  {
    id: 'city-skyline-2',
    src: 'assets/backgrounds/city-skyline-2.png',
    labelEn: 'City Skyline 2',
    labelZh: '\u57CE\u5E02\u591C\u666F 2',
  },
  {
    id: 'city-skyline-3',
    src: 'assets/backgrounds/city-skyline-3.png',
    labelEn: 'Lakeside Night',
    labelZh: '\u6E56\u7554\u591C\u666F',
  },
  {
    id: 'city-skyline-4',
    src: 'assets/backgrounds/city-skyline-4.png',
    labelEn: 'Lakeside Night 2',
    labelZh: '\u6E56\u7554\u591C\u666F 2',
  },
  {
    id: 'city-skyline-5',
    src: 'assets/backgrounds/city-skyline-5.png',
    labelEn: 'Lakeside Night 3',
    labelZh: '\u6E56\u7554\u591C\u666F 3',
  },
];

const sceneImageCache = new Map();

function getSceneById(id) {
  return BACKGROUND_SCENES.find((s) => s.id === id) || BACKGROUND_SCENES[0];
}

/** Data URLs avoid canvas taint when opening index.html via file:// */
function getSceneExportSrc(scene) {
  if (typeof SCENE_DATA_URLS !== 'undefined' && SCENE_DATA_URLS[scene.id]) {
    return SCENE_DATA_URLS[scene.id];
  }
  return scene.src;
}

function loadSceneImage(scene) {
  if (sceneImageCache.has(scene.id)) {
    return Promise.resolve(sceneImageCache.get(scene.id));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      sceneImageCache.set(scene.id, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = getSceneExportSrc(scene);
  });
}

function preloadAllScenes() {
  return Promise.all(BACKGROUND_SCENES.map((scene) => loadSceneImage(scene)));
}

function drawImageCover(ctx, img, w, h) {
  if (!img || !img.naturalWidth) return;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
}

function downloadCanvasPng(canvas, filename) {
  return new Promise((resolve, reject) => {
    const fail = (err) => reject(err || new Error('Download failed'));

    const trigger = (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (url.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      resolve();
    };

    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            try {
              trigger(canvas.toDataURL('image/png'));
            } catch (e) {
              fail(e);
            }
            return;
          }
          trigger(URL.createObjectURL(blob));
        },
        'image/png',
        1
      );
      return;
    }

    try {
      trigger(canvas.toDataURL('image/png'));
    } catch (e) {
      fail(e);
    }
  });
}
