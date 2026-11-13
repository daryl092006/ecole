/** Les identifiants teams-<UUID> désignent les anciens liens de repli, sans réunion Microsoft. */
export function confirmedMeetingUrl(meetingUrl: unknown, meetingId: unknown): string | null {
  if (!meetingUrl || String(meetingId || '').startsWith('teams-')) return null;
  return String(meetingUrl);
}
