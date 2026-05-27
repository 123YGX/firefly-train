const Game = {
    canvas: null,
    ctx: null,
    state: 'menu',
    levelComplete: false,
    storyQueue: [],
    _bgCache: { menu: null, scene: {} },

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = 1400;
        this.canvas.height = 900;
        this.ctx = this.canvas.getContext('2d');

        Levels.loadProgress();
        Effects.init();
        Player.loadSprite();
        UI.init();
        this.bindEvents();
        this.loop();
    },

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            if (Player.moving || Fold.animating) {
                Fold.hoveredEdge = null;
                Fold.hoveredSide = null;
                Fold._previewCache = null;
                this.canvas.style.cursor = 'default';
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            Fold.hoveredEdge = Fold.detectEdge(mx, my);
            Fold.hoveredSide = Fold.hoveredEdge ? Fold.determineSide(mx, my, Fold.hoveredEdge) : null;
            Fold._previewCache = null;
            this.canvas.style.cursor = Fold.hoveredEdge ? 'pointer' : 'default';
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.state !== 'playing' || Player.moving || Fold.animating) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const edge = Fold.detectEdge(mx, my);
            if (edge) {
                const side = Fold.determineSide(mx, my, edge);
                Fold.executeFold(edge, side);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.state === 'playing' && !Player.moving && !Fold.animating) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                    e.preventDefault();
                    if (Fold.undo()) {
                        Audio.playClick();
                        UI.updateFoldCount();
                    }
                } else if (e.key === 'r' || e.key === 'R') {
                    Audio.playClick();
                    Fold.resetLevel();
                    const start = Grid.findStart();
                    Player.init(start.x, start.y);
                    UI.updateFoldCount();
                }
            }
            if (e.key === 'Escape') {
                if (this.state === 'playing') {
                    Audio.playClick();
                    UI.showConfirm();
                } else if (document.getElementById('confirm-overlay').classList.contains('visible')) {
                    Audio.playClick();
                    UI.hideConfirm();
                }
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state !== 'playing' || Player.moving || Fold.animating) return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (touch.clientX - rect.left) * scaleX;
            const my = (touch.clientY - rect.top) * scaleY;

            const edge = Fold.detectEdge(mx, my);
            if (edge) {
                const side = Fold.determineSide(mx, my, edge);
                Fold.executeFold(edge, side);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.state !== 'playing') return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (touch.clientX - rect.left) * scaleX;
            const my = (touch.clientY - rect.top) * scaleY;
            Fold.hoveredEdge = Fold.detectEdge(mx, my);
            Fold.hoveredSide = Fold.hoveredEdge ? Fold.determineSide(mx, my, Fold.hoveredEdge) : null;
            Fold._previewCache = null;
        }, { passive: false });
    },

    checkAutoMove() {
        UI.updateFoldCount();
        if (Player.tryMove()) {
            UI.showFoldHint('找到路径了！');
        } else {
            UI.showFoldHint('路径未连通，继续折叠…');
            this.shakeScreen();
        }
    },

    shakeScreen() {
        const container = document.getElementById('game-container');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 300);
    },

    showStory(type) {
        const chapter = Story.chapters[Levels.currentChapter];
        let text = '';

        if (type === 'intro') {
            text = chapter.intro;
        } else if (type === 'before') {
            const lvl = chapter.levels[Levels.currentLevel];
            text = lvl ? lvl.before : '';
        } else if (type === 'after') {
            const lvl = chapter.levels[Levels.currentLevel];
            text = lvl ? lvl.after : '';
        }

        document.getElementById('story-text').textContent = text;
        UI.showScreen('story');
        this.state = 'story';

        if (type === 'intro') {
            document.getElementById('btn-story-next').onclick = () => {
                Audio.playClick();
                this.showStory('before');
            };
        } else if (type === 'before') {
            document.getElementById('btn-story-next').onclick = () => {
                Audio.playClick();
                this.startLevel();
            };
        }
    },

    transition(callback) {
        const overlay = document.getElementById('transition-overlay');
        overlay.classList.add('fade-in');
        setTimeout(() => {
            callback();
            setTimeout(() => overlay.classList.remove('fade-in'), 50);
        }, 400);
    },

    startLevel() {
        const level = Levels.getCurrentLevel();
        Grid.init(level);
        Fold.reset();
        const start = Grid.findStart();
        Player.init(start.x, start.y);
        this.levelComplete = false;
        this.state = 'playing';
        UI.showScreen('game');
        UI.updateHUD();

        if (Tutorial.shouldShow(Levels.currentChapter, Levels.currentLevel)) {
            UI.showTutorialForCurrent(false);
        }
    },

    onLevelComplete() {
        this.levelComplete = true;
        this.state = 'complete';
        Audio.playComplete();

        const end = Grid.findEnd();
        const px = Grid.offsetX + end.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        const py = Grid.offsetY + end.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        Particles.emit({x: px, y: py, count: 50, colors: ['#ffb74d','#ff7043','#ffeb3b','#fff'], speed: 4, life: 75, gravity: 0.03, size: 3.5});

        const chapter = Story.chapters[Levels.currentChapter];
        const lvl = chapter.levels[Levels.currentLevel];
        const level = Levels.getCurrentLevel();
        const folds = Fold.history.length;
        const par = level.par || 1;
        let stars = 0;
        if (folds <= par) stars = 3;
        else if (folds <= par + 1) stars = 2;
        else if (folds <= par + 2) stars = 1;

        Levels.markCurrentComplete(stars);

        document.getElementById('complete-title').textContent = '过关！';
        const starsEl = document.getElementById('complete-stars');
        const starColor = stars >= 2 ? '#ffb74d' : '#888';
        const emptyColor = '#444';
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = 'star';
            span.textContent = i < stars ? '★' : '☆';
            span.style.color = i < stars ? starColor : emptyColor;
            starsEl.appendChild(span);
        }
        document.getElementById('complete-text').textContent = lvl ? lvl.after : '继续前进吧。';

        setTimeout(() => UI.showScreen('complete'), 600);
    },

    advanceLevel() {
        this.transition(() => {
            const result = Levels.nextLevel();
            if (result === 'gameover') {
                this.showEnding();
            } else if (result === 'newchapter') {
                this.showStory('intro');
            } else {
                this.showStory('before');
            }
        });
    },

    showEnding() {
        document.getElementById('story-text').textContent =
            '所有的车票化作点点萤火，飞散而出，奔赴辽阔大海与朦胧暮色。\n\n' +
            '"我回来了。"\n\n' +
            '唇角缓缓扬起，不再是勉强的浅笑，是发自内心、安稳又平和的笑容。\n\n' +
            '—— 完 ——';
        document.getElementById('btn-story-next').textContent = '返回主菜单';
        document.getElementById('btn-story-next').onclick = () => {
            Audio.playClick();
            Audio.stopBGM();
            document.getElementById('btn-story-next').textContent = '继续';
            UI.showScreen('menu');
        };
        UI.showScreen('story');
        this.state = 'ending';
    },

    drawBackground() {
        const ch = Levels.currentChapter + 1;
        const bgImg = Effects.images.backgrounds[`ch${ch}`];
        if (Effects._isReady(bgImg)) {
            this.ctx.drawImage(bgImg, 0, 0, 1400, 900);
            return;
        }
        this.ctx.drawImage(this._getSceneBg(Levels.currentChapter), 0, 0);
    },

    _getSceneBg(chapter) {
        if (!this._bgCache.scene[chapter]) {
            const colors = [
                ['#f5e6c8', '#e8d5a3'],
                ['#e8c49a', '#d4a574'],
                ['#c47a5a', '#6b3a5a'],
                ['#2a4a6b', '#1a3a4a'],
                ['#1a2a4a', '#0f1a3a'],
                ['#2a1a4a', '#3a2a1a']
            ];
            const [c1, c2] = colors[chapter] || colors[0];
            const c = document.createElement('canvas');
            c.width = 1400; c.height = 900;
            const cx = c.getContext('2d');
            const g = cx.createLinearGradient(0, 0, 1400, 900);
            g.addColorStop(0, c1);
            g.addColorStop(1, c2);
            cx.fillStyle = g;
            cx.fillRect(0, 0, 1400, 900);
            this._bgCache.scene[chapter] = c;
        }
        return this._bgCache.scene[chapter];
    },

    _getMenuBg() {
        if (!this._bgCache.menu) {
            const c = document.createElement('canvas');
            c.width = 1400; c.height = 900;
            const cx = c.getContext('2d');
            const g = cx.createLinearGradient(0, 0, 1400, 900);
            g.addColorStop(0, '#1a1a2e');
            g.addColorStop(0.5, '#16213e');
            g.addColorStop(1, '#0f3460');
            cx.fillStyle = g;
            cx.fillRect(0, 0, 1400, 900);
            this._bgCache.menu = c;
        }
        return this._bgCache.menu;
    },

    drawMenuBackground() {
        const ctx = this.ctx;
        ctx.drawImage(this._getMenuBg(), 0, 0);

        Effects.updateBgFireflies();
        Effects.drawBgFireflies(ctx);

        const now = Date.now();
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#ffb74d';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = 300 + i * 80 + Math.sin(now * 0.0005 + i) * 20;
            ctx.beginPath();
            for (let x = 0; x <= 1400; x += 8) {
                const wy = y + Math.sin(x * 0.008 + now * 0.001 + i * 2) * 15;
                x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    loop() {
        if (this.state === 'menu' || this.state === 'story' || this.state === 'ending') {
            this.drawMenuBackground();
        } else if (this.state === 'playing' || this.state === 'complete') {
            this.drawBackground();
            const bgReady = Effects._isReady(Effects.images.backgrounds[`ch${Levels.currentChapter + 1}`]);
            if (bgReady) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                this.ctx.fillRect(0, 0, 1400, 900);
                this.ctx.restore();
            } else {
                Effects.drawSceneEnvironment(this.ctx, Levels.currentChapter);
            }
            Effects.updateBgFireflies();
            Effects.drawBgFireflies(this.ctx);
            Grid.draw(this.ctx);
            Effects.drawCreases(this.ctx);
            Fold.drawFoldPreview(this.ctx);
            Fold.drawFoldAnimation(this.ctx);
            Player.draw(this.ctx);
            Particles.update();
            Particles.draw(this.ctx);

            if (Fold.animating) {
                const done = Fold.updateAnimation();
                if (done) this.checkAutoMove();
            } else if (Player.moving) {
                const reached = Player.update();
                if (reached) {
                    const end = Grid.findEnd();
                    if (Player.x === end.x && Player.y === end.y) {
                        this.onLevelComplete();
                    }
                }
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};

window.addEventListener('load', () => Game.init());
