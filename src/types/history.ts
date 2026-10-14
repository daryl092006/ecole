export type HistoryDomain = 'students' | 'academic' | 'finance' | 'staff' | 'communication' | 'system';
export interface HistoryTable { table: string; title: string; domain: HistoryDomain; fields: Record<string, string>; columns: string[]; }
export interface HistoryRecord { id: string; sourceId: string; batchId: string; status: string; values: Record<string, unknown>; issues: string[]; files?: Record<string, boolean>; }
export interface HistoryDataset { table: string; count: number; flagged: number; }
export interface HistoryCatalog { totalSourceRows: number; datasets: HistoryDataset[]; references: Record<string, HistoryRecord[]>; }
export interface HistoryPage { table: string; total: number; records: HistoryRecord[]; offset: number; limit: number; }
