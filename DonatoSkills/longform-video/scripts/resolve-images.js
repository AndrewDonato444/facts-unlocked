/**
 * resolve-images.js — Long-Form Scene Image Resolution
 *
 * Resolves background images for each scene in a long-form video script.
 * Uses cache-first strategy: query the image cache by semantic tags,
 * generate on miss, and add new images to cache for future reuse.
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

const { ImageCache } = require("../../image-cache/scripts/image-cache");

/**
 * Resolve images for all scenes in a long-form video script.
 *
 * @param {Object} opts
 * @param {Array} opts.scenes - Array of scene objects from script.json
 *   Each scene: { scene_id, narration, image_hint, image_tags }
 * @param {string} opts.channel - Channel slug (e.g., "baby-facts-unlocked")
 * @param {string} opts.cachePath - Root path for image cache
 * @param {Object} opts.cacheConfig - { maxReuse, maxCacheSize, minMatchScore }
 * @param {Function} opts.generateImage - async (prompt, tags) => { path, provider, model }
 * @param {string} opts.videoId - Video identifier for used_in tracking
 * @param {boolean} [opts.dryRun=false] - If true, query cache but don't generate
 * @param {number} [opts.costPerImage=0.04] - Cost per generated image (for reporting)
 * @returns {Promise<{ manifest: Object, stats: Object }>}
 */
async function resolveSceneImages(opts) {
  const {
    scenes,
    channel,
    cachePath,
    cacheConfig,
    generateImage,
    videoId,
    dryRun = false,
    costPerImage = 0.04,
  } = opts;

  const cache = new ImageCache({
    cachePath,
    channel,
    maxReuse: cacheConfig.maxReuse ?? 5,
    maxCacheSize: cacheConfig.maxCacheSize ?? 300,
    minMatchScore: cacheConfig.minMatchScore ?? 0.4,
  });

  const manifest = {};
  let cachedCount = 0;
  let generatedCount = 0;
  let wouldGenerateCount = 0;

  for (const scene of scenes) {
    const tags = scene.image_tags || [];

    // Step 1: Query cache
    const hit = cache.query(tags, { usedIn: videoId });

    if (hit) {
      // Cache hit
      manifest[scene.scene_id] = {
        path: hit.filePath,
        source: "cache",
        score: hit.score,
        hash: hit.hash,
      };
      cachedCount++;
      continue;
    }

    // Cache miss
    if (dryRun) {
      // In dry run, don't generate — just count
      manifest[scene.scene_id] = {
        path: null,
        source: "would_generate",
      };
      wouldGenerateCount++;
      continue;
    }

    // Step 2: Generate image
    const generated = await generateImage(scene.image_hint, tags);

    // Step 3: Add to cache with 16:9 aspect ratio
    const entry = cache.addImage({
      sourcePath: generated.path,
      prompt: scene.image_hint,
      tags: tags,
      aspectRatio: "16:9",
      provider: generated.provider,
      model: generated.model,
    });

    manifest[scene.scene_id] = {
      path: entry.file
        ? require("path").join(cachePath, channel, entry.file)
        : generated.path,
      source: "generated",
      provider: generated.provider,
      hash: entry.hash,
    };
    generatedCount++;
  }

  const stats = {
    cached: cachedCount,
    generated: generatedCount,
    total: scenes.length,
    cost: generatedCount * costPerImage,
    hitRate: scenes.length > 0
      ? Math.round((cachedCount / scenes.length) * 100)
      : 0,
  };

  if (dryRun) {
    stats.wouldGenerate = wouldGenerateCount;
    stats.estimatedCost = wouldGenerateCount * costPerImage;
  }

  return { manifest, stats };
}

module.exports = { resolveSceneImages };
