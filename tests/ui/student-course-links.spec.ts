import { expect, test } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot } from './persistent-fixture';
import { evaluationSecurityRoute, loadSecurityApi, securityContext, securityIds, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import type { CourseResourcesDirectory } from '../../src/types/courseResources';
import { installResponsiveAudit } from './responsive-audit-fixture';

const joinUrl = 'https://teams.microsoft.com/l/meetup-join/confirmed-session';
const replayUrl = 'https://escen.sharepoint.com/sites/cours/recording.mp4';

test('Cours étudiants : liens et replay de leur groupe uniquement, aucun lien Teams de repli', async () => {
  const context = securityContext(ROLES.STUD, { studentId: uuid(600), teacherId: null, grants: [{ role_code: 'STUD', role_name: ROLES.STUD, site_id: null, group_id: securityIds.group, academic_year_id: securityIds.year }] });
  const { snapshot: campus } = evaluationSecurityRoute(context);
  campus.tables.sessions = [0, 1, 2].map(index => ({
    id: uuid(800 + index), assignment_id: securityIds.assignment(index === 2 ? 1 : 0),
    offering_id: uuid(40), group_id: index === 2 ? securityIds.otherGroup : securityIds.group,
    teacher_id: securityIds.teacher, starts_at: '2026-06-16T18:30:00Z', ends_at: '2026-06-16T20:30:00Z', status: 'PLANIFIE', mode: 'EN_LIGNE',
    meeting_url: index === 1 ? 'https://teams.microsoft.com/fabricated' : joinUrl,
    meeting_id: index === 1 ? 'teams-old-session' : 'confirmed-meeting', recording_url: replayUrl,
  }));
  const client = { rpc: async (name: string) => {
    if (name === 'escen_backend_snapshot') return { data: campus };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: securityIds.year } };
    throw new Error('Unexpected RPC');
  } };
  const route = loadSecurityApi('app/api/course-resources/route.ts', client, context) as { GET: (request: Request) => Promise<Response> };
  const response = await route.GET(new Request('http://local.test/api/course-resources', { headers: { 'x-escen-year': securityIds.year } }));
  expect(response.status).toBe(200);
  const directory = await response.json() as CourseResourcesDirectory;
  expect(directory.onlineSessions.map(s => s.id).sort()).toEqual([uuid(800), uuid(801)]);
  expect(directory.onlineSessions.find(s => s.id === uuid(800))).toMatchObject({ meetingUrl: joinUrl, recordingUrl: replayUrl });
  expect(directory.onlineSessions.find(s => s.id === uuid(801))?.meetingUrl).toBeNull();
  expect(directory.canManage).toBe(false);
  expect(directory.canScheduleOnline).toBe(false);
});

