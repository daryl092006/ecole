import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import type { RelationalSnapshot } from '../../src/types/persistence';

for (const width of [390, 820, 1440]) {
  test(`Présences du dossier : liste personnelle et état vide simple à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    const campusRead = page.waitForResponse(response => new URL(response.url()).pathname === '/api/campus');
    await page.goto('/etudiants/ESCEN-TEST-001');
    const campus = await (await campusRead).json() as RelationalSnapshot;
    const otherAttendance = { ...campus.tables.attendances[0], id: 'other-attendance', enrollment_id: 'other-enrollment', status: 'RETARD' };
    let records = [...campus.tables.attendances, otherAttendance];
    await page.route('**/api/campus', route => route.fulfill({ json: { ...campus, tables: { ...campus.tables, attendances: records } } }));
    await page.reload();
    const open = () => page.getByRole('button', { name: 'Assiduité et présences', exact: true }).click();
    await open();
    const heading = page.getByRole('heading', { name: 'Présences', exact: true });
    await expect(heading).toBeVisible();
    await expect(page.locator('main table thead th')).toHaveText(['Date', 'Matière', 'Présence', 'Justificatif']);
    await expect(page.locator('main table tbody tr')).toHaveCount(1);
    await expect(page.locator('main table')).toContainText('Absent');
    await expect(page.locator('main table')).toContainText('En attente');
    await expect(page.locator('main table')).not.toContainText('En retard');
    await expect(page.getByRole('combobox', { name: 'Consulter', exact: true })).toHaveCount(0);
    await expect(page.locator('main').getByRole('searchbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Exporter les/ })).toHaveCount(0);
    await expect(page.getByText(/La saisie étudiante et enseignante est connectée/)).toHaveCount(0);
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/screenshots/student-attendance/${width}/presences.png`, animations: 'disabled' });

    records = [otherAttendance];
    await page.reload();
    await open();
    await expect(page.getByText('Aucun pointage enregistré pour l’année consultée.', { exact: true })).toBeVisible();
    await expect(page.locator('main table')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Consulter', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Exporter les/ })).toHaveCount(0);
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/screenshots/student-attendance/${width}/aucun-pointage.png`, animations: 'disabled' });
    expect(problems).toEqual([]);
  });
}
