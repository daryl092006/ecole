import assert from 'node:assert/strict';
import { readTranscriptDocument, transcriptDocumentMarkup, type TranscriptDocumentContent } from './transcriptDocumentService';

const content: TranscriptDocumentContent = {
  institution: { name: 'ESCEN' }, student: { name: 'Alice <Test>', matricule: 'ETU-1' },
  academicYear: '2025-2026', level: 'Master', program: 'Finance digitale',
  semesters: [{ name: 'Semestre 1', rows: [{ code: 'ECN2101', name: '<Finance>', credits: 3, average: null, validated: null }], totalCredits: 3, earnedCredits: 0 }],
  totalCredits: 3, earnedCredits: 0, average: null, mention: null, city: 'Lomé',
};
const row = { id: 'DOC', kind: 'RELEVE', decision_id: 'D', reference: 'REL-1', issued_at: '2026-09-09', content_snapshot: content };
const document = readTranscriptDocument(row);
const markup = transcriptDocumentMarkup(document);
assert.ok(markup.includes('UNITÉ D’ENSEIGNEMENT (UE)'));
assert.ok(markup.includes('MINISTÈRE DE L’ÉDUCATION NATIONALE'));
assert.ok(markup.includes('MINISTÈRE DÉLÉGUÉ CHARGÉ DE L’ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE'));
assert.ok(!markup.includes('MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR<br>'));
assert.ok(markup.includes('src="/logo-escen-releve.png"'));
assert.ok(markup.includes('class="transcript-title-band"'));
assert.ok(markup.includes('class="transcript-program"'));
assert.ok(markup.includes('class="transcript-identity"'));
assert.ok(markup.includes('www.escen.university'));
assert.ok(markup.includes('Alice &lt;Test&gt;'));
assert.ok(markup.includes('&lt;Finance&gt;'));
assert.ok(markup.includes('<td>—</td><td>—</td>'));
assert.ok(!markup.includes('AGBODJAN')); // Never copy the model's signatory into another document.
assert.equal(document.average, null);
assert.throws(() => readTranscriptDocument({ ...row, decision_id: null }), /jury/);
assert.throws(() => readTranscriptDocument({ ...row, content_snapshot: { average: 14 } }), /détails figés/);
assert.throws(() => readTranscriptDocument({ ...row, content_snapshot: { ...content, semesters: [...content.semesters, ...content.semesters] } }), /double/);
