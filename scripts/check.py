"""Still bukti ke out/check/. Pemakaian dari root proyek:
  python scripts/check.py frame nama 1350
  python scripts/check.py debug nama '{"mode":"bridge","pos":[0,50,-90],"look":[0,40,0],"fov":40}'
"""
import json
import pathlib
import subprocess
import sys

kind, name, arg = sys.argv[1:4]
out = pathlib.Path("out/check")
out.mkdir(parents=True, exist_ok=True)
base = ["npx.cmd", "remotion", "still", "build"]
tail = [f"--scale={sys.argv[4] if len(sys.argv) > 4 else 0.5}", "--gl=angle", "--image-format=png", "--log=error"]
if kind == "frame":
    cmd = base + ["Barelang", str(out / f"{name}.png"), f"--frame={arg}"] + tail
else:
    props = {"preset": "day", "mode": "world", "fov": 40, "build": 1}
    props.update(json.loads(arg))
    pf = pathlib.Path("node_modules/.cache/debug-props.json")
    pf.parent.mkdir(parents=True, exist_ok=True)
    pf.write_text(json.dumps(props))
    cmd = base + ["Debug", str(out / f"{name}.png"), f"--props={pf}"] + tail
r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
print(name, "ok" if r.returncode == 0 else "GAGAL")
if r.returncode:
    print((r.stdout + r.stderr)[-1500:])
