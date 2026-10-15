import type { Student } from '@/types/student';
import type { HistoryCatalog } from '@/types/history';
export function enrichHistoricalStudent(student: Student, catalog: HistoryCatalog): Student {
  const identity = catalog.references.etudiants?.find(row => row.values.matricule === student.matricule);
  if (!identity) return student;
  const enrollments = catalog.references.etudiant_group?.filter(row => row.batchId === identity.batchId && String(row.values.etudiant_id) === identity.sourceId) ?? [];
  const record = enrollments.length === 1 ? enrollments[0] : undefined;
  const find = (table: string, id: unknown) => catalog.references[table]?.find(row => row.batchId === identity.batchId && row.sourceId === String(id));
  const group = find('groups', record?.values.group_id);
  const program = find('filieres', record?.values.filiere_id);
  const level = find('niveaux', record?.values.niveau_id);
  const issues = [...identity.issues, ...enrollments.flatMap(row => row.issues)];
  return { ...student, filiere: !student.academicYearId && program ? String(program.values.nom) : student.filiere, niveau: !student.academicYearId && level ? String(level.values.libelle) : student.niveau,
    groupe: !student.academicYearId && group ? String(group.values.nom) : student.groupe,
    status: student.academicYearId ? student.status : record && !issues.length ? String(record.values.statut_scolaire || student.status) : issues.length ? 'Dossier à vérifier' : student.status,
    historical: { sourceId: identity.sourceId, batchId: identity.batchId, groupName: group ? String(group.values.nom) : '', groupSourceId: group?.sourceId || '', issues } };
}
