/**
 * Pure High-Quality Full-Screen Background Scroll Animation Engine
 * 297 Native Quad-HD Frames (2160x1214)
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 334;
  const FRAME_PATH = (i) => `frames/frame${String(i).padStart(5, '0')}.png`;
  const LERP_FACTOR = 0.15; // Silky smooth deceleration
  const INITIAL_BATCH = 25; // Instant load priority

  // --- DOM Elements ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const progressLine = document.getElementById('progress-line');
  const hudFrame = document.getElementById('hud-frame');
  const minimalHud = document.getElementById('minimal-hud');
  const scrollPrompt = document.getElementById('scroll-prompt');
  const introLogoContainer = document.getElementById('intro-logo-container');

  const btnPlayPause = document.getElementById('btn-play-pause');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // --- State ---
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let renderedIndex = -1;
  let lastLoadedIndex = 0;
  let isAutoplaying = false;
  let hudTimeout = null;

  // --- High-DPI Canvas Sizing ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    if (renderedIndex >= 0) {
      drawFrame(renderedIndex);
    }
  }

  // --- Fullscreen Cover Draw Math ---
  function drawFrame(idx) {
    let img = images[idx];
    if (!img || !img.complete || img.naturalWidth === 0) {
      img = images[lastLoadedIndex];
      if (!img || !img.complete || img.naturalWidth === 0) return;
    } else {
      lastLoadedIndex = idx;
    }

    const cW = canvas.width;
    const cH = canvas.height;
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;

    const imgRatio = iW / iH;
    const canvasRatio = cW / cH;

    let dW, dH, dX, dY;

    if (canvasRatio > imgRatio) {
      dW = cW;
      dH = Math.round(cW / imgRatio);
      dX = 0;
      dY = Math.round((cH - dH) / 2);
    } else {
      dH = cH;
      dW = Math.round(cH * imgRatio);
      dX = Math.round((cW - dW) / 2);
      dY = 0;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dX, dY, dW, dH);
    renderedIndex = idx;
  }

  // --- Progressive Image Preloading ---
  function initLoading() {
    function onImgLoad(idx) {
      loadedCount++;
      if (idx === 0) {
        drawFrame(0);
      }
    }

    function loadImg(idx) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => onImgLoad(idx);
      img.src = FRAME_PATH(idx + 1);
      images[idx] = img;
    }

    // Stage 1: Load essential initial frames
    for (let i = 0; i < INITIAL_BATCH; i++) {
      loadImg(i);
    }

    // Stage 2: Stream remaining frames in background
    setTimeout(() => {
      for (let i = INITIAL_BATCH; i < TOTAL_FRAMES; i++) {
        loadImg(i);
      }
    }, 40);
  }

  // --- Scroll Tracking ---
  function computeProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  }

  // --- Animation Loop (RAF) ---
  function loop() {
    if (!isAutoplaying) {
      targetProgress = computeProgress();
    }

    // Smooth Lerp Interpolation
    const delta = targetProgress - currentProgress;
    if (Math.abs(delta) > 0.0001) {
      currentProgress += delta * LERP_FACTOR;
    } else {
      currentProgress = targetProgress;
    }

    // Map progress to frame index (0 to 296)
    const frameIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.floor(currentProgress * (TOTAL_FRAMES - 1)))
    );

    // Draw frame
    if (frameIndex !== renderedIndex) {
      drawFrame(frameIndex);
    }

    // Intro Logo Animation
    if (introLogoContainer) {
      if (frameIndex <= 15) {
        introLogoContainer.style.opacity = '1';
        introLogoContainer.style.transform = 'translate(-50%, -50%)';
      } else {
        const diff = frameIndex - 15;
        const logoOpacity = Math.max(0, 1 - (diff / 10)); // Fade out over 10 frames
        const logoTranslateY = -50 - (diff * 2); // Move up
        introLogoContainer.style.opacity = logoOpacity.toString();
        introLogoContainer.style.transform = `translate(-50%, ${logoTranslateY}%)`;
      }
    }

    // Update Progress Line & Counter
    const pct = (currentProgress * 100).toFixed(1);
    progressLine.style.width = `${pct}%`;
    hudFrame.textContent = String(frameIndex + 1).padStart(3, '0');

    // Autoplay progression
    if (isAutoplaying) {
      targetProgress += 0.0022;
      if (targetProgress >= 1) {
        targetProgress = 1;
        toggleAutoplay(false);
      }
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, targetProgress * maxScroll);
    }

    requestAnimationFrame(loop);
  }

  // --- Autoplay Toggle ---
  function toggleAutoplay(force) {
    isAutoplaying = typeof force === 'boolean' ? force : !isAutoplaying;
    if (isAutoplaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      if (targetProgress >= 0.99) {
        targetProgress = 0;
        currentProgress = 0;
      }
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
    showHudActivity();
  }

  btnPlayPause.addEventListener('click', () => toggleAutoplay());

  // --- HUD Activity & Idle Dimming ---
  function showHudActivity() {
    minimalHud.classList.add('active');
    if (scrollPrompt) scrollPrompt.classList.add('hidden');

    clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
      if (!isAutoplaying) {
        minimalHud.classList.remove('active');
      }
    }, 2500);
  }

  window.addEventListener('scroll', () => {
    if (isAutoplaying) toggleAutoplay(false);
    showHudActivity();
  }, { passive: true });

  window.addEventListener('mousemove', showHudActivity, { passive: true });
  window.addEventListener('touchstart', () => {
    if (isAutoplaying) toggleAutoplay(false);
    showHudActivity();
  }, { passive: true });

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggleAutoplay();
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      e.preventDefault();
      const nextProgress = Math.min(1, targetProgress + (1 / (TOTAL_FRAMES - 1)));
      targetProgress = nextProgress;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, nextProgress * maxScroll);
      showHudActivity();
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      e.preventDefault();
      const prevProgress = Math.max(0, targetProgress - (1 / (TOTAL_FRAMES - 1)));
      targetProgress = prevProgress;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, prevProgress * maxScroll);
      showHudActivity();
    } else if (e.code === 'KeyF') {
      toggleFullscreen();
    }
  });

  // --- Fullscreen ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  btnFullscreen.addEventListener('click', toggleFullscreen);

  // --- Initialization ---
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  initLoading();
  requestAnimationFrame(loop);

})();




