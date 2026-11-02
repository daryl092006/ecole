'use client';
import SubjectConstructor from './SubjectConstructor';
import SubjectRichText from '@/components/ui/SubjectRichText';
import { sanitizeSubjectMarkup } from '@/utils/subjectMarkup';
import IconButton from '@/components/ui/IconButton';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useEffect, useState, useMemo } from 'react';
import { usePortal } from '@/hooks/usePortal';
import { loadPreparedSubjects, savePreparedSubject } from '@/services/remoteCampusService';
import { subjectPoints, subjectSchema } from '@/services/subjectCompositionService';
import { subjectExamIssue } from '@/services/subjectExamPolicy';
import type { SubjectDirectory, SubjectInput, SubjectPurpose, PreparedSubject, SubjectExam } from '@/types/subject';
import type { DatabaseRow } from '@/types/persistence';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import ReviewedForm from '@/components/ui/ReviewedForm';
import Link from 'next/link';
import { printDocument, escapeHtml as h } from '@/utils/printDocument';
import ExamDeliveryScheduleDialog from './ExamDeliveryScheduleDialog';
import { Calendar, Clock, FileText, AlertCircle, Eye } from 'lucide-react';

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
const forExam = (exam: SubjectExam): SubjectInput => ({
  ...blank(exam.purpose),
  title: exam.title,
  durationMinutes: exam.durationMinutes || 60,
  evaluationId: exam.id,
  parts: [
    {
      title: 'Partie 1',
      instructions: '',
      questions: [
        {
          prompt: '',
          kind: 'TEXTE',
          presentation: 'LONG_TEXT',
          points: 5,
          options: [],
          correction: '',
        },
      ],
    },
  ],
});
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
  const [schedulingEval, setSchedulingEval] = useState<DatabaseRow | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'TO_SCHEDULE' | 'COMPOSED'>('ALL');
  const [examQuery, setExamQuery] = useState('');
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

  const exams = useMemo(() => directory?.exams || [], [directory?.exams]);
  const directorySubjects = useMemo(() => directory?.subjects || [], [directory?.subjects]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const e of exams) {
      if (e.group && e.group !== 'Groupe non renseigné') {
        set.add(e.group);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [exams]);

  const stats = useMemo(() => {
    let ready = 0;
    let toSchedule = 0;
    let composed = 0;
    for (const exam of exams) {
      const hasSubject = directorySubjects.some(s => s.evaluationId === exam.id && !s.archived);
      if (hasSubject) composed++;
      const issue = subjectExamIssue(exam, now);
      if (!issue) ready++;
      else if (exam.issue?.includes('doivent être programmés')) toSchedule++;
    }
    return {
      total: exams.length,
      ready,
      toSchedule,
      composed,
    };
  }, [exams, directorySubjects, now]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      if (selectedGroup !== 'ALL' && exam.group !== selectedGroup) return false;

      const hasSubject = directorySubjects.some(s => s.evaluationId === exam.id && !s.archived);
      const issue = subjectExamIssue(exam, now);
      const isToSchedule = exam.issue?.includes('doivent être programmés');
      const isReady = !issue;

      if (statusFilter === 'READY' && !isReady) return false;
      if (statusFilter === 'TO_SCHEDULE' && !isToSchedule) return false;
      if (statusFilter === 'COMPOSED' && !hasSubject) return false;

      if (examQuery.trim()) {
        const q = examQuery.toLocaleLowerCase('fr');
        const matchTitle = exam.title.toLocaleLowerCase('fr').includes(q);
        const matchSubject = exam.subject.toLocaleLowerCase('fr').includes(q);
        const matchGroup = exam.group.toLocaleLowerCase('fr').includes(q);
        if (!matchTitle && !matchSubject && !matchGroup) return false;
      }

      return true;
    });
  }, [exams, selectedGroup, statusFilter, examQuery, directorySubjects, now]);

  const selectedExam = exams.find(exam => exam.id === connectedEvalId);
  const compositionIssue = previous?.status === 'AUTORISE' ? 'Le sujet est autorisé : consultation uniquement.' : subjectExamIssue(selectedExam, now);

  const returnEvalId = connectedEvalId;

  if (error) return <ErrorState title="Composition des épreuves indisponible" message={error} onRetry={() => setRetry(value => value + 1)} />;
  if (!directory) return <LoadingState label="Chargement des sujets…" variant="table" />;

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
                        href={`/academique/examens?${new URLSearchParams({
                          ...(subject.purpose === 'RATTRAPAGE'
                            ? { session: 'rattrapage' }
                            : subject.purpose === 'CONTROLE_CONTINU'
                            ? { session: 'controle' }
                            : {}),
                          epreuve: returnEvalId,
                        })}`}
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

  const rows = directorySubjects.filter(row => !row.archived && row.title.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));

  return (
    <div>
      <div className="page-intro">
        <div>
          <span className="page-eyebrow">ACADÉMIQUE · GESTION DES ÉPREUVES</span>
          <h1>Atelier de préparation et composition des épreuves</h1>
          <p>
            Chaque épreuve doit être programmée (créneau, date, horaires et mode) avant que son sujet, son barème et son corrigé officiel ne puissent être rédigés.
          </p>
        </div>
      </div>

      {/* Guide didactique des 3 étapes */}
      <section className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#002B49', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.9rem' }}>
              1
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#002B49', marginBottom: '0.2rem' }}>
                1. Programmer la séance
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                Fixer date, heure de début/fin, durée et mode (en ligne ou sur table).
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#002B49', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.9rem' }}>
              2
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#002B49', marginBottom: '0.2rem' }}>
                2. Composer sujet & barème
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                Rédiger parties, questions (QCM, cas pratique, développement) et barème.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#002B49', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.9rem' }}>
              3
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem', color: '#002B49', marginBottom: '0.2rem' }}>
                3. Valider & Diffuser
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                Établir le corrigé officiel et autoriser l’accès pour le passage de l’épreuve.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ margin: 0, padding: '1rem' }}>
          <div className="cell-sub">Total des épreuves</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#002B49', marginTop: '0.25rem' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '1rem' }}>
          <div className="cell-sub">Programmées & prêtes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginTop: '0.25rem' }}>{stats.ready}</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '1rem' }}>
          <div className="cell-sub">Horaires à programmer</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>{stats.toSchedule}</div>
        </div>
        <div className="card" style={{ margin: 0, padding: '1rem' }}>
          <div className="cell-sub">Sujets déjà rédigés</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', marginTop: '0.25rem' }}>{stats.composed}</div>
        </div>
      </div>

      {/* Tableau des épreuves */}
      <section className="card card-full" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Épreuves de l’année et préparation des sujets</h2>
            <p className="cell-sub" style={{ margin: '0.25rem 0 0 0' }}>
              Pour toute épreuve non programmée, définissez ses horaires en un clic pour ouvrir immédiatement sa composition.
            </p>
          </div>
          <Link className="btn btn-outline" href="/academique/examens">
            Consulter le calendrier des examens →
          </Link>
        </div>

        {/* Barre de filtres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <input
              type="search"
              className="input"
              placeholder="Rechercher par épreuve, matière ou promotion…"
              value={examQuery}
              onChange={e => setExamQuery(e.target.value)}
            />
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              className="select-input"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              aria-label="Filtrer par promotion"
            >
              <option value="ALL">Toutes les classes</option>
              {groups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 210px' }}>
            <select
              className="select-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'ALL' | 'READY' | 'TO_SCHEDULE' | 'COMPOSED')}
              aria-label="Filtrer par état"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="READY">🟢 Prêtes pour composition</option>
              <option value="TO_SCHEDULE">⚠️ Horaires à programmer</option>
              <option value="COMPOSED">📝 Sujets déjà rédigés</option>
            </select>
          </div>
        </div>

        {/* Tableau Responsive */}
        <ResponsiveTable className="data-table">
          <thead>
            <tr>
              <th>Épreuve & Matière</th>
              <th>Promotion</th>
              <th>Séance & Horaires</th>
              <th>Sujet & Barème</th>
              <th style={{ textAlign: 'right' }}>Actions de composition</th>
            </tr>
          </thead>
          <tbody>
            {filteredExams.map(exam => {
              const rawEval = portal.relationalSnapshot.tables.evaluations?.find(e => e.id === exam.id);
              const existingSubject = directory.subjects.find(s => s.evaluationId === exam.id && !s.archived);
              const issue = subjectExamIssue(exam, now);
              const isToSchedule = exam.issue?.includes('doivent être programmés');
              const isReady = !issue;
              const isAuthorized = existingSubject?.status === 'AUTORISE';

              return (
                <tr key={exam.id}>
                  <td>
                    <strong>{exam.title}</strong>
                    <div className="cell-sub">{exam.subject} · {purposes[exam.purpose]}</div>
                  </td>
                  <td>
                    <span className="pill pill-neutral">{exam.group}</span>
                  </td>
                  <td>
                    {exam.startsAt ? (
                      <div>
                        <span className="pill pill-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={12} /> {dateTime(exam.startsAt)}
                        </span>
                        <div className="cell-sub">
                          {exam.durationMinutes} min · {exam.mode === 'EN_LIGNE' ? 'En ligne' : exam.room ? `Salle ${exam.room}` : 'Sur table'}
                        </div>
                      </div>
                    ) : isToSchedule ? (
                      <div>
                        <span className="pill pill-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertCircle size={12} /> Horaires non définis
                        </span>
                        <div className="cell-sub">Diffusion à programmer</div>
                      </div>
                    ) : (
                      <div>
                        <span className="pill pill-neutral">{exam.issue || 'Non programmée'}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {existingSubject ? (
                      <div>
                        <span className={`pill ${isAuthorized ? 'pill-success' : 'pill-warning'}`}>
                          {isAuthorized ? `✓ Autorisé (v${existingSubject.version})` : `Brouillon (v${existingSubject.version})`}
                        </span>
                        <div className="cell-sub">
                          {subjectPoints(existingSubject)} pts · {existingSubject.parts.reduce((sum, p) => sum + p.questions.length, 0)} questions
                        </div>
                      </div>
                    ) : (
                      <span className="pill pill-neutral">Non rédigé</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                      {isToSchedule && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                          disabled={!rawEval}
                          onClick={() => rawEval && setSchedulingEval(rawEval)}
                          title="Définir la date et les horaires pour débloquer la composition du sujet"
                        >
                          <Calendar size={13} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                          Programmer la diffusion
                        </button>
                      )}

                      {isReady && !existingSubject && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                          onClick={() => open(undefined, exam)}
                        >
                          <FileText size={13} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                          Composer le sujet
                        </button>
                      )}

                      {existingSubject && (
                        <>
                          {!isAuthorized && !issue && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                              onClick={() => open(existingSubject, exam)}
                            >
                              Modifier le sujet
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                            onClick={() => {
                              open(existingSubject, exam);
                              setTab('preview');
                            }}
                          >
                            <Eye size={13} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                            Aperçu
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                            onClick={() => {
                              open(existingSubject, exam);
                              setTab('correction');
                            }}
                          >
                            Corrigé
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!filteredExams.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  Aucune épreuve ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </ResponsiveTable>
      </section>

      {/* Dialogue modal de programmation de la diffusion */}
      {schedulingEval && (
        <ExamDeliveryScheduleDialog
          evaluation={schedulingEval}
          onClose={() => setSchedulingEval(null)}
          onScheduled={() => {
            setSchedulingEval(null);
            void portal.refreshCampus();
            setRetry(r => r + 1);
          }}
        />
      )}

      {/* Bibliothèque de tous les sujets de l'année */}
      <section className="card card-full">
        <h2>Bibliothèque de tous les sujets enregistrés</h2>
        <p className="cell-sub" style={{ marginBottom: '1rem' }}>
          Historique exhaustif de tous les sujets de l’année académique avec leurs versions successives et barèmes.
        </p>
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
                      {row.status !== 'AUTORISE' && !subjectExamIssue(exams.find(exam => exam.id === row.evaluationId), now) && (
                        <IconButton className="btn btn-outline" onClick={() => open(row)} label="Modifier le sujet" />
                      )}
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
