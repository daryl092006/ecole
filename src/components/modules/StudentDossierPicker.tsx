'use client';
import { useState } from 'react';
import Link from 'next/link';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import type { Student } from '@/types';

interface Props {
  students: Student[];
  onSelect: (matricule: string) => void;
}

const normalize = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

export default function StudentDossierPicker({ students, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const results = students.filter(student =>
    normalize(`${student.firstname} ${student.lastname} ${student.matricule}`).includes(normalize(query)),
  );

  return (
    <section className="card card-full dossier-picker-card">
      <div className="dossier-picker-header">
        <div>
          <h2>Choisir un dossier étudiant</h2>
          <p className="cell-sub">Recherchez un étudiant pour consulter son dossier, ses pièces et son parcours.</p>
        </div>
        <span className="pill pill-default" role="status">
          {results.length} dossier{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="dossier-picker-toolbar">
        <label className="form-group">
          Rechercher un dossier
          <input
            className="input"
            type="search"
            placeholder="Nom, prénom ou matricule…"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </label>
      </div>

      <div className="table-wrap">
        <ResponsiveTable className="data-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Formation</th>
              <th>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(offset, offset + 25).map(student => (
              <tr key={student.matricule}>
                <td>
                  <strong>
                    {student.firstname} {student.lastname}
                  </strong>
                  <div className="cell-sub">{student.matricule}</div>
                </td>
                <td>
                  <div>{student.filiere}</div>
                  <div className="cell-sub">
                    {student.niveau}
                    {student.groupe ? ` · ${student.groupe}` : ''}
                  </div>
                </td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline" onClick={() => onSelect(student.matricule)}>
                      Consulter le dossier
                    </button>
                    <Link className="btn btn-sm btn-outline" href={`/etudiants/${encodeURIComponent(student.matricule)}`}>
                      Fiche complète →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!results.length && (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">
                    <strong>Aucun dossier trouvé</strong>
                    <span>
                      {students.length
                        ? 'Aucun dossier ne correspond à cette recherche.'
                        : 'Aucun dossier dans l’année et le périmètre consultés.'}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </ResponsiveTable>
      </div>

      {results.length > 25 && (
        <div className="browser-pagination">
          <span>
            {offset + 1}–{Math.min(offset + 25, results.length)} sur {results.length}
          </span>
          <div className="btn-group">
            <button
              className="btn btn-outline"
              disabled={!offset}
              onClick={() => setOffset(value => Math.max(0, value - 25))}
            >
              Dossiers précédents
            </button>
            <button
              className="btn btn-outline"
              disabled={offset + 25 >= results.length}
              onClick={() => setOffset(value => value + 25)}
            >
              Dossiers suivants
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
