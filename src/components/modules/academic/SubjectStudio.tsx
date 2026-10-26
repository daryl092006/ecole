'use client';
import SubjectConstructor from './SubjectConstructor';
import SubjectRichText from '@/components/ui/SubjectRichText';
import { sanitizeSubjectMarkup } from '@/utils/subjectMarkup';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useEffect, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadPreparedSubjects, savePreparedSubject } from '@/services/remoteCampusService';
import { subjectPoints, subjectSchema } from '@/services/subjectCompositionService';
import { subjectExamIssue } from '@/services/subjectExamPolicy';
import type { SubjectDirectory, SubjectInput, SubjectPurpose, PreparedSubject, SubjectExam } from '@/types/subject';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ReviewedForm from '@/components/ui/ReviewedForm';
import Link from 'next/link';
import { printDocument, escapeHtml as h } from '@/utils/printDocument';

const purposes: Record<SubjectPurpose, string> = { CONTROLE_CONTINU: 'Contrôle continu', EXAMEN: 'Examen', RATTRAPAGE: 'Rattrapage' };
const blank = (purpose: SubjectPurpose = 'EXAMEN'): SubjectInput => ({
  title: '',
  instructions: '',
  durationMinutes: 60,
  purpose,
  evaluationId: null,
  sourceEvaluationRowId: null,
  authorize: false,
  parts: [],
});
const forExam = (exam: SubjectExam): SubjectInput => ({ ...blank(exam.purpose), title: exam.title, durationMinutes: exam.durationMinutes, evaluationId: exam.id });
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' }).format(new Date(value)) : 'Non renseigné';

