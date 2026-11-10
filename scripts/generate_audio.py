"""Membuat narasi edge-tts per scene + timing subtitle per potongan kalimat.

Jalankan dari root proyek:  python scripts/generate_audio.py
Hasil: public/vo/sceneNN.mp3 dan public/vo/cues.json
"""
import asyncio
import json
import pathlib

import edge_tts

VOICE = "id-ID-ArdiNeural"
RATE = "-5%"
OUT = pathlib.Path("public/vo")

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from narration import SCENES  # noqa: E402


async def synth(idx: int, parts):
    text = " ".join(p[0] for p in parts)
    path = OUT / f"scene{idx + 1:02d}.mp3"
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    events = []
    with open(path, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                events.append((chunk["offset"] / 1e7, (chunk["offset"] + chunk["duration"]) / 1e7))
    if not events:
        raise RuntimeError(f"tidak ada WordBoundary untuk scene {idx + 1}")

    total_words = sum(len(p[0].split()) for p in parts)
    cues, done = [], 0
    for say, sub in parts:
        n = len(say.split())
        i0 = min(len(events) - 1, round(done / total_words * len(events)))
        i1 = min(len(events) - 1, round((done + n) / total_words * len(events)) - 1)
        cues.append({"text": sub, "start": events[i0][0], "end": events[max(i0, i1)][1]})
        done += n
    return {"scene": idx + 1, "cues": cues}


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    result = []
    for i, parts in enumerate(SCENES):
        result.append(await synth(i, parts))
        print(f"scene {i + 1:02d} ok ({len(result[-1]['cues'])} cue)")
    (OUT / "cues.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")


asyncio.run(main())
