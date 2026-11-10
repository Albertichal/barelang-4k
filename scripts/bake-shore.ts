// Membuat public/shore.png: jarak dari tiap titik laut ke pantai terdekat.
// Jalankan lagi kalau bentuk pulau di src/lib/world.ts berubah:
//   npx esbuild scripts/bake-shore.ts --bundle --platform=node --format=cjs --outfile=node_modules/.cache/bake.cjs && node node_modules/.cache/bake.cjs
import fs from "node:fs";
import zlib from "node:zlib";
import { ISLANDS, SHORE_BOX, SHORE_RANGE, heightFnOf } from "../src/lib/world";

const LONG = 2048;
const k = LONG / Math.max(SHORE_BOX.sizeX, SHORE_BOX.sizeZ);
const W = Math.round(SHORE_BOX.sizeX * k);
const H = Math.round(SHORE_BOX.sizeZ * k);
const cell = SHORE_BOX.sizeX / W;

const INF = 1e9;
const dist = new Float32Array(W * H).fill(INF);
for (let j = 0; j < H; j++) {
  const z = SHORE_BOX.minZ + (j + 0.5) * cell;
  for (let i = 0; i < W; i++) {
    const x = SHORE_BOX.minX + (i + 0.5) * cell;
    for (const isl of ISLANDS) {
      if (Math.abs(x - isl.c[0]) > isl.rx * 1.3 || Math.abs(z - isl.c[1]) > isl.rz * 1.3) continue;
      if (heightFnOf(isl)(x, z).h > 0) {
        dist[j * W + i] = 0;
        break;
      }
    }
  }
}

// Distance transform chamfer dua arah.
const a = cell;
const b = cell * Math.SQRT2;
const at = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= H ? INF : dist[j * W + i]);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    dist[j * W + i] = Math.min(dist[j * W + i], at(i - 1, j) + a, at(i, j - 1) + a, at(i - 1, j - 1) + b, at(i + 1, j - 1) + b);
  }
}
for (let j = H - 1; j >= 0; j--) {
  for (let i = W - 1; i >= 0; i--) {
    dist[j * W + i] = Math.min(dist[j * W + i], at(i + 1, j) + a, at(i, j + 1) + a, at(i + 1, j + 1) + b, at(i - 1, j + 1) + b);
  }
}

const raw = Buffer.alloc((W + 1) * H);
let p = 0;
for (let j = 0; j < H; j++) {
  raw[p++] = 0;
  for (let i = 0; i < W; i++) {
    raw[p++] = Math.round(Math.min(1, dist[j * W + i] / SHORE_RANGE) * 255);
  }
}

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let t = 0; t < 8; t++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const v of buf) c = table[(c ^ v) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 0;
fs.writeFileSync(
  "public/shore.png",
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
console.log(`shore.png ${W}x${H}, ${cell.toFixed(1)} m/px`);
