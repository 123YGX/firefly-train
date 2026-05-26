#!/usr/bin/env bash
# 批量截图工具。
# 用法:
#   tools/shoot.sh                       # 默认套图
#   tools/shoot.sh "level=1-1" "level=2-1:my-2-1"
# 参数格式:  "<query>" 或 "<query>:<filename-stem>"
#
# 前置: dev-server.js 已在 8765 端口运行。
set -e
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
OUT="${SHOOT_OUT:-/tmp/fft-shots}"
BASE="http://127.0.0.1:8765/autoshot.html"
SIZE="${SHOOT_SIZE:-1280,800}"
mkdir -p "$OUT"

if [ $# -eq 0 ]; then
    set -- \
        "screen=menu:01-menu" \
        "screen=chapter&unlock=1:02-chapters" \
        "level=1-1:03-1-1" \
        "level=2-2&unlock=1:04-2-2" \
        "level=3-2&unlock=1:05-3-2" \
        "level=4-1&unlock=1:06-4-1" \
        "level=5-3&unlock=1:07-5-3" \
        "level=6-3&unlock=1:08-6-3" \
        "level=1-1&story=before:09-story-before" \
        "complete=1-1&unlock=1:10-complete"
fi

for spec in "$@"; do
    q="${spec%%:*}"
    name="${spec##*:}"
    [ "$q" = "$name" ] && name=$(echo "$q" | tr -c '[:alnum:]-' '_')
    # 默认追加 nofx=1，除非显式带了 nofx=
    case "$q" in *nofx=*) ;; *) q="${q}&nofx=1" ;; esac
    echo "→ $name  ($q)"
    "$EDGE" --headless=new --disable-gpu --hide-scrollbars \
        --window-size="$SIZE" --virtual-time-budget=3000 \
        --screenshot="$OUT/$name.png" "$BASE?$q" 2>/dev/null
done
echo "done. $OUT/"
ls "$OUT"
