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
    sprite: null,
    spriteLoaded: false,
    facingRight: true,
    direction: 'down',
    frameIndex: 0,
    frameTick: 0,
    walkFrames: null,
    idleFrame: null,

    loadSprite() {
        this.sprite = new Image();
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            this._generateFrames();
        };
        this.sprite.src = 'assets/character/sprite.jpg';
    },

    _generateFrames() {
        const sw = this.sprite.naturalWidth;
        const sh = this.sprite.naturalHeight;
        const fw = Math.floor(sw * 0.3);
        const fh = Math.floor(sh * 0.9);
        const charH = 56;
        const charW = Math.floor(charH * (fw / fh));

        this.idleFrame = this._cropFrame(0, sh*0.05, fw, fh, charW, charH);

        this.walkFrames = [];
        for (let i = 0; i < 4; i++) {
            const c = document.createElement('canvas');
            c.width = charW; c.height = charH;
            const ctx = c.getContext('2d');
            ctx.drawImage(this.sprite, 0, sh*0.05, fw, fh, 0, 0, charW, charH);

            if (i === 1 || i === 3) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                const shift = (i === 1) ? -1 : 1;
                ctx.translate(shift, -1);
                ctx.drawImage(c, 0, 0);
                ctx.restore();
            }
            this.walkFrames.push(c);
        }
    },

    _cropFrame(sx, sy, sw, sh, dw, dh) {
        const c = document.createElement('canvas');
        c.width = dw; c.height = dh;
        const ctx = c.getContext('2d');
        ctx.drawImage(this.sprite, sx, sy, sw, sh, 0, 0, dw, dh);
        return c;
    },

    init(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.pixelX = Grid.offsetX + startX * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.pixelY = Grid.offsetY + startY * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.moving = false;
        this.path = [];
        this.collected = 0;
    },

    findPath(endX, endY) {
        const queue = [{ x: this.x, y: this.y, path: [] }];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);
        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.x === endX && current.y === endY) {
                return current.path.concat({ x: endX, y: endY });
            }

            const currentTile = Grid.getTile(current.x, current.y);
            if (currentTile === Grid.TELEPORT_A || currentTile === Grid.TELEPORT_B) {
                const exit = Grid.findTeleportPair(currentTile);
                if (exit) {
                    const key = `${exit.x},${exit.y}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({
                            x: exit.x, y: exit.y,
                            path: current.path.concat({ x: exit.x, y: exit.y, teleport: true })
                        });
                    }
                }
            }

            for (const dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const key = `${nx},${ny}`;
                if (visited.has(key) || !Grid.isWalkable(nx, ny)) continue;
                if (!Grid.canExitTo(current.x, current.y, dir.dx, dir.dy)) continue;
                if (!Grid.canEnterFrom(nx, ny, dir.dx, dir.dy)) continue;
                visited.add(key);
                queue.push({
                    x: nx, y: ny,
                    path: current.path.concat({ x: nx, y: ny })
                });
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
            if (next.x > this.x) this.facingRight = true;
            else if (next.x < this.x) this.facingRight = false;
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

        const frame = (this.moving && this.walkFrames)
            ? this.walkFrames[this.frameIndex]
            : this.idleFrame;

        if (frame) {
            const dw = frame.width;
            const dh = frame.height;
            ctx.save();

            if (!this.facingRight) {
                ctx.translate(this.pixelX, this.pixelY - dh/2 + breathe);
                ctx.scale(-1, 1);
                ctx.drawImage(frame, -dw/2, 0, dw, dh);
            } else {
                ctx.drawImage(frame, this.pixelX - dw/2, this.pixelY - dh/2 + breathe, dw, dh);
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
