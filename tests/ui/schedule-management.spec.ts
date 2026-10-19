import { expect, test, type Locator, type Page } from '@playwright/test';
import { authenticateFixture, snapshot as baseSnapshot, historyCatalog, fixtureCapabilities, ACCOUNT_IDS } from './persistent-fixture';
import { ROLES } from '../../src/types/permissions';
import { scheduleFixture, attachScheduledExam } from './schedule-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';

async function connectedSchedule(page: Page, withExam = false) {
  await authenticateFixture(page);
  const fixture = scheduleFixture(securityContext(), true);
  if (withExam) attachScheduledExam(fixture);
  let reads = 0;
  await page.route('**/api/campus', route => {
    reads++;
    return route.fulfill({ json: { ...fixture.snapshot, tables: { ...baseSnapshot.tables, ...fixture.snapshot.tables, people: [...baseSnapshot.tables.people, ...fixture.snapshot.tables.people] },
      academicContext: { currentYearId: id.year, currentYearConfigured: true, selectedYearId: id.year, selection: 'current', years: fixture.snapshot.tables.academic_years } } });
  });
  await page.route('**/api/schedule', async route => {
    const request = route.request();
    const input = new Request('http://local.test/api/schedule', { method: request.method(), headers: request.headers(), ...(request.method() === 'POST' ? { body: request.postData()! } : {}) });
    const response = request.method() === 'POST' ? await fixture.api.POST(input) : await fixture.api.GET(input);
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return { ...fixture, campusReads: () => reads };
}
async function confirm(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Vérification avant enregistrement' })).toBeVisible();
  await dialog.getByRole('button', { name: /^Confirmer/ }).click();
  await expect(dialog).not.toBeVisible();
}
const selectInitial = (page: Page) => page.locator('.calendar-list-day, .calendar-day')
  .filter({ has: page.locator('time[datetime="2026-10-20"]') })
  .getByRole('button', { name: /08:00–10:00.*Groupe 1/ }).filter({ visible: true }).click();

for (const width of [390, 1440]) test(`Un seul calendrier et filtre des archives par groupe à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = await connectedSchedule(page);
  fixture.snapshot.tables.sessions = [];
  const records = [0, 1].map(index => ({ id: `ARCHIVE-${index}`, sourceId: `A${index}`, batchId: 'batch-fixture', status: 'PENDING', issues: [], values: {
    group_id: `G${index + 1}`, uv_id: 'UV1', debut: `2026-10-20T${index ? '10' : '08'}:00:00Z`, fin: `2026-10-20T${index ? '12' : '10'}:00:00Z`,
  } }));
  await page.route('**/api/history*', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('table')) return route.fulfill({ json: { table: 'emploi_du_temps', total: records.length, records, offset: 0, limit: 50 } });
    return route.fulfill({ json: { ...historyCatalog, datasets: historyCatalog.datasets.map(dataset => dataset.table === 'emploi_du_temps' ? { ...dataset, count: 2 } : dataset) } });
  });
  await page.goto('/academique/emploi-du-temps');
  await expect(page.getByRole('button', { name: 'Archives importées', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.calendar-toolbar')).toHaveCount(1);
  const group = page.getByRole('combobox', { name: 'Groupe', exact: true });
  await expect(group).toBeVisible();
  await expect(page.locator('.calendar-session:visible')).toHaveCount(2);
  await group.selectOption('batch-fixture:G1');
  await expect(page.locator('.calendar-session:visible')).toHaveCount(1);
  await expect(page.locator('.calendar-session:visible')).toContainText('08:00');
  await group.selectOption('batch-fixture:G2');
  await expect(page.locator('.calendar-session:visible')).toHaveCount(1);
  await expect(page.locator('.calendar-session:visible')).toContainText('10:00');
  await page.getByRole('button', { name: 'Planning de l’année', exact: true }).click();
  await expect(page.locator('.calendar-toolbar')).toHaveCount(1);
  await expect(page.locator('.calendar-session:visible')).toHaveCount(0);
  await expect(page.getByText('Aucune séance datée pour ces filtres.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Archives importées', exact: true }).click();
  await expect(page.locator('.calendar-toolbar')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Groupe', exact: true })).toBeVisible();
  expect(fixture.transactions).toEqual([]);
});

for (const readOnly of [false, true]) for (const width of [390, 1440]) test(`Planning par groupe, consultation seule=${readOnly}, à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = await connectedSchedule(page);
  const initial = fixture.snapshot.tables.sessions[0];
  fixture.snapshot.tables.sessions.push(
    { ...initial, id: uuid(971), assignment_id: id.assignment(1), group_id: id.otherGroup, teacher_id: uuid(21), starts_at: '2026-10-20T10:00:00Z', ends_at: '2026-10-20T12:00:00Z' },
    { ...initial, id: uuid(972), assignment_id: id.assignment(1), group_id: id.otherGroup, status: 'ANNULE', starts_at: '2026-10-21T10:00:00Z', ends_at: '2026-10-21T12:00:00Z' },
  );
  if (readOnly) await page.route('**/api/session', route => route.fulfill({ json: {
    capabilities: { ...fixtureCapabilities, [ROLES.IT]: { permissions: ['schedule.view'], globalAccess: true } },
    accountId: ACCOUNT_IDS[1], name: 'Jean Technique', email: 'it@example.test', role: ROLES.IT, availableRoles: [ROLES.IT], studentId: null, teacherId: null, matricule: null, mustChangePassword: false,
  } }));
  await page.goto('/academique/emploi-du-temps');
  const group = page.getByRole('combobox', { name: 'Groupe', exact: true });
  await expect(group).toBeVisible();
  await expect(page.locator('.calendar-toolbar')).toHaveCount(1);
  await group.selectOption(id.group);
  await expect(page.locator('.calendar-session:visible')).toHaveCount(1);
  await expect(page.locator('.calendar-session:visible')).toContainText('Groupe 1');
  if (!readOnly) await expect(page.getByText('Séances annulées ou reportées', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mois suivant', exact: true }).click();
  await expect(group).toHaveValue(id.group);
  await page.getByRole('button', { name: 'Mois précédent', exact: true }).click();
  await expect(page.locator('.calendar-session:visible')).toHaveCount(1);
  await page.screenshot({ path: `tmp/screenshots/annual-offerings/${width}/emploi-du-temps-groupe-${readOnly ? 'consultation' : 'gestion'}.png` });
  await group.selectOption(id.otherGroup);
  await expect(page.locator('.calendar-session:visible')).toHaveCount(readOnly ? 2 : 1);
  if (!readOnly) {
    await expect(page.getByText('Séances annulées ou reportées', { exact: true })).toBeVisible();
    await group.selectOption(id.otherSiteGroup);
    await expect(page.locator('.calendar-session:visible')).toHaveCount(0);
    await expect(page.locator('.calendar-toolbar')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Planning de l’année', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Afficher tous les groupes', exact: true }).click();
  await expect(group).toHaveValue('');
  await expect(page.locator('.calendar-session:visible')).toHaveCount(readOnly ? 3 : 2);
  expect(fixture.transactions).toEqual([]);
});

for (const width of [360, 390, 1440]) test(`Séance : créer, modifier, déplacer, remplacer et annuler à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const fixture = await connectedSchedule(page);
  await page.goto('/academique/emploi-du-temps');
  await page.getByRole('button', { name: 'Nouvelle séance', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Nouvelle séance', exact: true });
  await dialog.getByRole('combobox', { name: 'Affectation', exact: true }).selectOption(id.assignment(0));
  await dialog.getByRole('combobox', { name: 'Salle prévue', exact: true }).selectOption(uuid(950));
  await dialog.getByLabel('Début (heure de Lomé)', { exact: true }).fill('2026-10-21T08:00');
  await dialog.getByLabel('Fin (heure de Lomé)', { exact: true }).fill('2026-10-21T10:00');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Créneau approuvé par le responsable');
  if (width < 768) await expect(dialog.getByRole('button', { name: 'Vérifier les informations', exact: true })).toBeInViewport();
  await confirm(dialog);
  expect(fixture.transactions[0][0].record).toMatchObject({ starts_at: '2026-10-21T08:00:00.000Z', room_id: uuid(950) });
  await expect.poll(fixture.campusReads).toBeGreaterThan(1);
  await selectInitial(page);
  await page.getByRole('button', { name: 'Modifier la séance', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Modifier la séance', exact: true });
  await dialog.getByRole('combobox', { name: 'Salle prévue', exact: true }).selectOption(uuid(951));
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Salle mieux adaptée');
  await confirm(dialog);
  await selectInitial(page);
  await page.getByRole('button', { name: 'Déplacer la séance', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Déplacer la séance', exact: true });
  await dialog.getByLabel('Début (heure de Lomé)', { exact: true }).fill('2026-10-20T10:00');
  await dialog.getByLabel('Fin (heure de Lomé)', { exact: true }).fill('2026-10-20T12:00');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Décalage horaire validé');
  await confirm(dialog);
  const selectMoved = () => page.getByRole('button', { name: /10:00–12:00.*Groupe 1/ }).filter({ visible: true }).click();
  await selectMoved();
  await page.getByRole('button', { name: 'Remplacer l’enseignant', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Remplacer l’enseignant', exact: true });
  await dialog.getByRole('combobox', { name: 'Remplaçant', exact: true }).selectOption(uuid(21));
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Remplacement ponctuel confirmé');
  await confirm(dialog);
  await selectMoved();
  await page.getByRole('button', { name: 'Annuler la séance', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Annuler la séance', exact: true });
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Indisponibilité exceptionnelle');
  await confirm(dialog);
  expect(fixture.transactions).toHaveLength(5);
  expect(fixture.snapshot.tables.sessions.find(session => session.id === uuid(970))).toMatchObject({ status: 'ANNULE', replacement_teacher_id: uuid(21), room_id: uuid(951) });
  await page.getByText('Séances annulées ou reportées', { exact: true }).click();
  await expect(page.getByRole('button', { name: /20\/10\/2026.*ANNULE/ })).toBeVisible();
});

test('Période bloquée : périmètre, motif et récapitulatif à 390px', async ({ page }) => {
  const fixture = await connectedSchedule(page);
  await page.goto('/academique/emploi-du-temps');
  await page.getByRole('button', { name: 'Bloquer une période', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Bloquer une période', exact: true });
  await dialog.getByRole('textbox', { name: 'Intitulé', exact: true }).fill('Fermeture exceptionnelle');
  await dialog.getByRole('combobox', { name: 'Site', exact: true }).selectOption(id.site);
  await dialog.getByLabel('Début (heure de Lomé)', { exact: true }).fill('2026-10-22T00:00');
  await dialog.getByLabel('Fin (heure de Lomé)', { exact: true }).fill('2026-10-23T00:00');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Maintenance autorisée des locaux');
  await confirm(dialog);
  expect(fixture.transactions[0][0]).toMatchObject({ table: 'blocked_periods', record: { site_id: id.site, academic_year_id: id.year, reason: 'Maintenance autorisée des locaux' } });
  await page.getByText('Périodes bloquées (1)', { exact: true }).click();
  await expect(page.getByText('Fermeture exceptionnelle', { exact: true })).toBeVisible();
});

test('Formulaire modifié : protection de l’annulation et du clavier Échap', async ({ page }) => {
  const fixture = await connectedSchedule(page);
  await page.goto('/academique/emploi-du-temps');
  await page.getByRole('button', { name: 'Nouvelle séance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nouvelle séance', exact: true });
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Modification en cours');
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quitter sans enregistrer ?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la saisie', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Motif', exact: true })).toHaveValue('Modification en cours');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abandonner les modifications', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(fixture.transactions).toEqual([]);
});

test('Conflit : message dans le formulaire actif, champs verrouillés pendant l’appel', async ({ page }) => {
  const fixture = await connectedSchedule(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/schedule', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await gate;
    return route.fulfill({ status: 409, json: { error: 'Cet enseignant a déjà une séance sur ce créneau.' } });
  });
  await page.goto('/academique/emploi-du-temps');
  await selectInitial(page);
  await page.getByRole('button', { name: 'Remplacer l’enseignant', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Remplacer l’enseignant', exact: true });
  await dialog.getByRole('combobox', { name: 'Remplaçant', exact: true }).selectOption(uuid(21));
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Demande de remplacement');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  await dialog.getByRole('button', { name: /^Confirmer/ }).click();
  await expect(dialog.getByText('Enregistrement en cours…', { exact: true })).toBeVisible();
  await expect(dialog.locator('select')).toBeDisabled(); await expect(dialog.locator('textarea')).toBeDisabled();
  release();
  await expect(dialog.getByRole('alert')).toHaveText('Cet enseignant a déjà une séance sur ce créneau.');
  expect(fixture.transactions).toEqual([]);
});

for (const width of [360, 390, 1440]) test(`Épreuve liée : récapitulatif du déplacement coordonné à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const fixture = await connectedSchedule(page, true);
  await page.goto('/academique/emploi-du-temps');
  await selectInitial(page);
  await expect(page.getByRole('heading', { name: 'Épreuve d’analyse', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Déplacer la séance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Déplacer la séance', exact: true });
  await dialog.getByLabel('Début (heure de Lomé)', { exact: true }).fill('2026-10-21T08:00');
  await dialog.getByLabel('Fin (heure de Lomé)', { exact: true }).fill('2026-10-21T10:00');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Déplacement validé avant ouverture');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  const review = dialog.getByRole('region', { name: 'Vérification avant enregistrement' });
  await expect(review).toContainText('Épreuve d’analyse');
  const opening = review.locator('.review-values > div').filter({ hasText: 'Ouverture de l’épreuve (Lomé)' });
  await expect(opening).toContainText(/Avant : 20\/10\/2026.*08:15/);
  await expect(opening).toContainText(/21\/10\/2026.*08:15/);
  const closing = review.locator('.review-values > div').filter({ hasText: 'Fermeture de l’épreuve (Lomé)' });
  await expect(closing).toContainText(/21\/10\/2026.*09:45/);
  await expect(review).toContainText('60 minutes');
  await expect(review).toContainText('dans un seul enregistrement');
  expect(fixture.transactions).toEqual([]);
  expect(fixture.snapshot.tables.exam_deliveries[0].access_opens_at).toBe('2026-10-20T08:15:00Z');
  const confirm = dialog.getByRole('button', { name: /^Confirmer/ });
  if (width < 768) await expect(confirm).toBeInViewport();
  await confirm.click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.snapshot.tables.sessions[0].starts_at).toBe('2026-10-21T08:00:00.000Z');
  expect(fixture.snapshot.tables.exam_deliveries[0]).toMatchObject({ access_opens_at: '2026-10-21T08:15:00.000Z', access_closes_at: '2026-10-21T09:45:00.000Z', duration_minutes: 60 });
  expect(fixture.transactions).toHaveLength(1);
  await expect.poll(fixture.campusReads).toBeGreaterThan(1);
});

test('Épreuve liée : ouverture arrivée pendant la confirmation, refus visible et aucun horaire modifié', async ({ page }) => {
  const fixture = await connectedSchedule(page, true);
  await page.goto('/academique/emploi-du-temps');
  await selectInitial(page);
  await page.getByRole('button', { name: 'Déplacer la séance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Déplacer la séance', exact: true });
  await dialog.getByLabel('Début (heure de Lomé)', { exact: true }).fill('2026-10-21T08:00');
  await dialog.getByLabel('Fin (heure de Lomé)', { exact: true }).fill('2026-10-21T10:00');
  await dialog.getByRole('textbox', { name: 'Motif', exact: true }).fill('Demande arrivée avant ouverture');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  fixture.fail('Épreuve déjà ouverte : déplacement interdit');
  await dialog.getByRole('button', { name: /^Confirmer/ }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Épreuve déjà ouverte : déplacement interdit.');
  expect(fixture.transactions).toEqual([]);
  expect(fixture.snapshot.tables.sessions[0].starts_at).toBe('2026-10-20T08:00:00Z');
  expect(fixture.snapshot.tables.exam_deliveries[0].access_opens_at).toBe('2026-10-20T08:15:00Z');
  await dialog.getByRole('button', { name: 'Revenir aux informations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Abandonner les modifications', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
