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

        // 启用「夜行萤火 · 火车票」UI 主题
        if (this.screens.menu)    this.screens.menu.classList.add('train-mode');
        if (this.screens.chapter) this.screens.chapter.classList.add('train-mode');

        if (this.screens.menu) this._initMenuFireflies(this.screens.menu);
        if (this.screens.menu) this._processMenuLogo(this.screens.menu);
        if (this.screens.menu) this._processMenuBg();

        document.getElementById('btn-start').addEventListener('click', () => {
            Audio.playClick();
            Audio.startBGM();
            this.triggerMenuLaunch(() => {
                this.showChapterSelect();
            });
        });

        const btnChapters = document.getElementById('btn-chapters');
        if (btnChapters) {
            btnChapters.addEventListener('click', () => {
                Audio.playClick();
                this.showChapterSelect();
            });
        }

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

    // 章节路线信息（用于站台牌 + 车票路由文字）
    _chapterRoutes: [
        { prefix: 'G', from: '大学站',   to: '江北',     mile: '0 km' },
        { prefix: 'D', from: '江北',     to: '解放碑',   mile: '38 km' },
        { prefix: 'K', from: '解放碑',   to: '朝天门',   mile: '12 km' },
        { prefix: 'T', from: '朝天门',   to: '三峡',     mile: '410 km' },
        { prefix: 'Z', from: '秦岭',     to: '北方原野', mile: '1280 km' },
        { prefix: 'S', from: '大连',     to: '家',       mile: '8 km' }
    ],

    _ticketSnippet(chIdx, lvIdx) {
        try {
            const txt = (Story.chapters[chIdx] && Story.chapters[chIdx].levels[lvIdx] && Story.chapters[chIdx].levels[lvIdx].before) || '';
            const m = txt.split(/[，。！？,.!?\n]/)[0] || txt;
            return m.slice(0, 26);
        } catch (e) { return ''; }
    },

    _ticketStarsHTML(completed) {
        if (completed) {
            return '<span class="stars">★ ★ ★</span>';
        }
        return '<span class="stars"><span class="empty">☆</span> <span class="empty">☆</span> <span class="empty">☆</span></span>';
    },

    _loadMenuTrain(host) {
        const src = new Image();
        src.onload = () => {
            const c = document.createElement('canvas');
            c.width = src.naturalWidth;
            c.height = src.naturalHeight;
            const cx = c.getContext('2d');
            cx.drawImage(src, 0, 0);
            const data = cx.getImageData(0, 0, c.width, c.height);
            const px = data.data;
            for (let i = 0; i < px.length; i += 4) {
                const r = px[i], g = px[i + 1], b = px[i + 2];
                const magenta = (r - g) + (b - g);
                if (r > 180 && g < 110 && b > 180 && magenta > 180) {
                    px[i + 3] = 0;
                } else if (magenta > 80 && r > 150 && b > 150 && g < 180) {
                    const k = Math.min(1, (magenta - 80) / 140);
                    px[i + 3] = Math.round(px[i + 3] * (1 - k * 0.85));
                    px[i + 1] = Math.min(255, g + Math.round(k * 10));
                }
            }
            cx.putImageData(data, 0, 0);
            const img = document.createElement('img');
            img.className = 'menu-train';
            img.src = c.toDataURL('image/png');
            host.appendChild(img);
        };
        src.onerror = () => console.warn('[menu] train sprite failed to load');
        src.src = 'assets/decor/menu_train_sprite_magenta.jpg';
    },

    _processMenuLogo(host) {
        const img = host.querySelector('img.menu-logo[data-chroma-key]');
        if (!img) return;
        const apply = () => {
            try {
                const W = img.naturalWidth, H = img.naturalHeight;
                if (!W || !H) return;
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, W, H);
                const px = data.data;

                // 白底抠图（连通域版）：从边缘洪水填充浅色像素，只透明"与外部连通"的白
                // —— 字符内部封闭的白色被笔画包围，不会被填到，保持不透明
                const isLight = (idx) => {
                    const r = px[idx], g = px[idx+1], b = px[idx+2];
                    const cmin = r < g ? (r < b ? r : b) : (g < b ? g : b);
                    const cmax = r > g ? (r > b ? r : b) : (g > b ? g : b);
                    return cmin >= 215 && (cmax - cmin) <= 35;
                };
                const visited = new Uint8Array(W * H);
                const stack = [];
                // 种子：所有边缘上的浅色像素
                for (let x = 0; x < W; x++) {
                    const top = x, bot = (H - 1) * W + x;
                    if (isLight(top * 4)) { visited[top] = 1; stack.push(top); }
                    if (isLight(bot * 4)) { visited[bot] = 1; stack.push(bot); }
                }
                for (let y = 0; y < H; y++) {
                    const left = y * W, right = y * W + (W - 1);
                    if (isLight(left * 4)) { visited[left] = 1; stack.push(left); }
                    if (isLight(right * 4)) { visited[right] = 1; stack.push(right); }
                }
                while (stack.length) {
                    const p = stack.pop();
                    const x = p % W, y = (p - x) / W;
                    if (x > 0)     { const n = p - 1; if (!visited[n] && isLight(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (x < W-1)   { const n = p + 1; if (!visited[n] && isLight(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (y > 0)     { const n = p - W; if (!visited[n] && isLight(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (y < H-1)   { const n = p + W; if (!visited[n] && isLight(n*4)) { visited[n] = 1; stack.push(n); } }
                }
                // 第一遍：连通的浅色像素 → 透明
                for (let p = 0; p < W * H; p++) {
                    if (visited[p]) px[p * 4 + 3] = 0;
                }
                // 第二遍：羽化抗锯齿边缘 —— 邻居中至少一个透明且自身偏浅 → 部分透明
                const alphaCopy = new Uint8Array(W * H);
                for (let p = 0; p < W * H; p++) alphaCopy[p] = px[p * 4 + 3];
                for (let y = 1; y < H - 1; y++) {
                    for (let x = 1; x < W - 1; x++) {
                        const p = y * W + x;
                        if (alphaCopy[p] === 0) continue;
                        const i = p * 4;
                        const r = px[i], g = px[i+1], b = px[i+2];
                        const cmin = r < g ? (r < b ? r : b) : (g < b ? g : b);
                        const cmax = r > g ? (r > b ? r : b) : (g > b ? g : b);
                        if (cmin < 180 || (cmax - cmin) >= 50) continue; // 只羽化偏浅低饱和像素
                        const hasTransparentNeighbor =
                            alphaCopy[p-1] === 0 || alphaCopy[p+1] === 0 ||
                            alphaCopy[p-W] === 0 || alphaCopy[p+W] === 0;
                        if (hasTransparentNeighbor) {
                            // cmin 在 [180, 255] 间映射到 alpha 比例
                            const t = 1 - Math.min(1, (cmin - 180) / 60);
                            px[i+3] = Math.round(alphaCopy[p] * t);
                        }
                    }
                }
                ctx.putImageData(data, 0, 0);
                img.src = canvas.toDataURL('image/png');
                img.removeAttribute('data-chroma-key');
            } catch (e) {
                console.warn('[menu] logo chroma-key failed:', e);
            }
        };
        if (img.complete && img.naturalWidth) apply();
        else img.addEventListener('load', apply, { once: true });
    },

    _processMenuBg() {
        const url = 'assets/backgrounds/menu_bg_landscape.jpg';
        const src = new Image();
        src.crossOrigin = 'anonymous';
        src.onload = () => {
            try {
                const W = src.naturalWidth, H = src.naturalHeight;
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(src, 0, 0);
                // 水印位于右下角 ~bottom-right 22% 宽 × 12% 高（多一点冗余覆盖）
                const wmW = Math.floor(W * 0.22);
                const wmH = Math.floor(H * 0.12);
                const wmX = W - wmW;
                const wmY = H - wmH;
                // 取水印正左侧的相同高度草地块作为补丁源
                const srcX = Math.max(0, wmX - wmW);
                const srcY = wmY;
                // 1) 直接复制覆盖
                ctx.drawImage(canvas, srcX, srcY, wmW, wmH, wmX, wmY, wmW, wmH);
                // 2) 在水印边缘做一次轻微羽化（左 8px 渐变接缝），用 globalAlpha + 渐变混合
                const blend = ctx.createLinearGradient(wmX, 0, wmX + 12, 0);
                blend.addColorStop(0, 'rgba(0,0,0,0)');
                blend.addColorStop(1, 'rgba(0,0,0,0.001)'); // 占位，实际靠下面的 patch 二次盖
                // 二次轻覆盖，源稍微上移让纹理错开避免接缝硬边
                ctx.save();
                ctx.globalAlpha = 0.55;
                ctx.drawImage(canvas, srcX, Math.max(0, srcY - Math.floor(wmH * 0.4)), wmW, wmH, wmX, wmY, wmW, wmH);
                ctx.restore();

                const cleaned = canvas.toDataURL('image/jpeg', 0.92);
                const styleEl = document.createElement('style');
                styleEl.id = 'menu-bg-cleaned-style';
                styleEl.textContent = `#menu-screen.train-mode::before{background-image:url(${cleaned}) !important;}`;
                const old = document.getElementById('menu-bg-cleaned-style');
                if (old) old.remove();
                document.head.appendChild(styleEl);
            } catch (e) {
                console.warn('[menu] bg watermark removal failed:', e);
            }
        };
        src.onerror = () => console.warn('[menu] bg load failed for watermark removal');
        src.src = url;
    },

    _initMenuFireflies(host) {
        const clouds = document.createElement('div');
        clouds.className = 'menu-clouds';
        host.appendChild(clouds);

        this._loadMenuTrain(host);

        const headlight = document.createElement('div');
        headlight.className = 'menu-headlight';
        host.appendChild(headlight);

        const smoke = document.createElement('div');
        smoke.className = 'menu-smoke';
        smoke.innerHTML = '<span></span><span></span><span></span>';
        host.appendChild(smoke);

        const canvas = document.createElement('canvas');
        canvas.className = 'fireflies-canvas';
        host.appendChild(canvas);

        const flash = document.createElement('div');
        flash.className = 'launch-flash';
        host.appendChild(flash);

        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dpr = window.devicePixelRatio || 1;
        const COUNT = 36;
        const particles = [];
        this._fxState = { rushing: false, rushStart: 0 };
        const state = this._fxState;

        const resize = () => {
            const r = host.getBoundingClientRect();
            w = r.width; h = r.height;
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        const spawn = (p) => {
            p.x = Math.random() * w;
            p.y = Math.random() * h;
            p.vx = (Math.random() - 0.5) * 0.18;
            p.vy = (Math.random() - 0.5) * 0.12 - 0.04;
            p.r = 1 + Math.random() * 1.8;
            p.base = 0.35 + Math.random() * 0.5;
            p.phase = Math.random() * Math.PI * 2;
            p.freq = 0.6 + Math.random() * 1.2;
        };
        resize();
        for (let i = 0; i < COUNT; i++) { const p = {}; spawn(p); particles.push(p); }
        window.addEventListener('resize', resize);

        const step = (t) => {
            if (!host.classList.contains('active')) {
                requestAnimationFrame(step);
                return;
            }
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'lighter';
            const ts = t * 0.001;

            // 运镜中：粒子从火车位置 (33% 38%) 放射加速，模拟被列车吹散
            let rushK = 0;
            if (state.rushing) {
                rushK = Math.min(1, (t - state.rushStart) / 1600);
            }
            const fx = w * 0.33, fy = h * 0.38;

            for (const p of particles) {
                if (rushK > 0) {
                    const dx = p.x - fx, dy = p.y - fy;
                    const d = Math.max(20, Math.hypot(dx, dy));
                    const push = 0.6 + rushK * 14;
                    p.vx += (dx / d) * push * 0.18;
                    p.vy += (dy / d) * push * 0.18;
                    p.r *= 1 + rushK * 0.04;
                } else {
                    p.vx += (Math.random() - 0.5) * 0.02;
                    p.vy += (Math.random() - 0.5) * 0.02;
                    p.vx = Math.max(-0.4, Math.min(0.4, p.vx));
                    p.vy = Math.max(-0.3, Math.min(0.3, p.vy));
                }
                p.x += p.vx; p.y += p.vy;
                if (!state.rushing && (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10)) spawn(p);

                const blink = 0.55 + 0.45 * Math.sin(ts * p.freq + p.phase);
                let a = p.base * blink;
                if (rushK > 0) a = Math.min(1, a + rushK * 0.5);
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
                g.addColorStop(0, `rgba(220, 255, 180, ${a})`);
                g.addColorStop(0.4, `rgba(200, 255, 130, ${a * 0.4})`);
                g.addColorStop(1, 'rgba(168, 230, 207, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 250, 200, ${Math.min(1, a * 1.8)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    triggerMenuLaunch(onMidway) {
        const host = this.screens.menu;
        if (!host || host.classList.contains('launching')) return;
        host.classList.add('launching');
        if (this._fxState) {
            this._fxState.rushing = true;
            this._fxState.rushStart = performance.now();
        }
        // 1.3s 时屏幕已被白光覆盖大部分，切换屏幕的视觉跳变被白光遮住
        setTimeout(() => { if (onMidway) onMidway(); }, 1300);
        // 1.6s 后清理状态，避免再次点击残留
        setTimeout(() => {
            host.classList.remove('launching');
            if (this._fxState) this._fxState.rushing = false;
        }, 1700);
    },

    showChapterSelect() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        // 副标题（站台号 / 时刻表）
        const screen = document.getElementById('chapter-screen');
        let sub = screen.querySelector('.platform-subtitle');
        if (!sub) {
            sub = document.createElement('p');
            sub.className = 'platform-subtitle';
            sub.textContent = 'TIMETABLE · 时刻表';
            const h2 = screen.querySelector('h2');
            if (h2) h2.insertAdjacentElement('afterend', sub);
        }

        const showFirstHint = !localStorage.getItem('ft_hint_seen');
        let firstHintTarget = null;

        Story.chapters.forEach((ch, chIdx) => {
            const chUnlocked = Levels.isChapterUnlocked(chIdx);
            const route = this._chapterRoutes[chIdx] || { prefix: 'G', from: '—', to: '—', mile: '' };

            // 站台牌
            const sign = document.createElement('div');
            sign.className = 'platform-sign' + (chUnlocked ? '' : ' locked');
            sign.innerHTML = `
                <div class="platform-name">
                    <span class="ch-num">DAY ${String(chIdx + 1).padStart(2, '0')}</span>
                    <span class="ch-name">${ch.name}</span>
                    <span class="ch-meta">${route.from} → ${route.to}　${route.mile}</span>
                </div>
            `;
            list.appendChild(sign);

            // 车票排
            const row = document.createElement('div');
            row.className = 'ticket-row';
            const levelCount = Levels.data[chIdx].length;

            for (let lvIdx = 0; lvIdx < levelCount; lvIdx++) {
                const unlocked = Levels.isLevelUnlocked(chIdx, lvIdx);
                const completed = Levels.isLevelCompleted(chIdx, lvIdx);
                const level = Levels.data[chIdx][lvIdx];
                const par = (level && level.par) || 1;

                const trainNo = `${route.prefix}·${chIdx + 1}${String(lvIdx + 1).padStart(2, '0')}`;
                const trainClass = ({G:'高铁',D:'动车',K:'快速',T:'特快',Z:'直达',S:'市郊'})[route.prefix] || '列车';

                let stampHTML = '';
                if (completed) stampHTML = '<span class="ticket-stamp completed">已检票</span>';
                else if (unlocked) stampHTML = '<span class="ticket-stamp unlocked">检票中</span>';
                else stampHTML = '<span class="ticket-stamp locked">候车中</span>';

                const btn = document.createElement('button');
                btn.className = 'train-ticket'
                    + (unlocked ? '' : ' locked')
                    + (completed ? ' completed' : '');
                btn.innerHTML = `
                    ${stampHTML}
                    <span class="firefly" style="left:60%;top:30%;animation-delay:0s;"></span>
                    <span class="firefly" style="left:80%;top:60%;animation-delay:1.4s;"></span>
                    <div class="ticket-stub">
                        <div>
                            <div class="train-no">${trainNo}</div>
                            <div class="train-class">${trainClass}</div>
                        </div>
                        <div class="stub-bottom">par <span class="par">${par}</span> 折</div>
                    </div>
                    <div class="ticket-main">
                        <div class="route">
                            <span>${route.from}</span>
                            <span class="arrow">→</span>
                            <span>${chIdx + 1}-${lvIdx + 1}</span>
                        </div>
                        <div class="ticket-snippet">${unlocked ? this._ticketSnippet(chIdx, lvIdx) : '尚未解锁'}</div>
                        ${unlocked ? this._ticketStarsHTML(completed) : ''}
                        <div class="barcode"></div>
                    </div>
                `;

                if (unlocked) {
                    if (showFirstHint && !completed && !firstHintTarget) firstHintTarget = btn;
                    btn.addEventListener('click', () => {
                        if (btn.classList.contains('tearing')) return;
                        Audio.playClick();
                        Audio.startBGM();
                        // 撕票动画后再进入剧情
                        btn.classList.add('tearing');
                        Levels.currentChapter = chIdx;
                        Levels.currentLevel = lvIdx;
                        setTimeout(() => Game.showStory('before'), 480);
                    });
                }

                row.appendChild(btn);
            }
            list.appendChild(row);
        });
        if (firstHintTarget) {
            firstHintTarget.classList.add('first-time-hint');
            const label = document.createElement('span');
            label.className = 'hint-label';
            label.textContent = '从这里出发 ↓';
            firstHintTarget.appendChild(label);
            const dismiss = () => {
                firstHintTarget.classList.remove('first-time-hint');
                if (label.parentNode) label.parentNode.removeChild(label);
                localStorage.setItem('ft_hint_seen', '1');
                screen.removeEventListener('click', dismiss, true);
            };
            screen.addEventListener('click', dismiss, true);
            setTimeout(dismiss, 5000);
        }
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
