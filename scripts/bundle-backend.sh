#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────
# Bundle the IceTop Python backend into a self-contained binary
# using PyInstaller.  Output: backend-dist/icetop-backend
# ────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "▸ Installing Python dependencies …"
pip install -r python/requirements.txt
pip install pyinstaller

echo "▸ Running PyInstaller …"
python -m PyInstaller \
  --name icetop-backend \
  --onedir \
  --noconfirm \
  --clean \
  --hidden-import=handlers \
  --hidden-import=handlers.catalog \
  --hidden-import=handlers.chat \
  --hidden-import=handlers.agent \
  --hidden-import=handlers.notebook \
  --hidden-import=handlers.sql \
  --hidden-import=handlers.settings \
  --hidden-import=handlers.iceframe_loader \
  --hidden-import=iceframe \
  --hidden-import=pyiceberg \
  --hidden-import=pyiceberg.catalog \
  --hidden-import=pyiceberg.catalog.rest \
  --hidden-import=pyiceberg.io \
  --hidden-import=pyiceberg.io.fsspec \
  --hidden-import=polars \
  --hidden-import=yaml \
  --hidden-import=openai \
  --hidden-import=anthropic \
  --hidden-import=google.generativeai \
  --hidden-import=httpx \
  --hidden-import=httpcore \
  --hidden-import=anyio \
  --hidden-import=anyio._backends \
  --hidden-import=anyio._backends._asyncio \
  --hidden-import=sniffio \
  --hidden-import=h11 \
  --hidden-import=pydantic \
  --hidden-import=pydantic_core \
  --hidden-import=certifi \
  --hidden-import=charset_normalizer \
  --hidden-import=requests \
  --hidden-import=urllib3 \
  --hidden-import=idna \
  --collect-submodules=pyiceberg \
  --collect-submodules=iceframe \
  --collect-submodules=polars \
  --collect-submodules=google.generativeai \
  --paths=python \
  python/server.py

# Move output to standard location
rm -rf backend-dist
mv dist/icetop-backend backend-dist

echo "✓ Backend binary ready at: backend-dist/icetop-backend"
echo "  Test with: ./backend-dist/icetop-backend"
