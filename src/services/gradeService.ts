import type { Evaluation, GradeTransitionHistory, GradeWorkflowStatus, RoleName } from '@/types';
import { ROLES } from '@/types/permissions';
import { hasPermission } from '@/permissions/rolePermissions';

interface TransitionContext { actor: string; role: RoleName; comment?: string; teacherId?: string; }

const ALLOWED_TRANSITIONS: Partial<Record<GradeWorkflowStatus, GradeWorkflowStatus[]>> = {
  BROUILLON: ['SAISIES'],
  SAISIES: ['SOUMISES'],
  SOUMISES: ['A_CONTROLER', 'SAISIES'],
  A_CONTROLER: ['VALIDEES', 'SAISIES'],
  VALIDEES: ['PUBLIEES'],
};

export function createEvaluation(input: Omit<Evaluation, 'status' | 'history'>, role: RoleName, teacherId: string, actorId: string): Evaluation {
  if (role === ROLES.ENS && (!teacherId || teacherId !== actorId)) throw new Error('Enseignement non affecté à cet enseignant.');
  if (!hasPermission(role, 'evaluation.create')) throw new Error('Création non autorisée.');
  if (!input.name.trim() || !input.grades.length) throw new Error('Nom et étudiants affectés obligatoires.');
  return { ...input, status: 'BROUILLON', history: [] };
}

export function transitionGradeWorkflow(
  evaluation: Evaluation,
  target: GradeWorkflowStatus,
  context: TransitionContext
): Evaluation {
  if (evaluation.examCancelled) throw new Error('Les notes d’une épreuve annulée ne peuvent pas avancer dans le workflow.');
  if (context.role === ROLES.ENS && (!context.teacherId || context.teacherId !== context.actor)) throw new Error('Enseignement non affecté à cet enseignant.');
  const permission = target === 'SOUMISES' || (target === 'SAISIES' && evaluation.status === 'BROUILLON') ? 'grade.submit' : target === 'VALIDEES' ? 'grade.approve' : target === 'PUBLIEES' ? 'grade.publish' : 'grade.review';
  if (!hasPermission(context.role, permission)) throw new Error('Transition non autorisée pour ce rôle.');
  if (target === 'SOUMISES' && evaluation.grades.some(grade => grade.absent)) throw new Error('Le traitement des absences doit être défini avant soumission.');
  if (target === 'SOUMISES' && (!evaluation.grades.length || evaluation.grades.some(grade => grade.value === null || !Number.isFinite(grade.value) || grade.value < 0 || grade.value > 20))) throw new Error('Saisissez toutes les notes entre 0 et 20 avant la soumission.');
  if (!ALLOWED_TRANSITIONS[evaluation.status]?.includes(target)) {
    throw new Error(`Transition de notes interdite : ${evaluation.status} → ${target}.`);
  }
  if (target === 'SAISIES' && ['SOUMISES', 'A_CONTROLER'].includes(evaluation.status) && !context.comment?.trim()) {
    throw new Error("Un motif est obligatoire pour retourner les notes à l'enseignant.");
  }
  const historyEntry: GradeTransitionHistory = {
    id: `GTH-${Date.now()}-${evaluation.history.length + 1}`,
    date: new Date().toISOString(), actor: context.actor, role: context.role,
    from: evaluation.status, to: target, comment: context.comment?.trim() || undefined,
  };
  return { ...evaluation, status: target, history: [...evaluation.history, historyEntry] };
}

export function enterGrade(evaluation: Evaluation, gradeIndex: number, value: number | null, role: RoleName, teacherId: string, actorId: string): Evaluation {
  if (role === ROLES.ENS && (!teacherId || teacherId !== actorId)) throw new Error('Enseignement non affecté à cet enseignant.');
  if (evaluation.examCancelled) throw new Error('Épreuve annulée.');
  if (evaluation.examMode === 'EN_LIGNE') throw new Error('Corrigez les copies depuis le module Examens.');
  if (evaluation.examEndAt && Date.now() < Date.parse(evaluation.examEndAt)) throw new Error('La saisie ouvre après la fin de l’épreuve.');
  if (evaluation.grades[gradeIndex]?.absent) throw new Error('Modifiez le constat d’absence depuis les résultats papier.');
  if (!hasPermission(role, 'grade.enter')) throw new Error('Saisie non autorisée.');
  if (!Number.isInteger(gradeIndex) || !evaluation.grades[gradeIndex]) throw new Error('Étudiant absent de l’évaluation.');
  if (!['BROUILLON', 'SAISIES'].includes(evaluation.status)) throw new Error('Les notes ne sont modifiables que pendant la saisie.');
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 20)) throw new Error('Une note doit être comprise entre 0 et 20.');
  return { ...evaluation, status: 'SAISIES', grades: evaluation.grades.map((grade, index) => index === gradeIndex ? { ...grade, value } : grade) };
}

export function correctPublishedGrade(evaluation: Evaluation, studentId: string, value: number, context: TransitionContext): Evaluation {
  if (!hasPermission(context.role, 'grade.approve') || !context.comment?.trim()) throw new Error('Autorisation académique et motif obligatoires.');
  const oldValue = evaluation.grades.find(grade => grade.matricule === studentId)?.value;
  if (oldValue == null) throw new Error('Note publiée introuvable.');
  if (evaluation.status !== 'PUBLIEES') throw new Error('La correction encadrée concerne une note publiée.');
  if (!Number.isFinite(value) || value < 0 || value > 20) throw new Error('Une note doit être comprise entre 0 et 20.');
  return { ...evaluation, grades: evaluation.grades.map(grade => grade.matricule === studentId ? { ...grade, value } : grade), corrections: [...(evaluation.corrections ?? []), { studentId, oldValue, newValue: value, actor: context.actor, role: context.role, date: new Date().toISOString(), reason: context.comment.trim() }] };
}
