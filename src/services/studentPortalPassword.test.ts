import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { provisionStudentComplete } from './studentProvisioningService';
import { firstLoginState } from './firstLoginService';

async function verifyStudentPortalPassword() {
  for (const existingUser of [false, true]) {
    const creations: Array<Record<string, unknown>> = [];
    const emails: Array<Record<string, unknown>> = [];
    const client = {
      auth: { admin: {
        listUsers: async () => ({ data: { users: existingUser ? [{ id: 'auth-student', email: 'student@example.test' }] : [] } }),
        createUser: async (attributes: Record<string, unknown>) => {
          creations.push(attributes);
          return { data: { user: { id: 'auth-student' } } };
        },
        updateUserById: async () => { throw new Error('An existing account must not be reset during admission'); },
      } },
      from: (table: string) => {
        const result = table === 'students'
          ? { id: 'student', matricule: '123-ESC-2026', m365_email: 'student@example.test', m365_status: 'ACTIVE' }
          : table === 'accounts' ? { id: 'account' } : null;
        const query = {
          select: () => query,
          eq: () => query,
          single: async () => ({ data: result }),
          maybeSingle: async () => ({ data: result }),
          then: (resolve: (value: { data: unknown[] }) => unknown) => Promise.resolve({ data: [] }).then(resolve),
        };
        return query;
      },
      rpc: async (_name: string, args: Record<string, unknown>) => { emails.push(args); return { error: null }; },
    } as unknown as SupabaseClient;
    await provisionStudentComplete(client, {
      studentId: 'student', personId: 'person', firstname: 'Alice', lastname: 'Exemple',
      applicationId: 'application',
      personalEmail: 'personal@example.test', academicYearId: 'year', actorId: 'actor',
    });
    assert.equal(creations.length, existingUser ? 0 : 1);
    if (!existingUser) {
      assert.equal(creations[0].password, 'password');
      const metadata = creations[0].app_metadata as Record<string, unknown>;
      assert.equal(firstLoginState(metadata, false).mustChangePassword, true);
      assert.match(String(emails[0].p_text_body), /Mot de passe du Portail Étudiant : password/);
    } else {
      assert.match(String(emails[0].p_text_body), /Mot de passe du Portail Étudiant : Votre mot de passe actuel/);
    }
    assert.match(String(emails[0].p_text_body), /Mot de passe initial Microsoft 365 : Attribué lors de l’admission/);
    assert.equal(emails.length, 1);
  }
  console.log('Accès étudiants : mot de passe initial du portail, changement obligatoire, accès Microsoft distinct et compte existant préservés.');
}

verifyStudentPortalPassword().catch(error => { console.error(error); process.exitCode = 1; });
