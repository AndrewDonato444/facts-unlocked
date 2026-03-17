#!/usr/bin/env node
/**
 * Analytics Loop Orchestrator
 *
 * Runs all 5 phases in sequence:
 *   Phase 1: Pull analytics from Zernio
 *   Phase 2: Score posts by engagement density
 *   Phase 2.5: Check suppressions (flag/lift underperforming values)
 *   Phase 3: Decompose winning patterns by structural variables
 *   Phase 4: Generate exploit/explore briefs (2 days of briefs per run)
 *
 * Usage:
 *   node run-loop.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *
 * Environment:
 *   ZERNIO_API_KEY — Zernio API key
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/
 *     ├── raw-analytics.json
 *     ├── scored-posts.json
 *     ├── variable-analysis.json
 *     └── briefs/
 *         ├── all-briefs.json
 *         └── <channel-slug>.json
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(command, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase: ${label}`);
  console.log("=".repeat(60));
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: path.resolve(__dirname),
    });
  } catch (err) {
    console.error(`\nPhase "${label}" failed with exit code ${err.status}`);
    process.exit(err.status || 1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];

  if (!projectSlug) {
    console.error("Usage: node run-loop.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]");
    process.exit(1);
  }

  // Pass through date args
  const dateArgs = args.slice(1).join(" ");
  const date = new Date().toISOString().split("T")[0];

  console.log(`Analytics Loop — ${projectSlug}`);
  console.log(`Date: ${date}`);
  console.log(`Args: ${dateArgs || "(defaults)"}`);

  const startTime = Date.now();

  // Phase 1: Collect
  run(
    `node pull-analytics.js ${projectSlug} ${dateArgs}`,
    "1/5 — Pull Analytics"
  );

  // Phase 2: Score
  run(
    `node score-posts.js ${projectSlug} ${date}`,
    "2/5 — Score Posts"
  );

  // Phase 3: Decompose (must run before check-suppressions, which reads variable-analysis.json)
  run(
    `node decompose-variables.js ${projectSlug} ${date}`,
    "3/5 — Decompose Variables"
  );

  // Phase 3.5: Check Suppressions (reads variable-analysis.json from Phase 3)
  run(
    `node check-suppressions.js ${projectSlug} ${date}`,
    "4/5 — Check Suppressions"
  );

  // Phase 4: Generate Briefs
  run(
    `node generate-briefs.js ${projectSlug} ${date}`,
    "5/5 — Generate Briefs"
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Analytics Loop Complete — ${elapsed}s`);
  console.log("=".repeat(60));
  console.log(`\nOutput: analytics-loop/data/${projectSlug}/${date}/`);
  console.log(`Briefs: analytics-loop/data/${projectSlug}/${date}/briefs/all-briefs.json`);

  // Output signals for orchestrated mode
  // Read scored-posts.json to extract signal data
  const dataDir = path.resolve(__dirname, "..", "data", projectSlug, date);
  let postsAnalyzed = 0;
  let postsExcluded = 0;
  let globalTopScore = 0;
  let winningTemplate = "{}";
  try {
    const scored = JSON.parse(fs.readFileSync(path.join(dataDir, "scored-posts.json"), "utf8"));
    const included = scored.filter(p => !p.excluded);
    const excluded = scored.filter(p => p.excluded);
    postsAnalyzed = included.length;
    postsExcluded = excluded.length;
    if (included.length > 0) {
      globalTopScore = included[0].score?.engagementDensity || 0;
    }
    const analysis = fs.existsSync(path.join(dataDir, "variable-analysis.json"))
      ? JSON.parse(fs.readFileSync(path.join(dataDir, "variable-analysis.json"), "utf8"))
      : null;
    if (analysis?.winningTemplate) {
      winningTemplate = JSON.stringify(analysis.winningTemplate);
    }
  } catch (_) {
    // Non-fatal — signals will have defaults
  }

  console.log(`\nANALYTICS_COMPLETE`);
  console.log(`POSTS_ANALYZED: ${postsAnalyzed}`);
  console.log(`POSTS_EXCLUDED: ${postsExcluded}`);
  console.log(`GLOBAL_TOP_SCORE: ${globalTopScore}`);
  console.log(`WINNING_TEMPLATE: ${winningTemplate}`);
  console.log(`BRIEFS_GENERATED: analytics-loop/data/${projectSlug}/${date}/briefs/all-briefs.json`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
