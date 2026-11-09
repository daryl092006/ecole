import assert from 'node:assert/strict';
import { diplomaSchema, brochureSchema, articleSchema, identitySchema, guardianSchema, websiteAccess, escapeArticleContent, sniffDocument, resolveAllowedWebsiteOrigins } from './websiteService';
import { ROLES } from '@/types/permissions';
import type { PersistentContext } from '@/types/persistence';
import { ARTICLE_DOCUMENT_PREFIX, articlePlainText, renderArticleContent } from '@/utils/articleDocument';

const richArticle = ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: [
  { type: 'heading', level: 2, content: [{ text: 'Vie du campus' }] },
  { type: 'paragraph', content: [{ text: 'Bienvenue <ESCEN>', bold: true }, { text: 'Programme', href: 'https://escen.university/programmes' }] },
  { type: 'list', ordered: false, items: [[{ text: 'Premier atelier' }], [{ text: 'Deuxième atelier', italic: true }]] },
  { type: 'image', src: 'https://escen.university/campus.jpg', alt: 'Le campus' },
] });
assert.match(renderArticleContent(richArticle), /<h2>Vie du campus<\/h2>/);
assert.match(renderArticleContent(richArticle), /<strong>Bienvenue &lt;ESCEN&gt;<\/strong>/);
assert.match(renderArticleContent(richArticle), /<ul><li>Premier atelier<\/li>/);
assert.match(renderArticleContent(richArticle), /rel="noopener noreferrer"/);
assert.equal(articlePlainText(richArticle), 'Vie du campus\n\nBienvenue <ESCEN>Programme\n\nPremier atelier\nDeuxième atelier\n\n');
const articleInput = { title: 'Titre', slug: 'titre', excerpt: 'Résumé', content: richArticle, image: '', status: 'PUBLIE' };
assert.equal(articleSchema.safeParse(articleInput).success, true);
for (const block of [
  { type: 'paragraph', content: [{ text: 'Cliquer', href: 'javascript:alert(1)' }] },
  { type: 'image', src: 'data:image/svg+xml,<svg onload=alert(1)>', alt: 'Image' },
  { type: 'script', content: [{ text: 'alert(1)' }] },
  { type: 'paragraph', content: [{ text: 'Texte', onclick: 'alert(1)' }] },
]) {
  const content = ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: [block] });
  assert.equal(articleSchema.safeParse({ ...articleInput, content }).success, false);
  assert.equal(renderArticleContent(content), '');
}
assert.equal(articleSchema.safeParse({ ...articleInput, content: ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: [] }) }).success, false);

assert.equal(escapeArticleContent('<script>alert(1)</script>\nTexte'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;<br>Texte</p>');
assert.equal(escapeArticleContent('Première partie\n\nSeconde'), '<p>Première partie</p><p>Seconde</p>');
assert.equal(sniffDocument(Buffer.from('%PDF-1.7')), 'application/pdf');
assert.equal(sniffDocument(Buffer.from('<svg onload="alert(1)">')), undefined);
assert.equal(articleSchema.safeParse({ title: 'Titre', slug: '../danger', excerpt: 'Résumé', content: 'Texte', image: '', status: 'PUBLIE' }).success, false);
assert.equal(articleSchema.safeParse({ title: 'Titre', slug: 'titre', excerpt: 'Résumé', content: 'Texte', image: 'javascript:alert(1)', status: 'PUBLIE' }).success, false);
const validPngDataUrl = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]).toString('base64')}`;
const fakePngDataUrl = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
assert.equal(articleSchema.safeParse({ ...articleInput, image: validPngDataUrl }).success, true);
assert.equal(articleSchema.safeParse({ ...articleInput, image: fakePngDataUrl }).success, false);
const inlinePhotoArticle = ARTICLE_DOCUMENT_PREFIX + JSON.stringify({ blocks: [
  { type: 'paragraph', content: [{ text: 'Photo intégrée' }] },
  { type: 'image', src: validPngDataUrl, alt: 'Photo du campus' },
] });
assert.equal(articleSchema.safeParse({ ...articleInput, content: inlinePhotoArticle }).success, true);
assert.equal(identitySchema.safeParse({ nom: 'Test', prenom: 'Alice', genre: 'Féminin', date_naissance: '2000-01-01', lieu_naissance: 'Lomé', nationalite: 'Togolaise', email: 'alice@example.test', tel: '+22890000000', active: true }).success, false);
assert.equal(guardianSchema.safeParse({ nom: 'Test', prenom: 'Parent', tel: '+22890000000', responsable_des_frais: '1' }).success, true);
const masterDiploma = diplomaSchema.parse({ type_diplome_id: 'Master', annee_diplome: '2024', specialite_diplome: 'Finance' });
assert.equal(masterDiploma.annee_diplome, 2024);
assert.equal(masterDiploma.specialite_diplome, 'Finance');
assert.equal(diplomaSchema.safeParse({ type_diplome_id: 'Master', annee_diplome: new Date().getFullYear() + 1 }).success, false);
assert.equal(diplomaSchema.safeParse({ type_diplome_id: 'Master', annee_diplome: 2024.5 }).success, false);
assert.equal(diplomaSchema.safeParse({ type_diplome_id: 'BAC', annee_bac: 2020, serie: 'D' }).success, true);
const context = { role: ROLES.IT, permissions: ['student.view', 'student.lifecycle.manage', 'communication.view', 'communication.manage'], grants: [{ site_id: null, group_id: null, academic_year_id: null }] } as PersistentContext;
assert.deepEqual(websiteAccess(context), { admissions: true, manageAdmissions: true, articles: true, manageArticles: true });
assert.equal(websiteAccess({ ...context, grants: [{ ...context.grants[0], site_id: 'SITE' }] }).admissions, false);
assert.equal(websiteAccess({ ...context, role: ROLES.STUD }).admissions, false);
assert.equal(websiteAccess({ ...context, permissions: ['communication.view'] }).manageArticles, false);
console.log('Vérification réussie : validation des dossiers publics, fichiers autorisés, échappement des articles et accès par rôle/périmètre.');

const brochure = { title: 'Brochure ESCEN', slug: 'brochure-escen', description: '', status: 'BROUILLON', reason: 'Préparation' };
assert.equal(brochureSchema.safeParse(brochure).success, true);
assert.equal(brochureSchema.safeParse({ ...brochure, slug: '../secret' }).success, false);
assert.equal(brochureSchema.safeParse({ ...brochure, id: '11111111-1111-4111-8111-111111111111' }).success, false);
assert.equal(brochureSchema.safeParse({ ...brochure, object_path: 'private/secret.pdf' }).success, false);

const originsFromApex = resolveAllowedWebsiteOrigins({ ESCEN_WEBSITE_URL: 'https://escen.university' });
assert.equal(originsFromApex.has('https://www.escen.university'), true);
assert.equal(originsFromApex.has('https://escen.university'), true);
assert.equal(originsFromApex.has('https://portail.escen.university'), true);
assert.equal(originsFromApex.has('https://origine-inconnue.example'), false);

const originsFromCustom = resolveAllowedWebsiteOrigins({ ESCEN_WEBSITE_URL: 'https://www.campus-test.org' });
assert.equal(originsFromCustom.has('https://www.campus-test.org'), true);
assert.equal(originsFromCustom.has('https://campus-test.org'), true);
