import { z } from 'zod';
import { escapeHtml as h } from '@/utils/printDocument';
import type { DatabaseRow } from '@/types/persistence';

const rowSchema = z.object({
  code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(300),
  credits: z.number().min(0).max(9999.99), average: z.number().min(0).max(20).nullable(),
  validated: z.boolean().nullable(),
});
export const transcriptDocumentSchema = z.object({
  institution: z.object({ name: z.string().min(1).max(160), approval: z.string().max(200).optional() }),
  student: z.object({ name: z.string().min(1).max(300), matricule: z.string().min(1).max(160), birthDate: z.string().max(100).optional(), birthPlace: z.string().max(160).optional() }),
  academicYear: z.string().min(1).max(100), level: z.string().min(1).max(100), program: z.string().min(1).max(200),
  semesters: z.array(z.object({ name: z.string().min(1).max(100), rows: z.array(rowSchema).min(1).max(100), totalCredits: z.number().nonnegative(), earnedCredits: z.number().nonnegative() })).min(1).max(6),
  totalCredits: z.number().nonnegative(), earnedCredits: z.number().nonnegative(),
  average: z.number().min(0).max(20).nullable(), mention: z.string().max(100).nullable(),
  city: z.string().min(1).max(100), director: z.string().max(200).optional(),
});
export type TranscriptDocumentContent = z.infer<typeof transcriptDocumentSchema>;
export type TranscriptDocument = TranscriptDocumentContent & { reference: string; issuedAt: string };

/** Reprint only the frozen content of an already issued document. Never reconstruct a jury decision. */
export function readTranscriptDocument(row: DatabaseRow): TranscriptDocument {
  if (row.kind !== 'RELEVE' || !row.decision_id || !row.reference || !row.issued_at) throw new Error('Ce document ne correspond pas à un relevé établi par le jury.');
  const parsed = transcriptDocumentSchema.safeParse(row.content_snapshot);
  if (!parsed.success) throw new Error('Ce relevé ne contient pas les détails figés nécessaires à son impression : identité, semestres, matières et résultats.');
  const content = parsed.data;
  const codes = content.semesters.flatMap(semester => semester.rows.map(item => item.code));
  if (new Set(codes).size !== codes.length) throw new Error('Le relevé contient des codes en double. Vérifiez le document enregistré.');
  return { ...content, reference: String(row.reference), issuedAt: String(row.issued_at) };
}

const number = (value: number | null) => value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('fr-FR', { timeZone: 'Africa/Lome', day: '2-digit', month: 'long', year: 'numeric' });
}
export function transcriptDocumentMarkup(document: TranscriptDocument): string {
  return `<article class="transcript-sheet"><div class="transcript-content">
    <header class="transcript-header"><div><strong>MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR<br>ET DE LA RECHERCHE</strong></div><div><strong>RÉPUBLIQUE TOGOLAISE</strong><br>Travail – Liberté – Patrie</div></header>
    <div class="transcript-brand"><img class="transcript-logo" src="/logo-escen.png" alt="${h(document.institution.name)}">${document.institution.approval ? `<p>Agrément : ${h(document.institution.approval)}</p>` : ''}</div>
    <h1>RELEVÉ DE NOTES</h1>
    <div class="transcript-details"><div>Année académique : <strong>${h(document.academicYear)}</strong><br>Niveau : <strong>${h(document.level)}</strong><br>Semestre : <strong>${h(document.semesters.map(item => item.name.replace(/^semestre\s*/i, '')).join(' & '))}</strong><br>Filière : <strong>${h(document.program)}</strong></div><div>Titulaire : <strong>${h(document.student.name)}</strong><br>${document.student.birthDate || document.student.birthPlace ? `Né(e) ${document.student.birthDate ? `le ${h(date(document.student.birthDate))}` : ''}${document.student.birthPlace ? ` à ${h(document.student.birthPlace)}` : ''}<br>` : ''}Matricule : <strong>${h(document.student.matricule)}</strong></div></div>
    <table class="transcript-table"><colgroup><col class="transcript-code-column"><col><col class="transcript-number-column"><col class="transcript-number-column"><col class="transcript-number-column"></colgroup><thead><tr><th>CODES</th><th>UNITÉ D’ENSEIGNEMENT (UE)</th><th>CRÉDITS</th><th>NOTE/20</th><th>VALIDÉE</th></tr></thead><tbody>${document.semesters.map(semester => `<tr class="transcript-semester"><th colspan="5">${h(semester.name.toLocaleUpperCase('fr-FR'))}</th></tr>${semester.rows.map(row => `<tr><td>${h(row.code)}</td><td>${h(row.name)}</td><td>${h(number(row.credits))}</td><td>${h(number(row.average))}</td><td>${row.validated === null ? '—' : row.validated ? 'Oui' : 'Non'}</td></tr>`).join('')}<tr class="transcript-total"><th colspan="2">TOTAL CRÉDITS</th><td>${h(number(semester.totalCredits))}</td><th>TOTAL VALIDÉ</th><td>${h(number(semester.earnedCredits))}</td></tr>`).join('')}</tbody></table>
    <footer class="transcript-bottom"><table class="transcript-summary"><tbody><tr><th>Total crédits :</th><td>${h(number(document.totalCredits))}</td></tr><tr><th>Total crédits validés :</th><td>${h(number(document.earnedCredits))}</td></tr><tr><th>Moyenne générale :</th><td>${h(number(document.average))}</td></tr><tr><th>Mention :</th><td>${h(document.mention ?? '—')}</td></tr></tbody></table><div class="transcript-signature"><p>${h(document.city)}, le ${h(date(document.issuedAt))}<br><strong>Le Directeur Académique</strong></p><p class="transcript-director">${h(document.director || 'Signature et cachet')}</p></div></footer>
    <p class="transcript-reference">Référence : ${h(document.reference)}</p>
  </div></article>`;
}
