// Vercel serverless SSR: same rendering as server.ts --prod, for every route that is not a static file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, robotsTxt, sitemapXml } from '../dist/server/entry-server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(here, '../dist/server/template.html'), 'utf-8');
const apiUrl = process.env.API_URL ?? process.env.VITE_API_URL;

const originOf = (req) => (process.env.SITE_URL ?? `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`).replace(/\/$/, '');

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const target = url.searchParams.get('__path');
  if (target !== null) url.searchParams.delete('__path');
  const pathname = target ?? url.pathname;
  const search = url.searchParams.toString();
  const origin = originOf(req);
  try {
    if (pathname === '/robots.txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=86400');
      return res.end(robotsTxt(origin));
    }
    if (pathname === '/sitemap.xml') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.end(await sitemapXml({ origin, apiUrl }));
    }
    const result = await render(pathname + (search ? `?${search}` : ''), { origin, apiUrl });
    if (result.redirect) {
      res.statusCode = result.status === 302 ? 302 : 301;
      res.setHeader('Location', result.redirect);
      return res.end();
    }
    const page = template
      .replace('<!--app-head-->', () => result.head)
      .replace('<!--app-html-->', () => result.html)
      .replace('<!--app-state-->', () => result.state);
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', result.ssr && result.status === 200
      ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
      : 'public, max-age=0, s-maxage=60');
    return res.end(page);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Something went wrong');
  }
}
