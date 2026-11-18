// Moves the HTML template out of the static output so Vercel routes "/" to the SSR function
// instead of serving the empty shell directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'dist/client/index.html');
const to = path.join(root, 'dist/server/template.html');
fs.copyFileSync(from, to);
fs.rmSync(from);
console.log('template ->', path.relative(root, to));
