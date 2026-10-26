import { expect, test } from '@playwright/test';
import { installResponsiveAudit } from './responsive-audit-fixture';
import { securityIds, uuid } from './security-fixture';
import type { StudentDocumentDirectory } from '../../src/types/studentDocumentWorkspace';
import type { RelationalSnapshot } from '../../src/types/persistence';

for (const width of [390, 820, 1440]) {
  test(`Pièces du dossier : vue épurée, contexte fixé et dépôt confirmé à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { problems } = await installResponsiveAudit(page, 'staff');
    const directory: StudentDocumentDirectory = {
      revision: 1, yearId: securityIds.year, canUpload: true, canReview: true,
      students: [{ id: uuid(600), matricule: 'ESCEN-TEST-001', name: 'Élise Étudiante' }, { id: uuid(601), matricule: 'AUTRE-002', name: 'Autre dossier' }],
      enrollments: [{ id: uuid(500), student_id: uuid(600), status: 'INSCRIT' }, { id: uuid(501), student_id: uuid(601), status: 'INSCRIT' }],
      types: [{ id: uuid(8001), name: 'Pièce d’identité', max_byte_size: 5242880 }],
      documents: [{ id: uuid(8002), student_id: uuid(601), filename: 'autre-dossier.pdf', status: 'CONFORME', version: 1 }], reviews: [],
    };
    const writes: Record<string, unknown>[] = [];
    await page.route('**/api/student-documents', async route => {
      if (route.request().method() === 'POST') {
        const request = route.request();
        const body = await new Request(request.url(), { method: 'POST', headers: request.headers(), body: new Uint8Array(request.postDataBuffer()!) }).formData();
        const metadata = JSON.parse(String(body.get('metadata'))) as Record<string, unknown>;
        writes.push(metadata);
        directory.documents.push({ id: uuid(8003), student_id: metadata.studentId, enrollment_id: metadata.enrollmentId, document_type_id: metadata.documentTypeId, filename: 'identite.pdf', status: 'A_VERIFIER', version: 1 });
        directory.revision++;
        return route.fulfill({ status: 201, json: { revision: directory.revision, id: uuid(8003) } });
      }
      return route.fulfill({ json: directory });
    });
    const campusRead = page.waitForResponse(response => new URL(response.url()).pathname === '/api/campus');
    await page.goto('/etudiants/ESCEN-TEST-001');
    const campus = await (await campusRead).json() as RelationalSnapshot;
    const open = () => page.getByRole('button', { name: 'Pièces du dossier', exact: true }).click();
    await open();
    await expect(page.getByRole('heading', { name: 'Pièces du dossier', exact: true })).toBeVisible();
    await expect(page.getByText('Aucune pièce déposée.', { exact: true })).toBeVisible();
    for (const name of ['Consulter les documents établis', 'Actualiser les pièces']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('searchbox', { name: 'Rechercher une pièce' })).toHaveCount(0);
    await expect(page.getByText('autre-dossier.pdf', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/global-simplification/${width}/pieces-vides.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Ajouter une pièce', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Déposer la pièce', exact: true });
    await expect(dialog.getByRole('combobox', { name: 'Étudiant', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('combobox', { name: 'Inscription annuelle', exact: true })).toHaveCount(0);
    await dialog.getByLabel('Fichier PDF, JPEG ou PNG (5 Mo maximum)').setInputFiles({ name: 'identite.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocument local\n%%EOF') });
    await page.getByRole('button', { name: 'Vérifier les informations', exact: true }).click();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Déposer la pièce', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'identite.pdf', exact: true })).toBeVisible();
    expect(writes).toMatchObject([{ studentId: uuid(600), enrollmentId: uuid(500), documentTypeId: uuid(8001) }]);
    await expect(page.getByRole('button', { name: 'Historique de vérification', exact: true })).toHaveCount(0);

    await page.route('**/api/campus', route => route.fulfill({ json: { ...campus, tables: { ...campus.tables, generated_documents: [
      { id: uuid(8010), student_id: uuid(600), kind: 'CERTIFICAT', reference: 'CERT-DOSSIER-001', issued_at: '2026-10-01T08:00:00Z' },
      { id: uuid(8011), student_id: uuid(601), kind: 'CERTIFICAT', reference: 'CERT-AUTRE-DOSSIER', issued_at: '2026-10-01T08:00:00Z' },
    ] } } }));
    await page.reload();
    await open();
    await expect(page.getByText('CERT-DOSSIER-001', { exact: true })).toBeVisible();
    await expect(page.getByText('CERT-AUTRE-DOSSIER', { exact: true })).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
