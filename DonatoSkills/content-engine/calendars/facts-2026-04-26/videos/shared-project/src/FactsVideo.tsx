/**
 * Generic facts video composition.
 * Parameterized by VideoConfig — all 7 remaining videos use this.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { SharedBackground } from "./components/SharedBackground";
import { VideoConfig, PALETTES } from "./videos-config";

// Manifest is loaded at render time per-video
interface Manifest {
  hook: { file: string; durationSec: number };
  body: { file: string; durationSec: number };
  cta:  { file: string; durationSec: number };
}

interface FactsVideoProps {
  videoId: string;
  config: VideoConfig;
  manifest: Manifest;
}

const fps = 30;
const BUFFER = Math.ceil(0.3 * fps); // 9 frames gap

export function getFrames(manifest: Manifest) {
  const hookFrames = Math.ceil(manifest.hook.durationSec * fps) + BUFFER;
  const bodyFrames = Math.ceil(manifest.body.durationSec * fps) + BUFFER;
  const ctaFrames  = Math.ceil(manifest.cta.durationSec  * fps) + BUFFER;
  const total = hookFrames + bodyFrames + ctaFrames;
  return { hookFrames, bodyFrames, ctaFrames, total };
}

export const FactsVideo: React.FC<FactsVideoProps> = ({ videoId, config, manifest }) => {
  const frame = useCurrentFrame();
  const palette = PALETTES[config.bgPalette];
  const { hookFrames, bodyFrames, ctaFrames } = getFrames(manifest);

  const openFade = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const bgVariant = config.hookType === "controversy" ? "tense" : config.hookType === "did_you_know" ? "pulse" : "calm";

  return (
    <AbsoluteFill style={{ opacity: openFade, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      <SharedBackground palette={palette} variant={bgVariant} />

      {/* HOOK */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <Audio src={staticFile(`audio/${videoId}/hook.wav`)} />
        <HookScene config={config} palette={palette} />
      </Sequence>

      {/* BODY */}
      <Sequence from={hookFrames} durationInFrames={bodyFrames}>
        <Audio src={staticFile(`audio/${videoId}/body.wav`)} />
        <BodyScene config={config} palette={palette} />
      </Sequence>

      {/* CTA */}
      <Sequence from={hookFrames + bodyFrames} durationInFrames={ctaFrames}>
        <Audio src={staticFile(`audio/${videoId}/cta.wav`)} />
        <CTAScene config={config} palette={palette} />
      </Sequence>

      {/* Brand tag — always visible */}
      <Sequence from={15} durationInFrames={hookFrames + bodyFrames + ctaFrames - 15}>
        <BrandTag project={config.project} palette={palette} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── Hook Scene ─────────────────────────────────────────────────

