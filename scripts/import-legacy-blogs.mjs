import { remoteQuery, quoteSql } from './supabase-cli.mjs';

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&icirc;/g, 'î')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const blogs = remoteQuery(`
  select l.source_id, l.payload->>'title' title, l.payload->>'slug' slug,
         l.payload->>'content' content, l.payload->>'publication_date' pub_date,
         l.payload->>'status' status
  from escen_private.legacy_rows l
  where l.source_table='blogs'
  order by l.source_id::int;
`);

const activeYear = remoteQuery(`select academic_year_id from escen.academic_working_year where singleton;`)[0]?.academic_year_id;
const creator = remoteQuery(`select id from escen.accounts where archived_at is null limit 1;`)[0]?.id;

console.log(`Année active : ${activeYear}`);
console.log(`Auteur : ${creator}`);
console.log(`Articles trouvés : ${blogs.length}`);

for (const b of blogs) {
  const cleanContent = stripHtml(b.content);
  const excerpt = cleanContent.slice(0, 200).replace(/\n/g, ' ') + '...';
  const slug = b.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const publishedAt = b.pub_date ? new Date(b.pub_date).toISOString() : new Date().toISOString();
  
  console.log(`Import: ${b.title} (${slug})`);
  const sql = `
    insert into escen.website_articles (
      academic_year_id, title, slug, excerpt, content, image, status, published_at, created_by, reason
    ) values (
      '${activeYear}'::uuid,
      ${quoteSql(b.title)},
      ${quoteSql(slug)},
      ${quoteSql(excerpt)},
      ${quoteSql(cleanContent)},
      '/valeurs/bg.jpg',
      'PUBLIE',
      '${publishedAt}'::timestamptz,
      '${creator}'::uuid,
      'Reprise initiale des articles historiques'
    )
    on conflict (slug) do update set
      title = excluded.title,
      content = excluded.content,
      excerpt = excluded.excerpt,
      status = 'PUBLIE',
      academic_year_id = excluded.academic_year_id,
      published_at = excluded.published_at;
  `;
  remoteQuery(sql);
}

const count = remoteQuery(`select count(*) c from escen.website_articles where academic_year_id='${activeYear}';`)[0]?.c;
console.log(`Total articles dans website_articles pour l'année active : ${count}`);
