import { ShieldCheck } from 'lucide-react';
import type { RoleName } from '@/types';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';

interface RoleScopeBannerProps {
  role: RoleName;
}

function describeScope(role: RoleName) {
  const scope = ROLE_ACCESS[role].scope;
  if (scope.ownDataOnly) return 'Données personnelles uniquement';
  if (role === ROLES.ENS) return 'Enseignements et groupes affectés à l’identité sélectionnée';
  if (role === ROLES.SURV) return 'Séances affectées à l’identité sélectionnée';
  return 'Périmètre institutionnel selon les permissions';
}

export default function RoleScopeBanner({ role }: RoleScopeBannerProps) {
  const access = ROLE_ACCESS[role];
  return (
    <details className="role-scope-banner">
      <summary><ShieldCheck size={14} /><span>Périmètre d’accès</span></summary>
      <div>
        <strong>{role}</strong>
        <span>{access.description} · {describeScope(role)}</span>
      </div>
    </details>
  );
}
