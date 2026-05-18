const Particles = {
    pools: [],
    MAX: 240,

    emit({x, y, count, colors, speed, life, gravity, size, friction}) {
        count = count || 20;
        colors = colors || ['#ffb74d', '#ff7043', '#ffeb3b'];
        speed = speed || 3;
        life = life || 60;
        gravity = gravity || 0.05;
        size = size || 3;
        friction = friction || 0.98;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = speed * (0.5 + Math.random() * 0.5);
            this.pools.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                life: life * (0.6 + Math.random() * 0.4),
                maxLife: life,
                size: size * (0.5 + Math.random() * 0.5),
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: gravity,
                friction: friction
            });
        }
        if (this.pools.length > this.MAX) {
            this.pools.splice(0, this.pools.length - this.MAX);
        }
    },

    update() {
        for (let i = this.pools.length - 1; i >= 0; i--) {
            const p = this.pools[i];
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.pools.splice(i, 1);
            }
        }
    },

    draw(ctx) {
        for (const p of this.pools) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
};
