import { expect, test } from '@playwright/test';
import { financialProjectionFixture } from './financial-projections-fixture';
import { securityContext, securityIds as id } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

for (const [role, roleCode] of [[ROLES.IT, 'IT'], [ROLES.RAF, 'RAF']] as const) test(`Projection nette du dossier pour ${role} : remboursements, avoirs et année isolés`, async () => {
  const fixture = financialProjectionFixture(securityContext(role, { roleCode }));
  const response = await fixture.get();
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  const data = await response.json();
  expect(data.paid).toBe(300); expect(data.contracts[0].amount).toBe(900);
  expect(data.payments).toHaveLength(3);
  expect(data.payments.map((row: { reference: string }) => row.reference)).not.toContain('PAY-OTHER-YEAR');
  const previous = await (await fixture.get(id.otherYear)).json();
  expect(previous.paid).toBe(6000); expect(previous.contracts[0].amount).toBe(19000);
  expect(fixture.transactions).toEqual([]);
});

test('Projection financière interdite sans finance.view : aucun montant divulgué', async () => {
  const fixture = financialProjectionFixture(securityContext(ROLES.IT, { permissions: ['student.view'] }));
  const response = await fixture.get(); expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.paid).toBe(0); expect(data.contracts).toEqual([]); expect(data.payments).toEqual([]);
});

test('Projection hors périmètre : aucune fuite des remboursements ou avoirs', async () => {
  const fixture = financialProjectionFixture(securityContext(ROLES.RAF, { roleCode: 'RAF', grants: [{ role_code: 'RAF', role_name: ROLES.RAF, site_id: id.otherSite, academic_year_id: id.year, group_id: null }] }));
  expect((await fixture.get()).status).toBe(404);
  expect(fixture.transactions).toEqual([]);
});
