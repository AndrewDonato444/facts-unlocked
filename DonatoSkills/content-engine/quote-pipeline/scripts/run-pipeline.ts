/**
 * run-pipeline.ts — End-to-end quote pipeline orchestrator.
 *
 * Flow:
 *   1. Resolve target date + campaign slug
 *   2. Select unused quote (70/30 famous/original)
 *   3. Generate whimsical background image via Nano Banana
 *   4. Pick random audio track
 *   5. Render dynamic-duration MP4 via Remotion
 *   6. Upload MP4 to R2
 *   7. Schedule via Zernio (ONLY if LIVE=1 — fail-safe default is dry-run)
 *   8. Write campaign record
 *
 * ENV:
 *   LIVE=1                  REQUIRED to schedule via Zernio. Default is dry-run.
 *   TARGET_DATE=2026-04-25  override scheduling date (default: tomorrow).
 *   SKIP_RENDER=1           skip bg+render+upload (for testing non-render parts).
 *
 * Usage:
 *   # Dry-run (default — no Zernio scheduling):
 *   npx tsx scripts/run-pipeline.ts --project baby-facts-unlocked
 *   # Live (will actually post to TikTok/IG/YT):
 *   LIVE=1 npx tsx scripts/run-pipeline.ts --project baby-facts-unlocked
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";

// ── env loader — merges DonatoSkills/.env.local (Gemini, Zernio) and Facts-Unlocked/.env.local (R2) ──
const ENV_PATHS = [
  path.join(__dirname, "..", "..", "..", ".env.local"),           // DonatoSkills/.env.local
  path.join(__dirname, "..", "..", "..", "..", ".env.local"),     // Facts-Unlocked/.env.local
];
for (const envPath of ENV_PATHS) {
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

// ── args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string, fallback: string = ""): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const project = getArg("project", "baby-facts-unlocked");
// INVERTED: live scheduling requires explicit opt-in. Default is dry-run.
const LIVE = process.env.LIVE === "1";
const DRY_RUN = !LIVE;
const SKIP_RENDER = process.env.SKIP_RENDER === "1"; // for testing non-render parts

const TARGET_DATE =
  process.env.TARGET_DATE ||
  (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  })();

const POST_TIME = getArg("time", "14:00"); // 2pm ET slot

/**
 * Compute the America/New_York UTC offset for a given date.
 * Handles DST transitions automatically — returns "-04:00" during EDT
 * (March-November) and "-05:00" during EST (November-March).
 */
function getNewYorkOffset(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-05:00";
  return tz.replace("GMT", "") || "-05:00";
}

/**
 * Simple advisory file lock for used.md. Prevents two concurrent runs from
 * double-committing the same quote (the lock covers read-pick-commit window
 * in this orchestrator; the selector script is separately read-only).
 */
function withUsedMdLock<T>(lockPath: string, fn: () => T): T {
  const lockFile = `${lockPath}.lock`;
  const startedAt = Date.now();
  const MAX_WAIT_MS = 30_000;
  while (fs.existsSync(lockFile)) {
    const ageMs = Date.now() - startedAt;
    if (ageMs > MAX_WAIT_MS) {
      // Stale lock (likely from a crashed run) — break it.
      const stat = fs.statSync(lockFile);
      if (Date.now() - stat.mtimeMs > 60_000) {
        console.warn(`Breaking stale used.md lock (>60s old): ${lockFile}`);
        fs.unlinkSync(lockFile);
        break;
      }
      throw new Error(`used.md lock held for >30s: ${lockFile}`);
    }
    // Busy-wait with deterministic backoff
    const waitUntil = Date.now() + 200;
    while (Date.now() < waitUntil) {
      /* spin */
    }
  }
  fs.writeFileSync(lockFile, `${process.pid} ${new Date().toISOString()}\n`, {
    flag: "wx",
  });
  try {
    return fn();
  } finally {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  }
}

