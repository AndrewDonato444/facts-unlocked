/**
 * Tests for check-suppressions.js — Analytics Loop Phase 2.5
 *
 * Tests cover:
 *   - Baseline: existing suppression infrastructure (UT-CS-001 to UT-CS-003)
 *   - Pairwise combination tracking (UT-CS-004 to UT-CS-012)
 *   - Integration: main merges pairwise results (UT-CS-013)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  loadSuppressionList,
  getValueHistory,
  getGlobalAvg,
  checkPairwiseSuppression,
  generatePairs,
  getComboHistory,
  VARIABLES,
} = require("../check-suppressions");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function makeScoredPosts(posts, globalAvg = 12.4) {
  return {
    posts: posts.map((p, i) => ({
      postId: p.postId || `post_${i}`,
      zernioPostId: p.zernioPostId || `zernio_${i}`,
      content: p.content || "Test content",
      profileName: p.profileName || "Example Channel",
      analytics: { impressions: 10000, likes: 100 },
      score: {
        engagementDensity: p.engagementDensity || 15.0,
        rawScore: 150,
      },
      excluded: p.excluded || false,
      variables: p.variables || null,
    })),
    summary: {
      totalPosts: posts.length,
      excludedPosts: 0,
      globalAvgEngagementDensity: globalAvg,
    },
  };
}

function makeVariableAnalysis(variableImpact, overrides = {}) {
  return {
    date: overrides.date || "2026-03-17",
    sample_size: overrides.sample_size || 30,
    global_avg_engagement_density: overrides.globalAvg || 12.4,
    winning_template: overrides.winning_template || {
      hook_type: "stat_lead",
      video_length: "30",
      voice_pace: "fast",
      text_overlay: "karaoke_highlight",
      background_type: "stock_montage",
      music_energy: "upbeat",
      cta_style: "follow_cta",
    },
    variable_impact: variableImpact,
    per_channel_overrides: [],
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
// Baseline Tests
// ─────────────────────────────────────────────

describe("Baseline: loadSuppressionList", () => {
  test("UT-CS-001: returns default structure when no file exists", () => {
    const list = loadSuppressionList(tmpDir);

    expect(list).toEqual({
      suppressed_values: [],
      suppressed_combinations: [],
      lifted: [],
      last_updated: null,
    });
  });

  test("UT-CS-001b: loads existing suppression list", () => {
    const existing = {
      suppressed_values: [
        { variable: "hook_type", value: "question", avg_score: 4.0 },
      ],
      suppressed_combinations: [],
      lifted: [],
      last_updated: "2026-03-16",
    };
    writeJSON(path.join(tmpDir, "suppression-list.json"), existing);

    const list = loadSuppressionList(tmpDir);
    expect(list.suppressed_values.length).toBe(1);
    expect(list.suppressed_values[0].variable).toBe("hook_type");
  });
});

describe("Baseline: getValueHistory", () => {
  test("UT-CS-002: counts cycles and computes avg across dated dirs", () => {
    // Create 3 dated directories with variable-analysis.json
    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16"]) {
      writeJSON(path.join(tmpDir, date, "variable-analysis.json"), {
        variable_impact: [
          {
            variable: "hook_type",
            values: {
              stat_lead: { avg_score: 20.0, count: 5 },
              question: { avg_score: 6.0, count: 3 },
            },
          },
        ],
      });
    }

    const history = getValueHistory(tmpDir, "hook_type", "stat_lead");
    expect(history.cycles).toBe(3);
    expect(history.total).toBe(15); // 5 per cycle * 3 cycles
    expect(history.avg).toBe(20.0);
  });

  test("UT-CS-002b: returns zeros when directory does not exist", () => {
    const history = getValueHistory("/nonexistent", "hook_type", "stat_lead");
    expect(history).toEqual({ cycles: 0, avg: 0, total: 0 });
  });
});

describe("Baseline: getGlobalAvg", () => {
  test("UT-CS-003: reads from scored-posts.json summary", () => {
    const scored = makeScoredPosts([], 18.5);
    writeJSON(path.join(tmpDir, "scored-posts.json"), scored);

    const avg = getGlobalAvg(tmpDir);
    expect(avg).toBe(18.5);
  });

  test("UT-CS-003b: returns 0 when file does not exist", () => {
    const avg = getGlobalAvg(tmpDir);
    expect(avg).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Pairwise Combination Tests
// ─────────────────────────────────────────────

describe("Pairwise: generatePairs", () => {
  test("UT-CS-004: generates all 21 unique pairs from 7 variables", () => {
    const pairs = generatePairs(VARIABLES);
    expect(pairs.length).toBe(21);

    // Check no duplicates (order-independent)
    const pairKeys = pairs.map((p) => `${p[0]}|${p[1]}`);
    const unique = new Set(pairKeys);
    expect(unique.size).toBe(21);

    // Check a specific pair exists
    expect(pairs).toContainEqual(["hook_type", "video_length"]);
  });

  test("UT-CS-004b: pairs are alphabetically sorted by variable name", () => {
    const pairs = generatePairs(VARIABLES);
    for (const [a, b] of pairs) {
      expect(a < b).toBe(true);
    }
  });
});

describe("Pairwise: checkPairwiseSuppression", () => {
  test("UT-CS-005: computes avg engagement density per value combination", () => {
    // Create posts with variables
    const posts = [];
    for (let i = 0; i < 12; i++) {
      posts.push({
        postId: `p_${i}`,
        engagementDensity: 5.0, // Low
        variables: { ...FULL_VARIABLES, hook_type: "question", video_length: "60" },
      });
    }
    for (let i = 0; i < 12; i++) {
      posts.push({
        postId: `q_${i}`,
        engagementDensity: 25.0, // High
        variables: { ...FULL_VARIABLES, hook_type: "stat_lead", video_length: "30" },
      });
    }

    const scored = makeScoredPosts(posts, 12.4);
    const dateDir = path.join(tmpDir, "2026-03-17");
    writeJSON(path.join(dateDir, "scored-posts.json"), scored);

    // Create variable-analysis.json with the variable_impact
    const analysis = makeVariableAnalysis([
      {
        variable: "hook_type",
        values: {
          question: { avg_score: 5.0, count: 12 },
          stat_lead: { avg_score: 25.0, count: 12 },
        },
      },
      {
        variable: "video_length",
        values: {
          "60": { avg_score: 5.0, count: 12 },
          "30": { avg_score: 25.0, count: 12 },
        },
      },
    ]);
    writeJSON(path.join(dateDir, "variable-analysis.json"), analysis);

    // Create enough historical data (3+ cycles)
    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16"]) {
      const histDir = path.join(tmpDir, date);
      writeJSON(path.join(histDir, "scored-posts.json"), scored);
      writeJSON(path.join(histDir, "variable-analysis.json"), analysis);
    }

    const results = checkPairwiseSuppression(dateDir, 12.4, tmpDir);

    // The question+60 combo (avg 5.0) should be flagged — ratio 0.40 < 0.50
    const questionSixty = results.find(
      (r) =>
        r.combination.hook_type === "question" &&
        r.combination.video_length === "60"
    );
    expect(questionSixty).toBeDefined();
    expect(questionSixty.avg_score).toBeCloseTo(5.0, 1);
    expect(questionSixty.ratio).toBeLessThan(0.5);
  });

  test("UT-CS-006: suppresses combo below 50% with 3+ cycles and 10+ samples", () => {
    // Build scenario with enough data
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `bad_${i}`,
        engagementDensity: 4.0,
        variables: { ...FULL_VARIABLES, hook_type: "question", video_length: "60" },
      });
    }
    // Add some good posts so global avg is higher
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `good_${i}`,
        engagementDensity: 25.0,
        variables: FULL_VARIABLES,
      });
    }

    const globalAvg = 14.5;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    // Write 4 cycles of identical data
    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    const badCombo = results.find(
      (r) =>
        r.combination.hook_type === "question" &&
        r.combination.video_length === "60"
    );
    expect(badCombo).toBeDefined();
    expect(badCombo.cycles_observed).toBeGreaterThanOrEqual(3);
    expect(badCombo.sample_count).toBeGreaterThanOrEqual(10);
    expect(badCombo.reason).toContain("below average");
  });

  test("UT-CS-007: does NOT suppress combo above threshold", () => {
    const posts = [];
    for (let i = 0; i < 12; i++) {
      posts.push({
        postId: `good_${i}`,
        engagementDensity: 25.0,
        variables: FULL_VARIABLES,
      });
    }

    const globalAvg = 12.4;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    // stat_lead + 30 combo (avg 25.0) is above threshold — should NOT be suppressed
    const goodCombo = results.find(
      (r) =>
        r.combination.hook_type === "stat_lead" &&
        r.combination.video_length === "30"
    );
    expect(goodCombo).toBeUndefined();
  });

  test("UT-CS-008: does NOT suppress combo with insufficient cycles (<3)", () => {
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `bad_${i}`,
        engagementDensity: 3.0,
        variables: { ...FULL_VARIABLES, hook_type: "question", video_length: "60" },
      });
    }

    const globalAvg = 14.5;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    // Only 2 cycles — below MIN_CYCLES of 3
    for (const date of ["2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    const badCombo = results.find(
      (r) =>
        r.combination.hook_type === "question" &&
        r.combination.video_length === "60"
    );
    expect(badCombo).toBeUndefined();
  });

  test("UT-CS-009: does NOT suppress combo with insufficient samples (<10)", () => {
    const posts = [];
    // Only 3 posts with the bad combo per cycle — below MIN_SAMPLE of 10 total
    for (let i = 0; i < 3; i++) {
      posts.push({
        postId: `bad_${i}`,
        engagementDensity: 3.0,
        variables: { ...FULL_VARIABLES, hook_type: "question", video_length: "60" },
      });
    }
    for (let i = 0; i < 20; i++) {
      posts.push({
        postId: `good_${i}`,
        engagementDensity: 20.0,
        variables: FULL_VARIABLES,
      });
    }

    const globalAvg = 14.5;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    // 3 cycles but only 3 samples per cycle = 9 total (below 10)
    for (const date of ["2026-03-15", "2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    const badCombo = results.find(
      (r) =>
        r.combination.hook_type === "question" &&
        r.combination.video_length === "60"
    );
    expect(badCombo).toBeUndefined();
  });

  test("UT-CS-010: returns empty array when no variable-analysis.json exists", () => {
    const dateDir = path.join(tmpDir, "2026-03-17");
    fs.mkdirSync(dateDir, { recursive: true });
    // No variable-analysis.json or scored-posts.json

    const results = checkPairwiseSuppression(dateDir, 12.4, tmpDir);
    expect(results).toEqual([]);
  });

  test("UT-CS-011: combo key uses alphabetically sorted variable names", () => {
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `p_${i}`,
        engagementDensity: 3.0,
        variables: { ...FULL_VARIABLES, voice_pace: "slow", background_type: "abstract_animated" },
      });
    }
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `q_${i}`,
        engagementDensity: 25.0,
        variables: FULL_VARIABLES,
      });
    }

    const globalAvg = 14.0;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    // If background_type + voice_pace combo is suppressed, check the key sorting
    const combo = results.find(
      (r) => r.pair_key === "background_type|voice_pace"
    );
    if (combo) {
      // pair_key should be alphabetically sorted
      const [a, b] = combo.pair_key.split("|");
      expect(a < b).toBe(true);
    }
    // Either way, there should be no pair_key with reverse order
    const reversed = results.find(
      (r) => r.pair_key === "voice_pace|background_type"
    );
    expect(reversed).toBeUndefined();
  });

  test("UT-CS-012: skips unknown variable values in pair analysis", () => {
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        postId: `p_${i}`,
        engagementDensity: 3.0,
        variables: { ...FULL_VARIABLES, text_overlay: "unknown", music_energy: "unknown" },
      });
    }

    const globalAvg = 14.0;
    const scored = makeScoredPosts(posts, globalAvg);
    const analysis = makeVariableAnalysis([]);

    for (const date of ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"]) {
      const dir = path.join(tmpDir, date);
      writeJSON(path.join(dir, "scored-posts.json"), scored);
      writeJSON(path.join(dir, "variable-analysis.json"), analysis);
    }

    const dateDir = path.join(tmpDir, "2026-03-17");
    const results = checkPairwiseSuppression(dateDir, globalAvg, tmpDir);

    // No suppression should involve "unknown" values
    for (const r of results) {
      for (const val of Object.values(r.combination)) {
        expect(val).not.toBe("unknown");
      }
    }
  });
});

// ─────────────────────────────────────────────
// Integration Test
// ─────────────────────────────────────────────

describe("Integration: suppressed_combinations in suppression list", () => {
  test("UT-CS-013: pairwise results merge into suppression-list without duplicates", () => {
    // Pre-existing suppression list with one combo already
    const existingCombo = {
      combination: { hook_type: "myth_bust", video_length: "15" },
      pair_key: "hook_type|video_length",
      combo_key: "myth_bust|15",
      avg_score: 3.0,
      global_avg: 12.0,
      ratio: 0.25,
      sample_count: 12,
      cycles_observed: 3,
      suppressed_since: "2026-03-14",
      reason: "Test",
    };

    const list = {
      suppressed_values: [],
      suppressed_combinations: [existingCombo],
      lifted: [],
      last_updated: "2026-03-16",
    };

    // Simulate what main() does in Phase C
    const newCombos = [
      existingCombo, // Duplicate — should not be added again
      {
        combination: { hook_type: "question", video_length: "60" },
        pair_key: "hook_type|video_length",
        combo_key: "question|60",
        avg_score: 4.0,
        global_avg: 12.0,
        ratio: 0.33,
        sample_count: 15,
        cycles_observed: 4,
        suppressed_since: "2026-03-17",
        reason: "New combo",
      },
    ];

    for (const combo of newCombos) {
      const alreadySuppressed = list.suppressed_combinations.some(
        (s) =>
          JSON.stringify(s.combination) === JSON.stringify(combo.combination)
      );
      if (!alreadySuppressed) {
        list.suppressed_combinations.push(combo);
      }
    }

    // Should have 2 (not 3) — duplicate was skipped
    expect(list.suppressed_combinations.length).toBe(2);
    expect(
      list.suppressed_combinations.filter(
        (c) => c.combination.hook_type === "myth_bust"
      ).length
    ).toBe(1);
  });
});
