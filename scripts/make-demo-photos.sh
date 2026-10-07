#!/bin/bash
# 시연용 예시 사진: scripts/demo-photos/*.svg → public/demo-photos/*.png (macOS qlmanage 사용)
# 실제 사진이 아니라 그림이며, 왼쪽 위에 "[시연용 예시 사진]" 표기가 들어간다.
set -e
cd "$(dirname "$0")/.."
mkdir -p public/demo-photos
for f in scripts/demo-photos/*.svg; do
  name=$(basename "$f" .svg)
  qlmanage -t -s 800 -o public/demo-photos "$f" >/dev/null 2>&1
  mv "public/demo-photos/$name.svg.png" "public/demo-photos/$name.png"
  echo "public/demo-photos/$name.png ($(stat -f %z "public/demo-photos/$name.png") bytes)"
done
