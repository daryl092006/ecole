import { z } from 'zod';
import { requireAccount, requirePermission, RequestError, errorResponse } from '@/server/auth';
import { resolveAcademicYear } from '@/server/academicYearContext';
import { computeLibraryAllocations, YOUSCRIBE_TEAMS, type EnrolledStudentCandidate } from '@/services/digitalLibraryService';
import { ROLES } from '@/types/permissions';
import type { RelationalSnapshot } from '@/types/persistence';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAccount(request);
    if (!auth.context.permissions.includes('academic.view') && !auth.context.permissions.includes('schedule.view')) {
      requirePermission(auth.context, 'academic.view');
    }

    const result = await auth.client.rpc('escen_backend_snapshot');
    if (result.error || !result.data) {
      throw new RequestError(503, 'La bibliothèque numérique est temporairement indisponible.');
    }

    const snapshot = result.data as RelationalSnapshot;
    const year = await resolveAcademicYear(request, auth.client, auth.context, snapshot);
    const targetYearId = year.selectedYearId || year.currentYearId || 'cbd8ee33-b322-43b2-9876-99636e5891d8';

    const tables = snapshot.tables || {};
    const students = tables.students || [];
    const people = tables.people || [];
    const enrollments = tables.enrollments || [];
    const offerings = tables.academic_offerings || [];
    const enrollmentGroups = tables.enrollment_groups || [];
    const groups = tables.groups || [];

    const peopleMap = new Map(people.map(p => [String(p.id), p]));
    const offeringsYearMap = new Map(offerings.map(o => [String(o.id), String(o.academic_year_id)]));
    const groupsMap = new Map(groups.map(g => [String(g.id), String(g.name || 'Classe')]));

    const enrolledCandidates: EnrolledStudentCandidate[] = [];
    const seenStudents = new Set<string>();

    for (const enr of enrollments) {
      if (enr.archived_at) continue;
      const status = String(enr.status || '');
      if (!['INSCRIT', 'REINSCRIT'].includes(status)) continue;
      const offYearId = offeringsYearMap.get(String(enr.offering_id));
      if (targetYearId && offYearId && offYearId !== targetYearId) continue;

      const studentId = String(enr.student_id || '');
      if (!studentId || seenStudents.has(studentId)) continue;
      const student = students.find(s => String(s.id) === studentId && !s.archived_at);
      if (!student) continue;

      const person = peopleMap.get(String(student.person_id));
      const eg = enrollmentGroups.find(
        item => String(item.enrollment_id) === String(enr.id) && !item.valid_until && item.historical_only !== true
      );
      const groupName = eg ? (groupsMap.get(String(eg.group_id)) || 'Inscrit') : 'Inscrit';

      seenStudents.add(studentId);
      enrolledCandidates.push({
        studentId,
        matricule: String(student.matricule || ''),
        firstname: String(person?.firstname || ''),
        lastname: String(person?.lastname || ''),
        groupName,
        enrollmentStatus: status,
      });
    }

    const allAllocations = computeLibraryAllocations(enrolledCandidates);
    const isStudent = auth.context.role === ROLES.STUD || auth.context.role === ROLES.DEL;

    if (isStudent) {
      const myAllocation = auth.context.studentId
        ? allAllocations.find(a => a.studentId === auth.context.studentId) || null
        : null;
      return Response.json(
        {
          selectedYearId: targetYearId,
          isStudent: true,
          myAllocation,
          allocations: [],
          teams: [],
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // Teacher without global student.view sees the first team credentials for their own consultation
    const canViewAllStudents = auth.context.permissions.includes('student.view') || [ROLES.IT, ROLES.DG, ROLES.DGA, ROLES.DA, ROLES.LOG].includes(auth.context.role as typeof ROLES.IT);

    return Response.json(
      {
        selectedYearId: targetYearId,
        isStudent: false,
        myAllocation: null,
        allocations: canViewAllStudents ? allAllocations : [],
        teams: YOUSCRIBE_TEAMS,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return errorResponse(error instanceof z.ZodError ? new RequestError(400, 'Requête invalide.') : error);
  }
}
