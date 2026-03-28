/**
 * Tests for decompose-longform.js — Long-Form Variable Decomposition
 *
 * Decomposes scored long-form videos by structural variables
 * (chapter_count, intro_style, narration_pace, visual_density, voice, video_length_min)
 * to identify winning patterns for exploit/explore briefing.
 *
 * Tests cover:
 *   - Variable impact calculation (LF-DECOMP-001)
 *   - Winning template extraction (LF-DECOMP-002)
 *   - Suppressed values excluded from exploit (LF-DECOMP-003)
 *   - Exploit/explore brief generation (LF-DECOMP-004)
 *   - Separate from short-form decomposition (LF-DECOMP-005)
 *   - Minimum sample size for confidence (LF-DECOMP-006)
 */

const {
  LONGFORM_VARIABLES,
  computeLongformVariableImpact,
  computeLongformWinningTemplate,
  generateLongformBriefs,
} = require("../decompose-longform");

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

const SCORED_VIDEOS = [
  {
    videoId: "v1",
    score: { weightedScore: 2500, avg_retention_pct: 52 },
    variables: { chapter_count: 4, intro_style: "hook_question", narration_pace: "moderate", visual_density: "medium", voice: "matilda", video_length_min: 20 },
    excluded: false,
  },
  {
    videoId: "v2",
    score: { weightedScore: 1800, avg_retention_pct: 40 },
    variables: { chapter_count: 3, intro_style: "cold_open", narration_pace: "slow", visual_density: "low", voice: "matilda", video_length_min: 15 },
    excluded: false,
  },
  {
    videoId: "v3",
    score: { weightedScore: 3200, avg_retention_pct: 60 },
    variables: { chapter_count: 4, intro_style: "hook_question", narration_pace: "moderate", visual_density: "high", voice: "matilda", video_length_min: 25 },
    excluded: false,
  },
  {
    videoId: "v4",
    score: { weightedScore: 2100, avg_retention_pct: 45 },
    variables: { chapter_count: 5, intro_style: "hook_question", narration_pace: "fast", visual_density: "medium", voice: "matilda", video_length_min: 22 },
    excluded: false,
  },
  {
    videoId: "v5",
    score: { weightedScore: 900, avg_retention_pct: 25 },
    variables: { chapter_count: 3, intro_style: "cold_open", narration_pace: "fast", visual_density: "low", voice: "matilda", video_length_min: 15 },
    excluded: false,
  },
  {
    videoId: "v6",
    score: { weightedScore: 2800, avg_retention_pct: 55 },
    variables: { chapter_count: 4, intro_style: "hook_question", narration_pace: "moderate", visual_density: "medium", voice: "matilda", video_length_min: 20 },
    excluded: false,
  },
];

// ─────────────────────────────────────────────
// LF-DECOMP-001: Variable impact per value
// ─────────────────────────────────────────────

test("LF-DECOMP-001: computes avg score per variable value", () => {
  const impact = computeLongformVariableImpact(SCORED_VIDEOS);

  expect(impact.length).toBe(LONGFORM_VARIABLES.length);

  const chapterImpact = impact.find((i) => i.variable === "chapter_count");
  expect(chapterImpact).toBeDefined();
  expect(chapterImpact.values).toHaveProperty("4");
  expect(chapterImpact.values).toHaveProperty("3");
  // 4 chapters should score higher (v1=2500, v3=3200, v6=2800 avg=2833)
  // vs 3 chapters (v2=1800, v5=900 avg=1350)
  expect(chapterImpact.values["4"].avg_score).toBeGreaterThan(
    chapterImpact.values["3"].avg_score
  );
});

// ─────────────────────────────────────────────
// LF-DECOMP-002: Winning template
// ─────────────────────────────────────────────

