'use client';
import { useState } from 'react';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { Student } from '@/types';

interface Props {
  students: Student[];
  onSelect: (matricule: string) => void;
}

const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');

export default function StudentDossierPicker({ students, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const results = students.filter(student => normalize(`${student.firstname} ${student.lastname} ${student.matricule}`).includes(normalize(query)));
  return <section className="card card-full">
    <h2>Choisir un dossier étudiant</h2>
    <label className="form-group">Rechercher un dossier<input className="input" type="search" placeholder="Nom ou matricule" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label>
    <p role="status">{results.length} dossier(s) correspondant à la recherche.</p>
    <ResponsiveTable className="data-table"><thead><tr><th>Étudiant</th><th>Formation</th><th>Dossier</th></tr></thead><tbody>
      {results.slice(offset, offset + 25).map(student => <tr key={student.matricule}>
        <td>{student.firstname} {student.lastname}<div className="cell-sub">{student.matricule}</div></td>
        <td>{student.filiere} · {student.niveau}</td>
        <td><button className="btn btn-outline" onClick={() => onSelect(student.matricule)}>Consulter le dossier</button></td>
      </tr>)}
      {!results.length && <tr><td colSpan={3}>{students.length ? 'Aucun dossier ne correspond à cette recherche.' : 'Aucun dossier dans l’année et le périmètre consultés.'}</td></tr>}
    </tbody></ResponsiveTable>
    {results.length > 25 && <div className="browser-pagination"><span>{offset + 1}–{Math.min(offset + 25, results.length)} sur {results.length}</span><div className="btn-group">
      <button className="btn btn-outline" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 25))}>Dossiers précédents</button>
      <button className="btn btn-outline" disabled={offset + 25 >= results.length} onClick={() => setOffset(value => value + 25)}>Dossiers suivants</button>
    </div></div>}
  </section>;
}
