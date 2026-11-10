import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BridgeInfo, PALETTE } from "../lib/data";
import { FONT_BODY, FONT_TITLE, TITLE_SPACING, TITLE_WEIGHT } from "../theme/fonts";

/** Gaya teks judul, satu sumber dari src/theme/fonts.ts. */
export const titleFont: React.CSSProperties = {
  fontFamily: FONT_TITLE,
  fontWeight: TITLE_WEIGHT,
  letterSpacing: `${TITLE_SPACING}em`,
};

export const measureTitle = (text: string, size: number) => {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `${TITLE_WEIGHT} ${size}px ${FONT_TITLE}`;
  return ctx.measureText(text).width + text.length * TITLE_SPACING * size;
};

const SHADOW = "0 6px 44px rgba(3,14,32,.62), 0 2px 8px rgba(3,14,32,.55)";

export const Reveal: React.FC<{
  at: number;
  until?: number;
  rise?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, until, rise = 60, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.8 } });
  const out = until === undefined ? 1 : interpolate(frame, [until - 14, until], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity: Math.min(s, out),
        transform: `translateY(${(1 - s) * rise}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Judul memakai font judul; `body` untuk teks isi. */
export const Heading: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  body?: boolean;
  style?: React.CSSProperties;
}> = ({ children, size = 96, color = PALETTE.white, body, style }) => (
  <div
    style={{
      ...(body ? { fontFamily: FONT_BODY, fontWeight: 600 } : titleFont),
      fontSize: size,
      color,
      lineHeight: 1.16,
      textShadow: SHADOW,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Counter: React.FC<{
  at: number;
  value: number;
  prefix?: string;
  suffix: string;
  frames?: number;
}> = ({ at, value, prefix = "", suffix, frames = 28 }) => {
  const frame = useCurrentFrame();
  const n = Math.round(
    interpolate(frame, [at, at + frames], [0, value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <Reveal at={at} rise={40}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "42px 64px",
          minWidth: 620,
          background: "rgba(11,37,69,.66)",
          borderTop: `8px solid ${PALETTE.teal}`,
          borderRadius: 20,
        }}
      >
        <span
          style={{
            ...titleFont,
            fontSize: 138,
            lineHeight: 1,
            color: PALETTE.white,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {prefix}
          {n}
        </span>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 54,
            marginTop: 14,
            color: PALETTE.gold,
          }}
        >
          {suffix}
        </span>
      </div>
    </Reveal>
  );
};

/** Kartu info jembatan dengan perspektif 3D, masuk dan keluar sambil berputar. */
export const InfoCard3D: React.FC<{
  info: BridgeInfo;
  at: number;
  until: number;
}> = ({ info, at, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at || frame > until) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 16, mass: 0.9 } });
  const out = interpolate(frame, [until - 16, until], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = interpolate(frame, [at, until], [-2.5, 2.5]);
  return (
    <div style={{ position: "absolute", left: 170, bottom: 330, perspective: 2600 }}>
      <div
        style={{
          width: 1500,
          padding: "60px 76px",
          borderRadius: 30,
          background: "linear-gradient(135deg, rgba(11,37,69,.88), rgba(11,37,69,.62))",
          borderLeft: `14px solid ${PALETTE.teal}`,
          boxShadow: "0 40px 120px rgba(2,10,26,.5)",
          opacity: Math.min(s, 1 - out),
          transformOrigin: "left center",
          transform: `rotateY(${(1 - s) * -58 + out * 42 + drift + 9}deg) rotateX(2deg) translateX(${(1 - s) * -180 - out * 150}px)`,
        }}
      >
        <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 46, color: PALETTE.teal, letterSpacing: 7 }}>
          JEMBATAN {info.no}
        </div>
        <div style={{ ...titleFont, fontSize: 112, lineHeight: 1.12, color: PALETTE.white, marginTop: 12 }}>
          {info.name}
        </div>
        <div style={{ display: "flex", gap: 70, alignItems: "baseline", marginTop: 26 }}>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 58, color: PALETTE.white }}>
            {info.from} – {info.to}
          </span>
          <span style={{ ...titleFont, fontSize: 88, color: PALETTE.gold }}>
            {info.length} m
          </span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 44, color: "#BFD4E6", marginTop: 12 }}>
          {info.kindLabel}
        </div>
      </div>
    </div>
  );
};

export type Cue = { text: string; from: number; to: number };

export const Subtitles: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const cue = cues.find((c) => frame >= c.from && frame < c.to);
  if (!cue) return null;
  const opacity = Math.min(
    interpolate(frame, [cue.from, cue.from + 5], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [cue.to - 5, cue.to], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 500,
          fontSize: 52,
          lineHeight: 1.35,
          maxWidth: 3000,
          textAlign: "center",
          color: PALETTE.white,
          opacity,
          background: "rgba(6,16,34,.55)",
          padding: "12px 30px",
          borderRadius: 12,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(2,8,22,.3) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("grain.png")})`,
          backgroundSize: "1024px 1024px",
          backgroundPosition: `${(frame * 197) % 1024}px ${(frame * 311) % 1024}px`,
          opacity: 0.06,
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
};