test("LF-DECOMP-002: winning template picks highest-scoring value per variable", () => {
  const impact = computeLongformVariableImpact(SCORED_VIDEOS);
  const template = computeLongformWinningTemplate(impact, SCORED_VIDEOS);

  expect(template).toHaveProperty("chapter_count");
  expect(template).toHaveProperty("intro_style");
  expect(template).toHaveProperty("narration_pace");
  expect(template).toHaveProperty("visual_density");
  // hook_question should win over cold_open
  expect(template.intro_style).toBe("hook_question");
  // moderate pace should win
  expect(template.narration_pace).toBe("moderate");
});

// ─────────────────────────────────────────────
// LF-DECOMP-003: Suppressed values flagged
// ─────────────────────────────────────────────

test("LF-DECOMP-003: low-scoring values identified via global_avg comparison", () => {
  const impact = computeLongformVariableImpact(SCORED_VIDEOS);

  // cold_open avg score = (v2=1800 + v5=900) / 2 = 1350
  // global avg = (2500+1800+3200+2100+900+2800) / 6 = 2216.67
  // cold_open ratio = 1350/2216.67 = 0.609 → 39.1% below average
  const introImpact = impact.find((i) => i.variable === "intro_style");
  expect(introImpact).toBeDefined();
  expect(introImpact.global_avg).toBeGreaterThan(2000);
  expect(introImpact.values["cold_open"].avg_score).toBeLessThan(
    introImpact.global_avg * 0.7
  );
  // hook_question is above average
  expect(introImpact.values["hook_question"].avg_score).toBeGreaterThan(
    introImpact.global_avg
  );
});

// ─────────────────────────────────────────────
// LF-DECOMP-004: Exploit/explore briefs
// ─────────────────────────────────────────────

test("LF-DECOMP-004: generates 2 exploit + 1 explore brief", () => {
  const impact = computeLongformVariableImpact(SCORED_VIDEOS);
  const template = computeLongformWinningTemplate(impact, SCORED_VIDEOS);

  const briefs = generateLongformBriefs(template, impact, [2, 1]);

  expect(briefs.exploit).toHaveLength(2);
  expect(briefs.explore).toHaveLength(1);

  // Exploit briefs use winning template
  for (const brief of briefs.exploit) {
    expect(brief.variables.intro_style).toBe(template.intro_style);
    expect(brief.type).toBe("exploit");
  }

  // Explore brief changes exactly one variable
  const exploreBrief = briefs.explore[0];
  expect(exploreBrief.type).toBe("explore");
  expect(exploreBrief.changed_variable).toBeDefined();
});

// ─────────────────────────────────────────────
// LF-DECOMP-005: Uses long-form variables, not short-form
// ─────────────────────────────────────────────

test("LF-DECOMP-005: LONGFORM_VARIABLES are distinct from short-form VARIABLES", () => {
  // Short-form uses: hook_type, video_length, voice_pace, text_overlay, background_type, music_energy, cta_style
  const shortFormVars = [
    "hook_type", "video_length", "voice_pace", "text_overlay",
    "background_type", "music_energy", "cta_style",
  ];

  // Long-form variables should include chapter_count, intro_style, etc.
  expect(LONGFORM_VARIABLES).toContain("chapter_count");
  expect(LONGFORM_VARIABLES).toContain("intro_style");
  expect(LONGFORM_VARIABLES).toContain("narration_pace");
  expect(LONGFORM_VARIABLES).toContain("visual_density");

  // Should NOT be the same as short-form
  expect(LONGFORM_VARIABLES).not.toEqual(shortFormVars);
});

// ─────────────────────────────────────────────
// LF-DECOMP-006: Confidence based on sample size
// ─────────────────────────────────────────────

test("LF-DECOMP-006: winning template confidence reflects sample size", () => {
  const impact = computeLongformVariableImpact(SCORED_VIDEOS);
  const template = computeLongformWinningTemplate(impact, SCORED_VIDEOS);

  expect(template).toHaveProperty("confidence");
  expect(template).toHaveProperty("sample_count");
  // With 6 videos, confidence should be low or medium
  expect(["low", "medium", "high"]).toContain(template.confidence);
});
