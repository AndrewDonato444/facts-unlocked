/**
 * testing-vectors.js — Long-Form Testing Vector Engine
 *
 * Manages systematic isolation testing of long-form video variables
 * across 3 tiers. Tracks test counts, suggests next variables to test,
 * and evaluates promotion/suppression criteria.
 *
 * Tier 1 (weeks 1-3): voice, video_length, intro_style
 * Tier 2 (weeks 4-6): publish_time, chapter_count, theme_type, narration_pace
 * Tier 3 (weeks 7+):  visual_density, ambient_music, caption_style
 *
 * Isolation protocol: change ONE variable per video.
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

const TIERS = [
  {
    tier: 1,
    label: "High Impact (weeks 1-3)",
    variables: [
      {
        name: "voice",
        values: ["matilda", "emily", "rachel"],
        signal: "estimated_retention_pct",
      },
      {
        name: "video_length_min",
        values: [15, 20, 25],
        signal: "watch_time",
      },
      {
        name: "intro_style",
        values: ["fact_hook", "story_open", "question", "cold_open"],
        signal: "estimated_retention_pct",
      },
    ],
  },
  {
    tier: 2,
    label: "Medium Impact (weeks 4-6)",
    variables: [
      {
        name: "publish_time",
        values: ["morning", "midday", "evening"],
        signal: "views_48h",
      },
      {
        name: "publish_day",
        values: ["mon_wed_fri", "tue_thu_sat"],
        signal: "views_48h",
      },
      {
        name: "chapter_count",
        values: [3, 4, 5],
        signal: "watch_time",
      },
      {
        name: "theme_type",
        values: ["mixed_facts", "single_topic"],
        signal: "estimated_retention_pct",
      },
      {
        name: "narration_pace",
        values: ["slow", "moderate"],
        signal: "watch_time",
      },
    ],
  },
  {
    tier: 3,
    label: "Fine-Tuning (weeks 7+)",
    variables: [
      {
        name: "visual_density",
        values: ["sparse", "moderate", "dense"],
        signal: "estimated_retention_pct",
      },
      {
        name: "ambient_music",
        values: ["none", "soft", "moderate"],
        signal: "estimated_retention_pct",
      },
      {
        name: "caption_style",
        values: ["none", "full", "key_words"],
        signal: "watch_time",
      },
    ],
  },
];

/**
 * Count how many times each variable value has been tested.
 */
