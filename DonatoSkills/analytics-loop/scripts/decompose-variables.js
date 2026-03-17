#!/usr/bin/env node
/**
 * Phase 3: Decompose Variables
 *
 * Reads scored posts and correlates performance with structural variables
 * from the content-engine's calendar JSON. Identifies the winning template
 * and per-channel overrides.
 *
 * For posts without calendar entries, attempts to infer variables from
 * post content and metadata (hook patterns, duration, word count).
 *
 * Usage:
 *   node decompose-variables.js <project-slug> [<date>]
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/variable-analysis.json
 */

const fs = require("fs");
const path = require("path");

const VARIABLES = [
  "hook_type",
  "video_length",
  "voice_pace",
  "text_overlay",
  "background_type",
  "music_energy",
  "cta_style",
];

// ─────────────────────────────────────────────
// Hook inference patterns (ordered by specificity — first match wins)
// ─────────────────────────────────────────────

const HOOK_PATTERNS = [
  {
    type: "stat_lead",
    test: (text) => /^\d/.test(text),
  },
  {
    type: "did_you_know",
    test: (text) => /^did you know/i.test(text),
  },
  {
    type: "most_people_dont_know",
    test: (text) => /^most people don.?t know/i.test(text),
  },
  {
    type: "myth_bust",
    test: (text) =>
      /\bactually\b/i.test(text) ||
      /\bbut really\b/i.test(text) ||
      /you.ve been told/i.test(text),
  },
  {
    type: "question",
    test: (text) => {
      // Check if the first sentence ends with a question mark
      const firstSentence = text.split(/[.!?]/)[0];
      return text.includes("?") && firstSentence.length < 200;
    },
  },
];

const CTA_PATTERNS = [
  { type: "follow_cta", test: (text) => /follow\b/i.test(text) },
  { type: "mid_roll_prompt", test: (text) => /subscribe\b/i.test(text) },
  {
    type: "pinned_comment",
    test: (text) =>
      /link in bio/i.test(text) || /comment\b.*below/i.test(text),
  },
];

// ─────────────────────────────────────────────
// Variable Inference
// ─────────────────────────────────────────────

/**
 * Infer structural variables from a scored post's content and metadata.
 * Returns { variables, confidences } where each variable has a value and
 * a confidence level: "inferred" or "unknown".
 */
function inferVariables(post) {
  const variables = {};
  const confidences = {};

  const content = post.content || "";
  const duration = post.analytics?.duration ?? null;
  const trimmed = content.trim();

  // --- hook_type ---
  if (trimmed) {
    let matched = false;
    for (const pattern of HOOK_PATTERNS) {
      if (pattern.test(trimmed)) {
        variables.hook_type = pattern.type;
        confidences.hook_type = "inferred";
        matched = true;
        break;
      }
    }
    if (!matched) {
      variables.hook_type = "unknown";
      confidences.hook_type = "unknown";
    }
  } else {
    variables.hook_type = "unknown";
    confidences.hook_type = "unknown";
  }

  // --- video_length ---
  if (duration && duration > 0) {
    if (duration <= 22) {
      variables.video_length = "15";
    } else if (duration <= 37) {
      variables.video_length = "30";
    } else if (duration <= 52) {
      variables.video_length = "45";
    } else {
      variables.video_length = "60";
    }
    confidences.video_length = "inferred";
  } else {
    variables.video_length = "unknown";
    confidences.video_length = "unknown";
  }

  // --- voice_pace ---
  if (trimmed && duration && duration > 0) {
    const wordCount = trimmed.split(/\s+/).length;
    const wpm = (wordCount / duration) * 60;
    if (wpm >= 170) {
      variables.voice_pace = "fast";
    } else if (wpm >= 130) {
      variables.voice_pace = "moderate";
    } else {
      variables.voice_pace = "slow";
    }
    confidences.voice_pace = "inferred";
  } else {
    variables.voice_pace = "unknown";
    confidences.voice_pace = "unknown";
  }

  // --- text_overlay --- (cannot infer)
  variables.text_overlay = "unknown";
  confidences.text_overlay = "unknown";

  // --- background_type --- (cannot infer)
  variables.background_type = "unknown";
  confidences.background_type = "unknown";

  // --- music_energy --- (cannot infer)
  variables.music_energy = "unknown";
  confidences.music_energy = "unknown";

  // --- cta_style ---
  if (trimmed) {
    // Check the last portion of the content for CTA patterns
    const lastPortion = trimmed.slice(-100);
    let ctaMatched = false;
    for (const pattern of CTA_PATTERNS) {
      if (pattern.test(lastPortion)) {
        variables.cta_style = pattern.type;
        confidences.cta_style = "inferred";
        ctaMatched = true;
        break;
      }
    }
    if (!ctaMatched) {
      variables.cta_style = "unknown";
      confidences.cta_style = "unknown";
    }
  } else {
    variables.cta_style = "unknown";
    confidences.cta_style = "unknown";
  }

  return { variables, confidences };
}

