// AI Facts Unlocked — 008-ai-math-olympiad
// Platform: YouTube/Instagram (1080x1920, 9:16, 30fps)
// Hook: "AI JUST WON THE MATH OLYMPICS"
// Hook type: stat_lead | fast pace | karaoke_highlight
// TTS: Gemini/Kore | Images: Grok grok-imagine-image
// Style: deep space black with electric blue/cyan, golden trophy accent

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const BUFFER_FRAMES = 6; // shorter buffer for fast pace

// Deep space black + electric blue/cyan + gold medal accent
export const COLORS = {
  background: "#030810",
  overlay: "rgba(3,8,16,0.48)",
  overlayDark: "rgba(2,5,12,0.62)",
  overlayLight: "rgba(3,8,16,0.35)",
  // Electric blue accent — AI, reasoning, computation
  blue: "#0EA5E9",
  blueBright: "#38BDF8",
  blueDim: "#0284C7",
  blueGlow: "rgba(14,165,233,0.40)",
  // Cyan accent — breakthrough, intelligence
  cyan: "#06B6D4",
  cyanBright: "#22D3EE",
  cyanDim: "#0891B2",
  cyanGlow: "rgba(6,182,212,0.38)",
  // Gold accent — olympic medal, achievement
  gold: "#F59E0B",
  goldBright: "#FCD34D",
  goldGlow: "rgba(245,158,11,0.45)",
  // Surface
  deepNavy: "#0A1628",
  deepNavyLight: "#0F2040",
  // Text
  textPrimary: "#F0F9FF",
  textSecondary: "rgba(240,249,255,0.82)",
  captionBg: "rgba(2,5,12,0.92)",
  badgeBorder: "#F59E0B",
};

// Hook scene
export const HOOK_TEXT = "AI JUST WON\nTHE MATH\nOLYMPICS";
export const HOOK_BADGE_TEXT = "GOLD MEDAL";

// CTA
export const CTA_TEXT = "Did you know? \uD83E\uDD16";
export const CHANNEL_TAG = "@aifactsunlocked";

// Fallback scene durations (frames) — overridden by audio manifest
// Fast pace: tighter cuts
export const DEFAULT_SCENE_FRAMES = {
  scene1: 75,   // ~2.5s hook
  scene2: 240,  // ~8s body
  scene3: 150,  // ~5s body cont
  scene4: 60,   // ~2s CTA
};
