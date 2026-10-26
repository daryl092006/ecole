'use client';
import SubjectRichText from '@/components/ui/SubjectRichText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePortal } from '@/hooks/usePortal';
import LoadingState from '@/components/ui/LoadingState';
import ReviewedForm from '@/components/ui/ReviewedForm';
import { listOnlineExams, readOnlineExam, writeOnlineExam, OnlineExamError } from '@/services/onlineExamService';
import { canRestoreExamDraft, emptyExamAnswer, examAnsweredCount, examAnswersEqual, type ExamLocalDraft } from '@/services/onlineExamDraftService';
import type { OnlineExamAnswer, OnlineExamCommand, OnlineExamDirectory, OnlineExamView } from '@/types/onlineExam';

const dateLabel = (value: string) => new Date(value).toLocaleString('fr-FR');
export default function StudentExamsWorkspace() {
  const portal = usePortal();
  const [directory, setDirectory] = useState<OnlineExamDirectory | null>(null);
  const [selected, setSelected] = useState<OnlineExamView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setDirectory(await listOnlineExams(portal.activeRole)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chargement indisponible.'); }
  }, [portal.activeRole]);
  useEffect(() => { void load(); }, [load, portal.academicYearContext?.selectedYearId]);
  if (!portal.perms.permissions.includes('exam.take')) return <p>Le passage des épreuves n’est pas autorisé pour ce rôle.</p>;
  if (selected) return <OnlineExamEditor key={selected.attempt.id} initial={selected} onBack={() => { setSelected(null); void load(); }} />;
  return <section className="card">
    <div className="page-intro"><div><h1>Mes épreuves en ligne</h1><p>Les réponses enregistrées sont remises automatiquement à la fin du temps imparti, même si cette page est fermée.</p></div><button className="btn btn-outline" disabled={busy} onClick={() => void load()}>Actualiser</button></div>
    {error && <p role="alert" className="restricted-box">{error}</p>}
    {!directory && !error && <LoadingState label="Chargement des épreuves…" />}
    {directory?.exams.map(exam => <article className="online-exam-entry" key={exam.evaluationId}>
      <h2>{exam.name}</h2><p>{dateLabel(exam.opensAt)} — {dateLabel(exam.closesAt)} · {exam.durationMinutes} minutes</p>
      <p>{exam.status ? exam.status === 'EN_COURS' ? 'Copie en cours' : 'Copie fermée' : 'Épreuve à passer'}</p>
      <button className="btn btn-primary" disabled={busy || (!exam.attemptId && (Date.parse(directory.serverNow) < Date.parse(exam.opensAt) || Date.parse(directory.serverNow) >= Date.parse(exam.closesAt)))} onClick={async () => {
        setBusy(true); setError('');
        try {
          setSelected(exam.attemptId ? await readOnlineExam(portal.activeRole, exam.attemptId) : await writeOnlineExam(portal.activeRole, { action: 'start', evaluationId: exam.evaluationId }));
          void portal.refreshCampus();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ouverture impossible.'); }
        finally { setBusy(false); }
      }}>{exam.status === 'EN_COURS' ? 'Reprendre ma copie' : exam.attemptId ? 'Consulter ma copie remise' : 'Commencer l’épreuve'}</button>
    </article>)}
    {directory && !directory.exams.length && <p>Aucune épreuve en ligne disponible pour votre inscription.</p>}
  </section>;
}

