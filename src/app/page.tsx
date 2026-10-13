'use client';

import { useEffect, useState } from 'react';
import type { SearchDestination } from '@/components/layout/TopBar';
import { useAppState } from '@/hooks/useAppState';
import { AcademicReferencesContext } from '@/hooks/useAcademicReferences';
import { ROLES } from '@/types/permissions';

// Layout
import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';

// UI
import RoleGuard from '@/components/ui/RoleGuard';
import RoleScopeBanner from '@/components/ui/RoleScopeBanner';
import RoleOnboarding from '@/components/ui/RoleOnboarding';

// Modules
import SupportPanel from '@/components/modules/SupportPanel';
import EspaceModule from '@/components/modules/EspaceModule';
import DashboardModule from '@/components/modules/DashboardModule';
import AcademiqueModule from '@/components/modules/AcademiqueModule';
import EtudiantsModule from '@/components/modules/EtudiantsModule';
import FinanceModule from '@/components/modules/FinanceModule';
import PersonnelModule from '@/components/modules/PersonnelModule';
import MarketingModule from '@/components/modules/MarketingModule';
import SystemeModule from '@/components/modules/SystemeModule';

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function EscenPortal() {
  const state = useAppState();
  const { activeRole, perms, availableTabs, currentTab, currentSubTab, handleTabChange, setCurrentSubTab } = state;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
  }, [activeRole, currentTab, currentSubTab]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  const destinations: SearchDestination[] = availableTabs.flatMap(tab => [
    { id: tab.id, label: tab.name, detail: 'Module', tab: tab.id },
    ...(tab.subTabs ?? []).map(subTab => ({ id: subTab.id, label: subTab.name, detail: tab.name, tab: tab.id, subTab: subTab.id })),
  ]);
  if (perms.permissions.includes('student.view') && availableTabs.some(tab => tab.id === 'etudiants')) {
    destinations.push(...state.students.map(student => ({
      id: 'student:' + student.matricule, label: student.firstname + ' ' + student.lastname,
      detail: student.matricule + ' · ' + student.filiere + ' · ' + student.niveau,
      tab: 'etudiants', subTab: 'stud_list', studentId: student.matricule,
    })));
  }
  const openDestination = (destination: SearchDestination) => {
    state.navigateTo(destination.tab, destination.subTab);
    state.setSelectedStudent(destination.studentId ? state.students.find(student => student.matricule === destination.studentId) ?? null : null);
    setMenuOpen(false);
  };


  return (
    <AcademicReferencesContext.Provider value={state.references}><a href="#main-content" className="skip-link">Aller au contenu</a><div className={`app-wrapper ${menuOpen ? 'navigation-open' : ''}`}>

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <TopBar
        destinations={destinations}
        onDestination={openDestination}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(open => !open)}
        activeRole={activeRole}
        searchQuery={state.searchQuery}
        onSearchChange={state.setSearchQuery}
        onRoleChange={state.handleRoleChange}
        notifications={state.notifications}
        onOpenGuide={state.reopenOnboarding}
      />

      <div className="app-body">
        {menuOpen && <button className="navigation-backdrop" aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)} />}

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <Sidebar
          availableTabs={availableTabs}
          currentTab={currentTab}
          currentSubTab={currentSubTab}
          activeRole={activeRole}
          onTabChange={tab => { handleTabChange(tab); setMenuOpen(false); }}
          onSubTabChange={subTab => { setCurrentSubTab(subTab); setMenuOpen(false); }}
        />

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <main className="main-content" id="main-content" key={activeRole + ':' + state.demoIdentity} tabIndex={-1}>
          <div className="workspace-heading"><span>ESPACE DE TRAVAIL</span><span className="prototype-indicator"><i /> Prototype en mémoire</span></div>
          <div className="workspace-breadcrumb">{availableTabs.find(tab => tab.id === currentTab)?.name}<span>/</span><strong>{availableTabs.find(tab => tab.id === currentTab)?.subTabs?.find(subTab => subTab.id === currentSubTab)?.name}</strong></div>
          <RoleScopeBanner role={activeRole} />
          {[ROLES.ENS, ROLES.STUD, ROLES.DEL].includes(activeRole as typeof ROLES.ENS) && <label className="card card-full mb-2">Identité de démonstration
            <select className="select-input" value={state.demoIdentity} onChange={event => { state.setDemoIdentity(event.target.value); state.setSelectedClassForGrades(null); state.setSelectedStudent(null); }}>
              <option value="">Choisir une identité pour accéder aux données autorisées</option>
              {activeRole === ROLES.ENS ? state.references.teachers.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.firstname} {item.lastname}</option>) : state.identityStudents.map(item => <option key={item.matricule} value={item.matricule}>{item.firstname} {item.lastname}</option>)}
            </select>
          </label>}

          {/* ═══ MON ESPACE ═══ */}
          {((currentTab === 'espace' && currentSubTab === 'espace_support') || (currentTab === 'systeme' && currentSubTab === 'sys_support')) && <SupportPanel tickets={state.tickets} canManage={perms.permissions.includes('system.support.manage')} onCreate={state.openTicket} onTransition={state.changeTicket} />}
          {currentTab === 'espace' && currentSubTab !== 'espace_support' && (
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
          {currentTab === 'academique' && (
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

          {/* ═══ ÉTUDIANTS ═══ */}
          {currentTab === 'etudiants' && (
            <RoleGuard tab="etudiants" perms={perms}>
              <EtudiantsModule
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
              <FinanceModule
                activeRole={activeRole}
                createContract={state.createContract}
                perms={perms}
                currentSubTab={currentSubTab}
                students={state.students}
                paymentStudent={state.paymentStudent}
                setPaymentStudent={state.setPaymentStudent}
                paymentAmount={state.paymentAmount}
                setPaymentAmount={state.setPaymentAmount}
                recordPayment={state.recordPayment}
                paymentMethod={state.paymentMethod}
                setPaymentMethod={state.setPaymentMethod}
                payments={state.payments}
                receipts={state.receipts}
                paymentCancellations={state.paymentCancellations}
                cancelPayment={state.cancelPayment}
              />
            </RoleGuard>
          )}

          {/* ═══ PERSONNEL ═══ */}
          {currentTab === 'personnel' && (
            <RoleGuard tab="personnel" perms={perms}>
              <PersonnelModule
                users={state.users}
                addUser={state.addUser}
                toggleUser={state.toggleUser}
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

        </main>
      </div>
      <RoleOnboarding
        role={activeRole}
        open={state.onboardingOpen}
        availableTabs={availableTabs}
        onComplete={state.completeOnboarding}
        onNavigate={state.navigateTo}
      />
    </div></AcademicReferencesContext.Provider>
  );
}
