import { ShieldCheck } from 'lucide-react';
import type { RoleName } from '@/types';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';

interface RoleScopeBannerProps {
  role: RoleName;
}

function describeScope(role: RoleName) {
  const scope = ROLE_ACCESS[role].scope;
  if (scope.ownDataOnly) return 'Données personnelles uniquement';
  if (scope.teacherId) return `Enseignements affectés · ${scope.groupIds?.length ?? 0} groupe(s)`;
  if (scope.sessionIds) return `${scope.sessionIds.length} séance(s) affectée(s)`;
  return 'Périmètre institutionnel selon les permissions';
}

export default function RoleScopeBanner({ role }: RoleScopeBannerProps) {
  const access = ROLE_ACCESS[role];
  return (
    <div className="role-scope-banner">
      <ShieldCheck size={18} />
      <div>
        <strong>{role}</strong>
        <span>{access.description} · {describeScope(role)}</span>
      </div>
      <span className="role-permission-count">{access.permissions.length} permission(s)</span>
    </div>
  );
}
