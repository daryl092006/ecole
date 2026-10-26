import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOperationalReferences, operationalReferenceSql } from './lib/operational-recovery.mjs';
import { rehearseOperationalReferences } from './verify-operational-recovery.mjs';

const { values } = parseArgs({ options: Object.fromEntries(['source', 'baseline', 'snapshot', 'index', 'out'].map(name => [name, { type: 'string' }])) });
for (const name of ['source', 'baseline', 'snapshot', 'index', 'out']) if (!values[name]) throw new Error(`Option --${name} requise.`);
const root = fileURLToPath(new URL('../', import.meta.url));
const readSource = path => JSON.parse(execFileSync('python3', ['-c', `
import importlib.util,json,pathlib,sys
s=importlib.util.spec_from_file_location('reader',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
tables,digest=m.read_source(pathlib.Path(sys.argv[2]))
print(json.dumps({'sql_sha256':digest,'tables':{name:[m.redact(row,name in ('current_envs','configurations','jobs','failed_jobs')) for row in table['rows']] for name,table in tables.items()}}))
`, resolve(root, 'scripts/prepare-legacy-data.py'), resolve(path)], { encoding: 'utf8', maxBuffer: 40_000_000 }));
const source = readSource(values.source);
const baseline = readSource(values.baseline);
const snapshot = JSON.parse(await readFile(values.snapshot, 'utf8'));
const index = JSON.parse(await readFile(values.index, 'utf8'));
const plan = buildOperationalReferences({ source, baseline, snapshot, index,
  sourceName: values.source.split('/').at(-1), archiveSha256: createHash('sha256').update(await readFile(values.source)).digest('hex') });
const validation = await rehearseOperationalReferences({ plan, snapshot, index, baseline });
const sql = operationalReferenceSql(plan);
const directory = resolve(values.out);
// New directory, private files, and no apply option. This script never contacts Supabase.
await mkdir(directory, { mode: 0o700 });
const save = (name, value) => writeFile(resolve(directory, name), value, { mode: 0o600, flag: 'wx' });
await save('plan.json', JSON.stringify(plan));
await save('recovery.sql', sql);
const summary = { expectedRevision: plan.expectedRevision, counts: plan.counts, sourceRows: plan.sourceRows.length, sourceTotalRows: plan.sourceTotalRows,
  deferred: plan.deferred, ...validation, sqlSha256: createHash('sha256').update(sql).digest('hex'), remoteWrites: 0 };
await save('validation.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ directory, ...summary }, null, 2));
