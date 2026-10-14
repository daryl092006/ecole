import type { RoleName } from '@/types/permissions';
export interface DemoSession { name: string; email: string; role: RoleName; }
export function authenticateDemoSession(email: string, password: string): DemoSession {
  void email;
  void password;
  throw new Error('La connexion est désactivée : aucun compte utilisateur n’est encore activé.');
}
