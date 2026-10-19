import 'server-only';
import { z } from 'zod';
import type { EmailConfiguration, EmailErrorCode, QueuedEmail } from '@/types/email';

type Environment = Record<string, string | undefined>;
export type EmailOutcome = { status: 'ACCEPTED'; reference: string } | { status: 'FAILED' | 'UNKNOWN'; error: EmailErrorCode };

export function emailConfiguration(env: Environment = process.env): EmailConfiguration {
  const provider = env.ESCEN_EMAIL_PROVIDER === 'resend' ? 'resend' : null;
  const from = z.email().safeParse(env.ESCEN_EMAIL_FROM?.trim());
  const ready = !!(provider && from.success && env.RESEND_API_KEY?.trim() && env.ESCEN_EMAIL_ENABLED === 'true');
  return { ready, provider, from: from.success ? from.data : null,
    issue: ready ? null : 'Envoi désactivé ou incomplet : configurez le service et l’adresse expéditrice.' };
}

/** No automatic retry: a timeout or an ambiguous response may conceal an accepted mail. */
export async function deliverEmail(message: QueuedEmail, env: Environment = process.env, send: typeof fetch = fetch): Promise<EmailOutcome> {
  const configuration = emailConfiguration(env);
  if (!configuration.ready) return { status: 'FAILED', error: 'CONFIGURATION' };
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
