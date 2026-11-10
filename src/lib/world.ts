// Satu model dunia untuk semua scene: posisi pulau, bentuk pulau, jalan, dan jalur jembatan.
import { BRIDGES } from "./data";
import { lerp, makeSimplex, mulberry32, smoothstep } from "./noise";

export type XZ = [number, number];
export type RoadPoint = { p: XZ; y: number };

export type Island = {
  id: string;
  name: string;
  c: XZ;
  rx: number;
  rz: number;
  h: number;
  seed: number;
  road: RoadPoint[];
};

export type Placement = {
  a: XZ;
  b: XZ;
  mid: XZ;
  dir: XZ;
  yaw: number;
  length: number;
  deckY: number;
};

const DEFS = [
  { id: "batam", name: "Batam", rx: 1900, rz: 1400, h: 120, seed: 11 },
  { id: "tonton", name: "Tonton", rx: 260, rz: 220, h: 30, seed: 23 },
  { id: "nipah", name: "Nipah", rx: 340, rz: 280, h: 38, seed: 31 },
  { id: "setokok", name: "Setokok", rx: 520, rz: 420, h: 55, seed: 47 },
  { id: "rempang", name: "Rempang", rx: 1100, rz: 1300, h: 130, seed: 59 },
  { id: "galang", name: "Galang", rx: 1250, rz: 1500, h: 140, seed: 71 },
  { id: "galangBaru", name: "Galang Baru", rx: 620, rz: 480, h: 58, seed: 83 },
];

// Arah tiap jembatan (derajat dari sumbu selatan, +z). Tata letak distilisasi.
const HEADINGS = [18, -12, 24, -28, 10, -16];

const add = (a: XZ, d: XZ, k: number): XZ => [a[0] + d[0] * k, a[1] + d[1] * k];
const shore = (d: { rx: number; rz: number }, dir: XZ) =>
  1 / Math.hypot(dir[0] / d.rx, dir[1] / d.rz);

/** Tinggi alami tanpa koridor jalan: fbm dengan domain warp, punggung bukit, dan lembah. */
const makeBaseHeight = (isl: Pick<Island, "c" | "rx" | "rz" | "h" | "seed">) => {
  const n = makeSimplex(isl.seed);
  const fbm = (x: number, z: number, oct: number) => {
    let a = 0.5;
    let f = 1;
    let v = 0;
    for (let i = 0; i < oct; i++) {
      v += a * n(x * f + i * 17.3, z * f - i * 9.1);
      a *= 0.5;
      f *= 2.03;
    }
    return v;
  };
  return (x: number, z: number) => {
    const X = x + n(x * 0.0011 + 7, z * 0.0011 - 3) * 150;
    const Z = z + n(x * 0.0011 - 21, z * 0.0011 + 14) * 150;
    const d = Math.hypot((x - isl.c[0]) / isl.rx, (z - isl.c[1]) / isl.rz);
    const big = fbm(X * 0.0014, Z * 0.0014, 3);
    const edge = 1 - d + 0.2 * big + 0.05 * n(x * 0.006 + 40, z * 0.006 - 13);
    const mask = smoothstep(0, 0.32, edge);
    if (mask <= 0) return -22;
    const r = n(X * 0.0034, Z * 0.0034);
    const ridge = 1 - Math.sqrt(r * r + 0.03);
    const inner = smoothstep(0.1, 0.9, mask);
    const hills = Math.pow(big * 0.5 + 0.55, 1.3) * 0.62 + ridge * ridge * 0.3 * inner;
    const detail = fbm(x * 0.012, z * 0.012, 2);
    const h = mask * (isl.h * (0.07 + hills) + detail * 3 * inner) - (1 - mask) * 22;
    // Pantai landai: pita pasir dekat permukaan laut diratakan.
    return h > 0 ? h * (0.3 + 0.7 * smoothstep(3, 15, h)) : h;
  };
};

