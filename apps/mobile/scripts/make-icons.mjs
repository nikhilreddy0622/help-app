// Renders app icons from the brand mark (packages/ui-tokens/src/brand.ts). Not an Expo command.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(out, { recursive: true });

const H = 'M182 132V376M182 290c0-46 30-74 74-74s74 28 74 74v86';
const png = (svg, size, name) => writeFileSync(join(out, name), new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());

const mark = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}
<path d="${H}" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="404" cy="372" r="32" fill="#0D9488"/></svg>`;

// iOS icon: full-bleed navy square (the OS rounds it).
png(mark('<rect width="512" height="512" fill="#172B4D"/>'), 1024, 'icon.png');
// Android adaptive foreground: transparent, mark shrunk into the 66% safe zone.
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(86 86) scale(0.66)">
<path d="${H}" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="404" cy="372" r="32" fill="#0D9488"/></g></svg>`, 1024, 'adaptive-icon.png');
// Splash: rounded mark on transparent (splash background colour set in app.json).
png(mark('<rect width="512" height="512" rx="112" fill="#172B4D"/>'), 512, 'splash-icon.png');
png(mark('<rect width="512" height="512" rx="112" fill="#172B4D"/>'), 64, 'favicon.png');
// Android notification small icon: white on transparent.
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="${H}" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-linecap="round"/><circle cx="404" cy="372" r="32" fill="#FFFFFF"/></svg>`, 96, 'notification-icon.png');
console.log('icons written to', out);
