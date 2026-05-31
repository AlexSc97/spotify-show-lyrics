const { fetchLyrics } = require('./src/api/lyricsClient');

(async () => {
  const lyrics = await fetchLyrics('Coldplay', 'Yellow');
  console.log('Lyrics for Coldplay - Yellow:', lyrics ? 'FOUND' : 'NOT FOUND');
})();
