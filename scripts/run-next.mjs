import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Commande Next.js inconnue.');
process.env.ESCEN_BUILD_DIR ||= command === 'dev' ? '.tmp/next-development' : '.next-verification';
const cli = require.resolve('next/dist/bin/next');
process.argv = [process.execPath, cli, command, ...args];
await import(pathToFileURL(cli).href);
