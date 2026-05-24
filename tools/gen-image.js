// Generate one image via vectorengine.cn endpoint and save to disk.
// Usage: node tools/gen-image.js <model> <size> <output-path> <prompt-file>
const fs = require('fs');
const https = require('https');
const path = require('path');

const KEY = 'sk-mzUFOloKzlIEhePZiwx2ODRQKqUbE8DIosO6rIirr1RDadOg';
const HOST = 'api.vectorengine.cn';

const [model, size, outPath, promptFile] = process.argv.slice(2);
if (!model || !size || !outPath || !promptFile) {
  console.error('usage: node tools/gen-image.js <model> <size> <output-path> <prompt-file>');
  process.exit(1);
}

const prompt = fs.readFileSync(promptFile, 'utf8').trim();
console.log('[gen] model:', model, 'size:', size);
console.log('[gen] prompt length:', prompt.length);

const body = JSON.stringify({
  model,
  prompt,
  size,
  n: 1,
  response_format: 'url'
});

const req = https.request({
  host: HOST,
  path: '/v1/images/generations',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('[gen] status:', res.statusCode);
    let json;
    try { json = JSON.parse(data); } catch (e) {
      console.error('[gen] non-JSON response:', data.slice(0, 500));
      process.exit(1);
    }
    if (res.statusCode !== 200) {
      console.error('[gen] error:', JSON.stringify(json, null, 2).slice(0, 1000));
      process.exit(1);
    }
    const item = json.data && json.data[0];
    if (!item) { console.error('[gen] no data in response:', data.slice(0,500)); process.exit(1); }
    const url = item.url;
    const b64 = item.b64_json;
    if (b64) {
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      console.log('[gen] saved (b64) ->', outPath);
      return;
    }
    if (!url) { console.error('[gen] no url/b64 in item:', item); process.exit(1); }
    console.log('[gen] downloading from', url);
    https.get(url, dl => {
      const chunks = [];
      dl.on('data', c => chunks.push(c));
      dl.on('end', () => {
        fs.writeFileSync(outPath, Buffer.concat(chunks));
        console.log('[gen] saved ->', outPath, '(', fs.statSync(outPath).size, 'bytes )');
      });
    }).on('error', e => { console.error('[gen] download error:', e.message); process.exit(1); });
  });
});
req.on('error', e => { console.error('[gen] request error:', e.message); process.exit(1); });
req.write(body);
req.end();
