import ActionPanel from '@/components/ui/ActionPanel';
import { useRef, useState } from 'react';
import type { RoleName } from '@/types';
import type { DemoUser } from '@/types/user';
import { ROLES } from '@/types/permissions';
import { assignableUserRoles, canAdministerUser, queryDemoUsers } from '@/services/userService';
import { getRolePermissionSummary } from '@/services/permissionCatalogService';
import { useFeedback } from '@/hooks/useFeedback';
import FormFeedback from '@/components/ui/FormFeedback';
import RolePermissionDetails from './RolePermissionDetails';

interface Props {
  users: DemoUser[]; actor: RoleName;
  addUser: (name: string, email: string, role: RoleName) => void;
  toggleUser: (id: string, reason: string) => void;
  changeUserRole: (id: string, role: RoleName, reason: string) => void;
}
const auditLabel = (value: string | null) => value === null ? 'Création' : value === 'true' ? 'Actif' : value === 'false' ? 'Désactivé' : value;

export default function UserDirectoryPanel({ users, actor, addUser, toggleUser, changeUserRole }: Props) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState<RoleName>(ROLES.STG);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [selectedId, setSelectedId] = useState(''); const [operation, setOperation] = useState<'details' | 'status' | 'role'>('details');
  const [target, setTarget] = useState<RoleName>(ROLES.STG); const [reason, setReason] = useState('');
  const [feedback, setFeedback, feedbackError] = useFeedback(); const [actionFeedback, setActionFeedback, actionError] = useFeedback();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const allowedRoles = assignableUserRoles(actor);
  const filtered = queryDemoUsers(users, actor, filters);
  const selected = users.find(user => user.id === selectedId);
  const selectUser = (user: DemoUser, action: typeof operation) => {
    setSelectedId(user.id); setOperation(action); setTarget(user.role); setReason(''); setActionFeedback('');
    requestAnimationFrame(() => detailHeading.current?.focus());
  };
  return <div>
    <div className="module-header"><h1>Utilisateurs et rôles</h1></div>
    <div className="metrics-grid">{[{ label: 'Utilisateurs', value: users.length }, { label: 'Actifs', value: users.filter(user => user.active).length }, { label: 'Désactivés', value: users.filter(user => !user.active).length }, { label: 'Rôles attribués', value: new Set(users.map(user => user.role)).size }].map(metric => <div className="metric-card" key={metric.label}><div><div className="metric-value">{metric.value}</div><div className="metric-label">{metric.label}</div></div></div>)}</div>
    <ActionPanel label="Nouvel utilisateur"><form className="action-form" onSubmit={event => { event.preventDefault(); try { addUser(name, email, role); setName(''); setEmail(''); setRole(ROLES.STG); setFeedback('Utilisateur créé.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Création impossible.', true); } }}>
      <div className="form-grid"><label className="form-group">Nom<input className="input" required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label><label className="form-group">Email<input className="input" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label><label className="form-group">Rôle<select className="select-input" value={role} onChange={event => setRole(event.target.value as RoleName)}>{allowedRoles.map(value => <option key={value}>{value}</option>)}</select></label></div>
      <p className="cell-sub mb-2">{getRolePermissionSummary(role, actor).scope}</p><button className="btn btn-primary">Ajouter l’utilisateur</button><FormFeedback message={feedback} error={feedbackError} />
    </form></ActionPanel>
    <div className="card card-full"><h2>Annuaire ({filtered.length} / {users.length})</h2><div className="form-row filter-grid mt-2"><label className="form-group">Rechercher<input className="input" type="search" placeholder="Nom, email ou rôle" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label><label className="form-group">Filtrer par rôle<select className="select-input" value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })}><option value="">Tous les rôles</option>{Object.values(ROLES).map(value => <option key={value}>{value}</option>)}</select></label><label className="form-group">Statut des utilisateurs<select className="select-input" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Tous les statuts</option><option value="ACTIF">Actifs</option><option value="INACTIF">Désactivés</option></select></label></div>
      <button className="btn btn-outline mt-2 mb-2" onClick={() => setFilters({ search: '', role: '', status: '' })}>Réinitialiser les filtres</button>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Dernière modification</th><th>Actions</th></tr></thead><tbody>{filtered.map(user => <tr className="ledger-item" key={user.id}><td><strong>{user.name}</strong><div className="cell-sub">{user.email}</div></td><td>{user.role}<div className="cell-sub">{getRolePermissionSummary(user.role, actor).count} permission(s)</div></td><td><span className={`pill ${user.active ? 'pill-success' : 'pill-default'}`}>{user.active ? 'Actif' : 'Désactivé'}</span></td><td>{user.history.length ? <><time dateTime={user.history.at(-1)!.date}>{new Date(user.history.at(-1)!.date).toLocaleDateString('fr-FR')}</time><div className="cell-sub">{user.history.at(-1)!.actor}</div></> : '—'}</td><td><div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => selectUser(user, 'details')}>Voir les accès</button>{canAdministerUser(user, actor) && <><button className="btn btn-sm btn-outline" onClick={() => selectUser(user, 'role')}>Changer le rôle</button><button className="btn btn-sm btn-outline" onClick={() => selectUser(user, 'status')}>{user.active ? 'Désactiver' : 'Activer'}</button></>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={5}>{users.length ? 'Aucun utilisateur ne correspond à ces filtres.' : 'Aucun utilisateur. Ajoutez les comptes nécessaires aux parcours de l’établissement.'}</td></tr>}</tbody></table></div>
    </div>
    {selected && <section className="card card-full mt-2"><div className="card-header"><h2 ref={detailHeading} tabIndex={-1}>Accès de {selected.name}</h2><button className="btn btn-outline" onClick={() => setSelectedId('')}>Fermer les détails</button></div><p>{selected.email} · {selected.role} · {selected.active ? 'Actif' : 'Désactivé'}</p>
      {operation !== 'details' && canAdministerUser(selected, actor) && <form className="mt-2 mb-2" onSubmit={event => {
        event.preventDefault(); try {
          if (operation === 'role') changeUserRole(selected.id, target, reason); else toggleUser(selected.id, reason);
          setOperation('details'); setReason(''); setActionFeedback(operation === 'role' ? 'Rôle modifié. L’ancienne attribution et le motif sont conservés.' : 'Statut de l’utilisateur mis à jour.');
        } catch (error) { setActionFeedback(error instanceof Error ? error.message : 'Modification impossible.', true); }
      }}><h3>{operation === 'role' ? 'Modifier l’attribution du rôle' : selected.active ? 'Désactiver l’accès' : 'Réactiver l’accès'}</h3>
        {operation === 'role' && <label className="form-group">Nouveau rôle<select className="select-input" value={target} onChange={event => setTarget(event.target.value as RoleName)}>{allowedRoles.map(value => <option key={value}>{value}</option>)}</select></label>}
        <label className="form-group mt-2">{operation === 'role' ? 'Motif du changement de rôle' : 'Motif du changement'}<textarea autoFocus className="input" required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="btn-group mt-2"><button className="btn btn-primary" disabled={operation === 'role' && target === selected.role}>{operation === 'role' ? 'Confirmer le rôle' : 'Confirmer'}</button><button className="btn btn-outline" type="button" onClick={() => { setOperation('details'); setActionFeedback(''); }}>Annuler</button></div>
      </form>}
      <FormFeedback message={actionFeedback} error={actionError} /><details className="context-details"><summary>Droits du rôle ({getRolePermissionSummary(selected.role, actor).count})</summary><RolePermissionDetails summary={getRolePermissionSummary(selected.role, actor)} /></details>
      <details className="mt-2"><summary>Historique des accès ({selected.history.length})</summary>{selected.history.map((entry, index) => <article className="access-history-entry" key={index}><strong>{auditLabel(entry.oldValue)} → {auditLabel(entry.newValue)}</strong><p>{entry.reason}</p><p className="cell-sub">{new Date(entry.date).toLocaleString('fr-FR')} · {entry.actor}{entry.role ? ` · ${entry.role}` : ''}</p></article>)}</details>
    </section>}
  </div>;
}
