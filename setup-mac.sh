#!/bin/bash
# 말하는 지도 — Mac 개발 환경 한 번에 설정 (Node 22 + Claude Code + 프로젝트 의존성)
# 실행: bash ~/Documents/talking-map/setup-mac.sh
set -e
echo "== 1/5 nvm =="
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
if ! grep -q 'NVM_DIR/nvm.sh' "$HOME/.zshrc" 2>/dev/null; then
  printf '\nexport NVM_DIR="$HOME/.nvm"\n[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"\n' >> "$HOME/.zshrc"
fi

echo "== 2/5 Node 22 =="
nvm install 22 >/dev/null
nvm alias default 22 >/dev/null
nvm use 22 >/dev/null
echo "node $(node -v), npm $(npm -v)"

echo "== 3/5 Claude Code (native installer) =="
if ! command -v claude >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/claude" ]; then
  curl -fsSL https://claude.ai/install.sh | bash
fi
if ! grep -q '.local/bin' "$HOME/.zshrc" 2>/dev/null; then
  printf 'export PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.zshrc"
fi
export PATH="$HOME/.local/bin:$PATH"
claude --version || echo "claude 설치 확인 실패 — 새 터미널에서 'claude --version' 다시 확인"

echo "== 4/5 프로젝트 의존성 =="
cd "$HOME/Documents/talking-map"
# 반드시 nvm의 Node 22/npm 10으로 설치해야 package-lock.json(v3)이 유지된다.
# 시스템 Node 14(npm 6)로 npm install 하면 lockfile이 v1으로 바뀌어 버린다.
if [ -f package-lock.json ]; then npm ci; else npm install; fi

echo "== 5/5 .env.local =="
[ -f .env.local ] || cp .env.example .env.local
sed -i '' 's/^ANTHROPIC_MODEL=.*/ANTHROPIC_MODEL=claude-sonnet-5-5/' .env.local

echo
echo "완료. 이제:"
echo "  1) 새 터미널을 열고  claude   를 실행해 로그인 (Orca가 감지하려면 로그인까지 끝내고 Orca를 Cmd+Q 후 재실행)"
echo "  2) .env.local 에 ANTHROPIC_API_KEY 입력"
echo "  3) cd ~/Documents/talking-map && nvm use && npm run dev  →  http://localhost:3000"
echo "     (node -v 가 v22가 아니면 새 터미널을 열거나 'nvm use 22' 실행)"
