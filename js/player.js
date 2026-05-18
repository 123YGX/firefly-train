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
    moveSpeed: 4,
    size: 20,
    collected: 0,
    sprites: { side: null, front: null, back: null },
    facingRight: true,
    direction: 'front',
    frameIndex: 0,
    frameTick: 0,

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

        const end = Grid.findEnd();
        this._updateFacing(end.x - startX, end.y - startY);
    },

    findPath(endX, endY) {
        const grid = Grid.displayGrid;
        if (!grid || !grid.length) return null;
        const w = grid[0].length;
        const startKey = this.y * w + this.x;
        const endKey = endY * w + endX;

        const parent = new Map();
        parent.set(startKey, null);
        const queue = [{ x: this.x, y: this.y, k: startKey }];
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

    tryMove() {
        const end = Grid.findEnd();
        const path = this.findPath(end.x, end.y);
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

            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.moving = false;
                return true;
            }
            this.setNextTarget();
        } else {
            this.pixelX += (dx / dist) * this.moveSpeed;
            this.pixelY += (dy / dist) * this.moveSpeed;

            if (Math.random() < 0.3) {
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
        if (this.moving) {
            this.frameTick++;
            if (this.frameTick >= 6) {
                this.frameTick = 0;
                this.frameIndex = (this.frameIndex + 1) % 4;
            }
        } else {
            this.frameIndex = 0;
            this.frameTick = 0;
        }

        const breathe = this.moving ? 0 : Math.sin(Date.now() * 0.003) * 1;

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(this.pixelX, this.pixelY + 24, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const img = this.sprites[this.direction];
        if (this._isReady(img)) {
            const frameW = Math.floor(img.naturalWidth / 4);
            const frameH = img.naturalHeight;
            const charH = 68;
            const charW = Math.floor(charH * (frameW / frameH));
            const sx = (this.moving ? this.frameIndex : 0) * frameW;

            ctx.save();
            const flip = (this.direction === 'side' && !this.facingRight);
            if (flip) {
                ctx.translate(this.pixelX, this.pixelY - charH/2 + breathe);
                ctx.scale(-1, 1);
                ctx.drawImage(img, sx, 0, frameW, frameH, -charW/2, 0, charW, charH);
            } else {
                ctx.drawImage(img, sx, 0, frameW, frameH, this.pixelX - charW/2, this.pixelY - charH/2 + breathe, charW, charH);
            }
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
