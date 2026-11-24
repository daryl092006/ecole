/**
 * Service d'intégration Microsoft 365 (Microsoft Graph API)
 * Gestion du provisionnement automatique des comptes étudiants @escen.university
 */

export const M365_DOMAIN = process.env.M365_DOMAIN || 'escen.university';

export interface M365UserPayload {
  accountEnabled: boolean;
  displayName: string;
  mailNickname: string;
  userPrincipalName: string;
  passwordProfile: {
    forceChangePasswordNextSignIn: boolean;
    password: string;
  };
  givenName: string;
  surname: string;
  usageLocation: string;
}

export interface M365ProvisionResult {
  email: string;
  userId?: string;
  status: 'ACTIVE' | 'PENDING' | 'FAILED' | 'SIMULATED';
  temporaryPassword?: string;
  error?: string;
}

/**
 * Nettoie une chaîne : minuscules, suppression des accents et caractères spéciaux
 */
export function sanitizeNameToken(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Ne garde que lettres et chiffres
    .trim();
}

/**
 * Découpe les prénoms multiples (espaces, tirets, apostrophes)
 */
export function extractGivenNames(firstname: string): string[] {
  return firstname
    .split(/[\s\-']+/)
    .map(sanitizeNameToken)
    .filter(token => token.length > 0);
}

/**
 * Algorithme de génération d'adresse email étudiante selon les règles ESCEN :
 * 1. [1ère lettre nom].[1er prénom].etudiant@escen.university
 * 2. Si doublon & si 2e prénom : [1ère lettre nom].[2e prénom].etudiant@escen.university
 * 3. Si doublon ou pas de 2e prénom : [2 premières lettres nom].[1er prénom].etudiant@escen.university
 * 4. Si doublon & si 2e prénom : [2 premières lettres nom].[2e prénom].etudiant@escen.university
 * 5. Secours ultime si collision absolue : [1ère lettre nom].[1er prénom].etudiant{N}@escen.university
 */
export function generateStudentEmail(
  lastname: string,
  firstname: string,
  existingEmails: Set<string> = new Set()
): string {
  const cleanLastname = sanitizeNameToken(lastname);
  const givenNames = extractGivenNames(firstname);

  const p1 = givenNames[0] || 'etudiant';
  const p2 = givenNames.length > 1 ? givenNames[1] : null;

  const n1 = cleanLastname.slice(0, 1) || 'e';
  const n2 = cleanLastname.length >= 2 ? cleanLastname.slice(0, 2) : null;

  // Candidat 1 : [1ère lettre nom].[1er prénom].etudiant
  const candidate1 = `${n1}.${p1}.etudiant@${M365_DOMAIN}`;
  if (!existingEmails.has(candidate1)) return candidate1;

  // Candidat 2 : [1ère lettre nom].[2e prénom].etudiant
  if (p2) {
    const candidate2 = `${n1}.${p2}.etudiant@${M365_DOMAIN}`;
    if (!existingEmails.has(candidate2)) return candidate2;
  }

  // Candidat 3 : [2 premières lettres nom].[1er prénom].etudiant
  if (n2) {
    const candidate3 = `${n2}.${p1}.etudiant@${M365_DOMAIN}`;
    if (!existingEmails.has(candidate3)) return candidate3;
  }

  // Candidat 4 : [2 premières lettres nom].[2e prénom].etudiant
  if (n2 && p2) {
    const candidate4 = `${n2}.${p2}.etudiant@${M365_DOMAIN}`;
    if (!existingEmails.has(candidate4)) return candidate4;
  }

  // Candidat 5 : Secours incrémental
  let index = 2;
  while (existingEmails.has(`${n1}.${p1}.etudiant${index}@${M365_DOMAIN}`)) {
    index++;
  }
  return `${n1}.${p1}.etudiant${index}@${M365_DOMAIN}`;
}

/**
 * Génère un mot de passe temporaire aléatoire fort conforme aux exigences Microsoft
 * (Au moins 12 caractères, majuscules, minuscules, chiffres, caractères spéciaux)
 */
export function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*()_+-=';
  const all = upper + lower + numbers + special;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 14; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

/**
 * Récupère le jeton d'accès OAuth2 Microsoft Graph via les identifiants d'application Entra ID
 */
export async function getGraphAccessToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Échec d'authentification Azure AD (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

function nameTokens(value: string): string[] {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
}

/** Recherche un compte étudiant existant (nom de famille identique et au moins un prénom commun). */
export async function findExistingStudentAccount(token: string, firstname: string, lastname: string): Promise<{ id: string; email: string } | null> {
  const last = nameTokens(lastname);
  const first = new Set(nameTokens(firstname));
  if (!last.length || !first.size) return null;
  const filter = encodeURIComponent(`startswith(surname,'${lastname.replace(/'/g, "''")}') or startswith(displayName,'${lastname.replace(/'/g, "''")}')`);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${filter}&$select=id,userPrincipalName,displayName,givenName,surname&$top=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Recherche de compte existant impossible (${res.status})`);
  const body = await res.json() as { value?: Array<{ id: string; userPrincipalName: string; displayName?: string }> };
  for (const user of body.value || []) {
    const tokens = new Set(nameTokens(user.displayName || ''));
    if (!last.every(t => tokens.has(t))) continue;
    const others = [...tokens].filter(t => !last.includes(t));
    if (others.some(t => first.has(t)) && user.userPrincipalName.endsWith('.etudiant@escen.university')) {
      return { id: user.id, email: user.userPrincipalName };
    }
  }
  return null;
}

/**
 * Provisionne un compte Microsoft 365 pour un étudiant
 * Si les clés Azure ne sont pas encore configurées, simule la réservation de l'adresse avec le statut PENDING.
 */
export async function provisionM365Account(params: {
  firstname: string;
  lastname: string;
  existingEmails?: Set<string>;
}): Promise<M365ProvisionResult> {
  const email = generateStudentEmail(params.lastname, params.firstname, params.existingEmails);
  const password = generateStrongPassword();

  let token: string | null = null;
  try {
    token = await getGraphAccessToken();
  } catch (err: unknown) {
    return {
      email,
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Mode sans clés Azure : réservation de l'adresse en statut PENDING
  if (!token) {
    return {
      email,
      status: 'PENDING',
      error: 'Identifiants Azure non configurés (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)',
    };
  }

  // Anti-doublon : si un compte existe déjà pour ce nom de famille avec un prénom commun, on le réutilise.
  const existing = await findExistingStudentAccount(token, params.firstname, params.lastname);
  if (existing) {
    return { email: existing.email, userId: existing.id, status: 'ACTIVE' };
  }

  const payload: M365UserPayload = {
    accountEnabled: true,
    displayName: `${params.firstname} ${params.lastname.toUpperCase()}`,
    mailNickname: email.split('@')[0],
    userPrincipalName: email,
    givenName: params.firstname,
    surname: params.lastname,
    usageLocation: 'TG', // Togo
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password,
    },
  };

  try {
    const createRes = await fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return {
        email,
        status: 'FAILED',
        error: `Erreur Graph API (${createRes.status}): ${errBody}`,
      };
    }

    const userData = await createRes.json();
    const userId = userData.id as string;

    // Assigner la licence étudiante si SKU configuré
    const studentSkuId = process.env.AZURE_STUDENT_SKU_ID;
    if (studentSkuId) {
      await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/assignLicense`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLicenses: [{ skuId: studentSkuId }],
          removeLicenses: [],
        }),
      });
    }

    return {
      email,
      userId,
      status: 'ACTIVE',
      temporaryPassword: password,
    };
  } catch (err: unknown) {
    return {
      email,
      userId: undefined,
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface TeamsOnlineMeetingResult {
  meetingUrl: string;
  meetingId: string | null;
  provider: 'TEAMS' | 'LIEN';
  source: 'GRAPH_API' | 'FALLBACK';
}

export interface TeamsRecordingSyncResult {
  recordingUrl: string | null;
  syncedAt: string;
  source: 'GRAPH_API' | 'FALLBACK';
  message?: string;
}

export class TeamsIntegrationError extends Error {}

/** Course meetings belong to the institutional classroom, never to a personal contact. */
export const COURSE_TEAMS_ORGANIZER = 'class5@escen.university';

async function teamsOrganizerId(token: string, email: string): Promise<string> {
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new TeamsIntegrationError('Le compte Microsoft de l’organisateur est inaccessible.');
  const user = await response.json() as { id?: string };
  if (!user.id) throw new TeamsIntegrationError('Microsoft n’a pas confirmé le compte organisateur.');
  return user.id;
}

/**
 * Crée automatiquement une réunion Microsoft Teams via Microsoft Graph API
 * (avec activation de l'enregistrement automatique si supporté par la politique Teams).
 * Retourne uniquement une adresse créée et confirmée par Microsoft.
 */
export async function createTeamsOnlineMeeting(params: {
  sessionId: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  organizerEmail?: string | null;
}): Promise<TeamsOnlineMeetingResult> {
  const teacherUpn = params.organizerEmail?.trim().toLowerCase();
  if (!teacherUpn || !teacherUpn.endsWith(`@${M365_DOMAIN.toLowerCase()}`) || teacherUpn === COURSE_TEAMS_ORGANIZER) {
    throw new TeamsIntegrationError('Un compte enseignant institutionnel distinct de Class5 est nécessaire pour le rôle de coorganisateur.');
  }
  const organizerUpn = COURSE_TEAMS_ORGANIZER;

  let token: string | null = null;
  try {
    token = await getGraphAccessToken();
  } catch {
    token = null;
  }

  if (!token) {
    throw new TeamsIntegrationError('La connexion à Microsoft Teams est indisponible. Aucun lien de réunion n’a été créé.');
  }

  try {
    const organizerId = await teamsOrganizerId(token, organizerUpn);
    const teacherId = await teamsOrganizerId(token, teacherUpn);
    const coorganizer = { upn: teacherUpn, role: 'coorganizer', identity: { user: { id: teacherId } } };
    const meetingRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerId)}/onlineMeetings/createOrGet`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'include-unknown-enum-members',
        },
        body: JSON.stringify({
          startDateTime: params.startDateTime,
          endDateTime: params.endDateTime,
          subject: params.subject,
          externalId: params.sessionId,
          recordAutomatically: true,
          participants: { attendees: [coorganizer] },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (meetingRes.ok) {
      const data = (await meetingRes.json()) as { id?: string; joinWebUrl?: string; participants?: { attendees?: Array<{ upn?: string; role?: string; identity?: { user?: { id?: string } } }> } };
      if (data.id && data.joinWebUrl) {
        // createOrGet may return an existing meeting: confirm the requested settings on it too.
        const attendees = (data.participants?.attendees || []).filter(person => person.identity?.user?.id !== teacherId && person.upn?.toLowerCase() !== teacherUpn);
        const configured = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerId)}/onlineMeetings/${encodeURIComponent(data.id)}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'include-unknown-enum-members' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ startDateTime: params.startDateTime, endDateTime: params.endDateTime, subject: params.subject,
            recordAutomatically: true, participants: { attendees: [...attendees, coorganizer] } }),
        });
        if (!configured.ok) throw new TeamsIntegrationError('La réunion existe, mais Microsoft n’a pas confirmé le professeur coorganisateur et l’enregistrement automatique.');
        const confirmed = await configured.json() as { recordAutomatically?: boolean; participants?: { attendees?: Array<{ role?: string; identity?: { user?: { id?: string } } }> } };
        if (confirmed.recordAutomatically !== true || !confirmed.participants?.attendees?.some(person => person.identity?.user?.id === teacherId && person.role === 'coorganizer')) {
          throw new TeamsIntegrationError('Microsoft n’a pas confirmé les paramètres du cours : professeur coorganisateur et enregistrement automatique.');
        }
        return {
          meetingUrl: data.joinWebUrl,
          meetingId: data.id || null,
          provider: 'TEAMS',
          source: 'GRAPH_API',
        };
      }
    }

  } catch (error) {
    if (error instanceof TeamsIntegrationError) throw error;
    // Une panne Microsoft ne doit jamais produire une adresse de réunion inventée.
  }

  throw new TeamsIntegrationError('Microsoft Teams n’a pas confirmé la création de la réunion. Vérifiez les accès de l’organisateur ou renseignez un lien Teams existant.');
}

/**
 * Récupère automatiquement l'enregistrement d'une séance Teams via Microsoft Graph API
 * Vérifie uniquement les enregistrements rattachés à la réunion demandée.
 */
export async function syncTeamsMeetingRecording(params: {
  sessionId: string;
  meetingId?: string | null;
  meetingUrl?: string | null;
  organizerEmail?: string | null;
  subjectHint?: string | null;
  sessionStartDateTime?: string | null;
}): Promise<TeamsRecordingSyncResult> {
  const syncedAt = new Date().toISOString();
  const organizerUpn = COURSE_TEAMS_ORGANIZER;

  let token: string | null = null;
  try {
    token = await getGraphAccessToken();
  } catch {
    token = null;
  }

  let hasGraphRecording = false;
  if (token && params.meetingId && !params.meetingId.startsWith('teams-')) {
    try {
      let organizerId = await teamsOrganizerId(token, organizerUpn);
      // Historical meetings retain their real organizer; a teacher is not necessarily that organizer.
      if (params.meetingUrl) {
        try {
          const url = new URL(params.meetingUrl);
          const context = JSON.parse(url.searchParams.get('context') || '{}') as { Tid?: string; Oid?: string };
          if (url.protocol === 'https:' && url.hostname === 'teams.microsoft.com' && context.Tid === process.env.AZURE_TENANT_ID
            && /^[0-9a-f-]{36}$/i.test(context.Oid || '')) organizerId = context.Oid!;
        } catch { /* Keep the configured course organizer for links without an organizer context. */ }
      }
      const recRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerId)}/onlineMeetings/${encodeURIComponent(params.meetingId)}/recordings`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (recRes.ok) {
        const recData = (await recRes.json()) as {
          value?: Array<{ id?: string; recordingContentUrl?: string; contentCorrelationId?: string }>;
        };
        const first = recData.value?.[0];
        if (first?.recordingContentUrl) {
          hasGraphRecording = true;
        }
      }
    } catch {
      // Ignorer et retourner null si aucun enregistrement disponible sur Graph
    }
  }

  if (token && !hasGraphRecording && (params.meetingId || params.subjectHint) && params.sessionStartDateTime) {
    try {
      const targetDay = new Date(params.sessionStartDateTime).toISOString().slice(0, 10);
      const driveRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerUpn)}/drive/root:/Recordings:/children`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (driveRes.ok) {
        const driveData = (await driveRes.json()) as {
          value?: Array<{
            name?: string;
            webUrl?: string;
            createdDateTime?: string;
            source?: { meetingOrganizerId?: string; threadId?: string };
          }>;
        };
        const files = (driveData.value || []).filter(f => f.webUrl && f.createdDateTime?.slice(0, 10) === targetDay);
        const byMeeting = params.meetingId
          ? files.find(f => {
              const org = f.source?.meetingOrganizerId;
              const tid = f.source?.threadId;
              return Boolean(org && tid && Buffer.from(`1*${org}*0**${tid}`).toString('base64') === params.meetingId);
            })
          : undefined;
        const normalize = (v: string) =>
          v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const hintWords = normalize(params.subjectHint || '').split(' ').filter(w => w.length >= 4);
        const bySubject = !byMeeting && hintWords.length >= 2
          ? files.find(f => {
              const fname = normalize(f.name || '');
              return hintWords.every(w => fname.includes(w));
            })
          : undefined;
        const matched = byMeeting || bySubject;
        if (matched?.webUrl) {
          return {
            recordingUrl: matched.webUrl,
            syncedAt,
            source: 'GRAPH_API',
          };
        }
      }
    } catch {
      // Ignorer si le dossier OneDrive n'est pas atteignable
    }
  }

  if (hasGraphRecording) {
    return {
      // L’URL de contenu Graph exige un jeton applicatif et n’est pas un lien de lecture pour l’étudiant.
      recordingUrl: null,
      syncedAt,
      source: 'GRAPH_API',
      message: 'Un enregistrement existe pour cette réunion. Renseignez son lien de lecture OneDrive ou SharePoint partagé avec les étudiants.',
    };
  }

  return {
    recordingUrl: null,
    syncedAt,
    source: 'FALLBACK',
    message: 'Aucun enregistrement automatique trouvé sur Microsoft Cloud pour le moment ; vous pouvez renseigner ou coller le lien du replay OneDrive/SharePoint.',
  };
}


