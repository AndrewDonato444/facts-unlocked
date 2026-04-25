// baby-fontanelle-pulse — 29s @ 30fps = 870 frames total
// Audio-driven timing — updated after TTS generation

export const VIDEO_CONFIG = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 870, // updated from manifest after TTS
};

// Soft purple/blue palette — warm, curious, educational
export const COLORS = {
  bg1: "#1a0a2e",        // deep purple-navy
  bg2: "#16213e",        // dark blue
  bg3: "#0f3460",        // ocean blue
  accent: "#c77dff",     // lavender purple
  accentWarm: "#e0aaff", // light lavender
  highlight: "#7b2d8b",  // highlight glow
  text: "#ffffff",
  textSoft: "rgba(255,255,255,0.85)",
  hookBg: "rgba(199,125,255,0.15)",
};

export const FONTS = {
  headline: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

// Scene timing (frames) — set after TTS manifest is generated
// Placeholder values; render.sh reads manifest and can update
export const SCENE_TIMINGS = {
  hook: { start: 0, duration: 150 },   // ~5s
  body: { start: 150, duration: 570 }, // ~19s
  cta:  { start: 720, duration: 150 }, // ~5s
};
