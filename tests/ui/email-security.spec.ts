import { expect, test } from '@playwright/test';
import { loadSecurityApi, securityContext, securityIds as ids, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import type { PersistentContext } from '../../src/types/persistence';
import type { QueuedEmail } from '../../src/types/email';
import { getAvailableTabs } from '../../src/permissions/navigation';

const mail = { id: uuid(999), recipient_email: 'student@example.test', subject: 'Copie remise', text_body: 'Texte', html_body: '<p>Texte</p>' } as QueuedEmail;
const configured = { ESCEN_EMAIL_PROVIDER: 'resend', ESCEN_EMAIL_ENABLED: 'true', ESCEN_EMAIL_FROM: 'ecole@example.test', RESEND_API_KEY: 'FAKE_KEY_FOR_LOCAL_TESTS' };
function fixture(context: PersistentContext = securityContext(), errorCode = '') {
  const calls: { name: string; args?: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string, args?: Record<string, unknown>) => {
    calls.push({ name, args });
    if (name === 'escen_backend_snapshot') return { data: { tables: { academic_years: [{ id: ids.year, name: '2026-2027', status: 'OUVERTE' }] } } };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: ids.year } };
    return errorCode ? { error: { code: errorCode } } : { data: name === 'escen_email_retry' ? 8 : { yearId: args?.p_year_id, records: [], total: 0, limit: 50, offset: args?.p_offset } };
  } };
  const route = loadSecurityApi('app/api/email-outbox/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const get = (query = '', year = 'current') => route.GET(new Request(`http://local.test/api/email-outbox${query}`, { headers: { 'x-escen-year': year } }));
  const post = (body: unknown, year = ids.year) => route.POST(new Request('http://local.test/api/email-outbox', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-escen-year': year }, body: JSON.stringify(body) }));
  return { client, calls, get, post };
}

test('Mails : navigation et API réservées aux accès globaux DG/IT', async () => {
  for (const role of [ROLES.ENS, ROLES.STUD, ROLES.DGA]) {
    const f = fixture(securityContext(role));
    expect((await f.get()).status).toBe(403);
    expect(f.calls).toHaveLength(0);
    expect(getAvailableTabs(role).flatMap(tab => tab.subTabs).some(tab => tab.id === 'sys_emails')).toBe(false);
  }
  const scoped = securityContext(ROLES.IT, { grants: [{ role_code: 'IT', role_name: ROLES.IT, site_id: ids.site, group_id: null, academic_year_id: null }] });
  expect((await fixture(scoped).get()).status).toBe(403);
  expect(getAvailableTabs(ROLES.IT, undefined, false).flatMap(tab => tab.subTabs).some(tab => tab.id === 'sys_emails')).toBe(false);
  const director = fixture(securityContext(ROLES.DG, { roleCode: 'DG' }));
  expect((await director.get()).status).toBe(200);
  expect((await director.post({ id: mail.id, version: 7, reason: 'Motif complet' })).status).toBe(403);
});

test('Mails : année exacte, filtres bornés et erreurs explicites', async () => {
  const f = fixture();
  expect((await f.get('?offset=50', 'all')).status).toBe(200);
  expect(f.calls.at(-1)).toMatchObject({ name: 'escen_email_page', args: { p_year_id: null, p_offset: 50 } });
  expect((await f.get('', ids.otherYear)).status).toBe(403);
  for (const query of ['?offset=-1', '?offset=1.5', '?p_actor_id=injected']) expect((await f.get(query)).status).toBe(400);
  expect((await fixture(undefined, 'PGRST202').get()).status).toBe(503);
  const response = await f.get();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(JSON.stringify(await response.json())).not.toContain('RESEND_API_KEY');
});

test('Mails : reprise authentifiée, motif, version et année précise', async () => {
  const f = fixture(); const body = { id: mail.id, version: 7, reason: 'Expéditeur corrigé' };
  expect((await f.post(body)).status).toBe(200);
  expect(f.calls.at(-1)).toMatchObject({ name: 'escen_email_retry', args: { p_actor_id: uuid(900), p_role_code: 'IT', p_year_id: ids.year, p_version: 7 } });
  expect((await f.post(body, 'all')).status).toBe(409);
  for (const invalid of [{ ...body, reason: ' ' }, { ...body, version: 0 }, { ...body, status: 'ACCEPTED' }]) expect((await f.post(invalid)).status).toBe(400);
  expect((await fixture(undefined, '40001').post(body)).status).toBe(409);
});

test('Transport : désactivé sans configuration et sans appel réseau', async () => {
  const transport = loadSecurityApi('server/emailTransport.ts', {}, securityContext()) as { deliverEmail: (message: QueuedEmail, env: object, send: typeof fetch) => Promise<unknown> };
  let calls = 0;
  expect(await transport.deliverEmail(mail, {}, async () => { calls++; throw new Error('Interdit'); })).toEqual({ status: 'FAILED', error: 'CONFIGURATION' });
  expect(calls).toBe(0);
});

test('Transport : destinataire individuel, clé stable et acceptation sans promesse de réception', async () => {
  const transport = loadSecurityApi('server/emailTransport.ts', {}, securityContext()) as { deliverEmail: (message: QueuedEmail, env: object, send: typeof fetch) => Promise<unknown> };
  const result = await transport.deliverEmail(mail, configured, async (url, request) => {
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(request?.headers).get('Idempotency-Key')).toBe(`escen-email-outbox/${mail.id}`);
    expect(JSON.parse(String(request?.body))).toMatchObject({ to: ['student@example.test'], subject: mail.subject });
    return Response.json({ id: 'provider-id' });
  });
  expect(result).toEqual({ status: 'ACCEPTED', reference: 'provider-id' });
});

test('Transport : refus confirmé séparé des réponses incertaines et aucun retry réseau', async () => {
  const transport = loadSecurityApi('server/emailTransport.ts', {}, securityContext()) as { deliverEmail: (message: QueuedEmail, env: object, send: typeof fetch) => Promise<unknown> };
  for (const [status, outcome] of [[422, 'FAILED'], [429, 'FAILED'], [408, 'UNKNOWN'], [409, 'UNKNOWN'], [500, 'UNKNOWN']] as const) {
    let calls = 0;
    expect(await transport.deliverEmail(mail, configured, async () => { calls++; return Response.json({ error: 'private' }, { status }); })).toMatchObject({ status: outcome });
    expect(calls).toBe(1);
  }
  expect(await transport.deliverEmail(mail, configured, async () => { throw new Error('network'); })).toEqual({ status: 'UNKNOWN', error: 'NETWORK_AMBIGUOUS' });
  expect(await transport.deliverEmail(mail, configured, async () => Response.json({}))).toEqual({ status: 'UNKNOWN', error: 'UNEXPECTED_RESPONSE' });
});

test('Worker : file non prise si désactivée, puis résultats persistés avec jeton', async () => {
  const worker = loadSecurityApi('server/emailWorker.ts', {}, securityContext()) as { processEmailBatch: (client: unknown, env: object, send: typeof fetch) => Promise<unknown> };
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: name === 'escen_email_claim' ? [mail] : 2 }; } };
  const send = async () => Response.json({ id: 'accepted' });
  expect(await worker.processEmailBatch(client, {}, send)).toMatchObject({ configured: false, processed: 0 });
  expect(calls).toHaveLength(0);
  expect(await worker.processEmailBatch(client, configured, send)).toMatchObject({ processed: 1, accepted: 1 });
  expect(calls[1]).toMatchObject({ name: 'escen_email_complete', args: { p_id: mail.id, p_lock_token: calls[0].args.p_lock_token, p_outcome: 'ACCEPTED' } });
  const broken = { rpc: async (name: string) => name === 'escen_email_claim' ? { data: [mail] } : { error: { code: '40001' } } };
  await expect(worker.processEmailBatch(broken, configured, send)).rejects.toThrow('incertain');
});

test('Worker HTTP : aucun accès avec une session utilisateur ou sans secret', async () => {
  const worker = loadSecurityApi('app/api/email-outbox/process/route.ts', {}, securityContext()) as { POST: (request: Request) => Promise<Response> };
  for (const authorization of ['', 'Bearer fixture-auth-token']) expect((await worker.POST(new Request('http://local.test/api/email-outbox/process', { method: 'POST', headers: { authorization } }))).status).toBe(401);
});
