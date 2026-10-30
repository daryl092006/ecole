/**
 * Script de calcul et d'attribution des adresses Microsoft 365 pour les étudiants
 * Règle ESCEN :
 * 1. 1ère lettre du nom + 1er prénom -> [nom[0]].[prenom1].etudiant@escen.university
 * 2. Si doublon & 2e prénom -> [nom[0]].[prenom2].etudiant@escen.university
 * 3. Si doublon ou pas de 2e prénom -> [nom[0..1]].[prenom1].etudiant@escen.university
 * 4. Si doublon & 2e prénom -> [nom[0..1]].[prenom2].etudiant@escen.university
 * 5. Secours -> [nom[0]].[prenom1].etudiant{N}@escen.university
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Variables Supabase manquantes dans l'environnement");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DOMAIN = process.env.M365_DOMAIN || 'escen.university';

function sanitize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function getGivenNames(firstname) {
  return (firstname || '')
    .split(/[\s\-']+/)
    .map(sanitize)
    .filter(Boolean);
}

function computeEmail(lastname, firstname, existing) {
  const n = sanitize(lastname);
  const p = getGivenNames(firstname);

  const p1 = p[0] || 'etudiant';
  const p2 = p.length > 1 ? p[1] : null;

  const n1 = n.slice(0, 1) || 'e';
  const n2 = n.length >= 2 ? n.slice(0, 2) : null;

  // Candidat 1
  const c1 = `${n1}.${p1}.etudiant@${DOMAIN}`;
  if (!existing.has(c1)) return c1;

  // Candidat 2 (second prénom)
  if (p2) {
    const c2 = `${n1}.${p2}.etudiant@${DOMAIN}`;
    if (!existing.has(c2)) return c2;
  }

  // Candidat 3 (deux lettres du nom)
  if (n2) {
    const c3 = `${n2}.${p1}.etudiant@${DOMAIN}`;
    if (!existing.has(c3)) return c3;
  }

  // Candidat 4 (deux lettres + second prénom)
  if (n2 && p2) {
    const c4 = `${n2}.${p2}.etudiant@${DOMAIN}`;
    if (!existing.has(c4)) return c4;
  }

  // Candidat 5 (secours)
  let idx = 2;
  while (existing.has(`${n1}.${p1}.etudiant${idx}@${DOMAIN}`)) {
    idx++;
  }
  return `${n1}.${p1}.etudiant${idx}@${DOMAIN}`;
}

async function run() {
  // Récupérer tous les étudiants avec leur nom et prénom
  const { data: students, error } = await supabase.schema('escen').from('students')
    .select('id, matricule, m365_email, people(id, firstname, lastname)')
    .order('matricule');

  if (error) {
    console.error('Erreur lecture étudiants:', error);
    process.exit(1);
  }

  const existingEmails = new Set(
    students.map(s => s.m365_email).filter(Boolean)
  );

  console.log(`Traitement de ${students.length} étudiants...`);
  const updates = [];

  for (const s of students) {
    if (s.m365_email) continue;
    const p = s.people;
    if (!p) continue;

    const email = computeEmail(p.lastname, p.firstname, existingEmails);
    existingEmails.add(email);

    updates.push({
      id: s.id,
      matricule: s.matricule,
      name: `${p.firstname} ${p.lastname}`,
      m365_email: email,
    });
  }

  console.log(`Génération de ${updates.length} adresses institutionnelles :`);
  for (const u of updates) {
    const { error: upErr } = await supabase.schema('escen').from('students')
      .update({ m365_email: u.m365_email, m365_status: 'PENDING' })
      .eq('id', u.id);

    if (upErr) {
      console.error(`Erreur mise à jour ${u.matricule}:`, upErr);
    } else {
      console.log(`✓ ${u.matricule.padEnd(14)} ${u.name.padEnd(35)} -> ${u.m365_email}`);
    }
  }

  console.log('Terminé avec succès !');
}

run();

