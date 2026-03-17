/**
 * Tests for cost-tracker/log-usage.js — Cost Instrumentation
 *
 * Tests cover:
 *   - Cost calculation from rate table (UT-CB-001 to UT-CB-003)
 *   - Usage record structure (UT-CB-004 to UT-CB-007)
 *   - File system writes (UT-CB-008 to UT-CB-010)
 *   - Monthly totals and budget warnings (UT-CB-011 to UT-CB-013)
 *   - Fallback provider logging (UT-CB-014)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  calculateCost,
  buildUsageRecord,
  appendUsageRecord,
  updateMonthlyTotals,
  readMonthlyTotals,
} = require("../log-usage");

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const RATES = {
  elevenlabs: {
    default: { unit: "char", rate: 0.00022, plan: "creator-100k", monthly_budget: 100000 },
  },
  gemini: {
    "gemini-2.5-flash-image": { unit: "image", rate: 0.04 },
    "gemini-3.1-flash-image-preview": { unit: "image", rate: 0.03 },
    "gemini-3-pro-image-preview": { unit: "image", rate: 0.08 },
  },
  openai: {
    "gpt-image-1": { unit: "image", rate: 0.06 },
    "gpt-image-1-mini": { unit: "image", rate: 0.03 },
  },
  grok: {
    "grok-2-image": { unit: "image", rate: 0.02 },
    "default-tts": { unit: "char", rate: 0.0001 },
  },
  cloudinary: {
    default: { unit: "upload", rate: 0.0, plan: "free" },
  },
};

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cost-tracker-test-"));
}

// ─────────────────────────────────────────────
// calculateCost
// ─────────────────────────────────────────────

describe("calculateCost", () => {
  test("UT-CB-001: ElevenLabs TTS cost = chars * 0.00022", () => {
    const cost = calculateCost("elevenlabs", "default", 412, RATES);
    expect(cost).toBeCloseTo(412 * 0.00022, 6);
  });

  test("UT-CB-002: Gemini flash image cost = 0.04 per image", () => {
    const cost = calculateCost("gemini", "gemini-2.5-flash-image", 1, RATES);
    expect(cost).toBe(0.04);
  });

  test("UT-CB-003: OpenAI gpt-image-1 cost = 0.06 per image", () => {
    const cost = calculateCost("openai", "gpt-image-1", 1, RATES);
    expect(cost).toBe(0.06);
  });

  test("UT-CB-003b: Grok image cost = 0.02 per image", () => {
    const cost = calculateCost("grok", "grok-2-image", 1, RATES);
    expect(cost).toBe(0.02);
  });

  test("UT-CB-003c: Cloudinary cost = 0.00", () => {
    const cost = calculateCost("cloudinary", "default", 1, RATES);
    expect(cost).toBe(0.0);
  });

  test("UT-CB-003d: Grok TTS cost = chars * 0.0001", () => {
    const cost = calculateCost("grok", "default-tts", 500, RATES);
    expect(cost).toBeCloseTo(500 * 0.0001, 6);
  });

  test("UT-CB-003e: unknown model falls back to provider default", () => {
    // ElevenLabs model 'adam' → falls back to 'default' key
    const cost = calculateCost("elevenlabs", "adam", 100, RATES);
    expect(cost).toBeCloseTo(100 * 0.00022, 6);
  });

  test("UT-CB-003f: completely unknown provider throws", () => {
    expect(() => calculateCost("mystery-api", "model-x", 100, RATES)).toThrow();
  });
});

// ─────────────────────────────────────────────
// buildUsageRecord
// ─────────────────────────────────────────────

describe("buildUsageRecord", () => {
  test("UT-CB-004: TTS record has all required fields", () => {
    const record = buildUsageRecord(
      {
        provider: "elevenlabs",
        model: "adam",
        channel: "baby-facts-unlocked",
        video_id: "001-baby-saliva",
        units: 412,
        fallback: false,
        monthlyRunningTotal: 5828,
        monthlyBudget: 100000,
      },
      RATES
    );

    expect(record.provider).toBe("elevenlabs");
    expect(record.model).toBe("adam");
    expect(record.channel).toBe("baby-facts-unlocked");
    expect(record.video_id).toBe("001-baby-saliva");
    expect(record.unit_type).toBe("char");
    expect(record.units_used).toBe(412);
    expect(record.cost_usd).toBeCloseTo(412 * 0.00022, 6);
    expect(record.fallback).toBe(false);
    expect(record.monthly_units_running_total).toBe(5828 + 412);
    expect(record.monthly_budget_remaining_pct).toBeCloseTo(
      ((100000 - (5828 + 412)) / 100000) * 100,
      2
    );
    expect(record.timestamp).toBeDefined();
    expect(typeof record.timestamp).toBe("string");
  });

  test("UT-CB-005: image gen record has correct unit_type", () => {
    const record = buildUsageRecord(
      {
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        channel: "baby-facts-unlocked",
        video_id: "001-baby-saliva",
        units: 1,
        fallback: false,
        monthlyRunningTotal: 0,
        monthlyBudget: null,
      },
      RATES
    );

    expect(record.unit_type).toBe("image");
    expect(record.units_used).toBe(1);
    expect(record.cost_usd).toBe(0.04);
    expect(record.monthly_units_running_total).toBeNull();
    expect(record.monthly_budget_remaining_pct).toBeNull();
  });

  test("UT-CB-006: fallback:true is preserved in record", () => {
    const record = buildUsageRecord(
      {
        provider: "grok",
        model: "default-tts",
        channel: "baby-facts-unlocked",
        video_id: "001-baby-saliva",
        units: 400,
        fallback: true,
        monthlyRunningTotal: 0,
        monthlyBudget: null,
      },
      RATES
    );

    expect(record.fallback).toBe(true);
  });

  test("UT-CB-007: budget_warning set when monthly total exceeds 80%", () => {
    // 81,000 used of 100,000 = 81% → warning
    const record = buildUsageRecord(
      {
        provider: "elevenlabs",
        model: "default",
        channel: "baby-facts-unlocked",
        video_id: "v001",
        units: 500,
        fallback: false,
        monthlyRunningTotal: 80500,
        monthlyBudget: 100000,
      },
      RATES
    );

    expect(record.budget_warning).toBe(true);
  });

  test("UT-CB-007b: no budget_warning below 80%", () => {
    const record = buildUsageRecord(
      {
        provider: "elevenlabs",
        model: "default",
        channel: "baby-facts-unlocked",
        video_id: "v001",
        units: 100,
        fallback: false,
        monthlyRunningTotal: 50000,
        monthlyBudget: 100000,
      },
      RATES
    );

    expect(record.budget_warning).toBe(false);
  });
});

// ─────────────────────────────────────────────
// appendUsageRecord (file system)
// ─────────────────────────────────────────────

describe("appendUsageRecord", () => {
  test("UT-CB-008: creates usage.jsonl with one record", () => {
    const tmpDir = makeTmpDir();
    const record = {
      timestamp: "2026-03-17T09:00:00Z",
      provider: "elevenlabs",
      model: "adam",
      channel: "baby-facts-unlocked",
      video_id: "001",
      unit_type: "char",
      units_used: 412,
      cost_usd: 0.091,
      fallback: false,
      budget_warning: false,
      monthly_units_running_total: 6240,
      monthly_budget_remaining_pct: 93.76,
    };

    appendUsageRecord(record, tmpDir);

    const logPath = path.join(tmpDir, "usage.jsonl");
    expect(fs.existsSync(logPath)).toBe(true);
    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.provider).toBe("elevenlabs");
    expect(parsed.units_used).toBe(412);
  });

  test("UT-CB-009: appends multiple records without overwriting", () => {
    const tmpDir = makeTmpDir();
    const makeRecord = (id) => ({
      timestamp: `2026-03-17T09:0${id}:00Z`,
      provider: "elevenlabs",
      model: "adam",
      channel: "baby-facts-unlocked",
      video_id: `00${id}`,
      unit_type: "char",
      units_used: 100,
      cost_usd: 0.022,
      fallback: false,
      budget_warning: false,
      monthly_units_running_total: 100 * id,
      monthly_budget_remaining_pct: 99,
    });

    appendUsageRecord(makeRecord(1), tmpDir);
    appendUsageRecord(makeRecord(2), tmpDir);
    appendUsageRecord(makeRecord(3), tmpDir);

    const logPath = path.join(tmpDir, "usage.jsonl");
    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[2]).video_id).toBe("003");
  });

  test("UT-CB-010: creates intermediate directories if they don't exist", () => {
    const tmpDir = makeTmpDir();
    const deepDir = path.join(tmpDir, "2026-03-17", "baby-facts-unlocked");
    const record = {
      timestamp: "2026-03-17T09:00:00Z",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      channel: "baby-facts-unlocked",
      video_id: "001",
      unit_type: "image",
      units_used: 1,
      cost_usd: 0.04,
      fallback: false,
      budget_warning: false,
      monthly_units_running_total: null,
      monthly_budget_remaining_pct: null,
    };

    expect(() => appendUsageRecord(record, deepDir)).not.toThrow();
    expect(fs.existsSync(path.join(deepDir, "usage.jsonl"))).toBe(true);
  });
});

// ─────────────────────────────────────────────
// updateMonthlyTotals / readMonthlyTotals
// ─────────────────────────────────────────────

describe("updateMonthlyTotals", () => {
  test("UT-CB-011: creates monthly totals file on first call", () => {
    const tmpDir = makeTmpDir();
    const record = {
      provider: "elevenlabs",
      unit_type: "char",
      units_used: 412,
      cost_usd: 0.091,
    };

    updateMonthlyTotals(record, tmpDir);

    const totals = readMonthlyTotals(tmpDir);
    expect(totals.elevenlabs.total_units).toBe(412);
    expect(totals.elevenlabs.total_cost_usd).toBeCloseTo(0.091, 6);
  });

  test("UT-CB-012: accumulates units across multiple calls", () => {
    const tmpDir = makeTmpDir();
    const record = (units, cost) => ({
      provider: "elevenlabs",
      unit_type: "char",
      units_used: units,
      cost_usd: cost,
    });

    updateMonthlyTotals(record(412, 0.091), tmpDir);
    updateMonthlyTotals(record(389, 0.086), tmpDir);
    updateMonthlyTotals(record(500, 0.110), tmpDir);

    const totals = readMonthlyTotals(tmpDir);
    expect(totals.elevenlabs.total_units).toBe(412 + 389 + 500);
    expect(totals.elevenlabs.total_cost_usd).toBeCloseTo(0.091 + 0.086 + 0.110, 4);
  });

  test("UT-CB-013: tracks multiple providers independently", () => {
    const tmpDir = makeTmpDir();

    updateMonthlyTotals(
      { provider: "elevenlabs", unit_type: "char", units_used: 500, cost_usd: 0.11 },
      tmpDir
    );
    updateMonthlyTotals(
      { provider: "gemini", unit_type: "image", units_used: 3, cost_usd: 0.12 },
      tmpDir
    );

    const totals = readMonthlyTotals(tmpDir);
    expect(totals.elevenlabs.total_units).toBe(500);
    expect(totals.gemini.total_units).toBe(3);
    expect(totals.gemini.total_cost_usd).toBeCloseTo(0.12, 4);
  });

  test("UT-CB-014: image gen providers with null monthly budget get null budget fields", () => {
    const tmpDir = makeTmpDir();
    updateMonthlyTotals(
      { provider: "gemini", unit_type: "image", units_used: 1, cost_usd: 0.04 },
      tmpDir
    );

    const totals = readMonthlyTotals(tmpDir);
    // Gemini doesn't have a monthly budget cap
    expect(totals.gemini.monthly_budget).toBeUndefined();
  });
});
