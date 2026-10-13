import type { RoleName } from '@/types/permissions';
export interface DemoUser { id: string; name: string; email: string; role: RoleName; active: boolean; history: { date: string; actor: string; oldValue: string | null; newValue: string; reason: string }[]; }
