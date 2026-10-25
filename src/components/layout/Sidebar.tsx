import { getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Globe,
  CalendarDays,
  ClipboardCheck,
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
  Globe,
  CalendarDays,
  ClipboardCheck,
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

export default function Sidebar({
  availableTabs,
  currentSubTab,
  activeRole,
  onNavigate,
  menuOpen,
}: SidebarProps) {
  const groups = getWorkspaceNavigation(availableTabs, { hideStudentPersonalPages: true });
  const activeGroup = groups.find(group => group.sections.includes(currentSubTab))?.id || '';
  const [expanded, setExpanded] = useState<string[]>(activeGroup ? [activeGroup] : []);

  useEffect(() => {
    setExpanded(previous => activeGroup && !previous.includes(activeGroup) ? [...previous, activeGroup] : previous);
  }, [activeGroup, currentSubTab, activeRole]);

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
        {Array.from(new Set(groups.map(group => group.category))).map(category => (
          <div className="sidebar-section" key={category}>
            <div className="nav-section-title">{category}</div>
            {groups.filter(group => group.category === category).map(group => {
              const Icon = ICONS[group.icon] || HelpCircle;
              const isExpanded = expanded.includes(group.id);
              const isActive = activeGroup === group.id;
              const isSingleDirect = group.pages.length === 1 && group.pages[0].name === group.name;
              if (isSingleDirect) {
                const page = group.pages[0];
                return <div className="nav-group" key={group.id}>
                  <div className="nav-group-heading">
                    <Link href={page.href}
                      className={`nav-item ${currentSubTab === page.id ? 'active' : ''}`}
                      aria-current={currentSubTab === page.id ? 'page' : undefined}
                      onClick={onNavigate}>
                      <Icon size={18} /><span>{group.name}</span>
                    </Link>
                  </div>
                </div>;
              }
              return <div className="nav-group" key={group.id}>
                <div className="nav-group-heading">
                  <button type="button" className={`nav-item ${isActive ? 'active' : ''}`}
                    aria-label={`${isExpanded ? 'Replier' : 'Déplier'} ${group.name}`}
                    aria-expanded={isExpanded} aria-controls={`subnav-${group.id}`}
                    onClick={() => setExpanded(previous => previous.includes(group.id) ? previous.filter(id => id !== group.id) : [...previous, group.id])}>
                    <Icon size={18} /><span>{group.name}</span>
                    <ChevronDown size={16} className={isExpanded ? 'rotated' : ''} />
                  </button>
                </div>
                {isExpanded && <div className="subnav-list" id={`subnav-${group.id}`}>
                  {group.pages.map(page => <Link key={page.id} href={page.href}
                    className={`subnav-item ${currentSubTab === page.id ? 'active' : ''}`}
                    aria-current={currentSubTab === page.id ? 'page' : undefined}
                    onClick={onNavigate}>{page.name}</Link>)}
                </div>}
              </div>;
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
