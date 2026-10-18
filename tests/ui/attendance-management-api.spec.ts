import { expect, test } from '@playwright/test';
import { attendanceFixture, attendanceId as a } from './attendance-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

test('Les feuilles et justificatifs restent liés aux séances autorisées, sans coordonnées ni chemins privés', async () => {
  const fixture = attendanceFixture(securityContext(ROLES.ENS));
  const response = await fixture.get();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const directory = await response.json();
  expect(directory.sessions.map((row: { id: string }) => row.id)).toEqual([a.session]);
  expect(directory.sessions[0].students[0].name).toBe('Élise Étudiante');
  expect(directory.sessions[0].justifications).toHaveLength(1);
  expect(JSON.stringify(directory)).not.toContain('private@example.test');
  expect(JSON.stringify(directory)).not.toContain('secret/proof.pdf');
});

for (const role of [ROLES.ENS, ROLES.SURV, ROLES.IT]) test(`Émargement étudiant autorisé pour ${role}, correction motivée et révision conservées`, async () => {
  const fixture = attendanceFixture(securityContext(role));
  const response = await fixture.post({ action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Correction après vérification' });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ revision: 5 });
  expect(fixture.transactions[0][0]).toMatchObject({ table: 'attendances', operation: 'update', record: { id: a.presence, status: 'PRESENT', reason: 'Correction après vérification' } });
  expect(fixture.transactions[0][0].record).not.toHaveProperty('recorded_by');
});

test('Un collègue et une séance non affectée au surveillant restent hors périmètre', async () => {
  for (const role of [ROLES.ENS, ROLES.SURV]) {
    const fixture = attendanceFixture(securityContext(role));
    expect((await fixture.post({ action: 'record_students', sessionId: a.other, entries: [fixture.entry()], reason: 'Hors périmètre' })).status).toBe(404);
    expect((await fixture.post({ action: 'record_students', sessionId: a.teacherSession, entries: [fixture.entry()], reason: 'Autre enseignant' })).status).toBe(404);
    expect(fixture.transactions).toEqual([]);
  }
});

test('Les habilitations ne se combinent pas pour couvrir groupe et site', async () => {
  const context = securityContext(ROLES.ENS, { grants: [
    { role_code: 'ENS', role_name: ROLES.ENS, site_id: id.otherSite, group_id: id.group, academic_year_id: id.year },
    { role_code: 'ENS', role_name: ROLES.ENS, site_id: id.site, group_id: id.otherGroup, academic_year_id: id.year },
  ] });
  const fixture = attendanceFixture(context);
  expect((await fixture.post({ action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Périmètres distincts' })).status).toBe(404);
  expect(fixture.transactions).toEqual([]);
});

test('Une autre année et la consultation toutes années interdisent toute mutation', async () => {
  const fixture = attendanceFixture();
  const command = { action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Année incorrecte' };
  expect((await fixture.post(command, id.otherYear)).status).toBe(404);
  expect((await fixture.post(command, 'all')).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

test('Permission absente, rôle de consultation et année fermée ne permettent aucune écriture', async () => {
  const noPermission = attendanceFixture(securityContext(ROLES.IT, { permissions: ['attendance.view'] }));
  expect((await noPermission.post({ action: 'record_students', sessionId: a.session, entries: [noPermission.entry()] })).status).toBe(403);
  const academic = attendanceFixture(securityContext(ROLES.DA));
  expect((await academic.post({ action: 'record_students', sessionId: a.session, entries: [academic.entry()] })).status).toBe(403);
  const closed = attendanceFixture(); closed.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  expect((await closed.post({ action: 'record_students', sessionId: a.session, entries: [closed.entry()], reason: 'Année fermée' })).status).toBe(403);
  expect(noPermission.transactions.concat(academic.transactions, closed.transactions)).toEqual([]);
});

test('Motif absent, candidat extérieur, doublon, dates contradictoires et injection sont refusés', async () => {
  const fixture = attendanceFixture();
  const command = { action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Correction contrôlée' };
  for (const body of [
    { ...command, reason: undefined }, { ...command, reason: 'a' }, { ...command, reason: 'x'.repeat(1001) },
    { ...command, entries: [fixture.entry(), fixture.entry()] },
    { ...command, entries: [{ ...fixture.entry(), enrollmentId: uuid(9999) }] },
    { ...command, entries: [{ ...fixture.entry(), leftAt: '2026-11-01T09:00:00Z' }] },
    { ...command, entries: [{ ...fixture.entry(), lateMinutes: 1.5 }] },
    { ...command, recorded_by: uuid(9999) },
  ]) expect((await fixture.post(body)).status).toBe(400);
  expect((await fixture.post({ ...command, entries: [fixture.entry('ABSENT_JUSTIFIE')] })).status).toBe(409);
  expect((await fixture.post({ ...command, revision: 0 })).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

test('La liste dépend de l’appartenance au groupe à la date de la séance', async () => {
  const fixture = attendanceFixture();
  fixture.snapshot.tables.enrollment_groups[0].valid_until = '2026-11-01';
  expect((await fixture.post({ action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Membre sorti du groupe' })).status).toBe(400);
  expect(fixture.transactions).toEqual([]);
});

test('Un remplaçant voit et émarge sa séance ; le titulaire remplacé ne peut plus l’émarger', async () => {
  const substitute = attendanceFixture(securityContext(ROLES.ENS, { teacherId: uuid(21) }));
  substitute.snapshot.tables.sessions[0].replacement_teacher_id = uuid(21);
  substitute.snapshot.tables.teaching_assignments = [];
  expect((await substitute.post({ action: 'record_students', sessionId: a.session, entries: [substitute.entry()], reason: 'Remplacement affecté' })).status).toBe(200);
  const holder = attendanceFixture(securityContext(ROLES.ENS)); holder.snapshot.tables.sessions[0].replacement_teacher_id = uuid(21);
  expect((await holder.post({ action: 'record_students', sessionId: a.session, entries: [holder.entry()], reason: 'Titulaire remplacé' })).status).toBe(404);
});

test('Un surveillant de salle d’examen accède uniquement à la séance de cette salle', async () => {
  const fixture = attendanceFixture(securityContext(ROLES.SURV));
  fixture.snapshot.tables.session_supervisors = [];
  fixture.snapshot.tables.exam_room_supervisors = [{ id: uuid(2500), account_id: uuid(900), exam_room_id: uuid(2501) }];
  fixture.snapshot.tables.exam_rooms = [{ id: uuid(2501), delivery_id: uuid(2502) }];
  fixture.snapshot.tables.exam_deliveries = [{ id: uuid(2502), session_id: a.session }];
  const response = await fixture.get();
  expect(response.status).toBe(200);
  expect((await response.json()).sessions.map((row: { id: string }) => row.id)).toEqual([a.session]);
});

for (const role of [ROLES.SURV, ROLES.IT]) test(`Présence enseignante : ${role} peut saisir les horaires du titulaire effectif`, async () => {
  const fixture = attendanceFixture(securityContext(role));
  expect((await fixture.post({ action: 'record_teacher', sessionId: a.session, arrivedAt: '2026-11-01T08:00:00Z', leftAt: '2026-11-01T10:00:00Z', comment: 'Présence constatée' })).status).toBe(200);
  expect(fixture.transactions[0][0]).toMatchObject({ table: 'teacher_attendances', operation: 'insert', record: { session_id: a.session, teacher_id: id.teacher, recorded_by: uuid(900) } });
});

test('Présence enseignante : enseignant, auto-émargement et horaires invalides sont refusés', async () => {
  const command = { action: 'record_teacher', sessionId: a.session, arrivedAt: '2026-11-01T08:00:00Z', leftAt: null, comment: '' };
  const teacher = attendanceFixture(securityContext(ROLES.ENS));
  expect((await teacher.post(command)).status).toBe(403);
  const self = attendanceFixture(securityContext(ROLES.IT, { personId: uuid(920) }));
  expect((await self.post(command)).status).toBe(403);
  const fixture = attendanceFixture();
  expect((await fixture.post({ ...command, leftAt: command.arrivedAt })).status).toBe(400);
  expect(teacher.transactions.concat(self.transactions, fixture.transactions)).toEqual([]);
});

for (const role of [ROLES.DA, ROLES.IT]) test(`Justificatifs : décision réservée à ${role}, motif conservé et métadonnées serveur`, async () => {
  const fixture = attendanceFixture(securityContext(role));
  expect((await fixture.post({ action: 'review_justification', justificationId: a.proof, decision: 'VALIDE', reason: 'Certificat vérifié' })).status).toBe(200);
  expect(fixture.transactions[0]).toEqual([{ table: 'absence_justifications', operation: 'update', record: { id: a.proof, status: 'VALIDE', review_reason: 'Certificat vérifié' } }]);
});

test('Un enseignant, une décision déjà rendue et une présence normale ne permettent pas l’acceptation', async () => {
  const command = { action: 'review_justification', justificationId: a.proof, decision: 'VALIDE', reason: 'Certificat vérifié' };
  const teacher = attendanceFixture(securityContext(ROLES.ENS));
  expect((await teacher.post(command)).status).toBe(403);
  const decided = attendanceFixture(); decided.snapshot.tables.absence_justifications[0].status = 'REFUSE';
  expect((await decided.post(command)).status).toBe(409);
  const present = attendanceFixture(); present.snapshot.tables.attendances[0].status = 'PRESENT';
  expect((await present.post(command)).status).toBe(409);
  expect(teacher.transactions.concat(decided.transactions, present.transactions)).toEqual([]);
});

test('Les pièces utilisent une autorisation de séance et une URL temporaire ; erreurs Storage signalées', async () => {
  const fixture = attendanceFixture();
  const signed = await fixture.get(id.year, `?justificationId=${a.proof}`);
  expect(signed.status).toBe(200); expect(await signed.json()).toEqual({ url: 'https://storage.example.test/signed-proof' });
  expect(fixture.downloads).toEqual(['private-attendance/secret/proof.pdf']);
  expect((await fixture.get(id.otherYear, `?justificationId=${a.proof}`)).status).toBe(404);
  expect(fixture.downloads).toHaveLength(1);
  fixture.failures.file = true;
  expect((await fixture.get(id.year, `?justificationId=${a.proof}`)).status).toBe(503);
});

test('Un échec transactionnel ne renvoie aucun succès et ne modifie pas le snapshot', async () => {
  const fixture = attendanceFixture(undefined, true); fixture.failures.write = true;
  const response = await fixture.post({ action: 'record_students', sessionId: a.session, entries: [fixture.entry()], reason: 'Correction refusée' });
  expect(response.status).toBe(409); expect((await response.json()).error).toContain('Aucune modification partielle');
  expect(fixture.snapshot.tables.attendances[0].status).toBe('ABSENT'); expect(fixture.snapshot.revision).toBe(4);
});

test('Une année de travail inaccessible ne déclenche aucune lecture de secours sur une autre année', async () => {
  const fixture = attendanceFixture();
  fixture.snapshot.tables.academic_years[0].archived_at = '2026-01-01T00:00:00Z';
  const response = await fixture.get('current');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ revision: 4, selectedYearId: null, sessions: [] });
});
