import { z } from 'zod';

export const websiteProspectSchema = z.object({
  request_id: z.uuid(),
  full_name: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  phone: z.string().trim().min(6).max(30).regex(/^\+?[0-9() .-]+$/)
    .refine(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 6 && digits.length <= 15; }, 'Téléphone invalide.'),
}).strict();

export const websiteProspectPageSchema = z.object({
  beforeCreatedAt: z.iso.datetime({ offset: true }).optional(),
  beforeId: z.uuid().optional(),
}).strict().refine(value => Boolean(value.beforeCreatedAt) === Boolean(value.beforeId), 'Pagination invalide.');
