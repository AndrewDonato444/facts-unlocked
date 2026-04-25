// AI Facts Unlocked — 007-ai-radiation-therapy
// Platform: YouTube/Instagram (1080x1920, 9:16, 30fps)
// Hook: "AI MATCHES RADIATION EXPERTS IN MINUTES"
// Hook type: what_if
// TTS: Gemini/Kore | Images: Grok grok-imagine-image | Overlay: full_captions
// Style: deep space black with electric blue/cyan accents

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const BUFFER_FRAMES = 9;

// Deep space black + electric blue/cyan — AI, precision medicine, tech
export const COLORS = {
  background: "#030810",
  overlay: "rgba(3,8,16,0.50)",
  overlayDark: "rgba(2,5,12,0.65)",
  overlayLight: "rgba(3,8,16,0.38)",
  // Electric blue accent — AI, precision, technology
  blue: "#0EA5E9",
  blueBright: "#38BDF8",
  blueDim: "#0284C7",
  blueGlow: "rgba(14,165,233,0.40)",
  // Cyan accent — medical precision, accuracy
  cyan: "#06B6D4",
  cyanBright: "#22D3EE",
  cyanDim: "#0891B2",
  cyanGlow: "rgba(6,182,212,0.38)",
  // Surface
  deepNavy: "#0A1628",
  deepNavyLight: "#0F2040",
  // Text
  textPrimary: "#F0F9FF",
  textSecondary: "rgba(240,249,255,0.82)",
  captionBg: "rgba(2,5,12,0.92)",
  badgeBorder: "#0EA5E9",
};

// Hook scene
export const HOOK_TEXT = "AI MATCHES\nRADIATION EXPERTS\nIN MINUTES";
export const HOOK_BADGE_TEXT = "99.8% PRECISION";

// CTA
export const CTA_TEXT = "Did you know? \uD83E\uDD16";
export const CHANNEL_TAG = "@aifactsunlocked";

// Fallback scene durations (frames) — overridden by audio manifest at runtime
export const DEFAULT_SCENE_FRAMES = {
  scene1: 90,   // ~3s hook
  scene2: 270,  // ~9s body
  scene3: 150,  // ~5s body cont
  scene4: 75,   // ~2.5s CTA
};
