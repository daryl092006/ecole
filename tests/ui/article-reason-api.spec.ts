import { expect, test } from '@playwright/test';
import { evaluationSecurityRoute, loadSecurityApi, securityContext, securityIds, uuid } from './security-fixture';

function fixture(context = securityContext()) {
  const snapshot = evaluationSecurityRoute(context).snapshot;
  const writes: Record<string, unknown>[] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown> = {}) => {
    if (name === 'escen_backend_snapshot') return { data: snapshot, error: null };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: securityIds.year }, error: null };
    if (name === 'escen_website_manage') { writes.push(args); return { data: { id: uuid(8000) }, error: null }; }
    throw new Error(`RPC imprévue : ${name}`);
  } };
  const route = loadSecurityApi('app/api/website-management/route.ts', client, context) as { POST: (request: Request) => Promise<Response> };
  const post = (data: Record<string, unknown>) => route.POST(new Request('http://local.test/api/website-management', { method: 'POST', headers: { 'x-escen-year': securityIds.year }, body: JSON.stringify(data) }));
  return { writes, post };
}
const article = { action: 'article-save', title: 'Article sans motif', slug: 'article-sans-motif', excerpt: 'Résumé de l’article', content: 'Contenu de l’article', image: '', status: 'BROUILLON' };

test('Articles : enregistrement sans motif et aucun motif automatique transmis à la RPC', async () => {
  const f = fixture();
  expect((await f.post(article)).status).toBe(201);
  expect(f.writes).toHaveLength(1);
  expect(f.writes[0].p_data).not.toHaveProperty('reason');
  expect(f.writes[0].p_data).toMatchObject({ title: article.title, academic_year_id: securityIds.year });
});
test('Articles : le champ motif retiré est refusé par le schéma strict', async () => {
  const f = fixture();
  expect((await f.post({ ...article, reason: 'Ancien champ' })).status).toBe(400);
  expect(f.writes).toHaveLength(0);
});
test('Articles : permission et version restent obligatoires', async () => {
  const context = securityContext();
  context.permissions = context.permissions.filter(permission => permission !== 'communication.manage');
  const forbidden = fixture(context);
  expect((await forbidden.post(article)).status).toBe(403);
  expect(forbidden.writes).toHaveLength(0);
  const f = fixture();
  expect((await f.post({ ...article, id: uuid(8000) })).status).toBe(400);
  expect(f.writes).toHaveLength(0);
});