const HookScene: React.FC<{ config: VideoConfig; palette: typeof PALETTES["purple"] }> = ({ config, palette }) => {
  const frame = useCurrentFrame();
  const lines = config.hookText;

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", top: "18%", left: 0, right: 0,
        padding: "0 60px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 12,
      }}>
        {/* Hook type badge */}
        <div style={{
          color: palette.accent, fontSize: 30, fontWeight: "700",
          letterSpacing: "0.12em", textTransform: "uppercase",
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {config.hookType.replace(/_/g, " ")}
        </div>

        {/* Hook lines — staggered reveal */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          {lines.map((line, i) => {
            const delay = i * 8;
            const lf = Math.max(0, frame - delay);
            const opc = interpolate(lf, [0, 8], [0, 1], { extrapolateRight: "clamp" });
            const ty = interpolate(lf, [0, 12], [22, 0], { extrapolateRight: "clamp" });
            const sc = spring({ frame: lf, fps, config: { damping: 14, stiffness: 120 } });
            return (
              <div key={i} style={{
                opacity: opc,
                transform: `translateY(${ty}px) scale(${0.92 + sc * 0.08})`,
                fontSize: 70, fontWeight: "900", color: "#fff",
                lineHeight: 1.15, letterSpacing: "-0.02em",
              }}>
                {line}
              </div>
            );
          })}
        </div>

        {/* Accent underline */}
        <div style={{
          marginTop: 24, width: interpolate(frame, [lines.length * 8, lines.length * 8 + 20], [0, 200], { extrapolateRight: "clamp" }),
          height: 4, borderRadius: 2, background: palette.accent,
        }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Body Scene ─────────────────────────────────────────────────

const BodyScene: React.FC<{ config: VideoConfig; palette: typeof PALETTES["purple"] }> = ({ config, palette }) => {
  const frame = useCurrentFrame();
  const facts = config.facts;
  // Spread facts across body duration estimate (~20 frames apart)
  const gapFrames = Math.max(18, Math.floor(300 / facts.length));

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", top: "12%", left: 0, right: 0, bottom: "12%",
        padding: "0 60px", display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 28,
      }}>
        {facts.map((fact, i) => {
          const delay = i * gapFrames;
          const lf = Math.max(0, frame - delay);
          const opc = interpolate(lf, [0, 10], [0, 1], { extrapolateRight: "clamp" });
          const ty = interpolate(lf, [0, 12], [20, 0], { extrapolateRight: "clamp" });
          const isActive = frame >= delay + 4;

          return (
            <div key={i} style={{
              opacity: opc, transform: `translateY(${ty}px)`,
              display: "flex", alignItems: "flex-start", gap: 20,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 16,
                background: isActive ? palette.accent : "rgba(255,255,255,0.3)",
                boxShadow: isActive ? `0 0 12px ${palette.accent}88` : "none",
                transition: "background 0.2s",
              }} />
              <div style={{
                fontSize: 42, fontWeight: "700", color: "#fff",
                lineHeight: 1.3, whiteSpace: "pre-line",
              }}>
                {fact}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── CTA Scene ──────────────────────────────────────────────────

const CTAScene: React.FC<{ config: VideoConfig; palette: typeof PALETTES["purple"] }> = ({ config, palette }) => {
  const frame = useCurrentFrame();
  const opc = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", top: "25%", left: 0, right: 0,
        padding: "0 64px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 40, opacity: opc,
      }}>
        <div style={{
          fontSize: 52, fontWeight: "700", color: palette.textHigh,
          textAlign: "center", lineHeight: 1.3,
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [0, 10], [20, 0], { extrapolateRight: "clamp" })}px)`,
        }}>
          {config.project === "baby-facts-unlocked"
            ? "Follow for more baby facts"
            : config.project === "money-facts-unlocked"
            ? "Follow for more money facts"
            : "Follow for more AI facts"}
        </div>

        {/* Follow CTA pill */}
        <div style={{
          background: palette.accent,
          borderRadius: 999, padding: "20px 52px",
          opacity: interpolate(frame, [16, 28], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${spring({ frame: Math.max(0, frame - 16), fps, config: { damping: 14, stiffness: 120 } })})`,
        }}>
          <div style={{ color: "#fff", fontSize: 42, fontWeight: "800" }}>
            Follow @{
              config.project === "baby-facts-unlocked" ? "babyfactsunlocked" :
              config.project === "money-facts-unlocked" ? "moneyfactsunlocked" :
              "aifactsunlocked"
            }
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Brand Tag ──────────────────────────────────────────────────

const BrandTag: React.FC<{ project: VideoConfig["project"]; palette: typeof PALETTES["purple"] }> = ({ project, palette }) => {
  const frame = useCurrentFrame();
  const opc = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const handle =
    project === "baby-facts-unlocked" ? "@babyfactsunlocked" :
    project === "money-facts-unlocked" ? "@moneyfactsunlocked" :
    "@aifactsunlocked";

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 0, right: 0,
      display: "flex", justifyContent: "center", opacity: opc,
    }}>
      <div style={{
        background: `${palette.accent}28`, borderRadius: 999,
        padding: "12px 32px", border: `1px solid ${palette.accent}44`,
      }}>
        <div style={{ color: palette.accent, fontSize: 28, fontWeight: "700", letterSpacing: "0.06em" }}>
          {handle}
        </div>
      </div>
    </div>
  );
};
