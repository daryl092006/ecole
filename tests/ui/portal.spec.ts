import { openAccountMenu } from './helpers';
import { test, expect, type Page } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../src/services/demoSessionService';
import { captureWorkspace, expectWorkspaceFits, openActionPanel } from './helpers';
import { isRouteAllowed } from '../../src/permissions/navigation';
import type { RoleName } from '../../src/types/permissions';

const role = async (page: Page, value: string) => {
  const previousPath = new URL(page.url()).pathname;
  await openAccountMenu(page); await page.locator('#active-role').selectOption({ label: value });
  if (!isRouteAllowed(previousPath, value as RoleName)) await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
  await expect(page.locator('.role-scope-banner strong')).toHaveText(value);
};
const follow = async (page: Page, link: ReturnType<Page['getByRole']>) => {
  if (await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).isVisible() && !await link.isVisible()) {
    await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
  }
  const href = await link.getAttribute('href'); await link.click();
  await expect(page).toHaveURL('http://127.0.0.1:3105' + href);
  await expectWorkspaceFits(page);
};
const navigate = async (page: Page, tab: string, sub: string) => {
  await follow(page, page.locator('#application-navigation').getByRole('link', { name: tab, exact: true }));
  await follow(page, page.locator('#application-navigation').getByRole('link', { name: sub, exact: true }));
};
const signIn = async (page: Page) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse email', { exact: true }).fill(DEMO_ACCOUNTS[0].email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/mon-espace');
};

