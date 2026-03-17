/**
 * Tests for research-loop.js — Continuous Learning Loop
 *
 * Tests cover:
 *   - Signal filtering: only signals from last 7 days (UT-RL-001 to UT-RL-003)
 *   - Brief structure and required fields (UT-RL-004 to UT-RL-006)
 *   - Graceful degradation: partial source failure (UT-RL-007 to UT-RL-009)
 *   - No signals found: carry-forward brief (UT-RL-010 to UT-RL-011)
 *   - Pattern archive accumulation (UT-RL-012 to UT-RL-015)
 *   - Brief injection into generate-briefs topic_guidance (UT-RL-016 to UT-RL-018)
 *   - Week stamp utilities (UT-RL-019 to UT-RL-020)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  filterToLastNDays,
  buildBrief,
  updatePatternArchive,
  injectResearchIntoTopicGuidance,
  getWeekStamp,
  getLatestResearchBrief,
} = require("../research-loop");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rl-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function makeSignal(overrides = {}) {
  return {
    signal: overrides.signal || "Use a 0.5s visual hook in first frame",
    source: overrides.source || "Robert Benjamin",
    confidence: overrides.confidence || "high",
    faceless_applicable: overrides.faceless_applicable !== undefined ? overrides.faceless_applicable : true,
    published_date: overrides.published_date || "2026-03-15",
    raw_quote: overrides.raw_quote || null,
  };
}

function makeChannelBrief(overrides = {}) {
  return {
    date: overrides.date || "2026-03-18",
    channel: overrides.channel || "Baby Facts Unlocked",
    profile_id: overrides.profile_id || "profile_baby_001",
    briefs: overrides.briefs || [
      {
        slot: 1,
        type: "exploit",
        template: { hook_type: "statistic", video_length: "short" },
        topic_guidance: "Use the winning template.",
        schedule_time: "09:00",
      },
    ],
  };
}

// ─────────────────────────────────────────────
// UT-RL-001: filterToLastNDays — keeps signals within window
// ─────────────────────────────────────────────
test("UT-RL-001: filterToLastNDays keeps signals published within last 7 days", () => {
  const referenceDate = "2026-03-17";
  const signals = [
    makeSignal({ published_date: "2026-03-17" }), // today — keep
    makeSignal({ published_date: "2026-03-11" }), // 6 days ago — keep
    makeSignal({ published_date: "2026-03-10" }), // 7 days ago — boundary — keep
    makeSignal({ published_date: "2026-03-09" }), // 8 days ago — exclude
    makeSignal({ published_date: "2026-03-01" }), // old — exclude
  ];

  const result = filterToLastNDays(signals, 7, referenceDate);
  expect(result).toHaveLength(3);
  expect(result.map((s) => s.published_date)).not.toContain("2026-03-09");
  expect(result.map((s) => s.published_date)).not.toContain("2026-03-01");
});

// ─────────────────────────────────────────────
// UT-RL-002: filterToLastNDays — empty input returns empty array
// ─────────────────────────────────────────────
test("UT-RL-002: filterToLastNDays with empty array returns empty array", () => {
  const result = filterToLastNDays([], 7, "2026-03-17");
  expect(result).toEqual([]);
});

// ─────────────────────────────────────────────
// UT-RL-003: filterToLastNDays — all signals old returns empty
// ─────────────────────────────────────────────
test("UT-RL-003: filterToLastNDays excludes all signals when all are older than window", () => {
  const signals = [
    makeSignal({ published_date: "2026-02-01" }),
    makeSignal({ published_date: "2026-01-15" }),
  ];
  const result = filterToLastNDays(signals, 7, "2026-03-17");
  expect(result).toHaveLength(0);
});

// ─────────────────────────────────────────────
// UT-RL-004: buildBrief — returns required fields
// ─────────────────────────────────────────────
test("UT-RL-004: buildBrief returns a brief with all required top-level fields", () => {
  const signals = [
    makeSignal({ signal: "Hook tactic A", source: "Robert Benjamin" }),
    makeSignal({ signal: "Hook tactic B", source: "vidIQ" }),
    makeSignal({ signal: "Retention tactic C", source: "Reddit" }),
  ];
  const tactics = [
    { rank: 1, tactic: "Use 0.5s visual hook", why: "Stops scroll", source: "Robert Benjamin", test_ideas: ["test 1"] },
  ];
  const channels = ["Baby Facts Unlocked", "Money Facts Unlocked"];
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: ["web-search", "reddit"],
    sources_skipped: [],
  };

  const brief = buildBrief(signals, tactics, channels, options);

  expect(brief).toHaveProperty("generated_at");
  expect(brief).toHaveProperty("week", "2026-12");
  expect(brief).toHaveProperty("date", "2026-03-17");
  expect(brief).toHaveProperty("sources_fetched");
  expect(brief).toHaveProperty("sources_skipped");
  expect(brief).toHaveProperty("signals");
  expect(brief).toHaveProperty("tactics");
  expect(brief).toHaveProperty("per_channel_recommendations");
  expect(brief).toHaveProperty("action_items");
  expect(brief.carry_forward_note).toBeNull();
});

// ─────────────────────────────────────────────
// UT-RL-005: buildBrief — per_channel_recommendations has entry per channel
// ─────────────────────────────────────────────
test("UT-RL-005: buildBrief includes one recommendation block per channel", () => {
  const signals = [makeSignal(), makeSignal(), makeSignal()];
  const tactics = [{ rank: 1, tactic: "hook test", why: "reason", source: "web", test_ideas: [] }];
  const channels = ["Baby Facts Unlocked", "Money Facts Unlocked", "Food Facts Unlocked"];
  const options = { week: "2026-12", date: "2026-03-17", sources_fetched: ["web"], sources_skipped: [] };

  const brief = buildBrief(signals, tactics, channels, options);

  expect(brief.per_channel_recommendations).toHaveLength(3);
  const names = brief.per_channel_recommendations.map((r) => r.channel);
  expect(names).toContain("Baby Facts Unlocked");
  expect(names).toContain("Money Facts Unlocked");
  expect(names).toContain("Food Facts Unlocked");
});

// ─────────────────────────────────────────────
// UT-RL-006: buildBrief — action_items ranked 1 through N
// ─────────────────────────────────────────────
test("UT-RL-006: buildBrief action_items have sequential priority starting at 1", () => {
  const signals = [makeSignal(), makeSignal(), makeSignal()];
  const tactics = [
    { rank: 1, tactic: "tactic A", why: "reason", source: "web", test_ideas: [] },
    { rank: 2, tactic: "tactic B", why: "reason", source: "Reddit", test_ideas: [] },
    { rank: 3, tactic: "tactic C", why: "reason", source: "vidIQ", test_ideas: [] },
  ];
  const options = { week: "2026-12", date: "2026-03-17", sources_fetched: ["web"], sources_skipped: [] };

  const brief = buildBrief(signals, tactics, ["Baby Facts Unlocked"], options);

  expect(brief.action_items.length).toBeGreaterThan(0);
  const priorities = brief.action_items.map((a) => a.priority);
  expect(priorities[0]).toBe(1);
  expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
});

// ─────────────────────────────────────────────
// UT-RL-007: graceful degradation — sources_skipped populated when source fails
// ─────────────────────────────────────────────
test("UT-RL-007: buildBrief records skipped sources in sources_skipped", () => {
  const signals = [makeSignal()];
  const tactics = [{ rank: 1, tactic: "test", why: "reason", source: "web", test_ideas: [] }];
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: ["web-search"],
    sources_skipped: ["reddit", "vidiq"],
  };

  const brief = buildBrief(signals, tactics, ["Baby Facts Unlocked"], options);

  expect(brief.sources_skipped).toEqual(["reddit", "vidiq"]);
  expect(brief.sources_fetched).toEqual(["web-search"]);
});

// ─────────────────────────────────────────────
// UT-RL-008: graceful degradation — brief still valid with 1 source
// ─────────────────────────────────────────────
test("UT-RL-008: buildBrief produces a valid brief even with only 1 source", () => {
  const signals = [makeSignal({ source: "web-search" })];
  const tactics = [{ rank: 1, tactic: "single source tactic", why: "reason", source: "web-search", test_ideas: [] }];
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: ["web-search"],
    sources_skipped: ["reddit", "vidiq", "creator-insider"],
  };

  const brief = buildBrief(signals, tactics, ["Baby Facts Unlocked"], options);

  expect(brief.signals).toHaveLength(1);
  expect(brief.tactics).toHaveLength(1);
  // Brief is structurally valid even with degraded inputs
  expect(brief).toHaveProperty("per_channel_recommendations");
  expect(brief).toHaveProperty("action_items");
});

// ─────────────────────────────────────────────
// UT-RL-009: graceful degradation — no tactics still produces valid brief
// ─────────────────────────────────────────────
test("UT-RL-009: buildBrief with empty signals sets carry_forward_note", () => {
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: [],
    sources_skipped: ["reddit", "vidiq", "web-search"],
  };

  const brief = buildBrief([], [], ["Baby Facts Unlocked"], options);

  expect(brief.signals).toHaveLength(0);
  expect(brief.tactics).toHaveLength(0);
  expect(brief.carry_forward_note).toMatch(/carry forward/i);
});

// ─────────────────────────────────────────────
// UT-RL-010: no signals found — carry_forward_note set
// ─────────────────────────────────────────────
test("UT-RL-010: buildBrief with zero signals sets carry_forward_note", () => {
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: ["web-search", "reddit"],
    sources_skipped: [],
  };

  const brief = buildBrief([], [], ["Baby Facts Unlocked"], options);

  expect(brief.carry_forward_note).not.toBeNull();
  expect(typeof brief.carry_forward_note).toBe("string");
  expect(brief.carry_forward_note.length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────
// UT-RL-011: no signals found — brief action_items is empty, not errored
// ─────────────────────────────────────────────
test("UT-RL-011: buildBrief with empty signals has empty action_items (not null/undefined)", () => {
  const options = {
    week: "2026-12",
    date: "2026-03-17",
    sources_fetched: ["web-search"],
    sources_skipped: [],
  };

  const brief = buildBrief([], [], [], options);

  expect(Array.isArray(brief.action_items)).toBe(true);
  expect(brief.action_items).toHaveLength(0);
});

// ─────────────────────────────────────────────
// UT-RL-012: updatePatternArchive — creates archive if missing
// ─────────────────────────────────────────────
test("UT-RL-012: updatePatternArchive creates pattern-archive.json if it does not exist", () => {
  const archivePath = path.join(tmpDir, "pattern-archive.json");
  const brief = {
    week: "2026-12",
    date: "2026-03-17",
    tactics: [
      { rank: 1, tactic: "0.5s visual hook", why: "reason", source: "Robert Benjamin", test_ideas: [] },
    ],
  };

  updatePatternArchive(brief, archivePath);

  expect(fs.existsSync(archivePath)).toBe(true);
  const archive = JSON.parse(fs.readFileSync(archivePath, "utf-8"));
  expect(archive).toHaveProperty("patterns");
  expect(archive).toHaveProperty("last_updated");
  expect(Array.isArray(archive.patterns)).toBe(true);
});

// ─────────────────────────────────────────────
// UT-RL-013: updatePatternArchive — new tactic added to archive
// ─────────────────────────────────────────────
test("UT-RL-013: updatePatternArchive adds a new tactic as a pattern entry", () => {
  const archivePath = path.join(tmpDir, "pattern-archive.json");
  const brief = {
    week: "2026-12",
    date: "2026-03-17",
    tactics: [
      { rank: 1, tactic: "question CTA at 5s mark", why: "doubles comments", source: "Reddit", test_ideas: [] },
    ],
  };

  updatePatternArchive(brief, archivePath);

  const archive = JSON.parse(fs.readFileSync(archivePath, "utf-8"));
  const pattern = archive.patterns.find((p) => p.tactic === "question CTA at 5s mark");
  expect(pattern).toBeDefined();
  expect(pattern.first_seen).toBe("2026-12");
  expect(pattern.last_seen).toBe("2026-12");
  expect(pattern.weeks_observed).toBe(1);
  expect(pattern.source_count).toBe(1);
});

// ─────────────────────────────────────────────
// UT-RL-014: updatePatternArchive — existing tactic increments weeks_observed
// ─────────────────────────────────────────────
test("UT-RL-014: updatePatternArchive increments weeks_observed for a returning tactic", () => {
  const archivePath = path.join(tmpDir, "pattern-archive.json");

  // Pre-populate archive with existing pattern
  writeJSON(archivePath, {
    patterns: [
      {
        tactic: "0.5s visual hook",
        first_seen: "2026-11",
        last_seen: "2026-11",
        weeks_observed: 1,
        source_count: 2,
      },
    ],
    last_updated: "2026-03-10",
  });

  const brief = {
    week: "2026-12",
    date: "2026-03-17",
    tactics: [
      { rank: 1, tactic: "0.5s visual hook", why: "still trending", source: "vidIQ", test_ideas: [] },
    ],
  };

  updatePatternArchive(brief, archivePath);

  const archive = JSON.parse(fs.readFileSync(archivePath, "utf-8"));
  const pattern = archive.patterns.find((p) => p.tactic === "0.5s visual hook");
  expect(pattern.weeks_observed).toBe(2);
  expect(pattern.last_seen).toBe("2026-12");
  expect(pattern.first_seen).toBe("2026-11"); // unchanged
  expect(pattern.source_count).toBe(3); // 2 + 1 new source
});

// ─────────────────────────────────────────────
// UT-RL-015: updatePatternArchive — multiple tactics in one brief
// ─────────────────────────────────────────────
test("UT-RL-015: updatePatternArchive handles multiple tactics in one brief", () => {
  const archivePath = path.join(tmpDir, "pattern-archive.json");
  const brief = {
    week: "2026-12",
    date: "2026-03-17",
    tactics: [
      { rank: 1, tactic: "tactic alpha", why: "reason", source: "web", test_ideas: [] },
      { rank: 2, tactic: "tactic beta", why: "reason", source: "Reddit", test_ideas: [] },
      { rank: 3, tactic: "tactic gamma", why: "reason", source: "vidIQ", test_ideas: [] },
    ],
  };

  updatePatternArchive(brief, archivePath);

  const archive = JSON.parse(fs.readFileSync(archivePath, "utf-8"));
  expect(archive.patterns).toHaveLength(3);
  const names = archive.patterns.map((p) => p.tactic);
  expect(names).toContain("tactic alpha");
  expect(names).toContain("tactic beta");
  expect(names).toContain("tactic gamma");
});

// ─────────────────────────────────────────────
// UT-RL-016: injectResearchIntoTopicGuidance — appends signal to topic_guidance
// ─────────────────────────────────────────────
test("UT-RL-016: injectResearchIntoTopicGuidance appends top tactic to topic_guidance", () => {
  const channelBriefs = [makeChannelBrief()];
  const researchBrief = {
    week: "2026-12",
    tactics: [
      { rank: 1, tactic: "Use a 0.5s visual hook in the first frame", why: "reason", source: "Robert Benjamin", test_ideas: [] },
      { rank: 2, tactic: "End with a question CTA", why: "reason", source: "Reddit", test_ideas: [] },
    ],
  };

  const result = injectResearchIntoTopicGuidance(channelBriefs, researchBrief);

  const slot = result[0].briefs[0];
  expect(slot.topic_guidance).toContain("External signal");
  expect(slot.topic_guidance).toContain("0.5s visual hook");
});

// ─────────────────────────────────────────────
// UT-RL-017: injectResearchIntoTopicGuidance — does NOT change template variables
// ─────────────────────────────────────────────
test("UT-RL-017: injectResearchIntoTopicGuidance does not modify template variables", () => {
  const channelBriefs = [makeChannelBrief()];
  const originalTemplate = { ...channelBriefs[0].briefs[0].template };
  const researchBrief = {
    week: "2026-12",
    tactics: [
      { rank: 1, tactic: "Try longer video length", why: "more retention", source: "vidIQ", test_ideas: [] },
    ],
  };

  const result = injectResearchIntoTopicGuidance(channelBriefs, researchBrief);

  expect(result[0].briefs[0].template).toEqual(originalTemplate);
});

// ─────────────────────────────────────────────
// UT-RL-018: injectResearchIntoTopicGuidance — no-op when research brief has no tactics
// ─────────────────────────────────────────────
test("UT-RL-018: injectResearchIntoTopicGuidance is a no-op when research brief has no tactics", () => {
  const channelBriefs = [makeChannelBrief()];
  const originalGuidance = channelBriefs[0].briefs[0].topic_guidance;
  const researchBrief = { week: "2026-12", tactics: [] };

  const result = injectResearchIntoTopicGuidance(channelBriefs, researchBrief);

  expect(result[0].briefs[0].topic_guidance).toBe(originalGuidance);
});

// ─────────────────────────────────────────────
// UT-RL-019: getWeekStamp — returns YYYY-WW format
// ─────────────────────────────────────────────
test("UT-RL-019: getWeekStamp returns a string in YYYY-WW format", () => {
  const stamp = getWeekStamp("2026-03-17"); // Tuesday week 12
  expect(stamp).toMatch(/^\d{4}-\d{2}$/);
  expect(stamp).toBe("2026-12");
});

// ─────────────────────────────────────────────
// UT-RL-020: getLatestResearchBrief — returns most recent brief by week
// ─────────────────────────────────────────────
test("UT-RL-020: getLatestResearchBrief returns the brief from the most recent week", () => {
  const researchDir = path.join(tmpDir, "research");

  // Week 10 brief (older)
  const week10Dir = path.join(researchDir, "2026-10");
  writeJSON(path.join(week10Dir, "brief.json"), { week: "2026-10", tactics: [{ rank: 1, tactic: "old tactic" }] });

  // Week 12 brief (newer)
  const week12Dir = path.join(researchDir, "2026-12");
  writeJSON(path.join(week12Dir, "brief.json"), { week: "2026-12", tactics: [{ rank: 1, tactic: "new tactic" }] });

  const latest = getLatestResearchBrief(researchDir);

  expect(latest).not.toBeNull();
  expect(latest.week).toBe("2026-12");
  expect(latest.tactics[0].tactic).toBe("new tactic");
});
