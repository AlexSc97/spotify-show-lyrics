# Floating Lyrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron app with a transparent, borderless window that displays static lyrics over games by polling Spotify via `spotify-playing` and fetching lyrics from LRCLIB.

**Architecture:** Electron main process handles global hotkeys and Spotify polling. It fetches plain lyrics from LRCLIB and sends them via IPC to a transparent renderer window that displays the text.

**Tech Stack:** Node.js, Electron, `spotify-playing`, axios.

---

### Task 1: Project Setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**
Run: `npm install electron spotify-playing axios`

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: update dependencies for static lyrics plan"
```

### Task 2: LRCLIB API Client

**Files:**
- Create: `src/api/lyricsClient.js`

- [ ] **Step 1: Write API client implementation**
```javascript
// src/api/lyricsClient.js
const axios = require('axios');

async function fetchLyrics(artist, title) {
  try {
    const response = await axios.get('https://lrclib.net/api/get', {
      params: { artist_name: artist, track_name: title }
    });
    return response.data.plainLyrics || null;
  } catch (error) {
    return null;
  }
}

module.exports = { fetchLyrics };
```

- [ ] **Step 2: Commit**
```bash
git add src/api/lyricsClient.js
git commit -m "feat: add lrclib api client for static lyrics"
```

### Task 3: Electron Main Process & Poller

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Write Main Process logic**
```javascript
// src/main.js
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const spotify = require('spotify-playing');
const { fetchLyrics } = require('./api/lyricsClient');

let mainWindow;
let ghostMode = true;
let currentTrack = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setIgnoreMouseEvents(ghostMode);
  mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));
  
  globalShortcut.register('CommandOrControl+Alt+L', () => {
    ghostMode = !ghostMode;
    mainWindow.setIgnoreMouseEvents(ghostMode);
    mainWindow.webContents.send('ghost-mode-toggled', ghostMode);
  });
}

function pollSpotify() {
  spotify((err, res) => {
    if (!err && res) {
      const trackId = `${res.artist} - ${res.title}`;
      if (trackId !== currentTrack) {
        currentTrack = trackId;
        mainWindow.webContents.send('track-changed', res);
        fetchLyrics(res.artist, res.title).then(lyrics => {
          mainWindow.webContents.send('lyrics-updated', lyrics);
        });
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setInterval(pollSpotify, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 2: Commit**
```bash
git add src/main.js
git commit -m "feat: implement main process with spotify polling"
```

### Task 4: UI Renderer

**Files:**
- Create: `src/ui/index.html`
- Create: `src/ui/styles.css`
- Create: `src/ui/renderer.js`

- [ ] **Step 1: Write HTML**
```html
<!-- src/ui/index.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="drag-handle" class="hidden">Arrastrar para mover | Ctrl+Alt+L para bloquear/desbloquear</div>
  <div id="lyrics-container">Esperando música de Spotify...</div>
  <script src="renderer.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write CSS**
```css
/* src/ui/styles.css */
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: transparent;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
}

#drag-handle {
  -webkit-app-region: drag;
  background: rgba(0, 0, 0, 0.8);
  color: #1DB954;
  padding: 10px;
  font-size: 14px;
  font-weight: bold;
}

.hidden {
  display: none !important;
}

#lyrics-container {
  height: 100vh;
  overflow-y: auto;
  padding: 20px;
  font-size: 32px;
  font-weight: bold;
  line-height: 1.5;
  text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000, 0 0 10px rgba(0,0,0,0.8);
  white-space: pre-wrap;
  scrollbar-width: none; /* Firefox */
}

#lyrics-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

- [ ] **Step 3: Write Renderer JS**
```javascript
// src/ui/renderer.js
const { ipcRenderer } = require('electron');

const container = document.getElementById('lyrics-container');
const dragHandle = document.getElementById('drag-handle');

ipcRenderer.on('ghost-mode-toggled', (event, isGhost) => {
  if (isGhost) {
    dragHandle.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    dragHandle.classList.remove('hidden');
    document.body.style.overflow = 'auto';
  }
});

ipcRenderer.on('track-changed', (event, { artist, title }) => {
  container.innerHTML = `Buscando letra para:<br>${artist} - ${title}...`;
});

ipcRenderer.on('lyrics-updated', (event, lyrics) => {
  if (!lyrics) {
    container.innerHTML = `Letra no disponible`;
  } else {
    container.innerText = lyrics;
  }
});
```

- [ ] **Step 4: Commit**
```bash
git add src/ui/index.html src/ui/styles.css src/ui/renderer.js
git commit -m "feat: implement static ui renderer"
```
