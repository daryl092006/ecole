import { expect, test } from '@playwright/test';
import { scheduleFixture, createSession, attachScheduledExam } from './schedule-management-fixture';
import { securityContext, securityIds as id, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';

test('Créer, modifier, déplacer, remplacer et annuler : changements ciblés et motif', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  const response = await fixture.post(createSession);
  expect(response.status).toBe(201);
  const { id: sessionId } = await response.json();
  expect((await fixture.post({ ...createSession, action: 'update_session', sessionId, roomId: uuid(951) })).status).toBe(200);
  expect((await fixture.post({ action: 'move_session', sessionId, startsAt: '2026-10-21T10:00:00Z', endsAt: '2026-10-21T12:00:00Z' })).status).toBe(200);
  expect((await fixture.post({ action: 'replace_teacher', sessionId, teacherId: uuid(21) })).status).toBe(200);
  expect((await fixture.post({ action: 'cancel_session', sessionId })).status).toBe(200);
  expect(fixture.snapshot.tables.sessions.find(session => session.id === sessionId)).toMatchObject({ status: 'ANNULE', room_id: uuid(951), replacement_teacher_id: uuid(21) });
  expect(fixture.transactions).toHaveLength(5);
  expect(fixture.transactions.every(changes => changes.length === 1 && changes[0].record.reason)).toBe(true);
});

for (const role of [ROLES.ENS, ROLES.STUD]) test(`Le rôle ${role} ne peut pas gérer les séances`, async () => {
  const fixture = scheduleFixture(securityContext(role));
  expect((await fixture.get()).status).toBe(403);
  expect((await fixture.post(createSession)).status).toBe(403);
  expect(fixture.transactions).toEqual([]);
});

for (const [label, assignmentId] of [['groupe', id.assignment(1)], ['année', id.assignment(2)], ['site', id.assignment(3)], ['matière hors année', id.assignment(5)]] as const) test(`Affectation hors périmètre : ${label}`, async () => {
  const context = securityContext(ROLES.LOG, { grants: [{ role_code: 'LOG', role_name: ROLES.LOG, site_id: id.site, academic_year_id: id.year, group_id: id.group }] });
  const fixture = scheduleFixture(context);
  expect((await fixture.post({ ...createSession, assignmentId })).status).toBe(404);
  expect(fixture.transactions).toEqual([]);
});

test('Les attributions ne se combinent pas pour élargir le périmètre', async () => {
  const context = securityContext(ROLES.LOG, { grants: [
    { role_code: 'LOG', role_name: ROLES.LOG, site_id: id.site, academic_year_id: id.year, group_id: id.group },
    { role_code: 'LOG', role_name: ROLES.LOG, site_id: id.otherSite, academic_year_id: id.year, group_id: id.otherGroup },
  ] });
  const fixture = scheduleFixture(context);
  expect((await fixture.post({ ...createSession, assignmentId: id.assignment(1) })).status).toBe(404);
});

