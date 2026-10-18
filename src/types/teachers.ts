export interface TeacherProfile {
  id: string; staffId: string; personId: string; name: string; employeeNumber: string;
  specialty: string; active: boolean;
}
export interface TeachingAssignmentRecord {
  id: string; teacherId: string; groupId: string; offeringId: string; componentId: string;
  validFrom: string; validUntil: string | null; reason: string;
}
export interface TeacherDirectory {
  revision: number;
  teachers: TeacherProfile[];
  staff: { id: string; name: string; employeeNumber: string }[];
  assignments: TeachingAssignmentRecord[];
  offerings: { id: string; label: string; curriculumId: string }[];
  groups: { id: string; label: string; offeringIds: string[] }[];
  components: { id: string; label: string; curriculumId: string }[];
  canManageProfiles: boolean; canManageAssignments: boolean; selectedYearId: string | null;
}
export type TeacherCommand = { revision: number; reason: string } & (
  | { action: 'create_profile'; staffId: string; specialty: string }
  | { action: 'update_profile'; teacherId: string; specialty: string }
  | { action: 'set_active'; teacherId: string; active: boolean }
  | { action: 'create_assignment'; teacherId: string; groupId: string; offeringId: string; componentId: string; validFrom: string; validUntil: string | null }
  | { action: 'end_assignment'; assignmentId: string; endOn: string }
);