function OnlineExamEditor({ initial, onBack }: { initial: OnlineExamView; onBack: () => void }) {
  const portal = usePortal();
  const [view, setView] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const current = useRef(initial);
  const draft = useRef(initial.answers);
  const pending = useRef<OnlineExamCommand | null>(null);
  const flight = useRef<Promise<boolean> | null>(null);
  const reading = useRef(false);
  const blocked = useRef(false);
  const mounted = useRef(true);
  const clock = useRef({ server: Date.parse(initial.serverNow), local: performance.now() });
  const storageKey = `escen:exam:${portal.session?.accountId}:${initial.attempt.id}`;
  const serverTime = () => clock.current.server + performance.now() - clock.current.local;
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({ attemptId: current.current.attempt.id, revision: current.current.attempt.revision, saveId: pending.current && 'saveId' in pending.current ? pending.current.saveId : '', answers: draft.current } satisfies ExamLocalDraft)); }
    catch { /* Server autosave remains available when browser storage is disabled. */ }
  };
  const apply = (next: OnlineExamView) => {
    current.current = next;
    clock.current = { server: Date.parse(next.serverNow), local: performance.now() };
    if (!mounted.current) return;
    setView(next);
    if (next.attempt.status !== 'EN_COURS') {
      if (!examAnswersEqual(draft.current, next.answers)) setNotice('La copie remise contient uniquement les réponses reçues par le serveur avant l’échéance. Des changements locaux non enregistrés n’y figurent pas.');
      draft.current = next.answers; setAnswers(next.answers); setReview(false);
      try { localStorage.removeItem(storageKey); } catch { /* No local draft to clear. */ }
    } else persist();
  };
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  refreshRef.current = async () => {
    if (flight.current || reading.current) return;
    reading.current = true;
    try {
      const next = await readOnlineExam(portal.activeRole, initial.attempt.id);
      if (next.attempt.status === 'EN_COURS' && next.attempt.revision !== current.current.attempt.revision) {
        if (pending.current && 'saveId' in pending.current && pending.current.saveId === next.attempt.lastSaveId) pending.current = null;
        else { blocked.current = true; setConflict(true); setError('Une autre session a modifié cette copie. Rechargez la version enregistrée avant de continuer.'); return; }
      }
      apply(next);
    } catch (cause) { if (mounted.current) setError(cause instanceof OnlineExamError ? cause.message : 'Vérification de la remise impossible. Reconnexion en cours.'); }
    finally { reading.current = false; }
  };
  const pumpRef = useRef<(submit?: boolean) => Promise<boolean>>(async () => false);
  pumpRef.current = async (submit = false) => {
    if (flight.current) { const ok = await flight.current; return submit && ok ? pumpRef.current(true) : ok; }
    if (reading.current || blocked.current || current.current.attempt.status !== 'EN_COURS') return false;
    if (serverTime() >= Date.parse(current.current.attempt.deadlineAt)) { await refreshRef.current(); return false; }
    if (!pending.current && !submit && examAnswersEqual(draft.current, current.current.answers)) return true;
    const command = pending.current || {
      action: submit ? 'submit' : 'save', attemptId: initial.attempt.id, revision: current.current.attempt.revision,
      saveId: crypto.randomUUID(), answers: Object.entries(draft.current).map(([questionId, response]) => ({ questionId, response })),
    } satisfies OnlineExamCommand;
    pending.current = command; persist();
    const perform = async () => {
      if (mounted.current) setSaving(true);
      try {
        const next = await writeOnlineExam(portal.activeRole, command);
        pending.current = null; apply(next);
        if (mounted.current) setError('');
        void portal.refreshCampus();
        return next.accepted !== false;
      } catch (cause) {
        if (cause instanceof OnlineExamError && [401, 403, 409, 422].includes(cause.status)) {
          blocked.current = true;
          if (mounted.current) setConflict(true);
        }
        if (mounted.current) setError(cause instanceof OnlineExamError ? cause.message : 'Connexion interrompue. Réponses conservées sur cet appareil ; nouvelle tentative automatique.');
        return false;
      } finally { if (mounted.current) setSaving(false); }
    };
    flight.current = perform();
    const ok = await flight.current;
    flight.current = null;
    if (submit && ok && command.action === 'save') return pumpRef.current(true);
    return ok;
  };
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const local = JSON.parse(raw) as ExamLocalDraft;
        if (local.answers && Object.values(local.answers).every(a => typeof a.text === 'string' && Array.isArray(a.option_ids)) && canRestoreExamDraft(local, initial)) {
          draft.current = local.answers; setAnswers(local.answers);
          setNotice('Brouillon de cet appareil retrouvé. Les changements seront enregistrés avant l’échéance si la connexion est disponible.');
        } else if (initial.attempt.status === 'EN_COURS') {
          blocked.current = true; setConflict(true); setError('Le brouillon local ne correspond plus à la copie enregistrée. Rechargez la version enregistrée pour éviter de l’écraser.');
        } else localStorage.removeItem(storageKey);
      }
    } catch { /* An unreadable local draft never replaces saved server answers. */ }
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((Date.parse(current.current.attempt.deadlineAt) - serverTime()) / 1000));
      setRemaining(seconds);
      if (current.current.attempt.status === 'EN_COURS') {
        if (!seconds) void refreshRef.current();
        else void pumpRef.current();
      }
    }, 750);
    setRemaining(Math.max(0, Math.ceil((Date.parse(initial.attempt.deadlineAt) - serverTime()) / 1000)));
    const resync = () => { if (!document.hidden) void refreshRef.current().then(() => pumpRef.current()); };
    const leave = (event: BeforeUnloadEvent) => { if (current.current.attempt.status === 'EN_COURS' && !examAnswersEqual(draft.current, current.current.answers)) { event.preventDefault(); } };
    window.addEventListener('online', resync); window.addEventListener('pageshow', resync); document.addEventListener('visibilitychange', resync); window.addEventListener('beforeunload', leave);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('online', resync); window.removeEventListener('pageshow', resync); document.removeEventListener('visibilitychange', resync); window.removeEventListener('beforeunload', leave); };
    // The editor is keyed by attempt. Timers read current values through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const terminal = view.attempt.status !== 'EN_COURS';
  const locked = terminal || remaining <= 0 || submitting || review || conflict;
  const dirty = !examAnswersEqual(answers, view.answers);
  const questions = view.paper.parts.flatMap(part => part.questions);
  const update = (id: string, value: OnlineExamAnswer) => {
    const next = { ...draft.current, [id]: value }; draft.current = next; setAnswers(next); persist();
  };
  return <section className="card online-exam-workspace" aria-label="Ma copie">
    <h1>{view.paper.title}</h1>
    <div className="online-exam-status" role="status">{terminal
      ? <p>Copie {view.attempt.status === 'INTERROMPUE' ? 'interrompue' : 'remise'}{view.attempt.submittedAt ? ` le ${dateLabel(view.attempt.submittedAt)}` : ''}{view.attempt.submissionKind === 'AUTO_DEADLINE' ? ' automatiquement à l’échéance' : ''}. {examAnsweredCount(view.answers)} / {questions.length} réponse(s) enregistrée(s). {view.attempt.completionStatus === 'NON_TRAITE' ? 'Copie non traitée : 0/20 à enregistrer dans les notes.' : ''}</p>
      : <><p>Temps restant : {Math.floor(remaining / 60)} min {remaining % 60} s · Fin : {dateLabel(view.attempt.deadlineAt)}</p><p>{saving ? 'Enregistrement…' : dirty ? 'Changements en attente d’enregistrement' : 'Toutes les réponses sont enregistrées'}</p></>}
    </div>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="restricted-box">{error}</p>}
    {conflict && <button className="btn btn-outline" onClick={async () => {
      try { const next = await readOnlineExam(portal.activeRole, initial.attempt.id); pending.current = null; draft.current = next.answers; setAnswers(next.answers); blocked.current = false; setConflict(false); setError(''); apply(next); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Rechargement impossible.'); }
    }}>Recharger la version enregistrée</button>}
    {view.paper.parts.map(part => <section key={part.id}><h2>{part.title}</h2>{part.instructions && <p>{part.instructions}</p>}{part.questions.map((question, index) => {
      const answer = answers[question.id] || emptyExamAnswer();
      return <fieldset className="online-exam-question" disabled={locked} key={question.id}><legend>{index + 1}. ({question.points} points)</legend><SubjectRichText value={question.prompt} />
        {question.kind.startsWith('QCM') ? question.options.map(option => <label className="checkbox-field" key={option.id}><input type={question.kind === 'QCM_SIMPLE' ? 'radio' : 'checkbox'} name={question.id} checked={answer.option_ids.includes(option.id)} onChange={event => update(question.id, { text: '', option_ids: question.kind === 'QCM_SIMPLE' ? [option.id] : event.target.checked ? [...answer.option_ids, option.id] : answer.option_ids.filter(id => id !== option.id) })} />{option.label}</label>)
          : <label className="form-group">Votre réponse<textarea className="input" rows={6} maxLength={20000} value={answer.text} onChange={event => update(question.id, { text: event.target.value, option_ids: [] })} /></label>}
      </fieldset>;
    })}</section>)}
    {review && !terminal && <ReviewedForm reviewInitially busy={submitting} error={error} confirmLabel="Confirmer la remise de ma copie"
      fields={[{ label: 'Réponses renseignées', value: `${examAnsweredCount(answers)} / ${questions.length}` }, { label: 'Échéance', value: dateLabel(view.attempt.deadlineAt) }]}
      consequence="La copie sera définitivement remise avec les réponses reçues avant l’échéance. Vous ne pourrez plus les modifier. Une copie vide conserve le statut non traité et vaut 0/20."
      onCancelReview={() => setReview(false)} onConfirm={async () => { setSubmitting(true); await pumpRef.current(true); if (mounted.current) setSubmitting(false); }} />}
    <div className="online-exam-actions">
      {!terminal && <button className="btn btn-primary" disabled={locked} onClick={() => setReview(true)}>Remettre ma copie</button>}
      {!terminal && <button className="btn btn-outline" disabled={saving || submitting} onClick={() => void pumpRef.current()}>Enregistrer maintenant</button>}
      {terminal && <button className="btn btn-outline" onClick={onBack}>Retour aux épreuves</button>}
      {!terminal && <p>Gardez une connexion active. À l’échéance, seules les réponses déjà reçues par le serveur seront remises.</p>}
    </div>
  </section>;
}
