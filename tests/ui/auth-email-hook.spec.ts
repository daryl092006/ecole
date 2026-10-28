import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { authEmailMessages, createAuthEmailHook } from '../../supabase/functions/_shared/auth-email.mjs';

const now = 1800000000000;
const bytes = Buffer.alloc(32, 7);
const secret = `v1,whsec_${bytes.toString('base64')}`;
const env = { ESCEN_AUTH_EMAIL_HOOK_SECRET: secret, ESCEN_AUTH_EMAIL_ENABLED: 'true',
  MICROSOFT_TENANT_ID: '10000000-0000-4000-8000-000000000010', MICROSOFT_CLIENT_ID: '10000000-0000-4000-8000-000000000011',
  MICROSOFT_CLIENT_SECRET: 'FAKE+SECRET&=FOR_TESTS', SUPABASE_URL: 'https://project.supabase.co' };
const payload = { user: { email: 'student@example.test' }, email_data: { email_action_type: 'recovery',
  token_hash: 'a'.repeat(56), token: '123456', redirect_to: 'http://localhost:3000/mot-de-passe-reinitialiser', site_url: 'http://localhost:3000' } };
function signed(body: unknown = payload, timestamp = now / 1000, id = 'msg-fixture') {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = createHmac('sha256', bytes).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Request('https://project.supabase.co/functions/v1/auth-email', { method: 'POST', body: raw,
    headers: { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${signature}` } });
}
function transport() {
  const calls: { url: string; request?: RequestInit }[] = [];
  const send: typeof fetch = async (input, request) => {
    const url = String(input); calls.push({ url, request });
    return url.includes('/oauth2/') ? Response.json({ token_type: 'Bearer', access_token: 'fake-token', expires_in: 3600 }) : new Response(null, { status: 202 });
  };
  return { calls, send };
}

test('Hook : refus des demandes non signées, modifiées, périmées et des sessions ordinaires', async () => {
  const { send, calls } = transport(); const hook = createAuthEmailHook(env, send, () => now);
  expect((await hook(new Request('https://local.test'))).status).toBe(405);
  const requests = [
    new Request('https://local.test', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: 'Bearer user-session' } }),
    signed(payload, now / 1000 - 301), signed(payload, now / 1000 + 301), signed(payload, now / 1000, 'bad.id'),
  ];
  const original = signed();
  requests.push(new Request(original.url, { method: 'POST', headers: original.headers, body: JSON.stringify({ ...payload, user: { email: 'attacker@example.test' } }) }));
  for (const request of requests) expect((await hook(request)).status).toBe(401);
  expect(calls).toHaveLength(0);
});

test('Hook : arrêt sans configuration, limites de taille et JSON signé invalide', async () => {
  const { calls, send } = transport();
  for (const overrides of [{ ESCEN_AUTH_EMAIL_ENABLED: 'false' }, { MICROSOFT_CLIENT_SECRET: '' }, { MICROSOFT_TENANT_ID: '../common' }, { ESCEN_AUTH_EMAIL_HOOK_SECRET: '' }]) {
    expect((await createAuthEmailHook({ ...env, ...overrides }, send, () => now)(signed())).status).toBe(503);
  }
  const hook = createAuthEmailHook(env, send, () => now);
  expect((await hook(signed('x'.repeat(65537)))).status).toBe(413);
  expect((await hook(signed('{'))).status).toBe(400);
  expect((await hook(signed({ ...payload, email_data: { ...payload.email_data, email_action_type: 'unknown' } }))).status).toBe(400);
  expect(calls).toHaveLength(0);
});

test('Hook : rotation de clé et signatures multiples', async () => {
  const { send, calls } = transport();
  const hook = createAuthEmailHook({ ...env, ESCEN_AUTH_EMAIL_HOOK_SECRET: `v1,whsec_${Buffer.alloc(32, 8).toString('base64')}|${secret}` }, send, () => now);
  const request = signed();
  request.headers.set('webhook-signature', `v1,${Buffer.alloc(32).toString('base64')} ${request.headers.get('webhook-signature')}`);
  expect((await hook(request)).status).toBe(200);
  expect(calls).toHaveLength(2);
});

test('Hook : envoi Graph depuis noreply, identité française, jeton encodé et aucune fuite de secret', async () => {
  const { send, calls } = transport();
  const response = await createAuthEmailHook(env, send, () => now)(signed());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({});
  expect(calls).toHaveLength(2);
  expect(calls[0].url).toBe(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`);
  expect(new URLSearchParams(String(calls[0].request?.body)).get('client_secret')).toBe(env.MICROSOFT_CLIENT_SECRET);
  expect(calls[1].url).toBe('https://graph.microsoft.com/v1.0/users/noreply%40escen.university/sendMail');
  expect(calls[1].request?.signal).toBe(calls[0].request?.signal);
  expect(calls.every(call => call.request?.redirect === 'error' && call.request?.cache === 'no-store')).toBe(true);
  const message = JSON.parse(String(calls[1].request?.body)).message;
  expect(message.toRecipients).toEqual([{ emailAddress: { address: payload.user.email } }]);
  expect(message.subject).toBe('ESCEN · Réinitialisez votre mot de passe');
  expect(message.body.content).toContain('<html lang="fr">');
  expect(message.body.content).toContain('L’équipe ESCEN');
  expect(message.body.content).not.toContain(env.MICROSOFT_CLIENT_SECRET);
  expect(message.body.content).not.toContain('{{');
});

test('Hook : coalescence des doublons et réutilisation du jeton sans nouvel envoi du même événement', async () => {
  const { send, calls } = transport(); const hook = createAuthEmailHook(env, send, () => now);
  expect((await Promise.all([hook(signed()), hook(signed())])).map(response => response.status)).toEqual([200, 200]);
  expect((await hook(signed())).status).toBe(200);
  expect(calls).toHaveLength(2);
  expect((await hook(signed(payload, now / 1000, 'another-event'))).status).toBe(200);
  expect(calls).toHaveLength(3);
});

test('Hook : refus, réponse ambiguë et timeout sans réessai interne ni succès mensonger', async () => {
  for (const status of [403, 429, 500, 200, 0]) {
    let calls = 0;
    const hook = createAuthEmailHook(env, async () => {
      if (++calls === 1) return Response.json({ token_type: 'Bearer', access_token: 'fake', expires_in: 3600 });
      if (!status) throw new Error('Secret provider response');
      return new Response(null, { status });
    }, () => now);
    const response = await hook(signed());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('Secret provider response');
    expect((await hook(signed())).status).toBe(503);
    expect(calls).toBe(2);
  }
  let calls = 0;
  const hook = createAuthEmailHook(env, async () => { calls++; return Response.json({ error: 'private' }, { status: 401 }); }, () => now);
  expect((await hook(signed())).status).toBe(503);
  expect(calls).toBe(1);
});

test('Modèles : actions Auth existantes, vrais liens de vérification et redirection de récupération', () => {
  for (const action of ['signup', 'invite', 'magiclink', 'email', 'recovery']) {
    const [message] = authEmailMessages({ ...payload, email_data: { ...payload.email_data, email_action_type: action, redirect_to: 'https://portail.example.test/connexion?retour=abc' } }, env.SUPABASE_URL);
    const link = new URL(/href="([^"]+)"/.exec(message.html)![1].replaceAll('&amp;', '&'));
    expect(link.origin).toBe(env.SUPABASE_URL);
    expect(link.pathname).toBe('/auth/v1/verify');
    expect(link.searchParams.get('type')).toBe(action);
    expect(link.searchParams.get('token')).toBe(payload.email_data.token_hash);
    expect(link.searchParams.get('redirect_to')).toBe(action === 'recovery' ? 'https://portail.example.test/mot-de-passe-reinitialiser' : 'https://portail.example.test/connexion?retour=abc');
  }
});

