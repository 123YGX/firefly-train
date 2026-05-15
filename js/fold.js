const Fold = {
    history: [],
    foldLine: null,
    foldSide: null,
    hoveredEdge: null,
    animating: false,
    animProgress: 0,

    reset() {
        this.history = [];
        this.foldLine = null;
        this.foldSide = null;
        this.hoveredEdge = null;
        this.animating = false;
    },

    detectEdge(mx, my) {
        const margin = 15;
        const gx = mx - Grid.offsetX;
        const gy = my - Grid.offsetY;
        const totalW = Grid.gridWidth * Grid.TILE_SIZE;
        const totalH = Grid.gridHeight * Grid.TILE_SIZE;

        if (gx < 0 || gx > totalW || gy < 0 || gy > totalH) return null;

        for (let i = 1; i < Grid.gridWidth; i++) {
            const lineX = i * Grid.TILE_SIZE;
            if (Math.abs(gx - lineX) < margin) {
                return { type: 'vertical', index: i };
            }
        }
        for (let i = 1; i < Grid.gridHeight; i++) {
            const lineY = i * Grid.TILE_SIZE;
            if (Math.abs(gy - lineY) < margin) {
                return { type: 'horizontal', index: i };
            }
        }
        return null;
    },

    determineSide(mx, my, edge) {
        if (edge.type === 'vertical') {
            const gx = mx - Grid.offsetX;
            const lineX = edge.index * Grid.TILE_SIZE;
            return gx < lineX ? 'left' : 'right';
        } else {
            const gy = my - Grid.offsetY;
            const lineY = edge.index * Grid.TILE_SIZE;
            return gy < lineY ? 'top' : 'bottom';
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
                        const mirrorX = 2 * col - x - 1;
                        if (mirrorX < Grid.gridWidth) {
                            const backTile = Grid.currentBack[y][x];
                            if (backTile !== Grid.EMPTY) {
                                newDisplay[y][mirrorX] = backTile;
                            }
                        }
                    }
                    for (let x = 0; x < col; x++) {
                        newDisplay[y][x] = Grid.WALL;
                    }
                }
            } else {
                for (let y = 0; y < Grid.gridHeight; y++) {
                    for (let x = col; x < Grid.gridWidth; x++) {
                        const dist = x - col;
                        const mirrorX = col - dist - 1;
                        if (mirrorX >= 0) {
                            const backTile = Grid.currentBack[y][x];
                            if (backTile !== Grid.EMPTY) {
                                newDisplay[y][mirrorX] = backTile;
                            }
                        }
                    }
                    for (let x = col; x < Grid.gridWidth; x++) {
                        newDisplay[y][x] = Grid.WALL;
                    }
                }
            }
        } else {
            const row = edge.index;
            if (side === 'top') {
                for (let y = 0; y < row; y++) {
                    const mirrorY = 2 * row - y - 1;
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        if (mirrorY < Grid.gridHeight) {
                            const backTile = Grid.currentBack[y][x];
                            if (backTile !== Grid.EMPTY) {
                                newDisplay[mirrorY][x] = backTile;
                            }
                        }
                    }
                }
                for (let y = 0; y < row; y++) {
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        newDisplay[y][x] = Grid.WALL;
                    }
                }
            } else {
                for (let y = row; y < Grid.gridHeight; y++) {
                    const dist = y - row;
                    const mirrorY = row - dist - 1;
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        if (mirrorY >= 0) {
                            const backTile = Grid.currentBack[y][x];
                            if (backTile !== Grid.EMPTY) {
                                newDisplay[mirrorY][x] = backTile;
                            }
                        }
                    }
                }
                for (let y = row; y < Grid.gridHeight; y++) {
                    for (let x = 0; x < Grid.gridWidth; x++) {
                        newDisplay[y][x] = Grid.WALL;
                    }
                }
            }
        }

        Grid.displayGrid = newDisplay;
        Grid.currentFront = newDisplay.map(r => [...r]);
        Audio.playFold();
        return true;
    },

    undo() {
        if (this.history.length === 0) return false;
        const prev = this.history.pop();
        Grid.displayGrid = prev.display;
        Grid.currentFront = prev.front;
        return true;
    },

    resetLevel() {
        this.history = [];
        const level = Levels.getCurrentLevel();
        Grid.init(level);
    },

    drawFoldPreview(ctx) {
        if (!this.hoveredEdge) return;

        const edge = this.hoveredEdge;
        ctx.strokeStyle = 'rgba(255, 183, 77, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();

        if (edge.type === 'vertical') {
            const x = Grid.offsetX + edge.index * Grid.TILE_SIZE;
            ctx.moveTo(x, Grid.offsetY);
            ctx.lineTo(x, Grid.offsetY + Grid.gridHeight * Grid.TILE_SIZE);
        } else {
            const y = Grid.offsetY + edge.index * Grid.TILE_SIZE;
            ctx.moveTo(Grid.offsetX, y);
            ctx.lineTo(Grid.offsetX + Grid.gridWidth * Grid.TILE_SIZE, y);
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    }
};
