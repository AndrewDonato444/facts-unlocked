#!/usr/bin/env node
/**
 * select-quote.js — Pick an unused quote from the roster.
 *
 * Rules:
 * - Parse roster.md into an array of quotes with { id, text, attribution, type, theme }
 * - Filter out quotes already in used.md
 * - Pick with 70/30 weighting (famous/original) — sample from the eligible pool
 * - Output JSON to stdout
 * - If --commit flag is passed, append the selection to used.md with today's date
 *
 * Usage:
 *   node select-quote.js --project baby-facts-unlocked
 *   node select-quote.js --project baby-facts-unlocked --commit --platforms tiktok,instagram,youtube --campaign quotes-2026-04-24
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function getArg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const hasFlag = (name) => args.includes(`--${name}`);

const project = getArg("project", "baby-facts-unlocked");
const commit = hasFlag("commit");
const platforms = getArg("platforms", "tiktok,instagram,youtube");
const campaign = getArg("campaign", "");

const QUOTES_DIR = path.join(__dirname, "..", "..", "quotes", project);
const ROSTER_PATH = path.join(QUOTES_DIR, "roster.md");
const USED_PATH = path.join(QUOTES_DIR, "used.md");

if (!fs.existsSync(ROSTER_PATH)) {
  console.error(`Roster not found: ${ROSTER_PATH}`);
  process.exit(1);
}

function parseRoster(text) {
  const quotes = [];
  let currentTheme = "uncategorized";
  for (const raw of text.split("\n")) {
    const themeMatch = raw.match(/^##\s+Theme:\s*(.+?)\s*$/);
    if (themeMatch) {
      currentTheme = themeMatch[1].split("(")[0].trim();
      continue;
    }
    const m = raw.match(/^-\s+\*\*(Q\d+)\*\*\s+—\s+"(.+?)"\s+—\s+\*(.+?)\*\s+\[(famous|original)\]/);
    if (m) {
      quotes.push({
        id: m[1],
        text: m[2],
        attribution: m[3],
        type: m[4],
        theme: currentTheme,
      });
    }
  }
  return quotes;
}

function parseUsedIds(text) {
  const ids = new Set();
  for (const line of text.split("\n")) {
    const m = line.match(/^(Q\d+)\s*\|/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

function weightedPick(quotes) {
  // 70/30 famous/original. If one bucket is empty, pick from the other.
  const famous = quotes.filter((q) => q.type === "famous");
  const original = quotes.filter((q) => q.type === "original");
  let bucket;
  const roll = Math.random();
  if (famous.length && original.length) {
    bucket = roll < 0.7 ? famous : original;
  } else if (famous.length) {
    bucket = famous;
  } else if (original.length) {
    bucket = original;
  } else {
    return null;
  }
  return bucket[Math.floor(Math.random() * bucket.length)];
}

function appendUsed(quote, platformList, campaignSlug) {
  const today = new Date().toISOString().slice(0, 10);
  const line = `${quote.id} | ${today} | ${platformList} | ${campaignSlug || "-"}\n`;
  fs.appendFileSync(USED_PATH, line);
}

const roster = parseRoster(fs.readFileSync(ROSTER_PATH, "utf8"));
const usedIds = fs.existsSync(USED_PATH) ? parseUsedIds(fs.readFileSync(USED_PATH, "utf8")) : new Set();
const pool = roster.filter((q) => !usedIds.has(q.id));

if (pool.length === 0) {
  console.error(
    `Roster exhausted for ${project}: all ${roster.length} quotes are in used.md. Add more quotes to roster.md.`
  );
  process.exit(2);
}

const pick = weightedPick(pool);
if (!pick) {
  console.error("No eligible quote found (empty pool).");
  process.exit(2);
}

if (commit) {
  appendUsed(pick, platforms, campaign);
}

const selectionCount = {
  total_in_roster: roster.length,
  used: usedIds.size,
  eligible: pool.length,
  famous_in_pool: pool.filter((q) => q.type === "famous").length,
  original_in_pool: pool.filter((q) => q.type === "original").length,
};

const output = {
  ...pick,
  project,
  selection_stats: selectionCount,
  committed: commit,
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
