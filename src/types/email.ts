export type EmailStatus = 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'FAILED' | 'UNKNOWN';
export type EmailEvent = 'application_received' | 'application_status_changed' | 'exam_attempt_submitted' | 'exam_attempt_expired' | 'teaching_assignment_created' | 'grades_submitted' | 'grades_returned' | 'grades_approved' | 'grades_published' | 'course_scheduled' | 'course_schedule_changed' | 'course_cancelled' | 'exam_scheduled' | 'exam_schedule_changed' | 'exam_cancelled' | 'payment_recorded' | 'tuition_settled';
export type EmailErrorCode = 'CONFIGURATION' | 'PROVIDER_REJECTED' | 'RECIPIENT_INVALID' | 'NETWORK_AMBIGUOUS' | 'LEASE_EXPIRED' | 'UNEXPECTED_RESPONSE';
export interface EmailRecord {
  id: string; academic_year_id: string; event_type: EmailEvent; source_table: string; source_id: string;
  recipient_email: string; recipient_name: string; subject: string; status: EmailStatus; attempts: number;
  provider_reference: string | null; accepted_at: string | null; last_error_code: EmailErrorCode | null;
  requested_by: string | null; reason: string; version: number; created_at: string; updated_at: string;
}
export interface QueuedEmail extends EmailRecord { text_body: string; html_body: string; }
export interface EmailConfiguration { ready: boolean; provider: 'resend' | 'microsoft' | null; from: string | null; issue: string | null; }
export interface EmailPage { yearId: string | null; offset: number; limit: number; total: number; records: EmailRecord[]; configuration: EmailConfiguration; }
