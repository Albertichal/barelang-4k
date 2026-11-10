import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../lib/camera";
import {
  CABLES,
  bridge1Config,
  deckProgressOf,
  segmentBuilt,
  segmentInnerSide,
} from "../lib/bridge1Config";
import { lerp, smoothstep } from "../lib/noise";
import { BoxItem, Boxes, CylItem, Cylinders, DotItem, Dots } from "./Instances";

const CONCRETE = "#D7DADD";
const WARM = "#D9C9B0";
const COOL = "#C9D6DE";
const ASPHALT = "#3A3F47";
const WHITE = "#F4F6F8";
const LAMP: V3 = [1, 0.74, 0.42];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const scaleRgb = (c: V3, k: number): V3 => [c[0] * k, c[1] * k, c[2] * k];

const vertexMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });

const colored = (g: THREE.BufferGeometry, hex: string) => {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
};
const part = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string) =>
  colored(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex);

const deckSegment = (len: number, width: number) => {
  const parts = [
    part(len, 1.2, width, 0, -0.6, 0, ASPHALT),
    part(len, 2.8, 2, 0, -2.05, width / 2 - 1.06, CONCRETE),
    part(len, 2.8, 2, 0, -2.05, -width / 2 + 1.06, CONCRETE),
    part(len, 1.4, width * 0.7, 0, -2.05, 0, CONCRETE),
    // Marka: garis tepi menerus dan garis tengah putus-putus.
    part(len, 0.05, 0.3, 0, 0.03, width / 2 - 2.6, WHITE),
    part(len, 0.05, 0.3, 0, 0.03, -width / 2 + 2.6, WHITE),
    part(len * 0.5, 0.05, 0.28, 0, 0.03, 0, WHITE),
  ];
  for (const z of [width / 2 - 0.25, -width / 2 + 0.25]) {
    // Pagar pembatas: dua rel menerus + tiang.
    parts.push(part(len, 0.16, 0.16, 0, 1.25, z, WHITE));
    parts.push(part(len, 0.14, 0.14, 0, 0.72, z, "#B9C0C7"));
    parts.push(part(len, 0.3, 0.42, 0, 0.15, z, CONCRETE));
    for (const x of [-len / 2 + 0.5, -len / 6, len / 6]) {
      parts.push(part(0.14, 1.3, 0.14, x, 0.65, z, "#B9C0C7"));
    }
  }
  return mergeGeometries(parts)!;
};

