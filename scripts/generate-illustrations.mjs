// Generates original, procedural "illustrative" artwork (SVG -> WebP) into src/assets/illustrations
// and the default Open Graph image. Re-run with: npm run illustrations
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const W = 1920;
const H = 1080;
const OUT = 'src/assets/illustrations';
await mkdir(OUT, { recursive: true });

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const f = (n) => Math.round(n * 10) / 10;

const defs = (extra = '') => `<defs>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="glowL" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="fog" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.012" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.62  0 0 0 0 0.9  0 0 0 0.9 -0.28"/>
  </filter>
  <radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#010d16" stop-opacity="0"/><stop offset="100%" stop-color="#010d16" stop-opacity="0.85"/></radialGradient>
  ${extra}
</defs>`;

const wrap = (inner, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(extra)}${inner}<rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
const fogLayer = (y, h, o = 0.5) => `<rect x="0" y="${y}" width="${W}" height="${h}" filter="url(#fog)" opacity="${o}"/>`;

function stars(seed, n, ymax) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * ymax)}" r="${f(0.5 + r() * 1.3)}" fill="#cfe0ff" opacity="${f(0.25 + r() * 0.6)}"/>`;
  return s;
}

function seaScene({ sky, sun, sunX = 1100, horizon = 640, vessel = false, seed = 3 }) {
  const r = rng(seed);
  let streaks = '';
  for (let i = 0; i < 60; i++) {
    const y = horizon + 14 + r() * (H - horizon - 20);
    const spread = 30 + (y - horizon) * 0.9;
    const w = 40 + r() * spread * 1.6;
    streaks += `<rect x="${f(sunX - w / 2 + (r() - 0.5) * spread)}" y="${f(y)}" width="${f(w)}" height="${f(1 + (y - horizon) / 90)}" rx="2" fill="${sun}" opacity="${f(0.1 + r() * 0.35)}"/>`;
  }
  const ship = vessel
    ? `<g transform="translate(560 ${horizon - 8})" opacity="0.95">
        <path d="M0 0 L420 0 L380 38 L40 38 Z" fill="#02101b"/><path d="M60 0 L90 -34 L300 -34 L340 0 Z" fill="#031624"/>
        <path d="M110 -34 L130 -62 L250 -62 L270 -34 Z" fill="#04213a"/><rect x="132" y="-52" width="116" height="8" fill="${sun}" opacity="0.7"/>
        <path d="M-10 40 L430 40 L400 52 L10 52 Z" fill="${sun}" opacity="0.12" filter="url(#soft)"/></g>`
    : '';
  return wrap(
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(seed, 90, horizon * 0.6)}
     <ellipse cx="${sunX}" cy="${horizon}" rx="520" ry="260" fill="${sun}" opacity="0.28" filter="url(#glowL)"/>
     <circle cx="${sunX}" cy="${horizon - 6}" r="46" fill="${sun}" opacity="0.9" filter="url(#glow)"/>
     ${fogLayer(horizon - 160, 260, 0.55)}
     <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#sea)"/>${streaks}${ship}
     ${fogLayer(horizon - 20, 90, 0.5)}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${sky.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>
     <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a2c4a"/><stop offset="1" stop-color="#010d16"/></linearGradient>`,
  );
}

// Faceted polyhedron-like object: left half wireframe (CAD), right half shaded (real-time).
function facets(cx, cy, R, seed, mode) {
  const r = rng(seed);
  const ring = 9;
  const pts = [];
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.cos(a) * R * (0.85 + r() * 0.25), cy + Math.sin(a) * R * (0.7 + r() * 0.25)]);
  }
  const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.48 + (r() - 0.5) * 24, cy + (y - cy) * 0.48 + (r() - 0.5) * 24]);
  const tris = [];
  for (let i = 0; i < ring; i++) {
    const j = (i + 1) % ring;
    tris.push([pts[i], pts[j], inner[i]], [pts[j], inner[j], inner[i]], [inner[i], inner[j], [cx, cy - R * 0.08]]);
  }
  const shades = ['#0d3250', '#164a78', '#1f62a3', '#2c7be0', '#548cff', '#7aa5ff'];
  let out = '';
  tris.forEach((t, i) => {
    const d = `M${t.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z`;
    const solid = mode === 'solid' || (mode === 'split' && (t[0][0] + t[1][0] + t[2][0]) / 3 > cx);
    if (solid) out += `<path d="${d}" fill="${shades[(i * 7 + 2) % shades.length]}" opacity="${f(0.55 + r() * 0.4)}" stroke="#9fc0ff" stroke-opacity="0.35" stroke-width="1"/>`;
    else out += `<path d="${d}" fill="none" stroke="#7aa5ff" stroke-opacity="0.9" stroke-width="1.6"/>`;
  });
  return out;
}

