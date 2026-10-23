import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { localBusinessFixture } from './local-business-fixture.mjs';
import { ROLES, type RoleName } from '../../src/types/permissions';

let local: Awaited<ReturnType<typeof localBusinessFixture>>;
test.beforeEach(async () => {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof localBusinessFixture }>;
  local = await (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
});
test.afterEach(async () => { await local?.close(); });

const revision = () => local.value('select revision as value from escen_private.portal_revision where singleton');
const request = (path: string, method = 'GET', body?: unknown, role: RoleName = ROLES.IT) => local.dispatch(new Request(`http://local.test/api/${path}`, {
  method, headers: { Authorization: 'Bearer fixture-auth-token', 'x-escen-role': role, 'x-escen-year': local.year.id, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}));
const save = async (key: string, values: object, id?: string) => request(`catalog/${key}${id ? `/${id}` : ''}`, id ? 'PATCH' : 'POST', { revision: await revision(), values, reason: 'Recette CRUD PostgreSQL' });

test('CRUD PostgreSQL : huit référentiels créés, relus, modifiés et archivés avec audit', async () => {
  const samples: [string, Record<string, unknown>][] = [
    ['programs', { code: 'AUDIT', name: 'Filière de recette', description: '' }],
    ['tracks', { code: 'AUDIT', name: 'Parcours de recette', program_id: local.programs[0].id }],
    ['rooms', { code: 'AUDIT', name: 'Salle de recette', capacity: 30 }],
    ['assets', { code: 'AUDIT', name: 'Équipement de recette', location: 'Bureau', status: 'DISPONIBLE' }],
    ['suppliers', { name: 'Fournisseur de recette', tax_identifier: '', email: 'fournisseur@example.test', phone: '90112233' }],
    ['academic_years', { code: 'AUDIT-2030', name: 'Année de recette', starts_on: '2030-01-01', ends_on: '2030-12-31' }],
    ['annual_payment_channels', { academic_year_id: local.year.id, name: 'Caisse CRUD supplémentaire', method: 'ESPECES' }],
    ['annual_fee_schedules', { academic_year_id: local.year.id, category: 'SCOLARITE', program_id: local.programs[1].id, level_id: local.level.id, delivery_mode: 'En ligne', amount: 123000 }],
  ];
  for (const [key, values] of samples) await test.step(key, async () => {
    const created = await save(key, values);
    const result = await created.json();
    expect(created.status, JSON.stringify(result)).toBe(201);
    const id = result.id;
    const read = async () => {
      const response = await request(`catalog/${key}`);
      expect(response.status).toBe(200);
      const { tables } = await response.json();
      return tables[key].find((row: { id: string }) => row.id === id);
    };
    expect(await read()).toMatchObject(values);
    const changed = 'name' in values ? { ...values, name: `${values.name} corrigé` } : { ...values, amount: 124000 };
    const updated = await save(key, changed, id);
    expect(updated.status, await updated.text()).toBe(200);
    expect(await read()).toMatchObject(changed);
    const before = await revision();
    expect((await request(`catalog/${key}/${id}`, 'PATCH', { revision: before - 1, values, reason: 'Version périmée refusée' })).status).toBe(409);
    expect(await revision()).toBe(before);
    expect((await request(`catalog/${key}/${id}`, 'DELETE', { revision: before, reason: 'Retrait motivé de recette' })).status).toBe(200);
    expect((await read()).archived_at).toBeTruthy();
    const audits = await local.value("select jsonb_agg(jsonb_build_object('action',action,'actor',actor_id,'reason',reason) order by happened_at) as value from escen_private.audit_events where table_name=$1 and entity_id=$2", [key, id]);
    expect(audits).toHaveLength(3);
    expect(audits.every((event: { actor: string }) => event.actor === local.account.id)).toBe(true);
    expect(audits.at(-1)).toMatchObject({ action: 'UPDATE', reason: 'Retrait motivé de recette' });
    expect((await save(key, values, id)).status).toBe(409);
  });
});

test('CRUD PostgreSQL : dossier étudiant, doublon, droits, révision et archivage sans perte', async () => {
  const person = { firstname: 'Marie', lastname: 'Recette CRUD', email: '', phone: '', gender: '', birthDate: '', nationality: '', address: '', city: '', country: '' };
  const path = 'students/CRUD-LOCAL-001';
  expect((await request('students', 'POST', { matricule: 'CRUD-LOCAL-001', person })).status).toBe(201);
  expect((await (await request(path)).json()).student).toMatchObject({ firstname: 'Marie', lastname: 'Recette CRUD' });
  expect((await request('students', 'POST', { matricule: 'crud-local-001', person })).status).toBe(409);
  const version = await revision();
  expect((await request(path, 'PATCH', { ...person, firstname: 'Marie corrigée', revision: version }, ROLES.MKT)).status).toBe(403);
  expect((await request(path, 'PATCH', { ...person, firstname: 'Marie corrigée', revision: version })).status).toBe(200);
  expect((await request(path, 'PATCH', { ...person, revision: version })).status).toBe(409);
  expect((await (await request(path)).json()).student.firstname).toBe('Marie corrigée');
  expect((await request(path, 'DELETE', { reason: 'Archivage de recette locale' })).status).toBe(200);
  expect((await request(path)).status).toBe(404);
  expect(await local.value("select count(*)::integer as value from escen.students s join escen.people p on p.id=s.person_id where s.matricule='CRUD-LOCAL-001' and s.archived_at is not null and p.firstname='Marie corrigée'")).toBe(1);
});

test('CRUD PostgreSQL : un lot de groupe trop grand est refusé avant toute écriture partielle', async () => {
  const offeringIds: string[] = [];
  for (let version = 2; version <= 101; version++) {
    const curriculum = await local.insert('curricula', { program_id: local.programs[0].id, level_id: local.level.id, version });
    const offering = await local.insert('academic_offerings', { academic_year_id: local.year.id, curriculum_id: curriculum.id, level_id: local.level.id });
    offeringIds.push(offering.id);
  }
  const before = await revision();
  const audits = await local.value('select count(*)::integer as value from escen_private.audit_events');
  const rpc = local.client.rpc.bind(local.client);
  let writes = 0;
  local.client.rpc = async (name: string, args = {}) => {
    if (name === 'escen_backend_transaction' && ++writes === 2) return { data: null, error: { code: '40001', message: 'Conflit injecté sur le second lot' } };
    return rpc(name, args);
  };
  const response = await save('groups', { name: 'Groupe atomique', academic_year_id: local.year.id, level_id: local.level.id, offering_ids: offeringIds });
  expect(await local.value("select count(*)::integer as value from escen.groups where name='Groupe atomique'")).toBe(0);
  expect(await revision()).toBe(before);
  expect(await local.value('select count(*)::integer as value from escen_private.audit_events')).toBe(audits);
  expect(response.status).toBe(400);
  expect(writes).toBe(0);
});