main().catch((err) => {
  console.error("PIPELINE_FAILED:", err);
  process.exit(1);
});

async function main() {

// ── projects.json ─────────────────────────────────────────
const projectsPath = path.join(__dirname, "..", "..", "..", "projects.json");
const projects = JSON.parse(fs.readFileSync(projectsPath, "utf8")).projects;
const projectConfig = projects[project];
if (!projectConfig) {
  console.error(`Unknown project: ${project}`);
  process.exit(1);
}
const accounts = Object.entries(projectConfig.zernio.accounts).map(
  ([platform, info]: [string, any]) => ({ platform, accountId: info.id })
);
const profileId = projectConfig.zernio.profile_id;

// ── paths ─────────────────────────────────────────────────
const PIPELINE_ROOT = path.join(__dirname, "..");
const CAMPAIGN_SLUG = `quotes-${TARGET_DATE}-${project}`;
const CAMPAIGN_DIR = path.join(
  PIPELINE_ROOT,
  "..",
  "calendars",
  CAMPAIGN_SLUG
);
// Remotion resolves staticFile() relative to <pipeline>/public by default.
// Use the pipeline root's public/ as the render staging area.
const PUBLIC_DIR = path.join(PIPELINE_ROOT, "public");
const OUT_DIR = path.join(CAMPAIGN_DIR, "out");
const CAMPAIGN_ASSETS_DIR = path.join(CAMPAIGN_DIR, "assets");
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(CAMPAIGN_ASSETS_DIR, { recursive: true });

console.log(`\n=== QUOTE PIPELINE ===`);
console.log(`Project: ${project}`);
console.log(`Target date: ${TARGET_DATE} ${POST_TIME} ET`);
console.log(`Campaign: ${CAMPAIGN_SLUG}`);
console.log(`Dry run: ${DRY_RUN ? "YES (no Zernio scheduling)" : "NO"}`);
console.log(`Output dir: ${CAMPAIGN_DIR}\n`);

// ── STEP 1: Select quote (dry — commit only after successful render) ──
console.log("[1/6] Selecting quote...");
const selectCmd = [
  "node",
  path.join(PIPELINE_ROOT, "scripts", "select-quote.js"),
  "--project",
  project,
];
const selectResult = spawnSync(selectCmd[0], selectCmd.slice(1), {
  encoding: "utf8",
});
if (selectResult.status !== 0) {
  console.error("Quote selection failed:");
  console.error(selectResult.stderr);
  process.exit(1);
}
const quote = JSON.parse(selectResult.stdout);
console.log(`  Selected ${quote.id}: "${quote.text.slice(0, 60)}..."`);
console.log(`  Attribution: ${quote.attribution} (${quote.type})`);
console.log(`  Theme: ${quote.theme}`);

// ── STEP 2: Pick audio track ──────────────────────────────
console.log("\n[2/6] Picking audio track...");
const AUDIO_DIR = path.join(
  PIPELINE_ROOT,
  "..",
  "quotes",
  project,
  "audio"
);
const audioFiles = fs
  .readdirSync(AUDIO_DIR)
  .filter((f) => /\.(mp3|wav|m4a)$/i.test(f));
if (audioFiles.length === 0) {
  console.error(`No audio tracks in ${AUDIO_DIR}`);
  process.exit(1);
}
const audioFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
const audioSrc = path.join(AUDIO_DIR, audioFile);
fs.copyFileSync(audioSrc, path.join(PUBLIC_DIR, "audio.mp3"));
console.log(`  Chose: ${audioFile}`);

// ── STEP 3: Generate background ───────────────────────────
console.log("\n[3/6] Generating whimsical background...");
if (SKIP_RENDER) {
  console.log("  SKIP_RENDER=1 — skipping bg generation");
} else {
  const bgCmd = [
    "npx",
    "tsx",
    path.join(PIPELINE_ROOT, "scripts", "generate-bg.ts"),
    "--theme",
    quote.theme,
    "--out",
    PUBLIC_DIR,
  ];
  const bgResult = spawnSync(bgCmd[0], bgCmd.slice(1), {
    encoding: "utf8",
    stdio: "inherit",
    cwd: PIPELINE_ROOT,
  });
  if (bgResult.status !== 0) {
    console.error("Background generation failed");
    process.exit(1);
  }
}

// ── STEP 4: Render Remotion video ────────────────────────
console.log("\n[4/6] Rendering faux-video via Remotion...");
const outputVideo = path.join(OUT_DIR, "video.mp4");
if (SKIP_RENDER) {
  console.log("  SKIP_RENDER=1 — skipping render");
} else {
  // Remotion needs absolute paths to find public/ relative to the bundle.
  // We use a per-campaign public/ so we symlink it into the pipeline root temporarily,
  // or better: pass the public dir via --public-dir flag.
  const renderCmd = [
    "npx",
    "remotion",
    "render",
    path.join(PIPELINE_ROOT, "src", "index.ts"),
    "QuoteCard",
    outputVideo,
    `--props=${JSON.stringify({
      quoteText: quote.text,
      attribution: quote.attribution,
      backgroundFile: "background.png",
      audioFile: "audio.mp3",
    })}`,
  ];
  const renderResult = spawnSync(renderCmd[0], renderCmd.slice(1), {
    encoding: "utf8",
    stdio: "inherit",
    cwd: PIPELINE_ROOT,
  });
  if (renderResult.status !== 0) {
    console.error("Remotion render failed");
    process.exit(1);
  }
}

if (!SKIP_RENDER && !fs.existsSync(outputVideo)) {
  console.error(`Expected output not found: ${outputVideo}`);
  process.exit(1);
}

// Archive the exact bg + audio used for this render to the campaign dir
if (!SKIP_RENDER) {
  fs.copyFileSync(
    path.join(PUBLIC_DIR, "background.png"),
    path.join(CAMPAIGN_ASSETS_DIR, "background.png")
  );
  fs.copyFileSync(
    path.join(PUBLIC_DIR, "audio.mp3"),
    path.join(CAMPAIGN_ASSETS_DIR, "audio.mp3")
  );
}

// Render succeeded — NOW commit the quote to used.md (locked to prevent
// race with concurrent runs). Stamp with TARGET_DATE, not today.
const usedPath = path.join(PIPELINE_ROOT, "..", "quotes", project, "used.md");
withUsedMdLock(usedPath, () => {
  fs.appendFileSync(
    usedPath,
    `${quote.id} | ${TARGET_DATE} | ${accounts
      .map((a) => a.platform)
      .join(",")} | ${CAMPAIGN_SLUG}\n`
  );
});
console.log(`  Committed ${quote.id} to used.md (target date ${TARGET_DATE})`);

// ── STEP 5: Upload to R2 ─────────────────────────────────
console.log("\n[5/6] Uploading to R2...");
const {
  uploadToR2,
  loadR2ConfigFromEnv,
  buildObjectKey,
} = require(path.join(
  PIPELINE_ROOT,
  "..",
  "scripts",
  "r2-upload.js"
));
const r2Config = loadR2ConfigFromEnv();
const objectKey = buildObjectKey({
  campaignSlug: CAMPAIGN_SLUG,
  itemId: `quote-${quote.id}`,
  extension: "mp4",
});
let r2PublicUrl = "";
if (SKIP_RENDER) {
  console.log("  SKIP_RENDER=1 — skipping upload");
} else {
  if (!r2Config.publicUrl) {
    console.error(
      "R2 config missing. Expected R2_PUBLIC_URL and friends in env. " +
        "Check Facts-Unlocked/.env.local."
    );
    process.exit(1);
  }
  await uploadToR2({
    filePath: outputVideo,
    objectKey,
    config: r2Config,
  });
  r2PublicUrl = `${r2Config.publicUrl.replace(/\/$/, "")}/${objectKey}`;
  console.log(`  R2 URL: ${r2PublicUrl}`);
}

// ── STEP 6: Schedule via Zernio (unless dry-run) ─────────
console.log(`\n[6/6] ${DRY_RUN ? "DRY RUN — skipping" : "Scheduling via"} Zernio...`);
const caption = buildCaption(quote, project);
let zernioPostIds: string[] = [];

if (!DRY_RUN && !SKIP_RENDER) {
  const nyOffset = getNewYorkOffset(TARGET_DATE);
  const scheduledAt = `${TARGET_DATE}T${POST_TIME}:00${nyOffset}`;
  console.log(`  Scheduling for ${scheduledAt} (DST-aware NY offset)`);
  const results = await Promise.allSettled(
    accounts.map((account) =>
      zernioSchedule({
        mediaUrl: r2PublicUrl,
        caption,
        account,
        scheduledAt,
        profileId,
      }).then((postId) => ({ account, postId }))
    )
  );
  for (const r of results) {
    if (r.status === "fulfilled") {
      zernioPostIds.push(r.value.postId);
      console.log(`  ${r.value.account.platform}: ${r.value.postId}`);
    } else {
      // Scrub any bearer-token leakage from error messages
      const safeErr = String(r.reason).replace(/Bearer [A-Za-z0-9_\-.]+/g, "Bearer <redacted>");
      console.error(`  platform FAILED: ${safeErr}`);
    }
  }
}

// ── Write campaign record ─────────────────────────────────
const record = {
  campaign: CAMPAIGN_SLUG,
  project,
  target_date: TARGET_DATE,
  target_time: POST_TIME,
  timezone: "America/New_York",
  dry_run: DRY_RUN,
  quote,
  audio: audioFile,
  caption,
  r2_url: r2PublicUrl,
  zernio_post_ids: zernioPostIds,
  status: DRY_RUN
    ? "dry-run-ready"
    : zernioPostIds.length === accounts.length
    ? "scheduled"
    : zernioPostIds.length > 0
    ? "partial-scheduled"
    : "unscheduled",
  created_at: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(CAMPAIGN_DIR, "record.json"),
  JSON.stringify(record, null, 2)
);

console.log(`\n=== PIPELINE COMPLETE ===`);
console.log(`Status: ${record.status}`);
console.log(`Record: ${path.join(CAMPAIGN_DIR, "record.json")}`);

} // end main()

