import assert from 'node:assert/strict';
import {
  mapDocumentKeyToTypeCode,
  STANDARD_DOCUMENT_TYPES,
  transferApplicationDocumentsToStudent,
  syncStudentApplicationDocuments,
} from './studentProvisioningService';
import type { SupabaseClient } from '@supabase/supabase-js';

// 1. Test du mapping des clés de pièces de candidature vers les codes de types officiels
assert.equal(mapDocumentKeyToTypeCode('photo_identite_file'), 'photo_identite_file');
assert.equal(mapDocumentKeyToTypeCode('photo'), 'photo_identite_file');
assert.equal(mapDocumentKeyToTypeCode('naissance_file'), 'naissance_file');
assert.equal(mapDocumentKeyToTypeCode('acte_de_naissance'), 'naissance_file');
assert.equal(mapDocumentKeyToTypeCode('nationalite_file'), 'nationalite_file');
assert.equal(mapDocumentKeyToTypeCode('cni'), 'nationalite_file');
assert.equal(mapDocumentKeyToTypeCode('passeport'), 'nationalite_file');
assert.equal(mapDocumentKeyToTypeCode('carte_nationale_d_identite_ou_passeport'), 'nationalite_file');
assert.equal(mapDocumentKeyToTypeCode('diplome_file'), 'diplome_file');
assert.equal(mapDocumentKeyToTypeCode('attestation_du_bac'), 'diplome_file');
assert.equal(mapDocumentKeyToTypeCode('releve_bac1'), 'releve_notes');
assert.equal(mapDocumentKeyToTypeCode('releve_notes'), 'releve_notes');
assert.equal(mapDocumentKeyToTypeCode('releve_de_notes_du_bac'), 'releve_notes');
assert.equal(mapDocumentKeyToTypeCode('certificat_medical_file'), 'certificat_medical_file');
assert.equal(mapDocumentKeyToTypeCode('certificat_medical'), 'certificat_medical_file');
assert.equal(mapDocumentKeyToTypeCode('cv_file'), 'cv_file');
assert.equal(mapDocumentKeyToTypeCode('cv'), 'cv_file');
assert.equal(mapDocumentKeyToTypeCode('autre_justificatif'), 'autre_document');

// 2. Vérification des types standard configurés
assert.ok(STANDARD_DOCUMENT_TYPES.length >= 7);
const codes = STANDARD_DOCUMENT_TYPES.map(t => t.code);
assert.ok(codes.includes('photo_identite_file'));
assert.ok(codes.includes('naissance_file'));
assert.ok(codes.includes('nationalite_file'));
assert.ok(codes.includes('diplome_file'));
assert.ok(codes.includes('releve_notes'));
for (const t of STANDARD_DOCUMENT_TYPES) {
  assert.ok(t.accepted_mime_types.length > 0);
  assert.ok(t.max_byte_size > 0);
  assert.ok(t.name.length > 0);
}

// 3. Test du transfert de pièces avec simulation in-memory du client Supabase
interface MockDb {
  application_documents: Array<Record<string, unknown>>;
  document_types: Array<Record<string, unknown>>;
  file_objects: Array<Record<string, unknown>>;
  student_documents: Array<Record<string, unknown>>;
  enrollments: Array<Record<string, unknown>>;
  online_applications: Array<Record<string, unknown>>;
}

