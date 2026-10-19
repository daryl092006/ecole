/* eslint-disable @typescript-eslint/no-require-imports -- Loaded by the existing Node assertion runner. */
const assert = require('node:assert/strict');
import { emptyDataset } from '@/types/application';
import { executeExamAction } from '@/services/examService';
import { transitionGradeWorkflow } from '@/services/gradeService';
import { ROLES } from '@/types/permissions';
const data = emptyDataset();
data.assignments.push({ id: 'A', teacherId: 'T', groupId: 'G', academicYearId: 'Y', semesterId: 'S', subjectId: 'SUB', active: true });
data.students.push({
  matricule: 'E', firstname: 'Étudiant', lastname: 'Test', email: '', phone: '',
  gender: '', birthDate: '', nationality: '', address: '', city: '', country: '',
  filiere: '', niveau: '', groupe: 'G', groupId: 'G', academicYearId: 'Y',
  status: 'Inscrit', history: [], bourse: { active: false, type: '', percent: 0, amount: 0 },
  financials: { expected: 0, paid: 0, remaining: 0, installments: [] },
});
data.exams.push({ id: 'X', assignmentId: 'A', evaluationId: 'V', mode: 'EN_LIGNE', date: '2026-10-15', startTime: '08:00', endTime: '09:00', kind: 'EXAMEN', roomCode: '', supervisorId: '', status: 'PLANIFIE', reason: '' });
data.evaluations.push({ id: 'V', classId: 'A', type: 'Examen', name: 'Test', date: '2026-10-15', status: 'BROUILLON', grades: [{ matricule: 'E', value: null }], history: [] });
const before = new Date('2026-10-14T10:00:00Z');
const during = new Date('2026-10-15T08:00:00Z');
const after = new Date('2026-10-15T09:01:00Z');
const subject = { examId: 'X', durationMinutes: 30, questions: [{ id: 'Q1', kind: 'QCM', prompt: 'Choisir', points: 10, options: ['A', 'B'], correctOption: 1 }, { id: 'Q2', kind: 'TEXTE', prompt: 'Expliquer', points: 10, options: [] }] };
assert.throws(() => executeExamAction(data, ROLES.ENS, 'OTHER', 'exam.paper', subject, before));
executeExamAction(data, ROLES.ENS, 'T', 'exam.paper', subject, before);
assert.throws(() => executeExamAction(data, ROLES.STUD, 'E', 'exam.start', { examId: 'X' }, during));
executeExamAction(data, ROLES.DA, 'DA', 'exam.authorize', { examId: 'X' }, before);
assert.throws(() => executeExamAction(data, ROLES.ENS, 'T', 'exam.paper', subject, before));
assert.throws(() => executeExamAction(data, ROLES.STUD, 'OTHER', 'exam.start', { examId: 'X' }, during));
executeExamAction(data, ROLES.STUD, 'E', 'exam.start', { examId: 'X' }, during);
assert.throws(() => executeExamAction(data, ROLES.STUD, 'E', 'exam.start', { examId: 'X' }, during));
executeExamAction(data, ROLES.STUD, 'E', 'exam.answer', { examId: 'X', questionId: 'Q1', answer: '1' }, during);
assert.throws(() => executeExamAction(data, ROLES.STUD, 'E', 'exam.answer', { examId: 'X', questionId: 'Q1', answer: '0' }, after));
const copy = data.examAttempts[0];
assert.throws(() => executeExamAction(data, ROLES.ENS, 'T', 'exam.correct', { examId: 'X', attemptId: copy.id, scores: { Q2: 8 } }, during));
executeExamAction(data, ROLES.ENS, 'T', 'exam.correct', { examId: 'X', attemptId: copy.id, scores: { Q2: 8 } }, after);
assert.equal(data.evaluations[0].grades[0].value, 18);
assert.equal(copy.status, 'REMISE');
assert.equal(copy.submittedAt, '2026-10-15T08:30:00.000Z');
assert.throws(() => executeExamAction(data, ROLES.STUD, 'E', 'exam.answer', { examId: 'X', questionId: 'Q1', answer: '0' }, after));
data.evaluations[0].status = 'SOUMISES';
assert.throws(() => executeExamAction(data, ROLES.ENS, 'T', 'exam.correct', { examId: 'X', attemptId: copy.id, scores: { Q2: 10 } }, after));
data.exams[0].mode = 'PAPIER'; data.evaluations[0].status = 'BROUILLON';
assert.throws(() => executeExamAction(data, ROLES.ENS, 'T', 'exam.results', { examId: 'X', rows: [{ matricule: 'E', value: 0, absent: false }] }, during));
assert.throws(() => executeExamAction(data, ROLES.ENS, 'T', 'exam.results', { examId: 'X', rows: [{ matricule: 'E', value: 0, absent: true }] }, after));
executeExamAction(data, ROLES.ENS, 'T', 'exam.results', { examId: 'X', rows: [{ matricule: 'E', value: null, absent: true }] }, after);
assert.throws(() => transitionGradeWorkflow(data.evaluations[0], 'SOUMISES', { actor: 'T', role: ROLES.ENS, teacherId: 'T' }));
console.log('Vérification réussie : examens papier et en ligne, affectations, expiration, correction et absences.');

