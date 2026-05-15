const Tutorial = {
    completed: new Set(),

    tutorials: {
        '0-0': {
            title: '欢迎来到折纸世界',
            steps: [
                { text: '这是一张"纸"。绿色圆点是起点，橙色星星是终点。\n你需要让它们之间出现一条蓝色的"路径"。', highlight: 'grid' },
                { text: '当前路径不连通——被墙隔开了。\n但纸的"反面"藏着隐藏路径！', highlight: 'grid' },
                { text: '把鼠标移到网格线上，会出现橙色虚线。\n点击就能沿这条线折叠纸张。', highlight: 'fold' },
                { text: '折叠时，你点击的【那一侧】会翻过去盖到另一侧。\n背面的隐藏路径会显现出来。', highlight: 'fold' },
                { text: '本关：找到起点上方的横线，点击横线【上方】区域折叠！', highlight: 'fold' }
            ]
        },
        '0-1': {
            title: '竖向折叠',
            steps: [
                { text: '这一关需要【竖直方向】的折叠。\n找到右侧的竖线，点击竖线【右侧】把它折过来。', highlight: 'fold' }
            ]
        },
        '0-2': {
            title: '向下折叠',
            steps: [
                { text: '试试从【下方】折叠。\n点击横线的【下方】区域，把下半部分翻上去。', highlight: 'fold' }
            ]
        },
        '1-0': {
            title: '多方向探索',
            steps: [
                { text: '从这一关开始，折叠位置不再那么明显。\n仔细观察起点和终点的位置，选择正确的折线。\n折错了可以点 ↩ 撤销，或 ↺ 重置。', highlight: 'hud' }
            ]
        },
        '2-0': {
            title: '萤火收集',
            steps: [
                { text: '路径上出现了闪烁的【萤火虫】！\n经过它就能收集。试着收集所有萤火吧。', highlight: 'grid' }
            ]
        },
        '3-0': {
            title: '传送门',
            steps: [
                { text: '蓝色漩涡是【传送入口】，橙色漩涡是【传送出口】。\n走到入口会瞬间传送到出口位置。', highlight: 'grid' },
                { text: '有时传送门藏在纸的背面——需要折叠才能显现。', highlight: 'fold' }
            ]
        },
        '4-0': {
            title: '脆弱路径',
            steps: [
                { text: '带裂纹的路径只能走【一次】！\n走过之后它会碎裂变成墙壁，无法回头。', highlight: 'grid' }
            ]
        },
        '5-0': {
            title: '单向路径',
            steps: [
                { text: '带箭头的路径只能沿【箭头方向】通过。\n规划路线时要注意方向限制！', highlight: 'grid' }
            ]
        }
    },

    shouldShow(chapterIdx, levelIdx) {
        const key = `${chapterIdx}-${levelIdx}`;
        return this.tutorials[key] && !this.completed.has(key);
    },

    get(chapterIdx, levelIdx) {
        return this.tutorials[`${chapterIdx}-${levelIdx}`];
    },

    markComplete(chapterIdx, levelIdx) {
        this.completed.add(`${chapterIdx}-${levelIdx}`);
    }
};
