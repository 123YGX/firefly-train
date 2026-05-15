# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Paper Trail-inspired paper-folding puzzle game built with pure HTML5 Canvas + vanilla JavaScript. No build tools, no frameworks. Open `index.html` directly in a browser to play.

The game tells the story "萤火与列车" (Firefly and Train) across 6 chapters with 13 total levels. Players fold a virtual sheet of paper along grid lines to reveal hidden paths on the back side, connecting start to end.

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
