'use client';
import IconButton from '@/components/ui/IconButton';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { getPortalRoute, HOME_PATH, MODULE_PATHS } from '@/constants/portalRoutes';
import { isRouteAllowed } from '@/permissions/navigation';
import LoadingState from '@/components/ui/LoadingState';
import SessionRecovery from '@/components/auth/SessionRecovery';
import ErrorState from '@/components/ui/ErrorState';
import AcademicYearControl from '@/components/layout/AcademicYearControl';
import TopBar, { type SearchDestination } from '@/components/layout/TopBar';
import { getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import Sidebar from '@/components/layout/Sidebar';
import SchoolLogo from '@/components/ui/SchoolLogo';
import ActionResult from '@/components/ui/ActionResult';
import { YEAR_STATUS_LABELS } from '@/types/academicYearContext';

export default function PortalShell({ children }: { children: ReactNode }) {
  const state = usePortal(); const router = useRouter();
  const { activeRole, perms, availableTabs, currentTab, currentSubTab, pathname } = state;
  const context = state.academicYearContext;
  const currentYear = context?.years.find(y => y.id === context.currentYearId);
  const selectedYear = context?.years.find(y => y.id === context.selectedYearId);
  const [menuOpen, setMenuOpen] = useState(false); const mainRef = useRef<HTMLElement>(null);
  const route = getPortalRoute(pathname);
  const tab = availableTabs.find(item => item.id === currentTab);
  const navigationGroups = getWorkspaceNavigation(availableTabs, { hideStudentPersonalPages: true });
  const navigationGroup = navigationGroups.find(group => group.sections.includes(['acad_resits', 'acad_assessments'].includes(currentSubTab) ? 'acad_exams' : currentSubTab));
  const routeTitle = route?.title || tab?.name || 'Mon espace';
  const aliasAllowed = !!tab && MODULE_PATHS[tab.id] === pathname;
  const authorizedSection = route && ['acad_resits', 'acad_assessments'].includes(route.section) ? 'acad_exams' : route?.section;
  const allowed = !!tab && (route ? !!tab.subTabs?.some(section => section.id === authorizedSection) : aliasAllowed);
  useEffect(() => {
    if (state.authReady && !state.session) router.replace(state.hasLoggedOut ? '/connexion' : '/connexion?retour=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash));
  }, [state.authReady, state.session, state.hasLoggedOut, router, pathname]);
  useEffect(() => {
    if (state.session?.mustChangePassword) router.replace('/mot-de-passe-modifier');
  }, [state.session, router]);
  useEffect(() => {
    setMenuOpen(false); if (mainRef.current) mainRef.current.scrollTop = 0;
    if (state.session) document.title = routeTitle + ' | ESCEN';
  }, [activeRole, pathname, state.session, routeTitle]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const navigation = document.getElementById('application-navigation');
    const focusable = () => Array.from(navigation?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)') || []).filter(element => element.getClientRects().length);
    focusable()[0]?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth > 1024) setMenuOpen(false); };
    document.addEventListener('keydown', containFocus);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', containFocus);
      window.removeEventListener('resize', resize);
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector<HTMLButtonElement>('.mobile-menu-toggle')?.focus();
    };
  }, [menuOpen]);
  const destinations: SearchDestination[] = navigationGroups.flatMap(group => group.pages.map(page => ({
    id: page.id, label: page.name, detail: group.name, tab: page.tab, subTab: page.id,
  })));
  if (perms.permissions.includes('student.view')) destinations.push(...state.students.map(student => ({ id: 'student:' + student.matricule, label: student.firstname + ' ' + student.lastname, detail: student.matricule + ' · ' + student.filiere, tab: 'etudiants', subTab: 'stud_list', studentId: student.matricule })));
  const openDestination = (destination: SearchDestination) => {
    if (destination.studentId) state.navigateToStudent(destination.studentId); else state.navigateTo(destination.tab, destination.subTab);
    setMenuOpen(false);
  };
  if (state.authError) return <main className="route-loading"><SchoolLogo /><SessionRecovery message={state.authError} onRetry={state.retryAuthentication} onExit={state.logout} /></main>;
  if (!state.session || !state.authReady) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <div className="route-loading-card">
          <SchoolLogo className="header-school-logo" priority />
          <div className="route-loading-bar" aria-hidden="true">
            <div className="route-loading-bar-fill" />
          </div>
          <p>Ouverture de la connexion…</p>
        </div>
      </div>
    );
  }
  return <><a href="#main-content" className="skip-link">Aller au contenu</a><div className={`app-wrapper ${menuOpen ? 'navigation-open' : ''}`}>
    <TopBar userName={state.session.name} destinations={destinations} onDestination={openDestination} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(open => !open)} activeRole={activeRole} availableRoles={state.session.availableRoles} searchQuery={state.searchQuery} onSearchChange={state.setSearchQuery} onRoleChange={state.handleRoleChange} notifications={state.notifications} onLogout={state.logout} />
    <div className="app-body">{menuOpen && <button className="navigation-backdrop" aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)} />}
      <Sidebar availableTabs={availableTabs} currentTab={currentTab} currentSubTab={currentSubTab} activeRole={activeRole} menuOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main className="main-content" id="main-content" ref={mainRef} key={activeRole + ':' + state.demoIdentity} tabIndex={-1} inert={menuOpen}>
        <div className="workspace-location">
          <nav className="workspace-breadcrumb" aria-label="Fil d’Ariane"><Link href={HOME_PATH}>Accueil</Link>{navigationGroup && navigationGroup.id !== 'home' && (route?.studentId || navigationGroup.name !== route?.title) && <><span>/</span><span>{navigationGroup.name}</span></>}{route && <><span>/</span><strong aria-current="page">{route.studentId ? `Dossier ${route.studentId}` : route.title}</strong></>}</nav>
          <AcademicYearControl />
        </div>
        {selectedYear && currentYear && selectedYear.id !== currentYear.id && (
          <aside className="academic-context-banner" aria-label="Contexte de consultation annuelle">
            <span>Vous consultez l’année scolaire <strong>{selectedYear.name}</strong> ({YEAR_STATUS_LABELS[selectedYear.status] || selectedYear.status}), distincte de l’année de travail.</span>
            <button className="btn btn-sm btn-outline" onClick={() => state.changeAcademicYearSelection('current')}>
              Revenir à l’année en cours ({currentYear.name})
            </button>
          </aside>
        )}
        {!allowed ? <section className="card route-denied"><h1>Accès refusé</h1><p>Cette page n’est pas disponible pour votre rôle.</p><Link className="btn btn-primary" href={HOME_PATH}>Revenir à mon espace</Link></section> : <>
          {state.actionFeedback && <div className="restricted-box action-feedback" role="alert"><span>{state.actionFeedback}</span><IconButton className="btn btn-sm btn-outline" onClick={state.clearActionFeedback} label="Fermer" /></div>}
          {state.campusLoad.status === 'loading' || state.campusLoad.status === 'idle' ? <LoadingState label="Chargement des dossiers…" variant={currentTab === 'dashboard_global' || currentTab === 'espace' ? 'cards' : 'table'} />
            : state.campusLoad.status === 'error' ? <ErrorState message={state.campusLoad.error || 'Les dossiers n’ont pas pu être chargés.'} onRetry={state.reloadCampus} retryLabel="Réessayer le chargement" />
              : <>
                {state.actionOutcome && <ActionResult title={state.actionOutcome.title} href={state.actionOutcome.href && isRouteAllowed(state.actionOutcome.href.split('?')[0], activeRole) ? state.actionOutcome.href : undefined} nextLabel={state.actionOutcome.nextLabel} onDismiss={state.clearActionOutcome}>{state.actionOutcome.detail}</ActionResult>}
                <div key={`${state.academicYearSelection}:${state.academicYearContext?.selectedYearId || ''}`}>{state.academicYearContext && !state.academicYearContext.selectedYearId && state.academicYearSelection !== 'all' && !['acad_reference', 'acad_program', 'staff_records', 'staff_list', 'staff_permissions', 'staff_roles', 'espace_profile', 'sys_roles', 'sys_permissions', 'sys_data', 'sys_logs', 'sys_backups', 'sys_settings', 'log_assets', 'log_suppliers'].includes(currentSubTab) ? <section className="card card-full"><h1>Choisir une année scolaire</h1><p>Sélectionnez une année dans le champ Année pour consulter les activités, dossiers et résultats correspondants. Aucune donnée sans rattachement confirmé ne sera ajoutée à cette année.</p>{state.globalAccess && (perms.permissions.includes('academic.year.open') || perms.permissions.includes('academic.structure.manage')) && <Link className="btn btn-primary" href="/academique/referentiel?collection=academic_years">Configurer les années scolaires</Link>}</section> : children}</div>

              </>}

        </>}
      </main>
    </div>
  </div></>;
}
