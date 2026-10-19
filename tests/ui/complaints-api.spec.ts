import { expect, test } from '@playwright/test';
import { complaintsFixture, complaintId, gradeIds } from './complaints-fixture';
import { ROLES } from '../../src/types/permissions';

for (const role of [ROLES.STUD, ROLES.DEL]) test(`Dépôt sur sa note publiée, sans transition fictive : ${role}`, async () => {
  const fixture = complaintsFixture(role);
  const response = await fixture.post({ action: 'create_complaint', gradeId: gradeIds[0], reason: 'Vérifier la correction' });
  expect(response.status).toBe(201);
  expect(fixture.transactions[0].p_changes.map(change => change.table)).toEqual(['complaints']);
  expect(fixture.snapshot.tables.grades[0].value).toBe(12);
  expect((await fixture.post({ action: 'create_complaint', gradeId: gradeIds[0], reason: 'Seconde demande' })).status).toBe(409);
  expect(fixture.transactions).toHaveLength(1);
});

test('Le dépôt refuse autre étudiant, autre année, note non publiée et rôle de consultation', async () => {
  const fixture = complaintsFixture(ROLES.STUD);
  for (const gradeId of [gradeIds[1], gradeIds[2]]) expect((await fixture.post({ action: 'create_complaint', gradeId, reason: 'Vérifier la note' })).status).toBe(404);
  fixture.snapshot.tables.evaluations[0].status = 'SAISIES';
  expect((await fixture.post({ action: 'create_complaint', gradeId: gradeIds[0], reason: 'Note non publiée' })).status).toBe(404);
  expect(fixture.transactions).toEqual([]);
  const reader = complaintsFixture(ROLES.DG);
  expect((await reader.post({ action: 'create_complaint', gradeId: gradeIds[0], reason: 'Dépôt interdit' })).status).toBe(403);
});

test('Lecture des réclamations et événements limitée à son dossier et à son année', async () => {
  const fixture = complaintsFixture(ROLES.STUD);
  fixture.addComplaint(); fixture.addComplaint('NOUVELLE', 2, 'OTHER'); fixture.addComplaint('NOUVELLE', 3, 'OLD');
  fixture.snapshot.tables.complaint_events = [complaintId, 'OTHER', 'OLD'].map(id => ({ id: `EVENT-${id}`, complaint_id: id, reason: id }));
  const result = await (await fixture.get()).json();
  expect(result.complaints.map((row: { id: string }) => row.id)).toEqual([complaintId]);
  expect(result.events.map((row: { complaint_id: string }) => row.complaint_id)).toEqual([complaintId]);
});

test('Avis enseignant réservé à son affectation et à l’étape attendue', async () => {
  const fixture = complaintsFixture(ROLES.ENS);
  fixture.addComplaint('TRANSMISE_ENSEIGNANT');
  const command = { action: 'transition_complaint', complaintId, fromStatus: 'TRANSMISE_ENSEIGNANT', toStatus: 'AVIS_ENSEIGNANT', reason: 'Barème vérifié' };
  expect((await fixture.post(command)).status).toBe(200);
  const other = complaintsFixture(ROLES.ENS); other.addComplaint('TRANSMISE_ENSEIGNANT', 2);
  expect((await other.post(command)).status).toBe(404);
  expect(other.transactions).toEqual([]);
  const wrongStep = complaintsFixture(ROLES.ENS); wrongStep.addComplaint();
  expect((await wrongStep.post({ ...command, fromStatus: 'NOUVELLE', toStatus: 'EN_ANALYSE' })).status).toBe(403);
});

test('Traitement académique et correction/clôture en une transaction ordonnée', async () => {
  const fixture = complaintsFixture(ROLES.DA); fixture.addComplaint();
  for (const [fromStatus, toStatus] of [['NOUVELLE', 'EN_ANALYSE'], ['EN_ANALYSE', 'TRANSMISE_ENSEIGNANT'], ['TRANSMISE_ENSEIGNANT', 'AVIS_ENSEIGNANT'], ['AVIS_ENSEIGNANT', 'DECISION_ACADEMIQUE'], ['DECISION_ACADEMIQUE', 'CORRECTION_EVENTUELLE']]) {
    expect((await fixture.post({ action: 'transition_complaint', complaintId, fromStatus, toStatus, reason: 'Étape vérifiée' })).status).toBe(200);
  }
  const response = await fixture.post({ action: 'transition_complaint', complaintId, fromStatus: 'CORRECTION_EVENTUELLE', toStatus: 'CLOTUREE', correctedGrade: 15, reason: 'Erreur de correction confirmée' });
  expect(response.status).toBe(200);
  const changes = fixture.transactions.at(-1)!.p_changes;
  expect(changes.map(change => change.table)).toEqual(['grade_revisions', 'complaint_events']);
  expect(changes[0].record).toMatchObject({ old_value: 12, new_value: 15, actor_id: 'ACTOR', complaint_id: complaintId });
  expect(fixture.snapshot.tables.complaints[0].status).toBe('CLOTUREE');
  expect(fixture.snapshot.tables.grades[0].value).toBe(15);
});

test('Les transitions refusent lecture seule, hors groupe/année, saut d’étape et révision périmée', async () => {
  const command = { action: 'transition_complaint', complaintId, fromStatus: 'NOUVELLE', toStatus: 'EN_ANALYSE', reason: 'Analyse demandée' };
  const reader = complaintsFixture(ROLES.DG); reader.addComplaint();
  expect((await reader.post(command)).status).toBe(403);
  const scoped = complaintsFixture(ROLES.DA, { grants: [{ role_code: 'DA', role_name: ROLES.DA, site_id: null, academic_year_id: null, group_id: 'G1' }] }); scoped.addComplaint('NOUVELLE', 2);
  expect((await scoped.post(command)).status).toBe(404);
  const old = complaintsFixture(); old.addComplaint('NOUVELLE', 3);
  expect((await old.post(command)).status).toBe(404);
  const normal = complaintsFixture(); normal.addComplaint();
  expect((await normal.post({ ...command, toStatus: 'CLOTUREE' })).status).toBe(409);
  expect((await normal.post(command, 'all')).status).toBe(409);
  expect((await normal.post({ ...command, revision: 0 })).status).toBe(409);
  expect(normal.snapshot.tables.complaints[0].status).toBe('NOUVELLE');
});

test('Correction motivée, numérique, différente, publiée et réservée à la validation', async () => {
  const command = { action: 'transition_complaint', complaintId, fromStatus: 'CORRECTION_EVENTUELLE', toStatus: 'CLOTUREE', reason: 'Correction confirmée' };
  const fixture = complaintsFixture(); fixture.addComplaint('CORRECTION_EVENTUELLE');
  for (const correctedGrade of [undefined, -1, 21, 12]) expect((await fixture.post({ ...command, ...(correctedGrade === undefined ? {} : { correctedGrade }) })).status).toBe(400);
  fixture.snapshot.tables.evaluations[0].status = 'VALIDEES';
  expect((await fixture.post({ ...command, correctedGrade: 15 })).status).toBe(409);
  expect(fixture.transactions).toEqual([]);
  const reviewer = complaintsFixture(ROLES.DA, { permissions: ['academic.view', 'schedule.view', 'grade.view', 'complaint.view', 'complaint.review'] }); reviewer.addComplaint('CORRECTION_EVENTUELLE');
  expect((await reviewer.post({ ...command, correctedGrade: 15 })).status).toBe(403);
  expect(reviewer.transactions).toEqual([]);
});
