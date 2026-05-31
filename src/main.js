require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const { fetchLyrics } = require('./api/lyricsClient');
const { parseLRC } = require('./utils/lrcParser');
const fs = require('fs');


// === STARTUP DIAGNOSTICS ===
console.log('=== SPOTIFY CONFIG DIAGNOSTICS ===');
console.log('Client ID:', process.env.SPOTIFY_CLIENT_ID ? `${process.env.SPOTIFY_CLIENT_ID.substring(0, 8)}...` : 'MISSING!');
console.log('Client Secret:', process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'MISSING!');
console.log('Redirect URI:', process.env.SPOTIFY_REDIRECT_URI || 'MISSING!');
console.log('==================================');

let mainWindow;
let ghostMode = true;
let currentTrackId = null;
let pollingInterval = null;
let isAuthenticated = false;

const TOKEN_FILE = path.join(__dirname, '../.spotify-token.json');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const expressApp = express();

// Build the authorize URL manually to have full control and avoid library quirks
// IMPORTANT: We encode the redirect_uri ourselves to avoid double-encoding issues
function buildAuthorizeURL() {
  const redirectUri = (process.env.SPOTIFY_REDIRECT_URI || '').trim();
  const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const scope = 'user-read-currently-playing user-read-playback-state';
  
  const url = 'https://accounts.spotify.com/authorize' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scope) +
    '&state=spotify_auth';
  
  return url;
}

expressApp.get('/login', (req, res) => {
  const authorizeURL = buildAuthorizeURL();
  console.log('=== AUTH DEBUG ===');
  console.log('Redirect URI from .env:', JSON.stringify(process.env.SPOTIFY_REDIRECT_URI));
  console.log('Redirect URI trimmed:', JSON.stringify((process.env.SPOTIFY_REDIRECT_URI || '').trim()));
  console.log('Full authorize URL:', authorizeURL);
  console.log('=================');
  console.log('');
  console.log('>>> IMPORTANTE: Asegúrate de que esta URI EXACTA esté en tu Spotify Dashboard:');
  console.log('>>>   ' + (process.env.SPOTIFY_REDIRECT_URI || '').trim());
  console.log('');
  res.redirect(authorizeURL);
});

expressApp.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`
      <html><body style="background:#1a1a2e;color:#e94560;font-family:sans-serif;text-align:center;padding:40px;">
        <h2>Error de autenticación</h2>
        <p>${error}</p>
        <p style="color:#ccc;">Verifica tu configuración en el Spotify Developer Dashboard.</p>
        <p style="color:#aaa;">Redirect URI esperado: <code>${process.env.SPOTIFY_REDIRECT_URI}</code></p>
        <a href="/login" style="color:#1DB954;">Reintentar</a>
      </body></html>
    `);
    // Notify the Electron window about the auth failure
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-failed', error);
    }
    return;
  }

  spotifyApi.authorizationCodeGrant(code).then(data => {
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token }));
    isAuthenticated = true;
    
    res.send(`
      <html><body style="background:#1a1a2e;color:#1DB954;font-family:sans-serif;text-align:center;padding:40px;">
        <h2>✅ Autenticación exitosa</h2>
        <p>Ya puedes cerrar esta ventana y volver a la aplicación.</p>
      </body></html>
    `);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-success');
    }
    startPolling();
  }).catch(err => {
    console.error('Error in auth code grant:', err);
    res.send(`
      <html><body style="background:#1a1a2e;color:#e94560;font-family:sans-serif;text-align:center;padding:40px;">
        <h2>Error al obtener tokens</h2>
        <p>${err.message || 'Error desconocido'}</p>
        <a href="/login" style="color:#1DB954;">Reintentar</a>
      </body></html>
    `);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-failed', 'token_error');
    }
  });
});