for (const role of [ROLES.STUD, ROLES.DEL]) for (const width of [390, 1440]) test(`${role} : accès au cours et replay publié à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: 'student-account', name: 'Master 2 TEST', email: 'student@example.test', role, availableRoles: [role], studentId: uuid(600), teacherId: null, matricule: 'TEST-M2', mustChangePassword: false } }));
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const common = { assignmentId: uuid(100), offeringId: uuid(40), groupId: securityIds.group, groupName: 'Master 2 FD', componentId: uuid(60), subjectName: 'Finance', teacherName: 'Enseignant', startsAt: '2026-11-16T18:30:00Z', endsAt: '2026-11-16T20:30:00Z', status: 'PLANIFIE', mode: 'EN_LIGNE' as const, meetingProvider: 'TEAMS' as const, recordingSyncedAt: null };
  const directory: CourseResourcesDirectory = { revision: 4, selectedYearId: securityIds.year, canManage: role === ROLES.DEL, canScheduleOnline: false, courses: [], resources: [], onlineSessions: [
    { ...common, id: uuid(800), meetingUrl: joinUrl, recordingUrl: replayUrl },
    { ...common, id: uuid(801), subjectName: 'Cours sans lien', meetingUrl: null, recordingUrl: null },
  ] };
  if (role === ROLES.DEL) directory.courses = [{ assignmentId: common.assignmentId, offeringId: common.offeringId, offeringLabel: 'Master 2 FD', groupId: common.groupId, groupName: common.groupName, componentId: common.componentId, subjectCode: 'FIN', subjectName: common.subjectName, semesterName: 'Semestre 1', credits: 3, coefficient: 1, teacherId: securityIds.teacher, teacherName: common.teacherName, teacherEmail: null, validFrom: '2026-01-01', validUntil: null, totalSessions: 2, onlineSessions: 2, resourcesCount: 0, recordingsCount: 1 }];
  await page.route('**/api/course-resources*', route => route.fulfill({ json: directory }));
  await page.route('**/api/course-resources?playbackSessionId=*', route => route.fulfill({ json: { url: 'https://video.example.test/temporary-replay.mp4', inline: true } }));
  await page.route('https://video.example.test/**', route => route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));
  await page.goto('/academique/supports');
  await page.getByRole('button', { name: /Séances en ligne/ }).click();
  await expect(page.getByRole('link', { name: 'Rejoindre Teams', exact: true })).toHaveAttribute('href', joinUrl);
  await expect(page.getByRole('link', { name: 'Voir le replay', exact: true })).toHaveAttribute('href', replayUrl);
  await expect(page.getByText('Lien non généré', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Créer lien Teams|Associer replay|Programmer un cours/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Voir le replay', exact: true }).click();
  await expect(page.getByRole('dialog').locator('video')).toHaveAttribute('src', 'https://video.example.test/temporary-replay.mp4');
  if (role === ROLES.DEL) {
    await page.getByRole('dialog').getByRole('button', { name: 'Fermer le détail', exact: true }).click();
    await page.getByRole('button', { name: '+ Déposer un support de cours', exact: true }).click();
    const category = page.getByRole('combobox', { name: 'Catégorie', exact: true });
    await expect(category.locator('option[value="ENREGISTREMENT"]')).toHaveCount(0);
    await expect(category.locator('option[value="SUPPORT"]')).toHaveCount(1);
  }

});

test('Lecture d’un replay : séance du groupe uniquement, année et annulation contrôlées avant tout accès Microsoft', async () => {
  const context = securityContext(ROLES.STUD, { studentId: uuid(600), teacherId: null, grants: [{ role_code: 'STUD', role_name: ROLES.STUD, site_id: null, group_id: securityIds.group, academic_year_id: securityIds.year }] });
  const { snapshot: campus } = evaluationSecurityRoute(context);
  campus.tables.sessions = [0, 1, 2, 3].map(index => ({
    id: uuid(850 + index), assignment_id: securityIds.assignment(index === 1 ? 1 : index === 2 ? 2 : 0),
    offering_id: index === 2 ? uuid(41) : uuid(40), group_id: index === 1 ? securityIds.otherGroup : index === 2 ? securityIds.otherYearGroup : securityIds.group,
    teacher_id: securityIds.teacher, starts_at: '2026-06-16T18:30:00Z', ends_at: '2026-06-16T20:30:00Z',
    status: index === 3 ? 'ANNULE' : 'PLANIFIE', mode: 'EN_LIGNE', recording_url: 'https://recordings.example.test/course.mp4',
  }));
  const client = { rpc: async (name: string) => {
    if (name === 'escen_backend_snapshot') return { data: campus };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: securityIds.year } };
    throw new Error('Unexpected RPC');
  } };
  const route = loadSecurityApi('app/api/course-resources/route.ts', client, context) as { GET: (request: Request) => Promise<Response> };
  for (const index of [0, 1, 2, 3, 4]) {
    const response = await route.GET(new Request(`http://local.test/api/course-resources?playbackSessionId=${uuid(850 + index)}`, { headers: { 'x-escen-year': securityIds.year } }));
    expect(response.status).toBe(index === 0 ? 200 : 404);
    if (index === 0) {
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(await response.json()).toEqual({ url: 'https://recordings.example.test/course.mp4', inline: false });
    }
  }
});