/** Jembatan 1: seluruh ukuran dari bridge1Config. Dibangun dua arah dari pylon. */
export const CableStayedBridge: React.FC<{
  /** 0..1: pylon naik, lalu dek dan kabel menyambung. */
  build?: number;
  lights?: number;
  appear?: number;
  castShadow?: boolean;
}> = ({ build = 1, lights = 0, appear = 1, castShadow }) => {
  const cfg = bridge1Config;
  const geometry = useMemo(() => deckSegment(cfg.segmentLength, cfg.deckWidth), [cfg]);
  const pylonP = smoothstep(0, 0.32, build);
  const deckP = deckProgressOf(build);

  const pylons = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = [];
    const top = lerp(-14, cfg.pylonTop, pylonP);
    const { legZ, legLower, legUpper, deckY, pylonTop } = cfg;
    const legSplit = deckY - 4;
    for (const s of [-1, 1]) {
      const x = s * cfg.pylonX;
      items.push({ p: [x, -9, 0], s: [44, 18, 56], color: "#B9BEC3" });
      items.push({ p: [x, 2, 0], s: [36, 5, 48], color: "#C6CACE" });
      for (const z of [-legZ, legZ]) {
        const lowH = Math.min(top, legSplit) + 8;
        items.push({ p: [x, Math.min(top, legSplit) - lowH / 2, z], s: [legLower.x, lowH, legLower.z], color: CONCRETE });
        if (top > legSplit) {
          items.push({ p: [x, (legSplit + top) / 2, z], s: [legUpper.x, top - legSplit, legUpper.z], color: CONCRETE });
        }
      }
      const beam = (y: number, h: number, depth: number) =>
        items.push({
          p: [x, y, 0],
          s: top > y + h / 2 ? [legUpper.x - 1, h, legZ * 2 - legLower.z / 2] : [0, 0, 0],
          color: depth > 0 ? "#D0D4D8" : CONCRETE,
        });
      beam(deckY - 6.5, 6, 1); // balok penyangga dek
      beam(pylonTop - 52, 5, 0); // portal tengah
      beam(pylonTop - 3, 6, 0); // portal atas
      // Kepala pylon.
      for (const z of [-legZ, legZ]) {
        const on = top >= pylonTop - 0.5;
        items.push({
          p: [x, pylonTop + 3, z],
          s: on ? [legUpper.x + 2, 6, legUpper.z + 2] : [0, 0, 0],
          color: "#E2E5E8",
        });
        items.push({
          p: [x, pylonTop + 7.5, z],
          s: on ? [legUpper.x - 2.5, 3, legUpper.z - 2.5] : [0, 0, 0],
          color: "#C6CACE",
        });
      }
    }
    const h = Math.max(0.001, lerp(0, deckY + 5, smoothstep(0.1, 0.36, build)));
    for (const x of [
      -(cfg.totalLength / 2 - 7),
      -(cfg.totalLength / 2 - 78),
      cfg.totalLength / 2 - 78,
      cfg.totalLength / 2 - 7,
    ]) {
      for (const z of [-7, 7]) {
        items.push({ p: [x, -8 + h / 2, z], s: [5, h, 4], color: CONCRETE });
      }
      items.push({ p: [x, -8 + h - 1.2, 0], s: h > deckY ? [5.5, 2.4, 19] : [0, 0, 0], color: CONCRETE });
    }
    // Lampu jalan: tiang + lengan, hanya di segmen yang sudah jadi.
    const step = 3;
    for (let i = 1; i < cfg.segments; i += step) {
      const x = -cfg.totalLength / 2 + i * cfg.segmentLength;
      const built = segmentBuilt(i, deckP) >= 1;
      for (const z of [-1, 1]) {
        const zp = z * (cfg.deckWidth / 2 - 0.9);
        items.push({ p: [x, deckY + 3.5, zp], s: built ? [0.28, 7, 0.28] : [0, 0, 0], color: "#AEB6BE" });
        items.push({ p: [x, deckY + 6.9, zp - z * 1.2], s: built ? [0.22, 0.2, 2.6] : [0, 0, 0], color: "#AEB6BE" });
      }
    }
    return items;
  }, [cfg, pylonP, build, deckP]);

  const deckItems = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = [];
    for (let i = 0; i < cfg.segments; i++) {
      const k = segmentBuilt(i, deckP);
      const center = -cfg.totalLength / 2 + (i + 0.5) * cfg.segmentLength;
      // Segmen sebagian tumbuh dari sisi yang menyambung ke arah pylon.
      const shift = (segmentInnerSide(i) * (1 - k) * cfg.segmentLength) / 2;
      items.push({
        p: [center + shift, cfg.deckY, 0],
        s: k > 0 ? [k, 1, 1] : [0, 0, 0],
        color: "#ffffff",
      });
    }
    return items;
  }, [cfg, deckP]);

  const cables = useMemo<CylItem[]>(
    () =>
      CABLES.map((c) => {
        const k = clamp01((deckP - c.f) / 0.05);
        return {
          a: c.a,
          b: [lerp(c.a[0], c.b[0], k), lerp(c.a[1], c.b[1], k), lerp(c.a[2], c.b[2], k)] as V3,
          r: cfg.cables.radius,
        };
      }),
    [cfg, deckP],
  );

  const collars = useMemo<BoxItem[]>(
    () =>
      CABLES.flatMap((c) => {
        const on = deckP >= c.f + 0.05;
        return [
          { p: c.b, s: on ? [1.1, 0.7, 1.1] : [0, 0, 0], color: "#8F98A1" } as BoxItem,
          { p: c.a, s: on ? [1.5, 1, 1.3] : [0, 0, 0], color: "#8F98A1" } as BoxItem,
        ];
      }),
    [deckP],
  );

  const dots = useMemo<DotItem[]>(() => {
    if (lights <= 0) return [];
    const items: DotItem[] = [];
    for (let i = 1; i < cfg.segments; i += 3) {
      const x = -cfg.totalLength / 2 + i * cfg.segmentLength;
      const on = clamp01((lights * 1.4 - Math.abs(x) / cfg.totalLength) * 5);
      for (const z of [-1, 1]) {
        const zp = z * (cfg.deckWidth / 2 - 0.9 - 2.4);
        items.push({ p: [x, cfg.deckY + 6.7, zp], size: 0.55, rgb: scaleRgb(LAMP, on * 7) });
      }
    }
    for (const s of [-1, 1]) {
      for (const z of [-cfg.legZ, cfg.legZ]) {
        for (let y = cfg.deckY + 14; y <= cfg.pylonTop; y += 12) {
          const on = clamp01((lights * 1.6 - (cfg.pylonTop - y) / cfg.pylonTop - 0.2) * 5);
          items.push({ p: [s * cfg.pylonX - 4.6, y, z], size: 0.6, rgb: scaleRgb([0.45, 0.85, 1], on * 5) });
        }
      }
      items.push({ p: [s * cfg.pylonX, cfg.pylonTop + 11, 0], size: 1.3, rgb: scaleRgb([1, 0.25, 0.2], clamp01(lights * 3) * 8) });
    }
    return items;
  }, [cfg, lights]);

  return (
    <group scale={[1, appear, 1]}>
      <Boxes items={pylons} castShadow={castShadow} />
      <Boxes items={deckItems} geometry={geometry} material={vertexMat} castShadow={castShadow} />
      <Cylinders items={cables} castShadow={castShadow} />
      <Boxes items={collars} />
      {dots.length ? <Dots items={dots} /> : null}
    </group>
  );
};

