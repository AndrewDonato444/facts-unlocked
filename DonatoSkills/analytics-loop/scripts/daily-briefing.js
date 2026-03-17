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

  return {
    date,
    content,
    cost,
    monthly_burn,
    analytics,
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

  // ANALYTICS HIGHLIGHTS
  lines.push("ANALYTICS HIGHLIGHTS (last 72hrs)");
  lines.push(DIV.substring(0, 40));
  if (!data.analytics.available) {
    lines.push(`  ${data.analytics.message || "No analytics data available"}`);
  } else {
    if (data.analytics.top_posts && data.analytics.top_posts.length > 0) {
      lines.push("  Top performers:");
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

  // Load analytics (scored-posts + decompose output if available)
  let analyticsData = { available: false };
  const projectsPath = path.join(skillsRoot, "projects.json");
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

module.exports = { aggregateCostLogs, buildBriefingData, formatBriefing };
