const Game = {
    canvas: null,
    ctx: null,
    state: 'menu',
    levelComplete: false,
    storyQueue: [],

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
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            Fold.hoveredEdge = Fold.detectEdge(mx, my);
            Fold.hoveredSide = Fold.hoveredEdge ? Fold.determineSide(mx, my, Fold.hoveredEdge) : null;
            Fold._previewCache = null;
            this.canvas.style.cursor = Fold.hoveredEdge ? 'pointer' : 'default';
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.state !== 'playing' || Player.moving || Fold.animating) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const edge = Fold.detectEdge(mx, my);
            if (edge) {
                const side = Fold.determineSide(mx, my, edge);
                Fold.executeFold(edge, side);
            }
        });
    },

    checkAutoMove() {
        if (Player.tryMove()) {
            UI.showFoldHint('找到路径了！');
        }
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
        Levels.markCurrentComplete();

        const end = Grid.findEnd();
        const px = Grid.offsetX + end.x * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        const py = Grid.offsetY + end.y * Grid.TILE_SIZE + Grid.TILE_SIZE / 2;
        Particles.emit({x: px, y: py, count: 50, colors: ['#ffb74d','#ff7043','#ffeb3b','#fff'], speed: 4, life: 75, gravity: 0.03, size: 3.5});

        const chapter = Story.chapters[Levels.currentChapter];
        const lvl = chapter.levels[Levels.currentLevel];

        document.getElementById('complete-title').textContent = '过关！';
        document.getElementById('complete-text').textContent = lvl ? lvl.after : '继续前进吧。';

        setTimeout(() => UI.showScreen('complete'), 600);
    },

    advanceLevel() {
        const result = Levels.nextLevel();
        if (result === 'gameover') {
            this.showEnding();
        } else if (result === 'newchapter') {
            this.showStory('intro');
        } else {
            this.showStory('before');
        }
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
        const colors = [
            ['#f5e6c8', '#e8d5a3'],  // Ch1 午后暖黄
            ['#e8c49a', '#d4a574'],  // Ch2 傍晚橙棕
            ['#c47a5a', '#6b3a5a'],  // Ch3 黄昏橙紫
            ['#2a4a6b', '#1a3a4a'],  // Ch4 暮色深蓝青
            ['#1a2a4a', '#0f1a3a'],  // Ch5 夜晚深蓝
            ['#2a1a4a', '#3a2a1a']   // Ch6 深紫→暖金
        ];
        const [c1, c2] = colors[Levels.currentChapter] || colors[0];
        const grad = this.ctx.createLinearGradient(0, 0, 1400, 900);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, 1400, 900);
    },

    loop() {
        if (this.state === 'playing' || this.state === 'complete') {
            this.drawBackground();
            Effects.drawSceneEnvironment(this.ctx, Levels.currentChapter);
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
