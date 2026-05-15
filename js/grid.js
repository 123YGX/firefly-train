const Grid = {
    TILE_SIZE: 60,
    EMPTY: 0,
    PATH: 1,
    WALL: 2,
    START: 3,
    END: 4,
    DECO: 5,

    colors: {
        front: {
            0: '#1e2a3a',
            1: '#2a4a6b',
            2: '#0d1520',
            3: '#4caf50',
            4: '#ff7043',
            5: '#1a3050'
        },
        back: {
            0: '#2e1a3a',
            1: '#6b2a6b',
            2: '#200d20',
            3: '#4caf50',
            4: '#ff7043',
            5: '#3a1a50'
        }
    },

    currentFront: null,
    currentBack: null,
    displayGrid: null,
    gridWidth: 0,
    gridHeight: 0,
    offsetX: 0,
    offsetY: 0,

    init(level) {
        this.gridWidth = level.width;
        this.gridHeight = level.height;
        this.currentFront = level.front.map(row => [...row]);
        this.currentBack = level.back.map(row => [...row]);
        this.displayGrid = this.currentFront.map(row => [...row]);
        this.calculateOffset();
    },

    calculateOffset() {
        const canvas = document.getElementById('game-canvas');
        const totalW = this.gridWidth * this.TILE_SIZE;
        const totalH = this.gridHeight * this.TILE_SIZE;
        this.offsetX = (canvas.width - totalW) / 2;
        this.offsetY = (canvas.height - totalH) / 2 + 20;
    },

    draw(ctx) {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = this.displayGrid[y][x];
                const px = this.offsetX + x * this.TILE_SIZE;
                const py = this.offsetY + y * this.TILE_SIZE;

                ctx.fillStyle = this.colors.front[tile] || '#1e2a3a';
                ctx.fillRect(px, py, this.TILE_SIZE, this.TILE_SIZE);

                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.strokeRect(px, py, this.TILE_SIZE, this.TILE_SIZE);

                if (tile === this.START) {
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                    ctx.beginPath();
                    ctx.arc(px + this.TILE_SIZE/2, py + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI*2);
                    ctx.fill();
                } else if (tile === this.END) {
                    ctx.fillStyle = 'rgba(255, 112, 67, 0.3)';
                    ctx.beginPath();
                    ctx.arc(px + this.TILE_SIZE/2, py + this.TILE_SIZE/2, this.TILE_SIZE/3, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#ff7043';
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('★', px + this.TILE_SIZE/2, py + this.TILE_SIZE/2 + 7);
                }
            }
        }
    },

    screenToGrid(sx, sy) {
        const gx = Math.floor((sx - this.offsetX) / this.TILE_SIZE);
        const gy = Math.floor((sy - this.offsetY) / this.TILE_SIZE);
        if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
            return { x: gx, y: gy };
        }
        return null;
    },

    getTile(x, y) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            return this.displayGrid[y][x];
        }
        return this.WALL;
    },

    isWalkable(x, y) {
        const tile = this.getTile(x, y);
        return tile === this.PATH || tile === this.START || tile === this.END;
    },

    findStart() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.displayGrid[y][x] === this.START) return { x, y };
            }
        }
        return { x: 0, y: 0 };
    },

    findEnd() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.displayGrid[y][x] === this.END) return { x, y };
            }
        }
        return { x: this.gridWidth - 1, y: this.gridHeight - 1 };
    }
};
