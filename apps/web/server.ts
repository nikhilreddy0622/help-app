/**
 * Express SSR server. Dev: Vite in middleware mode. Prod (`--prod`): serves dist/client and the dist/server bundle.
 * Server-rendered + indexable: /, /search, /c/:category/:city, /professionals/:slug. Everything else is client-rendered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express, { type Request, type Response } from 'express';
import compression from 'compression';
import type { ViteDevServer } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 5173);

interface Entry {
  render(url: string, o: { origin: string; apiUrl?: string }): Promise<{ status: number; redirect?: string; html: string; head: string; state: string; ssr: boolean }>;
  sitemapXml(o: { origin: string; apiUrl?: string }): Promise<string>;
  robotsTxt(origin: string): string;
}

async function main() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(compression());

  let vite: ViteDevServer | undefined;
  let template = '';
  if (isProd) {
    app.use('/assets', express.static(path.join(root, 'dist/client/assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(path.join(root, 'dist/client'), { index: false }));
    template = fs.readFileSync(path.join(root, 'dist/client/index.html'), 'utf-8');
  } else {
    const { createServer } = await import('vite');
    vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
  }

  const loadEntry = async (): Promise<Entry> =>
    isProd
      ? ((await import(pathToFileURL(path.join(root, 'dist/server/entry-server.js')).href)) as Entry)
      : ((await vite!.ssrLoadModule('/src/entry-server.tsx')) as unknown as Entry);

  const originOf = (req: Request) => (process.env.SITE_URL ?? `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const apiUrl = process.env.API_URL ?? process.env.VITE_API_URL;

  app.get('/healthz', (_req, res) => { res.json({ ok: true }); });
  app.get('/robots.txt', async (req, res) => { res.type('text/plain').send((await loadEntry()).robotsTxt(originOf(req))); });
  app.get('/sitemap.xml', async (req, res) => {
    try { res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await (await loadEntry()).sitemapXml({ origin: originOf(req), apiUrl })); }
    catch (e) { res.status(502).type('text/plain').send('Sitemap unavailable'); if (!isProd) vite?.ssrFixStacktrace(e as Error); }
  });

  app.get('*', async (req: Request, res: Response) => {
    try {
      const entry = await loadEntry();
      const result = await entry.render(req.originalUrl, { origin: originOf(req), apiUrl });
      if (result.redirect) { res.redirect(result.status === 301 || result.status === 302 ? result.status : 301, result.redirect); return; }
      let page = isProd ? template : await vite!.transformIndexHtml(req.originalUrl, fs.readFileSync(path.join(root, 'index.html'), 'utf-8'));
      page = page.replace('<!--app-head-->', () => result.head).replace('<!--app-html-->', () => result.html).replace('<!--app-state-->', () => result.state);
      res.status(result.status).set('Content-Type', 'text/html');
      if (result.ssr && result.status === 200) res.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
      res.send(page);
    } catch (e) {
      if (!isProd) vite?.ssrFixStacktrace(e as Error);
      console.error(e);
      res.status(500).type('text/plain').send('Something went wrong');
    }
  });

  app.listen(port, () => console.log(`web ${isProd ? 'production' : 'dev'} server on http://localhost:${port}`));
}
void main();
