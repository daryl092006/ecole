import { z } from 'zod';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { filterRelationalSnapshot } from '@/services/persistentPermissionsService';
import type { RelationalSnapshot, PersistentChange } from '@/types/persistence';
import type { PersonnelRecord } from '@/types/staff';
import { ROLES } from '@/types/permissions';
import { displayedPhoneNumber } from '@/services/phoneNumberService';
import { displayedEmployeeNumber, internalStaffReference } from '@/utils/staffReference';
export const dynamic = 'force-dynamic';
const schema = z.object({ personId: z.uuid().optional(), firstname: z.string().trim().min(1).max(160), lastname: z.string().trim().min(1).max(160), email: z.union([z.email(), z.literal('')]), phone: z.string().trim().max(80), employeeNumber: z.string().trim().max(160).optional().default(''), isTeacher: z.boolean().optional().default(false), teacherSpecialty: z.string().trim().max(160).optional().default(''), position: z.string().trim().max(160).optional().default(''), contractType: z.enum(['PERMANENT', 'VACATAIRE', 'STAGIAIRE']).optional().default('PERMANENT'), startsOn: z.union([z.iso.date(), z.literal('')]).optional().default('') }).strict()
  .refine(form => form.isTeacher || form.position.length > 0, { message: 'La fonction du membre du personnel est obligatoire.', path: ['position'] });
export async function GET(request: Request) {
  try {
    const { client, context } = await requireAccount(request); requirePermission(context, 'staff.view');
    const result = await client.rpc('escen_backend_snapshot');
    if (result.error) throw new RequestError(503, 'Annuaire indisponible.');
    const snapshot = result.data as RelationalSnapshot;
    const { tables } = filterRelationalSnapshot(snapshot, context);
    // Le profil complète uniquement les dossiers autorisés, y compris pour le RAF sans accès académique.
    const teacherStaffIds = new Set((snapshot.tables.teachers || []).map(row => row.staff_id));
    const roleNames = ROLES as Record<string, string>;
    const roleById = new Map((snapshot.tables.roles || []).filter(row => row.active !== false).map(row => [row.id, roleNames[String(row.code || '')] || String(row.name || '')]));
    const now = Date.now();
    const allAccounts = (snapshot.tables.accounts || []).filter(row => !row.archived_at);
    const activeGrants = (snapshot.tables.role_grants || []).filter(grant => {
      const from = Date.parse(String(grant.valid_from || ''));
      const until = grant.valid_until ? Date.parse(String(grant.valid_until)) : null;
      return (!Number.isFinite(from) || from <= now) && (until === null || (Number.isFinite(until) && until > now));
    });
    const staff = tables.staff || []; const accounts = tables.accounts || [];
    const records: PersonnelRecord[] = (tables.people || []).filter(person => !person.archived_at && (staff.some(row => row.person_id === person.id && !row.archived_at) || accounts.some(row => row.person_id === person.id && row.account_type === 'staff' && row.active !== false && !row.archived_at))).map(person => {
      const member = staff.find(row => row.person_id === person.id && !row.archived_at);
      const personAccountIds = new Set(allAccounts.filter(row => row.person_id === person.id).map(row => row.id));
      const roles = [...new Set(activeGrants.filter(grant => personAccountIds.has(String(grant.account_id))).flatMap(grant => {
        const label = roleById.get(String(grant.role_id));
        return label ? [label] : [];
      }))];
      return { personId: person.id, staffId: member?.id || null, firstname: String(person.firstname || ''), lastname: String(person.lastname || ''), email: String(person.email || ''), phone: displayedPhoneNumber(person.phone), employeeNumber: displayedEmployeeNumber(member?.employee_number), isTeacher: !!member && teacherStaffIds.has(member.id), active: !member?.archived_at, roles, contracts: (tables.staff_contracts || []).filter(row => row.staff_id === member?.id).map(row => ({ id: row.id, position: String(row.position), type: String(row.contract_type), startsOn: String(row.starts_on), endsOn: row.ends_on ? String(row.ends_on) : null })) };
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
    if (existing && snapshot.tables.staff?.some(row => row.person_id === existing.id)) throw new RequestError(409, 'Cette personne possède déjà un dossier. Ouvrez-le pour le modifier ou ajoutez son profil depuis « Enseignants ».');
    if (!existing && form.email && snapshot.tables.people?.some(row => String(row.email || '').toLowerCase() === form.email.toLowerCase())) throw new RequestError(409, 'Cette adresse correspond déjà à une personne. Sélectionnez son profil existant pour compléter son dossier.');
    const personId = existing?.id || crypto.randomUUID(); const staffId = crypto.randomUUID();
    const changes: PersistentChange[] = [{ table: 'people', operation: existing ? 'update' : 'insert', record: { id: personId, firstname: form.firstname, lastname: form.lastname, email: form.email || null, phone: form.phone || null } }, { table: 'staff', operation: 'insert', record: { id: staffId, person_id: personId, employee_number: form.employeeNumber || internalStaffReference() } }];
    if (form.position) changes.push({ table: 'staff_contracts', operation: 'insert', record: { id: crypto.randomUUID(), staff_id: staffId, site_id: null, contract_type: form.contractType, position: form.position, starts_on: form.startsOn || new Date().toISOString().slice(0, 10) } });
    if (form.isTeacher) changes.push({ table: 'teachers', operation: 'insert', record: { id: crypto.randomUUID(), staff_id: staffId, specialty: form.teacherSpecialty || null, active: true } });
    const saved = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: snapshot.revision, p_changes: changes });
    if (saved.error) throw new RequestError(409, 'Enregistrement refusé : vérifiez le matricule unique ou actualisez le dossier.');
    return Response.json({ id: staffId, revision: saved.data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
