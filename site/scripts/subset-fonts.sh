#!/bin/sh
# Subsets the self-hosted fonts in app/fonts to the characters the site uses
# (Basic Latin plus a few typographic marks) to keep the critical path small.
# Needs fonttools + brotli: pip install fonttools brotli
set -e
cd "$(dirname "$0")/../app/fonts"
UNICODES="U+0020-007E,U+00A0,U+00A9,U+00B7,U+00D7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+203A,U+2190-2195,U+2713"
for f in Lato-400 Lato-700 Lato-900 GrandHotel-400; do
  pyftsubset "$f.woff2" --unicodes="$UNICODES" --layout-features='kern,liga,calt' --flavor=woff2 --output-file="$f.tmp.woff2"
  mv "$f.tmp.woff2" "$f.woff2"
done
# Geist Mono is variable: keep weights 400-700 only.
fonttools varLib.instancer GeistMono.woff2 wght=400:700 -o GeistMono.tmp.ttf
pyftsubset GeistMono.tmp.ttf --unicodes="$UNICODES" --layout-features='kern' --flavor=woff2 --output-file=GeistMono.woff2
rm GeistMono.tmp.ttf
