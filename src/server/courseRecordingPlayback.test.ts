import assert from 'node:assert/strict';
import { courseRecordingPlaybackUrl } from './courseRecordingPlayback';

export async function verifyCourseRecordingPlayback() {
  const root = 'https://school-my.sharepoint.com/personal/class5_escen_university/Documents';
  const recording = `${root}/Recordings/Cours%20num%C3%A9rique.mp4`;
  const signed = 'https://video.example.test/private-video?temporary=example';
  const source = { application: 'Teams', meetingOrganizerId: 'class5-id', meetingOrganizerTenantId: 'tenant-test-id', threadId: '19:meeting_course@thread.v2' };
  const meetingId = Buffer.from(`1*${source.meetingOrganizerId}*0**${source.threadId}`).toString('base64');
  const calls: string[] = [];
  const send: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-only-token');
    assert.equal(init?.redirect, 'error');
    if (url.includes('/users/class5%40escen.university/drive?')) return Response.json({ id: 'private-drive', webUrl: root });
    assert.ok(url.endsWith('/drives/private-drive/root:/Recordings/Cours%20num%C3%A9rique.mp4'));
    return Response.json({ source, file: { mimeType: 'video/mp4' }, '@microsoft.graph.downloadUrl': signed });
  };
  const dependencies = { send, token: async () => 'test-only-token', tenantId: 'tenant-test-id' };
  assert.equal(await courseRecordingPlaybackUrl(recording, meetingId, dependencies), signed);
  assert.equal(calls.length, 2);
  calls.length = 0;
  const external = 'https://example.test/replay.mp4';
  assert.equal(await courseRecordingPlaybackUrl(external, null, dependencies), external);
  assert.equal(calls.length, 0);
  await assert.rejects(courseRecordingPlaybackUrl('javascript:alert(1)', null, dependencies));
  await assert.rejects(courseRecordingPlaybackUrl('https://user:password@example.test/file.mp4', null, dependencies));
  const foreign = 'https://another.sharepoint.com/personal/class5_escen_university/Documents/file.mp4';
  assert.equal(await courseRecordingPlaybackUrl(foreign, null, dependencies), foreign);
  assert.equal(calls.length, 1, 'A foreign library must never be resolved with the Class5 drive');
  await assert.rejects(courseRecordingPlaybackUrl(recording, meetingId, { ...dependencies, send: async () => Response.json({}, { status: 403 }) }));
  await assert.rejects(courseRecordingPlaybackUrl(recording, meetingId, { ...dependencies, send: async input => String(input).includes('/users/')
    ? Response.json({ id: 'private-drive', webUrl: root }) : Response.json({ source, file: { mimeType: 'text/html' }, '@microsoft.graph.downloadUrl': signed }) }));
  await assert.rejects(courseRecordingPlaybackUrl(recording, 'another-course-meeting', dependencies));
  await assert.rejects(courseRecordingPlaybackUrl(recording, null, dependencies));
  await assert.rejects(courseRecordingPlaybackUrl(recording, meetingId, { ...dependencies, tenantId: 'another-tenant' }));
  console.log('Replays : vidéo Class5 privée, URL temporaire sans jeton Graph, bibliothèque et type de fichier contrôlés.');
}
