// Menulis out/timeline.json dan subtitle.srt dari metadata komposisi yang sebenarnya.
import fs from "node:fs";
import path from "node:path";
import { selectComposition } from "@remotion/renderer";

const serveUrl = path.resolve(process.argv[2] ?? "build");
const comp = await selectComposition({ serveUrl, id: "Barelang", logLevel: "error" });
const { timeline, cues } = comp.props;

const segments = timeline.map((s, i) => {
  const next = timeline[i + 1];
  const start = s.start;
  const end = next ? next.start - 1 : comp.durationInFrames - 1;
  return { scene: i + 1, start, end };
});

fs.mkdirSync("out", { recursive: true });
fs.writeFileSync(
  "out/timeline.json",
  JSON.stringify({ durationInFrames: comp.durationInFrames, fps: comp.fps, segments }, null, 1),
);

const stamp = (frame) => {
  const ms = Math.round((frame / comp.fps) * 1000);
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = cues
  .map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`)
  .join("\n");
fs.writeFileSync("subtitle.srt", srt, "utf8");

console.log(`${comp.durationInFrames} frame (${(comp.durationInFrames / comp.fps).toFixed(1)} s), ${cues.length} subtitle`);
segments.forEach((s) => console.log(`scene ${s.scene}: ${s.start}-${s.end}`));
