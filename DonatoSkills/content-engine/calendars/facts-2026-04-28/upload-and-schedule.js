/**
 * Upload all 7 videos to R2 and schedule via Zernio
 */
const path = require("path");
const { uploadToR2, loadR2ConfigFromEnv } = require("../../scripts/r2-upload.js");

const ZERNIO_KEY = "sk_40c592b6f20a37deb4f56fc0e563b1ad6a4b1938dda1f52cb6b52d38d4864903";
const CAMPAIGN_SLUG = "facts-2026-04-28";
const BASE = path.join(__dirname, "videos");

const videos = [
  {
    slug: "052-tax-loss-harvesting",
    compositionId: "TaxLossHarvesting",
    schedule: "2026-04-29T13:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69b95c996cb7b8cf4c7ae4ab" },
      { platform: "instagram", accountId: "69b995666cb7b8cf4c7bad79" },
    ],
    captions: {
      "69b95c996cb7b8cf4c7ae4ab": "The IRS lets you deduct investment losses to offset gains — tax-loss harvesting is legal, documented, and most investors never use it. Watch-sale rule is the only trap. #moneyfacts #investing #taxes #wealthbuilding #personalfinance",
      "69b995666cb7b8cf4c7bad79": "The IRS has a rule that lets you sell losing investments to cut your tax bill 💰\n\nTax-loss harvesting:\n→ Sell investment at a loss\n→ Loss offsets your capital gains for the year\n→ Pay tax only on the net gain\n→ Watch-sale rule: don't rebuy the same asset within 30 days\n→ Fix: buy a similar (not identical) ETF to maintain exposure\n\nHigh earners in the 20% bracket can save thousands per year doing this systematically.\n\n#moneyfacts #investing #taxlossharvesting #capitalgains #personalfinance #wealthbuilding #financetips #taxstrategy #moneymindset",
    },
  },
  {
    slug: "053-income-timing-tax",
    compositionId: "IncomeTaxCap",
    schedule: "2026-04-29T18:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69b95c996cb7b8cf4c7ae4ab" },
      { platform: "instagram", accountId: "69b995666cb7b8cf4c7bad79" },
    ],
    captions: {
      "69b95c996cb7b8cf4c7ae4ab": "FICA payroll tax (Social Security 6.2%) has a wage cap at $168,600 in 2024. High earners stop paying Social Security tax partway through the year — creating a lower effective payroll rate for the wealthy. #moneyfacts #taxes #paycheck #personalfinance",
      "69b995666cb7b8cf4c7bad79": "There's a payroll tax that stops when you earn enough — and most people have no idea 📊\n\nFICA wage base cap explained:\n→ Social Security tax: 6.2% on every paycheck\n→ Cap in 2024: $168,600\n→ Above that number? Social Security tax stops entirely\n→ Medicare 1.45% continues (no cap)\n→ Earner at $300K: stops paying SS tax around September\n→ Earner at $60K: pays it all year\n\nThis is why high earners have a lower effective payroll tax rate than middle-income workers.\n\n#moneyfacts #fica #payrolltax #socialsecurity #personalfinance #wealthbuilding #financetips #taxfacts",
    },
  },
  {
    slug: "054-car-depreciation-clock",
    compositionId: "CarDepreciation",
    schedule: "2026-04-29T23:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69b95c996cb7b8cf4c7ae4ab" },
      { platform: "instagram", accountId: "69b995666cb7b8cf4c7bad79" },
    ],
    captions: {
      "69b95c996cb7b8cf4c7ae4ab": "New cars lose 20% of value in year 1 and 50-60% by year 5. Certified pre-owned 12-24 months old = someone else absorbed the worst depreciation. #moneyfacts #cars #depreciation #personalfinance #wealthbuilding",
      "69b995666cb7b8cf4c7bad79": "Every new car purchase starts losing money immediately 🚗\n\nThe depreciation reality:\n→ Year 1 loss: ~20% of purchase price\n→ Year 5 loss: 50-60% of purchase price\n→ A $40K car is worth ~$32K after year one\n→ Worth ~$16K by year five\n→ Most of it happens when you register it as 'used'\n\nThe highest-value car buy: certified pre-owned, 12-24 months old. Someone else took the steepest hit. You get the same car at a fraction of the price.\n\n#moneyfacts #cars #depreciation #smartmoney #personalfinance #financetips #wealthbuilding #carsofinstagram #usedcar",
    },
  },
  {
    slug: "042-ai-drug-discovery-speed",
    compositionId: "AiDrugDiscovery",
    schedule: "2026-04-29T13:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69bad5396cb7b8cf4c7f69ba" },
      { platform: "instagram", accountId: "69bad5bc6cb7b8cf4c7f6cd6" },
    ],
    captions: {
      "69bad5396cb7b8cf4c7f69ba": "Insilico Medicine's AI designed a drug candidate for pulmonary fibrosis in 46 days. Traditional discovery: 4-6 years, $2B. Phase 2 human trials began 2023. #aifacts #ai #drugdiscovery #medicine #futuretech",
      "69bad5bc6cb7b8cf4c7f6cd6": "AI found a new drug candidate in 46 days 🔬\n\nInsilico Medicine (2019):\n→ Disease: idiopathic pulmonary fibrosis — fatal lung disease, no cure\n→ Traditional timeline: 4-6 years just to reach trials\n→ Traditional cost: $2B per drug developed\n→ AI result: target identified + candidate designed in 46 days\n→ Entered Phase 2 human clinical trials in 2023\n\nThe discovery bottleneck — the part that used to take years — is already being compressed by AI.\n\n#aifacts #artificialintelligence #drugdiscovery #medicine #pharma #futureofmedicine #deeplearning #biotechnology",
    },
  },
  {
    slug: "043-ai-personal-data-inference",
    compositionId: "AiDataInference",
    schedule: "2026-04-29T18:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69bad5396cb7b8cf4c7f69ba" },
      { platform: "instagram", accountId: "69bad5bc6cb7b8cf4c7f6cd6" },
    ],
    captions: {
      "69bad5396cb7b8cf4c7f69ba": "Cambridge 2013 study: 68 Facebook likes → AI predicts your personality better than colleagues. 300 likes → better than spouse. 95% accuracy on ethnicity, 85% political affiliation. This is what Cambridge Analytica built on. #aifacts #ai #privacy #data #cambridge",
      "69bad5bc6cb7b8cf4c7f6cd6": "AI knows who you are from your Facebook likes — and you never told it anything 🕵️\n\nCambridge University 2013:\n→ 68 likes → predicts personality better than work colleagues\n→ 150 likes → better than your parents\n→ 300 likes → better than your spouse\n→ Ethnicity: 95% accuracy\n→ Political affiliation: 85%\n→ Sexual orientation: 88%\n→ Relationship status: 70%\n\nThe likes weren't obviously related to the traits. Behavioral patterns cluster at scale in ways only AI can see.\n\nThis is what Cambridge Analytica scaled.\n\n#aifacts #artificialintelligence #privacy #data #digitalfootprint #surveillance #cambridgeanalytica #machinelearning",
    },
  },
  {
    slug: "044-ai-generates-fake-video-calls",
    compositionId: "AiDeepfakeCall",
    schedule: "2026-04-29T23:00:00Z",
    platforms: [
      { platform: "youtube", accountId: "69bad5396cb7b8cf4c7f69ba" },
      { platform: "instagram", accountId: "69bad5bc6cb7b8cf4c7f6cd6" },
    ],
    captions: {
      "69bad5396cb7b8cf4c7f69ba": "Arup engineering firm lost $25.6M to a deepfake video call in 2024. Real-time face-swapping runs under 17ms latency. Detection AI lags generation by 6-12 months. #aifacts #ai #deepfake #scam #cybersecurity",
      "69bad5bc6cb7b8cf4c7f6cd6": "A company lost $25 million on a single video call — and the CFO wasn't real 💀\n\nArup (2024):\n→ Finance employee joins video call with 'CFO' + colleagues\n→ Everyone on screen: AI deepfake\n→ $25.6M transferred\n→ Reported after suspicious — money gone\n\nThe technology:\n→ Real-time face-swap: <17ms latency\n→ Fast enough for live video calls — no visible lag\n→ Detection AI lags generation by 6-12 months\n→ New generations have a window of undetectability\n\n#aifacts #artificialintelligence #deepfake #cybersecurity #scam #fraud #digitalsecurity #aithreats",
    },
  },
  {
    slug: "058-baby-color-vision",
    compositionId: "BabyColorVision",
    schedule: "2026-04-30T23:00:00Z",
    platforms: [
      { platform: "tiktok", accountId: "69b891386cb7b8cf4c78c31d" },
      { platform: "youtube", accountId: "69b8af216cb7b8cf4c791725" },
      { platform: "instagram", accountId: "69b994a46cb7b8cf4c7baa8e" },
    ],
    captions: {
      "69b891386cb7b8cf4c78c31d": "Your newborn sees black and white for the first 3-4 months — color vision develops gradually, starting with red and green 👶🤍🖤 #babyfacts #newborn #babyeyes #motherhood #parenting #didyouknow",
      "69b8af216cb7b8cf4c791725": "Newborns see only black, white, and gray at birth. Color vision develops at 3-4 months (red/green first, blue at 4-5 months). By 5-6 months: near-adult color vision. This is why high-contrast toys captivate newborns. #babyfacts #newborn #babydevelopment #parentingtips",
      "69b994a46cb7b8cf4c7baa8e": "Your newborn's world is in black and white for the first few months 🤍🖤👶\n\nBaby color vision timeline:\n→ Birth: only high-contrast black, white, and gray\n→ 3-4 months: red and green cones wire up\n→ 4-5 months: blue cone pathways activate\n→ 5-6 months: near-adult color vision\n\nHigh-contrast black & white toys hold attention longer early on — the visual cortex isn't ready for color yet, just building the wiring.\n\n#babyfacts #newborn #babydevelopment #babyvision #infantdevelopment #momlife #parentingtips #newbornfacts #baby",
    },
  },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scheduleWithZernio(video, r2Url) {
  const customContent = {};
  for (const p of video.platforms) {
    if (video.captions[p.accountId]) {
      customContent[p.accountId] = { content: video.captions[p.accountId] };
    }
  }

  const body = {
    content: video.captions[video.platforms[0].accountId] || "",
    platforms: video.platforms,
    customContent,
    scheduledFor: video.schedule,
    timezone: "America/New_York",
    mediaItems: [{ url: r2Url, type: "video" }],
  };

  const resp = await fetch("https://zernio.com/api/v1/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ZERNIO_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return { success: false, error: `HTTP ${resp.status}: ${text}` };
  }

  let data;
  try { data = JSON.parse(text); } catch { data = { rawText: text }; }
  return { success: true, data };
}

