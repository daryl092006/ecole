import { MODULE_JOURNEYS } from '@/data/moduleJourneys';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  CreditCard,
  GraduationCap,
  Home,
  Megaphone,
  Settings,
  Users,
  Package,
  ChevronDown,
  X,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { type RoleName } from '@/types/permissions';

const ICONS: Record<string, LucideIcon> = {
  BarChart2,
  BookOpen,
  CreditCard,
  GraduationCap,
  Home,
  Megaphone,
  Settings,
  Users,
  Package,
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

const NAV_GROUPS = [
  { label: 'VOTRE ESPACE', ids: ['espace', 'dashboard_global'] },
  { label: 'ÉTABLISSEMENT', ids: ['etudiants', 'academique', 'finance', 'personnel', 'logistique', 'marketing'] },
  { label: 'ADMINISTRATION', ids: ['systeme'] },
];

export default function Sidebar({
  availableTabs,
  currentTab,
  currentSubTab,
  activeRole,
  onNavigate,
  menuOpen,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(currentTab);

  useEffect(() => {
    setExpanded(currentTab);
  }, [currentTab, currentSubTab, activeRole]);

  return (
    <aside
      className="sidebar"
      id="application-navigation"
      aria-label="Navigation principale"
      role={menuOpen ? 'dialog' : undefined}
      aria-modal={menuOpen || undefined}
    >
      <div className="sidebar-heading">
        <button
          className="notif-btn sidebar-close"
          aria-label="Fermer le menu"
          onClick={onNavigate}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="nav-list" aria-label="Rubriques">
        {NAV_GROUPS.map(group => {
          const tabs = group.ids.flatMap(id =>
            availableTabs.filter(tab => tab.id === id)
          );
          if (!tabs.length) return null;

          return (
            <div className="sidebar-section" key={group.label}>
              <div className="nav-section-title">{group.label}</div>
              {tabs.map(tab => {
                const Icon = ICONS[tab.icon] || HelpCircle;
                const isTabActive = currentTab === tab.id;
                const isExpanded = expanded === tab.id;
                const hasSubTabs = !!tab.subTabs?.length;
                const stages = MODULE_JOURNEYS[tab.id] || [
                  {
                    title: '',
                    description: '',
                    sections: tab.subTabs?.map(item => item.id) || [],
                  },
                ];

                return (
                  <div className="nav-group" key={tab.id}>
                    <div className="nav-group-heading">
                      <Link
                        href={tab.href}
                        className={`nav-item ${isTabActive ? 'active' : ''}`}
                        onClick={onNavigate}
                        aria-current={isTabActive ? 'location' : undefined}
                      >
                        <Icon size={18} />
                        <span>{tab.name}</span>
                      </Link>

                      {hasSubTabs && (
                        <button
                          type="button"
                          className="nav-toggle"
                          aria-label={`${isExpanded ? 'Replier' : 'Déplier'} ${tab.name}`}
                          aria-expanded={isExpanded}
                          aria-controls={`subnav-${tab.id}`}
                          onClick={() => setExpanded(value => (value === tab.id ? '' : tab.id))}
                        >
                          <ChevronDown
                            size={16}
                            className={isExpanded ? 'rotated' : ''}
                          />
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="subnav-list" id={`subnav-${tab.id}`}>
                        {stages.map(stage => {
                          const pages = stage.sections.flatMap(id =>
                            tab.subTabs?.filter(item => item.id === id) || []
                          );
                          if (!pages.length) return null;

                          return (
                            <div
                              key={stage.title || tab.id}
                              className="subnav-stage"
                            >
                              {stage.title && (
                                <span className="subnav-stage-label">
                                  {stage.title}
                                </span>
                              )}
                              {pages.map(section => {
                                const isSubActive =
                                  isTabActive && currentSubTab === section.id;
                                return (
                                  <Link
                                    key={section.id}
                                    href={section.href}
                                    className={`subnav-item ${isSubActive ? 'active' : ''}`}
                                    aria-current={isSubActive ? 'page' : undefined}
                                    onClick={onNavigate}
                                  >
                                    {section.name}
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
