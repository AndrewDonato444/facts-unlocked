#!/usr/bin/env bash
# Schedule all facts-2026-04-27 posts via Zernio
set -euo pipefail

set -a
source /Users/andrewsrobotmachine/Facts-Unlocked/.env.local 2>/dev/null || true
source /Users/andrewsrobotmachine/Facts-Unlocked/DonatoSkills/.env.local 2>/dev/null || true
set +a

API="https://zernio.com/api/v1/posts"
R2_BASE="https://pub-9091f45972da4cac95452db5b3836336.r2.dev/content-engine/facts-2026-04-27"

# Profile IDs
MONEY_PROFILE="69b95c8c17376a13852d91f7"
AI_PROFILE="69bad5297367e1517f143cd4"
BABY_PROFILE="69b8912784a675ce87f20d3b"

# Account IDs
MONEY_YT="69b95c996cb7b8cf4c7ae4ab"
MONEY_IG="69b995666cb7b8cf4c7bad79"
AI_YT="69bad5396cb7b8cf4c7f69ba"
AI_IG="69bad5bc6cb7b8cf4c7f6cd6"
BABY_TT="69b891386cb7b8cf4c78c31d"
BABY_YT="69b8af216cb7b8cf4c791725"
BABY_IG="69b994a46cb7b8cf4c7baa8e"

