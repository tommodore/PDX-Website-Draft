// Vectorizes the white logo PNG (alpha channel) into SVGs for header, footer, favicon and OG image.
// Usage: node scripts/vectorize-logo.mjs [path/to/logo_paradoxcat_white.png]
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFile, mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const src = process.argv[2] ?? 'public/brand/logo_paradoxcat_white.png';
const trace = promisify(potrace.trace);
const out = 'public/brand';
await mkdir(out, { recursive: true });

const meta = await sharp(src).metadata();
const { width: W, height: H } = meta;
// Mark = cat head only (top part of the stacked logo); the wordmark starts below this line.
const MARK_H = Math.round(H * 0.67);

// potrace traces dark pixels, so render alpha as black on white.
async function toTraceInput(region) {
  const alpha = sharp(src).ensureAlpha().extractChannel(3);
  const img = region ? alpha.extract(region) : alpha;
  return img.negate().threshold(128).png().toBuffer();
}

function pathOf(svg) {
  return svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
}

async function build(region, h, name) {
  const svg = await trace(await toTraceInput(region), { threshold: 128, turdSize: 4, optTolerance: 0.4 });
  const d = pathOf(svg);
  const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="PARADOX CAT"><path fill="#fff" fill-rule="evenodd" d="${d}"/></svg>\n`;
  await writeFile(`${out}/${name}`, file);
  return file;
}

await build(null, H, 'logo_paradoxcat_white.svg');
const mark = await build({ left: 0, top: 0, width: W, height: MARK_H }, MARK_H, 'logo-mark-white.svg');

// Cropped to the mark's own bounds for compact use.
const markTight = mark.replace(`viewBox="0 0 ${W} ${MARK_H}"`, `viewBox="600 0 620 ${MARK_H}"`);
// Header mark: the traced hairlines are too thin on screen, so add a stroke and pad the viewBox to avoid clipping it.
const STROKE = 12;
const pad = STROKE / 2 + 2;
const markBold = markTight
  .replace(`viewBox="600 0 620 ${MARK_H}"`, `viewBox="${600 - pad} ${-pad} ${620 + 2 * pad} ${MARK_H + 2 * pad}"`)
  .replace('<path fill="#fff"', `<path fill="#fff" stroke="#fff" stroke-width="${STROKE}" stroke-linejoin="round"`);
await writeFile(`${out}/logo-mark-white.svg`, markBold);

// Favicon: mark on a rounded dark tile.
const inner = markTight.match(/<path[^>]+\/>/)[0];
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#011826"/><svg x="10" y="9" width="44" height="46" viewBox="600 0 620 ${MARK_H}" preserveAspectRatio="xMidYMid meet">${inner}</svg></svg>\n`;
await writeFile('public/favicon.svg', favicon);
console.log('logo SVGs written');
