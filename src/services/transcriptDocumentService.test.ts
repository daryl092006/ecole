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
assert.ok(!markup.includes('www.escen.university'));
assert.ok(!markup.includes('Tokoin Wuiti'));
assert.ok(markup.includes('Alice &lt;Test&gt;'));
assert.ok(markup.includes('&lt;Finance&gt;'));
assert.ok(markup.includes('<td>—</td><td>—</td>'));
assert.ok(!markup.includes('AGBODJAN')); // Never copy the model's signatory into another document.
assert.equal(document.average, null);
assert.throws(() => readTranscriptDocument({ ...row, decision_id: null }), /jury/);
assert.throws(() => readTranscriptDocument({ ...row, content_snapshot: { average: 14 } }), /détails figés/);
assert.throws(() => readTranscriptDocument({ ...row, content_snapshot: { ...content, semesters: [...content.semesters, ...content.semesters] } }), /double/);


const dynamic = readTranscriptDocument({ ...row, reference: 'REL-2027-42', issued_at: '2027-11-03T23:30:00-04:00', content_snapshot: {
  ...content, student: { name: 'Akouvi Exemple', matricule: 'ETU-42', birthDate: '2001-05-17', birthPlace: 'Kara' },
  academicYear: '2027-2028', level: 'Licence 2', program: 'Commerce', city: 'Kara', director: 'Direction enregistrée', signatoryTitle: 'La Directrice Académique',
  institution: { name: 'ESCEN', approval: 'AGR-ENREGISTRE', footer: 'Coordonnées enregistrées dans le document' },
  semesters: [{ ...content.semesters[0], name: 'Semestre 3', rows: [{ ...content.semesters[0].rows[0], code: 'MKT1301', name: 'Marketing', average: 0, validated: false }] }],
} });
const dynamicMarkup = transcriptDocumentMarkup(dynamic);
for (const value of ['Akouvi Exemple', 'ETU-42', '17 mai 2001', 'Kara', '2027-2028', 'Licence 2', 'Commerce', 'SEMESTRE 3', 'MKT1301', 'Marketing', '<td>0</td><td>Non</td>', '04 novembre 2027', 'La Directrice Académique', 'Direction enregistrée', 'REL-2027-42', 'AGR-ENREGISTRE', 'Coordonnées enregistrées dans le document']) assert.ok(dynamicMarkup.includes(value), value);
assert.equal(dynamic.issuedAt, '2027-11-03T23:30:00-04:00');
assert.ok(!dynamicMarkup.includes('09 septembre 2026'));
assert.ok(!dynamicMarkup.includes('Alice'));
assert.throws(() => readTranscriptDocument({ ...row, issued_at: '2026-02-30' }), /date d’émission/);
assert.throws(() => readTranscriptDocument({ ...row, issued_at: 'date inconnue' }), /date d’émission/);
assert.throws(() => readTranscriptDocument({ ...row, content_snapshot: { ...content, student: { ...content.student, birthDate: '2000-02-30' } } }), /détails figés/);
