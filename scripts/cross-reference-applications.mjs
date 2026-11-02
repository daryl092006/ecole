import { execSync } from 'child_process';

const raw = execSync('npx supabase db query --remote --yes "select id, reference, workflow_stage, student_id, intake_id, identity from escen.online_applications;"', { encoding: 'utf-8' });
const rows = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows;

const missing28 = [
  'AKOR Abla Élisée',
  'BANNA Achraf',
  'GBADOE Komi Prince Antoine',
  'AGUIDI Abla Dzifa',
  'BODJONA Koboyo Magnim',
  'BOURAIMA Rafik',
  'EGAN Akouvi Alice',
  'GNELE Evynel Olanique',
  'AKAKPO Harmony Daniella Modoukpe',
  'AMONY Mensah Léopold Junior',
  'AMUZU Koffi Komi Abel',
  'MAMA Issa',
  'OLOHUNTO Amed Oba Sanjo',
  'SAMANI Djibril',
  'LOKOSSOU Cedric Franzt',
  'DATEY Dah Mokpokpo',
  'SADJI Yao Wisdom',
  'GOUMBANE Bouamey',
  'KOUADIO Kouadio Joel',
  'LOKO Cristilla Flavia',
  'OUSMAN Ahmat Mahamat',
  'AKODA Pascal',
  'TCHABANA Malia',
  'ANNOUR Mahamat Saleh Kaya',
  'CHIDAS Vanessa Grâce Emilienne',
  'SAMKLU Enyonam',
  'MARCOS Nafissath',
  'KIALA MFUAMBI Beni'
];

function normalize(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log('=== CROISEMENT DES 28 ÉTUDIANTS AVEC LES CANDIDATURES DU SITE WEB ===');
const matchedApps = [];

for (const name of missing28) {
  const norm = normalize(name);
  const words = norm.split(' ').filter(w => w.length > 2);
  const matches = rows.filter(r => {
    const ident = r.identity || {};
    const appFull = normalize(`${ident.nom || ''} ${ident.prenom || ''}`);
    
    // exact or reverse
    if (appFull === norm || normalize(`${ident.prenom || ''} ${ident.nom || ''}`) === norm) return true;
    
    // words match
    const common = words.filter(w => appFull.split(' ').includes(w));
    return common.length >= 2;
  });
  
  if (matches.length > 0) {
    console.log(`\nTrouvé candidature pour "${name}":`);
    for (const m of matches) {
      console.log(`  - Ref: ${m.reference} | Nom: ${m.identity?.nom} ${m.identity?.prenom} | Email: ${m.identity?.email} | Tel: ${m.identity?.tel} | Date naissance: ${m.identity?.date_naissance} | Genre: ${m.identity?.genre} | Nationalité: ${m.identity?.nationalite} | Stage: ${m.workflow_stage} | StudentId: ${m.student_id}`);
      matchedApps.push({ sheetName: name, app: m });
    }
  }
}

console.log(`\nTotal candidatures retrouvées : ${matchedApps.length} sur les 28 étudiants.`);
