/**
 * image-cache.js — Per-Channel Image Caching and Reuse
 *
 * Reduces image generation API calls by tagging generated background images
 * with semantic metadata and caching them per channel. On cache hit, the
 * cached image is returned instead of calling the image generation API.
 *
 * Spec: .specs/features/image-cache/image-cache.feature.md
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─────────────────────────────────────────────
// Stop words filtered during tag extraction
// ─────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "was", "are",
  "this", "that", "these", "those", "its", "has", "have", "had", "not",
  "no", "so", "if", "up", "out", "do", "my", "your", "we", "our",
  "can", "will", "just", "about", "into", "over", "very", "also",
]);

// ─────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────

/**
 * Compute Jaccard similarity between two tag arrays.
 * Returns a value between 0.0 (disjoint) and 1.0 (identical).
 */
function jaccardSimilarity(tagsA, tagsB) {
  if (!tagsA.length || !tagsB.length) return 0.0;

  const setA = new Set(tagsA);
  const setB = new Set(tagsB);

  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0.0;

  return intersection / union;
}

/**
 * Extract meaningful tags from an image generation prompt.
 * Filters stop words, lowercases, removes punctuation.
 */
function extractTags(prompt) {
  if (!prompt) return [];

  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  // Deduplicate
  return [...new Set(words)];
}

/**
 * Generate a human-readable cache report from per-channel stats.
 */
function generateCacheReport(stats) {
  const lines = ["IMAGE CACHE REPORT:"];
  let totalGenerated = 0;
  let totalCached = 0;

  for (const [channel, s] of Object.entries(stats)) {
    const total = s.generated + s.cached;
    const hitRate = total > 0 ? Math.round((s.cached / total) * 100) : 0;
    lines.push(`  ${channel}: ${s.generated} generated, ${s.cached} cached → ${hitRate}% cache hit rate`);
    totalGenerated += s.generated;
    totalCached += s.cached;
  }

  const totalAll = totalGenerated + totalCached;
  const totalReduction = totalAll > 0 ? Math.round((totalCached / totalAll) * 100) : 0;
  lines.push(`  Total API calls saved: ${totalCached} (${totalReduction}% reduction)`);

  const cacheSizes = Object.entries(stats)
    .map(([ch, s]) => `${ch.replace(/-facts-unlocked$/, "").replace(/-/g, "")}=${s.cacheSize} images`)
    .join(", ");
  lines.push(`  Cache size: ${cacheSizes}`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// ImageCache Class
// ─────────────────────────────────────────────

class ImageCache {
  /**
   * @param {Object} opts
   * @param {string} opts.cachePath - Root directory for all channel caches
   * @param {string} opts.channel - Channel slug (e.g., "baby-facts-unlocked")
   * @param {number} [opts.maxReuse=5] - Max times a single image can be reused
   * @param {number} [opts.maxCacheSize=150] - Max images per channel cache
   * @param {number} [opts.minMatchScore=0.4] - Minimum Jaccard score for a cache hit
   */
  constructor(opts) {
    this.cachePath = opts.cachePath;
    this.channel = opts.channel;
    this.maxReuse = opts.maxReuse || 5;
    this.maxCacheSize = opts.maxCacheSize || 150;
    this.minMatchScore = opts.minMatchScore || 0.4;

    this.channelDir = path.join(this.cachePath, this.channel);
    this.imagesDir = path.join(this.channelDir, "images");
    this.indexPath = path.join(this.channelDir, "cache-index.json");

    this._ensureDirs();
    this._load();
  }

  _ensureDirs() {
    fs.mkdirSync(this.imagesDir, { recursive: true });
  }

  _load() {
    if (fs.existsSync(this.indexPath)) {
      const raw = JSON.parse(fs.readFileSync(this.indexPath, "utf-8"));
      this.index = raw;
    } else {
      this.index = {
        version: 1,
        channel: this.channel,
        max_reuse: this.maxReuse,
        max_cache_size: this.maxCacheSize,
        images: [],
      };
    }
  }

  _save() {
    this.index.max_reuse = this.maxReuse;
    this.index.max_cache_size = this.maxCacheSize;
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Internal: add an entry directly (used by tests for seeding).
   */
  _addEntryDirectly(entry) {
    this.index.images.push(entry);
    this._save();
  }

  /**
   * Query the cache for a matching image.
   * Returns the best matching entry (and increments use_count), or null.
   */
  query(queryTags, opts = {}) {
    const candidates = [];

    for (const entry of this.index.images) {
      if (entry.use_count >= this.maxReuse) continue;

      const score = jaccardSimilarity(queryTags, entry.tags);
      if (score >= this.minMatchScore) {
        candidates.push({ entry, score });
      }
    }

    if (candidates.length === 0) return null;

    // Sort by score DESC, then use_count ASC (prefer less-used)
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.use_count - b.entry.use_count;
    });

    const best = candidates[0].entry;
    best.use_count++;
    best.last_used = new Date().toISOString();
    if (opts.usedIn) {
      best.used_in = best.used_in || [];
      best.used_in.push(opts.usedIn);
    }
    this._save();

    return {
      hash: best.hash,
      filePath: path.join(this.channelDir, best.file),
      tags: best.tags,
      use_count: best.use_count,
      score: candidates[0].score,
    };
  }

  /**
   * Add a new image to the cache.
   * Copies the file, creates a cache entry, triggers eviction if needed.
   */
  addImage(opts) {
    const { sourcePath, prompt, tags, aspectRatio, provider, model } = opts;

    // Generate hash from file content
    const fileContent = fs.readFileSync(sourcePath);
    const hash = crypto.createHash("md5").update(fileContent).digest("hex").slice(0, 8);

    const destFile = `images/${hash}.png`;
    const destPath = path.join(this.channelDir, destFile);

    // Copy file to cache
    fs.copyFileSync(sourcePath, destPath);

    const entry = {
      hash,
      file: destFile,
      prompt: prompt || "",
      tags: tags || [],
      aspect_ratio: aspectRatio || "1:1",
      provider: provider || "unknown",
      model: model || "unknown",
      file_size_bytes: fs.statSync(destPath).size,
      created: new Date().toISOString(),
      last_used: new Date().toISOString(),
      use_count: 1,
      used_in: [],
    };

    this.index.images.push(entry);

    // Evict if over max size
    this._evict();

    this._save();
    return entry;
  }

  /**
   * Evict least-recently-used images if cache exceeds max size.
   */
  _evict() {
    if (this.index.images.length <= this.maxCacheSize) return;

    // Sort by last_used ASC (oldest first)
    const sorted = [...this.index.images].sort(
      (a, b) => new Date(a.last_used).getTime() - new Date(b.last_used).getTime()
    );

    const evictCount = this.index.images.length - this.maxCacheSize;
    const toEvict = sorted.slice(0, evictCount);
    const evictHashes = new Set(toEvict.map((e) => e.hash));

    // Delete files
    for (const entry of toEvict) {
      const filePath = path.join(this.channelDir, entry.file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove from index
    this.index.images = this.index.images.filter((e) => !evictHashes.has(e.hash));
  }

  /**
   * Get a specific entry by hash.
   */
  getEntry(hash) {
    return this.index.images.find((e) => e.hash === hash);
  }

  /**
   * Get the number of images in this channel's cache.
   */
  size() {
    return this.index.images.length;
  }
}

module.exports = {
  ImageCache,
  extractTags,
  jaccardSimilarity,
  generateCacheReport,
};
