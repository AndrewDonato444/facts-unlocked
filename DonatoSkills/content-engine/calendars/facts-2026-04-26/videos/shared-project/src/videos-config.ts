// All 7 remaining videos for facts-2026-04-26 campaign

export interface VideoConfig {
  id: string;
  compositionId: string;
  project: "baby-facts-unlocked" | "money-facts-unlocked" | "ai-facts-unlocked";
  hookText: string[];        // lines for hook screen
  hookType: string;
  bgPalette: "purple" | "green" | "red" | "blue" | "teal";
  textOverlay: "karaoke" | "key_words" | "full_captions";
  voice: string;             // Gemini voice name
  scenes: {
    name: string;
    script: string;
    direction?: string;
  }[];
  facts: string[];           // fact bullet points for body screen
}

export const VIDEOS: VideoConfig[] = [
  // 002 — baby-amniotic-swallowing (slot 3 / 7pm ET)
  {
    id: "002-baby-amniotic-swallowing",
    compositionId: "BabyAmnioticSwallowing",
    project: "baby-facts-unlocked",
    hookText: ["FETUSES SWALLOW", "1 LITER OF THEIR", "OWN WOMB FLUID", "EVERY DAY"],
    hookType: "did_you_know",
    bgPalette: "purple",
    textOverlay: "key_words",
    voice: "Kore",
    scenes: [
      {
        name: "hook",
        script: "By the end of pregnancy, your baby is swallowing about one liter of amniotic fluid every single day.",
        direction: "warm, surprising, conversational",
      },
      {
        name: "body",
        script: "That fluid isn't just water. It contains fetal skin cells, proteins, growth factors, and immune signals from the mother. Swallowing starts at 11 weeks. By the third trimester it's a liter daily — training the gut, regulating fluid levels, and programming the immune system before birth.",
      },
      {
        name: "cta",
        script: "The amniotic fluid isn't just a cushion. It's a training environment. Follow for more.",
        direction: "warm, inviting",
      },
    ],
    facts: [
      "Swallowing begins at 11 weeks",
      "1 liter/day by 3rd trimester",
      "Contains skin cells, proteins,\ngrowth factors, immune signals",
      "Trains the gut before birth",
      "Regulates amniotic fluid levels",
    ],
  },

  // 004 — hsa-triple-tax (slot 1 / 9am ET money)
  {
    id: "004-hsa-triple-tax",
    compositionId: "HsaTripleTax",
    project: "money-facts-unlocked",
    hookText: ["THE ONLY ACCOUNT", "IN AMERICA WITH", "TRIPLE TAX", "ADVANTAGE"],
    hookType: "most_people_dont_know",
    bgPalette: "green",
    textOverlay: "full_captions",
    voice: "Kore",
    scenes: [
      {
        name: "hook",
        script: "There is one account in the US tax code with three separate tax advantages. Most people have never used it.",
        direction: "authoritative, eye-opening",
      },
      {
        name: "body",
        script: "It's called a Health Savings Account — HSA. First: contributions reduce your taxable income dollar for dollar. Second: the money grows completely tax-free. Third: withdrawals for medical expenses are also tax-free. Triple-exempt — no other account does this. After 65, you can withdraw for anything, like a traditional IRA. 2024 limits: forty-one fifty individual, eighty-three hundred family.",
      },
      {
        name: "cta",
        script: "If your employer offers an HSA and you're not maxing it, you're leaving tax-free money on the table. Follow for more money facts.",
        direction: "direct, motivating",
      },
    ],
    facts: [
      "Pre-tax contributions → reduces taxable income",
      "Tax-free growth (invest like 401k)",
      "Tax-free withdrawals for medical",
      "After 65: withdraw for anything",
      "2024: $4,150 / $8,300 limits",
    ],
  },

  // 005 — salary-negotiation-silence (slot 2 / 2pm ET money)
  {
    id: "005-salary-negotiation-silence",
    compositionId: "SalaryNegotiationSilence",
    project: "money-facts-unlocked",
    hookText: ["AFTER YOU NAME", "YOUR SALARY NUMBER", "SAY NOTHING"],
    hookType: "controversy",
    bgPalette: "red",
    textOverlay: "karaoke",
    voice: "Puck",
    scenes: [
      {
        name: "hook",
        script: "After you name your salary number — stop talking. The first person to speak almost always loses.",
        direction: "confident, punchy, direct",
      },
      {
        name: "body",
        script: "When you say a number, it becomes the psychological anchor. Silence creates pressure. The other person fills it — and when they fill it, they move toward your number. But most people immediately justify their ask. That signals doubt. Harvard and Wharton research shows that candidates who state their number and wait are perceived as more confident and more senior — with the identical number.",
      },
      {
        name: "cta",
        script: "Name the number. Be quiet. Let the silence do the work. Follow for more money facts.",
        direction: "sharp, confident",
      },
    ],
    facts: [
      "Your number = psychological anchor",
      "Silence creates discomfort",
      "They fill it by moving toward you",
      "Justifying unprompted = signals doubt",
      "Harvard/Wharton: silence = confidence",
    ],
  },

  // 006 — backdoor-roth (slot 3 / 7pm ET money)
  {
    id: "006-backdoor-roth",
    compositionId: "BackdoorRoth",
    project: "money-facts-unlocked",
    hookText: ["THE ROTH IRA", "INCOME LIMIT HAS", "A LEGAL LOOPHOLE"],
    hookType: "myth_bust",
    bgPalette: "green",
    textOverlay: "key_words",
    voice: "Kore",
    scenes: [
      {
        name: "hook",
        script: "If you earn too much to contribute to a Roth IRA, there's a legal workaround the IRS knows about and allows.",
        direction: "authoritative, matter-of-fact",
      },
      {
        name: "body",
        script: "Roth IRA limits in 2024: 161 thousand single, 240 thousand married. Above that — no direct contributions. But the backdoor Roth is IRS-documented. Step one: contribute to a traditional IRA, no income limit. Step two: immediately convert to Roth. You pay tax on the conversion, but since you didn't deduct the contribution, it's minimal. File Form 8606. Congress has had multiple chances to close this and hasn't.",
      },
      {
        name: "cta",
        script: "Backdoor Roth: traditional IRA contribution, Roth conversion, Form 8606. Legal, documented, and ignored by most high earners. Follow for more.",
        direction: "informative, inviting",
      },
    ],
    facts: [
      "2024 Roth limit: $161K (single) / $240K (married)",
      "Backdoor Roth: contribute to Traditional IRA",
      "Then convert to Roth immediately",
      "Pay minimal tax (no prior deduction)",
      "File Form 8606 — fully IRS-documented",
    ],
  },

  // 007 — ai-genomics (slot 1 / 9am ET ai)
  {
    id: "007-ai-genomics",
    compositionId: "AiGenomics",
    project: "ai-facts-unlocked",
    hookText: ["HUMAN GENOME:", "13 YEARS, $3 BILLION", "AI DOES IT", "IN 8 HOURS"],
    hookType: "stat_lead",
    bgPalette: "teal",
    textOverlay: "karaoke",
    voice: "Aoede",
    scenes: [
      {
        name: "hook",
        script: "The Human Genome Project took 13 years and 3 billion dollars. AI now does the same thing in 8 hours.",
        direction: "fast, impactful, data-driven",
      },
      {
        name: "body",
        script: "The project ran from 1990 to 2003 — 20 countries, hundreds of institutions. Today, AI-assisted nanopore sequencing completes a full genome in under 8 hours for under a thousand dollars. That's a 99.99 percent cost reduction in 20 years. If cars improved at the same rate, a 3-billion-dollar car in 2003 would cost 300 dollars today. And AI isn't just sequencing faster — it's identifying cancer-causing mutations in the data that human reviewers miss entirely.",
      },
      {
        name: "cta",
        script: "We sequenced the genome once. Now AI is learning to read it. Follow for more AI facts.",
        direction: "forward-looking, hopeful",
      },
    ],
    facts: [
      "1990–2003: 13 yrs, $3B, 20 countries",
      "Today: under 8 hours, under $1,000",
      "99.99% cost reduction in 20 years",
      "AI spots cancer mutations humans miss",
      "Oxford Nanopore + AI = real-time sequencing",
    ],
  },

  // 008 — alphachip-self-design (slot 2 / 2pm ET ai)
  {
    id: "008-alphachip-self-design",
    compositionId: "AlphaChipSelfDesign",
    project: "ai-facts-unlocked",
    hookText: ["AI IS NOW", "DESIGNING THE CHIPS", "THAT RUN AI"],
    hookType: "what_if",
    bgPalette: "blue",
    textOverlay: "full_captions",
    voice: "Kore",
    scenes: [
      {
        name: "hook",
        script: "AI is now designing the physical chips that AI runs on. A recursive loop that's accelerating.",
        direction: "slow, thoughtful, mind-expanding",
      },
      {
        name: "body",
        script: "Google's AlphaChip AI designs semiconductor floorplans — where every transistor lives on the chip — in 6 hours. Human engineers take months. AlphaChip-designed layouts outperform humans on power, speed, and die area. Every Google Tensor Processing Unit since the 4th generation uses AlphaChip layouts. AI is designing the hardware it runs on. That loop is tightening.",
      },
      {
        name: "cta",
        script: "Faster AI designs better chips. Better chips train faster AI. The loop runs. Follow for more.",
        direction: "measured, impactful",
      },
    ],
    facts: [
      "AlphaChip: published in Nature (2021)",
      "Designs chip floorplans in 6 hours",
      "Human engineers: months for same task",
      "Outperforms humans on power + speed + area",
      "Every Google TPU gen 4+ uses AlphaChip",
    ],
  },

  // 009 — ai-autonomous-bug-fix (slot 3 / 7pm ET ai)
  {
    id: "009-ai-autonomous-bug-fix",
    compositionId: "AiAutonomousBugFix",
    project: "ai-facts-unlocked",
    hookText: ["AI NOW FIXES", "48% OF REAL", "SOFTWARE BUGS", "NO HUMAN"],
    hookType: "controversy",
    bgPalette: "red",
    textOverlay: "karaoke",
    voice: "Puck",
    scenes: [
      {
        name: "hook",
        script: "AI agents now autonomously fix 48 percent of real software bugs — finding the file, writing the patch, passing the tests. No human involved.",
        direction: "fast, punchy, surprising",
      },
      {
        name: "body",
        script: "SWE-bench: real GitHub issues from production codebases. The AI must find the bug, write the fix, pass existing tests — no hints. In 2022 the best AI scored under 2 percent. In 2025 top models score 48 percent. A 24-fold improvement in 24 months. At this trajectory, routine bug fixing becomes largely autonomous by 2027.",
      },
      {
        name: "cta",
        script: "2% in 2022. 48% in 2025. The question shifts from can I write this code to is this AI fix correct. Follow for more.",
        direction: "sharp, thought-provoking",
      },
    ],
    facts: [
      "SWE-bench: real GitHub issues, no hints",
      "2022: 1.96% success rate",
      "2025: 48%+ (Claude 3.7, GPT-4.1)",
      "24x improvement in 24 months",
      "2027 projection: mostly autonomous",
    ],
  },
];

// Palette definitions
export const PALETTES = {
  purple: { bg1: "#1a0a2e", bg2: "#0f3460", accent: "#c77dff", textHigh: "#e0aaff" },
  green:  { bg1: "#0a1a0a", bg2: "#0f3021", accent: "#52b788", textHigh: "#b7e4c7" },
  red:    { bg1: "#1a0a0a", bg2: "#3a0f0f", accent: "#ff6b6b", textHigh: "#ffa8a8" },
  blue:   { bg1: "#0a0f1a", bg2: "#0f2060", accent: "#4cc9f0", textHigh: "#a8d8f0" },
  teal:   { bg1: "#0a1a1a", bg2: "#0f3060", accent: "#00b4d8", textHigh: "#90e0ef" },
} as const;
