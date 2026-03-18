#!/usr/bin/env node
/**
 * Daily Analytics Briefing with Cost-Per-Video Tracking
 *
 * Reads cost logs + analytics data and outputs a readable midday report.
 *
 * Usage:
 *   node daily-briefing.js [--date YYYY-MM-DD] [--save]
 *
 * Options:
 *   --date today | YYYY-MM-DD   Date to generate briefing for (default: today)
 *   --save                      Write report to briefings/{date}/report.md
 *
 * Output:
 *   Terminal (default) or briefings/{date}/report.md (with --save)
 */

const fs = require("fs");
const path = require("path");

const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

// ─────────────────────────────────────────────
// Zernio API helpers
// ─────────────────────────────────────────────

/**
 * Fetch daily-metrics from Zernio for a given profile and date range.
 *
 * @param {string} profileId
 * @param {string} apiKey
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} toDate   YYYY-MM-DD
 * @returns {object|null} { dailyData, platformBreakdown } or null on error
 */
async function fetchZernioDailyMetrics(profileId, apiKey, fromDate, toDate) {
  const url = new URL(`${ZERNIO_BASE_URL}/analytics/daily-metrics`);
  url.searchParams.set("profileId", profileId);
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch top posts from Zernio for a given profile and date range.
 *
 * @param {string} profileId
 * @param {string} apiKey
 * @param {string} fromDate
 * @param {string} toDate
 * @param {number} limit
 * @returns {Array} top posts sorted by engagement, or []
 */
async function fetchZernioTopPosts(profileId, apiKey, fromDate, toDate, limit = 10) {
  const url = new URL(`${ZERNIO_BASE_URL}/analytics`);
  url.searchParams.set("profileId", profileId);
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);
  url.searchParams.set("source", "late");
  url.searchParams.set("sortBy", "engagement");
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.posts || [];
}

// ─────────────────────────────────────────────
// fetchLiveAnalytics — pull yesterday's data from Zernio API
// ─────────────────────────────────────────────

/**
 * Pull daily-metrics and top posts from Zernio for all projects.
 *
 * @param {object} registry - projects.json content
 * @param {string} apiKey
 * @param {string} yesterday - YYYY-MM-DD (the day we're reporting on)
 * @returns {object} { byProject, totals, topPosts, insights }
 */
async function fetchLiveAnalytics(registry, apiKey, yesterday) {
  const result = {
    byProject: {},
    totals: { impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, views: 0, posts: 0 },
    topPosts: [],
    insights: [],
    error: null,
  };

  for (const [slug, project] of Object.entries(registry.projects || {})) {
    const profileId = project.zernio?.profile_id;
    if (!profileId) continue;

    try {
      const [dailyMetrics, topPosts] = await Promise.all([
        fetchZernioDailyMetrics(profileId, apiKey, yesterday, yesterday),
        fetchZernioTopPosts(profileId, apiKey, yesterday, yesterday, 5),
      ]);

      const projectData = {
        name: project.name,
        dailyMetrics: null,
        platformBreakdown: null,
        topPosts: [],
        postCount: 0,
      };

      if (dailyMetrics && dailyMetrics.dailyData && dailyMetrics.dailyData.length > 0) {
        const day = dailyMetrics.dailyData[0];
        projectData.dailyMetrics = day;
        projectData.platformBreakdown = dailyMetrics.platformBreakdown || null;

        result.totals.impressions += day.impressions || 0;
        result.totals.likes += day.likes || 0;
        result.totals.comments += day.comments || 0;
        result.totals.shares += day.shares || 0;
        result.totals.saves += day.saves || 0;
      }

      if (topPosts.length > 0) {
        projectData.topPosts = topPosts;
        projectData.postCount = topPosts.length;
        result.totals.posts += topPosts.length;

        for (const post of topPosts) {
          const a = post.analytics || {};
          result.totals.views += a.views || 0;
          result.topPosts.push({
            project: project.name,
            content: (post.content || "").substring(0, 50),
            impressions: a.impressions || 0,
            engagementRate: a.engagementRate || 0,
            likes: a.likes || 0,
            comments: a.comments || 0,
            shares: a.shares || 0,
            saves: a.saves || 0,
            views: a.views || 0,
            platforms: (post.platformAnalytics || []).map((p) => p.platform),
          });
        }
      }

      result.byProject[slug] = projectData;
    } catch (err) {
      result.byProject[slug] = { name: project.name, error: err.message };
    }
  }

  // Sort top posts by engagement rate across all projects
  result.topPosts.sort((a, b) => b.engagementRate - a.engagementRate);

  // Generate insights
  result.insights = generateInsights(result);

  return result;
}

