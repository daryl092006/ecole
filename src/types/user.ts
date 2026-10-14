import type { RoleName } from '@/types/permissions';
export interface DemoUser { id: string; name: string; email: string; role: RoleName | null; roles?: RoleName[]; kind?: 'student' | 'staff' | 'unclassified'; active: boolean; history: { date: string; actor: string; role?: RoleName; oldValue: string | null; newValue: string; reason: string }[]; }
