import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { provisionM365Account } from './microsoftGraphService';

export interface StudentProvisionParams {
  applicationId?: string | null;
  studentId: string;
  personId: string;
  firstname: string;
  lastname: string;
  personalEmail: string;
  intakeId?: string | null;
  academicYearId: string;
  actorId: string;
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
  // Récupérer l'année académique courante pour le suffixe
  let yearCode = new Date().getFullYear().toString();
  if (academicYearId) {
    const { data: y } = await client
      .from('academic_years')
      .select('code, name')
      .eq('id', academicYearId)
      .maybeSingle();
    if (y?.code) {
      const match = y.code.match(/(\d{4})/);
      if (match) yearCode = match[1];
    }
  }

  // Trouver le matricule le plus élevé
  const { data: students } = await client
    .from('students')
    .select('matricule')
    .ilike('matricule', '%-ESC-%');

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
  // 1. Récupérer les informations de l'étudiant
  const { data: student } = await client
    .from('students')
    .select('id, matricule, m365_email, m365_status')
    .eq('id', params.studentId)
    .single();

  const matricule = student?.matricule || 'N/A';
  let m365Email = student?.m365_email as string | undefined;
  let temporaryPassword: string | undefined;
  let m365Status: 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED' = (student?.m365_status as 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED') || 'PENDING';

  // 2. Provisionnement Microsoft 365 si non existant
  if (!m365Email) {
    // Récupérer les emails existants pour éviter tout conflit d'homonyme
    const { data: existingList } = await client
      .from('students')
      .select('m365_email')
      .not('m365_email', 'is', null);

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

    // Enregistrer l'email M365 dans escen.students
    await client
      .from('students')
      .update({
        m365_email: m365Email,
        m365_user_id: m365Res.userId ?? null,
        m365_status: m365Status,
        m365_provisioned_at: new Date().toISOString(),
      })
      .eq('id', params.studentId);
  }

  // 3. Création du compte Supabase Auth & portail
  let accountCreated = false;
  let authUserId: string | null = null;

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
          password: temporaryPassword || 'EscenEtudiant2026!',
          email_confirm: true,
          user_metadata: {
            firstname: params.firstname,
            lastname: params.lastname,
            matricule,
          },
        });
        if (createAuth.data?.user) {
          authUserId = createAuth.data.user.id;
        }
      }
    } catch {
      // Ignorer si auth non disponible dans cet environnement
    }

    // 4. Lier escen.accounts et escen.role_grants
    if (authUserId) {
      const { data: existingAccount } = await client
        .from('accounts')
        .select('id')
        .eq('person_id', params.personId)
        .maybeSingle();

      let accountId = existingAccount?.id;
      if (!accountId) {
        accountId = randomUUID();
        await client.from('accounts').insert({
          id: accountId,
          person_id: params.personId,
          auth_user_id: authUserId,
          active: true,
        });
        accountCreated = true;
      }

      // Attribuer le rôle STUD
      const { data: roleStud } = await client
        .from('roles')
        .select('id')
        .eq('code', 'STUD')
        .single();

      if (roleStud?.id && accountId) {
        const { data: existingGrant } = await client
          .from('role_grants')
          .select('id')
          .eq('account_id', accountId)
          .eq('role_id', roleStud.id)
          .maybeSingle();

        if (!existingGrant) {
          await client.from('role_grants').insert({
            account_id: accountId,
            role_id: roleStud.id,
            valid_from: new Date().toISOString(),
            reason: `Attribution automatique rôle Étudiant lors de l'admission`,
            granted_by: params.actorId,
          });
        }
      }
    }
  }

  // 5. Inscription pédagogique & groupe si non déjà inscrit
  let enrolled = false;
  let enrollmentId: string | null = null;
  if (params.intakeId) {
    // Récupérer la formation de l'intake
    const { data: intake } = await client
      .from('website_intakes')
      .select('level_id, program_id')
      .eq('id', params.intakeId)
      .maybeSingle();

    if (intake?.level_id) {
      // Trouver l'offering correspondant
      const { data: offering } = await client
        .from('academic_offerings')
        .select('id')
        .eq('academic_year_id', params.academicYearId)
        .eq('level_id', intake.level_id)
        .maybeSingle();

      if (offering?.id) {
        const { data: existingEnrollment } = await client
          .from('enrollments')
          .select('id')
          .eq('student_id', params.studentId)
          .eq('offering_id', offering.id)
          .maybeSingle();

        if (existingEnrollment?.id) {
          enrollmentId = String(existingEnrollment.id);
        } else {
          enrollmentId = randomUUID();
          await client.from('enrollments').insert({
            id: enrollmentId,
            student_id: params.studentId,
            offering_id: offering.id,
            status: 'INSCRIT',
            enrolled_on: new Date().toISOString().slice(0, 10),
            created_by: params.actorId,
          });
          enrolled = true;
        }

        // Trouver le groupe associé
        const { data: groupLink } = await client
          .from('group_offerings')
          .select('group_id')
          .eq('offering_id', offering.id)
          .is('archived_at', null)
          .maybeSingle();

        if (groupLink?.group_id && enrollmentId) {
          const { data: existingGroup } = await client
            .from('enrollment_groups')
            .select('id')
            .eq('enrollment_id', enrollmentId)
            .is('valid_until', null)
            .maybeSingle();

          if (!existingGroup) {
            await client.from('enrollment_groups').insert({
              enrollment_id: enrollmentId,
              offering_id: offering.id,
              group_id: groupLink.group_id,
              valid_from: new Date().toISOString().slice(0, 10),
              changed_by: params.actorId,
              reason: `Affectation automatique lors de l'admission officielle`,
            });
          }
        }
      }
    }
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
  }

  // 7. Placer l'email de bienvenue avec les identifiants officiels dans la file d'envoi
  let emailQueued = false;
  if (params.personalEmail && m365Email) {
    const subject = 'Bienvenue à l’ESCEN — Vos identifiants officiels d’accès';
    const pwdDisplay = temporaryPassword || 'Attribué lors de l’admission (contactez l’administration si besoin)';
    const textBody = `Bonjour ${params.firstname} ${params.lastname},

Félicitations ! Votre admission à l’ESCEN est désormais officielle.

Vos accès informatiques officiels et votre compte étudiant ont été activés :
• Matricule étudiant officiel : ${matricule}
• Email institutionnel Microsoft 365 : ${m365Email}
• Mot de passe initial temporaire : ${pwdDisplay}

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
    <li><strong>Mot de passe initial temporaire :</strong> <code>${pwdDisplay}</code></li>
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
      p_academic_year_id: params.academicYearId,
      p_category: 'student_welcome_credentials',
      p_source_table: 'students',
      p_source_id: params.studentId,
      p_idempotency_key: `${params.studentId}:welcome`,
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
