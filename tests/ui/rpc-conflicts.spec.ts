import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSecurityApi, securityContext, uuid } from './security-fixture';
import type { websiteRpc } from '../../src/server/website';
import type { persistCandidateFiles } from '../../src/server/admissions';

for (const code of ['40001', 'PT409']) {
  test(`Copies : ${code} renvoie un conflit sans réessayer la mutation`, async () => {
    let calls = 0;
    const client = { rpc: async () => { calls++; return { error: { code } }; } };
    const route = loadSecurityApi('app/api/exam-attempts/route.ts', client, securityContext()) as {
      POST: (request: Request) => Promise<Response>;
    };
    const response = await route.POST(new Request('http://local.test/api/exam-attempts', {
      method: 'POST', body: JSON.stringify({ action: 'save', attemptId: uuid(1), revision: 1, saveId: uuid(2), answers: [] }),
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Vos réponses locales sont conservées');
    expect(calls).toBe(1);
  });

  test(`Site : ${code} reste un refus métier HTTP 409`, async () => {
    const api = loadSecurityApi('server/website.ts', {}, securityContext()) as { websiteRpc: typeof websiteRpc };
    const client = { rpc: async () => ({ error: { code } }) } as unknown as SupabaseClient;
    await expect(api.websiteRpc(client, 'escen_application_command', {})).rejects.toMatchObject({ status: 409 });
  });

  test(`Admissions : ${code} nettoie uniquement les fichiers refusés`, async () => {
    const removed: string[][] = [];
    const client = {
      rpc: async () => ({ error: { code } }),
      storage: { from: () => ({ remove: async (paths: string[]) => { removed.push(paths); } }) },
    } as unknown as SupabaseClient;
    const api = loadSecurityApi('server/admissions.ts', client, securityContext()) as { persistCandidateFiles: typeof persistCandidateFiles };
    await expect(api.persistCandidateFiles(client, 'escen_candidate_dossier', {}, ['local/new-file'])).rejects.toMatchObject({ status: 409 });
    expect(removed).toEqual([['local/new-file']]);
  });
}

test('Admissions : une réponse réseau incertaine ne supprime aucun fichier', async () => {
  const removed: string[][] = [];
  const client = {
    rpc: async () => ({ error: { code: '57014' } }),
    storage: { from: () => ({ remove: async (paths: string[]) => { removed.push(paths); } }) },
  } as unknown as SupabaseClient;
  const api = loadSecurityApi('server/admissions.ts', client, securityContext()) as { persistCandidateFiles: typeof persistCandidateFiles };
  await expect(api.persistCandidateFiles(client, 'escen_candidate_dossier', {}, ['local/new-file'])).rejects.toMatchObject({ status: 503 });
  expect(removed).toEqual([]);
});
