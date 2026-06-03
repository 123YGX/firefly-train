// 一次性校验脚本：对每关搜索折叠序列，确认
//  (a) 关卡可解（玩家起点→终点连通）
//  (b) 存在折叠序列使纪念物(14)可被「玩家→纪念物→终点」串上
// 用法: node tools/verify-mementos.js
//
// 关键：过关判定对齐游戏语义——以「玩家当前位置」为起点（折叠会重映射玩家坐标，
// 见 fold.js newPlayerX/Y），而非以网格里的 START 瓦片为起点。若解法把始点半幅
// 折走且始点格背面为空，START 瓦片会从网格消失，但玩家本人仍在原地照常可走。
const fs = require('fs');
const path = require('path');

let src = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'levels.js'), 'utf8');
src = src.replace(/const\s+Levels\s*=/, 'globalThis.Levels =');
eval(src);
const DATA = globalThis.Levels.data;

const EMPTY=0, START=3, END=4, MEMENTO=14;
const walkable = t => (t===1||t===3||t===4||t===6||t===7||t===8||t===9||t===10||t===11||t===12||t===13||t===14);
const mirrorH = t => t===10?12 : t===12?10 : t;
const mirrorV = t => t===11?13 : t===13?11 : t;
const clone = g => g.map(r=>[...r]);

// 在 {display, back, w, h, px, py} 上折叠（含玩家坐标重映射），返回新状态
function fold(st, edge, side){
    const oldW=st.w, oldH=st.h, oldD=st.display, oldB=st.back;
    let newW, newH, nD=[], nB=[], npx=st.px, npy=st.py;
    if (edge.type==='v'){
        const col=edge.index;
        if (side==='left'){
            newW=oldW-col; newH=oldH;
            for(let y=0;y<newH;y++){ nD[y]=[]; nB[y]=[];
                for(let nx=0;nx<newW;nx++){ nD[y][nx]=oldD[y][nx+col]; nB[y][nx]=oldB[y][nx+col]; }
                for(let lx=0;lx<col;lx++){ const nx=col-lx-1; if(nx>=0&&nx<newW){ const bt=oldB[y][lx]; if(bt!==EMPTY) nD[y][nx]=mirrorH(bt); } }
            }
            npx = st.px<col ? (col-st.px-1) : (st.px-col);
        } else {
            newW=col; newH=oldH;
            for(let y=0;y<newH;y++){ nD[y]=[]; nB[y]=[];
                for(let nx=0;nx<newW;nx++){ nD[y][nx]=oldD[y][nx]; nB[y][nx]=oldB[y][nx]; }
                for(let rx=col;rx<oldW;rx++){ const nx=2*col-rx-1; if(nx>=0&&nx<newW){ const bt=oldB[y][rx]; if(bt!==EMPTY) nD[y][nx]=mirrorH(bt); } }
            }
            npx = st.px>=col ? (2*col-st.px-1) : st.px;
        }
    } else {
        const row=edge.index;
        if (side==='top'){
            newW=oldW; newH=oldH-row;
            for(let ny=0;ny<newH;ny++){ nD[ny]=[]; nB[ny]=[]; const oy=ny+row;
                for(let x=0;x<newW;x++){ nD[ny][x]=oldD[oy][x]; nB[ny][x]=oldB[oy][x]; } }
            for(let ly=0;ly<row;ly++){ const ny=row-ly-1; if(ny>=0&&ny<newH){
                for(let x=0;x<newW;x++){ const bt=oldB[ly][x]; if(bt!==EMPTY) nD[ny][x]=mirrorV(bt); } } }
            npy = st.py<row ? (row-st.py-1) : (st.py-row);
        } else {
            newW=oldW; newH=row;
            for(let ny=0;ny<newH;ny++){ nD[ny]=[]; nB[ny]=[];
                for(let x=0;x<newW;x++){ nD[ny][x]=oldD[ny][x]; nB[ny][x]=oldB[ny][x]; } }
            for(let ry=row;ry<oldH;ry++){ const ny=2*row-ry-1; if(ny>=0&&ny<newH){
                for(let x=0;x<newW;x++){ const bt=oldB[ry][x]; if(bt!==EMPTY) nD[ny][x]=mirrorV(bt); } } }
            npy = st.py>=row ? (2*row-st.py-1) : st.py;
        }
    }
    npx = Math.max(0, Math.min(newW-1, npx));
    npy = Math.max(0, Math.min(newH-1, npy));
    return { display:nD, back:nB, w:newW, h:newH, px:npx, py:npy };
}
module.exports = { fold };

