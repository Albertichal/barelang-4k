#!/usr/bin/env bash
# Pemakaian: bash scripts/stills.sh <scale> <frame> [frame...]
# Hasil: out/still/fNNNN.jpg (lebar 1600 px untuk dicek).
scale=$1; shift
mkdir -p out/still
for f in "$@"; do
  name=$(printf "f%04d" "$f")
  start=$(date +%s)
  npx remotion still build Barelang "out/still/$name.full.jpg" --frame="$f" --scale="$scale" --gl=angle --image-format=jpeg --jpeg-quality=92 --log=error 2>&1 | tail -5
  ffmpeg -y -hide_banner -loglevel error -i "out/still/$name.full.jpg" -vf scale=1600:-2 -q:v 3 "out/still/$name.jpg"
  echo "$name $(( $(date +%s) - start ))s $(stat -c %s "out/still/$name.full.jpg") bytes"
done
