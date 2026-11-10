// Noise deterministik: tidak memakai Math.random sama sekali.
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const GRAD: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export const makeSimplex = (seed: number) => {
  const rng = mulberry32(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = [...p, ...p];
  return (x: number, y: number) => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const pts: [number, number, number, number][] = [
      [x0, y0, i & 255, j & 255],
      [x0 - i1 + G2, y0 - j1 + G2, (i + i1) & 255, (j + j1) & 255],
      [x0 - 1 + 2 * G2, y0 - 1 + 2 * G2, (i + 1) & 255, (j + 1) & 255],
    ];
    let n = 0;
    for (const [px, py, ii, jj] of pts) {
      const tt = 0.5 - px * px - py * py;
      if (tt > 0) {
        const g = GRAD[perm[ii + perm[jj]] % 8];
        n += tt ** 4 * (g[0] * px + g[1] * py);
      }
    }
    return 70 * n;
  };
};

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
