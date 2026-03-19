/**
 * dry-run.js — Long-Form Dry Run & Cost Estimation
 *
 * Estimates total video cost without calling external APIs.
 * Uses character count for TTS cost, cache hit predictions for image cost,
 * and compares across TTS providers to show savings options.
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

/**
 * Estimate total cost for a long-form video without making API calls.
 *
 * @param {Object} script - Script with scenes array (each has narration text)
 * @param {Object} cacheQueryResults - { scene_id: { hit: boolean, score: number } }
 * @param {Object} opts
 * @param {string} opts.ttsProvider - Primary TTS provider name
 * @param {string} opts.imageProvider - Image generation provider name
 * @param {Object} opts.costRates - { tts: { [provider]: { perChar } }, image: { [provider]: { perImage } } }
 * @returns {Object} Cost estimation breakdown
 */
function estimateCost(script, cacheQueryResults, opts) {
  const { ttsProvider, imageProvider, costRates } = opts;

  // TTS cost estimation
  const totalCharacters = script.scenes.reduce(
    (sum, s) => sum + (s.narration || "").length,
    0
  );

  const ttsRate = costRates.tts[ttsProvider]?.perChar || 0;
  const ttsCost = Math.round(totalCharacters * ttsRate * 100000) / 100000;

  // Image cost estimation from cache predictions
  let cacheHits = 0;
  let cacheMisses = 0;

  for (const scene of script.scenes) {
    const cacheResult = cacheQueryResults[scene.scene_id];
    if (cacheResult?.hit) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
  }

  const imageRate = costRates.image[imageProvider]?.perImage || 0;
  const imageCost = Math.round(cacheMisses * imageRate * 100000) / 100000;

  const totalCost = Math.round((ttsCost + imageCost) * 100000) / 100000;

  const hitRate =
    script.scenes.length > 0
      ? Math.round((cacheHits / script.scenes.length) * 100)
      : 0;

  // Provider comparison for TTS
  const providerComparison = {};
  for (const [provider, rate] of Object.entries(costRates.tts)) {
    providerComparison[provider] =
      Math.round(totalCharacters * rate.perChar * 100000) / 100000;
  }

  return {
    dryRun: true,
    apiCallsMade: 0,
    tts: {
      provider: ttsProvider,
      totalCharacters,
      estimatedCost: ttsCost,
    },
    images: {
      provider: imageProvider,
      totalScenes: script.scenes.length,
      cacheHits,
      cacheMisses,
      hitRate,
      estimatedCost: imageCost,
    },
    totalEstimatedCost: totalCost,
    breakdown: [
      { component: "TTS", provider: ttsProvider, cost: ttsCost },
      { component: "Images", provider: imageProvider, cost: imageCost },
    ],
    providerComparison,
  };
}

module.exports = { estimateCost };