async function main() {
  const r2Config = loadR2ConfigFromEnv();
  const results = [];

  for (const video of videos) {
    console.log(`\n=== Processing ${video.slug} ===`);

    // Upload to R2
    const filePath = path.join(BASE, video.slug, "out", "video.mp4");
    const objectKey = `content-engine/${CAMPAIGN_SLUG}/${video.slug}.mp4`;
    const r2Url = `${r2Config.publicUrl.replace(/\/+$/, "")}/${objectKey}`;

    console.log(`  Uploading to R2: ${objectKey}`);
    const uploadResult = uploadToR2({ filePath, objectKey, config: r2Config, retries: 1 });

    if (!uploadResult.success) {
      console.error(`  R2 upload FAILED: ${uploadResult.error}`);
      results.push({ slug: video.slug, status: "failed", error: uploadResult.error, r2_url: null, zernio_post_id: null });
      continue;
    }
    console.log(`  Uploaded: ${r2Url}`);

    // Schedule via Zernio
    console.log(`  Scheduling via Zernio for ${video.schedule}...`);
    const schedResult = await scheduleWithZernio(video, r2Url);

    if (!schedResult.success) {
      console.error(`  Zernio schedule FAILED: ${schedResult.error}`);
      results.push({ slug: video.slug, status: "uploaded_not_scheduled", r2_url: r2Url, zernio_post_id: null, error: schedResult.error });
    } else {
      const postId = schedResult.data?.id || schedResult.data?._id || schedResult.data?.postId || JSON.stringify(schedResult.data).slice(0, 80);
      console.log(`  Scheduled! Post ID: ${postId}`);
      results.push({ slug: video.slug, status: "live", r2_url: r2Url, zernio_post_id: postId, schedule: video.schedule });
    }

    await sleep(500);
  }

  // Write calendar.json
  const calendarPath = path.join(__dirname, "calendar.json");
  const calendar = {
    campaign: CAMPAIGN_SLUG,
    created: new Date().toISOString(),
    items: results,
  };
  require("fs").writeFileSync(calendarPath, JSON.stringify(calendar, null, 2));
  console.log(`\nCalendar written to: ${calendarPath}`);

  const success = results.filter((r) => r.status === "live").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`\nSummary: ${success}/${videos.length} videos live, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
