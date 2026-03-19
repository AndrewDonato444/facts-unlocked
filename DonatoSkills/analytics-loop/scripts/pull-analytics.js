#!/usr/bin/env node
/**
 * Phase 1: Pull Analytics from Zernio
 *
 * Fetches post-level analytics for a project's Zernio profile(s)
 * within a configurable time window. Paginates through all results.
 *
 * Usage:
 *   node pull-analytics.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *
 * Environment:
 *   ZERNIO_API_KEY — Zernio API key (or project-specific env var from projects.json)
 *
 * Output:
 *   analytics-loop/data/<project>/<date>/raw-analytics.json
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://zernio.com/api/v1";

async function pullAnalytics(profileId, apiKey, fromDate, toDate) {
  const results = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${BASE_URL}/analytics`);
    url.searchParams.set("profileId", profileId);
    url.searchParams.set("fromDate", fromDate);
    url.searchParams.set("toDate", toDate);
    url.searchParams.set("source", "late"); // only posts published via Zernio API
    url.searchParams.set("sortBy", "engagement");
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.status === 402) {
      throw new Error(
        "Zernio Analytics add-on required. Enable at app.zernio.com/settings/billing."
      );
    }

    if (!response.ok) {
      throw new Error(
        `Zernio API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    results.push(...data.posts);
    hasMore = data.posts.length === 100;
    page++;
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const projectSlug = args[0];

  if (!projectSlug) {
    console.error("Usage: node pull-analytics.js <project-slug> [--from YYYY-MM-DD] [--to YYYY-MM-DD]");
    process.exit(1);
  }

  // Parse optional date args
  let fromDate, toDate;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) fromDate = args[++i];
    if (args[i] === "--to" && args[i + 1]) toDate = args[++i];
  }

  // Default: 48-72 hours ago
  if (!toDate) {
    const d = new Date();
    d.setHours(d.getHours() - 48);
    toDate = d.toISOString().split("T")[0];
  }
  if (!fromDate) {
    const d = new Date();
    d.setHours(d.getHours() - 72);
    fromDate = d.toISOString().split("T")[0];
  }

  // Load project config
  const registryPath = path.resolve(__dirname, "../../projects.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = registry.projects[projectSlug];

  if (!project) {
    console.error(`Project "${projectSlug}" not found in projects.json`);
    process.exit(1);
  }

  if (!project.zernio) {
    console.error(`Project "${projectSlug}" has no Zernio configuration`);
    process.exit(1);
  }

  const apiKey = process.env[project.zernio.api_key_env || "ZERNIO_API_KEY"];
  if (!apiKey) {
    console.error(`Missing env var: ${project.zernio.api_key_env || "ZERNIO_API_KEY"}`);
    process.exit(1);
  }

  // Use the workspace-level profile_id — the Zernio API requires this, not
  // per-channel account IDs (which return 403). The workspace profile aggregates
  // all connected accounts (TikTok, YouTube, Instagram) in a single response.
  const profiles = [];
  if (project.zernio.profile_id) {
    profiles.push({
      profileId: project.zernio.profile_id,
      name: project.name,
    });
  }

  console.log(`Pulling analytics for ${projectSlug} (${profiles.length} profile(s))`);
  console.log(`Date range: ${fromDate} to ${toDate}`);

  const allPosts = [];
  for (const profile of profiles) {
    console.log(`  Fetching: ${profile.name} (${profile.profileId})...`);
    const posts = await pullAnalytics(profile.profileId, apiKey, fromDate, toDate);
    allPosts.push(...posts);
    console.log(`  → ${posts.length} posts`);
  }

  // Write output
  const today = new Date().toISOString().split("T")[0];
  const outDir = path.resolve(__dirname, `../data/${projectSlug}/${today}`);
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "raw-analytics.json");
  fs.writeFileSync(outPath, JSON.stringify({
    project: projectSlug,
    collectedAt: new Date().toISOString(),
    dateRange: { from: fromDate, to: toDate },
    profiles: profiles.map((p) => p.profileId),
    totalPosts: allPosts.length,
    posts: allPosts,
  }, null, 2));

  console.log(`\nWrote ${allPosts.length} posts to ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
