import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { provisionM365Account } from './microsoftGraphService';

export const STUDENT_PORTAL_DEFAULT_PASSWORD = 'password';

export interface StudentProvisionParams {
  applicationId?: string | null;
  studentId: string;
  personId: string;
  firstname: string;
  lastname: string;
  personalEmail: string;
  intakeId?: string | null;
  levelId?: string | null;
  programId?: string | null;
  academicYearId: string;
  actorId: string;
}

interface SnapshotCachePayload {
  revision?: number;
  tables?: Record<string, Array<Record<string, unknown>>>;
}

async function fetchBackendSnapshot(client: SupabaseClient): Promise<SnapshotCachePayload | null> {
  if (typeof client.rpc !== 'function') return null;
  try {
    const res = await client.rpc('escen_backend_snapshot');
    if (!res?.error && res?.data && typeof res.data === 'object') {
      const payload = res.data as SnapshotCachePayload;
      if (payload.tables && typeof payload.tables === 'object') {
        return payload;
      }
    }
  } catch {
    // Ignorer dans les mocks de test
  }
  return null;
}

async function applyBackendChanges(
  client: SupabaseClient,
  actorId: string,
  changes: Array<{ table: string; operation: 'insert' | 'update'; record: Record<string, unknown> }>,
  initialRevision?: number
): Promise<boolean> {
  if (!changes.length || typeof client.rpc !== 'function') return false;
  let revision = initialRevision;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof revision !== 'number') {
      const snap = await fetchBackendSnapshot(client);
      revision = snap?.revision;
    }
    if (typeof revision !== 'number') return false;
    try {
      const res = await client.rpc('escen_backend_transaction', {
        p_actor_id: actorId,
        p_expected_revision: revision,
        p_changes: changes,
      });
      if (!res?.error) return true;
    } catch {
      return false;
    }
    revision = undefined;
  }
  return false;
}

export interface StudentProvisionResult {
  matricule: string;
  m365Email: string;
  temporaryPassword?: string;
  m365Status: 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED';
  accountCreated: boolean;
  enrolled: boolean;
  emailQueued: boolean;
  documentsTransferred?: number;
}

export interface StandardDocumentTypeDefinition {
  code: string;
  name: string;
  multiple: boolean;
  accepted_mime_types: string[];
  max_byte_size: number;
}

