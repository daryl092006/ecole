import assert from 'node:assert/strict';
import { COURSE_TEAMS_ORGANIZER, createTeamsOnlineMeeting, syncTeamsMeetingRecording, TeamsIntegrationError } from './microsoftGraphService';
import { confirmedMeetingUrl } from '../utils/meetingLinks';

export async function verifyMicrosoftTeamsIntegration() {
  const previousFetch = globalThis.fetch;
  const keys = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const params = { sessionId: '10000000-0000-4000-8000-000000000001', subject: 'Cours de test', startDateTime: '2026-11-16T18:30:00Z', endDateTime: '2026-11-16T20:30:00Z', organizerEmail: 'organizer@escen.university' };
  const organizerId = '20000000-0000-4000-8000-000000000001';
  const teacherId = '20000000-0000-4000-8000-000000000002';
  const meetingUrl = 'https://teams.microsoft.com/l/meetup-join/real-meeting';
  try {
    for (const key of keys) delete process.env[key];
    globalThis.fetch = async () => { throw new Error('No network request expected'); };
    await assert.rejects(createTeamsOnlineMeeting(params), TeamsIntegrationError);

    for (const key of keys) process.env[key] = 'local-test-value';
    for (const scenario of ['online', 'denied', 'configuration_denied', 'unconfirmed_coorganizer', 'recording', 'recording_denied']) {
      const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        requests.push({ url, body: init?.body ? JSON.parse(String(init.body).startsWith('{') ? String(init.body) : '{}') : {} });
        if (url.startsWith('https://login.microsoftonline.com/')) return Response.json({ access_token: 'local-test-token' });
        if (url.endsWith('?$select=id')) return Response.json({ id: url.includes(encodeURIComponent(COURSE_TEAMS_ORGANIZER)) ? organizerId : teacherId });
        if (url.includes('/onlineMeetings/createOrGet')) {
          assert.ok(url.includes(`/users/${organizerId}/`));
          return scenario === 'denied' ? Response.json({ error: { code: 'Forbidden' } }, { status: 403 })
            : Response.json({ id: 'confirmed-meeting', joinWebUrl: meetingUrl, participants: { attendees: [{ upn: 'another@escen.university', role: 'attendee', identity: { user: { id: 'another-user' } } }] } });
        }
        if (init?.method === 'PATCH') {
          assert.ok(url.includes(`/users/${organizerId}/onlineMeetings/confirmed-meeting`));
          if (scenario === 'configuration_denied') return Response.json({}, { status: 403 });
          const body = JSON.parse(String(init.body));
          if (scenario === 'unconfirmed_coorganizer') body.participants.attendees = [];
          return Response.json(body);
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
      } else if (scenario === 'online') {
        const result = await createTeamsOnlineMeeting(params);
        assert.equal(result.meetingUrl, meetingUrl);
        assert.equal(result.source, 'GRAPH_API');
        assert.equal(result.meetingId, 'confirmed-meeting');
        assert.equal(requests.find(r => r.url.includes('/createOrGet'))?.body.externalId, params.sessionId);
        const configured = requests.find(r => r.url.endsWith('/confirmed-meeting'))?.body;
        assert.equal(configured?.recordAutomatically, true);
        assert.deepEqual((configured?.participants as { attendees: unknown[] }).attendees, [
          { upn: 'another@escen.university', role: 'attendee', identity: { user: { id: 'another-user' } } },
          { upn: params.organizerEmail, role: 'coorganizer', identity: { user: { id: teacherId } } },
        ]);
      } else await assert.rejects(createTeamsOnlineMeeting(params), TeamsIntegrationError);
      assert.equal(requests.filter(request => request.url.includes('/calendar/events')).length, 0);
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
