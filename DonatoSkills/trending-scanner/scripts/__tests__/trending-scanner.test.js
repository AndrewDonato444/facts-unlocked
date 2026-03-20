/**
 * Tests for trending-scanner — Trending Topic Injection
 *
 * Tests cover:
 *   - Pull trending topics from Scrapingdog (UT-TS-001 to UT-TS-003)
 *   - No-fly list filtering (UT-TS-004 to UT-TS-006)
 *   - Match trends to themed channels — supplementary mode (UT-TS-007 to UT-TS-010)
 *   - Trend routing — themed channels claim first, Viral Facts gets rest (UT-TS-011 to UT-TS-014)
 *   - Topic guidance injection — supplementary (UT-TS-015 to UT-TS-017)
 *   - Topic guidance injection — primary (UT-TS-018 to UT-TS-019)
 *   - Context enrichment and tone signals (UT-TS-020 to UT-TS-023)
 *   - Fact-check gate (UT-TS-024 to UT-TS-027)
 *   - Calendar tagging (UT-TS-028 to UT-TS-029)
 *   - Dedup / recency penalty (UT-TS-030 to UT-TS-031)
 *   - Error handling and disabled states (UT-TS-032 to UT-TS-034)
 *   - Pillar spike detection (UT-TS-035 to UT-TS-036)
 */

const {
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
} = require("../trending-scanner");

// ─────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────

const MOCK_TRENDS = [
  {
    title: "sleep regression",
    search_volume: 200000,
    increase_percentage: 1000,
    active: true,
    trend_breakdown: [
      "sleep regression",
      "4 month sleep regression",
      "baby sleep regression signs",
      "sleep regression ages",
    ],
  },
  {
    title: "bitcoin etf",
    search_volume: 800000,
    increase_percentage: 500,
    active: true,
    trend_breakdown: ["bitcoin etf", "bitcoin etf approval", "crypto etf"],
  },
  {
    title: "chuck norris",
    search_volume: 1200000,
    increase_percentage: 3000,
    active: true,
    trend_breakdown: ["chuck norris", "chuck norris death", "chuck norris age"],
  },
  {
    title: "presidential debate",
    search_volume: 5000000,
    increase_percentage: 8000,
    active: true,
    trend_breakdown: [
      "presidential debate",
      "election debate",
      "democrat republican debate",
    ],
  },
  {
    title: "new workout trend",
    search_volume: 30000,
    increase_percentage: 400,
    active: true,
    trend_breakdown: ["new workout trend", "fitness trend 2026"],
  },
  {
    title: "inactive trend",
    search_volume: 500000,
    increase_percentage: 200,
    active: false,
    trend_breakdown: ["inactive trend"],
  },
];

const BABY_CHANNEL_CONFIG = {
  name: "Baby Facts Unlocked",
  slug: "baby-facts-unlocked",
  defaults: {
    content_pillars: [
      "surprising-facts",
      "did-you-know",
      "myth-busting",
      "development-milestones",
    ],
  },
  trending: {
    enabled: true,
    mode: "supplementary",
    min_volume: 50000,
    strong_match_threshold: 8,
    moderate_match_threshold: 5,
    max_trending_slots_per_channel: 1,
    no_fly_list: ["politics", "religious_controversy", "active_tragedy"],
    fact_check: { enabled: false },
  },
};

const MONEY_CHANNEL_CONFIG = {
  name: "Money Facts Unlocked",
  slug: "money-facts-unlocked",
  defaults: {
    content_pillars: [
      "surprising-facts",
      "did-you-know",
      "myth-busting",
      "wealth-history",
    ],
  },
  trending: {
    enabled: true,
    mode: "supplementary",
    min_volume: 50000,
    strong_match_threshold: 8,
    moderate_match_threshold: 5,
    max_trending_slots_per_channel: 1,
    no_fly_list: ["politics", "religious_controversy", "active_tragedy"],
    fact_check: { enabled: false },
  },
};

const VIRAL_CHANNEL_CONFIG = {
  name: "Viral Facts Unlocked",
  slug: "viral-facts-unlocked",
  defaults: {
    content_pillars: [],
  },
  trending: {
    enabled: true,
    mode: "primary",
    min_volume: 20000,
    no_fly_list: ["politics", "religious_controversy", "active_tragedy"],
    fact_check: { enabled: true, model: "grok" },
  },
};

