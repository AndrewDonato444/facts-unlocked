/**
 * Tests for decompose-variables.js — Analytics Loop Phase 3
 *
 * Tests cover:
 *   - Baseline: existing tagged-post pipeline (UT-DV-001 to UT-DV-003)
 *   - Variable inference from post content (UT-DV-004 to UT-DV-011)
 *   - Per-channel override detection (UT-DV-012 to UT-DV-016)
 *   - Mixed tagged + inferred posts (UT-DV-017 to UT-DV-018)
 */

const path = require("path");

// The module under test — expects exported functions
const {
  computeVariableImpact,
  computeWinningTemplate,
  inferVariables,
  detectPerChannelOverrides,
  VARIABLES,
} = require("../decompose-variables");

// ─────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────

function makeScoredPost(overrides = {}) {
  return {
    postId: overrides.postId || "post_001",
    zernioPostId: overrides.zernioPostId || "zernio_001",
    content: "content" in overrides ? overrides.content : "73% of people don't realize this fact",
    profileName: overrides.profileName || "Example Channel",
    platformAnalytics: [{ platform: overrides.platform || "tiktok" }],
    analytics: {
      impressions: 10000,
      likes: 100,
      comments: 20,
      shares: 30,
      saves: 40,
      duration: "duration" in overrides ? overrides.duration : 30,
      ...(overrides.analytics || {}),
    },
    score: {
      engagementDensity: overrides.engagementDensity || 15.0,
      rawScore: 150,
    },
    excluded: false,
    ...(overrides.extra || {}),
  };
}

function makePostWithVars(variables, score = 15.0, overrides = {}) {
  return {
    ...makeScoredPost({ engagementDensity: score, ...overrides }),
    variables,
    variableConfidence: overrides.confidence || "tagged",
  };
}

const FULL_VARIABLES = {
  hook_type: "stat_lead",
  video_length: "30",
  voice_pace: "fast",
  text_overlay: "karaoke_highlight",
  background_type: "stock_montage",
  music_energy: "upbeat",
  cta_style: "follow_cta",
};

// ─────────────────────────────────────────────
// Baseline Tests: Existing Pipeline
// ─────────────────────────────────────────────

describe("Baseline: computeVariableImpact", () => {
  test("UT-DV-001: tagged posts produce correct variable impact analysis", () => {
    const postsWithVars = [
      makePostWithVars(
        { ...FULL_VARIABLES, hook_type: "stat_lead" },
        24.0
      ),
      makePostWithVars(
        { ...FULL_VARIABLES, hook_type: "stat_lead" },
        20.0
      ),
      makePostWithVars(
        { ...FULL_VARIABLES, hook_type: "did_you_know" },
        12.0
      ),
      makePostWithVars(
        { ...FULL_VARIABLES, hook_type: "question" },
        8.0
      ),
    ];

    const impact = computeVariableImpact(postsWithVars);

    // Should have an entry for each variable
    expect(impact.length).toBe(VARIABLES.length);

    // Find hook_type impact
    const hookImpact = impact.find((v) => v.variable === "hook_type");
    expect(hookImpact).toBeDefined();
    expect(hookImpact.values["stat_lead"].avg_score).toBe(22.0);
    expect(hookImpact.values["stat_lead"].count).toBe(2);
    expect(hookImpact.values["did_you_know"].avg_score).toBe(12.0);
    expect(hookImpact.values["did_you_know"].count).toBe(1);
    expect(hookImpact.most_impactful_value).toBe("stat_lead");
  });

  test("UT-DV-002: winning template is the combination of best values per variable", () => {
    const postsWithVars = [
      makePostWithVars(
        {
          hook_type: "stat_lead",
          video_length: "30",
          voice_pace: "fast",
          text_overlay: "karaoke_highlight",
          background_type: "stock_montage",
          music_energy: "upbeat",
          cta_style: "follow_cta",
        },
        28.0
      ),
      makePostWithVars(
        {
          hook_type: "did_you_know",
          video_length: "45",
          voice_pace: "moderate",
          text_overlay: "full_captions",
          background_type: "single_static",
          music_energy: "ambient",
          cta_style: "end_card",
        },
        10.0
      ),
    ];

    const impact = computeVariableImpact(postsWithVars);
    const template = computeWinningTemplate(impact, postsWithVars);

    expect(template.hook_type).toBe("stat_lead");
    expect(template.video_length).toBe("30");
    expect(template.voice_pace).toBe("fast");
    expect(template.text_overlay).toBe("karaoke_highlight");
    expect(template.background_type).toBe("stock_montage");
    expect(template.music_energy).toBe("upbeat");
    expect(template.cta_style).toBe("follow_cta");
  });

  test("UT-DV-003: confidence levels based on sample count", () => {
    // Low confidence: < 5 matching posts
    const fewPosts = [
      makePostWithVars(FULL_VARIABLES, 20.0),
      makePostWithVars(FULL_VARIABLES, 22.0),
    ];
    const impactFew = computeVariableImpact(fewPosts);
    const templateFew = computeWinningTemplate(impactFew, fewPosts);
    expect(templateFew.confidence).toBe("low");
    expect(templateFew.sample_count).toBe(2);

    // Medium confidence: 5-9 matching posts
    const medPosts = Array.from({ length: 7 }, (_, i) =>
      makePostWithVars(FULL_VARIABLES, 15.0 + i, { postId: `med_${i}` })
    );
    const impactMed = computeVariableImpact(medPosts);
    const templateMed = computeWinningTemplate(impactMed, medPosts);
    expect(templateMed.confidence).toBe("medium");

    // High confidence: 10+ matching posts
    const manyPosts = Array.from({ length: 12 }, (_, i) =>
      makePostWithVars(FULL_VARIABLES, 14.0 + i, { postId: `many_${i}` })
    );
    const impactMany = computeVariableImpact(manyPosts);
    const templateMany = computeWinningTemplate(impactMany, manyPosts);
    expect(templateMany.confidence).toBe("high");
    expect(templateMany.sample_count).toBe(12);
  });
});

