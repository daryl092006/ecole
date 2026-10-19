import { spawn } from 'node:child_process';

let child;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child?.kill(signal));
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, ['scripts/run-next.mjs', ...args], { stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Next.js ${args[0]} : sortie ${code}`)));
  });
}
await run(['build']);
await run(['start', '--port', '3117']);
