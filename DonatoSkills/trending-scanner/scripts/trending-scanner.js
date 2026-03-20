/**
 * Trending Scanner — Trending Topic Injection for Facts Unlocked Pipeline
 *
 * Injects trending topic signals into the daily content creation pipeline.
 * Two modes:
 *   - "supplementary" (themed channels): matches trends against content_pillars
 *   - "primary" (Viral Facts): all exploit slots are trend-sourced
 *
 * Pipeline position: between brief loading (Step 1) and script writing (Step 2)
 */

// ─────────────────────────────────────────────
// fetchTrendingTopics
// ─────────────────────────────────────────────

/**
 * Fetch trending topics from Scrapingdog Google Trends API.
 *
 * @param {Object} config - { geo, hours, language, min_volume }
 * @param {Function} apiFetch - Injectable fetch fn (for testing). Receives config, returns { trending_searches: [...] }
 * @returns {Array} Filtered trending topics: { title, volume, increase, related_terms }
 */
async function fetchTrendingTopics(config, apiFetch) {
  try {
    const data = await apiFetch(config);
    const searches = data.trending_searches || [];

    return searches
      .filter((t) => t.active !== false && t.search_volume >= config.min_volume)
      .map((t) => ({
        title: t.title,
        volume: t.search_volume,
        increase: t.increase_percentage,
        related_terms: t.trend_breakdown || [],
      }));
  } catch (err) {
    console.error(`[trending-scanner] API error: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// filterNoFlyList
// ─────────────────────────────────────────────

/**
 * Filter trends against a no-fly list of blocked categories/terms.
 *
 * @param {Array} trends - [{ title, volume, related_terms, ... }]
 * @param {Object} noFlyTerms - { category: [term1, term2, ...], ... }
 * @returns {{ passed: Array, filtered: Array }} - filtered includes { trend, reason, category }
 */
function filterNoFlyList(trends, noFlyTerms) {
  const passed = [];
  const filtered = [];

  for (const trend of trends) {
    const allText = [
      trend.title.toLowerCase(),
      ...(trend.related_terms || []).map((t) => t.toLowerCase()),
    ].join(" ");

    let blocked = false;
    for (const [category, terms] of Object.entries(noFlyTerms)) {
      for (const term of terms) {
        if (allText.includes(term.toLowerCase())) {
          filtered.push({
            trend,
            reason: `Matched no-fly: ${category} ("${term}")`,
            category,
          });
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    }

    if (!blocked) {
      passed.push(trend);
    }
  }

  return { passed, filtered };
}

// ─────────────────────────────────────────────
// scoreTrendForChannel
// ─────────────────────────────────────────────

/**
 * Score a trend against a themed channel's content pillars.
 *
 * Scoring:
 *   +10 — exact keyword match (trend title or breakdown term in pillars)
 *   +3  — volume > 500K
 *   +5  — volume > 1M (replaces +3)
 *   +3  — increase > 2000 (freshness)
 *
 * @param {Object} trend - { title, volume, increase, related_terms }
 * @param {Object} channel - channel config with defaults.content_pillars and trending config
 * @returns {number} score
 */
function scoreTrendForChannel(trend, channel) {
  const pillars = (channel.defaults?.content_pillars || []).map((p) =>
    p.toLowerCase()
  );
  let score = 0;

  // Exact keyword match: trend title or breakdown terms appear in pillars
  const trendTerms = [
    trend.title.toLowerCase(),
    ...(trend.related_terms || []).map((t) => t.toLowerCase()),
  ];

  for (const term of trendTerms) {
    for (const pillar of pillars) {
      // Check if the trend term contains the pillar or vice versa
      if (term.includes(pillar) || pillar.includes(term.replace(/\s+/g, "-"))) {
        score += 10;
        break;
      }
    }
    if (score >= 10) break; // Only count keyword match once
  }

  // Volume bonus
  if (trend.volume > 1000000) {
    score += 5;
  } else if (trend.volume > 500000) {
    score += 3;
  }

  // Freshness bonus
  if (trend.increase > 2000) {
    score += 3;
  }

  return score;
}

// ─────────────────────────────────────────────
// routeTrendsToChannels
// ─────────────────────────────────────────────

/**
 * Route trends to channels. Themed channels claim strong matches first,
 * Viral Facts gets everything else.
 *
 * @param {Array} trends - filtered trending topics
 * @param {Array} channels - channel configs from projects.json
 * @returns {{ channelMatches: { [slug]: { strong, moderate, primary } } }}
 */
function _hasKeywordMatch(trend, channel) {
  const pillars = (channel.defaults?.content_pillars || []).map((p) =>
    p.toLowerCase()
  );
  const trendTerms = [
    trend.title.toLowerCase(),
    ...(trend.related_terms || []).map((t) => t.toLowerCase()),
  ];

  for (const term of trendTerms) {
    for (const pillar of pillars) {
      if (term.includes(pillar) || pillar.includes(term.replace(/\s+/g, "-"))) {
        return true;
      }
    }
  }
  return false;
}

function routeTrendsToChannels(trends, channels) {
  const channelMatches = {};
  const claimedTrends = new Set();

  // Phase 1: Themed channels (supplementary) score and claim strong matches
  const supplementaryChannels = channels.filter(
    (c) => c.trending?.enabled && c.trending?.mode === "supplementary"
  );

  for (const channel of supplementaryChannels) {
    const strong = [];
    const moderate = [];
    const thresholds = channel.trending;

    for (const trend of trends) {
      const score = scoreTrendForChannel(trend, channel);
      const hasKeywordMatch = _hasKeywordMatch(trend, channel);

      // Strong match requires keyword relevance — volume/freshness alone isn't enough
      if (score >= (thresholds.strong_match_threshold || 8) && hasKeywordMatch) {
        strong.push({ trend, score, type: "strong" });
        claimedTrends.add(trend.title);
      } else if (score >= (thresholds.moderate_match_threshold || 5) && hasKeywordMatch) {
        moderate.push({ trend, score, type: "moderate" });
      }
    }

    // Only keep the highest-scoring strong match per channel
    strong.sort((a, b) => b.score - a.score);
    const topStrong = strong.length > 0 ? [strong[0]] : [];

    channelMatches[channel.slug] = { strong: topStrong, moderate };
  }

  // Phase 2: Primary channels (Viral Facts) get unclaimed trends
  const primaryChannels = channels.filter(
    (c) => c.trending?.enabled && c.trending?.mode === "primary"
  );

  for (const channel of primaryChannels) {
    const minVol = channel.trending.min_volume || 20000;
    const unclaimedAll = trends
      .filter((t) => !claimedTrends.has(t.title))
      .sort((a, b) => b.volume * b.increase - a.volume * a.increase);

    let unclaimed = unclaimedAll
      .filter((t) => t.volume >= minVol)
      .map((t) => ({ trend: t, type: "primary" }));

    // Fallback: if no trends meet threshold, use highest-volume unclaimed
    if (unclaimed.length === 0 && unclaimedAll.length > 0) {
      unclaimed = [{ trend: unclaimedAll[0], type: "primary" }];
    }

    channelMatches[channel.slug] = { primary: unclaimed };
  }

  return { channelMatches };
}

// ─────────────────────────────────────────────
// injectTrendIntoGuidance
// ─────────────────────────────────────────────

/**
 * Modify topic_guidance in briefs based on trend matches.
 *
 * @param {Array} briefs - array of brief objects (slot, type, topic_guidance, ...)
 * @param {Object|Array|null} match - single match (supplementary) or array of matches (primary), or null
 * @param {string} mode - "supplementary" or "primary"
 * @returns {Array} modified briefs (cloned)
 */
function injectTrendIntoGuidance(briefs, match, mode) {
  const result = briefs.map((b) => ({ ...b }));

  if (!match) return result;

  if (mode === "supplementary") {
    const exploitSlots = result.filter((b) => b.type === "exploit");
    const toneGuidance = match.context?.tone_signal
      ? `\n${buildToneGuidance(match.context.tone_signal)}`
      : "";

    if (match.type === "strong") {
      // Prepend to first exploit slot only
      if (exploitSlots.length > 0) {
        exploitSlots[0].topic_guidance =
          `TRENDING TOPIC: ${match.trend.title} is trending with ${match.trend.volume} searches. ` +
          `Prioritize a fact related to this topic. ` +
          `Context: ${match.context?.why_trending || "Currently trending."}` +
          toneGuidance +
          `\n\n${exploitSlots[0].topic_guidance}`;
      }
    } else if (match.type === "moderate") {
      // Append to all exploit slots
      for (const slot of exploitSlots) {
        slot.topic_guidance +=
          `\n\nTRENDING CONTEXT: ${match.trend.title} is moderately trending. ` +
          `If naturally relevant to your chosen fact, angle toward this topic. ` +
          `Do not force it.`;
      }
    }
  } else if (mode === "primary") {
    const matches = Array.isArray(match) ? match : [match];
    const exploitSlots = result.filter((b) => b.type === "exploit");

    for (let i = 0; i < exploitSlots.length && i < matches.length; i++) {
      const m = matches[i];
      const toneGuidance = m.context?.tone_signal
        ? `\n${buildToneGuidance(m.context.tone_signal)}`
        : "";

      exploitSlots[i].topic_guidance =
        `TRENDING TOPIC: ${m.trend.title} is trending with ${m.trend.volume} searches. ` +
        `Context: ${m.context?.why_trending || "Currently trending."}` +
        toneGuidance +
        `\nRelated terms: ${(m.trend.related_terms || []).join(", ")}. ` +
        `Create a facts video about this topic.`;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// enrichTrendContext
// ─────────────────────────────────────────────

/**
 * Perform a web search to understand WHY a topic is trending.
 *
 * @param {Object} trend - { title, related_terms }
 * @param {Function} searchFn - Injectable search fn. Returns { why_trending, event_type, tone_signal, safety_flag }
 * @returns {Object} enriched context
 */
async function enrichTrendContext(trend, searchFn) {
  return await searchFn(trend);
}

// ─────────────────────────────────────────────
// buildToneGuidance
// ─────────────────────────────────────────────

/**
 * Build tone guidance string from a tone signal.
 *
 * @param {string} tone - respectful | celebratory | playful | neutral | cautionary
 * @returns {string} guidance text
 */
function buildToneGuidance(tone) {
  const toneMap = {
    respectful:
      "TONE: respectful. Acknowledge the event. Frame facts as a tribute or legacy, " +
      "not as clickbait. Avoid exclamation marks and sensationalist hooks.",
    celebratory:
      "TONE: celebratory. Highlight the achievement. Use uplifting, positive framing.",
    playful:
      "TONE: playful. Lean into the fun. Hooks can be punchy and surprising.",
    neutral:
      "TONE: neutral. Straightforward facts. Let the information speak for itself.",
    cautionary:
      "TONE: cautionary. Handle with care. Present facts objectively without sensationalizing.",
  };

  return toneMap[tone] || toneMap.neutral;
}

// ─────────────────────────────────────────────
// factCheckScript
// ─────────────────────────────────────────────

/**
 * Run a fact-check gate on a trend-matched video script.
 *
 * @param {string} script - the video script to check
 * @param {Object} context - { why_trending, ... } from enrichment
 * @param {Object} config - { enabled, model }
 * @param {Function} checkerFn - Injectable checker. Returns { result: "PASS"|"FAIL", corrections, corrected_script }
 * @returns {{ passed, script, skipped?, fallback?, corrections? }}
 */
async function factCheckScript(script, context, config, checkerFn) {
  if (!config?.enabled) {
    return { passed: true, script, skipped: true };
  }

  // First check
  const firstResult = await checkerFn(script, context);
  if (firstResult.result === "PASS") {
    return { passed: true, script };
  }

  // Apply corrections and retry once
  const correctedScript = firstResult.corrected_script || script;
  const retryResult = await checkerFn(correctedScript, context);
  if (retryResult.result === "PASS") {
    return {
      passed: true,
      script: correctedScript,
      corrections: firstResult.corrections,
    };
  }

  // Failed after retry — fall back
  return {
    passed: false,
    fallback: true,
    script,
    corrections: [
      ...(firstResult.corrections || []),
      ...(retryResult.corrections || []),
    ],
  };
}

// ─────────────────────────────────────────────
// buildCalendarTag
// ─────────────────────────────────────────────

/**
 * Build a trend_match tag for calendar items.
 *
 * @param {Object|null} match - { trend: { title, volume }, score, type }
 * @returns {Object|null} tag or null
 */
function buildCalendarTag(match) {
  if (!match) return null;

  return {
    trend_title: match.trend.title,
    match_score: match.score,
    search_volume: match.trend.volume,
    match_type: match.type,
  };
}

// ─────────────────────────────────────────────
// applyRecencyPenalty
// ─────────────────────────────────────────────

/**
 * Apply a recency penalty to trends used recently.
 *
 * @param {Object} trend - { title, ... }
 * @param {Array} recentlyUsed - array of trend titles used recently
 * @returns {{ ...trend, penalty: number }}
 */
function applyRecencyPenalty(trend, recentlyUsed) {
  const wasUsed = recentlyUsed.some(
    (t) => t.toLowerCase() === trend.title.toLowerCase()
  );

  return {
    ...trend,
    penalty: wasUsed ? 5 : 0,
  };
}

// ─────────────────────────────────────────────
// detectPillarSpikes
// ─────────────────────────────────────────────

/**
 * Detect which of a channel's content pillars are currently spiking
 * using Scrapingdog Interest Over Time API.
 *
 * A spike = interest jumped from below 30 to above 70 in the past 48 hours.
 *
 * @param {Array} pillars - content pillar keywords
 * @param {Object} config - { geo }
 * @param {Function} apiFetch - Injectable fetch fn
 * @returns {Array} array of spiking pillar names
 */
async function detectPillarSpikes(pillars, config, apiFetch) {
  try {
    const data = await apiFetch({ pillars, ...config });
    const spikes = [];

    for (const series of data.interest_over_time || []) {
      const timeline = series.timeline_data || [];
      if (timeline.length < 2) continue;

      // Check if the early values were below 30 and recent values above 70
      const earlyValues = timeline.slice(0, Math.max(1, timeline.length - 2));
      const recentValues = timeline.slice(-2);

      const hadLowPeriod = earlyValues.some((d) => d.value < 30);
      const hasHighRecent = recentValues.some((d) => d.value > 70);

      if (hadLowPeriod && hasHighRecent) {
        spikes.push(series.keyword);
      }
    }

    return spikes;
  } catch (err) {
    console.error(`[trending-scanner] Pillar spike detection error: ${err.message}`);
    return [];
  }
}

module.exports = {
  fetchTrendingTopics,
  filterNoFlyList,
  scoreTrendForChannel,
  routeTrendsToChannels,
  injectTrendIntoGuidance,
  enrichTrendContext,
  buildToneGuidance,
  factCheckScript,
  buildCalendarTag,
  applyRecencyPenalty,
  detectPillarSpikes,
};
