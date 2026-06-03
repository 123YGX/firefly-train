// 旅途纪念册：每关一件纪念物，走过收集点即获得。不影响过关/星级，纯收藏。
// 持久化在 localStorage 的 ft_collection（已收集的 "章-关" key 集合）。
const Collection = {
    collected: new Set(),

    // 18 件纪念物：章(0基)-关(0基) → { name, desc, icon }
    // icon = assets/collection/ 下文件名（无扩展名，运行时优先 .jpg）
    items: {
        '0-0': { name: '期末成绩单', desc: '78分。努力不一定有结果，但故事从这里开始。', icon: 'c0_0' },
        '0-1': { name: '旅行攻略', desc: '搜索框里的"重庆单人旅行"——心底冒出的新希望。', icon: 'c0_1' },
        '0-2': { name: '一张机票', desc: '手指悬在"确认支付"上方，按下去的那一刻全是期待。', icon: 'c0_2' },

        '1-0': { name: '登机牌', desc: '第一次独自坐飞机，飞向陌生的山城。', icon: 'c1_0' },
        '1-1': { name: '地铁票', desc: '错综复杂的换乘通道，我终于找到了出口。', icon: 'c1_1' },
        '1-2': { name: '解放碑明信片', desc: '霓虹映在湿漉漉的地面，一个人也格外自在。', icon: 'c1_2' },

        '2-0': { name: '绿豆汤的碗', desc: '"娃儿，一个人来重庆耍啊？好勇敢。"', icon: 'c2_0' },
        '2-1': { name: '长江索道票根', desc: '夕阳把车厢镀成金色，我把票根贴进了笔记本。', icon: 'c2_1' },
        '2-2': { name: '火锅店小票', desc: '"来都来了，多吃点。"与独自的旅程悄悄和解。', icon: 'c2_2' },

        '3-0': { name: '三峡晨景照', desc: '清晨的山雾萦绕墨绿山峦——这车票真值。', icon: 'c3_0' },
        '3-1': { name: '观景台门票', desc: '江风吹散所有浮躁，只觉豁然开朗。', icon: 'c3_1' },
        '3-2': { name: '栈道徽章', desc: '走过最窄的栈道回头望，原来已走了这么远。', icon: 'c3_2' },

        '4-0': { name: '一个橙子', desc: '"自己家种的，甜！"陌生大叔塞来的善意。', icon: 'c4_0' },
        '4-1': { name: '南北分界照', desc: '一趟火车，看尽南北山河的不同模样。', icon: 'c4_1' },
        '4-2': { name: '一盒饺子', desc: '深夜硬座，对面阿姨递来的温暖。', icon: 'c4_2' },

        '5-0': { name: '一颗糖果', desc: '"大哥哥，你一个人坐车不害怕吗？"', icon: 'c5_0' },
        '5-1': { name: '家门钥匙', desc: '推开门，暖黄的灯光和满桌家常菜。"我回来了。"', icon: 'c5_1' },
        '5-2': { name: '海边贝壳', desc: '一个人也可以很好——学会了和自己相处。', icon: 'c5_2' }
    },

    load() {
        try {
            const raw = localStorage.getItem('ft_collection');
            if (raw) this.collected = new Set(JSON.parse(raw));
        } catch (e) {}
    },

    save() {
        try {
            localStorage.setItem('ft_collection', JSON.stringify([...this.collected]));
        } catch (e) {}
    },

    key(chapterIdx, levelIdx) {
        return `${chapterIdx}-${levelIdx}`;
    },

    // 该关是否布置了纪念物（有元数据即视为有）
    hasItem(chapterIdx, levelIdx) {
        return !!this.items[this.key(chapterIdx, levelIdx)];
    },

    getItem(chapterIdx, levelIdx) {
        return this.items[this.key(chapterIdx, levelIdx)] || null;
    },

    isCollected(chapterIdx, levelIdx) {
        return this.collected.has(this.key(chapterIdx, levelIdx));
    },

    collect(chapterIdx, levelIdx) {
        const k = this.key(chapterIdx, levelIdx);
        if (!this.items[k] || this.collected.has(k)) return false;
        this.collected.add(k);
        this.save();
        return true;
    },

    // 返回 18 件的有序列表（按章-关），含收集状态，供收集室渲染
    getAll() {
        const out = [];
        for (let c = 0; c < 6; c++) {
            for (let l = 0; l < 3; l++) {
                const k = this.key(c, l);
                const item = this.items[k];
                if (!item) continue;
                out.push({
                    chapter: c, level: l,
                    name: item.name, desc: item.desc, icon: item.icon,
                    collected: this.collected.has(k)
                });
            }
        }
        return out;
    },

    count() {
        return this.collected.size;
    },

    total() {
        return Object.keys(this.items).length;
    }
};