// ─────────────────────────────────────────────
// Variable Inference Tests
// ─────────────────────────────────────────────

describe("Variable inference: inferVariables", () => {
  test("UT-DV-004: stat_lead hook detected from caption starting with percentage", () => {
    const post = makeScoredPost({
      content: "73% of couples who met online say they fell in love faster",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("stat_lead");
    expect(result.confidences.hook_type).toBe("inferred");
  });

  test("UT-DV-004b: stat_lead hook detected from caption starting with number", () => {
    const post = makeScoredPost({
      content: "9 out of 10 scientists agree that sleep is important",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("stat_lead");
  });

  test("UT-DV-005: question hook detected from caption ending with question mark", () => {
    const post = makeScoredPost({
      content: "What would you do if you found out your partner lied?",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("question");
    expect(result.confidences.hook_type).toBe("inferred");
  });

  test("UT-DV-005b: did_you_know hook detected", () => {
    const post = makeScoredPost({
      content: "Did you know that octopuses have three hearts?",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("did_you_know");
  });

  test("UT-DV-005c: myth_bust hook detected", () => {
    const post = makeScoredPost({
      content: "You've been told that breakfast is the most important meal, but actually it's not",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("myth_bust");
  });

  test("UT-DV-005d: most_people_dont_know hook detected", () => {
    const post = makeScoredPost({
      content: "Most people don't know that honey never spoils",
    });
    const result = inferVariables(post);
    expect(result.variables.hook_type).toBe("most_people_dont_know");
  });

  test("UT-DV-006: video_length bucketed from duration metadata", () => {
    // 28 seconds → bucket to "30"
    const post30 = makeScoredPost({ duration: 28 });
    expect(inferVariables(post30).variables.video_length).toBe("30");

    // 14 seconds → bucket to "15"
    const post15 = makeScoredPost({ duration: 14 });
    expect(inferVariables(post15).variables.video_length).toBe("15");

    // 42 seconds → bucket to "45"
    const post45 = makeScoredPost({ duration: 42 });
    expect(inferVariables(post45).variables.video_length).toBe("45");

    // 55 seconds → bucket to "60"
    const post60 = makeScoredPost({ duration: 55 });
    expect(inferVariables(post60).variables.video_length).toBe("60");

    expect(inferVariables(post30).confidences.video_length).toBe("inferred");
  });

  test("UT-DV-007: voice_pace computed from WPM", () => {
    // 30 second video, 100 words = 200 WPM → fast
    const fastPost = makeScoredPost({
      content: Array(100).fill("word").join(" "),
      duration: 30,
    });
    expect(inferVariables(fastPost).variables.voice_pace).toBe("fast");

    // 30 second video, 75 words = 150 WPM → moderate
    const modPost = makeScoredPost({
      content: Array(75).fill("word").join(" "),
      duration: 30,
    });
    expect(inferVariables(modPost).variables.voice_pace).toBe("moderate");

    // 30 second video, 50 words = 100 WPM → slow
    const slowPost = makeScoredPost({
      content: Array(50).fill("word").join(" "),
      duration: 30,
    });
    expect(inferVariables(slowPost).variables.voice_pace).toBe("slow");
  });

  test("UT-DV-008: non-inferable variables default to unknown", () => {
    const post = makeScoredPost({
      content: "73% of people love pizza",
    });
    const result = inferVariables(post);

    expect(result.variables.text_overlay).toBe("unknown");
    expect(result.variables.background_type).toBe("unknown");
    expect(result.variables.music_energy).toBe("unknown");
    expect(result.confidences.text_overlay).toBe("unknown");
    expect(result.confidences.background_type).toBe("unknown");
    expect(result.confidences.music_energy).toBe("unknown");
  });

  test("UT-DV-009: empty caption with no duration results in all unknown", () => {
    const post = makeScoredPost({ content: "", duration: null });
    const result = inferVariables(post);

    for (const variable of VARIABLES) {
      expect(result.variables[variable]).toBe("unknown");
      expect(result.confidences[variable]).toBe("unknown");
    }
  });

  test("UT-DV-009b: null caption with no duration results in all unknown", () => {
    const post = makeScoredPost({ duration: null });
    post.content = null;
    const result = inferVariables(post);

    for (const variable of VARIABLES) {
      expect(result.variables[variable]).toBe("unknown");
    }
  });

  test("UT-DV-010: inferred posts weighted at 0.5x in averages", () => {
    const taggedPost = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      20.0,
      { confidence: "tagged" }
    );
    const inferredPost = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      20.0,
      { confidence: "inferred" }
    );

    // With weighting: tagged contributes 20.0, inferred contributes 20.0 * 0.5 = 10.0
    // Weighted avg = (20.0 + 10.0) / (1.0 + 0.5) = 20.0
    // Without weighting it would be (20.0 + 20.0) / 2 = 20.0
    // Better test: use different scores
    const taggedPost2 = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      30.0,
      { confidence: "tagged", postId: "tagged_1" }
    );
    const inferredPost2 = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      10.0,
      { confidence: "inferred", postId: "inferred_1" }
    );

    // Weighted: (30.0 * 1.0 + 10.0 * 0.5) / (1.0 + 0.5) = 35/1.5 = 23.33
    // Unweighted: (30 + 10) / 2 = 20.0
    const impact = computeVariableImpact([taggedPost2, inferredPost2]);
    const hookImpact = impact.find((v) => v.variable === "hook_type");

    // The weighted average should NOT be 20.0 (unweighted)
    // It should be ~23.33 (weighted toward the tagged post)
    expect(hookImpact.values["stat_lead"].avg_score).toBeCloseTo(23.33, 1);
  });

  test("UT-DV-011: sample_breakdown shows tagged vs inferred counts", () => {
    const taggedPost = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      20.0,
      { confidence: "tagged", postId: "t1" }
    );
    const inferredPost = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      15.0,
      { confidence: "inferred", postId: "i1" }
    );

    const impact = computeVariableImpact([taggedPost, inferredPost]);
    const hookImpact = impact.find((v) => v.variable === "hook_type");

    expect(hookImpact.values["stat_lead"].tagged_count).toBe(1);
    expect(hookImpact.values["stat_lead"].inferred_count).toBe(1);
  });
});

// ─────────────────────────────────────────────
// CTA Inference Tests
// ─────────────────────────────────────────────

describe("Variable inference: CTA detection", () => {
  test("UT-DV-008b: follow CTA detected in caption", () => {
    const post = makeScoredPost({
      content: "73% of people love facts. Follow for more!",
    });
    const result = inferVariables(post);
    expect(result.variables.cta_style).toBe("follow_cta");
    expect(result.confidences.cta_style).toBe("inferred");
  });

  test("UT-DV-008c: no CTA pattern defaults to unknown", () => {
    const post = makeScoredPost({
      content: "73% of people love facts. That's all for now.",
    });
    const result = inferVariables(post);
    expect(result.variables.cta_style).toBe("unknown");
  });
});

// ─────────────────────────────────────────────
// Per-Channel Override Tests
// ─────────────────────────────────────────────

describe("Per-channel overrides: detectPerChannelOverrides", () => {
  // Helper to create historical variable analysis data
  function makeHistoricalAnalysis(channelOverrides = {}) {
    const baseImpact = VARIABLES.map((v) => ({
      variable: v,
      values: {
        [FULL_VARIABLES[v]]: { avg_score: 20.0, count: 10 },
      },
      most_impactful_value: FULL_VARIABLES[v],
      lift_over_average: "60%",
    }));

    return {
      date: "2026-03-14",
      sample_size: 30,
      global_avg_engagement_density: 12.5,
      winning_template: FULL_VARIABLES,
      variable_impact: baseImpact,
      per_channel_overrides: [],
    };
  }

  test("UT-DV-012: no overrides with fewer than 3 scoring cycles", () => {
    // Only 2 historical cycles
    const historicalData = [
      makeHistoricalAnalysis(),
      makeHistoricalAnalysis(),
    ];

    const postsWithVars = [
      makePostWithVars(
        { ...FULL_VARIABLES, voice_pace: "moderate" },
        25.0,
        { profileName: "Channel A" }
      ),
    ];

    const overrides = detectPerChannelOverrides(
      postsWithVars,
      historicalData,
      FULL_VARIABLES
    );

    expect(overrides).toEqual([]);
  });

  test("UT-DV-013: divergence detected when channel best differs from global best", () => {
    // 4 historical cycles where Channel A consistently prefers moderate pace
    const historicalData = Array.from({ length: 4 }, () =>
      makeHistoricalAnalysis()
    );

    // Channel A posts — moderate pace consistently outperforms fast
    const postsWithVars = [];
    for (let i = 0; i < 8; i++) {
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "moderate" },
          25.0, // Higher than global winning template's score
          { profileName: "Channel A", postId: `ca_mod_${i}` }
        )
      );
    }
    // Some posts with the global winner (fast) scoring lower on this channel
    for (let i = 0; i < 5; i++) {
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "fast" },
          12.0,
          { profileName: "Channel A", postId: `ca_fast_${i}` }
        )
      );
    }

    const overrides = detectPerChannelOverrides(
      postsWithVars,
      historicalData,
      FULL_VARIABLES
    );

    expect(overrides.length).toBeGreaterThanOrEqual(1);
    const voiceOverride = overrides.find((o) =>
      o.diverges_on.includes("voice_pace")
    );
    expect(voiceOverride).toBeDefined();
    expect(voiceOverride.optimal_override.voice_pace).toBe("moderate");
  });

  test("UT-DV-014: divergence requires 15%+ lift on channel", () => {
    const historicalData = Array.from({ length: 4 }, () =>
      makeHistoricalAnalysis()
    );

    // Channel A — moderate pace only marginally better (< 15% lift)
    const postsWithVars = [];
    for (let i = 0; i < 8; i++) {
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "moderate" },
          21.0, // Only ~5% better than fast's 20.0
          { profileName: "Channel B", postId: `cb_mod_${i}` }
        )
      );
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "fast" },
          20.0,
          { profileName: "Channel B", postId: `cb_fast_${i}` }
        )
      );
    }

    const overrides = detectPerChannelOverrides(
      postsWithVars,
      historicalData,
      FULL_VARIABLES
    );

    // Should NOT detect a divergence — lift is only ~5%, below the 15% threshold
    const voiceOverride = overrides.find(
      (o) => o.channel === "Channel B" && o.diverges_on.includes("voice_pace")
    );
    expect(voiceOverride).toBeUndefined();
  });

  test("UT-DV-015: divergence requires 5+ posts with divergent value", () => {
    const historicalData = Array.from({ length: 4 }, () =>
      makeHistoricalAnalysis()
    );

    // Channel C — moderate pace much better BUT only 3 posts (< 5 minimum)
    const postsWithVars = [];
    for (let i = 0; i < 3; i++) {
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "moderate" },
          30.0, // Big lift
          { profileName: "Channel C", postId: `cc_mod_${i}` }
        )
      );
    }
    for (let i = 0; i < 10; i++) {
      postsWithVars.push(
        makePostWithVars(
          { ...FULL_VARIABLES, voice_pace: "fast" },
          15.0,
          { profileName: "Channel C", postId: `cc_fast_${i}` }
        )
      );
    }

    const overrides = detectPerChannelOverrides(
      postsWithVars,
      historicalData,
      FULL_VARIABLES
    );

    const voiceOverride = overrides.find(
      (o) => o.channel === "Channel C" && o.diverges_on.includes("voice_pace")
    );
    expect(voiceOverride).toBeUndefined();
  });

  test("UT-DV-016: multiple variables can diverge for same channel", () => {
    const historicalData = Array.from({ length: 4 }, () =>
      makeHistoricalAnalysis()
    );

    // Channel D diverges on BOTH voice_pace AND hook_type
    const postsWithVars = [];
    for (let i = 0; i < 8; i++) {
      postsWithVars.push(
        makePostWithVars(
          {
            ...FULL_VARIABLES,
            voice_pace: "moderate",
            hook_type: "question",
          },
          30.0,
          { profileName: "Channel D", postId: `cd_div_${i}` }
        )
      );
    }
    for (let i = 0; i < 5; i++) {
      postsWithVars.push(
        makePostWithVars(
          FULL_VARIABLES,
          12.0,
          { profileName: "Channel D", postId: `cd_base_${i}` }
        )
      );
    }

    const overrides = detectPerChannelOverrides(
      postsWithVars,
      historicalData,
      FULL_VARIABLES
    );

    const channelDOverride = overrides.find((o) => o.channel === "Channel D");
    expect(channelDOverride).toBeDefined();
    expect(channelDOverride.diverges_on).toContain("voice_pace");
    expect(channelDOverride.diverges_on).toContain("hook_type");
  });
});

