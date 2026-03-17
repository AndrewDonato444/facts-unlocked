#!/usr/bin/env node
/**
 * Phase 4: Generate Briefs
 *
 * Produces content briefs for each channel using the exploit/explore split.
 * - 2 exploit briefs: use the winning template
 * - 1 explore brief: change exactly ONE variable from the winning template
 *
 * Generates 2 days of briefs per run (today+1 and today+2) so the daily
 * content-engine always has briefs to read, even on days when the analytics
 * loop doesn't run (analytics runs every 48h, content runs daily).
 *
 * Suppression: Reads suppression-list.json to keep suppressed values out of
 * exploit slots. Suppressed values can appear in explore slots only once per
 * recheck cadence (default 14 days).
 *
 * Cold start: If < 2 scoring cycles exist, all briefs are exploratory.
 *
 * Usage:
 *   node generate-briefs.js <project-slug> [<date>]
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/briefs/all-briefs.json   (day 1)
 *   analytics-loop/data/<project>/<date>/briefs/<channel-slug>.json
 *   analytics-loop/data/<project>/<date>/briefs/day2/all-briefs.json (day 2)
 *   analytics-loop/data/<project>/<date>/briefs/day2/<channel-slug>.json
 */

const fs = require("fs");
const path = require("path");

const { getLatestResearchBrief, injectResearchIntoTopicGuidance } = require("./research-loop");

const VARIABLES = [
  "hook_type",
  "video_length",
  "voice_pace",
  "text_overlay",
  "background_type",
  "music_energy",
  "cta_style",
];

/**
 * Load or initialize the explore rotation state for a project.
 */
function loadRotationState(projectDataDir) {
  const statePath = path.join(projectDataDir, "explore-rotation-state.json");
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, "utf-8"));
  }
  return { explore_rotation: {} };
}

