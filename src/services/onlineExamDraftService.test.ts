import assert from 'node:assert/strict';
import { canRestoreExamDraft, examAnsweredCount, examAnswersEqual } from './onlineExamDraftService';
import type { OnlineExamView } from '@/types/onlineExam';

const view: OnlineExamView = {
  serverNow: '2026-10-18T10:00:00Z', lastSavedAt: null,
  attempt: { id: 'attempt', evaluationId: 'evaluation', paperId: 'paper', revision: 3, lastSaveId: 'accepted', status: 'EN_COURS', startedAt: '2026-10-18T09:00:00Z', deadlineAt: '2026-10-18T11:00:00Z', submittedAt: null, submissionKind: null, completionStatus: null },
  paper: { id: 'paper', title: 'Test', parts: [] }, answers: {},
};
const draft = { attemptId: 'attempt', revision: 3, saveId: 'local', answers: { q1: { text: 'Réponse partielle', option_ids: [] } } };
assert.ok(canRestoreExamDraft(draft, view));
assert.ok(canRestoreExamDraft({ ...draft, revision: 2, saveId: 'accepted' }, view), 'Retrouver une sauvegarde reçue malgré la perte de sa réponse réseau.');
assert.equal(canRestoreExamDraft({ ...draft, revision: 2 }, view), false, 'Ne pas écraser la copie modifiée ailleurs.');
assert.equal(canRestoreExamDraft({ ...draft, attemptId: 'other' }, view), false);
assert.equal(canRestoreExamDraft(draft, { ...view, serverNow: view.attempt.deadlineAt }), false, 'Ne jamais restaurer des réponses locales après l’échéance.');
assert.equal(canRestoreExamDraft(draft, { ...view, attempt: { ...view.attempt, status: 'EXPIREE' } }), false);
assert.equal(examAnsweredCount({ blank: { text: '  \n', option_ids: [] }, ...draft.answers, q2: { text: '', option_ids: ['option'] } }), 2);
assert.ok(examAnswersEqual({}, { q1: { text: '', option_ids: [] } }));
assert.equal(examAnswersEqual(draft.answers, {}), false);
assert.ok(examAnswersEqual({ ...draft.answers, empty: { text: '', option_ids: [] } }, draft.answers));
console.log('Vérification réussie : reprise des copies, réponses partielles, conflits et interdiction de restaurer après échéance.');