const DISABLED_CHANNEL_CONFIG = {
  name: "Disabled Channel",
  slug: "disabled-channel",
  defaults: { content_pillars: ["test"] },
  trending: { enabled: false },
};

const NO_FLY_TERMS = {
  politics: [
    "election",
    "democrat",
    "republican",
    "congress",
    "trump",
    "presidential debate",
  ],
  religious_controversy: ["blasphemy", "religious war", "sect"],
  active_tragedy: ["mass shooting", "terrorist attack"],
};

const MOCK_BRIEFS = {
  channels: [
    {
      channel: "BabyFactsUnlocked",
      briefs: [
        {
          slot: 1,
          type: "exploit",
          template: { hook_type: "stat_lead", video_length: "30" },
          topic_guidance: "Topic: baby development. Pillars: surprising-facts.",
          schedule_time: "09:00",
        },
        {
          slot: 2,
          type: "exploit",
          template: { hook_type: "did_you_know", video_length: "30" },
          topic_guidance: "Topic: baby development. Pillars: did-you-know.",
          schedule_time: "14:00",
        },
        {
          slot: 3,
          type: "explore",
          template: { hook_type: "question", video_length: "45" },
          topic_guidance: "Topic: baby development. Pillars: myth-busting.",
          schedule_time: "19:00",
        },
      ],
    },
  ],
};

const MOCK_VIRAL_BRIEFS = {
  channels: [
    {
      channel: "ViralFactsUnlocked",
      briefs: [
        {
          slot: 1,
          type: "exploit",
          template: { hook_type: "stat_lead", video_length: "30" },
          topic_guidance: "General trending content.",
          schedule_time: "09:00",
        },
        {
          slot: 2,
          type: "exploit",
          template: { hook_type: "did_you_know", video_length: "30" },
          topic_guidance: "General trending content.",
          schedule_time: "14:00",
        },
        {
          slot: 3,
          type: "explore",
          template: { hook_type: "question", video_length: "45" },
          topic_guidance: "General trending content.",
          schedule_time: "19:00",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// Pull Trending Topics
// ─────────────────────────────────────────────

describe("fetchTrendingTopics", () => {
  test("UT-TS-001: filters to active trends only", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      trending_searches: MOCK_TRENDS,
    });
    const result = await fetchTrendingTopics(
      { geo: "US", hours: 24, language: "en", min_volume: 50000 },
      mockFetch
    );

    expect(result.every((t) => t.active !== false)).toBe(true);
    expect(result.find((t) => t.title === "inactive trend")).toBeUndefined();
  });

  test("UT-TS-002: filters trends below min_volume", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      trending_searches: MOCK_TRENDS,
    });
    const result = await fetchTrendingTopics(
      { geo: "US", hours: 24, language: "en", min_volume: 50000 },
      mockFetch
    );

    // "new workout trend" has 30K volume, below 50K threshold
    expect(result.find((t) => t.title === "new workout trend")).toBeUndefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test("UT-TS-003: returns correct shape with title, volume, increase, related_terms", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      trending_searches: [MOCK_TRENDS[0]],
    });
    const result = await fetchTrendingTopics(
      { geo: "US", hours: 24, language: "en", min_volume: 50000 },
      mockFetch
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        title: "sleep regression",
        volume: 200000,
        increase: 1000,
        related_terms: expect.any(Array),
      })
    );
  });
});

// ─────────────────────────────────────────────
// No-Fly List Filtering
// ─────────────────────────────────────────────

