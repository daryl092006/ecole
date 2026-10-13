import type { Group, RoleName, Student } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
export interface StudentInput { matricule: string; firstname: string; lastname: string; email: string; groupId: string; filiere: string; }
export function createRegisteredStudent(input: StudentInput, students: Student[], groups: Group[], role: RoleName): Student {
  if (!hasPermission(role, 'student.group.assign')) throw new Error('Rôle non autorisé à enregistrer un dossier académique.');
  const group = groups.find(item => item.id === input.groupId);
  if (!group || !group.filieres.includes(input.filiere)) throw new Error('Choisissez un groupe et une filière compatibles.');
  if (!input.matricule.trim() || !input.firstname.trim() || !input.lastname.trim()) throw new Error('Matricule, prénom et nom obligatoires.');
  if (students.some(item => item.matricule.toLowerCase() === input.matricule.trim().toLowerCase())) throw new Error('Ce matricule existe déjà.');
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Adresse email invalide.');
  return { ...input, matricule: input.matricule.trim(), firstname: input.firstname.trim(), lastname: input.lastname.trim(),
    phone: '', gender: '', birthDate: '', nationality: '', address: '', city: '', country: '',
    groupe: group.name, niveau: group.niveau, academicYearId: group.academicYearId, status: 'Inscrit',
    bourse: { active: false, type: '', percent: 0, amount: 0 },
    financials: { expected: 0, paid: 0, remaining: 0, installments: [] },
    history: [{ date: new Date().toISOString(), text: `Dossier créé par ${role} : ${group.name}, ${group.academicYear}` }],
  };
}