const online = structuredClone(data);
online.exams[0].mode = 'EN_LIGNE'; online.evaluations[0].status = 'BROUILLON'; online.evaluations[0].grades[0] = { matricule: 'E', value: null };
online.examAttempts = [];
online.students.push({ ...online.students[0], matricule: 'LATE' });
assert.throws(() => executeExamAction(online, ROLES.STUD, 'LATE', 'exam.start', { examId: 'X' }, during), /non autorisé/);
const late = new Date('2026-10-15T08:50:00Z');
executeExamAction(online, ROLES.DEL, 'E', 'exam.start', { examId: 'X' }, late);
assert.equal(online.examAttempts[0].deadline, '2026-10-15T09:00:00.000Z');
const unchanged = JSON.stringify(online);
assert.throws(() => executeExamAction(online, ROLES.ENS, 'T', 'exam.correct', { examId: 'X', attemptId: online.examAttempts[0].id, scores: { Q2: 11 } }, after));
assert.equal(JSON.stringify(online), unchanged, 'An invalid correction must not seal or partially change a copy.');
assert.throws(() => executeExamAction(online, ROLES.STG, 'STG', 'exam.correct', { examId: 'X', attemptId: online.examAttempts[0].id, scores: { Q2: 8 } }, after));
assert.throws(() => executeExamAction(online, ROLES.STUD, 'E', 'exam.answer', { examId: 'X', questionId: 'Q1', answer: '9' }, late));
executeExamAction(online, ROLES.STUD, 'E', 'exam.answer', { examId: 'X', questionId: 'Q1', answer: '' }, late);
executeExamAction(online, ROLES.STUD, 'E', 'exam.submit', { examId: 'X' }, after);
assert.equal(online.examAttempts[0].scores.Q1, 0, 'An unanswered QCM must score zero.');
assert.throws(() => executeExamAction({ ...online, evaluations: [] }, ROLES.STUD, 'E', 'exam.start', { examId: 'X' }, during));
const cancelledData = structuredClone(online); cancelledData.exams[0].status = 'ANNULE';
assert.throws(() => executeExamAction(cancelledData, ROLES.ENS, 'T', 'exam.correct', { examId: 'X', attemptId: online.examAttempts[0].id, scores: { Q2: 8 } }, after));
assert.throws(() => transitionGradeWorkflow({ ...online.evaluations[0], examCancelled: true }, 'SAISIES', { actor: 'T', role: ROLES.ENS, teacherId: 'T' }));

const draft = structuredClone(online); draft.examPapers = []; draft.examAttempts = [];
assert.throws(() => executeExamAction(draft, ROLES.ENS, 'T', 'exam.paper', { ...subject, durationMinutes: 61 }, before));
assert.throws(() => executeExamAction(draft, ROLES.ENS, 'T', 'exam.paper', { ...subject, questions: subject.questions.map(q => ({ ...q, points: 9 })) }, before));
assert.throws(() => executeExamAction(draft, ROLES.ENS, 'T', 'exam.paper', { ...subject, questions: subject.questions.map(q => ({ ...q, id: 'same' })) }, before));
assert.throws(() => executeExamAction(draft, ROLES.ENS, 'T', 'exam.paper', { ...subject, questions: subject.questions.map(q => ({ ...q, id: '__proto__' })) }, before));
assert.throws(() => executeExamAction(draft, ROLES.ENS, 'T', 'exam.paper', { ...subject, questions: subject.questions.map(q => q.kind === 'QCM' ? { ...q, options: ['A', 'A'] } : q) }, before));

