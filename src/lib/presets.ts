import type { V3 } from "./camera";

export type SkyPreset = {
  top: string;
  horizon: string;
  sunColor: string;
  sunDir: V3;
  sunSize: number;
  sunPower: number;
  stars: number;
  clouds: number;
  cloudColor: string;
  fog: { color: string; near: number; far: number };
  deep: string;
  mid: string;
  shallow: string;
  foam: string;
  cloudShadow: number;
  light: { sun: number; sunColor: string; hemi: number; sky: string; ground: string };
};

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const PRESETS: Record<"morning" | "day" | "golden" | "night", SkyPreset> = {
  morning: {
    top: "#1E63AE",
    horizon: "#F2C79B",
    sunColor: "#FFE9C4",
    sunDir: norm([0.24, 0.17, -0.95]),
    sunSize: 0.01,
    sunPower: 20,
    stars: 0,
    clouds: 0.34,
    cloudColor: "#FFF1DF",
    fog: { color: "#E9C49E", near: 2600, far: 26000 },
    deep: "#0A2E55",
    mid: "#0F6F86",
    shallow: "#2BD3B6",
    foam: "#F6EFE2",
    cloudShadow: 0.22,
    light: { sun: 3.2, sunColor: "#FFE6C4", hemi: 1.3, sky: "#BFDcF4", ground: "#0F4C5C" },
  },
  day: {
    top: "#1763B8",
    horizon: "#BFE6F4",
    sunColor: "#FFF6E2",
    sunDir: norm([0.5, 0.75, -0.4]),
    sunSize: 0.018,
    sunPower: 16,
    stars: 0,
    clouds: 0.5,
    cloudColor: "#FFFFFF",
    fog: { color: "#C8E8F2", near: 3000, far: 42000 },
    deep: "#0B3A6E",
    mid: "#0E7FA0",
    shallow: "#35E0C2",
    foam: "#FFFFFF",
    cloudShadow: 0.3,
    light: { sun: 3.4, sunColor: "#FFF3DA", hemi: 1.5, sky: "#CFE9FA", ground: "#135E6B" },
  },
  golden: {
    top: "#2E2A63",
    horizon: "#F4A261",
    sunColor: "#FFB070",
    sunDir: norm([-0.1, 0.055, -1]),
    sunSize: 0.016,
    sunPower: 7,
    stars: 0.05,
    clouds: 0.75,
    cloudColor: "#E76F51",
    fog: { color: "#E98F5F", near: 1800, far: 16000 },
    deep: "#1B2850",
    mid: "#3D4A72",
    shallow: "#7A6E7E",
    foam: "#FFD9B8",
    cloudShadow: 0.12,
    light: { sun: 4.2, sunColor: "#FF9E5E", hemi: 1.7, sky: "#E8A27A", ground: "#23304F" },
  },
  night: {
    top: "#040A1E",
    horizon: "#14305A",
    sunColor: "#9CC4FF",
    sunDir: norm([0.5, 0.65, 0.45]),
    sunSize: 0.012,
    sunPower: 2,
    stars: 1,
    clouds: 0.15,
    cloudColor: "#1F3B66",
    fog: { color: "#0B1E3F", near: 8000, far: 46000 },
    deep: "#040C20",
    mid: "#08203C",
    shallow: "#0F3A52",
    foam: "#5C7FA8",
    cloudShadow: 0.05,
    light: { sun: 0.5, sunColor: "#9CC4FF", hemi: 0.4, sky: "#25406E", ground: "#050E24" },
  },
};
