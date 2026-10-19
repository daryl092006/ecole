import { ROLES, type RoleName } from '../../src/types/permissions';

// Test-only inputs for the historical prototype scenarios. These are not
// Supabase accounts and do not enable authentication in the application.
export const DEMO_PASSWORD = 'EscenDemo2026!';
export const DEMO_ACCOUNTS: ReadonlyArray<{ email: string; role: RoleName }> = [
  { email: 'direction@escen.demo', role: ROLES.DG },
  { email: 'adjoint@escen.demo', role: ROLES.DGA },
  { email: 'academique@escen.demo', role: ROLES.DA },
  { email: 'logistique@escen.demo', role: ROLES.LOG },
  { email: 'enseignant@escen.demo', role: ROLES.ENS },
  { email: 'surveillant@escen.demo', role: ROLES.SURV },
  { email: 'finance@escen.demo', role: ROLES.RAF },
  { email: 'marketing@escen.demo', role: ROLES.MKT },
  { email: 'achats@escen.demo', role: ROLES.ACHATS },
  { email: 'site@escen.demo', role: ROLES.SITE },
  { email: 'informatique@escen.demo', role: ROLES.IT },
  { email: 'etudiant@escen.demo', role: ROLES.STUD },
  { email: 'delegue@escen.demo', role: ROLES.DEL },
  { email: 'stagiaire@escen.demo', role: ROLES.STG },
];