const { getVisibleExamRecords, getVisibleExamAuditLogs, displayExamAnswer } = require('./examQueryService.ts');
assert.equal(getVisibleExamRecords(online, ROLES.ENS, 'OTHER', during.getTime()).exams.length, 0);
assert.equal(getVisibleExamRecords(online, ROLES.IT, 'IT', after.getTime()).examPapers.length, 1);
assert.equal(getVisibleExamRecords(online, ROLES.STUD, 'LATE', during.getTime()).exams.length, 0);
assert.equal(getVisibleExamRecords(online, ROLES.STUD, 'E', before.getTime()).examPapers[0].questions.length, 0);
const studentView = getVisibleExamRecords(online, ROLES.STUD, 'E', during.getTime());
assert.equal(Object.hasOwn(studentView.examPapers[0].questions[0], 'correctOption'), false);
assert.deepEqual(studentView.examAttempts[0].scores, {});
assert.deepEqual(studentView.exams[0].candidateIds, ['E']);
assert.deepEqual(getVisibleExamRecords(online, ROLES.ENS, 'T', during.getTime()).examAttempts[0].answers, {});
assert.deepEqual(getVisibleExamRecords(online, ROLES.ENS, 'T', after.getTime()).examAttempts[0].answers, { Q1: '' });
assert.equal(displayExamAnswer(online.examPapers[0].questions[0], ''), 'Sans réponse');
assert.equal(displayExamAnswer(online.examPapers[0].questions[0], '0'), 'A');

const logs = [
  { date: before.toISOString(), user: 'T', action: 'exam.paper', details: JSON.stringify({ collection: 'examPapers', oldValue: null, newValue: online.examPapers[0] }) },
  { date: after.toISOString(), user: 'E', action: 'exam.submit', details: JSON.stringify({ collection: 'examAttempts', oldValue: null, newValue: online.examAttempts[0] }) },
  { date: after.toISOString(), user: 'T', action: 'exam.correct', details: JSON.stringify({ collection: 'evaluations', oldValue: null, newValue: online.evaluations[0] }) },
  { date: after.toISOString(), user: 'T', action: 'Saisie note', details: JSON.stringify({ entity: 'V', oldValue: 10, newValue: 18 }) },
];
const technical = getVisibleExamAuditLogs(logs, ROLES.IT);
assert.deepEqual(technical, logs);
assert.ok(JSON.parse(logs[0].details).newValue.questions, 'The original in-memory audit remains intact.');
assert.ok(JSON.parse(getVisibleExamAuditLogs(logs, ROLES.DG)[2].details).newValue.grades);
assert.deepEqual(getVisibleExamAuditLogs(logs, ROLES.STUD), []);

const { executeCampusWorkflow } = require('./campusWorkflowService.ts');
assert.throws(() => executeCampusWorkflow(online, { role: ROLES.DA, actor: 'DA', users: [] }, 'exam.cancel', { examId: 'X', reason: 'Erreur de planification' }), /copies ou résultats/);
assert.throws(() => executeCampusWorkflow(data, { role: ROLES.LOG, actor: 'LOG', users: [] }, 'exam.cancel', { examId: 'X', reason: 'Erreur de planification' }), /copies ou résultats/);
const cleanCancellation = executeCampusWorkflow(draft, { role: ROLES.DA, actor: 'DA', users: [] }, 'exam.cancel', { examId: 'X', reason: 'Erreur de planification' });
assert.equal(cleanCancellation.data.exams[0].status, 'ANNULE');
assert.equal(cleanCancellation.data.evaluations[0].examCancelled, true);
assert.equal(draft.exams[0].status, 'PLANIFIE');
console.log('Vérification réussie : candidats figés, remise tardive verrouillée, corrections atomiques, confidentialité et annulations protégées.');
assert.equal(getVisibleExamRecords(online, ROLES.SITE, 'SITE', during.getTime()).exams.length, 1);
assert.equal(getVisibleExamRecords(online, ROLES.SITE, 'SITE', during.getTime()).examPapers.length, 0);
const suspendedData = structuredClone(draft); suspendedData.students[0].status = 'Suspendu';
executeExamAction(suspendedData, ROLES.ENS, 'T', 'exam.paper', subject, before);
executeExamAction(suspendedData, ROLES.DA, 'DA', 'exam.authorize', { examId: 'X' }, before);
assert.throws(() => executeExamAction(suspendedData, ROLES.STUD, 'E', 'exam.start', { examId: 'X' }, during));
const { getSessionCandidateIds } = require('./scheduleService.ts');
assert.deepEqual(getSessionCandidateIds({ groupId: 'G', candidateIds: ['E'] }, online.students), ['E'], 'Exam attendance must not include later arrivals.');
assert.deepEqual(getSessionCandidateIds({ groupId: 'G' }, online.students), ['E', 'LATE'], 'Ordinary courses keep their current group attendance.');

const technicianCorrection = structuredClone(online);
executeExamAction(technicianCorrection, ROLES.IT, 'IT', 'exam.correct', { examId: 'X', attemptId: online.examAttempts[0].id, scores: { Q2: 8 } }, after);
assert.equal(technicianCorrection.evaluations[0].grades[0].value, 8);
