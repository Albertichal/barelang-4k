// Mengubah font judul (woff) menjadi typeface JSON untuk teks 3D.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const SOURCES = {
  a: "@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff",
  b: "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff",
  c: "@fontsource/cinzel/files/cinzel-latin-900-normal.woff",
};

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -";

for (const [key, rel] of Object.entries(SOURCES)) {
  const buf = fs.readFileSync(path.resolve("node_modules", rel));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  const glyphs = {};
  for (const ch of chars) {
    const g = font.charToGlyph(ch);
    const o = g.path.commands
      .map((c) => {
        if (c.type === "M") return `m ${c.x} ${c.y}`;
        if (c.type === "L") return `l ${c.x} ${c.y}`;
        if (c.type === "Q") return `q ${c.x} ${c.y} ${c.x1} ${c.y1}`;
        if (c.type === "C") return `b ${c.x} ${c.y} ${c.x1} ${c.y1} ${c.x2} ${c.y2}`;
        return "";
      })
      .join(" ");
    glyphs[ch] = { ha: g.advanceWidth, x_min: g.xMin ?? 0, x_max: g.xMax ?? 0, o };
  }
  fs.mkdirSync("src/assets", { recursive: true });
  fs.writeFileSync(
    `src/assets/typeface-${key}.json`,
    JSON.stringify({
      glyphs,
      familyName: font.names.fontFamily?.en ?? key,
      ascender: font.ascender,
      descender: font.descender,
      underlinePosition: font.tables.post.underlinePosition,
      underlineThickness: font.tables.post.underlineThickness,
      boundingBox: {
        xMin: font.tables.head.xMin,
        yMin: font.tables.head.yMin,
        xMax: font.tables.head.xMax,
        yMax: font.tables.head.yMax,
      },
      resolution: font.unitsPerEm,
      original_font_information: {},
    }),
  );
  console.log("font", key, "ok");
}
