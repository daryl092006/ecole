import type { StudentBourse, StudentFinancials } from '@/types/finance';

export interface StudentHistoryEntry {
  date: string;
  text: string;
}

export interface Student {
  historical?: { sourceId: string; batchId: string; groupName: string; groupSourceId: string; issues: string[] };
  matricule: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  nationality: string;
  address: string;
  city: string;
  country: string;
  filiere: string;
  niveau: string;
  groupe: string;
  groupId: string;
  academicYearId: string;
  status: string;
  bourse: StudentBourse;
  financials: StudentFinancials;
  history: StudentHistoryEntry[];
}
