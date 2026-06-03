// 折痕铺路引擎（CreaseMode）—— 全新机制，与旧 Fold/Grid/Player 完全解耦。
// 模型：W×H 网格，格子为节点；折叠在「落点行/列」开一条折痕路（edges 集合记录已打通的相邻边）。
// 主人公手动逐格行走，只能沿已折出折痕的边移动；途经萤火即收集；到终点过关，萤火数加星。
// 折痕规则 v1 写在 _roadFromFold()，是设计可玩内核，原型阶段按手感迭代。
const CreaseMode = {
    TS: 80,
    W: 0, H: 0,
    offsetX: 0, offsetY: 0,

    start: null, end: null, memento: null,
    fireflies: null,      // Set("x,y")
    edges: null,          // Set("H:x,y" 右邻边 / "V:x,y" 下邻边)
    history: [],          // 每次折叠前的 edges 快照（undo 用）
    starThresholds: { two: 2, three: 3 },

    // 玩家
    px: 0, py: 0,         // 格坐标
    pixelX: 0, pixelY: 0, // 像素坐标（行走插值）
    targetX: 0, targetY: 0,
    moving: false,
    collected: 0,
    gotMemento: false,
    facingRight: true,
    direction: 'front',
    framePos: 0,

    // 折叠预览/动画
    hover: null,          // {type:'v'|'h', index, side}
    flashRoad: null,      // 新折痕路高亮 {kind, line, t}

    EDGE_MARGIN: 16,

    init(level) {
        this.W = level.width;
        this.H = level.height;
        this.start = { x: level.start[0], y: level.start[1] };
        this.end = { x: level.end[0], y: level.end[1] };
        this.memento = level.memento ? { x: level.memento[0], y: level.memento[1] } : null;
        this.starThresholds = level.stars || { two: 2, three: 3 };

        this.fireflies = new Set((level.fireflies || []).map(f => `${f[0]},${f[1]}`));
        this.edges = new Set();
        // 预置折痕（可选）
        (level.creases || []).forEach(c => this._applyRoad(c.kind, c.line));
        this.history = [];

        this.px = this.start.x; this.py = this.start.y;
        this.collected = 0;
        this.gotMemento = false;
        this.moving = false;
        this.framePos = 0;
        this.hover = null;
        this.flashRoad = null;

        this._calcOffset();
        this.pixelX = this._cx(this.px);
        this.pixelY = this._cy(this.py);
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        this._updateFacing(this.end.x - this.px, this.end.y - this.py);
    },

    reset() {
        const lvl = Levels.getCurrentLevel();
        this.init(lvl);
    },

    _calcOffset() {
        const canvas = document.getElementById('game-canvas');
        this.offsetX = (canvas.width - this.W * this.TS) / 2;
        this.offsetY = (canvas.height - this.H * this.TS) / 2 + 20;
    },

    _cx(gx) { return this.offsetX + gx * this.TS + this.TS / 2; },
    _cy(gy) { return this.offsetY + gy * this.TS + this.TS / 2; },

    // ---- 边集合：H:x,y = (x,y)与(x+1,y)之间的边；V:x,y = (x,y)与(x,y+1)之间的边 ----
    _hKey(x, y) { return `H:${x},${y}`; },
    _vKey(x, y) { return `V:${x},${y}`; },

    // 两相邻格之间的边是否已折通
    _edgeOpen(x1, y1, x2, y2) {
        if (y1 === y2) {
            const lx = Math.min(x1, x2);
            return this.edges.has(this._hKey(lx, y1));
        }
        if (x1 === x2) {
            const ty = Math.min(y1, y2);
            return this.edges.has(this._vKey(x1, ty));
        }
        return false;
    },

    // 折痕规则 v1：竖折→在落点列开一条竖向折痕路；横折→在落点行开一条横向折痕路。
    // 「折痕路」= 沿该行/列把相邻格之间的边全部打通。两条路在交叉格自然连通。
    // edge: {type:'v'|'h', index, side}。竖折 index=折线列号(1..W-1)，落点列取折线相邻的那一列。
    _roadFromFold(edge) {
        if (edge.type === 'v') {
            // 落点列 = 被折一侧紧贴折线的列
            const col = edge.side === 'left' ? edge.index : edge.index - 1;
            return { kind: 'V', line: Math.max(0, Math.min(this.W - 1, col)) };
        } else {
            const row = edge.side === 'top' ? edge.index : edge.index - 1;
            return { kind: 'H', line: Math.max(0, Math.min(this.H - 1, row)) };
        }
    },

    // 把一条折痕路写入 edges。kind 'V'=第 line 列纵向连通；'H'=第 line 行横向连通。
    _applyRoad(kind, line) {
        if (kind === 'V') {
            const x = line;
            for (let y = 0; y < this.H - 1; y++) this.edges.add(this._vKey(x, y));
        } else {
            const y = line;
            for (let x = 0; x < this.W - 1; x++) this.edges.add(this._hKey(x, y));
        }
    },

    // ---- 折叠交互：复用边缘检测几何（同 fold.js detectEdge/determineSide）----
    detectEdge(mx, my) {
        const margin = 24;
        const gx = mx - this.offsetX;
        const gy = my - this.offsetY;
        const totalW = this.W * this.TS, totalH = this.H * this.TS;
        if (gx < 0 || gx > totalW || gy < 0 || gy > totalH) return null;
        let best = null, bestDist = margin;
        for (let i = 1; i < this.W; i++) {
            const d = Math.abs(gx - i * this.TS);
            if (d < bestDist) { bestDist = d; best = { type: 'v', index: i }; }
        }
        for (let i = 1; i < this.H; i++) {
            const d = Math.abs(gy - i * this.TS);
            if (d < bestDist) { bestDist = d; best = { type: 'h', index: i }; }
        }
        return best;
    },

    determineSide(mx, my, edge) {
        if (edge.type === 'v') {
            return (mx - this.offsetX) < edge.index * this.TS ? 'left' : 'right';
        }
        return (my - this.offsetY) < edge.index * this.TS ? 'top' : 'bottom';
    },

    executeFold(edge, side) {
        if (this.moving) return false;
        const road = this._roadFromFold({ type: edge.type, index: edge.index, side });
        // 已经全部折通则忽略（避免空折）
        const before = this.edges.size;
        this.history.push(new Set(this.edges));
        this._applyRoad(road.kind, road.line);
        if (this.edges.size === before) { this.history.pop(); return false; }
        this.flashRoad = { kind: road.kind, line: road.line, t: 0 };
        if (typeof Audio !== 'undefined' && Audio.playFold) Audio.playFold();
        return true;
    },

    undo() {
        if (this.moving || this.history.length === 0) return false;
        this.edges = this.history.pop();
        return true;
    },

    // ---- 手动行走：方向键/WASD/点击相邻格；只能沿已折通的边移动 ----
    _updateFacing(dx, dy) {
        if (Math.abs(dx) >= Math.abs(dy)) {
            this.direction = 'side';
            this.facingRight = dx >= 0;
        } else {
            this.direction = dy > 0 ? 'front' : 'back';
        }
    },

    // 尝试朝 (dx,dy) 走一格（dx,dy ∈ {-1,0,1} 且只能正交单步）
    tryStep(dx, dy) {
        if (this.moving) return false;
        if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
        const nx = this.px + dx, ny = this.py + dy;
        if (nx < 0 || nx >= this.W || ny < 0 || ny >= this.H) return false;
        if (!this._edgeOpen(this.px, this.py, nx, ny)) {
            // 未折通：抖动反馈
            if (typeof Game !== 'undefined' && Game.shakeScreen) Game.shakeScreen();
            return false;
        }
        this.targetX = this._cx(nx);
        this.targetY = this._cy(ny);
        this._pendingX = nx;
        this._pendingY = ny;
        this.moving = true;
        this._updateFacing(dx, dy);
        return true;
    },

    // 点击某格：若与当前格正交相邻则走过去
    tryClickMove(mx, my) {
        if (this.moving) return false;
        const gx = Math.floor((mx - this.offsetX) / this.TS);
        const gy = Math.floor((my - this.offsetY) / this.TS);
        if (gx < 0 || gx >= this.W || gy < 0 || gy >= this.H) return false;
        const dx = gx - this.px, dy = gy - this.py;
        if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
        return this.tryStep(dx, dy);
    },

    // 每帧推进行走插值；到位后结算收集/通关，返回 'arrived'|'complete'|null
    update() {
        if (!this.moving) return null;
        const speed = 4;
        const dx = this.targetX - this.pixelX;
        const dy = this.targetY - this.pixelY;
        const dist = Math.hypot(dx, dy);
        if (dist < speed) {
            this.pixelX = this.targetX;
            this.pixelY = this.targetY;
            this.px = this._pendingX;
            this.py = this._pendingY;
            this.moving = false;
            return this._arriveAt(this.px, this.py);
        }
        this.pixelX += (dx / dist) * speed;
        this.pixelY += (dy / dist) * speed;
        this.framePos = (this.framePos + speed / 20) % 4;
        return null;
    },

    _arriveAt(x, y) {
        const key = `${x},${y}`;
        // 收集萤火
        if (this.fireflies.has(key)) {
            this.fireflies.delete(key);
            this.collected++;
            if (typeof Audio !== 'undefined' && Audio.playCollect) Audio.playCollect();
            if (typeof Particles !== 'undefined') {
                Particles.emit({ x: this._cx(x), y: this._cy(y), count: 20,
                    colors: ['#c8ff32', '#ffeb3b', '#a0ff00', '#fff4c8'],
                    speed: 2.6, life: 45, gravity: -0.02, size: 2.6 });
            }
        }
        // 纪念物（不影响通关）
        if (this.memento && this.memento.x === x && this.memento.y === y && !this.gotMemento) {
            this.gotMemento = true;
            if (typeof Audio !== 'undefined' && Audio.playCollect) Audio.playCollect();
            if (typeof Particles !== 'undefined') {
                Particles.emit({ x: this._cx(x), y: this._cy(y), count: 26,
                    colors: ['#ffd97d', '#fff4c8', '#ffb74d', '#fff'],
                    speed: 3, life: 55, gravity: -0.02, size: 3 });
            }
            if (typeof UI !== 'undefined' && UI.onMementoPickup) UI.onMementoPickup();
        }
        // 终点
        if (x === this.end.x && y === this.end.y) return 'complete';
        return 'arrived';
    },

    // 星级：终点保底 1，按收集萤火数加星
    computeStars() {
        const t = this.starThresholds;
        if (this.collected >= (t.three != null ? t.three : 3)) return 3;
        if (this.collected >= (t.two != null ? t.two : 2)) return 2;
        return 1;
    },

    totalFireflies() {
        // 已收集 + 场上剩余
        return this.collected + this.fireflies.size;
    },

    // ---- 渲染（原型级：纸底 + 萤火 + 折痕路网 + 起终点 + 主人公 + 折叠预览）----
    draw(ctx) {
        const TS = this.TS;
        const gridW = this.W * TS, gridH = this.H * TS;
        const ox = this.offsetX, oy = this.offsetY;
        const pad = 16;

        // 纸张底（奶油纸 + 圆角阴影）
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = 'rgba(244,234,208,0.97)';
        this._roundRect(ctx, ox - pad, oy - pad, gridW + pad * 2, gridH + pad * 2, 10);
        ctx.fill();
        ctx.restore();

        // 可折的格线：画成明显的橙色虚线（呼吸），直观告诉玩家「点这些线能折纸」。
        // 已折通方向的内部线弱化，未折的高亮。
        const pulse = 0.45 + 0.25 * Math.sin(Date.now() / 500);
        ctx.save();
        ctx.lineCap = 'round';
        for (let x = 1; x < this.W; x++) {
            ctx.strokeStyle = `rgba(230,150,50,${pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([7, 6]);
            ctx.beginPath();
            ctx.moveTo(ox + x * TS, oy + 4); ctx.lineTo(ox + x * TS, oy + gridH - 4);
            ctx.stroke();
        }
        for (let y = 1; y < this.H; y++) {
            ctx.strokeStyle = `rgba(230,150,50,${pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([7, 6]);
            ctx.beginPath();
            ctx.moveTo(ox + 4, oy + y * TS); ctx.lineTo(ox + gridW - 4, oy + y * TS);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        // 纸张外边框（实线，圈出整张纸）
        ctx.strokeStyle = 'rgba(150,100,40,0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy, gridW, gridH);
        ctx.restore();

        // 折痕路网：已折通的边画成「纸压痕」亮线（穿过格心连成路）
        this._drawRoads(ctx);

        // 起点 / 终点 印章
        this._drawStamp(ctx, this._cx(this.start.x), this._cy(this.start.y), '始', '#c2392f', 0);
        const breathe = Math.sin(Date.now() / 600) * 1.5;
        this._drawStamp(ctx, this._cx(this.end.x), this._cy(this.end.y), '终', '#d4a017', breathe);

        // 萤火
        this.fireflies.forEach(k => {
            const [fx, fy] = k.split(',').map(Number);
            this._drawFirefly(ctx, this._cx(fx), this._cy(fy));
        });

        // 纪念物
        if (this.memento && !this.gotMemento) {
            this._drawMemento(ctx, this._cx(this.memento.x), this._cy(this.memento.y));
        }

        // 折叠预览（hover 高亮将要产生的折痕路）
        this._drawFoldPreview(ctx);

        // 主人公
        this._drawPlayer(ctx);

        // 操作说明横幅（纸张上方）
        this._drawBanner(ctx);
    },

    _drawRoads(ctx) {
        const TS = this.TS;
        ctx.save();
        ctx.lineCap = 'round';
        this.edges.forEach(key => {
            const [kind, coord] = key.split(':');
            const [x, y] = coord.split(',').map(Number);
            let x1, y1, x2, y2;
            if (kind === 'H') { x1 = this._cx(x); y1 = this._cy(y); x2 = this._cx(x + 1); y2 = y1; }
            else { x1 = this._cx(x); y1 = this._cy(y); x2 = x1; y2 = this._cy(y + 1); }
            // 暗压痕
            ctx.strokeStyle = 'rgba(110,75,30,0.40)';
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            // 亮高光
            ctx.strokeStyle = 'rgba(255,244,200,0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        });
        // 路口小节点（让交叉处更像路网）
        ctx.fillStyle = 'rgba(255,244,200,0.6)';
        for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
            const deg = (x < this.W - 1 && this.edges.has(this._hKey(x, y))) +
                        (x > 0 && this.edges.has(this._hKey(x - 1, y))) +
                        (y < this.H - 1 && this.edges.has(this._vKey(x, y))) +
                        (y > 0 && this.edges.has(this._vKey(x, y - 1)));
            if (deg > 0) { ctx.beginPath(); ctx.arc(this._cx(x), this._cy(y), 3, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
    },

    _drawFirefly(ctx, cx, cy) {
        const t = Date.now();
        const pulse = 0.55 + 0.45 * Math.sin(t / 300 + cx * 0.05);
        const r = this.TS * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
        grad.addColorStop(0, `rgba(220,255,150,${0.5 * pulse})`);
        grad.addColorStop(0.4, `rgba(180,255,90,${0.22 * pulse})`);
        grad.addColorStop(1, 'rgba(160,230,80,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(245,255,210,${Math.min(1, pulse * 1.2)})`;
        ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },

    _drawStamp(ctx, cx, cy, text, color, yOffset) {
        ctx.save();
        ctx.translate(cx, cy + (yOffset || 0));
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.9; ctx.fillStyle = color;
        ctx.font = 'bold 18px "Microsoft YaHei", serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 1);
        ctx.restore();
    },

    _drawMemento(ctx, cx, cy) {
        // 优先用关卡贴纸，回退金礼盒
        const img = this._getStickerImg();
        if (img) {
            const t = Date.now();
            const sc = 1 + 0.04 * Math.sin(t / 600);
            const bob = Math.sin(t / 700) * 1.5;
            const target = this.TS * 0.6 * sc;
            const ar = img.naturalWidth / img.naturalHeight;
            let w, h;
            if (ar >= 1) { w = target; h = target / ar; } else { h = target; w = target * ar; }
            ctx.save();
            ctx.shadowColor = 'rgba(60,40,20,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
            ctx.drawImage(img, cx - w / 2, cy - h / 2 + bob, w, h);
            ctx.restore();
            return;
        }
        const t = Date.now();
        const pulse = 0.7 + 0.3 * Math.sin(t / 400);
        const r = 11;
        ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = pulse;
        ctx.shadowColor = '#ffd97d'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#e8b24a';
        this._roundRect(ctx, -r, -r + 2, r * 2, r * 2 - 2, 3); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, -r + 2); ctx.lineTo(0, r); ctx.moveTo(-r, 1); ctx.lineTo(r, 1); ctx.stroke();
        ctx.restore();
    },

    _stickerCache: {},
    _getStickerImg() {
        if (typeof Levels === 'undefined') return null;
        const key = `${Levels.currentChapter}_${Levels.currentLevel}`;
        let img = this._stickerCache[key];
        if (img === undefined) {
            img = new Image(); img.src = `assets/collection/c${key}.png`;
            this._stickerCache[key] = img;
        }
        return (img && img.complete && img.naturalWidth > 0) ? img : null;
    },

    // 操作说明横幅 + 首折引导箭头
    _drawBanner(ctx) {
        const ox = this.offsetX, oy = this.offsetY;
        const gridW = this.W * this.TS;
        const cx = ox + gridW / 2;
        // 顶部标题行
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(60,40,18,0.92)';
        ctx.font = 'bold 19px "Microsoft YaHei", serif';
        ctx.fillText('点橙色虚线折出路 → 走到「终」过关，沿途收集萤火', cx, oy - 30);
        ctx.fillStyle = 'rgba(90,65,30,0.78)';
        ctx.font = '14px "Microsoft YaHei", serif';
        ctx.fillText('折叠：鼠标点击纸上的橙色虚线　·　行走：方向键 / WASD / 点相邻格　·　撤销 Ctrl+Z　·　重来 R',
            cx, oy + this.H * this.TS + 38);
        ctx.restore();

        // 首折引导：还没折任何路时，箭头指向中间一条竖虚线 + 提示「点这里折」
        if (this.edges.size === 0 && !this.hover) {
            const lineX = ox + Math.floor(this.W / 2) * this.TS;
            const ay = oy + this.H * this.TS * 0.5;
            const bob = Math.sin(Date.now() / 300) * 6;
            ctx.save();
            ctx.fillStyle = 'rgba(220,90,30,0.95)';
            ctx.font = 'bold 15px "Microsoft YaHei", serif';
            ctx.textAlign = 'center';
            ctx.fillText('👆 点这条线试试', lineX, ay - 34 + bob);
            // 箭头
            ctx.strokeStyle = 'rgba(220,90,30,0.95)';
            ctx.fillStyle = 'rgba(220,90,30,0.95)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(lineX, ay - 22 + bob); ctx.lineTo(lineX, ay - 6 + bob); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lineX, ay + 2 + bob);
            ctx.lineTo(lineX - 6, ay - 8 + bob);
            ctx.lineTo(lineX + 6, ay - 8 + bob);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    },

    _drawFoldPreview(ctx) {
        if (this.moving || !this.hover) return;
        const TS = this.TS;
        const e = this.hover;
        // 折线虚线
        ctx.save();
        ctx.strokeStyle = 'rgba(255,183,77,0.6)';
        ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
        ctx.beginPath();
        if (e.type === 'v') {
            const x = this.offsetX + e.index * TS;
            ctx.moveTo(x, this.offsetY); ctx.lineTo(x, this.offsetY + this.H * TS);
        } else {
            const y = this.offsetY + e.index * TS;
            ctx.moveTo(this.offsetX, y); ctx.lineTo(this.offsetX + this.W * TS, y);
        }
        ctx.stroke(); ctx.setLineDash([]);
        // 将产生的折痕路高亮
        const road = this._roadFromFold(e);
        ctx.strokeStyle = 'rgba(255,235,150,0.55)';
        ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath();
        if (road.kind === 'V') {
            const x = this._cx(road.line);
            ctx.moveTo(x, this._cy(0)); ctx.lineTo(x, this._cy(this.H - 1));
        } else {
            const y = this._cy(road.line);
            ctx.moveTo(this._cx(0), y); ctx.lineTo(this._cx(this.W - 1), y);
        }
        ctx.stroke();
        ctx.restore();
    },

    _drawPlayer(ctx) {
        const cx = this.pixelX, cy = this.pixelY;
        // 影子
        ctx.save();
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(cx, cy + 24, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const img = (typeof Player !== 'undefined' && Player.sprites) ? Player.sprites[this.direction] : null;
        if (img && img.complete && img.naturalWidth > 0) {
            const frameW = Math.floor(img.naturalWidth / 4);
            const frameH = img.naturalHeight;
            const charH = 68, charW = Math.floor(charH * (frameW / frameH));
            const frameA = Math.floor(this.framePos) % 4;
            const lift = this.moving ? (1 - Math.cos(this.framePos * Math.PI)) / 2 : 0;
            const breathe = this.moving ? -lift * 2.2 : Math.sin(Date.now() * 0.003) * 1;
            const flip = (this.direction === 'side' && !this.facingRight);
            ctx.save();
            if (flip) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
            ctx.drawImage(img, frameA * frameW, 0, frameW, frameH,
                cx - charW / 2, cy - charH / 2 + breathe, charW, charH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffeb3b'; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    }
};