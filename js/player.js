const Player = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    pixelX: 0,
    pixelY: 0,
    moving: false,
    path: [],
    pathIndex: 0,
    moveSpeed: 3,
    size: 20,
    collected: 0,
    gotMemento: false,
    sprites: { side: null, front: null, back: null },
    facingRight: true,
    direction: 'front',
    // 行走动画（按位移驱动 + 子帧插值 + 起伏/微倾）
    framePos: 0,        // 浮点帧位置 0..4，整数部分=当前帧，小数部分=子帧进度
    _lastDrawX: 0,
    _lastDrawY: 0,
    _lean: 0,           // 当前倾斜（弧度），向目标值缓动
    _lastStepFrame: -1, // 上次触发扬尘的帧，用于把扬尘对齐到落地瞬间

    loadSprite() {
        const load = (name, path) => {
            const img = new Image();
            img.src = path;
            this.sprites[name] = img;
        };
        load('side', 'assets/character/walk_side.png');
        load('front', 'assets/character/walk_front.png');
        load('back', 'assets/character/walk_back.png');
    },

    _isReady(img) {
        return img && img.complete && img.naturalWidth > 0;
    },

    _updateFacing(dx, dy) {
        if (Math.abs(dx) >= Math.abs(dy)) {
            this.direction = 'side';
            this.facingRight = dx >= 0;
        } else {
            this.direction = dy > 0 ? 'front' : 'back';
        }
    },

    init(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.pixelX = Grid.offsetX + startX * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.pixelY = Grid.offsetY + startY * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.moving = false;
        this.path = [];
        this.collected = 0;
        this.gotMemento = false;
        this.framePos = 0;
        this._lastDrawX = this.pixelX;
        this._lastDrawY = this.pixelY;
        this._lean = 0;
        this._lastStepFrame = -1;

        const end = Grid.findEnd();
        this._updateFacing(end.x - startX, end.y - startY);
    },

    findPath(endX, endY, fromX, fromY) {
        const grid = Grid.displayGrid;
        if (!grid || !grid.length) return null;
        const w = grid[0].length;
        const sx = (fromX === undefined) ? this.x : fromX;
        const sy = (fromY === undefined) ? this.y : fromY;
        const startKey = sy * w + sx;
        const endKey = endY * w + endX;

        const parent = new Map();
        parent.set(startKey, null);
        const queue = [{ x: sx, y: sy, k: startKey }];
        let head = 0;
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        const reconstruct = () => {
            const out = [];
            let k = endKey;
            while (k !== startKey) {
                const node = parent.get(k);
                out.push(node.teleport
                    ? { x: node.x, y: node.y, teleport: true }
                    : { x: node.x, y: node.y });
                k = node.prev;
            }
            out.reverse();
            return out;
        };

        while (head < queue.length) {
            const cur = queue[head++];
            if (cur.k === endKey) return reconstruct();

            const tile = Grid.getTile(cur.x, cur.y);
            if (tile === Grid.TELEPORT_A || tile === Grid.TELEPORT_B) {
                const exit = Grid.findTeleportPair(tile);
                if (exit) {
                    const ek = exit.y * w + exit.x;
                    if (!parent.has(ek)) {
                        parent.set(ek, { prev: cur.k, x: exit.x, y: exit.y, teleport: true });
                        queue.push({ x: exit.x, y: exit.y, k: ek });
                    }
                }
            }

            for (let i = 0; i < 4; i++) {
                const dx = dirs[i][0], dy = dirs[i][1];
                const nx = cur.x + dx, ny = cur.y + dy;
                const nk = ny * w + nx;
                if (parent.has(nk)) continue;
                if (!Grid.isWalkable(nx, ny)) continue;
                if (!Grid.canExitTo(cur.x, cur.y, dx, dy)) continue;
                if (!Grid.canEnterFrom(nx, ny, dx, dy)) continue;
                parent.set(nk, { prev: cur.k, x: nx, y: ny, teleport: false });
                queue.push({ x: nx, y: ny, k: nk });
            }
        }
        return null;
    },

    // 找当前显示网格上的纪念物坐标（可能在折叠后才出现），没有则 null
    findMemento() {
        const grid = Grid.displayGrid;
        if (!grid) return null;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === Grid.MEMENTO) return { x, y };
            }
        }
        return null;
    },

    // 连通终点的前提下，若纪念物可达则优先绕经它再到终点（不强制）。
    // 返回完整路径数组，或 null（连终点都不通）。
    findCoveringRoute() {
        const end = Grid.findEnd();
        const direct = this.findPath(end.x, end.y);
        if (!direct) return null;  // 终点都到不了，无解

        const m = this.findMemento();
        if (!m) return direct;     // 本关无纪念物 / 已收集

        // 试 起点→纪念物→终点
        const toM = this.findPath(m.x, m.y);
        if (!toM || toM.length === 0) return direct;  // 纪念物不可达，走直达
        const mToEnd = this.findPath(end.x, end.y, m.x, m.y);
        if (!mToEnd) return direct;

        // 拼接（toM 末尾即纪念物格，mToEnd 从纪念物的下一步开始）
        return toM.concat(mToEnd);
    },

    tryMove() {
        const path = this.findCoveringRoute();
        if (path && path.length > 0) {
            this.path = path;
            this.pathIndex = 0;
            this.moving = true;
            this.setNextTarget();
            return true;
        }
        return false;
    },

    setNextTarget() {
        if (this.pathIndex < this.path.length) {
            const next = this.path[this.pathIndex];
            if (next.teleport) {
                this.pixelX = Grid.offsetX + next.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                this.pixelY = Grid.offsetY + next.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                this.x = next.x;
                this.y = next.y;
                Audio.playTeleport();
                this.pathIndex++;
                if (this.pathIndex >= this.path.length) {
                    this.moving = false;
                    return;
                }
                this.setNextTarget();
                return;
            }
            this.targetX = Grid.offsetX + next.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
            this.targetY = Grid.offsetY + next.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
            this._updateFacing(next.x - this.x, next.y - this.y);
        }
    },

    update() {
        if (!this.moving) return false;

        const dx = this.targetX - this.pixelX;
        const dy = this.targetY - this.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.moveSpeed) {
            this.pixelX = this.targetX;
            this.pixelY = this.targetY;
            const prevX = this.x, prevY = this.y;
            const pos = this.path[this.pathIndex];
            this.x = pos.x;
            this.y = pos.y;

            // Fragile tile: previous tile breaks
            if (Grid.getTile(prevX, prevY) === Grid.FRAGILE) {
                Grid.displayGrid[prevY][prevX] = Grid.WALL;
                Audio.playBreak();
                const bpx = Grid.offsetX + prevX * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                const bpy = Grid.offsetY + prevY * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                Particles.emit({x: bpx, y: bpy, count: 10, colors: ['#3a6a9b','#5a8abb','#2a4a6b'], speed: 2, life: 40, gravity: 0.1, size: 2.5});
            }

            // Collectible: pick up
            if (Grid.getTile(this.x, this.y) === Grid.COLLECTIBLE) {
                Grid.displayGrid[this.y][this.x] = Grid.PATH;
                this.collected++;
                Audio.playCollect();
                const cpx = Grid.offsetX + this.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                const cpy = Grid.offsetY + this.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                Particles.emit({x: cpx, y: cpy, count: 18, colors: ['#c8ff32','#ffeb3b','#a0ff00'], speed: 2.5, life: 40, gravity: -0.02, size: 2.5});
            }

            // Memento: 旅途纪念物，走过即收集（不影响过关）
            if (Grid.getTile(this.x, this.y) === Grid.MEMENTO) {
                Grid.displayGrid[this.y][this.x] = Grid.PATH;
                this.gotMemento = true;
                Audio.playCollect();
                const mpx = Grid.offsetX + this.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                const mpy = Grid.offsetY + this.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
                Particles.emit({x: mpx, y: mpy, count: 26, colors: ['#ffd97d','#fff4c8','#ffb74d','#fff'], speed: 3, life: 55, gravity: -0.02, size: 3});
                if (typeof UI !== 'undefined' && UI.onMementoPickup) UI.onMementoPickup();
            }

            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.moving = false;
                return true;
            }
            this.setNextTarget();
        } else {
            this.pixelX += (dx / dist) * this.moveSpeed;
            this.pixelY += (dy / dist) * this.moveSpeed;

            // 扬尘对齐落地：触地帧（0/2）切换瞬间各扬一次，与步态同步
            const footFrame = Math.floor(this.framePos) % 2;  // 0=触地相
            const curStep = Math.floor(this.framePos);
            if (footFrame === 0 && curStep !== this._lastStepFrame) {
                this._lastStepFrame = curStep;
                Particles.emit({
                    x: this.pixelX + (Math.random() - 0.5) * 8,
                    y: this.pixelY + 22,
                    count: 1,
                    colors: ['rgba(200,200,180,0.6)', 'rgba(160,160,140,0.4)'],
                    speed: 0.5, life: 20, gravity: -0.02, size: 1.5, friction: 0.95
                });
            }
        }
        return false;
    },

    draw(ctx) {
        // 步频按实际位移驱动：每走过 DIST_PER_FRAME 像素推进一帧，速度/步幅天然同步，消除滑步
        // 一格 80px ≈ 一个完整 4 帧循环（迈两步），节奏从容不急促
        const DIST_PER_FRAME = 20;
        if (this.moving) {
            const dx = this.pixelX - this._lastDrawX;
            const dy = this.pixelY - this._lastDrawY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.framePos = (this.framePos + dist / DIST_PER_FRAME) % 4;
        } else {
            // 静止：缓动回站姿（第 0 帧）
            const target = 0;
            this.framePos += (target - this.framePos) * 0.2;
            if (this.framePos < 0.02) this.framePos = 0;
        }
        this._lastDrawX = this.pixelX;
        this._lastDrawY = this.pixelY;

        const frameA = Math.floor(this.framePos) % 4;

        // 走路起伏：经过相（第1/3帧两腿交错）抬到最高，触地相（第0/2帧）落回基线。
        // (1-cos)/2 只向上抬、不向下砸 → 自然步态浮动，无弹跳感；4帧循环抬两次
        const lift = this.moving ? (1 - Math.cos(this.framePos * Math.PI)) / 2 : 0;
        const bob = -lift * 2.2;
        const breathe = this.moving ? bob : Math.sin(Date.now() * 0.003) * 1;

        // 转向微倾：侧向行走朝前进方向倾斜，缓动避免突变
        let targetLean = 0;
        if (this.moving && this.direction === 'side') {
            targetLean = (this.facingRight ? 1 : -1) * 0.06;
        }
        this._lean += (targetLean - this._lean) * 0.15;

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        // 抬脚时影子略缩，落地时略胀，增强离地感
        const shadowScale = 1 + bob * 0.04;
        ctx.ellipse(this.pixelX, this.pixelY + 24, 14 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const img = this.sprites[this.direction];
        if (this._isReady(img)) {
            const frameW = Math.floor(img.naturalWidth / 4);
            const frameH = img.naturalHeight;
            const charH = 68;
            const charW = Math.floor(charH * (frameW / frameH));

            const flip = (this.direction === 'side' && !this.facingRight);
            const topY = this.pixelY - charH / 2 + breathe;

            ctx.save();
            // 以脚底中心为锚点应用倾斜，让上身摆动、脚下稳定
            ctx.translate(this.pixelX, this.pixelY + charH / 2);
            if (this._lean) ctx.rotate(this._lean);
            if (flip) ctx.scale(-1, 1);
            ctx.translate(-this.pixelX, -(this.pixelY + charH / 2));

            // 整帧切换（无交叉淡入，避免四肢半透明叠加产生虚影）
            const sx = frameA * frameW;
            const dxPos = flip ? -(this.pixelX + charW / 2) : this.pixelX - charW / 2;
            ctx.drawImage(img, sx, 0, frameW, frameH, dxPos, topY, charW, charH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffeb3b';
            ctx.shadowColor = '#ffeb3b';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
};
