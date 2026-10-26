import SecondaryDetails from '@/components/ui/SecondaryDetails';
import DrawerActions from '@/components/ui/DrawerActions';
import IconButton from '@/components/ui/IconButton';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewedForm from '@/components/ui/ReviewedForm';
import type { RoleName } from '@/types';
import type { DemoUser } from '@/types/user';
import { ROLES } from '@/types/permissions';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
import { queryDemoUsers, assignableUserRoles, canAdministerUser } from '@/services/userService';
import { updatePersistentAccount } from '@/services/remoteCampusService';
import { usePortal } from '@/hooks/usePortal';
import WorkPage from '@/components/ui/WorkPage';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import RolePermissionDetails from './RolePermissionDetails';
import { getRolePermissionSummary } from '@/services/permissionCatalogService';
interface Props { users: DemoUser[]; actor: RoleName; addUser?: (name: string, email: string, role: RoleName) => void; toggleUser?: (id: string, reason: string) => void; changeUserRole?: (id: string, role: RoleName, reason: string) => void; category?: 'staff' | 'student'; }
const rolesFor = (user: DemoUser) => user.roles ?? (user.role ? [user.role] : []);
const permissionsFor = (user: DemoUser) => new Set(rolesFor(user).flatMap(role => ROLE_ACCESS[role].permissions)).size;
export default function UserDirectoryPanel({ users, actor, category = 'staff' }: Props) {
  const portal = usePortal(); const router = useRouter();
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [kind, setKind] = useState<'staff' | 'student' | 'unclassified'>(category);
  useEffect(() => { setKind(new URL(window.location.href).searchParams.get('categorie') === 'unclassified' ? 'unclassified' : category); }, [category]);
  const [selected, setSelected] = useState<DemoUser | null>(null);
  const [action, setAction] = useState<'details' | 'role' | 'activate' | 'deactivate' | 'archive'>('details');
  const [target, setTarget] = useState<RoleName>(ROLES.STG);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const categorized = users.filter(user => (user.kind ?? 'unclassified') === kind);
  const filtered = queryDemoUsers(categorized, actor, filters);
  const label = kind === 'student' ? 'Comptes étudiants' : kind === 'staff' ? 'Comptes du personnel' : 'Comptes à classer';
  const open = (user: DemoUser, operation: typeof action) => { setSelected(user); setAction(operation); setTarget(user.role ?? ROLES.STG); setReason(''); setError(''); };
  return <div className="directory-workspace">
    <div className="page-intro"><div><span className="page-eyebrow">GESTION DES ACCÈS</span><h1>{label}</h1><p>Les identités étudiantes et les comptes du personnel sont gérés séparément.</p></div></div>
    <div className="directory-switch" aria-label="Catégorie de comptes">{(['staff', 'student', 'unclassified'] as const).map(value => <button className={kind === value ? 'selected' : ''} key={value} aria-pressed={kind === value} onClick={() => { setKind(value); router.push(value === 'student' ? '/etudiants/comptes' : '/personnel/utilisateurs' + (value === 'unclassified' ? '?categorie=unclassified' : '')); setFilters({ search: '', role: '', status: '' }); setSelected(null); }}><span>{value === 'staff' ? 'Personnel' : value === 'student' ? 'Étudiants' : 'À classer'}</span><strong>{users.filter(user => (user.kind ?? 'unclassified') === value).length}</strong></button>)}</div>
    <div className="card card-full"><div className="directory-toolbar"><label>Rechercher<input className="input" type="search" placeholder="Nom, email ou rôle" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label><label>Rôle<select className="select-input" value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })}><option value="">Tous les rôles</option>{Object.values(ROLES).map(role => <option key={role}>{role}</option>)}</select></label><label>Accès<select className="select-input" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Tous les accès</option><option value="ACTIF">Actifs</option><option value="INACTIF">Désactivés</option></select></label></div>
      <div className="card-header"><h2>Annuaire ({filtered.length} / {categorized.length})</h2><span className="cell-sub">{categorized.filter(user => user.active).length} accès actif(s)</span></div>
      <ResponsiveTable className="data-table"><thead><tr><th>Identité</th><th>Rôles et accès</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{filtered.map(user => <tr key={user.id} className="ledger-item"><td><strong>{user.name}</strong><div className="cell-sub">{user.email || 'Email non renseigné'}</div></td><td><div className="account-roles">{rolesFor(user).map(role => <span className="account-role" key={role}>{role}</span>)}</div>{!rolesFor(user).length && <span>Aucun rôle attribué</span>}<div className="cell-sub">{permissionsFor(user)} permission(s)</div></td><td><span className={`pill ${user.active ? 'pill-success' : 'pill-default'}`}>{user.active ? 'Actif' : 'Désactivé'}</span></td><td><div className="btn-group"><IconButton className="btn btn-sm btn-outline" onClick={() => open(user, 'details')} label="Voir les accès" />{portal.globalAccess && portal.perms.permissions.includes('user.manage') && canAdministerUser(user, actor) && user.id !== portal.session?.accountId && <IconButton className="btn btn-sm btn-outline" onClick={() => open(user, 'role')} label="Gérer" />}</div></td></tr>)}{!filtered.length && <tr><td colSpan={4}>Aucun compte dans cette catégorie pour les filtres choisis.</td></tr>}</tbody></ResponsiveTable>
    </div>
    {selected && <WorkPage busy={saving} title={selected.name} onClose={() => setSelected(null)}><p>{selected.email}</p><div className="btn-group mt-2">{portal.globalAccess && portal.perms.permissions.includes('user.manage') && canAdministerUser(selected, actor) && selected.id !== portal.session?.accountId && <><button className="btn btn-outline" onClick={() => setAction('role')}>Changer le rôle</button><button className="btn btn-outline" onClick={() => setAction(selected.active ? 'deactivate' : 'activate')}>{selected.active ? 'Désactiver' : 'Activer'}</button><button className="btn btn-outline" onClick={() => setAction('archive')}>Retirer le compte</button></>}</div>
      {action !== 'details' && <ReviewedForm key={action} className="account-action-form" busy={saving} error={error} danger={action==='archive' || action==='deactivate'} confirmLabel={action==='role'?'Confirmer le rôle':action==='activate'?'Confirmer l’activation':action==='deactivate'?'Confirmer la désactivation':'Confirmer le retrait'} fields={[{label:'Compte',value:selected.name+' · '+selected.email},{label:'Action',value:action==='role'?'Changer le rôle principal':action==='activate'?'Activer':action==='deactivate'?'Désactiver':'Retirer de l’annuaire'},...(action==='role'?[{label:'Rôle principal',previous:selected.role || 'Aucun rôle',value:target},{label:'Permissions du rôle choisi',value:getRolePermissionSummary(target,actor).count+' permission(s)'}]:[]),{label:'Motif',value:reason}]} consequence={action==='role'?'Les droits du rôle principal seront remplacés par ceux du rôle choisi. Les autres rôles attribués restent conservés. Cette opération sera auditée.':action==='activate'?'Le compte sera activé. Une identité Auth et une attribution de rôle valides restent nécessaires pour accéder à la plateforme.':'L’accès de ce compte sera révoqué. Les dossiers, anciennes opérations et traces d’audit resteront conservés.'} onConfirm={event => { event.preventDefault(); setSaving(true); setError(''); void updatePersistentAccount(selected.id, { action, reason, ...(action === 'role' ? { role: target, previousRole: selected.role } : {}) }, actor).then(() => { portal.reportActionOutcome({title:'Compte mis à jour',detail:selected.name+' : '+(action==='role'?'rôle principal modifié. Vérifiez les droits attribués dans la fiche du compte.':action==='activate'?'accès activé. Vérifiez son rôle et sa liaison de connexion.':action==='deactivate'?'accès désactivé. Les opérations historiques restent conservées.':'compte retiré de l’annuaire. Les anciennes opérations restent conservées.')}); setSelected(null); portal.refreshCampus(); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Modification impossible.')).finally(() => setSaving(false)); }}>
        <h3>{action === 'archive' ? 'Retirer définitivement ce compte des annuaires' : action === 'role' ? 'Modifier le rôle principal' : action === 'activate' ? 'Réactiver l’accès' : 'Désactiver l’accès'}</h3>
        {action === 'archive' && <p>L’accès sera révoqué. Les anciennes opérations et les traces d’audit seront conservées.</p>}
        {action === 'role' && <label>Rôle principal<select className="select-input" value={target} onChange={event => setTarget(event.target.value as RoleName)}>{assignableUserRoles(actor).map(role => <option key={role}>{role}</option>)}</select></label>}
        <label>Motif<textarea className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><DrawerActions><button className="btn btn-primary" disabled={saving}>Vérifier les changements</button></DrawerActions>{error && <p role="alert">{error}</p>}
      </ReviewedForm>}
      {rolesFor(selected).map(role => <SecondaryDetails className="mt-2" key={role} title={role}><RolePermissionDetails summary={getRolePermissionSummary(role, actor)} /></SecondaryDetails>)}
    </WorkPage>}
  </div>;
}
