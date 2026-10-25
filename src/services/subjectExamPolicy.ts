import type { RelationalSnapshot } from '@/types/persistence';
import type { SubjectExam } from '@/types/subject';

/** Only an explicit delivery links an examination to its scheduled session. */
export function subjectExams(snapshot: RelationalSnapshot, now = Date.now()): SubjectExam[] {
  const rows = (table: string) => snapshot.tables[table] || [];
  return rows('evaluations').map(evaluation => {
    const assignment = rows('teaching_assignments').find(row => row.id === evaluation.assignment_id);
    const delivery = rows('exam_deliveries').find(row => row.evaluation_id === evaluation.id);
    const session = delivery && rows('sessions').find(row => row.id === delivery.session_id);
    const component = rows('curriculum_components').find(row => row.id === (assignment?.component_id || evaluation.component_id));
    const startsAt = session?.starts_at ? String(session.starts_at) : null;
    const endsAt = session?.ends_at ? String(session.ends_at) : null;
    const start = Date.parse(startsAt || '');
    const end = Date.parse(endsAt || '');
    const opens = Date.parse(String(delivery?.access_opens_at || ''));
    const closes = Date.parse(String(delivery?.access_closes_at || ''));
    const durationMinutes = Number(delivery?.duration_minutes);
    const candidateIds = new Set(rows('evaluation_candidates').filter(row => row.evaluation_id === evaluation.id).map(row => row.id));
    let issue: string | null = null;
    if (evaluation.cancelled_at || evaluation.archived_at) issue = 'Épreuve retirée.';
    else if (evaluation.status !== 'BROUILLON' || rows('grades').some(row => candidateIds.has(String(row.candidate_id)))
      || rows('exam_attempts').some(row => row.evaluation_id === evaluation.id || candidateIds.has(String(row.candidate_id)))) issue = 'Épreuve commencée ou en cours de correction : consultation du sujet uniquement.';
    else if (!assignment || !session || session.assignment_id !== assignment.id || session.cancelled_at || session.archived_at
      || ['ANNULE', 'ANNULEE'].includes(String(session.status)) || session.mode === 'COURS'
      || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(opens) || !Number.isFinite(closes)
      || end <= start || opens < start || closes > end || closes <= opens || !Number.isInteger(durationMinutes) || durationMinutes < 1
      || durationMinutes * 60000 > closes - opens) issue = 'La date et les horaires de cet examen doivent être programmés avant de composer son sujet.';
    else if (Math.min(start, opens) <= now) issue = 'Cet examen a commencé : son sujet est consultable uniquement.';
    else if (rows('exam_papers').some(row => row.evaluation_id === evaluation.id && row.status === 'AUTORISE')) issue = 'Le sujet est déjà autorisé et ne peut plus être modifié.';
    return {
      id: evaluation.id, title: String(evaluation.name),
      purpose: evaluation.kind === 'RATTRAPAGE' || evaluation.session_type === 'RATTRAPAGE' ? 'RATTRAPAGE' : evaluation.kind === 'EXAMEN' ? 'EXAMEN' : 'CONTROLE_CONTINU',
      group: String(rows('groups').find(row => row.id === (assignment?.group_id || evaluation.group_id))?.name || 'Groupe non renseigné'),
      subject: String(rows('subjects').find(row => row.id === component?.subject_id)?.name || 'Matière non renseignée'),
      startsAt, endsAt, compositionClosesAt: Number.isFinite(start) && Number.isFinite(opens) ? new Date(Math.min(start, opens)).toISOString() : null,
      durationMinutes: Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0,
      room: String(rows('rooms').find(row => row.id === session?.room_id)?.name || ''), mode: String(session?.mode || ''), issue,
    } satisfies SubjectExam;
  });
}

export function subjectExamIssue(exam: SubjectExam | undefined, now = Date.now()): string | null {
  if (!exam) return 'Choisissez un examen programmé dans l’année consultée.';
  if (exam.issue) return exam.issue;
  if (!exam.compositionClosesAt || Date.parse(exam.compositionClosesAt) <= now) return 'Cet examen a commencé : son sujet est consultable uniquement.';
  return null;
}
