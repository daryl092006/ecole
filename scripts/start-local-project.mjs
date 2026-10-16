import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';

const root = await realpath(new URL('..', import.meta.url));
const site = path.resolve(root, '../escen-website');
const children = [];
for (const [url, command, args, cwd, env] of [
  ['http://127.0.0.1:3000/connexion', process.execPath, ['scripts/run-next.mjs', 'dev', '--hostname', '127.0.0.1', '--port', '3000'], root, { WATCHPACK_POLLING: 'true', ESCEN_WEBSITE_URL: 'http://localhost:3200' }],
  ['http://127.0.0.1:3200/', 'python3', ['-m', 'http.server', '3200', '--bind', '127.0.0.1', '--directory', 'dist'], site, {}],
]) {
  const running = await fetch(url, { signal: AbortSignal.timeout(5000) }).then(response => response.ok).catch(() => false);
  if (!running) {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    children.push(child);
  }
}
console.log('Portail : http://127.0.0.1:3000\nSite : http://localhost:3200');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { children.forEach(child => child.kill(signal)); });