test('Séance cachée et année Toutes les années : aucune écriture', async () => {
  const fixture = scheduleFixture();
  expect((await fixture.post({ action: 'cancel_session', sessionId: uuid(999) })).status).toBe(404);
  expect((await fixture.post(createSession, 'all')).status).toBe(409);
  fixture.snapshot.tables.academic_years[0].status = 'CLOTUREE';
  expect((await fixture.post(createSession)).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

test('Date invalide, motif absent, salle contradictoire et révision périmée', async () => {
  const fixture = scheduleFixture();
  for (const patch of [{ reason: '' }, { endsAt: createSession.startsAt }, { startsAt: 'date invalide' }, { mode: 'EN_LIGNE' }, { roomId: null }]) expect((await fixture.post({ ...createSession, ...patch })).status).toBe(400);
  expect((await fixture.post({ ...createSession, revision: 0 })).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
});

for (const conflict of ['groupe', 'enseignant', 'salle']) test(`Conflit ${conflict} détecté sans exposer les détails de l’autre séance`, async () => {
  const fixture = scheduleFixture();
  const existing = fixture.snapshot.tables.sessions[0];
  if (conflict !== 'groupe') existing.group_id = id.otherGroup;
  if (conflict === 'salle') existing.teacher_id = uuid(21);
  const response = await fixture.post({ ...createSession, startsAt: existing.starts_at, endsAt: existing.ends_at });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toMatch(new RegExp(conflict));
  expect(fixture.transactions).toEqual([]);
});

test('Le remplaçant effectif est contrôlé, avec retour possible à l’enseignant d’origine', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  fixture.snapshot.tables.sessions.push({ ...fixture.snapshot.tables.sessions[0], id: uuid(971), teacher_id: uuid(21), group_id: id.otherGroup, room_id: uuid(951) });
  expect((await fixture.post({ action: 'replace_teacher', sessionId: uuid(970), teacherId: uuid(21) })).status).toBe(409);
  fixture.snapshot.tables.sessions[1].status = 'ANNULE';
  expect((await fixture.post({ action: 'replace_teacher', sessionId: uuid(970), teacherId: uuid(21) })).status).toBe(200);
  expect((await fixture.post({ action: 'replace_teacher', sessionId: uuid(970), teacherId: null })).status).toBe(200);
  expect(fixture.snapshot.tables.sessions[0].replacement_teacher_id).toBeNull();
});

test('Séance émargée : déplacement, réaffectation et annulation refusés', async () => {
  const fixture = scheduleFixture();
  fixture.snapshot.tables.attendances.push({ id: uuid(980), session_id: uuid(970) });
  for (const body of [{ ...createSession, action: 'update_session', sessionId: uuid(970) }, { action: 'move_session', sessionId: uuid(970), startsAt: createSession.startsAt, endsAt: createSession.endsAt }, { action: 'cancel_session', sessionId: uuid(970) }]) {
    const response = await fixture.post(body);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/émargée/);
  }
  expect(fixture.transactions).toEqual([]);
});

test('Période bloquée : motif et année conservés, conflits et attribution limitée au groupe refusés', async () => {
  const body = { action: 'block_period', name: 'Fermeture pédagogique', siteId: id.site, kind: 'FERMETURE', startsAt: createSession.startsAt, endsAt: createSession.endsAt };
  const fixture = scheduleFixture(securityContext(), true);
  expect((await fixture.post(body)).status).toBe(201);
  expect(fixture.transactions[0][0].record).toMatchObject({ academic_year_id: id.year, reason: 'Organisation pédagogique validée' });
  const response = await fixture.post(createSession);
  expect(response.status).toBe(409);
  expect((await response.json()).error).toMatch(/période bloquée/);
  expect((await fixture.post({ ...body, startsAt: '2026-10-20T08:00:00Z', endsAt: '2026-10-20T10:00:00Z' })).status).toBe(409);
  const restricted = scheduleFixture(securityContext(ROLES.LOG, { grants: [{ role_code: 'LOG', role_name: ROLES.LOG, site_id: id.site, academic_year_id: id.year, group_id: id.group }] }));
  expect((await restricted.post(body)).status).toBe(403);
  expect((await restricted.get()).status).toBe(200);
  expect((await (await restricted.get()).json()).canBlockAllSites).toBe(false);
});

test('Séance émargée : une correction de salle ne confond pas les formats ISO avec un changement d’horaire', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  fixture.snapshot.tables.attendances.push({ id: uuid(980), session_id: uuid(970) });
  const response = await fixture.post({ ...createSession, action: 'update_session', sessionId: uuid(970), roomId: uuid(951), startsAt: '2026-10-20T08:00:00.000Z', endsAt: '2026-10-20T10:00:00.000Z' });
  expect(response.status).toBe(200);
  expect(fixture.snapshot.tables.sessions[0].room_id).toBe(uuid(951));
});

test('Épreuve liée : déplacement coordonné et une seule commande de séance', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  const delivery = attachScheduledExam(fixture);
  const response = await fixture.post({ action: 'move_session', sessionId: uuid(970), startsAt: createSession.startsAt, endsAt: createSession.endsAt });
  expect(response.status).toBe(200);
  expect(delivery).toMatchObject({ access_opens_at: '2026-10-21T08:15:00.000Z', access_closes_at: '2026-10-21T09:45:00.000Z', duration_minutes: 60, reason: 'Organisation pédagogique validée' });
  expect(fixture.transactions).toHaveLength(1);
  expect(fixture.transactions[0]).toHaveLength(1);
  expect(fixture.transactions[0][0].table).toBe('sessions');
});

