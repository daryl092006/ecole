import { z } from 'zod';
import { escapeHtml as h } from '@/utils/printDocument';
import type { DatabaseRow } from '@/types/persistence';

const rowSchema = z.object({
  code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(300),
  credits: z.number().min(0).max(9999.99), average: z.number().min(0).max(20).nullable(),
  validated: z.boolean().nullable(),
});
export const transcriptDocumentSchema = z.object({
  institution: z.object({ name: z.string().min(1).max(160), approval: z.string().max(200).optional(), footer: z.string().max(500).optional() }),
  student: z.object({ name: z.string().min(1).max(300), matricule: z.string().min(1).max(160), birthDate: z.union([z.iso.date(), z.literal('')]).optional(), birthPlace: z.string().max(160).optional() }),
  academicYear: z.string().min(1).max(100), level: z.string().min(1).max(100), program: z.string().min(1).max(200),
  semesters: z.array(z.object({ name: z.string().min(1).max(100), rows: z.array(rowSchema).min(1).max(100), totalCredits: z.number().nonnegative(), earnedCredits: z.number().nonnegative() })).min(1).max(6),
  totalCredits: z.number().nonnegative(), earnedCredits: z.number().nonnegative(),
  average: z.number().min(0).max(20).nullable(), mention: z.string().max(100).nullable(),
  city: z.string().trim().min(1).max(100), director: z.string().max(200).optional(), signatoryTitle: z.string().trim().min(1).max(160).optional(),
});
export const issuedTranscriptSchema = transcriptDocumentSchema.extend({
  reference: z.string().trim().min(1).max(160),
  issuedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
});
export type TranscriptDocumentContent = z.infer<typeof transcriptDocumentSchema>;
export type TranscriptDocument = z.infer<typeof issuedTranscriptSchema>;

/** Reprint only the frozen content of an already issued document. Never reconstruct a jury decision. */
export function readTranscriptDocument(row: DatabaseRow): TranscriptDocument {
  if (row.kind !== 'RELEVE' || !row.decision_id || !row.reference || !row.issued_at) throw new Error('Ce document ne correspond pas à un relevé établi par le jury.');
  const parsed = transcriptDocumentSchema.safeParse(row.content_snapshot);
  if (!parsed.success) throw new Error('Ce relevé ne contient pas les détails figés nécessaires à son impression : identité, semestres, matières et résultats.');
  const content = parsed.data;
  const codes = content.semesters.flatMap(semester => semester.rows.map(item => item.code));
  if (new Set(codes).size !== codes.length) throw new Error('Le relevé contient des codes en double. Vérifiez le document enregistré.');
  const document = issuedTranscriptSchema.safeParse({ ...content, reference: row.reference, issuedAt: row.issued_at });
  if (!document.success) throw new Error('La référence ou la date d’émission enregistrée du relevé est invalide.');
  return document.data;
}

const number = (value: number | null) => value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('fr-FR', { timeZone: 'Africa/Lome', day: '2-digit', month: 'long', year: 'numeric' });
}
export function transcriptDocumentMarkup(document: TranscriptDocument): string {
  return `<article class="transcript-sheet"><div class="transcript-watermark" aria-hidden="true">E S C E N</div><div class="transcript-content">
    <div class="transcript-heading-layout"><header class="transcript-header"><div class="transcript-ministry"><strong>MINISTÈRE DE L’ÉDUCATION NATIONALE</strong><br>MINISTÈRE DÉLÉGUÉ CHARGÉ DE L’ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE</div><div class="transcript-republic"><strong>REPUBLIQUE TOGOLAISE</strong><br>Travail – Liberté – Patrie</div></header>
    <div class="transcript-brand"><img class="transcript-logo" src="/logo-escen-releve.png" alt="${h(document.institution.name)}">${document.institution.approval ? `<p>Agrément : ${h(document.institution.approval)}</p>` : ''}</div>
    <div class="transcript-title-band"><h1>RELEVE DE NOTES</h1><p>Année académique : <strong>${h(document.academicYear)}</strong></p></div>
    <div class="transcript-details"><div class="transcript-program"><div><u>Niveau</u> : ${h(document.level)}</div><div><u>Semestre</u> : ${h(document.semesters.map(item => item.name.replace(/^semestre\s*/i, '')).join(' & '))}</div><div><u>Filière</u> : ${h(document.program)}</div></div><div class="transcript-identity"><div><u>Titulaire</u> : ${h(document.student.name)}</div>${document.student.birthDate || document.student.birthPlace ? `<div>Né(e) ${document.student.birthDate ? `le ${h(date(document.student.birthDate))}` : ''}${document.student.birthPlace ? ` à ${h(document.student.birthPlace)}` : ''}</div>` : ''}<div><u>Matricule</u> : ${h(document.student.matricule)}</div></div></div>
    </div><table class="transcript-table"><colgroup><col class="transcript-code-column"><col><col class="transcript-number-column"><col class="transcript-number-column"><col class="transcript-number-column"></colgroup><thead><tr><th>CODES</th><th>UNITE D’ENSEIGNEMENT(UE)</th><th>CREDITS</th><th>NOTE/20</th><th>VALIDEE</th></tr></thead><tbody>${document.semesters.map(semester => `<tr class="transcript-semester"><th colspan="5">${h(semester.name.toLocaleUpperCase('fr-FR'))}</th></tr>${semester.rows.map(row => `<tr><td class="transcript-subject-code">${h(row.code)}</td><td>${h(row.name)}</td><td>${h(number(row.credits))}</td><td>${h(number(row.average))}</td><td>${row.validated === null ? '—' : row.validated ? 'Oui' : 'Non'}</td></tr>`).join('')}<tr class="transcript-total"><td class="transcript-total-spacer"></td><th>TOTAL CREDITS</th><td>${h(number(semester.totalCredits))}</td><th>TOTAL</th><td>${h(number(semester.earnedCredits))}</td></tr>`).join('')}</tbody></table>
    <footer class="transcript-bottom"><table class="transcript-summary"><tbody><tr><th>Total crédits :</th><td>${h(number(document.totalCredits))}</td></tr><tr><th>Total crédits validés :</th><td>${h(number(document.earnedCredits))}</td></tr><tr><th>Moyenne générale :</th><td>${h(number(document.average))}</td></tr><tr><th>Mention :</th><td>${h(document.mention ?? '—')}</td></tr></tbody></table><div class="transcript-signature"><div class="transcript-signature-heading"><p>${h(document.city)}, le ${h(date(document.issuedAt))}</p><strong>${h(document.signatoryTitle || 'Le Directeur Académique')}</strong></div><p class="transcript-director">${h(document.director || 'Signature et cachet')}</p></div></footer>
  </div><footer class="transcript-page-footer"><p class="transcript-reference">Référence : ${h(document.reference)}</p>${document.institution.footer ? `<p class="transcript-contact">${h(document.institution.footer)}</p>` : ''}</footer></article>`;
}
