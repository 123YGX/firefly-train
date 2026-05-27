const fs = require('fs');
const { PNG } = require('pngjs');
const buf = fs.readFileSync('/tmp/fft-shots/01-menu.png');
const png = PNG.sync.read(buf);
function px(x, y) {
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i+1], png.data[i+2]];
}
console.log('size', png.width, 'x', png.height);
for (let y = 600; y <= 780; y += 30) {
  for (let x = 540; x <= 740; x += 50) {
    process.stdout.write(`(${x},${y})=${px(x,y).join(',')} `);
  }
  console.log();
}
