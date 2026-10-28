import { AUTH_EMAIL_TEMPLATES, renderAuthEmail } from './auth-email-templates.mjs';

const encoder = new TextEncoder();
const email = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f\d]{32,128}$/i.test(value);
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;');
const notificationTitles = {
  password_changed_notification: 'Votre mot de passe a été modifié',
  email_changed_notification: 'Votre adresse email a été modifiée',
  phone_changed_notification: 'Votre numéro de téléphone a été modifié',
  identity_linked_notification: 'Une connexion externe a été ajoutée',
  identity_unlinked_notification: 'Une connexion externe a été retirée',
  mfa_factor_enrolled_notification: 'Une méthode de vérification a été ajoutée',
  mfa_factor_unenrolled_notification: 'Une méthode de vérification a été retirée',
};

function decodeBase64(value) { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }
function failure(status, message) { return Response.json({ error: { http_code: status, message } }, { status, headers: { 'Cache-Control': 'no-store' } }); }

async function verifySignature(body, headers, secret, now) {
  const id = headers.get('webhook-id') || '';
  const timestamp = headers.get('webhook-timestamp') || '';
  const signature = headers.get('webhook-signature') || '';
  if (!/^[\w-]{1,200}$/.test(id) || !/^\d{1,12}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || signature.length > 2048) return false;
  const signed = encoder.encode(`${id}.${timestamp}.${body}`);
  for (const candidate of secret.split('|').slice(0, 4)) {
    const match = /^(?:v1,)?whsec_([A-Za-z\d+/]+={0,2})$/.exec(candidate.trim());
    if (!match) continue;
    const bytes = decodeBase64(match[1]);
    if (bytes.length < 24 || bytes.length > 64) continue;
    const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    for (const part of signature.split(/\s+/)) {
      const [version, value] = part.split(',');
      if (version === 'v1' && value && await crypto.subtle.verify('HMAC', key, decodeBase64(value), signed)) return true;
    }
  }
  return false;
}

function verificationLink(data, tokenHash, supabaseUrl) {
  if (!hash(tokenHash)) throw new Error('Invalid token');
  const origin = new URL(supabaseUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password) throw new Error('Invalid service URL');
  const redirect = new URL(data.redirect_to || data.site_url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname);
  if ((redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && local)) || redirect.username || redirect.password) throw new Error('Invalid redirect');
  if (data.email_action_type === 'recovery') {
    redirect.pathname = '/mot-de-passe-reinitialiser'; redirect.search = ''; redirect.hash = '';
  }
  const url = new URL('/auth/v1/verify', origin);
  url.search = new URLSearchParams({ token: tokenHash, type: data.email_action_type, redirect_to: redirect.href }).toString();
  return url.href;
}

