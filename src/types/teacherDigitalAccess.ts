export interface TeacherDigitalAccessResult {
  status: 'SENT' | 'FAILED' | 'UNKNOWN';
  institutionalEmail?: string;
  reusedMicrosoftAccount?: boolean;
}
