const Game = {
    canvas: null,
    ctx: null,
    state: 'menu',
    levelComplete: false,
    storyQueue: [],

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.ctx = this.canvas.getContext('2d');

        Levels.loadProgress();
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
            this.canvas.style.cursor = Fold.hoveredEdge ? 'pointer' : 'default';
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.state !== 'playing' || Player.moving) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const edge = Fold.detectEdge(mx, my);
            if (edge) {
                const side = Fold.determineSide(mx, my, edge);
                if (Fold.executeFold(edge, side)) {
                    this.checkAutoMove();
                }
            }
        });
    },

    checkAutoMove() {
        setTimeout(() => {
            if (Player.tryMove()) {
                UI.showFoldHint('找到路径了！');
            }
        }, 200);
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
            ['#1a1a2e', '#16213e'],
            ['#1a2a3a', '#0f3460'],
            ['#2a1a1a', '#3d1a1a'],
            ['#1a3a2a', '#0d4030'],
            ['#2a2a1a', '#3d3d0f'],
            ['#1a1a3a', '#2a1a4a']
        ];
        const [c1, c2] = colors[Levels.currentChapter] || colors[0];
        const grad = this.ctx.createLinearGradient(0, 0, 800, 600);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, 800, 600);
    },

    loop() {
        if (this.state === 'playing' || this.state === 'complete') {
            this.drawBackground();
            Grid.draw(this.ctx);
            Fold.drawFoldPreview(this.ctx);
            Player.draw(this.ctx);

            if (Player.moving) {
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
