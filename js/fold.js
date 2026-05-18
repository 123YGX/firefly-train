const Fold = {
    history: [],
    foldLine: null,
    foldSide: null,
    hoveredEdge: null,
    hoveredSide: null,
    animating: false,
    animProgress: 0,
    animDuration: 45,
    animEdge: null,
    animSide: null,
    pendingDisplay: null,
    creaseHistory: [],
    _previewCache: null,

    reset() {
        this.history = [];
        this.foldLine = null;
        this.foldSide = null;
        this.hoveredEdge = null;
        this.hoveredSide = null;
        this.animating = false;
        this.animProgress = 0;
        this.pendingDisplay = null;
        this.creaseHistory = [];
        this._previewCache = null;
    },

    detectEdge(mx, my) {
        const margin = 15;
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

        const prevDisplay = Grid.displayGrid.map(r => [...r]);
        const prevFront = Grid.currentFront.map(r => [...r]);
        this.history.push({ display: prevDisplay, front: prevFront });

        const newDisplay = Grid.displayGrid.map(r => [...r]);

        if (edge.type === 'vertical') {
            const col = edge.index;
            if (side === 'left') {
                for (let y = 0; y < Grid.gridHeight; y++) {
                    for (let x = 0; x < col; x++) {
                        const mx = 2 * col - x - 1;
                        if (mx < Grid.gridWidth) {
                            let bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) newDisplay[y][mx] = this.mirrorTileH(bt);
                        }
                    }
                    for (let x = 0; x < col; x++) newDisplay[y][x] = Grid.WALL;
                }
            } else {
                for (let y = 0; y < Grid.gridHeight; y++) {
                    for (let x = col; x < Grid.gridWidth; x++) {
                        const mx = col - (x - col) - 1;
                        if (mx >= 0) {
                            let bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) newDisplay[y][mx] = this.mirrorTileH(bt);
                        }
                    }
                    for (let x = col; x < Grid.gridWidth; x++) newDisplay[y][x] = Grid.WALL;
                }
            }
        } else {
            const row = edge.index;
            if (side === 'top') {
                for (let y = 0; y < row; y++) {
                    const my = 2 * row - y - 1;
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        if (my < Grid.gridHeight) {
                            let bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) newDisplay[my][x] = this.mirrorTileV(bt);
                        }
                    }
                }
                for (let y = 0; y < row; y++)
                    for (let x = 0; x < Grid.gridWidth; x++) newDisplay[y][x] = Grid.WALL;
            } else {
                for (let y = row; y < Grid.gridHeight; y++) {
                    const my = row - (y - row) - 1;
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        if (my >= 0) {
                            let bt = Grid.currentBack[y][x];
                            if (bt !== Grid.EMPTY) newDisplay[my][x] = this.mirrorTileV(bt);
                        }
                    }
                }
                for (let y = row; y < Grid.gridHeight; y++)
                    for (let x = 0; x < Grid.gridWidth; x++) newDisplay[y][x] = Grid.WALL;
            }
        }

        this.pendingDisplay = newDisplay;
        this.animEdge = edge;
        this.animSide = side;
        this.animating = true;
        this.animProgress = 0;
        this.creaseHistory.push({ type: edge.type, index: edge.index });
        Audio.playFold();
        return true;
    },

    updateAnimation() {
        if (!this.animating) return false;
        this.animProgress++;
        if (this.animProgress >= this.animDuration) {
            Grid.displayGrid = this.pendingDisplay;
            Grid.currentFront = this.pendingDisplay.map(r => [...r]);
            this.animating = false;
            this.pendingDisplay = null;
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

        ctx.save();

        if (edge.type === 'vertical') {
            const lineX = Grid.offsetX + edge.index * TS;
            const foldWidth = side === 'left' ? edge.index * TS : (Grid.gridWidth - edge.index) * TS;
            const gridTop = Grid.offsetY;
            const gridH = Grid.gridHeight * TS;
            const sliceW = foldWidth / slices;
            const dirSign = side === 'left' ? -1 : 1;

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
                const archHeight = sinA * 25;
                const yLift = -archHeight * Math.sin(sliceProgress * Math.PI);
                const drawW = sliceW * Math.max(0.01, Math.abs(cosA));
                const dx = lineX + dirSign * (sliceProgress * foldWidth * Math.abs(cosA));
                const sliceX = dx - (dirSign === -1 ? drawW : 0);

                const lightFactor = isFront
                    ? 1 - sinA * 0.25 * sliceProgress
                    : 0.65 + cosA * cosA * 0.3;

                ctx.save();
                ctx.beginPath();
                ctx.rect(sliceX, gridTop + yLift, drawW + 1, gridH);
                ctx.clip();

                const tex = isFront ? Effects.getTileCanvas(Grid.PATH) : Effects.getBackTileCanvas();
                if (tex) {
                    const sliceImgX = side === 'left'
                        ? (lineX - foldWidth) + sliceProgress * foldWidth - sliceW/2
                        : lineX + sliceProgress * foldWidth - sliceW/2;
                    if (isFront) {
                        ctx.drawImage(tex, sliceX, gridTop + yLift, drawW + 1, gridH);
                    } else {
                        ctx.drawImage(tex, sliceX, gridTop + yLift, drawW + 1, gridH);
                    }
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - lightFactor) * 0.55})`;
                ctx.fillRect(sliceX, gridTop + yLift, drawW + 1, gridH);

                if (isFront && sliceProgress > 0.85) {
                    ctx.fillStyle = `rgba(255,255,240,${sinA * 0.25})`;
                    ctx.fillRect(sliceX, gridTop + yLift, drawW + 1, gridH);
                }

                ctx.restore();
            }

            this._drawFoldCreaseLine(ctx, lineX, gridTop, lineX, gridTop + gridH, t);

        } else {
            const lineY = Grid.offsetY + edge.index * TS;
            const foldHeight = side === 'top' ? edge.index * TS : (Grid.gridHeight - edge.index) * TS;
            const gridLeft = Grid.offsetX;
            const gridW = Grid.gridWidth * TS;
            const sliceH = foldHeight / slices;
            const dirSign = side === 'top' ? -1 : 1;

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
                const archHeight = sinA * 25;
                const xLift = -archHeight * Math.sin(sliceProgress * Math.PI);
                const drawH = sliceH * Math.max(0.01, Math.abs(cosA));
                const dy = lineY + dirSign * (sliceProgress * foldHeight * Math.abs(cosA));
                const sliceY = dy - (dirSign === -1 ? drawH : 0);

                const lightFactor = isFront
                    ? 1 - sinA * 0.25 * sliceProgress
                    : 0.65 + cosA * cosA * 0.3;

                ctx.save();
                ctx.beginPath();
                ctx.rect(gridLeft + xLift, sliceY, gridW, drawH + 1);
                ctx.clip();

                const tex = isFront ? Effects.getTileCanvas(Grid.PATH) : Effects.getBackTileCanvas();
                if (tex) {
                    ctx.drawImage(tex, gridLeft + xLift, sliceY, gridW, drawH + 1);
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - lightFactor) * 0.55})`;
                ctx.fillRect(gridLeft + xLift, sliceY, gridW, drawH + 1);

                if (isFront && sliceProgress > 0.85) {
                    ctx.fillStyle = `rgba(255,255,240,${sinA * 0.25})`;
                    ctx.fillRect(gridLeft + xLift, sliceY, gridW, drawH + 1);
                }

                ctx.restore();
            }

            this._drawFoldCreaseLine(ctx, gridLeft, lineY, gridLeft + gridW, lineY, t);
        }

        ctx.restore();
    },

    _drawFoldCreaseLine(ctx, x1, y1, x2, y2, t) {
        const intensity = Math.sin(t * Math.PI);
        if (intensity <= 0) return;

        ctx.save();
        ctx.globalAlpha = intensity * 0.8;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        const offset = x1 === x2 ? 2 : 0;
        const offsetY = y1 === y2 ? 2 : 0;
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
        Grid.displayGrid = prev.display;
        Grid.currentFront = prev.front;
        this.creaseHistory.pop();
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
