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
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

