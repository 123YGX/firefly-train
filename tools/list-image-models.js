const fs = require('fs');
const path = String.raw`C:\Users\Administrator\.claude\projects\C--Users-Administrator\ff64a80a-4893-4abc-820b-c7a593dcb730\tool-results\bhwib7x8s.txt`;
const d = JSON.parse(fs.readFileSync(path, 'utf8'));
const re = /image|flux|midjourney|sdxl|sd3|dalle|imagen|kling|cogview|wanx|hidream|seedream|nano-?banana|recraft|gpt-image/i;
const out = d.data.filter(m =>
  (m.model_type || '').includes('图') ||
  re.test(m.id) ||
  (m.tags || '').includes('画')
);
out.forEach(m => console.log(`${m.id} | ${m.model_type} | tags=${(m.tags||'').slice(0,50)} | endpoints=${(m.supported_endpoint_types||[]).join(',')}`));
console.log('---');
console.log('total candidates:', out.length, '/ all:', d.data.length);
