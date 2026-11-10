"""Narasi per scene. Urutan prioritas tiap scene:
  1. Rekaman sendiri: public/vo/rec_sceneNN.wav (diolah otomatis dengan ffmpeg)
  2. ElevenLabs: butuh environment variable ELEVENLABS_API_KEY

Jalankan dari root proyek:
  python scripts/generate_voice.py --samples        (3 sampel ke out/check/voice_*.mp3)
  python scripts/generate_voice.py --voice George   (narasi penuh dengan suara pilihan)
  python scripts/generate_voice.py --recordings     (hanya mengolah rekaman sendiri)

API key TIDAK PERNAH ditulis ke file; hanya dibaca dari environment.
"""
import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from narration import SCENES, V3_TAGS  # noqa: E402

VO = pathlib.Path("public/vo")
CHECK = pathlib.Path("out/check")
API = "https://api.elevenlabs.io/v1"
# Suara premade pria yang dicoba untuk sampel.
PREFERRED = ["Bill", "George", "Brian", "Daniel", "Adam"]
SAMPLE_TEXT = " ".join(p[0] for p in SCENES[0])
# Rantai olah rekaman: noise reduction, high-pass 80 Hz, de-esser, kompresor, -16 LUFS.
REC_FILTER = (
    "afftdn=nf=-25,highpass=f=80,deesser=i=0.4,"
    "acompressor=threshold=-18dB:ratio=3:attack=15:release=180:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=11"
)


def key():
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        sys.exit(
            "ELEVENLABS_API_KEY belum diset. Di PowerShell jalankan:\n"
            '  $env:ELEVENLABS_API_KEY = "isi-key-kamu"\n'
            "lalu ulangi perintah ini di terminal yang sama."
        )
    return k


def request(path, body=None):
    headers = {"xi-api-key": key(), "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def voices():
    data = request("/voices")["voices"]
    usable = [v for v in data if (v.get("labels") or {}).get("gender", "male") == "male"]
    usable.sort(key=lambda v: PREFERRED.index(n) if (n := v["name"].split(" ")[0]) in PREFERRED else 99)
    return usable


def tts(voice_id, text):
    """Coba eleven_v3 dulu, lalu eleven_multilingual_v2 kalau v3 ditolak."""
    attempts = [
        ("eleven_v3", {"language_code": "id"}, {"stability": 0.5, "similarity_boost": 0.75}),
        ("eleven_multilingual_v2", {}, {"stability": 0.45, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True}),
    ]
    last = None
    for model, extra, settings in attempts:
        spoken = text if model == "eleven_v3" else strip_tags(text)
        body = {"text": spoken, "model_id": model, "voice_settings": settings, **extra}
        try:
            res = request(f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128", body)
            return res, model, spoken
        except urllib.error.HTTPError as e:
            last = f"{model}: HTTP {e.code} {e.read()[:300]!r}"
            print("  gagal", last)
    sys.exit(f"ElevenLabs gagal: {last}")


def strip_tags(text):
    for t in set(V3_TAGS):
        text = text.replace(t + " ", "")
    return text


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], text=True
    )
    return float(out.strip())


def cues_from_alignment(parts, spoken, alignment):
    """Waktu tiap potongan subtitle dari timestamp per karakter."""
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    cues, cursor = [], 0
    for say, sub in parts:
        i0 = spoken.find(say, cursor)
        if i0 < 0:
            sys.exit(f"Potongan tidak ditemukan pada teks: {say}")
        i1 = i0 + len(say) - 1
        cursor = i1
        cues.append({"text": sub, "start": starts[i0], "end": ends[min(i1, len(ends) - 1)]})
    return cues


def cues_proportional(parts, total):
    words = [len(p[0].split()) for p in parts]
    all_words = sum(words)
    done, cues = 0, []
    for (_, sub), n in zip(parts, words):
        cues.append({"text": sub, "start": done / all_words * total, "end": (done + n) / all_words * total})
        done += n
    return cues


def process_recording(idx, rec):
    out = VO / f"scene{idx + 1:02d}.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(rec), "-af", REC_FILTER, "-ar", "44100",
         "-codec:a", "libmp3lame", "-q:a", "2", str(out)],
        check=True,
    )
    return cues_proportional(SCENES[idx], duration(out))


def load_existing():
    f = VO / "cues.json"
    if f.exists():
        return {c["scene"]: c for c in json.loads(f.read_text(encoding="utf-8"))}
    return {}


def save(result, engines):
    rows = [result[k] for k in sorted(result)]
    (VO / "cues.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    (VO / "meta.json").write_text(json.dumps({"engines": engines}, indent=1), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", action="store_true")
    ap.add_argument("--voice", help="nama suara dari --samples, misal George")
    ap.add_argument("--recordings", action="store_true")
    args = ap.parse_args()
    VO.mkdir(parents=True, exist_ok=True)

    if args.samples:
        CHECK.mkdir(parents=True, exist_ok=True)
        for v in voices()[:3]:
            res, model, _ = tts(v["voice_id"], f"{V3_TAGS[0]} {SAMPLE_TEXT}")
            name = v["name"].split(" ")[0]
            (CHECK / f"voice_{name}.mp3").write_bytes(base64.b64decode(res["audio_base64"]))
            print(f"sampel {name} ({model}) ok")
        print("Dengarkan out/check/voice_*.mp3, lalu jalankan --voice <Nama>.")
        return

    result = load_existing()
    meta = VO / "meta.json"
    engines = json.loads(meta.read_text())["engines"] if meta.exists() else {}
    voice = None
    for i, parts in enumerate(SCENES):
        no = i + 1
        rec = VO / f"rec_scene{no:02d}.wav"
        if rec.exists():
            result[no] = {"scene": no, "cues": process_recording(i, rec)}
            engines[str(no)] = "recording"
            print(f"scene {no:02d}: rekaman diolah")
            continue
        if args.recordings:
            continue
        if voice is None:
            if not args.voice:
                sys.exit("Pilih suara dengan --voice <Nama> (lihat --samples).")
            found = [v for v in voices() if v["name"].split(" ")[0].lower() == args.voice.lower()]
            if not found:
                sys.exit(f"Suara {args.voice} tidak ditemukan.")
            voice = found[0]
        text = " ".join(p[0] for p in parts)
        res, model, spoken = tts(voice["voice_id"], f"{V3_TAGS[i]} {text}")
        (VO / f"scene{no:02d}.mp3").write_bytes(base64.b64decode(res["audio_base64"]))
        align = res.get("alignment")
        total = duration(VO / f"scene{no:02d}.mp3")
        cues = cues_from_alignment(parts, spoken, align) if align else cues_proportional(parts, total)
        result[no] = {"scene": no, "cues": cues}
        engines[str(no)] = "elevenlabs"
        print(f"scene {no:02d}: {model} ok ({total:.1f} s)")
    save(result, engines)
    print("Selesai. Durasi scene dan subtitle menyesuaikan otomatis saat render.")


main()
