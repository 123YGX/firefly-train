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
- **图像模型决策（2026-05-31）**：章节/场景配图统一改用 **gpt 系列（`gpt-image-1`）**，不再用 doubao-seedream。`tools/prompts/ch1.txt`、`ch2.txt`、`ch3.txt`（彩铅章节背景）**暂不生成、搁置待定**。
- 已确认支持的视频生成模型（部分）：`sora-2`、`viduq3-pro`、`MiniMax-Hailuo-2.3`、`kling-omni-image`

## 当前进行中方案

### UI 风格统一：暖色水彩 + 奶油纸票（2026-05-27 落地）

**目标**：主菜单和选关页统一到"暖色水彩绘本 + 奶油纸车票"。之前主菜单是温暖水彩，选关页是深蓝"夜行萤火"，两套风格脱节，本次推平。

**配色（暖色奶油纸票）：**
- 票面 bg `#f4ead0`（奶油）→ hover `#fff5d7`，已通关 `#ead8a8`，锁定 `#b8a888`
- 票面边 `#c8a868`（金边），笔触/虚线 `rgba(120,80,30,*)`
- 主文字 `#3d2817`（深棕）/ 副 `#6b4a1f` / 站台标题 `#ffd97d`（金）
- 强调：车次号 `#b8541a`（橘红）/ 已通关印章 `#b8331a` / 检票印章 `#2d6e3a`（绿）/ 锁 `#8a7560`
- 萤火粒子 `#fff4c8` 暖光（原来是冷绿）

**资源：**
- `assets/backgrounds/menu_bg_landscape.jpg` — 主菜单水彩日暮草原 + 绿火车（豆包水印被 logo 遮挡）
- `assets/decor/menu_logo.png` — 用户手扣透明背景的金色"萤火与列车"艺术字
- `assets/backgrounds/chapter_bg_station.jpg` — 选关页同风格水彩，小站台 + 灯笼 + 绿火车 + 雪山日落（doubao-seedream-4-5-251128 生成，无水印）

**CSS 关键位置（`css/style.css`）：**
- L96-105 `.menu-logo` 基础尺寸 / 浮动动画
- L710-730 `#chapter-screen.train-mode` 用 chapter_bg_station.jpg + 渐变遮罩
- L820-1080 `.train-mode .train-ticket` 全套奶油纸票配色
- L1140-1318 `#menu-screen.train-mode` 主菜单（logo `margin-top: -260px`，subtitle 隐藏）
- L1320-1395 menu-btn 改奶油纸票形

**章节路线表**（`js/ui.js _chapterRoutes`）：
- ch0 G 大学站→江北 0km / ch1 D 江北→解放碑 38km / ch2 K 解放碑→朝天门 12km
- ch3 T 朝天门→三峡 410km / ch4 Z 秦岭→北方原野 1280km / ch5 S 大连→家 8km

**已知遗留：**
- `js/ui.js:_processMenuLogo` 洪水填充版抠图保留着，新 logo 不带 `data-chroma-key` 不会触发，留着备用
- 主菜单 bg 右下角有豆包水印，被 logo 遮住；窗口放大或换分辨率可能露
- 老的 `.chapter-block` / `.level-btn` CSS（line 297-437）已不再使用但保留，便于回滚

**backlog（按优先级）：**
1. ~~星级评分真正落库~~ ✅（`Levels.stars` + `ft_stars` localStorage，`game.js` 通关时按 folds vs par 存星，`ui.js` 按真实星数渲染）
2. ~~章节段缩略图 SVG~~ ✅（`ui.js _chapterSceneSVG` 6 章程序化剪影横幅，480x64 viewBox，站台牌顶部渲染，锁定章灰显）
3. 首次进入选关屏闪烁第一张可玩票（引导）
4. 主菜单铁轨流光背景动画