// ─────────────────────────────────────────────
// Calendar Variable Lookup
// ─────────────────────────────────────────────

/**
 * Search all calendar.json files for a post matching the given Zernio or Buffer post ID.
 * Returns the calendar item's variables object if found.
 */
function findCalendarVariables(postId, zernioPostId, calendarsDir) {
  if (!fs.existsSync(calendarsDir)) return null;

  const campaigns = fs.readdirSync(calendarsDir, { withFileTypes: true });
  for (const campaign of campaigns) {
    if (!campaign.isDirectory()) continue;
    const calPath = path.join(calendarsDir, campaign.name, "calendar.json");
    if (!fs.existsSync(calPath)) continue;

    try {
      const cal = JSON.parse(fs.readFileSync(calPath, "utf-8"));
      for (const item of cal.items || []) {
        if (
          (zernioPostId && item.zernio_post_id === zernioPostId) ||
          (postId && item.buffer_post_id === postId)
        ) {
          return item.variables || null;
        }
      }
    } catch {
      // Skip malformed calendar files
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// Variable Impact Analysis
// ─────────────────────────────────────────────

/**
 * Compute per-variable-value average engagement density.
 * Supports confidence weighting: tagged posts count at 1.0x, inferred at 0.5x.
 */
function computeVariableImpact(postsWithVars) {
  const impact = [];

  for (const variable of VARIABLES) {
    const buckets = {};

    for (const post of postsWithVars) {
      const value = post.variables[variable];
      if (!value || value === "unknown") continue;

      const confidence = post.variableConfidence || "tagged";
      const weight = confidence === "inferred" ? 0.5 : 1.0;

      if (!buckets[value]) {
        buckets[value] = {
          weightedScoreSum: 0,
          totalWeight: 0,
          count: 0,
          tagged_count: 0,
          inferred_count: 0,
        };
      }
      buckets[value].weightedScoreSum +=
        post.score.engagementDensity * weight;
      buckets[value].totalWeight += weight;
      buckets[value].count++;
      if (confidence === "inferred") {
        buckets[value].inferred_count++;
      } else {
        buckets[value].tagged_count++;
      }
    }

    const values = {};
    let bestValue = null;
    let bestAvg = -1;

    for (const [value, data] of Object.entries(buckets)) {
      const avg =
        data.totalWeight > 0
          ? Math.round((data.weightedScoreSum / data.totalWeight) * 100) / 100
          : 0;
      values[value] = {
        avg_score: avg,
        count: data.count,
        tagged_count: data.tagged_count,
        inferred_count: data.inferred_count,
      };
      if (avg > bestAvg) {
        bestAvg = avg;
        bestValue = value;
      }
    }

    // Compute global average across all posts (unweighted, for lift calculation)
    const globalAvg =
      postsWithVars.length > 0
        ? postsWithVars.reduce(
            (sum, p) => sum + p.score.engagementDensity,
            0
          ) / postsWithVars.length
        : 0;

    const lift =
      globalAvg > 0
        ? Math.round(((bestAvg - globalAvg) / globalAvg) * 100) + "%"
        : "N/A";

    impact.push({
      variable,
      values,
      most_impactful_value: bestValue,
      lift_over_average: lift,
    });
  }

  return impact;
}

// ─────────────────────────────────────────────
// Winning Template
// ─────────────────────────────────────────────

/**
 * Determine the winning template from variable impact data.
 */
function computeWinningTemplate(variableImpact, postsWithVars) {
  const template = {};
  for (const vi of variableImpact) {
    template[vi.variable] = vi.most_impactful_value;
  }

  // Count how many posts match the winning template exactly
  const matchingPosts = postsWithVars.filter((p) =>
    VARIABLES.every((v) => p.variables[v] === template[v])
  );

  const avgDensity =
    matchingPosts.length > 0
      ? Math.round(
          (matchingPosts.reduce(
            (sum, p) => sum + p.score.engagementDensity,
            0
          ) /
            matchingPosts.length) *
            100
        ) / 100
      : null;

  let confidence = "low";
  if (matchingPosts.length >= 10) confidence = "high";
  else if (matchingPosts.length >= 5) confidence = "medium";

  return {
    ...template,
    avg_engagement_density: avgDensity,
    confidence,
    sample_count: matchingPosts.length,
  };
}

// ─────────────────────────────────────────────
// Per-Channel Override Detection
// ─────────────────────────────────────────────

/**
 * Detect per-channel overrides — when a channel consistently outperforms
 * the global winning template with a different variable value.
 *
 * @param {Array} postsWithVars - Posts with variable tags and scores
 * @param {Array} historicalData - Array of previous variable-analysis.json contents
 * @param {Object} globalWinningTemplate - The current global winning template
 * @returns {Array} Array of per-channel override objects
 */
function detectPerChannelOverrides(
  postsWithVars,
  historicalData,
  globalWinningTemplate
) {
  const MIN_CYCLES = 3;
  const MIN_LIFT = 0.15; // 15%
  const MIN_POSTS = 5;

  // Need enough historical data
  if (historicalData.length < MIN_CYCLES) {
    return [];
  }

  // Group posts by channel (profileName)
  const channels = {};
  for (const post of postsWithVars) {
    const channelName = post.profileName || "unknown";
    if (!channels[channelName]) {
      channels[channelName] = [];
    }
    channels[channelName].push(post);
  }

  const overrides = [];

  for (const [channelName, channelPosts] of Object.entries(channels)) {
    const divergesOn = [];
    const optimalOverride = {};
    const liftPerVariable = {};

    for (const variable of VARIABLES) {
      const globalBest = globalWinningTemplate[variable];
      if (!globalBest) continue;

      // Compute per-value avg for this channel
      const valueBuckets = {};
      for (const post of channelPosts) {
        const value = post.variables[variable];
        if (!value || value === "unknown") continue;

        if (!valueBuckets[value]) {
          valueBuckets[value] = { scores: [], count: 0 };
        }
        valueBuckets[value].scores.push(post.score.engagementDensity);
        valueBuckets[value].count++;
      }

      // Find local best for this channel
      let localBestValue = null;
      let localBestAvg = -1;
      let globalBestAvgOnChannel = 0;

      for (const [value, data] of Object.entries(valueBuckets)) {
        const avg =
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        if (avg > localBestAvg) {
          localBestAvg = avg;
          localBestValue = value;
        }
        if (value === globalBest) {
          globalBestAvgOnChannel = avg;
        }
      }

      // Check divergence criteria
      if (
        localBestValue &&
        localBestValue !== globalBest &&
        valueBuckets[localBestValue]?.count >= MIN_POSTS
      ) {
        // Compute lift over global best ON THIS CHANNEL
        const lift =
          globalBestAvgOnChannel > 0
            ? (localBestAvg - globalBestAvgOnChannel) / globalBestAvgOnChannel
            : 0;

        if (lift >= MIN_LIFT) {
          divergesOn.push(variable);
          optimalOverride[variable] = localBestValue;
          liftPerVariable[variable] = Math.round(lift * 100) + "%";
        }
      }
    }

    if (divergesOn.length > 0) {
      // Count total posts for sample_count
      const sampleCount = channelPosts.length;

      overrides.push({
        channel: channelName,
        profile_id:
          channelPosts[0]?.extra?.profile_id || channelPosts[0]?.profileId || null,
        diverges_on: divergesOn,
        optimal_override: optimalOverride,
        lift_on_channel: liftPerVariable,
        sample_count: sampleCount,
        cycles_observed: historicalData.length,
        note: divergesOn
          .map(
            (v) =>
              `${optimalOverride[v]} outperforms ${globalWinningTemplate[v]} for ${v} by ${liftPerVariable[v]} on this channel`
          )
          .join("; "),
      });
    }
  }

  return overrides;
}

// ─────────────────────────────────────────────
// CLI Main
// ─────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];
  const date = args[1] || new Date().toISOString().split("T")[0];

  if (!projectSlug) {
    console.error(
      "Usage: node decompose-variables.js <project-slug> [<date>]"
    );
    process.exit(1);
  }

  // Load scored posts
  const dataDir = path.resolve(__dirname, `../data/${projectSlug}/${date}`);
  const scoredPath = path.join(dataDir, "scored-posts.json");

  if (!fs.existsSync(scoredPath)) {
    console.error(`No scored posts found at ${scoredPath}`);
    console.error("Run score-posts.js first.");
    process.exit(1);
  }

  const scored = JSON.parse(fs.readFileSync(scoredPath, "utf-8"));
  const includedPosts = scored.posts.filter((p) => !p.excluded);

  console.log(
    `Decomposing ${includedPosts.length} scored posts by structural variables`
  );

  // Look up variables from calendar entries
  const calendarsDir = path.resolve(
    __dirname,
    "../../content-engine/calendars"
  );
  const postsWithVars = [];
  let taggedCount = 0;
  let inferredCount = 0;
  let skippedCount = 0;

  for (const post of includedPosts) {
    const vars = findCalendarVariables(
      post.postId,
      post.zernioPostId,
      calendarsDir
    );

    if (vars) {
      postsWithVars.push({
        ...post,
        variables: vars,
        variableConfidence: "tagged",
      });
      taggedCount++;
    } else {
      // Attempt to infer variables from post content
      const { variables, confidences } = inferVariables(post);
      const hasAnyInferred = Object.values(confidences).some(
        (c) => c === "inferred"
      );

      if (hasAnyInferred) {
        postsWithVars.push({
          ...post,
          variables,
          variableConfidence: "inferred",
        });
        inferredCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log(`  Posts with variable tags: ${taggedCount}`);
  console.log(`  Posts with inferred variables: ${inferredCount}`);
  console.log(`  Posts skipped (no data): ${skippedCount}`);

  if (postsWithVars.length === 0) {
    console.warn(
      "\nNo posts have variable tags or inferable content. The analytics loop needs tagged content to decompose."
    );
    console.warn(
      "Ensure the content-engine tags calendar items with variables (see shared-references/analytics-schema.md)."
    );

    // Write empty analysis
    const output = {
      date,
      sample_size: 0,
      sample_breakdown: {
        tagged: 0,
        inferred: 0,
        skipped: skippedCount,
      },
      excluded_posts: scored.summary.excludedPosts,
      global_avg_engagement_density:
        scored.summary.globalAvgEngagementDensity,
      winning_template: null,
      variable_impact: [],
      per_channel_overrides: [],
      warning:
        "No posts with variable tags found. Tag content via content-engine.",
    };
    fs.writeFileSync(
      path.join(dataDir, "variable-analysis.json"),
      JSON.stringify(output, null, 2)
    );
    return;
  }

  // Compute variable impact
  const variableImpact = computeVariableImpact(postsWithVars);
  const winningTemplate = computeWinningTemplate(
    variableImpact,
    postsWithVars
  );

  // Detect per-channel overrides using historical data
  const projectDataDir = path.resolve(
    __dirname,
    `../data/${projectSlug}`
  );
  const historicalData = loadHistoricalAnalyses(projectDataDir);
  const perChannelOverrides = detectPerChannelOverrides(
    postsWithVars,
    historicalData,
    winningTemplate
  );

  const output = {
    date,
    sample_size: postsWithVars.length,
    sample_breakdown: {
      tagged: taggedCount,
      inferred: inferredCount,
      skipped: skippedCount,
    },
    excluded_posts: scored.summary.excludedPosts,
    global_avg_engagement_density:
      scored.summary.globalAvgEngagementDensity,
    winning_template: winningTemplate,
    variable_impact: variableImpact,
    per_channel_overrides: perChannelOverrides,
  };

  const outPath = path.join(dataDir, "variable-analysis.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n--- Variable Analysis ---`);
  console.log(
    `Sample: ${postsWithVars.length} posts (${taggedCount} tagged, ${inferredCount} inferred)`
  );
  console.log(
    `Winning template: ${JSON.stringify(winningTemplate, null, 2)}`
  );
  if (perChannelOverrides.length > 0) {
    console.log(
      `Per-channel overrides: ${perChannelOverrides.length} channels diverge`
    );
  }
  console.log(`\nWrote analysis to ${outPath}`);
}

/**
 * Load all historical variable-analysis.json files from the project data directory.
 */
function loadHistoricalAnalyses(projectDataDir) {
  if (!fs.existsSync(projectDataDir)) return [];

  const entries = fs.readdirSync(projectDataDir, { withFileTypes: true });
  const analyses = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const analysisPath = path.join(
      projectDataDir,
      entry.name,
      "variable-analysis.json"
    );
    if (!fs.existsSync(analysisPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
      analyses.push(data);
    } catch {
      // Skip malformed files
    }
  }

  return analyses;
}

// ─────────────────────────────────────────────
// Module Exports (for testing) + CLI Entry
// ─────────────────────────────────────────────

module.exports = {
  VARIABLES,
  inferVariables,
  findCalendarVariables,
  computeVariableImpact,
  computeWinningTemplate,
  detectPerChannelOverrides,
  loadHistoricalAnalyses,
};

// Only run main() when executed directly (not when required as a module)
if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
