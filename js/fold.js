const Fold = {
    history: [],
    foldLine: null,
    foldSide: null,
    hoveredEdge: null,
    hoveredSide: null,
    animating: false,
    animProgress: 0,
    animDuration: 30,
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
        const t = this.animProgress / this.animDuration;
        const edge = this.animEdge;
        const side = this.animSide;
        const TS = Grid.TILE_SIZE;
        const angle = t * Math.PI;

        ctx.save();

        if (edge.type === 'vertical') {
            const lineX = Grid.offsetX + edge.index * TS;
            const foldWidth = side === 'left' ? edge.index * TS : (Grid.gridWidth - edge.index) * TS;
            const gridTop = Grid.offsetY;
            const gridH = Grid.gridHeight * TS;
            const slices = 8;
            const sliceW = foldWidth / slices;

            for (let i = 0; i < slices; i++) {
                const sliceProgress = i / slices;
                const perspScale = Math.abs(Math.cos(angle));
                const lift = Math.sin(angle) * (0.5 + sliceProgress * 0.5) * 15;
                const drawH = gridH * (1 - Math.sin(angle) * 0.04 * sliceProgress);
                const drawW = sliceW * Math.max(0.02, perspScale);
                const yOffset = (gridH - drawH) / 2 - lift;

                let sx, dx;
                if (side === 'left') {
                    sx = lineX - foldWidth + i * sliceW;
                    dx = lineX - (i + 1) * drawW;
                } else {
                    sx = lineX + i * sliceW;
                    dx = lineX + i * drawW;
                }

                const isFront = angle < Math.PI / 2;
                const brightness = isFront
                    ? 1 - Math.sin(angle) * 0.3 * sliceProgress
                    : 0.7 + Math.cos(angle - Math.PI) * 0.3 * (1 - sliceProgress);

                ctx.save();
                ctx.beginPath();
                ctx.rect(dx, gridTop + yOffset, drawW + 1, drawH);
                ctx.clip();

                if (isFront) {
                    const texCanvas = Effects.getTileCanvas(Grid.PATH);
                    if (texCanvas) {
                        ctx.drawImage(texCanvas, dx, gridTop + yOffset, drawW + 1, drawH);
                    } else {
                        ctx.fillStyle = '#2a4a6b';
                        ctx.fillRect(dx, gridTop + yOffset, drawW + 1, drawH);
                    }
                } else {
                    const backTex = Effects.getBackTileCanvas();
                    if (backTex) {
                        ctx.drawImage(backTex, dx, gridTop + yOffset, drawW + 1, drawH);
                    } else {
                        ctx.fillStyle = '#6b2a6b';
                        ctx.fillRect(dx, gridTop + yOffset, drawW + 1, drawH);
                    }
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - brightness) * 0.5})`;
                ctx.fillRect(dx, gridTop + yOffset, drawW + 1, drawH);
                ctx.restore();
            }

            this._drawFoldShadow(ctx, edge, side, t);
            this._drawFoldCreaseLine(ctx, lineX, gridTop, lineX, gridTop + gridH, t);

        } else {
            const lineY = Grid.offsetY + edge.index * TS;
            const foldHeight = side === 'top' ? edge.index * TS : (Grid.gridHeight - edge.index) * TS;
            const gridLeft = Grid.offsetX;
            const gridW = Grid.gridWidth * TS;
            const slices = 8;
            const sliceH = foldHeight / slices;

            for (let i = 0; i < slices; i++) {
                const sliceProgress = i / slices;
                const perspScale = Math.abs(Math.cos(angle));
                const lift = Math.sin(angle) * (0.5 + sliceProgress * 0.5) * 15;
                const drawW = gridW * (1 - Math.sin(angle) * 0.04 * sliceProgress);
                const drawH = sliceH * Math.max(0.02, perspScale);
                const xOffset = (gridW - drawW) / 2;

                let sy, dy;
                if (side === 'top') {
                    sy = lineY - foldHeight + i * sliceH;
                    dy = lineY - (i + 1) * drawH;
                } else {
                    sy = lineY + i * sliceH;
                    dy = lineY + i * drawH;
                }

                const isFront = angle < Math.PI / 2;
                const brightness = isFront
                    ? 1 - Math.sin(angle) * 0.3 * sliceProgress
                    : 0.7 + Math.cos(angle - Math.PI) * 0.3 * (1 - sliceProgress);

                ctx.save();
                ctx.beginPath();
                ctx.rect(gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                ctx.clip();

                if (isFront) {
                    const texCanvas = Effects.getTileCanvas(Grid.PATH);
                    if (texCanvas) {
                        ctx.drawImage(texCanvas, gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                    } else {
                        ctx.fillStyle = '#2a4a6b';
                        ctx.fillRect(gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                    }
                } else {
                    const backTex = Effects.getBackTileCanvas();
                    if (backTex) {
                        ctx.drawImage(backTex, gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                    } else {
                        ctx.fillStyle = '#6b2a6b';
                        ctx.fillRect(gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                    }
                }

                ctx.fillStyle = `rgba(0,0,0,${(1 - brightness) * 0.5})`;
                ctx.fillRect(gridLeft + xOffset, dy - lift, drawW, drawH + 1);
                ctx.restore();
            }

            this._drawFoldShadow(ctx, edge, side, t);
            this._drawFoldCreaseLine(ctx, gridLeft, lineY, gridLeft + gridW, lineY, t);
        }

        ctx.restore();
    },

    _drawFoldShadow(ctx, edge, side, t) {
        const TS = Grid.TILE_SIZE;
        const shadowAlpha = Math.sin(t * Math.PI) * 0.3;
        if (shadowAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = shadowAlpha;

        if (edge.type === 'vertical') {
            const lineX = Grid.offsetX + edge.index * TS;
            const shadowW = 20 * Math.sin(t * Math.PI);
            const grad = ctx.createLinearGradient(
                side === 'left' ? lineX : lineX - shadowW,
                0,
                side === 'left' ? lineX + shadowW : lineX,
                0
            );
            grad.addColorStop(0, side === 'left' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)');
            grad.addColorStop(1, side === 'left' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.4)');
            ctx.fillStyle = grad;
            ctx.fillRect(
                side === 'left' ? lineX : lineX - shadowW,
                Grid.offsetY,
                shadowW,
                Grid.gridHeight * TS
            );
        } else {
            const lineY = Grid.offsetY + edge.index * TS;
            const shadowH = 20 * Math.sin(t * Math.PI);
            const grad = ctx.createLinearGradient(
                0, side === 'top' ? lineY : lineY - shadowH,
                0, side === 'top' ? lineY + shadowH : lineY
            );
            grad.addColorStop(0, side === 'top' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)');
            grad.addColorStop(1, side === 'top' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.4)');
            ctx.fillStyle = grad;
            ctx.fillRect(
                Grid.offsetX,
                side === 'top' ? lineY : lineY - shadowH,
                Grid.gridWidth * TS,
                shadowH
            );
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