/**
 * Derive actionable insights from the day's analytics data.
 */
function generateInsights(liveData) {
  const insights = [];
  const t = liveData.totals;

  if (t.posts === 0) {
    insights.push("No post data available for yesterday — posts may be too new (<48h) for Zernio to report.");
    return insights;
  }

  // Overall engagement rate
  if (t.impressions > 0) {
    const overallRate = ((t.likes + t.comments + t.shares + t.saves) / t.impressions * 100).toFixed(2);
    insights.push(`Overall engagement rate: ${overallRate}% across ${t.posts} posts and ${t.impressions.toLocaleString()} impressions.`);

    if (parseFloat(overallRate) >= 5) {
      insights.push("Strong day — engagement rate above 5% benchmark.");
    } else if (parseFloat(overallRate) < 2) {
      insights.push("Below average day — consider reviewing hook types and posting times.");
    }
  }

  // Shares-to-likes ratio (virality signal)
  if (t.likes > 0) {
    const shareRatio = (t.shares / t.likes * 100).toFixed(1);
    if (parseFloat(shareRatio) >= 10) {
      insights.push(`High virality signal — ${shareRatio}% share-to-like ratio (>10% = strong shareability).`);
    }
  }

  // Saves signal (bookmark-worthy = high value)
  if (t.saves > 0 && t.impressions > 0) {
    const saveRate = (t.saves / t.impressions * 100).toFixed(2);
    if (parseFloat(saveRate) >= 1) {
      insights.push(`Save rate of ${saveRate}% — content is bookmark-worthy (>1% is excellent).`);
    }
  }

  // Top performer callout
  if (liveData.topPosts.length > 0) {
    const best = liveData.topPosts[0];
    insights.push(`Top performer: "${best.content}..." (${best.engagementRate}% ER, ${best.impressions.toLocaleString()} imps) on ${best.platforms.join(", ") || "unknown"}.`);
  }

  // Cross-project comparison
  const projectEntries = Object.entries(liveData.byProject).filter(
    ([, p]) => p.dailyMetrics && p.dailyMetrics.impressions > 0
  );
  if (projectEntries.length > 1) {
    const ranked = projectEntries
      .map(([slug, p]) => {
        const d = p.dailyMetrics;
        const er = ((d.likes + d.comments + d.shares + d.saves) / d.impressions * 100).toFixed(2);
        return { slug, name: p.name, er: parseFloat(er), impressions: d.impressions };
      })
      .sort((a, b) => b.er - a.er);
    insights.push(
      `Channel ranking by ER: ${ranked.map((r) => `${r.name} (${r.er}%)`).join(" > ")}`
    );
  }

  return insights;
}

// ─────────────────────────────────────────────
// aggregateCostLogs
// ─────────────────────────────────────────────

/**
 * Read all usage.jsonl files for a given date and aggregate by channel/video.
 *
 * @param {string} logsBaseDir - root of cost-tracker/logs directory
 * @param {string} date - YYYY-MM-DD
 * @returns {object} aggregated cost data
 */
