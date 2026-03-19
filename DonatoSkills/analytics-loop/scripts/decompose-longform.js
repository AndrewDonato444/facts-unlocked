#!/usr/bin/env node
/**
 * decompose-longform.js — Long-Form Variable Decomposition
 *
 * Analyzes scored long-form YouTube videos by structural variables
 * to identify winning patterns. Uses a different variable set from
 * short-form decomposition (chapter_count, intro_style, etc. instead
 * of hook_type, video_length, voice_pace, etc.).
 *
 * Generates exploit/explore briefs for the next long-form content cycle.
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

const LONGFORM_VARIABLES = [
  "chapter_count",
  "intro_style",
  "narration_pace",
  "visual_density",
  "voice",
  "video_length_min",
];

/**
 * Compute per-variable-value average weighted score for long-form videos.
 *
 * @param {Array} scoredVideos - Videos with score.weightedScore and variables
 * @returns {Array} Variable impact analysis
 */
function computeLongformVariableImpact(scoredVideos) {
  const included = scoredVideos.filter((v) => !v.excluded && v.score);
  const globalAvg =
    included.length > 0
      ? included.reduce((sum, v) => sum + v.score.weightedScore, 0) /
        included.length
      : 0;

  const impact = [];

  for (const variable of LONGFORM_VARIABLES) {
    const buckets = {};

    for (const video of included) {
      const value = String(video.variables?.[variable] ?? "unknown");
      if (value === "unknown") continue;

      if (!buckets[value]) {
        buckets[value] = { scoreSum: 0, count: 0 };
      }
      buckets[value].scoreSum += video.score.weightedScore;
      buckets[value].count++;
    }

    const values = {};
    let bestValue = null;
    let bestAvg = -1;

    for (const [value, data] of Object.entries(buckets)) {
      const avg = Math.round((data.scoreSum / data.count) * 100) / 100;
      values[value] = {
        avg_score: avg,
        count: data.count,
      };
      if (avg > bestAvg) {
        bestAvg = avg;
        bestValue = value;
      }
    }

    const lift =
      globalAvg > 0
        ? Math.round(((bestAvg - globalAvg) / globalAvg) * 100) + "%"
        : "N/A";

    impact.push({
      variable,
      values,
      most_impactful_value: bestValue,
      lift_over_average: lift,
      global_avg: Math.round(globalAvg * 100) / 100,
    });
  }

  return impact;
}

/**
 * Determine the winning long-form template from variable impact data.
 *
 * @param {Array} variableImpact - Output of computeLongformVariableImpact
 * @param {Array} scoredVideos - Original scored videos for sample counting
 * @returns {Object} Winning template with confidence
 */
function computeLongformWinningTemplate(variableImpact, scoredVideos) {
  const template = {};
  for (const vi of variableImpact) {
    template[vi.variable] = vi.most_impactful_value;
  }

  const included = scoredVideos.filter((v) => !v.excluded && v.score);

  // Count videos matching the winning template exactly
  const matchingVideos = included.filter((v) =>
    LONGFORM_VARIABLES.every(
      (variable) => String(v.variables?.[variable]) === template[variable]
    )
  );

  const avgScore =
    matchingVideos.length > 0
      ? Math.round(
          (matchingVideos.reduce((sum, v) => sum + v.score.weightedScore, 0) /
            matchingVideos.length) *
            100
        ) / 100
      : null;

  let confidence = "low";
  if (matchingVideos.length >= 10) confidence = "high";
  else if (matchingVideos.length >= 5) confidence = "medium";

  return {
    ...template,
    avg_weighted_score: avgScore,
    confidence,
    sample_count: matchingVideos.length,
  };
}

/**
 * Generate exploit/explore briefs for long-form content.
 *
 * @param {Object} winningTemplate - Output of computeLongformWinningTemplate
 * @param {Array} variableImpact - Output of computeLongformVariableImpact
 * @param {number[]} ratio - [exploit_count, explore_count] e.g. [2, 1]
 * @returns {Object} { exploit: [...], explore: [...] }
 */
function generateLongformBriefs(winningTemplate, variableImpact, ratio) {
  const [exploitCount, exploreCount] = ratio;

  // Exploit briefs: use winning template as-is
  const exploit = [];
  for (let i = 0; i < exploitCount; i++) {
    const variables = {};
    for (const v of LONGFORM_VARIABLES) {
      variables[v] = winningTemplate[v];
    }
    exploit.push({
      type: "exploit",
      brief_index: i + 1,
      variables,
    });
  }

  // Explore briefs: change exactly one variable from the winning template
  const explore = [];
  for (let i = 0; i < exploreCount; i++) {
    // Pick a variable to explore — prefer variables with fewer data points
    const candidateVars = variableImpact.filter((vi) => {
      const values = Object.values(vi.values);
      // Has alternative values to try
      return values.length > 1 || values.some((v) => v.count < 3);
    });

    const targetVar =
      candidateVars.length > 0
        ? candidateVars[i % candidateVars.length]
        : variableImpact[i % variableImpact.length];

    // Pick the second-best value or least-tested value
    const currentBest = winningTemplate[targetVar.variable];
    const alternatives = Object.entries(targetVar.values)
      .filter(([value]) => value !== currentBest)
      .sort((a, b) => a[1].count - b[1].count); // least tested first

    const newValue =
      alternatives.length > 0 ? alternatives[0][0] : currentBest;

    const variables = {};
    for (const v of LONGFORM_VARIABLES) {
      variables[v] = winningTemplate[v];
    }
    variables[targetVar.variable] = newValue;

    explore.push({
      type: "explore",
      brief_index: i + 1,
      changed_variable: targetVar.variable,
      changed_from: currentBest,
      changed_to: newValue,
      variables,
    });
  }

  return { exploit, explore };
}

module.exports = {
  LONGFORM_VARIABLES,
  computeLongformVariableImpact,
  computeLongformWinningTemplate,
  generateLongformBriefs,
};
