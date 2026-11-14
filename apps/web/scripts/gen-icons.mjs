// Generates apple-touch-icon.png, icon-192/512.png and og-default.png from the brand mark geometry
// (packages/ui-tokens/brand/mark.svg). Run: node scripts/gen-icons.mjs
import fs from 'node:fs';
import { PNG } from 'pngjs';

const bez = (p0, c1, c2, p3, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p3[0], u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p3[1]];
});
const archPts = [...bez([182, 290], [182, 244], [212, 216], [256, 216]), ...bez([256, 216], [300, 216], [330, 244], [330, 290]), [330, 376]];
const segs = [];
const addPoly = (pts) => { for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]); };
addPoly([[182, 132], [182, 376]]); addPoly(archPts);
const distSeg = (x, y, [a, b]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
};
const inH = (x, y) => segs.some((s) => distSeg(x, y, s) <= 30);
const inDot = (x, y) => Math.hypot(x - 404, y - 372) <= 32;

/** Draws the mark at (ox,oy) with the given pixel size into png, over the existing pixels. */
function drawMark(png, ox, oy, size) {
  const SS = 3;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let h = 0, d = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = ((px + (sx + 0.5) / SS) / size) * 512, y = ((py + (sy + 0.5) / SS) / size) * 512;
      if (inDot(x, y)) d++; else if (inH(x, y)) h++;
    }
    const a = (h + d) / (SS * SS); if (!a) continue;
    const col = d > h ? [13, 148, 136] : [255, 255, 255];
    const i = ((oy + py) * png.width + (ox + px)) * 4;
    for (let k = 0; k < 3; k++) png.data[i + k] = Math.round(png.data[i + k] * (1 - a) + col[k] * a);
  }
}
function canvas(w, h, rgb) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) { png.data[i * 4] = rgb[0]; png.data[i * 4 + 1] = rgb[1]; png.data[i * 4 + 2] = rgb[2]; png.data[i * 4 + 3] = 255; }
  return png;
}
const NAVY = [23, 43, 77];
const out = (name, png) => fs.writeFileSync(new URL(`../public/${name}`, import.meta.url), PNG.sync.write(png));
for (const [name, s] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const p = canvas(s, s, NAVY); drawMark(p, Math.round(s * 0.1), Math.round(s * 0.1), Math.round(s * 0.8)); out(name, p);
}
const og = canvas(1200, 630, NAVY); drawMark(og, 460, 155, 280); out('og-default.png', og);
console.log('icons written');
