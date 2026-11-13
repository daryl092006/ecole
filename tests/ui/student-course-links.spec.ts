import { expect, test } from '@playwright/test';
import { authenticateFixture, fixtureCapabilities, snapshot } from './persistent-fixture';
import { evaluationSecurityRoute, loadSecurityApi, securityContext, securityIds, uuid } from './security-fixture';
import { ROLES } from '../../src/types/permissions';
import type { CourseResourcesDirectory } from '../../src/types/courseResources';

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

for (const width of [390, 1440]) test(`Étudiant : accès au cours et replay publié à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await authenticateFixture(page);
  await page.route('**/api/session', route => route.fulfill({ json: { capabilities: fixtureCapabilities, accountId: 'student-account', name: 'Master 2 TEST', email: 'student@example.test', role: ROLES.STUD, availableRoles: [ROLES.STUD], studentId: uuid(600), teacherId: null, matricule: 'TEST-M2', mustChangePassword: false } }));
  await page.route('**/api/campus', route => route.fulfill({ json: snapshot }));
  const common = { assignmentId: uuid(100), offeringId: uuid(40), groupId: securityIds.group, groupName: 'Master 2 FD', componentId: uuid(60), subjectName: 'Finance', teacherName: 'Enseignant', startsAt: '2026-11-16T18:30:00Z', endsAt: '2026-11-16T20:30:00Z', status: 'PLANIFIE', mode: 'EN_LIGNE' as const, meetingProvider: 'TEAMS' as const, recordingSyncedAt: null };
  const directory: CourseResourcesDirectory = { revision: 4, selectedYearId: securityIds.year, canManage: false, canScheduleOnline: false, courses: [], resources: [], onlineSessions: [
    { ...common, id: uuid(800), meetingUrl: joinUrl, recordingUrl: replayUrl },
    { ...common, id: uuid(801), subjectName: 'Cours sans lien', meetingUrl: null, recordingUrl: null },
  ] };
  await page.route('**/api/course-resources*', route => route.fulfill({ json: directory }));
  await page.goto('/academique/supports');
  await page.getByRole('button', { name: /Séances en ligne/ }).click();
  await expect(page.getByRole('link', { name: 'Rejoindre Teams', exact: true })).toHaveAttribute('href', joinUrl);
  await expect(page.getByRole('link', { name: 'Voir le replay', exact: true })).toHaveAttribute('href', replayUrl);
  await expect(page.getByText('Lien non généré', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Créer lien Teams|Associer replay|Programmer un cours/ })).toHaveCount(0);
});
