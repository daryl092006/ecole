import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { requireAccount, requirePermission, errorResponse, RequestError } from '@/server/auth';
import { boundedRequest, hashWebsiteToken, websiteRpc } from '@/server/website';
import { admissionCommandSchema, applicationLetterHtml, ADMISSION_ACTIONS } from '@/services/admissionsService';
import { formatDocumentLabel } from '@/services/websiteService';
import { attemptApplicationEmails, portalOrigin, submissionSchema, submitApplication } from '@/server/admissions';
import { emailConfiguration } from '@/server/emailTransport';
import { generateNextStudentMatricule, provisionStudentComplete } from '@/services/studentProvisioningService';
import type { AdmissionsContext } from '@/types/admissions';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function authorized(request: Request) {
  const auth = await requireAccount(request); requirePermission(auth.context, 'application.view');
  if (!auth.context.grants.some(grant => !grant.site_id && !grant.group_id && !grant.academic_year_id)) throw new RequestError(403, 'Accès global aux candidatures requis.');
  const selection = request.headers.get('x-escen-year') || 'current';
  if (selection === 'all') return { ...auth, yearId: null, selection };
  if (selection !== 'current') return { ...auth, yearId: z.uuid().parse(selection), selection };
  const response = await auth.client.rpc('escen_academic_year_context');
  if (response.error) throw new RequestError(503, 'Contexte annuel indisponible.');
  return { ...auth, yearId: response.data?.currentYearId as string | null, selection };
}
export async function GET(request: Request) {
  try {
    const { client, context, yearId, selection } = await authorized(request);
    if (!yearId && selection !== 'all') throw new RequestError(409, 'Choisissez une année.');
    const params = new URL(request.url).searchParams;
    if (params.get('view') === 'notifications') {
      const notices = await websiteRpc(client, 'escen_application_notices', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId });
      return Response.json({ notices }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (params.has('document')) {
      const document = await websiteRpc(client, 'escen_admission_document', {
        p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId, p_id: z.uuid().parse(params.get('document')),
      });
      if (!document?.bucket || !document.object_path) throw new RequestError(404, 'Pièce introuvable.');
      const signed = await client.storage.from(document.bucket).createSignedUrl(document.object_path, 60, { download: document.filename });
      if (signed.error || !signed.data) throw new RequestError(503, 'Téléchargement indisponible.');
      return Response.json({ url: signed.data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const data = await websiteRpc(client, 'escen_admissions_context', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId }) as AdmissionsContext;
    data.mail_configured = emailConfiguration().ready;
    if (params.has('letter')) {
      const letter = data.applications.flatMap(item => item.letters).find(item => item.id === z.uuid().parse(params.get('letter')));
      if (!letter) throw new RequestError(404, 'Courrier hors de votre périmètre.');
      return new Response(applicationLetterHtml(letter.reference, letter.content), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { client, context, yearId } = await authorized(request);
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      if (!yearId) throw new RequestError(409, 'Sélectionnez une année avant d’enregistrer.');
      requirePermission(context, 'application.review');
      const form = await (await boundedRequest(request, 26 * 1024 * 1024)).formData();
      const input = submissionSchema.parse(JSON.parse(String(form.get('payload') || '{}')));
      const { token: _token, ...result } = await submitApplication(client, request, input, form, yearId, context.accountId, context.roleCode);
      void _token;
      return Response.json(result, { status: 201 });
    }
    const raw: unknown = await (await boundedRequest(request, 32768)).json();
    const notices = z.object({ action: z.literal('read_notices'), ids: z.array(z.uuid()).max(200) }).strict().safeParse(raw);
    if (notices.success) {
      await websiteRpc(client, 'escen_application_notice_read', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_ids: notices.data.ids });
      return Response.json({ saved: true });
    }
    if (!yearId) throw new RequestError(409, 'Sélectionnez une année avant d’enregistrer.');
    const input = admissionCommandSchema.parse(raw); const capability = ADMISSION_ACTIONS[input.action].capability;
    requirePermission(context, capability === 'decide' ? 'application.decide' : capability === 'payment' ? 'application.payment.confirm' : capability === 'followup' ? 'application.followup' : 'application.review');
    const payload: Record<string, unknown> = { ...input };
    if (['incomplete','request_changes'].includes(input.action)) {
      const token = randomBytes(32).toString('hex');
      payload.access_token_hash = hashWebsiteToken(token); payload.access_url = `${portalOrigin(request)}/candidature/suivi#access=${token}`;
    }
    if (input.action === 'create_student' && !payload.existing_student_id && !payload.matricule) {
      payload.matricule = await generateNextStudentMatricule(client, yearId);
    }

    // Orchestration directe des étapes intermédiaires pour éviter les clics superflus en interface
    const { data: currentApp } = await client
      .from('online_applications')
      .select('id, version, workflow_stage, intake_id')
      .eq('id', input.id)
      .maybeSingle();

    let currentVersion = Number(currentApp?.version ?? input.version);
    let currentStage = (currentApp?.workflow_stage as string | null) ?? null;

    // 1. Demander une rectification directement depuis NOUVELLE / RECUE / A_COMPLETER
    if (['incomplete', 'request_changes'].includes(input.action) && (!currentStage || ['NOUVELLE', 'RECUE', 'A_COMPLETER'].includes(currentStage))) {
      const reviewed = await websiteRpc(client, 'escen_application_command', {
        p_actor_id: context.accountId,
        p_role_code: context.roleCode,
        p_year_id: yearId,
        p_action: 'review',
        p_data: { id: input.id, version: currentVersion, reason: 'Ouverture automatique pour demande de rectification' },
      });
      currentVersion = Number(reviewed?.version ?? currentVersion + 1);
      currentStage = String(reviewed?.workflow_stage || 'VERIFICATION_ADMISSION');
      payload.version = currentVersion;
    }

    // 2. Valider et transmettre à l'académie en 1 clic depuis NOUVELLE / RECUE / VERIFICATION_ADMISSION / INCOMPLET / A_COMPLETER
    if (input.action === 'transmit' && currentStage !== 'COMPLET') {
      if (!currentStage || ['NOUVELLE', 'RECUE', 'INCOMPLET', 'A_COMPLETER'].includes(currentStage)) {
        const reviewed = await websiteRpc(client, 'escen_application_command', {
          p_actor_id: context.accountId,
          p_role_code: context.roleCode,
          p_year_id: yearId,
          p_action: 'review',
          p_data: { id: input.id, version: currentVersion, reason: 'Vérification du dossier avant transmission académique' },
        });
        currentVersion = Number(reviewed?.version ?? currentVersion + 1);
        currentStage = String(reviewed?.workflow_stage || 'VERIFICATION_ADMISSION');
      }

      if (currentStage === 'VERIFICATION_ADMISSION') {
        const { data: docs } = await client
          .from('application_documents')
          .select('id, document_key')
          .eq('application_id', input.id);
        const allDocIds = (docs || []).map(d => String(d.id));
        const uploadedKeys = new Set((docs || []).map(d => String(d.document_key)));

        if (currentApp?.intake_id) {
          const { data: intakeRow } = await client
            .from('website_intakes')
            .select('required_documents')
            .eq('id', currentApp.intake_id)
            .maybeSingle();
          const requiredKeys = Array.isArray(intakeRow?.required_documents)
            ? (intakeRow.required_documents as string[])
            : [];
          const missingKeys = requiredKeys.filter(k => !uploadedKeys.has(k));
          if (missingKeys.length > 0) {
            const missingLabels = missingKeys.map(k => formatDocumentLabel(k)).join(', ');
            throw new RequestError(
              409,
              `Impossible de transmettre à l’académie : pièce(s) obligatoire(s) manquante(s) dans le dossier (${missingLabels}). Utilisez « Demander une rectification / complément » pour que le candidat les dépose.`
            );
          }
        }

        const completed = await websiteRpc(client, 'escen_application_command', {
          p_actor_id: context.accountId,
          p_role_code: context.roleCode,
          p_year_id: yearId,
          p_action: 'complete',
          p_data: {
            id: input.id,
            version: currentVersion,
            reason: 'Validation de la complétude du dossier',
            identity_checked: true,
            guardians_checked: true,
            checked_documents: allDocIds,
          },
        });
        currentVersion = Number(completed?.version ?? currentVersion + 1);
        currentStage = String(completed?.workflow_stage || 'COMPLET');
      }
      payload.version = currentVersion;
    }

    // 3. Prononcer l'admissibilité ou le refus directement dès TRANSMIS_ACADEMIE
    if (['admissible', 'refuse'].includes(input.action) && currentStage === 'TRANSMIS_ACADEMIE') {
      const studied = await websiteRpc(client, 'escen_application_command', {
        p_actor_id: context.accountId,
        p_role_code: context.roleCode,
        p_year_id: yearId,
        p_action: 'study',
        p_data: { id: input.id, version: currentVersion, reason: 'Ouverture de l’étude académique pour décision' },
      });
      currentVersion = Number(studied?.version ?? currentVersion + 1);
      currentStage = String(studied?.workflow_stage || 'ETUDE_ACADEMIQUE');
      payload.version = currentVersion;
    }

    let data = await websiteRpc(client, 'escen_application_command', { p_actor_id: context.accountId, p_role_code: context.roleCode, p_year_id: yearId, p_action: input.action, p_data: payload });

    // 4. Création automatique du dossier étudiant dès le règlement intégral des frais d'inscription (ADMIS_OFFICIEL)
    if (input.action === 'confirm_payment' && data?.workflow_stage === 'ADMIS_OFFICIEL' && !data?.student_id) {
      try {
        const identity = (data.identity || {}) as Record<string, unknown>;
        const candidateEmail = String(identity.email || '').trim().toLowerCase();
        let existingStudentId: string | null = null;
        let autoMatricule: string | null = null;

        if (candidateEmail) {
          const { data: existingPerson } = await client
            .from('people')
            .select('id')
            .ilike('email', candidateEmail)
            .is('archived_at', null)
            .maybeSingle();
          if (existingPerson?.id) {
            const { data: existingStudent } = await client
              .from('students')
              .select('id, matricule')
              .eq('person_id', existingPerson.id)
              .is('archived_at', null)
              .maybeSingle();
            if (existingStudent?.id && existingStudent?.matricule) {
              existingStudentId = String(existingStudent.id);
              autoMatricule = String(existingStudent.matricule);
            }
          }
        }

        if (!autoMatricule) {
          autoMatricule = await generateNextStudentMatricule(client, yearId);
        }

        data = await websiteRpc(client, 'escen_application_command', {
          p_actor_id: context.accountId,
          p_role_code: context.roleCode,
          p_year_id: yearId,
          p_action: 'create_student',
          p_data: {
            id: String(data.id),
            version: Number(data.version),
            reason: 'Création automatique du dossier étudiant après confirmation des frais d’inscription',
            matricule: autoMatricule,
            existing_student_id: existingStudentId,
          },
        });
      } catch (autoErr) {
        console.warn('[Admissions] Auto-création du dossier étudiant différée :', autoErr);
      }
    }

    if ((input.action === 'create_student' || input.action === 'confirm_payment') && data?.student_id) {
      const studentId = String(data.student_id);
      const { data: studentRow } = await client.from('students').select('person_id').eq('id', studentId).maybeSingle();
      const personId = String(studentRow?.person_id || '');
      const identity = (data.identity || {}) as Record<string, unknown>;

      if (personId) {
        await provisionStudentComplete(client, {
          applicationId: String(data.id),
          studentId,
          personId,
          firstname: String(identity.prenom || ''),
          lastname: String(identity.nom || ''),
          personalEmail: String(identity.email || ''),
          intakeId: data.intake_id ? String(data.intake_id) : null,
          academicYearId: yearId,
          actorId: context.accountId,
        });
      }
    }

    await attemptApplicationEmails(client);
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
