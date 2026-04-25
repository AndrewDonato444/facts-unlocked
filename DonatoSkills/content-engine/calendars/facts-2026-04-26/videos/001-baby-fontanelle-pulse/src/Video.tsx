import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
} from "remotion";
import { AbstractBackground } from "./components/AbstractBackground";
import { AnimatedText, KaraokeText } from "./components/AnimatedText";
import manifestData from "../public/audio/manifest.json";
import { COLORS } from "./lib/constants";

const fps = 30;
const BUFFER = Math.ceil(0.25 * fps); // 7 frames gap

// Derive scene timing from audio manifest
const hookDur = Math.ceil(manifestData["scene-1-hook"].durationSec * fps) + BUFFER;
const bodyDur = Math.ceil(manifestData["scene-2-body"].durationSec * fps) + BUFFER;
const ctaDur = Math.ceil(manifestData["scene-3-cta"].durationSec * fps) + BUFFER;

const hookStart = 0;
const bodyStart = hookDur;
const ctaStart = hookDur + bodyDur;

// Hook screen words for karaoke
const hookWords = "YOUR BABY'S SKULL HAS A WINDOW WHERE YOU CAN WATCH THEIR HEARTBEAT".split(" ");

export const BabyFontanelleVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in on open
  const openFade = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: openFade, fontFamily: "'Inter', sans-serif" }}>
      <AbstractBackground />

      {/* HOOK SCENE */}
      <Sequence from={hookStart} durationInFrames={hookDur}>
        <Audio src={staticFile("audio/scene-1-hook.wav")} />
        <HookScene startFrame={hookStart} />
      </Sequence>

      {/* BODY SCENE */}
      <Sequence from={bodyStart} durationInFrames={bodyDur}>
        <Audio src={staticFile("audio/scene-2-body.wav")} />
        <BodyScene startFrame={0} />
      </Sequence>

      {/* CTA SCENE */}
      <Sequence from={ctaStart} durationInFrames={ctaDur}>
        <Audio src={staticFile("audio/scene-3-cta.wav")} />
        <CTAScene startFrame={0} />
      </Sequence>

      {/* Channel branding — bottom */}
      <Sequence from={20} durationInFrames={hookDur + bodyDur + ctaDur - 20}>
        <BrandTag />
      </Sequence>
    </AbsoluteFill>
  );
};

const HookScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* Large hook text centered */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: 0,
          right: 0,
          padding: "0 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Eyebrow */}
        <AnimatedText
          text="DID YOU KNOW?"
          startFrame={0}
          fontSize={32}
          color={COLORS.accent}
          fontWeight="700"
          style={{ letterSpacing: "0.12em" }}
        />

        {/* Main hook — karaoke */}
        <div style={{ marginTop: 24, width: "100%" }}>
          <KaraokeText
            words={hookWords}
            startFrame={10}
            framesPerWord={7}
            fontSize={68}
            highlightColor={COLORS.accent}
          />
        </div>
      </div>

      {/* Pulsing heart indicator */}
      <PulseIndicator />
    </AbsoluteFill>
  );
};

const PulseIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  // Simulate heartbeat double-pulse every ~33 frames (1.1s)
  const beatCycle = frame % 33;
  const pulse1 = beatCycle < 5 ? interpolate(beatCycle, [0, 2, 5], [0, 1, 0]) : 0;
  const pulse2 = beatCycle >= 8 && beatCycle < 14 ? interpolate(beatCycle - 8, [0, 2, 6], [0, 0.7, 0]) : 0;
  const pulseVal = Math.max(pulse1, pulse2);
  const scale = 1 + pulseVal * 0.3;
  const glow = pulseVal * 40;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "28%",
        left: "50%",
        transform: `translateX(-50%) scale(${scale})`,
        width: 80,
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        filter: `drop-shadow(0 0 ${glow}px ${COLORS.accent})`,
      }}
    >
      🫀
    </div>
  );
};

const BodyScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  const facts = [
    { text: "Two soft spots where\nskull bones aren't fused yet", delay: 0 },
    { text: "The anterior fontanelle\npulses with EVERY heartbeat", delay: 60 },
    { text: "Birth: skull plates compress\nto fit through the birth canal", delay: 180 },
    { text: "Year 1: brain TRIPLES in size\nthe gaps allow expansion", delay: 330 },
    { text: "Closes at 12–18 months —\nexactly when growth slows", delay: 480 },
  ];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: 0,
          right: 0,
          bottom: "15%",
          padding: "0 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {facts.map((fact, i) => {
          const visible = frame >= fact.delay;
          const localF = Math.max(0, frame - fact.delay);
          const opacity = interpolate(localF, [0, 10], [0, 1], { extrapolateRight: "clamp" });
          const ty = interpolate(localF, [0, 12], [20, 0], { extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${ty}px)`,
                borderLeft: `4px solid ${COLORS.accent}`,
                paddingLeft: 24,
              }}
            >
              <div
                style={{
                  color: "#fff",
                  fontSize: 44,
                  fontWeight: "700",
                  lineHeight: 1.35,
                  whiteSpace: "pre-line",
                }}
              >
                {fact.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CTAScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: 0,
          right: 0,
          padding: "0 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          opacity,
        }}
      >
        <AnimatedText
          text="That pulsing soft spot?"
          startFrame={0}
          fontSize={52}
          color={COLORS.accentWarm}
          fontWeight="700"
        />
        <AnimatedText
          text="That's your baby's heartbeat —\nvisible through the skull."
          startFrame={8}
          fontSize={58}
          color="#fff"
          fontWeight="800"
          style={{ whiteSpace: "pre-line", textAlign: "center" }}
        />
        <div
          style={{
            marginTop: 40,
            background: COLORS.accent,
            borderRadius: 999,
            padding: "20px 48px",
            opacity: interpolate(frame, [20, 32], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ color: "#fff", fontSize: 40, fontWeight: "800" }}>
            Follow for more baby facts
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BrandTag: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(199,125,255,0.18)",
          backdropFilter: "blur(10px)",
          borderRadius: 999,
          padding: "12px 32px",
          border: "1px solid rgba(199,125,255,0.3)",
        }}
      >
        <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: "700", letterSpacing: "0.06em" }}>
          @babyfactsunlocked
        </div>
      </div>
    </div>
  );
};
