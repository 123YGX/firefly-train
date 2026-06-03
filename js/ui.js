const UI = {
    screens: {},
    currentScreen: 'menu',

    init() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            story: document.getElementById('story-screen'),
            game: document.getElementById('game-screen'),
            chapter: document.getElementById('chapter-screen'),
            collection: document.getElementById('collection-screen'),
            complete: document.getElementById('complete-screen')
        };

        // 启用「书桌 · 旅行纸张」首页主题（点画纸进入、点笔记本开收集室）
        if (this.screens.menu)    this.screens.menu.classList.add('desk-mode');
        if (this.screens.chapter) this.screens.chapter.classList.add('train-mode');

        if (this.screens.menu) this._initMenuFireflies(this.screens.menu);
        if (this.screens.menu) this._processMenuLogo(this.screens.menu);
        // _processMenuBg 已停用：bg 文件本身已无水印，运行时清除反而会用左侧草地覆盖右下角
        this._processTicketAsset();

        // 点击中央白纸 → 镜头推进变白 → 进入章节选择（「钻进纸中世界」）
        const deskPaper = document.getElementById('desk-paper');
        const enterJourney = () => {
            Audio.playClick();
            Audio.startBGM();
            this.triggerMenuLaunch(() => {
                this.showChapterSelect();
            });
        };
        if (deskPaper) {
            deskPaper.addEventListener('click', enterJourney);
            deskPaper.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterJourney(); }
            });
        }
        // 把画纸热区（含标题）动态对齐到书桌背景图里白纸的真实位置，
        // 适配桌面 / 移动端旋转后不同的 cover 裁切量，避免标题溢出纸外
        this._layoutDeskPaper();
        const relayout = () => this._layoutDeskPaper();
        window.addEventListener('resize', relayout);
        window.addEventListener('orientationchange', () => setTimeout(relayout, 60));

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

        // 收集室入口（主菜单=左下「旅行回忆」笔记本，选关页=纪念册按钮）与返回
        const bindCollectionBtn = (id, back) => {
            const b = document.getElementById(id);
            if (!b) return;
            const open = () => {
                Audio.playClick();
                this._collectionBack = back;
                this.showCollection();
            };
            b.addEventListener('click', open);
            b.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            });
        };
        bindCollectionBtn('desk-notebook', 'menu');
        bindCollectionBtn('btn-collection-chapter', 'chapter');
        const bbc = document.getElementById('btn-back-collection');
        if (bbc) bbc.addEventListener('click', () => {
            Audio.playClick();
            this.showScreen(this._collectionBack || 'menu');
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

    _chapterSceneSVG(chIdx) {
        // 480x64 横幅，作为站台牌外景。统一暖色剪影 + 朦胧晕染。
        const scenes = [
            // ch0 大学站 → 江北：校园门楼 + 银杏 + 月牙
            `<defs><linearGradient id="sky0" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#5a3d6b"/><stop offset="1" stop-color="#c98a6d"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky0)"/>
             <circle cx="80" cy="20" r="9" fill="#fff4c8" opacity="0.85"/>
             <circle cx="76" cy="18" r="7.5" fill="#5a3d6b"/>
             <g fill="#1f1322">
               <path d="M0 50 L60 38 L120 44 L180 36 L240 42 L320 34 L400 40 L480 32 L480 64 L0 64 Z"/>
               <rect x="200" y="34" width="56" height="22"/>
               <polygon points="194,34 262,34 228,24"/>
               <rect x="218" y="40" width="6" height="16" fill="#ffd97d" opacity="0.55"/>
               <rect x="232" y="40" width="6" height="16" fill="#ffd97d" opacity="0.55"/>
             </g>
             <g fill="#2a1a1f"><circle cx="380" cy="42" r="8"/><circle cx="392" cy="38" r="9"/><circle cx="404" cy="44" r="7"/><rect x="395" y="44" width="2" height="12"/></g>
             <g fill="#2a1a1f"><circle cx="60" cy="44" r="7"/><circle cx="72" cy="40" r="8"/><circle cx="84" cy="46" r="6"/><rect x="74" y="46" width="2" height="10"/></g>`,

            // ch1 江北 → 解放碑：山城夜景，多层建筑 + 灯火
            `<defs><linearGradient id="sky1" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#3a2545"/><stop offset="1" stop-color="#a85540"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky1)"/>
             <g fill="#181018" opacity="0.85">
               <polygon points="0,48 40,40 80,44 120,30 160,38 200,28 240,34 280,22 320,30 360,26 400,32 440,28 480,36 480,64 0,64"/>
             </g>
             <g fill="#0d0810">
               <rect x="40" y="32" width="14" height="32"/>
               <rect x="80" y="24" width="10" height="40"/>
               <rect x="120" y="18" width="16" height="46"/>
               <rect x="160" y="26" width="12" height="38"/>
               <rect x="210" y="14" width="22" height="50"/>
               <rect x="260" y="22" width="12" height="42"/>
               <rect x="290" y="28" width="14" height="36"/>
               <rect x="330" y="20" width="10" height="44"/>
               <rect x="370" y="26" width="18" height="38"/>
               <rect x="410" y="22" width="12" height="42"/>
               <rect x="438" y="30" width="14" height="34"/>
             </g>
             <g fill="#ffd97d">
               <rect x="44" y="38" width="2" height="2"/><rect x="48" y="44" width="2" height="2"/>
               <rect x="84" y="32" width="2" height="2"/><rect x="84" y="40" width="2" height="2"/>
               <rect x="124" y="26" width="2" height="2"/><rect x="128" y="34" width="2" height="2"/><rect x="124" y="42" width="2" height="2"/>
               <rect x="164" y="34" width="2" height="2"/><rect x="166" y="44" width="2" height="2"/>
               <rect x="216" y="22" width="2" height="2"/><rect x="222" y="30" width="2" height="2"/><rect x="216" y="40" width="2" height="2"/><rect x="224" y="48" width="2" height="2"/>
               <rect x="264" y="30" width="2" height="2"/><rect x="266" y="42" width="2" height="2"/>
               <rect x="294" y="36" width="2" height="2"/><rect x="298" y="46" width="2" height="2"/>
               <rect x="332" y="28" width="2" height="2"/><rect x="334" y="42" width="2" height="2"/><rect x="332" y="52" width="2" height="2"/>
               <rect x="374" y="34" width="2" height="2"/><rect x="382" y="44" width="2" height="2"/>
               <rect x="412" y="30" width="2" height="2"/><rect x="416" y="42" width="2" height="2"/>
               <rect x="442" y="38" width="2" height="2"/><rect x="446" y="48" width="2" height="2"/>
             </g>`,

            // ch2 解放碑 → 朝天门：两江汇流 + 渡船
            `<defs><linearGradient id="sky2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#6a4878"/><stop offset="1" stop-color="#e0a070"/></linearGradient>
              <linearGradient id="water2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#7a5040"/><stop offset="1" stop-color="#3a2030"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky2)"/>
             <path d="M0 38 L60 32 L140 36 L220 28 L300 34 L380 30 L480 36 L480 64 L0 64 Z" fill="#2a1a28"/>
             <path d="M0 44 L240 40 L480 46 L480 64 L0 64 Z" fill="url(#water2)"/>
             <path d="M180 44 Q240 36 300 44 L300 50 Q240 42 180 50 Z" fill="#1a0e1a" opacity="0.7"/>
             <g fill="#1a0e14">
               <rect x="232" y="46" width="22" height="5"/>
               <polygon points="232,46 254,46 250,42 236,42"/>
               <rect x="241" y="38" width="2" height="6"/>
             </g>
             <g fill="#ffd97d" opacity="0.7"><circle cx="240" cy="40" r="1.2"/></g>
             <g fill="#ffd97d" opacity="0.5">
               <rect x="60" y="46" width="3" height="1"/><rect x="120" y="48" width="3" height="1"/>
               <rect x="340" y="46" width="3" height="1"/><rect x="400" y="48" width="3" height="1"/>
             </g>`,

            // ch3 朝天门 → 三峡：高山峡谷 + 一叶扁舟
            `<defs><linearGradient id="sky3" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#4a3050"/><stop offset="1" stop-color="#d8956a"/></linearGradient>
              <linearGradient id="water3" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#8a5a3a"/><stop offset="1" stop-color="#3a2018"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky3)"/>
             <polygon points="0,42 60,12 120,30 180,8 240,28 300,10 360,32 420,14 480,30 480,64 0,64" fill="#231425"/>
             <polygon points="20,44 80,22 140,36 200,18 260,32 320,16 380,34 440,20 480,38 480,64 0,64" fill="#3a1f2c" opacity="0.8"/>
             <path d="M0 50 L480 50 L480 64 L0 64 Z" fill="url(#water3)"/>
             <g fill="#1a0e10">
               <path d="M220 54 Q240 50 260 54 L256 56 L224 56 Z"/>
               <rect x="238" y="46" width="1.5" height="8"/>
               <polygon points="240,46 248,52 240,52" fill="#5a3a28"/>
             </g>
             <g fill="#fff4c8" opacity="0.4">
               <rect x="100" y="52" width="6" height="1"/>
               <rect x="180" y="54" width="8" height="1"/>
               <rect x="320" y="52" width="6" height="1"/>
               <rect x="400" y="54" width="10" height="1"/>
             </g>`,

            // ch4 秦岭 → 北方原野：雪山 + 麦田 + 孤树
            `<defs><linearGradient id="sky4" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#5a4070"/><stop offset="1" stop-color="#e8b890"/></linearGradient>
              <linearGradient id="field4" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#c8924a"/><stop offset="1" stop-color="#6a4220"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky4)"/>
             <polygon points="0,38 60,16 130,30 200,8 280,26 360,12 440,28 480,18 480,64 0,64" fill="#3a3548"/>
             <polygon points="50,30 130,30 90,12" fill="#f4ead0"/>
             <polygon points="240,28 320,26 280,4" fill="#f4ead0"/>
             <polygon points="400,28 480,18 460,8 440,16" fill="#f4ead0" opacity="0.85"/>
             <path d="M0 44 L480 42 L480 64 L0 64 Z" fill="url(#field4)"/>
             <g stroke="#3a2010" stroke-width="0.6" opacity="0.55">
               <path d="M10 48 Q50 46 90 50 T180 48 T280 50 T380 48 T470 50"/>
               <path d="M0 54 Q60 52 120 56 T240 54 T360 56 T480 54"/>
             </g>
             <g fill="#1a0e08">
               <rect x="356" y="38" width="2" height="14"/>
               <circle cx="357" cy="36" r="6"/>
             </g>`,

            // ch5 大连 → 家：海岸 + 灯塔 + 海浪
            `<defs><linearGradient id="sky5" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#3a4870"/><stop offset="1" stop-color="#f0c890"/></linearGradient>
              <linearGradient id="sea5" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#5a7088"/><stop offset="1" stop-color="#1a2438"/></linearGradient></defs>
             <rect width="480" height="64" fill="url(#sky5)"/>
             <circle cx="380" cy="22" r="11" fill="#ffd97d" opacity="0.85"/>
             <circle cx="380" cy="22" r="20" fill="#ffd97d" opacity="0.18"/>
             <path d="M0 36 L480 36 L480 64 L0 64 Z" fill="url(#sea5)"/>
             <g stroke="#fff4c8" stroke-width="0.6" opacity="0.55" fill="none">
               <path d="M10 42 Q40 40 70 42 T130 42 T200 42 T280 42 T360 42 T460 42"/>
               <path d="M0 50 Q50 48 100 50 T200 50 T300 50 T400 50 T480 50"/>
               <path d="M20 56 Q60 54 110 56 T220 56 T340 56 T470 56"/>
             </g>
             <g fill="#1a0e14">
               <rect x="78" y="20" width="6" height="16"/>
               <polygon points="76,20 86,20 81,12"/>
               <rect x="74" y="36" width="14" height="4"/>
             </g>
             <rect x="79" y="14" width="4" height="4" fill="#ffd97d"/>
             <rect x="73" y="15" width="16" height="2" fill="#ffd97d" opacity="0.35"/>`
        ];
        const inner = scenes[chIdx] || scenes[0];
        return `<svg class="platform-scene" viewBox="0 0 480 64" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
    },

    _ticketStarsHTML(completed, stars) {
        const n = Math.max(0, Math.min(3, stars | 0));
        if (!completed && n === 0) {
            return '<span class="stars"><span class="empty">☆</span> <span class="empty">☆</span> <span class="empty">☆</span></span>';
        }
        let html = '<span class="stars">';
        for (let i = 0; i < 3; i++) {
            html += i < n
                ? '★'
                : ' <span class="empty">☆</span>';
        }
        html += '</span>';
        return html;
    },

    // 把 .desk-paper 热区（标题+提示居中其上）对齐到书桌背景图里白纸的真实位置。
    // 背景用 background-size:cover，会按容器/图片比例差异裁切；这里复刻 cover 数学，
    // 把白纸在【图片】里的归一化框换算成【容器】像素框，桌面与移动端旋转后都能对齐。
    _layoutDeskPaper() {
        const menu = this.screens && this.screens.menu;
        const paper = document.getElementById('desk-paper');
        if (!menu || !paper) return;
        // 书桌图固有比例 + 白纸在图里的归一化框（由 tools/_measure_paper.js 实测）
        const IMG_W = 1672, IMG_H = 941;
        const P = { left: 0.260, top: 0.261, right: 0.751, bottom: 0.862 };
        const cw = menu.clientWidth, ch = menu.clientHeight;
        if (!cw || !ch) return;
        // cover：取较大缩放，使图片铺满容器，多余部分溢出（居中裁切）
        const scale = Math.max(cw / IMG_W, ch / IMG_H);
        const dispW = IMG_W * scale, dispH = IMG_H * scale;
        const offX = (cw - dispW) / 2, offY = (ch - dispH) / 2;  // 图片左上角相对容器（多为负）
        // 白纸框 → 容器像素
        const pxL = offX + P.left   * dispW;
        const pxT = offY + P.top    * dispH;
        const pxW = (P.right - P.left)  * dispW;
        const pxH = (P.bottom - P.top)  * dispH;
        const s = paper.style;
        s.left   = (pxL / cw * 100).toFixed(2) + '%';
        s.top    = (pxT / ch * 100).toFixed(2) + '%';
        s.width  = (pxW / cw * 100).toFixed(2) + '%';
        s.height = (pxH / ch * 100).toFixed(2) + '%';
    },

    _processTicketAsset() {
        const url = 'assets/decor/ticket_raw.jpg';
        const src = new Image();
        src.crossOrigin = 'anonymous';
        src.onload = () => {
            try {
                const MAX_W = 1024;
                const sw = src.naturalWidth, sh = src.naturalHeight;
                const scale = Math.min(1, MAX_W / sw);
                const W = Math.round(sw * scale), H = Math.round(sh * scale);
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(src, 0, 0, W, H);
                const data = ctx.getImageData(0, 0, W, H);
                const px = data.data;
                const isBg = (idx) => {
                    const r = px[idx], g = px[idx+1], b = px[idx+2];
                    const cmin = r < g ? (r < b ? r : b) : (g < b ? g : b);
                    const cmax = r > g ? (r > b ? r : b) : (g > b ? g : b);
                    return cmin >= 225 && (cmax - cmin) <= 18;
                };
                const visited = new Uint8Array(W * H);
                const stack = [];
                for (let x = 0; x < W; x++) {
                    const top = x, bot = (H - 1) * W + x;
                    if (isBg(top * 4)) { visited[top] = 1; stack.push(top); }
                    if (isBg(bot * 4)) { visited[bot] = 1; stack.push(bot); }
                }
                for (let y = 0; y < H; y++) {
                    const left = y * W, right = y * W + (W - 1);
                    if (isBg(left * 4)) { visited[left] = 1; stack.push(left); }
                    if (isBg(right * 4)) { visited[right] = 1; stack.push(right); }
                }
                while (stack.length) {
                    const p = stack.pop();
                    const x = p % W, y = (p - x) / W;
                    if (x > 0)   { const n = p - 1; if (!visited[n] && isBg(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (x < W-1) { const n = p + 1; if (!visited[n] && isBg(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (y > 0)   { const n = p - W; if (!visited[n] && isBg(n*4)) { visited[n] = 1; stack.push(n); } }
                    if (y < H-1) { const n = p + W; if (!visited[n] && isBg(n*4)) { visited[n] = 1; stack.push(n); } }
                }
                for (let p = 0; p < W * H; p++) {
                    if (visited[p]) px[p * 4 + 3] = 0;
                }
                const alphaCopy = new Uint8Array(W * H);
                for (let p = 0; p < W * H; p++) alphaCopy[p] = px[p * 4 + 3];
                for (let y = 1; y < H - 1; y++) {
                    for (let x = 1; x < W - 1; x++) {
                        const p = y * W + x;
                        if (alphaCopy[p] === 0) continue;
                        const i = p * 4;
                        const r = px[i], g = px[i+1], b = px[i+2];
                        const cmin = r < g ? (r < b ? r : b) : (g < b ? g : b);
                        if (cmin < 200) continue;
                        const hasTransparentNeighbor =
                            alphaCopy[p-1] === 0 || alphaCopy[p+1] === 0 ||
                            alphaCopy[p-W] === 0 || alphaCopy[p+W] === 0;
                        if (hasTransparentNeighbor) {
                            const t = 1 - Math.min(1, (cmin - 200) / 40);
                            px[i+3] = Math.round(alphaCopy[p] * t);
                        }
                    }
                }
                ctx.putImageData(data, 0, 0);

                // 裁剪到非透明像素的紧致 bbox（去掉车票四周空白），让 background:contain 后车票贴满按钮
                let minX = W, minY = H, maxX = -1, maxY = -1;
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (px[(y * W + x) * 4 + 3] > 8) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                let outCanvas = canvas;
                let outW = W, outH = H;
                if (maxX >= minX && maxY >= minY) {
                    const PAD = 2;
                    minX = Math.max(0, minX - PAD);
                    minY = Math.max(0, minY - PAD);
                    maxX = Math.min(W - 1, maxX + PAD);
                    maxY = Math.min(H - 1, maxY + PAD);
                    outW = maxX - minX + 1;
                    outH = maxY - minY + 1;
                    const cropped = document.createElement('canvas');
                    cropped.width = outW; cropped.height = outH;
                    cropped.getContext('2d').drawImage(canvas, minX, minY, outW, outH, 0, 0, outW, outH);
                    outCanvas = cropped;
                }

                outCanvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    document.documentElement.style.setProperty('--ticket-bg', `url(${url})`);
                    document.documentElement.style.setProperty('--ticket-aspect', (outW / outH).toFixed(3));
                    document.documentElement.classList.add('ticket-ready');
                }, 'image/png');
            } catch (e) {
                console.warn('[menu] ticket asset chroma-key failed:', e);
            }
        };
        src.onerror = () => console.warn('[menu] ticket_raw.jpg load failed');
        src.src = url;
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
        // 书桌首页：只保留暖光萤火粒子 + 启程白光层；火车/烟囱/云层等夜行场景元素不再注入。
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

            // 运镜中：粒子从纸张中心 (50% 50%) 放射加速，模拟被「吸进画纸」时吹散
            let rushK = 0;
            if (state.rushing) {
                rushK = Math.min(1, (t - state.rushStart) / 1600);
            }
            const fx = w * 0.5, fy = h * 0.5;

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
                g.addColorStop(0, `rgba(255, 240, 190, ${a})`);
                g.addColorStop(0.4, `rgba(255, 215, 130, ${a * 0.45})`);
                g.addColorStop(1, 'rgba(255, 210, 140, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 250, 220, ${Math.min(1, a * 1.8)})`;
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

    showCollection() {
        const grid = document.getElementById('collection-grid');
        const prog = document.getElementById('collection-progress');
        if (!grid) return;
        const all = Collection.getAll();
        const got = Collection.count();
        const total = Collection.total();
        if (prog) prog.textContent = `已收集 ${got} / ${total}`;

        grid.innerHTML = '';
        all.forEach(it => {
            const cell = document.createElement('div');
            cell.className = 'collect-cell' + (it.collected ? ' collected' : ' locked');
            if (it.collected) {
                const img = document.createElement('img');
                img.className = 'collect-img';
                img.src = `assets/collection/${it.icon}.png`;
                img.alt = it.name;
                img.onerror = () => { img.style.display = 'none'; cell.classList.add('noimg'); };
                cell.appendChild(img);
                const nm = document.createElement('div');
                nm.className = 'collect-name';
                nm.textContent = it.name;
                cell.appendChild(nm);
                cell.title = it.desc;
            } else {
                const q = document.createElement('div');
                q.className = 'collect-q';
                q.textContent = '?';
                cell.appendChild(q);
                const nm = document.createElement('div');
                nm.className = 'collect-name';
                nm.textContent = `第${it.chapter + 1}-${it.level + 1}关`;
                cell.appendChild(nm);
            }
            grid.appendChild(cell);
        });

        this.showScreen('collection');
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

        // 章节背景层：每章一张，悬停时淡入
        let bgLayers = screen.querySelectorAll('.chapter-bg-layer');
        if (bgLayers.length !== Story.chapters.length) {
            screen.querySelectorAll('.chapter-bg-layer').forEach(el => el.remove());
            Story.chapters.forEach((_, idx) => {
                const layer = document.createElement('div');
                layer.className = 'chapter-bg-layer';
                layer.dataset.ch = idx;
                layer.style.backgroundImage = `url('assets/backgrounds/chapter_bg_ch${idx + 1}.png')`;
                screen.insertBefore(layer, screen.firstChild);
            });
            bgLayers = screen.querySelectorAll('.chapter-bg-layer');
        }
        const activateBg = (idx) => {
            bgLayers.forEach(l => l.classList.toggle('active', +l.dataset.ch === idx));
        };
        const resetBg = () => {
            bgLayers.forEach(l => l.classList.remove('active'));
        };

        const showFirstHint = !localStorage.getItem('ft_hint_seen');
        let firstHintTarget = null;

        Story.chapters.forEach((ch, chIdx) => {
            const chUnlocked = Levels.isChapterUnlocked(chIdx);
            const route = this._chapterRoutes[chIdx] || { prefix: 'G', from: '—', to: '—', mile: '' };

            // 站台牌
            const sign = document.createElement('div');
            sign.className = 'platform-sign' + (chUnlocked ? '' : ' locked');
            sign.innerHTML = `
                ${this._chapterSceneSVG(chIdx)}
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

            // 章节段（站台牌 + 车票排）整体 hover 切换背景
            const onEnter = () => activateBg(chIdx);
            sign.addEventListener('mouseenter', onEnter);
            row.addEventListener('mouseenter', onEnter);
            sign.addEventListener('mouseleave', resetBg);
            row.addEventListener('mouseleave', resetBg);

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
                        ${unlocked ? this._ticketStarsHTML(completed, Levels.getStars(chIdx, lvIdx)) : ''}
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

        this.updateMementoHUD();
    },

    // HUD 纪念物状态：未拿=空心提示，已拿=点亮。仅有纪念物的关显示。
    updateMementoHUD() {
        const el = document.getElementById('hud-memento');
        if (!el) return;
        const c = Levels.currentChapter, l = Levels.currentLevel;
        const hasItem = (typeof Collection !== 'undefined') && Collection.hasItem(c, l);
        if (!hasItem) { el.style.display = 'none'; return; }
        el.style.display = 'inline';
        const got = Player.gotMemento;
        const owned = Collection.isCollected(c, l);
        if (got) {
            el.textContent = '纪念物 ✦';
            el.className = 'memento-on';
        } else {
            el.textContent = owned ? '纪念物 ✓' : '纪念物 ○';
            el.className = owned ? 'memento-owned' : 'memento-off';
        }
    },

    onMementoPickup() {
        this.updateMementoHUD();
        this.showFoldHint('✦ 拾得纪念物');
    },

    updateFoldCount() {
        const el = document.getElementById('hud-folds');
        if (!el) return;
        const level = Levels.getCurrentLevel();
        const par = level.par || 1;
        const folds = Fold.history.length;
        // 有萤火的关，HUD 同时显示萤火进度，提示玩家这关要顺路收集
        const countFlies = g => g.flat().filter(t => t === Grid.COLLECTIBLE).length;
        const totalFlies = countFlies(level.front) + countFlies(level.back);
        if (totalFlies > 0) {
            el.textContent = `折叠: ${folds}/${par}　🔥 ${Player.collected}/${totalFlies}`;
        } else {
            el.textContent = `折叠: ${folds} / ${par}`;
        }
    },

    showFoldHint(text) {
        const el = document.getElementById('fold-indicator');
        el.textContent = text;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 2000);
    }
};
