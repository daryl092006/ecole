import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { transcriptPrintHtml, fitTranscriptToPage } from '../../src/utils/printTranscript';
import type { TranscriptDocument } from '../../src/services/transcriptDocumentService';

const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' };
const semesterId = '10000000-0000-4000-8000-000000000002';
const documentContent = (count: number): TranscriptDocument => ({
  reference: 'REL-RECETTE', issuedAt: new Date().toISOString(), institution: { name: 'ESCEN', approval: 'N° 0102/2021/MESR/SG/DES', footer: 'Coordonnées de l’établissement enregistrées dans le document de recette' },
  student: { name: 'Étudiante de recette', matricule: 'RECETTE-001', birthDate: '2000-01-01', birthPlace: 'Lomé' },
  academicYear: '2025-2026', level: 'Master', program: 'Finance digitale', city: 'Lomé', director: 'Signature de recette',
  semesters: [1, 2].map(semester => ({ name: `Semestre ${semester}`, rows: Array.from({ length: count }, (_, i) => ({ code: `ECN2${semester}${String(i + 1).padStart(2, '0')}`, name: i % 3 ? `Enseignement de recette ${i + 1}` : 'Solution digitale appliquée au secteur financier et à l’agriculture : transformations et perspectives', credits: 3, average: i === 0 ? null : 14, validated: i === 0 ? null : true })), totalCredits: count * 3, earnedCredits: (count - 1) * 3 })),
  totalCredits: count * 6, earnedCredits: (count - 1) * 6, average: 14, mention: 'Bien',
});

