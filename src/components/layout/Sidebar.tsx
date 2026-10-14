import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart2, BookOpen, CreditCard, GraduationCap, Home, Megaphone, Settings, Users, Package, ChevronDown, X, HelpCircle, type LucideIcon } from 'lucide-react';
import { type RoleName } from '@/types/permissions';
const icons: Record<string, LucideIcon> = { BarChart2, BookOpen, CreditCard, GraduationCap, Home, Megaphone, Settings, Users, Package };
interface Tab { id: string; name: string; icon: string; href: string; subTabs?: { id: string; name: string; href: string }[]; }
interface Props { availableTabs: Tab[]; currentTab: string; currentSubTab: string; activeRole: RoleName; onNavigate: () => void; menuOpen: boolean; }
export default function Sidebar({ availableTabs, currentTab, currentSubTab, activeRole, onNavigate, menuOpen }: Props) {
  const [expanded, setExpanded] = useState(currentTab);
  useEffect(() => { setExpanded(currentTab); }, [currentTab, activeRole]);
  const groups = [{ label: 'VOTRE ESPACE', ids: ['espace', 'dashboard_global'] }, { label: 'ÉTABLISSEMENT', ids: ['etudiants', 'academique', 'finance', 'personnel', 'logistique', 'marketing'] }, { label: 'ADMINISTRATION', ids: ['systeme'] }];
  return <aside className="sidebar" id="application-navigation" aria-label="Navigation principale" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined}>
    <div className="sidebar-heading"><div className="sidebar-brand"><span>E</span><div>ESCEN<small>Gestion universitaire</small></div></div><button className="notif-btn sidebar-close" aria-label="Fermer le menu" onClick={onNavigate}><X size={20} /></button></div>
    <div className="nav-list">{groups.map(group => { const tabs = group.ids.flatMap(id => availableTabs.filter(tab => tab.id === id)); return tabs.length ? <div className="sidebar-section" key={group.label}><div className="nav-section-title">{group.label}</div>{tabs.map(tab => {
      const Icon = icons[tab.icon] || HelpCircle;
      return <div className="nav-group" key={tab.id}>
        <div className="nav-group-heading">
          <Link href={tab.href} className={`nav-item ${currentTab === tab.id ? 'active' : ''}`} onClick={onNavigate} aria-current={currentTab === tab.id ? 'location' : undefined}><Icon size={18} /><span>{tab.name}</span></Link>
          {!!tab.subTabs?.length && <button type="button" className="nav-toggle" aria-label={`${expanded === tab.id ? 'Replier' : 'Déplier'} ${tab.name}`} aria-expanded={expanded === tab.id} aria-controls={`subnav-${tab.id}`} onClick={() => setExpanded(value => value === tab.id ? '' : tab.id)}><ChevronDown size={16} className={expanded === tab.id ? 'rotated' : ''} /></button>}
        </div>
        {expanded === tab.id && <div className="subnav-list" id={`subnav-${tab.id}`}>{tab.subTabs?.map(section => <Link key={section.id} href={section.href} className={`subnav-item ${currentTab === tab.id && currentSubTab === section.id ? 'active' : ''}`} aria-current={currentTab === tab.id && currentSubTab === section.id ? 'page' : undefined} onClick={onNavigate}>{section.name}</Link>)}</div>}
      </div>;
    })}</div> : null; })}</div>
    <div className="sidebar-footer"><ShieldLabel role={activeRole} /></div>
  </aside>;
}
function ShieldLabel({ role }: { role: RoleName }) { return <><span className="sidebar-online" /> Accès connecté<small>{role}</small></>; }
