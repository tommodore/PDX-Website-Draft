// Renders the 16 site illustrations from real three.js scenes in headless Chrome.
// Usage: node scripts/render-illustrations.mjs [name ...]   (default: all)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageDir = path.join(root, 'scripts', 'illustrations');
const threeDir = path.join(root, 'node_modules', 'three');
const outDir = path.join(root, 'src', 'assets', 'illustrations');
const ALL = ['horizon', 'marine', 'aviation', 'wireframe', 'render', 'twin', 'sensing', 'cockpit', 'engine', 'industrial', 'terminal', 'skyline', 'bokeh', 'waves', 'space', 'variants'];
const names = process.argv.length > 2 ? process.argv.slice(2) : ALL;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.mjs': 'text/javascript' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost').pathname;
  const file = url.startsWith('/three/') ? path.join(threeDir, url.slice(7)) : path.join(pageDir, url === '/' ? 'index.html' : url);
  if (!file.startsWith(threeDir) && !file.startsWith(pageDir) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

try {
  for (const name of names) {
    const page = await browser.newPage();
    await page.setViewport({ width: 2400, height: 1350, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error(`[${name}]`, e.message));
    await page.goto(`${base}/index.html?scene=${name}`);
    await page.waitForFunction('window.__done || window.__error', { timeout: 240000 });
    const err = await page.evaluate('window.__error');
    if (err) throw new Error(`${name}: ${err}`);
    const png = await page.screenshot({ type: 'png' });
    await sharp(png).resize(1920, 1080).webp({ quality: 82 }).toFile(path.join(outDir, `${name}.webp`));
    console.log('rendered', name);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
