/**
 * generate-tts.js — Long-Form Multi-Scene TTS Pipeline
 *
 * Generates TTS audio for each scene in a long-form video script.
 * Audio-first workflow: TTS duration drives scene visual timing.
 * Supports primary + fallback provider with the interface:
 *   provider(text, voiceConfig) → { wavPath, durationSec }
 *
 * Kokoro is stubbed — same interface, swap-in later.
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

const path = require("path");

/**
 * Generate TTS audio for all scenes sequentially and produce an audio manifest.
 *
 * @param {Object} opts
 * @param {Array} opts.scenes - Scene objects: { scene_id, chapter, narration }
 * @param {Array} opts.chapters - Chapter info: { chapter_id, title }
 * @param {Function} opts.provider - async (text, voiceConfig) => { wavPath, durationSec }
 * @param {Function} [opts.fallbackProvider] - Fallback if primary fails
 * @param {Object} [opts.voiceConfig] - Voice settings passed to provider
 * @param {string} opts.outputDir - Directory to store audio files
 * @param {number} [opts.fps=30] - Frames per second for frame calculations
 * @param {number} [opts.scenePaddingSec=0.5] - Padding added after each scene's audio
 * @param {number} [opts.costPerChar=0] - Cost per character for estimation
 * @returns {Promise<Object>} Audio manifest
 */
async function generateSceneTTS(opts) {
  const {
    scenes,
    chapters,
    provider,
    fallbackProvider,
    voiceConfig,
    outputDir,
    fps = 30,
    scenePaddingSec = 0.5,
    costPerChar = 0,
  } = opts;

  const manifestScenes = [];
  let totalCharacters = 0;

  for (const scene of scenes) {
    const text = scene.narration;
    totalCharacters += text.length;

    let ttsResult;

    // Try primary provider
    try {
      ttsResult = await provider(text, voiceConfig);
    } catch (primaryErr) {
      // Try fallback
      if (fallbackProvider) {
        try {
          ttsResult = await fallbackProvider(text, voiceConfig);
        } catch (fallbackErr) {
          throw new Error(
            `TTS failed for scene ${scene.scene_id}: ` +
            `primary: ${primaryErr.message}, fallback: ${fallbackErr.message}`
          );
        }
      } else {
        throw new Error(
          `TTS failed for scene ${scene.scene_id}: ${primaryErr.message}`
        );
      }
    }

    const audioDuration = ttsResult.durationSec;
    const totalDuration = audioDuration + scenePaddingSec;
    const durationFrames = Math.ceil(totalDuration * fps);

    manifestScenes.push({
      scene_id: scene.scene_id,
      chapter: scene.chapter,
      audio_file: ttsResult.wavPath,
      audio_duration_seconds: audioDuration,
      duration_seconds: totalDuration,
      duration_frames: durationFrames,
    });
  }

  // Compute totals
  const totalDurationSeconds = manifestScenes.reduce(
    (sum, s) => sum + s.duration_seconds, 0
  );
  const totalDurationFrames = manifestScenes.reduce(
    (sum, s) => sum + s.duration_frames, 0
  );

  // Compute chapter markers from cumulative scene durations
  const chapterMarkers = [];
  const seenChapters = new Set();
  let cumulativeSeconds = 0;

  for (const ms of manifestScenes) {
    if (!seenChapters.has(ms.chapter)) {
      seenChapters.add(ms.chapter);
      const chapterInfo = chapters.find((c) => c.chapter_id === ms.chapter);
      chapterMarkers.push({
        chapter: ms.chapter,
        start_seconds: cumulativeSeconds,
        label: chapterInfo ? chapterInfo.title : ms.chapter,
      });
    }
    cumulativeSeconds += ms.duration_seconds;
  }

  return {
    scenes: manifestScenes,
    total_duration_seconds: totalDurationSeconds,
    total_duration_frames: totalDurationFrames,
    chapter_markers: chapterMarkers,
    total_characters: totalCharacters,
    tts_cost_estimate: totalCharacters * costPerChar,
  };
}

module.exports = { generateSceneTTS };
