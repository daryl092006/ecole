export interface FirstLoginProfile {
  firstname: string; lastname: string; email: string; phone: string;
}
export interface FirstLoginPage { profile: FirstLoginProfile; snapshot: string; }
export interface FirstLoginSupportContext { years: { id: string; name: string }[]; currentYearId: string | null; }
