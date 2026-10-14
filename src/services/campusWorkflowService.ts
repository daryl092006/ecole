import { executeExamAction, type ExamAction } from '@/services/examService';
import { z } from 'zod';
import type { Dataset, Collection, Entity, InstitutionSettings, Enrollment, JuryDecision } from '@/types/application';
import type { RoleName, Student, PaymentMethod, Installment } from '@/types';
import type { DemoUser } from '@/types/user';
import { ROLES } from '@/types/permissions';
import { hasPermission } from '@/permissions/rolePermissions';
import { createMockId } from '@/utils/createMockId';
import { computeTranscript } from '@/services/transcriptService';
import { planSession } from '@/services/scheduleService';

export type CampusAction = ExamAction | 'settings.update' | 'student.reenroll' | 'student.status' | 'finance.contract' | 'finance.payment' | 'finance.cancel' | 'jury.decide' | 'exam.create' | 'exam.cancel' | 'schedule.change' | 'staff.save' | 'asset.save' | 'purchase.create' | 'purchase.transition' | 'student.document.add' | 'student.document.review';
export interface WorkflowContext { role: RoleName; actor: string; users: DemoUser[]; }
export interface WorkflowAudit { collection: Collection; id: string; oldValue: unknown; newValue: unknown; reason: string; }
const id = z.string().trim().min(1).max(160); const text = z.string().trim().max(1000); const reason = text.min(3);
const money = z.number().int().nonnegative().max(1_000_000_000);
const date = z.iso.date(); const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settingsSchema = z.object({ id: z.literal('institution'), name: id, address: text, phone: text, email: text, currency: z.literal('XOF'), timezone: z.literal('Africa/Lome'), passMark: z.number().min(1).max(20), compensation: z.boolean(), eliminationMark: z.number().min(0).max(20), creditsPerSemester: z.number().int().min(1).max(60), examWeight: z.number().int().min(1).max(99), rulesApproved: z.boolean(), rulesReason: reason, receiptPrefix: z.string().regex(/^[A-Z0-9-]{1,12}$/) });
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function reconcile(installments: Installment[], paid: number): Installment[] {
  let remaining = paid;
  return installments.map(item => { const allocated = Math.min(item.amount, remaining); remaining -= allocated;
    return { ...item, status: allocated === item.amount ? 'Payée' : allocated > 0 ? 'Partiellement payée' : item.dueDate < new Date().toISOString().slice(0, 10) ? 'En retard' : 'A venir' }; });
}
export function enrollmentFor(student: Student): Enrollment {
  return { id: `${student.matricule}:${student.academicYearId}`, studentId: student.matricule, academicYearId: student.academicYearId, groupId: student.groupId, level: student.niveau, program: student.filiere, status: enrollmentStatus(student), date: student.history[0]?.date || new Date().toISOString(), reason: 'Inscription académique', financials: student.financials };
}
function enrollmentStatus(student: Student): Enrollment['status'] {
  if (student.status === 'Abandonné') return 'ABANDON';
  if (student.status === 'Diplômé') return 'DIPLOME';
  if (student.status === 'Suspendu') return 'SUSPENDU';
  return student.status === 'Réinscrit' ? 'REINSCRIT' : 'INSCRIT';
}
export function deriveEnrollments(data: Dataset): Enrollment[] {
  const records = [...data.enrollments];
  for (const student of data.students) {
    if (!student.academicYearId) continue;
    const index = records.findIndex(item => item.studentId === student.matricule && item.academicYearId === student.academicYearId);
    if (index < 0) records.push(enrollmentFor(student)); else records[index] = { ...records[index], groupId: student.groupId, financials: student.financials, status: enrollmentStatus(student) };
  }
  return records;
}
export function classesFor(data: Dataset) {
  return data.assignments.flatMap(item => {
    const subject = data.subjects.find(subject => subject.id === item.subjectId); const teacher = data.teachers.find(teacher => teacher.id === item.teacherId);
    const group = data.groups.find(group => group.id === item.groupId); const semester = data.semesters.find(semester => semester.id === item.semesterId);
    return subject && teacher && group && semester ? [{ id: item.id, code: subject.code, name: subject.name, filiere: group.filieres.join(', '), level: group.niveau, groupId: group.id, teacherId: teacher.id, coefficient: subject.coefficient, teacher: `${teacher.firstname} ${teacher.lastname}`, semester: semester.name }] : [];
  });
}
export function executeCampusWorkflow(source: Dataset, context: WorkflowContext, action: CampusAction, payload: unknown): { data: Dataset; audit: WorkflowAudit[] } {
  const data = structuredClone(source); data.enrollments = deriveEnrollments(data);
  const events: WorkflowAudit[] = []; const now = new Date().toISOString(); const role = context.role;
  const permit = (condition: boolean) => assert(condition, 'Votre rôle ne peut pas effectuer cette opération.');
  const openYear = (yearId: string) => assert(data.academicYears.some(item => item.id === yearId && item.status === 'OUVERTE'), 'Cette opération nécessite une année ouverte.');
  const studentById = (studentId: string) => { const student = data.students.find(item => item.matricule === studentId); assert(student, 'Étudiant introuvable.'); return student; };
  const save = (collection: Collection, value: Entity, entityId: string, motif = '') => {
    const list = data[collection] as Entity[]; const key = (item: Entity) => collection === 'students' ? (item as Student).matricule : (item as { id: string }).id;
    const index = list.findIndex(item => key(item) === entityId); const old = index >= 0 ? list[index] : null;
    if (index < 0) list.push(value); else list[index] = value;
    events.push({ collection, id: entityId, oldValue: old, newValue: value, reason: motif });
  };
  const saveStudent = (updated: Student, motif: string) => {
    save('students', updated, updated.matricule, motif);
    const record = data.enrollments.find(item => item.studentId === updated.matricule && item.academicYearId === updated.academicYearId);
    if (record) save('enrollments', { ...record, financials: updated.financials, status: enrollmentStatus(updated) }, record.id, motif);
  };
  if (['exam.results', 'exam.paper', 'exam.authorize', 'exam.start', 'exam.answer', 'exam.submit', 'exam.correct'].includes(action)) {
    executeExamAction(data, role, context.actor, action as ExamAction, payload);
    for (const collection of ['exams', 'examPapers', 'examAttempts', 'evaluations'] as const) {
      for (const item of data[collection]) {
        const old = source[collection].find(value => value.id === item.id) ?? null;
        if (JSON.stringify(old) !== JSON.stringify(item)) events.push({ collection, id: item.id, oldValue: old, newValue: item, reason: action });
      }
    }
    return { data, audit: events };
  }
  switch (action) {
    case 'student.document.add': {
      const values = z.object({ studentId: id, kind: z.enum(['IDENTITE', 'BAC', 'RELEVE', 'PHOTO', 'AUTRE']), fileName: id, mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf']), size: z.number().int().positive().max(5 * 1024 * 1024), dataUrl: z.string().max(7_000_000) }).parse(payload);
      permit(hasPermission(role, 'student.group.assign') || ((role === ROLES.STUD || role === ROLES.DEL) && values.studentId === context.actor)); studentById(values.studentId);
      assert(values.dataUrl.startsWith(`data:${values.mimeType};base64,`) && /^[A-Za-z0-9+/=]+$/.test(values.dataUrl.split(',')[1] || ''), 'Format du fichier invalide.');
      assert(values.kind !== 'PHOTO' || values.mimeType.startsWith('image/'), 'La photo doit être une image JPEG ou PNG.');
      const documentId = createMockId('DOC');
      save('documents', { ...values, id: documentId, status: 'A_VERIFIER', history: [{ date: now, actor: context.actor, status: 'A_VERIFIER', reason: 'Pièce déposée' }] }, documentId);
      events[events.length - 1].newValue = { id: documentId, studentId: values.studentId, fileName: values.fileName, kind: values.kind, size: values.size, status: 'A_VERIFIER' }; break;
    }
    case 'student.document.review': {
      permit((role === ROLES.DA || role === ROLES.IT) || role === ROLES.LOG);
      const values = z.object({ documentId: id, status: z.enum(['CONFORME', 'NON_CONFORME']), reason }).parse(payload); const document = data.documents.find(item => item.id === values.documentId); assert(document, 'Pièce introuvable.');
      save('documents', { ...document, status: values.status, history: [...document.history, { date: now, actor: context.actor, status: values.status, reason: values.reason }] }, document.id, values.reason);
      const event = events[events.length - 1]; event.oldValue = { id: document.id, status: document.status }; event.newValue = { id: document.id, status: values.status }; break;
    }
    case 'settings.update': {
      permit(role === ROLES.DG || (role === ROLES.DA || role === ROLES.IT));
      const values: InstitutionSettings = settingsSchema.parse(payload); assert(values.eliminationMark <= values.passMark, 'Le seuil éliminatoire ne peut dépasser le seuil de validation.');
      save('settings', values, values.id, values.rulesReason); break;
    }
    case 'student.reenroll': {
      permit(hasPermission(role, 'student.lifecycle.manage'));
      const values = z.object({ studentId: id, groupId: id, reason }).parse(payload);
      const student = studentById(values.studentId); const group = data.groups.find(item => item.id === values.groupId);
      assert(group && group.filieres.includes(student.filiere) && group.academicYearId !== student.academicYearId, 'Choisissez un groupe compatible d’une nouvelle année.');
      assert(!data.enrollments.some(item => item.studentId === student.matricule && item.academicYearId === group.academicYearId), 'Cet étudiant est déjà inscrit pour cette année.'); openYear(group.academicYearId);
      const previousGroup = data.groups.find(item => item.id === student.groupId); const previousLevel = data.levels.find(item => item.id === previousGroup?.levelId); const level = data.levels.find(item => item.id === group.levelId);
      const oldYear = data.academicYears.find(item => item.id === student.academicYearId); const newYear = data.academicYears.find(item => item.id === group.academicYearId);
      assert(level && previousLevel && oldYear && newYear && newYear.startDate > oldYear.startDate, 'Année et niveaux incompatibles.');
      if (level.id !== previousLevel.id) {
        assert((level.cycle === previousLevel.cycle && level.order === previousLevel.order + 1) || (previousLevel.code === 'L3' && level.code === 'M1'), 'Choisissez le même niveau ou le niveau suivant.');
        const semesters = data.semesters.filter(item => item.academicYearId === student.academicYearId && item.levelId === previousLevel.id);
        assert(semesters.length === 2 && semesters.every(semester => data.juryDecisions.filter(item => item.studentId === student.matricule && item.semesterId === semester.id).at(-1)?.decision === 'ADMIS'), 'Le passage au niveau suivant nécessite la validation des deux semestres par le jury.');
      }
      const archived = data.enrollments.find(item => item.studentId === student.matricule && item.academicYearId === student.academicYearId)!;
      save('enrollments', { ...archived, financials: student.financials }, archived.id, values.reason);
      const updated: Student = { ...student, groupId: group.id, groupe: group.name, niveau: group.niveau, academicYearId: group.academicYearId, status: 'Réinscrit', bourse: { active: false, type: '', percent: 0, amount: 0 }, financials: { expected: 0, paid: 0, remaining: 0, installments: [] }, history: [...student.history, { date: now, text: `Réinscription ${newYear.label} / ${group.name} par ${context.actor} : ${values.reason}` }] };
      save('students', updated, updated.matricule, values.reason); const enrollment = enrollmentFor(updated); save('enrollments', { ...enrollment, reason: values.reason }, enrollment.id, values.reason);
      save('groups', { ...group, studentIds: [...new Set([...group.studentIds, student.matricule])] }, group.id, values.reason); break;
    }
    case 'student.status': {
      permit(hasPermission(role, 'student.lifecycle.manage'));
      const values = z.object({ studentId: id, status: z.enum(['Inscrit', 'Suspendu', 'Abandonné', 'Diplômé']), reason }).parse(payload);
      const student = studentById(values.studentId); openYear(student.academicYearId);
      if (values.status === 'Diplômé') {
        permit((role === ROLES.DA || role === ROLES.IT)); const group = data.groups.find(item => item.id === student.groupId); const level = data.levels.find(item => item.id === group?.levelId);
        assert(level && ['L3', 'M2'].includes(level.code), 'Le diplôme concerne la dernière année du cycle.');
        const decisions = new Map<string, JuryDecision>(); for (const entry of data.juryDecisions.filter(item => item.studentId === student.matricule)) decisions.set(entry.semesterId, entry);
        const credits = [...decisions.values()].filter(item => { const semester = data.semesters.find(semester => semester.id === item.semesterId); return item.decision === 'ADMIS' && data.levels.find(item => item.id === semester?.levelId)?.cycle === level.cycle; }).reduce((sum, item) => sum + item.credits, 0);
        assert(credits >= (level.cycle === 'LICENCE' ? 180 : 120), 'Les crédits du cycle doivent être validés avant de déclarer le diplôme.');
      }
      assert(values.status !== student.status, 'Cet étudiant possède déjà ce statut.');
      saveStudent({ ...student, status: values.status, history: [...student.history, { date: now, text: `${student.status} → ${values.status} par ${context.actor} : ${values.reason}` }] }, values.reason); break;
    }
    case 'finance.contract': {
      permit(hasPermission(role, 'payment.record'));
      const values = z.object({ studentId: id, tuition: money, registration: money, other: money, scholarshipPercent: z.number().min(0).max(100), scholarshipLabel: text, dates: z.array(date).min(1).max(24), reason }).parse(payload);
      const student = studentById(values.studentId); openYear(student.academicYearId);
      assert(new Set(values.dates).size === values.dates.length, 'Les dates d’échéance doivent être distinctes.');
      const scholarship = Math.floor(values.tuition * values.scholarshipPercent / 100); const expected = values.tuition + values.registration + values.other - scholarship;
      assert(expected >= student.financials.paid && expected >= values.dates.length && expected > 0, 'Le montant net doit couvrir les encaissements déjà réalisés.');
      assert(!scholarship || values.scholarshipLabel, 'Précisez le libellé de la bourse.');
      const dates = [...values.dates].sort(); const base = Math.floor(expected / dates.length);
      const installments = reconcile(dates.map((dueDate, index) => ({ dueDate, amount: base + (index === dates.length - 1 ? expected % dates.length : 0), status: 'A venir' })), student.financials.paid);
      const updated: Student = { ...student, financials: { expected, paid: student.financials.paid, remaining: expected - student.financials.paid, installments, terms: { tuition: values.tuition, registration: values.registration, other: values.other, scholarship, reason: values.reason } }, bourse: { active: scholarship > 0, type: values.scholarshipLabel, percent: values.scholarshipPercent, amount: scholarship }, history: [...student.history, { date: now, text: `Contrat financier : ${expected} FCFA, bourse ${scholarship} FCFA par ${context.actor} : ${values.reason}` }] };
      const fee = data.fees.find(item => item.code === `SCOL-${student.matricule}` && item.academicYearId === student.academicYearId && item.active);
      const feeId = fee?.id || createMockId('FEE'); save('fees', { id: feeId, code: `SCOL-${student.matricule}`, label: 'Scolarité et frais annexes', amount: expected, academicYearId: student.academicYearId, active: true }, feeId, values.reason);
      saveStudent(updated, values.reason); break;
    }
    case 'finance.payment': {
      permit(hasPermission(role, 'payment.record'));
      const values = z.object({ studentId: id, academicYearId: id, amount: money.positive(), method: z.enum(['ESPECES', 'VIREMENT', 'CARTE', 'MOBILE_MONEY', 'CHEQUE']), reference: id }).parse(payload);
      const student = studentById(values.studentId); const current = student.academicYearId === values.academicYearId;
      const enrollment = data.enrollments.find(item => item.studentId === student.matricule && item.academicYearId === values.academicYearId);
      const financials = current ? student.financials : enrollment?.financials;
      const fee = data.fees.find(item => item.code === `SCOL-${student.matricule}` && item.academicYearId === values.academicYearId && item.active);
      assert(financials && fee && values.amount <= financials.remaining, 'Contrat absent ou montant supérieur au solde.');
      assert(!data.payments.some(item => item.reference === values.reference), 'Cette référence de transaction est déjà enregistrée.');
      const paymentId = createMockId('PAY'); save('payments', { id: paymentId, studentId: student.matricule, feeId: fee.id, amount: values.amount, date: now, paymentMethod: values.method as PaymentMethod, reference: values.reference, recordedBy: context.actor, status: 'ENREGISTRE', academicYearId: values.academicYearId }, paymentId);
      const receiptId = createMockId('RCT'); save('receipts', { id: receiptId, paymentId, reference: `${data.settings[0].receiptPrefix}-${new Date().getFullYear()}-${String(data.receipts.length + 1).padStart(6, '0')}`, issuedAt: now, studentId: student.matricule, amount: values.amount }, receiptId);
      const paid = financials.paid + values.amount; const updated = { ...financials, paid, remaining: financials.expected - paid, installments: reconcile(financials.installments, paid) };
      if (current) saveStudent({ ...student, financials: updated }, values.reference);
      else if (enrollment) save('enrollments', { ...enrollment, financials: updated }, enrollment.id, values.reference); break;
    }
    case 'finance.cancel': {
      permit(hasPermission(role, 'payment.cancel'));
      const values = z.object({ paymentId: id, reason }).parse(payload); const payment = data.payments.find(item => item.id === values.paymentId);
      assert(payment && payment.status === 'ENREGISTRE', 'Paiement absent ou déjà annulé.');
      const student = studentById(payment.studentId); const fee = data.fees.find(item => item.id === payment.feeId)!;
      const current = student.academicYearId === fee.academicYearId; const enrollment = data.enrollments.find(item => item.studentId === student.matricule && item.academicYearId === fee.academicYearId);
      const financials = current ? student.financials : enrollment?.financials; assert(financials && financials.paid >= payment.amount, 'Solde historique incompatible.');
      const paid = financials.paid - payment.amount; const updated = { ...financials, paid, remaining: financials.expected - paid, installments: reconcile(financials.installments, paid) };
      save('payments', { ...payment, status: 'ANNULE' }, payment.id, values.reason); const cancellationId = createMockId('CAN');
      save('paymentCancellations', { id: cancellationId, paymentId: payment.id, reason: values.reason, cancelledBy: context.actor, date: now }, cancellationId, values.reason);
      if (current) saveStudent({ ...student, financials: updated }, values.reason); else if (enrollment) save('enrollments', { ...enrollment, financials: updated }, enrollment.id, values.reason); break;
    }
    case 'jury.decide': {
      permit((role === ROLES.DA || role === ROLES.IT)); const values = z.object({ studentId: id, semesterId: id, decision: z.enum(['ADMIS', 'RATTRAPAGE', 'AJOURNE']), reason }).parse(payload);
      const rules = data.settings[0]; assert(rules.rulesApproved, 'Validez les règles de délibération dans les paramètres académiques.');
      const result = computeTranscript(data, values.studentId, values.semesterId, rules); openYear(result.academicYearId);
      assert(result.complete, 'Crédits conformes et notes de devoir et d’examen publiées pour chaque matière obligatoires.');
      assert(values.decision !== 'ADMIS' || result.suggestedDecision === 'ADMIS', 'Les crédits ne permettent pas une admission selon les règles approuvées.');
      const decisionId = createMockId('JURY'); save('juryDecisions', { id: decisionId, studentId: values.studentId, semesterId: values.semesterId, academicYearId: result.academicYearId, average: result.average, credits: result.credits, totalCredits: result.totalCredits, decision: values.decision, reason: values.reason, date: now, actor: context.actor, rules: structuredClone(rules), rows: result.rows }, decisionId, values.reason); break;
    }
    case 'exam.create': {
      permit((role === ROLES.DA || role === ROLES.IT) || role === ROLES.LOG);
      const values = z.object({ assignmentId: id, mode: z.enum(['PAPIER', 'EN_LIGNE']).default('PAPIER'), roomCode: z.string().default(''), date, startTime: time, endTime: time, kind: z.enum(['EXAMEN', 'RATTRAPAGE']), supervisorId: z.string().default('') }).parse(payload);
      const assignment = data.assignments.find(item => item.id === values.assignmentId && item.active); const semester = data.semesters.find(item => item.id === assignment?.semesterId);
      assert(assignment && semester && semester.active && semester.academicYearId === assignment.academicYearId && values.date >= semester.startDate && values.date <= semester.endDate, 'Examen hors du semestre actif.'); openYear(assignment.academicYearId);
      assert(values.startTime < values.endTime, 'Horaires invalides.');
      const examId = createMockId('EXAM');
      const candidateIds = data.students.filter(item => item.groupId === assignment.groupId && item.academicYearId === assignment.academicYearId).map(item => item.matricule);
      if (values.mode === 'PAPIER') {
        assert(context.users.some(item => item.id === values.supervisorId && item.active && (item.roles?.includes(ROLES.SURV) || item.role === ROLES.SURV)), 'Choisissez un surveillant actif dans l’annuaire.');
        assert(!data.exams.some(item => item.status === 'PLANIFIE' && item.supervisorId === values.supervisorId && item.date === values.date && item.startTime < values.endTime && values.startTime < item.endTime), 'Ce surveillant est déjà affecté sur le créneau.');
        const planned = planSession({ ...values, classId: values.assignmentId }, { classes: classesFor(data), rooms: data.rooms, sessions: data.sessions, students: data.students, groups: data.groups, blockedPeriods: data.blockedPeriods }); assert(planned.success, planned.success ? '' : planned.error);
        save('sessions', { ...planned.session, id: examId, candidateIds }, examId);
      } else {
        assert(!data.blockedPeriods.some(item => values.date >= item.startDate && values.date <= item.endDate), 'Date bloquée.');
        assert(!data.sessions.some(item => item.status !== 'Annulé' && item.date === values.date && item.startTime < values.endTime && values.startTime < item.endTime && (item.groupId === assignment.groupId || data.assignments.find(a => a.id === item.classId)?.teacherId === assignment.teacherId)), 'Conflit de groupe ou d’enseignant.');
        save('sessions', { id: examId, candidateIds, classId: assignment.id, groupId: assignment.groupId, roomCode: 'EN_LIGNE', date: values.date, startTime: values.startTime, endTime: values.endTime, status: 'Confirmé' }, examId);
      }
      const evaluationId = createMockId('EVAL');
      save('evaluations', { id: evaluationId, examMode: values.mode, examEndAt: `${values.date}T${values.endTime}:00Z`, classId: assignment.id, name: `${values.kind === 'RATTRAPAGE' ? 'Rattrapage' : 'Examen'} du ${values.date}`, type: values.kind === 'RATTRAPAGE' ? 'Rattrapage' : 'Examen', date: values.date, status: 'BROUILLON', history: [], grades: candidateIds.map(matricule => ({ matricule, value: null })) }, evaluationId);
      save('exams', { ...values, evaluationId, id: examId, status: 'PLANIFIE', reason: '' }, examId); break;
    }
    case 'exam.cancel': {
      permit((role === ROLES.DA || role === ROLES.IT) || role === ROLES.LOG); const values = z.object({ examId: id, reason }).parse(payload); const exam = data.exams.find(item => item.id === values.examId);
      assert(exam && exam.status === 'PLANIFIE', 'Examen absent ou déjà annulé.');
      const evaluation = data.evaluations.find(item => item.id === exam.evaluationId);
      assert(!data.examAttempts.some(item => item.examId === exam.id) && (!evaluation || (evaluation.status === 'BROUILLON' && evaluation.grades.every(grade => grade.value === null && !grade.absent))), 'Une épreuve avec copies ou résultats doit conserver son historique et ne peut plus être annulée par la planification.');
      save('exams', { ...exam, status: 'ANNULE', reason: values.reason }, exam.id, values.reason);
      if (evaluation) save('evaluations', { ...evaluation, examCancelled: true }, evaluation.id, values.reason);
      const session = data.sessions.find(item => item.id === exam.id); if (session) save('sessions', { ...session, status: 'Annulé', reason: values.reason }, session.id, values.reason); break;
    }
    case 'schedule.change': {
      permit(hasPermission(role, 'schedule.update'));
      const values = z.object({ sessionId: id, roomCode: id, date, startTime: time, endTime: time, status: z.enum(['Déplacé', 'Annulé']), reason }).parse(payload);
      const session = data.sessions.find(item => item.id === values.sessionId); assert(session && session.status !== 'Annulé', 'Séance absente ou déjà annulée.');
      assert(!data.exams.some(item => item.id === session.id), 'Utilisez l’organisation des examens pour annuler un examen.');
      const assignment = data.assignments.find(item => item.id === session.classId); const semester = data.semesters.find(item => item.id === assignment?.semesterId);
      assert(assignment && semester, 'Enseignement introuvable.'); openYear(assignment.academicYearId);
      if (values.status === 'Déplacé') {
        assert(values.date >= semester.startDate && values.date <= semester.endDate, 'Séance hors du semestre.');
        const result = planSession({ ...values, classId: session.classId }, { classes: classesFor(data), rooms: data.rooms, sessions: data.sessions.filter(item => item.id !== session.id), students: data.students, groups: data.groups, blockedPeriods: data.blockedPeriods }); assert(result.success, result.success ? '' : result.error);
        assert(!session.attendance, 'Une séance avec présences enregistrées doit conserver son créneau.');
      }
      save('sessions', { ...session, roomCode: values.roomCode, date: values.date, startTime: values.startTime, endTime: values.endTime, status: values.status, reason: values.reason }, session.id, values.reason); break;
    }
    case 'staff.save': {
      permit(hasPermission(role, 'staff.manage'));
      const values = z.object({ id, name: id, email: z.union([z.email(), z.literal('')]), phone: text, position: id, contract: z.enum(['PERMANENT', 'VACATAIRE', 'STAGIAIRE']), startDate: date, active: z.boolean() }).parse(payload);
      save('staff', values, values.id); break;
    }
    case 'asset.save': {
      permit(hasPermission(role, 'asset.manage'));
      const values = z.object({ id, name: id, location: id, quantity: z.number().int().min(1).max(100000), status: z.enum(['DISPONIBLE', 'MAINTENANCE', 'HORS_SERVICE']) }).parse(payload); save('assets', values, values.id); break;
    }
    case 'purchase.create': {
      permit(hasPermission(role, 'purchase.create'));
      const values = z.object({ label: id, supplier: id, amount: money.positive(), date, reason: text }).parse(payload); const purchaseId = createMockId('ACHAT'); save('purchases', { ...values, id: purchaseId, status: 'DEMANDE' }, purchaseId); break;
    }
    case 'purchase.transition': {
      const values = z.object({ purchaseId: id, status: z.enum(['APPROUVE', 'REFUSE', 'RECU']), reason }).parse(payload); const item = data.purchases.find(item => item.id === values.purchaseId); assert(item, 'Achat introuvable.');
      if (values.status === 'RECU') { permit(hasPermission(role, 'purchase.receive')); assert(item.status === 'APPROUVE', 'Seul un achat approuvé peut être réceptionné.'); }
      else { permit(hasPermission(role, 'purchase.approve')); assert(item.status === 'DEMANDE', 'Cette demande a déjà reçu une décision.'); }
      save('purchases', { ...item, status: values.status, reason: values.reason }, item.id, values.reason); break;
    }
  }
  return { data, audit: events };
}
