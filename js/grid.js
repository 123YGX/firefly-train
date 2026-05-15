const Grid = {
    TILE_SIZE: 80,
    EMPTY: 0,
    PATH: 1,
    WALL: 2,
    START: 3,
    END: 4,
    DECO: 5,
    COLLECTIBLE: 6,
    TELEPORT_A: 7,
    TELEPORT_B: 8,
    FRAGILE: 9,
    ONEWAY_R: 10,
    ONEWAY_D: 11,
    ONEWAY_L: 12,
    ONEWAY_U: 13,

    colors: {
        front: {
            0: '#1e2a3a',
            1: '#2a4a6b',
            2: '#0d1520',
            3: '#4caf50',
            4: '#ff7043',
            5: '#1a3050',
            6: '#2a4a6b',
            7: '#1a3a4a',
            8: '#3a2a1a',
            9: '#3a6a9b',
            10: '#2a4a6b',
            11: '#2a4a6b',
            12: '#2a4a6b',
            13: '#2a4a6b'
        },
        back: {
            0: '#2e1a3a',
            1: '#6b2a6b',
            2: '#200d20',
            3: '#4caf50',
            4: '#ff7043',
            5: '#3a1a50',
            6: '#6b2a6b',
            7: '#2a3a4a',
            8: '#4a3a2a',
            9: '#6b4a9b',
            10: '#6b2a6b',
            11: '#6b2a6b',
            12: '#6b2a6b',
            13: '#6b2a6b'
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
        const TS = this.TILE_SIZE;
        const gap = 2;
        const radius = 6;

        Effects.generateChapterTextures(Levels.currentChapter);

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = this.displayGrid[y][x];
                const px = this.offsetX + x * TS + gap;
                const py = this.offsetY + y * TS + gap;
                const tw = TS - gap * 2;
                const th = TS - gap * 2;

                const texCanvas = Effects.getTileCanvas(tile);
                if (texCanvas) {
                    ctx.save();
                    ctx.beginPath();
                    this._roundRect(ctx, px, py, tw, th, radius);
                    ctx.clip();
                    ctx.drawImage(texCanvas, px, py, tw, th);
                    ctx.restore();
                } else {
                    ctx.fillStyle = this.colors.front[tile] || '#1e2a3a';
                    ctx.beginPath();
                    this._roundRect(ctx, px, py, tw, th, radius);
                    ctx.fill();
                }

                const cx = px + tw / 2, cy = py + th / 2;

                if (tile === this.START) {
                    const pulse = 0.4 + 0.2 * Math.sin(Date.now() / 400);
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.shadowColor = '#4caf50';
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#4caf50';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('▶', cx, cy);
                } else if (tile === this.END) {
                    const rot = Date.now() / 1000;
                    ctx.save();
                    ctx.strokeStyle = '#ffb74d';
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 14, rot, rot + Math.PI * 1.5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(cx, cy, 8, rot + Math.PI, rot + Math.PI * 2.5);
                    ctx.stroke();
                    ctx.restore();
                    ctx.fillStyle = '#ffb74d';
                    ctx.font = '18px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('★', cx, cy);
                } else if (tile === this.COLLECTIBLE) {
                    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 300 + x * 0.7);
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.shadowColor = '#c8ff32';
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#c8ff32';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (tile === this.TELEPORT_A || tile === this.TELEPORT_B) {
                    const color = tile === this.TELEPORT_A ? '#00bcd4' : '#ff9800';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    const angle = Date.now() / 500;
                    ctx.beginPath();
                    ctx.arc(cx, cy, TS / 3 - 4, angle, angle + Math.PI * 1.5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(cx, cy, TS / 5, angle + Math.PI, angle + Math.PI * 2.5);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                } else if (tile === this.FRAGILE) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px + 12, py + 12);
                    ctx.lineTo(px + tw - 12, py + th - 12);
                    ctx.moveTo(px + tw - 12, py + 12);
                    ctx.lineTo(px + 12, py + th - 12);
                    ctx.stroke();
                } else if (tile >= 10 && tile <= 13) {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath();
                    if (tile === 10) {
                        ctx.moveTo(cx+12, cy); ctx.lineTo(cx-6, cy-8); ctx.lineTo(cx-6, cy+8);
                    } else if (tile === 11) {
                        ctx.moveTo(cx, cy+12); ctx.lineTo(cx-8, cy-6); ctx.lineTo(cx+8, cy-6);
                    } else if (tile === 12) {
                        ctx.moveTo(cx-12, cy); ctx.lineTo(cx+6, cy-8); ctx.lineTo(cx+6, cy+8);
                    } else {
                        ctx.moveTo(cx, cy-12); ctx.lineTo(cx-8, cy+6); ctx.lineTo(cx+8, cy+6);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
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
        return tile === this.PATH || tile === this.START || tile === this.END
            || tile === this.COLLECTIBLE || tile === this.TELEPORT_A
            || tile === this.TELEPORT_B || tile === this.FRAGILE
            || (tile >= 10 && tile <= 13);
    },

    canEnterFrom(x, y, dx, dy) {
        const tile = this.getTile(x, y);
        if (tile === this.ONEWAY_R) return dx === 1 && dy === 0;
        if (tile === this.ONEWAY_D) return dx === 0 && dy === 1;
        if (tile === this.ONEWAY_L) return dx === -1 && dy === 0;
        if (tile === this.ONEWAY_U) return dx === 0 && dy === -1;
        return true;
    },

    canExitTo(x, y, dx, dy) {
        const tile = this.getTile(x, y);
        if (tile === this.ONEWAY_R) return dx === 1 && dy === 0;
        if (tile === this.ONEWAY_D) return dx === 0 && dy === 1;
        if (tile === this.ONEWAY_L) return dx === -1 && dy === 0;
        if (tile === this.ONEWAY_U) return dx === 0 && dy === -1;
        return true;
    },

    findTeleportPair(fromTile) {
        const targetTile = fromTile === this.TELEPORT_A ? this.TELEPORT_B : this.TELEPORT_A;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.displayGrid[y][x] === targetTile) return { x, y };
            }
        }
        return null;
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
    },

    getBackColor(tile) {
        return this.colors.back[tile] || '#6b2a6b';
    }
};
