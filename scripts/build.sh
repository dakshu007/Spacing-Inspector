#!/usr/bin/env sh
# Packs extension/ into dist/spacing-inspector-<version>.zip for the Chrome Web Store.
set -e
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./extension/manifest.json').version")
OUT="dist/spacing-inspector-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
(cd extension && zip -qr "../$OUT" . -x '.*')
echo "Built $OUT"
