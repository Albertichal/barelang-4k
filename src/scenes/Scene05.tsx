import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Ocean } from "../components/Ocean";
import { InfoCard3D } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { BarelangWorld } from "../components/BarelangWorld";
import { CamKey, V3, sampleCam, withSway } from "../lib/camera";
import { BRIDGES } from "../lib/data";
import { PRESETS } from "../lib/presets";
import { ISLANDS, OCEAN_SHALLOWS, PLACEMENTS, terrainAt } from "../lib/world";

const local = (i: number, [x, y, z]: V3): V3 => {
  const pl = PLACEMENTS[i];
  const c = Math.cos(pl.yaw);
  const s = Math.sin(pl.yaw);
  return [pl.mid[0] + x * c + z * s, y, pl.mid[1] - x * s + z * c];
};

const KEYS: CamKey[] = (() => {
  const keys: CamKey[] = [];
  PLACEMENTS.forEach((pl, i) => {
    const w = i / 6;
    const d = 1 / 6;
    const L = pl.length;
    const dist = L * 0.68 + 150;
    const y = pl.deckY + 34 + L * 0.06;
    const lookY = pl.deckY * 0.72;
    if (i === 0) {
      keys.push({ t: 0, pos: local(0, [-L * 0.9, y + 24, -dist * 1.15]), look: local(0, [-L * 0.2, lookY, 0]), fov: 38 });
    }
    keys.push({ t: w + d * 0.1, pos: local(i, [-L * 0.34, y, -dist]), look: local(i, [-L * 0.06, lookY, 0]), fov: 38 });
    keys.push({ t: w + d * 0.78, pos: local(i, [L * 0.34, y + 8, -dist * 0.94]), look: local(i, [L * 0.08, lookY, 0]), fov: 38 });
    if (i < 5) {
      const isl = ISLANDS[i + 1];
      keys.push({
        t: w + d * 0.9,
        pos: local(i, [L * 0.62, Math.max(y + 110, isl.h + 150), -dist * 0.72]),
        look: local(i + 1, [0, PLACEMENTS[i + 1].deckY, 0]),
        fov: 39,
      });
      keys.push({
        t: w + d,
        pos: [isl.c[0] + 300, isl.h * 1.1 + 240, isl.c[1]],
        look: local(i + 1, [0, PLACEMENTS[i + 1].deckY, 0]),
        fov: 40,
      });
    } else {
      keys.push({ t: 1, pos: local(5, [L * 0.8, y + 40, -dist * 1.2]), look: local(5, [L * 0.2, lookY, 0]), fov: 38 });
    }
  });
  return keys;
})();

export const Scene05: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const preset = PRESETS.day;
  const t = frame / (duration - 1);
  const cam = useMemo(() => {
    const s = withSway(sampleCam(KEYS, t), frame, 1.4);
    // Kamera selalu di atas bukit: ambil puncak di sekitar titik kamera.
    let ground = 0;
    for (const [dx, dz] of [[0, 0], [90, 0], [-90, 0], [0, 90], [0, -90]]) {
      ground = Math.max(ground, terrainAt(s.pos[0] + dx, s.pos[2] + dz));
    }
    const pos: V3 = [s.pos[0], Math.max(s.pos[1], ground + 85), s.pos[2]];
    return { ...s, pos };
  }, [t, frame]);
  const step = duration / 6;
  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam}>
        <Ocean preset={preset} cam={cam} shallows={OCEAN_SHALLOWS} />
        <BarelangWorld cam={cam} />
      </Stage>
      <AbsoluteFill>
        {BRIDGES.map((b, i) => (
          <InfoCard3D
            key={b.no}
            info={b}
            at={Math.round(step * (i + 0.06))}
            until={Math.round(step * (i + 0.86))}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
