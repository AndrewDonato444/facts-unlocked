import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as https from "node:https";

const ENV_PATH = path.join(__dirname, "../../../../DonatoSkills/.env.local");
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY!;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !ZERNIO_API_KEY) {
  throw new Error("Missing required env vars. Check DonatoSkills/.env.local");
}

const CALENDAR_PATH = path.join(__dirname, "calendar.json");
const VIDEOS_BASE = path.join(__dirname, "videos");

const VIDEO_DIRS: Record<string, string> = {
  "001": "001-amniotic-fluid-flavors",
  "002": "002-cord-clamping-timing",
  "003": "003-babinski-reflex",
  "004": "004-401k-accident",
  "005": "005-tax-bracket-myth",
  "006": "006-share-buybacks",
  "007": "007-ai-courtroom-fake-cases",
  "008": "008-ai-cost-compression",
  "009": "009-ai-energy-crisis",
};

const PROFILE_IDS: Record<string, string> = {
  "baby-facts-unlocked": "69b8912784a675ce87f20d3b",
  "money-facts-unlocked": "69b95c8c17376a13852d91f7",
  "ai-facts-unlocked": "69bad5297367e1517f143cd4",
};

const ACCOUNTS: Record<string, { platform: string; accountId: string }[]> = {
  "baby-facts-unlocked": [
    { platform: "tiktok", accountId: "69b891386cb7b8cf4c78c31d" },
    { platform: "youtube", accountId: "69b8af216cb7b8cf4c791725" },
    { platform: "instagram", accountId: "69b994a46cb7b8cf4c7baa8e" },
  ],
  "money-facts-unlocked": [
    { platform: "tiktok", accountId: "69b991446cb7b8cf4c7b9f76" },
    { platform: "youtube", accountId: "69b95c996cb7b8cf4c7ae4ab" },
    { platform: "instagram", accountId: "69b995666cb7b8cf4c7bad79" },
  ],
  "ai-facts-unlocked": [
    { platform: "youtube", accountId: "69bad5396cb7b8cf4c7f69ba" },
    { platform: "instagram", accountId: "69bad5bc6cb7b8cf4c7f6cd6" },
  ],
};