function countTests(history) {
  const counts = {};

  for (const video of history) {
    if (!video.variables) continue;
    for (const [variable, value] of Object.entries(video.variables)) {
      const key = `${variable}:${value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Suggest the next variable and value to test, following the isolation protocol.
 * Prioritizes Tier 1 → Tier 2 → Tier 3. Within a tier, picks the variable
 * with the least-tested value.
 *
 * @param {Array} history - Scored video history with variables
 * @returns {Object} { variable, value, tier, reason }
 */
function suggestNextTest(history) {
  const testCounts = countTests(history);

  for (const tier of TIERS) {
    for (const varDef of tier.variables) {
      // Find values that haven't been tested enough (< 3 tests)
      const untested = varDef.values.filter((val) => {
        const key = `${varDef.name}:${val}`;
        return (testCounts[key] || 0) < 3;
      });

      if (untested.length > 0) {
        // Pick the least-tested value
        untested.sort((a, b) => {
          const countA = testCounts[`${varDef.name}:${a}`] || 0;
          const countB = testCounts[`${varDef.name}:${b}`] || 0;
          return countA - countB;
        });

        const value = untested[0];
        const count = testCounts[`${varDef.name}:${value}`] || 0;

        return {
          variable: varDef.name,
          value,
          tier: tier.tier,
          reason:
            count === 0
              ? `${varDef.name}=${value} has never been tested`
              : `${varDef.name}=${value} tested ${count} time(s), needs ${3 - count} more`,
        };
      }
    }
  }

  return {
    variable: null,
    value: null,
    tier: null,
    reason: "All tier variables have been tested 3+ times",
  };
}

/**
 * Evaluate which variable values qualify for promotion to exploit status.
 *
 * Promotion criteria:
 * - Tested in 3+ videos
 * - Estimated retention is 15%+ above the channel's average
 * - Watch hours per view is above median
 *
 * @param {Array} history - Scored video history
 * @returns {Array} Promoted variable values
 */
function evaluatePromotion(history) {
  const promotions = [];

  // Compute channel average retention
  const videosWithRetention = history.filter(
    (v) => v.score?.avg_retention_pct != null
  );
  if (videosWithRetention.length === 0) return promotions;

  const channelAvgRetention =
    videosWithRetention.reduce(
      (sum, v) => sum + v.score.avg_retention_pct,
      0
    ) / videosWithRetention.length;

  // Group by each variable value
  const allVarDefs = TIERS.flatMap((t) => t.variables);

  for (const varDef of allVarDefs) {
    const buckets = {};

    for (const video of videosWithRetention) {
      const value = video.variables?.[varDef.name];
      if (value == null) continue;
      const key = String(value);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(video.score.avg_retention_pct);
    }

    for (const [value, retentions] of Object.entries(buckets)) {
      if (retentions.length < 3) continue;

      const avgRetention =
        retentions.reduce((a, b) => a + b, 0) / retentions.length;
      const liftPct =
        ((avgRetention - channelAvgRetention) / channelAvgRetention) * 100;

      if (liftPct >= 15) {
        promotions.push({
          variable: varDef.name,
          value,
          avg_retention_pct: Math.round(avgRetention * 100) / 100,
          channel_avg_retention_pct:
            Math.round(channelAvgRetention * 100) / 100,
          lift_pct: Math.round(liftPct * 100) / 100,
          test_count: retentions.length,
        });
      }
    }
  }

  return promotions;
}

/**
 * Evaluate which variable values should be suppressed.
 *
 * Suppression criteria:
 * - Tested in 3+ videos
 * - Estimated retention is 20%+ below the channel's average
 *
 * @param {Array} history - Scored video history
 * @returns {Array} Suppressed variable values
 */
function evaluateSuppression(history) {
  const suppressions = [];

  const videosWithRetention = history.filter(
    (v) => v.score?.avg_retention_pct != null
  );
  if (videosWithRetention.length === 0) return suppressions;

  const channelAvgRetention =
    videosWithRetention.reduce(
      (sum, v) => sum + v.score.avg_retention_pct,
      0
    ) / videosWithRetention.length;

  const allVarDefs = TIERS.flatMap((t) => t.variables);

  for (const varDef of allVarDefs) {
    const buckets = {};

    for (const video of videosWithRetention) {
      const value = video.variables?.[varDef.name];
      if (value == null) continue;
      const key = String(value);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(video.score.avg_retention_pct);
    }

    for (const [value, retentions] of Object.entries(buckets)) {
      if (retentions.length < 3) continue;

      const avgRetention =
        retentions.reduce((a, b) => a + b, 0) / retentions.length;
      const dropPct =
        ((channelAvgRetention - avgRetention) / channelAvgRetention) * 100;

      if (dropPct >= 20) {
        suppressions.push({
          variable: varDef.name,
          value,
          avg_retention_pct: Math.round(avgRetention * 100) / 100,
          channel_avg_retention_pct:
            Math.round(channelAvgRetention * 100) / 100,
          drop_pct: Math.round(dropPct * 100) / 100,
          test_count: retentions.length,
        });
      }
    }
  }

  return suppressions;
}

/**
 * Summarize test history: coverage per variable, publish time distribution.
 *
 * @param {Array} history - Scored video history
 * @returns {Object} Test summary
 */
function summarizeTestHistory(history) {
  const testCounts = countTests(history);
  const allVarDefs = TIERS.flatMap((t) => t.variables);

  const variableCoverage = allVarDefs.map((varDef) => {
    const values = {};
    for (const val of varDef.values) {
      const key = `${varDef.name}:${val}`;
      values[String(val)] = { count: testCounts[key] || 0 };
    }
    return {
      variable: varDef.name,
      values,
      totalTests: Object.values(values).reduce((sum, v) => sum + v.count, 0),
    };
  });

  // Publish time distribution
  const byHour = {};
  const byDay = {};

  for (const video of history) {
    if (!video.publishedAt) continue;
    const date = new Date(video.publishedAt);
    const hour = date.getUTCHours();
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      date.getUTCDay()
    ];
    byHour[hour] = (byHour[hour] || 0) + 1;
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return {
    totalVideos: history.length,
    variableCoverage,
    publishTimeDistribution: { byHour, byDay },
  };
}

module.exports = {
  TIERS,
  suggestNextTest,
  evaluatePromotion,
  evaluateSuppression,
  summarizeTestHistory,
};
