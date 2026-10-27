import { expect, test, type Page } from '@playwright/test';
import { authenticateFixture } from './persistent-fixture';
import { attendanceFixture, attendanceId as a } from './attendance-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';

async function connected(page: Page) {
  await authenticateFixture(page);
  const role = ROLES.DEL;
  const f = attendanceFixture(securityContext(role, { roleCode: 'DEL', studentId: a.student, personId: uuid(700), teacherId: null,
    grants: [{ role_code: 'DEL', role_name: role, site_id: null, academic_year_id: null, group_id: null }],
  }), true);
  await page.route('**/api/session', route => route.fulfill({ json: { accountId: uuid(900), name: 'Élise Étudiante', email: 'delegate@example.test', role, availableRoles: [role], capabilities: { [role]: { permissions: ROLE_ACCESS[role].permissions, globalAccess: true } }, studentId: a.student, teacherId: null, matricule: 'ETU-PRES-001', mustChangePassword: false } }));
  await page.route('**/api/campus', route => route.fulfill({ json: { ...f.snapshot, academicContext: { currentYearId: id.year, selectedYearId: id.year, selection: 'current', years: f.snapshot.tables.academic_years } } }));
  await page.route('**/api/attendances*', async route => {
    const request = route.request();
    const input = new Request(request.url(), { method: request.method(), headers: request.headers(), ...(request.method() === 'POST' ? { body: request.postData()! } : {}) });
    const response = request.method() === 'POST' ? await f.api.POST(input) : await f.api.GET(input);
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  await page.goto('/academique/presences');
  return f;
}
for (const width of [390, 1440]) {
  test(`Le délégué fait l’appel et émarge son professeur à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const f = await connected(page);
    await expect(page.getByRole('heading', { name: 'Feuilles de présence', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Justificatifs', exact: true })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Séance', exact: true }).locator('option')).toHaveCount(2);
    await page.getByRole('button', { name: 'Saisir ou corriger les présences', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Émargement des étudiants', exact: true });
    const status = dialog.getByRole('combobox', { name: 'Présence de Élise Étudiante', exact: true });
    await expect(status.locator('option[value="DISPENSE"]')).toHaveAttribute('disabled', '');
    await status.selectOption('PRESENT');
    await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Appel effectué en classe');
    await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(f.transactions).toHaveLength(0);
    await dialog.getByRole('button', { name: /^Confirmer :/ }).click();
    await expect(dialog).not.toBeVisible();
    expect(f.transactions).toHaveLength(1);
    await page.getByRole('button', { name: 'Enregistrer la présence enseignante', exact: true }).click();
    const teacher = page.getByRole('dialog', { name: 'Présence enseignante', exact: true });
    await teacher.getByLabel('Arrivée enseignante', { exact: true }).fill('2026-11-01T08:00');
    await teacher.getByLabel('Départ enseignant', { exact: true }).fill('2026-11-01T10:00');
    await teacher.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(f.transactions).toHaveLength(1);
    await teacher.getByRole('button', { name: /^Confirmer :/ }).click();
    await expect(teacher).not.toBeVisible();
    expect(f.transactions).toHaveLength(2);
    expect(f.transactionCalls.every(call => call.name === 'escen_delegate_attendance_transaction')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/delegate-attendance/presences-${width}.png`, fullPage: true });
  });
}