function saveRotationState(projectDataDir, state) {
  const statePath = path.join(projectDataDir, "explore-rotation-state.json");
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Get the next explore variable for a channel profile.
 */
function getNextExploreVariable(rotationState, profileId, date) {
  if (!rotationState.explore_rotation[profileId]) {
    rotationState.explore_rotation[profileId] = {
      last_tested: null,
      last_tested_date: null,
      rotation_order: [...VARIABLES],
      next_variable: VARIABLES[0],
    };
  }

  const channelState = rotationState.explore_rotation[profileId];
  const nextVar = channelState.next_variable;

  // Advance rotation
  const currentIdx = channelState.rotation_order.indexOf(nextVar);
  const nextIdx = (currentIdx + 1) % channelState.rotation_order.length;
  channelState.last_tested = nextVar;
  channelState.last_tested_date = date;
  channelState.next_variable = channelState.rotation_order[nextIdx];

  return nextVar;
}

/**
 * Load suppression list for the project.
 */
function loadSuppressionList(projectDataDir) {
  const listPath = path.join(projectDataDir, "suppression-list.json");
  if (fs.existsSync(listPath)) {
    return JSON.parse(fs.readFileSync(listPath, "utf-8"));
  }
  return { suppressed_values: [], suppressed_combinations: [], recheck_cadence_days: 14 };
}

/**
 * Check if a variable value is suppressed.
 */
function isSuppressed(suppressionList, variable, value) {
  return suppressionList.suppressed_values.some(
    (s) => s.variable === variable && s.value === value
  );
}

/**
 * Check if a suppressed value is eligible for a recheck explore slot.
 * Only allowed once per recheck_cadence_days (default 14 days).
 */
function isEligibleForRecheck(suppressionList, variable, value, date) {
  const entry = suppressionList.suppressed_values.find(
    (s) => s.variable === variable && s.value === value
  );
  if (!entry) return false;

  const cadence = suppressionList.recheck_cadence_days || 14;
  const lastRecheck = entry.last_recheck_date || entry.suppressed_since;
  const daysSinceRecheck = Math.floor(
    (new Date(date) - new Date(lastRecheck)) / (1000 * 60 * 60 * 24)
  );
  return daysSinceRecheck >= cadence;
}

/**
 * Apply suppression rules to a template for exploit slots.
 * If a winning value is suppressed, replace it with the next-best non-suppressed value.
 */
function applySuppressionsToTemplate(template, variableImpact, suppressionList) {
  const cleaned = { ...template };
  for (const [variable, value] of Object.entries(template)) {
    if (!isSuppressed(suppressionList, variable, value)) continue;

    // Find next-best non-suppressed value
    const vi = variableImpact.find((v) => v.variable === variable);
    if (!vi) continue;

    const sorted = Object.entries(vi.values)
      .sort((a, b) => b[1].avg_score - a[1].avg_score)
      .map(([v]) => v);

    const replacement = sorted.find(
      (v) => v !== value && !isSuppressed(suppressionList, variable, v)
    );
    if (replacement) {
      cleaned[variable] = replacement;
    }
  }
  return cleaned;
}

/**
 * Pick the second-best value for a variable (for explore briefs).
 * Falls back to least-tested value if no second-best data exists.
 */
function getExploreValue(variableImpact, variable, winningValue) {
  const vi = variableImpact.find((v) => v.variable === variable);
  if (!vi) return null;

  const sorted = Object.entries(vi.values)
    .sort((a, b) => b[1].avg_score - a[1].avg_score)
    .map(([value]) => value);

  // Second-best value (skip the winning value)
  const secondBest = sorted.find((v) => v !== winningValue);

  if (secondBest) return secondBest;

  // If no second-best, pick least-tested value
  const leastTested = Object.entries(vi.values)
    .filter(([v]) => v !== winningValue)
    .sort((a, b) => a[1].count - b[1].count)
    .map(([value]) => value)[0];

  return leastTested || null;
}

/**
 * Count how many complete scoring cycles exist for a project.
 */
function countScoringCycles(projectDataDir) {
  if (!fs.existsSync(projectDataDir)) return 0;
  const entries = fs.readdirSync(projectDataDir, { withFileTypes: true });
  let cycles = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const scoredPath = path.join(projectDataDir, entry.name, "scored-posts.json");
    if (fs.existsSync(scoredPath)) cycles++;
  }
  return cycles;
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];
  const date = args[1] || new Date().toISOString().split("T")[0];

  if (!projectSlug) {
    console.error("Usage: node generate-briefs.js <project-slug> [<date>]");
    process.exit(1);
  }

  // Load project config
  const registryPath = path.resolve(__dirname, "../../projects.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = registry.projects[projectSlug];

  if (!project) {
    console.error(`Project "${projectSlug}" not found in projects.json`);
    process.exit(1);
  }

  const config = project.analytics_loop || {};
  const ratio = config.exploit_explore_ratio || [2, 1];

  // Load variable analysis
  const dataDir = path.resolve(__dirname, `../data/${projectSlug}/${date}`);
  const analysisPath = path.join(dataDir, "variable-analysis.json");

  if (!fs.existsSync(analysisPath)) {
    console.error(`No variable analysis found at ${analysisPath}`);
    console.error("Run decompose-variables.js first.");
    process.exit(1);
  }

  const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
  const projectDataDir = path.resolve(__dirname, `../data/${projectSlug}`);
  const scoringCycles = countScoringCycles(projectDataDir);
  const isColdStart = scoringCycles < 2;

  // Load suppression list
  const suppressionList = loadSuppressionList(projectDataDir);
  const suppressedCount = suppressionList.suppressed_values.length;

  console.log(`Generating briefs for ${projectSlug}`);
  console.log(`Scoring cycles: ${scoringCycles} (${isColdStart ? "COLD START" : "normal mode"})`);
  console.log(`Exploit/explore ratio: ${ratio[0]}:${ratio[1]}`);
  console.log(`Active suppressions: ${suppressedCount}`);

  // Determine channels — support both "accounts" (projects.json convention) and "channels" (legacy)
  const channels = [];
  const accountEntries = project.zernio?.accounts || project.zernio?.channels;
  if (accountEntries && typeof accountEntries === "object") {
    const entries = Array.isArray(accountEntries) ? accountEntries : Object.values(accountEntries);
    for (const ch of entries) {
      channels.push({
        name: ch.name,
        profile_id: ch.profile_id || ch.id,
        topic: ch.topic,
        content_pillars: ch.content_pillars,
      });
    }
  } else if (project.zernio?.profile_id) {
    channels.push({
      name: project.name,
      profile_id: project.zernio.profile_id,
      topic: project.description,
      content_pillars: project.defaults?.content_pillars || [],
    });
  }

  if (channels.length === 0) {
    console.error("No channels found in project config");
    process.exit(1);
  }

  // Load latest external research brief (if available)
  const globalResearchDir = path.resolve(__dirname, "../data/global/research");
  const researchBrief = getLatestResearchBrief(globalResearchDir);
  if (researchBrief) {
    console.log(`External research brief loaded: week ${researchBrief.week} (${researchBrief.tactics?.length || 0} tactics)`);
  }

  // Load rotation state
  const rotationState = loadRotationState(projectDataDir);

  const totalSlots = ratio[0] + ratio[1]; // e.g., 2 exploit + 1 explore = 3
  const defaultTimes = ["09:00", "14:00", "19:00"];

  /**
   * Generate one day's briefs for all channels.
   * @param {string} briefDate - The date these briefs are for
   * @param {string} outputDir - Directory to write briefs into
   * @param {string} dayLabel - "day1" or "day2" for logging
   */
  function generateBriefsForDay(briefDate, outputDir, dayLabel) {
    fs.mkdirSync(outputDir, { recursive: true });

    const dayBriefs = [];

    for (const channel of channels) {
      const channelBriefs = [];

      if (isColdStart || !analysis.winning_template) {
        // Cold start: all exploratory — maximize variable space coverage
        for (let slot = 0; slot < totalSlots; slot++) {
          channelBriefs.push({
            slot: slot + 1,
            type: "explore",
            template: {},
            topic_guidance: `Exploratory content for ${channel.name}. Topic area: ${channel.topic || "general"}. Pillars: ${(channel.content_pillars || []).join(", ")}.`,
            schedule_time: defaultTimes[slot] || "12:00",
            note: "Cold start — no winning template yet. Maximize variable diversity.",
          });
        }
      } else {
        // Normal mode: exploit/explore split
        const rawTemplate = {};
        for (const v of VARIABLES) {
          rawTemplate[v] = analysis.winning_template[v];
        }

        // Check for per-channel overrides
        const override = analysis.per_channel_overrides?.find(
          (o) => o.profile_id === channel.profile_id
        );
        if (override?.optimal_override) {
          Object.assign(rawTemplate, override.optimal_override);
        }

        // Apply suppressions — replace any suppressed values in exploit template
        const template = applySuppressionsToTemplate(
          rawTemplate,
          analysis.variable_impact,
          suppressionList
        );

        // Generate exploit briefs
        for (let i = 0; i < ratio[0]; i++) {
          channelBriefs.push({
            slot: i + 1,
            type: "exploit",
            template: { ...template },
            topic_guidance: `Use the winning template for ${channel.name}. Topic: ${channel.topic || "general"}. Pillars: ${(channel.content_pillars || []).join(", ")}. ${i > 0 ? "Different content from previous exploit slot — avoid overlapping topics." : ""}`.trim(),
            schedule_time: defaultTimes[i] || "12:00",
          });
        }

        // Generate explore brief(s)
        for (let i = 0; i < ratio[1]; i++) {
          const exploreVar = getNextExploreVariable(
            rotationState,
            channel.profile_id,
            date
          );
          const baselineValue = template[exploreVar];
          let exploreValue = getExploreValue(
            analysis.variable_impact,
            exploreVar,
            baselineValue
          );

          // If the explore value is suppressed, only use it if eligible for recheck
          if (
            exploreValue &&
            isSuppressed(suppressionList, exploreVar, exploreValue) &&
            !isEligibleForRecheck(suppressionList, exploreVar, exploreValue, date)
          ) {
            // Skip the suppressed value, pick next non-suppressed alternative
            const vi = analysis.variable_impact.find(
              (v) => v.variable === exploreVar
            );
            if (vi) {
              const sorted = Object.entries(vi.values)
                .sort((a, b) => b[1].avg_score - a[1].avg_score)
                .map(([v]) => v);
              exploreValue =
                sorted.find(
                  (v) =>
                    v !== baselineValue &&
                    !isSuppressed(suppressionList, exploreVar, v)
                ) || exploreValue;
            }
          }

          const exploreTemplate = { ...template };
          if (exploreValue) {
            exploreTemplate[exploreVar] = exploreValue;
          }

          channelBriefs.push({
            slot: ratio[0] + i + 1,
            type: "explore",
            template: exploreTemplate,
            explore_variable: exploreVar,
            explore_value: exploreValue,
            baseline_value: baselineValue,
            topic_guidance: `Same content quality as exploit slots. Only ${exploreVar} changes (${baselineValue} → ${exploreValue}). Topic: ${channel.topic || "general"}.`,
            schedule_time: defaultTimes[ratio[0] + i] || "19:00",
          });
        }
      }

      const channelBrief = {
        date: briefDate,
        channel: channel.name,
        profile_id: channel.profile_id,
        briefs: channelBriefs,
      };

      dayBriefs.push(channelBrief);

      // Write per-channel brief
      const slug = channel.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      fs.writeFileSync(
        path.join(outputDir, `${slug}.json`),
        JSON.stringify(channelBrief, null, 2)
      );
    }

    // Inject external research signal into topic_guidance (additive only, no template changes)
    const injectedDayBriefs = researchBrief
      ? injectResearchIntoTopicGuidance(dayBriefs, researchBrief)
      : dayBriefs;

    // Write combined briefs for this day
    const allBriefsPath = path.join(outputDir, "all-briefs.json");
    fs.writeFileSync(
      allBriefsPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          project: projectSlug,
          date: briefDate,
          scoring_cycles: scoringCycles,
          cold_start: isColdStart,
          suppressed_values: suppressionList.suppressed_values.length,
          winning_template: analysis.winning_template,
          research_week: researchBrief?.week || null,
          channels: injectedDayBriefs,
        },
        null,
        2
      )
    );

    return { dayBriefs: injectedDayBriefs, allBriefsPath };
  }

  // --- Generate Day 1 briefs (tomorrow) ---
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day1Date = tomorrow.toISOString().split("T")[0];
  const briefsDir = path.join(dataDir, "briefs");

  const day1 = generateBriefsForDay(day1Date, briefsDir, "day1");

  // --- Generate Day 2 briefs (day after tomorrow) ---
  // Uses the same analysis but different topics — the content-engine
  // will pick different facts/topics for each day's briefs.
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const day2Date = dayAfter.toISOString().split("T")[0];
  const day2Dir = path.join(dataDir, "briefs", "day2");

  const day2 = generateBriefsForDay(day2Date, day2Dir, "day2");

  // Save rotation state (after both days generated)
  saveRotationState(projectDataDir, rotationState);

  // Summary
  const totalBriefs = [...day1.dayBriefs, ...day2.dayBriefs];
  const exploitCount = totalBriefs.reduce(
    (sum, ch) => sum + ch.briefs.filter((b) => b.type === "exploit").length,
    0
  );
  const exploreCount = totalBriefs.reduce(
    (sum, ch) => sum + ch.briefs.filter((b) => b.type === "explore").length,
    0
  );

  console.log(`\n--- Brief Generation Summary ---`);
  console.log(`Channels: ${channels.length}`);
  console.log(`Days generated: 2 (${day1Date}, ${day2Date})`);
  console.log(`Total briefs: ${exploitCount + exploreCount} (${exploitCount} exploit, ${exploreCount} explore)`);
  console.log(`Active suppressions applied: ${suppressedCount}`);
  console.log(`Day 1 briefs: ${day1.allBriefsPath}`);
  console.log(`Day 2 briefs: ${day2.allBriefsPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
