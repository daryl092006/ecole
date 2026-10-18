import { expect, test } from '@playwright/test';
import { ROLES } from '../../src/types/permissions';
import { evaluationSecurityRoute, securityContext, securityIds as id, uuid } from './security-fixture';

const actions = ['create', 'enter_grades', 'correct_grade'] as const;
type Action = typeof actions[number];
function command(action: Action, index = 0) {
  if (action === 'create') return { action, assignmentId: id.assignment(index), name: 'Évaluation de sécurité', kind: 'DEVOIR' };
  if (action === 'enter_grades') return { action, evaluationId: id.evaluation(index), grades: [{ candidateId: id.candidate(index), value: 14, absenceStatus: null }] };
  return { action, gradeId: id.grade(index), newValue: 14, reason: 'Correction motivée de recette' };
}

function prepare(action: Action, context = securityContext()) {
  const route = evaluationSecurityRoute(context);
  if (action === 'correct_grade') route.snapshot.tables.evaluations.forEach(row => { row.status = 'PUBLIEES'; });
  return route;
}

for (const action of actions) {
  test(`${action} refuse une autre année, même avec un rôle IT global`, async () => {
    const route = prepare(action);
    expect((await route.post(command(action, 2))).status).toBe(404);
    expect(route.transactions).toEqual([]);
  });

  test(`${action} refuse les autres groupes et sites sans aucune transaction`, async () => {
    const role = action === 'correct_grade' ? ROLES.DA : ROLES.IT;
    const route = prepare(action, securityContext(role, { grants: [{ role_code: 'IT', role_name: role, site_id: id.site, academic_year_id: id.year, group_id: id.group }] }));
    for (const index of [1, 3]) expect((await route.post(command(action, index))).status).toBe(404);
    expect(route.transactions).toEqual([]);
    expect((await route.post(command(action))).status).toBe(action === 'create' ? 201 : 200);
    expect(route.transactions).toHaveLength(1);
  });

  test(`${action} exige sa permission métier`, async () => {
    const route = prepare(action, securityContext(ROLES.IT, { permissions: ['academic.view', 'schedule.view', 'student.view', 'grade.view'] }));
    expect((await route.post(command(action))).status).toBe(403);
    expect(route.transactions).toEqual([]);
  });

  test(`${action} refuse toutes années et les composants d'une autre année`, async () => {
    const route = prepare(action);
    expect((await route.post(command(action), 'all')).status).toBe(409);
    expect((await route.post(command(action, 5))).status).toBe(404);
    expect(route.transactions).toEqual([]);
  });

  test(`${action} accepte le périmètre autorisé et conserve auteur et révision`, async () => {
    const route = prepare(action);
    expect((await route.post(command(action))).status).toBe(action === 'create' ? 201 : 200);
    expect(route.transactions).toHaveLength(1);
    expect(route.transactions[0].args).toMatchObject({ p_actor_id: uuid(900), p_expected_revision: 4 });
    expect(route.transactions[0].name).toBe(action === 'correct_grade' ? 'escen_backend_transaction' : 'escen_evaluation_transaction');
  });
}

for (const action of ['create', 'enter_grades'] as const) {
  test(`${action} enseignant refuse l'affectation d'un collègue et accepte la sienne`, async () => {
    const route = prepare(action, securityContext(ROLES.ENS));
    expect((await route.post(command(action, 1))).status).toBe(404);
    expect(route.transactions).toEqual([]);
    expect((await route.post(command(action))).status).toBe(action === 'create' ? 201 : 200);
    expect(route.transactions).toHaveLength(1);
  });

  test(`${action} enseignant respecte aussi les limites de groupe et de site de son habilitation`, async () => {
    const route = prepare(action, securityContext(ROLES.ENS, { grants: [{ role_code: 'ENS', role_name: ROLES.ENS, site_id: id.site, academic_year_id: id.year, group_id: id.group }] }));
    for (const index of [3, 4]) expect((await route.post(command(action, index))).status).toBe(404);
    expect(route.transactions).toEqual([]);
    expect((await route.post(command(action))).status).toBe(action === 'create' ? 201 : 200);
  });
}

test('La saisie refuse un candidat d’une autre évaluation et conserve la note existante', async () => {
  const route = prepare('enter_grades');
  const response = await route.post({ ...command('enter_grades'), grades: [{ candidateId: id.candidate(1), value: 19 }] });
  expect(response.status).toBe(400);
  expect(route.transactions).toEqual([]);
  expect(route.snapshot.tables.grades.find(row => row.id === id.grade(1))?.value).toBe(12);
});

test('Le droit de corriger une note ne donne pas à un enseignant accès à celle d’un collègue', async () => {
  const context = securityContext(ROLES.ENS);
  const route = prepare('correct_grade', { ...context, permissions: [...context.permissions, 'grade.approve'] });
  expect((await route.post(command('correct_grade', 1))).status).toBe(404);
  expect(route.transactions).toEqual([]);
});

test('Les périmètres de plusieurs habilitations ne se combinent pas pour élargir un accès', async () => {
  const route = prepare('create', securityContext(ROLES.ENS, { grants: [
    { role_code: 'ENS', role_name: ROLES.ENS, site_id: id.site, academic_year_id: id.year, group_id: id.otherGroup },
    { role_code: 'ENS', role_name: ROLES.ENS, site_id: id.otherSite, academic_year_id: id.year, group_id: id.group },
  ] }));
  expect((await route.post(command('create'))).status).toBe(404);
  expect(route.transactions).toEqual([]);
});
