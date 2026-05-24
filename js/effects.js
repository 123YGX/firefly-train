const Effects = {
    textures: {},
    bgFireflies: [],
    initialized: false,
    currentChapter: -1,
    images: { tiles: {}, decor: {}, backgrounds: {}, levels: {}, paperBack: null },

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this._initBgFireflies();
        this._loadImages();
    },

    _loadImages() {
        const load = (path) => {
            const img = new Image();
            img.src = path;
            return img;
        };
        for (let i = 1; i <= 6; i++) {
            this.images.tiles[`ch${i}_path`] = load(`assets/tiles/ch${i}_path.jpg`);
            this.images.tiles[`ch${i}_wall`] = load(`assets/tiles/ch${i}_wall.jpg`);
            this.images.backgrounds[`ch${i}`] = load(`assets/backgrounds/ch${i}_bg.jpg`);
            for (const v of ['a', 'b', 'c']) {
                this.images.tiles[`ch${i}_path_${v}`] = load(`assets/tiles/ch${i}_path_${v}.png`);
            }
            for (const v of ['a', 'b']) {
                this.images.tiles[`ch${i}_wall_${v}`] = load(`assets/tiles/ch${i}_wall_${v}.png`);
            }
        }
        this.images.paperBack = load('assets/tiles/paper_back.jpg');
        this.images.paperOverlay = load('assets/textures/paper_overlay.jpg');
        this.images.paperCrease = load('assets/textures/paper_crease.jpg');
        this.images.paperFrame = load('assets/textures/paper_frame.png');
        this.images.edgeMasks = [];
        for (let i = 1; i <= 6; i++) {
            this.images.edgeMasks.push(load(`assets/textures/edge_mask_${i}.png`));
        }
        ['trees','lanterns','moon','mountains','boat','train','fireflies_decor'].forEach(n => {
            this.images.decor[n] = load(`assets/decor/${n}.jpg`);
        });
        this.images.decor.stilted_house = load('assets/decor/stilted_house.png');
    },

    loadLevelImages(level) {
        const load = (path) => {
            if (!path || path.startsWith('procedural:')) return;
            if (this.images.levels[path]) return this.images.levels[path];
            const img = new Image();
            img.src = path;
            this.images.levels[path] = img;
            return img;
        };
        if (level && level.bgImageFront) load(level.bgImageFront);
        if (level && level.bgImageBack) load(level.bgImageBack);
    },

    getLevelImage(path) {
        if (!path) return null;
        if (path.startsWith('procedural:')) {
            return this.getProceduralLevel(path.slice('procedural:'.length));
        }
        const img = this.images.levels[path];
        return this._isReady(img) ? img : null;
    },

    _proceduralLevelCache: {},
    getProceduralLevel(key) {
        if (this._proceduralLevelCache[key]) return this._proceduralLevelCache[key];
        const builder = this._proceduralBuilders[key];
        if (!builder) return null;
        const c = document.createElement('canvas');
        c.width = 800;
        c.height = 480;
        builder.call(this, c.getContext('2d'), c.width, c.height);
        this._proceduralLevelCache[key] = c;
        return c;
    },

    _seededRand(seed) {
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    },

    _drawWoodDesk(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#7a5638');
        g.addColorStop(0.6, '#5a3e26');
        g.addColorStop(1, '#3e2a18');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#2a1a0c';
        ctx.lineWidth = 1;
        for (let i = 0; i < 28; i++) {
            const y = (i / 28) * h + this._seededRand(i + 1) * 6;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= w; x += 12) {
                const yo = y + Math.sin(x * 0.013 + i * 1.3) * 2.2 + (this._seededRand(i * 5 + x) - 0.5) * 1.5;
                ctx.lineTo(x, yo);
            }
            ctx.stroke();
        }
        ctx.restore();
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 14;
            d[i] = Math.max(0, Math.min(255, d[i] + n));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);
    },

    _drawLampGlow(ctx, w, h) {
        const cx = 110, cy = 90;
        const rg = ctx.createRadialGradient(cx, cy, 30, cx, cy, w * 0.85);
        rg.addColorStop(0, 'rgba(255,235,160,0.55)');
        rg.addColorStop(0.35, 'rgba(255,210,120,0.25)');
        rg.addColorStop(1, 'rgba(255,180,80,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    },

    _drawNotebook(ctx, w, h) {
        const px = 50, py = 70, pw = w - 100, ph = h - 130;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#f5ecd0';
        ctx.fillRect(px, py, pw, ph);
        ctx.restore();
        const img = ctx.getImageData(px, py, pw, ph);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 10;
            d[i] = Math.max(0, Math.min(255, d[i] + n));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
        ctx.putImageData(img, px, py);
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = '#b8a78a';
        ctx.lineWidth = 1;
        for (let y = py + 30; y < py + ph - 20; y += 28) {
            ctx.beginPath();
            ctx.moveTo(px + 20, y);
            ctx.lineTo(px + pw - 20, y);
            ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(80,60,40,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, py + 4);
        ctx.lineTo(w / 2, py + ph - 4);
        ctx.stroke();
        ctx.restore();
        return { px, py, pw, ph };
    },

    _drawPencilRoad(ctx, x1, x2, yCenter, brokenL, brokenR) {
        ctx.save();
        const drawRail = (offset) => {
            ctx.beginPath();
            ctx.strokeStyle = '#3a2a18';
            ctx.lineWidth = 2.6;
            ctx.lineCap = 'round';
            let started = false;
            for (let x = x1; x <= x2; x += 4) {
                if (x >= brokenL && x <= brokenR) { started = false; continue; }
                const y = yCenter + offset + Math.sin(x * 0.05) * 1.5 + (this._seededRand(x + offset * 7) - 0.5) * 1.2;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };
        drawRail(-14);
        drawRail(14);
        ctx.fillStyle = '#3a2a18';
        for (let x = x1 + 12; x <= x2 - 12; x += 18) {
            if (x >= brokenL - 6 && x <= brokenR + 6) continue;
            const y = yCenter + Math.sin(x * 0.05) * 1.5;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(x * 0.03) * 0.08);
            ctx.fillRect(-2, -16, 4, 32);
            ctx.restore();
        }
        ctx.restore();
    },

    _drawTear(ctx, cx, cy, halfW, halfH) {
        ctx.save();
        ctx.fillStyle = '#2a1a0c';
        ctx.beginPath();
        const points = [];
        const segments = 14;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = cx - halfW + t * halfW * 2;
            const yJitter = (this._seededRand(i * 3 + 1) - 0.5) * 14;
            points.push([x, cy - halfH + yJitter]);
        }
        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const x = cx - halfW + t * halfW * 2;
            const yJitter = (this._seededRand(i * 5 + 2) - 0.5) * 14;
            points.push([x, cy + halfH + yJitter]);
        }
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, cy - halfH - 2);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = cx - halfW + t * halfW * 2;
            const y = cy - halfH + (this._seededRand(i * 3 + 1) - 0.5) * 14 - 2;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - halfW, cy + halfH + 2);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = cx - halfW + t * halfW * 2;
            const y = cy + halfH + (this._seededRand(i * 5 + 2) - 0.5) * 14 + 2;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    },

    _drawRedMarks(ctx, cx, cy) {
        ctx.save();
        ctx.strokeStyle = '#c8321f';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(cx - 26, cy - 22);
        ctx.lineTo(cx + 26, cy + 22);
        ctx.moveTo(cx + 26, cy - 22);
        ctx.lineTo(cx - 26, cy + 22);
        ctx.stroke();
        ctx.font = 'bold 22px "Microsoft YaHei", serif';
        ctx.fillStyle = '#c8321f';
        ctx.globalAlpha = 0.9;
        ctx.fillText('78', cx - 18, cy + 55);
        ctx.restore();
    },

    _drawPencil(ctx, cx, cy, angle) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#e8c460';
        ctx.fillRect(-70, -5, 130, 10);
        ctx.fillStyle = '#3a2a18';
        ctx.beginPath();
        ctx.moveTo(60, -5);
        ctx.lineTo(78, 0);
        ctx.lineTo(60, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c8a040';
        ctx.fillRect(-78, -5, 8, 10);
        ctx.restore();
    },

    _proceduralBuilders: {
        ch1_lv1_front(ctx, w, h) {
            this._drawWoodDesk(ctx, w, h);
            this._drawLampGlow(ctx, w, h);
            const nb = this._drawNotebook(ctx, w, h);
            const yCenter = 280;
            this._drawPencilRoad(ctx, nb.px + 20, nb.px + nb.pw - 20, yCenter, 320, 480);
            this._drawTear(ctx, 400, yCenter, 80, 32);
            this._drawRedMarks(ctx, 400, yCenter);
            this._drawPencil(ctx, 640, 380, -0.35);
        },
        ch1_lv1_back(ctx, w, h) {
            this._drawWoodDesk(ctx, w, h);
            ctx.save();
            ctx.fillStyle = 'rgba(20,15,30,0.18)';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            this._drawLampGlow(ctx, w, h);
            const nb = this._drawNotebook(ctx, w, h);
            const yCenter = 280;
            this._drawPencilRoad(ctx, nb.px + 20, nb.px + nb.pw - 20, yCenter, -1, -1);
            ctx.save();
            ctx.strokeStyle = '#3a8a3a';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.moveTo(380, yCenter + 45);
            ctx.lineTo(395, yCenter + 60);
            ctx.lineTo(425, yCenter + 30);
            ctx.stroke();
            ctx.restore();
            this._drawPencil(ctx, 640, 380, -0.35);
        }
    },

    _processedEdgeMasks: [],
    _getEdgeMask(idx) {
        if (this._processedEdgeMasks[idx] !== undefined) return this._processedEdgeMasks[idx];
        const img = this.images.edgeMasks && this.images.edgeMasks[idx];
        if (this._isReady(img)) {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                const cx = c.getContext('2d');
                cx.drawImage(img, 0, 0);
                const data = cx.getImageData(0, 0, c.width, c.height);
                const d = data.data;
                for (let i = 0; i < d.length; i += 4) {
                    const lum = d[i];
                    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
                    d[i + 3] = lum;
                }
                cx.putImageData(data, 0, 0);
                this._processedEdgeMasks[idx] = c;
                return c;
            } catch (e) {
                // getImageData blocked under file:// (canvas tainted by cross-origin image)
                // fall through to procedural mask
            }
        }
        this._processedEdgeMasks[idx] = this._buildProceduralMask(idx);
        return this._processedEdgeMasks[idx];
    },

    _buildProceduralMask(seed) {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const cx = c.getContext('2d');
        const segments = 36;
        const ox = size / 2, oy = size / 2;
        const baseR = size * 0.44;
        const rand = (i) => {
            const x = Math.sin((seed * 17 + i) * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };
        cx.fillStyle = '#fff';
        cx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const r = baseR
                + (rand(i) - 0.5) * size * 0.10
                + (rand(i * 3 + 1) - 0.5) * size * 0.035;
            const px = ox + Math.cos(a) * r;
            const py = oy + Math.sin(a) * r;
            if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
        }
        cx.closePath();
        cx.fill();
        return c;
    },

    getVariantTile(chapter, type, x, y) {
        const ch = chapter + 1;
        const variants = type === 'path' ? ['a', 'b', 'c'] : ['a', 'b'];
        const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const v = variants[hash % variants.length];
        const img = this.images.tiles[`ch${ch}_${type}_${v}`];
        return this._isReady(img) ? img : null;
    },

    getEdgeMaskFor(x, y) {
        const idx = ((x * 7 + y * 13) % 6 + 6) % 6;
        return this._getEdgeMask(idx);
    },

    _isReady(img) {
        return img && img.complete && img.naturalWidth > 0;
    },

    drawPaperOverlay(ctx, w, h) {
        const img = this.images.paperOverlay;
        if (!this._isReady(img)) return;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.35;
        const pattern = ctx.createPattern(img, 'repeat');
        if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.drawImage(img, 0, 0, w, h);
        }
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.15;
        const pattern2 = ctx.createPattern(img, 'repeat');
        if (pattern2) {
            ctx.fillStyle = pattern2;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.restore();
    },

    drawGridCrease(ctx, x, y, w, h) {
        const img = this.images.paperCrease;
        if (!this._isReady(img)) return;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
    },

    generateChapterTextures(chapter) {
        if (this.currentChapter === chapter) return;
        this.currentChapter = chapter;
        this.textures = {
            path: this._genTile(240, chapter, 'path'),
            wall: this._genTile(240, chapter, 'wall'),
            back: this._genTile(240, chapter, 'back')
        };
        this._tileOffsets = {};
    },

    _getTileOffset(x, y) {
        const key = `${x},${y}`;
        if (!this._tileOffsets[key]) {
            const seed = x * 7919 + y * 6271;
            this._tileOffsets[key] = {
                ox: (seed % 160),
                oy: ((seed * 31) % 160)
            };
        }
        return this._tileOffsets[key];
    },

    _genTile(size, chapter, type) {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        const theme = this._getTheme(chapter);
        const t = theme[type];

        ctx.fillStyle = t.base;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 120; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const w = 1 + Math.random() * 4;
            const h = 0.5 + Math.random() * 1.5;
            const angle = Math.random() * Math.PI;
            const bright = Math.random() > 0.5;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = bright
                ? `rgba(255,255,255,${0.02 + Math.random() * 0.04})`
                : `rgba(0,0,0,${0.02 + Math.random() * 0.03})`;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.restore();
        }

        for (let i = 0; i < 3; i++) {
            const y = Math.random() * size;
            ctx.strokeStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.02})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = 0; x <= size; x += 4) {
                const fy = y + Math.sin(x * 0.2 + i) * 2 + (Math.random() - 0.5);
                x === 0 ? ctx.moveTo(x, fy) : ctx.lineTo(x, fy);
            }
            ctx.stroke();
        }

        if (type !== 'wall') {
            const edgeGrad = ctx.createLinearGradient(0, 0, 0, size);
            edgeGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
            edgeGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
            edgeGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
            edgeGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
            ctx.fillStyle = edgeGrad;
            ctx.fillRect(0, 0, size, size);
        }

        return c;
    },

    _getTheme(chapter) {
        const themes = [
            { path: {base:'#e6d4ac'}, wall: {base:'#5c4a35'}, back: {base:'#c4a8c0'} },
            { path: {base:'#dcb88c'}, wall: {base:'#4c3520'}, back: {base:'#b89aaa'} },
            { path: {base:'#c89870'}, wall: {base:'#3a2115'}, back: {base:'#a87a90'} },
            { path: {base:'#9cb8c4'}, wall: {base:'#1f3040'}, back: {base:'#8a80a8'} },
            { path: {base:'#8aa085'}, wall: {base:'#1a2418'}, back: {base:'#706888'} },
            { path: {base:'#b89878'}, wall: {base:'#1f1825'}, back: {base:'#8a6e88'} }
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
        // 增加萤火虫数量到30个,让主菜单更有氛围
        for (let i = 0; i < 30; i++) {
            this.bgFireflies.push({
                x: Math.random() * 1400,
                y: Math.random() * 900,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.4,
                size: 1.5 + Math.random() * 3,
                phase: Math.random() * Math.PI * 2,
                speed: 0.015 + Math.random() * 0.025,
                // 添加垂直漂浮效果
                floatPhase: Math.random() * Math.PI * 2,
                floatSpeed: 0.001 + Math.random() * 0.002,
                floatAmplitude: 15 + Math.random() * 25
            });
        }
    },

    updateBgFireflies() {
        const now = Date.now();
        for (const f of this.bgFireflies) {
            // 添加垂直漂浮效果
            const floatOffset = Math.sin(now * f.floatSpeed + f.floatPhase) * f.floatAmplitude * 0.01;
            f.x += f.vx;
            f.y += f.vy + floatOffset;

            // 边界循环
            if (f.x < -10) f.x = 1410;
            if (f.x > 1410) f.x = -10;
            if (f.y < -10) f.y = 910;
            if (f.y > 910) f.y = -10;
        }
    },

    drawBgFireflies(ctx) {
        const now = Date.now();
        for (const f of this.bgFireflies) {
            // 呼吸闪烁效果
            const alpha = 0.2 + 0.5 * Math.sin(now * f.speed * 0.01 + f.phase);

            ctx.save();
            ctx.globalAlpha = alpha;

            // 增强发光效果
            const glowSize = f.size * 3;
            const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowSize);
            gradient.addColorStop(0, 'rgba(200, 255, 50, ' + alpha + ')');
            gradient.addColorStop(0.4, 'rgba(200, 255, 50, ' + (alpha * 0.3) + ')');
            gradient.addColorStop(1, 'rgba(200, 255, 50, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(f.x, f.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // 核心亮点
            ctx.globalAlpha = alpha * 1.2;
            ctx.fillStyle = '#ffff99';
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
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