import { z } from 'zod';
import { requireAccount, RequestError, errorResponse } from '@/server/auth';
import { invalidateAuthCache } from '@/lib/supabase/server';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';

const profileUpdateSchema = z.object({
  phone: z.string().trim().max(80).optional().default(''),
  personalEmail: z.union([z.email().max(255), z.literal('')]).optional().default(''),
  birthDate: z.union([z.iso.date(), z.literal('')]).optional().default(''),
  gender: z.string().trim().max(40).optional().default(''),
  nationality: z.string().trim().max(160).optional().default(''),
  address: z.string().trim().max(1000).optional().default(''),
  city: z.string().trim().max(160).optional().default(''),
  country: z.string().trim().max(160).optional().default(''),
}).strict().refine(form => !form.birthDate || form.birthDate <= new Date().toISOString().slice(0, 10), {
  message: 'La date de naissance ne peut pas être dans le futur.',
});

export async function GET(request: Request) {
  try {
    const auth = await requireAccount(request);
    const person = auth.profile.person;
    return Response.json({
      profile: {
        personId: auth.context.personId,
        firstname: person.firstname,
        lastname: person.lastname,
        loginEmail: auth.email,
        personalEmail: person.email || '',
        phone: person.phone || '',
        birthDate: person.birth_date || '',
        gender: person.gender || '',
        nationality: person.nationality || '',
        address: person.address || '',
        city: person.city || '',
        country: person.country || '',
        matricule: auth.profile.student?.matricule || null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAccount(request);
    const body = profileUpdateSchema.parse(await request.json().catch(() => {
      throw new RequestError(400, 'Données du profil invalides.');
    }));
    const result = await auth.client.rpc('escen_backend_snapshot');
    if (result.error || !result.data) {
      throw new RequestError(503, 'L’enregistrement du profil est temporairement indisponible.');
    }
    const snapshot = result.data as RelationalSnapshot;
    const person = auth.profile.person;
    const updateRecord: Record<string, unknown> = {
      id: auth.context.personId,
      phone: body.phone || null,
      email: body.personalEmail || person.email || null,
      birth_date: body.birthDate || person.birth_date || null,
      gender: body.gender || null,
      nationality: body.nationality || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
    };
    const saved = await auth.client.rpc('escen_backend_transaction', {
      p_actor_id: auth.context.accountId,
      p_expected_revision: snapshot.revision,
      p_changes: [{ table: 'people', operation: 'update', record: updateRecord }],
    });
    if (saved.error) {
      throw new RequestError(409, 'Vos informations n’ont pas pu être enregistrées. Vérifiez que l’adresse e-mail n’est pas déjà utilisée par un autre dossier.');
    }
    invalidateAuthCache();
    return Response.json({ updated: true, revision: saved.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