// ─────────────────────────────────────────────────────────

function buildCaption(
  q: { text: string; attribution: string },
  projectSlug: string
): string {
  const hashtags =
    projectSlug === "baby-facts-unlocked"
      ? "#babyfacts #motherhood #momlife #newbornlove #motherandbaby #babylove #parenting"
      : "";
  const attrLine = q.attribution.includes("Baby Facts")
    ? ""
    : `\n— ${q.attribution}`;
  return `"${q.text}"${attrLine}\n\n${hashtags}`.trim();
}

async function zernioSchedule({
  mediaUrl,
  caption,
  account,
  scheduledAt,
  profileId,
}: {
  mediaUrl: string;
  caption: string;
  account: { platform: string; accountId: string };
  scheduledAt: string;
  profileId: string;
}): Promise<string> {
  const body = JSON.stringify({
    content: caption,
    platforms: [account],
    scheduledFor: scheduledAt,
    timezone: "America/New_York",
    mediaItems: [{ url: mediaUrl, type: "video" }],
    profileId,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "zernio.com",
        path: "/api/v1/posts",
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const id =
              json.post?._id ||
              json.id ||
              json.post_id ||
              json._id ||
              json.data?.id;
            if (id) resolve(id);
            else reject(new Error(`Zernio response: ${data}`));
          } catch {
            reject(new Error(`Zernio parse error: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
