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
      width: 140px;
      height: 50px;
      padding: 8px 10px;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      animation: fadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
    }
  </style>
</head>
<body>
  <div class="waveform-container">
    <canvas id="waveformCanvas" width="140" height="50"></canvas>
  </div>
  <script>
    (function() {
      const canvas = document.getElementById('waveformCanvas');
      const container = document.querySelector('.waveform-container');
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      const barCount = 25;
      const spacing = 2.5;
      const barWidth = (width - (spacing * (barCount - 1))) / barCount;
      const centerY = height / 2;
      const maxBarHeight = height * 0.75;

      let currentLevel = 0;
      let audioHistory = new Array(barCount).fill(0);
      let targetLevel = 0;
      let isFadingOut = false;
      let containerOpacity = 0;
      let fadeInProgress = true;

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
          targetLevel = Math.min(1, Math.max(0, rawLevel * 0.7));
        }
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

