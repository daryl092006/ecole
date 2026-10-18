'use client';
import ReenrollmentWorkspace from '@/components/modules/ReenrollmentWorkspace';
import AnnualFeesWorkspace from '@/components/modules/AnnualFeesWorkspace';
import FinanceOverview from '@/components/modules/FinanceOverview';

import HistoricalWorkspace, { HISTORY_SECTIONS } from '@/components/modules/history/HistoricalWorkspace';
import PersonnelDossiers from '@/components/modules/personnel/PersonnelDossiers';
import TeachersWorkspace from '@/components/modules/personnel/TeachersWorkspace';
import ScheduleWorkspace from '@/components/modules/academic/ScheduleWorkspace';
import HistoricalExamsWorkspace from '@/components/modules/history/HistoricalExamsWorkspace';
import ReferenceCrudWorkspace from '@/components/modules/academic/ReferenceCrudWorkspace';
import { CRUD_SECTIONS } from '@/data/crudCatalog';
import NativeAssessmentWorkspace from '@/components/modules/academic/NativeAssessmentWorkspace';
import SubjectStudio from '@/components/modules/academic/SubjectStudio';
import WorkspaceHome from '@/components/modules/WorkspaceHome';
import UserDirectoryPanel from '@/components/modules/personnel/UserDirectoryPanel';
import { usePortal } from '@/hooks/usePortal';
import StudentLifecyclePanel from '@/components/modules/StudentLifecyclePanel';
import StudentDocumentsPanel from '@/components/modules/StudentDocumentsPanel';
import FinancePaymentsPanel from '@/components/modules/FinancePaymentsPanel';
import JuryPanel from '@/components/modules/academic/JuryPanel';
import ExamsPanel from '@/components/modules/academic/ExamsPanel';
import AcademicSettingsPanel from '@/components/modules/academic/AcademicSettingsPanel';
import ScheduleChangesPanel from '@/components/modules/academic/ScheduleChangesPanel';
import TeachersPanel from '@/components/modules/academic/TeachersPanel';
import PlanningReferenceForms from '@/components/modules/academic/PlanningReferenceForms';
import StaffRecordsPanel from '@/components/modules/StaffRecordsPanel';
import LogisticsModule from '@/components/modules/LogisticsModule';
import RoleGuard from '@/components/ui/RoleGuard';
import SupportPanel from '@/components/modules/SupportPanel';
import EspaceModule from '@/components/modules/EspaceModule';
import DashboardModule from '@/components/modules/DashboardModule';
import AcademiqueModule from '@/components/modules/AcademiqueModule';
import EtudiantsModule from '@/components/modules/EtudiantsModule';
import FinanceModule from '@/components/modules/FinanceModule';
import PersonnelModule from '@/components/modules/PersonnelModule';
import OnlineAdmissionsPanel from '@/components/modules/website/OnlineAdmissionsPanel';
import WebsiteBrochuresPanel from '@/components/modules/website/WebsiteBrochuresPanel';
import WebsiteArticlesPanel from '@/components/modules/website/WebsiteArticlesPanel';
import MarketingModule from '@/components/modules/MarketingModule';
import SystemeModule from '@/components/modules/SystemeModule';
import ConnectedDomainWorkspace from '@/components/modules/ConnectedDomainWorkspace';
import { DOMAIN_WORKSPACES } from '@/data/domainWorkspaces';

