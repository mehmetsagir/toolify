export function getOverlayHTML(): string {
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
      animation: fadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
        transform: translateY(-10px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes fadeOut {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
    }
    .waveform-container.fade-out {
      animation: fadeOut 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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

      let currentLevel = 0;
      let audioHistory = new Array(barCount).fill(0);
      let targetLevel = 0;
      let isFadingOut = false;
      let containerOpacity = 0;
      let fadeInProgress = true;
      let isProcessing = false;

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
          targetLevel = Math.min(1, Math.max(0, rawLevel * 1.2));
        }
      });

      ipcRenderer.on('processing-state', (event, data) => {
        if (data && data.processing !== undefined) {
          isProcessing = data.processing;
          if (isProcessing) {
            // Don't add 'processing' class - keep normal colors
            canvas.classList.add('hidden');
            loader.classList.add('visible');
            checkmark.classList.remove('visible');
            targetLevel = 0;
          } else {
            // Don't need to remove 'processing' class since we don't add it
            canvas.classList.remove('hidden');
            loader.classList.remove('visible');
          }
        }
      });

      ipcRenderer.on('success-state', () => {
        // Show checkmark animation
        canvas.classList.add('hidden');
        loader.classList.remove('visible');
        checkmark.classList.add('visible');

        // Change container to success theme
        container.style.background = 'rgba(34, 197, 94, 0.15)';
        container.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        container.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(34, 197, 94, 0.1)';
      });

      ipcRenderer.on('fade-out', () => {
        if (!isFadingOut) {
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
      });

      function updateWaveform() {
        currentLevel += (targetLevel - currentLevel) * 0.3;
        audioHistory.shift();
        audioHistory.push(currentLevel);
        ctx.clearRect(0, 0, width, height);

        const canvasOpacity = fadeInProgress ? containerOpacity : (isFadingOut ? containerOpacity : 1);
        ctx.globalAlpha = canvasOpacity;

        const fadeZoneWidth = width * 0.2;

        audioHistory.forEach((level, index) => {
          const x = index * (barWidth + spacing);
          const barX = x;

          let edgeOpacity = 1;
          if (barX < fadeZoneWidth) {
            edgeOpacity = barX / fadeZoneWidth;
          } else if (barX > width - fadeZoneWidth) {
            edgeOpacity = (width - barX) / fadeZoneWidth;
          }

          const clampedLevel = level;
          const barHeight = clampedLevel * maxBarHeight;

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
          audioHistory = audioHistory.map(level => Math.max(0, level * 0.88));
        } else {
          if (targetLevel < 0.01) {
            audioHistory = audioHistory.map(level => Math.max(0, level * 0.92));
          }
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
