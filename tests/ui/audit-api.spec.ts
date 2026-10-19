import { expect, test } from '@playwright/test';
import { auditRouteFixture, auditAccountId, auditYearId } from './audit-fixture';
import { ROLES } from '../../src/types/permissions';

test('Export : permission dédiée exigée avant les lectures, consultation conservée', async () => {
  const fixture = auditRouteFixture({ exportPermission: false });
  expect((await fixture.get('?mode=export')).status).toBe(403);
  expect(fixture.calls).toEqual([]);
  expect((await fixture.get()).status).toBe(200);
  const allowed = await auditRouteFixture().get('?mode=export&offset=50');
  expect(allowed.status).toBe(200);
  expect(await allowed.json()).toMatchObject({ revision: 1, offset: 50 });
  expect((await auditRouteFixture().get('?mode=backup')).status).toBe(400);
});

test('Journal : session, rôle, permission et attribution globale obligatoires', async () => {
  for (const [options, status] of [[{ authenticated: false }, 401], [{ role: ROLES.DGA }, 403], [{ role: ROLES.STUD }, 403], [{ global: false }, 403], [{ permission: false }, 403]] as const) {
    const fixture = auditRouteFixture(options);
    expect((await fixture.get()).status).toBe(status);
    expect(fixture.calls).toEqual([]);
  }
});

for (const role of [ROLES.IT, ROLES.DG]) test(`Journal : filtres et identité serveur transmis pour ${role}`, async () => {
  const fixture = auditRouteFixture({ role });
  const response = await fixture.get('?source=current&offset=50&query=versement&author=Jean&table=payments&action=UPDATE&start=2026-10-01&end=2026-10-31');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(fixture.calls.at(-1)).toMatchObject({ name: 'escen_audit_journal_page', args: {
    p_actor_id: auditAccountId, p_role_code: role === ROLES.IT ? 'IT' : 'DG', p_offset: 50,
    p_query: 'versement', p_author: 'Jean', p_table: 'payments', p_action: 'UPDATE',
    p_start: '2026-10-01', p_end: '2026-10-31', p_year_id: auditYearId,
    p_scope: { ids: { payments: ['PAY1'], enrollments: ['N1'] }, references: { payments: { enrollment_id: 'enrollments' } } },
  } });
});

test('Journal : filtres invalides et paramètres de privilège injectés refusés', async () => {
  for (const query of ['?source=private', '?offset=-1', '?offset=1.5', '?query=' + 'x'.repeat(161), '?start=2026-10-31&end=2026-10-01', '?start=invalid', '?p_scope={}', '?p_actor_id=other']) {
    const fixture = auditRouteFixture();
    expect((await fixture.get(query)).status).toBe(400);
    expect(fixture.calls).toEqual([]);
  }
});

test('Journal : année non autorisée refusée et Toutes les années explicitement transmises', async () => {
  const fixture = auditRouteFixture();
  expect((await fixture.get('', '10000000-0000-4000-8000-000000000099')).status).toBe(403);
  expect(fixture.calls.some(call => call.name === 'escen_audit_journal_page')).toBe(false);
  expect((await fixture.get('?source=history', 'all')).status).toBe(200);
  expect(fixture.calls.at(-1)?.args).toMatchObject({ p_source: 'history', p_year_id: null, p_scope: {} });
});

test('Journal : RPC absente signalée comme erreur et non comme liste vide', async () => {
  const response = await auditRouteFixture({ unavailable: true }).get();
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain('temporairement indisponible');
});
