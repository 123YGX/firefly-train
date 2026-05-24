# 萤火与列车 - UI设计改进方案

## 一、图片资源需求清单

### 1. 关卡背景图 (折纸纹理风格)
**用途**: 替代程序化纹理,作为游戏网格背景

**规格**: 正方形,建议1024x1024px

**风格要求**:
- 暖色调纸质纹理(米黄、奶油色)
- 带有细微的折痕和阴影
- 抽象几何图案
- 干净简洁,不干扰游戏视觉

**生成提示词**:
```
A minimalist paper texture background with subtle fold lines and creases, 
warm beige and cream tones, abstract geometric patterns suggesting a folded 
paper surface, soft shadows along fold edges, clean and simple design 
suitable as a puzzle game background, top-down view, square format, 
gentle lighting
```

**需要数量**: 
- 每关2张(front/back),优先生成第1章3关 = 6张
- 文件命名: `ch1_lv1_front.png`, `ch1_lv1_back.png` 等

---

### 2. 主菜单背景图
**用途**: 游戏启动主界面背景

**规格**: 16:9,建议1920x1080px

**风格要求**:
- 夜晚的火车站月台场景
- 复古暖黄色灯光
- 萤火虫在空中飞舞(散景效果)
- 远处山峦剪影
- 深蓝夜空带星星
- **中央区域留白**供标题文字显示
- 怀旧、宁静的氛围

**生成提示词**:
```
A dreamy night scene at a train station platform, warm yellow lights from 
vintage lamps, fireflies glowing in the air like tiny stars, soft bokeh 
effect, empty platform with wooden benches, distant mountains silhouette, 
deep blue night sky with stars, nostalgic and peaceful atmosphere, leave 
central area empty for title text overlay, cinematic composition, warm 
color palette with golden and blue tones, 16:9 aspect ratio
```

**文件命名**: `menu_background.jpg`

---

### 3. 章节卡片插图 (6张)
**用途**: 章节选择界面的主题插图

**规格**: 横向矩形,建议800x450px (16:9)

**各章主题**:

#### 第1章 - 期末与决心
- 场景: 深夜宿舍,书桌台灯,窗外夜景
- 情绪: 孤独但坚定
- 提示词: `Late night dorm room, desk lamp glowing, books scattered, window showing night cityscape, lonely but determined atmosphere, warm interior lighting, cool exterior tones, illustration style`

#### 第2章 - 初到山城
- 场景: 重庆雾气中的城市轮廓,轻轨穿行
- 情绪: 新奇、期待
- 提示词: `Chongqing city silhouette in morning mist, light rail train passing through, layered mountains and buildings, soft fog, sense of arrival and anticipation, blue and grey tones with warm accents`

#### 第3章 - 烟火与孤独
- 场景: 长江索道车厢内,夕阳透过窗户
- 情绪: 温暖中的孤独感
- 提示词: `Inside cable car crossing Yangtze River, sunset light streaming through windows, river view below, warm golden hour lighting, solitary figure silhouette, bittersweet mood`

#### 第4章 - 三峡豁然
- 场景: 三峡山水,观景台视角
- 情绪: 开阔、豁然开朗
- 提示词: `Three Gorges landscape, viewing platform perspective, vast river valley, layered mountains in mist, sense of openness and clarity, majestic natural scenery, blue-green color palette`

#### 第5章 - 南北山河
- 场景: 火车车窗外,南北景色过渡
- 情绪: 旅途中的思考
- 提示词: `View from train window, landscape transitioning from southern green mountains to northern snowy plains, motion blur effect, contemplative journey mood, split composition showing contrast`

#### 第6章 - 萤火归途
- 场景: 海边夕阳,萤火虫飞向大海
- 情绪: 温暖、圆满、成长
- 提示词: `Seaside sunset, fireflies flying towards the ocean, warm orange and pink sky, peaceful homecoming atmosphere, sense of completion and growth, hopeful mood`

**文件命名**: `ch1_card.jpg` ~ `ch6_card.jpg`

---

### 4. UI图标素材
**用途**: 按钮、装饰元素

**需要的图标**:
- 撤销按钮 (↩)
- 重置按钮 (↺)
- 提示按钮 (?)
- 退出按钮 (✕)
- 静音/音乐按钮 (♪)
- 萤火虫装饰图标
- 折纸装饰图标

**风格**: 线条简洁,暖色调,与游戏主题一致

**规格**: SVG或PNG,建议64x64px

---

### 5. 角色立绘
**用途**: 故事界面的角色展示

**需要场景**:
- 犹豫/思考状态
- 开心/期待状态
- 平静/释然状态

**风格**: 简约插画风格,与游戏整体美术风格一致

**规格**: 竖向,建议600x800px

---

## 二、程序化UI改进方案

如果暂时无法生成图片,可以先优化程序化渲染:

### 1. 主菜单动画增强
- 添加萤火虫粒子动画(已有Particles系统)
- 标题文字发光效果
- 按钮悬停动画优化

### 2. 章节选择界面优化
- 章节卡片添加渐变背景
- 关卡按钮添加脉动动画
- 解锁动画效果

### 3. 游戏内HUD优化
- 折叠次数显示添加进度条
- 按钮图标优化(使用Unicode符号或自绘)
- 信息面板半透明玻璃态效果增强

### 4. 过渡动画
- 界面切换添加淡入淡出
- 关卡完成添加庆祝动画
- 页面转场效果

---

## 三、实施优先级

### 阶段1 (立即可做 - 程序化优化)
1. 优化主菜单萤火虫粒子效果
2. 改进按钮悬停动画
3. 添加界面过渡动画

### 阶段2 (需要图片资源)
1. 添加主菜单背景图
2. 为第1章3关添加折纸纹理背景

### 阶段3 (完整视觉升级)
1. 添加所有章节卡片插图
2. 完成所有关卡背景图
3. 添加角色立绘到故事界面

---

## 四、图片生成工具推荐

1. **Midjourney** - 最适合插画风格
2. **Stable Diffusion** - 本地运行,免费
3. **DALL-E 3** - 文字理解能力强
4. **Leonardo.ai** - 游戏美术专用

---

## 五、代码集成说明

图片生成后,放置位置:
- 关卡背景: `assets/levels/`
- 主菜单背景: `assets/backgrounds/menu_background.jpg`
- 章节卡片: `assets/chapters/`
- UI图标: `assets/ui/`
- 角色立绘: `assets/character/portraits/`

代码已经准备好加载关卡背景图,只需将图片放入对应目录即可。
