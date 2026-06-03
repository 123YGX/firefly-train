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

        // 触摸设备标记（驱动虚拟方向键/移动端样式显示）
        if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
            document.body.classList.add('touch-device');
        }

        Levels.loadProgress();
        Collection.load();
        Effects.init();
        Player.loadSprite();
        UI.init();
        this.bindEvents();
        this.bindDpad();
        this.loop();
    },

    // 虚拟方向键：触摸/点击 → CreaseMode.tryStep（仅折痕模式有效）
    bindDpad() {
        const dpad = document.getElementById('dpad');
        if (!dpad) return;
        const dirs = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
        dpad.querySelectorAll('.dpad-btn').forEach(btn => {
            const d = dirs[btn.dataset.dir];
            if (!d) return;
            const fire = (e) => {
                e.preventDefault();
                if (this.creaseMode && this.state === 'playing') CreaseMode.tryStep(d[0], d[1]);
            };
            btn.addEventListener('touchstart', fire, { passive: false });
            btn.addEventListener('click', fire);
        });
    },

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            if (this.creaseMode) {
                if (CreaseMode.moving) { CreaseMode.hover = null; this.canvas.style.cursor = 'default'; return; }
                const edge = CreaseMode.detectEdge(mx, my);
                if (edge) {
                    CreaseMode.hover = { type: edge.type, index: edge.index, side: CreaseMode.determineSide(mx, my, edge) };
                    this.canvas.style.cursor = 'pointer';
                } else {
                    CreaseMode.hover = null;
                    // 悬停在与玩家相邻的格上 → 可走光标
                    const gx = Math.floor((mx - CreaseMode.offsetX) / CreaseMode.TS);
                    const gy = Math.floor((my - CreaseMode.offsetY) / CreaseMode.TS);
                    const adj = Math.abs(gx - CreaseMode.px) + Math.abs(gy - CreaseMode.py) === 1;
                    this.canvas.style.cursor = adj ? 'pointer' : 'default';
                }
                return;
            }

            if (Player.moving || Fold.animating) {
                Fold.hoveredEdge = null;
                Fold.hoveredSide = null;
                Fold._previewCache = null;
                this.canvas.style.cursor = 'default';
                return;
            }
            Fold.hoveredEdge = Fold.detectEdge(mx, my);
            Fold.hoveredSide = Fold.hoveredEdge ? Fold.determineSide(mx, my, Fold.hoveredEdge) : null;
            Fold._previewCache = null;
            this.canvas.style.cursor = Fold.hoveredEdge ? 'pointer' : 'default';
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.state !== 'playing') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            if (this.creaseMode) {
                if (CreaseMode.moving) return;
                const edge = CreaseMode.detectEdge(mx, my);
                if (edge) {
                    CreaseMode.executeFold(edge, CreaseMode.determineSide(mx, my, edge));
                    UI.updateFoldCount();
                } else {
                    CreaseMode.tryClickMove(mx, my);
                }
                return;
            }

            if (Player.moving || Fold.animating) return;
            const edge = Fold.detectEdge(mx, my);
            if (edge) {
                const side = Fold.determineSide(mx, my, edge);
                Fold.executeFold(edge, side);
            }
        });

        document.addEventListener('keydown', (e) => {
            // 折痕模式：方向键/WASD 走，Ctrl+Z 撤销折叠，R 重置
            if (this.creaseMode && this.state === 'playing') {
                const map = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
                              w: [0,-1], s: [0,1], a: [-1,0], d: [1,0], W: [0,-1], S: [0,1], A: [-1,0], D: [1,0] };
                if (map[e.key]) {
                    e.preventDefault();
                    CreaseMode.tryStep(map[e.key][0], map[e.key][1]);
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                    e.preventDefault();
                    if (CreaseMode.undo()) { Audio.playClick(); UI.updateFoldCount(); }
                } else if (e.key === 'r' || e.key === 'R') {
                    Audio.playClick(); CreaseMode.reset(); UI.updateFoldCount();
                } else if (e.key === 'Escape') {
                    Audio.playClick(); UI.showConfirm();
                }
                return;
            }

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
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (touch.clientX - rect.left) * scaleX;
            const my = (touch.clientY - rect.top) * scaleY;

            if (this.creaseMode) {
                if (this.state !== 'playing' || CreaseMode.moving) return;
                const edge = CreaseMode.detectEdge(mx, my);
                if (edge) { CreaseMode.executeFold(edge, CreaseMode.determineSide(mx, my, edge)); UI.updateFoldCount(); }
                else CreaseMode.tryClickMove(mx, my);
                return;
            }

            if (this.state !== 'playing' || Player.moving || Fold.animating) return;
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
        this.creaseMode = (level.mode === 'crease');

        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.classList.toggle('crease-active', this.creaseMode);

        if (this.creaseMode) {
            CreaseMode.init(level);
            this.levelComplete = false;
            this.state = 'playing';
            UI.showScreen('game');
            UI.updateHUD();
            return;
        }

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

        // 旅途纪念物：若本关走过了收集点，记入收集册（不影响星级/过关）
        let mementoJustGot = false;
        if (Player.gotMemento && typeof Collection !== 'undefined') {
            mementoJustGot = Collection.collect(Levels.currentChapter, Levels.currentLevel);
        }

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

        // 纪念物提示横幅
        const mEl = document.getElementById('complete-memento');
        if (mEl) {
            const item = (typeof Collection !== 'undefined')
                ? Collection.getItem(Levels.currentChapter, Levels.currentLevel) : null;
            if (mementoJustGot && item) {
                mEl.innerHTML = `<span class="memento-got">✦ 收获纪念物：${item.name}</span>`;
                mEl.style.display = 'block';
            } else if (item && !Player.gotMemento) {
                mEl.innerHTML = `<span class="memento-miss">○ 错过了本关纪念物（可重玩收集）</span>`;
                mEl.style.display = 'block';
            } else {
                mEl.style.display = 'none';
            }
        }

        setTimeout(() => UI.showScreen('complete'), 600);
    },

    onCreaseComplete() {
        this.levelComplete = true;
        this.state = 'complete';
        Audio.playComplete();

        const px = CreaseMode._cx(CreaseMode.end.x);
        const py = CreaseMode._cy(CreaseMode.end.y);
        Particles.emit({ x: px, y: py, count: 50, colors: ['#ffb74d','#ff7043','#ffeb3b','#fff'], speed: 4, life: 75, gravity: 0.03, size: 3.5 });

        const chapter = Story.chapters[Levels.currentChapter];
        const lvl = chapter ? chapter.levels[Levels.currentLevel] : null;
        const stars = CreaseMode.computeStars();
        const isDemo = !!Levels._creaseOverride;   // 试玩模式：不写正式存档/收集册
        if (!isDemo) Levels.markCurrentComplete(stars);

        let mementoJustGot = false;
        if (!isDemo && CreaseMode.gotMemento && typeof Collection !== 'undefined') {
            mementoJustGot = Collection.collect(Levels.currentChapter, Levels.currentLevel);
        }

        document.getElementById('complete-title').textContent = isDemo ? '试玩通关！' : '过关！';
        const starsEl = document.getElementById('complete-stars');
        const starColor = stars >= 2 ? '#ffb74d' : '#888';
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = 'star';
            span.textContent = i < stars ? '★' : '☆';
            span.style.color = i < stars ? starColor : '#444';
            starsEl.appendChild(span);
        }
        const totalF = CreaseMode.totalFireflies();
        let txt = `收集萤火 ${CreaseMode.collected} / ${totalF}`;
        if (CreaseMode.gotMemento) txt += '　✦ 拾得纪念物';
        document.getElementById('complete-text').textContent = txt;

        const mEl = document.getElementById('complete-memento');
        if (mEl) {
            if (isDemo) {
                mEl.style.display = 'none';
            } else {
                const item = (typeof Collection !== 'undefined')
                    ? Collection.getItem(Levels.currentChapter, Levels.currentLevel) : null;
                if (mementoJustGot && item) {
                    mEl.innerHTML = `<span class="memento-got">✦ 收获纪念物：${item.name}</span>`;
                    mEl.style.display = 'block';
                } else if (item && !CreaseMode.gotMemento) {
                    mEl.innerHTML = `<span class="memento-miss">○ 错过了本关纪念物（可重玩收集）</span>`;
                    mEl.style.display = 'block';
                } else {
                    mEl.style.display = 'none';
                }
            }
        }

        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) nextBtn.textContent = isDemo ? '返回主菜单' : '下一关';

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
        // 优先用章节彩铅大图（中心留白，谜题卡片盖中心，边缘插画露出，无需黑膜）。
        // 没有大图的章节回退暖色日暮渐变 + 程序化彩铅远景。
        const scene = Effects.getSceneImage(Levels.currentChapter);
        if (scene) {
            this.ctx.drawImage(scene, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.drawImage(this._getSceneBg(Levels.currentChapter), 0, 0);
        }
    },

    _getSceneBg(chapter) {
        if (!this._bgCache.scene[chapter]) {
            // 6 章暖色日暮渐变，呼应菜单奶油配色，靠色相区分地域
            const colors = [
                ['#f3e3c0', '#e9cfa0'], // ch0 大学站·暖台灯蜜色
                ['#f0dcb4', '#e3c498'], // ch1 江北山城·雾青暖砂
                ['#f6d6a8', '#e8a878'], // ch2 解放碑烟火·夕阳桃橘
                ['#e9e0bc', '#cfd6b0'], // ch3 朝天门→三峡·青绿水汽（仍暖）
                ['#ecdcc0', '#d8c8a8'], // ch4 秦岭北方原野·灰土暖khaki
                ['#f7d4a4', '#e9b890']  // ch5 大连海岸归途·珊瑚暖
            ];
            const [c1, c2] = colors[chapter] || colors[0];
            const c = document.createElement('canvas');
            c.width = 1400; c.height = 900;
            const cx = c.getContext('2d');
            const g = cx.createLinearGradient(0, 0, 0, 900);
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
        } else if (this.creaseMode && (this.state === 'playing' || this.state === 'complete')) {
            this.drawBackground();
            if (!Effects.getSceneImage(Levels.currentChapter)) {
                Effects.drawSceneEnvironment(this.ctx, Levels.currentChapter);
            }
            Effects.updateBgFireflies();
            Effects.drawBgFireflies(this.ctx);
            CreaseMode.draw(this.ctx);
            Particles.update();
            Particles.draw(this.ctx);
            if (CreaseMode.moving) {
                const res = CreaseMode.update();
                if (res === 'complete') this.onCreaseComplete();
            }
        } else if (this.state === 'playing' || this.state === 'complete') {
            this.drawBackground();
            // 有彩铅大图的章节，插画已含远景，跳过程序化远景避免双重元素打架；
            // 无大图章节仍画暖渐变 + 程序化彩铅远景
            if (!Effects.getSceneImage(Levels.currentChapter)) {
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
