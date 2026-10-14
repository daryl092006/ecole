import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RoleName } from '@/types/permissions';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ICONS: Record<string, LucideIcon> = {
  BarChart2: Icons.BarChart2,
  BookOpen: Icons.BookOpen,
  CreditCard: Icons.CreditCard,
  GraduationCap: Icons.GraduationCap,
  Home: Icons.Home,
  Megaphone: Icons.Megaphone,
  Settings: Icons.Settings,
  Users: Icons.Users,
  Package: Icons.Package,
};

interface SubTab {
  id: string;
  name: string;
  href: string;
}

interface Tab {
  id: string;
  name: string;
  icon: string;
  href: string;
  subTabs?: SubTab[];
}

interface SidebarProps {
  availableTabs: Tab[];
  currentTab: string;
  currentSubTab: string;
  activeRole: RoleName;
  onNavigate: () => void;
  menuOpen: boolean;
}

export default function Sidebar({
  availableTabs,
  currentTab,
  currentSubTab,
  activeRole,
  onNavigate,
  menuOpen,
}: SidebarProps) {
  const [expandedTab, setExpandedTab] = useState(currentTab);
  useEffect(() => { setExpandedTab(currentTab); }, [currentTab, activeRole]);
  return (
    <aside className="sidebar" id="application-navigation" aria-label="Navigation principale" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined}>
      <div className="sidebar-heading"><div className="nav-section-title">Navigation</div><button className="notif-btn sidebar-close" aria-label="Fermer le menu" onClick={onNavigate}><Icons.X size={20} /></button></div>

      <div className="nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {availableTabs.map(tab => {
          // Résolution dynamique de l'icône Lucide
          const IconComponent = NAV_ICONS[tab.icon] ?? Icons.HelpCircle;
          const isSelected = currentTab === tab.id;
          const isExpanded = expandedTab === tab.id;

          return (
            <div key={tab.id} className="nav-group">
              <div className="nav-group-heading">
                <Link
                  href={tab.href}
                  aria-current={isSelected && (!tab.subTabs?.length || currentSubTab === tab.subTabs[0].id) ? 'page' : undefined}
                  className={`nav-item ${isSelected ? 'active' : ''}`}
                  onClick={() => { setExpandedTab(tab.id); onNavigate(); }}
                  style={{ width: '100%' }}
                >
                  <IconComponent size={16} className="nav-icon" />
                  <span style={{ flex: 1 }}>{tab.name}</span>
                </Link>
                {tab.subTabs && tab.subTabs.length > 0 && (
                  <button type="button" className="nav-toggle" aria-label={`${isExpanded ? 'Replier' : 'Déplier'} ${tab.name}`} aria-expanded={isExpanded} aria-controls={`subnav-${tab.id}`} onClick={() => setExpandedTab(isExpanded ? '' : tab.id)}>
                    <Icons.ChevronDown
                      size={14}
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        opacity: 0.6,
                      }}
                    />
                  </button>
                )}
              </div>

              {/* Déplier une rubrique ne change pas la page courante. */}
              {isExpanded && tab.subTabs && tab.subTabs.length > 0 && (
                <div
                  id={`subnav-${tab.id}`}
                  className="subnav-list"
                  style={{
                    paddingLeft: '2rem',
                    marginTop: '0.25rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                    borderLeft: '1px solid var(--border-strong)',
                    marginLeft: '1.2rem',
                  }}
                >
                  {tab.subTabs.map(sub => (
                    <Link
                      href={sub.href}
                      key={sub.id}
                      aria-current={isSelected && currentSubTab === sub.id ? 'page' : undefined}
                      className={`subnav-item ${isSelected && currentSubTab === sub.id ? 'active' : ''}`}
                      onClick={onNavigate}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isSelected && currentSubTab === sub.id ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected && currentSubTab === sub.id ? 600 : 400,
                        textAlign: 'left',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