const buildRoad = (
  def: (typeof DEFS)[number],
  c: XZ,
  prev: Placement | undefined,
  next: Placement | undefined,
): RoadPoint[] => {
  const base = makeBaseHeight({ ...def, c });
  const rng = mulberry32(def.seed + 7);
  const start = prev ? prev.b : c;
  const end = next ? next.a : c;
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.hypot(dx, dz) || 1;
  const perp: XZ = [-dz / len, dx / len];
  // Berkelok: titik kontrol digeser ke samping secara deterministik.
  const offs = [0, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3, 0];
  const ctrl: XZ[] = offs.map((o, i) => [
    start[0] + (dx * i) / 4 + perp[0] * o * len,
    start[1] + (dz * i) / 4 + perp[1] * o * len,
  ]);
  const cr = (a: number, b: number, c2: number, d: number, u: number) =>
    0.5 *
    (2 * b + (c2 - a) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (3 * b - a - 3 * c2 + d) * u * u * u);
  const pts: XZ[] = [];
  const count = Math.max(8, Math.round(len / 25));
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * 4;
    const s = Math.min(3, Math.floor(t));
    const u = t - s;
    const p0 = ctrl[Math.max(0, s - 1)];
    const p1 = ctrl[s];
    const p2 = ctrl[s + 1];
    const p3 = ctrl[Math.min(4, s + 2)];
    pts.push([cr(p0[0], p1[0], p2[0], p3[0], u), cr(p0[1], p1[1], p2[1], p3[1], u)]);
  }
  const raw = pts.map((p) => Math.max(3, Math.min(def.h * 0.55, base(p[0], p[1]))));
  const smooth = raw.map((_, i) => {
    let sum = 0;
    let w = 0;
    for (let k = -8; k <= 8; k++) {
      const v = raw[Math.max(0, Math.min(raw.length - 1, i + k))];
      const g = Math.exp(-(k * k) / 28);
      sum += v * g;
      w += g;
    }
    return sum / w;
  });
  const startY = prev ? prev.deckY : smooth[0];
  const endY = next ? next.deckY : smooth[smooth.length - 1];
  return pts.map((p, i) => {
    const d0 = (i / count) * len;
    const d1 = len - d0;
    let y = smooth[i];
    y = lerp(startY, y, smoothstep(0, 230, d0));
    y = lerp(endY, y, smoothstep(0, 230, d1));
    return { p, y };
  });
};

const build = () => {
  const centers: XZ[] = [[0, 0]];
  const placements: Placement[] = BRIDGES.map((b, i) => {
    const t = (HEADINGS[i] * Math.PI) / 180;
    const dir: XZ = [Math.sin(t), Math.cos(t)];
    const a = add(centers[i], dir, shore(DEFS[i], dir) * 0.96);
    const end = add(a, dir, b.length);
    centers.push(add(end, dir, shore(DEFS[i + 1], dir) * 0.96));
    return {
      a,
      b: end,
      mid: add(a, dir, b.length / 2),
      dir,
      yaw: Math.atan2(-dir[1], dir[0]),
      length: b.length,
      deckY: b.deckY,
    };
  });
  const islands: Island[] = DEFS.map((d, i) => ({
    ...d,
    c: centers[i],
    road: buildRoad(d, centers[i], placements[i - 1], placements[i]),
  }));
  return { placements, islands };
};

export const { placements: PLACEMENTS, islands: ISLANDS } = build();

export type HeightSample = { h: number; road: number };

