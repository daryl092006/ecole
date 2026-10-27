import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import { ROLES, type Permission } from '@/types/permissions';
import { attendanceSessions } from './attendanceManagementService';
import { visibleSupportTickets } from './persistentSupportService';
import { visiblePurchases } from './persistentPurchaseService';

const field = (row: DatabaseRow, name: string) => typeof row[name] === 'string' ? row[name] as string : '';
const ownRole = (context: PersistentContext) => context.role === ROLES.STUD || context.role === ROLES.DEL;
const domainTables: Array<{ permission: Permission; tables: string[] }> = [
  { permission: 'academic.view', tables: ['cycles','levels','programs','tracks','subjects','curricula','curriculum_semesters','teaching_units','curriculum_components','academic_offerings','offering_semesters','group_offerings','teaching_assignments','assessment_weights','syllabuses','teachers'] },
  { permission: 'student.view', tables: ['students','enrollments','enrollment_groups','enrollment_events','student_contacts','delegate_mandates','student_documents','document_types','document_requirements','document_reviews','generated_documents'] },
  { permission: 'schedule.view', tables: ['sites','buildings','rooms','groups','academic_years','blocked_periods','schedule_series','sessions','session_supervisors'] },
  { permission: 'attendance.view', tables: ['attendances','teacher_attendances','absence_justifications'] },
  { permission: 'grade.view', tables: ['evaluations','evaluation_candidates','evaluation_transitions','exam_deliveries','exam_papers','exam_parts','exam_questions','exam_options','exam_attempts','exam_answers','answer_corrections','grades','grade_revisions','academic_rule_versions','juries','jury_members','jury_decisions','jury_grade_inputs','credit_awards','exam_rooms','exam_room_candidates','exam_room_supervisors'] },
  { permission: 'complaint.view', tables: ['complaints','complaint_events'] },
  { permission: 'finance.view', tables: ['annual_payment_channels','annual_fee_schedules','fee_types','fee_rates','scholarships','scholarship_awards','financial_contracts','contract_versions','contract_lines','contract_discounts','installments','payments','payment_reversals','receipts','payment_allocations','allocation_reversals','refunds','credit_notes','payment_documents'] },
  { permission: 'staff.view', tables: ['staff','staff_contracts'] },
  { permission: 'user.manage', tables: ['accounts','roles','permissions','role_permissions','role_grants'] },
  { permission: 'communication.view', tables: ['communications','communication_audiences','communication_reads','communication_files'] },
  { permission: 'purchase.view', tables: ['suppliers','purchases','purchase_lines','purchase_receipts','expenses'] },
  { permission: 'asset.view', tables: ['assets','asset_movements'] },
];
const financial = new Set(domainTables.find(item => item.permission === 'finance.view')!.tables);
const academic = new Set(domainTables.find(item => item.permission === 'academic.view')!.tables);
const policy = new Map(domainTables.flatMap(item => item.tables.map(table => [table,item.permission] as const)));