function aggregateCostLogs(logsBaseDir, date) {
  const dateDir = path.join(logsBaseDir, date);
  const result = {
    channels: {},
    total_cost: 0,
    video_count: 0,
    budget_warnings: [],
  };

  if (!fs.existsSync(dateDir)) {
    return result;
  }

  const channelDirs = fs.readdirSync(dateDir).filter((entry) => {
    return fs.statSync(path.join(dateDir, entry)).isDirectory();
  });

  for (const channel of channelDirs) {
    const logPath = path.join(dateDir, channel, "usage.jsonl");
    if (!fs.existsSync(logPath)) continue;

    const lines = fs
      .readFileSync(logPath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());

    const records = lines.map((l) => JSON.parse(l));

    if (!result.channels[channel]) {
      result.channels[channel] = { videos: {}, total_cost: 0 };
    }
    const ch = result.channels[channel];

    for (const record of records) {
      const vid = record.video_id;

      if (!ch.videos[vid]) {
        ch.videos[vid] = { total_cost: 0, by_provider: {} };
      }
      const video = ch.videos[vid];

      video.total_cost = Math.round((video.total_cost + record.cost_usd) * 1000000) / 1000000;

      if (!video.by_provider[record.provider]) {
        video.by_provider[record.provider] = {
          cost_usd: 0,
          units_used: 0,
          unit_type: record.unit_type,
        };
      }
      const prov = video.by_provider[record.provider];
      prov.cost_usd = Math.round((prov.cost_usd + record.cost_usd) * 1000000) / 1000000;
      prov.units_used += record.units_used;

      if (record.budget_warning) {
        result.budget_warnings.push({
          provider: record.provider,
          channel,
          video_id: vid,
          monthly_units_running_total: record.monthly_units_running_total,
          monthly_budget_remaining_pct: record.monthly_budget_remaining_pct,
        });
      }
    }

    ch.total_cost = Object.values(ch.videos).reduce((sum, v) => sum + v.total_cost, 0);
    ch.total_cost = Math.round(ch.total_cost * 1000000) / 1000000;
    result.total_cost = Math.round((result.total_cost + ch.total_cost) * 1000000) / 1000000;
    result.video_count += Object.keys(ch.videos).length;
  }

  return result;
}

// ─────────────────────────────────────────────
// buildBriefingData
// ─────────────────────────────────────────────

/**
 * Assemble structured briefing data from cost logs + analytics.
 *
 * @param {object} opts
 *   - costData: output of aggregateCostLogs
 *   - analyticsData: { available, topPosts, winningVariables, suppressedVariables }
 *   - monthlyTotals: { elevenlabs: { total_units, total_cost_usd, unit_type }, ... }
 *   - date: YYYY-MM-DD
 *   - elevenLabsPlanBudget: number (default 100000)
 *   - elevenLabsPlanCost: number (default 22)
 */
