export interface ScholarshipItem {
  id: string;
  code: string;
  name: string;
  kind: 'POURCENTAGE' | 'MONTANT_FIXE';
  percent: number | null;
  amount: number | null;
  active: boolean;
  awardCount?: number;
}

export interface FeeScheduleItem {
  doubleDegree?: boolean;
  id: string;
  academicYearId: string;
  category: 'SCOLARITE' | 'INSCRIPTION';
  programId: string | null;
  programName?: string;
  levelId: string | null;
  levelName?: string;
  deliveryMode: string | null;
  amount: number;
  reason?: string;
  archivedAt?: string | null;
}

export interface ScholarshipAwardItem {
  id: string;
  enrollmentId: string;
  studentMatricule: string;
  studentName: string;
  programName?: string;
  levelName?: string;
  scholarshipId: string;
  scholarshipCode: string;
  scholarshipName: string;
  scholarshipKind: 'POURCENTAGE' | 'MONTANT_FIXE';
  scholarshipValue: string;
  validFrom: string;
  validUntil?: string | null;
  reason: string;
}

export interface FinanceSettingsDirectory {
  revision: number;
  selectedYearId: string;
  selectedYearCode: string;
  scholarships: ScholarshipItem[];
  feeSchedules: FeeScheduleItem[];
  scholarshipAwards: ScholarshipAwardItem[];
  programs: { id: string; name: string; code: string; doubleDegreeEligible?: boolean }[];
  levels: { id: string; name: string; code: string }[];
  enrolledStudents: {
    enrollmentId: string;
    studentId: string;
    matricule: string;
    name: string;
    programName: string;
    levelName: string;
  }[];
}

export type FinanceSettingsAction =
  | {
      action: 'create_scholarship';
      revision: number;
      code: string;
      name: string;
      kind: 'POURCENTAGE' | 'MONTANT_FIXE';
      percent?: number;
      amount?: number;
      reason: string;
    }
  | {
      action: 'update_scholarship';
      revision: number;
      id: string;
      code: string;
      name: string;
      kind: 'POURCENTAGE' | 'MONTANT_FIXE';
      percent?: number;
      amount?: number;
      active: boolean;
      reason: string;
    }
  | {
      action: 'toggle_scholarship';
      revision: number;
      id: string;
      active: boolean;
      reason: string;
    }
  | {
      action: 'create_fee_schedule';
      doubleDegree?: boolean;
      revision: number;
      academicYearId: string;
      category: 'SCOLARITE' | 'INSCRIPTION';
      programId?: string | null;
      levelId?: string | null;
      deliveryMode?: string | null;
      amount: number;
      reason: string;
    }
  | {
      action: 'archive_fee_schedule';
      revision: number;
      id: string;
      reason: string;
    }
  | {
      action: 'award_scholarship';
      revision: number;
      enrollmentId: string;
      scholarshipId: string;
      validFrom: string;
      reason: string;
    };

