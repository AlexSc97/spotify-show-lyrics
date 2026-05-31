// src/api/lyricsClient.js
const axios = require('axios');

async function fetchLyrics(artist, title) {
  try {
    const response = await axios.get('https://lrclib.net/api/get', {
      params: { artist_name: artist, track_name: title }
    });
    return response.data.syncedLyrics || null;
  } catch (error) {
    return null;
  }
}

module.exports = { fetchLyrics };
