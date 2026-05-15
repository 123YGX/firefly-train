const Tutorial = {
    completed: new Set(),

    tutorials: {
        '0-0': {
            title: '欢迎来到折纸世界',
            steps: [
                {
                    text: '这是一张"纸"。绿色圆点是你的起点，橙色星星是终点。\n你需要让起点和终点之间出现一条蓝色的"路径"。',
                    highlight: 'grid'
                },
                {
                    text: '当前路径不连通——起点和终点之间被墙隔开了。\n但纸的"反面"藏着隐藏路径！',
                    highlight: 'grid'
                },
                {
                    text: '把鼠标移到网格之间的【线】上，会出现一条橙色虚线。\n这就是折痕——点击就能沿这条线折叠纸张。',
                    highlight: 'fold'
                },
                {
                    text: '折叠时，你点击的【那一侧】的纸会翻过去，盖到另一侧。\n背面的隐藏路径会显现出来。',
                    highlight: 'fold'
                },
                {
                    text: '提示：本关需要把上半部分向下折，让背面的路径连接起点和终点。\n试着点击中间那条横线的【上半部分】吧！',
                    highlight: 'fold'
                }
            ]
        },
        '0-1': {
            title: '换个方向',
            steps: [
                {
                    text: '这一关需要【垂直方向】的折叠。\n把鼠标移到竖直的网格线上，点击右侧把它折向左侧。',
                    highlight: 'fold'
                }
            ]
        },
        '1-0': {
            title: '组合折叠',
            steps: [
                {
                    text: '从这一关开始，可能需要【多次折叠】才能连通路径。\n如果折错了，点左上角 ↩ 撤销，或 ↺ 重置整关。',
                    highlight: 'hud'
                }
            ]
        },
        '2-0': {
            title: '更复杂的纸张',
            steps: [
                {
                    text: '关卡变大了，背面的路径也更复杂。\n仔细观察起点和终点的位置，规划折叠顺序。',
                    highlight: 'grid'
                }
            ]
        },
        '3-0': {
            title: '宽阔的折叠',
            steps: [
                {
                    text: '8x8 的大纸张登场了。同样的规则——\n点击折痕，让背面路径连通起点与终点。',
                    highlight: 'grid'
                }
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
