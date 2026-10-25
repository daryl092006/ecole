import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { localBusinessFixture as Local } from './local-business-fixture.mjs';
import { ROLES } from '../../src/types/permissions';
import { authenticateFixture } from './persistent-fixture';
const pdf = Buffer.from('%PDF-1.4\nDocument de recette\n%%EOF');
async function fixture() {
  const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<{ localBusinessFixture: typeof Local }>;
  const local = await (await nativeImport(pathToFileURL(resolve('tests/ui/local-business-fixture.mjs')).href)).localBusinessFixture();
  const type = await local.insert('document_types', { code: 'IDENTITE-RECETTE', name: 'Pièce d’identité', multiple: false, accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'], max_byte_size: 5242880 });
  return { ...local, type };
}
test('Pièces PostgreSQL : dépôt privé, versions, conformité, droits et nettoyage après échec', async () => {
  const local = await fixture();
  try {
    const request = (method = 'GET', body?: BodyInit, student = false, suffix = '') => local.dispatch(new Request(`http://localhost/api/student-documents${suffix}`, { method, headers: { authorization: `Bearer ${student ? 'student-token' : 'fixture-auth-token'}`, 'x-escen-role': student ? ROLES.STUD : ROLES.IT, 'x-escen-year': local.year.id }, ...(body ? { body } : {}) }));
    const directory = async (student = false) => (await (await request('GET', undefined, student)).json());
    let data = await directory();
    const student = data.students[0]; const enrollment = data.enrollments[0];
    const personId = await local.value('select person_id as value from escen.students where id=$1', [student.id]);
    const authId = randomUUID(); await local.db.query('insert into auth.users(id) values($1)', [authId]);
    const account = await local.insert('accounts', { person_id: personId, auth_user_id: authId, active: true });
    const roleId = await local.value("select id as value from escen.roles where code='STUD'");
    await local.insert('role_grants', { account_id: account.id, role_id: roleId, granted_by: local.account.id, valid_from: '2020-01-01T00:00:00Z', reason: 'Compte étudiant de recette' });
    local.authUsers.set('student-token', { id: authId, email: 'student@example.test', app_metadata: {} });
    const upload = (metadata: object, bytes: Uint8Array = pdf, mime = 'application/pdf') => { const body = new FormData(); body.append('metadata', JSON.stringify(metadata)); body.append('file', new File([new Uint8Array(bytes)], 'identite.pdf', { type: mime })); return body; };
    const metadata = { revision: data.revision, studentId: student.id, enrollmentId: enrollment.id, documentTypeId: local.type.id, supersedesId: null };
    expect((await request('POST', upload({ ...metadata, studentId: randomUUID() }), true)).status).toBe(409);
    expect((await request('POST', upload(metadata, pdf, 'image/jpeg'), true)).status).toBe(400);
    const created = await request('POST', upload(metadata), true); expect(created.status).toBe(201);
    const id = (await created.json()).id;
    data = await directory(true); expect(data.documents).toHaveLength(1);
    expect(data.documents[0].status).toBe('A_VERIFIER');
    expect(Number(await local.value('select byte_size as value from escen.file_objects where id=$1', [data.documents[0].file_id]))).toBe(pdf.length);
    expect(await local.value('select sha256 as value from escen.file_objects where id=$1', [data.documents[0].file_id])).toBe(createHash('sha256').update(pdf).digest('hex'));
    expect((await request('GET', undefined, true, `?file=${id}`)).status).toBe(200);
    expect((await request('PATCH', JSON.stringify({ revision: data.revision, id, status: 'CONFORME', reason: 'Vérification du document' }), true)).status).toBe(403);
    expect((await request('PATCH', JSON.stringify({ revision: data.revision, id, status: 'CONFORME', reason: 'Document vérifié par la scolarité' }))).status).toBe(200);
    data = await directory(); expect(data.reviews).toHaveLength(1);
    expect((await request('POST', upload({ ...metadata, revision: data.revision }), true)).status).toBe(409);
    const replaced = await request('POST', upload({ ...metadata, revision: data.revision, supersedesId: id }), true); expect(replaced.status).toBe(201);
    const replacementId = (await replaced.json()).id; data = await directory();
    expect(data.documents).toHaveLength(2); expect(data.documents.find((row: { id: string }) => row.id === id).status).toBe('CONFORME');
    expect(data.documents.find((row: { id: string }) => row.id === replacementId).version).toBe(2);
    expect((await request('PATCH', JSON.stringify({ revision: data.revision, id, status: 'NON_CONFORME', reason: 'Ancienne version remplacée' }))).status).toBe(409);
    const foreignPerson = await local.insert('people', { firstname: 'Autre', lastname: 'Étudiant' });
    const foreignStudent = await local.insert('students', { person_id: foreignPerson.id, matricule: 'AUTRE-DOC-001' });
    const foreignFile = await local.insert('file_objects', { bucket: 'escen-student-documents', object_path: 'private/other.pdf', original_name: 'autre.pdf', mime_type: 'application/pdf', byte_size: pdf.length, uploaded_by: local.account.id });
    const foreignDoc = await local.insert('student_documents', { student_id: foreignStudent.id, document_type_id: local.type.id, file_id: foreignFile.id, academic_year_id: local.year.id, version: 1 });
    local.files.set('escen-student-documents/private/other.pdf', pdf);
    expect((await request('GET', undefined, true, `?file=${foreignDoc.id}`)).status).toBe(404);
    expect((await directory(true)).documents).toHaveLength(2);
    const before = local.files.size; const original = local.client.rpc;
    local.client.rpc = async (name, args = {}) => name === 'escen_backend_transaction' ? { data: null, error: { code: '40001', message: 'Concurrence simulée après transfert' } } : original(name, args);
    const failed = await request('POST', upload({ ...metadata, revision: data.revision, supersedesId: replacementId }), true);
    expect(failed.status).toBe(409); expect(local.files.size).toBe(before);
    local.client.rpc = original;
    expect((await directory(true)).documents).toHaveLength(2);
    const committed = local.files.size;
    local.client.rpc = async (name, args = {}) => {
      const result = await original(name, args);
      return name === 'escen_backend_transaction' ? { data: null, error: { code: 'FETCH_ERROR', message: 'Réponse perdue après validation' } } : result;
    };
    expect((await request('POST', upload({ ...metadata, revision: data.revision, supersedesId: replacementId }), true)).status).toBe(503);
    expect(local.files.size).toBe(committed + 1);
    local.client.rpc = original;
    expect((await directory(true)).documents).toHaveLength(3);
  } finally { await local.close(); }
});

for (const width of [390, 1440]) test(`Pièces : dépôt confirmé, conformité et remplacement à ${width}px`, async ({ page }) => {
  const local = await fixture();
  try {
    await page.setViewportSize({ width, height: 960 }); await authenticateFixture(page);
    await page.route('**/api/**', async route => { const r = route.request(); const bytes = r.postDataBuffer(); const response = await local.dispatch(new Request(r.url(), { method: r.method(), headers: r.headers(), ...(bytes ? { body: new Uint8Array(bytes) } : {}) })); await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() }); });
    await page.goto('/etudiants/cartes');
    async function selectIT() { await page.getByLabel('Mon compte et mon rôle').click(); await page.getByLabel('Rôle autorisé', { exact: true }).selectOption(ROLES.IT); if (await page.locator('.account-control').getAttribute('open') !== null) await page.getByLabel('Mon compte et mon rôle').click(); }
    await selectIT();
    await page.getByRole('button', { name: 'Ajouter une pièce', exact: true }).click();
    await page.getByLabel('Fichier PDF, JPEG ou PNG (5 Mo maximum)').setInputFiles({ name: 'identite.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    expect(local.files.size).toBe(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Déposer la pièce', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Déclarer conforme', exact: true }).click();
    await page.getByLabel('Motif de vérification').fill('Copie et identité vérifiées');
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la vérification', exact: true }).click();
    await expect(page.getByText('Conforme', { exact: true })).toBeVisible();
    await page.reload(); await selectIT();
    await page.getByRole('button', { name: 'Remplacer la pièce', exact: true }).click();
    await page.getByLabel('Fichier PDF, JPEG ou PNG (5 Mo maximum)').setInputFiles({ name: 'identite-corrigee.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Vérifier les informations' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer la nouvelle version', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ancienne version', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'identite-corrigee.pdf' })).toBeVisible();
    await page.screenshot({ path: `tmp/screenshots/student-documents-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await local.close(); }
});
