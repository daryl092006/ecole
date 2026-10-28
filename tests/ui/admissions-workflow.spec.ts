import { expect, test, type Page } from '@playwright/test';
import { ROLES, type RoleName } from '../../src/types/permissions';
import { ROLE_ACCESS } from '../../src/permissions/rolePermissions';
import { authenticateFixture, snapshot } from './persistent-fixture';
import type { AdmissionApplication, ApplicationStage } from '../../src/types/admissions';
const year = '44444444-4444-4444-8444-444444444444';
const id = '33333333-3333-4333-8333-333333333333';
const intakeId = '22222222-2222-4222-8222-222222222222';
const docId = '11111111-1111-4111-8111-111111111111';
const channel = '55555555-5555-4555-8555-555555555555';
const intake = { id: intakeId, academic_year_id: year, level_id: docId, program_id: id, label: 'Licence 1 · Finance Digitale', active: true, required_documents: ['diplome_file'], version: 1 };
async function fixture(page: Page, stage: ApplicationStage, role: RoleName = ROLES.IT) {
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Agent de recette', email: 'agent@example.test', role, availableRoles: [role], capabilities: { [role]: { permissions: ROLE_ACCESS[role].permissions, globalAccess: true } }, studentId: null, teacherId: null, matricule: null, mustChangePassword: false } }));
  const years = [{ id: year, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-09-01', ends_on: '2027-08-31' }];
  await page.route('**/api/campus', route => route.fulfill({ json: { ...snapshot, tables: { ...snapshot.tables, academic_years: years }, academicContext: { currentYearId: year, selectedYearId: year, selection: 'current', years } } }));
  const application: AdmissionApplication = { id, reference: 'ESCEN-LOCAL', identity: { nom:'Candidat',prenom:'Local',email:'candidate@example.test',tel:'+22890000000' }, diploma:{type_diplome_id:'BAC'},guardians:[],intake_id:intakeId,academic_year_id:year,intake_label:intake.label,status:'RECU',version:1,submitted_at:'2026-10-27T10:00:00Z',created_at:'2026-10-27T10:00:00Z',reason:'Recette locale',workflow_stage:stage,entry_channel:'WEB',requested_changes:null,registration_fee_due:['ADMISSIBLE','ATTENTE_PAIEMENT','ADMIS_OFFICIEL'].includes(stage)?50000:null,registration_fee_paid:0,student_id:null,required_documents:['diplome_file'],events:[],letters:[],registration_payments:[],documents:[{id:docId,document_key:'diplome_file',filename:'diplome.pdf',mime_type:'application/pdf',byte_size:50}] };
  const commands: Record<string,unknown>[] = [];
  await page.route('**/api/admissions*', async route => {
    if (new URL(route.request().url()).searchParams.has('view')) return route.fulfill({ json:{notices:[]} });
    if (route.request().method() === 'POST') {
      const command = route.request().postDataJSON(); commands.push(command); application.version++;
      if (command.action === 'complete') application.workflow_stage = 'COMPLET';
      if (command.action === 'transmit') application.workflow_stage = 'TRANSMIS_ACADEMIE';
      if (command.action === 'admissible') { application.workflow_stage='ADMISSIBLE'; application.registration_fee_due=50000; }
      if (command.action === 'confirm_payment') { application.workflow_stage='ADMIS_OFFICIEL'; application.registration_fee_paid=50000; }
      return route.fulfill({json:application});
    }
    return route.fulfill({json:{enabled:true,applications:[application],intakes:[intake],capabilities:{review:ROLE_ACCESS[role].permissions.includes('application.review'),decide:ROLE_ACCESS[role].permissions.includes('application.decide'),payment:ROLE_ACCESS[role].permissions.includes('application.payment.confirm'),followup:ROLE_ACCESS[role].permissions.includes('application.followup')},payment_channels:[{id:channel,name:'Caisse ESCEN',method:'ESPECES'}],notices:[],mail_configured:true}});
  });
  return { application, commands };
}
async function fillCandidate(page: Page) {
  await page.getByRole('textbox',{name:'Nom',exact:true}).fill('Candidat'); await page.getByRole('textbox',{name:'Prénom',exact:true}).fill('Local');
  await page.getByRole('combobox',{name:'Sexe',exact:true}).selectOption('M'); await page.getByLabel('Date de naissance',{exact:true}).fill('2000-01-01');
  await page.getByLabel('Lieu de naissance',{exact:true}).fill('Lomé'); await page.getByRole('combobox',{name:'Nationalité',exact:true}).click(); await page.getByRole('option',{name:'Togolaise',exact:true}).click();
  await page.getByLabel('Adresse email',{exact:true}).fill('candidate@example.test'); await page.getByLabel('Téléphone du candidat',{exact:true}).fill('+22890000000');
  await page.getByRole('textbox',{name:'Adresse de résidence',exact:true}).fill('Adresse locale'); await page.getByRole('combobox',{name:'Formation souhaitée',exact:true}).selectOption(intakeId);
  await page.getByLabel('Dernier diplôme ou niveau obtenu',{exact:true}).fill('Baccalauréat'); await page.getByRole('button',{name:'Suivant',exact:true}).click();
  await page.getByRole('textbox',{name:'Nom',exact:true}).fill('Parent'); await page.getByRole('textbox',{name:'Prénom',exact:true}).fill('Local');
  await page.getByLabel('Lien avec le candidat',{exact:true}).fill('Père'); await page.getByLabel('Téléphone du parent ou tuteur 1',{exact:true}).fill('+22890000001');
  await page.getByRole('button',{name:'Suivant',exact:true}).click();
  await page.getByRole('checkbox',{name:/Je certifie l’exactitude/}).check();
}

for (const width of [390, 1440]) {
  test(`Pièces : téléchargement réel à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const f = await fixture(page, 'VERIFICATION_ADMISSION');
    f.application.workflow_stage = null;
    const pdf = Buffer.from('%PDF-1.4\nDocument de recette locale\n%%EOF');
    let requests = 0;
    await page.route('**/api/admissions?document=*', async route => {
      requests++;
      expect(route.request().headers()['x-escen-year']).toBe(year);
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      await route.fulfill({ json: { url: new URL('/admission-document.pdf', route.request().url()).href } });
    });
    await page.route('**/admission-document.pdf', route => route.fulfill({ contentType: 'application/pdf', body: pdf }));
    await page.goto('/site-web/demandes');
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger diplome.pdf', exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('diplome.pdf');
    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(pdf);
    expect(requests).toBe(1);
    expect(f.commands).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Télécharger diplome.pdf', exact: true })).toBeEnabled();
  });
}

test('Pièces : erreur visible et nouvel essai après un lien expiré', async ({ page }) => {
  await fixture(page, 'VERIFICATION_ADMISSION');
  let expired = true;
  await page.route('**/api/admissions?document=*', route => route.fulfill({ json: { url: new URL('/admission-document.pdf', route.request().url()).href } }));
  await page.route('**/admission-document.pdf', route => route.fulfill(expired
    ? { status: 403, json: { error: 'Lien expiré' } }
    : { contentType: 'application/pdf', body: '%PDF-1.4\nReprise\n%%EOF' }));
  await page.goto('/site-web/demandes');
  await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
  const button = page.getByRole('button', { name: 'Télécharger diplome.pdf', exact: true });
  await button.click();
  await expect(page.getByRole('alert').filter({ hasText: 'La pièce est indisponible ou le lien a expiré' })).toBeVisible();
  await expect(button).toBeEnabled();
  expired = false;
  const downloading = page.waitForEvent('download');
  await button.click();
  expect((await downloading).suggestedFilename()).toBe('diplome.pdf');
  await expect(page.getByText('La pièce est indisponible ou le lien a expiré', { exact: false })).toHaveCount(0);
});

test('Pièces : un refus d’accès est affiché sans télécharger le fichier', async ({ page }) => {
  await fixture(page, 'VERIFICATION_ADMISSION');
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.route('**/api/admissions?document=*', route => route.fulfill({ status: 403, json: { error: 'Pièce hors de votre périmètre.' } }));
  await page.goto('/site-web/demandes');
  await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
  const button = page.getByRole('button', { name: 'Télécharger diplome.pdf', exact: true });
  await button.click();
  await expect(page.getByRole('alert').filter({ hasText: 'Pièce hors de votre périmètre.' })).toBeVisible();
  await expect(button).toBeEnabled();
  expect(downloads).toBe(0);
});

for (const width of [390, 1440]) {
  test(`Pièces : aperçu PDF privé sans téléchargement à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await fixture(page, 'VERIFICATION_ADMISSION');
    let downloads = 0;
    page.on('download', () => { downloads++; });
    await page.route('**/api/admissions?document=*', route => route.fulfill({ json: { url: new URL('/preview-document.pdf', route.request().url()).href } }));
    await page.route('**/preview-document.pdf', route => route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\nAperçu local\n%%EOF' }));
    await page.goto('/site-web/demandes');
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await page.getByRole('button', { name: 'Visualiser diplome.pdf', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Aperçu · diplome.pdf', exact: true });
    await expect(preview.locator('iframe')).toHaveAttribute('src', /^blob:/);
    expect(downloads).toBe(0);
    expect(await preview.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await preview.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
    await expect(preview).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Visualiser diplome.pdf', exact: true })).toBeVisible();
  });
}

test('Pièces : un accès refusé ne crée pas d’aperçu et permet de réessayer', async ({ page }) => {
  await fixture(page, 'VERIFICATION_ADMISSION');
  let forbidden = true;
  await page.route('**/api/admissions?document=*', route => route.fulfill(forbidden
    ? { status: 403, json: { error: 'Pièce hors de votre périmètre.' } }
    : { json: { url: new URL('/preview-document.pdf', route.request().url()).href } }));
  await page.route('**/preview-document.pdf', route => route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\nAperçu local\n%%EOF' }));
  await page.goto('/site-web/demandes');
  await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Visualiser diplome.pdf', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Aperçu · diplome.pdf', exact: true });
  await expect(preview.getByRole('alert')).toContainText('Pièce hors de votre périmètre.');
  await expect(preview.locator('iframe')).toHaveCount(0);
  forbidden = false;
  await preview.getByRole('button', { name: 'Réessayer l’aperçu', exact: true }).click();
  await expect(preview.locator('iframe')).toHaveAttribute('src', /^blob:/);
});

test('Pièces : aperçu image et refus des formats actifs', async ({ page }) => {
  const f = await fixture(page, 'VERIFICATION_ADMISSION');
  f.application.documents[0].filename = 'identite.png';
  f.application.documents[0].mime_type = 'image/png';
  let activeContent = false;
  await page.route('**/api/admissions?document=*', route => route.fulfill({ json: { url: new URL('/preview-image', route.request().url()).href } }));
  await page.route('**/preview-image', route => route.fulfill(activeContent
    ? { contentType: 'text/html', body: '<script>window.unexpectedPreviewScript=true</script>' }
    : { contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64') }));
  await page.goto('/site-web/demandes');
  await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Visualiser identite.png', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Aperçu · identite.png', exact: true });
  await expect(preview.getByRole('img', { name: 'Document : identite.png', exact: true })).toBeVisible();
  await expect.poll(() => preview.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1);
  await preview.getByRole('button', { name: 'Fermer le détail', exact: true }).click();
  activeContent = true;
  await page.getByRole('button', { name: 'Visualiser identite.png', exact: true }).click();
  await expect(preview.getByRole('alert')).toContainText('L’aperçu de ce format est indisponible');
  await expect(preview.locator('iframe, img')).toHaveCount(0);
});
for (const width of [390,1440]) {
  test(`Dépôt en trois étapes sans pièce à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950}); let writes=0;
    await page.route('**/api/candidature',async route=>{
      if(route.request().method()==='POST'){
        const request=new Request('http://local.test',{method:'POST',headers:{'Content-Type':route.request().headers()['content-type']},body:route.request().postData()!});
        const form=await request.formData(); const input=JSON.parse(String(form.get('payload')));
        expect(input.application.guardians[0].lien).toBe('Père');expect(input.request_token).toMatch(/^[a-f0-9]{64}$/);expect([...form.keys()]).toEqual(['payload']);writes++;
        return route.fulfill({status:201,json:{reference:'ESCEN-RECEIVED',tracking_url:'/candidature/suivi'}});
      }
      return route.fulfill({json:{year:{id:year,name:'2026-2027'},intakes:[intake]}});
    });
    await page.goto('/candidature');await fillCandidate(page);
    await expect(page.getByText('Vous pouvez envoyer votre candidature sans pièce jointe.',{exact:false})).toBeVisible();
    await page.getByRole('button',{name:'Vérifier avant l’envoi',exact:true}).click();expect(writes).toBe(0);
    await page.getByRole('button',{name:'Confirmer l’envoi de ma candidature',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Votre candidature est reçue'})).toBeVisible();expect(writes).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  test(`Vérification et transmission distinctes à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});const f=await fixture(page,'VERIFICATION_ADMISSION');await page.goto('/site-web/demandes');
    await page.getByRole('button',{name:'Ouvrir le dossier',exact:true}).click();await page.getByRole('button',{name:'Valider la complétude',exact:true}).click();
    await page.getByRole('checkbox',{name:'Informations personnelles vérifiées',exact:true}).check();await page.getByRole('checkbox',{name:'Parents ou tuteurs vérifiés',exact:true}).check();
    await page.getByRole('checkbox',{name:'Pièce vérifiée : diplome.pdf',exact:true}).check();
    const actionReason1 = page.getByLabel('Motif de l’action',{exact:true});
    if (await actionReason1.count()) await actionReason1.fill('Dossier contrôlé et conforme');
    await page.getByRole('button',{name:'Relire avant de confirmer',exact:true}).click();expect(f.commands).toHaveLength(0);
    await page.getByRole('button',{name:'Confirmer : valider la complétude',exact:true}).click();
    await expect(page.getByRole('button',{name:'Passer à l’académie',exact:true})).toBeVisible();expect(f.commands[0]).toMatchObject({action:'complete',checked_documents:[docId]});
  });
  test(`Admission officielle après confirmation financière à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});const f=await fixture(page,'ADMISSIBLE');await page.goto('/site-web/demandes');
    await page.getByRole('button',{name:'Ouvrir le dossier',exact:true}).click();await expect(page.getByRole('button',{name:'Créer ou relier le dossier étudiant',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Confirmer les frais d’inscription',exact:true}).click();await page.getByRole('combobox',{name:'Moyen de paiement',exact:true}).selectOption(channel);
    await page.getByLabel('Référence du règlement ou reçu',{exact:true}).fill('RECU-LOCAL-001');
    const actionReason2 = page.getByLabel('Motif de l’action',{exact:true});
    if (await actionReason2.count()) await actionReason2.fill('Règlement reçu et contrôlé par la finance');
    await page.getByRole('button',{name:'Relire avant de confirmer',exact:true}).click();expect(f.commands).toHaveLength(0);
    await page.getByRole('button',{name:'Confirmer : confirmer les frais d’inscription',exact:true}).click();
    await expect(page.getByRole('button',{name:'Créer ou relier le dossier étudiant',exact:true})).toBeVisible();expect(f.commands[0]).toMatchObject({action:'confirm_payment',amount:50000,channel_id:channel});
  });
  test(`Espace candidat et renvoi des compléments à ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:950});
    const candidate = {id,reference:'ESCEN-SUIVI',identity:{nom:'Candidat',prenom:'Local',genre:'M',date_naissance:'2000-01-01',lieu_naissance:'Lomé',nationalite:'Togo',email:'candidate@example.test',tel:'+22890000000',adresse:'Adresse locale'},diploma:{type_diplome_id:'BAC'},guardians:[{nom:'Parent',prenom:'Local',lien:'Père',tel:'+22890000001'}],intake_id:intakeId,academic_year_id:year,intake_label:intake.label,status:'RECU',version:1,workflow_stage:'A_COMPLETER',requested_changes:'Veuillez compléter le diplôme.',registration_fee_due:null,registration_fee_paid:0,events:[],documents:[],letters:[]};
    let sessions=0;let updates=0;
    await page.route('**/api/candidature',route=>route.fulfill({json:{year:{id:year,name:'2026-2027'},intakes:[intake]}}));
    await page.route('**/api/candidate-session',route=>{expect(route.request().postDataJSON().token).toBe('b'.repeat(64));sessions++;return route.fulfill({json:{connected:true}});});
    await page.route('**/api/candidate-dossier',route=>{
      if(route.request().method()==='POST') { const body=route.request().postDataJSON();expect(body.version).toBe(1);expect(body.application.identity.email).toBe('candidate@example.test');updates++;candidate.workflow_stage='NOUVELLE';candidate.version++; }
      return route.fulfill({json:{application:candidate,consent_recorded:true}});
    });
    await page.goto(`/candidature/suivi#access=${'b'.repeat(64)}`);
    await expect(page.getByRole('heading',{name:'Local Candidat',exact:true})).toBeVisible();expect(page.url()).not.toContain('#access');expect(sessions).toBe(1);
    await page.getByRole('button',{name:'Compléter mon dossier',exact:true}).click();
    await page.getByRole('button',{name:'Suivant',exact:true}).click();await page.getByRole('button',{name:'Suivant',exact:true}).click();
    await page.getByRole('checkbox',{name:/Je certifie l’exactitude/}).check();await page.getByRole('button',{name:'Vérifier avant l’envoi',exact:true}).click();expect(updates).toBe(0);
    await page.getByRole('button',{name:'Renvoyer mon dossier à l’admission',exact:true}).click();
    await expect(page.getByText('Nouvelle candidature',{exact:true})).toBeVisible();expect(updates).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}

for (const width of [390, 1440]) {
  test(`Le chargé de clientèle transmet et attend la décision à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const f = await fixture(page, 'COMPLET', ROLES.CC);
    await page.goto('/site-web/demandes');
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await expect(page.locator('.dossier-owner-tag').getByText('Chargé de clientèle', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Passer à l’académie', exact: true }).click();
    const actionReason3 = page.getByLabel('Motif de l’action', { exact: true });
    if (await actionReason3.count()) await actionReason3.fill('Pièces vérifiées, dossier transmis');
    await page.getByRole('button', { name: 'Relire avant de confirmer', exact: true }).click();
    expect(f.commands).toHaveLength(0);
    await page.getByRole('button', { name: 'Confirmer : passer à l’académie', exact: true }).click();
    await expect(page.locator('.dossier-owner-tag').getByText('Direction académique', { exact: true })).toBeVisible();
    await expect(page.getByText('Ce dossier attend l’intervention du responsable indiqué ci-dessus', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commencer l’étude académique', exact: true })).toHaveCount(0);
    expect(f.commands).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/screenshots/admissions-refonte/transmission-${width}.png`, fullPage: true });
  });
  test(`La direction académique retrouve sa décision à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await fixture(page, 'ETUDE_ACADEMIQUE', ROLES.DA);
    await page.goto('/site-web/demandes');
    await page.getByRole('button', { name: 'Ouvrir le dossier', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Déclarer admissible', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refuser la candidature', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmer les frais d’inscription', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `tmp/screenshots/admissions-refonte/decision-${width}.png`, fullPage: true });
  });
}
