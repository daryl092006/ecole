import type { Permission, RoleName } from '@/types/permissions';

export type DatabaseRow = Record<string, unknown> & { id: string };
export interface RelationalSnapshot { revision: number; tables: Record<string, DatabaseRow[]>; }
export interface AccountGrant {
  role_code: string; role_name: string; site_id: string | null;
  academic_year_id: string | null; group_id: string | null;
}
export interface PersistentContext {
  accountId: string; personId: string; authUserId: string;
  roleCode: string; role: RoleName; permissions: Permission[];
  studentId: string | null; teacherId: string | null;
  grants: AccountGrant[];
}
export interface PersistentChange {
  table: string; operation: 'insert' | 'update'; record: Record<string, unknown>;
}

export interface CatalogSnapshot extends RelationalSnapshot { historyLinks?: {sourceRowId:string;targetId:string}[]; }
