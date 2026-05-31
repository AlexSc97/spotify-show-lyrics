// src/ui/renderer.js
const { ipcRenderer } = require('electron');

const container = document.getElementById('lyrics-container');
const dragHandle = document.getElementById('drag-handle');
const btnMinus = document.getElementById('btn-text-minus');
const btnPlus = document.getElementById('btn-text-plus');
const btnTranslateToggle = document.getElementById('btn-translate-toggle');

let currentFontSize = 22;
let showTranslation = true;

function updateTranslateButton() {
  if (btnTranslateToggle) {
    if (showTranslation) {
      btnTranslateToggle.classList.add('active-btn');
      btnTranslateToggle.innerText = 'ES: ON';
    } else {
      btnTranslateToggle.classList.remove('active-btn');
      btnTranslateToggle.innerText = 'ES: OFF';
    }
  }
}

if (btnTranslateToggle) {
  btnTranslateToggle.addEventListener('click', () => {
    showTranslation = !showTranslation;
    updateTranslateButton();
  });
}

ipcRenderer.on('toggle-translation', () => {
  showTranslation = !showTranslation;
  updateTranslateButton();
});

btnMinus.addEventListener('click', () => {
  currentFontSize = Math.max(12, currentFontSize - 2);
  container.style.fontSize = `${currentFontSize}px`;
});

btnPlus.addEventListener('click', () => {
  currentFontSize = Math.min(60, currentFontSize + 2);
  container.style.fontSize = `${currentFontSize}px`;
});

ipcRenderer.on('ghost-mode-toggled', (event, isGhost) => {
  if (isGhost) {
    dragHandle.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    dragHandle.classList.remove('hidden');
    document.body.style.overflow = 'auto';
  }
});

let currentLyrics = [];

ipcRenderer.on('track-changed', (event, { artist, title }) => {
  container.innerHTML = `<div class="lyric-line active">Buscando letra para:<br>${artist} - ${title}...</div>`;
  currentLyrics = [];
});

ipcRenderer.on('lyrics-updated', (event, lyrics) => {
  currentLyrics = lyrics || [];
  if (currentLyrics.length === 0) {
    container.innerHTML = `<div class="lyric-line active">Letra no disponible</div>`;
  } else {
    container.innerHTML = '';
  }
});

const btnOffsetMinus = document.getElementById('btn-offset-minus');
const btnOffsetPlus = document.getElementById('btn-offset-plus');
const offsetDisplay = document.getElementById('offset-display');

let syncOffset = 0; // In seconds
let lastKnownPos = 0;
let lastKnownPosTs = 0;
let isPlaying = false;

function updateOffsetDisplay() {
  offsetDisplay.innerText = syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`;
}

btnOffsetMinus.addEventListener('click', () => {
  syncOffset -= 0.1;
  updateOffsetDisplay();
});

btnOffsetPlus.addEventListener('click', () => {
  syncOffset += 0.1;
  updateOffsetDisplay();
});

ipcRenderer.on('position-updated', (event, { pos, isPlaying: playing }) => {
  lastKnownPos = pos;
  lastKnownPosTs = Date.now();
  isPlaying = playing;
});

// Interpolation loop to run at 60fps for smooth synced lyrics
function renderLoop() {
  if (currentLyrics && currentLyrics.length > 0) {
    let currentEstimatedPos = lastKnownPos;
    
    // Interpolate only if playing
    if (isPlaying) {
      currentEstimatedPos += (Date.now() - lastKnownPosTs) / 1000;
    }
    
    // Apply user-defined offset to compensate for delay/latency
    const posWithOffset = currentEstimatedPos + syncOffset;
    
    let activeIndex = currentLyrics.findIndex(l => l.time > posWithOffset) - 1;
    if (activeIndex === -2) activeIndex = currentLyrics.length - 1;
    if (activeIndex === -1) activeIndex = 0;
    
    const activeLine = currentLyrics[activeIndex];
    if (activeLine) {
      // Build HTML based on translation availability and toggle state
      let newHtml = '';
      if (showTranslation && activeLine.translation) {
        newHtml = `
          <div class="lyric-line active has-translation">
            <div class="original-text">${activeLine.text}</div>
            <div class="translated-text">${activeLine.translation}</div>
          </div>
        `;
      } else {
        newHtml = `<div class="lyric-line active">${activeLine.text}</div>`;
      }
      
      // Only update DOM if it changed to avoid flicker
      if (container.innerHTML !== newHtml) {
        container.innerHTML = newHtml;
      }
    }
  }
  requestAnimationFrame(renderLoop);
}

// Start loop
requestAnimationFrame(renderLoop);

// Handle authentication failure - show retry option
ipcRenderer.on('auth-failed', (event, error) => {
  let message = 'Error de autenticación';
  if (error === 'token_expired') {
    message = 'Sesión expirada';
  } else if (error === 'access_denied') {
    message = 'Acceso denegado';
  }
  
  container.innerHTML = `
    <div class="lyric-line active" style="font-size: 0.8em;">
      ⚠️ ${message}<br>
      <span style="font-size: 0.7em; color: #aaa;">
        Ctrl+Alt+R para reintentar<br>
        o desactiva ghost mode (Ctrl+Alt+L)<br>
        y haz clic en el botón de abajo
      </span>
    </div>
    <button id="btn-retry" class="retry-btn" onclick="require('electron').ipcRenderer.send('retry-login')">
      🔄 Reintentar Login
    </button>
  `;
});

// Handle authentication success
ipcRenderer.on('auth-success', () => {
  container.innerHTML = `<div class="lyric-line active">✅ Conectado a Spotify<br>Esperando música...</div>`;
});
