import assert from 'node:assert/strict';
import { createTeamsOnlineMeeting, syncTeamsMeetingRecording, TeamsIntegrationError } from './microsoftGraphService';
import { confirmedMeetingUrl } from '../utils/meetingLinks';

export async function verifyMicrosoftTeamsIntegration() {
  const previousFetch = globalThis.fetch;
  const keys = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const params = { sessionId: '10000000-0000-4000-8000-000000000001', subject: 'Cours de test', startDateTime: '2026-11-16T18:30:00Z', endDateTime: '2026-11-16T20:30:00Z', organizerEmail: 'organizer@escen.university' };
  const organizerId = '20000000-0000-4000-8000-000000000001';
  const meetingUrl = 'https://teams.microsoft.com/l/meetup-join/real-meeting';
  try {
    for (const key of keys) delete process.env[key];
    globalThis.fetch = async () => { throw new Error('No network request expected'); };
    await assert.rejects(createTeamsOnlineMeeting(params), TeamsIntegrationError);

    for (const key of keys) process.env[key] = 'local-test-value';
    for (const scenario of ['online', 'calendar', 'denied', 'calendar_without_link', 'recording', 'recording_denied']) {
      const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        requests.push({ url, body: init?.body ? JSON.parse(String(init.body).startsWith('{') ? String(init.body) : '{}') : {} });
        if (url.startsWith('https://login.microsoftonline.com/')) return Response.json({ access_token: 'local-test-token' });
        if (url.endsWith('?$select=id')) return Response.json({ id: organizerId });
        if (url.includes('/onlineMeetings/createOrGet')) {
          assert.ok(url.includes(`/users/${organizerId}/`));
          return scenario === 'online' ? Response.json({ id: 'confirmed-meeting', joinWebUrl: meetingUrl }) : Response.json({ error: { code: 'Forbidden' } }, { status: 403 });
        }
        if (url.includes('/calendar/events')) {
          if (scenario === 'calendar') return Response.json({ id: 'calendar-event', onlineMeeting: { joinUrl: meetingUrl } });
          if (scenario === 'calendar_without_link') return Response.json({ id: 'calendar-event', onlineMeeting: null });
          return Response.json({ error: { code: 'Forbidden' } }, { status: 403 });
        }
        if (url.endsWith('/recordings')) return scenario === 'recording'
          ? Response.json({ value: [{ recordingContentUrl: 'https://graph.microsoft.com/v1.0/protected-recording/content' }] })
          : Response.json({ error: { code: 'Forbidden' } }, { status: 403 });
        throw new Error(`Unexpected endpoint ${url}`);
      };
      if (scenario.startsWith('recording')) {
        const result = await syncTeamsMeetingRecording({ sessionId: params.sessionId, meetingId: 'confirmed-meeting', organizerEmail: params.organizerEmail });
        assert.equal(result.recordingUrl, null);
        if (scenario === 'recording') assert.match(result.message || '', /lien de lecture OneDrive ou SharePoint/);
        assert.equal(requests.filter(r => r.url.includes('/drive/') || r.url.includes('/createLink')).length, 0);
      } else if (scenario === 'online' || scenario === 'calendar') {
        const result = await createTeamsOnlineMeeting(params);
        assert.equal(result.meetingUrl, meetingUrl);
        assert.equal(result.source, 'GRAPH_API');
        assert.equal(result.meetingId, scenario === 'online' ? 'confirmed-meeting' : null);
        assert.equal(requests.find(r => r.url.includes('/createOrGet'))?.body.externalId, params.sessionId);
        if (scenario === 'calendar') assert.equal(requests.find(r => r.url.includes('/calendar/events'))?.body.transactionId, params.sessionId);
      } else await assert.rejects(createTeamsOnlineMeeting(params), TeamsIntegrationError);
    }
    assert.equal(confirmedMeetingUrl('https://teams.microsoft.com/fabricated', 'teams-old-session'), null);
    assert.equal(confirmedMeetingUrl(meetingUrl, null), meetingUrl);
    console.log('Teams : organisateur réel, réunions confirmées et idempotentes, liens de repli masqués et enregistrements non confondus.');
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}
