export interface WebsiteArticle {
  academic_year_id?: string | null;
  id: string; title: string; slug: string; excerpt: string; content: string;
  image: string; status: 'BROUILLON' | 'PUBLIE' | 'RETIRE'; version: number;
  published_at: string | null; updated_at: string; reason: string;
}
export interface WebsiteIntake {
  id: string; academic_year_id?: string | null; level_id: string; program_id: string; label: string;
  active: boolean; required_documents: string[]; version: number;
  level_name?: string; program_name?: string;
}
export interface OnlineApplication {
  id: string; reference: string; identity: Record<string, string>;
  diploma: Record<string, string>; guardians: Record<string, string>[];
  academic_year_id?: string | null; intake_id: string | null; status: 'BROUILLON' | 'RECU' | 'EN_ANALYSE' | 'CLASSE';
  version: number; submitted_at: string | null; created_at: string; reason: string;
  documents: ApplicationDocument[]; intake_label?: string;
}
export interface ApplicationDocument {
  id: string; document_key: string; filename: string; mime_type: string; byte_size: number;
}
export interface WebsiteManagement {
  articles: WebsiteArticle[]; applications: OnlineApplication[]; intakes: WebsiteIntake[];
  years?: { id: string; name: string; status: string }[]; currentYearId?: string | null;
  levels: { id: string; name: string }[]; programs: { id: string; name: string }[];
}
export interface WebsiteBrochure {
  id: string; academic_year_id: string; title: string; slug: string; description: string;
  status: 'BROUILLON' | 'PUBLIE' | 'RETIRE'; filename: string; byte_size: number;
  version: number; updated_at: string;
  program_id: string | null; cycle: BrochureCycle | null; program_name?: string | null; program_code?: string | null;
}
export type BrochureCycle = 'LICENCE' | 'MASTER' | 'EXECUTIVE';
