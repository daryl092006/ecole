import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
import type { PersonnelRecord } from '@/types/staff';
export const dynamic = 'force-dynamic';
const schema = z.object({ personId: z.uuid().optional(), firstname: z.string().trim().min(1).max(160), lastname: z.string().trim().min(1).max(160), email: z.union([z.email(), z.literal('')]), phone: z.string().trim().max(80), employeeNumber: z.string().trim().min(1).max(160) }).strict();
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request); requirePermission(context, 'staff.view');
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Annuaire indisponible.');
    const { tables } = filterRelationalSnapshot(result.data as RelationalSnapshot, context);
    const staff = tables.staff || []; const accounts = tables.accounts || [];
    const records: PersonnelRecord[] = (tables.people || []).filter(person => !person.archived_at && (staff.some(row => row.person_id === person.id && !row.archived_at) || accounts.some(row => row.person_id === person.id && row.account_type === 'staff' && !row.archived_at))).map(person => {
      const member = staff.find(row => row.person_id === person.id && !row.archived_at);
      return { personId: person.id, staffId: member?.id || null, firstname: String(person.firstname || ''), lastname: String(person.lastname || ''), email: String(person.email || ''), phone: String(person.phone || ''), employeeNumber: String(member?.employee_number || ''), active: !member?.archived_at, contracts: (tables.staff_contracts || []).filter(row => row.staff_id === member?.id).map(row => ({ id: row.id, position: String(row.position), type: String(row.contract_type), startsOn: String(row.starts_on), endsOn: row.ends_on ? String(row.ends_on) : null })) };
    });
    return Response.json({ records, revision: result.data.revision }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context } = await requireAccount(request); requirePermission(context, 'staff.manage');
    if (!context.grants.some(g => !g.site_id && !g.group_id && !g.academic_year_id)) throw new RequestError(403, 'La création d’un dossier nécessite un accès global au personnel.');
    const form = schema.parse(await request.json());
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Dossiers indisponibles.');
    const snapshot = result.data as RelationalSnapshot;
    const scoped = filterRelationalSnapshot(snapshot, context);
    const existing = form.personId ? scoped.tables.people?.find(row => row.id === form.personId && !row.archived_at && scoped.tables.accounts?.some(account => account.person_id === row.id && account.account_type === 'staff' && !account.archived_at)) : null;
    if (form.personId && !existing) throw new RequestError(404, 'Profil du personnel introuvable.');
    if (!existing && form.email && snapshot.tables.people?.some(row => String(row.email || '').toLowerCase() === form.email.toLowerCase())) throw new RequestError(409, 'Cette adresse correspond déjà à une personne. Sélectionnez son profil existant pour compléter son dossier.');
    const personId = existing?.id || crypto.randomUUID(); const staffId = crypto.randomUUID();
    const changes: PersistentChange[] = [{ table: 'people', operation: existing ? 'update' : 'insert', record: { id: personId, firstname: form.firstname, lastname: form.lastname, email: form.email || null, phone: form.phone || null } }, { table: 'staff', operation: 'insert', record: { id: staffId, person_id: personId, employee_number: form.employeeNumber } }];
    const saved = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: snapshot.revision, p_changes: changes });
    if (saved.error) throw new RequestError(409, 'Enregistrement refusé : vérifiez le matricule unique ou actualisez le dossier.');
    return Response.json({ id: staffId, revision: saved.data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