test('Tous les rôles ont des pages utiles, sans guide ni emoji', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await signIn(page);
  for (const value of Object.values(ROLES)) {
    await role(page, value);
    const names = await page.locator('#application-navigation .nav-item').allTextContents();
    for (const name of names) {
      await follow(page, page.locator('#application-navigation .nav-item').filter({ hasText: name.trim() }));
      const subtabs = await page.locator('#application-navigation .subnav-item').allTextContents();
      for (const sub of subtabs) {
        await follow(page, page.locator('#application-navigation .subnav-item').filter({ hasText: sub.trim() }));
        await expect(page.locator('#application-navigation .subnav-item.active')).toHaveText(sub.trim());
        await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible();
        expect(await page.locator('#main-content').innerText()).not.toContain('Accès refusé');
        expect(await page.locator('body').innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
    await expect(page.locator('.onboarding-coachmark')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /guide du rôle/i })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

for (const width of [390, 1440]) {
test(`Parcours métier complet et formulaires à ${width}px`, async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => { window.print = () => {}; });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await signIn(page);
  await navigate(page, 'Personnel', 'Utilisateurs & Rôles');
  await openActionPanel(page, 'Nouvel utilisateur');
  await page.getByLabel('Nom', { exact: true }).fill('Surveillant Test');
  await page.getByLabel('Email', { exact: true }).fill('surveillant@example.test');
  await page.getByRole('combobox', { name: 'Rôle', exact: true }).selectOption({ label: ROLES.SURV });
  await page.getByRole('button', { name: 'Ajouter l’utilisateur' }).click();
  await expect(page.getByText('Utilisateur créé.', { exact: true })).toBeVisible();
  await role(page, ROLES.DA);
  await navigate(page, 'Académique', 'Référentiel académique');
  await page.getByLabel('Libellé', { exact: true }).fill('2026-2027');
  await page.getByLabel('Date de début', { exact: true }).fill('2026-09-01');
  await page.getByLabel('Date de fin', { exact: true }).fill('2027-08-31');
  await page.getByRole('button', { name: 'Créer en brouillon' }).click();
  await page.getByRole('button', { name: 'Ouvrir l’année', exact: true }).click();
  await page.getByRole('button', { name: 'Filières & parcours', exact: true }).click();
  await page.locator('#program-code').fill('INF'); await page.locator('#program-name').fill('Informatique');
  await page.getByRole('button', { name: 'Ajouter la filière' }).click();
  await page.getByRole('button', { name: 'Niveaux & semestres', exact: true }).click();
  const semesterForm = page.locator('form').first();
  await semesterForm.getByRole('combobox', { name: 'Année', exact: true }).selectOption({ label: '2026-2027' });
  await semesterForm.getByRole('combobox', { name: 'Niveau', exact: true }).selectOption({ label: 'Licence 1' });
  await semesterForm.getByRole('combobox', { name: 'Semestre', exact: true }).selectOption({ label: 'Semestre 1' });
  await semesterForm.getByLabel('Début', { exact: true }).fill('2026-09-01');
  await semesterForm.getByLabel('Fin', { exact: true }).fill('2027-01-31');
  await semesterForm.getByRole('button', { name: 'Créer le semestre' }).click();
  await page.getByRole('button', { name: 'Matières', exact: true }).click();
  const unitForm = page.locator('form').first();
  await unitForm.getByLabel('Code UE', { exact: true }).fill('UE-INF'); await unitForm.getByLabel('Nom UE', { exact: true }).fill('Fondamentaux'); await unitForm.getByLabel('Crédits UE', { exact: true }).fill('30');
  await unitForm.getByRole('combobox', { name: 'Filière', exact: true }).selectOption({ label: 'Informatique' }); await unitForm.getByRole('combobox', { name: 'Année', exact: true }).selectOption({ label: '2026-2027' });
  await unitForm.getByRole('combobox', { name: 'Semestre', exact: true }).selectOption({ label: 'Semestre 1 · Licence 1' }); await unitForm.getByRole('button', { name: 'Créer l’UE' }).click();
  const subjectForm = page.locator('form').nth(1);
  await subjectForm.getByLabel('Code matière', { exact: true }).fill('ALGO'); await subjectForm.getByLabel('Nom matière', { exact: true }).fill('Algorithmique'); await subjectForm.getByLabel('Crédits matière', { exact: true }).fill('30');
  await subjectForm.getByRole('combobox', { name: 'UE', exact: true }).selectOption({ index: 1 }); await subjectForm.getByRole('button', { name: 'Créer la matière' }).click();
  await role(page, ROLES.LOG); await navigate(page, 'Académique', 'Référentiel académique');
  await page.getByRole('button', { name: 'Groupes', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Informatique' }).check(); await page.locator('#group-level').selectOption({ label: 'Licence 1' }); await page.locator('#group-year').selectOption({ label: '2026-2027' }); await page.locator('#group-name').fill('L1-A'); await page.getByRole('button', { name: 'Créer le groupe' }).click();
  await page.getByRole('button', { name: 'Enseignants', exact: true }).click();
  await openActionPanel(page, 'Ajouter ou modifier un enseignant');
  await page.getByLabel('Matricule enseignant', { exact: true }).fill('ENS001'); await page.getByLabel('Prénom', { exact: true }).fill('Koffi'); await page.getByLabel('Nom', { exact: true }).fill('Professeur'); await page.getByRole('button', { name: 'Enregistrer l’enseignant' }).click();
  await page.getByRole('button', { name: 'Affectations', exact: true }).click();
  await page.getByRole('combobox', { name: 'Matière', exact: true }).selectOption({ label: 'Algorithmique' }); await page.getByRole('combobox', { name: 'Enseignant', exact: true }).selectOption({ label: 'Koffi Professeur' }); await page.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption({ label: 'L1-A' }); await page.getByRole('combobox', { name: 'Semestre', exact: true }).selectOption({ label: 'Semestre 1' }); await page.getByRole('button', { name: 'Créer l’affectation' }).click();
  await navigate(page, 'Étudiants', 'Liste des Étudiants');
  await openActionPanel(page, 'Ajouter un étudiant inscrit');
  const studentForm = page.locator('form').first();
  await studentForm.getByLabel('Matricule', { exact: true }).fill('ETU001'); await studentForm.getByLabel('Prénom', { exact: true }).fill('Ama'); await studentForm.getByLabel('Nom', { exact: true }).fill('Etudiante'); await studentForm.getByRole('combobox', { name: 'Groupe', exact: true }).selectOption({ label: 'L1-A · 2026-2027' }); await studentForm.getByRole('combobox', { name: 'Filière', exact: true }).selectOption({ label: 'Informatique' }); await studentForm.getByRole('button', { name: 'Enregistrer le dossier' }).click();
  await expect(page.getByText('Dossier enregistré.', { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'ETU001' }).getByRole('cell').nth(2)).toContainText('Informatique');
  await follow(page, page.getByRole('link', { name: 'Fiche & Dossier', exact: true }));
  await expect(page).toHaveURL('http://127.0.0.1:3105/etudiants/ETU001');
  await page.getByLabel('Ville', { exact: true }).scrollIntoViewIfNeeded();
  const dossierScroll = await page.locator('#main-content').evaluate(element => element.scrollTop);
  await page.getByLabel('Ville', { exact: true }).fill('Lomé');
  await expect.poll(() => page.locator('#main-content').evaluate(element => element.scrollTop)).toBe(dossierScroll);
  await page.getByRole('button', { name: 'Enregistrer le dossier', exact: true }).click();
  await expect(page.getByText('Informations du dossier mises à jour.', { exact: true })).toBeVisible();
  await navigate(page, 'Académique', 'Emploi du temps');
  await openActionPanel(page, 'Salles (0) et périodes bloquées (0)');
  await page.getByLabel('Code salle', { exact: true }).fill('R1'); await page.getByLabel('Nom salle', { exact: true }).fill('Salle A'); await page.getByLabel('Capacité', { exact: true }).fill('30'); await page.getByRole('button', { name: 'Créer la salle' }).click();
  await navigate(page, 'Académique', 'Examens & Rattrapages'); await openActionPanel(page, 'Planifier une épreuve');
  await page.getByRole('combobox', { name: 'Enseignement', exact: true }).selectOption({ index: 1 }); await page.getByRole('combobox', { name: 'Salle', exact: true }).selectOption({ index: 1 }); await page.getByRole('combobox', { name: 'Surveillant', exact: true }).selectOption({ label: 'Surveillant Test' }); await page.getByLabel('Date', { exact: true }).fill('2026-11-10'); await page.getByRole('button', { name: 'Planifier l’épreuve' }).click();
  await expect(page.getByText('Planifié', { exact: true })).toBeVisible();
  await role(page, ROLES.SURV); await page.locator('#main-content select').first().selectOption({ label: 'Surveillant Test' }); await navigate(page, 'Académique', 'Feuilles de présence'); await page.getByRole('button', { name: 'Ouvrir la feuille →' }).click(); await expect(page.getByText('Ama Etudiante', { exact: true })).toBeVisible(); await page.getByRole('button', { name: /Valider l.appel/ }).click();
  await role(page, ROLES.RAF); await navigate(page, 'Finance', 'Contrats, frais & Bourses'); await openActionPanel(page, 'Créer ou réviser un contrat'); await page.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption({ index: 1 }); await page.getByLabel('Scolarité annuelle (FCFA)', { exact: true }).fill('100000'); await page.getByLabel('Frais d’inscription (FCFA)', { exact: true }).fill('10000'); await page.getByLabel('Bourse sur la scolarité (%)', { exact: true }).fill('10'); await page.getByLabel('Libellé de la bourse', { exact: true }).fill('Excellence'); await page.getByLabel('Échéance 1', { exact: true }).fill('2026-11-01'); await page.getByLabel('Motif ou référence du contrat', { exact: true }).fill('Contrat annuel signé'); await page.getByRole('button', { name: 'Enregistrer le contrat' }).click();
  await expect(page.getByText('Contrat et échéancier enregistrés. Les versements précédents sont conservés.', { exact: true })).toBeVisible(); await captureWorkspace(page, 'parcours-contrats');
  await navigate(page, 'Finance', 'Échéanciers & Versements'); await openActionPanel(page, 'Nouveau versement'); await page.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption({ index: 1 }); await page.getByLabel('Montant (FCFA)', { exact: true }).fill('30000'); await page.getByLabel('Référence de transaction / caisse', { exact: true }).fill('CAISSE-001'); await page.getByRole('button', { name: 'Enregistrer le versement' }).click();
  await expect(page.getByText('Paiement enregistré et reçu créé.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Imprimer le reçu' })).toBeVisible();
  await page.getByLabel('Montant (FCFA)', { exact: true }).fill('10000');
  await page.getByLabel('Référence de transaction / caisse', { exact: true }).fill('CAISSE-001');
  await page.getByRole('button', { name: 'Enregistrer le versement' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /référence/i })).toBeVisible();
  await expect(page.getByLabel('Montant (FCFA)', { exact: true })).toHaveValue('10000');
  await captureWorkspace(page, 'parcours-erreur-versement');
  await role(page, ROLES.ENS); await page.locator('#main-content select').first().selectOption({ label: 'Koffi Professeur' }); await navigate(page, 'Académique', 'Évaluations & Notes'); await page.getByRole('button', { name: 'Ouvrir les notes' }).click();
  for (const [name, type, mark] of [['Contrôle continu', 'Devoir', '14'], ['Examen final', 'Examen', '16']]) {
    await page.getByLabel('Nom de l’évaluation', { exact: true }).fill(name); await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption({ label: type }); await page.getByRole('button', { name: 'Créer l’évaluation' }).click();
    const evaluation = page.getByRole('region', { name, exact: true }); await evaluation.getByRole('spinbutton').fill(mark); await evaluation.getByRole('button', { name: 'Soumettre à la direction' }).click();
  }
  await role(page, ROLES.DA); await navigate(page, 'Académique', 'Évaluations & Notes'); await page.getByRole('button', { name: 'Ouvrir les notes' }).click();
  for (const name of ['Contrôle continu', 'Examen final']) {
    const evaluation = page.getByRole('region', { name, exact: true }); await evaluation.getByRole('button', { name: 'Prendre en contrôle' }).click(); await evaluation.getByRole('button', { name: 'Valider les notes' }).click(); await evaluation.getByRole('button', { name: 'Publier les notes' }).click();
  }
  await navigate(page, 'Académique', 'Paramètres académiques'); await page.getByLabel('Référence ou motif du règlement', { exact: true }).fill('Règlement pédagogique validé par le jury'); await page.getByRole('checkbox', { name: /Je valide ces règles/ }).check(); await page.getByRole('button', { name: 'Enregistrer les paramètres' }).click();
  await navigate(page, 'Académique', 'Délibérations & Relevés'); await page.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption({ index: 1 }); await page.getByRole('combobox', { name: 'Semestre', exact: true }).selectOption({ index: 1 }); await page.getByLabel('Motif / Référence du procès-verbal', { exact: true }).fill('PV du jury du semestre 1'); await page.getByRole('button', { name: 'Enregistrer la décision' }).click(); await expect(page.getByText('Décision de jury enregistrée. Le relevé est disponible.', { exact: true })).toBeVisible();
  await role(page, ROLES.STUD); await page.locator('#main-content select').first().selectOption({ label: 'Ama Etudiante' }); await navigate(page, 'Mon Espace', 'Ma scolarité'); await expect(page.getByText('CAISSE-001', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Enregistrer le versement' })).toHaveCount(0);
  await navigate(page, 'Mon Espace', 'Mes documents'); await expect(page.getByRole('button', { name: 'Imprimer la carte' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Imprimer le relevé' })).toBeVisible();
  await page.getByRole('button', { name: 'Imprimer la carte', exact: true }).click();
  await expect(page.frameLocator('iframe.print-frame').last().locator('body')).toContainText('ETU001');
  await expect(page.frameLocator('iframe.print-frame').last().locator('body')).toContainText('2026-2027');
  await page.getByRole('button', { name: 'Certificat de scolarité', exact: true }).click();
  await expect(page.frameLocator('iframe.print-frame').last().locator('h1').last()).toHaveText('Certificat de scolarité');
  await page.getByRole('button', { name: 'Imprimer le relevé', exact: true }).click();
  await expect(page.frameLocator('iframe.print-frame').last().locator('body')).toContainText('Algorithmique');
  await page.getByLabel('Fichier (PDF, JPEG, PNG · 5 Mo max.)', { exact: true }).setInputFiles({ name: 'identite.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }); await page.getByRole('button', { name: 'Ajouter la pièce' }).click(); await expect(page.getByText('identite.pdf', { exact: true })).toBeVisible(); await captureWorkspace(page, 'parcours-documents');
  await navigate(page, 'Mon Espace', 'Tableau de bord');
  await page.getByRole('combobox', { name: 'Note concernée', exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Motif', { exact: true }).fill('Demande de vérification du barème de correction.');
  await page.getByRole('button', { name: 'Déposer la réclamation', exact: true }).click();
  await expect(page.getByText('Réclamation déposée. Vous pouvez suivre son traitement ci-contre.')).toBeVisible();
  await role(page, ROLES.DA); await navigate(page, 'Académique', 'Réclamations');
  await page.getByRole('button', { name: 'Prendre en charge', exact: true }).click();
  await page.getByRole('button', { name: 'Transmettre à l’enseignant', exact: true }).click();
  await page.getByLabel('Avis ou motif').fill('Merci de vérifier la question deux.');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await role(page, ROLES.ENS); await page.locator('#main-content select').first().selectOption({ label: 'Koffi Professeur' });
  await navigate(page, 'Académique', 'Réclamations');
  await page.getByRole('button', { name: 'Donner mon avis' }).click();
  await page.getByLabel('Avis ou motif').fill('Un point supplémentaire doit être attribué.');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await role(page, ROLES.DA); await navigate(page, 'Académique', 'Réclamations');
  for (const action of ['Prendre une décision', 'Demander une correction']) {
    await page.getByRole('button', { name: action, exact: true }).click();
    await page.getByLabel('Avis ou motif').fill('Correction approuvée par la direction académique.');
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Appliquer la correction' }).click();
  await page.getByLabel('Nouvelle note /20').fill('15');
  await page.getByLabel('Avis ou motif').fill('Correction du barème après vérification.');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByText('Traitement terminé', { exact: true })).toBeVisible();
  await captureWorkspace(page, 'parcours-reclamation');
  await role(page, ROLES.LOG); await navigate(page, 'Étudiants', 'Liste des Étudiants');
  await follow(page, page.getByRole('link', { name: 'Fiche & Dossier', exact: true }));
  await page.getByRole('button', { name: 'Conforme', exact: true }).click();
  await page.getByLabel('Motif de la vérification').fill('Pièce originale contrôlée et conforme.');
  await page.getByRole('button', { name: 'Confirmer la vérification' }).click();
  await expect(page.getByText('Vérification enregistrée.', { exact: true })).toBeVisible();
  await captureWorkspace(page, 'parcours-dossier');
  await navigate(page, 'Mon Espace', 'Support technique');
  await openActionPanel(page, 'Nouvelle demande');
  await page.getByLabel('Objet', { exact: true }).fill('Vérification des documents imprimables');
  await page.getByLabel('Description', { exact: true }).fill('Merci de vérifier la présentation du certificat de scolarité.');
  await page.getByRole('button', { name: 'Ouvrir un ticket' }).click();
  await expect(page.getByText('Votre demande a été enregistrée.', { exact: true })).toBeVisible();
  await role(page, ROLES.IT); await navigate(page, 'Système & Audit', 'Tickets de Support');
  for (const action of ['Prendre en charge', 'Résoudre']) {
    await page.getByRole('button', { name: action, exact: true }).click();
    await page.getByLabel('Compte rendu', { exact: true }).fill('Documents contrôlés, présentation conforme.');
    await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  }
  await expect(page.locator('.ledger-item .pill')).toHaveText('Résolu');
  await captureWorkspace(page, 'parcours-support');
  await role(page, ROLES.ACHATS); await navigate(page, 'Achats & Logistique', 'Demandes d’achat');
  await openActionPanel(page, 'Nouvelle demande d’achat');
  await page.getByLabel('Objet de l’achat').fill('Vidéoprojecteur pour la salle de cours');
  await page.getByLabel('Fournisseur', { exact: true }).fill('Fournisseur de démonstration');
  await page.getByLabel('Montant (FCFA)', { exact: true }).fill('200000');
  await page.getByLabel('Date de la demande').fill('2026-10-13');
  await page.getByLabel('Justification').fill('Équipement nécessaire aux enseignements.');
  await page.getByRole('button', { name: 'Soumettre la demande' }).click();
  await expect(page.getByText('Demande enregistrée et transmise pour décision.')).toBeVisible();
  await role(page, ROLES.RAF); await navigate(page, 'Achats & Logistique', 'Demandes d’achat');
  await page.getByRole('button', { name: 'Approuver', exact: true }).click();
  await page.getByLabel('Motif / Référence').fill('Budget approuvé pour cet équipement.');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await role(page, ROLES.ACHATS); await navigate(page, 'Achats & Logistique', 'Demandes d’achat');
  await page.getByRole('button', { name: 'Réceptionner', exact: true }).click();
  await page.getByLabel('Motif / Référence').fill('Matériel reçu et contrôlé.');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Vidéoprojecteur pour la salle de cours' }).getByRole('cell').nth(3)).toContainText('Reçu');
  await captureWorkspace(page, 'parcours-achats');
  await role(page, ROLES.SITE); await navigate(page, 'Achats & Logistique', 'Inventaire');
  await openActionPanel(page, 'Ajouter ou modifier un équipement');
  await page.getByLabel('Désignation').fill('Vidéoprojecteur');
  await page.getByLabel('Localisation').fill('Salle A');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(page.getByLabel('Désignation')).toBeFocused();
  await page.getByRole('combobox', { name: 'État', exact: true }).selectOption('MAINTENANCE');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await captureWorkspace(page, 'parcours-inventaire');
  await role(page, ROLES.DG); await navigate(page, 'Finance', 'Échéanciers & Versements');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByLabel('Motif', { exact: true }).fill('Versement saisi sur une référence erronée.');
  await page.getByRole('button', { name: 'Confirmer l’annulation', exact: true }).click();
  await expect(page.getByText('Paiement annulé. La transaction et son reçu sont conservés.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'CAISSE-001' })).toContainText('Ama Etudiante');
  await expect(page.getByRole('button', { name: 'Imprimer le reçu' })).toBeVisible();
  await page.getByRole('button', { name: 'Imprimer le reçu', exact: true }).click();
  await expect(page.frameLocator('iframe.print-frame').last().locator('body')).toContainText('ANNULÉ');
  await captureWorkspace(page, 'parcours-versement-annule');
  await test.step('Suspension, inscription annuelle et effectifs actifs', async () => {
    await role(page, ROLES.LOG);
    await navigate(page, 'Étudiants', 'Réinscriptions & Abandons');
    await openActionPanel(page, 'Mettre à jour le parcours');
    await page.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption({ index: 1 });
    await page.getByLabel('Opération').selectOption('Suspendu');
    await page.getByLabel('Motif', { exact: true }).fill('Suspension temporaire autorisée.');
    await page.getByRole('button', { name: 'Confirmer l’opération', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: 'ETU001' })).toContainText('Suspendu');
    await role(page, ROLES.DG);
    await navigate(page, 'Tableau de Bord', 'Statistiques Clés');
    await expect(page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Effectifs actifs par niveau' }) }).locator('.catalog-item').filter({ hasText: 'Licence 1' }).locator('strong')).toHaveText('0');
    await role(page, ROLES.LOG);
    await navigate(page, 'Étudiants', 'Réinscriptions & Abandons');
    await openActionPanel(page, 'Mettre à jour le parcours');
    await page.getByRole('combobox', { name: 'Étudiant', exact: true }).selectOption({ index: 1 });
    await page.getByLabel('Opération').selectOption('Inscrit');
    await page.getByLabel('Motif', { exact: true }).fill('Reprise autorisée après suspension.');
    await page.getByRole('button', { name: 'Confirmer l’opération', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Le parcours a été mis à jour');
  });
  await test.step('Deux dossiers successifs conservent leurs propres champs', async () => {
    await navigate(page, 'Étudiants', 'Liste des Étudiants');
    await openActionPanel(page, 'Ajouter un étudiant inscrit');
    const creation = page.locator('form').first();
    await creation.getByLabel('Matricule', { exact: true }).fill('ETU002');
    await creation.getByLabel('Prénom', { exact: true }).fill('Benoit');
    await creation.getByLabel('Nom', { exact: true }).fill('Second');
    await creation.getByLabel('Groupe').selectOption({ index: 1 });
    await creation.getByLabel('Filière').selectOption({ index: 1 });
    await creation.getByRole('button', { name: 'Enregistrer le dossier', exact: true }).click();
    await follow(page, page.getByRole('row').filter({ hasText: 'ETU001' }).getByRole('link', { name: 'Fiche & Dossier' }));
    await page.getByLabel('Ville', { exact: true }).fill('Valeur non enregistrée');
    const search = page.getByRole('searchbox', { name: 'Rechercher une page ou un dossier autorisé' });
    await search.fill('Benoit Second'); await search.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(page).toHaveURL('http://127.0.0.1:3105/etudiants/ETU002');
    await expect(page.getByLabel('Prénom', { exact: true })).toHaveValue('Benoit');
    await expect(page.getByLabel('Ville', { exact: true })).not.toHaveValue('Valeur non enregistrée');
    await captureWorkspace(page, 'parcours-second-dossier');
  });
  await role(page, ROLES.IT);
  await navigate(page, 'Système & Audit', 'Export du journal');
  const exportedJournal = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le journal', exact: true }).click();
  expect((await exportedJournal).suggestedFilename()).toBe('escen-journal.json');
  expect(errors).toEqual([]);
});
}

test('Navigation mobile et recherche sans débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await signIn(page);
  await expect(page.getByRole('button', { name: 'Ouvrir la navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await page.locator('#application-navigation').getByRole('link', { name: 'Finance', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3105/finance'); await expect(page.locator('#application-navigation')).not.toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); expect(overflow).toBe(false);
  await page.getByRole('searchbox', { name: 'Rechercher une page ou un dossier autorisé' }).fill('bourses'); await expect(page.locator('.search-result')).toHaveCount(1); await page.locator('.search-result').click(); await expect(page.getByRole('heading', { name: 'Contrats, frais et bourses', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false); await page.screenshot({ path: '.tmp/frontend-mobile.png', fullPage: true });
});
