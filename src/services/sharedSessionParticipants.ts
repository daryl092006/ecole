import type { DatabaseRow, RelationalSnapshot } from '@/types/persistence';

const OCT_SHARED_COURSES = [
  { date: '2026-10-19', start: '07:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-26', start: '07:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-20', start: '07:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-27', start: '07:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-19', start: '09:45', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-26', start: '09:45', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-20', start: '09:45', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-27', start: '09:45', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-19', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-26', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-21', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-28', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-22', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-29', start: '12:30', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-19', start: '15:00', groups: ['L1 IA & GL', 'L1 TC', 'L2 IA & GL', 'L2 TC'] },
  { date: '2026-10-26', start: '15:00', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-20', start: '15:00', groups: ['L1 IA & GL', 'L1 TC', 'L2 IA & GL', 'L2 TC'] },
  { date: '2026-10-27', start: '15:00', groups: ['L1 IA & GL', 'L1 TC'] },
  { date: '2026-10-12', start: '15:00', groups: ['L2 IA & GL', 'L2 TC'] },
  { date: '2026-10-13', start: '15:00', groups: ['L2 IA & GL', 'L2 TC'] },
];

const GROUP_ID_MAP: Record<string, string> = {
  'L1 TC': 'dcb2a5ae-d73c-4c8e-a330-639f53cb932c',
  'L1 IA & GL': 'b10d3fdc-60b7-4473-ac6b-bd3191e257f2',
  'L2 TC': '526c9e49-d0f7-410a-b5ed-ba5a3e38ae4a',
  'L2 IA & GL': '90e081d0-1e56-4e10-9dc7-7854f155f5ea',
};

export function ensureSharedSessionParticipants(snapshot: RelationalSnapshot): void {
  // If the database already provides session_participants (e.g. migration 087 applied in PGlite), preserve them.
  if (snapshot.tables.session_participants && snapshot.tables.session_participants.length > 0) {
    return;
  }

  const sessions = snapshot.tables.sessions || [];
  const assignments = snapshot.tables.teaching_assignments || [];
  const participants: DatabaseRow[] = [];

  for (const shared of OCT_SHARED_COURSES) {
    const session = sessions.find(s =>
      String(s.starts_at || '').startsWith(`${shared.date}T${shared.start}`) &&
      shared.groups.some(gName => GROUP_ID_MAP[gName] === s.group_id)
    );
    if (!session) continue;

    // Primary participant
    participants.push({
      id: `part-pri-${session.id}`,
      session_id: session.id,
      assignment_id: session.assignment_id,
      offering_id: session.offering_id,
      group_id: session.group_id,
      teacher_id: session.teacher_id,
      active: !['ANNULE', 'REPORTE'].includes(String(session.status || '')),
      reason: String(session.reason || 'Participation principale'),
    });

    // Secondary participants
    for (const gName of shared.groups) {
      const gid = GROUP_ID_MAP[gName];
      if (gid === session.group_id) continue;

      const assign = assignments.find(a => a.group_id === gid && a.teacher_id === session.teacher_id);
      if (!assign) continue;

      participants.push({
        id: `part-sec-${session.id}-${gid}`,
        session_id: session.id,
        assignment_id: assign.id,
        offering_id: assign.offering_id,
        group_id: gid,
        teacher_id: session.teacher_id,
        active: !['ANNULE', 'REPORTE'].includes(String(session.status || '')),
        reason: 'Participation cours commun',
      });
    }
  }

  // Include self-participants for non-shared sessions
  for (const session of sessions) {
    if (!participants.some(p => p.session_id === session.id)) {
      participants.push({
        id: `part-self-${session.id}`,
        session_id: session.id,
        assignment_id: session.assignment_id,
        offering_id: session.offering_id,
        group_id: session.group_id,
        teacher_id: session.teacher_id,
        active: !['ANNULE', 'REPORTE'].includes(String(session.status || '')),
        reason: String(session.reason || ''),
      });
    }
  }

  snapshot.tables.session_participants = participants;
}

