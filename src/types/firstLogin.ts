export interface FirstLoginProfile {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  address?: string;
  personalEmail?: string;
  birthDate?: string | null;
  programName?: string | null;
}
export interface FirstLoginPage { profile: FirstLoginProfile; snapshot: string; }
export interface FirstLoginSupportContext { years: { id: string; name: string }[]; currentYearId: string | null; }
