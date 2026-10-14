import type { Announcement, RoleName } from '@/types';
import { hasPermission } from '@/permissions/rolePermissions';
import { ROLES } from '@/types/permissions';
import { isValidDate } from '@/utils/date';

export function createAnnouncement(title: string, content: string, audience: string, role: RoleName, announcements: Announcement[], expiresOn = '', actor: string = role): Announcement {
  if (!hasPermission(role, 'communication.manage')) throw new Error('Publication non autorisée.');
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  if (!normalizedTitle || !normalizedContent) throw new Error('Titre et contenu obligatoires.');
  if (normalizedTitle.length > 160) throw new Error('Le titre est limité à 160 caractères.');
  if (normalizedContent.length > 5000) throw new Error('Le message est limité à 5 000 caractères.');
  if (!['Tous', 'Étudiants', 'Enseignants', ...Object.values(ROLES)].includes(audience)) throw new Error('Audience inconnue.');
  const now = new Date().toISOString();
  if (expiresOn && (!isValidDate(expiresOn) || expiresOn < now.slice(0, 10))) throw new Error('Choisissez une date d’expiration valide, à partir d’aujourd’hui.');
  let sequence = announcements.length + 1;
  while (announcements.some(item => item.id === 'AN-' + String(sequence).padStart(3, '0'))) sequence++;
  return {
    id: 'AN-' + String(sequence).padStart(3, '0'),
    title: normalizedTitle, content: normalizedContent, audience,
    author: actor, date: now.slice(0, 10), expiresOn: expiresOn || undefined,
    history: [{ date: now, actor, role, action: 'PUBLICATION', oldValue: null, newValue: 'ACTIVE', reason: 'Diffusion de l’annonce' }],
  };
}

export function announcementStatus(announcement: Announcement, today = new Date().toISOString().slice(0, 10)): 'Active' | 'Expirée' | 'Retirée' {
  if (announcement.withdrawnAt) return 'Retirée';
  return announcement.expiresOn && announcement.expiresOn < today ? 'Expirée' : 'Active';
}

export function getVisibleAnnouncements(announcements: Announcement[], role: RoleName, today = new Date().toISOString().slice(0, 10)): Announcement[] {
  if (hasPermission(role, 'communication.manage')) return announcements;
  return announcements.filter(item => announcementStatus(item, today) === 'Active' && (
    item.audience === 'Tous' || item.audience === role
    || ([ROLES.STUD, ROLES.DEL].includes(role as typeof ROLES.STUD) && item.audience === 'Étudiants')
    || (role === ROLES.ENS && item.audience === 'Enseignants')
  ));
}

export function withdrawAnnouncement(announcement: Announcement, reason: string, role: RoleName, actor: string = role): Announcement {
  if (!hasPermission(role, 'communication.manage')) throw new Error('Retrait non autorisé.');
  if (announcement.withdrawnAt) throw new Error('Cette annonce a déjà été retirée.');
  const motif = reason.trim();
  if (motif.length < 3 || motif.length > 1000) throw new Error('Le motif doit contenir entre 3 et 1 000 caractères.');
  const now = new Date().toISOString();
  return { ...announcement, withdrawnAt: now, history: [...(announcement.history || []), { date: now, actor, role, action: 'RETRAIT', oldValue: 'ACTIVE', newValue: 'RETIREE', reason: motif }] };
}
