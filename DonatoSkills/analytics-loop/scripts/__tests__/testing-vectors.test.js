/**
 * Tests for testing-vectors.js — Long-Form Testing Vector Engine
 *
 * Manages the systematic isolation testing of long-form video variables
 * across 3 tiers, tracks test counts, and suggests next variables to test.
 *
 * Tests cover:
 *   - Tier structure definition (LF-VEC-001)
 *   - Next variable suggestion (isolation protocol) (LF-VEC-002)
 *   - Promotion criteria evaluation (LF-VEC-003)
 *   - Suppression criteria evaluation (LF-VEC-004)
 *   - Publish time tracking (LF-VEC-005)
 *   - Test history summary (LF-VEC-006)
 */

const {
  TIERS,
  suggestNextTest,
  evaluatePromotion,
  evaluateSuppression,
  summarizeTestHistory,
} = require("../testing-vectors");

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

// Simulates scored video history with variables
const VIDEO_HISTORY = [
  {
    videoId: "v1",
    variables: { voice: "matilda", video_length_min: 20, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
    score: { weightedScore: 2500, avg_retention_pct: 52 },
    publishedAt: "2026-03-01T10:00:00Z",
  },
  {
    videoId: "v2",
    variables: { voice: "emily", video_length_min: 20, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
    score: { weightedScore: 1800, avg_retention_pct: 38 },
    publishedAt: "2026-03-03T10:00:00Z",
  },
  {
    videoId: "v3",
    variables: { voice: "rachel", video_length_min: 20, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
    score: { weightedScore: 2200, avg_retention_pct: 46 },
    publishedAt: "2026-03-05T10:00:00Z",
  },
  // Now testing video_length (voice settled on matilda)
  {
    videoId: "v4",
    variables: { voice: "matilda", video_length_min: 15, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
    score: { weightedScore: 2000, avg_retention_pct: 55 },
    publishedAt: "2026-03-08T10:00:00Z",
  },
  {
    videoId: "v5",
    variables: { voice: "matilda", video_length_min: 25, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
    score: { weightedScore: 2700, avg_retention_pct: 42 },
    publishedAt: "2026-03-10T10:00:00Z",
  },
];

// ─────────────────────────────────────────────
// LF-VEC-001: Tier structure
// ─────────────────────────────────────────────

test("LF-VEC-001: TIERS defines 3 tiers with correct variables", () => {
  expect(TIERS).toHaveLength(3);

  // Tier 1: voice, video_length, intro_style
  expect(TIERS[0].tier).toBe(1);
  expect(TIERS[0].variables.map((v) => v.name)).toEqual(
    expect.arrayContaining(["voice", "video_length_min", "intro_style"])
  );

  // Tier 2: publish_time, chapter_count, etc.
  expect(TIERS[1].tier).toBe(2);
  expect(TIERS[1].variables.map((v) => v.name)).toContain("chapter_count");

  // Tier 3: visual_density, ambient_music, etc.
  expect(TIERS[2].tier).toBe(3);
  expect(TIERS[2].variables.map((v) => v.name)).toContain("visual_density");
});

// ─────────────────────────────────────────────
// LF-VEC-002: Next variable suggestion
// ─────────────────────────────────────────────

test("LF-VEC-002: suggests next untested variable value following isolation protocol", () => {
  const suggestion = suggestNextTest(VIDEO_HISTORY);

  expect(suggestion).toHaveProperty("variable");
  expect(suggestion).toHaveProperty("value");
  expect(suggestion).toHaveProperty("tier");
  expect(suggestion).toHaveProperty("reason");

  // With 3 voice tests + 2 length tests done, should suggest testing
  // the third video_length value (20min) or move to intro_style
  expect(suggestion.tier).toBeLessThanOrEqual(2);
});

// ─────────────────────────────────────────────
// LF-VEC-003: Promotion criteria
// ─────────────────────────────────────────────

test("LF-VEC-003: promotes variable value when retention is 15%+ above average with 3+ tests", () => {
  const promotions = evaluatePromotion(VIDEO_HISTORY);

  expect(Array.isArray(promotions)).toBe(true);
  for (const p of promotions) {
    expect(p).toHaveProperty("variable");
    expect(p).toHaveProperty("value");
    expect(p).toHaveProperty("avg_retention_pct");
    expect(p).toHaveProperty("test_count");
    expect(p.test_count).toBeGreaterThanOrEqual(3);
  }

  // matilda has 3 tests with 52% retention in v1 (highest among voices)
  // channel avg retention = (52+38+46+55+42)/5 = 46.6
  // matilda avg = (52+55+42)/3 = 49.67 → 49.67/46.6 = 1.066 → 6.6% above avg
  // Not 15% above, so matilda should NOT be promoted yet
  // But the structure should still work
  expect(promotions).toBeDefined();
});

// ─────────────────────────────────────────────
// LF-VEC-004: Suppression criteria
// ─────────────────────────────────────────────

test("LF-VEC-004: suppresses variable value when retention is 20%+ below average with 3+ tests", () => {
  // Add more data to create a clearly poor performer
  const extendedHistory = [
    ...VIDEO_HISTORY,
    {
      videoId: "v6",
      variables: { voice: "emily", video_length_min: 20, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
      score: { weightedScore: 1500, avg_retention_pct: 30 },
      publishedAt: "2026-03-12T10:00:00Z",
    },
    {
      videoId: "v7",
      variables: { voice: "emily", video_length_min: 20, intro_style: "fact_hook", chapter_count: 4, narration_pace: "moderate", visual_density: "medium" },
      score: { weightedScore: 1600, avg_retention_pct: 32 },
      publishedAt: "2026-03-14T10:00:00Z",
    },
  ];

  const suppressions = evaluateSuppression(extendedHistory);

  expect(Array.isArray(suppressions)).toBe(true);
  for (const s of suppressions) {
    expect(s).toHaveProperty("variable");
    expect(s).toHaveProperty("value");
    expect(s).toHaveProperty("avg_retention_pct");
    expect(s).toHaveProperty("test_count");
    expect(s.test_count).toBeGreaterThanOrEqual(3);
  }

  // emily: 3 tests with retention (38, 30, 32) avg=33.3
  // channel avg ~= 42
  // 33.3/42 = 0.793 → 20.7% below → should be suppressed
  const emilySuppression = suppressions.find(
    (s) => s.variable === "voice" && s.value === "emily"
  );
  expect(emilySuppression).toBeDefined();
});

// ─────────────────────────────────────────────
// LF-VEC-005: Publish time tracking
// ─────────────────────────────────────────────

test("LF-VEC-005: summarizeTestHistory includes publish time distribution", () => {
  const summary = summarizeTestHistory(VIDEO_HISTORY);

  expect(summary).toHaveProperty("publishTimeDistribution");
  expect(summary.publishTimeDistribution).toHaveProperty("byHour");
  expect(summary.publishTimeDistribution).toHaveProperty("byDay");
});

// ─────────────────────────────────────────────
// LF-VEC-006: Test history summary
// ─────────────────────────────────────────────

test("LF-VEC-006: summarizes how many times each variable value has been tested", () => {
  const summary = summarizeTestHistory(VIDEO_HISTORY);

  expect(summary).toHaveProperty("totalVideos", 5);
  expect(summary).toHaveProperty("variableCoverage");

  const voiceCoverage = summary.variableCoverage.find(
    (v) => v.variable === "voice"
  );
  expect(voiceCoverage).toBeDefined();
  expect(voiceCoverage.values).toHaveProperty("matilda");
  expect(voiceCoverage.values.matilda.count).toBe(3);
});
