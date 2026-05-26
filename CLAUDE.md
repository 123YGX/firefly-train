# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Paper Trail-inspired paper-folding puzzle game built with pure HTML5 Canvas + vanilla JavaScript. No build tools, no frameworks. Open `index.html` directly in a browser to play.

The game tells the story "萤火与列车" (Firefly and Train) across 6 chapters with 18 total levels. Players fold a virtual sheet of paper along grid lines to reveal hidden paths on the back side, connecting start to end.

## Running

Open `index.html` in any modern browser. No server required.

## Architecture

Global singleton objects communicate directly (no module system, no events bus):

- **Game** (`game.js`) — Main loop (`requestAnimationFrame`), state machine (`menu`/`story`/`playing`/`complete`/`ending`), event binding, orchestrates level flow
- **Grid** (`grid.js`) — Manages the tile grid. Each level has `front` and `back` 2D arrays. `displayGrid` is the current visible state after folds. Tile types: 0=EMPTY, 1=PATH, 2=WALL, 3=START, 4=END
- **Fold** (`fold.js`) — Core mechanic. Detects clicks near grid lines, mirrors back-side tiles onto the display grid, walls out the folded portion. Maintains undo history stack
- **Player** (`player.js`) — BFS pathfinding from current position to END tile. Smooth pixel-based movement animation along the found path
- **Levels** (`levels.js`) — Level data (grid dimensions + front/back arrays) and progress tracking via `localStorage` key `ft_completed`
- **Story** (`story.js`) — Chapter names, intro text, per-level before/after narrative text
- **Tutorial** (`tutorial.js`) — Step-by-step overlay data keyed by `"chapter-level"` string
- **UI** (`ui.js`) — Screen transitions, HUD updates, chapter/level select rendering, tutorial/confirm dialogs
- **Audio** (`audio.js`) — Web Audio API procedural sounds (no audio files)

## Key Mechanics

The fold operation: clicking one side of a grid line mirrors `currentBack` tiles from that side onto `displayGrid` at their reflected positions, then walls out the original side. After each fold, the game auto-checks if BFS can reach END from START — if so, the player moves automatically.

## Script Load Order (matters)

`story.js` → `levels.js` → `tutorial.js` → `grid.js` → `fold.js` → `player.js` → `audio.js` → `ui.js` → `game.js`

Later scripts depend on earlier globals being defined.

## Level Data Format

```js
{ width: N, height: M, front: [[tile...]], back: [[tile...]] }
```

Front contains the visible grid (START, END, initial PATH segments, WALL). Back contains hidden PATH tiles revealed by folding. A level is solvable when folding reveals a connected PATH from START to END.

---

## 工作约定（每次对话开头读这段）

1. **不要假设上一轮对话的上下文还在** —— 上下文窗口有限，且用户可能在不同时间继续。每次新对话先读本文件的"当前进行中方案"，再读 `~/.claude/projects/.../memory/MEMORY.md`，再开口。
2. **碰到"方案 A/B/C"、"按之前那个来"这种引用，文件里没写就直接问用户**，不要猜。
3. **API key、密码、URL** 永远不要写进聊天记录。读 `.env` 文件。
4. **不要再提议铺铁轨机制**（已被否决，见 memory `feedback-track-laying-rejected`）。
5. **视觉风格**：保持程序化纹理 + 章节主题色，不用 paper overlay multiply 叠加（见 memory `feedback-visual-quality`）。

## 外部 API

- **vectorengine（OpenAI 兼容代理）**：生图 + 文本，base_url `https://api.vectorengine.cn/v1`，key 在 `.env` 里 `VECTORENGINE_API_KEY=...`
- 已确认支持的图像生成模型（部分）：`gpt-image-1`、`gpt-image-2`、`dall-e-3`、`flux.1-kontext-pro`、`flux-2-pro`、`doubao-seedream-4-5-251128`、`qwen-image-2.0-pro`、`mj_imagine`、`grok-4-image`、`z-image-turbo`、`kling-image`
- 已确认支持的视频生成模型（部分）：`sora-2`、`viduq3-pro`、`MiniMax-Hailuo-2.3`、`kling-omni-image`

