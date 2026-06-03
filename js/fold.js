const Fold = {
    history: [],
    foldLine: null,
    foldSide: null,
    hoveredEdge: null,
    hoveredSide: null,
    animating: false,
    animProgress: 0,
    animDuration: 60,
    animEdge: null,
    animSide: null,
    pendingDisplay: null,
    pendingBack: null,
    pendingW: 0,
    pendingH: 0,
    pendingOX: 0,
    pendingOY: 0,
    pendingPlayerX: 0,
    pendingPlayerY: 0,
    creaseHistory: [],
    _previewCache: null,
    _snapshotBefore: null,
    _snapshotAfter: null,

    reset() {
        this.history = [];
        this.foldLine = null;
        this.foldSide = null;
        this.hoveredEdge = null;
        this.hoveredSide = null;
        this.animating = false;
        this.animProgress = 0;
        this.pendingDisplay = null;
        this.pendingBack = null;
        this.pendingW = 0;
        this.pendingH = 0;
        this.pendingOX = 0;
        this.pendingOY = 0;
        this.pendingPlayerX = 0;
        this.pendingPlayerY = 0;
        this.creaseHistory = [];
        this._previewCache = null;
        this._snapshotBefore = null;
        this._snapshotAfter = null;
    },

    detectEdge(mx, my) {
        // 命中区：触摸设备指肚粗，放宽到 28px；鼠标精准，保持 18px。
        const touch = (typeof document !== 'undefined') && document.body.classList.contains('touch-device');
        const margin = touch ? 28 : 18;
        const gx = mx - Grid.offsetX;
        const gy = my - Grid.offsetY;
        const totalW = Grid.gridWidth * Grid.TILE_SIZE;
        const totalH = Grid.gridHeight * Grid.TILE_SIZE;
        if (gx < 0 || gx > totalW || gy < 0 || gy > totalH) return null;

        let best = null;
        let bestDist = margin;

        for (let i = 1; i < Grid.gridWidth; i++) {
            const d = Math.abs(gx - i * Grid.TILE_SIZE);
            if (d < bestDist) {
                bestDist = d;
                best = { type: 'vertical', index: i };
            }
        }
        for (let i = 1; i < Grid.gridHeight; i++) {
            const d = Math.abs(gy - i * Grid.TILE_SIZE);
            if (d < bestDist) {
                bestDist = d;
                best = { type: 'horizontal', index: i };
            }
        }
        return best;
    },

    determineSide(mx, my, edge) {
        if (edge.type === 'vertical') {
            return (mx - Grid.offsetX) < edge.index * Grid.TILE_SIZE ? 'left' : 'right';
        } else {
            return (my - Grid.offsetY) < edge.index * Grid.TILE_SIZE ? 'top' : 'bottom';
        }
    },

    executeFold(edge, side) {
        if (this.animating) return false;

        const oldW = Grid.gridWidth;
        const oldH = Grid.gridHeight;
        const oldDisplay = Grid.displayGrid.map(r => [...r]);
        const oldFront = Grid.currentFront.map(r => [...r]);
        const oldBack = Grid.currentBack.map(r => [...r]);
        const oldOX = Grid.offsetX;
        const oldOY = Grid.offsetY;
        const oldCreases = this.creaseHistory.slice();
        const oldPlayerX = Player.x;
        const oldPlayerY = Player.y;

        this.history.push({
            display: oldDisplay,
            front: oldFront,
            back: oldBack,
            gridWidth: oldW,
            gridHeight: oldH,
            offsetX: oldOX,
            offsetY: oldOY,
            creases: oldCreases,
            playerX: oldPlayerX,
            playerY: oldPlayerY
        });

        let newW, newH, newDisplay, newBack;
        let newPlayerX = oldPlayerX;
        let newPlayerY = oldPlayerY;
        let newOX = oldOX;
        let newOY = oldOY;

        if (edge.type === 'vertical') {
            const col = edge.index;
            if (side === 'left') {
                newW = oldW - col;
                newH = oldH;
                newOX = oldOX + col * Grid.TILE_SIZE;
                newDisplay = [];
                newBack = [];
                for (let y = 0; y < newH; y++) {
                    newDisplay[y] = [];
                    newBack[y] = [];
                    for (let nx = 0; nx < newW; nx++) {
                        const ox = nx + col;
                        newDisplay[y][nx] = oldDisplay[y][ox];
                        newBack[y][nx] = oldBack[y][ox];
                    }
                    for (let lx = 0; lx < col; lx++) {
                        const nx = col - lx - 1;
                        if (nx >= 0 && nx < newW) {
                            const bt = oldBack[y][lx];
                            if (bt !== Grid.EMPTY) newDisplay[y][nx] = this.mirrorTileH(bt);
                        }
                    }
                }
                newPlayerX = oldPlayerX < col ? (col - oldPlayerX - 1) : (oldPlayerX - col);
            } else {
                newW = col;
                newH = oldH;
                newDisplay = [];
                newBack = [];
                for (let y = 0; y < newH; y++) {
                    newDisplay[y] = [];
                    newBack[y] = [];
                    for (let nx = 0; nx < newW; nx++) {
                        newDisplay[y][nx] = oldDisplay[y][nx];
                        newBack[y][nx] = oldBack[y][nx];
                    }
                    for (let rx = col; rx < oldW; rx++) {
                        const nx = 2 * col - rx - 1;
                        if (nx >= 0 && nx < newW) {
                            const bt = oldBack[y][rx];
                            if (bt !== Grid.EMPTY) newDisplay[y][nx] = this.mirrorTileH(bt);
                        }
                    }
                }
                newPlayerX = oldPlayerX >= col ? (2 * col - oldPlayerX - 1) : oldPlayerX;
            }
        } else {
            const row = edge.index;
            if (side === 'top') {
                newW = oldW;
                newH = oldH - row;
                newOY = oldOY + row * Grid.TILE_SIZE;
                newDisplay = [];
                newBack = [];
                for (let ny = 0; ny < newH; ny++) {
                    newDisplay[ny] = [];
                    newBack[ny] = [];
                    const oy = ny + row;
                    for (let x = 0; x < newW; x++) {
                        newDisplay[ny][x] = oldDisplay[oy][x];
                        newBack[ny][x] = oldBack[oy][x];
                    }
                }
                for (let ly = 0; ly < row; ly++) {
                    const ny = row - ly - 1;
                    if (ny >= 0 && ny < newH) {
                        for (let x = 0; x < newW; x++) {
                            const bt = oldBack[ly][x];
                            if (bt !== Grid.EMPTY) newDisplay[ny][x] = this.mirrorTileV(bt);
                        }
                    }
                }
                newPlayerY = oldPlayerY < row ? (row - oldPlayerY - 1) : (oldPlayerY - row);
            } else {
                newW = oldW;
                newH = row;
                newDisplay = [];
                newBack = [];
                for (let ny = 0; ny < newH; ny++) {
                    newDisplay[ny] = [];
                    newBack[ny] = [];
                    for (let x = 0; x < newW; x++) {
                        newDisplay[ny][x] = oldDisplay[ny][x];
                        newBack[ny][x] = oldBack[ny][x];
                    }
                }
                for (let ry = row; ry < oldH; ry++) {
                    const ny = 2 * row - ry - 1;
                    if (ny >= 0 && ny < newH) {
                        for (let x = 0; x < newW; x++) {
                            const bt = oldBack[ry][x];
                            if (bt !== Grid.EMPTY) newDisplay[ny][x] = this.mirrorTileV(bt);
                        }
                    }
                }
                newPlayerY = oldPlayerY >= row ? (2 * row - oldPlayerY - 1) : oldPlayerY;
            }
        }

        this.creaseHistory = this._remapCreases(oldCreases, edge, side, oldW, oldH);

        newPlayerX = Math.max(0, Math.min(newW - 1, newPlayerX));
        newPlayerY = Math.max(0, Math.min(newH - 1, newPlayerY));

        this.pendingDisplay = newDisplay;
        this.pendingBack = newBack;
        this.pendingW = newW;
        this.pendingH = newH;
        this.pendingOX = newOX;
        this.pendingOY = newOY;
        this.pendingPlayerX = newPlayerX;
        this.pendingPlayerY = newPlayerY;

        this.animEdge = edge;
        this.animSide = side;
        this.animating = true;
        this.animProgress = 0;

        this._snapshotBefore = this._captureGridSnapshot(oldDisplay, oldFront, oldW, oldH);

        const savedBg = Grid.bgImageFront;
        if (Grid.bgImageBack) Grid.bgImageFront = Grid.bgImageBack;
        this._snapshotAfter = this._captureGridSnapshot(newDisplay, newDisplay, newW, newH);
        Grid.bgImageFront = savedBg;

        Audio.playFold();
        return true;
    },

    _remapCreases(creases, edge, side, oldW, oldH) {
        const out = [];
        for (const c of creases) {
            if (edge.type === 'vertical' && c.type === 'vertical') {
                const col = edge.index;
                if (side === 'left') {
                    if (c.index > col) out.push({ type: 'vertical', index: c.index - col });
                    else if (c.index < col) {
                        const m = 2 * col - c.index;
                        if (m > col && m < oldW) out.push({ type: 'vertical', index: m - col });
                    }
                } else {
                    if (c.index < col) out.push({ type: 'vertical', index: c.index });
                    else if (c.index > col) {
                        const m = 2 * col - c.index;
                        if (m > 0 && m < col) out.push({ type: 'vertical', index: m });
                    }
                }
            } else if (edge.type === 'horizontal' && c.type === 'horizontal') {
                const row = edge.index;
                if (side === 'top') {
                    if (c.index > row) out.push({ type: 'horizontal', index: c.index - row });
                    else if (c.index < row) {
                        const m = 2 * row - c.index;
                        if (m > row && m < oldH) out.push({ type: 'horizontal', index: m - row });
                    }
                } else {
                    if (c.index < row) out.push({ type: 'horizontal', index: c.index });
                    else if (c.index > row) {
                        const m = 2 * row - c.index;
                        if (m > 0 && m < row) out.push({ type: 'horizontal', index: m });
                    }
                }
            } else if (edge.type === 'vertical' && c.type === 'horizontal') {
                const col = edge.index;
                if (side === 'left') {
                    out.push({ type: 'horizontal', index: c.index });
                } else {
                    out.push({ type: 'horizontal', index: c.index });
                }
            } else {
                const row = edge.index;
                if (side === 'top') {
                    out.push({ type: 'vertical', index: c.index });
                } else {
                    out.push({ type: 'vertical', index: c.index });
                }
            }
        }
        return out;
    },

    _captureGridSnapshot(displayGrid, frontGrid, gw, gh) {
        const TS = Grid.TILE_SIZE;
        const w = gw * TS;
        const h = gh * TS;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext('2d');

        const savedDisplay = Grid.displayGrid;
        const savedFront = Grid.currentFront;
        const savedOX = Grid.offsetX;
        const savedOY = Grid.offsetY;
        const savedGW = Grid.gridWidth;
        const savedGH = Grid.gridHeight;

        Grid.displayGrid = displayGrid;
        Grid.currentFront = frontGrid;
        Grid.offsetX = 0;
        Grid.offsetY = 0;
        Grid.gridWidth = gw;
        Grid.gridHeight = gh;

        try {
            Grid.draw(cx);
        } catch (e) {
            // ignore
        }

        Grid.displayGrid = savedDisplay;
        Grid.currentFront = savedFront;
        Grid.offsetX = savedOX;
        Grid.offsetY = savedOY;
        Grid.gridWidth = savedGW;
        Grid.gridHeight = savedGH;

        return cv;
    },

    updateAnimation() {
        if (!this.animating) return false;
        this.animProgress++;
        if (this.animProgress >= this.animDuration) {
            Grid.gridWidth = this.pendingW;
            Grid.gridHeight = this.pendingH;
            Grid.displayGrid = this.pendingDisplay;
            Grid.currentFront = this.pendingDisplay.map(r => [...r]);
            Grid.currentBack = this.pendingBack;
            Grid.offsetX = this.pendingOX;
            Grid.offsetY = this.pendingOY;
            Player.x = this.pendingPlayerX;
            Player.y = this.pendingPlayerY;
            Player.targetX = Player.x;
            Player.targetY = Player.y;
            Player.pixelX = Grid.offsetX + Player.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
            Player.pixelY = Grid.offsetY + Player.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
            this.animating = false;
            this.pendingDisplay = null;
            this.pendingBack = null;
            return true;
        }
        return false;
    },

    drawFoldAnimation(ctx) {
        if (!this.animating) return;
        const linearT = this.animProgress / this.animDuration;
        const t = linearT < 0.5
            ? 2 * linearT * linearT
            : 1 - Math.pow(-2 * linearT + 2, 2) / 2;
        const edge = this.animEdge;
        const side = this.animSide;
        const TS = Grid.TILE_SIZE;
        const angle = t * Math.PI;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        const isFront = angle < Math.PI / 2;
        const slices = 16;
        const snapBefore = this._snapshotBefore;
        const snapAfter = this._snapshotAfter;

        ctx.save();

        if (edge.type === 'vertical') {
            const lineXSnap = edge.index * TS;
            const lineX = Grid.offsetX + lineXSnap;
            const foldWidth = side === 'left' ? lineXSnap : (Grid.gridWidth * TS - lineXSnap);
            const gridTop = Grid.offsetY;
            const gridH = Grid.gridHeight * TS;
            const sliceW = foldWidth / slices;
            const dirSign = side === 'left' ? -1 : 1;

            const foldedX = side === 'left' ? Grid.offsetX : lineX;
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${t * 0.18})`;
            ctx.fillRect(foldedX, gridTop, foldWidth, gridH);
            ctx.restore();

            const dropShadowAlpha = sinA * 0.5;
            if (dropShadowAlpha > 0) {
                ctx.save();
                ctx.fillStyle = `rgba(0,0,0,${dropShadowAlpha * 0.4})`;
                const sx = lineX + dirSign * 8;
                ctx.beginPath();
                ctx.ellipse(sx, gridTop + gridH/2, foldWidth * 0.4 * Math.abs(cosA) + 20, gridH * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            for (let i = 0; i < slices; i++) {
                const sliceProgress = (i + 0.5) / slices;
                const drawW = sliceW * Math.max(0.01, Math.abs(cosA));
                const dx = lineX + dirSign * (sliceProgress * foldWidth * cosA);
                const sliceX = dx - drawW / 2;

                const lightFactor = isFront
                    ? 1 - sinA * 0.15
                    : 0.7 + cosA * cosA * 0.25;

                ctx.save();
                ctx.beginPath();
                ctx.rect(sliceX, gridTop, drawW + 1, gridH);
                ctx.clip();

                let srcCanvas, srcCenterX;
                if (isFront) {
                    srcCanvas = snapBefore;
                    srcCenterX = lineXSnap + dirSign * sliceProgress * foldWidth;
                } else {
                    srcCanvas = snapAfter;
                    srcCenterX = side === 'left'
                        ? (sliceProgress * foldWidth)
                        : (lineXSnap - sliceProgress * foldWidth);
                }

                if (srcCanvas) {
                    const srcX = srcCenterX - sliceW / 2;
                    ctx.drawImage(srcCanvas, srcX, 0, sliceW, gridH, sliceX, gridTop, drawW + 1, gridH);
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - lightFactor) * 0.5})`;
                ctx.fillRect(sliceX, gridTop, drawW + 1, gridH);

                ctx.restore();
            }

            this._drawFoldCreaseLine(ctx, lineX, gridTop, lineX, gridTop + gridH, t);

        } else {
            const lineYSnap = edge.index * TS;
            const lineY = Grid.offsetY + lineYSnap;
            const foldHeight = side === 'top' ? lineYSnap : (Grid.gridHeight * TS - lineYSnap);
            const gridLeft = Grid.offsetX;
            const gridW = Grid.gridWidth * TS;
            const sliceH = foldHeight / slices;
            const dirSign = side === 'top' ? -1 : 1;

            const foldedY = side === 'top' ? Grid.offsetY : lineY;
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${t * 0.18})`;
            ctx.fillRect(gridLeft, foldedY, gridW, foldHeight);
            ctx.restore();

            const dropShadowAlpha = sinA * 0.5;
            if (dropShadowAlpha > 0) {
                ctx.save();
                ctx.fillStyle = `rgba(0,0,0,${dropShadowAlpha * 0.4})`;
                const sy = lineY + dirSign * 8;
                ctx.beginPath();
                ctx.ellipse(gridLeft + gridW/2, sy, gridW * 0.5, foldHeight * 0.4 * Math.abs(cosA) + 20, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            for (let i = 0; i < slices; i++) {
                const sliceProgress = (i + 0.5) / slices;
                const drawH = sliceH * Math.max(0.01, Math.abs(cosA));
                const dy = lineY + dirSign * (sliceProgress * foldHeight * cosA);
                const sliceY = dy - drawH / 2;

                const lightFactor = isFront
                    ? 1 - sinA * 0.15
                    : 0.7 + cosA * cosA * 0.25;

                ctx.save();
                ctx.beginPath();
                ctx.rect(gridLeft, sliceY, gridW, drawH + 1);
                ctx.clip();

                let srcCanvas, srcCenterY;
                if (isFront) {
                    srcCanvas = snapBefore;
                    srcCenterY = lineYSnap + dirSign * sliceProgress * foldHeight;
                } else {
                    srcCanvas = snapAfter;
                    srcCenterY = side === 'top'
                        ? (sliceProgress * foldHeight)
                        : (lineYSnap - sliceProgress * foldHeight);
                }

                if (srcCanvas) {
                    const srcY = srcCenterY - sliceH / 2;
                    ctx.drawImage(srcCanvas, 0, srcY, gridW, sliceH, gridLeft, sliceY, gridW, drawH + 1);
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - lightFactor) * 0.5})`;
                ctx.fillRect(gridLeft, sliceY, gridW, drawH + 1);

                ctx.restore();
            }

            this._drawFoldCreaseLine(ctx, gridLeft, lineY, gridLeft + gridW, lineY, t);
        }

        ctx.restore();
    },

    _drawFoldCreaseLine(ctx, x1, y1, x2, y2, t) {
        const intensity = Math.sin(t * Math.PI);
        if (intensity <= 0) return;

        const isVert = x1 === x2;
        const ext = 10;

        ctx.save();

        if (isVert) {
            const grad = ctx.createLinearGradient(x1 - ext, 0, x1 + ext, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.3})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x1 - ext, Math.min(y1, y2), ext * 2, Math.abs(y2 - y1));
        } else {
            const grad = ctx.createLinearGradient(0, y1 - ext, 0, y1 + ext);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.3})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(Math.min(x1, x2), y1 - ext, Math.abs(x2 - x1), ext * 2);
        }

        ctx.globalAlpha = intensity * 0.9;
        ctx.strokeStyle = 'rgba(255,248,225,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.globalAlpha = intensity * 0.55;
        ctx.strokeStyle = 'rgba(40,25,15,0.7)';
        ctx.lineWidth = 1;
        const offset = isVert ? 1.5 : 0;
        const offsetY = isVert ? 0 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x1 + offset, y1 + offsetY);
        ctx.lineTo(x2 + offset, y2 + offsetY);
        ctx.stroke();
        ctx.restore();
    },

    mirrorTileH(tile) {
        if (tile === 10) return 12;
        if (tile === 12) return 10;
        return tile;
    },

    mirrorTileV(tile) {
        if (tile === 11) return 13;
        if (tile === 13) return 11;
        return tile;
    },

    undo() {
        if (this.history.length === 0 || this.animating) return false;
        const prev = this.history.pop();
        Grid.gridWidth = prev.gridWidth;
        Grid.gridHeight = prev.gridHeight;
        Grid.displayGrid = prev.display;
        Grid.currentFront = prev.front;
        Grid.currentBack = prev.back;
        Grid.offsetX = prev.offsetX;
        Grid.offsetY = prev.offsetY;
        this.creaseHistory = prev.creases.slice();
        Player.x = prev.playerX;
        Player.y = prev.playerY;
        Player.targetX = Player.x;
        Player.targetY = Player.y;
        Player.pixelX = Grid.offsetX + Player.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        Player.pixelY = Grid.offsetY + Player.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        return true;
    },

    resetLevel() {
        this.history = [];
        this.animating = false;
        this.creaseHistory = [];
        const level = Levels.getCurrentLevel();
        Grid.init(level);
    },

    drawFoldPreview(ctx) {
        if (!this.hoveredEdge || this.animating) return;
        if (typeof Player !== 'undefined' && Player.moving) return;
        if (typeof Game !== 'undefined' && Game.state !== 'playing') return;
        const edge = this.hoveredEdge;
        const side = this.hoveredSide;
        const TS = Grid.TILE_SIZE;

        ctx.strokeStyle = 'rgba(255, 183, 77, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        if (edge.type === 'vertical') {
            const x = Grid.offsetX + edge.index * TS;
            ctx.moveTo(x, Grid.offsetY);
            ctx.lineTo(x, Grid.offsetY + Grid.gridHeight * TS);
        } else {
            const y = Grid.offsetY + edge.index * TS;
            ctx.moveTo(Grid.offsetX, y);
            ctx.lineTo(Grid.offsetX + Grid.gridWidth * TS, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;

        if (!side) return;

        this._drawFoldArrow(ctx, edge, side);

        const tiles = this._getPreviewTiles(edge, side);
        if (!tiles) return;

        ctx.save();
        ctx.globalAlpha = 0.3;
        for (const t of tiles.ghostTiles) {
            const px = Grid.offsetX + t.x * TS;
            const py = Grid.offsetY + t.y * TS;
            ctx.fillStyle = Grid.getBackColor(t.tile);
            ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
        }

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000';
        for (const w of tiles.wallZone) {
            const px = Grid.offsetX + w.x * TS;
            const py = Grid.offsetY + w.y * TS;
            ctx.fillRect(px, py, TS, TS);
        }
        ctx.restore();
    },

    _drawFoldArrow(ctx, edge, side) {
        const TS = Grid.TILE_SIZE;
        const midY = Grid.offsetY + Grid.gridHeight * TS / 2;
        const midX = Grid.offsetX + Grid.gridWidth * TS / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 183, 77, 0.7)';
        ctx.beginPath();

        if (edge.type === 'vertical') {
            const x = Grid.offsetX + edge.index * TS;
            if (side === 'left') {
                ctx.moveTo(x - 20, midY);
                ctx.lineTo(x - 8, midY - 10);
                ctx.lineTo(x - 8, midY + 10);
            } else {
                ctx.moveTo(x + 20, midY);
                ctx.lineTo(x + 8, midY - 10);
                ctx.lineTo(x + 8, midY + 10);
            }
        } else {
            const y = Grid.offsetY + edge.index * TS;
            if (side === 'top') {
                ctx.moveTo(midX, y - 20);
                ctx.lineTo(midX - 10, y - 8);
                ctx.lineTo(midX + 10, y - 8);
            } else {
                ctx.moveTo(midX, y + 20);
                ctx.lineTo(midX - 10, y + 8);
                ctx.lineTo(midX + 10, y + 8);
            }
        }

        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    _getPreviewTiles(edge, side) {
        if (this._previewCache &&
            this._previewCache.edge.type === edge.type &&
            this._previewCache.edge.index === edge.index &&
            this._previewCache.side === side) {
            return this._previewCache.result;
        }

        const ghostTiles = [];
        const wallZone = [];

        if (edge.type === 'vertical') {
            const col = edge.index;
            if (side === 'left') {
                for (let y = 0; y < Grid.gridHeight; y++) {
                    for (let x = 0; x < col; x++) {
                        wallZone.push({x, y});
                        const mx = 2 * col - x - 1;
                        if (mx < Grid.gridWidth) {
                            const bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) ghostTiles.push({x: mx, y, tile: bt});
                        }
                    }
                }
            } else {
                for (let y = 0; y < Grid.gridHeight; y++) {
                    for (let x = col; x < Grid.gridWidth; x++) {
                        wallZone.push({x, y});
                        const mx = col - (x - col) - 1;
                        if (mx >= 0) {
                            const bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) ghostTiles.push({x: mx, y, tile: bt});
                        }
                    }
                }
            }
        } else {
            const row = edge.index;
            if (side === 'top') {
                for (let y = 0; y < row; y++) {
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        wallZone.push({x, y});
                        const my = 2 * row - y - 1;
                        if (my < Grid.gridHeight) {
                            const bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) ghostTiles.push({x, y: my, tile: bt});
                        }
                    }
                }
            } else {
                for (let y = row; y < Grid.gridHeight; y++) {
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        wallZone.push({x, y});
                        const my = row - (y - row) - 1;
                        if (my >= 0) {
                            const bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) ghostTiles.push({x, y: my, tile: bt});
                        }
                    }
                }
            }
        }

        const result = { ghostTiles, wallZone };
        this._previewCache = { edge, side, result };
        return result;
    }
};
