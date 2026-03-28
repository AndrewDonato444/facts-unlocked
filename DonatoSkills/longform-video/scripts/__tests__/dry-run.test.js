/**
 * Tests for dry-run.js — Long-Form Dry Run & Cost Estimation
 *
 * Estimates total video cost without calling external APIs.
 * Predicts cache hits, TTS cost from char count, image cost from miss count.
 *
 * Tests cover:
 *   - TTS cost estimated from character count (LF-DRY-001)
 *   - Image cost based on predicted cache misses (LF-DRY-002)
 *   - Cache hit prediction from scene tags (LF-DRY-003)
 *   - Total cost breakdown (LF-DRY-004)
 *   - No external API calls made (LF-DRY-005)
 *   - Per-provider cost comparison (LF-DRY-006)
 */

const { estimateCost } = require("../dry-run");

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

const SCRIPT = {
  scenes: [
    { scene_id: "hook_01", chapter: "intro", narration: "Here's something that might surprise you about newborn babies." },
    { scene_id: "ch1_fact1", chapter: "chapter_1", narration: "Babies can hear their mother's voice from inside the womb. In fact, research shows that newborns can distinguish their mother's voice from a stranger's within just hours of being born. Scientists believe this happens because sound travels through amniotic fluid." },
    { scene_id: "ch1_fact2", chapter: "chapter_1", narration: "By three months old, a baby's hearing has developed enough to track where sounds come from." },
    { scene_id: "ch2_fact1", chapter: "chapter_2", narration: "Now here's where it gets really fascinating. Newborn babies can only see about eight to twelve inches in front of them." },
  ],
  total_word_count: 120,
};

const CACHE_QUERY_RESULTS = {
  hook_01: { hit: true, score: 0.85 },
  ch1_fact1: { hit: false, score: 0.2 },
  ch1_fact2: { hit: true, score: 0.65 },
  ch2_fact1: { hit: false, score: 0.1 },
};

const COST_RATES = {
  tts: {
    elevenlabs: { perChar: 0.00003 },  // ~$0.03 per 1000 chars
    grok: { perChar: 0.000005 },
    kokoro: { perChar: 0 },
  },
  image: {
    gemini: { perImage: 0.04 },
    dalle: { perImage: 0.08 },
  },
};

// ─────────────────────────────────────────────
// LF-DRY-001: TTS cost from character count
// ─────────────────────────────────────────────

test("LF-DRY-001: estimates TTS cost from total narration characters", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  const totalChars = SCRIPT.scenes.reduce(
    (sum, s) => sum + s.narration.length,
    0
  );
  expect(result.tts.totalCharacters).toBe(totalChars);
  expect(result.tts.estimatedCost).toBeCloseTo(
    totalChars * COST_RATES.tts.elevenlabs.perChar,
    4
  );
  expect(result.tts.provider).toBe("elevenlabs");
});

// ─────────────────────────────────────────────
// LF-DRY-002: Image cost from cache misses
// ─────────────────────────────────────────────

test("LF-DRY-002: estimates image cost only for cache misses", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  // 2 hits, 2 misses → 2 images to generate
  expect(result.images.cacheHits).toBe(2);
  expect(result.images.cacheMisses).toBe(2);
  expect(result.images.estimatedCost).toBeCloseTo(2 * 0.04, 4);
});

// ─────────────────────────────────────────────
// LF-DRY-003: Cache hit prediction
// ─────────────────────────────────────────────

test("LF-DRY-003: reports cache hit rate percentage", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  expect(result.images.hitRate).toBe(50); // 2/4 = 50%
});

// ─────────────────────────────────────────────
// LF-DRY-004: Total cost breakdown
// ─────────────────────────────────────────────

test("LF-DRY-004: total cost = TTS + images", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  expect(result.totalEstimatedCost).toBeCloseTo(
    result.tts.estimatedCost + result.images.estimatedCost,
    4
  );
  expect(result).toHaveProperty("breakdown");
  expect(result.breakdown).toHaveLength(2); // TTS line + Images line
});

// ─────────────────────────────────────────────
// LF-DRY-005: No API calls flag
// ─────────────────────────────────────────────

test("LF-DRY-005: dry-run flag indicates no APIs were called", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  expect(result.dryRun).toBe(true);
  expect(result.apiCallsMade).toBe(0);
});

// ─────────────────────────────────────────────
// LF-DRY-006: Per-provider cost comparison
// ─────────────────────────────────────────────

test("LF-DRY-006: compares cost across TTS providers", () => {
  const result = estimateCost(SCRIPT, CACHE_QUERY_RESULTS, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: COST_RATES,
  });

  expect(result.providerComparison).toBeDefined();
  expect(result.providerComparison).toHaveProperty("elevenlabs");
  expect(result.providerComparison).toHaveProperty("grok");
  expect(result.providerComparison).toHaveProperty("kokoro");

  // Kokoro should be cheapest (free)
  expect(result.providerComparison.kokoro).toBe(0);
  // ElevenLabs should be most expensive
  expect(result.providerComparison.elevenlabs).toBeGreaterThan(
    result.providerComparison.grok
  );
});
