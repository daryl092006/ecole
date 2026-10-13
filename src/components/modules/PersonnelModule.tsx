import { useState } from 'react';
import type { DemoUser } from '@/types/user';
import type { RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { ROLE_ACCESS } from '@/permissions/rolePermissions';
interface Props { currentSubTab: string; users: DemoUser[]; addUser: (name: string, email: string, role: RoleName) => void; toggleUser: (id: string, reason: string) => void; }
export default function PersonnelModule({ currentSubTab, users, addUser, toggleUser }: Props) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState<RoleName>(ROLES.STG); const [feedback, setFeedback] = useState('');
  if (currentSubTab !== 'staff_list') return null;
  return <div><div className="module-header"><h1>Utilisateurs et rôles</h1><p>Comptes simulés en mémoire, sans authentification. Les autorisations métier sont définies par la politique de rôles.</p></div>
    <form className="card card-full mb-2" onSubmit={event => { event.preventDefault(); try { addUser(name, email, role); setName(''); setEmail(''); setRole(ROLES.STG); setFeedback('Utilisateur créé.'); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Création impossible.'); } }}>
      <div className="form-row"><label>Nom<input className="input" required value={name} onChange={event => setName(event.target.value)} /></label><label>Email<input className="input" required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Rôle<select className="select-input" value={role} onChange={event => setRole(event.target.value as RoleName)}>{Object.values(ROLES).map(value => <option key={value}>{value}</option>)}</select></label></div><button className="btn btn-primary">Créer le compte simulé</button>{feedback && <p role="status">{feedback}</p>}
    </form><div className="card card-full"><h2>Annuaire ({users.length})</h2>{!users.length && <p>Aucun utilisateur.</p>}{users.map(user => <article className="mb-2" key={user.id}><strong>{user.name}</strong><p>{user.email} · {user.role} · {user.active ? 'Actif' : 'Désactivé'}</p><button className="btn btn-outline" onClick={() => { const reason = prompt('Motif du changement de statut'); if (reason) try { toggleUser(user.id, reason); } catch (error) { setFeedback(error instanceof Error ? error.message : 'Opération impossible.'); } }}>{user.active ? 'Désactiver' : 'Activer'}</button></article>)}</div>
    <div className="card card-full mt-2"><h2>Permissions du rôle sélectionné</h2><p>{ROLE_ACCESS[role].description}</p><p>{ROLE_ACCESS[role].permissions.join(', ') || 'Aucune permission métier.'}</p></div>
  </div>;
}