export default function PortalScreen({ tab, section }: { tab: string; section: string }) {
  const state = usePortal();
  const { activeRole, perms } = state;
  const currentTab = tab;
  const currentSubTab = section;
  if (state.session && section === 'stud_status') return <ReenrollmentWorkspace />;
  if (state.session && section === 'fin_contracts') return <AnnualFeesWorkspace />;
  if (state.session && section === 'fin_kpis') return <FinanceOverview />;
  if (state.session && section === 'web_applications') return <OnlineAdmissionsPanel mode="applications" />;
  if (state.session && section === 'web_documents') return <OnlineAdmissionsPanel mode="configuration" />;
  if (state.session && section === 'web_brochures') return <WebsiteBrochuresPanel />;
  if (state.session && section === 'comm_news') return <WebsiteArticlesPanel />;
  if (state.session && (section === 'espace_dashboard' || section === 'dashboard_kpis' || section === 'dashboard_reports')) return <WorkspaceHome mode={section === 'dashboard_kpis' ? 'overview' : section === 'dashboard_reports' ? 'reports' : 'home'} />;
  if (state.session && section === 'acad_settings') return <section className="card"><div className="page-intro"><div><span className="page-eyebrow">RÈGLEMENT ACADÉMIQUE</span><h1>Règles académiques à confirmer</h1><p>Les règles de compensation, de validation et de délibération doivent être confirmées par la direction académique avant leur application. Aucune règle n’est appliquée automatiquement aux dossiers historiques.</p></div></div><p>Préparez la version approuvée du règlement et ses dates d’application. L’enregistrement et l’activation de cette version ne sont pas encore disponibles dans cet écran.</p></section>;
  if (state.session && section === 'staff_records') return <PersonnelDossiers />;
  if (state.session && section === 'staff_teachers') return <TeachersWorkspace />;
  if (state.session && section === 'acad_schedule') return <ScheduleWorkspace />;
  if(state.session && section==='acad_subjects')return <SubjectStudio />;
  if(state.history.enabled && !state.relationalSnapshot.tables.evaluations?.length && ['acad_exams','acad_resits','acad_assessments'].includes(section))return <HistoricalExamsWorkspace key={section} category={section==='acad_resits'?'resit':section==='acad_assessments'?'control':'exam'} />;
  if(state.session && ['acad_exams','acad_resits','acad_assessments'].includes(section))return <NativeAssessmentWorkspace key={`${section}:${state.academicYearSelection}`} category={section==='acad_resits'?'resit':section==='acad_assessments'?'control':'exam'} />;
  if (state.session && CRUD_SECTIONS[section]) return <ReferenceCrudWorkspace key={section} section={section} />;
  if (state.session && DOMAIN_WORKSPACES[section]) return <ConnectedDomainWorkspace key={section} section={section} />;
  if (state.history.enabled && HISTORY_SECTIONS[section]) return <HistoricalWorkspace key={section} section={section} />;
  if (section === 'sys_data') return <HistoricalWorkspace section="history_all" />;
  return <>
          {currentSubTab === 'stud_accounts' && <UserDirectoryPanel users={state.users} actor={activeRole} category="student" />}
          {currentTab === 'espace' && currentSubTab === 'espace_documents' && <StudentDocumentsPanel />}
          {currentTab === 'espace' && currentSubTab === 'espace_finance' && <FinancePaymentsPanel personal />}
          {currentTab === 'etudiants' && currentSubTab === 'stud_cards' && <StudentDocumentsPanel />}
          {currentTab === 'etudiants' && currentSubTab === 'stud_status' && <StudentLifecyclePanel />}
          {currentTab === 'academique' && currentSubTab === 'acad_exams' && <ExamsPanel />}
          {currentTab === 'academique' && currentSubTab === 'acad_jury' && <JuryPanel />}
          {currentTab === 'academique' && currentSubTab === 'acad_settings' && <AcademicSettingsPanel />}
          {currentTab === 'personnel' && currentSubTab === 'staff_records' && <StaffRecordsPanel />}
          {currentTab === 'personnel' && currentSubTab === 'staff_teachers' && <div><div className="module-header"><h1>Enseignants et affectations</h1></div><div className="card card-full mb-2"><TeachersPanel role={activeRole} /></div><div className="card card-full"><h2>Affectations pédagogiques</h2><PlanningReferenceForms mode="assignment" role={activeRole} /></div></div>}
          {currentTab === 'logistique' && <LogisticsModule />}

          {/* ═══ MON ESPACE ═══ */}
          {((currentTab === 'espace' && currentSubTab === 'espace_support') || (currentTab === 'systeme' && currentSubTab === 'sys_support')) && <SupportPanel tickets={state.tickets} canManage={perms.permissions.includes('system.support.manage')} onCreate={state.openTicket} onTransition={state.changeTicket} />}
          {currentTab === 'espace' && !['espace_support', 'espace_documents', 'espace_finance'].includes(currentSubTab) && (
            <RoleGuard tab="espace" perms={perms}>
              <EspaceModule
                students={state.students}
                classes={state.classes}
                evaluations={state.evaluations}
                sessions={state.sessions}
                reclamations={state.reclamations}
                ownDataOnly={!!perms.scope.ownDataOnly}
                addReclamation={state.addReclamation}
                activeRole={activeRole}
                currentSubTab={currentSubTab}
                announcements={state.announcements}
              />
            </RoleGuard>
          )}

          {/* ═══ TABLEAU DE BORD GLOBAL ═══ */}
          {currentTab === 'dashboard_global' && (
            <RoleGuard tab="dashboard_global" perms={perms}>
              <DashboardModule
                currentSubTab={currentSubTab}
                students={state.students}
              />
            </RoleGuard>
          )}

          {/* ═══ ACADÉMIQUE ═══ */}
          {currentTab === 'academique' && !['acad_exams', 'acad_jury', 'acad_settings'].includes(currentSubTab) && (
            <RoleGuard tab="academique" perms={perms}>
              <AcademiqueModule
                addRoom={state.addRoom}
                addBlockedPeriod={state.addBlockedPeriod}
                blockedPeriods={state.blockedPeriods}
                recordAttendance={state.recordAttendance}
                perms={perms}
                activeRole={activeRole}
                currentSubTab={currentSubTab}
                classes={state.classes}
                reclamations={state.reclamations}
                students={state.students}
                rooms={state.rooms}
                sessions={state.sessions}
                checkConflictsAndAddSession={state.checkConflictsAndAddSession}
                selectedClassForGrades={state.selectedClassForGrades}
                setSelectedClassForGrades={state.setSelectedClassForGrades}
                filteredEvals={state.filteredEvals}
                newEvalName={state.newEvalName}
                setNewEvalName={state.setNewEvalName}
                newEvalType={state.newEvalType}
                setNewEvalType={state.setNewEvalType}
                addEvaluation={state.addEvaluation}
                submitGrades={state.submitGrades}
                changeGradeStatus={state.changeGradeStatus}
                updateGrade={state.updateGrade}
                transitionReclamation={state.transitionReclamation}
              />
            </RoleGuard>
          )}

          {currentTab === 'academique' && currentSubTab === 'acad_schedule' && <ScheduleChangesPanel />}

          {/* ═══ ÉTUDIANTS ═══ */}
          {currentTab === 'etudiants' && currentSubTab === 'stud_list' && (
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
          )}

          {/* ═══ FINANCE ═══ */}
          {currentTab === 'finance' && (
            <RoleGuard tab="finance" perms={perms}>
              <FinanceModule />
            </RoleGuard>
          )}

          {/* ═══ PERSONNEL ═══ */}
          {currentTab === 'personnel' && ['staff_list', 'staff_roles', 'staff_permissions'].includes(currentSubTab) && (
            <RoleGuard tab="personnel" perms={perms}>
              <PersonnelModule
                users={state.users}
                addUser={state.addUser}
                toggleUser={state.toggleUser}
                changeUserRole={state.changeUserRole}
                currentSubTab={currentSubTab}
              />
            </RoleGuard>
          )}

          {/* ═══ MARKETING ═══ */}
          {currentTab === 'marketing' && (
            <RoleGuard tab="marketing" perms={perms}>
              <MarketingModule
                announcements={state.announcements}
                addAnnouncement={state.addAnnouncement}
                withdrawAnnouncement={state.withdrawAnnouncement}
                currentSubTab={currentSubTab}
              />
            </RoleGuard>
          )}

          {/* ═══ SYSTÈME & AUDIT ═══ */}
          {currentTab === 'systeme' && currentSubTab !== 'sys_support' && (
            <RoleGuard tab="systeme" perms={perms}>
              <SystemeModule
                currentSubTab={currentSubTab}
                systemLogs={state.systemLogs}
                runBackup={state.runBackup}
              />
            </RoleGuard>
          )}

  </>;
}
