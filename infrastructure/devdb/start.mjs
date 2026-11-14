// Project-local Postgres for development (no Docker, no system install).
// Data lives in infrastructure/devdb/data (gitignored). Port 54329, user/db "help".
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

const dir = new URL('./data', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'help', password: 'help', port: 54329, persistent: true });
if (!existsSync(dir)) await pg.initialise();
await pg.start();
try { await pg.createDatabase('help'); } catch {}
try { await pg.createDatabase('help_test'); } catch {}
console.log('dev Postgres ready on postgresql://help:help@localhost:54329/help');
const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
