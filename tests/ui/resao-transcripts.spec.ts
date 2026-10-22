import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { transcriptPrintHtml, fitTranscriptToPage } from '../../src/utils/printTranscript';
import type { TranscriptDocument } from '../../src/services/transcriptDocumentService';

const year = { id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' };
const semesterId = '10000000-0000-4000-8000-000000000002';
const documentContent = (count: number): TranscriptDocument => ({
  reference: 'REL-RECETTE', issuedAt: '2026-09-09', institution: { name: 'ESCEN', approval: 'N° 0102/2021/MESR/SG/DES' },
  student: { name: 'Étudiante de recette', matricule: 'RECETTE-001', birthDate: '2000-01-01', birthPlace: 'Lomé' },
  academicYear: '2025-2026', level: 'Master', program: 'Finance digitale', city: 'Lomé', director: 'Signature de recette',
  semesters: [1, 2].map(semester => ({ name: `Semestre ${semester}`, rows: Array.from({ length: count }, (_, i) => ({ code: `ECN2${semester}${String(i + 1).padStart(2, '0')}`, name: i % 3 ? `Enseignement de recette ${i + 1}` : 'Solution digitale appliquée au secteur financier et à l’agriculture : transformations et perspectives', credits: 3, average: i === 0 ? null : 14, validated: i === 0 ? null : true })), totalCredits: count * 3, earnedCredits: (count - 1) * 3 })),
  totalCredits: count * 6, earnedCredits: (count - 1) * 6, average: 14, mention: 'Bien',
});

test('Création : code automatique, récapitulatif puis enregistrement avec le semestre et les crédits', async ({ page }) => {
  await authenticateFixture(page);
  let campusReads = 0;
  await page.route('**/api/campus', route => { campusReads++; return route.fulfill({ json: { ...snapshot, academicContext: { selection: 'current', selectedYearId: year.id, currentYearId: year.id, years: [year] } } }); });
  const tables = {
    academic_years: [year], subjects: [{ id: 'OLD', name: 'Ancienne matière', code: 'ECN2101', academic_year_id: year.id }],
    cycles: [{ id: 'C', code: 'MASTER', name: 'Master' }], levels: [{ id: 'L', cycle_id: 'C', name: 'Master 1', position: 1 }],
    curricula: [{ id: 'CUR', level_id: 'L', name: 'Finance Digitale · Master 1', status: 'DRAFT' }],
    curriculum_semesters: [{ id: semesterId, curriculum_id: 'CUR', name: 'Semestre 1', position: 1 }], teaching_units: [],
  };
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/catalog/**', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { revision: 1, tables, historyLinks: [] } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { id: 'CREATED', revision: 2 } });
  });
  await page.goto('/academique/filieres?collection=subjects');
  await page.getByRole('button', { name: 'Ajouter une matière', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Finance digitale');
  await dialog.getByLabel('Sigle de discipline REESAO (3 lettres)').fill('ecn');
  await dialog.getByRole('combobox', { name: /^Semestre du programme/ }).selectOption(semesterId);
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

for (const count of [7, 30]) test(`Le PDF avec ${count * 2} matières et des libellés longs tient sur une page A4`, async ({ page }) => {
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
    return content.bottom <= page.bottom && content.right <= page.right;
  });
  expect(contained).toBe(true);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await fs.mkdir('tmp/screenshots/transcripts', { recursive: true });
  await fs.writeFile(`tmp/screenshots/transcripts/releve-${count * 2}-matieres.pdf`, pdf);
  if (count === 7) await page.screenshot({ path: 'tmp/screenshots/transcripts/releve-master.png', fullPage: true });
});

test('Impression connectée : un relevé incomplet reste bloqué sans inventer les résultats', async ({ page }) => {
  await authenticateFixture(page);
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
  await expect(frame.getByRole('heading', { name: 'RELEVÉ DE NOTES' })).toHaveCount(1);
  await expect(frame.locator('.transcript-content')).toHaveCSS('transform', /matrix/);
  await expect(frame.locator('.transcript-reference')).toContainText('REL-RECETTE');
});