if (require.main !== module) {
    return; // 被 require 时只导出 fold
}

function findTile(g, t){
    for(let y=0;y<g.length;y++) for(let x=0;x<g[y].length;x++) if(g[y][x]===t) return {x,y};
    return null;
}
function findPair(g, t){ return findTile(g, t===7?8:7); }

// findPath 语义：from→to 是否连通（含传送门、单向）
function reach(disp, from, to){
    if(!from||!to) return false;
    const h=disp.length, w=disp[0].length, key=(x,y)=>y*w+x;
    const seen=new Set([key(from.x,from.y)]), q=[from]; let hd=0;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
    const gate=(t,dx,dy)=> t===10?(dx===1&&dy===0):t===11?(dx===0&&dy===1):t===12?(dx===-1&&dy===0):t===13?(dx===0&&dy===-1):true;
    while(hd<q.length){
        const c=q[hd++];
        if(c.x===to.x&&c.y===to.y) return true;
        const ct=disp[c.y][c.x];
        if(ct===7||ct===8){ const e=findPair(disp,ct); if(e&&!seen.has(key(e.x,e.y))){ seen.add(key(e.x,e.y)); q.push(e); } }
        for(const[dx,dy]of dirs){ const nx=c.x+dx, ny=c.y+dy;
            if(nx<0||ny<0||nx>=w||ny>=h) continue;
            if(seen.has(key(nx,ny))) continue;
            if(!walkable(disp[ny][nx])) continue;
            if(!gate(ct,dx,dy)||!gate(disp[ny][nx],dx,dy)) continue;
            seen.add(key(nx,ny)); q.push({x:nx,y:ny});
        }
    }
    return false;
}

function allEdges(st){
    const e=[];
    for(let i=1;i<st.w;i++){ e.push({type:'v',index:i,side:'left'}); e.push({type:'v',index:i,side:'right'}); }
    for(let i=1;i<st.h;i++){ e.push({type:'h',index:i,side:'top'}); e.push({type:'h',index:i,side:'bottom'}); }
    return e;
}

// DFS ≤maxFold 次折叠，回调每个终局
function search(st, maxFold, cb){
    cb(st);
    if(maxFold<=0) return;
    for(const e of allEdges(st)){
        const ns=fold(st,e,e.side);
        if(ns&&ns.w>0&&ns.h>0) search(ns, maxFold-1, cb);
    }
}

function analyze(level, maxFold){
    const s0 = findTile(level.front, START);
    const st0 = { display:clone(level.front), back:clone(level.back), w:level.width, h:level.height, px:s0.x, py:s0.y };
    let solvable=false, mementoOk=false, hasMemento=false;
    if(findTile(level.front,MEMENTO)||findTile(level.back,MEMENTO)) hasMemento=true;
    search(st0, maxFold, (st)=>{
        const player={x:st.px,y:st.py};
        const en=findTile(st.display,END), m=findTile(st.display,MEMENTO);
        if(en && reach(st.display,player,en)) solvable=true;
        if(en && m && reach(st.display,player,m) && reach(st.display,m,en)) mementoOk=true;
    });
    return { solvable, hasMemento, mementoOk };
}

let fail=0;
for(let c=0;c<DATA.length;c++){
    for(let l=0;l<DATA[c].length;l++){
        const lvl=DATA[c][l];
        const maxFold=Math.min((lvl.par||1)+1, 4);
        const r=analyze(lvl, maxFold);
        const tag = !r.solvable ? 'UNSOLVABLE!!' :
            (!r.hasMemento ? 'no-memento' : (r.mementoOk ? 'OK memento✓' : 'MEMENTO-UNREACHABLE!!'));
        if(!r.solvable || (r.hasMemento && !r.mementoOk)) fail++;
        console.log(`ch${c+1}-${l+1} par${lvl.par||1} (search≤${maxFold}): ${tag}`);
    }
}
console.log(fail===0 ? '\nALL GOOD' : `\n${fail} PROBLEM(S)`);