const server = expressApp.listen(8888, '127.0.0.1', () => {
  console.log('HTTP server listening on http://127.0.0.1:8888');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 8888 is already in use! Kill the previous process or use a different port.');
    console.error('Attempting to continue without auth server...');
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 350,
    height: 500,
    resizable: true,
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
  
  mainWindow.webContents.on('did-finish-load', () => {
    windowLoaded = true;
  });
  
  // Toggle ghost mode
  globalShortcut.register('CommandOrControl+Alt+L', () => {
    ghostMode = !ghostMode;
    mainWindow.setIgnoreMouseEvents(ghostMode);
    mainWindow.webContents.send('ghost-mode-toggled', ghostMode);
  });
  
  // Retry authentication shortcut
  globalShortcut.register('CommandOrControl+Alt+R', () => {
    if (!isAuthenticated) {
      console.log('Retrying authentication...');
      openLogin();
    }
  });
}

function openLogin() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('track-changed', { 
      artist: 'Inicia sesión en tu navegador', 
      title: 'Conectando con Spotify...' 
    });
  }
  shell.openExternal('http://127.0.0.1:8888/login');
}

let pollingTimeout = null;
let windowLoaded = false;

function startPolling() {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }
  
  function pollNext() {
    if (!isAuthenticated) return;
    if (!windowLoaded) {
      pollingTimeout = setTimeout(pollNext, 200);
      return;
    }
    
    spotifyApi.getMyCurrentPlayingTrack().then(data => {
      if (!data.body || !data.body.item) {
         process.stdout.write('.'); // Print a dot for each empty poll
         pollingTimeout = setTimeout(pollNext, 1500);
         return;
      }
      
      // If we got a track, print a newline to clear the dots
      if (currentTrackId !== data.body.item.id) {
         console.log('\nTrack detected:', data.body.item.name);
      }
      
      const track = data.body.item;
      const progress = data.body.progress_ms || 0;
      const isPlaying = data.body.is_playing || false;
      
      if (track.id !== currentTrackId) {
        currentTrackId = track.id;
        const artist = track.artists[0].name;
        const title = track.name;
        
        mainWindow.webContents.send('track-changed', { artist, title });
        
        fetchLyrics(artist, title).then(lrc => {
          const parsed = parseLRC(lrc);
          mainWindow.webContents.send('lyrics-updated', parsed);
        });
      }
      
      mainWindow.webContents.send('position-updated', { pos: progress / 1000, isPlaying });
      pollingTimeout = setTimeout(pollNext, 1000);
      
    }).catch(err => {
      // If error is 504, 502 or 503, just retry after a longer delay, don't refresh token
      if (err.statusCode === 504 || err.statusCode === 502 || err.statusCode === 503 || err.statusCode === 429) {
        console.log(`Spotify API timeout/rate limit (${err.statusCode}), retrying in 3s...`);
        pollingTimeout = setTimeout(pollNext, 3000);
        return;
      }
      
      console.log('Error polling Spotify (Token issue?). Attempting refresh...');
      spotifyApi.refreshAccessToken().then(data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Token refreshed successfully');
        pollingTimeout = setTimeout(pollNext, 1000);
      }).catch(e => {
        console.log('Could not refresh token, need re-authentication');
        isAuthenticated = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auth-failed', 'token_expired');
        }
      });
    });
  }
  
  pollNext();
}

// Handle retry-login request from renderer
ipcMain.on('retry-login', () => {
  openLogin();
});

app.whenReady().then(() => {
  createWindow();
  
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE));
      if (data.refresh_token) {
        spotifyApi.setRefreshToken(data.refresh_token);
        spotifyApi.refreshAccessToken().then(tokenData => {
          spotifyApi.setAccessToken(tokenData.body['access_token']);
          isAuthenticated = true;
          console.log('Token restored from file, starting polling...');
          startPolling();
        }).catch(e => {
          console.log('Saved token is invalid, deleting and re-authenticating...');
          // Delete the invalid token file
          try { fs.unlinkSync(TOKEN_FILE); } catch(ignored) {}
          mainWindow.webContents.on('did-finish-load', () => openLogin());
        });
      } else {
        mainWindow.webContents.on('did-finish-load', () => openLogin());
      }
    } catch (e) {
      console.log('Corrupt token file, deleting...');
      try { fs.unlinkSync(TOKEN_FILE); } catch(ignored) {}
      mainWindow.webContents.on('did-finish-load', () => openLogin());
    }
  } else {
    mainWindow.webContents.on('did-finish-load', () => openLogin());
  }
});

app.on('window-all-closed', () => {
  if (pollingInterval) clearInterval(pollingInterval);
  if (process.platform !== 'darwin') app.quit();
});
