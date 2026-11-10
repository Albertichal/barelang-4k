import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setChromiumOpenGlRenderer("angle"); // pakai GPU RTX di Windows
Config.setConcurrency(1); // RAM 8 GB: satu tab saja
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// Sengaja TANPA setDefaultPremountInSeconds: premount akan memuat dua kanvas
// WebGL 4K sekaligus dan menghabiskan VRAM 4 GB.
