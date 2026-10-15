import { CRUD_CATALOG } from '@/data/crudCatalog';
import assert from 'node:assert/strict';
import { catalogTaskOrder, catalogTaskNeedsYear } from './catalogDependencyService';
import type { CatalogSnapshot } from '@/types/persistence';

export async function verifyCatalogDependencies() {
  const tables: CatalogSnapshot['tables'] = { academic_years: [{ id: 'YEAR' }] };
  const load = async () => ({ revision: 1, tables });
  assert.deepEqual((await catalogTaskOrder('academic_offerings', load)).map(task => task.collection), ['programs', 'cycles', 'levels', 'curricula', 'academic_offerings']);
  tables.programs = [{ id: 'P' }]; tables.cycles = [{ id: 'C' }];
  assert.deepEqual((await catalogTaskOrder('academic_offerings', load)).map(task => task.collection), ['levels', 'curricula', 'academic_offerings']);
  tables.levels = [{ id: 'L' }]; tables.curricula = [{ id: 'M' }];
  assert.deepEqual((await catalogTaskOrder('academic_offerings', load)).map(task => task.collection), ['academic_offerings']);
  assert.deepEqual((await catalogTaskOrder('annual_fee_schedules', load)).map(task => task.collection), ['annual_fee_schedules']);
  for (const spec of CRUD_CATALOG) {
    const order = await catalogTaskOrder(spec.key, async () => ({ revision: 1, tables: {} }));
    const keys = order.map(task => task.collection);
    for (const task of order) for (const field of CRUD_CATALOG.find(item => item.key === task.collection)!.fields) {
      if (field.reference && field.required !== false) assert.ok(keys.indexOf(field.reference) < keys.indexOf(task.collection), `${field.reference} doit précéder ${task.collection}`);
    }
  }
  assert.equal(catalogTaskNeedsYear('rooms'), false);
  assert.equal(catalogTaskNeedsYear('curriculum_components'), true);
  assert.equal(catalogTaskNeedsYear('group_offerings'), true);
  await assert.rejects(catalogTaskOrder('rooms', async () => { throw new Error('Accès refusé'); }), /Accès refusé/);
  console.log('Parcours : bases indépendantes en premier, références facultatives non bloquantes et année explicite.');
}
