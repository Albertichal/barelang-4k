"""Mengunduh SFX CC0/public domain dari Wikimedia Commons, mengolahnya ke public/sfx/,
dan menulis CREDITS.md. Jalankan dari root proyek:  python scripts/fetch_sfx.py
"""
import html
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "barelang-video-project/1.0 (student project)"}
OUT = pathlib.Path("public/sfx")
OUT.mkdir(parents=True, exist_ok=True)
RAW = pathlib.Path(tempfile.mkdtemp(prefix="sfx_raw_"))

# (file Commons, keluaran, mulai detik, panjang detik, kegunaan)
SOURCES = [
    ("Ocean Waves on a Tropical Beach.ogg", "waves.mp3", 40, 50, "ombak (semua scene laut dan senja)"),
    ("Howling wind.ogg", "wind.mp3", 20, 50, "angin"),
    ("XC707075 - European Herring Gull - Larus argentatus.mp3", "gull.mp3", 0, 19, "camar (scene pantai)"),
    ("Pencil scratchings.ogg", "pencil.mp3", 5, 30, "goresan pensil (scene blueprint)"),
    ("Book paper pages assorted.ogg", "paper.mp3", 5, 30, "kertas (scene blueprint)"),
]


def run_ffmpeg(args):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


def api(title):
    q = urllib.parse.urlencode(
        {"action": "query", "titles": "File:" + title, "prop": "imageinfo", "iiprop": "url|extmetadata",
         "iiextmetadatafilter": "LicenseShortName|Artist", "format": "json"}
    )
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers=UA)
    for _ in range(6):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=40))
            return next(iter(data["query"]["pages"].values()))["imageinfo"][0]
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(int(e.headers.get("Retry-After", "20")) + 3)
    raise RuntimeError("Commons terus membatasi permintaan")


def plain(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


rows = []
for title, name, start, dur, use in SOURCES:
    time.sleep(5)
    info = api(title)
    raw = RAW / ("src" + pathlib.Path(title).suffix)
    with urllib.request.urlopen(urllib.request.Request(info["url"], headers=UA), timeout=180) as r:
        raw.write_bytes(r.read())
    run_ffmpeg(["-ss", str(start), "-t", str(dur), "-i", str(raw), "-ac", "2", "-ar", "44100",
                "-af", "loudnorm=I=-24:TP=-3:LRA=11", "-codec:a", "libmp3lame", "-q:a", "4", str(OUT / name)])
    meta = info["extmetadata"]
    page = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(title.replace(" ", "_"))
    rows.append((name, use, plain(meta.get("Artist", {}).get("value")), plain(meta.get("LicenseShortName", {}).get("value")), page))
    print(name, "ok")

# Dibuat sendiri dengan ffmpeg: tidak ada file CC0 yang cocok / lisensinya tidak jelas.
run_ffmpeg(["-f", "lavfi", "-i", "anoisesrc=d=1.1:c=pink:r=44100:a=0.8:s=7",
            "-af", "highpass=f=350,lowpass=f=4200,afade=t=in:d=0.45:curve=exp,afade=t=out:st=0.5:d=0.6:curve=log,loudnorm=I=-24:TP=-3",
            "-ac", "2", "-codec:a", "libmp3lame", "-q:a", "4", str(OUT / "whoosh.mp3")])

# Dentang logam jauh: parsial sinus yang meluruh, diulang tak beraturan (deterministik).
hits = [0.6, 3.1, 4.0, 7.4, 10.2, 11.0, 14.8, 18.1, 19.2, 23.0, 26.3, 27.1]
partials = "sin(2*PI*640*t)+0.7*sin(2*PI*1537*t)+0.5*sin(2*PI*2311*t)+0.3*sin(2*PI*3790*t)"
one = RAW / "clang.wav"
run_ffmpeg(["-f", "lavfi", "-i", f"aevalsrc='({partials})*exp(-7*t)*0.22':d=0.9:s=44100", str(one)])
inputs, filters = [], []
for i, h in enumerate(hits):
    inputs += ["-i", str(one)]
    ms = int(h * 1000)
    filters.append(f"[{i}]adelay={ms}|{ms}[d{i}]")
mix = "".join(f"[d{i}]" for i in range(len(hits)))
fc = ";".join(filters) + f";{mix}amix=inputs={len(hits)}:normalize=0,lowpass=f=2600,aecho=0.8:0.7:220|470:0.35|0.2,atrim=0:30,loudnorm=I=-24:TP=-3"
run_ffmpeg([*inputs, "-filter_complex", fc, "-ac", "2", "-codec:a", "libmp3lame", "-q:a", "4", str(OUT / "metal.mp3")])

lines = [
    "# Kredit audio",
    "",
    "| File | Kegunaan | Pembuat | Lisensi | Sumber |",
    "|---|---|---|---|---|",
]
lines += [f"| `public/sfx/{a}` | {b} | {c} | {d} | {e} |" for a, b, c, d, e in rows]
lines += [
    "| `public/sfx/whoosh.mp3` | whoosh transisi | Dibuat sendiri dengan ffmpeg (noise tersaring) | Bebas, karya proyek ini | `scripts/fetch_sfx.py` |",
    "| `public/sfx/metal.mp3` | dentang konstruksi jauh | Dibuat sendiri dengan ffmpeg (sintesis sinus) | Bebas, karya proyek ini | `scripts/fetch_sfx.py` |",
    "",
    "Musik: `public/music.mp3` diisi sendiri oleh pembuat video; lisensinya tanggung jawab pengisi.",
    "",
]
pathlib.Path("CREDITS.md").write_text("\n".join(lines), encoding="utf-8")
print("CREDITS.md ok")
