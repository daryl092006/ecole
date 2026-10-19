import { expect, test, type Page } from '@playwright/test';
import { getAvailableTabs, isRouteAllowed } from '../../src/permissions/navigation';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { ROLES, type Permission, type RoleName } from '../../src/types/permissions';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { uuid } from './security-fixture';

const href = '/mon-espace/epreuves';
const links = (page: Page) => page.locator(`a[href="${href}"]`);

test('Le parcours candidat dépend du rôle personnel, même avec toutes les permissions IT', () => {
  for (const role of Object.values(ROLES)) {
    const allowed = role === ROLES.STUD || role === ROLES.DEL;
    for (const permissions of [undefined, ROLE_ACCESS[role].permissions, ['exam.take'] as Permission[]]) {
      const pages = getAvailableTabs(role, permissions).flatMap(tab => tab.subTabs);
      expect(pages.some(page => page.id === 'espace_exams'), `${role}, permissions ${String(permissions)}`).toBe(allowed);
    }
    expect(isRouteAllowed(href, role)).toBe(allowed);
  }
  expect(getAvailableTabs(ROLES.STUD, []).flatMap(tab => tab.subTabs).some(page => page.id === 'espace_exams')).toBe(false);
  expect(isRouteAllowed('/academique/examens', ROLES.IT)).toBe(true);
});

async function install(page: Page, role: RoleName, availableRoles: RoleName[] = [role]) {
  const { problems } = await installResponsiveAudit(page, role === ROLES.IT ? 'staff' : 'student');
  if (role === ROLES.DEL || availableRoles.length > 1) {
    await page.route('**/api/session', route => route.fulfill({ json: {
      accountId: uuid(900), name: 'Compte personnel test', email: 'account@example.test',
      role, availableRoles, studentId: uuid(600), teacherId: null, matricule: 'ESCEN-TEST-001', mustChangePassword: false,
      capabilities: Object.fromEntries(availableRoles.map(value => [value, { permissions: ROLE_ACCESS[value].permissions, globalAccess: value === ROLES.IT }])),
    } }));
  }
  return { problems };
}

for (const width of [390, 1440]) {
  test(`Informaticien : aucun lien candidat, accès direct refusé, gestion conservée à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { problems } = await install(page, ROLES.IT);
    const reads: string[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/exam-attempts') reads.push(request.url()); });
    await page.goto('/mon-espace');
    await expect(page.locator('main h1')).toBeVisible();
    await expect(links(page)).toHaveCount(0);
    await page.goto(href);
    await expect(page.getByRole('heading', { name: 'Accès refusé', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mes épreuves en ligne', exact: true })).toHaveCount(0);
    expect(reads).toEqual([]);
    await page.goto('/academique/examens');
    await expect(page.getByRole('heading', { name: 'Examens', exact: true })).toBeVisible();
    expect(problems).toEqual([]);
  });

  for (const role of [ROLES.STUD, ROLES.DEL]) {
    test(`${role} : lien et parcours personnel conservés à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { problems } = await install(page, role);
      await page.goto('/mon-espace');
      await expect(page.locator('main h1')).toBeVisible();
      await expect.poll(() => links(page).count()).toBeGreaterThan(0);
      await page.goto(href);
      await expect(page.getByRole('heading', { name: 'Mes épreuves en ligne', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Commencer l’épreuve', exact: true })).toBeVisible();
      expect(problems).toEqual([]);
    });
  }

  test(`Compte Étudiant et IT : le changement de rôle retire le parcours candidat à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page, ROLES.STUD, [ROLES.STUD, ROLES.IT]);
    await page.goto(href);
    await expect(page.getByRole('heading', { name: 'Mes épreuves en ligne', exact: true })).toBeVisible();
    await page.locator('.account-summary').click();
    await page.locator('#active-role').selectOption({ label: ROLES.IT });
    await expect(page).toHaveURL(/\/mon-espace$/);
    await expect(links(page)).toHaveCount(0);
    if (!await page.locator('#active-role').isVisible()) await page.locator('.account-summary').click();
    await page.locator('#active-role').selectOption({ label: ROLES.STUD });
    await expect.poll(() => links(page).count()).toBeGreaterThan(0);
    await page.goto(href);
    await expect(page.getByRole('heading', { name: 'Mes épreuves en ligne', exact: true })).toBeVisible();
  });
}
