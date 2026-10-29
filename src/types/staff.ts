export type StaffContractType = 'PERMANENT' | 'VACATAIRE' | 'STAGIAIRE';
export interface PersonnelRecord {
  personId: string; staffId: string | null; firstname: string; lastname: string;
  /** Matricule affiché ; vide pour le personnel administratif, qui n'en a pas. */
  email: string; phone: string; employeeNumber: string; isTeacher: boolean; active: boolean;
  address?: string; birthDate?: string; city?: string; country?: string; nationality?: string; gender?: string;
  roles?: string[];
  contracts: { id: string; position: string; type: string; startsOn: string; endsOn: string | null }[];
}
export interface PersonnelForm {
  personId?: string; firstname: string; lastname: string; email: string; phone: string; employeeNumber: string;
  isTeacher?: boolean; teacherSpecialty?: string;
  /** Fonction exercée (ex. comptable, secrétaire), enregistrée dans staff_contracts.position. */
  position?: string; contractType?: StaffContractType; startsOn?: string;
}