export function filterRelationalSnapshot(snapshot: RelationalSnapshot, context: PersistentContext): RelationalSnapshot {
  const supportIds = new Set(visibleSupportTickets(snapshot, context, null).map(ticket => ticket.id));
  const purchaseIds = new Set(visiblePurchases(snapshot, context, null).map(purchase => purchase.id));
  const tables = snapshot.tables;
  const rows = (name: string) => tables[name] ?? [];
  const can = (permission: Permission) => context.permissions.includes(permission);
  const self = ownRole(context);
  const attendanceSessionIds = new Set(attendanceSessions(snapshot, context, null).map(row => row.id));
  const attendanceIds = new Set(rows('attendances').filter(row => attendanceSessionIds.has(field(row, 'session_id'))).map(row => row.id));
  const teacher = context.role === ROLES.ENS;
  const supervisor = context.role === ROLES.SURV;
  const unscoped = context.grants.some(grant => !grant.site_id && !grant.academic_year_id && !grant.group_id);
  const grantsOffering = (offering: DatabaseRow, groupId?: unknown) => context.grants.some(grant =>
    (!grant.site_id || grant.site_id === offering.site_id) && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id)
    && (!grant.group_id || (groupId !== undefined ? grant.group_id === groupId : rows('group_offerings').some(link => link.group_id === grant.group_id && link.offering_id === offering.id))));
  const personalEnrollments = new Set(rows('enrollments').filter(row => row.student_id === context.studentId).map(row => row.id));
  const assignedSessionIds = new Set(rows('session_supervisors').filter(row => row.account_id === context.accountId).map(row => field(row,'session_id')));
  for (const link of rows('exam_room_supervisors').filter(row => row.account_id === context.accountId)) {
    const room = rows('exam_rooms').find(row => row.id === link.exam_room_id);
    const delivery = rows('exam_deliveries').find(row => row.id === room?.delivery_id);
    if (delivery) assignedSessionIds.add(field(delivery,'session_id'));
  }
  const assignments = rows('teaching_assignments').filter(row => teacher ? !!context.teacherId && row.teacher_id === context.teacherId
    : supervisor ? rows('sessions').some(session => assignedSessionIds.has(session.id) && session.assignment_id === row.id)
    : self ? rows('enrollment_groups').some(link => personalEnrollments.has(field(link,'enrollment_id')) && link.group_id === row.group_id && rows('enrollments').some(enrollment => enrollment.id === link.enrollment_id && enrollment.offering_id === row.offering_id))
    : rows('academic_offerings').some(offering => offering.id === row.offering_id && grantsOffering(offering,row.group_id)));
  const assignmentIds = new Set(assignments.map(row => row.id));
  const offeringIds = new Set(rows('academic_offerings').filter(row => self ? rows('enrollments').some(link => personalEnrollments.has(link.id) && link.offering_id === row.id)
    : teacher || supervisor ? assignments.some(link => link.offering_id === row.id) : grantsOffering(row)).map(row => row.id));
  const groupIds = new Set(rows('group_offerings').filter(row => offeringIds.has(field(row,'offering_id')) && (self || teacher || supervisor || rows('academic_offerings').some(offering => offering.id === row.offering_id && grantsOffering(offering,row.group_id))) && (!teacher && !supervisor && !self
    || (self ? rows('enrollment_groups').some(link => personalEnrollments.has(field(link,'enrollment_id')) && link.group_id === row.group_id)
      : assignments.some(link => link.group_id === row.group_id)))).map(row => field(row,'group_id')));
  const enrollments = rows('enrollments').filter(row => self ? personalEnrollments.has(row.id)
    : teacher || supervisor ? rows('enrollment_groups').some(link => link.enrollment_id === row.id && groupIds.has(field(link,'group_id')))
    : offeringIds.has(field(row,'offering_id')) && (unscoped || rows('enrollment_groups').some(link => link.enrollment_id === row.id && groupIds.has(field(link,'group_id')))));
  const enrollmentIds = new Set(enrollments.map(row => row.id));
  const studentIds = new Set((self || can('student.view') || can('attendance.view') ? enrollments : []).map(row => field(row,'student_id')));
  if (self && context.studentId) studentIds.add(context.studentId);
  if (can('student.view') && unscoped && !self && !teacher && !supervisor) rows('students').forEach(row => studentIds.add(row.id));
  const curriculumIds = new Set(rows('academic_offerings').filter(row => offeringIds.has(row.id)).map(row => field(row,'curriculum_id')));
  const semesterIds = new Set(rows('curriculum_semesters').filter(row => curriculumIds.has(field(row,'curriculum_id'))).map(row => row.id));
  const evaluationIds = new Set(rows('evaluations').filter(row => (row.assignment_id ? assignmentIds.has(field(row,'assignment_id')) : !teacher && !supervisor && (row.offering_id ? offeringIds.has(field(row,'offering_id')) : unscoped && !self) && (!row.group_id || groupIds.has(field(row,'group_id'))))
    && (!self || rows('evaluation_candidates').some(candidate => candidate.evaluation_id === row.id && enrollmentIds.has(field(candidate,'enrollment_id'))))).map(row => row.id));
  const candidates = rows('evaluation_candidates').filter(row => evaluationIds.has(field(row,'evaluation_id')) && (!self || enrollmentIds.has(field(row,'enrollment_id'))));
  const candidateIds = new Set(candidates.map(row => row.id));
  const publishedIds = new Set(rows('evaluations').filter(row => evaluationIds.has(row.id) && row.status === 'PUBLIEES').map(row => row.id));
  const gradeIds = new Set(rows('grades').filter(row => candidateIds.has(field(row,'candidate_id')) && (!self
    || candidates.some(candidate => candidate.id === row.candidate_id && publishedIds.has(field(candidate,'evaluation_id'))))).map(row => row.id));
  const papers = rows('exam_papers').filter(row => evaluationIds.has(field(row,'evaluation_id')) && (!self || row.status === 'AUTORISE'));
  const paperIds = new Set(papers.map(row => row.id));
  const questionIds = new Set(rows('exam_questions').filter(row => paperIds.has(field(row,'paper_id'))).map(row => row.id));
  const attempts = rows('exam_attempts').filter(row => candidateIds.has(field(row,'candidate_id')));
  const attemptIds = new Set(attempts.map(row => row.id));
  const answerIds = new Set(rows('exam_answers').filter(row => attemptIds.has(field(row,'attempt_id'))).map(row => row.id));
  const contractIds = new Set(rows('financial_contracts').filter(row => enrollmentIds.has(field(row,'enrollment_id'))).map(row => row.id));
  const versionIds = new Set(rows('contract_versions').filter(row => contractIds.has(field(row,'contract_id'))).map(row => row.id));
  const lineIds = new Set(rows('contract_lines').filter(row => contractIds.has(field(row,'contract_id'))).map(row => row.id));
  const paymentIds = new Set(rows('payments').filter(row => enrollmentIds.has(field(row,'enrollment_id'))).map(row => row.id));
  const allocationIds = new Set(rows('payment_allocations').filter(row => paymentIds.has(field(row,'payment_id'))).map(row => row.id));
  const decisionIds = new Set(rows('jury_decisions').filter(row => enrollmentIds.has(field(row,'enrollment_id')) && (!self || row.decision !== undefined)).map(row => row.id));
  const communicationAccess = can('communication.view') || self;
  const communicationAdministration = communicationAccess && unscoped && !self && !teacher && !supervisor
    && (can('communication.manage') || context.role === ROLES.DG || context.role === ROLES.IT);
  const now = Date.now();
  const communicationRoleIds = new Set(rows('roles').filter(row => row.code === context.roleCode && row.active !== false).map(row => row.id));
  const groupInCommunicationYear = (groupId: string, communication: DatabaseRow) => groupIds.has(groupId)
    && (!communication.academic_year_id || rows('groups').some(group => group.id === groupId && group.academic_year_id === communication.academic_year_id)
      || rows('group_offerings').some(link => link.group_id === groupId && offeringIds.has(field(link,'offering_id')) && rows('academic_offerings').some(offering => offering.id === link.offering_id && offering.academic_year_id === communication.academic_year_id)));
  const audienceMatches = (audience: DatabaseRow, communication: DatabaseRow) => context.grants.some(grant => {
    if (grant.academic_year_id && grant.academic_year_id !== communication.academic_year_id) return false;
    // Each audience has exactly one target in the SQL schema. Unknown targets never imply everyone.
    if (audience.all_accounts === true) return true;
    if (audience.role_id) return communicationRoleIds.has(field(audience,'role_id'));
    if (audience.group_id) return (!grant.group_id || grant.group_id === audience.group_id)
      && groupInCommunicationYear(field(audience,'group_id'), communication)
      && (!grant.site_id || rows('academic_offerings').some(offering => offering.site_id === grant.site_id && rows('group_offerings').some(link => link.group_id === audience.group_id && link.offering_id === offering.id)));
    if (audience.site_id) return (!grant.site_id || grant.site_id === audience.site_id)
      && (grant.site_id === audience.site_id || rows('academic_offerings').some(offering => offeringIds.has(offering.id) && offering.site_id === audience.site_id
        && (!communication.academic_year_id || offering.academic_year_id === communication.academic_year_id)));
    return false;
  });
  const communicationIds = new Set(rows('communications').filter(row => {
    if (!communicationAccess) return false;
    if (communicationAdministration) return true;
    const published = Date.parse(field(row,'published_at'));
    const expires = row.expires_at == null ? null : Date.parse(field(row,'expires_at'));
    return Number.isFinite(published) && published <= now && !row.withdrawn_at
      && (expires === null || Number.isFinite(expires) && expires > now)
      && rows('communication_audiences').some(audience => audience.communication_id === row.id && audienceMatches(audience,row));
  }).map(row => row.id));
  const peopleIds = new Set([context.personId]);
  rows('students').filter(row => studentIds.has(row.id)).forEach(row => peopleIds.add(field(row,'person_id')));
  const visibleTeacherIds = new Set((can('academic.view') || self ? assignments : []).map(row => field(row,'teacher_id')));
  rows('teachers').filter(row => visibleTeacherIds.has(row.id)).forEach(row => {
    const staff = rows('staff').find(item => item.id === row.staff_id); if (staff) peopleIds.add(field(staff,'person_id'));
  });
  if (can('user.manage') && unscoped) rows('accounts').forEach(row => peopleIds.add(field(row,'person_id')));
  if (can('staff.view') && unscoped) rows('staff').forEach(row => peopleIds.add(field(row,'person_id')));
  const source: Record<string, DatabaseRow[]> = {};
  for (const [name, collection] of Object.entries(tables)) {
    const permitted = name === 'people' || name === 'file_objects' || name === 'support_tickets' || name === 'support_messages' || name === 'support_categories' || name === 'support_files'
      || !!policy.get(name) && can(policy.get(name)!)
      || self && (financial.has(name) || academic.has(name) || ['students','enrollments','enrollment_groups','student_documents','document_types','document_reviews','generated_documents','communications','communication_audiences','communication_reads','communication_files'].includes(name));
    if (!permitted || (teacher || supervisor || self) && ['academic_rule_versions','juries','jury_members','jury_decisions','jury_grade_inputs','credit_awards'].includes(name)) continue;
    source[name] = collection.filter(row => {
      if (name === 'purchases') return purchaseIds.has(row.id);
      if (name === 'purchase_lines' || name === 'purchase_receipts') return purchaseIds.has(field(row, 'purchase_id'));
      if (name === 'attendances' || name === 'teacher_attendances') return attendanceSessionIds.has(field(row, 'session_id'));
      if (name === 'absence_justifications') return attendanceIds.has(field(row, 'attendance_id')) && (context.role !== ROLES.DEL
        || rows('attendances').some(attendance => attendance.id === row.attendance_id && personalEnrollments.has(field(attendance, 'enrollment_id'))));
      if (name === 'people') return peopleIds.has(row.id);
      if (name === 'staff' || name === 'staff_contracts') return unscoped || (name === 'staff' ? row.person_id === context.personId : rows('staff').some(staff => staff.id === row.staff_id && staff.person_id === context.personId));
      if (name === 'communications') return communicationIds.has(row.id);
      if (name === 'communication_audiences') return communicationIds.has(field(row,'communication_id'))
        && (communicationAdministration || rows('communications').some(communication => communication.id === row.communication_id && audienceMatches(row,communication)));
      if (name === 'communication_reads') return communicationIds.has(field(row,'communication_id')) && row.account_id === context.accountId;
      if (name === 'communication_files') return communicationIds.has(field(row,'communication_id'));
      if (name === 'file_objects') return false; // Autorisation séparée par le propriétaire de la pièce.
      if (name === 'accounts') return unscoped && can('user.manage') || row.id === context.accountId;
      if (name === 'role_grants') return unscoped || row.account_id === context.accountId;
      if (name === 'teaching_assignments') return assignmentIds.has(row.id);
      if (name === 'teachers') return unscoped && !teacher && !self && !supervisor || visibleTeacherIds.has(row.id);
      if (name === 'groups') return unscoped && !teacher && !self && !supervisor || groupIds.has(row.id);
      if (name === 'academic_offerings') return offeringIds.has(row.id);
      if (name === 'curricula') return unscoped && !self && !teacher && !supervisor || curriculumIds.has(row.id);
      if (name === 'curriculum_semesters') return unscoped && !self && !teacher && !supervisor || semesterIds.has(row.id);
      if (name === 'students') return studentIds.has(row.id);
      if (name === 'enrollments') return enrollmentIds.has(row.id);
      if (name === 'sessions') return supervisor ? assignedSessionIds.has(row.id) : assignmentIds.has(field(row,'assignment_id'));
      if (name === 'session_supervisors') return supervisor ? row.account_id === context.accountId : rows('sessions').some(item => item.id === row.session_id && assignmentIds.has(field(item,'assignment_id')));
      if (name === 'evaluations') return evaluationIds.has(row.id);
      if (name === 'evaluation_candidates') return candidateIds.has(row.id);
      if (name === 'grades') return gradeIds.has(row.id);
      if (name === 'grade_revisions') return gradeIds.has(field(row,'grade_id'));
      if (name === 'exam_papers') return paperIds.has(row.id);
      if (name === 'exam_questions') return questionIds.has(row.id);
      if (name === 'exam_options') return questionIds.has(field(row,'question_id'));
      if (name === 'exam_attempts') return attemptIds.has(row.id);
      if (name === 'exam_answers') return answerIds.has(row.id);
      if (name === 'answer_corrections') return answerIds.has(field(row,'answer_id')) && (!self || attempts.some(attempt => publishedIds.has(field(attempt,'evaluation_id')) && rows('exam_answers').some(answer => answer.id === row.answer_id && answer.attempt_id === attempt.id)));
      if (name === 'financial_contracts') return contractIds.has(row.id);
      if (name === 'contract_versions') return versionIds.has(row.id);
      if (name === 'contract_lines') return lineIds.has(row.id);
      if (name === 'payments') return paymentIds.has(row.id);
      if (name === 'payment_allocations') return allocationIds.has(row.id);
      if (name === 'allocation_reversals') return allocationIds.has(field(row,'allocation_id'));
      if (name === 'jury_decisions') return decisionIds.has(row.id);
      if (row.decision_id) return decisionIds.has(field(row,'decision_id'));
      if (name === 'generated_documents') return studentIds.has(field(row,'student_id'));
      if (name === 'support_tickets') return supportIds.has(row.id);
      if (name === 'support_messages') return supportIds.has(field(row, 'ticket_id'));
      if (name === 'support_files') return rows('support_messages').some(message => message.id === row.message_id && supportIds.has(field(message, 'ticket_id')));
      if (row.student_id) return studentIds.has(field(row,'student_id'));
      if (row.enrollment_id) return enrollmentIds.has(field(row,'enrollment_id'));
      if (row.payment_id) return paymentIds.has(field(row,'payment_id'));
      if (row.version_id) return versionIds.has(field(row,'version_id'));
      if (row.line_id) return lineIds.has(field(row,'line_id'));
      if (row.candidate_id) return candidateIds.has(field(row,'candidate_id'));
      if (row.evaluation_id) return evaluationIds.has(field(row,'evaluation_id'));
      if (row.paper_id) return paperIds.has(field(row,'paper_id'));
      if (row.offering_id) return offeringIds.has(field(row,'offering_id'));
      if (row.curriculum_id) return unscoped && !self && !teacher && !supervisor || curriculumIds.has(field(row,'curriculum_id'));
      if (row.group_id) return groupIds.has(field(row,'group_id'));
      return unscoped && !self && !teacher && !supervisor;
    }).map(row => {
      if (name === 'accounts') { const safe = { ...row }; delete safe.auth_user_id; return safe; }
      if (self && ['exam_papers','exam_parts','exam_questions','exam_options'].includes(name)) return { id:row.id }; // Le sujet doit passer par la commande de démarrage avec horloge serveur.
      if (self && name === 'exam_options') { const safe = { ...row }; delete safe.is_correct; return safe; }
      if (self && name === 'exam_questions') { const safe = { ...row }; delete safe.configuration; return safe; }
      if ((teacher || supervisor) && name === 'people' && row.id !== context.personId) return { id: row.id, firstname: row.firstname, lastname: row.lastname };
      return row;
    });
  }
  return { revision: snapshot.revision, tables: source };
}

