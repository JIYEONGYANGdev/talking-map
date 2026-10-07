#!/bin/bash
# 시연용 그림 이미지: scripts/demo-photos/*.svg → "public/demo-photos/표현 이미지/*.png" (macOS qlmanage 사용)
# 실사(public/demo-photos/*-real.png)는 사람이 넣는다. 그림은 발표 자료용 "표현 이미지"로 쓴다.
set -e
cd "$(dirname "$0")/.."
OUT="public/demo-photos/표현 이미지"
mkdir -p "$OUT"
for f in scripts/demo-photos/*.svg; do
  name=$(basename "$f" .svg)
  qlmanage -t -s 800 -o "$OUT" "$f" >/dev/null 2>&1
  mv "$OUT/$name.svg.png" "$OUT/$name.png"
  echo "$OUT/$name.png ($(stat -f %z "$OUT/$name.png") bytes)"
done
