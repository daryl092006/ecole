'use client';
import { isPhoneNumber } from '@/services/phoneNumberService';

import { getVisibleExamRecords, getVisibleExamAuditLogs, examTime } from '@/services/examQueryService';
import { useExamClock } from '@/hooks/useExamClock';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { setResolvedAcademicYearRequest } from '@/services/academicYearSelection';
import { useAcademicYearSelection } from '@/hooks/useAcademicYearSelection';
import { useHistoricalCampus } from '@/hooks/useHistoricalCampus';
import { useCampusRecords } from '@/hooks/useCampusRecords';
import { executeCampusWorkflow, deriveEnrollments, type CampusAction } from '@/services/campusWorkflowService';
import { emptyDataset, type Dataset } from '@/types/application';
import { createAnnouncement, getVisibleAnnouncements, withdrawAnnouncement as withdrawLocalAnnouncement } from '@/services/communicationService';
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
import type { RoleName, Permission } from '@/types/permissions';
import { usePathname, useRouter } from 'next/navigation';
import { getAvailableTabs, postLoginPath, isRouteAllowed } from '@/permissions/navigation';
import { getPortalRoute, MODULE_PATHS, HOME_PATH, studentPath } from '@/constants/portalRoutes';
import { ROLE_ACCESS, ROLE_PERMISSIONS } from '@/permissions/rolePermissions';
import { hasPermission } from '@/permissions/rolePermissions';
import { planSession, getSessionCandidateIds } from '@/services/scheduleService';
import { correctPublishedGrade, createEvaluation, enterGrade, transitionGradeWorkflow } from '@/services/gradeService';
import { transitionComplaint } from '@/services/complaintService';
import { cancelLocalPayment, recordLocalPayment } from '@/services/financeService';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RemoteRequestError, loadAccountSession, loadRelationalCampus, saveStudentProfile } from '@/services/remoteCampusService';
import { enrichHistoricalStudent } from '@/services/historyStudentService';
import { projectRelationalCampus } from '@/services/relationalCampusAdapter';
import type { RelationalSnapshot } from '@/types/persistence';

import { authenticationErrorMessage } from '@/services/authenticationService';

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

export const ROLE_COLORS: Record<string, string> = {
  [ROLES.DG]: '#ef4444', [ROLES.DGA]: '#f97316', [ROLES.DA]: '#10b981',
  [ROLES.LOG]: '#06b6d4', [ROLES.ENS]: '#3b82f6',
  [ROLES.RAF]: '#eab308', [ROLES.MKT]: '#8b5cf6', [ROLES.IT]: '#3b82f6',
  [ROLES.STUD]: '#64748b', [ROLES.DEL]: '#64748b',
  [ROLES.SURV]: '#0891b2', [ROLES.ACHATS]: '#d97706',
  [ROLES.CC]: '#0369a1', [ROLES.SITE]: '#0f766e', [ROLES.STG]: '#64748b',
};

// ─── hook ────────────────────────────────────────────────────────────────────

