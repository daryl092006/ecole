import type { DatabaseRow, PersistentContext, RelationalSnapshot } from '@/types/persistence';
import type { TeacherDirectory, TeacherProfile } from '@/types/teachers';
import { filterRelationalSnapshot } from './persistentPermissionsService';
import { filterSnapshotForAcademicYear } from './academicYearScopeService';
import { annualOfferingLabel } from './annualOfferingService';

export const hasGlobalStaffManagement = (context: PersistentContext) => context.permissions.includes('staff.manage')
  && context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id);

export function assignmentIsGranted(context: PersistentContext, offering: DatabaseRow, groupId: unknown) {
  return context.grants.some(grant => (!grant.site_id || grant.site_id === offering.site_id)
    && (!grant.academic_year_id || grant.academic_year_id === offering.academic_year_id)
    && (!grant.group_id || grant.group_id === groupId));
}

export function teacherAcademicScope(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null) {
  const scoped = filterRelationalSnapshot(snapshot, context);
  // A scoped manager still needs the subjects referenced by the permitted curricula.
  const subjectIds = new Set((scoped.tables.curriculum_components || []).map(component => component.subject_id));
  scoped.tables.subjects = (snapshot.tables.subjects || []).filter(subject => subjectIds.has(subject.id));
  return filterSnapshotForAcademicYear(scoped, yearId || '00000000-0000-0000-0000-000000000000');
}

export function teacherDirectory(snapshot: RelationalSnapshot, context: PersistentContext, yearId: string | null): TeacherDirectory {
  const scoped = teacherAcademicScope(snapshot, context, yearId);
  const rows = (name: string) => snapshot.tables[name] || [];
  const staff = rows('staff').flatMap(member => {
    const person = rows('people').find(row => row.id === member.person_id && !row.archived_at);
    return member.archived_at || !person ? [] : [{ id: member.id, personId: person.id,
      name: `${String(person.firstname || '')} ${String(person.lastname || '')}`.trim(), employeeNumber: String(member.employee_number || '') }];
  });
  // Academic managers can choose an available teacher; no personal contact or account data is returned.
  const teachers: TeacherProfile[] = rows('teachers').flatMap(teacher => {
    const member = staff.find(row => row.id === teacher.staff_id);
    return member ? [{ id: teacher.id, staffId: member.id, personId: member.personId, name: member.name,
      employeeNumber: member.employeeNumber, specialty: String(teacher.specialty || ''), active: teacher.active === true }] : [];
  });
  const offerings = (scoped.tables.academic_offerings || []).filter(row => !row.archived_at
    && scoped.tables.curricula?.some(curriculum => curriculum.id === row.curriculum_id && !curriculum.archived_at && curriculum.status !== 'ARCHIVED'));
  const components = (scoped.tables.curriculum_components || []).filter(component => !component.archived_at
    && scoped.tables.teaching_units?.some(unit => unit.id === component.unit_id && !unit.archived_at
      && scoped.tables.curriculum_semesters?.some(semester => semester.id === unit.semester_id && !semester.archived_at))
    && scoped.tables.subjects?.some(subject => subject.id === component.subject_id && !subject.archived_at));
  const groups = (scoped.tables.groups || []).filter(group => !group.archived_at);
  const links = (scoped.tables.group_offerings || []).filter(link => !link.archived_at
    && offerings.some(offering => offering.id === link.offering_id && assignmentIsGranted(context, offering, link.group_id)));
  const year = rows('academic_years').find(row => row.id === yearId);
  return {
    revision: snapshot.revision, teachers,
    staff: hasGlobalStaffManagement(context) ? staff.filter(member => !teachers.some(teacher => teacher.staffId === member.id)) : [],
    assignments: (scoped.tables.teaching_assignments || []).filter(assignment =>
      offerings.some(offering => offering.id === assignment.offering_id && assignmentIsGranted(context, offering, assignment.group_id)))
      .map(row => ({ id: row.id, teacherId: String(row.teacher_id), groupId: String(row.group_id), offeringId: String(row.offering_id),
        componentId: String(row.component_id), validFrom: String(row.valid_from), validUntil: row.valid_until ? String(row.valid_until) : null, reason: String(row.reason || '') })),
    offerings: offerings.map(row => ({ id: row.id, label: annualOfferingLabel(row, snapshot), curriculumId: String(row.curriculum_id) })),
    groups: groups.filter(group => links.some(link => link.group_id === group.id)).map(group => ({ id: group.id, label: String(group.name), offeringIds: links.filter(link => link.group_id === group.id).map(link => String(link.offering_id)) })),
    components: components.map(component => ({ id: component.id, curriculumId: String(component.curriculum_id), label: `${String(component.code)} · ${String(scoped.tables.subjects?.find(subject => subject.id === component.subject_id)?.name || 'Matière')}` })),
    canManageProfiles: hasGlobalStaffManagement(context),
    canManageAssignments: context.permissions.includes('academic.assignment.manage') && !!yearId && !!year && !year.archived_at && year.status !== 'CLOTUREE',
    selectedYearId: yearId,
  };
}

export function teacherHasUpcomingSessions(snapshot: RelationalSnapshot, teacherId: string, now = Date.now()) {
  return (snapshot.tables.sessions || []).some(session => (session.replacement_teacher_id || session.teacher_id) === teacherId
    && ['PLANIFIE', 'EN_COURS'].includes(String(session.status)) && Date.parse(String(session.ends_at)) > now);
}

export function assignmentHasSessionsAfter(snapshot: RelationalSnapshot, assignmentId: string, endOn: string) {
  return (snapshot.tables.sessions || []).some(session => session.assignment_id === assignmentId
    && !['ANNULE', 'REPORTE'].includes(String(session.status)) && new Date(String(session.ends_at)).toISOString().slice(0, 10) > endOn);
}