/** Build only from the verified Auth payload; user metadata is never interpolated. */
export function authEmailMessages(payload, supabaseUrl) {
  const { user, email_data: data } = payload || {};
  if (!user || !data || !email(user.email)) throw new Error('Invalid payload');
  const action = data.email_action_type;
  let template = AUTH_EMAIL_TEMPLATES.find(item => item.type === ({ signup: 'confirmation', magiclink: 'magic_link', email: 'magic_link' }[action] || action));
  if (Object.hasOwn(notificationTitles, action)) template = {
    type: action, subject: `ESCEN · ${notificationTitles[action]}`, title: notificationTitles[action],
    paragraphs: ['Une modification de sécurité a été effectuée sur votre compte ESCEN.'],
    notice: 'Si vous n’êtes pas à l’origine de cette modification, contactez immédiatement l’administration ESCEN.',
  };
  if (!template) throw new Error('Unsupported action');
  function message(recipient, tokenHash, code) {
    if (!email(recipient)) throw new Error('Invalid recipient');
    const notification = Object.hasOwn(notificationTitles, action);
    const isCode = action === 'reauthentication';
    if (isCode && (typeof code !== 'string' || !/^\d{4,12}$/.test(code))) throw new Error('Invalid code');
    const link = notification || isCode ? '' : verificationLink(data, tokenHash, supabaseUrl);
    let html = renderAuthEmail(template);
    if (notification) html = html.replace(/<p style="margin:26px 0;padding:16px[\s\S]*?<\/p>/, '');
    html = html.replaceAll('{{ .ConfirmationURL }}', escapeHtml(link)).replaceAll('{{ .Token }}', isCode ? code : '');
    return { recipient, subject: template.subject, html };
  }
  if (action === 'email_change') {
    if (!email(user.new_email)) throw new Error('Invalid new email');
    // Supabase's legacy field names are inverted for Secure Email Change.
    if (data.token_hash_new) return [message(user.email, data.token_hash_new, data.token), message(user.new_email, data.token_hash, data.token_new)];
    return [message(user.new_email, data.token_hash, data.token_new || data.token)];
  }
  return [message(user.email, data.token_hash, data.token)];
}

/** Standalone Edge handler: no database writes, no queued authentication tokens. */
export function createAuthEmailHook(env, send = fetch, now = Date.now) {
  // Bound, short-lived coalescing inside one Edge instance; not a durable global delivery ledger.
  const deliveries = new Map();
  let cachedToken;
  let tokenRequest;
  async function accessToken(signal) {
    if (cachedToken && cachedToken.expiresAt > now() + 30000) return cachedToken.value;
    if (tokenRequest) return tokenRequest;
    tokenRequest = (async () => {
      const response = await send(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST', redirect: 'error', cache: 'no-store', signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.MICROSOFT_CLIENT_ID, client_secret: env.MICROSOFT_CLIENT_SECRET,
          grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' }),
      });
      if (!response.ok) throw new Error('Authentication failed');
      const token = await response.json();
      if (token.token_type !== 'Bearer' || typeof token.access_token !== 'string' || !token.access_token.trim() || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error('Invalid authentication response');
      cachedToken = { value: token.access_token, expiresAt: now() + Math.min(token.expires_in, 3600) * 1000 };
      return token.access_token;
    })().finally(() => { tokenRequest = null; });
    return tokenRequest;
  }
  return async request => {
    if (request.method !== 'POST') return failure(405, 'Méthode non autorisée.');
    const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
    if (!env.ESCEN_AUTH_EMAIL_HOOK_SECRET || !uuid.test(env.MICROSOFT_TENANT_ID || '') || !uuid.test(env.MICROSOFT_CLIENT_ID || '') || !env.MICROSOFT_CLIENT_SECRET || env.ESCEN_AUTH_EMAIL_ENABLED !== 'true') {
      return failure(503, 'Le service de courriel ESCEN est indisponible.');
    }
    let raw;
    try {
      if (!request.body) return failure(400, 'Demande invalide.');
      const reader = request.body.getReader();
      const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 65536) { await reader.cancel(); return failure(413, 'Demande trop volumineuse.'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let position = 0;
      for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
      raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!await verifySignature(raw, request.headers, env.ESCEN_AUTH_EMAIL_HOOK_SECRET, now())) return failure(401, 'Signature invalide.');
    } catch { return failure(401, 'Signature invalide.'); }
    let messages;
    try { messages = authEmailMessages(JSON.parse(raw), env.SUPABASE_URL); }
    catch { return failure(400, 'Demande de courriel invalide.'); }
    // Keep neither raw payloads nor recovery links in the cache.
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(raw))), byte => byte.toString(16).padStart(2, '0')).join('');
    const key = `${request.headers.get('webhook-id')}:${digest}`;
    for (const [id, entry] of deliveries) if (entry.expiresAt <= now()) deliveries.delete(id);
    if (!deliveries.has(key)) {
      if (deliveries.size >= 1000) return failure(503, 'Le service de courriel ESCEN est occupé.');
      const result = (async () => {
        try {
          // Supabase HTTP hooks have a five-second budget, including network overhead.
          const signal = AbortSignal.timeout(3500);
          const token = await accessToken(signal);
          const results = await Promise.all(messages.map(message => send('https://graph.microsoft.com/v1.0/users/noreply%40escen.university/sendMail', {
            method: 'POST', redirect: 'error', cache: 'no-store', signal,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { subject: message.subject,
              body: { contentType: 'HTML', content: message.html },
              toRecipients: [{ emailAddress: { address: message.recipient } }],
            } }),
          })));
          if (results.every(response => response.status === 202)) return { status: 200, message: '' };
          return { status: 503, message: 'Le courriel n’a pas pu être confirmé. Demandez un nouveau lien.' };
        } catch { return { status: 503, message: 'Le courriel n’a pas pu être confirmé. Demandez un nouveau lien.' }; }
      })();
      deliveries.set(key, { expiresAt: now() + 300000, result });
    }
    const result = await deliveries.get(key).result;
    return result.status === 200 ? Response.json({}, { headers: { 'Cache-Control': 'no-store' } }) : failure(result.status, result.message);
  };
}
