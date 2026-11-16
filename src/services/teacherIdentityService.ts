import { z } from 'zod';
import registry from '@/data/protectedTeacherAccounts.json';

export const teacherPersonalEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email())
  .refine(email => !email.endsWith('@escen.university'), 'Indiquez une adresse personnelle, différente du compte ESCEN.');

export const teacherIdentityKey = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
  .filter(token => token && !['m', 'mr', 'mme', 'dr', 'monsieur', 'madame'].includes(token)).sort().join(' ');

export function protectedTeacherAccount(firstname: string, lastname: string) {
  const key = teacherIdentityKey(`${firstname} ${lastname}`);
  return registry.find(row => [row.name, ...('nameAliases' in row ? row.nameAliases || [] : [])]
    .some(name => teacherIdentityKey(name) === key));
}

export const protectedTeacherEmails = new Set(registry.flatMap(row => [row.email, ...('aliases' in row ? row.aliases || [] : [])]));

export function teacherAccessMessage(result?: { status: 'SENT' | 'FAILED' | 'UNKNOWN'; institutionalEmail?: string }) {
  if (!result) return '';
  return result.status === 'SENT' ? `Accès envoyés à l’e-mail personnel${result.institutionalEmail ? ` ; identifiant : ${result.institutionalEmail}` : ''}.`
    : result.status === 'UNKNOWN' ? 'Envoi des accès non confirmé. Vérifiez auprès du support avant toute nouvelle tentative.'
      : 'Le profil est créé, mais ses accès n’ont pas été envoyés. Contactez le support pour terminer l’activation ; ne recréez pas l’enseignant.';
}
