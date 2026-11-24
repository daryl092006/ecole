import 'server-only';
import { COURSE_TEAMS_ORGANIZER, getGraphAccessToken } from '@/services/microsoftGraphService';

/** Resolve a private Class5 video only after the caller checked the course audience. */
export async function courseRecordingPlaybackUrl(recordingUrl: string, meetingId: string | null, dependencies = { send: fetch, token: getGraphAccessToken, tenantId: process.env.AZURE_TENANT_ID }): Promise<string> {
  const requested = new URL(recordingUrl);
  if (requested.protocol !== 'https:' || requested.username || requested.password) throw new Error('Invalid recording URL');
  if (!requested.hostname.endsWith('.sharepoint.com')) return requested.href;
  const token = await dependencies.token();
  if (!token) throw new Error('Microsoft connection unavailable');
  async function get(path: string): Promise<Record<string, unknown>> {
    const response = await dependencies.send(`https://graph.microsoft.com/v1.0/${path}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) throw new Error('Microsoft recording unavailable');
    return response.json() as Promise<Record<string, unknown>>;
  }
  const drive = await get(`users/${encodeURIComponent(COURSE_TEAMS_ORGANIZER)}/drive?$select=id,webUrl`);
  if (typeof drive.id !== 'string' || typeof drive.webUrl !== 'string') throw new Error('Recording drive unavailable');
  const base = new URL(drive.webUrl);
  const rootPath = decodeURIComponent(base.pathname).replace(/\/$/, '') + '/';
  const requestedPath = decodeURIComponent(requested.pathname);
  if (requested.origin !== base.origin || !requestedPath.startsWith(rootPath)) return requested.href;
  const relative = requestedPath.slice(rootPath.length);
  if (!relative || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid recording path');
  const path = relative.split('/').map(encodeURIComponent).join('/');
  // Download URLs are response annotations; some SharePoint tenants omit them with $select.
  const item = await get(`drives/${encodeURIComponent(drive.id)}/root:/${path}`);
  const source = item.source as { application?: string; meetingOrganizerId?: string; meetingOrganizerTenantId?: string; threadId?: string } | undefined;
  const isFromClass5Meeting = Boolean(
    dependencies.tenantId &&
    source?.application === 'Teams' &&
    source.meetingOrganizerTenantId === dependencies.tenantId &&
    source.meetingOrganizerId &&
    source.threadId
  );
  if (!meetingId || !isFromClass5Meeting) {
    throw new Error('Recording does not belong to the authorized course meeting');
  }
  const expectedMeetingId = Buffer.from(`1*${source!.meetingOrganizerId}*0**${source!.threadId}`).toString('base64');
  if (expectedMeetingId !== meetingId) {
    let sameOrganizer = false;
    try {
      const decoded = Buffer.from(meetingId, 'base64').toString('utf8');
      sameOrganizer = decoded.startsWith(`1*${source!.meetingOrganizerId}*0**19:meeting_`);
    } catch {
      sameOrganizer = false;
    }
    if (!sameOrganizer) {
      throw new Error('Recording does not belong to the authorized course meeting');
    }
  }
  const file = item.file as { mimeType?: string } | undefined;
  if (!file?.mimeType?.startsWith('video/') || typeof item['@microsoft.graph.downloadUrl'] !== 'string') throw new Error('Video unavailable');
  const playback = new URL(item['@microsoft.graph.downloadUrl']);
  if (playback.protocol !== 'https:' || playback.username || playback.password) throw new Error('Invalid playback URL');
  return playback.href;
}
