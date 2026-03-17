---
feature: Image Cache
domain: image-cache
source: DonatoSkills/image-cache/scripts/image-cache.js
tests:
  - DonatoSkills/image-cache/scripts/__tests__/image-cache.test.js
components:
  - ImageCache
  - extractTags
  - jaccardSimilarity
  - generateCacheReport
personas: []
status: implemented
created: 2026-03-17
updated: 2026-03-17
---

# Image Cache

**Source Files**: `DonatoSkills/image-gen/SKILL.md`, `DonatoSkills/content-engine/SKILL.md`
**Design System**: .specs/design-system/tokens.md

## Feature: Per-Channel Image Caching and Reuse

Reduces image generation API calls (and cost) by tagging every generated background image with semantic metadata and caching it per channel. When the content-engine requests a new background image, the cache is checked first. If a cached image matches the topic/mood/style, it's reused instead of generating a new one.

**Problem**: At 3 videos/day across multiple channels, we're burning ~9+ image generation API calls daily per channel. Many background images are generic enough to reuse — a "cute baby sleeping" background works for any baby sleep fact, and an "abstract money" background works across money tips.

**Goal**: Cut image generation API calls by 40-60% per channel through intelligent reuse, without making content feel repetitive.

---

## Feature: Image Cache

### Scenario: First-time image generation (cache miss)
Given a content-engine video needs a background image for channel "baby-facts-unlocked"
And the image cache has no matching images for tags ["baby", "sleeping", "peaceful"]
When the image-gen skill generates the background image
Then the image is saved to the local output directory as usual
And a cache entry is written to `image-cache/<channel-slug>/cache-index.json`
And the entry includes: file path, generation prompt, tags, aspect ratio, provider, created date, and use count (1)
And the image file is copied to `image-cache/<channel-slug>/images/<hash>.png`

### Scenario: Cache hit — reusable image found
Given a content-engine video needs a background image for channel "baby-facts-unlocked"
And the image cache contains an image tagged ["baby", "sleeping", "nursery"] with use count 2
And the max reuse limit per image is 5
When the cache is queried with tags ["baby", "sleep", "calm"]
Then the cached image scores >= 0.6 tag similarity (2 of 3 tags overlap semantically)
And the cached image is returned instead of calling the image generation API
And the use count is incremented to 3
And the cache hit is logged: "CACHE_HIT: <hash> for baby-facts-unlocked (3/5 uses)"

### Scenario: Cache hit but reuse limit reached
Given a content-engine video needs a background image for channel "baby-facts-unlocked"
And the only matching cached image has use count 5 (at the max reuse limit)
When the cache is queried
Then the image is NOT returned (treated as a miss)
And a new image is generated and cached as a fresh entry

### Scenario: Tag extraction from generation prompt
Given the content-engine requests a background image with prompt "A cozy nursery with soft pastel colors, a sleeping baby in a crib, warm morning light"
When the image is generated
Then the auto-tagger extracts tags: ["nursery", "pastel", "baby", "sleeping", "crib", "morning", "warm"]
And a channel tag is added: ["baby-facts"]
And a mood tag is added: ["peaceful", "warm"]
And an aspect ratio tag is added based on the platform target

### Scenario: Cross-topic reuse within same channel
Given the channel "baby-facts-unlocked" has cached images for "baby milestones" with tags ["baby", "happy", "colorful", "playroom"]
When a new video about "baby's first steps" needs a background
And the cache is queried with tags ["baby", "first-steps", "happy", "playroom"]
Then the "baby milestones" image scores high on overlap (3 of 4 tags match)
And it is reused for the "first steps" video

### Scenario: No cross-channel reuse
Given channel "baby-facts-unlocked" has a cached image tagged ["baby", "sleeping"]
When channel "money-facts-unlocked" requests an image
Then the baby channel's cache is NOT searched
And a new image is generated for the money channel's own cache

