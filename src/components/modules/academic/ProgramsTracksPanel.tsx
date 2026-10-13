import { useState } from 'react';
import type { Program, RoleName, Track } from '@/types';
import { saveProgram, saveTrack, toggleProgram, toggleTrack, type ProgramInput, type TrackInput } from '@/services/academicCatalogService';

interface ProgramsTracksPanelProps {
  programs: Program[];
  tracks: Track[];
  onProgramsChange: (programs: Program[]) => void;
  onTracksChange: (tracks: Track[]) => void;
  actorRole: RoleName;
}

const EMPTY_PROGRAM: ProgramInput = { code: '', name: '', description: '' };
const EMPTY_TRACK: TrackInput = { programId: '', code: '', name: '' };

export default function ProgramsTracksPanel({ programs, tracks, onProgramsChange, onTracksChange, actorRole }: ProgramsTracksPanelProps) {
  const [programForm, setProgramForm] = useState<ProgramInput>(EMPTY_PROGRAM);
  const [trackForm, setTrackForm] = useState<TrackInput>(EMPTY_TRACK);
  const [programEditingId, setProgramEditingId] = useState<string | null>(null);
  const [trackEditingId, setTrackEditingId] = useState<string | null>(null);
  const [programErrors, setProgramErrors] = useState<Partial<Record<keyof ProgramInput | 'form', string>>>({});
  const [trackErrors, setTrackErrors] = useState<Partial<Record<keyof TrackInput | 'form', string>>>({});
  const [message, setMessage] = useState('');

  const submitProgram = (event: React.FormEvent) => {
    event.preventDefault();
    const existing = programs.find(item => item.id === programEditingId);
    const result = saveProgram(programs, programForm, actorRole, existing);
    if (!result.success) return setProgramErrors(result.errors);
    onProgramsChange(existing ? programs.map(item => item.id === existing.id ? result.entity : item) : [...programs, result.entity]);
    setProgramForm(EMPTY_PROGRAM); setProgramEditingId(null); setProgramErrors({});
    setMessage(existing ? 'Filière modifiée et historique mis à jour.' : 'Filière créée en mémoire.');
  };
  const submitTrack = (event: React.FormEvent) => {
    event.preventDefault();
    const existing = tracks.find(item => item.id === trackEditingId);
    const result = saveTrack(programs, tracks, trackForm, actorRole, existing);
    if (!result.success) return setTrackErrors(result.errors);
    onTracksChange(existing ? tracks.map(item => item.id === existing.id ? result.entity : item) : [...tracks, result.entity]);
    setTrackForm(EMPTY_TRACK); setTrackEditingId(null); setTrackErrors({});
    setMessage(existing ? 'Parcours modifié et historique mis à jour.' : 'Parcours créé en mémoire.');
  };
  const changeProgramStatus = (id: string) => {
    const result = toggleProgram(programs, tracks, id, actorRole);
    if (!result.success) { setProgramErrors({ form: result.error }); return; }
    onProgramsChange(result.programs); onTracksChange(result.tracks); setMessage('Statut de la filière mis à jour.');
  };

  return <>{message && <div className="info-box mb-2">{message}</div>}<div className="catalog-grid">
    <section>
      <div className="card-header"><div><h2>Filières</h2><div className="cell-sub">Référentiel extensible ; la liste actuelle n'est pas définitive.</div></div></div>
      <form className="stacked-form" onSubmit={submitProgram} noValidate>
        <div className="form-row"><div className="form-group"><label className="form-label">Code</label><input className="input" value={programForm.code} onChange={event => setProgramForm(current => ({ ...current, code: event.target.value }))} />{programErrors.code && <span className="field-error">{programErrors.code}</span>}</div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nom</label><input className="input" value={programForm.name} onChange={event => setProgramForm(current => ({ ...current, name: event.target.value }))} />{programErrors.name && <span className="field-error">{programErrors.name}</span>}</div></div>
        <div className="form-group"><label className="form-label">Description éventuelle</label><textarea className="input" rows={2} value={programForm.description} onChange={event => setProgramForm(current => ({ ...current, description: event.target.value }))} /></div>
        <div className="btn-group">{programEditingId && <button type="button" className="btn btn-outline" onClick={() => { setProgramEditingId(null); setProgramForm(EMPTY_PROGRAM); }}>Annuler</button>}<button className="btn btn-primary" type="submit">{programEditingId ? 'Enregistrer' : 'Ajouter la filière'}</button></div>
      </form>
      {programErrors.form && <div className="restricted-box mb-2">{programErrors.form}</div>}
      <div className="catalog-list">{programs.map(program => <div key={program.id} className="catalog-item"><div><strong><code>{program.code}</code> {program.name}</strong><div className="cell-sub">{program.description || 'Sans description'} · {tracks.filter(track => track.programId === program.id).length} parcours · {program.history.length} événement(s)</div></div><div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => { setProgramEditingId(program.id); setProgramForm({ code: program.code, name: program.name, description: program.description }); }}>Modifier</button><button className="btn btn-sm btn-outline" onClick={() => changeProgramStatus(program.id)}>{program.active ? 'Désactiver' : 'Activer'}</button></div></div>)}</div>
    </section>
    <section>
      <div className="card-header"><div><h2>Parcours</h2><div className="cell-sub">Chaque parcours appartient obligatoirement à une filière.</div></div></div>
      <form className="stacked-form" onSubmit={submitTrack} noValidate>
        <div className="form-group"><label className="form-label">Filière</label><select className="select-input" value={trackForm.programId} onChange={event => setTrackForm(current => ({ ...current, programId: event.target.value }))}><option value="">Sélectionner</option>{programs.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{trackErrors.programId && <span className="field-error">{trackErrors.programId}</span>}</div>
        <div className="form-row"><div className="form-group"><label className="form-label">Code</label><input className="input" value={trackForm.code} onChange={event => setTrackForm(current => ({ ...current, code: event.target.value }))} />{trackErrors.code && <span className="field-error">{trackErrors.code}</span>}</div><div className="form-group" style={{ flex: 1 }}><label className="form-label">Nom</label><input className="input" value={trackForm.name} onChange={event => setTrackForm(current => ({ ...current, name: event.target.value }))} />{trackErrors.name && <span className="field-error">{trackErrors.name}</span>}</div></div>
        <div className="btn-group">{trackEditingId && <button type="button" className="btn btn-outline" onClick={() => { setTrackEditingId(null); setTrackForm(EMPTY_TRACK); }}>Annuler</button>}<button className="btn btn-primary" type="submit">{trackEditingId ? 'Enregistrer' : 'Ajouter le parcours'}</button></div>
      </form>
      {trackErrors.form && <div className="restricted-box mb-2">{trackErrors.form}</div>}
      <div className="catalog-list">{tracks.map(track => <div key={track.id} className="catalog-item"><div><strong><code>{track.code}</code> {track.name}</strong><div className="cell-sub">{programs.find(program => program.id === track.programId)?.name} · {track.active ? 'Actif' : 'Inactif'} · {track.history.length} événement(s)</div></div><div className="btn-group"><button className="btn btn-sm btn-outline" onClick={() => { setTrackEditingId(track.id); setTrackForm({ programId: track.programId, code: track.code, name: track.name }); }}>Modifier</button><button className="btn btn-sm btn-outline" onClick={() => { const result = toggleTrack(tracks, track.id, actorRole); if (!result.success) { setTrackErrors({ form: result.error }); return; } onTracksChange(result.tracks); setMessage('Statut du parcours mis à jour.'); }}>{track.active ? 'Désactiver' : 'Activer'}</button></div></div>)}</div>
    </section>
  </div></>;
}
