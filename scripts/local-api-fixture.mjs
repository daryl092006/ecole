import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

// Keep real validation and permissions; replace only authentication and the database transport.
export function loadLocalApiModule(path, client, context) {
  const overrides = new Map([
    ['server-only', {}],
    ['@/lib/supabase/server', { getSupabaseServerClient() { throw new Error('Connexion distante interdite dans ces tests.'); } }],
  ]);
  const cache = new Map();
  const root = new URL('../src/', import.meta.url);
  function load(url) {
    const filename = fileURLToPath(url);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const localRequire = createRequire(url);
    const requireModule = name => {
      if (overrides.has(name)) return overrides.get(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = new URL(name.startsWith('@/') ? name.slice(2) : name, name.startsWith('@/') ? root : url);
        if (target.pathname.endsWith('.json')) return localRequire(fileURLToPath(target));
        return load(new URL(target.href.endsWith('.ts') ? target.href : `${target.href}.ts`));
      }
      return localRequire(name);
    };
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(requireModule, loaded, loaded.exports);
    return loaded.exports;
  }
  const auth = load(new URL('server/auth.ts', root));
  overrides.set('@/server/auth', { ...auth, requireAccount: async () => ({ client, context }) });
  return load(new URL(path, root));
}