### Scenario: Cache cleanup — old images
Given the image cache for "baby-facts-unlocked" contains 200 images
And the max cache size per channel is 150 images
When a new image is added to the cache
Then the 50 least-recently-used images (by last_used date) are evicted
And their files are deleted from `image-cache/<channel-slug>/images/`
And their entries are removed from `cache-index.json`

### Scenario: Cache statistics reporting
Given the content-engine completes a batch run of 9 videos across 3 channels
When the run finishes
Then a cache report is logged:
```
IMAGE CACHE REPORT:
  baby-facts-unlocked: 6 generated, 3 cached → 33% cache hit rate
  money-facts-unlocked: 3 generated, 0 cached → 0% cache hit rate
  Total API calls saved: 3 (25% reduction)
  Cache size: baby=47 images, money=12 images
```

### Scenario: Orchestrated mode — content-engine passes cache hint
Given the content-engine is generating a video in orchestrated mode
When it invokes image-gen for a background image
Then it includes `cache_channel: "baby-facts-unlocked"` and `cache_tags: ["baby", "development", "happy"]` in the orchestrated prompt
And the image-gen skill checks the cache before generating
And if a cache hit occurs, it returns immediately without calling any image API

### Scenario: Manual cache warming
Given the user says "pre-generate 20 baby background images for the cache"
When the image-gen skill receives this request
Then it generates 20 images with diverse baby-themed prompts
And each image is tagged and added to the "baby-facts-unlocked" cache
And no videos are created — this is a cache-warming-only operation

### Scenario: Cache index persistence across sessions
Given a Claude Code session generated 5 new images and cached them
When a new Claude Code session starts for the same channel
Then it reads `image-cache/<channel-slug>/cache-index.json`
And all previously cached images are available for reuse

---

## User Journey

1. Content-engine plans a batch of videos for a channel
2. **For each video needing a background image:**
   a. Content-engine includes `cache_channel` and `cache_tags` in the orchestrated image-gen invocation
   b. **Image cache layer** checks `cache-index.json` for a tag-matching image under the reuse limit
   c. On HIT: returns cached image path, skips API call
   d. On MISS: generates via Gemini/OpenAI as usual, then writes to cache
3. Cache report printed at end of batch
4. Over time, popular channels build up rich caches, and API costs decrease

---

## Data Model

### cache-index.json

```json
{
  "version": 1,
  "channel": "baby-facts-unlocked",
  "max_reuse": 5,
  "max_cache_size": 150,
  "images": [
    {
      "hash": "a1b2c3d4",
      "file": "images/a1b2c3d4.png",
      "prompt": "A cozy nursery with soft pastel colors...",
      "tags": ["nursery", "pastel", "baby", "sleeping", "peaceful"],
      "aspect_ratio": "9:16",
      "provider": "gemini",
      "model": "gemini-2.5-flash-image",
      "file_size_bytes": 1248000,
      "created": "2026-03-17T10:00:00Z",
      "last_used": "2026-03-17T14:00:00Z",
      "use_count": 3,
      "used_in": [
        "facts-unlocked-test-001/item-003",
        "facts-unlocked-test-001/item-007",
        "facts-unlocked-test-002/item-001"
      ]
    }
  ]
}
```

### Tag Matching Algorithm

```
score = |intersection(query_tags, cached_tags)| / |union(query_tags, cached_tags)|
        (Jaccard similarity)

If score >= 0.4 → candidate for reuse
Candidates sorted by score DESC, then by use_count ASC (prefer less-used images)
Top candidate returned if use_count < max_reuse
```

**Semantic expansion** (optional, Phase 2): Map synonyms before matching. E.g., "sleeping" = "asleep" = "napping", "happy" = "joyful" = "cheerful". This can be a simple hardcoded synonym map per channel theme.

---

## File Structure

