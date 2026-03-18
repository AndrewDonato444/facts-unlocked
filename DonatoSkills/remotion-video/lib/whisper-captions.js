/**
 * Whisper-Synced Captions — phrase grouping, manifest enrichment, and frame-based lookup
 *
 * Used by Remotion video compositions to display captions synced to TTS audio
 * via word-level timestamps extracted by Whisper.
 *
 * Provider-agnostic: works with Grok, Gemini, and ElevenLabs TTS output.
 */

/**
 * Groups word-level timestamps into display phrases of 4-6 words.
 * Prefers breaking on punctuation (.,!?;:—) when it falls within the target range.
 *
 * @param {Array<{word: string, start: number, end: number}>} words - Word timestamps from Whisper
 * @param {Object} [options]
 * @param {number} [options.minWords=4] - Minimum words per phrase
 * @param {number} [options.maxWords=6] - Maximum words per phrase
 * @returns {Array<{text: string, start: number, end: number, words: Array}>} Phrases
 */
function groupWordsIntoPhrases(words, options = {}) {
  const { minWords = 4, maxWords = 6 } = options;

  if (!words || words.length === 0) return [];
  if (words.length <= maxWords) {
    return [
      {
        text: words.map((w) => w.word).join(" "),
        start: words[0].start,
        end: words[words.length - 1].end,
        words: words,
      },
    ];
  }

  const phrases = [];
  let currentWords = [];

  for (let i = 0; i < words.length; i++) {
    currentWords.push(words[i]);

    const isLastWord = i === words.length - 1;
    const hasPunctuation = /[.,!?;:—\-]$/.test(words[i].word);
    const atMinWords = currentWords.length >= minWords;
    const atMaxWords = currentWords.length >= maxWords;

    // Look ahead: if we're at maxWords but punctuation is 1-2 words away, extend to it
    let nearbyPunctuation = false;
    if (atMaxWords && !hasPunctuation) {
      for (let look = 1; look <= 2 && i + look < words.length; look++) {
        if (/[.,!?;:—\-]$/.test(words[i + look].word)) {
          nearbyPunctuation = true;
          break;
        }
      }
    }

    // Break conditions:
    // 1. Hit max words AND no nearby punctuation — must break
    // 2. Hit punctuation AND we have at least minWords
    // 3. Last word in the input
    const shouldBreak =
      isLastWord ||
      (atMaxWords && !nearbyPunctuation) ||
      (hasPunctuation && atMinWords);

    if (shouldBreak) {
      phrases.push({
        text: currentWords.map((w) => w.word).join(" "),
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        words: [...currentWords],
      });
      currentWords = [];
    }
  }

  return phrases;
}

/**
 * Enriches an audio manifest with word-level timestamps from Whisper results.
 * Preserves all existing manifest fields; adds a "words" array to each scene.
 * Skips scenes with status "failed".
 *
 * @param {Object} manifest - Existing audio manifest (from TTS step)
 * @param {Object} whisperResults - Map of scene name → word timestamps array
 * @returns {Object} Enriched manifest (new object, does not mutate input)
 */
function enrichManifestWithTimestamps(manifest, whisperResults) {
  const enriched = {};

  for (const [sceneName, sceneData] of Object.entries(manifest)) {
    enriched[sceneName] = { ...sceneData };

    if (sceneData.status === "failed") continue;

    if (whisperResults[sceneName]) {
      enriched[sceneName].words = whisperResults[sceneName];
    }
  }

  return enriched;
}

/**
 * Fallback: builds even-spaced phrases from text and total duration
 * when Whisper timestamps are not available.
 *
 * Groups words into chunks of ~5 words and distributes evenly across the duration.
 *
 * @param {string} text - The full scene text
 * @param {number} durationSec - Total scene duration in seconds
 * @param {Object} [options]
 * @param {number} [options.wordsPerPhrase=5] - Target words per phrase
 * @returns {Array<{text: string, start: number, end: number}>} Phrases with even spacing
 */
function buildEvenSpacedPhrases(text, durationSec, options = {}) {
  const { wordsPerPhrase = 5 } = options;
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];

  // Group into chunks
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerPhrase) {
    chunks.push(words.slice(i, i + wordsPerPhrase).join(" "));
  }

  // Distribute evenly across duration
  const timePerChunk = durationSec / chunks.length;
  return chunks.map((text, i) => ({
    text,
    start: parseFloat((i * timePerChunk).toFixed(4)),
    end: parseFloat(((i + 1) * timePerChunk).toFixed(4)),
  }));
}

/**
 * Frame-based phrase lookup for Remotion components.
 * Given the current frame and fps, returns which phrase should be displayed.
 *
 * @param {Array<{text: string, start: number, end: number}>} phrases - Grouped phrases
 * @param {number} frame - Current Remotion frame number
 * @param {number} fps - Video frames per second
 * @returns {{text: string, index: number, start: number, end: number}} Current phrase info
 */
function getCurrentPhrase(phrases, frame, fps) {
  if (!phrases || phrases.length === 0) {
    return { text: "", index: 0, start: 0, end: 0 };
  }

  const currentTime = frame / fps;

  // Find the phrase whose time range contains currentTime
  for (let i = 0; i < phrases.length; i++) {
    if (currentTime < phrases[i].end) {
      return {
        text: phrases[i].text,
        index: i,
        start: phrases[i].start,
        end: phrases[i].end,
      };
    }
  }

  // Past all phrases — return last one
  const last = phrases[phrases.length - 1];
  return {
    text: last.text,
    index: phrases.length - 1,
    start: last.start,
    end: last.end,
  };
}

module.exports = {
  groupWordsIntoPhrases,
  enrichManifestWithTimestamps,
  buildEvenSpacedPhrases,
  getCurrentPhrase,
};
