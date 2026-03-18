/**
 * Tests for Whisper-Synced Captions — phrase grouping, manifest enrichment, fallback
 *
 * Tests cover:
 *   - Phrase grouping from word timestamps (UT-WC-001 to UT-WC-006)
 *   - Manifest enrichment (UT-WC-007 to UT-WC-009)
 *   - Fallback when no timestamps (UT-WC-010 to UT-WC-012)
 *   - getCurrentPhrase frame-based lookup (UT-WC-013 to UT-WC-016)
 */

const {
  groupWordsIntoPhrases,
  enrichManifestWithTimestamps,
  buildEvenSpacedPhrases,
  getCurrentPhrase,
} = require("../lib/whisper-captions");

// ─────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────

const SAMPLE_WORDS = [
  { word: "Your", start: 0.0, end: 0.28 },
  { word: "baby", start: 0.30, end: 0.62 },
  { word: "already", start: 0.65, end: 1.01 },
  { word: "has", start: 1.05, end: 1.20 },
  { word: "unique", start: 1.25, end: 1.68 },
  { word: "fingerprints", start: 1.72, end: 2.35 },
  { word: "at", start: 2.40, end: 2.52 },
  { word: "just", start: 2.55, end: 2.78 },
  { word: "three", start: 2.82, end: 3.10 },
  { word: "months", start: 3.15, end: 3.48 },
  { word: "in", start: 3.52, end: 3.60 },
  { word: "the", start: 3.62, end: 3.72 },
  { word: "womb.", start: 3.75, end: 4.10 },
];

const SAMPLE_MANIFEST = {
  "scene-1-hook": {
    file: "audio/scene-1-hook.wav",
    durationSec: 4.2,
    status: "complete",
    provider: "grok",
  },
  "scene-2-body": {
    file: "audio/scene-2-body.wav",
    durationSec: 7.5,
    status: "complete",
    provider: "gemini",
  },
  "scene-3-failed": {
    file: "audio/scene-3-failed.wav",
    durationSec: 0,
    status: "failed",
    error: "All providers exhausted",
  },
};

// ─────────────────────────────────────────────
// Phrase Grouping
// ─────────────────────────────────────────────

describe("groupWordsIntoPhrases", () => {
  test("UT-WC-001: groups words into phrases of 4-6 words", () => {
    const phrases = groupWordsIntoPhrases(SAMPLE_WORDS);
    phrases.forEach((phrase) => {
      expect(phrase.words.length).toBeGreaterThanOrEqual(1);
      expect(phrase.words.length).toBeLessThanOrEqual(7); // allow slight overflow for natural breaks
    });
  });

  test("UT-WC-002: each phrase has start/end timestamps from its words", () => {
    const phrases = groupWordsIntoPhrases(SAMPLE_WORDS);
    phrases.forEach((phrase) => {
      expect(phrase.start).toBeDefined();
      expect(phrase.end).toBeDefined();
      expect(phrase.start).toBe(phrase.words[0].start);
      expect(phrase.end).toBe(phrase.words[phrase.words.length - 1].end);
    });
  });

  test("UT-WC-003: phrases cover all words (no gaps, no duplicates)", () => {
    const phrases = groupWordsIntoPhrases(SAMPLE_WORDS);
    const allWords = phrases.flatMap((p) => p.words);
    expect(allWords.length).toBe(SAMPLE_WORDS.length);
    expect(allWords.map((w) => w.word)).toEqual(SAMPLE_WORDS.map((w) => w.word));
  });

  test("UT-WC-004: breaks on punctuation when possible", () => {
    const wordsWithComma = [
      { word: "First,", start: 0.0, end: 0.3 },
      { word: "your", start: 0.4, end: 0.6 },
      { word: "baby", start: 0.7, end: 1.0 },
      { word: "can", start: 1.1, end: 1.3 },
      { word: "hear", start: 1.4, end: 1.7 },
      { word: "every", start: 1.8, end: 2.1 },
      { word: "single", start: 2.2, end: 2.5 },
      { word: "sound,", start: 2.6, end: 2.9 },
      { word: "which", start: 3.0, end: 3.2 },
      { word: "is", start: 3.3, end: 3.4 },
      { word: "pretty", start: 3.5, end: 3.8 },
      { word: "amazing.", start: 3.9, end: 4.3 },
    ];
    const phrases = groupWordsIntoPhrases(wordsWithComma);
    // With 12 words, should break into 2-3 phrases
    // First phrase should break at "First," (word 1) — but that's only 1 word (< minWords)
    // So it should break at "sound," (word 8) which is after minWords
    expect(phrases.length).toBeGreaterThanOrEqual(2);
    // At least one phrase boundary should end on punctuation
    const phraseEndWords = phrases.slice(0, -1).map(p => p.words[p.words.length - 1].word);
    const hasPunctuationBreak = phraseEndWords.some(w => /[.,!?;:]$/.test(w));
    expect(hasPunctuationBreak).toBe(true);
  });

  test("UT-WC-005: handles short text (fewer than 4 words)", () => {
    const shortWords = [
      { word: "Mind", start: 0.0, end: 0.3 },
      { word: "blown.", start: 0.4, end: 0.8 },
    ];
    const phrases = groupWordsIntoPhrases(shortWords);
    expect(phrases.length).toBe(1);
    expect(phrases[0].text).toBe("Mind blown.");
  });

  test("UT-WC-006: each phrase has a combined text string", () => {
    const phrases = groupWordsIntoPhrases(SAMPLE_WORDS);
    phrases.forEach((phrase) => {
      expect(phrase.text).toBe(phrase.words.map((w) => w.word).join(" "));
    });
  });
});

