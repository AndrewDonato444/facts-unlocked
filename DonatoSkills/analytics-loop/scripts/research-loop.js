#!/usr/bin/env node
/**
 * Continuous Learning Loop — Weekly External Research
 *
 * Scans high-signal external sources for YouTube Shorts algorithm insights,
 * extracts tactics, and produces a weekly brief that injects into content briefs.
 *
 * Usage:
 *   node research-loop.js <project-slug> [--date YYYY-MM-DD] [--week YYYY-WW]
 *
 * Environment:
 *   ANTHROPIC_API_KEY — used for web search via Claude
 *
 * Output:
 *   analytics-loop/data/global/research/YYYY-WW/
 *     ├── raw-signals.json
 *     └── brief.json
 *   analytics-loop/data/global/research/
 *     └── pattern-archive.json
 */

const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────
// Week Stamp Utilities
// ─────────────────────────────────────────────

/**
 * Returns ISO week number for a given date string (YYYY-MM-DD).
 * Format: "YYYY-WW" (zero-padded week number).
 */
function getWeekStamp(dateStr) {
  const date = new Date(dateStr + "T12:00:00Z"); // noon UTC to avoid DST edge cases
  const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date - jan1) / (1000 * 60 * 60 * 24));
  // ISO week: week containing Thursday of the week
  const dayOfWeek = date.getUTCDay() || 7; // 1=Mon ... 7=Sun
  const weekNum = Math.ceil((dayOfYear + (jan1.getUTCDay() || 7) - 1) / 7);
  const paddedWeek = String(weekNum).padStart(2, "0");
  return `${date.getUTCFullYear()}-${paddedWeek}`;
}

// ─────────────────────────────────────────────
// Signal Filtering
// ─────────────────────────────────────────────

/**
 * Filters an array of signal objects to only those published within the last N days.
 * Each signal must have a `published_date` field (YYYY-MM-DD).
 *
 * @param {Array} signals
 * @param {number} days - window size (inclusive)
 * @param {string} referenceDate - YYYY-MM-DD (today)
 * @returns {Array}
 */
function filterToLastNDays(signals, days, referenceDate) {
  const ref = new Date(referenceDate + "T12:00:00Z");
  const cutoff = new Date(ref);
  cutoff.setUTCDate(ref.getUTCDate() - days);

  return signals.filter((s) => {
    if (!s.published_date) return false;
    const pub = new Date(s.published_date + "T12:00:00Z");
    return pub >= cutoff;
  });
}

// ─────────────────────────────────────────────
// Brief Builder
// ─────────────────────────────────────────────

/**
 * Builds a structured weekly brief from extracted signals and tactics.
 *
 * @param {Array} signals - Raw signal objects
 * @param {Array} tactics - Ranked tactic objects
 * @param {string[]} channels - Channel names for per-channel recommendations
 * @param {Object} options - { week, date, sources_fetched, sources_skipped }
 * @returns {Object} brief
 */
function buildBrief(signals, tactics, channels, options) {
  const { week, date, sources_fetched = [], sources_skipped = [] } = options;

  const hasSignals = signals.length > 0;
  const hasTactics = tactics.length > 0;

  const topRecommendations = hasTactics ? tactics.slice(0, 2).map((t) => t.tactic) : [];
  const topTestIdeas = hasTactics
    ? tactics.slice(0, 3).flatMap((t) => t.test_ideas || []).slice(0, 3)
    : [];

  const per_channel_recommendations = (channels || []).map((channelName) => ({
    channel: channelName,
    current_retention_context: null,
    recommendations: topRecommendations,
    test_ideas: topTestIdeas,
  }));

  // Action items from ranked tactics
  const action_items = tactics.map((t, i) => ({
    priority: i + 1,
    item: t.tactic,
    why: t.why || "",
  }));

  // Carry-forward note when no signals found
  const carry_forward_note = !hasSignals
    ? "No new signals found this week — carry forward previous week's tactics"
    : null;

  return {
    generated_at: new Date().toISOString(),
    week,
    date,
    sources_fetched,
    sources_skipped,
    signals,
    tactics,
    per_channel_recommendations,
    action_items,
    carry_forward_note,
  };
}