```
image-cache/
├── baby-facts-unlocked/
│   ├── cache-index.json       # Index with tags, use counts, metadata
│   └── images/
│       ├── a1b2c3d4.png       # Cached image (named by content hash)
│       ├── e5f6g7h8.png
│       └── ...
├── money-facts-unlocked/
│   ├── cache-index.json
│   └── images/
│       └── ...
└── README.md                  # Cache system documentation
```

Location: `DonatoSkills/image-cache/` (sibling to `image-gen/`, `content-engine/`)

---

## Integration Points

### Content-Engine (caller)
- Adds `cache_channel` and `cache_tags` to orchestrated image-gen invocations
- Reads cache report at end of batch for logging
- Passes channel slug derived from `project_id` in `projects.json`

### Image-Gen Skill (executor)
- Before generating, checks cache if `cache_channel` is provided
- After generating, writes to cache if `cache_channel` is provided
- Emits `CACHE_HIT` or `CACHE_MISS` signals alongside existing `IMAGE_COMPLETE`

### Signal Protocol (extended)

```
CACHE_HIT: a1b2c3d4 for baby-facts-unlocked (3/5 uses)
CACHE_MISS: baby-facts-unlocked — generating new image
IMAGE_COMPLETE: images/job/output/bg.png | Provider: gemini | Cached: true
IMAGE_COMPLETE: images/job/output/bg.png | Provider: cache | Cached: true
```

---

## Configuration

In `projects.json`, add per-project cache settings:

```json
{
  "image_cache": {
    "enabled": true,
    "max_reuse": 5,
    "max_cache_size": 150,
    "min_match_score": 0.4,
    "cache_path": "DonatoSkills/image-cache"
  }
}
```

Defaults if not specified: enabled=true, max_reuse=5, max_cache_size=150, min_match_score=0.4.

---

## Cost Impact Estimate

| Scenario | Daily API Calls | With Cache (est.) | Savings |
|----------|----------------|-------------------|---------|
| 1 channel, 3 videos/day | 3 | ~2 | ~33% |
| 2 channels, 3 videos/day each | 6 | ~3-4 | ~40-50% |
| 5 channels, 3 videos/day each | 15 | ~6-8 | ~50-60% |
| 5 channels + cache warming | 15 + 100 warm | ~4-5 after warm | ~70% ongoing |

Cache effectiveness improves over time as the library grows. Channels with repetitive visual themes (baby facts, food facts) will see the highest hit rates.

---

## Phase Breakdown

### Phase 1: Core Cache (this spec)
- cache-index.json read/write
- Tag extraction from prompts
- Jaccard similarity matching
- Reuse limit enforcement
- LRU eviction
- Integration with image-gen and content-engine orchestration

### Phase 2: Smart Matching (future)
- Semantic synonym expansion per channel theme
- Mood/tone matching (not just keyword tags)
- Visual similarity scoring (perceptual hash comparison)
- Analytics-driven cache prioritization (cache images from winning templates more aggressively)

### Phase 3: Shared Cache (future)
- Optional cross-channel reuse for truly generic images (abstract backgrounds, gradients)
- Cloudinary-backed remote cache (share across machines)
- Cache pre-warming from analytics briefs

---

## Learnings

- **Jaccard similarity is sufficient for keyword-based tag matching** — no need for embeddings or ML at this scale. The 0.4 threshold works well for related-but-not-identical topics within a channel.
- **MD5 hash (truncated to 8 chars) is fine for cache keys** — collision risk is negligible at 150 images per channel, and it's fast.
- **LRU eviction by `last_used` is the right strategy** — more recently used images are more likely to match future queries. Use count alone would penalize popular images.
- **Per-channel isolation simplifies everything** — no need for access control, namespace conflicts, or cross-channel tag contamination. Each channel's cache is a self-contained directory.
- **The `_addEntryDirectly` test helper pattern** — exposing a seeding method for tests avoids complex test setup while keeping the public API clean.