export function useAppState() {
  const router = useRouter();
  const pathname = usePathname();
  const route = getPortalRoute(pathname);
  const [session, setSession] = useState<{
    accountId: string; name: string; email: string; role: RoleName; availableRoles: RoleName[];
    studentId: string | null; teacherId: string | null; matricule: string | null; mustChangePassword: boolean;
    capabilities?: Partial<Record<RoleName, { permissions: Permission[]; globalAccess: boolean }>>;
  } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authReloadIndex, setAuthReloadIndex] = useState(0);
  const authVersion = useRef(0);
  const authenticatedUserId = useRef<string | null>(null);
  const authAction = useRef<'login' | 'logout' | 'cleanup' | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const retryAuthentication = () => setAuthReloadIndex(index => index + 1);
  const references = useAcademicReferenceStore();
  const [campusRecords, setCampusRecords] = useCampusRecords();
  const groups = references.groups;
  const [demoIdentity, setDemoIdentity] = useState('');
  const [activeRole, setActiveRole] = useState<RoleName>(ROLES.DG);
  const activeRoleRef = useRef(activeRole);
  activeRoleRef.current = activeRole;
  const currentTab = route?.tab || Object.entries(MODULE_PATHS).find(([, path]) => path === pathname)?.[0] || 'espace';
  const currentSubTab = route?.section || '';
  const academicYearChoice = useAcademicYearSelection(session?.accountId, activeRole);
  const academicYearSelection = academicYearChoice.selection;
  const [searchQuery, setSearchQuery] = useState('');
  const examNow = useExamClock((currentSubTab === 'acad_exams' || currentTab === 'espace')
    && campusRecords.exams.some(exam => exam.status !== 'ANNULE' && Date.now() < examTime(exam, 'end')));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    const version = ++authVersion.current;
    const current = () => !cancelled && authVersion.current === version;
    const recovery = () => window.location.pathname === '/mot-de-passe-reinitialiser';
    setAuthError('');
    if (!sessionRef.current && !recovery()) setAuthReady(false);
    const restoreSession = async () => {
      if (recovery()) { setAuthReady(true); return; }
      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getSession();
        if (error) throw error;
        if (!current()) return;
        if (!data.session) { authenticatedUserId.current = null; setSession(null); return; }
        authenticatedUserId.current = data.session.user.id;
        const profile = await loadAccountSession();
        if (!current()) return;
        if (!sessionRef.current || sessionRef.current.accountId !== profile.accountId || !profile.availableRoles.includes(activeRoleRef.current)) {
          setActiveRole(profile.role);
          setDemoIdentity(profile.role === ROLES.STUD || profile.role === ROLES.DEL ? profile.matricule || '' : profile.role === ROLES.ENS ? profile.teacherId || '' : '');
        }
        setSession(previous => JSON.stringify(previous) === JSON.stringify(profile) ? previous : profile);
        setHasLoggedOut(false);
        setAuthNotice('');
      } catch (error) {
        if (!current()) return;
        if (error instanceof RemoteRequestError && [401, 403].includes(error.status)) {
          authAction.current = 'cleanup';
          try { await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }); } catch { /* Server checks continue to deny this access. */ }
          finally { authAction.current = null; }
          if (current()) { setSession(null); setAuthNotice(error.message); }
        } else {
          setAuthError('Impossible de vérifier votre connexion pour le moment. Votre session enregistrée est conservée. Réessayez.');
        }
      } finally {
        if (current()) setAuthReady(true);
      }
    };
    try {
      const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event, authSession) => {
        if (cancelled) return;
        if (event === 'SIGNED_OUT') {
          const intentional = authAction.current === 'logout' || authAction.current === 'cleanup';
          if (!intentional) ++authVersion.current;
          authenticatedUserId.current = null;
          setSession(null); setAuthError(''); setAuthReady(true);
          if (!intentional && sessionRef.current && !window.location.pathname.startsWith('/mot-de-passe-')) {
            setHasLoggedOut(false);
            setAuthNotice('Votre session a pris fin. Reconnectez-vous pour continuer.');
          }
        } else if (event === 'SIGNED_IN' && authSession && !authAction.current && !recovery()) {
          const changedUser = !!authenticatedUserId.current && authenticatedUserId.current !== authSession.user.id;
          if (sessionRef.current && !changedUser) return;
          if (changedUser) { ++authVersion.current; setSession(null); setAuthReady(false); setAuthError(''); }
          // Never call Auth asynchronously inside its event callback: it holds an SDK lock.
          clearTimeout(timer);
          timer = setTimeout(() => { if (!cancelled) setAuthReloadIndex(index => index + 1); }, 0);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void restoreSession();
    } catch {
      setAuthError('Le service de connexion est indisponible. Réessayez ou contactez l’administration ESCEN.');
      setAuthReady(true);
    }
    return () => { cancelled = true; clearTimeout(timer); unsubscribe?.(); };
  }, [authReloadIndex]);

  // Data state
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const classes: ClassItem[] = [...initialClasses, ...references.assignments.flatMap(item => {
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
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);

  // UI state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassForGrades, setSelectedClassForGrades] = useState<ClassItem | null>(null);
  const [newEvalName, setNewEvalName] = useState('');
  const [newEvalType, setNewEvalType] = useState('Devoir');
  const [paymentStudent, setPaymentStudent] = useState(initialStudents[0]?.matricule ?? '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string }>>([]);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionOutcome, setActionOutcome] = useState<{ title: string; detail: string; href?: string; nextLabel?: string } | null>(null);
  const [campusRevision,setCampusRevision]=useState(0);
  const [relationalSnapshot, setRelationalSnapshot] = useState<RelationalSnapshot>({ revision: 0, tables: {} });
  const [campusLoad, setCampusLoad] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; error: string; students: number; users: number; enrollments: number }>({ status: 'idle', error: '', students: 0, users: 0, enrollments: 0 });
  const [reloadCampusIndex, setReloadCampusIndex] = useState(0);
  const preserveCampusScreen = useRef(false);
  const loadedCampusScope = useRef('');
  const reloadCampus = () => { preserveCampusScreen.current = false; setReloadCampusIndex(index => index + 1); };
  const refreshCampus = () => { preserveCampusScreen.current = true; setReloadCampusIndex(index => index + 1); };
  const history = useHistoricalCampus(activeRole, session?.accountId, session?.mustChangePassword || (!!session && (!session.capabilities?.[activeRole]?.globalAccess || !session.capabilities?.[activeRole]?.permissions.includes('system.audit.view'))), reloadCampusIndex, academicYearSelection + ':' + (relationalSnapshot.academicContext?.selectedYearId || ''));

  const capabilities = session?.capabilities?.[activeRole];
  const perms = session ? { ...ROLE_PERMISSIONS[activeRole], permissions: ROLE_PERMISSIONS[activeRole].permissions.filter(permission => capabilities?.permissions.includes(permission)) } : ROLE_PERMISSIONS[activeRole];
  const baseAccess = ROLE_ACCESS[activeRole];
  const identityStudent = students.find(item => item.matricule === demoIdentity);
  const access = { ...baseAccess, scope: baseAccess.scope.ownDataOnly
    ? { ...baseAccess.scope, studentId: identityStudent?.matricule ?? '__NONE__', groupIds: identityStudent ? [...new Set([identityStudent.groupId, ...campusRecords.enrollments.filter(item => item.studentId === identityStudent.matricule).map(item => item.groupId)])] : [] }
    : activeRole === ROLES.ENS ? { teacherId: demoIdentity || '__NONE__', groupIds: classes.filter(item => item.teacherId === demoIdentity).map(item => item.groupId) }
    : activeRole === ROLES.SURV ? { ...baseAccess.scope, sessionIds: campusRecords.exams.filter(item => item.supervisorId === demoIdentity).map(item => item.id) } : baseAccess.scope };
  const availableTabs = useMemo(() => getAvailableTabs(activeRole, session ? session.capabilities?.[activeRole]?.permissions || [] : undefined, session ? !!session.capabilities?.[activeRole]?.globalAccess : true), [activeRole, session]);

  const visibleClasses = !hasPermission(activeRole, 'academic.view') && !hasPermission(activeRole, 'grade.view') && !hasPermission(activeRole, 'attendance.view') && !hasPermission(activeRole, 'schedule.view') ? [] : access.scope.sessionIds
    ? classes.filter(classItem => sessions.some(session => session.classId === classItem.id && access.scope.sessionIds?.includes(session.id)))
    : access.scope.teacherId
    ? classes.filter(classItem => classItem.teacherId === access.scope.teacherId && (!access.scope.groupIds || access.scope.groupIds.includes(classItem.groupId)))
    : access.scope.groupIds
      ? classes.filter(classItem => access.scope.groupIds?.includes(classItem.groupId))
      : classes;
  const scopedSessions = !hasPermission(activeRole, 'schedule.view') ? [] : access.scope.sessionIds
    ? sessions.filter(session => access.scope.sessionIds?.includes(session.id))
    : access.scope.groupIds
      ? sessions.filter(session => access.scope.groupIds?.includes(session.groupId))
      : sessions;
  const visibleSessions = access.scope.ownDataOnly ? scopedSessions.map(session => ({
    ...session,
    candidateIds: session.candidateIds?.filter(id => id === demoIdentity),
    attendance: session.attendance ? Object.fromEntries(Object.entries(session.attendance).filter(([id]) => id === demoIdentity)) : undefined,
  })) : scopedSessions;
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
  const visiblePayments = !hasPermission(activeRole, 'finance.view') && !access.scope.ownDataOnly ? [] : access.scope.studentId
    ? payments.filter(payment => payment.studentId === access.scope.studentId)
    : payments;
  const visiblePaymentIds = new Set(visiblePayments.map(payment => payment.id));
  const visibleReceipts = receipts.filter(receipt => visiblePaymentIds.has(receipt.paymentId));
  const visiblePaymentCancellations = paymentCancellations.filter(cancellation => visiblePaymentIds.has(cancellation.paymentId));
  const scopedStudents = visibleStudents.map(student => history.catalog ? enrichHistoricalStudent(student, history.catalog) : student).map(student => hasPermission(activeRole, 'finance.view') || access.scope.ownDataOnly ? student : {
    ...student, financials: { expected: 0, paid: 0, remaining: 0, installments: [] }, bourse: { active: false, type: '', percent: 0, amount: 0 },
    history: student.history.filter(entry => !/financ|contrat|bourse|FCFA/i.test(entry.text)),
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  const logEvent = useCallback((action: string, details: string) => {
    const now = new Date().toISOString();
    setSystemLogs(prev => [{ date: now, user: activeRole + (demoIdentity ? ':' + demoIdentity : ':demo'), action, details }, ...prev]);
  }, [activeRole, demoIdentity]);

  const demoUsers = useDemoUsers(activeRole, logEvent, session?.email || activeRole);
  const { setAcademicYears, setPrograms, setTracks, setLevels, setSemesters, setUnits, setSubjects, setTeachers, setAssignments, setGroups } = references;
  const { setUsers } = demoUsers;
  const hydrateCampus = useCallback((projection: ReturnType<typeof projectRelationalCampus>, preserveSelection = false) => {
    const { data, users } = projection;
    setCampusRevision(projection.revision);
    setAcademicYears(data.academicYears); setPrograms(data.programs); setTracks(data.tracks); setLevels(data.levels);
    setSemesters(data.semesters); setUnits(data.units); setSubjects(data.subjects); setTeachers(data.teachers);
    setAssignments(data.assignments); setGroups(data.groups); setUsers(users);
    setStudents(data.students); setEvaluations(data.evaluations); setReclamations(data.reclamations);
    setRooms(data.rooms); setSessions(data.sessions); setBlockedPeriods(data.blockedPeriods); setTickets(data.tickets);
    setFees(data.fees); setPayments(data.payments); setReceipts(data.receipts); setPaymentCancellations(data.paymentCancellations);
    setAnnouncements(data.announcements); setSystemLogs([]);
    setCampusRecords({ settings: data.settings, enrollments: data.enrollments, juryDecisions: data.juryDecisions,
      exams: data.exams, examPapers: data.examPapers, examAttempts: data.examAttempts, staff: data.staff,
      purchases: data.purchases, assets: data.assets, documents: data.documents });
    if (!preserveSelection) { setSelectedStudent(null); setSelectedClassForGrades(null); }
  }, [setAcademicYears, setPrograms, setTracks, setLevels, setSemesters, setUnits, setSubjects, setTeachers, setAssignments, setGroups, setUsers, setCampusRecords]);

  const accountId = session?.accountId;
  const mustChangePassword = session?.mustChangePassword;
  useEffect(() => {
    const controller = new AbortController();
    const scope = `${accountId}:${activeRole}:${academicYearSelection}`;
    const preserve = preserveCampusScreen.current && loadedCampusScope.current === scope;
    preserveCampusScreen.current = false;
    loadedCampusScope.current = scope;
    if (!preserve) { hydrateCampus(projectRelationalCampus({ revision: 0, tables: {} })); setRelationalSnapshot({ revision: 0, tables: {} }); }
    if (!accountId || mustChangePassword) {
      setCampusLoad({ status: 'idle', error: '', students: 0, users: 0, enrollments: 0 });
      return () => controller.abort();
    }
    if (!preserve) setCampusLoad({ status: 'loading', error: '', students: 0, users: 0, enrollments: 0 });
    void loadRelationalCampus(activeRole, controller.signal).then(snapshot => {
      if (controller.signal.aborted) return;
      setResolvedAcademicYearRequest(snapshot.academicContext?.selectedYearId || null);
      const projection = projectRelationalCampus(snapshot);
      setRelationalSnapshot(snapshot);
      hydrateCampus(projection, preserve);
      setCampusLoad({ status: 'ready', error: '', students: projection.data.students.length, users: projection.users.length, enrollments: projection.data.enrollments.length });
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof RemoteRequestError && error.status === 401) {
        ++authVersion.current;
        setSession(null); setAuthReady(true); setHasLoggedOut(false);
        setAuthNotice('Votre session a expiré. Reconnectez-vous pour continuer.');
        void getSupabaseBrowserClient().auth.signOut({ scope: 'local' }).catch(() => { /* The expired access is already blocked. */ });
        return;
      }
      const message = error instanceof Error ? error.message : 'Chargement des dossiers impossible.';
      if (preserve) setActionFeedback(message);
      else setCampusLoad({ status: 'error', error: message, students: 0, users: 0, enrollments: 0 });
    });
    return () => controller.abort();
  }, [accountId, mustChangePassword, activeRole, reloadCampusIndex, academicYearSelection, hydrateCampus]);


  const navigateTo = useCallback((tabId: string, subTabId?: string) => {
    const tab = getAvailableTabs(activeRole, session ? session.capabilities?.[activeRole]?.permissions || [] : undefined, session ? !!session.capabilities?.[activeRole]?.globalAccess : true).find(item => item.id === tabId);
    if (!tab) return;
    if (!subTabId) { router.push(tab.href); return; }
    const section = tab.subTabs?.find(item => item.id === subTabId) || tab.subTabs?.[0];
    if (section) router.push(section.href);
  }, [activeRole, router, session]);
  const handleTabChange = (tabId: string) => navigateTo(tabId);
  const setCurrentSubTab = (sectionId: string) => navigateTo(currentTab, sectionId);
  const handleRoleChange = (role: RoleName) => {
    if (!session?.availableRoles.includes(role)) return;
    setActionOutcome(null);
    setActiveRole(role);
    setDemoIdentity(role === ROLES.STUD || role === ROLES.DEL ? session.matricule || '' : role === ROLES.ENS ? session.teacherId || '' : ''); setSearchQuery(''); setNotifications([]); setActionFeedback('');
    setPaymentStudent(''); setPaymentAmount(''); setPaymentMethod('VIREMENT');
    setNewEvalName(''); setNewEvalType('Devoir'); setSelectedStudent(null); setSelectedClassForGrades(null);
    if (route && !isRouteAllowed(pathname, role)) router.replace(HOME_PATH);
  };
  const login = async (email: string, password: string, requested?: string) => {
    if (authAction.current) throw new Error('Une opération de connexion est déjà en cours. Patientez.');
    authAction.current = 'login';
    const version = ++authVersion.current;
    let authenticated = false;
    setAuthError(''); setAuthNotice('');
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.session) throw new Error(authenticationErrorMessage(error));
      authenticated = true;
      authenticatedUserId.current = data.session.user.id;
      const profile = await loadAccountSession();
      if (authVersion.current !== version) throw new Error('La connexion a été interrompue. Réessayez.');
      setSession(profile); setHasLoggedOut(false); setAuthReady(true); setActiveRole(profile.role);
      setDemoIdentity(profile.role === ROLES.STUD || profile.role === ROLES.DEL ? profile.matricule || '' : profile.role === ROLES.ENS ? profile.teacherId || '' : '');
      setSelectedStudent(null); setSelectedClassForGrades(null); setActionFeedback('');
      router.replace(profile.mustChangePassword ? '/mot-de-passe-modifier' : postLoginPath(requested, profile.role));
    } catch (error) {
      if (authenticated) {
        if ((error instanceof RemoteRequestError && error.status >= 500) || (error instanceof Error && ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name))) {
          setAuthError('Vos identifiants ont été acceptés, mais la vérification de votre accès est indisponible. Réessayez.');
          setAuthReady(true);
        } else {
          authAction.current = 'cleanup';
          try { await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }); } catch { /* The server still denies access. */ }
        }
      }
      throw error;
    } finally { authAction.current = null; }
  };
  const logout = async () => {
    if (authAction.current === 'logout') return;
    authAction.current = 'logout'; ++authVersion.current;
    setAuthReady(false); setSession(null); setAuthError(''); setAuthNotice('');
    setActionOutcome(null); setHasLoggedOut(true); setDemoIdentity(''); setSelectedStudent(null); setSelectedClassForGrades(null);
    setSearchQuery(''); setNotifications([]); setActionFeedback('');
    try { await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }); }
    finally { authAction.current = null; setAuthReady(true); router.replace('/connexion'); }
  };
  const requestAccessHelp = (email: string) => {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Adresse email invalide.');
    const ticket = createSupportTicket('Demande d’aide à la connexion', `Adresse indiquée : ${address}. Demande de récupération d’accès depuis la page de connexion.`, 'Connexion:' + address, ROLES.STG);
    setTickets(previous => [...previous, ticket]);
    setSystemLogs(previous => [{ date: new Date().toISOString(), user: 'Connexion:' + address, action: 'Demande d’accès de démonstration', details: ticket.id }, ...previous]);
  };
  const navigateToStudent = (studentId: string) => {
    if (hasPermission(activeRole, 'student.view') && students.some(student => student.matricule === studentId)) router.push(studentPath(studentId));
  };

  // Ajout de cours avec détection automatique des conflits
  const checkConflictsAndAddSession = (
    classId: string,
    roomCode: string,
    date: string,
    startTime: string,
    endTime: string
  ): { success: boolean; error?: string } => {
    if (session) return { success: false, error: 'La planification connectée n’est pas activée. Aucune séance n’a été créée.' };
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
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'schedule.create')) throw new Error('Permission insuffisante.');
    if (!room.code.trim() || !room.name.trim() || !Number.isInteger(room.capacity) || room.capacity < 1) throw new Error('Code, nom et capacité entière positive obligatoires.');
    if (rooms.some(item => item.code.toLowerCase() === room.code.toLowerCase())) throw new Error('Code salle déjà utilisé.');
    setRooms(previous => [...previous, room]); logEvent('Création salle', JSON.stringify({ oldValue: null, newValue: room }));
  };
  const addBlockedPeriod = (label: string, startDate: string, endDate: string) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'schedule.create')) throw new Error('Permission insuffisante.');
    if (!label.trim() || !startDate || !endDate || startDate > endDate) throw new Error('Libellé et dates valides obligatoires.');
    if (sessions.some(item => item.status !== 'Annulé' && item.date >= startDate && item.date <= endDate)) throw new Error('Des séances existent sur cette période. Traitez-les avant de bloquer les dates.');
    const period: BlockedPeriod = { id: `BLOCK-${Date.now()}`, label: label.trim(), startDate, endDate, type: 'AUTRE' };
    setBlockedPeriods(previous => [...previous, period]); logEvent('Blocage période', JSON.stringify({ oldValue: null, newValue: period }));
  };
  const recordAttendance = (sessionId: string, attendance: NonNullable<Session['attendance']>) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'attendance.record') || !visibleSessions.some(item => item.id === sessionId)) throw new Error('Séance non autorisée.');
    const plannedSession = sessions.find(item => item.id === sessionId);
    if (!plannedSession || plannedSession.status === 'Annulé') throw new Error('Séance indisponible.');
    const members = getSessionCandidateIds(plannedSession, students);
    if (Object.keys(attendance).some(id => !members.includes(id)) || Object.values(attendance).some(value => !['Présent', 'Absent', 'Retard', 'Absent justifié'].includes(value))) throw new Error('Feuille de présence invalide.');
    setSessions(previous => previous.map(item => item.id === sessionId ? { ...item, attendance: { ...attendance } } : item));
    logEvent('Enregistrement présences', JSON.stringify({ entity: sessionId, oldValue: plannedSession.attendance, newValue: attendance }));
  };

  const addEvaluation = () => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'evaluation.create')) return;
    if (!newEvalName.trim() || !selectedClassForGrades || !visibleClasses.some(item => item.id === selectedClassForGrades.id)) return;
    const assignment = references.assignments.find(item => item.id === selectedClassForGrades.id);
    if (!assignment?.active || !references.academicYears.some(year => year.id === assignment.academicYearId && year.status === 'OUVERTE')) { setActionFeedback('Choisissez un enseignement actif d’une année ouverte.'); return; }
    if (!students.some(item => item.groupId === selectedClassForGrades.groupId)) { setActionFeedback('Aucun étudiant inscrit dans ce groupe.'); return; }
    const ev = createEvaluation({
      id: `EV-${String(evaluations.length + 1).padStart(3, '0')}`,
      classId: selectedClassForGrades.id,
      type: newEvalType,
      name: newEvalName,
      date: new Date().toISOString().slice(0, 10),
      grades: students.filter(s => s.groupId === selectedClassForGrades.groupId).map(s => ({ matricule: s.matricule, value: null })),
    }, activeRole, selectedClassForGrades.teacherId, demoIdentity);
    setEvaluations(prev => [...prev, ev]);
    setActionFeedback('');
    setNewEvalName('');
    logEvent('Création Évaluation', `${ev.name} – ${selectedClassForGrades.name}`);
  };

  const submitGrades = (ev: Evaluation) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'grade.submit') || !visibleEvaluations.some(item => item.id === ev.id)) return;
    const current = evaluations.find(item => item.id === ev.id);
    if (!current) return;
    try {
      const context = { actor: demoIdentity || activeRole, role: activeRole, teacherId: classes.find(item => item.id === current.classId)?.teacherId };
      const entered = current.status === 'BROUILLON' ? transitionGradeWorkflow(current, 'SAISIES', context) : current;
      const submitted = transitionGradeWorkflow(entered, 'SOUMISES', context);
      setEvaluations(prev => prev.map(item => item.id === ev.id ? submitted : item));
      setActionFeedback('');
      logEvent('Soumission Notes', ev.name);
    } catch (error) { setActionFeedback(error instanceof Error ? error.message : 'Soumission impossible.'); }
  };

  const changeGradeStatus = (ev: Evaluation, target: Evaluation['status'], comment?: string) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    const requiredPermission = target === 'A_CONTROLER' || target === 'SAISIES'
      ? 'grade.review' : target === 'VALIDEES' ? 'grade.approve' : 'grade.publish';
    if (!hasPermission(activeRole, requiredPermission) || !visibleEvaluations.some(item => item.id === ev.id)) return false;
    const current = evaluations.find(item => item.id === ev.id);
    if (!current) return false;
    try {
      const updated = transitionGradeWorkflow(current, target, { actor: demoIdentity || activeRole, role: activeRole, comment });
      setEvaluations(previous => previous.map(item => item.id === ev.id ? updated : item));
      setActionFeedback('');
      logEvent('Transition Notes', JSON.stringify({ entity: ev.id, oldValue: current.status, newValue: target, reason: comment }));
      return true;
    } catch (error) { setActionFeedback(error instanceof Error ? error.message : 'Transition impossible.'); return false; }
  };

  const updateGrade = (evaluationId: string, gradeIndex: number, value: number | null) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'grade.enter') || !visibleEvaluations.some(item => item.id === evaluationId)) return;
    const current = evaluations.find(item => item.id === evaluationId);
    if (!current) return;
    try {
      const updated = enterGrade(current, gradeIndex, value, activeRole, classes.find(item => item.id === current.classId)?.teacherId ?? '', demoIdentity);
      setEvaluations(previous => previous.map(item => item.id === evaluationId ? updated : item));
      setActionFeedback('');
      logEvent('Saisie note', JSON.stringify({ entity: evaluationId, studentId: current.grades[gradeIndex].matricule, oldValue: current.grades[gradeIndex].value, newValue: value }));
    } catch (error) { setActionFeedback(error instanceof Error ? error.message : 'Saisie impossible.'); }
  };

  const createContract = (studentId: string, amount: number, dates: string[]) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    const student = students.find(item => item.matricule === studentId);
    if (!student) throw new Error('Étudiant introuvable.');
    const result = createFinancialContract(student, amount, dates, activeRole);
    setStudents(previous => previous.map(item => item.matricule === studentId ? result.student : item));
    setFees(previous => [...previous, result.fee]);
    logEvent('Contrat financier', JSON.stringify({ entity: studentId, oldValue: student.financials, newValue: result.student.financials }));
  };

  const recordPayment = () => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
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
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
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
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    const group = groups.find(item => item.id === input.groupId);
    if (!group || !references.academicYears.some(year => year.id === group.academicYearId && year.status === 'OUVERTE')) throw new Error('Choisissez un groupe d’une année ouverte.');
    const student = createRegisteredStudent(input, students, groups, activeRole);
    setStudents(previous => [...previous, student]);
    references.setGroups(previous => previous.map(group => group.id === student.groupId ? { ...group, studentIds: [...group.studentIds, student.matricule] } : group));
    logEvent('Création dossier Étudiant', JSON.stringify({ actor: activeRole, oldValue: null, newValue: student }));
  };
  const renameGroup = (groupId: string, name: string) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    if (!hasPermission(activeRole, 'academic.group.manage')) throw new Error('Modification de groupe non autorisée.');
    const group = groups.find(item => item.id === groupId); if (!group || !name.trim()) throw new Error('Nom du groupe obligatoire.');
    if (!references.academicYears.some(year => year.id === group.academicYearId && year.status === 'OUVERTE')) throw new Error('La modification nécessite une année ouverte.');
    if (groups.some(item => item.id !== group.id && item.academicYearId === group.academicYearId && item.levelId === group.levelId && item.name.toLocaleLowerCase('fr') === name.trim().toLocaleLowerCase('fr'))) throw new Error('Ce nom de groupe existe déjà pour ce niveau et cette année.');
    const updated = { ...group, name: name.trim() };
    references.setGroups(previous => previous.map(item => item.id === groupId ? updated : item));
    setStudents(previous => previous.map(item => item.groupId === groupId ? { ...item, groupe: updated.name } : item));
    logEvent('Renommage groupe', JSON.stringify({ entity: groupId, oldValue: group.name, newValue: updated.name }));
  };
  const updateStudentProfile = async (studentId: string, input: Pick<Student, 'firstname' | 'lastname' | 'email' | 'phone' | 'gender' | 'birthDate' | 'nationality' | 'address' | 'city' | 'country'>, expectedRevision?: number) => {
    if (!hasPermission(activeRole, 'student.update')) throw new Error('Modification du dossier non autorisée.');
    if (session) { await saveStudentProfile(studentId, input, activeRole, expectedRevision ?? campusRevision); refreshCampus(); return; }
    if (!input.firstname.trim() || !input.lastname.trim()) throw new Error('Prénom et nom obligatoires.');
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Email invalide.');
    if (!isPhoneNumber(input.phone)) throw new Error('Numéro de téléphone invalide.');
    if (input.birthDate && (Number.isNaN(Date.parse(input.birthDate)) || input.birthDate > new Date().toISOString().slice(0, 10))) throw new Error('Date de naissance invalide.');
    const student = students.find(item => item.matricule === studentId); if (!student) throw new Error('Dossier introuvable.');
    const updated = { ...student, ...input, firstname: input.firstname.trim(), lastname: input.lastname.trim(), history: [...student.history, { date: new Date().toISOString(), text: `Informations civiles mises à jour par ${activeRole}.` }] };
    setStudents(previous => previous.map(item => item.matricule === studentId ? updated : item));
    logEvent('Modification dossier étudiant', JSON.stringify({ entity: studentId, oldValue: student, newValue: updated }));
  };

  const assignStudentToGroup = (studentId: string, groupId: string): { success: boolean; error?: string } => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
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
    references.setGroups(previous => previous.map(item => item.academicYearId !== student.academicYearId ? item : ({ ...item, studentIds: item.id === groupId ? [...item.studentIds.filter(id => id !== studentId), studentId] : item.studentIds.filter(id => id !== studentId) })));
    logEvent('Affectation Groupe', `${studentId}: ${student.groupId} → ${group.id}`);
    return { success: true };
  };


  const addReclamation = useCallback((studentMatricule: string, evaluationId: string, reason: string) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
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
  }, [reclamations, evaluations, access.scope.ownDataOnly, access.scope.studentId, activeRole, logEvent, session]);

  const updateStudentStatus = useCallback((matricule: string, newStatus: string, reason?: string) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
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
  }, [activeRole, logEvent, session]);

  const addAnnouncement = useCallback((title: string, content: string, audience: string, expiresOn = '') => {
    if (session) throw new Error('La diffusion des annonces en base n’est pas encore disponible. Aucune annonce n’a été enregistrée.');
    const newAnn = createAnnouncement(title, content, audience, activeRole, announcements, expiresOn, activeRole);
    setAnnouncements(prev => [newAnn, ...prev]);
    logEvent('Publication Annonce', JSON.stringify({ entity: newAnn.id, oldValue: null, newValue: newAnn }));
    setNotifications(prev => [{ id: Date.now(), text: `Nouvelle annonce publiée : ${title}` }, ...prev]);
  }, [announcements, activeRole, logEvent, session]);

  const withdrawAnnouncement = (id: string, reason: string) => {
    if (session) throw new Error('Le retrait des annonces en base n’est pas encore disponible. Aucune annonce n’a été modifiée.');
    const announcement = announcements.find(item => item.id === id);
    if (!announcement) throw new Error('Annonce introuvable.');
    const updated = withdrawLocalAnnouncement(announcement, reason, activeRole, activeRole);
    setAnnouncements(previous => previous.map(item => item.id === id ? updated : item));
    logEvent('Retrait Annonce', JSON.stringify({ entity: id, oldValue: announcement, newValue: updated, reason }));
  };

  const ticketAuthor = `${activeRole}:${demoIdentity || 'demo'}`;
  const openTicket = (title: string, description: string) => {
    if (session) throw new Error('L’enregistrement des tickets en base n’est pas encore disponible. Aucune demande n’a été enregistrée.');
    const ticket = createSupportTicket(title, description, ticketAuthor, activeRole);
    setTickets(previous => [...previous, ticket]); logEvent('Ouverture support', ticket.id);
  };
  const changeTicket = (id: string, target: SupportTicket['status'], reason: string) => {
    if (session) throw new Error('Le traitement des tickets en base n’est pas encore disponible. Aucune demande n’a été modifiée.');
    const ticket = tickets.find(item => item.id === id);
    if (!ticket) throw new Error('Ticket introuvable.');
    const updated = transitionSupportTicket(ticket, target, reason, activeRole, ticketAuthor);
    setTickets(previous => previous.map(item => item.id === id ? updated : item)); logEvent('Traitement support', `${id}: ${ticket.status} → ${target}, ${reason}`);
  };
  const runBackup = () => {
    if (!hasPermission(activeRole, 'system.backup.manage')) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), systemLogs: getVisibleExamAuditLogs(systemLogs, activeRole) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'escen-journal.json'; anchor.click();
    URL.revokeObjectURL(url);
    logEvent('Export du journal', 'Instantané JSON téléchargé.');
    setNotifications(prev => [{ id: Date.now(), text: 'Journal technique exporté en JSON.' }, ...prev]);
  };

  const transitionReclamation = (id: string, target: Reclamation['status'], comment?: string, correctedGrade?: number) => {
    if (session) throw new Error('Cette opération de démonstration ne peut pas modifier un dossier connecté. Utilisez les actions disponibles dans le parcours métier.');
    const reclamation = reclamations.find(item => item.id === id);
    if (!reclamation || !visibleReclamations.some(item => item.id === id)) return false;
    const teacherStep = reclamation.status === 'TRANSMISE_ENSEIGNANT' && activeRole === ROLES.ENS;
    if (!teacherStep && !hasPermission(activeRole, 'complaint.review')) return false;
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
      setActionFeedback('');
      logEvent('Transition Réclamation', JSON.stringify({ entity: id, oldValue: reclamation.status, newValue: target, reason: comment, correction: updatedComplaint.correction }));
      return true;
    } catch (error) { setActionFeedback(error instanceof Error ? error.message : 'Traitement impossible.'); return false; }
  };

  const filteredEvals = visibleEvaluations.filter(e => e.classId === selectedClassForGrades?.id);

  const dataset: Dataset = {
    ...emptyDataset(), ...campusRecords,
    academicYears: references.academicYears, programs: references.programs, tracks: references.tracks,
    levels: references.levels, semesters: references.semesters, units: references.units, subjects: references.subjects,
    teachers: references.teachers, assignments: references.assignments, groups,
    students, evaluations, reclamations, rooms, sessions, blockedPeriods, tickets, fees, payments, receipts, paymentCancellations, announcements,
  };
  const runWorkflow = (action: CampusAction, payload: unknown) => {
    if (session) throw new Error('Utilisez le formulaire de gestion connecté à la base. Cette ancienne commande de démonstration ne peut pas enregistrer une opération réelle.');
    const result = executeCampusWorkflow(dataset, { role: activeRole, actor: demoIdentity || activeRole, users: demoUsers.users }, action, payload);
    const next = result.data;
    setCampusRecords({ settings: next.settings, enrollments: next.enrollments, juryDecisions: next.juryDecisions, exams: next.exams, examPapers: next.examPapers, examAttempts: next.examAttempts, staff: next.staff, purchases: next.purchases, assets: next.assets, documents: next.documents });
    setEvaluations(next.evaluations); setStudents(next.students); setSessions(next.sessions); setFees(next.fees); setPayments(next.payments); setReceipts(next.receipts); setPaymentCancellations(next.paymentCancellations);
    references.setGroups(next.groups);
    for (const event of result.audit) logEvent(action, JSON.stringify(event));
  };
  const ownData = !!access.scope.ownDataOnly;
  const canFinance = hasPermission(activeRole, 'finance.view');
  const canAcademic = hasPermission(activeRole, 'academic.view') || hasPermission(activeRole, 'grade.view');
  const enrollmentIds = new Set(visibleStudents.map(item => item.matricule));
  const campusData: Dataset = {
    ...emptyDataset(),
    ...((canAcademic || canFinance) ? { academicYears: dataset.academicYears, programs: dataset.programs, tracks: dataset.tracks, levels: dataset.levels, semesters: dataset.semesters, units: dataset.units, subjects: dataset.subjects, assignments: dataset.assignments, teachers: dataset.teachers } : { academicYears: dataset.academicYears }),
    settings: campusRecords.settings, students: scopedStudents, groups, evaluations: visibleEvaluations, sessions: visibleSessions, rooms, blockedPeriods, announcements: getVisibleAnnouncements(announcements, activeRole),
    payments: visiblePayments, receipts: visibleReceipts, paymentCancellations: visiblePaymentCancellations, fees: canFinance ? fees : [],
    enrollments: (campusLoad.status === 'ready' ? dataset.enrollments : deriveEnrollments(dataset)).filter(item => enrollmentIds.has(item.studentId)).map(item => canFinance || ownData ? item : { ...item, financials: { expected: 0, paid: 0, remaining: 0, installments: [] } }),
    juryDecisions: campusRecords.juryDecisions.filter(item => ownData ? item.studentId === demoIdentity : hasPermission(activeRole, 'grade.view') && activeRole !== ROLES.ENS),
    ...getVisibleExamRecords(dataset, activeRole, demoIdentity, examNow),
    staff: hasPermission(activeRole, 'staff.view') ? campusRecords.staff : [],
    purchases: hasPermission(activeRole, 'purchase.view') ? campusRecords.purchases : [], assets: hasPermission(activeRole, 'asset.view') ? campusRecords.assets : [],
    documents: campusRecords.documents.filter(item => enrollmentIds.has(item.studentId) && (hasPermission(activeRole, 'student.view') || ownData)),
  };
  const visibleAnnouncements = getVisibleAnnouncements(announcements, activeRole);
  const uiReferences = { ...references, setPrograms: (update: Parameters<typeof references.setPrograms>[0]) => {
    if (!hasPermission(activeRole, 'academic.structure.manage')) throw new Error('Modification des filières non autorisée.');
    const next = typeof update === 'function' ? update(references.programs) : update;
    const renamed = next.flatMap(item => { const old = references.programs.find(program => program.id === item.id); return old && old.name !== item.name ? [{ id: item.id, oldName: old.name, newName: item.name }] : []; });
    references.setPrograms(next);
    if (renamed.length) {
      references.setGroups(previous => previous.map(group => ({ ...group, filieres: group.filieres.map(name => renamed.find(change => change.oldName === name && group.programIds.includes(change.id))?.newName || name) })));
      setStudents(previous => previous.map(student => ({ ...student, filiere: renamed.find(change => change.oldName === student.filiere)?.newName || student.filiere })));
    }
    for (const item of next) { const old = references.programs.find(program => program.id === item.id); if (JSON.stringify(old) !== JSON.stringify(item)) logEvent('Référentiel filière', JSON.stringify({ entity: item.id, oldValue: old || null, newValue: item })); }
  } };

  return {
    // Role
    refreshCampus, academicYearSelection, changeAcademicYearSelection: academicYearChoice.change, academicYearContext: relationalSnapshot.academicContext,
    session, authReady, authError, authNotice, retryAuthentication, hasLoggedOut, campusLoad, campusRevision, relationalSnapshot, history, reloadCampus, login, logout, pathname, navigateToStudent, requestAccessHelp,
    globalAccess: !session || capabilities?.globalAccess === true,
    actionFeedback, clearActionFeedback: () => setActionFeedback(''),
    actionOutcome, reportActionOutcome: setActionOutcome, clearActionOutcome: () => setActionOutcome(null),
    campus: { data: campusData, runWorkflow, supervisors: [ROLES.DA, ROLES.LOG, ROLES.IT].includes(activeRole as typeof ROLES.DA) ? demoUsers.users.filter(item => (item.roles?.includes(ROLES.SURV) || item.role === ROLES.SURV) && item.active).map(item => ({ id: item.id, name: item.name })) : [] },
    identitySupervisors: demoUsers.users.filter(item => (item.roles?.includes(ROLES.SURV) || item.role === ROLES.SURV) && item.active),
    users: hasPermission(activeRole, 'user.manage') ? demoUsers.users : [], addUser: demoUsers.addUser, toggleUser: demoUsers.toggleUser, changeUserRole: demoUsers.changeUserRole,
    examNow, activeRole, perms, availableTabs, handleRoleChange, references: uiReferences, demoIdentity, setDemoIdentity, identityStudents: students,
    navigateTo,
    // Navigation
    currentTab, currentSubTab, handleTabChange, setCurrentSubTab,
    // Search
    searchQuery, setSearchQuery,
    // Data
    students: scopedStudents, setStudents, classes: visibleClasses,
    evaluations: visibleEvaluations, setEvaluations,
    reclamations: visibleReclamations, systemLogs: getVisibleExamAuditLogs(systemLogs, activeRole), announcements: visibleAnnouncements, notifications,
    rooms, groups, sessions: visibleSessions, setSessions,
    // UI State
    selectedStudent: selectedStudent ? scopedStudents.find(item => item.matricule === selectedStudent.matricule) ?? null : null, setSelectedStudent,
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
    addReclamation, updateStudentStatus, addAnnouncement, withdrawAnnouncement, createStudent, updateStudentProfile, renameGroup,
    tickets: hasPermission(activeRole, 'system.support.manage') ? tickets : tickets.filter(item => item.author === ticketAuthor), openTicket, changeTicket,
    logEvent,
  };
}

export type AppState = ReturnType<typeof useAppState>;