for (const width of [390, 1440]) for (const state of ['published', 'missing', 'legacy'] as const) {
  test(`Fiche de séance étudiante : liens ${state} à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.clock.setFixedTime(new Date('2026-10-19T07:00:00Z'));
    const { snapshot: campus } = await installResponsiveAudit(page, 'student');
    const session = campus.tables.sessions[0];
    session.mode = 'EN_LIGNE';
    session.room_id = null;
    session.meeting_url = state === 'missing' ? null : joinUrl;
    session.meeting_id = state === 'legacy' ? 'teams-old-session' : null;
    session.recording_url = state === 'published' ? replayUrl : null;
    await page.goto('/academique/emploi-du-temps');
    await page.getByRole('button', { name: /^Séance / }).first().click();
    const dialog = page.getByRole('dialog').last();
    if (state === 'published') {
      await expect(dialog.getByRole('link', { name: 'Rejoindre le cours Teams', exact: true })).toHaveAttribute('href', joinUrl);
      await expect(dialog.getByRole('link', { name: 'Accéder à l’enregistrement', exact: true })).toHaveAttribute('href', replayUrl);
    } else {
      await expect(dialog.getByRole('link', { name: 'Rejoindre le cours Teams', exact: true })).toHaveCount(0);
      await expect(dialog.getByText('Lien non encore généré', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Accéder à l’enregistrement', exact: true })).toHaveCount(0);
    }
    await expect(dialog.getByText('En ligne (Microsoft Teams)', { exact: true })).toBeVisible();
  });
}

test('Délégué : consultation et supports conservés, gestion Teams et replays refusée sans écriture', async () => {
  const context = securityContext(ROLES.DEL, { roleCode: 'DEL', studentId: uuid(600), teacherId: null, grants: [{ role_code: 'DEL', role_name: ROLES.DEL, site_id: null, group_id: securityIds.group, academic_year_id: securityIds.year }] });
  const { snapshot: campus } = evaluationSecurityRoute(context);
  campus.tables.sessions = [{ id: uuid(800), assignment_id: securityIds.assignment(0), offering_id: uuid(40), group_id: securityIds.group, teacher_id: securityIds.teacher, starts_at: '2026-06-16T18:30:00Z', ends_at: '2026-06-16T20:30:00Z', status: 'PLANIFIE', mode: 'EN_LIGNE', meeting_id: 'confirmed-meeting', meeting_url: joinUrl, recording_url: replayUrl }];
  campus.tables.course_resources = [{ id: uuid(810), assignment_id: securityIds.assignment(0), session_id: uuid(800), academic_year_id: securityIds.year, offering_id: uuid(40), group_id: securityIds.group, component_id: uuid(60), kind: 'ENREGISTREMENT', resource_url: replayUrl, uploaded_by: context.accountId }];
  const writes: unknown[] = [];
  const client = { rpc: async (name: string, args?: unknown) => {
    if (name === 'escen_backend_snapshot') return { data: campus };
    if (name === 'escen_academic_year_context') return { data: { currentYearId: securityIds.year } };
    writes.push({ name, args });
    return { data: 5 };
  } };
  const route = loadSecurityApi('app/api/course-resources/route.ts', client, context) as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
  const headers = { 'Content-Type': 'application/json', 'x-escen-year': securityIds.year };
  const directory = await (await route.GET(new Request('http://local.test/api/course-resources', { headers }))).json() as CourseResourcesDirectory;
  expect(directory.canManage).toBe(true);
  expect(directory.canScheduleOnline).toBe(false);
  expect(directory.onlineSessions).toHaveLength(1);
  expect(directory.onlineSessions[0]).toMatchObject({ meetingUrl: joinUrl, recordingUrl: replayUrl });
  const payloads = [
    { action: 'generate_meeting_link', sessionId: uuid(800) },
    { action: 'generate_meeting_link', sessionId: uuid(800), customMeetingUrl: joinUrl },
    { action: 'save_recording', sessionId: uuid(800), recordingUrl: replayUrl },
    { action: 'save_recording', sessionId: uuid(800) },
    { action: 'create_online_session', assignmentId: securityIds.assignment(0), startsAt: '2026-06-17T18:30:00Z', endsAt: '2026-06-17T20:30:00Z' },
    { action: 'create_resource', assignmentId: securityIds.assignment(0), sessionId: uuid(800), kind: 'ENREGISTREMENT', title: 'Replay interdit', resourceUrl: replayUrl },
    { action: 'archive_resource', resourceId: uuid(810) },
  ];
  for (const payload of payloads) {
    const response = await route.POST(new Request('http://local.test/api/course-resources', { method: 'POST', headers, body: JSON.stringify({ revision: 4, reason: 'Vérification des droits du délégué', ...payload }) }));
    expect(response.status, payload.action).toBe(403);
  }
  expect(writes).toHaveLength(0);
  const saved = await route.POST(new Request('http://local.test/api/course-resources', { method: 'POST', headers, body: JSON.stringify({ revision: 4, reason: 'Déposer un support de cours du groupe', action: 'create_resource', assignmentId: securityIds.assignment(0), kind: 'SUPPORT', title: 'Support du cours', resourceUrl: 'https://documents.example.test/support.pdf' }) }));
  expect(saved.status).toBe(201);
  expect(writes).toHaveLength(1);
});