function perspectiveGrid(horizonY, color = '#548cff', op = 0.35) {
  let g = '';
  for (let i = -24; i <= 24; i++) g += `<line x1="${W / 2}" y1="${horizonY}" x2="${f(W / 2 + i * 220)}" y2="${H}" stroke="${color}" stroke-opacity="${op}"/>`;
  for (let k = 1; k < 16; k++) {
    const y = horizonY + (H - horizonY) * Math.pow(k / 16, 2.1);
    g += `<line x1="0" y1="${f(y)}" x2="${W}" y2="${f(y)}" stroke="${color}" stroke-opacity="${f(op * (0.4 + k / 20))}"/>`;
  }
  return g;
}

const bg = (a = '#010d16', b = '#07243a') => `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
const bgDef = (a = '#010d16', b = '#0d3250') => `<radialGradient id="bg" cx="60%" cy="40%" r="90%"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></radialGradient>`;

const scenes = {
  horizon: () => seaScene({ sky: [[0, '#010d16'], [0.45, '#0b2c52'], [0.8, '#3d4f8f'], [1, '#e29a62']], sun: '#ffb870', sunX: 1180, seed: 3 }),
  marine: () => seaScene({ sky: [[0, '#010d16'], [0.5, '#103a66'], [0.85, '#4f6fb3'], [1, '#f0b27a']], sun: '#ffc98a', sunX: 1400, vessel: true, horizon: 700, seed: 11 }),
  aviation: () => {
    const r = rng(21);
    let clouds = '';
    for (let i = 0; i < 14; i++) clouds += `<ellipse cx="${f(r() * W)}" cy="${f(620 + r() * 380)}" rx="${f(220 + r() * 380)}" ry="${f(26 + r() * 50)}" fill="#8fb2ff" opacity="${f(0.1 + r() * 0.18)}" filter="url(#glowL)"/>`;
    return wrap(
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(21, 120, 420)}
       <path d="M-40 360 L1500 250 L1900 262 L1500 300 L300 420 Z" fill="#031a2e" stroke="#7aa5ff" stroke-opacity="0.6" stroke-width="1.5"/>
       <path d="M300 420 L1500 300 L1560 330 L420 470 Z" fill="#06284a" opacity="0.9"/>
       <ellipse cx="1000" cy="720" rx="760" ry="150" fill="#ffb870" opacity="0.2" filter="url(#glowL)"/>${clouds}${fogLayer(560, 400, 0.6)}`,
      `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#010d16"/><stop offset="0.6" stop-color="#14416f"/><stop offset="1" stop-color="#e6a874"/></linearGradient>`,
    );
  },
  wireframe: () => wrap(`${bg()}${perspectiveGrid(700)}<ellipse cx="1180" cy="560" rx="460" ry="300" fill="#548cff" opacity="0.18" filter="url(#glowL)"/>${facets(1180, 520, 360, 5, 'wire')}`, bgDef()),
  render: () => wrap(`${bg()}${perspectiveGrid(740)}<ellipse cx="1180" cy="580" rx="520" ry="320" fill="#548cff" opacity="0.22" filter="url(#glowL)"/>${facets(1180, 520, 360, 9, 'solid')}${fogLayer(720, 320, 0.35)}`, bgDef()),
  twin: () => wrap(
    `${bg()}${perspectiveGrid(760)}
     ${facets(700, 520, 250, 5, 'solid')}${facets(1300, 520, 250, 5, 'wire')}
     <g stroke="#bfd92e" stroke-opacity="0.75" stroke-width="1.5" stroke-dasharray="6 8" fill="none"><path d="M960 470 C1000 430 1040 430 1080 470"/><path d="M960 540 C1000 580 1040 580 1080 540"/></g>
     <circle cx="1020" cy="505" r="10" fill="#bfd92e" filter="url(#glow)"/><ellipse cx="1000" cy="760" rx="800" ry="120" fill="#548cff" opacity="0.15" filter="url(#glowL)"/>`,
    bgDef(),
  ),
  sensing: () => {
    const r = rng(31);
    let rings = '';
    for (let i = 1; i <= 8; i++) rings += `<ellipse cx="1100" cy="560" rx="${i * 95}" ry="${i * 62}" fill="none" stroke="#548cff" stroke-opacity="${f(0.55 - i * 0.055)}" stroke-width="1.4"/>`;
    let pts = '';
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2;
      const d = 40 + r() * 560;
      pts += `<circle cx="${f(1100 + Math.cos(a) * d * 1.5)}" cy="${f(560 + Math.sin(a) * d * 0.95)}" r="${f(0.8 + r() * 2)}" fill="${r() > 0.93 ? '#bfd92e' : '#9fc0ff'}" opacity="${f(0.2 + r() * 0.6)}"/>`;
    }
    return wrap(
      `${bg()}<ellipse cx="1100" cy="560" rx="620" ry="380" fill="#548cff" opacity="0.14" filter="url(#glowL)"/>${rings}${pts}
       <path d="M1020 470 Q1100 380 1180 470 L1200 650 Q1100 700 1000 650 Z" fill="#0d3250" stroke="#7aa5ff" stroke-width="1.6" opacity="0.9"/>
       <circle cx="1100" cy="430" r="42" fill="#0d3250" stroke="#bfd92e" stroke-width="2"/>`,
      bgDef(),
    );
  },
  cockpit: () =>
    wrap(
      `${bg('#010d16', '#0b2c52')}
       <path d="M0 700 Q960 560 1920 700 L1920 1080 L0 1080 Z" fill="#010a11"/>
       <path d="M0 700 Q960 560 1920 700" fill="none" stroke="#548cff" stroke-opacity="0.5" stroke-width="2" filter="url(#soft)"/>
       <rect x="560" y="560" width="800" height="260" rx="34" fill="#031a2e" stroke="#548cff" stroke-opacity="0.7" stroke-width="2"/>
       <rect x="580" y="580" width="560" height="220" rx="22" fill="url(#scr)"/>
       <rect x="1160" y="580" width="180" height="220" rx="22" fill="#07243a" stroke="#1b4263"/>
       <circle cx="1250" cy="690" r="58" fill="none" stroke="#bfd92e" stroke-width="5" stroke-dasharray="230 140" filter="url(#soft)"/>
       <g fill="#7aa5ff" opacity="0.8"><rect x="610" y="620" width="240" height="10" rx="5"/><rect x="610" y="650" width="380" height="6" rx="3" opacity="0.5"/><rect x="610" y="700" width="140" height="70" rx="12" opacity="0.35"/><rect x="770" y="700" width="140" height="70" rx="12" opacity="0.35"/><rect x="930" y="700" width="140" height="70" rx="12" opacity="0.35"/></g>
       <ellipse cx="960" cy="690" rx="520" ry="190" fill="#548cff" opacity="0.2" filter="url(#glowL)"/>${fogLayer(640, 300, 0.25)}`,
      `${bgDef('#010d16', '#0b2c52')}<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d3250"/><stop offset="1" stop-color="#1f62a3"/></linearGradient>`,
    ),
  engine: () => {
    let cubes = '';
    const iso = (x, y, z) => [960 + (x - y) * 70, 330 + (x + y) * 40 - z * 78];
    const r = rng(41);
    for (let x = 0; x < 6; x++)
      for (let y = 0; y < 6; y++) {
        const h = Math.floor(r() * 4) + 0.2;
        const [a, b] = iso(x, y, 0);
        const top = [iso(x, y, h), iso(x + 1, y, h), iso(x + 1, y + 1, h), iso(x, y + 1, h)];
        const left = [iso(x, y + 1, h), iso(x + 1, y + 1, h), iso(x + 1, y + 1, 0), iso(x, y + 1, 0)];
        const right = [iso(x + 1, y, h), iso(x + 1, y + 1, h), iso(x + 1, y + 1, 0), iso(x + 1, y, 0)];
        const poly = (p, c, o) => `<path d="M${p.map((q) => `${f(q[0])} ${f(q[1])}`).join(' L')} Z" fill="${c}" opacity="${o}" stroke="#7aa5ff" stroke-opacity="0.4"/>`;
        cubes += poly(left, '#0d3250', 0.95) + poly(right, '#164a78', 0.95) + poly(top, r() > 0.85 ? '#bfd92e' : '#2c7be0', 0.9);
      }
    return wrap(`${bg()}<ellipse cx="960" cy="620" rx="640" ry="300" fill="#548cff" opacity="0.18" filter="url(#glowL)"/>${cubes}${fogLayer(760, 300, 0.3)}`, bgDef());
  },
  industrial: () => {
    const r = rng(51);
    let b = '';
    for (let i = 0; i < 9; i++) {
      const x = 160 + i * 190;
      const h = 160 + r() * 360;
      b += `<rect x="${x}" y="${f(820 - h)}" width="150" height="${f(h)}" fill="#031a2e" stroke="#548cff" stroke-opacity="0.45"/>`;
      for (let k = 0; k < Math.floor(h / 46); k++) b += `<rect x="${x + 18}" y="${f(820 - h + 18 + k * 46)}" width="114" height="8" fill="${r() > 0.9 ? '#bfd92e' : '#548cff'}" opacity="${f(0.15 + r() * 0.5)}"/>`;
    }
    return wrap(`${bg()}<ellipse cx="960" cy="800" rx="900" ry="160" fill="#548cff" opacity="0.18" filter="url(#glowL)"/>${b}<rect y="820" width="${W}" height="260" fill="#010a11"/><line x1="0" y1="820" x2="${W}" y2="820" stroke="#548cff" stroke-opacity="0.6" stroke-width="2"/>${fogLayer(700, 250, 0.45)}`, bgDef());
  },
  terminal: () =>
    wrap(
      `${bg()}<g transform="rotate(-8 960 540)"><rect x="620" y="260" width="680" height="480" rx="36" fill="#031a2e" stroke="#548cff" stroke-opacity="0.7" stroke-width="2"/>
       <rect x="660" y="300" width="600" height="150" rx="18" fill="url(#scr)"/>
       <g fill="#7aa5ff" opacity="0.55">${[0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => `<rect x="${660 + j * 152}" y="${480 + i * 80}" width="136" height="64" rx="14"/>`).join('')).join('')}</g>
       <rect x="700" y="340" width="260" height="14" rx="7" fill="#bfd92e" opacity="0.85"/><rect x="700" y="372" width="420" height="8" rx="4" fill="#cfe0ff" opacity="0.5"/></g>
       <ellipse cx="960" cy="560" rx="700" ry="320" fill="#548cff" opacity="0.15" filter="url(#glowL)"/>`,
      `${bgDef()}<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d3250"/><stop offset="1" stop-color="#2c7be0"/></linearGradient>`,
    ),
  skyline: () => {
    const r = rng(61);
    let b = '';
    let x = -20;
    while (x < W) {
      const w = 70 + r() * 120;
      const h = 120 + r() * 420;
      b += `<rect x="${f(x)}" y="${f(800 - h)}" width="${f(w)}" height="${f(h)}" fill="#02121f" stroke="#1b4263"/>`;
      for (let k = 0; k < 16; k++) if (r() > 0.6) b += `<rect x="${f(x + 8 + r() * (w - 24))}" y="${f(800 - h + 14 + r() * (h - 30))}" width="8" height="5" fill="#ffd18a" opacity="${f(0.3 + r() * 0.6)}"/>`;
      x += w + 6;
    }
    return wrap(`<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(61, 80, 400)}<ellipse cx="960" cy="780" rx="900" ry="140" fill="#548cff" opacity="0.3" filter="url(#glowL)"/>${b}<rect y="800" width="${W}" height="280" fill="#010a11"/>${fogLayer(640, 260, 0.5)}`, `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#010d16"/><stop offset="1" stop-color="#1c4a7e"/></linearGradient>`);
  },
  bokeh: () => {
    const r = rng(71);
    let c = '';
    for (let i = 0; i < 38; i++) c += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(24 + r() * 120)}" fill="${r() > 0.8 ? '#ffb870' : r() > 0.5 ? '#548cff' : '#364c94'}" opacity="${f(0.08 + r() * 0.22)}" filter="url(#glow)"/>`;
    return wrap(`${bg()}${c}${fogLayer(500, 500, 0.3)}`, bgDef());
  },
  waves: () => {
    let w = '';
    for (let i = 0; i < 26; i++) {
      const y = 260 + i * 26;
      w += `<path d="M0 ${y} C 320 ${y - 90 + i * 3}, 640 ${y + 90 - i * 3}, 960 ${y} S 1600 ${y - 80}, 1920 ${y}" fill="none" stroke="${i % 9 === 0 ? '#bfd92e' : '#548cff'}" stroke-opacity="${f(0.15 + i * 0.025)}" stroke-width="1.5"/>`;
    }
    return wrap(`${bg()}<ellipse cx="960" cy="560" rx="800" ry="260" fill="#548cff" opacity="0.14" filter="url(#glowL)"/>${w}`, bgDef());
  },
};

for (const [name, build] of Object.entries(scenes)) {
  const svg = build();
  await sharp(Buffer.from(svg)).webp({ quality: 78, effort: 5 }).toFile(`${OUT}/${name}.webp`);
  console.log('illustration', name);
}

// Default Open Graph image: horizon artwork + logo mark + wordmark.
const logo = await sharp('public/brand/logo_paradoxcat_white.png').resize({ height: 300 }).toBuffer();
const base = await sharp(`${OUT}/horizon.webp`).resize(1200, 630, { fit: 'cover' }).modulate({ brightness: 0.8 }).toBuffer();
await sharp(base)
  .composite([{ input: logo, left: 80, top: 160 }])
  .png({ compressionLevel: 9 })
  .toFile('public/og-default.png');
console.log('og-default.png');
