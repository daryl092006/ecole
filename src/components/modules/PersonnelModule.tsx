import type { DemoUser } from '@/types/user';
import type { RoleName } from '@/types';
import { usePortal } from '@/hooks/usePortal';
import UserDirectoryPanel from './personnel/UserDirectoryPanel';
import RolesPermissionsPanel from './personnel/RolesPermissionsPanel';

interface Props {
  currentSubTab: string;
  users: DemoUser[];
  addUser: (name: string, email: string, role: RoleName) => void;
  toggleUser: (id: string, reason: string) => void;
  changeUserRole: (id: string, role: RoleName, reason: string) => void;
}

export default function PersonnelModule({ currentSubTab, users, addUser, toggleUser, changeUserRole }: Props) {
  const portal = usePortal();
  if (currentSubTab === 'staff_roles' || currentSubTab === 'staff_permissions') {
    return <RolesPermissionsPanel key={currentSubTab + portal.activeRole} mode={currentSubTab === 'staff_roles' ? 'roles' : 'permissions'} users={users} actor={portal.activeRole} />;
  }
  return <UserDirectoryPanel key={portal.activeRole} users={users} actor={portal.activeRole} addUser={addUser} toggleUser={toggleUser} changeUserRole={changeUserRole} />;
}
