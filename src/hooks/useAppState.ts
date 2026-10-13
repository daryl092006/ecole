'use client';

import { useState, useCallback, useMemo } from 'react';
import { createAnnouncement } from '@/services/communicationService';
import { useDemoUsers } from '@/hooks/useDemoUsers';
import { createSupportTicket, transitionSupportTicket } from '@/services/supportService';
import type { SupportTicket } from '@/types/support';
import { createFinancialContract } from '@/services/financeContractService';
import { createRegisteredStudent, type StudentInput } from '@/services/studentService';
import { useAcademicReferenceStore } from '@/hooks/useAcademicReferences';
import {
  initialStudents, initialClasses, initialEvaluations, initialReclamations,
  initialRooms, initialSessions, initialSystemLogs, initialAnnouncements,
  initialBlockedPeriods,
  initialFees, initialPayments, initialReceipts, initialPaymentCancellations,
} from '@/mocks/data';
import type { Student, ClassItem, Evaluation, Reclamation, Room, Session, PaymentMethod, Announcement, BlockedPeriod } from '@/types';
import { ROLES } from '@/types/permissions';
import type { Permission, RoleName } from '@/types/permissions';
import { ROLE_ACCESS, ROLE_PERMISSIONS } from '@/permissions/rolePermissions';
import { hasPermission } from '@/permissions/rolePermissions';
import { planSession } from '@/services/scheduleService';
import { correctPublishedGrade, createEvaluation, enterGrade, transitionGradeWorkflow } from '@/services/gradeService';
import { transitionComplaint } from '@/services/complaintService';
import { cancelLocalPayment, recordLocalPayment } from '@/services/financeService';

// ─── helpers ─────────────────────────────────────────────────────────────────

export function fmtMoney(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export function getDocBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'conforme': return 'conforme';
    case 'non conforme': return 'non-conforme';
    case 'a vérifier': return 'a-verifier';
    default: return 'non-fourni';
  }
}