function buildBriefingData({
  costData,
  analyticsData,
  monthlyTotals,
  date,
  liveAnalytics = null,
  elevenLabsPlanBudget = 100000,
  elevenLabsPlanCost = 22,
}) {
  const videoCount = costData.video_count;
  const totalCost = costData.total_cost;

  // Content section
  const byChannelContent = {};
  for (const [ch, chData] of Object.entries(costData.channels)) {
    byChannelContent[ch] = { video_count: Object.keys(chData.videos).length };
  }

  const content = {
    total_videos: videoCount,
    no_content_today: videoCount === 0,
    by_channel: byChannelContent,
  };

  // Cost section
  const byProviderSummary = {};
  for (const [ch, chData] of Object.entries(costData.channels)) {
    for (const vid of Object.values(chData.videos)) {
      for (const [prov, provData] of Object.entries(vid.by_provider || {})) {
        if (!byProviderSummary[prov]) {
          byProviderSummary[prov] = { total_cost: 0 };
        }
        byProviderSummary[prov].total_cost = Math.round(
          (byProviderSummary[prov].total_cost + provData.cost_usd) * 1000000
        ) / 1000000;
      }
    }
  }

  const cost = {
    total_usd: totalCost,
    avg_per_video: videoCount > 0 ? Math.round((totalCost / videoCount) * 10000) / 10000 : 0,
    by_channel: costData.channels,
    by_provider_summary: byProviderSummary,
  };

  // Monthly burn section
  const monthly_burn = {};
  if (monthlyTotals.elevenlabs) {
    const el = monthlyTotals.elevenlabs;
    const pctUsed = Math.round((el.total_units / elevenLabsPlanBudget) * 10000) / 100;

    // Estimate day-of-month for projection
    const dayOfMonth = parseInt(date.split("-")[2], 10);
    const daysInMonth = new Date(
      parseInt(date.split("-")[0], 10),
      parseInt(date.split("-")[1], 10),
      0
    ).getDate();
    const dailyRate = el.total_units / dayOfMonth;
    const projectedMonthlyUnits = Math.round(dailyRate * daysInMonth);
    const projectedMonthlyCost = Math.round(
      (projectedMonthlyUnits / elevenLabsPlanBudget) * elevenLabsPlanCost * 100
    ) / 100;

    monthly_burn.elevenlabs = {
      chars_used: el.total_units,
      monthly_budget: elevenLabsPlanBudget,
      pct_used: pctUsed,
      amortized_cost_usd: el.total_cost_usd,
      plan_cost_usd: elevenLabsPlanCost,
      projected_monthly_units: projectedMonthlyUnits,
      projected_monthly_cost_usd: projectedMonthlyCost,
      status: pctUsed >= 80 ? "warning" : "ok",
    };
  }

  // Analytics section
  const analytics = { available: analyticsData.available };
  if (analyticsData.available) {
    analytics.top_posts = (analyticsData.topPosts || []).slice(0, 3);
    analytics.winning_variables = analyticsData.winningVariables || [];
    analytics.suppressed_variables = analyticsData.suppressedVariables || [];
  } else {
    analytics.message = "No data yet — posts are <48hrs old";
  }

  // Live Zernio analytics section (yesterday's actual API data)
  const live = {};
  if (liveAnalytics && !liveAnalytics.error) {
    live.available = liveAnalytics.totals.posts > 0;
    live.totals = liveAnalytics.totals;
    live.topPosts = (liveAnalytics.topPosts || []).slice(0, 5);
    live.insights = liveAnalytics.insights || [];
    live.byProject = {};
    for (const [slug, pData] of Object.entries(liveAnalytics.byProject)) {
      live.byProject[slug] = {
        name: pData.name,
        dailyMetrics: pData.dailyMetrics,
        platformBreakdown: pData.platformBreakdown,
        postCount: pData.postCount || 0,
        error: pData.error || null,
      };
    }
  } else {
    live.available = false;
    live.error = liveAnalytics?.error || "Zernio API not called";
  }

  return {
    date,
    content,
    cost,
    monthly_burn,
    analytics,
    live,
    budget_warnings: costData.budget_warnings,
  };
}

// ─────────────────────────────────────────────
// formatBriefing
// ─────────────────────────────────────────────

const SEP = "═".repeat(56);
const DIV = "─".repeat(40);

function fmt$(n) {
  return `$${n.toFixed(2)}`;
}

function fmtNum(n) {
  return n.toLocaleString("en-US");
}

/**
 * Format structured briefing data into a human-readable string.
 *
 * @param {object} data - output of buildBriefingData
 * @returns {string} formatted report
 */
