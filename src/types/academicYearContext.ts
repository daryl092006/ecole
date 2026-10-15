export type AcademicYearSelection = 'current' | 'all' | string;
export type YearStatus = 'BROUILLON' | 'OUVERTE' | 'EN_CLOTURE' | 'CLOTUREE';
export interface AcademicYearOption { id: string; name: string; status: YearStatus; starts_on: string; ends_on: string; }
export interface AcademicYearContext {
  currentYearId: string | null;
  currentYearConfigured?: boolean;
  selectedYearId: string | null;
  selection: string;
  years: AcademicYearOption[];
}
export const YEAR_STATUS_LABELS: Record<YearStatus, string> = { BROUILLON: 'Brouillon', OUVERTE: 'Ouverte', EN_CLOTURE: 'En clôture', CLOTUREE: 'Clôturée' };
