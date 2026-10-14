export interface PersonnelRecord {
  personId: string; staffId: string | null; firstname: string; lastname: string;
  email: string; phone: string; employeeNumber: string; active: boolean;
  contracts: { id: string; position: string; type: string; startsOn: string; endsOn: string | null }[];
}
export interface PersonnelForm { personId?: string; firstname: string; lastname: string; email: string; phone: string; employeeNumber: string; }