const lampRow = (length: number, deckY: number, width: number, lights: number): DotItem[] => {
  if (lights <= 0) return [];
  const out: DotItem[] = [];
  const n = Math.max(4, Math.round(length / 26));
  for (let i = 0; i <= n; i++) {
    const x = -length / 2 + (i / n) * length;
    for (const z of [-width / 2, width / 2]) {
      out.push({ p: [x, deckY + 6.5, z], size: 0.6, rgb: scaleRgb(LAMP, clamp01(lights) * 7) });
    }
  }
  return out;
};

const rails = (length: number, deckY: number, width: number, color: string): BoxItem[] => [
  { p: [0, deckY + 0.6, 0], s: [length, 0.5, width - 0.4], color: ASPHALT },
  { p: [0, deckY + 1.5, width / 2 - 0.3], s: [length, 1.1, 0.5], color },
  { p: [0, deckY + 1.5, -width / 2 + 0.3], s: [length, 1.1, 0.5], color },
  { p: [0, deckY + 1, 0], s: [length, 0.06, 0.4], color: WHITE },
];

export type GirderVariant = "haunched" | "cantilever" | "girder" | "small";

/** Jembatan 2, 3, 4, dan 6: profil dek dan bentuk pilar berbeda tiap varian. */
export const GirderBridge: React.FC<{
  length: number;
  deckY: number;
  variant: GirderVariant;
  mainSpan?: number;
  lights?: number;
  appear?: number;
}> = ({ length, deckY, variant, mainSpan = 150, lights = 0, appear = 1 }) => {
  const W = variant === "small" ? 13 : 18;
  const color = variant === "cantilever" ? WARM : variant === "small" ? COOL : CONCRETE;
  const haunch = variant === "haunched" || variant === "cantilever";

  const deck = useMemo(() => {
    if (!haunch) return null;
    const pier = mainSpan / 2;
    const maxD = variant === "cantilever" ? 13 : 10;
    const depthAt = (x: number) => {
      const d = Math.abs(Math.abs(x) - pier);
      const reach = Math.abs(x) < pier ? pier : length / 2 - pier;
      return 3.4 + (maxD - 3.4) * Math.pow(1 - clamp01(d / reach), 2.2);
    };
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const x = length / 2 - (i / n) * length;
      shape.lineTo(x, -depthAt(x));
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    g.translate(0, deckY, -W / 2);
    return { geometry: g, depthAt, pier };
  }, [haunch, mainSpan, length, deckY, variant, W]);

  const deckMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.84 }),
    [color],
  );

  const items = useMemo<BoxItem[]>(() => {
    const out: BoxItem[] = rails(length, deckY, W, variant === "small" ? "#13C4A3" : WHITE);
    if (deck) {
      for (const s of [-1, 1]) {
        const x = s * deck.pier;
        const top = deckY - deck.depthAt(x);
        out.push({ p: [x, -6, 0], s: [26, 12, W + 12], color: "#B9BEC3" });
        if (variant === "cantilever") {
          // Pilar dinding kembar (twin-wall) yang khas kantilever.
          for (const dx of [-7, 7]) {
            out.push({ p: [x + dx, top / 2 - 4, 0], s: [3.4, top + 8, W - 3], color });
          }
        } else {
          out.push({ p: [x, top / 2 - 4, 0], s: [9, top + 8, W - 4], color });
        }
      }
      for (const s of [-1, 1]) {
        const x = s * (length / 2 - 5);
        out.push({ p: [x, deckY / 2 - 6, 0], s: [6, deckY + 8, W - 3], color });
      }
    } else {
      const spans = variant === "small" ? 4 : 6;
      const d = variant === "small" ? 2.6 : 3.6;
      out.push({ p: [0, deckY - d / 2, 0], s: [length, d, W], color });
      for (let i = 0; i <= spans; i++) {
        const x = -length / 2 + (i / spans) * length;
        const top = deckY - d;
        for (const z of variant === "small" ? [0] : [-6, 6]) {
          out.push({
            p: [x, top / 2 - 4, z],
            s: variant === "small" ? [5, top + 8, W - 4] : [3.6, top + 8, 3.6],
            color,
          });
        }
        if (variant !== "small") {
          out.push({ p: [x, top - 1, 0], s: [4.4, 2.2, W - 1], color });
        }
      }
    }
    return out;
  }, [deck, deckY, length, variant, W, color]);

  const dots = useMemo(() => lampRow(length, deckY, W, lights), [length, deckY, W, lights]);

  return (
    <group scale={[1, appear, 1]}>
      {deck ? <mesh geometry={deck.geometry} material={deckMat} /> : null}
      <Boxes items={items} />
      {dots.length ? <Dots items={dots} /> : null}
    </group>
  );
};

