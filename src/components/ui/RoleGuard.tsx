import { ShieldAlert } from 'lucide-react';
import type { PermissionSchema } from '@/types';

interface RoleGuardProps {
  tab: string;
  perms: PermissionSchema;
  children: React.ReactNode;
}

/**
 * RoleGuard — Bloque l'affichage d'un module si le rôle actif
 * n'a pas accès à l'onglet correspondant.
 */
export default function RoleGuard({ tab, perms, children }: RoleGuardProps) {
  if (!perms.allowedTabs.includes(tab)) {
    return (
      <div className="module-header">
        <div className="restricted-box" style={{ marginTop: 0 }}>
          <ShieldAlert size={20} />
          <div>
            <strong>Accès refusé</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Votre rôle actuel ne vous permet pas d&apos;accéder au module &ldquo;{tab}&rdquo;.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
