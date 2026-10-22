const summaries = {
  '/': ['ESCEN — Commerce et économie numérique à Lomé, Togo', 'Découvrez l’ESCEN à Lomé : licences professionnelles, masters professionnels et Executive Masters en commerce et économie numérique.'],
  '/formations': ['Formations en commerce et numérique à Lomé | ESCEN', 'Comparez les licences professionnelles, masters professionnels et Executive Masters de l’ESCEN : programmes, compétences et débouchés à Lomé, au Togo.'],
  '/formations/licence-professionnelle': ['Licences professionnelles à Lomé, Togo | ESCEN', 'Découvrez les licences professionnelles de l’ESCEN : finance digitale, marketing digital, projets numériques et intelligence artificielle et génie logiciel.'],
  '/formations/master-professionnel': ['Masters professionnels à Lomé, Togo | ESCEN', 'Consultez les masters professionnels de l’ESCEN en finance digitale, marketing digital et management de projets : programmes et candidature.'],
  '/formations/executive-education': ['Executive Masters pour professionnels | ESCEN Togo', 'Consultez les Executive Masters de l’ESCEN en finance digitale et management de projets et transformation digitale, destinés aux professionnels.'],
  '/formations/certificats': ['Certificats et formations courtes | ESCEN Togo', 'Consultez les informations sur les certificats et formations courtes de l’ESCEN. Contactez l’école pour connaître les sessions et conditions disponibles.'],
  '/brochures': ['Brochures des formations ESCEN | Programmes PDF', 'Téléchargez les brochures publiées par l’ESCEN : programmes de licence, master et Executive Master, classés par formation et cycle.'],
  '/blogs': ['Actualités et vie de l’école | ESCEN Togo', 'Retrouvez les actualités publiées par l’ESCEN : événements, vie de l’école et échanges autour du commerce et de l’économie numérique au Togo.'],
  '/contact': ['Contacter l’ESCEN à Lomé | Téléphone et adresse', 'Contactez l’ESCEN à Lomé au +228 98 01 27 27 ou à hello@escen.university pour vous renseigner sur les formations et la candidature.'],
  '/inscription': ['Candidature en ligne à l’ESCEN | Déposer un dossier', 'Préparez et déposez votre candidature à l’ESCEN : identité, dernier diplôme, formation et pièces justificatives, puis coordonnées des tuteurs et confirmation.'],
  '/connexion': ['Connexion au portail ESCEN', 'Accédez au portail sécurisé de l’ESCEN avec votre compte pour consulter votre espace et vos documents.'],
  '/galerie': ['Galerie de l’école | ESCEN Togo', 'Découvrez les albums et photographies de la vie de l’ESCEN, de ses événements et de ses activités.'],
  '/mentions-legales': ['Mentions légales | ESCEN', 'Consultez les mentions légales du site de l’ESCEN et les informations relatives à son édition et à son utilisation.'],
  '/confidentialite': ['Protection des données personnelles | ESCEN', 'Consultez la politique de confidentialité de l’ESCEN et les informations relatives au traitement des données personnelles sur le site.'],
  '/politique-cookies': ['Politique des cookies | ESCEN', 'Consultez les informations sur les cookies du site de l’ESCEN et la gestion de vos préférences.'],
  '/cgu': ['Conditions générales d’utilisation | ESCEN', 'Consultez les conditions générales d’utilisation du site de l’ESCEN et de ses services en ligne.'],
  '/preparation-inscription': ['Préparer son dossier de candidature | ESCEN', 'Consultez les informations de préparation du dossier avant de commencer votre candidature en ligne à l’ESCEN.'],
};

export function cleanText(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\{\{[\s\S]*?\}\}/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function websitePageMetadata(route, source, name) {
  const course = /^\/formations\/[^/]+\/[^/]+$/.test(route);
  const breadcrumb = source.match(/<Breadcrumb\b[\s\S]*?\/>/)?.[0] || '';
  const attribute = key => cleanText(breadcrumb.match(new RegExp(`\\b${key}="([^"]+)"`))?.[1]);
  const summary = summaries[route];
  const duration = attribute('duration');
  const years = duration.match(/(\d+)\s*ans?\b/);
  const months = duration.match(/(\d+)\s*mois\b/);
  return {
    name: name || (route === '/' ? 'ESCEN' : summary?.[0]?.split(' | ')[0] || 'ESCEN'),
    title: summary?.[0] || `${name} à Lomé, Togo | ESCEN`,
    description: summary?.[1] || (course ? `${name} à l’ESCEN, à Lomé au Togo. ${attribute('description') || 'Consultez le programme, les compétences et les modalités de candidature.'}` : `${name} : informations et services de l’ESCEN à Lomé, au Togo.`),
    image: attribute('backgroundImage') || '/logo-escen.png',
    type: course ? 'course' : route === '/contact' ? 'contact' : route === '/formations' || /^\/formations\/[^/]+$/.test(route) || ['/blogs', '/brochures', '/galerie'].includes(route) ? 'collection' : 'page',
    ...(course && (years || months) ? { timeRequired: years ? `P${years[1]}Y` : `P${months[1]}M` } : {}),
  };
}
