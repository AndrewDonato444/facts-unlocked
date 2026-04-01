════════════════════════════════════════════════════════
  FACTS UNLOCKED — DAILY BRIEFING
  2026-04-01  |  Morning Run
════════════════════════════════════════════════════════

TODAY'S CONTENT
───────────────────────
  Campaign: facts-unlocked-2026-04-01
  Mode: explore (brief-driven, week 2026-14)
  Brief source: analytics-loop/data/*/2026-03-31/briefs/all-briefs.json

  Baby Facts Unlocked (3 videos — TikTok, YouTube, Instagram)
  ─────────────────────────────────────────────────────────────
  09:00  rooting-reflex           stat_lead / 30s / fast / karaoke_highlight / gemini
         "Touch a newborn's cheek — watch what happens"
         Zernio: 69cce80a1a483174d7e21421

  14:00  newborn-temperature-regulation   did_you_know / 25s / moderate / key_words_only / openai
         "Newborns can't shiver — here's why"
         Zernio: 69cce812da7740dc3255a910

  19:00  colostrum-liquid-gold    most_people_dont_know / 35s / slow / full_captions / grok
         "First milk lasts only 72 hours"
         Zernio: 69cce8181a483174d7e21503

  Money Facts Unlocked (3 videos — TikTok, YouTube, Instagram)
  ─────────────────────────────────────────────────────────────
  09:00  rule-of-72               did_you_know / 30s / fast / karaoke / gemini
         "72 ÷ your rate = years to double"
         Zernio: 69cce81cda7740dc3255a9e4

  14:00  minimum-payment-trap     stat_lead / 30s / moderate / full_captions / openai
         "$5K credit card debt → $10K paid"
         Zernio: 69cce8221a483174d7e216a3

  19:00  tax-refund-overpaying    controversy / 30s / fast / karaoke_highlight / grok
         "Tax refunds are loans to the IRS"
         Zernio: 69cce82616f2f446658debe4

  AI Facts Unlocked (3 videos — YouTube, Instagram)
  ─────────────────────────────────────────────────────────────
  09:00  ai-no-persistent-memory  myth_bust / 30s / moderate / full_captions / gemini
         "ChatGPT forgets you every session"
         Zernio: 69cce83216f2f446658defb8

  14:00  llm-token-prediction     did_you_know / 35s / slow / key_words_only / abstract-animated
         "LLMs don't understand — they predict"
         Zernio: 69cce8361a483174d7e21fab

  19:00  ai-compute-doubling      stat_lead / 35s / fast / karaoke_highlight / grok
         "AI compute doubled every 6 months"
         Zernio: 69cce8381a483174d7e22011

COST PER VIDEO
──────────────────────
  TTS provider: Gemini (all 9 — ElevenLabs lacks text_to_speech scope, Grok TTS returns 403)
  Image gen: Gemini (3), OpenAI (3), Grok grok-imagine-image (3) — rotated for explore diversity
  Estimated cost per video: $0.08
  Total estimated cost: $0.72

COST SUMMARY
─────────────────────
  Gemini TTS (9 videos)                ~$0.18
  Image gen (Gemini/OpenAI/Grok)       ~$0.45
  Cloudinary upload (free tier)        $0.00
  ──────────────────────────────────────
  Total                                ~$0.63–$0.72

  Full cost log: DonatoSkills/cost-tracker/2026-04-01.json

PRODUCTION NOTES
─────────────────────
  → ElevenLabs API key (sk_5759...) lacks text_to_speech permission scope — all 9 videos used Gemini TTS (Kore) as fallback
  → Grok TTS returns 403 for current account tier — not usable
  → Video durations are audio-driven (longer than brief targets): range 42–59s vs 25-35s targets
    This is expected behavior — scripts at natural Gemini TTS pace run longer than estimate
    Consider shortening voiceover scripts in future briefs by ~30%
  → OpenAI image gen: 2 prompts blocked on video 002 (anatomical content) — successfully rephrased
  → All 9/9 videos uploaded to Cloudinary and scheduled via Zernio

SCHEDULE (America/New_York)
─────────────────────────────
  09:00 — Baby #052 rooting-reflex + Money #043 rule-of-72 + AI #033 ai-no-persistent-memory
  14:00 — Baby #053 temp-regulation + Money #044 min-payment + AI #034 llm-token-prediction
  19:00 — Baby #054 colostrum + Money #045 tax-refund + AI #035 ai-compute-doubling

════════════════════════════════════════════════════════