export const ALL_TABS = [
  {
    id: 'espace',
    name: 'Mon Espace',
    icon: 'Home',
    subTabs: [
      { id: 'espace_dashboard', name: 'Tableau de bord' },
      { id: 'espace_support', name: 'Support technique' },
      { id: 'espace_announcements', name: 'Annonces & Actualités' },
    ],
  },
  {
    id: 'dashboard_global',
    name: 'Tableau de Bord',
    icon: 'BarChart2',
    subTabs: [
      { id: 'dashboard_kpis', name: 'Statistiques Clés' },
      { id: 'dashboard_reports', name: 'Rapports & Activités' },
    ],
  },
  {
    id: 'academique',
    name: 'Académique',
    icon: 'BookOpen',
    subTabs: [
      { id: 'acad_program', name: 'Filières & Matières' },
      { id: 'acad_reference', name: 'Référentiel académique' },
      { id: 'acad_schedule', name: 'Emploi du temps' },
      { id: 'acad_attendance', name: 'Feuilles de présence' },
      { id: 'acad_grades', name: 'Évaluations & Notes' },
      { id: 'acad_complaints', name: 'Réclamations' },
    ],
  },
  {
    id: 'etudiants',
    name: 'Étudiants',
    icon: 'GraduationCap',
    subTabs: [
      { id: 'stud_list', name: 'Liste des Étudiants' },
      { id: 'stud_cards', name: 'Cartes d\'Étudiant' },
      { id: 'stud_status', name: 'Réinscriptions & Abandons' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'CreditCard',
    subTabs: [
      { id: 'fin_kpis', name: 'Indicateurs Financiers' },
      { id: 'fin_payments', name: 'Échéanciers & Versements' },
      { id: 'fin_reports', name: 'Rapports Financiers' },
    ],
  },
  {
    id: 'personnel',
    name: 'Personnel',
    icon: 'Users',
    subTabs: [
      { id: 'staff_list', name: 'Utilisateurs & Rôles' },
      { id: 'staff_teachers', name: 'Enseignants & Affectations' },
    ],
  },
  {
    id: 'marketing',
    name: 'Communication',
    icon: 'Megaphone',
    subTabs: [
      { id: 'comm_announcements', name: 'Créer une Annonce' },
      { id: 'comm_news', name: 'Actualités ESCEN' },
    ],
  },
  {
    id: 'systeme',
    name: 'Système & Audit',
    icon: 'Settings',
    subTabs: [
      { id: 'sys_logs', name: 'Journal d\'Activité' },
      { id: 'sys_backups', name: 'Export du journal' },
      { id: 'sys_support', name: 'Tickets de Support' },
    ],
  },
];

const SUBTAB_PERMISSIONS: Record<string, Permission[]> = {
  acad_program: ['academic.view'],
  acad_reference: ['academic.structure.manage', 'academic.group.manage', 'academic.assignment.manage'],
  acad_schedule: ['schedule.view'],
  acad_attendance: ['attendance.view'],
  acad_grades: ['grade.view'],
  acad_complaints: ['complaint.view'],
  stud_list: ['student.view'],
  stud_cards: ['student.card.print'],
  stud_status: ['student.lifecycle.manage'],
  fin_kpis: ['finance.view'],
  fin_payments: ['finance.view'],
  fin_reports: ['finance.report.view'],
  staff_list: ['user.manage'],
  staff_teachers: ['academic.assignment.manage'],
  comm_announcements: ['communication.manage'],
  comm_news: ['communication.view'],
  sys_logs: ['system.audit.view'],
  sys_backups: ['system.backup.manage'],
  sys_support: ['system.support.manage'],
};

function getAvailableTabs(role: RoleName) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  const roleAccess = ROLE_ACCESS[role];
  return ALL_TABS
    .filter(tab => rolePermissions.allowedTabs.includes(tab.id))
    .map(tab => ({
      ...tab,
      subTabs: tab.subTabs?.filter(subTab => {
        const requiredPermissions = SUBTAB_PERMISSIONS[subTab.id];
        return !requiredPermissions || requiredPermissions.some(permission => roleAccess.permissions.includes(permission));
      }),
    }));
}

export const ROLE_COLORS: Record<string, string> = {
  [ROLES.DG]: '#ef4444', [ROLES.DGA]: '#f97316', [ROLES.DA]: '#10b981',
  [ROLES.LOG]: '#06b6d4', [ROLES.ENS]: '#3b82f6',
  [ROLES.RAF]: '#eab308', [ROLES.MKT]: '#8b5cf6', [ROLES.IT]: '#3b82f6',
  [ROLES.STUD]: '#64748b', [ROLES.DEL]: '#64748b',
};

// ─── hook ────────────────────────────────────────────────────────────────────

export function useAppState() {
  const references = useAcademicReferenceStore();
  const groups = references.groups;
  const [demoIdentity, setDemoIdentity] = useState('');
  const [activeRole, setActiveRole] = useState<RoleName>(ROLES.DG);
  const [currentTab, setCurrentTab] = useState('espace');
  const [currentSubTab, setCurrentSubTab] = useState('espace_dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [completedOnboardingRoles, setCompletedOnboardingRoles] = useState<RoleName[]>([]);

  // Data state
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const classes: ClassItem[] = [...initialClasses, ...references.assignments.filter(item => item.active).flatMap(item => {
    const subject = references.subjects.find(value => value.id === item.subjectId);
    const teacher = references.teachers.find(value => value.id === item.teacherId);
    const group = groups.find(value => value.id === item.groupId);
    const semester = references.semesters.find(value => value.id === item.semesterId);
    return subject && teacher && group && semester ? [{ id: item.id, code: subject.code, name: subject.name, filiere: group.filieres.join(', '), level: group.niveau, groupId: group.id, teacherId: teacher.id, coefficient: subject.coefficient, teacher: `${teacher.firstname} ${teacher.lastname}`, semester: semester.name }] : [];
  })];
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations);
  const [reclamations, setReclamations] = useState<Reclamation[]>(initialReclamations);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>(initialBlockedPeriods);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [systemLogs, setSystemLogs] = useState(initialSystemLogs);
  const [fees, setFees] = useState(initialFees);
  const [payments, setPayments] = useState(initialPayments);
  const [receipts, setReceipts] = useState(initialReceipts);
  const [paymentCancellations, setPaymentCancellations] = useState(initialPaymentCancellations);

  // UI state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassForGrades, setSelectedClassForGrades] = useState<ClassItem | null>(null);
  const [newEvalName, setNewEvalName] = useState('');
  const [newEvalType, setNewEvalType] = useState('Devoir');
  const [paymentStudent, setPaymentStudent] = useState(initialStudents[0]?.matricule ?? '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string }>>([]);

  const perms = ROLE_PERMISSIONS[activeRole];
  const baseAccess = ROLE_ACCESS[activeRole];
  const identityStudent = students.find(item => item.matricule === demoIdentity);
  const access = { ...baseAccess, scope: baseAccess.scope.ownDataOnly
    ? { ...baseAccess.scope, studentId: identityStudent?.matricule ?? '__NONE__', groupIds: identityStudent ? [identityStudent.groupId] : [] }
    : activeRole === ROLES.ENS ? { teacherId: demoIdentity || '__NONE__', groupIds: classes.filter(item => item.teacherId === demoIdentity).map(item => item.groupId) }
    : baseAccess.scope };
  const availableTabs = useMemo(() => getAvailableTabs(activeRole), [activeRole]);

  const visibleClasses = !hasPermission(activeRole, 'academic.view') && !hasPermission(activeRole, 'grade.view') && !hasPermission(activeRole, 'attendance.view') && !hasPermission(activeRole, 'schedule.view') ? [] : access.scope.teacherId
    ? classes.filter(classItem => classItem.teacherId === access.scope.teacherId && (!access.scope.groupIds || access.scope.groupIds.includes(classItem.groupId)))
    : access.scope.groupIds
      ? classes.filter(classItem => access.scope.groupIds?.includes(classItem.groupId))
      : classes;
  const visibleSessions = !hasPermission(activeRole, 'schedule.view') ? [] : access.scope.sessionIds
    ? sessions.filter(session => access.scope.sessionIds?.includes(session.id))
    : access.scope.groupIds
      ? sessions.filter(session => access.scope.groupIds?.includes(session.groupId))
      : sessions;
  const visibleStudents = access.scope.studentId
    ? students.filter(student => student.matricule === access.scope.studentId)
    : access.scope.groupIds && access.scope.teacherId
      ? students.filter(student => access.scope.groupIds?.includes(student.groupId))
      : hasPermission(activeRole, 'student.view') ? students : hasPermission(activeRole, 'attendance.view') ? students.filter(student => visibleSessions.some(session => session.groupId === student.groupId)) : [];
  const visibleClassIds = new Set(visibleClasses.map(classItem => classItem.id));
  const visibleEvaluations = (hasPermission(activeRole, 'grade.view') ? evaluations : []).filter(evaluation => visibleClassIds.has(evaluation.classId) && (!access.scope.ownDataOnly || evaluation.status === 'PUBLIEES')).map(evaluation => access.scope.studentId ? { ...evaluation, grades: evaluation.grades.filter(grade => grade.matricule === access.scope.studentId), corrections: evaluation.corrections?.filter(item => item.studentId === access.scope.studentId) } : evaluation);
  const visibleEvaluationIds = new Set(visibleEvaluations.map(evaluation => evaluation.id));
  const visibleReclamations = reclamations.filter(reclamation =>
    visibleEvaluationIds.has(reclamation.evaluationId)
    && (!access.scope.studentId || reclamation.studentMatricule === access.scope.studentId)
  );
  const visiblePayments = !hasPermission(activeRole, 'finance.view') ? [] : access.scope.studentId
    ? payments.filter(payment => payment.studentId === access.scope.studentId)
    : payments;
  const visiblePaymentIds = new Set(visiblePayments.map(payment => payment.id));
  const visibleReceipts = receipts.filter(receipt => visiblePaymentIds.has(receipt.paymentId));
  const visiblePaymentCancellations = paymentCancellations.filter(cancellation => visiblePaymentIds.has(cancellation.paymentId));

  // ── Actions ──────────────────────────────────────────────────────────────

  const logEvent = useCallback((action: string, details: string) => {
    const now = new Date().toISOString();
    setSystemLogs(prev => [{ date: now, user: activeRole + (demoIdentity ? ':' + demoIdentity : ':demo'), action, details }, ...prev]);
  }, [activeRole, demoIdentity]);

  const demoUsers = useDemoUsers(activeRole, logEvent);

  const handleTabChange = (tabId: string) => {
    if (!getAvailableTabs(activeRole).some(item => item.id === tabId)) return;
    setCurrentTab(tabId);
    const tabObj = getAvailableTabs(activeRole).find(t => t.id === tabId);
    if (tabObj && tabObj.subTabs && tabObj.subTabs.length > 0) {
      setCurrentSubTab(tabObj.subTabs[0].id);
    } else {
      setCurrentSubTab('');
    }
  };

  const handleRoleChange = (role: RoleName) => {
    setActiveRole(role);
    setDemoIdentity('');
    setSearchQuery('');
    setNotifications([]);
    setPaymentStudent('');
    setPaymentAmount('');
    setPaymentMethod('VIREMENT');
    setNewEvalName('');
    setNewEvalType('Devoir');
    setSelectedStudent(null);
    setSelectedClassForGrades(null);
    const roleTabs = getAvailableTabs(role);
    const retainedTab = roleTabs.find(tab => tab.id === currentTab) ?? roleTabs[0];
    setCurrentTab(retainedTab.id);
    setCurrentSubTab(retainedTab.subTabs?.[0]?.id ?? '');
    setOnboardingOpen(!completedOnboardingRoles.includes(role));
  };

  const navigateTo = useCallback((tabId: string, subTabId?: string) => {
    const tab = getAvailableTabs(activeRole).find(item => item.id === tabId);
    if (!tab) return;
    const allowedSubTab = subTabId && tab.subTabs?.some(item => item.id === subTabId) ? subTabId : tab.subTabs?.[0]?.id ?? '';
    setCurrentTab(tab.id);
    setCurrentSubTab(allowedSubTab);
  }, [activeRole]);

  const completeOnboarding = () => {
    setCompletedOnboardingRoles(current => current.includes(activeRole) ? current : [...current, activeRole]);
    setOnboardingOpen(false);
  };

  // Ajout de cours avec détection automatique des conflits
  const checkConflictsAndAddSession = (
    classId: string,
    roomCode: string,
    date: string,
    startTime: string,
    endTime: string
  ): { success: boolean; error?: string } => {
    if (!hasPermission(activeRole, 'schedule.create')) {
      return { success: false, error: "Votre rôle n'est pas autorisé à créer une séance." };
    }
    const assignment = references.assignments.find(item => item.id === classId);
    const semester = references.semesters.find(item => item.id === assignment?.semesterId);
    const year = references.academicYears.find(item => item.id === assignment?.academicYearId);
    if (assignment && (!assignment.active || year?.status !== 'OUVERTE' || !semester?.active || date < semester.startDate || date > semester.endDate)) return { success: false, error: 'La séance doit appartenir au semestre actif d’une année ouverte.' };
    const result = planSession(
      { classId, roomCode, date, startTime, endTime },
      { classes, rooms, sessions, students, groups, blockedPeriods }
    );
    if (!result.success) return result;

    setSessions(prev => [...prev, result.session]);
    logEvent('Création Séance', `${result.classItem.name} en salle ${result.room.name} le ${date} de ${startTime} ? ${endTime}`);
    setNotifications(prev => [
      { id: Date.now(), text: `Nouveau cours planifié : ${result.classItem.name} le ${date}.` },
      ...prev,
    ]);
    return { success: true };
  };

  const addRoom = (room: Room) => {
    if (!hasPermission(activeRole, 'schedule.create')) throw new Error('Permission insuffisante.');
    if (!room.code.trim() || !room.name.trim() || !Number.isInteger(room.capacity) || room.capacity < 1) throw new Error('Code, nom et capacité entière positive obligatoires.');
    if (rooms.some(item => item.code.toLowerCase() === room.code.toLowerCase())) throw new Error('Code salle déjà utilisé.');
    setRooms(previous => [...previous, room]); logEvent('Création salle', JSON.stringify({ oldValue: null, newValue: room }));
  };
  const addBlockedPeriod = (label: string, startDate: string, endDate: string) => {
    if (!hasPermission(activeRole, 'schedule.create')) throw new Error('Permission insuffisante.');
    if (!label.trim() || !startDate || !endDate || startDate > endDate) throw new Error('Libellé et dates valides obligatoires.');
    if (sessions.some(item => item.status !== 'Annulé' && item.date >= startDate && item.date <= endDate)) throw new Error('Des séances existent sur cette période. Traitez-les avant de bloquer les dates.');
    const period: BlockedPeriod = { id: `BLOCK-${Date.now()}`, label: label.trim(), startDate, endDate, type: 'AUTRE' };
    setBlockedPeriods(previous => [...previous, period]); logEvent('Blocage période', JSON.stringify({ oldValue: null, newValue: period }));
  };
  const recordAttendance = (sessionId: string, attendance: NonNullable<Session['attendance']>) => {
    if (!hasPermission(activeRole, 'attendance.record') || !visibleSessions.some(item => item.id === sessionId)) throw new Error('Séance non autorisée.');
    const session = sessions.find(item => item.id === sessionId);
    if (!session || session.status === 'Annulé') throw new Error('Séance indisponible.');
    const members = students.filter(item => item.groupId === session.groupId).map(item => item.matricule);
    if (Object.keys(attendance).some(id => !members.includes(id)) || Object.values(attendance).some(value => !['Présent', 'Absent', 'Retard', 'Absent justifié'].includes(value))) throw new Error('Feuille de présence invalide.');
    setSessions(previous => previous.map(item => item.id === sessionId ? { ...item, attendance: { ...attendance } } : item));
    logEvent('Enregistrement présences', JSON.stringify({ entity: sessionId, oldValue: session.attendance, newValue: attendance }));
  };

  const addEvaluation = () => {
    if (!hasPermission(activeRole, 'evaluation.create')) return;
    if (!newEvalName.trim() || !selectedClassForGrades || !visibleClasses.some(item => item.id === selectedClassForGrades.id)) return;
    if (!students.some(item => item.groupId === selectedClassForGrades.groupId)) { alert('Aucun étudiant inscrit dans ce groupe.'); return; }
    const ev = createEvaluation({
      id: `EV-${String(evaluations.length + 1).padStart(3, '0')}`,
      classId: selectedClassForGrades.id,
      type: newEvalType,
      name: newEvalName,
      date: new Date().toISOString().slice(0, 10),
      grades: students.filter(s => s.groupId === selectedClassForGrades.groupId).map(s => ({ matricule: s.matricule, value: null })),
    }, activeRole, selectedClassForGrades.teacherId, demoIdentity);
    setEvaluations(prev => [...prev, ev]);
    setNewEvalName('');
    logEvent('Création Évaluation', `${ev.name} – ${selectedClassForGrades.name}`);
  };

  const submitGrades = (ev: Evaluation) => {
    if (!hasPermission(activeRole, 'grade.submit') || !visibleEvaluations.some(item => item.id === ev.id)) return;
    const current = evaluations.find(item => item.id === ev.id);
    if (!current) return;
    try {
      const context = { actor: demoIdentity || activeRole, role: activeRole, teacherId: classes.find(item => item.id === current.classId)?.teacherId };
      const entered = current.status === 'BROUILLON' ? transitionGradeWorkflow(current, 'SAISIES', context) : current;
      const submitted = transitionGradeWorkflow(entered, 'SOUMISES', context);
      setEvaluations(prev => prev.map(item => item.id === ev.id ? submitted : item));
      logEvent('Soumission Notes', ev.name);
    } catch (error) { alert(error instanceof Error ? error.message : 'Soumission impossible.'); }
  };

  const changeGradeStatus = (ev: Evaluation, target: Evaluation['status'], comment?: string) => {
    const requiredPermission = target === 'A_CONTROLER' || target === 'SAISIES'
      ? 'grade.review' : target === 'VALIDEES' ? 'grade.approve' : 'grade.publish';
    if (!hasPermission(activeRole, requiredPermission) || !visibleEvaluations.some(item => item.id === ev.id)) return;
    const current = evaluations.find(item => item.id === ev.id);
    if (!current) return;
    try {
      const updated = transitionGradeWorkflow(current, target, { actor: demoIdentity || activeRole, role: activeRole, comment });
      setEvaluations(previous => previous.map(item => item.id === ev.id ? updated : item));
      logEvent('Transition Notes', JSON.stringify({ entity: ev.id, oldValue: current.status, newValue: target, reason: comment }));
    } catch (error) { alert(error instanceof Error ? error.message : 'Transition impossible.'); }
  };

  const updateGrade = (evaluationId: string, gradeIndex: number, value: number | null) => {
    if (!hasPermission(activeRole, 'grade.enter') || !visibleEvaluations.some(item => item.id === evaluationId)) return;
    const current = evaluations.find(item => item.id === evaluationId);
    if (!current) return;
    try {
      const updated = enterGrade(current, gradeIndex, value, activeRole, classes.find(item => item.id === current.classId)?.teacherId ?? '', demoIdentity);
      setEvaluations(previous => previous.map(item => item.id === evaluationId ? updated : item));
      logEvent('Saisie note', JSON.stringify({ entity: evaluationId, studentId: current.grades[gradeIndex].matricule, oldValue: current.grades[gradeIndex].value, newValue: value }));
    } catch (error) { alert(error instanceof Error ? error.message : 'Saisie impossible.'); }
  };

  const createContract = (studentId: string, amount: number, dates: string[]) => {
    const student = students.find(item => item.matricule === studentId);
    if (!student) throw new Error('Étudiant introuvable.');
    const result = createFinancialContract(student, amount, dates, activeRole);
    setStudents(previous => previous.map(item => item.matricule === studentId ? result.student : item));
    setFees(previous => [...previous, result.fee]);
    logEvent('Contrat financier', JSON.stringify({ entity: studentId, oldValue: student.financials, newValue: result.student.financials }));
  };

  const recordPayment = () => {
    if (!hasPermission(activeRole, 'payment.record')) throw new Error('Encaissement non autorisé.');
    const amt = parseFloat(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Montant positif obligatoire.');

    const student = students.find(item => item.matricule === paymentStudent);
    const fee = fees.find(item => item.code === `SCOL-${paymentStudent}` && item.active && item.academicYearId === student?.academicYearId);
    if (!student || !fee) throw new Error('Sélectionnez un Étudiant disposant d’un contrat financier.');
    const result = recordLocalPayment(student, fee, amt, paymentMethod, activeRole, payments.length + 1);
    setStudents(prev => prev.map(item => item.matricule === student.matricule ? result.updatedStudent : item));
    setPayments(prev => [...prev, result.payment]);
    setReceipts(prev => [...prev, result.receipt]);

    logEvent('Enregistrement Paiement', `${fmtMoney(amt)} pour matricule ${paymentStudent}`);
    setPaymentAmount('');
    setNotifications(prev => [
      { id: Date.now(), text: `Paiement de ${fmtMoney(amt)} enregistré pour ${paymentStudent}.` },
      ...prev,
    ]);
  };

  const cancelPayment = (paymentId: string, reason: string) => {
    if (!hasPermission(activeRole, 'payment.cancel')) return;
    const payment = payments.find(item => item.id === paymentId);
    const student = students.find(item => item.matricule === payment?.studentId);
    if (!payment || !student) return;
    const result = cancelLocalPayment(payment, student, reason, activeRole);
    setPayments(prev => prev.map(item => item.id === paymentId ? result.payment : item));
    setStudents(prev => prev.map(item => item.matricule === student.matricule ? result.student : item));
    setPaymentCancellations(prev => [...prev, result.cancellation]);
    logEvent('Annulation Paiement', `${paymentId}: ${reason}`);
  };

  const createStudent = (input: StudentInput) => {
    const student = createRegisteredStudent(input, students, groups, activeRole);
    setStudents(previous => [...previous, student]);
    references.setGroups(previous => previous.map(group => group.id === student.groupId ? { ...group, studentIds: [...group.studentIds, student.matricule] } : group));
    logEvent('Création dossier Étudiant', JSON.stringify({ actor: activeRole, oldValue: null, newValue: student }));
  };

  const assignStudentToGroup = (studentId: string, groupId: string): { success: boolean; error?: string } => {
    if (!hasPermission(activeRole, 'student.group.assign')) return { success: false, error: "Seul un rôle académique autorisé peut affecter un étudiant à un groupe." };
    const student = students.find(item => item.matricule === studentId);
    const group = groups.find(item => item.id === groupId);
    if (!student || !group) return { success: false, error: 'Étudiant ou groupe introuvable.' };
    if (student.academicYearId !== group.academicYearId || student.niveau !== group.niveau || !group.filieres.includes(student.filiere)) {
      return { success: false, error: "Ce groupe ne correspond pas à l'année scolaire, au niveau ou à la filière de l'étudiant." };
    }
    setStudents(prev => prev.map(item => item.matricule === studentId
      ? { ...item, groupId: group.id, groupe: group.name, niveau: group.niveau }
      : item));
    references.setGroups(previous => previous.map(item => ({ ...item, studentIds: item.id === groupId ? [...item.studentIds.filter(id => id !== studentId), studentId] : item.studentIds.filter(id => id !== studentId) })));
    logEvent('Affectation Groupe', `${studentId}: ${student.groupId} → ${group.id}`);
    return { success: true };
  };

  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);

  const addReclamation = useCallback((studentMatricule: string, evaluationId: string, reason: string) => {
    const evaluation = evaluations.find(item => item.id === evaluationId && item.status === 'PUBLIEES');
    if (!access.scope.ownDataOnly || access.scope.studentId !== studentMatricule || !evaluation?.grades.some(item => item.matricule === studentMatricule)) throw new Error('Vous ne pouvez réclamer que sur vos propres notes publiées.');
    if (!reason.trim()) throw new Error('Motif obligatoire.');
    if (reclamations.some(item => item.studentMatricule === studentMatricule && item.evaluationId === evaluationId && item.status !== 'CLOTUREE')) throw new Error('Une réclamation est déjà en cours pour cette Évaluation.');
    const newId = `REC-${String(reclamations.length + 1).padStart(3, '0')}`;
    const newRec: Reclamation = {
      id: newId,
      studentMatricule,
      evaluationId,
      reason,
      status: 'NOUVELLE',
      response: '',
      history: [
        {
          id: `H-${Date.now()}`,
          date: new Date().toISOString(),
          actor: activeRole,
          role: activeRole,
          from: 'NOUVELLE',
          to: 'NOUVELLE',
          comment: 'Dépôt de la réclamation',
        },
      ],
    };
    setReclamations(prev => [newRec, ...prev]);
    logEvent('Dépôt Réclamation', `Nouvelle réclamation ${newId} par ${studentMatricule}`);
    setNotifications(prev => [{ id: Date.now(), text: `Nouvelle réclamation soumise (${newId}).` }, ...prev]);
  }, [reclamations, evaluations, access.scope.ownDataOnly, access.scope.studentId, activeRole, logEvent]);

  const updateStudentStatus = useCallback((matricule: string, newStatus: string, reason?: string) => {
    if (!hasPermission(activeRole, 'student.lifecycle.manage')) return;
    setStudents(prev => prev.map(s => {
      if (s.matricule !== matricule) return s;
      const historyText = `Statut modifié en "${newStatus}"${reason ? ` : ${reason}` : ''}`;
      return {
        ...s,
        status: newStatus,
        history: [{ date: new Date().toISOString().slice(0, 10), text: historyText }, ...s.history],
      };
    }));
    logEvent('Mise à jour statut Étudiant', `${matricule} -> ${newStatus} (${reason ?? 'Aucun motif'})`);
  }, [activeRole, logEvent]);

  const addAnnouncement = useCallback((title: string, content: string, audience: string) => {
    const newAnn = createAnnouncement(title, content, audience, activeRole, announcements);
    setAnnouncements(prev => [newAnn, ...prev]);
    logEvent('Publication Annonce', `Titre: "${title}" | Audience: ${audience}`);
    setNotifications(prev => [{ id: Date.now(), text: `Nouvelle annonce publiée : ${title}` }, ...prev]);
  }, [announcements, activeRole, logEvent]);

  const ticketAuthor = `${activeRole}:${demoIdentity || 'demo'}`;
  const openTicket = (title: string, description: string) => {
    const ticket = createSupportTicket(title, description, ticketAuthor, activeRole);
    setTickets(previous => [...previous, ticket]); logEvent('Ouverture support', ticket.id);
  };
  const changeTicket = (id: string, target: SupportTicket['status'], reason: string) => {
    const ticket = tickets.find(item => item.id === id);
    if (!ticket) throw new Error('Ticket introuvable.');
    const updated = transitionSupportTicket(ticket, target, reason, activeRole);
    setTickets(previous => previous.map(item => item.id === id ? updated : item)); logEvent('Traitement support', `${id}: ${ticket.status} → ${target}, ${reason}`);
  };
  const runBackup = () => {
    if (!hasPermission(activeRole, 'system.backup.manage')) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), systemLogs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'escen-journal.json'; anchor.click();
    URL.revokeObjectURL(url);
    logEvent('Export du journal', 'Instantané JSON téléchargé.');
    setNotifications(prev => [{ id: Date.now(), text: 'Journal technique exporté en JSON.' }, ...prev]);
  };

  const transitionReclamation = (id: string, target: Reclamation['status'], comment?: string, correctedGrade?: number) => {
    const reclamation = reclamations.find(item => item.id === id);
    if (!reclamation || !visibleReclamations.some(item => item.id === id)) return;
    const teacherStep = reclamation.status === 'TRANSMISE_ENSEIGNANT' && activeRole === ROLES.ENS;
    if (!teacherStep && !hasPermission(activeRole, 'complaint.review')) return;
    try {
      let updatedComplaint = transitionComplaint(reclamation, target, demoIdentity || activeRole, activeRole, comment);
      let updatedEvaluation: Evaluation | undefined;
      if (reclamation.status === 'CORRECTION_EVENTUELLE' && target === 'CLOTUREE') {
        const evaluation = evaluations.find(item => item.id === reclamation.evaluationId);
        const previousGrade = evaluation?.grades.find(grade => grade.matricule === reclamation.studentMatricule)?.value;
        if (!evaluation || previousGrade == null || correctedGrade === undefined || !comment?.trim()) throw new Error('Note et motif de correction obligatoires.');
        updatedEvaluation = correctPublishedGrade(evaluation, reclamation.studentMatricule, correctedGrade, { actor: demoIdentity || activeRole, role: activeRole, comment });
        updatedComplaint = { ...updatedComplaint, correction: { previousGrade, newGrade: correctedGrade, reason: comment, evaluationId: evaluation.id } };
      }
      if (updatedEvaluation) {
        const corrected = updatedEvaluation;
        setEvaluations(previous => previous.map(item => item.id === corrected.id ? corrected : item));
      }
      setReclamations(previous => previous.map(item => item.id === id ? updatedComplaint : item));
      logEvent('Transition Réclamation', JSON.stringify({ entity: id, oldValue: reclamation.status, newValue: target, reason: comment, correction: updatedComplaint.correction }));
    } catch (error) { alert(error instanceof Error ? error.message : 'Traitement impossible.'); }
  };

  const filteredEvals = visibleEvaluations.filter(e => e.classId === selectedClassForGrades?.id);

  return {
    // Role
    users: hasPermission(activeRole, 'user.manage') ? demoUsers.users : [], addUser: demoUsers.addUser, toggleUser: demoUsers.toggleUser,
    activeRole, perms, availableTabs, handleRoleChange, references, demoIdentity, setDemoIdentity, identityStudents: students,
    onboardingOpen, completeOnboarding, reopenOnboarding: () => setOnboardingOpen(true), navigateTo,
    // Navigation
    currentTab, currentSubTab, handleTabChange, setCurrentSubTab,
    // Search
    searchQuery, setSearchQuery,
    // Data
    students: visibleStudents, setStudents, classes: visibleClasses,
    evaluations: visibleEvaluations, setEvaluations,
    reclamations: visibleReclamations, systemLogs: hasPermission(activeRole, 'system.audit.view') ? systemLogs : [], announcements, setAnnouncements, notifications,
    rooms, groups, sessions: visibleSessions, setSessions,
    // UI State
    selectedStudent: selectedStudent ? visibleStudents.find(item => item.matricule === selectedStudent.matricule) ?? null : null, setSelectedStudent,
    selectedClassForGrades, setSelectedClassForGrades,
    newEvalName, setNewEvalName,
    newEvalType, setNewEvalType,
    paymentStudent, setPaymentStudent,
    paymentAmount, setPaymentAmount, paymentMethod, setPaymentMethod,
    payments: visiblePayments, receipts: visibleReceipts, paymentCancellations: visiblePaymentCancellations,
    filteredEvals,
    // Actions
    checkConflictsAndAddSession, addRoom, addBlockedPeriod, blockedPeriods, recordAttendance,
    addEvaluation, submitGrades, changeGradeStatus, updateGrade,
    createContract, recordPayment, cancelPayment, runBackup, transitionReclamation, assignStudentToGroup,
    addReclamation, updateStudentStatus, addAnnouncement, createStudent,
    tickets: hasPermission(activeRole, 'system.support.manage') ? tickets : tickets.filter(item => item.author === ticketAuthor), openTicket, changeTicket,
    logEvent,
  };
}

export type AppState = ReturnType<typeof useAppState>;
