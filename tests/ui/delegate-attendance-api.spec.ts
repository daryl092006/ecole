import { expect, test } from '@playwright/test';
import { attendanceFixture, attendanceId as a } from './attendance-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

export function delegateFixture(mutate = false) {
  return attendanceFixture(securityContext(ROLES.DEL, { roleCode: 'DEL', studentId: a.student, personId: uuid(700), teacherId: null,
    grants: [{ role_code: 'DEL', role_name: ROLES.DEL, site_id: null, group_id: null, academic_year_id: null }],
  }), mutate);
}

test('Le délégué voit les séances de son groupe et peut émarger les étudiants et le professeur', async () => {
  const f = delegateFixture();
  const response = await f.get(); expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.sessions.map((s: { id: string }) => s.id)).toEqual([a.session, a.teacherSession]);
  expect(data.sessions[0]).toMatchObject({ canRecordStudents: true, canRecordTeacher: true, canReview: false, justifications: [] });
  expect(JSON.stringify(data)).not.toContain('Certificat médical');
  expect(JSON.stringify(data)).not.toContain('private@example.test');
  expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()], reason: 'Appel vérifié' })).status).toBe(200);
  expect(f.transactionCalls[0]).toMatchObject({ name: 'escen_delegate_attendance_transaction', args: { p_session_id: a.session, p_year_id: id.year } });
  expect((await f.post({ action: 'record_teacher', sessionId: a.session, arrivedAt: '2026-11-01T08:00:00Z', leftAt: null, comment: 'Arrivée constatée' })).status).toBe(200);
  expect(f.transactions[1][0]).toMatchObject({ table: 'teacher_attendances', record: { teacher_id: id.teacher } });
});

test('Un autre groupe, une autre année et un justificatif privé restent inaccessibles', async () => {
  const f = delegateFixture();
  expect((await f.post({ action: 'record_students', sessionId: a.other, entries: [f.entry()], reason: 'Autre groupe' })).status).toBe(404);
  expect((await f.post({ action: 'record_teacher', sessionId: a.other, arrivedAt: '2026-11-01T08:00:00Z', leftAt: null, comment: '' })).status).toBe(404);
  expect((await f.get(id.year, `?justificationId=${a.proof}`)).status).toBe(404);
  expect((await f.post({ action: 'review_justification', justificationId: a.proof, decision: 'VALIDE', reason: 'Décision interdite' })).status).toBe(403);
  expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()] }, id.otherYear)).status).toBe(403);
  expect(f.transactions).toEqual([]); expect(f.downloads).toEqual([]);
});

test('Sans inscription ou hors de la période du groupe, aucune séance ne devient accessible', async () => {
  for (const boundary of ['missing', 'before', 'until']) {
    const f = delegateFixture();
    if (boundary === 'missing') f.snapshot.tables.enrollment_groups = [];
    if (boundary === 'before') f.snapshot.tables.enrollment_groups[0].valid_from = '2026-11-02';
    if (boundary === 'until') f.snapshot.tables.enrollment_groups[0].valid_until = '2026-10-29';
    expect((await (await f.get()).json()).sessions).toEqual([]);
    expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()] })).status).toBe(404);
    expect(f.transactions).toEqual([]);
  }
});

test('Les portées de plusieurs attributions DEL ne peuvent pas être assemblées', async () => {
  const f = attendanceFixture(securityContext(ROLES.DEL, { roleCode: 'DEL', studentId: a.student,
    grants: [
      { role_code: 'DEL', role_name: ROLES.DEL, site_id: id.otherSite, group_id: id.group, academic_year_id: id.year },
      { role_code: 'DEL', role_name: ROLES.DEL, site_id: id.site, group_id: id.otherGroup, academic_year_id: id.year },
    ],
  }));
  expect((await (await f.get()).json()).sessions).toEqual([]);
});

test('Le délégué ne dispense pas et ne décide pas des absences justifiées', async () => {
  const f = delegateFixture();
  for (const status of ['DISPENSE', 'ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE']) {
    expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry(status)], reason: 'Modification interdite' })).status).toBe(403);
  }
  f.snapshot.tables.attendances[0].status = 'ABSENT_JUSTIFIE';
  expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()], reason: 'Annulation de décision interdite' })).status).toBe(403);
  expect(f.transactions).toEqual([]);
});

test('Un étudiant ordinaire ne reçoit pas le droit de faire l’appel', async () => {
  const f = attendanceFixture(securityContext(ROLES.STUD, { studentId: a.student }));
  expect((await f.get()).status).toBe(403);
  expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()] })).status).toBe(403);
  expect(f.transactions).toEqual([]);
});

test('Le remplaçant effectif est émargé et une année clôturée reste non modifiable', async () => {
  const f = delegateFixture(); f.snapshot.tables.sessions[0].replacement_teacher_id = uuid(21);
  expect((await f.post({ action: 'record_teacher', sessionId: a.session, arrivedAt: '2026-11-01T08:00:00Z', leftAt: null, comment: '' })).status).toBe(200);
  expect(f.transactions[0][0].record.teacher_id).toBe(uuid(21));
  f.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  expect((await f.post({ action: 'record_students', sessionId: a.session, entries: [f.entry()], reason: 'Année clôturée' })).status).toBe(403);
});