export const STANDARD_DOCUMENT_TYPES: readonly StandardDocumentTypeDefinition[] = [
  {
    code: 'photo_identite_file',
    name: 'Photo d’identité',
    multiple: false,
    accepted_mime_types: ['image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'naissance_file',
    name: 'Acte de naissance',
    multiple: false,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'nationalite_file',
    name: 'Pièce d’identité / Nationalité',
    multiple: false,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'diplome_file',
    name: 'Dernier diplôme / Attestation',
    multiple: false,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'releve_notes',
    name: 'Relevés de notes',
    multiple: true,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'certificat_medical_file',
    name: 'Certificat médical',
    multiple: false,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'cv_file',
    name: 'Curriculum vitæ',
    multiple: false,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
  {
    code: 'autre_document',
    name: 'Autre pièce justificative',
    multiple: true,
    accepted_mime_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_byte_size: 5242880,
  },
] as const;

/**
 * Associe une clé de document de candidature à un code de type officiel dans escen.document_types
 */
export function mapDocumentKeyToTypeCode(key: string): string {
  const normalized = key.toLowerCase().trim();
  if (normalized.includes('photo')) return 'photo_identite_file';
  if (normalized.includes('naissance')) return 'naissance_file';
  if (
    normalized.includes('nationalite') ||
    normalized.includes('cni') ||
    normalized.includes('identite') ||
    normalized.includes('passeport')
  ) {
    return 'nationalite_file';
  }
  if (
    normalized.includes('diplome') ||
    (normalized.includes('bac') && !normalized.includes('releve') && !normalized.includes('notes'))
  ) {
    return 'diplome_file';
  }
  if (
    normalized.includes('releve') ||
    normalized.includes('bulletin') ||
    normalized.includes('notes')
  ) {
    return 'releve_notes';
  }
  if (normalized.includes('medical') || normalized.includes('sante')) {
    return 'certificat_medical_file';
  }
  if (normalized.includes('cv') || normalized.includes('curriculum')) {
    return 'cv_file';
  }
  return 'autre_document';
}

/**
 * Garantit que les types de documents officiels sont initialisés dans escen.document_types
 */
export async function ensureStandardDocumentTypes(
  client: SupabaseClient
): Promise<Map<string, string>> {
  const typeMap = new Map<string, string>();

  const { data: existing } = await client
    .from('document_types')
    .select('id, code, name');

  if (existing && existing.length > 0) {
    for (const t of existing) {
      if (t.code && t.id) typeMap.set(String(t.code), String(t.id));
      if (t.name && t.id) typeMap.set(String(t.name).toLowerCase(), String(t.id));
    }
  }

  for (const def of STANDARD_DOCUMENT_TYPES) {
    if (!typeMap.has(def.code)) {
      const id = randomUUID();
      const { error } = await client.from('document_types').insert({
        id,
        code: def.code,
        name: def.name,
        multiple: def.multiple,
        accepted_mime_types: def.accepted_mime_types,
        max_byte_size: def.max_byte_size,
      });
      if (!error) {
        typeMap.set(def.code, id);
        typeMap.set(def.name.toLowerCase(), id);
      }
    }
  }

  return typeMap;
}

/**
 * Transfère les pièces justificatives d'une candidature en ligne vers le dossier officiel
 * de l'étudiant dans escen.file_objects et escen.student_documents (statut A_VERIFIER).
 */
export async function transferApplicationDocumentsToStudent(
  client: SupabaseClient,
  params: {
    applicationId: string;
    studentId: string;
    enrollmentId?: string | null;
    academicYearId?: string | null;
    actorId: string;
  }
): Promise<{ transferredCount: number; errors: string[] }> {
  const errors: string[] = [];
  let transferredCount = 0;

  const { data: appDocs, error: appDocsError } = await client
    .from('application_documents')
    .select('*')
    .eq('application_id', params.applicationId);

  if (appDocsError || !appDocs || appDocs.length === 0) {
    return { transferredCount: 0, errors: appDocsError ? [appDocsError.message] : [] };
  }

  const typeMap = await ensureStandardDocumentTypes(client);

  const { data: existingStudentDocs } = await client
    .from('student_documents')
    .select('file_id')
    .eq('student_id', params.studentId);

  const existingFileIds = new Set(
    (existingStudentDocs || []).map(d => String(d.file_id))
  );

  for (const doc of appDocs) {
    try {
      let fileId: string | null = null;
      const { data: existingFile } = await client
        .from('file_objects')
        .select('id')
        .eq('bucket', doc.bucket)
        .eq('object_path', doc.object_path)
        .maybeSingle();

      if (existingFile?.id) {
        fileId = String(existingFile.id);
      } else {
        fileId = randomUUID();
        const { error: insertFileError } = await client.from('file_objects').insert({
          id: fileId,
          bucket: doc.bucket,
          object_path: doc.object_path,
          original_name: doc.filename,
          mime_type: doc.mime_type,
          byte_size: doc.byte_size,
          sha256: doc.sha256 || null,
          uploaded_by: params.actorId,
        });
        if (insertFileError) {
          errors.push(`Erreur file_object pour ${doc.filename}: ${insertFileError.message}`);
          continue;
        }
      }

      if (existingFileIds.has(fileId)) {
        continue;
      }

      const typeCode = mapDocumentKeyToTypeCode(String(doc.document_key || ''));
      const typeId = typeMap.get(typeCode) || typeMap.get('autre_document');

      if (!typeId) {
        errors.push(`Type de document introuvable pour ${doc.document_key}`);
        continue;
      }

      const docId = randomUUID();
      const { error: insertDocError } = await client.from('student_documents').insert({
        id: docId,
        student_id: params.studentId,
        enrollment_id: params.enrollmentId || null,
        document_type_id: typeId,
        file_id: fileId,
        version: 1,
        status: 'A_VERIFIER',
        academic_year_id: params.academicYearId || null,
      });

      if (insertDocError) {
        errors.push(`Erreur student_document pour ${doc.filename}: ${insertDocError.message}`);
      } else {
        existingFileIds.add(fileId);
        transferredCount++;
      }
    } catch (err) {
      errors.push(`Exception sur pièce ${doc.filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { transferredCount, errors };
}

/**
 * Synchronise les pièces d'un étudiant depuis toutes ses candidatures en ligne enregistrées
 */
export async function syncStudentApplicationDocuments(
  client: SupabaseClient,
  params: {
    studentId: string;
    actorId: string;
    academicYearId?: string | null;
  }
): Promise<{ transferredCount: number; errors: string[] }> {
  // 1. Tenter la RPC PostgreSQL transactionnelle si disponible
  if (typeof client.rpc === 'function') {
    try {
      const rpcRes = await client.rpc('escen_sync_student_application_documents', {
        p_student_id: params.studentId,
        p_actor_id: params.actorId || null,
      });
      if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
        const payload = rpcRes.data as { transferredCount?: number };
        return {
          transferredCount: Number(payload.transferredCount || 0),
          errors: [],
        };
      }
    } catch {
      // Si la RPC échoue ou n'est pas configurée dans le mock, poursuivre vers le repli
    }
  }

  let enrollmentId: string | null = null;
  const { data: enrollments } = await client
    .from('enrollments')
    .select('id')
    .eq('student_id', params.studentId)
    .is('archived_at', null);

  if (enrollments && enrollments.length > 0) {
    enrollmentId = String(enrollments[0].id);
  }

  const { data: apps } = await client
    .from('online_applications')
    .select('id, academic_year_id')
    .eq('student_id', params.studentId);

  if (!apps || apps.length === 0) {
    return { transferredCount: 0, errors: [] };
  }

  let totalTransferred = 0;
  const allErrors: string[] = [];

  for (const app of apps) {
    const res = await transferApplicationDocumentsToStudent(client, {
      applicationId: String(app.id),
      studentId: params.studentId,
      enrollmentId,
      academicYearId: params.academicYearId || (app.academic_year_id ? String(app.academic_year_id) : null),
      actorId: params.actorId,
    });
    totalTransferred += res.transferredCount;
    allErrors.push(...res.errors);
  }

  return { transferredCount: totalTransferred, errors: allErrors };
}

/**
 * Calcule le prochain numéro de matricule automatique au format xxx-ESC-AAAA
 */
export async function generateNextStudentMatricule(
  client: SupabaseClient,
  academicYearId?: string
): Promise<string> {
  let yearCode = new Date().getFullYear().toString();
  let students: Array<{ matricule?: unknown }> | null = null;

  if (academicYearId) {
    const { data: y } = await client
      .from('academic_years')
      .select('code, name')
      .eq('id', academicYearId)
      .maybeSingle();
    if (y?.code) {
      const match = String(y.code).match(/(\d{4})/);
      if (match) yearCode = match[1];
    }
  }

  const { data: directStudents, error: directError } = await client
    .from('students')
    .select('matricule')
    .ilike('matricule', '%-ESC-%');

  if (!directError && Array.isArray(directStudents) && directStudents.length > 0) {
    students = directStudents;
  } else {
    const snap = await fetchBackendSnapshot(client);
    if (snap?.tables) {
      if (academicYearId && Array.isArray(snap.tables.academic_years)) {
        const y = snap.tables.academic_years.find(row => String(row.id) === academicYearId);
        if (y?.code) {
          const match = String(y.code).match(/(\d{4})/);
          if (match) yearCode = match[1];
        }
      }
      if (Array.isArray(snap.tables.students)) {
        students = snap.tables.students;
      }
    }
  }

  let maxNum = 145;
  if (students && students.length > 0) {
    for (const s of students) {
      const m = String(s.matricule || '').match(/^(\d+)-ESC-/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${String(nextNum).padStart(3, '0')}-ESC-${yearCode}`;
}

/**
 * Provisionne automatiquement tous les services d'un étudiant admis :
 * 1. Création compte Microsoft 365 + attribution de licence Office 365 A1
 * 2. Création compte Supabase Auth
 * 3. Création compte portail escen.accounts & rôle STUD dans role_grants
 * 4. Inscription pédagogique (enrollments & enrollment_groups)
 * 5. Email de bienvenue avec identifiants officiels dans la file d'envoi
 */
export async function provisionStudentComplete(
  client: SupabaseClient,
  params: StudentProvisionParams
): Promise<StudentProvisionResult> {
  // 1. Récupérer les informations de l'étudiant (via table directe ou snapshot)
  let snapshot: SnapshotCachePayload | null = null;
  let directFromWorks = false;
  const getSnapshot = async (): Promise<SnapshotCachePayload | null> => {
    if (directFromWorks) return null;
    if (!snapshot) snapshot = await fetchBackendSnapshot(client);
    return snapshot;
  };
  const pendingChanges: Array<{ table: string; operation: 'insert' | 'update'; record: Record<string, unknown> }> = [];

  let { data: student } = await client
    .from('students')
    .select('id, matricule, m365_email, m365_status')
    .eq('id', params.studentId)
    .single();

  if (student?.id) {
    directFromWorks = true;
  } else {
    const snap = await getSnapshot();
    const row = snap?.tables?.students?.find(s => String(s.id) === params.studentId);
    if (row) {
      student = {
        id: String(row.id),
        matricule: String(row.matricule || 'N/A'),
        m365_email: (row.m365_email as string | null) ?? null,
        m365_status: String(row.m365_status || 'PENDING'),
      };
    }
  }

  const matricule = student?.matricule || 'N/A';
  let m365Email = student?.m365_email as string | undefined;
  let temporaryPassword: string | undefined;
  let m365Status: 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED' = (student?.m365_status as 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED') || 'PENDING';

  // 2. Provisionnement Microsoft 365 si non existant
  if (!m365Email) {
    // Récupérer les emails existants pour éviter tout conflit d'homonyme
    let { data: existingList } = await client
      .from('students')
      .select('m365_email')
      .not('m365_email', 'is', null);

    if (!existingList || existingList.length === 0) {
      const snap = await getSnapshot();
      if (Array.isArray(snap?.tables?.students)) {
        existingList = snap.tables.students
          .filter(s => Boolean(s.m365_email))
          .map(s => ({ m365_email: String(s.m365_email) }));
      }
    }

    const existingEmails = new Set<string>(
      (existingList || []).map(r => String(r.m365_email).toLowerCase())
    );

    const m365Res = await provisionM365Account({
      firstname: params.firstname,
      lastname: params.lastname,
      existingEmails,
    });

    m365Email = m365Res.email;
    temporaryPassword = m365Res.temporaryPassword;
    m365Status = m365Res.status;

    const studentM365Update = {
      m365_email: m365Email,
      m365_user_id: m365Res.userId ?? null,
      m365_status: m365Status,
      m365_provisioned_at: new Date().toISOString(),
    };

    // Enregistrer l'email M365 dans escen.students
    const updateRes = await client
      .from('students')
      .update(studentM365Update)
      .eq('id', params.studentId);

    if (updateRes?.error || snapshot) {
      pendingChanges.push({
        table: 'students',
        operation: 'update',
        record: { id: params.studentId, ...studentM365Update },
      });
    }
  }

  // 3. Création du compte Supabase Auth & portail
  let accountCreated = false;
  let authUserId: string | null = null;
  let authAccountCreated = false;

  if (m365Email) {
    try {
      // Vérifier si le compte Auth existe déjà
      const { data: userList } = await client.auth.admin.listUsers();
      const existingUser = userList?.users?.find(
        u => u.email?.toLowerCase() === m365Email?.toLowerCase()
      );

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const createAuth = await client.auth.admin.createUser({
          email: m365Email,
          password: STUDENT_PORTAL_DEFAULT_PASSWORD,
          email_confirm: true,
          app_metadata: { must_change_password: true },
          user_metadata: {
            firstname: params.firstname,
            lastname: params.lastname,
            matricule,
          },
        });
        if (createAuth.data?.user) {
          authUserId = createAuth.data.user.id;
          authAccountCreated = true;
        }
      }
    } catch {
      // Ignorer si auth non disponible dans cet environnement
    }

    // 4. Lier escen.accounts et escen.role_grants
    if (authUserId) {
      let { data: existingAccount } = await client
        .from('accounts')
        .select('id')
        .eq('person_id', params.personId)
        .maybeSingle();

      if (!existingAccount) {
        const snap = await getSnapshot();
        const found = snap?.tables?.accounts?.find(a => String(a.person_id) === params.personId);
        if (found?.id) existingAccount = { id: String(found.id) };
      }

      let accountId = existingAccount?.id ? String(existingAccount.id) : undefined;
      if (!accountId) {
        accountId = randomUUID();
        const accountRecord = {
          id: accountId,
          person_id: params.personId,
          auth_user_id: authUserId,
          active: true,
          reason: `Création automatique du compte portail lors de l'admission`,
        };
        const insertAcc = await client.from('accounts').insert({
          id: accountId,
          person_id: params.personId,
          auth_user_id: authUserId,
          active: true,
        });
        if (insertAcc?.error || snapshot) {
          pendingChanges.push({ table: 'accounts', operation: 'insert', record: accountRecord });
        }
        accountCreated = true;
      }

      // Attribuer le rôle STUD
      let { data: roleStud } = await client
        .from('roles')
        .select('id')
        .eq('code', 'STUD')
        .single();

      if (!roleStud?.id) {
        const snap = await getSnapshot();
        const foundRole = snap?.tables?.roles?.find(r => String(r.code) === 'STUD');
        if (foundRole?.id) roleStud = { id: String(foundRole.id) };
      }

      if (roleStud?.id && accountId) {
        let { data: existingGrant } = await client
          .from('role_grants')
          .select('id')
          .eq('account_id', accountId)
          .eq('role_id', roleStud.id)
          .maybeSingle();

        if (!existingGrant) {
          const snap = await getSnapshot();
          const foundGrant = snap?.tables?.role_grants?.find(
            g => String(g.account_id) === accountId && String(g.role_id) === String(roleStud!.id)
          );
          if (foundGrant?.id) existingGrant = { id: String(foundGrant.id) };
        }

        if (!existingGrant) {
          const grantId = randomUUID();
          const grantRecord = {
            id: grantId,
            account_id: accountId,
            role_id: roleStud.id,
            valid_from: new Date().toISOString().slice(0, 10),
            reason: `Attribution automatique rôle Étudiant lors de l'admission`,
            granted_by: params.actorId,
          };
          const insertGrant = await client.from('role_grants').insert({
            account_id: accountId,
            role_id: roleStud.id,
            valid_from: new Date().toISOString(),
            reason: `Attribution automatique rôle Étudiant lors de l'admission`,
            granted_by: params.actorId,
          });
          if (insertGrant?.error || snapshot) {
            pendingChanges.push({ table: 'role_grants', operation: 'insert', record: grantRecord });
          }
        }
      }
    }
  }

  // 5. Inscription pédagogique & groupe si non déjà inscrit
  let enrolled = false;
  let enrollmentId: string | null = null;
  let levelId = params.levelId || null;
  let programId = params.programId || null;

  if (params.intakeId && !levelId) {
    const { data: intake } = await client
      .from('website_intakes')
      .select('level_id, program_id')
      .eq('id', params.intakeId)
      .maybeSingle();
    if (intake?.level_id) levelId = String(intake.level_id);
    if (intake?.program_id) programId = String(intake.program_id);
  }

  if (levelId) {
    let { data: offering } = await client
      .from('academic_offerings')
      .select('id')
      .eq('academic_year_id', params.academicYearId)
      .eq('level_id', levelId)
      .maybeSingle();

    if (!offering?.id) {
      const snap = await getSnapshot();
      const offerings = (snap?.tables?.academic_offerings || []).filter(
        o => String(o.academic_year_id) === params.academicYearId && String(o.level_id) === levelId && !o.archived_at
      );
      if (offerings.length === 1) {
        offering = { id: String(offerings[0].id) };
      } else if (offerings.length > 1 && programId && Array.isArray(snap?.tables?.curricula)) {
        const curriculumIds = new Set(
          snap.tables.curricula
            .filter(c => String(c.program_id) === programId && !c.archived_at)
            .map(c => String(c.id))
        );
        const matched = offerings.find(o => curriculumIds.has(String(o.curriculum_id)));
        offering = { id: String((matched || offerings[0]).id) };
      } else if (offerings.length > 0) {
        offering = { id: String(offerings[0].id) };
      }
    }

    if (offering?.id) {
      let { data: existingEnrollment } = await client
        .from('enrollments')
        .select('id')
        .eq('student_id', params.studentId)
        .eq('offering_id', offering.id)
        .maybeSingle();

      if (!existingEnrollment?.id) {
        const snap = await getSnapshot();
        const foundEnr = snap?.tables?.enrollments?.find(
          e => String(e.student_id) === params.studentId && String(e.offering_id) === String(offering!.id)
        );
        if (foundEnr?.id) existingEnrollment = { id: String(foundEnr.id) };
      }

      if (existingEnrollment?.id) {
        enrollmentId = String(existingEnrollment.id);
      } else {
        enrollmentId = randomUUID();
        const enrollmentRecord = {
          id: enrollmentId,
          student_id: params.studentId,
          offering_id: offering.id,
          status: 'INSCRIT',
          enrolled_on: new Date().toISOString().slice(0, 10),
          created_by: params.actorId,
        };
        const insertEnr = await client.from('enrollments').insert(enrollmentRecord);
        if (insertEnr?.error || snapshot) {
          pendingChanges.push({ table: 'enrollments', operation: 'insert', record: enrollmentRecord });
        }
        enrolled = true;
      }

      // Trouver le groupe associé
      let { data: groupLink } = await client
        .from('group_offerings')
        .select('group_id')
        .eq('offering_id', offering.id)
        .is('archived_at', null)
        .maybeSingle();

      if (!groupLink?.group_id) {
        const snap = await getSnapshot();
        const foundGroupLink = snap?.tables?.group_offerings?.find(
          g => String(g.offering_id) === String(offering!.id) && !g.archived_at
        );
        if (foundGroupLink?.group_id) groupLink = { group_id: String(foundGroupLink.group_id) };
      }

      if (groupLink?.group_id && enrollmentId) {
        let { data: existingGroup } = await client
          .from('enrollment_groups')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .is('valid_until', null)
          .maybeSingle();

        if (!existingGroup?.id) {
          const snap = await getSnapshot();
          const foundEg = snap?.tables?.enrollment_groups?.find(
            eg => String(eg.enrollment_id) === enrollmentId && !eg.valid_until
          );
          if (foundEg?.id) existingGroup = { id: String(foundEg.id) };
        }

        if (!existingGroup) {
          const egId = randomUUID();
          const egRecord = {
            id: egId,
            enrollment_id: enrollmentId,
            offering_id: offering.id,
            group_id: groupLink.group_id,
            valid_from: new Date().toISOString().slice(0, 10),
            changed_by: params.actorId,
            reason: `Affectation automatique lors de l'admission officielle`,
          };
          const insertEg = await client.from('enrollment_groups').insert({
            enrollment_id: enrollmentId,
            offering_id: offering.id,
            group_id: groupLink.group_id,
            valid_from: new Date().toISOString().slice(0, 10),
            changed_by: params.actorId,
            reason: `Affectation automatique lors de l'admission officielle`,
          });
          if (insertEg?.error || snapshot) {
            pendingChanges.push({ table: 'enrollment_groups', operation: 'insert', record: egRecord });
          }
        }
      }
    }
  }

  if (pendingChanges.length > 0) {
    const snap = snapshot as SnapshotCachePayload | null;
    await applyBackendChanges(client, params.actorId, pendingChanges, snap?.revision);
  }

  // 6. Transférer les pièces justificatives de la candidature en ligne vers le dossier étudiant
  let documentsTransferred = 0;
  if (params.applicationId) {
    const transferRes = await transferApplicationDocumentsToStudent(client, {
      applicationId: params.applicationId,
      studentId: params.studentId,
      enrollmentId,
      academicYearId: params.academicYearId,
      actorId: params.actorId,
    });
    documentsTransferred = transferRes.transferredCount;
    if (documentsTransferred === 0 && snapshot && typeof client.rpc === 'function') {
      try {
        const rpcRes = await client.rpc('escen_sync_student_application_documents', {
          p_student_id: params.studentId,
          p_actor_id: params.actorId || null,
        });
        if (!rpcRes?.error && rpcRes?.data && typeof rpcRes.data === 'object') {
          const payload = rpcRes.data as { transferredCount?: number };
          documentsTransferred = Number(payload.transferredCount || 0);
        }
      } catch {
        // Ignorer
      }
    }
  }

  // 7. Placer l'email de bienvenue avec les identifiants officiels dans la file d'envoi
  let emailQueued = false;
  if (params.personalEmail && m365Email && params.applicationId) {
    const subject = 'Bienvenue à l’ESCEN — Vos identifiants officiels d’accès';
    const pwdDisplay = temporaryPassword || 'Attribué lors de l’admission (contactez l’administration si besoin)';
    const portalPwdDisplay = authAccountCreated ? STUDENT_PORTAL_DEFAULT_PASSWORD : 'Votre mot de passe actuel (contactez l’administration si besoin)';
    const textBody = `Bonjour ${params.firstname} ${params.lastname},

Félicitations ! Votre admission à l’ESCEN est désormais officielle.

Vos accès informatiques officiels et votre compte étudiant ont été activés :
• Matricule étudiant officiel : ${matricule}
• Email institutionnel Microsoft 365 : ${m365Email}
• Mot de passe initial Microsoft 365 : ${pwdDisplay}
• Mot de passe du Portail Étudiant : ${portalPwdDisplay}

Comment accéder à vos services :
1. Votre Portail Étudiant ESCEN : https://portail.escen.university/
   (Identifiant : votre adresse ${m365Email})
2. Vos outils Microsoft 365 (Word, Excel, Teams, OneDrive) : https://office.com

Lors de votre première connexion, il vous sera demandé de configurer votre mot de passe personnel définitif.

La Direction et toute l’équipe de l’ESCEN vous souhaitent une excellente rentrée académique !`;

    const htmlBody = `<!doctype html><html><body style="font-family: sans-serif; color: #182333; line-height: 1.6;">
<h2 style="color: #0f4c81;">Bienvenue à l’ESCEN !</h2>
<p>Bonjour <strong>${params.firstname} ${params.lastname}</strong>,</p>
<p>Félicitations ! Votre admission à l’ESCEN est désormais officielle.</p>
<div style="background: #f4f7fb; border-left: 4px solid #0f4c81; padding: 16px; margin: 20px 0;">
  <p style="margin: 0 0 8px 0;"><strong>Vos identifiants officiels :</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li><strong>Matricule étudiant :</strong> ${matricule}</li>
    <li><strong>Email institutionnel Microsoft 365 :</strong> <code>${m365Email}</code></li>
    <li><strong>Mot de passe initial Microsoft 365 :</strong> <code>${pwdDisplay}</code></li>
    <li><strong>Mot de passe du Portail Étudiant :</strong> <code>${portalPwdDisplay}</code></li>
  </ul>
</div>
<p><strong>Vos accès directs :</strong></p>
<ol>
  <li><a href="https://portail.escen.university/" style="color: #0f4c81; font-weight: bold;">Accéder au Portail Étudiant ESCEN</a> (utilisez votre email institutionnel)</li>
  <li><a href="https://office.com" style="color: #0f4c81; font-weight: bold;">Accéder à vos outils Microsoft 365 (Office, Teams, OneDrive)</a></li>
</ol>
<p style="font-size: 13px; color: #64748b;">Lors de votre première connexion, il vous sera demandé de personnaliser votre mot de passe.</p>
<p>L’équipe de direction et d’admission ESCEN vous souhaite une excellente réussite académique !</p>
</body></html>`;

    const enqueue = await client.rpc('escen_email_enqueue', {
      p_year_id: params.academicYearId,
      p_event_type: 'application_status_changed',
      p_source_table: 'online_applications',
      p_source_id: params.applicationId,
      p_source_version: `${params.studentId}:welcome`,
      p_recipient_email: params.personalEmail,
      p_recipient_name: `${params.firstname} ${params.lastname}`,
      p_subject: subject,
      p_text_body: textBody,
      p_html_body: htmlBody,
      p_actor_id: params.actorId,
    });

    if (!enqueue.error) {
      emailQueued = true;
    }
  }

  return {
    matricule,
    m365Email,
    temporaryPassword,
    m365Status,
    accountCreated,
    enrolled,
    emailQueued,
    documentsTransferred,
  };
}
