import cfg from "../timing.config.json";

export const FPS = cfg.fps;
export const TRANSITION = cfg.transition;
export const SCENE_COUNT = cfg.sceneMin.length;

export type SceneTiming = {
  /** Durasi scene, termasuk bagian yang bertumpuk dengan transisi. */
  duration: number;
  /** Frame absolut saat scene mulai. */
  start: number;
  /** Frame absolut saat narasi mulai. */
  voStart: number;
  /** Panjang narasi dalam frame. */
  voFrames: number;
};

export const computeTimeline = (voSeconds: number[]): SceneTiming[] => {
  let cursor = 0;
  return cfg.sceneMin.map((min, i) => {
    const last = i === SCENE_COUNT - 1;
    const voFrames = Math.ceil((voSeconds[i] ?? 0) * FPS);
    const lead = cfg.voLead[i];
    const fromVoice =
      lead + voFrames + cfg.tail + (last ? cfg.finalHold : TRANSITION);
    const duration = Math.max(min, fromVoice);
    const timing = { duration, start: cursor, voStart: cursor + lead, voFrames };
    cursor += duration - (last ? 0 : TRANSITION);
    return timing;
  });
};

export const totalFrames = (t: SceneTiming[]) => {
  const last = t[t.length - 1];
  return last.start + last.duration;
};
