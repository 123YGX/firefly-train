#!/bin/bash
set -e
git add -A
git status --short
git commit -m "暖色水彩主菜单与选关页统一风格 + 工具脚本更新"
git push -u origin 长途