## 当前进行中方案

### UI 改造（任务 #3，已完成第一阶段）

**目标**：把章节选择 + 主菜单改成"火车票"视觉样式，配色采用"夜行萤火"。

**已完成（2026-05-26）：**

✅ **配色（夜行萤火）已落地**
- 底色 `#0a1628` / 容器 `#0f1f3a`
- 主光 `#a8e6cf`（萤火冷绿）/ 次 `#7dd3a0`
- 文字 `#e8f4ea` / `#6b8a7f`
- 暖点缀 `#ffd97d`（车次号 / 印章）

✅ **章节选择 → 站台牌 + 车票网格**（`js/ui.js` `showChapterSelect`）
- 每章一张"站台牌"（DAY 0X 印章式编号、章节名、路线 from→to、里程）
- 每关一张车票 (.train-ticket)：左联（车次号 + 车种 + par 折数）/ 撕裂虚线 + 半圆缺口 / 右联（路线 + 剧情 snippet + 星级 + 条码 + 检票印章）
- 状态：`locked`（候车中/灰）、`unlocked`（检票中/绿光闪烁）、`completed`（已检票/红章倾斜）
- hover 萤火粒子飘动 + 票面悬浮上抬
- 点击触发撕票动画（`tear-off` 关键帧 480ms）→ 进入剧情

✅ **主菜单 → 站台风格按钮**（`#menu-screen.train-mode`）
- 标题加 ◆ 萤火点缀
- 按钮改成"票根"形（左侧撕裂虚线 + 半圆缺口 + 暖黄菱形装饰）
- 副标题字体改成等宽（时刻表风格）

✅ **章节路线表**（`js/ui.js _chapterRoutes`，索引对应六章）
- ch0 G 大学站→江北 0km
- ch1 D 江北→解放碑 38km
- ch2 K 解放碑→朝天门 12km
- ch3 T 朝天门→三峡 410km
- ch4 Z 秦岭→北方原野 1280km
- ch5 S 大连→家 8km

✅ **测试**：通过 `tools/shoot.sh` headless 截图验证（`screen=chapter&unlock=1` 显示三章九票布局正确，已检票/检票中状态切换正常）。

✅ **真机浏览器实测（2026-05-26）**：三状态视觉 / hover+撕票动画 / 剧情进出回路 / 滚动条 全部通过。修过三处：
- 主菜单 hover 长虚线：`css/style.css` train-mode `.menu-btn:hover::before` 加 `height: auto`，否则基础规则的 `height:300px` 把 `border-left` 伪元素拉出按钮 300px
- `js/effects.js` ch2-ch6 变体 PNG 共 25 个 404：用 `tileVariants` 表显式声明哪章有变体（当前只 ch1）
- `index.html` 加内联 SVG favicon，消 favicon.ico 404

**保留作未来选项（暂不做）：**
- 票面纸纹理底图（生图 API）— 当前程序化纹理已够用
- 主菜单"开始旅程"按钮的撕票飞走动画 — 票根按钮只做了 hover/active，进入剧情用 transition-overlay 已有的 fadeout
- 星级评分实现 — `Levels` 暂不存星数，当前以 completed/uncompleted 一刀切显示三星或三空

**已知小问题：**
- 章节列表在 1400x900 容器中只能一屏看到 3 章，需要滚动看 4-6 章。这是 18 张票的天然量，不算 bug。
- 老的 `.chapter-block` / `.level-btn` CSS（line 297-437）已不再使用但保留，便于回滚或非 train-mode 场景。

**下一步建议（等用户决定）：**
- 加引导提示（首次进入选关屏闪烁第一张可玩票）
- 主菜单可加铁轨流光背景动画
- 把章节卡片背景做成"对应站台外景"的 SVG 缩略图（夜雨重庆 / 三峡 / 雪原 / 海岸等）

