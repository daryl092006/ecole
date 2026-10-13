import FormFeedback from '@/components/ui/FormFeedback';
import { useFeedback } from '@/hooks/useFeedback';
import { displayLabel } from '@/utils/display';
import StudentDocumentsManager from './StudentDocumentsManager';
import { useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { printDocument, escapeHtml as h } from '@/utils/printDocument';
import { workflowError } from '@/utils/workflowError';

export default function StudentDocumentsPanel() {
  const state = usePortal(); const data = state.campus.data; const settings = data.settings[0];
  const own = !!state.perms.scope.ownDataOnly; const [query, setQuery] = useState(''); const [feedback, setFeedback, feedbackError] = useFeedback();
  const students = state.students.filter(item => `${item.firstname} ${item.lastname} ${item.matricule}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  const issue = (studentId: string, kind: 'card' | 'certificate') => {
    try {
      const student = students.find(item => item.matricule === studentId); if (!student) throw new Error('Dossier introuvable.');
      if (!own && !state.perms.permissions.includes('student.card.print')) throw new Error('Impression non autorisée.');
      if (!['Inscrit', 'Réinscrit'].includes(student.status)) throw new Error('Ce document exige une inscription active.');
      const year = data.academicYears.find(item => item.id === student.academicYearId)?.label || student.academicYearId;
      const identity = `<h2>${h(student.firstname)} ${h(student.lastname)}</h2><p>Matricule : <strong>${h(student.matricule)}</strong><br>${h(student.niveau)} · ${h(student.filiere)}<br>Groupe : ${h(student.groupe)}<br>Année universitaire : ${h(year)}</p>`;
      const photo = data.documents.filter(item => item.studentId === student.matricule && item.kind === 'PHOTO' && item.status === 'CONFORME').at(-1);
      const photoMarkup = photo ? `<img src="${h(photo.dataUrl)}" alt="Photo d’identité" style="width:65px;height:80px;object-fit:cover;float:right">` : '';
      const content = kind === 'card' ? `<div class="id-card"><h1>${h(settings.name)}</h1><p>CARTE D’ÉTUDIANT</p>${photoMarkup}${identity}<p class="meta">${h(settings.address)}<br>${h(settings.phone)}</p></div>` : `<div class="document-heading"><h1>${h(settings.name)}</h1><p>${h(settings.address)} · ${h(settings.phone)}</p></div><h1>Certificat de scolarité</h1><p>La direction de ${h(settings.name)} certifie que l’étudiant ci-dessous est inscrit pour l’année universitaire ${h(year)}.</p>${identity}<p>Ce certificat est établi pour servir et valoir ce que de droit.</p><p class="signature">Fait à Lomé, le ${h(new Date().toLocaleDateString('fr-FR'))}<br>La direction académique<br>Signature et cachet</p>`;
      printDocument(`${kind === 'card' ? 'Carte' : 'Certificat'}-${student.matricule}`, content);
      state.logEvent('Édition document étudiant', JSON.stringify({ entity: studentId, kind, academicYearId: student.academicYearId })); setFeedback('Document prêt pour l’impression ou l’enregistrement en PDF.');
    } catch (error) { setFeedback(workflowError(error), true); }
  };
  return <div><div className="module-header"><h1>{own ? 'Mes documents' : 'Cartes et certificats de scolarité'}</h1><p>Documents établis à partir du dossier et de l’année réelle d’inscription.</p></div>
    {!own && <label className="form-group">Rechercher un étudiant<input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom ou matricule" /></label>}<FormFeedback message={feedback} error={feedbackError} />
    <div className="document-list">{students.map(student => <article className="card" key={student.matricule}><div className="document-preview"><div className="document-preview-header"><strong>{settings.name}</strong><span>CARTE D’ÉTUDIANT</span></div><h2>{student.firstname} {student.lastname}</h2><p>{student.matricule}</p><p>{student.niveau} · {student.filiere}</p><p>{data.academicYears.find(item => item.id === student.academicYearId)?.label}</p></div><div className="btn-group mt-2"><button className="btn btn-primary" onClick={() => issue(student.matricule, 'card')}>Imprimer la carte</button><button className="btn btn-outline" onClick={() => issue(student.matricule, 'certificate')}>Certificat de scolarité</button></div><p className="cell-sub">{student.status}</p></article>)}</div>
    {!students.length && <div className="empty-state"><strong>Aucun document disponible</strong><span>{own ? 'Choisissez votre identité pour consulter votre dossier.' : 'Aucun étudiant ne correspond à cette recherche.'}</span></div>}
    {own && state.students[0] && <div className="card card-full mt-2"><StudentDocumentsManager studentId={state.students[0].matricule} /></div>}
    {own && <div className="card card-full mt-2"><h2>Mes relevés validés</h2>{data.juryDecisions.length ? data.juryDecisions.map(item => <article key={item.id} className="catalog-item"><div><strong>{data.semesters.find(semester => semester.id === item.semesterId)?.name}</strong><p>{displayLabel(item.decision)} · {item.average}/20 · {item.credits}/{item.totalCredits} crédits</p></div><button className="btn btn-outline" onClick={() => {
      const student = state.students.find(student => student.matricule === item.studentId); if (!student) return;
      printDocument(`Relevé-${item.id}`, `<div class="document-heading"><h1>${h(settings.name)}</h1><h2>Relevé de notes</h2></div><p>${h(student.firstname)} ${h(student.lastname)} · ${h(item.studentId)}<br>${h(data.academicYears.find(year => year.id === item.academicYearId)?.label)} · ${h(data.semesters.find(semester => semester.id === item.semesterId)?.name)}</p><table><thead><tr><th>Matière</th><th>Crédits</th><th>Moyenne</th><th>Résultat</th></tr></thead><tbody>${item.rows.map(row => `<tr><td>${h(row.code)} · ${h(row.name)}</td><td>${h(row.credits)}</td><td>${h(row.average)}/20</td><td>${row.validated ? 'Validé' : 'Non validé'}</td></tr>`).join('')}</tbody></table><p>Moyenne : ${h(item.average)}/20 · Crédits acquis : ${h(item.credits)}/${h(item.totalCredits)}<br>Décision du jury : ${h(displayLabel(item.decision))}<br>${h(item.reason)}</p><p class="signature">Direction académique · Signature et cachet</p><p class="document-footer">Référence : ${h(item.id)} · Décision du ${h(new Date(item.date).toLocaleDateString('fr-FR'))}</p>`);
    }}>Imprimer le relevé</button></article>) : <p className="cell-sub">Aucune décision de jury publiée pour votre dossier.</p>}</div>}
  </div>;
}
