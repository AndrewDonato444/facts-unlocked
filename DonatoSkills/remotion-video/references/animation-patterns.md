# Animation Patterns Reference

Copy-paste recipes for common social media video animations. All examples assume 30fps.

## Table of Contents

1. [Text Animations](#text-animations)
2. [Scene Transitions](#scene-transitions)
3. [Layout Patterns](#layout-patterns)
4. [Number & Data Animations](#number--data-animations)
5. [Image Animations](#image-animations)
6. [Logo Animations](#logo-animations)
7. [Utility Components](#utility-components)

---

## Text Animations

### Pop-In (Spring)

Text scales up from 0 with a bouncy spring. Best for headlines and single words.

```tsx
const PopInText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const opacity = interpolate(frame - delay, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div style={{
      transform: `scale(${scale})`,
      opacity,
      fontSize: 72,
      fontWeight: 800,
      textAlign: "center",
    }}>
      {text}
    </div>
  );
};
```

### Slide Up + Fade

Text slides up from below while fading in. Clean and professional.

```tsx
const SlideUpText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const translateY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div style={{
      transform: `translateY(${translateY}px)`,
      opacity,
      fontSize: 56,
      fontWeight: 700,
    }}>
      {text}
    </div>
  );
};
```

### Word-by-Word Reveal

Each word appears individually with staggered timing. High energy, great for hooks.

```tsx
const WordByWord: React.FC<{ text: string; startFrame?: number; framesPerWord?: number }> = ({
  text,
  startFrame = 0,
  framesPerWord = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
      {words.map((word, i) => {
        const wordDelay = startFrame + i * framesPerWord;
        const scale = spring({
          frame: frame - wordDelay,
          fps,
          config: { damping: 10, stiffness: 300, mass: 0.4 },
        });
        const opacity = interpolate(frame - wordDelay, [0, 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <span key={i} style={{
            transform: `scale(${scale})`,
            opacity,
            fontSize: 80,
            fontWeight: 900,
            display: "inline-block",
          }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

### Typewriter

Characters appear one at a time with a blinking cursor.

```tsx
const Typewriter: React.FC<{ text: string; startFrame?: number; speed?: number }> = ({
  text,
  startFrame = 0,
  speed = 2, // frames per character
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(Math.floor(elapsed / speed), text.length);
  const showCursor = Math.floor(frame / 15) % 2 === 0; // blink every 0.5s

  return (
    <div style={{ fontFamily: "monospace", fontSize: 48, fontWeight: 600 }}>
      {text.slice(0, charsToShow)}
      <span style={{ opacity: showCursor ? 1 : 0 }}>|</span>
    </div>
  );
};
```

### Glitch Text

Text glitches in with random offset copies. Edgy, modern feel.

```tsx
const GlitchText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - delay;
  if (elapsed < 0) return null;

  const glitchIntensity = interpolate(elapsed, [0, 10, 15], [20, 5, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(elapsed, [0, 5], [0, 1], { extrapolateRight: "clamp" });

  // Deterministic "random" offset based on frame
  const offsetX = Math.sin(elapsed * 13.7) * glitchIntensity;
  const offsetY = Math.cos(elapsed * 7.3) * glitchIntensity;

  return (
    <div style={{ position: "relative", opacity }}>
      {/* Red channel offset */}
      <div style={{
        position: "absolute",
        color: "rgba(255,0,0,0.7)",
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        fontSize: 72, fontWeight: 900,
      }}>
        {text}
      </div>
      {/* Blue channel offset */}
      <div style={{
        position: "absolute",
        color: "rgba(0,0,255,0.7)",
        transform: `translate(${-offsetX}px, ${-offsetY}px)`,
        fontSize: 72, fontWeight: 900,
      }}>
        {text}
      </div>
      {/* Main text */}
      <div style={{ position: "relative", fontSize: 72, fontWeight: 900 }}>
        {text}
      </div>
    </div>
  );
};
```

### Highlight / Underline Draw

Text appears, then an underline or highlight animates across it.

```tsx
const HighlightText: React.FC<{
  text: string;
  highlightColor?: string;
  delay?: number;
}> = ({ text, highlightColor = "#FFE500", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textOpacity = interpolate(frame - delay, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const highlightWidth = spring({
    frame: frame - delay - 10,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <div style={{ position: "relative", display: "inline-block", opacity: textOpacity }}>
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: `${highlightWidth * 100}%`,
        height: "30%",
        backgroundColor: highlightColor,
        opacity: 0.4,
        zIndex: -1,
      }} />
      <span style={{ fontSize: 64, fontWeight: 800 }}>{text}</span>
    </div>
  );
};
```

---

## Scene Transitions

### Fade Through Color

Fade out to a solid color, then fade in the next scene. Classic and clean.

```tsx
const FadeTransition: React.FC<{
  children: React.ReactNode;
  transitionStart: number;
  duration?: number;
  color?: string;
}> = ({ children, transitionStart, duration = 15, color = "#000" }) => {
  const frame = useCurrentFrame();
  const half = duration / 2;

  const overlay = interpolate(
    frame,
    [transitionStart, transitionStart + half, transitionStart + half, transitionStart + duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      {children}
      <AbsoluteFill style={{ backgroundColor: color, opacity: overlay }} />
    </>
  );
};
```

### Wipe (Directional)

A solid color block wipes across the screen revealing the next scene.

```tsx
const WipeTransition: React.FC<{
  direction?: "left" | "right" | "up" | "down";
  triggerFrame: number;
  duration?: number;
  color?: string;
}> = ({ direction = "left", triggerFrame, duration = 15, color = "#000" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - triggerFrame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const transforms: Record<string, string> = {
    left: `translateX(${interpolate(progress, [0, 1], [-100, 0])}%)`,
    right: `translateX(${interpolate(progress, [0, 1], [100, 0])}%)`,
    up: `translateY(${interpolate(progress, [0, 1], [-100, 0])}%)`,
    down: `translateY(${interpolate(progress, [0, 1], [100, 0])}%)`,
  };

  return (
    <AbsoluteFill style={{
      backgroundColor: color,
      transform: transforms[direction],
    }} />
  );
};
```

### Zoom Transition

Current scene zooms in and fades, revealing next scene.

```tsx
const ZoomOut: React.FC<{
  children: React.ReactNode;
  exitFrame: number;
  duration?: number;
}> = ({ children, exitFrame, duration = 15 }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [exitFrame, exitFrame + duration], [1, 1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [exitFrame, exitFrame + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>
      {children}
    </AbsoluteFill>
  );
};
```

---

## Layout Patterns

### Centered Stack

Most common layout for text videos. Content centered vertically and horizontally.

```tsx
<AbsoluteFill style={{
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: 80, // safe zone padding
}}>
  {/* content */}
</AbsoluteFill>
```

### Split Screen (Horizontal)

Two halves, great for before/after or comparison.

```tsx
<AbsoluteFill style={{ display: "flex", flexDirection: "row" }}>
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {/* Left content */}
  </div>
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {/* Right content */}
  </div>
</AbsoluteFill>
```

### Card Layout

Content in a floating card over a background. Premium feel.

```tsx
const Card: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - delay, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        padding: "48px 64px",
        maxWidth: "85%",
        transform: `scale(${scale})`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Number & Data Animations

### Counting Number

Animates from 0 to a target number. Great for stats and metrics.

```tsx
const CountUp: React.FC<{
  target: number;
  startFrame?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}> = ({ target, startFrame = 0, duration = 30, prefix = "", suffix = "" }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  const progress = interpolate(elapsed, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    // Ease out for a satisfying deceleration
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const value = Math.round(progress * target);

  return (
    <div style={{ fontSize: 96, fontWeight: 900, textAlign: "center" }}>
      {prefix}{value.toLocaleString()}{suffix}
    </div>
  );
};
```

### Progress Bar

Animated horizontal bar that fills to a percentage.

```tsx
const ProgressBar: React.FC<{
  percentage: number;
  label: string;
  color: string;
  delay?: number;
}> = ({ percentage, label, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const width = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  return (
    <div style={{ width: "80%", marginBottom: 24 }}>
      <div style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{
        height: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${width * percentage}%`,
          backgroundColor: color,
          borderRadius: 12,
        }} />
      </div>
    </div>
  );
};
```

---

## Image Animations

### Ken Burns Background (Full-Featured)

Configurable Ken Burns effect for AI-generated or user-provided background images. Supports zoom-in, zoom-out, pan directions, and combinations. Use as a drop-in scene background layer.

```tsx
type KenBurnsDirection =
  | "zoom-in"      // 1.0 → 1.15 (subtle zoom toward center)
  | "zoom-out"     // 1.15 → 1.0 (pull back)
  | "pan-left"     // image slides right-to-left
  | "pan-right"    // image slides left-to-right
  | "pan-up"       // image slides down-to-up
  | "pan-down"     // image slides up-to-down
  | "zoom-in-left" // zoom + pan combo
  | "zoom-in-right"
  | "zoom-out-up"
  | "zoom-out-down";

interface KenBurnsBackgroundProps {
  src: string;                       // staticFile() path or URL
  direction?: KenBurnsDirection;     // default: "zoom-in"
  intensity?: number;                // 0-1, default 0.15 (how far to zoom/pan)
  overlay?: string;                  // dark overlay for text legibility, e.g. "rgba(0,0,0,0.4)"
}

const KenBurnsBackground: React.FC<KenBurnsBackgroundProps> = ({
  src,
  direction = "zoom-in",
  intensity = 0.15,
  overlay = "rgba(0,0,0,0.35)",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Calculate transform based on direction
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  const panAmount = intensity * 100; // pixels as percentage

  switch (direction) {
    case "zoom-in":
      scale = 1 + progress * intensity;
      break;
    case "zoom-out":
      scale = 1 + intensity - progress * intensity;
      break;
    case "pan-left":
      scale = 1 + intensity; // slight zoom to avoid edges
      translateX = interpolate(progress, [0, 1], [panAmount / 2, -panAmount / 2]);
      break;
    case "pan-right":
      scale = 1 + intensity;
      translateX = interpolate(progress, [0, 1], [-panAmount / 2, panAmount / 2]);
      break;
    case "pan-up":
      scale = 1 + intensity;
      translateY = interpolate(progress, [0, 1], [panAmount / 2, -panAmount / 2]);
      break;
    case "pan-down":
      scale = 1 + intensity;
      translateY = interpolate(progress, [0, 1], [-panAmount / 2, panAmount / 2]);
      break;
    case "zoom-in-left":
      scale = 1 + progress * intensity;
      translateX = interpolate(progress, [0, 1], [0, -panAmount / 3]);
      break;
    case "zoom-in-right":
      scale = 1 + progress * intensity;
      translateX = interpolate(progress, [0, 1], [0, panAmount / 3]);
      break;
    case "zoom-out-up":
      scale = 1 + intensity - progress * intensity;
      translateY = interpolate(progress, [0, 1], [0, -panAmount / 3]);
      break;
    case "zoom-out-down":
      scale = 1 + intensity - progress * intensity;
      translateY = interpolate(progress, [0, 1], [0, panAmount / 3]);
      break;
  }

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        }}
      />
      {overlay && (
        <AbsoluteFill style={{ backgroundColor: overlay }} />
      )}
    </AbsoluteFill>
  );
};
```

**Usage — alternate directions per scene for visual variety:**

```tsx
// Scene 1: slow zoom in
<KenBurnsBackground src={staticFile("generated/scene-1-bg.png")} direction="zoom-in" />

// Scene 2: pan left
<KenBurnsBackground src={staticFile("generated/scene-2-bg.png")} direction="pan-left" />

// Scene 3: zoom out with upward drift
<KenBurnsBackground src={staticFile("generated/scene-3-bg.png")} direction="zoom-out-up" />
```

**Recommended direction cycling for multi-scene videos:**
- 3 scenes: `zoom-in` → `pan-left` → `zoom-out`
- 4 scenes: `zoom-in` → `pan-right` → `zoom-in-left` → `zoom-out`
- 5+ scenes: alternate between zoom and pan variants, never repeat consecutive

### Ken Burns (Simple — Zoom Only)

Minimal version if you just need a slow zoom. For full directional control, use `KenBurnsBackground` above.

```tsx
const KenBurns: React.FC<{ src: string; durationInFrames: number }> = ({ src, durationInFrames }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.15], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};
```

### Image Reveal (Clip)

Image is revealed by an expanding clip rectangle.

```tsx
const ImageReveal: React.FC<{ src: string; delay?: number }> = ({ src, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  return (
    <div style={{
      overflow: "hidden",
      width: "80%",
      height: "60%",
      borderRadius: 16,
      clipPath: `inset(${(1 - reveal) * 50}% 0)`,
    }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};
```

---

## Logo Animations

### Logo Fade + Scale (End Card)

Standard logo reveal for the final scene.

```tsx
const LogoReveal: React.FC<{ logoSrc: string; delay?: number }> = ({ logoSrc, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Img
        src={logoSrc}
        style={{
          width: 200,
          height: 200,
          objectFit: "contain",
          transform: `scale(${scale})`,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
```

### Logo Watermark

Small persistent logo in a corner.

```tsx
const Watermark: React.FC<{
  logoSrc: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}> = ({ logoSrc, position = "bottom-right" }) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    "top-left": { top: 40, left: 40 },
    "top-right": { top: 40, right: 40 },
    "bottom-left": { bottom: 40, left: 40 },
    "bottom-right": { bottom: 40, right: 40 },
  };

  return (
    <div style={{
      position: "absolute",
      ...positionStyles[position],
      opacity: 0.7,
    }}>
      <Img src={logoSrc} style={{ width: 80, height: 80, objectFit: "contain" }} />
    </div>
  );
};
```

---

## Utility Components

### Gradient Background

Animated gradient that slowly shifts. Adds life to any scene.

```tsx
const GradientBG: React.FC<{
  colors: [string, string];
  angle?: number;
  animate?: boolean;
}> = ({ colors, angle = 135, animate = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const rotation = animate
    ? interpolate(frame, [0, durationInFrames], [angle, angle + 30])
    : angle;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${rotation}deg, ${colors[0]}, ${colors[1]})`,
    }} />
  );
};
```

### Particle / Dot Background

Floating dots/circles for visual texture.

```tsx
const ParticleBG: React.FC<{ count?: number; color?: string }> = ({
  count = 20,
  color = "rgba(255,255,255,0.1)",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Deterministic positions based on index
  const particles = Array.from({ length: count }, (_, i) => {
    const x = ((i * 137.5) % width);
    const baseY = ((i * 97.3) % height);
    const y = baseY + Math.sin(frame * 0.02 + i) * 30;
    const size = 4 + (i % 3) * 4;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
    );
  });

  return <AbsoluteFill>{particles}</AbsoluteFill>;
};
```

### Scene Background (Mode Switcher)

Drop-in background layer that switches between gradient, AI-generated (with Ken Burns), or static image modes. Use this in every scene component — it makes swapping background modes trivial.

```tsx
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type BackgroundMode =
  | { type: "gradient"; colors: [string, string]; angle?: number }
  | { type: "ai-generated"; asset: string; kenBurns?: KenBurnsDirection; intensity?: number; overlay?: string }
  | { type: "image"; src: string; kenBurns?: KenBurnsDirection; intensity?: number; overlay?: string }
  | { type: "solid"; color: string };

const SceneBackground: React.FC<{ mode: BackgroundMode }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  switch (mode.type) {
    case "gradient": {
      const rotation = interpolate(frame, [0, durationInFrames], [mode.angle ?? 135, (mode.angle ?? 135) + 30]);
      return (
        <AbsoluteFill style={{
          background: `linear-gradient(${rotation}deg, ${mode.colors[0]}, ${mode.colors[1]})`,
        }} />
      );
    }
    case "ai-generated":
    case "image": {
      const src = mode.type === "ai-generated"
        ? staticFile(`generated/${mode.asset}.png`)
        : mode.src;
      // If no Ken Burns, just show static image
      if (!mode.kenBurns) {
        return (
          <AbsoluteFill>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {mode.overlay && <AbsoluteFill style={{ backgroundColor: mode.overlay }} />}
          </AbsoluteFill>
        );
      }
      // Delegate to KenBurnsBackground for animated version
      return <KenBurnsBackground src={src} direction={mode.kenBurns} intensity={mode.intensity} overlay={mode.overlay} />;
    }
    case "solid":
      return <AbsoluteFill style={{ backgroundColor: mode.color }} />;
  }
};
```

**Usage in scene components:**

```tsx
// Text-only mode — gradient background
<SceneBackground mode={{ type: "gradient", colors: ["#0A0A0A", "#1a1a2e"] }} />

// AI-generated mode — Gemini image with Ken Burns
<SceneBackground mode={{
  type: "ai-generated",
  asset: "scene-1-bg",
  kenBurns: "zoom-in",
  overlay: "rgba(0,0,0,0.4)",
}} />

// AI-generated mode — no Ken Burns (static image)
<SceneBackground mode={{
  type: "ai-generated",
  asset: "scene-2-bg",
  overlay: "rgba(0,0,0,0.3)",
}} />

// User-provided image with pan
<SceneBackground mode={{
  type: "image",
  src: staticFile("user-photo.jpg"),
  kenBurns: "pan-left",
}} />
```

**Pattern for making background mode configurable per scene:**

```tsx
// In constants.ts — define background config per scene
export const SCENE_BACKGROUNDS: BackgroundMode[] = [
  { type: "ai-generated", asset: "scene-1-bg", kenBurns: "zoom-in", overlay: "rgba(0,0,0,0.4)" },
  { type: "ai-generated", asset: "scene-2-bg", kenBurns: "pan-left", overlay: "rgba(0,0,0,0.35)" },
  { type: "ai-generated", asset: "scene-3-bg", kenBurns: "zoom-out", overlay: "rgba(0,0,0,0.4)" },
];

// In each scene component — just read from the config
const Scene1: React.FC = () => {
  return (
    <AbsoluteFill>
      <SceneBackground mode={SCENE_BACKGROUNDS[0]} />
      {/* Text content on top */}
    </AbsoluteFill>
  );
};
```

---

### Safe Zone Overlay (Development Only)

Shows the safe zone boundaries during development. Remove before final render.

```tsx
const SafeZone: React.FC = () => {
  const { width, height } = useVideoConfig();
  const margin = 0.05; // 5% on each side = 90% safe zone

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        top: height * margin,
        left: width * margin,
        right: width * margin,
        bottom: height * margin,
        border: "2px dashed rgba(255,0,0,0.3)",
        borderRadius: 8,
      }} />
    </AbsoluteFill>
  );
};
```
