const Fold = {
    history: [],
    foldLine: null,
    foldSide: null,
    hoveredEdge: null,
    hoveredSide: null,
    animating: false,
    animProgress: 0,
    animDuration: 20,
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
        for (let i = 1; i < Grid.gridWidth; i++) {
            if (Math.abs(gx - i * Grid.TILE_SIZE) < margin)
                return { type: 'vertical', index: i };
        }
        for (let i = 1; i < Grid.gridHeight; i++) {
            if (Math.abs(gy - i * Grid.TILE_SIZE) < margin)
                return { type: 'horizontal', index: i };
        }
        return null;
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

        ctx.save();
        ctx.globalAlpha = 0.7;

        if (edge.type === 'vertical') {
            const lineX = Grid.offsetX + edge.index * TS;
            const foldWidth = side === 'left' ? edge.index * TS : (Grid.gridWidth - edge.index) * TS;
            const scaleX = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;

            if (side === 'left') {
                ctx.translate(lineX, 0);
                ctx.scale(-scaleX, 1);
                ctx.translate(-lineX, 0);
                ctx.fillStyle = 'rgba(107, 42, 107, 0.4)';
                ctx.fillRect(lineX - foldWidth, Grid.offsetY, foldWidth, Grid.gridHeight * TS);
            } else {
                ctx.translate(lineX, 0);
                ctx.scale(scaleX, 1);
                ctx.translate(-lineX, 0);
                ctx.fillStyle = 'rgba(107, 42, 107, 0.4)';
                ctx.fillRect(lineX, Grid.offsetY, foldWidth, Grid.gridHeight * TS);
            }
        } else {
            const lineY = Grid.offsetY + edge.index * TS;
            const foldHeight = side === 'top' ? edge.index * TS : (Grid.gridHeight - edge.index) * TS;
            const scaleY = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;

            if (side === 'top') {
                ctx.translate(0, lineY);
                ctx.scale(1, -scaleY);
                ctx.translate(0, -lineY);
                ctx.fillStyle = 'rgba(107, 42, 107, 0.4)';
                ctx.fillRect(Grid.offsetX, lineY - foldHeight, Grid.gridWidth * TS, foldHeight);
            } else {
                ctx.translate(0, lineY);
                ctx.scale(1, scaleY);
                ctx.translate(0, -lineY);
                ctx.fillStyle = 'rgba(107, 42, 107, 0.4)';
                ctx.fillRect(Grid.offsetX, lineY, Grid.gridWidth * TS, foldHeight);
            }
        }

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
