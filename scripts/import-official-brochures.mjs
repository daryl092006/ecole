import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { remoteQuery, quoteSql } from './supabase-cli.mjs';

const envFile = readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const activeYear = remoteQuery(`select academic_year_id from escen.academic_working_year where singleton;`)[0]?.academic_year_id;
const creator = remoteQuery(`select id from escen.accounts where archived_at is null limit 1;`)[0]?.id;

const programs = remoteQuery(`select id, code, name from escen.programs;`);
const progMap = Object.fromEntries(programs.map(p => [p.code, p.id]));

console.log('Filières disponibles :', progMap);

const pdfDir = '/Users/gdenis/escen-projet/escen-website/public/pdf';

const brochuresToImport = [
  // Licences
  {
    title: 'Licence Professionnelle en Marketing Digital & E-Commerce',
    slug: 'licence-marketing-digital',
    description: 'Programme et détails de la Licence Professionnelle en Marketing Digital & E-Commerce à ESCEN.',
    filename: 'LICENCE PROFESSIONNELLE EN MARKETING DIGITAL.pdf',
    progCode: 'MDE',
    cycle: 'LICENCE'
  },
  {
    title: 'Licence Professionnelle en Finance Digitale',
    slug: 'licence-finance-digitale',
    description: 'Programme et détails de la Licence Professionnelle en Finance Digitale à ESCEN.',
    filename: 'LICENCE PROFESSIONNELLE EN FINANCE DIGITALE.pdf',
    progCode: 'FD',
    cycle: 'LICENCE'
  },
  {
    title: 'Licence Professionnelle en Management de Projets Numériques',
    slug: 'licence-management-projets-numeriques',
    description: 'Programme et détails de la Licence Professionnelle en Management de Projets Numériques à ESCEN.',
    filename: 'LICENCE PROFESSIONNELLE EN MANAGEMENT DE PROJETS NUMERIQUES.pdf',
    progCode: 'MPN',
    cycle: 'LICENCE'
  },
  {
    title: 'Licence Professionnelle en Intelligence Artificielle & Génie Logiciel',
    slug: 'licence-intelligence-artificielle-genie-logiciel',
    description: 'Programme et détails de la Licence Professionnelle en IA & Génie Logiciel à ESCEN.',
    filename: 'LICENCE PROFESSIONNELLE EN IA&GL.pdf',
    progCode: 'IA-GL',
    cycle: 'LICENCE'
  },
  // Masters
  {
    title: 'Master Professionnel en Marketing Digital',
    slug: 'master-marketing-digital',
    description: 'Programme et détails du Master Professionnel en Marketing Digital à ESCEN.',
    filename: 'MASTER PROFESSIONNEL EN MARKETING DIGITAL.pdf',
    progCode: 'MDE',
    cycle: 'MASTER'
  },
  {
    title: 'Master Professionnel en Finance Digitale',
    slug: 'master-finance-digitale',
    description: 'Programme et détails du Master Professionnel en Finance Digitale à ESCEN.',
    filename: 'MASTER PROFESSIONNEL EN FINANCE DIGITALE.pdf',
    progCode: 'FD',
    cycle: 'MASTER'
  },
  {
    title: 'Master Professionnel en Management de Projets & Transformation Digitale',
    slug: 'master-management-projets-transformation-digitale',
    description: 'Programme et détails du Master Professionnel en Management de Projets & Transformation Digitale à ESCEN.',
    filename: 'MASTER PROFESSIONNEL EN MANAGEMENT DE PROJETS - TRANSFORMATION DIGITALE.pdf',
    progCode: 'MP-TD',
    cycle: 'MASTER'
  },
  // Executive
  {
    title: 'Executive Master en Finance Digitale',
    slug: 'executive-master-finance-digitale',
    description: 'Programme Executive Master en Finance Digitale.',
    filename: 'Fiche_Executive_Master_FD.pdf',
    progCode: 'FD',
    cycle: 'EXECUTIVE'
  },
  {
    title: 'Executive Master Management de Projets & Transformation Digitale',
    slug: 'executive-master-management-projets-transformation-digitale',
    description: 'Programme Executive Master en Management de Projets et Transformation Digitale.',
    filename: 'Programme_Executive_Master_MP&TD.pdf',
    progCode: 'MP-TD',
    cycle: 'EXECUTIVE'
  }
];

for (const b of brochuresToImport) {
  const filePath = `${pdfDir}/${b.filename}`;
  if (!existsSync(filePath)) {
    console.error(`Fichier non trouvé : ${filePath}`);
    continue;
  }
  const bytes = readFileSync(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const objectPath = `${activeYear}/${randomUUID()}.pdf`;
  const progId = progMap[b.progCode];

  console.log(`Upload & création brochure : ${b.title}...`);

  const { error: uploadError } = await supabase.storage
    .from('escen-website-brochures')
    .upload(objectPath, bytes, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error(`Erreur upload ${b.title}:`, uploadError);
    continue;
  }

  const sql = `
    insert into escen.website_brochures (
      academic_year_id, title, slug, description, status,
      object_path, filename, byte_size, sha256, created_by,
      reason, program_id, cycle
    ) values (
      '${activeYear}'::uuid,
      ${quoteSql(b.title)},
      ${quoteSql(b.slug)},
      ${quoteSql(b.description)},
      'PUBLIE',
      ${quoteSql(objectPath)},
      ${quoteSql(b.filename)},
      ${bytes.length},
      ${quoteSql(sha256)},
      '${creator}'::uuid,
      'Brochure officielle de la filière',
      ${progId ? `'${progId}'::uuid` : 'null'},
      ${b.cycle ? quoteSql(b.cycle) : 'null'}
    )
    on conflict (slug) do update set
      title = excluded.title,
      description = excluded.description,
      status = 'PUBLIE',
      object_path = excluded.object_path,
      filename = excluded.filename,
      byte_size = excluded.byte_size,
      sha256 = excluded.sha256,
      program_id = excluded.program_id,
      cycle = excluded.cycle,
      academic_year_id = excluded.academic_year_id;
  `;
  remoteQuery(sql);
}

const count = remoteQuery(`select count(*) c from escen.website_brochures where academic_year_id='${activeYear}';`)[0]?.c;
console.log(`Brochures publiées enregistrées : ${count}`);