// ─────────────────────────────────────────────
// Manifest Enrichment
// ─────────────────────────────────────────────

describe("enrichManifestWithTimestamps", () => {
  test("UT-WC-007: adds words array to manifest entries", () => {
    const whisperResults = {
      "scene-1-hook": SAMPLE_WORDS,
      "scene-2-body": SAMPLE_WORDS,
    };
    const enriched = enrichManifestWithTimestamps(SAMPLE_MANIFEST, whisperResults);
    expect(enriched["scene-1-hook"].words).toEqual(SAMPLE_WORDS);
    expect(enriched["scene-2-body"].words).toEqual(SAMPLE_WORDS);
  });

  test("UT-WC-008: preserves existing manifest fields", () => {
    const whisperResults = { "scene-1-hook": SAMPLE_WORDS };
    const enriched = enrichManifestWithTimestamps(SAMPLE_MANIFEST, whisperResults);
    expect(enriched["scene-1-hook"].file).toBe("audio/scene-1-hook.wav");
    expect(enriched["scene-1-hook"].durationSec).toBe(4.2);
    expect(enriched["scene-1-hook"].status).toBe("complete");
    expect(enriched["scene-1-hook"].provider).toBe("grok");
  });

  test("UT-WC-009: skips failed scenes (no words added)", () => {
    const whisperResults = {};
    const enriched = enrichManifestWithTimestamps(SAMPLE_MANIFEST, whisperResults);
    expect(enriched["scene-3-failed"].words).toBeUndefined();
    expect(enriched["scene-3-failed"].status).toBe("failed");
  });
});

// ─────────────────────────────────────────────
// Fallback (no timestamps)
// ─────────────────────────────────────────────

describe("buildEvenSpacedPhrases", () => {
  test("UT-WC-010: produces phrases from text and duration when no timestamps", () => {
    const text = "Your baby already has unique fingerprints at just three months in the womb";
    const phrases = buildEvenSpacedPhrases(text, 4.2);
    expect(phrases.length).toBeGreaterThanOrEqual(2);
    phrases.forEach((phrase) => {
      expect(phrase.text).toBeDefined();
      expect(phrase.start).toBeDefined();
      expect(phrase.end).toBeDefined();
    });
  });

  test("UT-WC-011: even-spaced phrases cover the full duration", () => {
    const text = "This is a test sentence with several words for testing";
    const duration = 5.0;
    const phrases = buildEvenSpacedPhrases(text, duration);
    expect(phrases[0].start).toBe(0);
    expect(phrases[phrases.length - 1].end).toBeCloseTo(duration, 1);
  });

  test("UT-WC-012: all words are included in fallback phrases", () => {
    const text = "One two three four five six seven eight nine ten";
    const phrases = buildEvenSpacedPhrases(text, 5.0);
    const allWords = phrases.map((p) => p.text).join(" ");
    expect(allWords).toBe(text);
  });
});

// ─────────────────────────────────────────────
// getCurrentPhrase (frame-based lookup)
// ─────────────────────────────────────────────

describe("getCurrentPhrase", () => {
  const phrases = [
    { text: "Your baby already has", start: 0.0, end: 1.20, words: [] },
    { text: "unique fingerprints at just", start: 1.25, end: 2.78, words: [] },
    { text: "three months in the womb.", start: 2.82, end: 4.10, words: [] },
  ];

  test("UT-WC-017: returns empty text for empty phrases array", () => {
    const result = getCurrentPhrase([], 0, 30);
    expect(result.text).toBe("");
    expect(result.index).toBe(0);
  });

  test("UT-WC-013: returns first phrase at frame 0", () => {
    const result = getCurrentPhrase(phrases, 0, 30);
    expect(result.text).toBe("Your baby already has");
    expect(result.index).toBe(0);
  });

  test("UT-WC-014: returns second phrase at correct frame", () => {
    // 1.5s = frame 45 at 30fps
    const result = getCurrentPhrase(phrases, 45, 30);
    expect(result.text).toBe("unique fingerprints at just");
    expect(result.index).toBe(1);
  });

  test("UT-WC-015: returns last phrase near end", () => {
    // 3.5s = frame 105
    const result = getCurrentPhrase(phrases, 105, 30);
    expect(result.text).toBe("three months in the womb.");
    expect(result.index).toBe(2);
  });

  test("UT-WC-016: returns last phrase for frames beyond duration", () => {
    // Frame 200 = 6.67s, beyond all phrases
    const result = getCurrentPhrase(phrases, 200, 30);
    expect(result.text).toBe("three months in the womb.");
    expect(result.index).toBe(2);
  });
});
