const fs=require('fs'); const p1='/tmp/vectorengine-models.json'; const p2='C:/Users/Administrator/AppData/Local/Temp/vectorengine-models.json';
const path = fs.existsSync(p1)?p1:p2;
const d = JSON.parse(fs.readFileSync(path,'utf8'));
const all = d.data || [];
console.log('total:', all.length);
const kw = ['image','draw','dalle','dall-e','flux','sdxl','stable','midj','imagen','sora','gemini-2.5-flash-image','绘图','画','图像','文生图','生图','vision'];
const imgs = all.filter(m => {
  const txt = (m.id+'|'+(m.description||'')+'|'+(m.tags||'')+'|'+(m.model_type||'')).toLowerCase();
  return kw.some(k => txt.includes(k.toLowerCase()));
});
console.log('image-related:', imgs.length);
imgs.forEach(m => console.log('-', m.id, '|', m.model_type||'?', '|', (m.description||'').slice(0,90)));
