// 贴纸抠白底：把白底贴纸图（gpt-image-2 出的 JPEG）转成透明背景 PNG，无白边。
// 做法：从四边做 BFS 洪水填充，凡是与边缘连通的"近白"像素一律置透明（连模切白边一起吃掉），
// 物件的粗黑描边会阻断洪水、保住内部填色；再对残留边缘的白做一圈羽化，最后裁到紧致 bbox。
// 用法: node tools/sticker-cutout.js <in.jpg|png> <out.png> [maxSize]
const fs = require('fs');
const sharp = require('sharp');

const [inPath, outPath, maxSizeArg, outlineArg] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: node tools/sticker-cutout.js <in> <out.png> [maxSize]');
  process.exit(1);
}
const MAX_SIZE = parseInt(maxSizeArg || '512', 10);

(async () => {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels; // ch=4
  const px = data; // RGBA

  const at = (p) => p * ch;
  const isBg = (p) => {
    const i = at(p);
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    return cmin >= 225 && (cmax - cmin) <= 18; // 近白且低饱和
  };

  const visited = new Uint8Array(W * H);
  const stack = [];
  const pushIf = (p) => { if (!visited[p] && isBg(p)) { visited[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { pushIf(x); pushIf((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { pushIf(y * W); pushIf(y * W + (W - 1)); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p - x) / W;
    if (x > 0)     pushIf(p - 1);
    if (x < W - 1) pushIf(p + 1);
    if (y > 0)     pushIf(p - W);
    if (y < H - 1) pushIf(p + W);
  }
  for (let p = 0; p < W * H; p++) if (visited[p]) px[at(p) + 3] = 0;

  // 边缘羽化：贴近透明区的残留近白半透明化，消除硬白边/光晕
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = px[at(p) + 3];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (alpha[p] === 0) continue;
      const i = at(p);
      const cmin = Math.min(px[i], px[i + 1], px[i + 2]);
      if (cmin < 200) continue;
      const nbrTransparent =
        alpha[p - 1] === 0 || alpha[p + 1] === 0 ||
        alpha[p - W] === 0 || alpha[p + W] === 0;
      if (nbrTransparent) {
        const t = 1 - Math.min(1, (cmin - 200) / 40);
        px[i + 3] = Math.round(alpha[p] * t);
      }
    }
  }

  // 程序化黑描边（die-cut 贴纸风）：在物件不透明区外圈套一层黑边。
  // 既统一所有贴纸为黑边风，又盖掉 AI 出图给卡片/票类带的白色模切边。
  // 半径随图尺寸自适应；命令行第 4 参数可覆盖（0=不描边）。
  const ow = Math.max(W, H);
  const radius = outlineArg !== undefined ? parseInt(outlineArg, 10)
    : Math.max(3, Math.round(ow * 0.012));
  if (radius > 0) {
    // 当前 alpha 快照（含羽化结果）
    const a0 = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) a0[p] = px[at(p) + 3];
    // 距离变换近似：从所有不透明像素向外做 BFS，最多扩散 radius 步
    const dist = new Int16Array(W * H).fill(-1);
    let frontier = [];
    for (let p = 0; p < W * H; p++) {
      if (a0[p] > 40) { dist[p] = 0; frontier.push(p); }
    }
    for (let d = 0; d < radius && frontier.length; d++) {
      const next = [];
      for (const p of frontier) {
        const x = p % W, y = (p - x) / W;
        const nbrs = [];
        if (x > 0) nbrs.push(p - 1);
        if (x < W - 1) nbrs.push(p + 1);
        if (y > 0) nbrs.push(p - W);
        if (y < H - 1) nbrs.push(p + W);
        for (const n of nbrs) {
          if (dist[n] === -1) { dist[n] = d + 1; next.push(n); }
        }
      }
      frontier = next;
    }
    // dist 1..radius 且原本透明 → 涂黑（外侧描边环）。
    // 同时把紧贴轮廓的「近白」不透明像素也涂黑（dist 0 区里靠边那圈），
    // 吃掉 AI 给卡片/票类带的白色模切边，使黑边直接挨着彩色内容。
    const innerBite = Math.max(2, Math.round(radius * 0.7));
    // 标记哪些不透明像素离透明区很近（距离边界 <= innerBite）
    const edgeDist = new Int16Array(W * H).fill(-1);
    let ef = [];
    for (let p = 0; p < W * H; p++) if (a0[p] <= 40) { edgeDist[p] = 0; ef.push(p); }
    for (let d = 0; d < innerBite && ef.length; d++) {
      const next = [];
      for (const p of ef) {
        const x = p % W, y = (p - x) / W;
        const nbrs = [];
        if (x > 0) nbrs.push(p - 1);
        if (x < W - 1) nbrs.push(p + 1);
        if (y > 0) nbrs.push(p - W);
        if (y < H - 1) nbrs.push(p + W);
        for (const n of nbrs) if (edgeDist[n] === -1) { edgeDist[n] = d + 1; next.push(n); }
      }
      ef = next;
    }
    for (let p = 0; p < W * H; p++) {
      const i = at(p);
      // 外侧透明环 → 黑
      if (dist[p] >= 1 && dist[p] <= radius && a0[p] <= 40) {
        px[i] = 20; px[i + 1] = 20; px[i + 2] = 20; px[i + 3] = 255;
        continue;
      }
      // 内侧贴边的近白像素 → 黑（吃掉白模切边），彩色内容不动
      if (edgeDist[p] >= 1 && edgeDist[p] <= innerBite && a0[p] > 40) {
        const cmin = Math.min(px[i], px[i + 1], px[i + 2]);
        const cmax = Math.max(px[i], px[i + 1], px[i + 2]);
        if (cmin >= 200 && (cmax - cmin) <= 30) {
          px[i] = 20; px[i + 1] = 20; px[i + 2] = 20; px[i + 3] = 255;
        }
      }
    }
  }

  // 紧致 bbox 裁剪
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[at(y * W + x) + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) { console.error('[cutout] empty after cutout, abort'); process.exit(1); }
  const PAD = 4;
  minX = Math.max(0, minX - PAD); minY = Math.max(0, minY - PAD);
  maxX = Math.min(W - 1, maxX + PAD); maxY = Math.min(H - 1, maxY + PAD);
  const cw = maxX - minX + 1, cropH = maxY - minY + 1;

  let pipe = sharp(px, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: cropH });

  const longSide = Math.max(cw, cropH);
  if (longSide > MAX_SIZE) {
    const scale = MAX_SIZE / longSide;
    pipe = pipe.resize(Math.round(cw * scale), Math.round(cropH * scale), { fit: 'inside' });
  }
  await pipe.png({ compressionLevel: 9 }).toFile(outPath);
  const opaque = px.reduce((n, _, idx) => (idx % 4 === 3 && px[idx] > 8 ? n + 1 : n), 0);
  console.log(`[cutout] ${inPath} -> ${outPath}  crop ${cw}x${cropH} (from ${W}x${H}), opaque px ~${opaque}`);
})().catch(e => { console.error('[cutout] error:', e.message); process.exit(1); });
