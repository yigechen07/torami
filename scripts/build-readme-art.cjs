'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'docs/readme');
fs.mkdirSync(output, { recursive: true });
const source = fs.readFileSync(path.join(root, 'src/pet/torami.svg'), 'utf8');
const inner = source.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
function pet(prefix, x, y, width, height, pose = '') {
  const body = inner.replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`);
  const styles = pose === 'shy'
    ? `#${prefix} .ear,#${prefix} .eyes-open{opacity:0}#${prefix} .folded-ears,#${prefix} .eyes-closed{opacity:1}`
    : pose === 'hmph'
      ? `#${prefix} .eyes-open,#${prefix} .mouth-normal,#${prefix} .arm{opacity:0}#${prefix} .eyes-angry,#${prefix} .mouth-pout,#${prefix} .gesture-arms,#${prefix} .gesture-hands{opacity:1}` : '';
  return `<svg id="${prefix}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 260 300"><style>${styles}</style>${body}</svg>`;
}
const heart = (x, y, size = 1, fill = '#e8a1ba') => `<path transform="translate(${x} ${y}) scale(${size})" d="M0 7C-12-1-14-10-7-12C-3-14 0-10 0-8C1-11 6-14 10-11C17-6 9 1 0 7Z" fill="${fill}"/>`;
const star = (x, y, size = 1) => `<path transform="translate(${x} ${y}) scale(${size})" d="M0-15Q2-2 15 0Q2 2 0 15Q-2 2-15 0Q-2-2 0-15Z" fill="#d3a362"/>`;
function svg(width, height, title, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#e7bdc4" opacity=".26"/></pattern><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#956078" flood-opacity=".13"/></filter></defs><g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif" fill="#705354">${content}</g></svg>\n`;
}
// Keep the original Chinese artwork and publish English artwork by default.
const english = new Map([
  ['TORAMI — 兔岚咪与 YUHA 的桌面小心动', 'TORAMI — a tiny desktop heart for YUHA'],
  ['把一点点可爱，留在每天的桌面上。', 'A little cuteness for your everyday.'],
  ['macOS · 中文 / 한국어', 'macOS · Chinese / Korean UI'],
  ['兔岚咪的三种小心情：陪伴、害羞和 YUHA 生气了哼', 'Three little moods: company, shyness, and YUHA\'s hmph'],
  ['今天也陪着你', 'Here to keep you company'],
  ['眨眨眼，晃晃耳朵。', 'A blink. A little ear wiggle.'],
  ['害羞时，用耳朵躲起来', 'Hide behind those ears'],
  ['偷偷看一眼，再靠近一点。', 'A little peek. A little closer.'],
  ['兔岚咪生气了，哼！', 'Toramui is upset. Hmph!'],
  ['2.35 秒原声 · 鼓脸 · 小拳拳', '2.35s voice · pout · tiny paws'],
]);
function writeArtwork(name, content) {
  fs.writeFileSync(path.join(output, `${name}.zh-CN.svg`), content);
  for (const [original, translated] of english) content = content.replaceAll(original, translated);
  fs.writeFileSync(path.join(output, `${name}.svg`), content);
}
writeArtwork('hero', svg(1200, 620, 'TORAMI — 兔岚咪与 YUHA 的桌面小心动', `
  <rect width="1200" height="620" rx="30" fill="#fff8f2"/>
  <rect width="1200" height="620" rx="30" fill="url(#dots)"/>
  <rect x="20" y="20" width="1160" height="580" rx="20" fill="none" stroke="#e9c6cd"/>
  <path d="M46 89H1154M46 530H1154" stroke="#ecd6d5"/>
  <text x="62" y="62" font-size="15" letter-spacing="3" fill="#ab7a83">HEARTS2HEARTS · A FAN-MADE DESKTOP PET</text>
  <text x="1138" y="62" text-anchor="end" font-size="15" fill="#ab7a83">♡ 01 / YUHA</text>
  <rect x="66" y="130" width="191" height="34" rx="17" fill="#f6e0e7"/>
  <text x="161" y="153" text-anchor="middle" font-size="15" letter-spacing="1.2" fill="#a4617d">a little love for YUHA</text>
  <text x="58" y="286" font-family="Georgia,'Times New Roman',serif" font-size="130" letter-spacing="-8" fill="#a94e73">torami</text>
  <text x="68" y="337" font-size="28" letter-spacing="7">兔岚咪</text>
  <text x="237" y="336" font-size="20" letter-spacing="2" fill="#b0808d">TORAMUI / 토라뮈</text>
  <text x="68" y="396" font-family="Georgia,serif" font-size="25" font-style="italic" fill="#9a6a74">A tiny heart on your desktop.</text>
  <text x="68" y="437" font-size="19" fill="#9a7b7b">把一点点可爱，留在每天的桌面上。</text>
  <g transform="rotate(6 914 314)">
    <rect x="736" y="114" width="354" height="395" rx="18" fill="#fffefd" stroke="#e9ccd0" filter="url(#shadow)"/>
    <rect x="751" y="129" width="324" height="306" rx="12" fill="#f9e9e9"/>
    <ellipse cx="910" cy="405" rx="82" ry="10" fill="#ead0d4"/>
    ${pet('hero-pet', 774, 144, 280, 294)}
    <text x="913" y="476" text-anchor="middle" font-family="Georgia,serif" font-size="27" font-style="italic" fill="#aa6b84">YUHA's little companion</text>
    <path d="M876 106L916 92L964 110L956 137L881 132Z" fill="#e8b3c6" opacity=".8"/>
  </g>
  ${heart(683, 209, 1.5)}${heart(1114, 405, 1.2)}${heart(1038, 101, .8)}
  ${star(1107, 200, 1.2)}${star(694, 444, .8)}
  <text x="62" y="569" font-size="15" letter-spacing="2" fill="#ab7a83">SOFT PAWS. PINK RIBBONS. LITTLE HEARTS.</text>
  <text x="1138" y="569" text-anchor="end" font-size="15" fill="#ab7a83">macOS · 中文 / 한국어</text>
`));
const cards = [
  { x: 24, name: '01 / HELLO, LITTLE HEART', label: '今天也陪着你', note: '眨眨眼，晃晃耳朵。', pose: '', color: '#fbefea' },
  { x: 420, name: '02 / A LITTLE SHY', label: '害羞时，用耳朵躲起来', note: '偷偷看一眼，再靠近一点。', pose: 'shy', color: '#f9e8ee' },
  { x: 816, name: '03 / YUHA MOMENT', label: '兔岚咪生气了，哼！', note: '2.35 秒原声 · 鼓脸 · 小拳拳', pose: 'hmph', color: '#f3eaf0' },
];
writeArtwork('moments', svg(1200, 496, '兔岚咪的三种小心情：陪伴、害羞和 YUHA 生气了哼', cards.map((c, index) => `
  <rect x="${c.x}" y="8" width="360" height="470" rx="22" fill="#fffaf7" stroke="#eacfd4"/>
  <text x="${c.x + 25}" y="47" font-size="13" letter-spacing="1.6" fill="#ad7e8f">${c.name}</text>
  <rect x="${c.x + 17}" y="68" width="326" height="293" rx="16" fill="${c.color}"/>
  <ellipse cx="${c.x + 180}" cy="332" rx="69" ry="8" fill="#e8cdd3"/>
  ${pet(`moment-${index}`, c.x + 64, 84, 232, 268, c.pose)}
  <text x="${c.x + 180}" y="406" text-anchor="middle" font-size="21" font-weight="600" fill="#986078">${c.label}</text>
  <text x="${c.x + 180}" y="440" text-anchor="middle" font-size="16" fill="#aa818a">${c.note}</text>
`).join('')));
fs.writeFileSync(path.join(output, 'footer.svg'), svg(1200, 140, 'Made with little hearts for YUHA and TORAMUI', `
  <rect width="1200" height="140" rx="24" fill="#fff5f5"/>
  <path d="M46 70H310M890 70H1154" stroke="#e9c6d0" stroke-dasharray="4 7"/>
  ${heart(353, 72, .8)}${heart(846, 72, .8)}
  <text x="600" y="64" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="25" fill="#a2607d">Made with little hearts.</text>
  <text x="600" y="95" text-anchor="middle" font-size="14" letter-spacing="2" fill="#b58a98">FOR YUHA · TORAMUI · AND YOUR EVERYDAY</text>
`));
console.log('README artwork generated in docs/readme/.');
