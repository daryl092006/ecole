import { ROLES, type RoleName } from '@/types/permissions';
export interface DemoSession { name: string; email: string; role: RoleName; }
export const DEMO_PASSWORD = 'EscenDemo2026!';
export const DEMO_ACCOUNTS: DemoSession[] = [
  { name: 'Direction générale', email: 'direction@escen.demo', role: ROLES.DG },
  { name: 'Direction adjointe', email: 'direction-adjointe@escen.demo', role: ROLES.DGA },
  { name: 'Direction académique', email: 'academique@escen.demo', role: ROLES.DA },
  { name: 'Logistique académique', email: 'scolarite@escen.demo', role: ROLES.LOG },
  { name: 'Enseignant', email: 'enseignant@escen.demo', role: ROLES.ENS },
  { name: 'Surveillant', email: 'surveillant@escen.demo', role: ROLES.SURV },
  { name: 'Service financier', email: 'finance@escen.demo', role: ROLES.RAF },
  { name: 'Communication', email: 'communication@escen.demo', role: ROLES.MKT },
  { name: 'Achats et logistique', email: 'achats@escen.demo', role: ROLES.ACHATS },
  { name: 'Responsable de site', email: 'site@escen.demo', role: ROLES.SITE },
  { name: 'Service informatique', email: 'informatique@escen.demo', role: ROLES.IT },
  { name: 'Étudiant', email: 'etudiant@escen.demo', role: ROLES.STUD },
  { name: 'Délégué', email: 'delegue@escen.demo', role: ROLES.DEL },
  { name: 'Stagiaire', email: 'stagiaire@escen.demo', role: ROLES.STG },
];
export function authenticateDemoSession(email: string, password: string): DemoSession {
  const account = DEMO_ACCOUNTS.find(item => item.email === email.trim().toLowerCase());
  if (!account || password !== DEMO_PASSWORD) throw new Error('Adresse email ou mot de passe incorrect. Utilisez un accès de démonstration pour cette version.');
  return { ...account };
}