test('Création : code automatique, récapitulatif puis enregistrement avec le semestre et les crédits', async ({ page }) => {
  await authenticateFixture(page);
  let campusReads = 0;
  await page.route('**/api/campus', route => { campusReads++; return route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, ...tables }, academicContext: { selection: 'current', selectedYearId: year.id, currentYearId: year.id, years: [year] } } }); });
  const tables = {
    programs: [{ id: 'P', name: 'Finance Digitale' }], academic_years: [year], subjects: [{ id: 'OLD', name: 'Ancienne matière', code: 'ECN2101', academic_year_id: year.id }],
    cycles: [{ id: 'C', code: 'MASTER', name: 'Master' }], levels: [{ id: 'L', cycle_id: 'C', name: 'Master 1', position: 1 }],
    curricula: [{ id: 'CUR', program_id: 'P', level_id: 'L', name: 'Finance Digitale · Master 1', status: 'DRAFT' }],
    curriculum_semesters: [{ id: semesterId, curriculum_id: 'CUR', name: 'Semestre 1', position: 1 }], teaching_units: [],
  };
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/catalog/**', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { revision: 1, tables, historyLinks: [] } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { id: 'CREATED', revision: 2 } });
  });
  await page.goto('/academique/filieres?collection=subjects');
  await page.getByLabel('1. Groupe').selectOption('P');
  await page.getByLabel('2. Semestre').selectOption(semesterId);
  await page.getByRole('button', { name: 'Ajouter une matière', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Finance digitale');
  await dialog.getByLabel('Sigle de discipline REESAO (3 lettres)').fill('ecn');
  await expect(dialog.getByRole('combobox', { name: /^Semestre du programme/ })).toHaveCount(0);
  await dialog.getByLabel('Crédits', { exact: true }).fill('3.75');
  await dialog.getByLabel('Coefficient', { exact: true }).fill('0.625');
  await expect(dialog.getByRole('textbox', { name: 'Code', exact: true })).toHaveValue('ECN2102');
  await expect(dialog.getByRole('textbox', { name: 'Code', exact: true })).toHaveAttribute('readonly', '');
  await dialog.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
  expect(writes).toHaveLength(0);
  await expect(dialog.getByRole('region', { name: 'Vérification avant' }).getByText('ECN2102', { exact: true })).toBeVisible();
  const readsBeforeSave = campusReads;
  await dialog.getByRole('button', { name: 'Confirmer l’enregistrement', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(writes[0].values).toMatchObject({ code: 'ECN2102', name: 'Finance digitale', academic_year_id: year.id, resao: { discipline: 'ECN', semester_id: semesterId, credits: 3.75, coefficient: 0.625 } });
  await expect.poll(() => campusReads).toBeGreaterThan(readsBeforeSave);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const count of [7, 20, 30]) test(`Le PDF avec ${count * 2} matières et des libellés longs tient sur une page A4`, async ({ page }) => {
  await page.goto('/connexion');
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  const origin = new URL(page.url()).origin;
  await page.setContent(transcriptPrintHtml(documentContent(count), styles, origin));
  await expect(page.locator('.transcript-sheet')).toHaveCSS('height', /1043/);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(img => img.decode()));
  });
  // Evaluate the production function with the browser's Document.
  await page.evaluate(`(${fitTranscriptToPage.toString()})(document)`);
  expect(await page.locator('.transcript-table tbody tr:not(.transcript-semester):not(.transcript-total)').count()).toBe(count * 2);
  const contained = await page.evaluate(() => {
    const page = document.querySelector('.transcript-sheet')!.getBoundingClientRect();
    const content = document.querySelector('.transcript-content')!.getBoundingClientRect();
    return content.bottom <= page.bottom && content.right <= page.right && Math.abs((content.left + content.right) / 2 - (page.left + page.right) / 2) < 1;
  });
  expect(contained).toBe(true);
  const footerPosition = await page.evaluate(() => {
    const sheet = document.querySelector('.transcript-sheet')!.getBoundingClientRect();
    const footer = document.querySelector('.transcript-page-footer')!.getBoundingClientRect();
    const content = document.querySelector('.transcript-content')!.getBoundingClientRect();
    return { bottomGap: Math.abs(sheet.bottom - footer.bottom), separated: content.bottom < footer.top };
  });
  expect(footerPosition.bottomGap).toBeLessThan(1);
  expect(footerPosition.separated).toBe(true);
  const structure = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const title = rect('.transcript-title-band'), program = rect('.transcript-program'), identity = rect('.transcript-identity'), table = rect('.transcript-table');
    return { formationRight: program.left > identity.right, identityAlignedWithFormation: Math.abs(identity.top - program.top) < 1, tableBelowIdentity: table.top > identity.bottom, yearBesideTitle: rect('.transcript-title-band p').left > title.left };
  });
  expect(structure).toEqual({ formationRight: true, identityAlignedWithFormation: true, tableBelowIdentity: true, yearBesideTitle: true });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await fs.mkdir('tmp/screenshots/transcripts', { recursive: true });
  await fs.writeFile(`tmp/screenshots/transcripts/releve-${count * 2}-matieres.pdf`, pdf);
  if (count === 7) await page.screenshot({ path: 'tmp/screenshots/transcripts/releve-master.png', fullPage: true });
  if (count === 20) await page.screenshot({ path: 'tmp/screenshots/transcripts/releve-40-matieres.png', fullPage: true });
});

test('Impression connectée : un relevé incomplet reste bloqué sans inventer les résultats', async ({ page }) => {
  await authenticateFixture(page);
  await page.route('**/api/transcripts/*', route => route.fulfill({ status: 409, json: { error: 'Ce relevé ne contient pas les détails figés nécessaires à son impression.' } }));
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, generated_documents: [{ id: 'DOC', student_id: 'S1', kind: 'RELEVE', decision_id: 'D', reference: 'REL-INCOMPLET', issued_at: '2026-09-09', content_snapshot: { average: 14 } }] } } }));
  await page.goto('/etudiants/cartes');
  await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Documents établis', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'REL-INCOMPLET' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await page.getByRole('button', { name: 'Imprimer le relevé · A4, une page' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('détails figés');
  expect(page.frames()).toHaveLength(1);
});

test('Le bouton connecté prépare le relevé complet et déclenche son impression', async ({ page }) => {
  await authenticateFixture(page);
  let transcriptReads = 0;
  const freshDocument = { ...documentContent(7), issuedAt: '2027-11-03T23:30:00-04:00', student: { name: 'Identité du document serveur', matricule: 'DOSSIER-SERVEUR' }, city: 'Kara', director: 'Responsable enregistré', signatoryTitle: 'La Directrice Académique' };
  await page.route('**/api/transcripts/*', route => {
    transcriptReads++;
    expect(route.request().headers().authorization).toBe('Bearer fixture-auth-token');
    expect(route.request().headers()['x-escen-role']).toBe('Informaticien');
    expect(route.request().headers()['x-escen-year']).toBeTruthy();
    return route.fulfill({ json: freshDocument });
  });
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, generated_documents: [{ id: 'DOC', student_id: 'S1', kind: 'RELEVE', decision_id: 'D', reference: 'REL-RECETTE', issued_at: '2026-09-09', content_snapshot: documentContent(7) }] } } }));
  await page.goto('/etudiants/cartes');
  await page.getByRole('button', { name: 'Consulter le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Documents établis', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'REL-RECETTE' }).getByRole('button', { name: 'Ouvrir le détail', exact: true }).click();
  await page.evaluate(() => {
    new MutationObserver(() => {
      const frame = document.querySelector<HTMLIFrameElement>('.transcript-print-frame');
      if (frame?.contentWindow) frame.contentWindow.print = () => { document.documentElement.dataset.transcriptPrinted = 'true'; };
    }).observe(document.body, { childList: true });
  });
  await page.getByRole('button', { name: 'Imprimer le relevé · A4, une page' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-transcript-printed', 'true');
  const frame = page.frameLocator('.transcript-print-frame');
  await expect(frame.getByRole('heading', { name: /RELEV[EÉ] DE NOTES/ })).toHaveCount(1);
  await expect(frame.locator('.transcript-content')).toHaveCSS('transform', /matrix/);
  await expect(frame.locator('.transcript-reference')).toContainText('REL-RECETTE');
  expect(transcriptReads).toBe(1);
  await expect(frame.locator('.transcript-identity')).toContainText('Identité du document serveur');
  await expect(frame.locator('.transcript-identity')).toContainText('DOSSIER-SERVEUR');
  await expect(frame.locator('.transcript-signature')).toContainText('Kara, le 04 novembre 2027');
  await expect(frame.locator('.transcript-signature')).toContainText('Responsable enregistré');
  await expect(frame.locator('.transcript-signature')).toContainText('La Directrice Académique');
  await expect(frame.locator('.transcript-signature')).not.toContainText('Signature de recette');
});


test('Comparaison visuelle Master FD avec les treize matières du modèle', async ({ page }) => {
  const content = documentContent(7);
  const subjects = [
    ['Généralité sur la Finance Digitale', "Généralité sur la Digitalisation et l'économie Numérique", 'Opération Mobile Money', 'Introduction à la transformation digitale', 'Interopérabilité et Intégration en Finance Digitale', 'Réseau de Distribution & Marchand', 'Anglais Commercial'],
    ['Solution Digitale Appliquée au secteur Financiers / à l’Agriculture', 'Digitalisation des Transferts', 'Digitalisation des paiement Internationaux', "Méthodologie d’évaluation des projets Digitaux", 'Management du changement', "Méthodologie de gestion d’un projet numérique"],
  ];
  content.semesters = subjects.map((names, index) => ({ name: `Semestre ${index + 1}`, rows: names.map((name, i) => ({ code: `ECN2${index + 1}${String(i + 1).padStart(2, '0')}`, name, credits: index === 0 ? i > 4 ? 5 : 4 : 5, average: 14, validated: true })), totalCredits: 30, earnedCredits: 30 }));
  content.totalCredits = 60; content.earnedCredits = 60;
  content.program = 'Finance Digitale';
  await page.goto('/connexion');
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  await page.setContent(transcriptPrintHtml(content, styles, new URL(page.url()).origin));
  await page.evaluate(async () => { document.body.getBoundingClientRect(); await document.fonts.ready; await Promise.all(Array.from(document.images).map(img => img.decode())); });
  await page.evaluate(`(${fitTranscriptToPage.toString()})(document)`);
  await expect(page.locator('.transcript-sheet h1')).toHaveCSS('font-family', /Transcript Book Antiqua/);
  const alignment = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const sheet = rect('.transcript-sheet'), header = rect('.transcript-header');
    return {
      headerWidth: header.width / sheet.width,
      titleWidth: rect('.transcript-title-band').width / header.width,
      tableWidth: rect('.transcript-table').width / header.width,
      identityLeft: Math.abs(rect('.transcript-identity').left - header.left),
      programRight: Math.abs(rect('.transcript-program').right - header.right),
      sameTop: Math.abs(rect('.transcript-identity').top - rect('.transcript-program').top),
      centered: Math.abs((header.left + header.right) / 2 - (sheet.left + sheet.right) / 2),
    };
  });
  expect(alignment.headerWidth).toBeGreaterThan(0.99);
  expect(alignment.titleWidth).toBeCloseTo(1, 2);
  expect(alignment.tableWidth).toBeCloseTo(1, 2);
  expect(alignment.identityLeft).toBeLessThan(1);
  expect(alignment.programRight).toBeLessThan(1);
  expect(alignment.sameTop).toBeLessThan(1);
  expect(alignment.centered).toBeLessThan(1);
  const grid = await page.evaluate(() => {
    const content = document.querySelector<HTMLElement>('.transcript-content')!;
    const cells = [...document.querySelectorAll<HTMLTableRowElement>('.transcript-table tr')].flatMap(row => [...row.cells]);
    return { scale: new DOMMatrix(getComputedStyle(content).transform).a, borders: [...new Set(cells.map(cell => getComputedStyle(cell).borderTopWidth))], edge: getComputedStyle(document.querySelector('.transcript-total-spacer')!).borderLeftColor };
  });
  expect(grid.scale).toBe(1);
  expect(grid.borders).toEqual(['1px']);
  expect(grid.edge).toBe('rgb(0, 0, 0)');
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await fs.mkdir('tmp/screenshots/transcripts', { recursive: true });
  await fs.writeFile('tmp/screenshots/transcripts/releve-master-fd.pdf', pdf);
  await page.screenshot({ path: 'tmp/screenshots/transcripts/releve-master-fd.png', fullPage: true });
});


test('40 matières sans réduction : vérifier la pagination naturelle', async ({ page }) => {
  await page.goto('/connexion');
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  await page.setContent(transcriptPrintHtml(documentContent(20), styles, new URL(page.url()).origin));
  await page.evaluate(async () => {
    document.body.getBoundingClientRect();
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(img => img.decode()));
  });
  // No fitTranscriptToPage: preserve the actual type size and page width.
  // Extend the sheet over enough A4 pages so overflow cannot be hidden or clipped.
  const natural = await page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('.transcript-sheet')!;
    const content = document.querySelector<HTMLElement>('.transcript-content')!;
    const footer = document.querySelector<HTMLElement>('.transcript-page-footer')!;
    const availableHeight = sheet.clientHeight - footer.offsetHeight - 12;
    const contentHeight = content.scrollHeight;
    const pages = Math.ceil((contentHeight + footer.offsetHeight + 12) / sheet.clientHeight);
    const result = { fitsOnOnePage: contentHeight <= availableHeight, contentHeight, availableHeight, pages, transform: getComputedStyle(content).transform, fontSize: getComputedStyle(document.querySelector('.transcript-table td')!).fontSize };
    sheet.style.height = `${pages * 276 - 1}mm`;
    sheet.style.breakInside = 'auto';
    return result;
  });
  expect(natural.transform).toBe('none');
  expect(natural.fontSize).toBe('12px');
  expect(await page.locator('.transcript-table tbody tr:not(.transcript-semester):not(.transcript-total)').count()).toBe(40);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pdfPages = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
  expect(pdfPages).toBe(natural.pages);
  await fs.mkdir('tmp/screenshots/transcripts', { recursive: true });
  await fs.writeFile('tmp/screenshots/transcripts/releve-40-matieres-sans-reduction.pdf', pdf);
  await fs.writeFile('tmp/screenshots/transcripts/releve-40-matieres-sans-reduction.json', JSON.stringify({ ...natural, pdfPages }, null, 2));
});


test('La route des relevés exige une session réelle', async ({ request }) => {
  const response = await request.get('/api/transcripts/00000000-0000-4000-8000-000000000001');
  expect(response.status()).toBe(401);
});
