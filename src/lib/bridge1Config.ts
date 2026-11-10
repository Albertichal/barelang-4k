// SATU sumber untuk seluruh ukuran Jembatan 1 (Tengku Fisabilillah).
// Semua posisi dek, pylon, dan kabel dihitung dari objek ini.
import type { V3 } from "./camera";

const totalLength = 642;
const mainSpan = 350;
const sideSpan = (totalLength - mainSpan) / 2;
const pylonX = mainSpan / 2;
const deckY = 38;
const deckWidth = 22;
const pylonTop = 118; // hanya proporsi visual, tidak pernah disebut di teks
const segments = 64;

export const bridge1Config = {
  totalLength,
  mainSpan,
  sideSpan,
  pylonX,
  deckY,
  deckWidth,
  pylonTop,
  segments,
  segmentLength: totalLength / segments,
  legZ: deckWidth / 2 + 3.4,
  legLower: { x: 10, z: 8 },
  legUpper: { x: 8.5, z: 6.5 },
  cables: {
    perSide: 14,
    headSpacing: 3.3,
    headTopOffset: 7,
    firstDeckOffset: 16,
    mainEndGap: 8,
    sideEndGap: 10,
    deckZ: deckWidth / 2 - 0.7,
    radius: 0.42,
  },
};

const cfg = bridge1Config;

export type CableDef = {
  /** Anchor di pylon. */
  a: V3;
  /** Anchor di tepi dek. */
  b: V3;
  /** Jarak anchor dek dari pylon, dinormalkan 0..1 terhadap jangkauan dek. */
  f: number;
};

/** Jangkauan terjauh dek dari pylon terdekat. */
export const maxDeckReach = Math.max(cfg.pylonX, cfg.sideSpan);

export const CABLES: CableDef[] = (() => {
  const out: CableDef[] = [];
  const { perSide, headSpacing, headTopOffset, firstDeckOffset, mainEndGap, sideEndGap, deckZ } =
    cfg.cables;
  for (const s of [-1, 1]) {
    const px = s * cfg.pylonX;
    for (const dir of [-1, 1]) {
      const towardMid = dir === -s;
      const reach = towardMid ? cfg.pylonX - mainEndGap : cfg.sideSpan - sideEndGap;
      for (let i = 0; i < perSide; i++) {
        const dist = firstDeckOffset + (i / (perSide - 1)) * (reach - firstDeckOffset);
        const ay = cfg.pylonTop - headTopOffset - (perSide - 1 - i) * headSpacing;
        for (const side of [-1, 1]) {
          out.push({
            // Sedikit masuk ke muka kaki pylon supaya tidak ada celah.
            a: [px + dir * (cfg.legUpper.x / 2 - 0.5), ay, side * cfg.legZ],
            b: [px + dir * dist, deckY + 0.25, side * deckZ],
            f: dist / maxDeckReach,
          });
        }
      }
    }
  }
  return out;
})();

/** 0..1: berapa bagian segmen dek ke-i yang sudah terbangun untuk progress deckP. */
export const segmentBuilt = (i: number, deckP: number) => {
  const x0 = -cfg.totalLength / 2 + i * cfg.segmentLength;
  const x1 = x0 + cfg.segmentLength;
  const dist = (x: number) => Math.abs(Math.abs(x) - cfg.pylonX);
  const inner = Math.min(dist(x0), dist(x1));
  const outer = Math.max(dist(x0), dist(x1));
  return Math.min(1, Math.max(0, (deckP * maxDeckReach - inner) / (outer - inner)));
};

/** Sisi segmen ke-i yang menyambung ke arah pylon: -1 kiri, +1 kanan. */
export const segmentInnerSide = (i: number) => {
  const x0 = -cfg.totalLength / 2 + i * cfg.segmentLength;
  const x1 = x0 + cfg.segmentLength;
  const dist = (x: number) => Math.abs(Math.abs(x) - cfg.pylonX);
  return dist(x0) < dist(x1) ? -1 : 1;
};

export const deckProgressOf = (build: number) => Math.min(1, Math.max(0, (build - 0.28) / 0.72));
