import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SchoolLogo from '@/components/ui/SchoolLogo';
import { Search, Bell, Menu, X, ArrowUpRight, LogOut, UserRound } from 'lucide-react';
import type { RoleName } from '@/types/permissions';
import { ROLE_COLORS } from '@/hooks/useAppState';

export interface SearchDestination {
  id: string;
  label: string;
  detail: string;
  tab: string;
  subTab?: string;
  studentId?: string;
}

interface TopBarProps {
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

export default function TopBar({ activeRole, availableRoles, searchQuery, onSearchChange, onRoleChange, notifications, destinations, onDestination, menuOpen, onToggleMenu, onLogout }: TopBarProps) {
  const [panel, setPanel] = useState<'search' | 'notifications' | null>(null);
  const controls = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchResults = useRef<HTMLDivElement>(null);
  const accountControl = useRef<HTMLDetailsElement>(null);
  const query = normalize(searchQuery.trim());
  const matches = destinations.filter(item => normalize(item.label + ' ' + item.detail).includes(query)).slice(0, 8);

  useEffect(() => { setPanel(null); if (accountControl.current) accountControl.current.open = false; }, [activeRole]);
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

  const choose = (destination: SearchDestination) => {
    onDestination(destination);
    onSearchChange('');
    setPanel(null);
  };

  return <header className="topbar" ref={controls}>
    <button className="notif-btn mobile-menu-toggle" onClick={onToggleMenu} aria-label={menuOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={menuOpen} aria-controls="application-navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <Link className="topbar-logo" href="/mon-espace" aria-label="ESCEN — revenir à mon espace"><SchoolLogo className="header-school-logo" priority /></Link>
    <div className="topbar-center">
      <div className="search-box">
        <Search size={17} className="search-icon" />
        <input ref={searchInput} type="search" className="search-input" aria-label="Rechercher une page ou un dossier autorisé" aria-controls={panel === 'search' && query ? 'portal-search-results' : undefined} placeholder="Rechercher une page ou un étudiant…" value={searchQuery} onFocus={() => setPanel('search')} onChange={event => { onSearchChange(event.target.value); setPanel('search'); }} onKeyDown={event => {
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
        <button className="notif-btn" aria-label={`Notifications : ${notifications.length}`} aria-expanded={panel === 'notifications'} onClick={() => setPanel(current => current === 'notifications' ? null : 'notifications')}><Bell size={18} />{notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}</button>
        {panel === 'notifications' && <section className="header-popover notification-panel" aria-label="Notifications"><div className="popover-heading">Notifications de la session</div>{notifications.length ? <ul>{notifications.map(item => <li key={item.id}>{item.text}</li>)}</ul> : <div className="empty-state"><strong>Vous êtes à jour</strong><span>Aucune notification pour ce rôle.</span></div>}</section>}
      </div>
      <details className="account-control" ref={accountControl}><summary className="account-summary" aria-label="Mon compte et mon rôle"><UserRound size={19} /><span>{activeRole}</span></summary><div className="account-popover"><div className="role-switcher"><span className="role-dot" style={{ backgroundColor: ROLE_COLORS[activeRole] }} />{availableRoles.length > 1 ? <><label htmlFor="active-role">Rôle autorisé</label><select id="active-role" className="role-select" value={activeRole} onChange={event => onRoleChange(event.target.value as RoleName)}>{availableRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></> : <span className="role-select">{activeRole}</span>}</div><p>Le changement de rôle adapte les pages et les données à vos attributions.</p><button className="btn btn-outline" onClick={onLogout}><LogOut size={16} /> Se déconnecter</button></div></details>
    </div>
  </header>;
}
