import type { Announcement, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';

export function createAnnouncement(title: string, content: string, audience: string, role: RoleName, announcements: Announcement[]): Announcement {
  if (!hasPermission(role, 'communication.manage')) throw new Error('Publication non autorisée.');
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  if (!normalizedTitle || !normalizedContent) throw new Error('Titre et contenu obligatoires.');
  if (normalizedTitle.length > 160) throw new Error('Le titre est limité à 160 caractères.');
  if (normalizedContent.length > 5000) throw new Error('Le message est limité à 5 000 caractères.');
  if (!['Tous', 'Étudiants', 'Enseignants', ...Object.values(ROLES)].includes(audience)) throw new Error('Audience inconnue.');
  let sequence = announcements.length + 1;
  while (announcements.some(item => item.id === 'AN-' + String(sequence).padStart(3, '0'))) sequence++;
  return {
    id: 'AN-' + String(sequence).padStart(3, '0'),
    title: normalizedTitle, content: normalizedContent, audience,
    author: role, date: new Date().toISOString().slice(0, 10),
  };
}
