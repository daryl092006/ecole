import { getWorkspaceNavigation } from '@/constants/workspaceNavigation';
import Link from 'next/link';
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
  onNavigate,
  menuOpen,
}: SidebarProps) {
  const groups = getWorkspaceNavigation(availableTabs, { hideStudentPersonalPages: true });
  const currentSection = ['acad_resits', 'acad_assessments'].includes(currentSubTab) ? 'acad_exams' : currentSubTab;
  const activeGroup = groups.find(group => group.sections.includes(currentSection))?.id || '';

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
              const isActive = activeGroup === group.id;
              const landingSection = group.id === 'home' ? 'espace_dashboard' : group.id === 'results' ? 'acad_exams' : group.sections[0];
              const destination = group.pages.find(page => page.id === landingSection) || group.pages[0];
              return <div className="nav-group" key={group.id}>
                <Link href={destination.href} className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-current={currentSection === destination.id ? 'page' : isActive ? 'location' : undefined} onClick={onNavigate}>
                  <Icon size={18} /><span>{group.name}</span>
                </Link>
                {isActive && group.pages.length > 1 && <div className="subnav-list">
                  {group.pages.filter(page => page.id !== destination.id).map(page => <Link key={page.id} href={page.href}
                    className={`subnav-item ${currentSection === page.id ? 'active' : ''}`}
                    aria-current={currentSection === page.id ? 'page' : undefined} onClick={onNavigate}>{page.name}</Link>)}
                </div>}
              </div>;
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
