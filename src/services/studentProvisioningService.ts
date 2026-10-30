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

        let enrollmentId = existingEnrollment?.id;
        if (!enrollmentId) {
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

  // 6. Placer l'email de bienvenue avec les identifiants officiels dans la file d'envoi
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
1. Votre Portail Étudiant ESCEN : https://portal.escen.university/
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
  <li><a href="https://portal.escen.university/" style="color: #0f4c81; font-weight: bold;">Accéder au Portail Étudiant ESCEN</a> (utilisez votre email institutionnel)</li>
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
  };
}