test('Modèles : changement d’email sécurisé, correspondance des deux adresses et des hashes inversés', () => {
  const data = { ...payload.email_data, email_action_type: 'email_change', token_hash_new: 'b'.repeat(56), token_new: '654321' };
  const messages = authEmailMessages({ user: { ...payload.user, new_email: 'new@example.test' }, email_data: data }, env.SUPABASE_URL);
  expect(messages.map(message => message.recipient)).toEqual(['student@example.test', 'new@example.test']);
  expect(messages[0].html).toContain(`token=${data.token_hash_new}`);
  expect(messages[1].html).toContain(`token=${data.token_hash}`);
  expect(authEmailMessages({ user: { ...payload.user, new_email: 'new@example.test' }, email_data: { ...data, token_hash_new: '' } }, env.SUPABASE_URL)).toHaveLength(1);
});

test('Modèles : code de réauthentification et notifications de sécurité en français', () => {
  const [code] = authEmailMessages({ ...payload, email_data: { ...payload.email_data, email_action_type: 'reauthentication' } }, env.SUPABASE_URL);
  expect(code.html).toContain('123456'); expect(code.html).not.toContain('href=');
  for (const action of ['password_changed', 'email_changed', 'phone_changed', 'identity_linked', 'identity_unlinked', 'mfa_factor_enrolled', 'mfa_factor_unenrolled']) {
    const [message] = authEmailMessages({ ...payload, email_data: { email_action_type: `${action}_notification` } }, env.SUPABASE_URL);
    expect(message.html).toContain('contactez immédiatement l’administration');
    expect(message.html).not.toContain('{{'); expect(message.html).not.toContain('href=');
  }
});

test('Modèles : données invalides et injections refusées, métadonnées utilisateur ignorées', () => {
  for (const data of [{ token_hash: 'bad' }, { redirect_to: 'javascript:alert(1)' }, { redirect_to: 'http://attacker.test' }]) {
    expect(() => authEmailMessages({ ...payload, email_data: { ...payload.email_data, ...data } }, env.SUPABASE_URL)).toThrow();
  }
  expect(() => authEmailMessages({ ...payload, user: { email: 'student@example.test\r\nBcc: bad@example.test' } }, env.SUPABASE_URL)).toThrow();
  const [message] = authEmailMessages({ ...payload, user: { ...payload.user, user_metadata: { name: '<script>alert(1)</script>' } } }, env.SUPABASE_URL);
  expect(message.html).not.toContain('<script>');
});