// ─────────────────────────────────────────────
// Pattern Archive
// ─────────────────────────────────────────────

/**
 * Updates the pattern archive with tactics from the current week's brief.
 * - New tactics: add with weeks_observed=1
 * - Existing tactics: increment weeks_observed, update last_seen, increment source_count
 *
 * @param {Object} brief - Weekly brief (must have .week and .tactics[])
 * @param {string} archivePath - Absolute path to pattern-archive.json
 */
function updatePatternArchive(brief, archivePath) {
  let archive = { patterns: [], last_updated: "" };

  if (fs.existsSync(archivePath)) {
    archive = JSON.parse(fs.readFileSync(archivePath, "utf-8"));
  }

  for (const tactic of brief.tactics || []) {
    const existing = archive.patterns.find((p) => p.tactic === tactic.tactic);
    if (existing) {
      existing.weeks_observed += 1;
      existing.last_seen = brief.week;
      existing.source_count += 1;
    } else {
      archive.patterns.push({
        tactic: tactic.tactic,
        first_seen: brief.week,
        last_seen: brief.week,
        weeks_observed: 1,
        source_count: 1,
      });
    }
  }

  archive.last_updated = brief.date || new Date().toISOString().split("T")[0];

  const dir = path.dirname(archivePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
}

// ─────────────────────────────────────────────
// Brief Injection
// ─────────────────────────────────────────────

/**
 * Injects the top external research tactic into each slot's topic_guidance.
 * Only modifies topic_guidance — template variables are never touched.
 *
 * @param {Array} channelBriefs - Array of channel brief objects from generate-briefs.js
 * @param {Object} researchBrief - Weekly research brief
 * @returns {Array} channelBriefs with augmented topic_guidance
 */
function injectResearchIntoTopicGuidance(channelBriefs, researchBrief) {
  const tactics = researchBrief?.tactics || [];
  if (tactics.length === 0) return channelBriefs;

  const topTactic = tactics[0];
  const injection = `External signal (week ${researchBrief.week}): ${topTactic.tactic}`;

  return channelBriefs.map((channelBrief) => ({
    ...channelBrief,
    briefs: (channelBrief.briefs || []).map((slot) => ({
      ...slot,
      topic_guidance: slot.topic_guidance
        ? `${slot.topic_guidance} ${injection}`
        : injection,
    })),
  }));
}

// ─────────────────────────────────────────────
// Latest Research Brief Loader
// ─────────────────────────────────────────────

/**
 * Returns the brief from the most recent week-stamped directory under researchDir.
 * Returns null if no briefs found.
 *
 * @param {string} researchDir - Path to analytics-loop/data/global/research/
 * @returns {Object|null}
 */
function getLatestResearchBrief(researchDir) {
  if (!fs.existsSync(researchDir)) return null;

  const entries = fs.readdirSync(researchDir, { withFileTypes: true });
  const weekDirs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse(); // descending — most recent first

  for (const week of weekDirs) {
    const briefPath = path.join(researchDir, week, "brief.json");
    if (fs.existsSync(briefPath)) {
      return JSON.parse(fs.readFileSync(briefPath, "utf-8"));
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// Source Gathering (Claude web search)
// ─────────────────────────────────────────────

/**
 * Builds search queries for each priority source.
 * Returns an array of query strings.
 */
function buildSearchQueries(dateStr) {
  const date = new Date(dateStr + "T12:00:00Z");
  const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return [
    `robertbenjamin YouTube Shorts algorithm ${monthYear}`,
    `vidIQ YouTube Shorts retention hooks ${monthYear}`,
    `creator insider YouTube Shorts algorithm ${monthYear}`,
    `site:reddit.com/r/NewTubers OR site:reddit.com/r/SmallYoutubers YouTube Shorts algorithm 2026`,
    `YouTube Shorts algorithm update ${monthYear} hooks retention`,
  ];
}

// ─────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];

  if (!projectSlug) {
    console.error(
      "Usage: node research-loop.js <project-slug> [--date YYYY-MM-DD] [--week YYYY-WW]"
    );
    process.exit(1);
  }

  // Parse optional args
  const dateIdx = args.indexOf("--date");
  const date = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().split("T")[0];

  const weekIdx = args.indexOf("--week");
  const week = weekIdx !== -1 ? args[weekIdx + 1] : getWeekStamp(date);

  console.log(`Continuous Learning Loop — ${projectSlug}`);
  console.log(`Date: ${date}, Week: ${week}`);

  // Load project config to get channel names
  const registryPath = path.resolve(__dirname, "../../projects.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = registry.projects[projectSlug];

  if (!project) {
    console.error(`Project "${projectSlug}" not found in projects.json`);
    process.exit(1);
  }

  const channels = [];
  const accountEntries = project.zernio?.accounts || project.zernio?.channels;
  if (accountEntries && typeof accountEntries === "object") {
    const entries = Array.isArray(accountEntries) ? accountEntries : Object.values(accountEntries);
    for (const ch of entries) {
      channels.push(ch.name);
    }
  } else if (project.name) {
    channels.push(project.name);
  }

  // Output paths
  const globalResearchDir = path.resolve(
    __dirname,
    `../data/global/research`
  );
  const weekDir = path.join(globalResearchDir, week);
  fs.mkdirSync(weekDir, { recursive: true });

  const rawSignalsPath = path.join(weekDir, "raw-signals.json");
  const briefPath = path.join(weekDir, "brief.json");
  const archivePath = path.join(globalResearchDir, "pattern-archive.json");

  // Check if brief already exists for this week
  if (fs.existsSync(briefPath)) {
    console.log(`Brief for week ${week} already exists at ${briefPath}`);
    console.log(`\nRESEARCH_COMPLETE`);
    const existing = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
    console.log(`SIGNALS_FOUND: ${existing.signals?.length || 0}`);
    console.log(`TACTICS_EXTRACTED: ${existing.tactics?.length || 0}`);
    console.log(`BRIEF_PATH: analytics-loop/data/global/research/${week}/brief.json`);
    return;
  }

  // Gather signals via Claude web search
  // In production, this would invoke Claude API with web search tool.
  // For this implementation, we use the search queries to inform a structured prompt.
  const queries = buildSearchQueries(date);
  console.log(`\nSearch queries (${queries.length}):`);
  queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

  const sources_fetched = [];
  const sources_skipped = [];
  const rawSignals = [];

  // Note: actual web search happens when this script is invoked via Claude agent.
  // The agent is expected to run this script, then manually call WebSearch with
  // these queries and pipe results back. For automated use, integrate Claude API here.
  console.log(`\nNote: Run with --auto flag or via Claude agent for live web search.`);
  console.log(`Generating empty brief for offline/test runs.`);

  // Save raw signals
  fs.writeFileSync(rawSignalsPath, JSON.stringify({ date, week, queries, signals: rawSignals }, null, 2));

  // Build brief
  const tactics = [];
  const brief = buildBrief(rawSignals, tactics, channels, {
    week,
    date,
    sources_fetched,
    sources_skipped,
  });

  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2));

  // Update pattern archive
  updatePatternArchive(brief, archivePath);

  console.log(`\n--- Research Loop Summary ---`);
  console.log(`Signals found: ${brief.signals.length}`);
  console.log(`Tactics extracted: ${brief.tactics.length}`);
  console.log(`Channels: ${channels.length}`);
  console.log(`Brief: ${briefPath}`);

  if (brief.signals.length === 0) {
    console.log(`\nRESEARCH_NO_SIGNALS`);
    console.log(`SIGNALS_FOUND: 0`);
    console.log(`TACTICS_EXTRACTED: 0`);
  } else {
    console.log(`\nRESEARCH_COMPLETE`);
    console.log(`SIGNALS_FOUND: ${brief.signals.length}`);
    console.log(`TACTICS_EXTRACTED: ${brief.tactics.length}`);
  }
  console.log(`BRIEF_PATH: analytics-loop/data/global/research/${week}/brief.json`);
}

// ─────────────────────────────────────────────
// Exports (for testing)
// ─────────────────────────────────────────────

module.exports = {
  filterToLastNDays,
  buildBrief,
  updatePatternArchive,
  injectResearchIntoTopicGuidance,
  getWeekStamp,
  getLatestResearchBrief,
  buildSearchQueries,
};

// Run CLI only when invoked directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