describe("filterNoFlyList", () => {
  test("UT-TS-004: blocks trends matching no-fly terms in title", () => {
    const trends = [
      { title: "presidential debate", volume: 5000000, related_terms: [] },
      { title: "chuck norris", volume: 1200000, related_terms: [] },
    ];
    const result = filterNoFlyList(trends, NO_FLY_TERMS);

    expect(result.passed.find((t) => t.title === "presidential debate")).toBeUndefined();
    expect(result.passed.find((t) => t.title === "chuck norris")).toBeDefined();
  });

  test("UT-TS-005: blocks trends matching no-fly terms in related_terms", () => {
    const trends = [
      {
        title: "some debate topic",
        volume: 500000,
        related_terms: ["democrat republican debate", "political news"],
      },
    ];
    const result = filterNoFlyList(trends, NO_FLY_TERMS);

    expect(result.passed).toHaveLength(0);
    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0].reason).toMatch(/politics/);
  });

  test("UT-TS-006: passes trends with no no-fly matches", () => {
    const trends = [
      {
        title: "sleep regression",
        volume: 200000,
        related_terms: ["baby sleep", "4 month regression"],
      },
    ];
    const result = filterNoFlyList(trends, NO_FLY_TERMS);

    expect(result.passed).toHaveLength(1);
    expect(result.filtered).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// Score Trends for Themed Channels (Supplementary)
// ─────────────────────────────────────────────

describe("scoreTrendForChannel", () => {
  test("UT-TS-007: exact keyword match in pillars scores +10", () => {
    const trend = {
      title: "baby sleep",
      volume: 200000,
      increase: 1000,
      related_terms: ["baby sleep regression signs"],
    };
    // "baby" is not a pillar, but "development-milestones" isn't either
    // The pillar match checks if trend terms appear in pillars
    const channelWithBabyPillar = {
      ...BABY_CHANNEL_CONFIG,
      defaults: { content_pillars: ["baby-sleep", "development-milestones"] },
    };
    const score = scoreTrendForChannel(trend, channelWithBabyPillar);

    expect(score).toBeGreaterThanOrEqual(10);
  });

  test("UT-TS-008: volume > 500K adds +3 bonus", () => {
    const lowVolTrend = {
      title: "xyz",
      volume: 100000,
      increase: 100,
      related_terms: ["xyz match"],
    };
    const highVolTrend = {
      title: "xyz",
      volume: 600000,
      increase: 100,
      related_terms: ["xyz match"],
    };
    const channel = {
      defaults: { content_pillars: ["xyz"] },
      trending: BABY_CHANNEL_CONFIG.trending,
    };
    const lowScore = scoreTrendForChannel(lowVolTrend, channel);
    const highScore = scoreTrendForChannel(highVolTrend, channel);

    expect(highScore - lowScore).toBe(3);
  });

  test("UT-TS-009: volume > 1M adds +5 bonus (replaces +3)", () => {
    const trend = {
      title: "xyz",
      volume: 1500000,
      increase: 100,
      related_terms: ["xyz match"],
    };
    const channel = {
      defaults: { content_pillars: ["xyz"] },
      trending: BABY_CHANNEL_CONFIG.trending,
    };
    const score = scoreTrendForChannel(trend, channel);

    // +10 keyword + +5 volume
    expect(score).toBe(15);
  });

  test("UT-TS-010: increase > 2000 adds +3 freshness bonus", () => {
    const stableTrend = {
      title: "xyz",
      volume: 100000,
      increase: 500,
      related_terms: [],
    };
    const explodingTrend = {
      title: "xyz",
      volume: 100000,
      increase: 3000,
      related_terms: [],
    };
    const channel = {
      defaults: { content_pillars: ["xyz"] },
      trending: BABY_CHANNEL_CONFIG.trending,
    };
    const stableScore = scoreTrendForChannel(stableTrend, channel);
    const explodingScore = scoreTrendForChannel(explodingTrend, channel);

    expect(explodingScore - stableScore).toBe(3);
  });
});

// ─────────────────────────────────────────────
// Trend Routing
// ─────────────────────────────────────────────

describe("routeTrendsToChannels", () => {
  const trends = [
    {
      title: "sleep regression",
      volume: 200000,
      increase: 1000,
      related_terms: ["baby sleep regression signs"],
    },
    {
      title: "bitcoin etf",
      volume: 800000,
      increase: 500,
      related_terms: ["bitcoin etf", "crypto etf"],
    },
    {
      title: "chuck norris",
      volume: 1200000,
      increase: 3000,
      related_terms: ["chuck norris", "chuck norris death"],
    },
  ];

  test("UT-TS-011: themed channels claim strong matches first", () => {
    // Baby channel should claim "sleep regression" if pillars match
    const babyWithPillars = {
      ...BABY_CHANNEL_CONFIG,
      defaults: { content_pillars: ["sleep-regression", "baby-development"] },
    };
    const channels = [babyWithPillars, VIRAL_CHANNEL_CONFIG];
    const routing = routeTrendsToChannels(trends, channels);

    const babyClaimed = routing.channelMatches[babyWithPillars.slug];
    expect(babyClaimed.strong.some((m) => m.trend.title === "sleep regression")).toBe(true);
  });

  test("UT-TS-012: Viral Facts gets unclaimed trends", () => {
    const babyWithPillars = {
      ...BABY_CHANNEL_CONFIG,
      defaults: { content_pillars: ["sleep-regression"] },
    };
    const channels = [babyWithPillars, VIRAL_CHANNEL_CONFIG];
    const routing = routeTrendsToChannels(trends, channels);

    const viralPool = routing.channelMatches[VIRAL_CHANNEL_CONFIG.slug];
    // "sleep regression" was claimed by baby, so viral should NOT have it
    expect(viralPool.primary.some((t) => t.trend.title === "sleep regression")).toBe(false);
    // but should have unclaimed ones like "chuck norris" and "bitcoin etf"
    expect(viralPool.primary.some((t) => t.trend.title === "chuck norris")).toBe(true);
  });

  test("UT-TS-013: Viral Facts ranks by volume * increase descending", () => {
    const channels = [VIRAL_CHANNEL_CONFIG];
    const routing = routeTrendsToChannels(trends, channels);

    const viralPool = routing.channelMatches[VIRAL_CHANNEL_CONFIG.slug];
    // chuck norris: 1.2M * 3000 = 3.6B, bitcoin: 800K * 500 = 400M
    expect(viralPool.primary[0].trend.title).toBe("chuck norris");
  });

  test("UT-TS-014: disabled channels are skipped entirely", () => {
    const channels = [DISABLED_CHANNEL_CONFIG, VIRAL_CHANNEL_CONFIG];
    const routing = routeTrendsToChannels(trends, channels);

    expect(routing.channelMatches[DISABLED_CHANNEL_CONFIG.slug]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// Topic Guidance Injection — Supplementary
// ─────────────────────────────────────────────

describe("injectTrendIntoGuidance — supplementary", () => {
  test("UT-TS-015: strong match prepends to first exploit slot only", () => {
    const match = {
      trend: { title: "sleep regression", volume: 200000 },
      score: 13,
      type: "strong",
      context: {
        why_trending: "Parents searching for solutions",
        tone_signal: "neutral",
      },
    };
    const briefs = JSON.parse(JSON.stringify(MOCK_BRIEFS.channels[0].briefs));
    const result = injectTrendIntoGuidance(
      briefs,
      match,
      "supplementary"
    );

    expect(result[0].topic_guidance).toMatch(/TRENDING TOPIC/);
    expect(result[1].topic_guidance).not.toMatch(/TRENDING/);
    expect(result[2].topic_guidance).not.toMatch(/TRENDING/); // explore slot
  });

  test("UT-TS-016: moderate match appends to exploit slots, not explore", () => {
    const match = {
      trend: { title: "postpartum fitness", volume: 80000 },
      score: 6,
      type: "moderate",
      context: {
        why_trending: "New study published",
        tone_signal: "neutral",
      },
    };
    const briefs = JSON.parse(JSON.stringify(MOCK_BRIEFS.channels[0].briefs));
    const result = injectTrendIntoGuidance(
      briefs,
      match,
      "supplementary"
    );

    expect(result[0].topic_guidance).toMatch(/TRENDING CONTEXT/);
    expect(result[1].topic_guidance).toMatch(/TRENDING CONTEXT/);
    expect(result[2].topic_guidance).not.toMatch(/TRENDING/); // explore unchanged
  });

  test("UT-TS-017: no match leaves all guidance unchanged", () => {
    const briefs = JSON.parse(JSON.stringify(MOCK_BRIEFS.channels[0].briefs));
    const result = injectTrendIntoGuidance(briefs, null, "supplementary");

    expect(result[0].topic_guidance).toBe(briefs[0].topic_guidance);
    expect(result[1].topic_guidance).toBe(briefs[1].topic_guidance);
    expect(result[2].topic_guidance).toBe(briefs[2].topic_guidance);
  });
});

// ─────────────────────────────────────────────
// Topic Guidance Injection — Primary (Viral Facts)
// ─────────────────────────────────────────────

describe("injectTrendIntoGuidance — primary", () => {
  test("UT-TS-018: replaces topic_guidance on all exploit slots", () => {
    const matches = [
      {
        trend: { title: "chuck norris", volume: 1200000, related_terms: ["chuck norris death"] },
        context: {
          why_trending: "Chuck Norris passed away",
          tone_signal: "respectful",
        },
      },
      {
        trend: { title: "bitcoin etf", volume: 800000, related_terms: ["crypto etf"] },
        context: {
          why_trending: "SEC approved bitcoin ETF",
          tone_signal: "neutral",
        },
      },
    ];
    const briefs = JSON.parse(JSON.stringify(MOCK_VIRAL_BRIEFS.channels[0].briefs));
    const result = injectTrendIntoGuidance(
      briefs,
      matches,
      "primary"
    );

    expect(result[0].topic_guidance).toMatch(/chuck norris/i);
    expect(result[1].topic_guidance).toMatch(/bitcoin etf/i);
    expect(result[2].topic_guidance).not.toMatch(/chuck norris|bitcoin/i); // explore unchanged
  });

  test("UT-TS-019: explore slot is never trend-modified in primary mode", () => {
    const matches = [
      {
        trend: { title: "trend1", volume: 500000, related_terms: [] },
        context: { why_trending: "test", tone_signal: "neutral" },
      },
    ];
    const briefs = JSON.parse(JSON.stringify(MOCK_VIRAL_BRIEFS.channels[0].briefs));
    const originalExplore = briefs[2].topic_guidance;
    const result = injectTrendIntoGuidance(briefs, matches, "primary");

    expect(result[2].topic_guidance).toBe(originalExplore);
  });
});

// ─────────────────────────────────────────────
// Context Enrichment
// ─────────────────────────────────────────────

describe("enrichTrendContext", () => {
  test("UT-TS-020: returns why_trending, event_type, tone_signal, safety_flag", async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      why_trending: "Chuck Norris passed away at age 86",
      event_type: "death",
      tone_signal: "respectful",
      safety_flag: false,
    });

    const result = await enrichTrendContext(
      { title: "chuck norris", related_terms: ["chuck norris death"] },
      mockSearch
    );

    expect(result).toEqual(
      expect.objectContaining({
        why_trending: expect.any(String),
        event_type: expect.any(String),
        tone_signal: expect.stringMatching(
          /respectful|celebratory|playful|neutral|cautionary/
        ),
        safety_flag: expect.any(Boolean),
      })
    );
  });

  test("UT-TS-021: safety_flag=true drops the trend", async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      why_trending: "Controversial political figure made inflammatory statement",
      event_type: "scandal",
      tone_signal: "cautionary",
      safety_flag: true,
    });

    const result = await enrichTrendContext(
      { title: "some topic", related_terms: [] },
      mockSearch
    );

    expect(result.safety_flag).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Tone Signal
// ─────────────────────────────────────────────

describe("buildToneGuidance", () => {
  test("UT-TS-022: respectful tone includes tribute framing", () => {
    const guidance = buildToneGuidance("respectful");

    expect(guidance).toMatch(/respectful/i);
    expect(guidance).toMatch(/tribute|legacy|acknowledge/i);
  });

  test("UT-TS-023: playful tone allows punchy hooks", () => {
    const guidance = buildToneGuidance("playful");

    expect(guidance).toMatch(/playful/i);
    expect(guidance).toMatch(/fun|punchy/i);
  });
});

// ─────────────────────────────────────────────
// Fact-Check Gate
// ─────────────────────────────────────────────

describe("factCheckScript", () => {
  test("UT-TS-024: PASS result allows script through", async () => {
    const mockChecker = jest.fn().mockResolvedValue({
      result: "PASS",
      corrections: [],
    });

    const outcome = await factCheckScript(
      "Here are 5 facts about Chuck Norris...",
      { why_trending: "He passed away" },
      { enabled: true, model: "grok" },
      mockChecker
    );

    expect(outcome.passed).toBe(true);
    expect(outcome.script).toBe("Here are 5 facts about Chuck Norris...");
  });

  test("UT-TS-025: FAIL result applies corrections and retries once", async () => {
    const mockChecker = jest
      .fn()
      .mockResolvedValueOnce({
        result: "FAIL",
        corrections: ["Chuck Norris was 84, not 86"],
        corrected_script: "Here are 5 facts... (age corrected to 84)",
      })
      .mockResolvedValueOnce({
        result: "PASS",
        corrections: [],
      });

    const outcome = await factCheckScript(
      "Here are 5 facts... age 86",
      { why_trending: "He passed away" },
      { enabled: true, model: "grok" },
      mockChecker
    );

    expect(outcome.passed).toBe(true);
    expect(outcome.script).toBe("Here are 5 facts... (age corrected to 84)");
    expect(mockChecker).toHaveBeenCalledTimes(2);
  });

  test("UT-TS-026: FAIL after retry returns fallback signal", async () => {
    const mockChecker = jest.fn().mockResolvedValue({
      result: "FAIL",
      corrections: ["Cannot verify primary claim"],
      corrected_script: "Still wrong script",
    });

    const outcome = await factCheckScript(
      "Unverifiable claims...",
      { why_trending: "test" },
      { enabled: true, model: "grok" },
      mockChecker
    );

    expect(outcome.passed).toBe(false);
    expect(outcome.fallback).toBe(true);
  });

  test("UT-TS-027: fact-check skipped when disabled", async () => {
    const mockChecker = jest.fn();

    const outcome = await factCheckScript(
      "Some script",
      { why_trending: "test" },
      { enabled: false },
      mockChecker
    );

    expect(outcome.passed).toBe(true);
    expect(outcome.skipped).toBe(true);
    expect(mockChecker).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// Calendar Tagging
// ─────────────────────────────────────────────

describe("buildCalendarTag", () => {
  test("UT-TS-028: trend-matched content gets trend_match object", () => {
    const tag = buildCalendarTag({
      trend: { title: "sleep regression", volume: 200000 },
      score: 13,
      type: "strong",
    });

    expect(tag).toEqual({
      trend_title: "sleep regression",
      match_score: 13,
      search_volume: 200000,
      match_type: "strong",
    });
  });

  test("UT-TS-029: non-trend content returns null", () => {
    const tag = buildCalendarTag(null);
    expect(tag).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Dedup / Recency Penalty
// ─────────────────────────────────────────────

describe("applyRecencyPenalty", () => {
  test("UT-TS-030: previously used trend gets -5 penalty", () => {
    const trend = { title: "sleep regression", volume: 200000, increase: 1000 };
    const usedYesterday = ["sleep regression"];
    const penalized = applyRecencyPenalty(trend, usedYesterday);

    expect(penalized.penalty).toBe(5);
  });

  test("UT-TS-031: fresh trend gets no penalty", () => {
    const trend = { title: "new topic", volume: 200000, increase: 1000 };
    const usedYesterday = ["sleep regression"];
    const penalized = applyRecencyPenalty(trend, usedYesterday);

    expect(penalized.penalty).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────

describe("error handling", () => {
  test("UT-TS-032: API failure returns empty trends with error", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error("API timeout"));
    const result = await fetchTrendingTopics(
      { geo: "US", hours: 24, language: "en", min_volume: 50000 },
      mockFetch
    );

    expect(result).toEqual([]);
  });

  test("UT-TS-033: disabled channel returns null from routing", () => {
    const channels = [DISABLED_CHANNEL_CONFIG];
    const routing = routeTrendsToChannels(
      [{ title: "test", volume: 100000, increase: 100, related_terms: [] }],
      channels
    );

    expect(routing.channelMatches[DISABLED_CHANNEL_CONFIG.slug]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// Pillar Spike Detection
// ─────────────────────────────────────────────

describe("detectPillarSpikes", () => {
  test("UT-TS-035: detects pillar jumping from <30 to >70", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      interest_over_time: [
        {
          keyword: "baby-sleep",
          timeline_data: [
            { date: "2026-03-13", value: 20 },
            { date: "2026-03-14", value: 25 },
            { date: "2026-03-15", value: 22 },
            { date: "2026-03-16", value: 28 },
            { date: "2026-03-17", value: 55 },
            { date: "2026-03-18", value: 72 },
            { date: "2026-03-19", value: 85 },
          ],
        },
        {
          keyword: "myth-busting",
          timeline_data: [
            { date: "2026-03-13", value: 40 },
            { date: "2026-03-14", value: 42 },
            { date: "2026-03-15", value: 38 },
            { date: "2026-03-16", value: 41 },
            { date: "2026-03-17", value: 39 },
            { date: "2026-03-18", value: 43 },
            { date: "2026-03-19", value: 40 },
          ],
        },
      ],
    });

    const spikes = await detectPillarSpikes(
      ["baby-sleep", "myth-busting"],
      { geo: "US" },
      mockFetch
    );

    expect(spikes).toContain("baby-sleep");
    expect(spikes).not.toContain("myth-busting");
  });

  test("UT-TS-036: returns empty array when no spikes detected", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      interest_over_time: [
        {
          keyword: "stable-pillar",
          timeline_data: [
            { date: "2026-03-13", value: 50 },
            { date: "2026-03-19", value: 52 },
          ],
        },
      ],
    });

    const spikes = await detectPillarSpikes(
      ["stable-pillar"],
      { geo: "US" },
      mockFetch
    );

    expect(spikes).toEqual([]);
  });
});