/** Fungsi tinggi final (termasuk koridor jalan), dipakai mesh, pohon, dan peta pantai. */
export const makeHeightFn = (isl: Island) => {
  const base = makeBaseHeight(isl);
  const roadPts = isl.road;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const r of roadPts) {
    minX = Math.min(minX, r.p[0]);
    maxX = Math.max(maxX, r.p[0]);
    minZ = Math.min(minZ, r.p[1]);
    maxZ = Math.max(maxZ, r.p[1]);
  }
  const n = roadPts.length - 1;
  return (x: number, z: number): HeightSample => {
    let h = base(x, z);
    let road = 0;
    if (x < minX - 95 || x > maxX + 95 || z < minZ - 95 || z > maxZ + 95) {
      return { h, road };
    }
    let best = 0;
    let bestY = 0;
    for (let i = 0; i < n; i++) {
      const A = roadPts[i];
      const B = roadPts[i + 1];
      const vx = B.p[0] - A.p[0];
      const vz = B.p[1] - A.p[1];
      const l2 = vx * vx + vz * vz || 1;
      const u = Math.min(1, Math.max(0, ((x - A.p[0]) * vx + (z - A.p[1]) * vz) / l2));
      const d = Math.hypot(x - (A.p[0] + vx * u), z - (A.p[1] + vz * u));
      if (d > 95) continue;
      // Di ujung (menyambung jembatan) koridor lebih lebar, membentuk tanggul.
      const end = 1 - smoothstep(0, 9, Math.min(i, n - i - 1));
      const half = lerp(26, 60, end);
      const w = smoothstep(half, half * 0.3, d);
      if (w > best) {
        best = w;
        bestY = lerp(A.y, B.y, u);
      }
    }
    if (best > 0) {
      h = lerp(h, bestY - 1.2, best);
      road = best;
    }
    return { h, road };
  };
};

const heightFns = new Map<string, ReturnType<typeof makeHeightFn>>();
export const heightFnOf = (isl: Island) => {
  if (!heightFns.has(isl.id)) heightFns.set(isl.id, makeHeightFn(isl));
  return heightFns.get(isl.id)!;
};

/** Tinggi daratan tertinggi di suatu titik, untuk menjaga kamera di atas bukit. */
export const terrainAt = (x: number, z: number) => {
  let top = 0;
  for (const isl of ISLANDS) {
    if (Math.abs(x - isl.c[0]) > isl.rx * 1.3 || Math.abs(z - isl.c[1]) > isl.rz * 1.3) continue;
    top = Math.max(top, heightFnOf(isl)(x, z).h);
  }
  return top;
};

/** [x, z, radius]: penanda area pulau untuk shader laut. */
export const OCEAN_SHALLOWS: [number, number, number][] = ISLANDS.map((i) => [
  i.c[0],
  i.c[1],
  Math.max(i.rx, i.rz),
]);

export const CHAIN_CENTER: XZ = [
  (ISLANDS[0].c[0] + ISLANDS[ISLANDS.length - 1].c[0]) / 2,
  (ISLANDS[0].c[1] + ISLANDS[ISLANDS.length - 1].c[1]) / 2,
];

/** Polyline seluruh rangkaian [x, y, z] untuk garis cahaya. */
export const CHAIN_PATH: [number, number, number][] = ISLANDS.flatMap((isl) =>
  isl.road.map((r) => [r.p[0], r.y + 1, r.p[1]] as [number, number, number]),
);

/** Batas peta jarak-pantai (public/shore.png). */
export const SHORE_BOX = (() => {
  const m = 1100;
  const minX = Math.min(...ISLANDS.map((i) => i.c[0] - i.rx)) - m;
  const maxX = Math.max(...ISLANDS.map((i) => i.c[0] + i.rx)) + m;
  const minZ = Math.min(...ISLANDS.map((i) => i.c[1] - i.rz)) - m;
  const maxZ = Math.max(...ISLANDS.map((i) => i.c[1] + i.rz)) + m;
  return { minX, minZ, sizeX: maxX - minX, sizeZ: maxZ - minZ };
})();
export const SHORE_RANGE = 620; // meter jarak yang dipetakan ke nilai 0..1

/** Transformasi dunia <-> model peta. Dipakai adegan yang memutar seluruh dunia. */
export type WorldXf = { theta: number; p: XZ; t: XZ };
export const NO_XF: WorldXf = { theta: 0, p: [0, 0], t: [0, 0] };

export const worldToMap = (xf: WorldXf, x: number, z: number): XZ => {
  const c = Math.cos(xf.theta);
  const s = Math.sin(xf.theta);
  const wx = x - xf.p[0];
  const wz = z - xf.p[1];
  return [wx * c - wz * s - xf.t[0], wx * s + wz * c - xf.t[1]];
};
