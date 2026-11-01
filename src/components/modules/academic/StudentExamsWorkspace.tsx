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
  const antiCheatKey = `escen:anticheat:${initial.attempt.id}`;
  const [antiCheatAlert, setAntiCheatAlert] = useState<string>('');
  const [antiCheatCount, setAntiCheatCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(antiCheatKey);
      return stored ? Number(JSON.parse(stored).count) || 0 : 0;
    } catch { return 0; }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(() => {
    return initial.attempt.status === 'EN_COURS' && typeof document !== 'undefined' && !document.fullscreenElement;
  });

  const recordAntiCheatIncident = useCallback((type: string, message: string) => {
    if (current.current.attempt.status !== 'EN_COURS') return;
    setAntiCheatCount(prev => {
      const nextCount = prev + 1;
      try {
        const history = JSON.parse(localStorage.getItem(antiCheatKey) || '{"events":[]}');
        history.count = nextCount;
        history.events = history.events || [];
        history.events.push({ type, time: new Date().toISOString(), message });
        localStorage.setItem(antiCheatKey, JSON.stringify(history));
      } catch { /* storage fallback */ }
      setAntiCheatAlert(`⚠️ Incident anti-triche détecté (${nextCount}/3) : ${message}. Cet événement est consigné et transmis avec votre copie.`);
      return nextCount;
    });
  }, [antiCheatKey]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch { /* Fullscreen browser fallback */ }
  };
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
    const handleVisibility = () => {
      if (document.hidden && current.current.attempt.status === 'EN_COURS') {
        recordAntiCheatIncident('TAB_SWITCH', 'Sortie d’écran ou changement d’onglet');
        setIsLockedOut(true);
      } else if (!document.hidden) {
        void refreshRef.current().then(() => pumpRef.current());
      }
    };
    const handleBlur = () => {
      if (current.current.attempt.status === 'EN_COURS') {
        recordAntiCheatIncident('WINDOW_BLUR', 'Perte de focus de la fenêtre d’examen');
        setIsLockedOut(true);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (current.current.attempt.status !== 'EN_COURS') return;
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'p', 'P', 's', 'S'].includes(e.key)) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        recordAntiCheatIncident('SHORTCUT_BLOCKED', `Raccourci système bloqué (${e.key})`);
        setIsLockedOut(true);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (current.current.attempt.status === 'EN_COURS') {
        e.preventDefault();
        recordAntiCheatIncident('CONTEXT_MENU', 'Tentative de clic droit');
      }
    };
    const handleCopy = (e: ClipboardEvent) => {
      if (current.current.attempt.status === 'EN_COURS') {
        e.preventDefault();
        recordAntiCheatIncident('COPY_ATTEMPT', 'Tentative de copie du sujet');
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      if (current.current.attempt.status === 'EN_COURS') {
        e.preventDefault();
        recordAntiCheatIncident('PASTE_ATTEMPT', 'Tentative de collage externe');
      }
    };
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && current.current.attempt.status === 'EN_COURS') {
        recordAntiCheatIncident('FULLSCREEN_EXIT', 'Sortie du mode plein écran obligatoire');
        setIsLockedOut(true);
      }
    };
    const leave = (event: BeforeUnloadEvent) => { if (current.current.attempt.status === 'EN_COURS' && !examAnswersEqual(draft.current, current.current.answers)) { event.preventDefault(); } };
    window.addEventListener('online', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', leave);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener('online', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', leave);
    };
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
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-primary, #f8fafc)', overflowY: 'auto', padding: '24px 16px' }}>
      {/* Overlay Bloquant Anti-Triche */}
      {isLockedOut && !terminal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              textAlign: 'center',
              padding: '36px 28px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #ef4444',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                fontSize: '32px',
              }}
            >
              🔒
            </div>
            <h2 style={{ fontSize: '20px', color: '#991b1b', margin: '0 0 12px' }}>
              ÉCRAN VERROUILLÉ — SORTIE D'ÉCRAN DÉTECTÉE
            </h2>
            <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
              Le règlement des examens ESCEN <strong>interdit formellement de quitter l'écran de composition</strong>, de changer d’onglet, de minimiser le navigateur ou de quitter le plein écran.
            </p>
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontWeight: 600,
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              ⚠️ Infraction n°{antiCheatCount} enregistrée et portée au rapport de correction.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '15px',
                fontWeight: 700,
                background: '#dc2626',
                borderColor: '#dc2626',
              }}
              onClick={async () => {
                await toggleFullscreen();
                setIsLockedOut(false);
              }}
            >
              Réactiver le plein écran et déverrouiller
            </button>
          </div>
        </div>
      )}

      {/* Conteneur principal de l'examen */}
      <div style={{ maxWidth: '960px', margin: '0 auto', filter: isLockedOut && !terminal ? 'blur(10px)' : 'none', pointerEvents: isLockedOut && !terminal ? 'none' : 'auto', userSelect: 'none' }}>
        <section className="card online-exam-workspace" aria-label="Ma copie">
    <h1>{view.paper.title}</h1>
    {(() => {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      const timeDisplay = hours > 0
        ? `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
        : `${minutes} min ${String(seconds).padStart(2, '0')} s`;
      const answeredCount = examAnsweredCount(answers);
      const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

      return (
        <div className="online-exam-status" role="status" style={{ padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', background: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid var(--border-color, #e2e8f0)' }}>
          {terminal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                Copie {view.attempt.status === 'INTERROMPUE' ? 'interrompue' : 'remise'}
                {view.attempt.submittedAt ? ` le ${dateLabel(view.attempt.submittedAt)}` : ''}
                {view.attempt.submissionKind === 'AUTO_DEADLINE' ? ' automatiquement à l’échéance de la minuterie' : ''}.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="pill pill-default">
                  {examAnsweredCount(view.answers)} / {questions.length} réponse(s) enregistrée(s)
                </span>
                {antiCheatCount > 0 ? (
                  <span className="pill pill-warning">⚠️ {antiCheatCount} alerte(s) anti-triche consignée(s)</span>
                ) : (
                  <span className="pill pill-success">🛡️ Intégrité conforme</span>
                )}
                {view.attempt.completionStatus === 'NON_TRAITE' && (
                  <span className="pill pill-danger">Copie non traitée (0/20)</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                {/* Timer dynamique haute visibilité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '15px',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      background: remaining <= 300 ? '#dc2626' : remaining <= 600 ? '#d97706' : '#2563eb',
                      color: '#ffffff',
                      boxShadow: remaining <= 300 ? '0 0 12px rgba(220, 38, 38, 0.4)' : 'none',
                    }}
                  >
                    ⏱️ {timeDisplay}
                  </span>
                  <span className="cell-sub" style={{ fontSize: '13px' }}>
                    Fin de l’épreuve : <strong>{dateLabel(view.attempt.deadlineAt)}</strong>
                  </span>
                </div>

                {/* Progression & Actions d'intégrité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    className={`pill ${answeredCount === questions.length ? 'pill-success' : 'pill-info'}`}
                    style={{ fontWeight: 600 }}
                  >
                    📝 {answeredCount} / {questions.length} répondues ({progressPercent}%)
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={toggleFullscreen}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {isFullscreen ? 'Quitter plein écran' : '🖥️ Plein écran'}
                  </button>
                  <span className="cell-sub" style={{ fontSize: '12px' }}>
                    {saving ? 'Enregistrement…' : dirty ? 'Enregistrement en attente' : '✓ Enregistré'}
                  </span>
                </div>
              </div>

              {/* Barre de progression des questions */}
              <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary, #2563eb)', transition: 'width 0.3s ease' }} />
              </div>

              {/* Alerte Urgence Moins de 5 minutes */}
              {remaining > 0 && remaining <= 300 && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ Attention : il reste moins de 5 minutes ! Vos réponses enregistrées seront remises automatiquement à 00:00.
                </div>
              )}

              {/* Alerte Anti-Triche */}
              {antiCheatAlert && (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#b45309', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>{antiCheatAlert}</span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setAntiCheatAlert('')} style={{ fontSize: '11px', padding: '2px 8px' }}>
                    J’ai compris
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    })()}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="restricted-box">{error}</p>}
    {conflict && <button className="btn btn-outline" onClick={async () => {
      try { const next = await readOnlineExam(portal.activeRole, initial.attempt.id); pending.current = null; draft.current = next.answers; setAnswers(next.answers); blocked.current = false; setConflict(false); setError(''); apply(next); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Rechargement impossible.'); }
    }}>Recharger la version enregistrée</button>}
    {view.paper.parts.map(part => <section key={part.id}><h2>{part.caseStudy ? `Étude de cas : ${part.title}` : part.title}</h2>{part.instructions && <p className="subject-text">{part.instructions}</p>}{part.questions.map((question, index) => {
      const answer = answers[question.id] || emptyExamAnswer();
      return <fieldset className="online-exam-question" disabled={locked} key={question.id}><legend>{index + 1}. ({question.points} points)</legend><SubjectRichText value={question.prompt} />
        {question.kind.startsWith('QCM') ? <>
          {question.options.map(option => <label className="checkbox-field" key={option.id}><input type={question.kind === 'QCM_SIMPLE' ? 'radio' : 'checkbox'} name={question.id} checked={answer.option_ids.includes(option.id)} onChange={event => update(question.id, { text: question.requiresJustification ? answer.text : '', option_ids: question.kind === 'QCM_SIMPLE' ? [option.id] : event.target.checked ? [...answer.option_ids, option.id] : answer.option_ids.filter(id => id !== option.id) })} />{option.label}</label>)}
          {question.requiresJustification && <label className="form-group">Justifiez votre réponse<textarea className="input" rows={3} maxLength={20000} value={answer.text} onChange={event => update(question.id, { ...answer, text: event.target.value })} /></label>}
        </> : <label className="form-group">Votre réponse<textarea className="input" rows={question.presentation === 'SHORT_TEXT' ? 2 : 6} maxLength={20000} value={answer.text} onChange={event => update(question.id, { text: event.target.value, option_ids: [] })} /></label>}
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
        </section>
      </div>
    </div>
  );
}
