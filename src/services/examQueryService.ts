import type { Dataset, Exam } from '@/types/application';
import type { RoleName, SystemLog } from '@/types';
import type { ExamQuestion } from '@/types/exam';
import { ROLES } from '@/types/permissions';
import { hasPermission } from '@/permissions/rolePermissions';

export function examTime(exam: Exam, edge: 'start' | 'end'): number {
  return Date.parse(`${exam.date}T${edge === 'start' ? exam.startTime : exam.endTime}:00Z`);
}

export function getVisibleExamRecords(data: Dataset, role: RoleName, actor: string, now = Date.now()) {
  const own = role === ROLES.STUD || role === ROLES.DEL;
  const student = data.students.find(item => item.matricule === actor);
  const exams = data.exams.filter(exam => {
    const assignment = data.assignments.find(item => item.id === exam.assignmentId);
    if (!assignment) return false;
    if (own) return student?.groupId === assignment.groupId && student.academicYearId === assignment.academicYearId
      && data.evaluations.some(item => item.id === exam.evaluationId && item.grades.some(grade => grade.matricule === actor));
    if (role === ROLES.ENS) return assignment.teacherId === actor;
    if (role === ROLES.SURV) return exam.supervisorId === actor;
    return hasPermission(role, 'schedule.view');
  }).map(exam => {
    const evaluation = data.evaluations.find(item => item.id === exam.evaluationId);
    return {
      ...exam,
      candidateIds: evaluation?.grades.filter(grade => !own || grade.matricule === actor).map(grade => grade.matricule),
      cancellationBlocked: data.examAttempts.some(attempt => attempt.examId === exam.id)
        || !!evaluation && (evaluation.status !== 'BROUILLON' || evaluation.grades.some(grade => grade.value !== null || grade.absent)),
    };
  });
  const examById = new Map(exams.map(exam => [exam.id, exam]));
  const examPapers = data.examPapers.filter(paper => examById.has(paper.id)
    && (role === ROLES.IT || role === ROLES.DA || role === ROLES.ENS || (own && paper.status === 'AUTORISE')))
    .map(paper => {
      if (!own) return paper;
      const exam = examById.get(paper.id)!;
      return { ...paper, questions: exam.status !== 'ANNULE' && now >= examTime(exam, 'start')
        ? paper.questions.map(question => { const visible = { ...question }; delete visible.correctOption; return visible; })
        : [] };
    });
  const examAttempts = data.examAttempts.filter(attempt => examById.has(attempt.examId)
    && (own ? attempt.studentId === actor : role === ROLES.ENS || role === ROLES.IT))
    .map(attempt => own ? { ...attempt, scores: {} }
      : now < examTime(examById.get(attempt.examId)!, 'end') ? { ...attempt, answers: {}, scores: {} } : attempt);
  return { exams, examPapers, examAttempts };
}

export function displayExamAnswer(question: ExamQuestion, answer: string | undefined): string {
  if (!answer) return 'Sans réponse';
  return question.kind === 'QCM' ? question.options[Number(answer)] ?? 'Sans réponse' : answer;
}

// Preserve the full local audit, but never expose subjects or copies through technical logs.
export function getVisibleExamAuditLogs(logs: SystemLog[], role: RoleName): SystemLog[] {
  if (!hasPermission(role, 'system.audit.view')) return [];
  return logs.map(log => {
    if (!hasPermission(role, 'grade.view') && ['Saisie note', 'Transition Réclamation'].includes(log.action)) {
      try {
        const event = JSON.parse(log.details) as Record<string, unknown>;
        if (log.action === 'Saisie note') { delete event.oldValue; delete event.newValue; }
        delete event.correction;
        return { ...log, details: JSON.stringify(event) };
      } catch { return { ...log, details: 'Événement académique ; valeurs métier masquées.' }; }
    }
    if (role === ROLES.IT || !log.action.startsWith('exam.')) return log;
    try {
      const event = JSON.parse(log.details) as { collection: string; oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null };
      const redact = (value: Record<string, unknown> | null) => {
        if (!value) return value;
        if (event.collection === 'examPapers') {
          const { questions, ...metadata } = value;
          return { ...metadata, questionCount: Array.isArray(questions) ? questions.length : 0 };
        }
        if (event.collection === 'examAttempts') {
          const metadata = { ...value };
          delete metadata.answers; delete metadata.scores;
          return metadata;
        }
        if (event.collection === 'evaluations' && !hasPermission(role, 'grade.view')) {
          const metadata = { ...value };
          delete metadata.grades; delete metadata.corrections; delete metadata.history;
          return { ...metadata, studentCount: Array.isArray(value.grades) ? value.grades.length : 0 };
        }
        return value;
      };
      return { ...log, details: JSON.stringify({ ...event, oldValue: redact(event.oldValue), newValue: redact(event.newValue) }) };
    } catch { return { ...log, details: 'Événement d’examen ; détails métier masqués.' }; }
  });
}
