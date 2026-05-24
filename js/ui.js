const UI = {
    screens: {},
    currentScreen: 'menu',

    init() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            story: document.getElementById('story-screen'),
            game: document.getElementById('game-screen'),
            chapter: document.getElementById('chapter-screen'),
            complete: document.getElementById('complete-screen')
        };

        document.getElementById('btn-start').addEventListener('click', () => {
            Audio.playClick();
            Audio.startBGM();
            Levels.currentChapter = 0;
            Levels.currentLevel = 0;
            Game.showStory('intro');
        });

        document.getElementById('btn-chapters').addEventListener('click', () => {
            Audio.playClick();
            this.showChapterSelect();
        });

        document.getElementById('btn-story-next').addEventListener('click', () => {
            Audio.playClick();
            Game.startLevel();
        });

        document.getElementById('btn-undo').addEventListener('click', () => {
            if (Fold.undo()) {
                Audio.playClick();
                this.updateFoldCount();
            }
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            Audio.playClick();
            Fold.resetLevel();
            const start = Grid.findStart();
            Player.init(start.x, start.y);
            this.updateFoldCount();
        });

        document.getElementById('btn-next-level').addEventListener('click', () => {
            Audio.playClick();
            Game.advanceLevel();
        });

        document.getElementById('btn-back-menu').addEventListener('click', () => {
            Audio.playClick();
            this.showScreen('menu');
        });

        document.getElementById('btn-tutorial-next').addEventListener('click', () => {
            Audio.playClick();
            this.nextTutorialStep();
        });

        document.getElementById('btn-tutorial-skip').addEventListener('click', () => {
            Audio.playClick();
            this.hideTutorial();
            const key = `${Levels.currentChapter}-${Levels.currentLevel}`;
            Tutorial.completed.add(key);
        });

        document.getElementById('btn-hint').addEventListener('click', () => {
            Audio.playClick();
            this.showTutorialForCurrent(true);
        });

        document.getElementById('btn-exit').addEventListener('click', () => {
            Audio.playClick();
            this.showConfirm();
        });

        document.getElementById('btn-mute').addEventListener('click', () => {
            const muted = Audio.toggleMute();
            document.getElementById('btn-mute').textContent = muted ? '♪̸' : '♪';
            document.getElementById('btn-mute').style.opacity = muted ? '0.5' : '1';
        });

        document.getElementById('btn-confirm-no').addEventListener('click', () => {
            Audio.playClick();
            this.hideConfirm();
        });

        document.getElementById('btn-confirm-yes').addEventListener('click', () => {
            Audio.playClick();
            this.hideConfirm();
            Audio.stopBGM();
            Game.state = 'menu';
            this.showScreen('menu');
        });
    },

    showConfirm() {
        document.getElementById('confirm-overlay').classList.add('visible');
    },

    hideConfirm() {
        document.getElementById('confirm-overlay').classList.remove('visible');
    },

    tutorialState: { steps: [], index: 0 },

    showTutorialForCurrent(force) {
        const tut = Tutorial.get(Levels.currentChapter, Levels.currentLevel);
        if (!tut) return;
        if (!force && Tutorial.completed.has(`${Levels.currentChapter}-${Levels.currentLevel}`)) return;

        this.tutorialState = { steps: tut.steps, index: 0, title: tut.title };
        document.getElementById('tutorial-title').textContent = tut.title;
        this.renderTutorialStep();
        document.getElementById('tutorial-overlay').classList.add('visible');
    },

    renderTutorialStep() {
        const s = this.tutorialState;
        const step = s.steps[s.index];
        document.getElementById('tutorial-text').textContent = step.text;
        document.getElementById('tutorial-progress').textContent = `${s.index + 1} / ${s.steps.length}`;
        const nextBtn = document.getElementById('btn-tutorial-next');
        nextBtn.textContent = (s.index === s.steps.length - 1) ? '开始挑战' : '下一步 →';
    },

    nextTutorialStep() {
        const s = this.tutorialState;
        if (s.index < s.steps.length - 1) {
            s.index++;
            this.renderTutorialStep();
        } else {
            this.hideTutorial();
            Tutorial.markComplete(Levels.currentChapter, Levels.currentLevel);
        }
    },

    hideTutorial() {
        document.getElementById('tutorial-overlay').classList.remove('visible');
    },

    showScreen(name) {
        // 淡出当前界面
        const currentScreen = Object.values(this.screens).find(s => s.classList.contains('active'));
        if (currentScreen) {
            currentScreen.style.opacity = '0';
            currentScreen.style.transform = 'scale(0.95)';
        }

        setTimeout(() => {
            Object.values(this.screens).forEach(s => s.classList.remove('active'));
            if (this.screens[name]) {
                this.screens[name].classList.add('active');
                // 强制重排以触发过渡
                this.screens[name].offsetHeight;
                this.screens[name].style.opacity = '1';
                this.screens[name].style.transform = 'scale(1)';
            }
            this.currentScreen = name;
        }, currentScreen ? 200 : 0);
    },

    showChapterSelect() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';
        Story.chapters.forEach((ch, chIdx) => {
            const chUnlocked = Levels.isChapterUnlocked(chIdx);
            const chDiv = document.createElement('div');
            chDiv.className = 'chapter-block' + (chUnlocked ? '' : ' locked');

            const header = document.createElement('div');
            header.className = 'chapter-header';
            header.innerHTML = `<span class="ch-num">第${chIdx + 1}幕</span><span class="ch-name">${ch.name}</span>`;
            chDiv.appendChild(header);

            if (chUnlocked) {
                const levelsDiv = document.createElement('div');
                levelsDiv.className = 'chapter-levels';
                const levelCount = Levels.data[chIdx].length;
                for (let lvIdx = 0; lvIdx < levelCount; lvIdx++) {
                    const btn = document.createElement('button');
                    const unlocked = Levels.isLevelUnlocked(chIdx, lvIdx);
                    const completed = Levels.isLevelCompleted(chIdx, lvIdx);
                    btn.className = 'level-btn' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '');
                    btn.textContent = completed ? `${lvIdx + 1} ✓` : `${lvIdx + 1}`;
                    if (unlocked) {
                        btn.addEventListener('click', () => {
                            Audio.playClick();
                            Audio.startBGM();
                            Levels.currentChapter = chIdx;
                            Levels.currentLevel = lvIdx;
                            Game.showStory('before');
                        });
                    }
                    levelsDiv.appendChild(btn);
                }
                chDiv.appendChild(levelsDiv);
            }

            list.appendChild(chDiv);
        });
        this.showScreen('chapter');
    },

    updateHUD() {
        const ch = Story.chapters[Levels.currentChapter];
        document.getElementById('hud-chapter').textContent = `第${Levels.currentChapter + 1}幕：${ch.name}`;
        document.getElementById('hud-level').textContent = `第 ${Levels.currentLevel + 1} 关`;
        this.updateFoldCount();

        const ci = Levels.currentChapter;
        const show = (id, visible) => {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? 'flex' : 'none';
        };
        show('legend-collect', ci >= 2);
        show('legend-teleport', ci >= 3);
        show('legend-fragile', ci >= 4);
        show('legend-oneway', ci >= 5);
    },

    updateFoldCount() {
        const level = Levels.getCurrentLevel();
        const par = level.par || 1;
        const folds = Fold.history.length;
        document.getElementById('hud-folds').textContent = `折叠: ${folds} / ${par}`;
    },

    showFoldHint(text) {
        const el = document.getElementById('fold-indicator');
        el.textContent = text;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 2000);
    }
};
