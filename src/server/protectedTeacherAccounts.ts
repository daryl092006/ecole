import 'server-only';
import registry from '@/data/protectedTeacherAccounts.json';
import { teacherIdentityKey } from '@/services/teacherIdentityService';

export function protectedTeacherAccount(firstname: string, lastname: string) {
  const key = teacherIdentityKey(`${firstname} ${lastname}`);
  return registry.find(row => [row.name, ...('nameAliases' in row ? row.nameAliases || [] : [])]
    .some(name => teacherIdentityKey(name) === key));
}

export const protectedTeacherEmails = new Set(registry.flatMap(row => [row.email, ...('aliases' in row ? row.aliases || [] : [])]));
