#!/usr/bin/env node
// Schedule 2026-04-25 pipeline → publish 2026-04-26
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const ENV_PATH = path.resolve(__dirname, "../../../.env.local");
for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
if (!ZERNIO_API_KEY) throw new Error("ZERNIO_API_KEY not set");

const PROFILE_IDS = {
  "baby-facts-unlocked":  "69b8912784a675ce87f20d3b",
  "money-facts-unlocked": "69b95c8c17376a13852d91f7",
  "ai-facts-unlocked":    "69bad5297367e1517f143cd4",
};

const ACCOUNTS = {
  "baby-facts-unlocked": [
    { platform: "tiktok",    accountId: "69b891386cb7b8cf4c78c31d" },
    { platform: "youtube",   accountId: "69b8af216cb7b8cf4c791725" },
    { platform: "instagram", accountId: "69b994a46cb7b8cf4c7baa8e" },
  ],
  "money-facts-unlocked": [
    { platform: "youtube",   accountId: "69b95c996cb7b8cf4c7ae4ab" },
    { platform: "instagram", accountId: "69b995666cb7b8cf4c7bad79" },
  ],
  "ai-facts-unlocked": [
    { platform: "youtube",   accountId: "69bad5396cb7b8cf4c7f69ba" },
    { platform: "instagram", accountId: "69bad5bc6cb7b8cf4c7f6cd6" },
  ],
};

const R2_BASE = "https://pub-9091f45972da4cac95452db5b3836336.r2.dev/content-engine/facts-2026-04-25";

const ITEMS = [
  {
    id: "001-baby-sleep-spindles",
    brand: "baby-facts-unlocked",
    scheduleUtc: "2026-04-26T13:00:00.000Z",
    caption: "SLEEP IS HOW BABIES LEARN 🧠\n\nBabies develop sleep spindles by 6 months — the same brain waves adults use to consolidate memories.\n\n#babyfacts #babydevelopment #newborn #parenting #didyouknow #babybraindev",
  },
  {
    id: "002-baby-lip-blister",
    brand: "baby-facts-unlocked",
    scheduleUtc: "2026-04-26T23:00:00.000Z",
    caption: "THAT LIP BLISTER IS GOOD NEWS 👶\n\nIt's called a sucking callus — it means your baby is latching well. It's completely harmless and disappears on its own.\n\n#babyfacts #newborn #parenting #breastfeeding #didyouknow #babytips",
  },
  {
    id: "004-money-tax-brackets-myth",
    brand: "money-facts-unlocked",
    scheduleUtc: "2026-04-26T13:00:00.000Z",
    caption: "Earning more doesn't mean you're in a \"higher bracket\" on ALL your income 💰\n\nThe tax bracket myth debunked — marginal rates only apply to each dollar above the threshold.\n\n#moneyfacts #taxes #taxbrackets #personalfinance #didyouknow #financetips",
  },
  {
    id: "005-money-bank-float",
    brand: "money-facts-unlocked",
    scheduleUtc: "2026-04-26T18:00:00.000Z",
    caption: "Banks made BILLIONS from your money while checks were \"clearing\" ⏳\n\nBank float was the gap between deposit and availability — and the banks collected interest the whole time.\n\n#moneyfacts #banking #personalfinance #didyouknow #bankingsecrets",
  },
  {
    id: "006-money-credit-expiration",
    brand: "money-facts-unlocked",
    scheduleUtc: "2026-04-26T23:00:00.000Z",
    caption: "Bad credit doesn't last forever ⚠️\n\nNegative items on your credit report expire after 7 years — your financial past has an expiration date.\n\n#moneyfacts #creditscore #personalfinance #didyouknow #creditrepair",
  },
  {
    id: "007-ai-radiation-therapy",
    brand: "ai-facts-unlocked",
    scheduleUtc: "2026-04-26T13:00:00.000Z",
    caption: "AI MATCHES RADIATION EXPERTS IN MINUTES 🎯\n\n99.8% precision — AI plans radiation therapy as accurately as specialist oncologists in a fraction of the time.\n\n#aifacts #artificialintelligence #cancer #medtech #healthtech #didyouknow",
  },
  {
    id: "008-ai-math-olympiad",
    brand: "ai-facts-unlocked",
    scheduleUtc: "2026-04-26T18:00:00.000Z",
    caption: "AI JUST WON THE MATH OLYMPICS 🏆\n\nGold medal performance. AI scored 35/42 on the International Mathematical Olympiad — beating most human competitors.\n\n#aifacts #artificialintelligence #math #olympiad #didyouknow #AIbreakthrough",
  },
  {
    id: "009-ai-traffic-lights",
    brand: "ai-facts-unlocked",
    scheduleUtc: "2026-04-26T23:00:00.000Z",
    caption: "AI CUT COMMUTE TIMES 26% 🚦\n\nPittsburgh's Surtrac AI traffic system reduced commute times by 26% and cut stops by 40%. A century of dumb traffic lights — just changed.\n\n#aifacts #artificialintelligence #traffic #smartcity #transportation #didyouknow",
  },
];

function post(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "zernio.com",
        path: "/api/v1/posts",
        method: "POST",
        headers: {
          Authorization: `Bearer ${ZERNIO_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, json });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

const CALENDAR_PATH = path.join(__dirname, "calendar.json");
const calendar = JSON.parse(fs.readFileSync(CALENDAR_PATH, "utf8"));

async function main() {
  let ok = 0;
  let fail = 0;

  for (const item of ITEMS) {
    const calItem = calendar.items.find((i) => i.id === item.id);
    if (calItem?.status === "scheduled") {
      console.log(`[${item.id}] Already scheduled — skipping`);
      ok++;
      continue;
    }

    const videoUrl = `${R2_BASE}/${item.id}.mp4`;
    const accounts = ACCOUNTS[item.brand];
    const profileId = PROFILE_IDS[item.brand];

    console.log(`\n[${item.id}] Scheduling for ${item.scheduleUtc}`);
    console.log(`  Video: ${videoUrl}`);
    console.log(`  Platforms: ${accounts.map((a) => a.platform).join(", ")}`);

    const result = await post({
      content: item.caption,
      platforms: accounts,
      scheduledFor: item.scheduleUtc,
      timezone: "America/New_York",
      mediaItems: [{ url: videoUrl, type: "video" }],
      profileId,
    });

    const postId =
      result.json?.post?._id ||
      result.json?.id ||
      result.json?._id ||
      result.json?.data?.id ||
      null;

    if (result.status >= 200 && result.status < 300 && postId) {
      console.log(`  ✓ Post ID: ${postId}`);
      ok++;
      if (calItem) {
        calItem.status = "scheduled";
        calItem.asset_url = videoUrl;
        calItem.post_ids = { zernio: postId };
      }
    } else {
      console.error(`  ✗ HTTP ${result.status}:`, JSON.stringify(result.json || result.raw));
      fail++;
      if (calItem) {
        calItem.status = "failed";
        calItem.error = JSON.stringify(result.json || result.raw);
      }
    }

    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(calendar, null, 2));
  }

  console.log(`\n=== DONE: ${ok} scheduled, ${fail} failed ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
