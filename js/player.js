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

    init(startX, startY) {
        this.x = startX;
        this.y = startY;
        this.pixelX = Grid.offsetX + startX * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.pixelY = Grid.offsetY + startY * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        this.moving = false;
        this.path = [];
    },

    findPath(endX, endY) {
        const queue = [{ x: this.x, y: this.y, path: [] }];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === endX && current.y === endY) {
                return current.path.concat({ x: endX, y: endY });
            }

            const dirs = [
                { dx: 0, dy: -1 },
                { dx: 1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }
            ];

            for (const dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const key = `${nx},${ny}`;

                if (!visited.has(key) && Grid.isWalkable(nx, ny)) {
                    visited.add(key);
                    queue.push({
                        x: nx,
                        y: ny,
                        path: current.path.concat({ x: nx, y: ny })
                    });
                }
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
            this.targetX = Grid.offsetX + next.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
            this.targetY = Grid.offsetY + next.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
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
            const pos = this.path[this.pathIndex];
            this.x = pos.x;
            this.y = pos.y;
            this.pathIndex++;

            if (this.pathIndex >= this.path.length) {
                this.moving = false;
                return true;
            }
            this.setNextTarget();
        } else {
            this.pixelX += (dx / dist) * this.moveSpeed;
            this.pixelY += (dy / dist) * this.moveSpeed;
        }
        return false;
    },

    draw(ctx) {
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#ffeb3b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, this.size / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};