function formatBriefing(data) {
  const lines = [];

  lines.push(SEP);
  lines.push("  FACTS UNLOCKED — DAILY BRIEFING");
  lines.push(`  ${data.date}  |  Midday Report`);
  lines.push(SEP);
  lines.push("");

  // TODAY'S CONTENT
  lines.push("TODAY'S CONTENT");
  lines.push(DIV.substring(0, 23));
  if (data.content.no_content_today) {
    lines.push("  No videos generated today");
  } else {
    for (const [ch, chData] of Object.entries(data.content.by_channel)) {
      lines.push(`  ${ch.padEnd(30)} ${chData.video_count} video${chData.video_count !== 1 ? "s" : ""}`);
    }
    lines.push(`  ${"Total".padEnd(30)} ${data.content.total_videos} videos generated`);
  }
  lines.push("");

  // COST PER VIDEO
  lines.push("COST PER VIDEO");
  lines.push(DIV.substring(0, 22));
  if (data.content.no_content_today) {
    lines.push(`  Cost: ${fmt$(0)}`);
  } else {
    for (const [ch, chData] of Object.entries(data.cost.by_channel)) {
      lines.push(`Channel: ${ch}`);
      for (const [vid, vidData] of Object.entries(chData.videos)) {
        lines.push(`  Video — ${vid}`);
        for (const [prov, provData] of Object.entries(vidData.by_provider)) {
          const label = `    ${prov} (${fmtNum(provData.units_used)} ${provData.unit_type}${provData.units_used !== 1 ? "s" : ""})`;
          lines.push(`${label.padEnd(46)} ${fmt$(provData.cost_usd)}`);
        }
        lines.push(`    ${DIV.substring(0, 36)}`);
        lines.push(`    ${"Video total".padEnd(36)} ${fmt$(vidData.total_cost)}`);
        lines.push("");
      }
    }
  }

  // DAILY SUMMARY
  lines.push("DAILY SUMMARY");
  lines.push(DIV.substring(0, 21));
  for (const [prov, provData] of Object.entries(data.cost.by_provider_summary)) {
    lines.push(`  ${"Total " + prov + " cost".padEnd(38)} ${fmt$(provData.total_cost)}`);
  }
  // Cloudinary always shown as free
  lines.push(`  ${"Media hosting (Cloudinary)".padEnd(38)} Free`);
  lines.push(`  ${DIV.substring(0, 38)}`);
  lines.push(`  ${"Total".padEnd(38)} ${fmt$(data.cost.total_usd)}`);
  if (data.content.total_videos > 0) {
    lines.push(`  ${"Avg cost per video".padEnd(38)} ${fmt$(data.cost.avg_per_video)}`);
  }
  lines.push("");

  // MONTHLY BUDGET
  if (data.monthly_burn.elevenlabs) {
    const el = data.monthly_burn.elevenlabs;
    lines.push("MONTHLY BUDGET (ElevenLabs)");
    lines.push(DIV.substring(0, 34));
    lines.push(`  Used this month: ${fmtNum(el.chars_used)} / ${fmtNum(el.monthly_budget)} chars  (${el.pct_used}%)`);
    lines.push(`  Remaining budget: ${fmtNum(el.monthly_budget - el.chars_used)} chars`);
    lines.push(`  Amortized spend: ${fmt$(el.amortized_cost_usd)} of ${fmt$(el.plan_cost_usd)} plan`);
    lines.push(`  At this rate, monthly spend: ~${fmt$(el.projected_monthly_cost_usd)}/mo`);
    if (el.status === "warning") {
      lines.push(`  ⚠ Budget warning — approaching 100k plan limit`);
    } else {
      lines.push(`  ✓ Well within plan — no action needed`);
    }
    lines.push("");
  }

  // BUDGET WARNINGS (if any)
  if (data.budget_warnings && data.budget_warnings.length > 0) {
    lines.push("⚠ BUDGET WARNING");
    lines.push(DIV.substring(0, 24));
    for (const w of data.budget_warnings) {
      lines.push(`  ${w.provider} approaching monthly limit on ${w.channel}`);
      if (w.monthly_budget_remaining_pct !== null) {
        lines.push(`  ${w.monthly_budget_remaining_pct}% remaining`);
      }
    }
    lines.push("");
  }

  // YESTERDAY'S PERFORMANCE (live Zernio data)
  lines.push("YESTERDAY'S PERFORMANCE (Zernio API)");
  lines.push(DIV.substring(0, 42));
  if (data.live && data.live.available) {
    const t = data.live.totals;
    lines.push(`  Posts tracked:     ${t.posts}`);
    lines.push(`  Impressions:       ${fmtNum(t.impressions)}`);
    lines.push(`  Views:             ${fmtNum(t.views)}`);
    lines.push(`  Likes:             ${fmtNum(t.likes)}`);
    lines.push(`  Comments:          ${fmtNum(t.comments)}`);
    lines.push(`  Shares:            ${fmtNum(t.shares)}`);
    lines.push(`  Saves:             ${fmtNum(t.saves)}`);
    lines.push("");

    // Per-channel breakdown
    for (const [slug, pData] of Object.entries(data.live.byProject)) {
      if (pData.error) {
        lines.push(`  ${pData.name}: Error — ${pData.error}`);
        continue;
      }
      if (!pData.dailyMetrics) continue;
      const d = pData.dailyMetrics;
      const er = d.impressions > 0
        ? ((d.likes + d.comments + d.shares + d.saves) / d.impressions * 100).toFixed(2)
        : "0.00";
      lines.push(`  ${pData.name} (${pData.postCount} posts)`);
      lines.push(`    Impressions: ${fmtNum(d.impressions || 0)}  |  ER: ${er}%`);
      lines.push(`    Likes: ${fmtNum(d.likes || 0)}  Comments: ${fmtNum(d.comments || 0)}  Shares: ${fmtNum(d.shares || 0)}  Saves: ${fmtNum(d.saves || 0)}`);

      // Platform breakdown if available
      if (pData.platformBreakdown) {
        const platforms = Object.entries(pData.platformBreakdown).filter(
          ([plat]) => isNaN(plat) && plat.length > 1
        );
        if (platforms.length > 1) {
          for (const [plat, platData] of platforms) {
            lines.push(`      ${plat}: ${fmtNum(platData.impressions || 0)} imps, ${fmtNum(platData.likes || 0)} likes`);
          }
        }
      }
      lines.push("");
    }

    // Top posts
    if (data.live.topPosts && data.live.topPosts.length > 0) {
      lines.push("  Top Posts:");
      data.live.topPosts.slice(0, 3).forEach((p, i) => {
        lines.push(`    ${i + 1}. "${p.content}..."`);
        lines.push(`       ${p.engagementRate}% ER  |  ${fmtNum(p.impressions)} imps  |  ${p.platforms.join(", ")}`);
      });
      lines.push("");
    }

    // Insights
    if (data.live.insights && data.live.insights.length > 0) {
      lines.push("  Insights:");
      for (const insight of data.live.insights) {
        lines.push(`    → ${insight}`);
      }
      lines.push("");
    }
  } else {
    const reason = data.live?.error || "No data returned from Zernio API";
    lines.push(`  ${reason}`);
    lines.push("  Posts may be too new (<48h) or analytics add-on may not be active.");
    lines.push("");
  }

  // ANALYTICS HIGHLIGHTS (local scored data, if available)
  lines.push("ANALYTICS HIGHLIGHTS (local scored data)");
  lines.push(DIV.substring(0, 44));
  if (!data.analytics.available) {
    lines.push(`  ${data.analytics.message || "No local scored data available"}`);
  } else {
    if (data.analytics.top_posts && data.analytics.top_posts.length > 0) {
      lines.push("  Top performers (scored):");
      data.analytics.top_posts.forEach((p, i) => {
        const label = `    ${i + 1}. ${p.content}`;
        lines.push(`${label.padEnd(40)} Score: ${p.score}  (${p.platform})`);
      });
      lines.push("");
    }
    if (data.analytics.winning_variables && data.analytics.winning_variables.length > 0) {
      lines.push("  Winning variables:");
      for (const v of data.analytics.winning_variables) {
        lines.push(`    ${(v.variable + ": " + v.value).padEnd(32)} ${v.lift} vs baseline`);
      }
      lines.push("");
    }
    if (data.analytics.suppressed_variables && data.analytics.suppressed_variables.length > 0) {
      lines.push("  Suppressed (underperforming):");
      for (const v of data.analytics.suppressed_variables) {
        lines.push(`    ${(v.variable + ": " + v.value).padEnd(32)} ${v.reason}`);
      }
      lines.push("");
    }
  }

  lines.push(SEP);

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf("--date");
  let date = new Date().toISOString().split("T")[0];
  if (dateIdx !== -1 && args[dateIdx + 1]) {
    const raw = args[dateIdx + 1];
    date = raw === "today" ? new Date().toISOString().split("T")[0] : raw;
  }
  const save = args.includes("--save");

  const skillsRoot = path.resolve(__dirname, "../../");
  const logsBaseDir = path.join(skillsRoot, "cost-tracker", "logs");
  const monthlyDir = path.join(
    skillsRoot,
    "cost-tracker",
    "monthly",
    date.substring(0, 7)
  );

  // Load cost data
  const { readMonthlyTotals } = require("../../cost-tracker/log-usage");
  const costData = aggregateCostLogs(logsBaseDir, date);
  const monthlyTotals = readMonthlyTotals(monthlyDir);

  // Load .env.local for ZERNIO_API_KEY
  const envPath = path.join(skillsRoot, ".env.local");
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of envLines) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }

  // Compute yesterday's date for the Zernio API query
  const todayDate = new Date(date + "T12:00:00");
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  // Fetch live analytics from Zernio API for yesterday
  let liveAnalytics = null;
  const projectsPath = path.join(skillsRoot, "projects.json");
  const zernioApiKey = process.env.ZERNIO_API_KEY;
  if (fs.existsSync(projectsPath) && zernioApiKey) {
    try {
      const registry = JSON.parse(fs.readFileSync(projectsPath, "utf-8"));
      liveAnalytics = await fetchLiveAnalytics(registry, zernioApiKey, yesterday);
      console.error(`[info] Fetched Zernio daily-metrics for ${yesterday}`);
    } catch (err) {
      liveAnalytics = { error: err.message };
      console.error(`[warn] Zernio API call failed: ${err.message}`);
    }
  } else if (!zernioApiKey) {
    liveAnalytics = { error: "ZERNIO_API_KEY not set" };
    console.error("[warn] ZERNIO_API_KEY not found — skipping live analytics");
  }

  // Load local analytics (scored-posts + decompose output if available)
  let analyticsData = { available: false };
  if (fs.existsSync(projectsPath)) {
    try {
      const registry = JSON.parse(fs.readFileSync(projectsPath, "utf-8"));
      const allTopPosts = [];
      const allWinning = [];
      const allSuppressed = [];

      for (const [projectSlug] of Object.entries(registry.projects || {})) {
        const dataDir = path.join(skillsRoot, "analytics-loop", "data", projectSlug, date);
        const scoredPath = path.join(dataDir, "scored-posts.json");
        const variablePath = path.join(dataDir, "variable-analysis.json");

        if (fs.existsSync(scoredPath)) {
          const scored = JSON.parse(fs.readFileSync(scoredPath, "utf-8"));
          const topPosts = (scored.posts || [])
            .filter((p) => !p.excluded && p.score)
            .slice(0, 3)
            .map((p) => ({
              content: (p.content || "").substring(0, 40),
              score: p.score.engagementDensity,
              platform: p.platformAnalytics?.[0]?.platform || "unknown",
            }));
          allTopPosts.push(...topPosts);
          analyticsData.available = true;
        }

        if (fs.existsSync(variablePath)) {
          const varAnalysis = JSON.parse(fs.readFileSync(variablePath, "utf-8"));
          if (varAnalysis.variable_impact) {
            for (const v of varAnalysis.variable_impact) {
              if (v.most_impactful_value && v.lift_over_average) {
                allWinning.push({
                  variable: v.variable,
                  value: v.most_impactful_value,
                  lift: v.lift_over_average,
                });
              }
            }
          }
          analyticsData.available = true;
        }
      }

      if (analyticsData.available) {
        analyticsData.topPosts = allTopPosts
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        analyticsData.winningVariables = allWinning.slice(0, 5);
        analyticsData.suppressedVariables = [];
      }
    } catch (err) {
      // Analytics load failed — show cost data only
      analyticsData = { available: false };
    }
  }

  const briefingData = buildBriefingData({
    costData,
    analyticsData,
    monthlyTotals,
    date,
    liveAnalytics,
  });

  const output = formatBriefing(briefingData);

  if (save) {
    const briefingsDir = path.join(skillsRoot, "analytics-loop", "briefings", date);
    fs.mkdirSync(briefingsDir, { recursive: true });
    const reportPath = path.join(briefingsDir, "report.md");
    fs.writeFileSync(reportPath, output);
    console.log(`Briefing saved to ${reportPath}`);
  } else {
    console.log(output);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = {
  aggregateCostLogs,
  buildBriefingData,
  formatBriefing,
  fetchZernioDailyMetrics,
  fetchZernioTopPosts,
  fetchLiveAnalytics,
  generateInsights,
};
