'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/hooks/usePortal';
import { ROLES } from '@/types/permissions';
import { getPortalRoute, HOME_PATH, MODULE_PATHS } from '@/constants/portalRoutes';
import { isRouteAllowed } from '@/permissions/navigation';
import TopBar, { type SearchDestination } from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import RoleScopeBanner from '@/components/ui/RoleScopeBanner';
import SchoolLogo from '@/components/ui/SchoolLogo';

export default function PortalShell({ children }: { children: ReactNode }) {
  const state = usePortal(); const router = useRouter();
  const { activeRole, perms, availableTabs, currentTab, currentSubTab, pathname } = state;
  const [menuOpen, setMenuOpen] = useState(false); const mainRef = useRef<HTMLElement>(null);
  const route = getPortalRoute(pathname);
  const tab = availableTabs.find(item => item.id === currentTab);
  const routeTitle = route?.title || tab?.name || 'Mon espace';
  const aliasAllowed = !!tab && MODULE_PATHS[tab.id] === pathname;
  const allowed = isRouteAllowed(pathname, activeRole) || aliasAllowed;
  useEffect(() => {
    if (!state.session) router.replace(state.hasLoggedOut ? '/connexion' : '/connexion?retour=' + encodeURIComponent(pathname));
  }, [state.session, state.hasLoggedOut, router, pathname]);
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
    const focusable = () => Array.from(navigation?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || []).filter(element => element.getClientRects().length);
    focusable()[0]?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth > 800) setMenuOpen(false); };
    document.addEventListener('keydown', containFocus);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', containFocus);
      window.removeEventListener('resize', resize);
      previousFocus?.focus();
    };
  }, [menuOpen]);
  const destinations: SearchDestination[] = availableTabs.flatMap(item => [
    { id: item.id, label: item.name, detail: 'Module', tab: item.id },
    ...(item.subTabs || []).map(sub => ({ id: sub.id, label: sub.name, detail: item.name, tab: item.id, subTab: sub.id })),
  ]);
  if (perms.permissions.includes('student.view')) destinations.push(...state.students.map(student => ({ id: 'student:' + student.matricule, label: student.firstname + ' ' + student.lastname, detail: student.matricule + ' · ' + student.filiere, tab: 'etudiants', subTab: 'stud_list', studentId: student.matricule })));
  const openDestination = (destination: SearchDestination) => {
    if (destination.studentId) state.navigateToStudent(destination.studentId); else state.navigateTo(destination.tab, destination.subTab);
    setMenuOpen(false);
  };
  if (!state.session) return <div className="route-loading" role="status"><SchoolLogo /><p>Ouverture de la connexion…</p></div>;
  return <><a href="#main-content" className="skip-link">Aller au contenu</a><div className={`app-wrapper ${menuOpen ? 'navigation-open' : ''}`}>
    <TopBar destinations={destinations} onDestination={openDestination} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(open => !open)} activeRole={activeRole} searchQuery={state.searchQuery} onSearchChange={state.setSearchQuery} onRoleChange={state.handleRoleChange} notifications={state.notifications} onLogout={state.logout} />
    <div className="app-body">{menuOpen && <button className="navigation-backdrop" aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)} />}
      <Sidebar availableTabs={availableTabs} currentTab={currentTab} currentSubTab={currentSubTab} activeRole={activeRole} menuOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main className="main-content" id="main-content" ref={mainRef} key={activeRole + ':' + state.demoIdentity} tabIndex={-1} inert={menuOpen}>
        <div className="workspace-heading"><span>ESPACE DE TRAVAIL</span><span className="prototype-indicator"><i /> Version de travail</span></div>
        <nav className="workspace-breadcrumb" aria-label="Fil d’Ariane"><Link href={HOME_PATH}>Accueil</Link><span>/</span>{tab && <Link href={tab.href}>{tab.name}</Link>}{route && <><span>/</span><strong>{route.studentId ? `Dossier ${route.studentId}` : route.title}</strong></>}</nav>
        <RoleScopeBanner role={activeRole} />
        {!allowed ? <section className="card route-denied"><h1>Accès refusé</h1><p>Cette page n’est pas disponible pour votre rôle.</p><Link className="btn btn-primary" href={HOME_PATH}>Revenir à mon espace</Link></section> : <>
          {state.actionFeedback && <div className="restricted-box action-feedback" role="alert"><span>{state.actionFeedback}</span><button className="btn btn-sm btn-outline" onClick={state.clearActionFeedback}>Fermer</button></div>}
          {[ROLES.ENS, ROLES.STUD, ROLES.DEL, ROLES.SURV].includes(activeRole as typeof ROLES.ENS) && <label className="card card-full form-group identity-selector">Identité de démonstration<select className="select-input" value={state.demoIdentity} onChange={event => { state.setDemoIdentity(event.target.value); state.setSelectedClassForGrades(null); state.setSelectedStudent(null); }}><option value="">Choisir une identité pour accéder aux données autorisées</option>{activeRole === ROLES.SURV ? state.identitySupervisors.map(item => <option key={item.id} value={item.id}>{item.name}</option>) : activeRole === ROLES.ENS ? state.references.teachers.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.firstname} {item.lastname}</option>) : state.identityStudents.map(item => <option key={item.matricule} value={item.matricule}>{item.firstname} {item.lastname}</option>)}</select></label>}
          {children}
        </>}
      </main>
    </div>
  </div></>;
}
