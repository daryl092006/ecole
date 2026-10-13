import type { Dataset, InstitutionSettings, TranscriptRow } from '@/types/application';

export function computeTranscript(data: Dataset, studentId: string, semesterId: string, rules: InstitutionSettings) {
  const semester = data.semesters.find(item => item.id === semesterId);
  const student = data.students.find(item => item.matricule === studentId);
  if (!semester || !student) throw new Error('Étudiant ou semestre introuvable.');
  const enrollment = data.enrollments.find(item => item.studentId === studentId && item.academicYearId === semester.academicYearId);
  const groupId = enrollment?.groupId || (student.academicYearId === semester.academicYearId ? student.groupId : '');
  const assignments = data.assignments.filter(item => item.groupId === groupId && item.semesterId === semesterId);
  const group = data.groups.find(item => item.id === groupId);
  const units = data.units.filter(item => item.semesterId === semesterId && group?.programIds.includes(item.programId));
  const subjects = data.subjects.filter(item => units.some(unit => unit.id === item.teachingUnitId) && item.active);
  const rows: TranscriptRow[] = subjects.map(subject => {
    const assignment = assignments.find(item => item.subjectId === subject.id);
    const evaluations = data.evaluations.filter(item => item.classId === assignment?.id && item.status === 'PUBLIEES');
    const values = (type: string) => evaluations.filter(item => item.type === type).map(item => item.grades.find(grade => grade.matricule === studentId)?.value).filter((value): value is number => value != null);
    const mean = (numbers: number[]) => numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    const continuous = [...values('Devoir'), ...values('Projet'), ...values('TP')]; const exam = values('Examen'); const resit = values('Rattrapage');
    let average: number | null = continuous.length && exam.length ? mean(continuous) * (1 - rules.examWeight / 100) + mean(exam) * rules.examWeight / 100 : null;
    if (resit.length && average != null) average = Math.max(average, mean(resit));
    return { subjectId: subject.id, code: subject.code, name: subject.name, unitId: subject.teachingUnitId || '', credits: subject.credits || 0, coefficient: subject.coefficient, average: average == null ? null : Math.round(average * 100) / 100, validated: false };
  });
  const complete = rows.length > 0 && rows.every(row => row.average !== null);
  const denominator = rows.reduce((sum, row) => sum + row.coefficient, 0);
  const average = denominator ? rows.reduce((sum, row) => sum + (row.average || 0) * row.coefficient, 0) / denominator : 0;
  const unitResults = units.map(unit => {
    const members = rows.filter(row => row.unitId === unit.id);
    const sum = members.reduce((total, row) => total + row.coefficient, 0);
    const mean = sum ? members.reduce((total, row) => total + (row.average || 0) * row.coefficient, 0) / sum : 0;
    const filled = members.length > 0 && members.every(row => row.average != null) && members.reduce((total, row) => total + row.credits, 0) === unit.credits;
    const noElimination = members.every(row => row.average !== null && row.average >= rules.eliminationMark);
    return { unitId: unit.id, credits: unit.credits, validated: filled && noElimination && (mean >= rules.passMark || (rules.compensation && complete && average >= rules.passMark)) };
  });
  for (const row of rows) row.validated = unitResults.some(unit => unit.unitId === row.unitId && unit.validated);
  const totalCredits = units.reduce((sum, unit) => sum + unit.credits, 0);
  const credits = unitResults.filter(unit => unit.validated).reduce((sum, unit) => sum + unit.credits, 0);
  const ready = complete && totalCredits === rules.creditsPerSemester && subjects.reduce((sum, subject) => sum + (subject.credits || 0), 0) === totalCredits;
  return { rows, average: Math.round(average * 100) / 100, credits, totalCredits, complete: ready, suggestedDecision: credits === totalCredits && ready ? 'ADMIS' as const : 'RATTRAPAGE' as const, academicYearId: semester.academicYearId };
}