function createMockSupabaseClient(db: MockDb): SupabaseClient {
  return {
    from: (table: keyof MockDb) => {
      let filterCol: string | null = null;
      let filterVal: unknown = null;
      let isNullCol: string | null = null;
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          filterCol = col;
          filterVal = val;
          return chain;
        },
        is: (col: string, val: unknown) => {
          if (val === null) isNullCol = col;
          return chain;
        },
        maybeSingle: async () => {
          let rows = (db[table] || []) as Array<Record<string, unknown>>;
          if (filterCol) rows = rows.filter(r => r[filterCol!] === filterVal);
          if (isNullCol) rows = rows.filter(r => r[isNullCol!] === null);
          return { data: rows[0] || null, error: null };
        },
        insert: async (records: Record<string, unknown> | Array<Record<string, unknown>>) => {
          const list = Array.isArray(records) ? records : [records];
          for (const item of list) {
            (db[table] as Array<Record<string, unknown>>).push({ ...item });
          }
          return { error: null };
        },
        then: (resolve: (res: { data: unknown; error: null }) => void) => {
          let rows = (db[table] || []) as Array<Record<string, unknown>>;
          if (filterCol) rows = rows.filter(r => r[filterCol!] === filterVal);
          if (isNullCol) rows = rows.filter(r => r[isNullCol!] === null);
          resolve({ data: rows, error: null });
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

async function runAsyncTests() {
  const mockDb: MockDb = {
    application_documents: [
      {
        id: 'doc-1',
        application_id: 'app-100',
        document_key: 'photo_identite_file',
        filename: 'photo_identite.jpg',
        mime_type: 'image/jpeg',
        byte_size: 150000,
        bucket: 'escen-online-applications',
        object_path: 'candidatures/app-100/photo.jpg',
        sha256: 'hash-photo',
      },
      {
        id: 'doc-2',
        application_id: 'app-100',
        document_key: 'naissance_file',
        filename: 'acte_naissance.pdf',
        mime_type: 'application/pdf',
        byte_size: 450000,
        bucket: 'escen-online-applications',
        object_path: 'candidatures/app-100/naissance.pdf',
        sha256: 'hash-naissance',
      },
      {
        id: 'doc-3',
        application_id: 'app-100',
        document_key: 'diplome_file',
        filename: 'baccalaureat.pdf',
        mime_type: 'application/pdf',
        byte_size: 890000,
        bucket: 'escen-online-applications',
        object_path: 'candidatures/app-100/bac.pdf',
        sha256: 'hash-bac',
      },
    ],
    document_types: [],
    file_objects: [],
    student_documents: [],
    enrollments: [{ id: 'enr-1', student_id: 'stud-1', archived_at: null }],
    online_applications: [{ id: 'app-100', student_id: 'stud-1', academic_year_id: 'year-2026' }],
  };

  const client = createMockSupabaseClient(mockDb);

  // 1er transfert : 3 pièces transférées
  const res1 = await transferApplicationDocumentsToStudent(client, {
    applicationId: 'app-100',
    studentId: 'stud-1',
    enrollmentId: 'enr-1',
    academicYearId: 'year-2026',
    actorId: 'actor-log',
  });

  assert.equal(res1.transferredCount, 3);
  assert.equal(res1.errors.length, 0);

  // Vérifier file_objects
  assert.equal(mockDb.file_objects.length, 3);
  const photoFile = mockDb.file_objects.find(f => f.original_name === 'photo_identite.jpg');
  assert.ok(photoFile);
  assert.equal(photoFile.bucket, 'escen-online-applications');
  assert.equal(photoFile.sha256, 'hash-photo');
  assert.equal(photoFile.uploaded_by, 'actor-log');

  // Vérifier student_documents
  assert.equal(mockDb.student_documents.length, 3);
  for (const doc of mockDb.student_documents) {
    assert.equal(doc.student_id, 'stud-1');
    assert.equal(doc.enrollment_id, 'enr-1');
    assert.equal(doc.version, 1);
    assert.equal(doc.status, 'A_VERIFIER');
    assert.equal(doc.academic_year_id, 'year-2026');
    assert.ok(doc.file_id);
    assert.ok(doc.document_type_id);
  }

  // Idempotence : un second transfert ne duplique aucune pièce
  const res2 = await transferApplicationDocumentsToStudent(client, {
    applicationId: 'app-100',
    studentId: 'stud-1',
    enrollmentId: 'enr-1',
    academicYearId: 'year-2026',
    actorId: 'actor-log',
  });
  assert.equal(res2.transferredCount, 0);
  assert.equal(mockDb.file_objects.length, 3);
  assert.equal(mockDb.student_documents.length, 3);

  // Test de synchronisation globale pour l'étudiant
  const resSync = await syncStudentApplicationDocuments(client, {
    studentId: 'stud-1',
    actorId: 'actor-log',
    academicYearId: 'year-2026',
  });
  assert.equal(resSync.transferredCount, 0); // Déjà toutes transférées
  assert.equal(mockDb.student_documents.length, 3);

  console.log('Vérification réussie : transfert et rattachement des pièces de candidature dans le dossier étudiant.');
}

runAsyncTests().catch(err => {
  console.error(err);
  process.exit(1);
});
