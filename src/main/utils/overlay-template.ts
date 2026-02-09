// Compact overlay - original small design
export function getCompactOverlayHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      overflow: hidden;
    }
    .waveform-container {
      width: 100px;
      height: 40px;
      padding: 8px 12px;
      background: rgba(24, 24, 27, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      animation: fadeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      -webkit-app-region: drag;
      cursor: grab;
      user-select: none;
    }
    .waveform-container:hover {
      background: rgba(24, 24, 27, 0.98);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .waveform-container.processing {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1);
    }
    @keyframes fadeIn {
      0% {
        opacity: 0;
        transform: scale(0);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0);
      }
    }
    .waveform-container.fade-out {
      animation: fadeOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
    canvas {
      width: 100%;
      height: 100%;
      opacity: 1;
      transition: opacity 0.3s ease-out;
      display: block;
    }
    canvas.hidden {
      display: none;
    }
    .loader {
      display: none;
      position: relative;
      width: 20px;
      height: 20px;
    }
    .loader.visible {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loader-dots {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    .loader-dot {
      width: 4px;
      height: 4px;
      background: rgba(59, 130, 246, 1);
      border-radius: 50%;
      animation: pulse 1.4s ease-in-out infinite;
    }
    .loader-dot:nth-child(1) {
      animation-delay: 0s;
    }
    .loader-dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    .loader-dot:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.3);
        opacity: 1;
      }
    }
    .checkmark {
      display: none;
      width: 24px;
      height: 24px;
    }
    .checkmark.visible {
      display: block;
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .checkmark-circle {
      stroke: rgba(34, 197, 94, 1);
      stroke-width: 2;
      fill: none;
      stroke-dasharray: 75;
      stroke-dashoffset: 75;
      animation: drawCircle 0.4s ease-out forwards;
    }
    .checkmark-check {
      stroke: rgba(34, 197, 94, 1);
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 20;
      stroke-dashoffset: 20;
      animation: drawCheck 0.3s ease-out 0.3s forwards;
    }
    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    @keyframes drawCircle {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes drawCheck {
      to {
        stroke-dashoffset: 0;
      }
    }
    .content-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="waveform-container">
    <div class="content-wrapper">
      <canvas id="waveformCanvas" width="80" height="24"></canvas>
      <div class="loader" id="loader">
        <div class="loader-dots">
          <div class="loader-dot"></div>
          <div class="loader-dot"></div>
          <div class="loader-dot"></div>
        </div>
      </div>
      <svg class="checkmark" id="checkmark" viewBox="0 0 24 24">
        <circle class="checkmark-circle" cx="12" cy="12" r="10"/>
        <path class="checkmark-check" d="M7 12l3 3 7-7"/>
      </svg>
    </div>
  </div>
  <script>
    (function() {
      const canvas = document.getElementById('waveformCanvas');
      const container = document.querySelector('.waveform-container');
      const loader = document.getElementById('loader');
      const checkmark = document.getElementById('checkmark');
      if (!canvas || !container || !loader || !checkmark) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      const barCount = 16;
      const spacing = 2;
      const barWidth = (width - (spacing * (barCount - 1))) / barCount;
      const centerY = height / 2;
      const maxBarHeight = height * 0.7;

      let targetLevel = 0;
      let targetSpectrum = new Array(barCount).fill(0);
      let barLevels = new Array(barCount).fill(0);
      let isFadingOut = false;
      let containerOpacity = 0;
      let fadeInProgress = true;
      let isProcessing = false;
      const SILENCE_LEVEL = 0.04;
      const SILENCE_FRAMES = 6;
      const LEVEL_NOISE_GATE = 0.25;
      const SPECTRUM_NOISE_GATE = 0.12;
      let silentFrames = 0;

      const fadeInInterval = setInterval(() => {
        if (containerOpacity < 1) {
          containerOpacity = Math.min(1, containerOpacity + 0.05);
          container.style.opacity = containerOpacity;
        } else {
          fadeInProgress = false;
          clearInterval(fadeInInterval);
        }
      }, 16);

      const { ipcRenderer } = require('electron');

      ipcRenderer.on('audio-level-update', (event, data) => {
        if (data && data.level !== undefined) {
          const rawLevel = data.level / 100;
          // Apply heavier noise gate so tiny ambient sounds don't animate bars
          const adjustedLevel = Math.max(0, rawLevel - LEVEL_NOISE_GATE) * 2.1;
          targetLevel = Math.min(1, adjustedLevel);
        }

        if (data && Array.isArray(data.spectrum)) {
          mapSpectrumToBars(data.spectrum);
        } else if (data && data.level !== undefined) {
          mapSpectrumToBars(new Array(barCount).fill(targetLevel));
        }
      });

      function resetSpectrum(value) {
        targetSpectrum = new Array(barCount).fill(value);
      }

      function resampleSpectrum(sourceLevels, targetSize) {
        if (!Array.isArray(sourceLevels) || sourceLevels.length === 0 || targetSize <= 0) {
          return [];
        }

        const normalized = sourceLevels.map((value) => {
          if (typeof value !== 'number' || Number.isNaN(value)) {
            return 0;
          }
          const clamped = Math.max(0, Math.min(1, value));
          if (clamped <= SPECTRUM_NOISE_GATE) {
            return 0;
          }
          // Re-scale remaining values so real speech still animates fully
          return Math.min(1, (clamped - SPECTRUM_NOISE_GATE) / (1 - SPECTRUM_NOISE_GATE));
        });

        const maxIndex = normalized.length - 1;
        if (maxIndex <= 0) {
          return new Array(targetSize).fill(normalized[0] || 0);
        }

        const divisor = Math.max(1, targetSize - 1);
        const mapped = [];
        for (let i = 0; i < targetSize; i++) {
          const position = (i / divisor) * maxIndex;
          const leftIndex = Math.floor(position);
          const rightIndex = Math.min(maxIndex, Math.ceil(position));
          const mix = position - leftIndex;
          const interpolated =
            normalized[leftIndex] + (normalized[rightIndex] - normalized[leftIndex]) * mix;
          mapped.push(interpolated);
        }

        return mapped;
      }

      function mapSpectrumToBars(sourceLevels) {
        const hasCenterBar = barCount % 2 !== 0;
        const pairCount = Math.floor(barCount / 2);
        const requiredValues = hasCenterBar ? pairCount + 1 : pairCount;

        if (requiredValues <= 0) {
          resetSpectrum(targetLevel);
          return;
        }

        const sampled = resampleSpectrum(sourceLevels, requiredValues);
        if (sampled.length === 0) {
          resetSpectrum(targetLevel);
          return;
        }

        if (hasCenterBar) {
          const centerIndex = Math.floor(barCount / 2);
          targetSpectrum[centerIndex] = sampled[0];
          for (let i = 1; i < sampled.length; i++) {
            const value = sampled[i];
            const offset = i;
            const leftIndex = centerIndex - offset;
            const rightIndex = centerIndex + offset;
            if (leftIndex >= 0) {
              targetSpectrum[leftIndex] = value;
            }
            if (rightIndex < barCount) {
              targetSpectrum[rightIndex] = value;
            }
          }
        } else {
          for (let i = 0; i < pairCount; i++) {
            const value = sampled[i];
            const leftIndex = pairCount - 1 - i;
            const rightIndex = pairCount + i;
            if (leftIndex >= 0) {
              targetSpectrum[leftIndex] = value;
            }
            if (rightIndex < barCount) {
              targetSpectrum[rightIndex] = value;
            }
          }
        }

        applyEdgeSpread();
      }

      function applyEdgeSpread() {
        if (barCount <= 1) return;
        const center = (barCount - 1) / 2;
        const maxDistance = center === 0 ? 1 : center;
        for (let i = 0; i < barCount; i++) {
          const distance = Math.abs(i - center) / maxDistance;
          const weight = 1 + distance * 0.4;
          targetSpectrum[i] = Math.min(1, targetSpectrum[i] * weight);
        }
      }

      function updateBars() {
        const time = Date.now() / 100;
        const averageLevel =
          targetSpectrum.reduce((sum, value) => sum + value, 0) /
          Math.max(1, targetSpectrum.length);
        const isInstantSilent = targetLevel < SILENCE_LEVEL && averageLevel < SILENCE_LEVEL;
        if (isInstantSilent) {
          silentFrames = Math.min(SILENCE_FRAMES + 1, silentFrames + 1);
        } else {
          silentFrames = Math.max(0, silentFrames - 1);
        }
        const fullySilent = silentFrames >= SILENCE_FRAMES;
        const minLevel = fullySilent ? 0.006 : 0.05;
        const waveScale = fullySilent ? 0.12 : 1;
        const levelBoost = fullySilent ? 0.92 : 1.1;
        const smoothing = fullySilent ? 0.2 : 0.35;

        for (let i = 0; i < barCount; i++) {
          const spectrumValue =
            targetSpectrum[i] !== undefined ? targetSpectrum[i] : targetLevel;

          // Keep a hint of subtle wave so idle state feels alive without overpowering real data
          const waveMotion = Math.sin(time * 2.2 + i * 0.35) * 0.02 * waveScale;

          const target = Math.max(
            minLevel,
            Math.min(1, spectrumValue * levelBoost + waveMotion)
          );

          // Fast smoothing for responsive audio visualization
          barLevels[i] += (target - barLevels[i]) * smoothing;
          barLevels[i] = Math.max(minLevel, Math.min(1, barLevels[i]));
        }
      }

      ipcRenderer.on('processing-state', (event, data) => {
        if (data && data.processing !== undefined) {
          isProcessing = data.processing;
          if (isProcessing) {
            canvas.classList.add('hidden');
            loader.classList.add('visible');
            checkmark.classList.remove('visible');
            targetLevel = 0;
            resetSpectrum(0);
          } else {
            canvas.classList.remove('hidden');
            loader.classList.remove('visible');
          }
        }
      });

      ipcRenderer.on('success-state', () => {
        canvas.classList.add('hidden');
        loader.classList.remove('visible');
        checkmark.classList.add('visible');

        container.style.background = 'rgba(34, 197, 94, 0.15)';
        container.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        container.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(34, 197, 94, 0.1)';
        resetSpectrum(0);
      });

      let fadeOutTimeout = null;

      function startFadeOut() {
        if (isFadingOut) return;
        isFadingOut = true;
        container.classList.add('fade-out');
        const fadeOutInterval = setInterval(() => {
          if (containerOpacity > 0) {
            containerOpacity = Math.max(0, containerOpacity - 0.03);
            container.style.opacity = containerOpacity;
          } else {
            clearInterval(fadeOutInterval);
          }
        }, 16);
      }

      ipcRenderer.on('fade-out', () => {
        const shouldDelay = checkmark.classList.contains('visible');
        if (shouldDelay) {
          if (fadeOutTimeout) return;
          fadeOutTimeout = setTimeout(() => {
            fadeOutTimeout = null;
            startFadeOut();
          }, 600);
        } else {
          startFadeOut();
        }
      });

      function updateWaveform() {
        updateBars();

        ctx.clearRect(0, 0, width, height);

        const canvasOpacity = fadeInProgress ? containerOpacity : (isFadingOut ? containerOpacity : 1);
        ctx.globalAlpha = canvasOpacity;

        const fadeZoneWidth = width * 0.2;

        barLevels.forEach((level, index) => {
          const x = index * (barWidth + spacing);
          const barX = x;

          let edgeOpacity = 1;
          if (barX < fadeZoneWidth) {
            edgeOpacity = barX / fadeZoneWidth;
          } else if (barX > width - fadeZoneWidth) {
            edgeOpacity = (width - barX) / fadeZoneWidth;
          }

          const clampedLevel = level;
          // Minimum height so dots always visible
          const minBarHeight = 2;
          const barHeight = minBarHeight + (clampedLevel * (maxBarHeight - minBarHeight));

          if (edgeOpacity < 0.01) return;

          ctx.globalAlpha = canvasOpacity * edgeOpacity;

          const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
          const intensity = Math.min(1, clampedLevel * 1.1);
          const red = 255;
          const green = 0;
          const blue = 0;
          const opacity = 0.7 + (intensity * 0.3);

          gradient.addColorStop(0, \`rgba(\${red}, \${green}, \${blue}, \${opacity * 0.9})\`);
          gradient.addColorStop(0.3, \`rgba(\${red}, \${green}, \${blue}, \${opacity})\`);
          gradient.addColorStop(0.7, \`rgba(\${red}, \${green}, \${blue}, \${opacity})\`);
          gradient.addColorStop(1, \`rgba(\${red}, \${green}, \${blue}, \${opacity * 0.85})\`);

          ctx.fillStyle = gradient;

          const barY = centerY - barHeight / 2;
          const radius = Math.min(barWidth / 2, 3);

          ctx.beginPath();
          ctx.moveTo(barX + radius, barY);
          ctx.lineTo(barX + barWidth - radius, barY);
          ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
          ctx.lineTo(barX + barWidth, barY + barHeight - radius);
          ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - radius, barY + barHeight);
          ctx.lineTo(barX + radius, barY + barHeight);
          ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius);
          ctx.lineTo(barX, barY + radius);
          ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
          ctx.closePath();
          ctx.fill();
        });
      }

      updateWaveform();

      function animate() {
        if (isFadingOut) {
          barLevels = barLevels.map((level) => Math.max(0, level * 0.88));
        } else if (targetLevel < 0.01) {
          barLevels = barLevels.map((level) => Math.max(0, level * 0.92));
        }
        updateWaveform();
        requestAnimationFrame(animate);
      }

      ctx.globalAlpha = 1;
      animate();
    })();
  </script>
</body>
</html>
`
}

// Large overlay - simple horizontal waveform with bottom info bar
export function getLargeOverlayHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      background: transparent;
      overflow: hidden;
    }
    .overlay-container {
      width: 400px;
      background: linear-gradient(184deg, rgba(16, 17, 26, 0.97), rgba(7, 8, 12, 0.94));
      backdrop-filter: blur(22px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 18px;
      box-shadow: 0 22px 58px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.015);
      opacity: 0;
      animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      -webkit-app-region: drag;
      user-select: none;
      position: relative;
      overflow: hidden;
      --accent-main: #f87171;
      --accent-soft: rgba(248, 113, 113, 0.2);
      --accent-glow: rgba(248, 113, 113, 0.35);
      --accent-shadow: rgba(248, 113, 113, 0.35);
    }
    .overlay-container.processing {
      --accent-main: #60a5fa;
      --accent-soft: rgba(96, 165, 250, 0.23);
      --accent-glow: rgba(96, 165, 250, 0.35);
      --accent-shadow: rgba(96, 165, 250, 0.4);
    }
    .overlay-container.success {
      --accent-main: #4ade80;
      --accent-soft: rgba(74, 222, 128, 0.25);
      --accent-glow: rgba(34, 197, 94, 0.35);
      --accent-shadow: rgba(34, 197, 94, 0.4);
    }
    .overlay-container::before {
      content: '';
      position: absolute;
      inset: -60px;
      background: radial-gradient(circle, var(--accent-glow), transparent 82%);
      opacity: 0.22;
      filter: blur(65px);
      transition: opacity 0.3s ease, background 0.3s ease;
      z-index: 0;
    }
    .overlay-container::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
      mix-blend-mode: soft-light;
      pointer-events: none;
      z-index: 0;
      opacity: 0.35;
    }
    .overlay-container > * {
      position: relative;
      z-index: 1;
    }
    @keyframes slideUp {
      0% {
        opacity: 0;
        transform: scale(0);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0);
      }
    }
    .overlay-container.fade-out {
      animation: fadeOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    /* Waveform Section */
    .waveform-section {
      padding: 14px 20px;
      position: relative;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, rgba(22, 24, 34, 0.98), rgba(11, 12, 18, 0.95));
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .waveform-section::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(255, 255, 255, 0.06), transparent 70%);
      opacity: 0.5;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    #waveformCanvas {
      display: block;
      position: relative;
      z-index: 2;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
    }
    #waveformCanvas.hidden {
      display: none;
    }

    /* Transcription Section */
    .transcription-section {
      padding: 8px 16px;
      max-height: 72px;
      background: rgba(10, 11, 17, 0.88);
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .transcription-section::-webkit-scrollbar {
      display: none;
    }
    .transcription-section.hidden {
      display: none;
    }
    .transcription-text {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Bottom Info Bar */
    .info-bar {
      padding: 14px 16px;
      height: 42px;
      background: rgba(10, 11, 17, 0.93);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-labels {
      display: flex;
      align-items: baseline;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-main);
      animation: pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
      opacity: 0.9;
      box-shadow: 0 0 10px var(--accent-shadow);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .status-dot.processing {
      background: #60a5fa;
    }
    .status-dot.success {
      background: #4ade80;
      animation: none;
    }
    .status-text {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }
    .status-duration {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
      min-width: 52px;
      margin-left: 6px;
    }

    .shortcuts {
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0.95;
    }
    .shortcut {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.55);
    }
    .shortcut-key {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.04);
    }

    /* Loading State */
    .loader {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .loader.visible {
      display: block;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Success State */
    .success-indicator {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .success-indicator.visible {
      display: block;
    }
    .success-icon {
      width: 28px;
      height: 28px;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .success-icon svg {
      width: 16px;
      height: 16px;
    }
  </style>
</head>
<body>
  <div class="overlay-container" id="overlayContainer">
    <div class="waveform-section">
      <canvas id="waveformCanvas" width="368" height="30"></canvas>
      <div class="loader" id="loader">
        <div class="spinner"></div>
      </div>
      <div class="success-indicator" id="successIndicator">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 12L10 15L17 8" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="transcription-section hidden" id="transcriptionSection">
      <span class="transcription-text" id="transcriptionText"></span>
    </div>

    <div class="info-bar">
      <div class="status">
        <div class="status-dot" id="statusDot"></div>
        <div class="status-labels">
          <span class="status-text" id="statusText">Recording</span>
          <span class="status-duration" id="statusDuration">(00:00)</span>
        </div>
      </div>
      <div class="shortcuts">
        <div class="shortcut">
          <span class="shortcut-key">Esc</span>
          <span>to cancel</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const canvas = document.getElementById('waveformCanvas');
      const container = document.getElementById('overlayContainer');
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      const statusDuration = document.getElementById('statusDuration');
      const loader = document.getElementById('loader');
      const successIndicator = document.getElementById('successIndicator');
      const transcriptionSection = document.getElementById('transcriptionSection');
      const transcriptionText = document.getElementById('transcriptionText');
      if (!canvas || !container || !statusDot || !statusText || !loader || !successIndicator) return;
      if (statusDuration) {
        statusDuration.textContent = '(00:00)';
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      const barCount = 60;
      const spacing = 3;
      const barWidth = (width - (spacing * (barCount - 1))) / barCount;
      const centerY = height / 2;
      const maxBarHeight = height * 0.75;

      let targetLevel = 0;
      let targetSpectrum = new Array(barCount).fill(0);
      let barLevels = new Array(barCount).fill(0);
      let isFadingOut = false;
      let isProcessing = false;
      let overlayState = 'recording';
      const SILENCE_LEVEL = 0.045;
      const SILENCE_FRAMES = 6;
      const LEVEL_NOISE_GATE = 0.25;
      const SPECTRUM_NOISE_GATE = 0.12;
      let silentFrames = 0;
      let isSuccessState = false;
      const SUCCESS_HOLD_MS = 1200;

      const stateColorMap = {
        recording: {
          start: 'rgba(248, 113, 113, 0.95)',
          end: 'rgba(239, 68, 68, 0.85)',
          shadow: 'rgba(248, 113, 113, 0.45)'
        },
        processing: {
          start: 'rgba(147, 197, 253, 0.95)',
          end: 'rgba(59, 130, 246, 0.85)',
          shadow: 'rgba(96, 165, 250, 0.45)'
        },
        success: {
          start: 'rgba(134, 239, 172, 0.95)',
          end: 'rgba(34, 197, 94, 0.85)',
          shadow: 'rgba(34, 197, 94, 0.45)'
        }
      };

      let currentWaveColors = stateColorMap.recording;

      function setOverlayState(nextState) {
        overlayState = nextState;
        currentWaveColors = stateColorMap[nextState] || stateColorMap.recording;

        container.classList.remove('recording', 'processing', 'success');
        container.classList.add(nextState);

        statusDot.classList.remove('processing', 'success');
        if (nextState === 'processing') {
          statusDot.classList.add('processing');
          statusText.textContent = 'Processing';
          if (statusDuration) statusDuration.textContent = '';
        } else if (nextState === 'success') {
          statusDot.classList.add('success');
          statusText.textContent = 'Complete';
          if (statusDuration) statusDuration.textContent = '';
        } else {
          statusText.textContent = 'Recording';
          if (statusDuration && statusDuration.textContent.trim() === '') {
            statusDuration.textContent = '(00:00)';
          }
        }
      }

      setOverlayState('recording');

      const { ipcRenderer } = require('electron');

      ipcRenderer.on('audio-level-update', (event, data) => {
        if (data && data.level !== undefined) {
          const rawLevel = data.level / 100;
          // Apply stronger noise gate to ignore ambient hiss completely
          const adjustedLevel = Math.max(0, rawLevel - LEVEL_NOISE_GATE) * 2.4;
          targetLevel = Math.min(1, adjustedLevel);
        }

        if (data && Array.isArray(data.spectrum)) {
          mapSpectrumToBars(data.spectrum);
        } else if (data && data.level !== undefined) {
          mapSpectrumToBars(new Array(barCount).fill(targetLevel));
        }

        if (
          statusDuration &&
          overlayState === 'recording' &&
          typeof data.durationMs === 'number'
        ) {
          statusDuration.textContent = '(' + formatDuration(data.durationMs) + ')';
        }
      });

      function resetSpectrum(value) {
        targetSpectrum = new Array(barCount).fill(value);
      }

      function resampleSpectrum(sourceLevels, targetSize) {
        if (!Array.isArray(sourceLevels) || sourceLevels.length === 0 || targetSize <= 0) {
          return [];
        }

        const normalized = sourceLevels.map((value) => {
          if (typeof value !== 'number' || Number.isNaN(value)) {
            return 0;
          }
          const clamped = Math.max(0, Math.min(1, value));
          if (clamped <= SPECTRUM_NOISE_GATE) {
            return 0;
          }
          return Math.min(1, (clamped - SPECTRUM_NOISE_GATE) / (1 - SPECTRUM_NOISE_GATE));
        });

        const maxIndex = normalized.length - 1;
        if (maxIndex <= 0) {
          return new Array(targetSize).fill(normalized[0] || 0);
        }

        const divisor = Math.max(1, targetSize - 1);
        const mapped = [];
        for (let i = 0; i < targetSize; i++) {
          const position = (i / divisor) * maxIndex;
          const leftIndex = Math.floor(position);
          const rightIndex = Math.min(maxIndex, Math.ceil(position));
          const mix = position - leftIndex;
          const interpolated =
            normalized[leftIndex] + (normalized[rightIndex] - normalized[leftIndex]) * mix;
          mapped.push(interpolated);
        }

        return mapped;
      }

      function mapSpectrumToBars(sourceLevels) {
        const hasCenterBar = barCount % 2 !== 0;
        const pairCount = Math.floor(barCount / 2);
        const requiredValues = hasCenterBar ? pairCount + 1 : pairCount;

        if (requiredValues <= 0) {
          resetSpectrum(targetLevel);
          return;
        }

        const sampled = resampleSpectrum(sourceLevels, requiredValues);
        if (sampled.length === 0) {
          resetSpectrum(targetLevel);
          return;
        }

        if (hasCenterBar) {
          const centerIndex = Math.floor(barCount / 2);
          targetSpectrum[centerIndex] = sampled[0];
          for (let i = 1; i < sampled.length; i++) {
            const value = sampled[i];
            const offset = i;
            const leftIndex = centerIndex - offset;
            const rightIndex = centerIndex + offset;
            if (leftIndex >= 0) {
              targetSpectrum[leftIndex] = value;
            }
            if (rightIndex < barCount) {
              targetSpectrum[rightIndex] = value;
            }
          }
        } else {
          for (let i = 0; i < pairCount; i++) {
            const value = sampled[i];
            const leftIndex = pairCount - 1 - i;
            const rightIndex = pairCount + i;
            if (leftIndex >= 0) {
              targetSpectrum[leftIndex] = value;
            }
            if (rightIndex < barCount) {
              targetSpectrum[rightIndex] = value;
            }
          }
        }

        applyEdgeSpread();
      }

      function applyEdgeSpread() {
        if (barCount <= 1) return;
        const center = (barCount - 1) / 2;
        const maxDistance = center === 0 ? 1 : center;
        for (let i = 0; i < barCount; i++) {
          const distance = Math.abs(i - center) / maxDistance;
          const weight = 1 + distance * 0.35;
          targetSpectrum[i] = Math.min(1, targetSpectrum[i] * weight);
        }
      }

      function formatDuration(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return minutes + ':' + seconds;
      }

      function updateBars() {
        const time = Date.now() / 100;
        const averageLevel =
          targetSpectrum.reduce((sum, value) => sum + value, 0) /
          Math.max(1, targetSpectrum.length);
        const isInstantSilent = targetLevel < SILENCE_LEVEL && averageLevel < SILENCE_LEVEL;
        if (isInstantSilent) {
          silentFrames = Math.min(SILENCE_FRAMES + 1, silentFrames + 1);
        } else {
          silentFrames = Math.max(0, silentFrames - 1);
        }
        const fullySilent = silentFrames >= SILENCE_FRAMES;
        const minLevel = fullySilent ? 0.005 : 0.04;
        const waveScale = fullySilent ? 0.15 : 1;
        const levelBoost = fullySilent ? 0.95 : 1.08;
        const smoothing = fullySilent ? 0.22 : 0.32;

        for (let i = 0; i < barCount; i++) {
          const spectrumValue =
            targetSpectrum[i] !== undefined ? targetSpectrum[i] : targetLevel;

          const waveMotion = Math.sin(time * 2.4 + i * 0.25) * 0.025 * waveScale;

          const target = Math.max(
            minLevel,
            Math.min(1, spectrumValue * levelBoost + waveMotion)
          );

          // Fast smoothing for responsive audio visualization
          barLevels[i] += (target - barLevels[i]) * smoothing;
          barLevels[i] = Math.max(minLevel, Math.min(1, barLevels[i]));
        }
      }

      ipcRenderer.on('processing-state', (event, data) => {
        if (data && data.processing !== undefined) {
          isProcessing = data.processing;
          if (isProcessing) {
            // Hide transcription when processing starts
            if (transcriptionSection) {
              transcriptionSection.classList.add('hidden');
              requestAnimationFrame(function() {
                var h = container.getBoundingClientRect().height;
                ipcRenderer.send('overlay-resize-height', Math.ceil(h));
              });
            }
            // Only transition to processing if not in success state
            if (!isSuccessState) {
              setOverlayState('processing');
              canvas.classList.add('hidden');
              loader.classList.add('visible');
              successIndicator.classList.remove('visible');
              targetLevel = 0;
              resetSpectrum(0);
            }
          } else if (overlayState !== 'success' && !isSuccessState) {
            setOverlayState('recording');
            canvas.classList.remove('hidden');
            loader.classList.remove('visible');
          }
        }
      });

      ipcRenderer.on('success-state', () => {
        isSuccessState = true;
        setOverlayState('success');
        canvas.classList.add('hidden');
        loader.classList.remove('visible');
        successIndicator.classList.add('visible');
        resetSpectrum(0);

        // Hide transcription on success
        if (transcriptionSection) {
          transcriptionSection.classList.add('hidden');
        }

        // Cancel any pending fade-out when success is shown
        if (fadeOutTimeout) {
          clearTimeout(fadeOutTimeout);
          fadeOutTimeout = null;
        }

        // Auto-fade after SUCCESS_HOLD_MS
        fadeOutTimeout = setTimeout(() => {
          fadeOutTimeout = null;
          startFadeOut();
        }, SUCCESS_HOLD_MS);
      });

      ipcRenderer.on('transcription-update', (event, data) => {
        if (!transcriptionSection || !transcriptionText) return;
        if (data && typeof data.text === 'string' && data.text.length > 0) {
          var wasHidden = transcriptionSection.classList.contains('hidden');
          transcriptionSection.classList.remove('hidden');
          transcriptionText.textContent = data.text;
          // Auto-scroll to bottom
          transcriptionSection.scrollTop = transcriptionSection.scrollHeight;
          // Request window resize to fit content
          requestAnimationFrame(function() {
            var h = container.getBoundingClientRect().height;
            ipcRenderer.send('overlay-resize-height', Math.ceil(h));
          });
        }
      });

      let fadeOutTimeout = null;

      function startFadeOut() {
        if (isFadingOut) return;
        isFadingOut = true;
        container.classList.add('fade-out');
      }

      ipcRenderer.on('fade-out', () => {
        // If success is active, ignore fade-out - we handle it ourselves with timeout
        if (isSuccessState && successIndicator.classList.contains('visible')) {
          return;
        }
        startFadeOut();
      });

      function updateWaveform() {
        updateBars();

        ctx.clearRect(0, 0, width, height);

        const fadeZoneWidth = width * 0.08;

        barLevels.forEach((level, index) => {
          const x = index * (barWidth + spacing);
          const barX = x;

          let edgeOpacity = 1;
          if (barX < fadeZoneWidth) {
            edgeOpacity = barX / fadeZoneWidth;
          } else if (barX > width - fadeZoneWidth) {
            edgeOpacity = (width - barX) / fadeZoneWidth;
          }

          const clampedLevel = level;
          // Minimum height so dots always visible
          const minBarHeight = 2;
          const barHeight = minBarHeight + (clampedLevel * (maxBarHeight - minBarHeight));

          if (edgeOpacity < 0.01) return;

          ctx.globalAlpha = edgeOpacity;

          const gradient = ctx.createLinearGradient(
            x,
            centerY - barHeight / 2,
            x,
            centerY + barHeight / 2
          );
          gradient.addColorStop(0, currentWaveColors.start);
          gradient.addColorStop(1, currentWaveColors.end);
          ctx.fillStyle = gradient;

          const barY = centerY - barHeight / 2;
          const radius = barWidth / 2;

          ctx.beginPath();
          ctx.roundRect(barX, barY, barWidth, barHeight, radius);
          ctx.fill();
        });

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      function animate() {
        if (isFadingOut || isProcessing) {
          barLevels = barLevels.map((level) => Math.max(0, level * 0.9));
        } else if (targetLevel < 0.01) {
          barLevels = barLevels.map((level) => Math.max(0, level * 0.94));
        }
        updateWaveform();
        requestAnimationFrame(animate);
      }

      ctx.globalAlpha = 1;
      animate();
    })();
  </script>
</body>
</html>
`
}
