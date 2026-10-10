#!/bin/sh
# Renders every link preview in this folder to its PNG: site.html to ../og.png,
# each other page to ../og/<page>.png. Needs Google Chrome. README.md, "The
# link preview".
cd "$(dirname "$0")" || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p ../og
for page in site post routine profile join; do
  if [ "$page" = site ]; then rel=og.png; else rel="og/$page.png"; fi
  out="$PWD/../$rel"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --screenshot="$out" "file://$PWD/$page.html" 2>/dev/null
  echo "$page.html -> $rel"
done
