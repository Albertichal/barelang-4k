import React, { useState } from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "./lib/data";
import { FONT_OPTIONS, FontKey } from "./theme/fonts";

const KEYS: FontKey[] = ["A", "B", "C"];

/** Type specimen: tiga opsi font dengan warna dan layout video. */
export const FontOptions: React.FC = () => {
  const [fams] = useState(() => KEYS.map((k) => FONT_OPTIONS[k].load()));
  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        background: `linear-gradient(160deg, ${PALETTE.navy}, #0E5A6B 70%, #13C4A3)`,
      }}
    >
      {KEYS.map((k, i) => {
        const o = FONT_OPTIONS[k];
        const { title, body } = fams[i];
        const t: React.CSSProperties = {
          fontFamily: title,
          fontWeight: o.titleWeight,
          letterSpacing: `${o.titleSpacing}em`,
        };
        return (
          <div
            key={k}
            style={{
              flex: 1,
              padding: "130px 90px",
              display: "flex",
              flexDirection: "column",
              borderRight: i < 2 ? "3px solid rgba(248,249,250,.25)" : undefined,
            }}
          >
            <div style={{ fontFamily: body, fontWeight: 600, fontSize: 50, color: PALETTE.teal }}>
              {o.label}
            </div>
            <div style={{ ...t, fontSize: 196, lineHeight: 1.1, color: PALETTE.white, marginTop: 70 }}>
              BARELANG
            </div>
            <div style={{ fontFamily: body, fontWeight: 600, fontSize: 68, color: PALETTE.gold, marginTop: 26 }}>
              Menghubungkan Pulau, Menyatukan Cerita
            </div>
            <div
              style={{
                marginTop: 110,
                padding: "52px 60px",
                borderRadius: 26,
                borderLeft: `12px solid ${PALETTE.teal}`,
                background: "rgba(11,37,69,.78)",
              }}
            >
              <div style={{ fontFamily: body, fontWeight: 700, fontSize: 40, color: PALETTE.teal, letterSpacing: 6 }}>
                JEMBATAN 1
              </div>
              <div style={{ ...t, fontSize: 100, lineHeight: 1.12, color: PALETTE.white, marginTop: 10 }}>
                Tengku Fisabilillah
              </div>
              <div style={{ display: "flex", gap: 50, alignItems: "baseline", marginTop: 22 }}>
                <span style={{ fontFamily: body, fontWeight: 500, fontSize: 52, color: PALETTE.white }}>
                  Batam – Tonton
                </span>
                <span style={{ ...t, fontSize: 84, color: PALETTE.gold }}>642 m</span>
              </div>
            </div>
            <div style={{ marginTop: "auto", textAlign: "center" }}>
              <span
                style={{
                  fontFamily: body,
                  fontWeight: 500,
                  fontSize: 52,
                  lineHeight: 1.5,
                  color: PALETTE.white,
                  background: "rgba(6,16,34,.55)",
                  padding: "12px 30px",
                  borderRadius: 12,
                }}
              >
                Di ujung selatan Batam, terbentang rangkaian jembatan
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
