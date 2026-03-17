/**
 * Tests for analytics-loop/scripts/daily-briefing.js — Daily Briefing Generator
 *
 * Tests cover:
 *   - Cost log aggregation (UT-DB-001 to UT-DB-005)
 *   - Briefing data assembly (UT-DB-006 to UT-DB-010)
 *   - Formatted output (UT-DB-011 to UT-DB-014)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  aggregateCostLogs,
  buildBriefingData,
  formatBriefing,
} = require("../daily-briefing");

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "daily-briefing-test-"));
}

function writeUsageLog(logsBaseDir, date, channel, records) {
  const dir = path.join(logsBaseDir, date, channel);
  fs.mkdirSync(dir, { recursive: true });
  const lines = records.map((r) => JSON.stringify(r)).join("\n");
  fs.writeFileSync(path.join(dir, "usage.jsonl"), lines + "\n");
}

function makeRecord(overrides = {}) {
  return {
    timestamp: "2026-03-17T09:00:00Z",
    provider: overrides.provider || "elevenlabs",
    model: overrides.model || "adam",
    channel: overrides.channel || "baby-facts-unlocked",
    video_id: overrides.video_id || "001-baby-saliva",
    unit_type: overrides.unit_type || "char",
    units_used: overrides.units_used || 412,
    cost_usd: overrides.cost_usd || 0.091,
    fallback: overrides.fallback || false,
    budget_warning: overrides.budget_warning || false,
    monthly_units_running_total: overrides.monthly_units_running_total || 6240,
    monthly_budget_remaining_pct: overrides.monthly_budget_remaining_pct || 93.76,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// aggregateCostLogs
// ─────────────────────────────────────────────

describe("aggregateCostLogs", () => {
  test("UT-DB-001: aggregates records from single channel into per-video cost map", () => {
    const tmpDir = makeTmpDir();
    const date = "2026-03-17";

    writeUsageLog(tmpDir, date, "baby-facts-unlocked", [
      makeRecord({ video_id: "001-baby-saliva", provider: "elevenlabs", cost_usd: 0.091 }),
      makeRecord({ video_id: "001-baby-saliva", provider: "gemini", unit_type: "image", cost_usd: 0.04, monthly_units_running_total: null, monthly_budget_remaining_pct: null }),
      makeRecord({ video_id: "002-baby-hiccups", provider: "elevenlabs", cost_usd: 0.086 }),
      makeRecord({ video_id: "002-baby-hiccups", provider: "gemini", unit_type: "image", cost_usd: 0.04, monthly_units_running_total: null, monthly_budget_remaining_pct: null }),
    ]);

    const result = aggregateCostLogs(tmpDir, date);

    expect(result.channels["baby-facts-unlocked"]).toBeDefined();
    const ch = result.channels["baby-facts-unlocked"];
    expect(ch.videos["001-baby-saliva"].total_cost).toBeCloseTo(0.131, 4);
    expect(ch.videos["002-baby-hiccups"].total_cost).toBeCloseTo(0.126, 4);
    expect(ch.total_cost).toBeCloseTo(0.131 + 0.126, 4);
  });

  test("UT-DB-002: aggregates across multiple channels", () => {
    const tmpDir = makeTmpDir();
    const date = "2026-03-17";

    writeUsageLog(tmpDir, date, "baby-facts-unlocked", [
      makeRecord({ channel: "baby-facts-unlocked", video_id: "001", cost_usd: 0.10 }),
    ]);
    writeUsageLog(tmpDir, date, "money-facts-unlocked", [
      makeRecord({ channel: "money-facts-unlocked", video_id: "m001", cost_usd: 0.12 }),
    ]);

    const result = aggregateCostLogs(tmpDir, date);

    expect(result.channels["baby-facts-unlocked"]).toBeDefined();
    expect(result.channels["money-facts-unlocked"]).toBeDefined();
    expect(result.total_cost).toBeCloseTo(0.22, 4);
  });

  test("UT-DB-003: returns zero-cost result when no logs exist for date", () => {
    const tmpDir = makeTmpDir();
    const date = "2026-03-17";

    const result = aggregateCostLogs(tmpDir, date);

    expect(result.channels).toEqual({});
    expect(result.total_cost).toBe(0);
    expect(result.video_count).toBe(0);
  });

  test("UT-DB-004: correctly sums per-provider costs within a video", () => {
    const tmpDir = makeTmpDir();
    const date = "2026-03-17";

    writeUsageLog(tmpDir, date, "baby-facts-unlocked", [
      makeRecord({ video_id: "001", provider: "elevenlabs", cost_usd: 0.091, unit_type: "char" }),
      makeRecord({ video_id: "001", provider: "gemini", cost_usd: 0.04, unit_type: "image", monthly_units_running_total: null, monthly_budget_remaining_pct: null }),
    ]);

    const result = aggregateCostLogs(tmpDir, date);
    const video = result.channels["baby-facts-unlocked"].videos["001"];

    expect(video.by_provider.elevenlabs).toBeDefined();
    expect(video.by_provider.elevenlabs.cost_usd).toBeCloseTo(0.091, 4);
    expect(video.by_provider.gemini).toBeDefined();
    expect(video.by_provider.gemini.cost_usd).toBeCloseTo(0.04, 4);
  });

  test("UT-DB-005: budget_warning is surfaced in aggregated result if any record has it", () => {
    const tmpDir = makeTmpDir();
    const date = "2026-03-17";

    writeUsageLog(tmpDir, date, "baby-facts-unlocked", [
      makeRecord({ video_id: "001", budget_warning: true, cost_usd: 0.091 }),
    ]);

    const result = aggregateCostLogs(tmpDir, date);
    expect(result.budget_warnings.length).toBeGreaterThan(0);
    expect(result.budget_warnings[0].provider).toBe("elevenlabs");
  });
});

// ─────────────────────────────────────────────
// buildBriefingData
// ─────────────────────────────────────────────

describe("buildBriefingData", () => {
  const MONTHLY_TOTALS = {
    elevenlabs: { total_units: 23480, total_cost_usd: 5.17, unit_type: "char" },
  };

  const ANALYTICS_DATA = {
    available: true,
    topPosts: [
      { id: "post-1", content: "baby-myth-hiccups", score: 87.3, platform: "TikTok" },
      { id: "post-2", content: "baby-saliva-surprising", score: 74.1, platform: "YouTube" },
      { id: "post-3", content: "money-compound-fact", score: 68.9, platform: "YouTube" },
    ],
    winningVariables: [
      { variable: "hook_type", value: "question", lift: "+23%" },
      { variable: "video_length", value: "30s", lift: "+18%" },
    ],
    suppressedVariables: [
      { variable: "voice_pace", value: "fast", reason: "below threshold (3 cycles)" },
    ],
  };

  test("UT-DB-006: full briefing data includes all required sections", () => {
    const costData = {
      channels: {
        "baby-facts-unlocked": {
          videos: {
            "001": { total_cost: 0.13, by_provider: {} },
            "002": { total_cost: 0.13, by_provider: {} },
          },
          total_cost: 0.26,
        },
      },
      total_cost: 0.26,
      video_count: 2,
      budget_warnings: [],
    };

    const data = buildBriefingData({
      costData,
      analyticsData: ANALYTICS_DATA,
      monthlyTotals: MONTHLY_TOTALS,
      date: "2026-03-17",
      elevenLabsPlanBudget: 100000,
      elevenLabsPlanCost: 22,
    });

    expect(data.date).toBe("2026-03-17");
    expect(data.content.total_videos).toBe(2);
    expect(data.cost.total_usd).toBeCloseTo(0.26, 4);
    expect(data.cost.avg_per_video).toBeCloseTo(0.13, 4);
    expect(data.monthly_burn.elevenlabs).toBeDefined();
    expect(data.monthly_burn.elevenlabs.chars_used).toBe(23480);
    expect(data.monthly_burn.elevenlabs.pct_used).toBeCloseTo(23.48, 1);
    expect(data.analytics.top_posts.length).toBe(3);
    expect(data.analytics.winning_variables.length).toBe(2);
  });

  test("UT-DB-007: no content today shows zero cost", () => {
    const costData = {
      channels: {},
      total_cost: 0,
      video_count: 0,
      budget_warnings: [],
    };

    const data = buildBriefingData({
      costData,
      analyticsData: ANALYTICS_DATA,
      monthlyTotals: MONTHLY_TOTALS,
      date: "2026-03-17",
      elevenLabsPlanBudget: 100000,
      elevenLabsPlanCost: 22,
    });

    expect(data.content.total_videos).toBe(0);
    expect(data.cost.total_usd).toBe(0);
    expect(data.content.no_content_today).toBe(true);
  });

  test("UT-DB-008: analytics unavailable sets analytics.available to false", () => {
    const costData = {
      channels: { "baby-facts-unlocked": { videos: { "001": { total_cost: 0.13 } }, total_cost: 0.13 } },
      total_cost: 0.13,
      video_count: 1,
      budget_warnings: [],
    };

    const data = buildBriefingData({
      costData,
      analyticsData: { available: false },
      monthlyTotals: MONTHLY_TOTALS,
      date: "2026-03-17",
      elevenLabsPlanBudget: 100000,
      elevenLabsPlanCost: 22,
    });

    expect(data.analytics.available).toBe(false);
    expect(data.analytics.message).toMatch(/48/);
  });

  test("UT-DB-009: monthly burn rate projection computed correctly", () => {
    // 23480 chars used by March 17 (day 17 of 31-day month)
    // Daily rate = 23480 / 17 = 1381.2 chars/day
    // Projected monthly = 1381.2 * 31 = ~42,816 chars = ~$9.42
    const costData = { channels: {}, total_cost: 0, video_count: 0, budget_warnings: [] };

    const data = buildBriefingData({
      costData,
      analyticsData: { available: false },
      monthlyTotals: { elevenlabs: { total_units: 23480, total_cost_usd: 5.17, unit_type: "char" } },
      date: "2026-03-17",
      elevenLabsPlanBudget: 100000,
      elevenLabsPlanCost: 22,
    });

    expect(data.monthly_burn.elevenlabs.projected_monthly_units).toBeGreaterThan(0);
    expect(data.monthly_burn.elevenlabs.amortized_cost_usd).toBeCloseTo(5.17, 2);
  });

  test("UT-DB-010: budget warning surfaced in briefing data when present", () => {
    const costData = {
      channels: {},
      total_cost: 0,
      video_count: 0,
      budget_warnings: [{ provider: "elevenlabs", channel: "baby-facts-unlocked", video_id: "001" }],
    };

    const data = buildBriefingData({
      costData,
      analyticsData: { available: false },
      monthlyTotals: MONTHLY_TOTALS,
      date: "2026-03-17",
      elevenLabsPlanBudget: 100000,
      elevenLabsPlanCost: 22,
    });

    expect(data.budget_warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// formatBriefing
// ─────────────────────────────────────────────

describe("formatBriefing", () => {
  function makeFullBriefingData() {
    return {
      date: "2026-03-17",
      content: {
        total_videos: 9,
        no_content_today: false,
        by_channel: {
          "baby-facts-unlocked": { video_count: 6 },
          "money-facts-unlocked": { video_count: 3 },
        },
      },
      cost: {
        total_usd: 1.17,
        avg_per_video: 0.13,
        by_channel: {
          "baby-facts-unlocked": {
            total_cost: 0.78,
            videos: {
              "001-baby-saliva": {
                total_cost: 0.13,
                by_provider: {
                  elevenlabs: { cost_usd: 0.091, units_used: 412, unit_type: "char" },
                  gemini: { cost_usd: 0.04, units_used: 1, unit_type: "image" },
                },
              },
            },
          },
        },
        by_provider_summary: {
          elevenlabs: { total_cost: 0.81 },
          gemini: { total_cost: 0.36 },
        },
      },
      monthly_burn: {
        elevenlabs: {
          chars_used: 23480,
          monthly_budget: 100000,
          pct_used: 23.48,
          amortized_cost_usd: 5.17,
          plan_cost_usd: 22,
          projected_monthly_units: 42800,
          projected_monthly_cost_usd: 8.62,
          status: "ok",
        },
      },
      analytics: {
        available: true,
        top_posts: [
          { content: "baby-myth-hiccups", score: 87.3, platform: "TikTok" },
        ],
        winning_variables: [
          { variable: "hook_type", value: "question", lift: "+23%" },
        ],
        suppressed_variables: [
          { variable: "voice_pace", value: "fast", reason: "below threshold (3 cycles)" },
        ],
      },
      budget_warnings: [],
    };
  }

  test("UT-DB-011: formatted output contains date header", () => {
    const output = formatBriefing(makeFullBriefingData());
    expect(output).toContain("FACTS UNLOCKED");
    expect(output).toContain("2026-03-17");
  });

  test("UT-DB-012: formatted output includes total cost and avg per video", () => {
    const output = formatBriefing(makeFullBriefingData());
    expect(output).toContain("$1.17");
    expect(output).toContain("$0.13");
  });

  test("UT-DB-013: no-content day shows appropriate message", () => {
    const data = makeFullBriefingData();
    data.content.total_videos = 0;
    data.content.no_content_today = true;
    data.cost.total_usd = 0;
    const output = formatBriefing(data);
    expect(output).toMatch(/no videos generated today/i);
    expect(output).toContain("$0.00");
  });

  test("UT-DB-014: analytics unavailable shows appropriate message", () => {
    const data = makeFullBriefingData();
    data.analytics.available = false;
    data.analytics.message = "No data yet — posts are <48hrs old";
    const output = formatBriefing(data);
    expect(output).toMatch(/no data yet|48hrs/i);
  });

  test("UT-DB-015: budget warning appears in output when flagged", () => {
    const data = makeFullBriefingData();
    data.budget_warnings = [{ provider: "elevenlabs", channel: "baby-facts-unlocked", video_id: "001" }];
    const output = formatBriefing(data);
    expect(output).toMatch(/warning|budget/i);
  });

  test("UT-DB-016: monthly burn section shows chars used and percentage", () => {
    const output = formatBriefing(makeFullBriefingData());
    expect(output).toContain("23,480");
    expect(output).toMatch(/100,000|100000/);
    expect(output).toMatch(/23\.4|23\.5/); // pct
  });

  test("UT-DB-017: Cloudinary shown as free in output", () => {
    const data = makeFullBriefingData();
    const output = formatBriefing(data);
    // Cloudinary should not show a cost line or should show as free
    // (it's not in the cost data so it shows as media hosting free note)
    expect(output).toMatch(/cloudinary|media hosting|free/i);
  });
});