test('Modifier la séance applique aussi le déplacement coordonné et expose uniquement le récapitulatif', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  attachScheduledExam(fixture);
  const directory = await (await fixture.get()).json();
  expect(directory.sessions[0].exam).toMatchObject({ name: 'Épreuve d’analyse', hasCopies: false, hasResults: false, durationMinutes: 60 });
  expect(Object.keys(directory.sessions[0].exam).sort()).toEqual(['closesAt', 'durationMinutes', 'evaluationId', 'hasCopies', 'hasResults', 'id', 'name', 'opensAt']);
  const response = await fixture.post({ ...createSession, action: 'update_session', sessionId: uuid(970), mode: 'PAPIER' });
  expect(response.status).toBe(200);
  expect(fixture.snapshot.tables.exam_deliveries[0].access_opens_at).toBe('2026-10-21T08:15:00.000Z');
});

for (const blocked of ['ouverte', 'copie interrompue', 'zéro réel', 'absence']) test(`Épreuve non déplaçable : ${blocked}`, async () => {
  const fixture = scheduleFixture();
  const delivery = attachScheduledExam(fixture);
  if (blocked === 'ouverte') delivery.access_opens_at = new Date(Date.now() - 60000).toISOString();
  if (blocked === 'copie interrompue') fixture.snapshot.tables.exam_attempts.push({ id: uuid(986), evaluation_id: id.evaluation(0), status: 'INTERROMPUE' });
  if (blocked === 'zéro réel') fixture.snapshot.tables.grades[0].value = 0;
  if (blocked === 'absence') fixture.snapshot.tables.grades[0].absence_status = 'ABSENT';
  const response = await fixture.post({ action: 'move_session', sessionId: uuid(970), startsAt: createSession.startsAt, endsAt: createSession.endsAt });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toMatch(blocked === 'ouverte' ? /déjà ouverte/ : /copie ou résultat/);
  expect(fixture.transactions).toEqual([]);
});

test('La fenêtre complète doit tenir dans le nouveau créneau et rester future', async () => {
  const fixture = scheduleFixture();
  attachScheduledExam(fixture);
  for (const [startsAt, endsAt, message] of [
    ['2026-10-21T08:00:00Z', '2026-10-21T09:00:00Z', /toute la fenêtre/],
    ['2026-01-02T08:00:00Z', '2026-01-02T10:00:00Z', /futur/],
  ] as const) {
    const response = await fixture.post({ action: 'move_session', sessionId: uuid(970), startsAt, endsAt });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(message);
  }
  expect(fixture.transactions).toEqual([]);
});

test('Un refus SQL arrivé après le récapitulatif conserve les deux horaires', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  attachScheduledExam(fixture);
  const before = structuredClone(fixture.snapshot);
  fixture.fail('Épreuve déjà ouverte : déplacement interdit');
  const response = await fixture.post({ action: 'move_session', sessionId: uuid(970), startsAt: createSession.startsAt, endsAt: createSession.endsAt });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toMatch(/déjà ouverte/);
  expect(fixture.snapshot).toEqual(before);
});

test('Un conflit SQL concurrent devient un message métier sans succès fictif', async () => {
  const fixture = scheduleFixture();
  fixture.fail('conflicting key value violates exclusion constraint "session_room_conflict"');
  const response = await fixture.post(createSession);
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe('Cette salle est déjà occupée sur ce créneau.');
  expect(fixture.transactions).toEqual([]);
});

test('Un groupe archivé ou détaché ne reçoit pas de nouvelle séance', async () => {
  for (const archived of [true, false]) {
    const fixture = scheduleFixture();
    if (archived) fixture.snapshot.tables.groups[0].archived_at = '2026-10-18T00:00:00Z';
    else fixture.snapshot.tables.group_offerings[0].archived_at = '2026-10-18T00:00:00Z';
    expect((await fixture.post(createSession)).status).toBe(404);
    expect(fixture.transactions).toEqual([]);
  }
});

test('Le retour à l’enseignant d’origine inactif est refusé sans empêcher une correction de salle', async () => {
  const fixture = scheduleFixture(securityContext(), true);
  fixture.snapshot.tables.teachers[0].active = false;
  fixture.snapshot.tables.sessions[0].replacement_teacher_id = uuid(21);
  expect((await fixture.post({ action: 'replace_teacher', sessionId: uuid(970), teacherId: null })).status).toBe(409);
  const original = fixture.snapshot.tables.sessions[0];
  expect((await fixture.post({ ...createSession, action: 'update_session', sessionId: original.id, startsAt: original.starts_at, endsAt: original.ends_at, roomId: uuid(951) })).status).toBe(200);
});
