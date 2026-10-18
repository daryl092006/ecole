import { expect, test } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import type { PersistentContext } from '../../src/types/persistence';
import { loadSecurityApi, securityContext, securityIds as id } from './security-fixture';

function repriseRoute(context: PersistentContext, unavailable = false) {
  const calls: string[] = [];
  const client = { rpc: async (name: string) => {
    calls.push(name);
    return unavailable ? { data: null, error: new Error('Service indisponible') } : { data: { reviewed: 3 }, error: null };
  } };
  const route = loadSecurityApi('app/api/reprise/route.ts', client, context) as { GET: (request: Request) => Promise<Response> };
  return { get: () => route.GET(new Request('http://local.test/api/reprise')), calls };
}

test('La reprise exige system.audit.view même pour IT et DG globaux', async () => {
  for (const role of [ROLES.IT, ROLES.DG]) {
    const context = securityContext(role);
    const route = repriseRoute({ ...context, permissions: context.permissions.filter(permission => permission !== 'system.audit.view') });
    expect((await route.get()).status).toBe(403);
    expect(route.calls).toEqual([]);
  }
});

test('La permission audit seule ne permet pas la reprise avec un accès limité', async () => {
  for (const scope of [{ site_id: id.site }, { academic_year_id: id.year }, { group_id: id.group }]) {
    const context = securityContext();
    const route = repriseRoute({ ...context, grants: [{ ...context.grants[0], ...scope }] });
    const response = await route.get();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('accès global');
    expect(route.calls).toEqual([]);
  }
});

test('Plusieurs habilitations partielles ne constituent pas un accès global', async () => {
  const context = securityContext();
  for (const grants of [[], [{ ...context.grants[0], site_id: id.site }, { ...context.grants[0], group_id: id.group }]]) {
    const route = repriseRoute({ ...context, grants });
    expect((await route.get()).status).toBe(403);
    expect(route.calls).toEqual([]);
  }
});

test('La restriction aux rôles de direction générale et IT reste appliquée', async () => {
  const route = repriseRoute(securityContext(ROLES.DA, { permissions: ['system.audit.view'] }));
  expect((await route.get()).status).toBe(403);
  expect(route.calls).toEqual([]);
});

test('IT et DG avec permission audit et accès global consultent la reprise sans cache', async () => {
  for (const role of [ROLES.IT, ROLES.DG]) {
    const route = repriseRoute(securityContext(role));
    const response = await route.get();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ reviewed: 3 });
    expect(route.calls).toEqual(['escen_import_overview']);
  }
});

test('Une indisponibilité SQL reste signalée après autorisation', async () => {
  const route = repriseRoute(securityContext(), true);
  expect((await route.get()).status).toBe(503);
  expect(route.calls).toEqual(['escen_import_overview']);
});
