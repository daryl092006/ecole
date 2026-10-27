import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SchoolLogo from '@/components/ui/SchoolLogo';
import { Search, Bell, Menu, X, ArrowUpRight, LogOut } from 'lucide-react';
import type { RoleName } from '@/types/permissions';
import { ROLE_COLORS } from '@/hooks/useAppState';
import { useApplicationNotices } from '@/hooks/useApplicationNotices';

export interface SearchDestination {
  id: string;
  label: string;
  detail: string;
  tab: string;
  subTab?: string;
  studentId?: string;
}

interface TopBarProps {
  userName: string;
  activeRole: RoleName;
  availableRoles: RoleName[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (role: RoleName) => void;
  notifications: { id: number; text: string }[];
  destinations: SearchDestination[];
  onDestination: (destination: SearchDestination) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogout: () => void;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TopBar({ userName, activeRole, availableRoles, searchQuery, onSearchChange, onRoleChange, notifications, destinations, onDestination, menuOpen, onToggleMenu, onLogout }: TopBarProps) {
  const applicationNotices = useApplicationNotices();
  const notificationCount = notifications.length + applicationNotices.notices.length;
  const pathname = usePathname();
  const [panel, setPanel] = useState<'search' | 'notifications' | null>(null);
  const controls = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchResults = useRef<HTMLDivElement>(null);
  const accountControl = useRef<HTMLDetailsElement>(null);
  const displayName = userName.trim() || 'Mon compte';
  const initial = Array.from(userName.trim())[0]?.toLocaleUpperCase('fr') || '?';
  const query = normalize(searchQuery.trim());
  const matches = destinations.filter(item => normalize(item.label + ' ' + item.detail).includes(query)).slice(0, 8);

  useEffect(() => { setPanel(null); if (accountControl.current) accountControl.current.open = false; }, [activeRole, pathname, menuOpen]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (accountControl.current && !accountControl.current.contains(event.target as Node)) accountControl.current.open = false;
      if (!controls.current?.contains(event.target as Node)) { setPanel(null); if (accountControl.current) accountControl.current.open = false; }
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPanel(null); if (accountControl.current?.open) { accountControl.current.open = false; accountControl.current.querySelector('summary')?.focus(); } } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const openSearch = () => {
    if (accountControl.current) accountControl.current.open = false;
    setPanel('search');
  };

  const choose = (destination: SearchDestination) => {
    onDestination(destination);
    onSearchChange('');
    setPanel(null);
  };

  return <header className="topbar" ref={controls} inert={menuOpen}>
    <button className="notif-btn mobile-menu-toggle" onClick={onToggleMenu} aria-label={menuOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={menuOpen} aria-controls="application-navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <Link className="topbar-logo" href="/mon-espace" aria-label="ESCEN — revenir à mon espace"><SchoolLogo className="header-school-logo" priority /></Link>
    <div className="topbar-center">
      <div className="search-box">
        <Search size={17} className="search-icon" />
        <input ref={searchInput} type="search" className="search-input" aria-label="Rechercher une page ou un dossier autorisé" aria-controls={panel === 'search' && query ? 'portal-search-results' : undefined} placeholder="Rechercher une page ou un étudiant…" value={searchQuery} onFocus={openSearch} onChange={event => { onSearchChange(event.target.value); openSearch(); }} onKeyDown={event => {
          if (event.key === 'Enter' && query && matches[0]) { event.preventDefault(); choose(matches[0]); }
          if (event.key === 'ArrowDown' && panel === 'search' && query) { event.preventDefault(); searchResults.current?.querySelector<HTMLButtonElement>('button')?.focus(); }
        }} />
        {panel === 'search' && query && <div ref={searchResults} id="portal-search-results" className="header-popover search-results" aria-label="Résultats de recherche" onKeyDown={event => {
          const buttons = Array.from(searchResults.current?.querySelectorAll<HTMLButtonElement>('button') || []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (event.key === 'ArrowDown') { event.preventDefault(); buttons[Math.min(index + 1, buttons.length - 1)]?.focus(); }
          if (event.key === 'ArrowUp') { event.preventDefault(); if (index <= 0) searchInput.current?.focus(); else buttons[index - 1]?.focus(); }
          if (event.key === 'Escape') { event.preventDefault(); searchInput.current?.focus(); setPanel(null); }
        }}>
          <div className="popover-heading">Dans votre périmètre</div>
          {matches.length ? matches.map(item => <button key={item.id} className="search-result" onClick={() => choose(item)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={16} /></button>) : <div className="empty-state"><strong>Aucun résultat</strong><span>Essayez un nom, un matricule ou le titre d’une page.</span></div>}
        </div>}
      </div>
    </div>
    <div className="topbar-right">
      <div className="notification-control">
        <button className="notif-btn" aria-label={`Notifications : ${notificationCount}`} aria-expanded={panel === 'notifications'} onClick={() => { if (accountControl.current) accountControl.current.open = false; setPanel(current => current === 'notifications' ? null : 'notifications'); }}><Bell size={18} />{notificationCount > 0 && <span className="notif-badge">{notificationCount}</span>}</button>
        {panel === 'notifications' && <section className="header-popover notification-panel" aria-label="Notifications"><div className="popover-heading">Notifications</div>{notificationCount ? <ul>{notifications.map(item => <li key={`session-${item.id}`}>{item.text}</li>)}{applicationNotices.notices.map(item => <li key={item.id}><Link href="/site-web/demandes">{item.message}</Link></li>)}</ul> : <div className="empty-state"><strong>Vous êtes à jour</strong><span>Aucune notification pour ce rôle.</span></div>}{applicationNotices.notices.length > 0 && <button className="btn btn-outline" onClick={() => { void applicationNotices.markRead().catch(() => undefined); }}>Marquer les notifications de candidature comme lues</button>}</section>}
      </div>
      <details className="account-control" ref={accountControl} onToggle={event => { if (event.currentTarget.open) setPanel(null); }}><summary className="account-summary" aria-label="Mon compte et mon rôle"><span className="account-avatar" aria-hidden="true">{initial}</span><span className="account-identity"><strong title={displayName}>{displayName}</strong><small title={activeRole}>{activeRole}</small></span></summary><div className="account-popover"><strong className="account-name">{displayName}</strong><div className="role-switcher"><span className="role-dot" style={{ backgroundColor: ROLE_COLORS[activeRole] }} />{availableRoles.length > 1 ? <><label htmlFor="active-role">Rôle autorisé</label><select id="active-role" className="role-select" value={activeRole} onChange={event => onRoleChange(event.target.value as RoleName)}>{availableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></> : <span className="role-select">{activeRole}</span>}</div><button className="btn btn-outline" onClick={onLogout}><LogOut size={16} /> Se déconnecter</button></div></details>
    </div>
  </header>;
}
