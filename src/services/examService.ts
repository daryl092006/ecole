import { z } from 'zod';
import type { Dataset } from '@/types/application';
import type { ExamQuestion } from '@/types/exam';
import type { RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { createMockId } from '@/utils/createMockId';

export type ExamAction = 'exam.results' | 'exam.paper' | 'exam.authorize' | 'exam.start' | 'exam.answer' | 'exam.submit' | 'exam.correct';
const questionFields = {
  id: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value)),
  prompt: z.string().trim().min(1).max(4000),
  points: z.number().positive().max(20),
};
const questionSchema = z.discriminatedUnion('kind', [
  z.object({ ...questionFields, kind: z.literal('TEXTE'), options: z.array(z.string()).transform(() => []).default([]) }),
  z.object({
    ...questionFields, kind: z.literal('QCM'),
    options: z.array(z.string().trim().min(1).max(1000)).min(2).max(8),
    correctOption: z.number().int().nonnegative(),
  }),
]);
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function executeExamAction(data: Dataset, role: RoleName, actor: string, action: ExamAction, payload: unknown, now = new Date()): void {
  const input = z.object({ examId: z.string().min(1) }).passthrough().parse(payload);
  const exam = data.exams.find(item => item.id === input.examId);
  check(exam && exam.status !== 'ANNULE', 'Épreuve introuvable ou annulée.');
  const assignment = data.assignments.find(item => item.id === exam.assignmentId);
  check(assignment, 'Affectation introuvable.');
  const evaluation = data.evaluations.find(item => item.id === exam.evaluationId);
  check(evaluation && evaluation.classId === exam.assignmentId && !evaluation.examCancelled, 'Évaluation liée introuvable ou annulée.');
  const teacher = role === ROLES.IT || (role === ROLES.ENS && actor === assignment.teacherId);
  const student = data.students.find(item => item.matricule === actor);
  const own = (role === ROLES.STUD || role === ROLES.DEL) && student?.groupId === assignment.groupId && student.academicYearId === assignment.academicYearId && ['Inscrit', 'Réinscrit', 'Actif'].includes(student.status) && evaluation.grades.some(grade => grade.matricule === actor);
  const paper = data.examPapers.find(item => item.id === exam.id);
  const start = new Date(`${exam.date}T${exam.startTime}:00Z`).getTime();
  const end = new Date(`${exam.date}T${exam.endTime}:00Z`).getTime();
  const afterExam = now.getTime() >= end;
  const editable = ['BROUILLON', 'SAISIES'].includes(evaluation.status);
  if (action === 'exam.results') {
    check(teacher && exam.mode !== 'EN_LIGNE' && afterExam && editable, 'Saisie réservée à l’enseignant affecté après l’épreuve et avant soumission.');
    const rows = z.array(z.object({ matricule: z.string(), value: z.number().min(0).max(20).nullable(), absent: z.boolean() })).min(1).parse(input.rows);
    check(new Set(rows.map(row => row.matricule)).size === rows.length, 'Matricule en double.');
    check(rows.every(row => evaluation.grades.some(grade => grade.matricule === row.matricule) && (!row.absent || row.value === null)), 'Étudiant inconnu ou note attribuée à une absence.');
    evaluation.grades = evaluation.grades.map(grade => rows.find(row => row.matricule === grade.matricule) ?? grade);
    evaluation.status = 'SAISIES';
    return;
  }
  check(exam.mode === 'EN_LIGNE', 'Cette épreuve se déroule sur papier.');
  if (action === 'exam.paper') {
    check(teacher && (!paper || paper.status === 'BROUILLON') && now.getTime() < start, 'Sujet modifiable par l’enseignant affecté avant autorisation et ouverture.');
    const questions: ExamQuestion[] = z.array(questionSchema).min(1).max(100).parse(input.questions);
    const durationMinutes = z.number().int().positive().parse(input.durationMinutes);
    check(durationMinutes * 60000 <= end - start, 'La durée dépasse la fenêtre de passage.');
    check(new Set(questions.map(q => q.id)).size === questions.length && Math.abs(questions.reduce((sum, q) => sum + q.points, 0) - 20) < 0.000001, 'Identifiants uniques et barème total de 20 points obligatoires.');
    check(questions.every(q => q.kind === 'TEXTE' || (q.options.length >= 2 && q.correctOption !== undefined && q.correctOption < q.options.length && new Set(q.options).size === q.options.length)), 'Chaque QCM nécessite des choix distincts et une bonne réponse valide.');
    const next = { id: exam.id, questions, durationMinutes, status: 'BROUILLON' as const };
    data.examPapers = [...data.examPapers.filter(item => item.id !== exam.id), next];
    return;
  }
  if (action === 'exam.authorize') {
    check((role === ROLES.DA || role === ROLES.IT) && paper?.status === 'BROUILLON' && now.getTime() < start, 'Autorisation réservée au Directeur Académique avant ouverture.');
    paper.status = 'AUTORISE'; return;
  }
  check(paper?.status === 'AUTORISE', 'Sujet non autorisé.');
  let attempt = data.examAttempts.find(item => item.examId === exam.id && item.studentId === actor);
  if (action === 'exam.start') {
    check(own && !attempt && now.getTime() >= start && now.getTime() < end, 'Accès fermé, étudiant non autorisé ou tentative déjà créée.');
    data.examAttempts.push({ id: createMockId('COPY'), examId: exam.id, studentId: actor, startedAt: now.toISOString(), deadline: new Date(Math.min(end, now.getTime() + paper.durationMinutes * 60000)).toISOString(), status: 'EN_COURS', answers: {}, scores: {} });
    return;
  }
  if (action === 'exam.correct') {
    check(teacher && editable && afterExam, 'Correction réservée à l’enseignant affecté après fermeture, avant soumission des notes.');
    attempt = data.examAttempts.find(item => item.id === input.attemptId && item.examId === exam.id);
    check(attempt && (attempt.status === 'REMISE' || now.getTime() >= Date.parse(attempt.deadline)), 'Copie non remise.');
    const scores = z.record(z.string(), z.number().nonnegative()).parse(input.scores);
    check(Object.keys(scores).every(key => paper.questions.some(q => q.id === key && q.kind === 'TEXTE')), 'Correction manuelle limitée aux questions ouvertes.');
    for (const question of paper.questions.filter(q => q.kind === 'TEXTE')) {
      check(Object.hasOwn(scores, question.id) && scores[question.id] <= question.points, 'Note requise dans le barème pour chaque réponse ouverte.');
    }
    const correctedAttempt = attempt;
    const grade = evaluation.grades.find(item => item.matricule === correctedAttempt.studentId);
    check(grade, 'Étudiant absent de l’évaluation.');
    seal(correctedAttempt, paper.questions, now);
    for (const question of paper.questions.filter(q => q.kind === 'TEXTE')) correctedAttempt.scores[question.id] = scores[question.id];
    grade.value = Math.round(paper.questions.reduce((sum, q) => sum + correctedAttempt.scores[q.id], 0) * 100) / 100; evaluation.status = 'SAISIES'; return;
  }
  check(own && attempt && attempt.status === 'EN_COURS', 'Tentative personnelle active requise.');
  if (action === 'exam.submit') { seal(attempt, paper.questions, now); return; }
  check(now.getTime() < Date.parse(attempt.deadline), 'Temps écoulé : les réponses sont verrouillées.');
  const question = paper.questions.find(q => q.id === input.questionId);
  check(question, 'Question inconnue.');
  const answer = z.string().max(20000).parse(input.answer);
  check(question.kind === 'TEXTE' || answer === '' || question.options.some((_, index) => String(index) === answer), 'Choix invalide.');
  attempt.answers[question.id] = answer;
}
function seal(attempt: Dataset['examAttempts'][number], questions: ExamQuestion[], now: Date) {
  if (attempt.status === 'REMISE') return;
  attempt.status = 'REMISE'; attempt.submittedAt = new Date(Math.min(now.getTime(), Date.parse(attempt.deadline))).toISOString();
  for (const q of questions.filter(q => q.kind === 'QCM')) attempt.scores[q.id] = attempt.answers[q.id] === String(q.correctOption) ? q.points : 0;
}
