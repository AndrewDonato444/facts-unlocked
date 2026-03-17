#!/usr/bin/env node
/**
 * Phase 2: Score Posts by Engagement Density
 *
 * Reads raw-analytics.json, applies the weighted engagement density formula,
 * excludes posts below the impression threshold, and aggregates per-channel.
 *
 * Formula:
 *   engagement_density = (shares*4 + saves*3 + comments*2 + likes*1) / impressions * 1000
 *
 * Usage:
 *   node score-posts.js <project-slug> [<date>]
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/scored-posts.json
 */

const fs = require("fs");
const path = require("path");

// Default weights — can be overridden via project config
const DEFAULT_WEIGHTS = {
  shares: 4,
  saves: 3,
  comments: 2,
  likes: 1,
};

function scorePost(post, weights, minImpressions) {
  const a = post.analytics || {};
  const impressions = a.impressions || 0;
  const likes = a.likes || 0;
  const comments = a.comments || 0;
  const shares = a.shares || 0;
  const saves = a.saves || 0;

  if (impressions < minImpressions) {
    return {
      ...post,
      score: null,
      excluded: true,
      reason: "below_impression_threshold",
    };
  }

  const rawScore =
    shares * weights.shares +
    saves * weights.saves +
    comments * weights.comments +
    likes * weights.likes;

  const engagementDensity = Math.round(((rawScore / impressions) * 1000) * 100) / 100;

  return {
    ...post,
    score: {
      engagementDensity,
      rawScore,
      components: {
        sharesContribution: shares * weights.shares,
        savesContribution: saves * weights.saves,
        commentsContribution: comments * weights.comments,
        likesContribution: likes * weights.likes,
      },
    },
    excluded: false,
  };
}

function aggregateByChannel(scoredPosts) {
  const channels = {};

  for (const post of scoredPosts) {
    if (post.excluded) continue;

    // Use platform + profile/account name as channel identifier
    const platform =
      post.platformAnalytics?.[0]?.platform || "unknown";
    const profileName = post.profileName || post.accountName || "";
    const key = profileName ? `${profileName} (${platform})` : platform;

    if (!channels[key]) {
      channels[key] = { platform: key, posts: [], scores: [] };
    }
    channels[key].posts.push(post);
    channels[key].scores.push(post.score.engagementDensity);
  }

  return Object.values(channels).map((ch) => {
    const sorted = [...ch.scores].sort((a, b) => b - a);
    return {
      platform: ch.platform,
      postCount: ch.posts.length,
      avgEngagementDensity:
        Math.round(
          (ch.scores.reduce((a, b) => a + b, 0) / ch.scores.length) * 100
        ) / 100,
      median: sorted[Math.floor(sorted.length / 2)],
      p75: sorted[Math.floor(sorted.length * 0.25)],
      p90: sorted[Math.floor(sorted.length * 0.1)],
      topPost: ch.posts.sort(
        (a, b) => b.score.engagementDensity - a.score.engagementDensity
      )[0],
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];
  const date = args[1] || new Date().toISOString().split("T")[0];

  if (!projectSlug) {
    console.error("Usage: node score-posts.js <project-slug> [<date>]");
    process.exit(1);
  }

  // Load project config for custom weights
  const registryPath = path.resolve(__dirname, "../../projects.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = registry.projects[projectSlug];
  const config = project?.analytics_loop || {};

  const weights = { ...DEFAULT_WEIGHTS, ...config.scoring_weights };
  const minImpressions = config.min_impressions || 500;

  // Load raw analytics
  const dataDir = path.resolve(__dirname, `../data/${projectSlug}/${date}`);
  const rawPath = path.join(dataDir, "raw-analytics.json");

  if (!fs.existsSync(rawPath)) {
    console.error(`No raw analytics found at ${rawPath}`);
    console.error("Run pull-analytics.js first.");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  console.log(`Scoring ${raw.totalPosts} posts (min impressions: ${minImpressions})`);
  console.log(`Weights: shares=${weights.shares}, saves=${weights.saves}, comments=${weights.comments}, likes=${weights.likes}`);

  // Score all posts
  const scored = raw.posts.map((post) => scorePost(post, weights, minImpressions));

  // Sort by engagement density (excluded posts at the end)
  scored.sort((a, b) => {
    if (a.excluded && !b.excluded) return 1;
    if (!a.excluded && b.excluded) return -1;
    if (a.excluded && b.excluded) return 0;
    return b.score.engagementDensity - a.score.engagementDensity;
  });

  const included = scored.filter((p) => !p.excluded);
  const excluded = scored.filter((p) => p.excluded);

  // Aggregate
  const channelAggregation = aggregateByChannel(scored);
  const globalAvg =
    included.length > 0
      ? Math.round(
          (included.reduce((sum, p) => sum + p.score.engagementDensity, 0) /
            included.length) *
            100
        ) / 100
      : 0;

  const output = {
    project: projectSlug,
    scoredAt: new Date().toISOString(),
    dateRange: raw.dateRange,
    weights,
    minImpressions,
    summary: {
      totalPosts: scored.length,
      includedPosts: included.length,
      excludedPosts: excluded.length,
      globalAvgEngagementDensity: globalAvg,
      topScore: included[0]?.score?.engagementDensity || null,
    },
    channelAggregation,
    posts: scored,
  };

  // Write output
  const outPath = path.join(dataDir, "scored-posts.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  // Print summary
  console.log(`\n--- Scoring Summary ---`);
  console.log(`Posts analyzed: ${included.length} (${excluded.length} excluded)`);
  console.log(`Global avg engagement density: ${globalAvg}`);
  if (included.length > 0) {
    console.log(`\nTop 5:`);
    included.slice(0, 5).forEach((p, i) => {
      const preview = (p.content || "").substring(0, 50);
      console.log(
        `  #${i + 1}  [${p.score.engagementDensity}] "${preview}..." — ${p.analytics?.impressions || 0} impressions`
      );
    });
  }
  console.log(`\nWrote scored posts to ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