async function cloudinaryUpload(filePath: string, publicId: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha256")
    .update(paramsToSign + CLOUDINARY_API_SECRET)
    .digest("hex");

  const fileBuffer = fs.readFileSync(filePath);
  const boundary = `----CloudinaryBoundary${Date.now()}`;

  const parts: Buffer[] = [];
  const addField = (name: string, value: string) => {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  };
  addField("api_key", CLOUDINARY_API_KEY);
  addField("timestamp", timestamp);
  addField("signature", signature);
  addField("public_id", publicId);
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: video/mp4\r\n\r\n`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.cloudinary.com",
        path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.secure_url) resolve(json.secure_url);
            else reject(new Error(`Cloudinary error: ${data}`));
          } catch {
            reject(new Error(`Cloudinary parse error: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function zernioSchedule(
  videoUrl: string,
  caption: string,
  accounts: { platform: string; accountId: string }[],
  scheduledAt: string,
  profileId: string
): Promise<string> {
  const body = JSON.stringify({
    content: caption,
    platforms: accounts.map((a) => ({ platform: a.platform, accountId: a.accountId })),
    scheduledFor: scheduledAt,
    timezone: "America/New_York",
    mediaItems: [{ url: videoUrl, type: "video" }],
    profileId,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "zernio.com",
        path: "/api/v1/posts",
        method: "POST",
        headers: {
          Authorization: `Bearer ${ZERNIO_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.post?._id) resolve(json.post._id);
            else if (json.id || json.post_id || json._id) resolve(json.id || json.post_id || json._id);
            else if (json.data?.id) resolve(json.data.id);
            else reject(new Error(`Zernio error: ${data}`));
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

async function main() {
  const calendarDoc = JSON.parse(fs.readFileSync(CALENDAR_PATH, "utf8"));
  const items = calendarDoc.items as any[];

  let scheduled = 0;
  let failed = 0;
  const costItems: any[] = [];

  for (const item of items) {
    // Skip already scheduled items (resume support)
    if (item.status === "scheduled") {
      console.log(`[${item.id}] Already scheduled, skipping`);
      scheduled++;
      continue;
    }

    const dirName = VIDEO_DIRS[item.id];
    if (!dirName) {
      console.error(`[${item.id}] No video dir mapping, skipping`);
      failed++;
      continue;
    }

    const videoPath = path.join(VIDEOS_BASE, dirName, "out", "video.mp4");
    if (!fs.existsSync(videoPath)) {
      console.error(`[${item.id}] MISSING VIDEO: ${videoPath}`);
      item.status = "failed";
      item.error = "video.mp4 not found";
      failed++;
      fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));
      continue;
    }

    const accounts = ACCOUNTS[item.project] || [];
    const profileId = PROFILE_IDS[item.project] || "";
    const captions = item.captions || {};
    const caption = captions.instagram || captions.youtube || captions.tiktok || item.hook_text || "";
    const publicId = `facts-unlocked/2026-03-31/${item.id}-${item.slug}`;
    const scheduledAt = `${item.date}T${item.time}:00-04:00`;

    console.log(`\n[${item.id}] ${item.slug} (${item.project})`);
    console.log(`  Uploading ${videoPath}...`);

    item.status = "uploading";
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));

    let assetUrl: string;
    try {
      assetUrl = await cloudinaryUpload(videoPath, publicId);
      console.log(`  Cloudinary: ${assetUrl}`);
    } catch (err) {
      console.error(`  Upload failed: ${err}`);
      item.status = "failed";
      item.error = String(err);
      failed++;
      fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));
      continue;
    }

    item.status = "scheduling";
    item.asset_url = assetUrl;
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));

    console.log(`  Scheduling via Zernio at ${scheduledAt}...`);
    let postId: string;
    try {
      postId = await zernioSchedule(assetUrl, caption, accounts, scheduledAt, profileId);
      console.log(`  Zernio post ID: ${postId}`);
    } catch (err) {
      console.error(`  Scheduling failed: ${err}`);
      item.status = "failed";
      item.error = String(err);
      failed++;
      fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));
      continue;
    }

    item.status = "scheduled";
    item.asset_url = assetUrl;
    item.asset_path = `videos/${dirName}/out/video.mp4`;
    item.zernio_post_id = postId;
    item.scheduled_at = scheduledAt;
    item.error = null;
    scheduled++;

    costItems.push({
      id: item.id,
      slug: item.slug,
      tts_provider: item.tts_provider || "gemini",
      image_provider: item.image_gen_provider || "gemini",
      estimated_cost_usd: 0.08,
    });

    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));
    console.log(`  [${item.id}] Done`);
  }

  calendarDoc.stats = { total: items.length, scheduled, failed, skipped: 0 };
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendarDoc, null, 2));

  console.log(`\n=== UPLOAD & SCHEDULE COMPLETE ===`);
  console.log(`Scheduled: ${scheduled}/${items.length}`);
  if (failed > 0) console.log(`Failed: ${failed} (check calendar.json)`);

  // Write cost tracker
  const costTrackerDir = path.join(__dirname, "../../../../DonatoSkills/cost-tracker");
  if (!fs.existsSync(costTrackerDir)) fs.mkdirSync(costTrackerDir, { recursive: true });
  const costData = {
    date: "2026-03-31",
    campaign: "facts-unlocked-2026-03-31",
    items: costItems,
    total_estimated_usd: parseFloat((costItems.reduce((sum, i) => sum + i.estimated_cost_usd, 0)).toFixed(2)),
  };
  fs.writeFileSync(path.join(costTrackerDir, "2026-03-31.json"), JSON.stringify(costData, null, 2));
  console.log(`\nCost estimate: $${costData.total_estimated_usd} (logged to cost-tracker/2026-03-31.json)`);
}

main().catch(console.error);
