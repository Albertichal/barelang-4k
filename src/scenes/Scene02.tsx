import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Ocean } from "../components/Ocean";
import { Heading, measureTitle, titleFont } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { BarelangWorld } from "../components/BarelangWorld";
import { CamKey, projectToScreen, sampleCam, withSway } from "../lib/camera";
import { PALETTE } from "../lib/data";
import { lerp } from "../lib/noise";
import { PRESETS } from "../lib/presets";
import { CHAIN_CENTER, ISLANDS, OCEAN_SHALLOWS } from "../lib/world";

const [cx, cz] = CHAIN_CENTER;
const KEYS: CamKey[] = [
  { t: 0, pos: [cx - 10800, 11200, cz - 900], look: [cx, 0, cz - 500], fov: 36 },
  { t: 0.5, pos: [cx - 9600, 9900, cz], look: [cx, 0, cz - 100], fov: 36 },
  { t: 1, pos: [cx - 8600, 9000, cz + 900], look: [cx, 0, cz + 300], fov: 36 },
];

const LABELS = [
  { island: 0, pre: "", hi: "BA", post: "tam", t: 0.05 },
  { island: 4, pre: "", hi: "RE", post: "mpang", t: 0.13 },
  { island: 5, pre: "Ga", hi: "LANG", post: "", t: 0.21 },
];
const LABEL_SIZE = 128;
const WORD_SIZE = 320;
const WORD_Y = 300;

export const Scene02: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const preset = PRESETS.day;
  const t = frame / (duration - 1);
  const cam = useMemo(() => withSway(sampleCam(KEYS, t), frame, 4), [t, frame]);

  const up = (t0: number, d = 0.08) =>
    interpolate(t, [t0, t0 + d], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const islandAppear = ISLANDS.map((_, i) => {
    const main = LABELS.find((l) => l.island === i);
    return main ? up(main.t) : up(0.62 + i * 0.012, 0.07);
  });
  const bridgeAppear = [0, 1, 2, 3, 4, 5].map((i) => up(0.7 + i * 0.035, 0.06));

  const widths = LABELS.map((l) => measureTitle(l.hi, WORD_SIZE));
  const wordW = widths.reduce((a, b) => a + b, 0);
  let cursor = (width - wordW) / 2;
  const targets = widths.map((w) => {
    const x = cursor;
    cursor += w;
    return x;
  });

  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam} fog={{ color: preset.fog.color, near: 16000, far: 60000 }}>
        <Ocean
          preset={preset}
          cam={cam}
          shallows={OCEAN_SHALLOWS.map((s, i) => [s[0], s[1], s[2] * islandAppear[i]] as [number, number, number])}
          fog={{ color: preset.fog.color, near: 16000, far: 60000 }}
        />
        <BarelangWorld cam={cam} islandAppear={islandAppear} bridgeAppear={bridgeAppear} />
      </Stage>
      <AbsoluteFill>
        {LABELS.map((l, i) => {
          const isl = ISLANDS[l.island];
          const s = projectToScreen(cam, [isl.c[0], 250, isl.c[1]], width, height);
          const preW = measureTitle(l.pre, LABEL_SIZE);
          const hiW = measureTitle(l.hi, LABEL_SIZE);
          const postW = measureTitle(l.post, LABEL_SIZE);
          const x0 = s.x - (preW + hiW + postW) / 2;
          const y0 = s.y - LABEL_SIZE / 2;
          const start = Math.round(duration * (0.43 + i * 0.03));
          const fly = spring({
            frame: frame - start,
            fps,
            durationInFrames: 34,
            config: { damping: 18, mass: 0.9 },
          });
          const pop = spring({
            frame: frame - Math.round(l.t * duration),
            fps,
            config: { damping: 14, mass: 0.7 },
          });
          const rest = 1 - interpolate(fly, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
          const common: React.CSSProperties = {
            position: "absolute",
            ...titleFont,
            lineHeight: 1,
            whiteSpace: "pre",
            textShadow: "0 6px 40px rgba(3,14,32,.72)",
          };
          return (
            <React.Fragment key={l.hi}>
              <div style={{ ...common, left: x0, top: y0, fontSize: LABEL_SIZE, color: PALETTE.white, opacity: pop * rest }}>
                {l.pre}
              </div>
              <div style={{ ...common, left: x0 + preW + hiW, top: y0, fontSize: LABEL_SIZE, color: PALETTE.white, opacity: pop * rest }}>
                {l.post}
              </div>
              <div
                style={{
                  ...common,
                  left: lerp(x0 + preW, targets[i], fly),
                  top: lerp(y0, WORD_Y, fly),
                  fontSize: lerp(LABEL_SIZE, WORD_SIZE, fly),
                  color: fly > 0.98 ? PALETTE.white : PALETTE.gold,
                  opacity: pop,
                }}
              >
                {l.hi}
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", top: WORD_Y + WORD_SIZE + 40, width: "100%", textAlign: "center", opacity: up(0.72, 0.06) }}>
          <Heading body size={76}>3 pulau besar · 6 jembatan</Heading>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
