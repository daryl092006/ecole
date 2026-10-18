'use client';
import ReenrollmentWorkspace from '@/components/modules/ReenrollmentWorkspace';
import AnnualFeesWorkspace from '@/components/modules/AnnualFeesWorkspace';
import FinanceOverview from '@/components/modules/FinanceOverview';
import AuditJournalPanel from '@/components/modules/AuditJournalPanel';
import HistoricalWorkspace, { HISTORY_SECTIONS } from '@/components/modules/history/HistoricalWorkspace';
import PersonnelDossiers from '@/components/modules/personnel/PersonnelDossiers';
import TeachersWorkspace from '@/components/modules/personnel/TeachersWorkspace';
import ScheduleWorkspace from '@/components/modules/academic/ScheduleWorkspace';
import AttendanceWorkspace from '@/components/modules/academic/AttendanceWorkspace';
import HistoricalExamsWorkspace from '@/components/modules/history/HistoricalExamsWorkspace';
import ReferenceCrudWorkspace from '@/components/modules/academic/ReferenceCrudWorkspace';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import NativeAssessmentWorkspace from '@/components/modules/academic/NativeAssessmentWorkspace';
import SubjectStudio from '@/components/modules/academic/SubjectStudio';
import ComplaintsPanel from '@/components/modules/academic/ComplaintsPanel';
import { ROLES } from '@/types/permissions';
import StudentExamsWorkspace from '@/components/modules/academic/StudentExamsWorkspace';
import WorkspaceHome from '@/components/modules/WorkspaceHome';
import UserDirectoryPanel from '@/components/modules/personnel/UserDirectoryPanel';
import { usePortal } from '@/hooks/usePortal';
import RoleGuard from '@/components/ui/RoleGuard';
import EtudiantsModule from '@/components/modules/EtudiantsModule';
import PersonnelModule from '@/components/modules/PersonnelModule';
import OnlineAdmissionsPanel from '@/components/modules/website/OnlineAdmissionsPanel';
import WebsiteBrochuresPanel from '@/components/modules/website/WebsiteBrochuresPanel';
import WebsiteArticlesPanel from '@/components/modules/website/WebsiteArticlesPanel';
import ConnectedDomainWorkspace from '@/components/modules/ConnectedDomainWorkspace';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';

export default function PortalScreen({ tab: _tab, section }: { tab: string; section: string }) {
  const state = usePortal();
  const { activeRole, perms } = state;
  const currentSubTab = section;

  if (state.session && section === 'espace_exams') return <StudentExamsWorkspace />;
  if (state.session && section === 'sys_logs') return <AuditJournalPanel />;
  if (state.session && section === 'sys_backups') return <AuditJournalPanel exportMode />;
  if (state.session && section === 'acad_complaints' && perms.permissions.includes('complaint.view') && (
    perms.permissions.includes('complaint.review')
    || [ROLES.STUD, ROLES.DEL, ROLES.ENS].includes(activeRole as typeof ROLES.STUD)
  )) return <ComplaintsPanel />;
  if (state.session && section === 'stud_status') return <ReenrollmentWorkspace />;
  if (state.session && section === 'fin_contracts') return <AnnualFeesWorkspace />;
  if (state.session && section === 'fin_kpis') return <FinanceOverview />;
  if (state.session && section === 'web_applications') return <OnlineAdmissionsPanel mode="applications" />;
  if (state.session && section === 'web_documents') return <OnlineAdmissionsPanel mode="configuration" />;
  if (state.session && section === 'web_brochures') return <WebsiteBrochuresPanel />;
  if (state.session && section === 'comm_news') return <WebsiteArticlesPanel />;
  if (state.session && (section === 'espace_dashboard' || section === 'dashboard_kpis' || section === 'dashboard_reports')) {
    return <WorkspaceHome mode={section === 'dashboard_kpis' ? 'overview' : section === 'dashboard_reports' ? 'reports' : 'home'} />;
  }
  if (state.session && section === 'acad_settings') {
    return (
      <section className="card">
        <div className="page-intro">
          <div>
            <span className="page-eyebrow">RÈGLEMENT ACADÉMIQUE</span>
            <h1>Règles académiques à confirmer</h1>
            <p>Les règles de compensation, de validation et de délibération doivent être confirmées par la direction académique avant leur application. Aucune règle n’est appliquée automatiquement aux dossiers historiques.</p>
          </div>
        </div>
        <p>Préparez la version approuvée du règlement et ses dates d’application. L’enregistrement et l’activation de cette version ne sont pas encore disponibles dans cet écran.</p>
      </section>
    );
  }
  if (state.session && section === 'staff_records') return <PersonnelDossiers />;
  if (state.session && section === 'staff_teachers') return <TeachersWorkspace />;
  if (state.session && section === 'acad_schedule') return <ScheduleWorkspace />;
  if (state.session && section === 'acad_attendance') return <AttendanceWorkspace />;
  if (state.session && section === 'acad_subjects') return <SubjectStudio />;
  if (state.history.enabled && !state.relationalSnapshot.tables.evaluations?.length && ['acad_exams', 'acad_resits', 'acad_assessments'].includes(section)) {
    return <HistoricalExamsWorkspace key={section} category={section === 'acad_resits' ? 'resit' : section === 'acad_assessments' ? 'control' : 'exam'} />;
  }
  if (state.session && ['acad_exams', 'acad_resits', 'acad_assessments'].includes(section)) {
    return <NativeAssessmentWorkspace key={`${section}:${state.academicYearSelection}`} category={section === 'acad_resits' ? 'resit' : section === 'acad_assessments' ? 'control' : 'exam'} />;
  }
  if (state.session && section === 'stud_accounts') {
    return <UserDirectoryPanel users={state.users} actor={activeRole} category="student" />;
  }
  if (state.session && section === 'stud_list') {
    return (
      <RoleGuard tab="etudiants" perms={perms}>
        <EtudiantsModule
          persistent={!!state.session}
          activeRole={activeRole}
          createStudent={state.createStudent}
          perms={perms}
          currentSubTab={currentSubTab}
          students={state.students}
          groups={state.groups}
          selectedStudent={state.selectedStudent}
          setSelectedStudent={state.setSelectedStudent}
          assignStudentToGroup={state.assignStudentToGroup}
        />
      </RoleGuard>
    );
  }
  if (state.session && ['staff_list', 'staff_roles', 'staff_permissions'].includes(section)) {
    return (
      <RoleGuard tab="personnel" perms={perms}>
        <PersonnelModule
          users={state.users}
          addUser={state.addUser}
          toggleUser={state.toggleUser}
          changeUserRole={state.changeUserRole}
          currentSubTab={currentSubTab}
        />
      </RoleGuard>
    );
  }
  if (state.session && CRUD_SECTIONS[section]) return <ReferenceCrudWorkspace key={section} section={section} />;
  if (state.session && DOMAIN_WORKSPACES[section]) return <ConnectedDomainWorkspace key={section} section={section} />;
  if (state.history.enabled && HISTORY_SECTIONS[section]) return <HistoricalWorkspace key={section} section={section} />;
  if (section === 'sys_data') return <HistoricalWorkspace section="history_all" />;

  return null;
}
