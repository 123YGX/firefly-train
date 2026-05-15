const Effects = {
    textures: {},
    bgFireflies: [],
    initialized: false,
    currentChapter: -1,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this._initBgFireflies();
    },

    generateChapterTextures(chapter) {
        if (this.currentChapter === chapter) return;
        this.currentChapter = chapter;
        const TS = Grid.TILE_SIZE;
        this.textures = {
            path: this._genTile(TS, chapter, 'path'),
            wall: this._genTile(TS, chapter, 'wall'),
            back: this._genTile(TS, chapter, 'back')
        };
    },

    _genTile(size, chapter, type) {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        const themes = this._getTheme(chapter);
        const t = themes[type];

        ctx.fillStyle = t.base;
        ctx.fillRect(0, 0, size, size);

        const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.7);
        grad.addColorStop(0, 'rgba(255,255,255,0.03)');
        grad.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 40; i++) {
            ctx.fillStyle = Math.random() > 0.5
                ? `rgba(255,255,255,${Math.random()*0.06})`
                : `rgba(0,0,0,${Math.random()*0.05})`;
            ctx.fillRect(Math.random()*size, Math.random()*size, Math.random()*3+1, Math.random()*3+1);
        }

        this._drawFeatureLines(ctx, size, chapter, type);

        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size-2, size-2);

        return c;
    },

    _getTheme(chapter) {
        const themes = [
            { path: {base:'#8fbc6b'}, wall: {base:'#3a5a2a'}, back: {base:'#7a5a8a'} },
            { path: {base:'#c4a882'}, wall: {base:'#5a3a2a'}, back: {base:'#8a6a7a'} },
            { path: {base:'#9a7a5a'}, wall: {base:'#3a2a2a'}, back: {base:'#8a5a6a'} },
            { path: {base:'#6a9aaa'}, wall: {base:'#2a3a4a'}, back: {base:'#6a5a8a'} },
            { path: {base:'#5a7a5a'}, wall: {base:'#1a2a2a'}, back: {base:'#5a4a6a'} },
            { path: {base:'#6a5a4a'}, wall: {base:'#1a1a2a'}, back: {base:'#5a3a5a'} }
        ];
        return themes[chapter] || themes[0];
    },

    _drawFeatureLines(ctx, size, chapter, type) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;

        if (chapter === 0) {
            if (type === 'path') {
                for (let i = 0; i < 6; i++) {
                    const y = 10 + Math.random() * (size-20);
                    ctx.strokeStyle = `rgba(60,100,40,${0.1+Math.random()*0.1})`;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    for (let x = 0; x < size; x += 8) {
                        ctx.lineTo(x, y + (Math.random()-0.5)*3);
                    }
                    ctx.stroke();
                }
            } else if (type === 'wall') {
                for (let i = 0; i < 8; i++) {
                    ctx.fillStyle = `rgba(30,60,20,${0.2+Math.random()*0.2})`;
                    const bx = Math.random()*size, by = Math.random()*size;
                    ctx.beginPath();
                    ctx.ellipse(bx, by, 4+Math.random()*6, 2+Math.random()*3, Math.random()*Math.PI, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        } else if (chapter === 1) {
            if (type === 'path') {
                ctx.strokeStyle = 'rgba(80,60,40,0.15)';
                ctx.beginPath();
                ctx.moveTo(0, size*0.4); ctx.lineTo(size, size*0.4);
                ctx.moveTo(0, size*0.7); ctx.lineTo(size, size*0.7);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(80,60,40,0.08)';
                ctx.beginPath();
                ctx.moveTo(size*0.3, 0); ctx.lineTo(size*0.3, size);
                ctx.moveTo(size*0.7, 0); ctx.lineTo(size*0.7, size);
                ctx.stroke();
            }
        } else if (chapter === 2) {
            if (type === 'path') {
                for (let i = 0; i < 5; i++) {
                    const y = i * (size/5) + Math.random()*4;
                    ctx.strokeStyle = `rgba(60,40,20,${0.08+Math.random()*0.08})`;
                    ctx.beginPath();
                    ctx.moveTo(0, y); ctx.lineTo(size, y + (Math.random()-0.5)*2);
                    ctx.stroke();
                }
            }
        } else if (chapter === 3) {
            if (type === 'path') {
                ctx.strokeStyle = 'rgba(40,60,80,0.1)';
                for (let i = 0; i < 3; i++) {
                    const y = 15 + i * (size/3);
                    ctx.beginPath();
                    for (let x = 0; x <= size; x += 6) {
                        const wy = y + Math.sin(x*0.15)*4;
                        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
                    }
                    ctx.stroke();
                }
            }
        } else if (chapter === 4) {
            if (type === 'path') {
                ctx.fillStyle = 'rgba(40,60,40,0.08)';
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random()*size, Math.random()*size, 2+Math.random()*4, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        } else if (chapter === 5) {
            if (type === 'path') {
                ctx.strokeStyle = 'rgba(60,40,30,0.12)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(size*0.35, 0); ctx.lineTo(size*0.35, size);
                ctx.moveTo(size*0.65, 0); ctx.lineTo(size*0.65, size);
                ctx.stroke();
                ctx.lineWidth = 1;
                for (let y = 5; y < size; y += 12) {
                    ctx.strokeStyle = 'rgba(60,40,30,0.08)';
                    ctx.beginPath();
                    ctx.moveTo(size*0.2, y); ctx.lineTo(size*0.8, y);
                    ctx.stroke();
                }
            }
        }
    },

    _initBgFireflies() {
        this.bgFireflies = [];
        for (let i = 0; i < 15; i++) {
            this.bgFireflies.push({
                x: Math.random() * 1400, y: Math.random() * 900,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3,
                size: 1.5 + Math.random() * 2.5,
                phase: Math.random() * Math.PI * 2,
                speed: 0.02 + Math.random() * 0.02
            });
        }
    },

    updateBgFireflies() {
        for (const f of this.bgFireflies) {
            f.x += f.vx; f.y += f.vy;
            if (f.x < -10) f.x = 1410; if (f.x > 1410) f.x = -10;
            if (f.y < -10) f.y = 910; if (f.y > 910) f.y = -10;
        }
    },

    drawBgFireflies(ctx) {
        const now = Date.now();
        for (const f of this.bgFireflies) {
            const alpha = 0.15 + 0.35 * Math.sin(now * f.speed * 0.01 + f.phase);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#c8ff32';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#c8ff32';
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    drawSceneEnvironment(ctx, chapter) {
        ctx.save();
        const gx = Grid.offsetX, gy = Grid.offsetY;
        const gw = Grid.gridWidth * Grid.TILE_SIZE;
        const gh = Grid.gridHeight * Grid.TILE_SIZE;

        if (chapter === 0) {
            this._drawTrees(ctx, gx-120, gy, 3, '#5a8a4a');
            this._drawTrees(ctx, gx+gw+40, gy+50, 2, '#4a7a3a');
            this._drawClouds(ctx, 0.08);
        } else if (chapter === 1) {
            this._drawMountains(ctx, 0.1, '#8a6a4a');
            this._drawBuildings(ctx, gx+gw+60, gy, 3, '#7a5a3a');
        } else if (chapter === 2) {
            this._drawLanterns(ctx, gx-60, gy-40, 4);
            this._drawLanterns(ctx, gx+gw+20, gy, 3);
        } else if (chapter === 3) {
            this._drawWaves(ctx, gy+gh+40, 0.08);
            this._drawBoat(ctx, gx-150, gy+gh+60);
            this._drawMountains(ctx, 0.06, '#2a4a5a');
        } else if (chapter === 4) {
            this._drawMountains(ctx, 0.12, '#2a4a3a');
            this._drawStars(ctx, 25, 0.15);
            this._drawRails(ctx, gx-200, gy+gh+30, 0.08);
        } else if (chapter === 5) {
            this._drawMoon(ctx, 1100, 80);
            this._drawTrain(ctx, gx-250, gy+gh+50);
            this._drawStars(ctx, 40, 0.2);
            this._drawRails(ctx, gx-300, gy+gh+80, 0.1);
        }
        ctx.restore();
    },

    _drawTrees(ctx, x, y, count, color) {
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < count; i++) {
            const tx = x + i*60, ty = y + i*40, h = 80+Math.random()*60;
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(tx+12, ty+h-20, 6, 20);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(tx, ty+h-20); ctx.lineTo(tx+15, ty); ctx.lineTo(tx+30, ty+h-20);
            ctx.closePath(); ctx.fill();
        }
    },

    _drawClouds(ctx, alpha) {
        ctx.globalAlpha = alpha; ctx.fillStyle = '#fff';
        for (const [cx,cy] of [[100,60],[500,40],[1000,70],[1300,50]]) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, 50, 20, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx+30, cy-10, 35, 18, 0, 0, Math.PI*2); ctx.fill();
        }
    },

    _drawMountains(ctx, alpha, color) {
        ctx.globalAlpha = alpha; ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, 200);
        ctx.lineTo(150,80); ctx.lineTo(300,160); ctx.lineTo(500,50);
        ctx.lineTo(700,140); ctx.lineTo(900,60); ctx.lineTo(1100,130);
        ctx.lineTo(1300,70); ctx.lineTo(1400,120); ctx.lineTo(1400,200);
        ctx.closePath(); ctx.fill();
    },

    _drawBuildings(ctx, x, y, count, color) {
        ctx.globalAlpha = 0.12; ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const bx = x+i*50, bh = 60+Math.random()*80;
            ctx.fillRect(bx, y+150-bh, 35, bh);
        }
    },

    _drawLanterns(ctx, x, y, count) {
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < count; i++) {
            const lx = x+(i%2)*30, ly = y+i*70;
            ctx.fillStyle = '#ff4a2a';
            ctx.beginPath(); ctx.ellipse(lx, ly+30, 10, 14, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffaa3a'; ctx.globalAlpha = 0.06;
            ctx.beginPath(); ctx.arc(lx, ly+30, 22, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 0.18;
        }
    },

    _drawWaves(ctx, startY, alpha) {
        ctx.globalAlpha = alpha; ctx.strokeStyle = '#5a9aba'; ctx.lineWidth = 1;
        for (let row = 0; row < 5; row++) {
            ctx.beginPath();
            for (let x = 0; x <= 1400; x += 6) {
                const wy = startY + row*25 + Math.sin(x*0.03+row)*6;
                x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }
    },

    _drawBoat(ctx, x, y) {
        ctx.globalAlpha = 0.1; ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.moveTo(x,y+20); ctx.lineTo(x+60,y+20); ctx.lineTo(x+50,y+35); ctx.lineTo(x+10,y+35);
        ctx.closePath(); ctx.fill();
    },

    _drawStars(ctx, count, alpha) {
        ctx.globalAlpha = alpha; ctx.fillStyle = '#fff';
        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            ctx.arc(30+(i*97)%1340, 20+(i*61)%250, 0.5+(i%3)*0.5, 0, Math.PI*2);
            ctx.fill();
        }
    },

    _drawRails(ctx, x, y, alpha) {
        ctx.globalAlpha = alpha; ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+1800,y);
        ctx.moveTo(x,y+16); ctx.lineTo(x+1800,y+16); ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.moveTo(x+i*60,y-4); ctx.lineTo(x+i*60,y+20); ctx.stroke(); }
    },

    _drawMoon(ctx, x, y) {
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffe8a0';
        ctx.shadowColor = '#ffe8a0'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    },

    _drawTrain(ctx, x, y) {
        ctx.globalAlpha = 0.1; ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(x, y, 200, 40); ctx.fillRect(x+200, y-10, 50, 50);
        ctx.fillStyle = '#ffb74d'; ctx.globalAlpha = 0.06;
        for (let i = 0; i < 4; i++) ctx.fillRect(x+20+i*45, y+10, 25, 15);
    },

    drawCreases(ctx) {
        if (!Fold.creaseHistory || Fold.creaseHistory.length === 0) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        for (const crease of Fold.creaseHistory) {
            ctx.beginPath();
            if (crease.type === 'vertical') {
                const x = Grid.offsetX + crease.index * Grid.TILE_SIZE;
                ctx.moveTo(x, Grid.offsetY); ctx.lineTo(x, Grid.offsetY + Grid.gridHeight * Grid.TILE_SIZE);
            } else {
                const y = Grid.offsetY + crease.index * Grid.TILE_SIZE;
                ctx.moveTo(Grid.offsetX, y); ctx.lineTo(Grid.offsetX + Grid.gridWidth * Grid.TILE_SIZE, y);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    getTileCanvas(tile) {
        if (tile === Grid.WALL || tile === Grid.EMPTY) return this.textures.wall;
        return this.textures.path;
    },

    getBackTileCanvas() {
        return this.textures.back;
    }
};