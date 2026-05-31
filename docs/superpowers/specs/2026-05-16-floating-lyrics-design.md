# Floating Lyrics App - Design Specification

## Overview
A desktop application built with Electron that displays static, floating lyrics over games. The app detects the current song playing on Spotify desktop (via `spotify-playing`) and fetches the lyrics to display them in a transparent overlay.

## Architecture
- **Framework**: Electron (Node.js + Web/Chromium).
- **Frontend**: HTML/CSS/JS for rendering the lyrics. High contrast, text-shadow heavy CSS for readability.
- **Backend**: Node.js utilizing `spotify-playing` to poll currently playing track.
- **Lyrics Source**: LRCLIB API (`https://lrclib.net/api/get`), specifically fetching `plainLyrics`.

## Components
1. **Transparent Overlay Window**: 
   - Frameless Electron `BrowserWindow`.
   - `transparent: true`.
   - `alwaysOnTop: true`, `level: 'screen-saver'` to bypass game overlays.
   - `setIgnoreMouseEvents(true)` active by default (Click-through / Ghost mode).
2. **Media Poller**:
   - Background process that uses `spotify-playing` every 2 seconds to check the current song.
3. **Lyrics Fetcher**:
   - Queries LRCLIB using the artist name and track title.
   - Returns the `plainLyrics` string.
4. **Renderer / UI**:
   - Displays the plain lyrics text in a scrollable container.
   - Automatically hides the scrollbar unless hovered/active.
5. **Global Hotkey Manager**:
   - Listens for a global hotkey (e.g., `CommandOrControl+Alt+L`).
   - Toggles ghost mode off and shows UI controls (drag handle, close button) to allow repositioning of the overlay and manual scrolling.

## Data Flow
1. Media Poller detects new song -> emits event with `artist`, `title`.
2. App requests LRCLIB -> returns `plainLyrics`.
3. App sends lyrics text to Renderer via IPC.
4. Renderer updates DOM with the new lyrics.

## Error Handling
- **No Lyrics Found**: Displays "Letra no disponible".
- **Spotify Closed**: The poller detects no song and hides/clears the UI.
- **Network Errors**: Silent failure.
