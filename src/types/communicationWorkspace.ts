import type { DatabaseRow } from './persistence';
export interface CommunicationDirectory {
  revision: number; yearId: string | null; canManage: boolean;
  announcements: DatabaseRow[];
  audiences: DatabaseRow[];
  roles: DatabaseRow[];
  groups: DatabaseRow[];
}
