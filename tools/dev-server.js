const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.ogg':'audio/ogg','.json':'application/json','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data)=>{
    if (err) { res.writeHead(404); return res.end('not found: '+p); }
    res.writeHead(200,{'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8765, '127.0.0.1', ()=>console.log('http://127.0.0.1:8765/'));