export default function SubjectStudio() {
  const portal = usePortal();
  const { activeRole } = portal;
  const [directory, setDirectory] = useState<SubjectDirectory | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [previous, setPrevious] = useState<PreparedSubject | null>(null);
  const [subject, setSubject] = useState<SubjectInput>(blank);
  const [connectedEvalId, setConnectedEvalId] = useState('');
  const [tab, setTab] = useState<'compose' | 'preview' | 'correction'>('compose');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setDirectory(null);
    setError('');
    setEditing(false);
    void loadPreparedSubjects(activeRole, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setDirectory(result);
        const params = new URL(window.location.href).searchParams;
        const requested = params.get('sujet');
        const existing = requested ? result.subjects.find(row => row.id === requested && !row.archived) : undefined;
        if (requested && !existing) {
          setError('Ce sujet n’est plus disponible ou ne fait pas partie de vos accès.');
        } else if (existing) {
          const exam = result.exams?.find(row => row.id === existing.evaluationId);
          const editable = !subjectExamIssue(exam) && existing.status !== 'AUTORISE';
          setPrevious(existing);
          setConnectedEvalId(existing.evaluationId || '');
          setSubject({ title: editable && exam ? exam.title : existing.title, instructions: existing.instructions, durationMinutes: editable && exam ? exam.durationMinutes : existing.durationMinutes,
            purpose: editable && exam ? exam.purpose : existing.purpose, evaluationId: existing.evaluationId || null, sourceEvaluationRowId: existing.sourceEvaluationRowId,
            authorize: existing.status === 'AUTORISE', parts: structuredClone(existing.parts) });
          setTab(subjectExamIssue(result.exams?.find(row => row.id === existing.evaluationId)) || existing.status === 'AUTORISE' ? 'preview' : 'compose'); setEditing(true);
        } else if (params.get('nouveau') === '1') {
          const exam = result.exams?.find(row => row.id === params.get('evalId'));
          const issue = subjectExamIssue(exam);
          if (exam && !issue) {
            const saved = result.subjects.find(row => row.evaluationId === exam.id && !row.archived);
            setConnectedEvalId(exam.id);
            setPrevious(saved || null);
            setSubject(saved ? { title: saved.title, instructions: saved.instructions, durationMinutes: exam.durationMinutes,
              purpose: exam.purpose, evaluationId: exam.id, sourceEvaluationRowId: null,
              parts: structuredClone(saved.parts), authorize: saved.status === 'AUTORISE' } : forExam(exam));
            setTab('compose'); setEditing(true);
          } else if (params.get('evalId')) setFeedback(issue || 'Choisissez un examen programmé.');
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Chargement impossible.');
      });
    return () => controller.abort();
  }, [activeRole, retry]);

  const open = (record?: PreparedSubject, exam?: SubjectExam) => {
    const linkedExam = exam || directory?.exams?.find(row => row.id === record?.evaluationId);
    const editable = !subjectExamIssue(linkedExam) && record?.status !== 'AUTORISE';
    setPrevious(record || null);
    const evalId = record?.evaluationId || exam?.id || '';
    setConnectedEvalId(evalId);
    setSubject(
      record
        ? {
            title: editable && linkedExam ? linkedExam.title : record.title,
            instructions: record.instructions,
            durationMinutes: editable && linkedExam ? linkedExam.durationMinutes : record.durationMinutes,
            purpose: editable && linkedExam ? linkedExam.purpose : record.purpose,
            evaluationId: record.evaluationId || null,
            sourceEvaluationRowId: record.sourceEvaluationRowId,
            authorize: record.status === 'AUTORISE',
            parts: structuredClone(record.parts),
          }
        : exam ? forExam(exam) : blank()
    );
    setEditing(true);
    setTab(record && (record.status === 'AUTORISE' || subjectExamIssue(directory?.exams?.find(row => row.id === record.evaluationId))) ? 'preview' : 'compose');
    setSaveError('');
    setFeedback('');
  };

  const leave = () => {
    setEditing(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('nouveau');
    url.searchParams.delete('source');
    url.searchParams.delete('nature');
    url.searchParams.delete('evalId');
    url.searchParams.delete('titre');
    url.searchParams.delete('sujet');
    window.history.replaceState(window.history.state, '', url);
  };

  const print = () =>
    printDocument(
      subject.title || 'Sujet',
      `<div class="document-heading"><h1>ESCEN</h1><h2>${h(subject.title)}</h2></div><p>${subject.authorize ? 'Épreuve autorisée' : 'Brouillon de'} ${h(purposes[subject.purpose].toLowerCase())} · ${subject.durationMinutes} minutes · ${subjectPoints(subject)} points</p><p>${h(subject.instructions).replace(/\n/g, '<br>')}</p>${subject.parts.map(part => `<h3>${h(part.title)}</h3><p>${h(part.instructions).replace(/\n/g, '<br>')}</p>${part.questions.map((q, index) => `<h4>Question ${index + 1} · ${q.points} point(s)</h4><p>${sanitizeSubjectMarkup(q.prompt)}</p>${q.options.length ? `<ol>${q.options.map(option => `<li>${h(option.label)}</li>`).join('')}</ol>` : '<p>Réponse : __________________________________________________</p>'}`).join('')}`).join('')}`
    );

  if (error) return <ErrorState title="Composition des épreuves indisponible" message={error} onRetry={() => setRetry(value => value + 1)} />;
  if (!directory) return <LoadingState label="Chargement des sujets…" variant="table" />;

  const exams = directory.exams || [];
  const availableExams = exams.filter(exam => !subjectExamIssue(exam, now));
  const selectedExam = exams.find(exam => exam.id === connectedEvalId);
  const compositionIssue = previous?.status === 'AUTORISE' ? 'Le sujet est autorisé : consultation uniquement.' : subjectExamIssue(selectedExam, now);

  const returnEvalId = connectedEvalId;

  if (editing)
    return (
      <div className="subject-studio">
        <header className="subject-heading">
          <button className="btn btn-outline" onClick={leave} disabled={saving}>
            ← Composition des épreuves
          </button>
          <h1>{compositionIssue ? 'Consulter le sujet' : previous ? 'Modifier le sujet' : 'Composer le sujet'}</h1>
          <p>{subject.title}</p>
          {compositionIssue && <p role="status">{compositionIssue}</p>}
          {selectedExam && <dl className="record-details-grid">
            <div><dt>Nature</dt><dd>{purposes[selectedExam.purpose]}</dd></div>
            <div><dt>Groupe</dt><dd>{selectedExam.group}</dd></div>
            <div><dt>Matière</dt><dd>{selectedExam.subject}</dd></div>
            <div><dt>Début de l’examen</dt><dd>{dateTime(selectedExam.startsAt)}</dd></div>
            <div><dt>Fin de l’examen</dt><dd>{dateTime(selectedExam.endsAt)}</dd></div>
            <div><dt>Durée de composition</dt><dd>{selectedExam.durationMinutes} minutes</dd></div>
            <div><dt>Salle / mode</dt><dd>{selectedExam.room || (selectedExam.mode === 'EN_LIGNE' ? 'En ligne' : 'Salle non renseignée')}</dd></div>
          </dl>}
        </header>
        <div className="subject-tabs" role="tablist" aria-label="Préparation du sujet">
          {([['compose', 'Composition'], ['preview', 'Aperçu étudiant'], ['correction', 'Corrigé']] as const).filter(([key]) => key !== 'compose' || !compositionIssue).map(([key, label]) => (
            <button role="tab" aria-selected={tab === key} className={tab === key ? 'selected' : ''} key={key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'compose' && !compositionIssue ? (
          <ReviewedForm
            className="card subject-editor"
            completionKey={previous?.id}
            validate={() => {
              const issue = subjectExamIssue(selectedExam);
              if (issue) return issue;
              const checked = subjectSchema.safeParse(subject);
              return checked.success ? null : checked.error.issues[0]?.message || 'Vérifiez les champs du sujet.';
            }}
            busy={saving}
            error={saveError}
            confirmLabel={subject.authorize ? 'Confirmer l’enregistrement et l’autorisation' : 'Confirmer la sauvegarde du brouillon'}
            fields={[
              { label: 'Titre', value: subject.title },
              { label: 'Nature', value: purposes[subject.purpose] },
              { label: 'Durée', value: subject.durationMinutes + ' minutes' },
              { label: 'Examen programmé', value: selectedExam?.title || subject.title },
              { label: 'Début', value: dateTime(selectedExam?.startsAt || null) },
              { label: 'Fin', value: dateTime(selectedExam?.endsAt || null) },
              { label: 'Diffusion', value: subject.authorize ? 'Autorisé pour l’épreuve en ligne' : 'Brouillon privé non diffusé' },
              { label: 'Contenu', value: subject.parts.length + ' partie(s) · ' + subject.parts.reduce((sum, part) => sum + part.questions.length, 0) + ' question(s)' },
              { label: 'Barème', value: subjectPoints(subject) + ' points' },
              { label: 'Version', value: previous ? 'Nouvelle version ; la précédente reste conservée' : 'Premier sujet' },
            ]}
            consequence={
              subject.authorize
                ? 'Le sujet, son barème et son corrigé seront enregistrés et AUTORISÉS pour l’épreuve rattachée. Les étudiants admissibles pourront y accéder selon la séance programmée.'
                : 'Le sujet, le barème et le corrigé seront enregistrés comme brouillon versionné. Aucune diffusion ne sera ouverte aux étudiants tant que le sujet n’est pas autorisé.'
            }
            onConfirm={event => {
              event.preventDefault();
              const issue = subjectExamIssue(selectedExam);
              if (issue) { setSaveError(issue); return; }
              const parsed = subjectSchema.safeParse(subject);
              if (!parsed.success) {
                setSaveError(parsed.error.issues[0]?.message || 'Vérifiez les champs du sujet.');
                return;
              }
              setSaving(true);
              setSaveError('');
              void savePreparedSubject(
                parsed.data,
                directory.revision,
                previous ? (subject.authorize ? 'Mise à jour et autorisation du sujet' : 'Nouvelle version du sujet') : (subject.authorize ? 'Composition et autorisation du sujet' : 'Composition du sujet'),
                activeRole,
                previous?.id
              )
                .then(async result => {
                  setFeedback(subject.authorize ? 'Sujet enregistré et autorisé pour l’épreuve en ligne.' : 'Brouillon enregistré. Vérifiez maintenant l’aperçu étudiant et le corrigé.');
                  portal.reportActionOutcome({
                    title: subject.authorize ? 'Sujet enregistré et autorisé' : 'Brouillon du sujet enregistré',
                    detail: `${subject.title} : version conservée. ${subject.authorize ? 'Le sujet est autorisé pour diffusion.' : 'Consultez l’aperçu étudiant et le corrigé avant toute utilisation.'}`,
                  });
                  portal.refreshCampus();
                  try {
                    const fresh = await loadPreparedSubjects(activeRole);
                    setDirectory(fresh);
                    const saved = fresh.subjects.find(row => row.id === result.id);
                    if (saved) {
                      setPrevious(saved);
                      const url = new URL(window.location.href);
                      for (const key of ['nouveau', 'source', 'nature', 'evalId', 'titre']) url.searchParams.delete(key);
                      url.searchParams.set('sujet', saved.id);
                      window.history.replaceState(window.history.state, '', url);
                    }
                  } catch {
                    setError('Le sujet a bien été enregistré, mais sa version actualisée n’a pas pu être chargée.');
                  }
                })
                .catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'))
                .finally(() => setSaving(false));
            }}
          >
            <fieldset disabled={saving} className="permission-fieldset">
              <p className="cell-sub">La nature et la durée proviennent de la programmation de cet examen. Rédigez ci-dessous ses consignes, ses parties et ses questions.</p>

              {connectedEvalId && (
                <div className="card mb-2" style={{ backgroundColor: 'var(--surface-sunken)' }}>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={!!subject.authorize}
                      onChange={event => setSubject({ ...subject, authorize: event.target.checked })}
                    />
                    <strong>Autoriser ce sujet pour l’examen</strong>
                  </label>
                  <p className="cell-sub" style={{ marginTop: 4 }}>
                    {subject.authorize
                      ? 'Le sujet sera autorisé. Pour un examen en ligne, l’accès des étudiants dépend aussi des horaires programmés.'
                      : 'Le sujet restera à l’état de brouillon. Vous pourrez l’autoriser ultérieurement.'}
                  </p>
                </div>
              )}

              <label className="form-group">
                Consignes générales
                <textarea className="input" maxLength={8000} value={subject.instructions} onChange={event => setSubject({ ...subject, instructions: event.target.value })} />
              </label>

              <SubjectConstructor subject={subject} onChange={setSubject} disabled={saving} allowJustification={directory.features?.qcmJustification === true} />
              <footer className="subject-save">
                <strong>Barème total : {subjectPoints(subject)} points</strong>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : subject.authorize ? 'Enregistrer et autoriser le sujet' : 'Enregistrer le brouillon'}
                </button>
              </footer>
              {saveError && <p role="alert">{saveError}</p>}
              {feedback && (
                <section role="status">
                  <p>{feedback}</p>
                  <div className="btn-group">
                    <button className="btn btn-outline" type="button" onClick={() => setTab('preview')}>
                      Vérifier l’aperçu étudiant
                    </button>
                    <button className="btn btn-outline" type="button" onClick={() => setTab('correction')}>
                      Vérifier le corrigé
                    </button>
                    {returnEvalId && (
                      <Link
                        className="btn btn-outline"
                        href={(subject.purpose === 'RATTRAPAGE' ? '/academique/rattrapages' : subject.purpose === 'CONTROLE_CONTINU' ? '/academique/evaluations' : '/academique/examens') + '?epreuve=' + encodeURIComponent(returnEvalId)}
                      >
                        Revenir à l’épreuve associée
                      </Link>
                    )}
                  </div>
                </section>
              )}
            </fieldset>
          </ReviewedForm>
        ) : (
          <section className="card subject-preview">
            <div className="card-header">
              <span className="source-badge">{tab === 'preview' ? 'Version étudiant' : 'Corrigé enseignant'}</span>
              <button className="btn btn-outline" onClick={print}>
                Imprimer le sujet
              </button>
            </div>
            <h2>{subject.title || 'Épreuve sans titre'}</h2>
            <p className="cell-sub">{subject.authorize ? 'Sujet autorisé pour diffusion' : 'Brouillon — non diffusé'}</p>
            <p>
              {purposes[subject.purpose]} · {subject.durationMinutes} minutes · {subjectPoints(subject)} points
            </p>
            <p className="subject-text">{subject.instructions}</p>
            {subject.parts.map((part, index) => (
              <section key={index}>
                <h3>{part.title}</h3>
                <p className="subject-text">{part.instructions}</p>
                {part.questions.map((q, qIndex) => (
                  <article key={qIndex}>
                    <h4>
                      Question {qIndex + 1} · {q.points} points
                    </h4>
                    <SubjectRichText value={q.prompt} />
                    {q.options.length > 0 && (
                      <ol>
                        {q.options.map((opt, oIndex) => (
                          <li key={oIndex}>
                            {opt.label}
                            {tab === 'correction' && opt.correct && <strong> — Bonne réponse</strong>}
                          </li>
                        ))}
                      </ol>
                    )}
                    {tab === 'correction' && (
                      <div className="exam-correction">
                        <p className="subject-text">{q.correction || 'Indications de correction à compléter.'}</p>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            ))}
          </section>
        )}
      </div>
    );

  const rows = directory.subjects.filter(row => !row.archived && row.title.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));

  return (
    <div>
      <div className="page-intro">
        <div>
          <span className="page-eyebrow">PRÉPARATION DES ÉPREUVES</span>
          <h1>Composition des épreuves</h1>
          <p>Choisissez un examen programmé à venir, puis préparez ses questions, son barème et son corrigé.</p>
        </div>
      </div>
      <section className="card">
        <h2>Examen à préparer</h2>
        {availableExams.length ? <>
          <label className="form-group">Examen programmé
            <select className="select-input" value={connectedEvalId} onChange={event => setConnectedEvalId(event.target.value)}>
              <option value="">Choisir un examen à venir</option>
              {availableExams.map(exam => <option key={exam.id} value={exam.id}>{exam.title} · {exam.group} · {dateTime(exam.startsAt)}</option>)}
            </select>
          </label>
          {selectedExam && !compositionIssue && <>
            <p>{selectedExam.group} · {selectedExam.subject} · Du {dateTime(selectedExam.startsAt)} au {dateTime(selectedExam.endsAt)} · {selectedExam.durationMinutes} minutes</p>
            <button className="btn btn-primary" onClick={() => open(directory.subjects.find(row => row.evaluationId === selectedExam.id && !row.archived), selectedExam)}>Ouvrir la composition du sujet</button>
          </>}
        </> : <p>Aucun examen programmé à venir n’est disponible pour la composition dans l’année consultée.</p>}
        <Link className="btn btn-outline" href="/academique/examens">Consulter les examens et leur programmation</Link>
        {feedback && <p role="status">{feedback}</p>}
      </section>
      <section className="card card-full">
        <h2>Sujets enregistrés</h2>
        <label className="form-group">
          Rechercher un sujet
          <input className="input" type="search" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <ResponsiveTable className="data-table">
          <thead>
            <tr>
              <th>Sujet</th>
              <th>État du sujet et examen</th>
              <th>Nature</th>
              <th>Durée</th>
              <th>Barème</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const connectedEval = row.evaluationId ? portal.relationalSnapshot.tables.evaluations?.find(e => e.id === row.evaluationId) : null;
              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.title}</strong>
                    <div className="cell-sub">Version {row.version}</div>
                  </td>
                  <td>
                    <span className={`pill ${row.status === 'AUTORISE' ? 'pill-success' : 'pill-warning'}`}>
                      {row.status === 'AUTORISE' ? 'Autorisé' : 'Brouillon'}
                    </span>
                    {connectedEval ? (
                      <div className="cell-sub">Épreuve : {String(connectedEval.name || '')}</div>
                    ) : row.evaluationId ? (
                      <div className="cell-sub">Épreuve connectée</div>
                    ) : (
                      <div className="cell-sub">Consultation uniquement</div>
                    )}
                  </td>
                  <td>{purposes[row.purpose]}</td>
                  <td>{row.durationMinutes} min</td>
                  <td>{subjectPoints(row)} points</td>
                  <td>
                    <div className="btn-group">
                      {row.status !== 'AUTORISE' && !subjectExamIssue(exams.find(exam => exam.id === row.evaluationId), now) && <IconButton className="btn btn-outline" onClick={() => open(row)} label="Modifier le sujet" />}
                      <IconButton
                        className="btn btn-outline"
                        onClick={() => {
                          open(row);
                          setTab('preview');
                        }}
                        label="Voir le sujet"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6}>Aucun sujet enregistré pour l’année consultée.</td>
              </tr>
            )}
          </tbody>
        </ResponsiveTable>
      </section>
    </div>
  );
}
