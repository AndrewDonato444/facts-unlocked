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

  // Gather signals via Claude API with web search
  const queries = buildSearchQueries(date);
  console.log(`\nSearch queries (${queries.length}):`);
  queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set — cannot run web search.");
    console.error("Set it in DonatoSkills/.env.local or export it.");
    process.exit(1);
  }

  const sources_fetched = [];
  const sources_skipped = [];
  let rawSignals = [];
  let tactics = [];

  // Two-phase approach:
  // Phase 1: Single web search call to gather raw research text
  // Phase 2: Extract structured signals + tactics from the gathered text
  console.log("\nPhase 1: Gathering external research via web search...");

  const queriesList = queries.map((q, i) => `${i + 1}. ${q}`).join("\n");

  try {
    const searchResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        tools: [{
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        }],
        messages: [{
          role: "user",
          content: `You are a YouTube Shorts algorithm researcher. Search the web for the latest insights on YouTube Shorts algorithm changes, retention tactics, and hook strategies.

Run these searches:
${queriesList}

For each search, summarize what you find. Focus on:
- Algorithm changes or updates to YouTube Shorts
- Retention tactics (hook timing, video length, pacing)
- Hook strategies that are working right now
- Any creator tips specific to faceless/fact channels

Write a detailed research summary with all findings. Include the source (who said it, what blog/video/post) and approximate date for each finding. Be thorough — capture every useful tactic or signal you find.

If a search returns nothing useful, note that source as having no relevant results.`,
        }],
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.log(`  API error: ${searchResponse.status} — ${errText.slice(0, 200)}`);
      sources_skipped.push("all");
    } else {
      const result = await searchResponse.json();

      // Collect all text from the response (web search results + synthesis)
      const allText = (result.content || [])
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("\n\n");

      // Count which web searches actually ran
      const webSearchBlocks = (result.content || []).filter(
        (p) => p.type === "web_search_tool_result"
      );
      console.log(`  Web searches executed: ${webSearchBlocks.length}`);
      console.log(`  Research text length: ${allText.length} chars`);

      if (allText.length > 100) {
        // Phase 2: Extract structured signals + tactics from the raw research
        console.log("\nPhase 2: Extracting structured signals and tactics...");

        const extractResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            messages: [{
              role: "user",
              content: `You are analyzing YouTube Shorts research for a faceless fact channel network. Extract structured data from this research summary.

Today's date: ${date}

RESEARCH TEXT:
${allText}

Extract TWO JSON objects and return them in this exact format:

SIGNALS_JSON:
[array of signal objects]

TACTICS_JSON:
[array of tactic objects]

Signal object format:
{"signal": "description", "source": "who/where", "confidence": "high|medium|low", "faceless_applicable": true/false, "published_date": "YYYY-MM-DD", "raw_quote": "quote or null"}

Tactic object format (ranked by impact for faceless fact channels):
{"rank": 1, "tactic": "Specific actionable instruction", "why": "Evidence from research", "source": "who said it", "test_ideas": ["test 1", "test 2"]}

Rules:
- Include ALL signals found, even low confidence ones
- Tactics must be specific enough to implement (e.g. "Use a question in the first 0.5 seconds" not "Make better hooks")
- Tactics must work for faceless channels (voiceover + text overlay + background images)
- published_date should be approximate if not exact
- Rank tactics by expected impact on retention/engagement
- Include 3-5 tactics minimum if any signals were found

If the research found nothing relevant, return empty arrays for both.`,
            }],
          }),
        });

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          const extractText = (extractResult.content || [])
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("\n");

          // Parse signals
          const signalsMatch = extractText.match(/SIGNALS_JSON:\s*(\[[\s\S]*?\])\s*(?:TACTICS_JSON|$)/);
          if (signalsMatch) {
            try {
              rawSignals = JSON.parse(signalsMatch[1]);
              console.log(`  Signals extracted: ${rawSignals.length}`);
            } catch {
              console.log("  Could not parse signals JSON");
            }
          }

          // Parse tactics
          const tacticsMatch = extractText.match(/TACTICS_JSON:\s*(\[[\s\S]*?\])$/m) ||
            extractText.match(/TACTICS_JSON:\s*(\[[\s\S]*\])/);
          if (tacticsMatch) {
            try {
              tactics = JSON.parse(tacticsMatch[1]);
              console.log(`  Tactics extracted: ${tactics.length}`);
            } catch {
              console.log("  Could not parse tactics JSON");
            }
          }

          // If structured parsing missed signals or tactics, try lenient parse
          if (rawSignals.length === 0 || tactics.length === 0) {
            const anyArrays = extractText.match(/\[[\s\S]*?\]/g) || [];
            for (const arr of anyArrays) {
              try {
                const parsed = JSON.parse(arr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  if (parsed[0].signal && rawSignals.length === 0) {
                    rawSignals = parsed;
                    console.log(`  Signals (fallback parse): ${rawSignals.length}`);
                  } else if (parsed[0].tactic && tactics.length === 0) {
                    tactics = parsed;
                    console.log(`  Tactics (fallback parse): ${tactics.length}`);
                  }
                }
              } catch {
                // skip unparseable arrays
              }
            }
          }
        }

        // Mark sources based on web search execution
        const sourceNames = ["robert-benjamin", "vidiq", "creator-insider", "reddit", "general-web"];
        if (webSearchBlocks.length >= 3) {
          sources_fetched.push(...sourceNames);
        } else if (webSearchBlocks.length > 0) {
          sources_fetched.push(...sourceNames.slice(0, webSearchBlocks.length));
          sources_skipped.push(...sourceNames.slice(webSearchBlocks.length));
        } else {
          sources_skipped.push(...sourceNames);
        }
      } else {
        console.log("  Insufficient research text returned");
        sources_skipped.push("all");
      }
    }
  } catch (err) {
    console.log(`  Research fetch error: ${err.message}`);
    sources_skipped.push("all");
  }

  // Filter signals to last 7 days
  const filteredSignals = filterToLastNDays(rawSignals, 7, date);
  // Use filtered if any had dates, otherwise keep all (dates may be missing)
  if (filteredSignals.length > 0 || rawSignals.length === 0) {
    rawSignals = filteredSignals.length > 0 ? filteredSignals : rawSignals;
  }

  console.log(`\nRaw signals: ${rawSignals.length} from ${sources_fetched.length} sources`);

  // Phase 3: If we have signals but no tactics, extract tactics in a focused call
  if (rawSignals.length > 0 && tactics.length === 0) {
    console.log("\nPhase 3: Generating tactics from signals...");
    try {
      const tacticsResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: `Given these YouTube Shorts algorithm signals:

${rawSignals.map((s, i) => `${i + 1}. [${s.confidence}] ${s.signal} (source: ${s.source})`).join("\n")}

Create 3-5 ranked tactics for faceless fact channels (voiceover + text overlay + AI backgrounds). Each tactic must be specific and testable.

Return ONLY a JSON array, no other text:
[{"rank":1,"tactic":"specific instruction","why":"evidence","source":"source name","test_ideas":["test 1","test 2"]}]`,
          }],
        }),
      });

      if (tacticsResponse.ok) {
        const tacticsResult = await tacticsResponse.json();
        const tacticsText = (tacticsResult.content || [])
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n");

        const match = tacticsText.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            tactics = JSON.parse(match[0]);
            console.log(`  Tactics generated: ${tactics.length}`);
          } catch {
            console.log("  Could not parse tactics response");
          }
        }
      }
    } catch (err) {
      console.log(`  Tactics generation error: ${err.message}`);
    }
  }

  // Save raw signals
  fs.writeFileSync(rawSignalsPath, JSON.stringify({ date, week, queries, signals: rawSignals }, null, 2));

  // Build brief
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