/** Jembatan 5: pelengkung beton dengan kolom-kolom spandrel. */
export const ArchBridge: React.FC<{
  length: number;
  deckY: number;
  mainSpan?: number;
  lights?: number;
  appear?: number;
}> = ({ length, deckY, mainSpan = 245, lights = 0, appear = 1 }) => {
  const W = 18;
  const { boxes, cyls } = useMemo(() => {
    const half = mainSpan / 2;
    const spring = 3;
    const crown = deckY - 3;
    const archY = (x: number) => spring + (crown - spring) * (1 - (x / half) ** 2);
    const c: CylItem[] = [];
    const b: BoxItem[] = [
      ...rails(length, deckY, W, WHITE),
      { p: [0, deckY - 1.4, 0], s: [length, 2.8, W], color: CONCRETE },
    ];
    const n = 44;
    for (const z of [-7, 7]) {
      for (let i = 0; i < n; i++) {
        const x0 = -half + (i / n) * mainSpan;
        const x1 = -half + ((i + 1) / n) * mainSpan;
        c.push({ a: [x0, archY(x0), z], b: [x1, archY(x1), z], r: 2.3, color: CONCRETE });
      }
    }
    for (let x = -half + 12; x <= half - 11; x += 12) {
      const y = archY(x);
      if (deckY - y > 5) {
        for (const z of [-7, 7]) {
          c.push({ a: [x, y, z], b: [x, deckY - 2.8, z], r: 0.9, color: CONCRETE });
        }
      }
      b.push({ p: [x, y, 0], s: [2, 1.5, 14], color: CONCRETE });
    }
    for (const s of [-1, 1]) {
      b.push({ p: [s * half, -5, 0], s: [20, 14, 26], color: "#B9BEC3" });
      for (let x = half + 28; x < length / 2 - 1; x += 28) {
        b.push({ p: [s * x, deckY / 2 - 6, 0], s: [4, deckY + 8, 14], color: CONCRETE });
      }
    }
    return { boxes: b, cyls: c };
  }, [length, deckY, mainSpan]);

  const dots = useMemo(() => lampRow(length, deckY, W, lights), [length, deckY, W, lights]);

  return (
    <group scale={[1, appear, 1]}>
      <Boxes items={boxes} />
      <Cylinders items={cyls} />
      {dots.length ? <Dots items={dots} /> : null}
    </group>
  );
};
