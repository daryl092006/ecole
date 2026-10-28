import 'server-only';
import { z } from 'zod';
import type { EmailConfiguration, EmailErrorCode, QueuedEmail } from '@/types/email';

type Environment = Record<string, string | undefined>;
export type EmailOutcome = { status: 'ACCEPTED'; reference: string } | { status: 'FAILED' | 'UNKNOWN'; error: EmailErrorCode };

export function emailConfiguration(env: Environment = process.env): EmailConfiguration {
  const provider = env.ESCEN_EMAIL_PROVIDER === 'resend' ? 'resend' : env.ESCEN_EMAIL_PROVIDER === 'microsoft' ? 'microsoft' : null;
  const from = z.email().safeParse(env.ESCEN_EMAIL_FROM?.trim());
  const credentials = provider === 'microsoft'
    ? z.uuid().safeParse(env.MICROSOFT_TENANT_ID?.trim()).success && z.uuid().safeParse(env.MICROSOFT_CLIENT_ID?.trim()).success && !!env.MICROSOFT_CLIENT_SECRET?.trim()
    : !!env.RESEND_API_KEY?.trim();
  const ready = !!(provider && from.success && credentials && env.ESCEN_EMAIL_ENABLED === 'true');
  return { ready, provider, from: from.success ? from.data : null,
    issue: ready ? null : 'Envoi désactivé ou incomplet : configurez le service et l’adresse expéditrice.' };
}

/** No automatic retry: a timeout or an ambiguous response may conceal an accepted mail. */
export async function deliverEmail(message: QueuedEmail, env: Environment = process.env, send: typeof fetch = fetch): Promise<EmailOutcome> {
  const configuration = emailConfiguration(env);
  if (!configuration.ready) return { status: 'FAILED', error: 'CONFIGURATION' };
  if (configuration.provider === 'microsoft') return deliverMicrosoftEmail(message, configuration.from!, env, send);
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': `escen-email-outbox/${message.id}` },
      body: JSON.stringify({ from: configuration.from, to: [message.recipient_email], subject: message.subject, text: message.text_body, html: message.html_body }),
    });
    // Server failures, conflicts and timeouts cannot establish that nothing was sent.
    if (!response.ok) return response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)
      ? { status: 'FAILED', error: 'PROVIDER_REJECTED' } : { status: 'UNKNOWN', error: 'UNEXPECTED_RESPONSE' };
    const result = z.object({ id: z.string().trim().min(1).max(240) }).safeParse(await response.json());
    return result.success ? { status: 'ACCEPTED', reference: result.data.id } : { status: 'UNKNOWN', error: 'UNEXPECTED_RESPONSE' };
  } catch { return { status: 'UNKNOWN', error: 'NETWORK_AMBIGUOUS' }; }
}

async function deliverMicrosoftEmail(message: QueuedEmail, from: string, env: Environment, send: typeof fetch): Promise<EmailOutcome> {
  let accessToken: string;
  // Authentication cannot send a message: failures here are safe to classify as FAILED.
  try {
    const response = await send(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID!.trim()}/oauth2/v2.0/token`, {
      method: 'POST', signal: AbortSignal.timeout(4000), redirect: 'error', cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.MICROSOFT_CLIENT_ID!.trim(), client_secret: env.MICROSOFT_CLIENT_SECRET!,
        grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' }),
    });
    if (!response.ok) return { status: 'FAILED', error: 'CONFIGURATION' };
    const token = z.object({ access_token: z.string().trim().min(1), token_type: z.literal('Bearer') }).safeParse(await response.json());
    if (!token.success) return { status: 'FAILED', error: 'CONFIGURATION' };
    accessToken = token.data.access_token;
  } catch { return { status: 'FAILED', error: 'CONFIGURATION' }; }
  try {
    const response = await send(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
      method: 'POST', signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'client-request-id': message.id },
      body: JSON.stringify({ message: { subject: message.subject,
        body: message.html_body ? { contentType: 'HTML', content: message.html_body } : { contentType: 'Text', content: message.text_body },
        toRecipients: [{ emailAddress: { address: message.recipient_email } }],
      } }),
    });
    // Graph returns 202 without a message ID or response body. The request ID is a trace reference, not an idempotency key.
    if (response.status === 202) return { status: 'ACCEPTED', reference: `microsoft:${(response.headers.get('request-id') || message.id).slice(0, 220)}` };
    return response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)
      ? { status: 'FAILED', error: 'PROVIDER_REJECTED' } : { status: 'UNKNOWN', error: 'UNEXPECTED_RESPONSE' };
  } catch { return { status: 'UNKNOWN', error: 'NETWORK_AMBIGUOUS' }; }
}
