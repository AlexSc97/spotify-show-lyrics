const { translate } = require('google-translate-api-x');

/**
 * Translates an array of parsed lyrics to Spanish.
 * Uses smart batching to translate all lines in a single request, preserving structure.
 * Includes a robust fallback line-by-line in parallel if the translation engine returns mismatching lines.
 * 
 * @param {Array<{time: number, text: string}>} parsedLyrics 
 * @returns {Promise<Array<{time: number, text: string, translation?: string}>>}
 */
async function translateLyrics(parsedLyrics) {
  if (!parsedLyrics || parsedLyrics.length === 0) return parsedLyrics;

  try {
    // Extract text from each line, filtering out purely empty lines to be translated
    const originalTexts = parsedLyrics.map(line => line.text);
    
    // Join with newlines to translate in a single request
    const textToTranslate = originalTexts.join('\n');
    
    // Translate to Spanish
    const res = await translate(textToTranslate, { to: 'es' });
    
    // Check if the original language is already Spanish
    const srcLang = res.from.language.iso;
    if (srcLang === 'es') {
      console.log('Lyrics are already in Spanish (es). Skipping translation.');
      return parsedLyrics; // No translation needed
    }
    
    const translatedLines = res.text.split('\n');
    
    // Verify if the translation output matches the original line count
    if (translatedLines.length === originalTexts.length) {
      for (let i = 0; i < parsedLyrics.length; i++) {
        parsedLyrics[i].translation = translatedLines[i].trim();
      }
    } else {
      console.warn(`Translation line count mismatch: expected ${originalTexts.length}, got ${translatedLines.length}. Falling back to individual line translation.`);
      
      // Fallback: translate line-by-line in parallel, avoiding empty lines
      const translationPromises = originalTexts.map(async (text) => {
        if (!text || text.trim() === '') return '';
        try {
          const singleRes = await translate(text, { to: 'es' });
          return singleRes.text.trim();
        } catch (e) {
          return '';
        }
      });
      
      const results = await Promise.all(translationPromises);
      for (let i = 0; i < parsedLyrics.length; i++) {
        parsedLyrics[i].translation = results[i];
      }
    }
  } catch (error) {
    console.error('Error in translateLyrics:', error);
    // If translation fails (e.g. network/rate limit), return original without crash
  }
  
  return parsedLyrics;
}

module.exports = { translateLyrics };
