import type { WebsiteIntake, WebsiteLevelDocumentRule, WebsiteManagement } from '@/types/website';

export interface WebsiteLevelGroup {
  key: string; yearId: string; yearName: string; levelId: string; levelName: string;
  intakes: WebsiteIntake[]; rule?: WebsiteLevelDocumentRule;
  documents: string[]; conflicting: boolean;
}
export function websiteLevelGroups(data: WebsiteManagement): WebsiteLevelGroup[] {
  const groups = new Map<string, WebsiteLevelGroup>();
  for (const item of data.intakes) {
    const yearId = item.academic_year_id || '';
    const key = `${yearId}:${item.level_id}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, yearId, yearName: data.years?.find(year => year.id === yearId)?.name || 'Année non renseignée', levelId: item.level_id, levelName: item.level_name || data.levels.find(level => level.id === item.level_id)?.name || 'Niveau non renseigné', intakes: [], documents: [], conflicting: false, rule: data.level_document_rules?.find(rule => rule.academic_year_id === yearId && rule.level_id === item.level_id) };
      groups.set(key, group);
    }
    group.intakes.push(item);
  }
  for (const group of groups.values()) {
    const variants = new Set(group.intakes.map(item => JSON.stringify([...item.required_documents].sort())));
    group.conflicting = !group.rule && variants.size > 1;
    group.documents = [...(group.rule?.required_documents || (group.conflicting ? [] : group.intakes[0].required_documents))];
  }
  return [...groups.values()].sort((a, b) => a.yearName.localeCompare(b.yearName, 'fr', { numeric: true }) || a.levelName.localeCompare(b.levelName, 'fr', { numeric: true }));
}
