import { displayLabel } from '@/utils/display';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import type { Reclamation } from '@/types';
import { ROLES } from '@/types/permissions';
export default function ComplaintsPanel() {
  const state = usePortal(); const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<{ id: string; target: Reclamation['status']; label: string; correction?: boolean } | null>(null);
  const [reason, setReason] = useState(''); const [grade, setGrade] = useState('');
  const records = state.reclamations.filter(item => !filter || (filter === 'EN_COURS' ? item.status !== 'CLOTUREE' : item.status === filter));
  const choose = (id: string, target: Reclamation['status'], label: string, correction = false) => { setSelected({ id, target, label, correction }); setReason(''); setGrade(''); };
  const controls = (item: Reclamation) => {
    if (state.perms.permissions.includes('complaint.review')) {
      if (item.status === 'NOUVELLE') return <button className="btn btn-sm btn-outline" onClick={() => state.transitionReclamation(item.id, 'EN_ANALYSE')}>Prendre en charge</button>;
      if (item.status === 'EN_ANALYSE') return <button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'TRANSMISE_ENSEIGNANT', 'Transmettre à l’enseignant')}>Transmettre à l’enseignant</button>;
      if (item.status === 'AVIS_ENSEIGNANT') return <button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'DECISION_ACADEMIQUE', 'Enregistrer la décision académique')}>Prendre une décision</button>;
      if (item.status === 'DECISION_ACADEMIQUE') return <div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'CLOTUREE', 'Clôturer sans correction')}>Clôturer sans correction</button><button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'CORRECTION_EVENTUELLE', 'Demander une correction')}>Demander une correction</button></div>;
      if (item.status === 'CORRECTION_EVENTUELLE') return <button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'CLOTUREE', 'Corriger la note et clôturer', true)}>Appliquer la correction</button>;
    }
    if (state.activeRole === ROLES.ENS && item.status === 'TRANSMISE_ENSEIGNANT') return <button className="btn btn-sm btn-outline" onClick={() => choose(item.id, 'AVIS_ENSEIGNANT', 'Enregistrer mon avis')}>Donner mon avis</button>;
    return <span className="cell-sub">{item.status === 'CLOTUREE' ? 'Traitement terminé' : 'En attente du rôle compétent'}</span>;
  };
  return <div><div className="module-header"><h1>Réclamations académiques</h1><p>Analyse de la demande, avis de l’enseignant et décision de la direction académique.</p></div><div className="card card-full"><div className="card-header"><h2>Réclamations ({records.length})</h2><label className="form-group">État du traitement<select className="select-input" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Toutes</option><option value="EN_COURS">En cours</option><option value="CLOTUREE">Clôturées</option></select></label></div>{records.map(item => <article className="ledger-item" key={item.id}><div className="catalog-item"><div><strong>{item.studentMatricule} · {state.evaluations.find(evaluation => evaluation.id === item.evaluationId)?.name}</strong><p>{item.reason}</p></div><span className="pill pill-default">{displayLabel(item.status)}</span></div>{item.response && <p>Dernier avis : {item.response}</p>}<div className="mt-2">{controls(item)}</div>{item.correction && <p className="cell-sub">Correction : {item.correction.previousGrade} → {item.correction.newGrade}/20 · {item.correction.reason}</p>}<details className="mt-2"><summary>Historique ({item.history.length})</summary>{item.history.map(entry => <p className="cell-sub" key={entry.id}>{new Date(entry.date).toLocaleString('fr-FR')} · {entry.role} · {displayLabel(entry.from)} → {displayLabel(entry.to)} · {entry.comment}</p>)}</details></article>)}{!records.length && <div className="empty-state"><strong>Aucune réclamation</strong><span>Les demandes correspondant au filtre apparaîtront ici.</span></div>}</div>
    {selected && <form className="card card-full mt-2" onSubmit={event => { event.preventDefault(); if (state.transitionReclamation(selected.id, selected.target, reason, selected.correction ? Number(grade) : undefined)) setSelected(null); }}><h2>{selected.label}</h2>{selected.correction && <label className="form-group">Nouvelle note /20<input className="input" required type="number" min="0" max="20" step="0.5" value={grade} onChange={event => setGrade(event.target.value)} /></label>}<label className="form-group">Avis ou motif<textarea autoFocus required minLength={3} maxLength={1000} className="input" value={reason} onChange={event => setReason(event.target.value)} /></label><div className="btn-group"><button className="btn btn-primary">Confirmer</button><button className="btn btn-outline" type="button" onClick={() => setSelected(null)}>Fermer</button></div></form>}
  </div>;
}
