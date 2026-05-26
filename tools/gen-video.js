// Generate one short video via vectorengine.cn endpoint and save to disk.
// Usage: node tools/gen-video.js <model> <size> <duration> <output-path> <prompt-file>
const fs = require('fs');
const https = require('https');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}
const env = loadEnv();
const KEY = env.VECTORENGINE_API_KEY || process.env.VECTORENGINE_API_KEY;
const HOST = 'api.vectorengine.cn';
if (!KEY) { console.error('[gen] missing VECTORENGINE_API_KEY in .env'); process.exit(1); }

const [model, size, durationStr, outPath, promptFile] = process.argv.slice(2);
if (!model || !size || !durationStr || !outPath || !promptFile) {
  console.error('usage: node tools/gen-video.js <model> <size> <duration_seconds> <output-path> <prompt-file>');
  process.exit(1);
}
const duration = parseInt(durationStr, 10);
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
console.log('[vgen] model:', model, 'size:', size, 'duration:', duration, 's, prompt len:', prompt.length);

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request({ host: HOST, path: urlPath, method, headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, dl => {
      if (dl.statusCode >= 300 && dl.statusCode < 400 && dl.headers.location) {
        return download(dl.headers.location, dest).then(resolve, reject);
      }
      const chunks = [];
      dl.on('data', c => chunks.push(c));
      dl.on('end', () => {
        fs.writeFileSync(dest, Buffer.concat(chunks));
        resolve(fs.statSync(dest).size);
      });
    }).on('error', reject);
  });
}

async function main() {
  const body = JSON.stringify({ model, prompt, size, n: 1, seconds: duration, duration });
  const endpoints = ['/v1/videos', '/v1/video/generations', '/v1/videos/generations'];
  let r = null, used = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    for (const ep of endpoints) {
      r = await request('POST', ep, body);
      console.log('[vgen] POST', ep, 'attempt', attempt, '→', r.status);
      if (r.status !== 404 && r.status !== 429) { used = ep; break; }
      if (r.status === 429) used = ep;
    }
    if (r && r.status >= 200 && r.status < 300) break;
    if (attempt < 6) {
      const wait = 8000 + attempt * 4000;
      console.log('[vgen] all 429/404, waiting', wait, 'ms before retry');
      await new Promise(res => setTimeout(res, wait));
    }
  }
  console.log('[vgen] final endpoint:', used, 'status:', r.status);
  let json;
  try { json = JSON.parse(r.body); } catch (e) {
    console.error('[vgen] non-JSON response:', r.body.slice(0, 800));
    process.exit(1);
  }
  if (r.status >= 400) {
    console.error('[vgen] error:', JSON.stringify(json, null, 2).slice(0, 2000));
    process.exit(1);
  }
  console.log('[vgen] response keys:', Object.keys(json));
  console.log('[vgen] raw:', JSON.stringify(json).slice(0, 1500));

  // Possible shapes:
  // 1. { data: [{ url }] } — direct sync response
  // 2. { id, status: 'pending', ... } — async job, need to poll
  // 3. { task_id, ... }
  const item = (json.data && json.data[0]) || json;
  if (item.url) {
    console.log('[vgen] downloading sync url ->', outPath);
    const size = await download(item.url, outPath);
    console.log('[vgen] saved', size, 'bytes ->', outPath);
    return;
  }
  const jobId = json.id || json.task_id || (item && (item.id || item.task_id));
  if (jobId) {
    console.log('[vgen] async job:', jobId, '— polling...');
    const pollPaths = [
      `/v1/videos/generations/${jobId}`,
      `/v1/videos/${jobId}`,
      `/v1/tasks/${jobId}`
    ];
    let attempt = 0, lastJson = null;
    while (attempt++ < 60) {
      await new Promise(r => setTimeout(r, 5000));
      let found = null;
      for (const p of pollPaths) {
        const pr = await request('GET', p, null);
        if (pr.status >= 200 && pr.status < 300) {
          try { found = { path: p, json: JSON.parse(pr.body) }; break; } catch {}
        }
      }
      if (!found) { console.log('[vgen] poll attempt', attempt, '— no endpoint matched yet'); continue; }
      lastJson = found.json;
      const status = lastJson.status || (lastJson.data && lastJson.data[0] && lastJson.data[0].status);
      console.log('[vgen] poll', attempt, 'via', found.path, 'status:', status);
      const url = lastJson.url || (lastJson.data && lastJson.data[0] && lastJson.data[0].url) || (lastJson.output && lastJson.output.video_url);
      if (url) {
        console.log('[vgen] got url, downloading ->', outPath);
        const sz = await download(url, outPath);
        console.log('[vgen] saved', sz, 'bytes ->', outPath);
        return;
      }
      if (status === 'failed' || status === 'error') {
        console.error('[vgen] job failed:', JSON.stringify(lastJson).slice(0, 800));
        process.exit(1);
      }
    }
    console.error('[vgen] polling timed out. last response:', JSON.stringify(lastJson).slice(0, 800));
    process.exit(1);
  }
  console.error('[vgen] no url and no job id in response:', JSON.stringify(json).slice(0, 800));
  process.exit(1);
}

main().catch(e => { console.error('[vgen] fatal:', e); process.exit(1); });
