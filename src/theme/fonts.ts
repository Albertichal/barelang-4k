// SATU-SATUNYA tempat pengaturan font. Ganti opsi di sini: ACTIVE = "A" | "B" | "C".
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import typefaceA from "../assets/typeface-a.json";
import typefaceB from "../assets/typeface-b.json";
import typefaceC from "../assets/typeface-c.json";

export type FontKey = "A" | "B" | "C";

export const ACTIVE: FontKey = "A";

type Option = {
  label: string;
  load: () => { title: string; body: string };
  titleWeight: number;
  /** Jarak antarhuruf judul, dalam em. */
  titleSpacing: number;
  typeface: unknown;
};

const latin = { subsets: ["latin"] as ["latin"] };

export const FONT_OPTIONS: Record<FontKey, Option> = {
  A: {
    label: "A: Dokumenter elegan",
    load: () => ({
      title: loadPlayfair("normal", { weights: ["700", "900"], ...latin }).fontFamily,
      body: loadInter("normal", { weights: ["500", "600", "700"], ...latin }).fontFamily,
    }),
    titleWeight: 900,
    titleSpacing: 0.01,
    typeface: typefaceA,
  },
  B: {
    label: "B: Sinematik modern",
    load: () => ({
      title: loadBebas("normal", { weights: ["400"], ...latin }).fontFamily,
      body: loadManrope("normal", { weights: ["500", "600", "700"], ...latin }).fontFamily,
    }),
    titleWeight: 400,
    titleSpacing: 0.12,
    typeface: typefaceB,
  },
  C: {
    label: "C: Nuansa Melayu / heritage",
    load: () => ({
      title: loadCinzel("normal", { weights: ["700", "900"], ...latin }).fontFamily,
      body: loadDMSans("normal", { weights: ["500", "600", "700"], ...latin }).fontFamily,
    }),
    titleWeight: 900,
    titleSpacing: 0.04,
    typeface: typefaceC,
  },
};

const active = FONT_OPTIONS[ACTIVE];
const families = active.load();

export const FONT_TITLE = families.title;
export const FONT_BODY = families.body;
export const TITLE_WEIGHT = active.titleWeight;
export const TITLE_SPACING = active.titleSpacing;
export const FONT_3D = new Font(active.typeface as never);
