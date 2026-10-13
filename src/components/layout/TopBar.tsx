import { useEffect, useRef, useState } from 'react';
import { Search, Bell, CircleHelp, Menu, X, ArrowUpRight } from 'lucide-react';
import { ROLES } from '@/types/permissions';
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
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (role: RoleName) => void;
  notifications: { id: number; text: string }[];
  onOpenGuide: () => void;
  destinations: SearchDestination[];
  onDestination: (destination: SearchDestination) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TopBar({ activeRole, searchQuery, onSearchChange, onRoleChange, notifications, onOpenGuide, destinations, onDestination, menuOpen, onToggleMenu }: TopBarProps) {
  const [panel, setPanel] = useState<'search' | 'notifications' | null>(null);
  const controls = useRef<HTMLElement>(null);
  const query = normalize(searchQuery.trim());
  const matches = destinations.filter(item => normalize(item.label + ' ' + item.detail).includes(query)).slice(0, 8);

  useEffect(() => { setPanel(null); }, [activeRole]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!controls.current?.contains(event.target as Node)) setPanel(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPanel(null); };
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
    <div className="topbar-logo"><div className="logo-mark">E</div><div className="logo-text"><span className="brand">ESCEN</span><span className="tagline">Gestion de l’établissement</span></div></div>
    <div className="topbar-center">
      <div className="search-box">
        <Search size={17} className="search-icon" />
        <input type="search" className="search-input" aria-label="Rechercher une page ou un dossier autorisé" placeholder="Rechercher une page ou un étudiant…" value={searchQuery} onFocus={() => setPanel('search')} onChange={event => { onSearchChange(event.target.value); setPanel('search'); }} onKeyDown={event => { if (event.key === 'Enter' && query && matches[0]) { event.preventDefault(); choose(matches[0]); } }} />
        {panel === 'search' && query && <div className="header-popover search-results" aria-label="Résultats de recherche">
          <div className="popover-heading">Dans votre périmètre</div>
          {matches.length ? matches.map(item => <button key={item.id} className="search-result" onClick={() => choose(item)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={16} /></button>) : <div className="empty-state"><strong>Aucun résultat</strong><span>Essayez un nom, un matricule ou le titre d’une page.</span></div>}
        </div>}
      </div>
    </div>
    <div className="topbar-right">
      <div className="role-switcher" data-tour="role-switcher"><span className="role-dot" style={{ backgroundColor: ROLE_COLORS[activeRole] }} /><label htmlFor="active-role">Rôle de démo</label><select id="active-role" className="role-select" value={activeRole} onChange={event => onRoleChange(event.target.value as RoleName)}>{Object.values(ROLES).map(role => <option key={role} value={role}>{role}</option>)}</select></div>
      <button className="notif-btn" aria-label="Revoir le guide du rôle" title="Guide du rôle" onClick={onOpenGuide}><CircleHelp size={19} /></button>
      <div className="notification-control">
        <button className="notif-btn" aria-label={`Notifications : ${notifications.length}`} aria-expanded={panel === 'notifications'} onClick={() => setPanel(current => current === 'notifications' ? null : 'notifications')}><Bell size={18} />{notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}</button>
        {panel === 'notifications' && <section className="header-popover notification-panel" aria-label="Notifications"><div className="popover-heading">Notifications de la session</div>{notifications.length ? <ul>{notifications.map(item => <li key={item.id}>{item.text}</li>)}</ul> : <div className="empty-state"><strong>Vous êtes à jour</strong><span>Aucune notification pour ce rôle.</span></div>}</section>}
      </div>
    </div>
  </header>;
}