schedule_post() {
  local label="$1"
  local url="$2"
  local caption="$3"
  local platforms_json="$4"
  local scheduled_for="$5"
  local profile_id="$6"

  local body
  body=$(python3 -c "
import json, sys
print(json.dumps({
  'content': sys.argv[1],
  'platforms': json.loads(sys.argv[2]),
  'scheduledFor': sys.argv[3],
  'timezone': 'America/New_York',
  'mediaItems': [{'url': sys.argv[4], 'type': 'video'}],
  'profileId': sys.argv[5],
}))" "$caption" "$platforms_json" "$scheduled_for" "$url" "$profile_id")

  local response
  response=$(curl -s -X POST "$API" \
    -H "Authorization: Bearer $ZERNIO_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body")

  local post_id
  post_id=$(echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('post',{}).get('_id','ERROR'))" 2>/dev/null || echo "ERROR")

  echo "$label → $post_id"
  echo "$post_id"
}

echo "=== Scheduling facts-2026-04-27 (publish: 2026-04-28 & 2026-04-29) ==="
echo ""

# ── 2026-04-28 9am ET ─────────────────────────────────────────────────────────

echo "--- 2026-04-28 9am ET ---"

# 049 credit-score-ceiling → Money (YouTube + Instagram)
CAPTION_049="Your 810 credit score gets the exact same rate as 760. Above 760 = zero financial return. #moneyfacts #creditscore #personalfinance #moneytips #financialfreedom"
PLATS_MONEY='[{"platform":"youtube","accountId":"'"$MONEY_YT"'"},{"platform":"instagram","accountId":"'"$MONEY_IG"'"}]'
result=$(schedule_post "049-credit-score-ceiling" "$R2_BASE/049-credit-score-ceiling.mp4" "$CAPTION_049" "$PLATS_MONEY" "2026-04-28T09:00:00" "$MONEY_PROFILE")
POST_049=$(echo "$result" | tail -1)
echo "$result" | head -1

# 039 gnome-material-discovery → AI (YouTube + Instagram)
CAPTION_039="AI found 2.2 million new materials in months. All of human history found 100K in 50 years. #aifacts #artificialintelligence #deepmind #science #technology"
PLATS_AI='[{"platform":"youtube","accountId":"'"$AI_YT"'"},{"platform":"instagram","accountId":"'"$AI_IG"'"}]'
result=$(schedule_post "039-gnome-material-discovery" "$R2_BASE/039-gnome-material-discovery.mp4" "$CAPTION_039" "$PLATS_AI" "2026-04-28T09:00:00" "$AI_PROFILE")
POST_039=$(echo "$result" | tail -1)
echo "$result" | head -1

# ── 2026-04-28 2pm ET ─────────────────────────────────────────────────────────

echo ""
echo "--- 2026-04-28 2pm ET ---"

# 050 hysa-emergency-fund → Money (YouTube + Instagram)
CAPTION_050="If your emergency fund is in a checking account you're losing \$700/year. Same FDIC insurance, same-day access. 15-minute fix. #moneyfacts #emergencyfund #hysa #personalfinance #savemoney"
result=$(schedule_post "050-hysa-emergency-fund" "$R2_BASE/050-hysa-emergency-fund.mp4" "$CAPTION_050" "$PLATS_MONEY" "2026-04-28T14:00:00" "$MONEY_PROFILE")
POST_050=$(echo "$result" | tail -1)
echo "$result" | head -1

# 040 ai-lip-reading → AI (YouTube + Instagram)
CAPTION_040="AI reads lips from silent video at 3x the accuracy of trained human lip readers. Law enforcement is deploying this on CCTV footage right now. #aifacts #privacy #surveillance #artificialintelligence #tech"
result=$(schedule_post "040-ai-lip-reading" "$R2_BASE/040-ai-lip-reading.mp4" "$CAPTION_040" "$PLATS_AI" "2026-04-28T14:00:00" "$AI_PROFILE")
POST_040=$(echo "$result" | tail -1)
echo "$result" | head -1

# ── 2026-04-28 7pm ET ─────────────────────────────────────────────────────────

echo ""
echo "--- 2026-04-28 7pm ET ---"

# 051 poverty-premium → Money (YouTube + Instagram)
CAPTION_051="Being poor costs \$5,000 more per year than being rich. No bulk buying, check cashing fees, higher insurance, 400% APR payday loans. The system is designed that way. #moneyfacts #povertypremium #inequality #personalfinance #economics"
result=$(schedule_post "051-poverty-premium" "$R2_BASE/051-poverty-premium.mp4" "$CAPTION_051" "$PLATS_MONEY" "2026-04-28T19:00:00" "$MONEY_PROFILE")
POST_051=$(echo "$result" | tail -1)
echo "$result" | head -1

# 041 ai-hiring-invisible → AI (YouTube + Instagram)
CAPTION_041="78% of Fortune 500 companies use AI to screen your resume before any human sees it. Amazon's AI penalized women's resumes for 2 years — it learned bias from 10 years of male hiring. #aifacts #hiring #resumetips #artificialintelligence #jobsearch"
result=$(schedule_post "041-ai-hiring-invisible" "$R2_BASE/041-ai-hiring-invisible.mp4" "$CAPTION_041" "$PLATS_AI" "2026-04-28T19:00:00" "$AI_PROFILE")
POST_041=$(echo "$result" | tail -1)
echo "$result" | head -1

# ── 2026-04-29 9am ET ─────────────────────────────────────────────────────────

echo ""
echo "--- 2026-04-29 9am ET ---"

PLATS_BABY='[{"platform":"tiktok","accountId":"'"$BABY_TT"'"},{"platform":"youtube","accountId":"'"$BABY_YT"'"},{"platform":"instagram","accountId":"'"$BABY_IG"'"}]'

# 056 baby-beat-preference → Baby (TikTok + YouTube + Instagram)
CAPTION_056="Babies prefer music with a strong beat — and they start developing this preference in the womb. #babyfacts #pregnancy #infantdevelopment #newborn #parentingtips"
result=$(schedule_post "056-baby-beat-preference" "$R2_BASE/056-baby-beat-preference.mp4" "$CAPTION_056" "$PLATS_BABY" "2026-04-29T09:00:00" "$BABY_PROFILE")
POST_056=$(echo "$result" | tail -1)
echo "$result" | head -1

# ── 2026-04-29 7pm ET ─────────────────────────────────────────────────────────

echo ""
echo "--- 2026-04-29 7pm ET ---"

# 057 baby-fist-hunger → Baby (TikTok + YouTube + Instagram)
CAPTION_057="Your baby's clenched fists signal hunger — not anger. By the time they cry, they're already at late-stage hunger. #babyfacts #newborn #hungerycues #parentingtips #infantdevelopment"
result=$(schedule_post "057-baby-fist-hunger" "$R2_BASE/057-baby-fist-hunger.mp4" "$CAPTION_057" "$PLATS_BABY" "2026-04-29T19:00:00" "$BABY_PROFILE")
POST_057=$(echo "$result" | tail -1)
echo "$result" | head -1

echo ""
echo "=== All done ==="
echo "POST_049=$POST_049"
echo "POST_050=$POST_050"
echo "POST_051=$POST_051"
echo "POST_039=$POST_039"
echo "POST_040=$POST_040"
echo "POST_041=$POST_041"
echo "POST_056=$POST_056"
echo "POST_057=$POST_057"
