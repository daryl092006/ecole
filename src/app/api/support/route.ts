import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { supportCommandSchema, canManageSupport, canManageStudentCorrections, isStudentCorrection, visibleSupportTickets, planSupportCommand, SupportPolicyError } from '@/services/persistentSupportService';
import type { RelationalSnapshot } from '@/types/persistence';
import { studentProgramCorrectionDirectory } from '@/services/studentProgramCorrectionService';

export const dynamic = 'force-dynamic';
async function load(request: Request) {
  const auth = await requireAccount(request);
  const result = await auth.client.rpc('escen_backend_snapshot');
  if (result.error) throw new RequestError(503, 'Chargement des demandes indisponible.');
  const snapshot = result.data as RelationalSnapshot;
  const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
  return { ...auth, snapshot, year };
}
export async function GET(request: Request) {
  try {
    const { context, snapshot, year } = await load(request);
    const readYear = year.selectedYearId || (year.selection === 'all' ? null : '00000000-0000-0000-0000-000000000000');
    const corrections = new URL(request.url).searchParams.get('kind') === 'school';
    if (corrections) requirePermission(context, 'student.correction.manage');
    const tickets = visibleSupportTickets(snapshot, context, readYear).filter(ticket => !corrections || isStudentCorrection(snapshot, ticket));
    const ids = new Set(tickets.map(ticket => ticket.id));
    const students = tickets.filter(ticket => isStudentCorrection(snapshot, ticket)).flatMap(ticket => {
      const account = snapshot.tables.accounts?.find(row => row.id === ticket.author_id);
      const student = snapshot.tables.students?.find(row => row.person_id === account?.person_id && !row.archived_at);
      const person = snapshot.tables.people?.find(row => row.id === student?.person_id);
      return student && person ? [{ ticketId: ticket.id, matricule: String(student.matricule), name: `${person.firstname} ${person.lastname}` }] : [];
    });
    const canCorrect = canManageStudentCorrections(context, year.selectedYearId);
    return Response.json({ revision: snapshot.revision, yearId: year.selectedYearId, canManage: canManageSupport(context, year.selectedYearId), canManageCorrections: canCorrect, correctionTicketIds: tickets.filter(ticket => isStudentCorrection(snapshot, ticket)).map(ticket => ticket.id), students, tickets,
      ...(canCorrect ? { programCorrection: studentProgramCorrectionDirectory(snapshot, tickets.filter(ticket => isStudentCorrection(snapshot, ticket)), year.selectedYearId) } : {}),
      messages: (snapshot.tables.support_messages || []).filter(message => ids.has(String(message.ticket_id))),
      categories: (snapshot.tables.support_categories || []).filter(category => category.active === true),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, snapshot, year } = await load(request);
    const command = supportCommandSchema.parse(await request.json());
    if (command.action === 'correct_program') {
      requirePermission(context, 'student.correction.manage');
      if (!year.selectedYearId || !canManageStudentCorrections(context, year.selectedYearId)) throw new RequestError(403, 'Choisissez une année autorisée pour corriger une inscription.');
      const ticket = visibleSupportTickets(snapshot, context, year.selectedYearId).find(row => row.id === command.ticketId && isStudentCorrection(snapshot, row));
      if (!ticket) throw new RequestError(404, 'Demande scolaire introuvable.');
      const directory = studentProgramCorrectionDirectory(snapshot, [ticket], year.selectedYearId);
      const enrollment = directory.enrollments.find(row => row.id === command.enrollmentId);
      const offering = directory.offerings.find(row => row.id === command.offeringId && row.siteId === enrollment?.siteId);
      if (!enrollment || !offering?.groups.some(group => group.id === command.groupId)) throw new RequestError(409, 'Inscription, formation ou groupe incompatible avec cette demande et cette année.');
      const saved = await client.rpc('escen_student_program_correction', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_expected_revision: command.revision,
        p_ticket_id: command.ticketId, p_enrollment_id: command.enrollmentId, p_offering_id: command.offeringId, p_group_id: command.groupId, p_reason: command.reason });
      if (saved.error) throw new RequestError(409, 'Correction refusée : actualisez la demande et vérifiez la formation et le groupe. Aucune modification partielle enregistrée.');
      return Response.json({ id: command.ticketId, revision: saved.data }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (command.action === 'transition') {
      const ticket = visibleSupportTickets(snapshot, context, year.selectedYearId).find(row => row.id === command.ticketId);
      if (!ticket) throw new RequestError(404, 'Demande introuvable.');
      requirePermission(context, isStudentCorrection(snapshot, ticket) ? 'student.correction.manage' : 'system.support.manage');
    }
    const plan = planSupportCommand(snapshot, context, year.selectedYearId, command, () => crypto.randomUUID());
    const result = await client.rpc('escen_backend_transaction', { p_actor_id: context.accountId, p_expected_revision: command.revision, p_changes: plan.changes });
    if (result.error) throw new RequestError(409, 'Enregistrement refusé. Actualisez les demandes avant de réessayer.');
    return Response.json({ id: plan.id, revision: result.data }, { status: command.action === 'create' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error instanceof SupportPolicyError ? new RequestError(error.status, error.message) : error); }
}