// ─────────────────────────────────────────────
// Mixed Tagged + Inferred Tests
// ─────────────────────────────────────────────

describe("Mixed tagged and inferred posts", () => {
  test("UT-DV-017: tagged + inferred posts both contribute to analysis", () => {
    const tagged = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "stat_lead" },
      25.0,
      { confidence: "tagged", postId: "mix_t1" }
    );
    const inferred = makePostWithVars(
      { ...FULL_VARIABLES, hook_type: "did_you_know" },
      18.0,
      { confidence: "inferred", postId: "mix_i1" }
    );

    const impact = computeVariableImpact([tagged, inferred]);
    const hookImpact = impact.find((v) => v.variable === "hook_type");

    // Both hook types should appear in the analysis
    expect(hookImpact.values["stat_lead"]).toBeDefined();
    expect(hookImpact.values["did_you_know"]).toBeDefined();

    // Total count should reflect both
    const totalCount = Object.values(hookImpact.values).reduce(
      (sum, v) => sum + v.count,
      0
    );
    expect(totalCount).toBe(2);
  });

  test("UT-DV-018: all posts untagged and non-inferable produces empty analysis", () => {
    // Posts where all variables are "unknown"
    const unknownVars = {};
    for (const v of VARIABLES) {
      unknownVars[v] = "unknown";
    }

    const posts = [
      makePostWithVars(unknownVars, 15.0, {
        confidence: "inferred",
        postId: "unk_1",
      }),
      makePostWithVars(unknownVars, 12.0, {
        confidence: "inferred",
        postId: "unk_2",
      }),
    ];

    const impact = computeVariableImpact(posts);

    // All variables should have empty value maps (unknown is filtered out)
    for (const vi of impact) {
      const nonUnknownValues = Object.keys(vi.values).filter(
        (v) => v !== "unknown"
      );
      expect(nonUnknownValues.length).toBe(0);
    }
  });
});
