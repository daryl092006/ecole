BEGIN;

-- 1. Permettre la personnalisation et l'antidatage de la date de publication dans la RPC
CREATE OR REPLACE FUNCTION public.escen_website_manage_before_annual_scope(
  p_actor_id uuid,
  p_role_code text,
  p_action text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  can_read boolean;
  can_write boolean;
  articles boolean;
  previous escen.website_articles;
  intake escen.website_intakes;
  application escen.online_applications;
  target uuid;
  result jsonb;
  v_year uuid;
BEGIN
  articles := p_action LIKE 'article%';

  SELECT exists(
    SELECT 1 FROM escen.accounts a
    JOIN escen.role_grants g ON g.account_id = a.id
    JOIN escen.roles r ON r.id = g.role_id
    JOIN escen.role_permissions rp ON rp.role_id = r.id
    JOIN escen.permissions p ON p.id = rp.permission_id
    WHERE a.id = p_actor_id AND a.active AND a.archived_at IS NULL AND a.auth_user_id IS NOT NULL
      AND r.active AND r.code = p_role_code
      AND g.valid_from <= now() AND (g.valid_until IS NULL OR g.valid_until > now())
      AND g.site_id IS NULL AND g.group_id IS NULL AND g.academic_year_id IS NULL
      AND p.code = CASE WHEN articles THEN 'communication.view' ELSE 'student.view' END
      AND (articles OR r.code IN ('DG', 'DGA', 'DA', 'LOG', 'RAF', 'MKT', 'CC', 'IT'))
  ) INTO can_read;

  SELECT exists(
    SELECT 1 FROM escen.role_grants g
    JOIN escen.roles r ON r.id = g.role_id
    JOIN escen.role_permissions rp ON rp.role_id = r.id
    JOIN escen.permissions p ON p.id = rp.permission_id
    WHERE g.account_id = p_actor_id
      AND r.active AND r.code = p_role_code
      AND g.valid_from <= now() AND (g.valid_until IS NULL OR g.valid_until > now())
      AND g.site_id IS NULL AND g.group_id IS NULL AND g.academic_year_id IS NULL
      AND (
        (articles AND p.code = 'communication.manage')
        OR (NOT articles AND p.code = 'student.lifecycle.manage')
        OR (NOT articles AND r.code IN ('MKT', 'CC') AND p.code = 'communication.manage')
      )
  ) INTO can_write;

  IF NOT can_read THEN RAISE EXCEPTION 'Accès refusé' USING errcode = '42501'; END IF;

  IF p_action = 'articles' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY updated_at DESC) FROM escen.website_articles t), '[]');
  END IF;

  IF p_action = 'admissions' THEN
    RETURN jsonb_build_object(
      'applications', coalesce((SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object('intake_label', i.label, 'documents', coalesce((SELECT jsonb_agg(to_jsonb(d) - 'bucket' - 'object_path' - 'sha256') FROM escen.application_documents d WHERE d.application_id = a.id), '[]')) ORDER BY a.created_at DESC) FROM escen.online_applications a LEFT JOIN escen.website_intakes i ON i.id = a.intake_id WHERE a.status <> 'BROUILLON'), '[]'),
      'intakes', coalesce((SELECT jsonb_agg(to_jsonb(i) || jsonb_build_object('level_name', l.name, 'program_name', p.name)) FROM escen.website_intakes i JOIN escen.levels l ON l.id = i.level_id JOIN escen.programs p ON p.id = i.program_id), '[]'),
      'years', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'status', status)) FROM escen.academic_years WHERE archived_at IS NULL), '[]'),
      'currentYearId', (SELECT academic_year_id FROM escen.academic_working_year WHERE singleton),
      'levels', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM escen.levels WHERE archived_at IS NULL), '[]'),
      'programs', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM escen.programs WHERE archived_at IS NULL), '[]')
    );
  END IF;

  IF p_action = 'document' THEN
    SELECT to_jsonb(d) || jsonb_build_object('academic_year_id', a.academic_year_id) INTO result
    FROM escen.application_documents d
    JOIN escen.online_applications a ON a.id = d.application_id
    WHERE d.id = (p_data->>'id')::uuid AND a.status <> 'BROUILLON';
    RETURN result;
  END IF;

  IF NOT can_write OR (p_action <> 'article-save' AND length(btrim(coalesce(p_data->>'reason', ''))) < 3) THEN
    RAISE EXCEPTION 'Droits ou motif insuffisants' USING errcode = '42501';
  END IF;

  PERFORM set_config('escen.actor_id', p_actor_id::text, true);
  target := coalesce((p_data->>'id')::uuid, gen_random_uuid());

  IF p_action = 'article-save' THEN
    SELECT * INTO previous FROM escen.website_articles WHERE id = target FOR UPDATE;
    IF previous.id IS NOT NULL AND previous.version <> (p_data->>'version')::integer THEN
      RAISE EXCEPTION 'Modification concurrente' USING errcode = 'PT409';
    END IF;
    IF p_data ? 'id' AND previous.id IS NULL THEN
      RAISE EXCEPTION 'Article absent' USING errcode = 'P0002';
    END IF;

    v_year := coalesce(
      previous.academic_year_id,
      nullif(p_data->>'academic_year_id', '')::uuid,
      nullif(current_setting('escen.selected_year', true), '')::uuid,
      (SELECT academic_year_id FROM escen.academic_working_year WHERE singleton),
      (SELECT id FROM escen.academic_years WHERE archived_at IS NULL ORDER BY starts_on DESC LIMIT 1)
    );

    IF v_year IS NOT NULL THEN
      PERFORM set_config('escen.selected_year', v_year::text, true);
    END IF;

    INSERT INTO escen.website_articles(id, academic_year_id, title, slug, excerpt, content, image, status, created_by, published_at)
    VALUES(
      target,
      v_year,
      p_data->>'title',
      p_data->>'slug',
      p_data->>'excerpt',
      p_data->>'content',
      p_data->>'image',
      p_data->>'status',
      p_actor_id,
      CASE
        WHEN p_data->>'status' = 'PUBLIE' THEN coalesce(nullif(p_data->>'published_at', '')::timestamptz, now())
      END
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      excerpt = excluded.excerpt,
      content = excluded.content,
      image = excluded.image,
      status = excluded.status,
      version = escen.website_articles.version + 1,
      published_at = CASE
        WHEN excluded.status = 'PUBLIE' THEN coalesce(nullif(p_data->>'published_at', '')::timestamptz, escen.website_articles.published_at, now())
        ELSE escen.website_articles.published_at
      END,
      updated_at = now();

  ELSIF p_action = 'intake-save' THEN
    IF NOT exists(
      SELECT 1 FROM escen.academic_years
      WHERE id = (p_data->>'academic_year_id')::uuid
        AND archived_at IS NULL
        AND (NOT (p_data->>'active')::boolean OR status = 'OUVERTE')
    ) THEN
      RAISE EXCEPTION 'Année de campagne absente ou non ouverte' USING errcode = '23514';
    END IF;

    IF NOT exists(SELECT 1 FROM escen.levels WHERE id = (p_data->>'level_id')::uuid AND archived_at IS NULL)
      OR NOT exists(SELECT 1 FROM escen.programs WHERE id = (p_data->>'program_id')::uuid AND archived_at IS NULL) THEN
      RAISE EXCEPTION 'Référence archivée ou absente' USING errcode = '23514';
    END IF;

    SELECT * INTO intake FROM escen.website_intakes WHERE id = target FOR UPDATE;
    IF p_data ? 'id' AND (intake.id IS NULL OR intake.version <> (p_data->>'version')::integer) THEN
      RAISE EXCEPTION 'Modification concurrente' USING errcode = 'PT409';
    END IF;
    IF intake.id IS NOT NULL AND (intake.level_id <> (p_data->>'level_id')::uuid OR intake.program_id <> (p_data->>'program_id')::uuid) THEN
      RAISE EXCEPTION 'Les références de la formation sont figées' USING errcode = '23514';
    END IF;

    INSERT INTO escen.website_intakes(id, academic_year_id, level_id, program_id, label, active, required_documents, reason)
    VALUES(target, (p_data->>'academic_year_id')::uuid, (p_data->>'level_id')::uuid, (p_data->>'program_id')::uuid, p_data->>'label', (p_data->>'active')::boolean, p_data->'required_documents', p_data->>'reason')
    ON CONFLICT(id) DO UPDATE SET
      academic_year_id = excluded.academic_year_id,
      label = excluded.label,
      active = excluded.active,
      required_documents = excluded.required_documents,
      version = escen.website_intakes.version + 1,
      reason = excluded.reason;

  ELSIF p_action = 'application-status' THEN
    SELECT * INTO application FROM escen.online_applications WHERE id = target FOR UPDATE;
    IF application.id IS NULL OR application.status = 'BROUILLON' THEN
      RAISE EXCEPTION 'Dossier absent' USING errcode = 'P0002';
    END IF;
    IF application.version <> (p_data->>'version')::integer THEN
      RAISE EXCEPTION 'Modification concurrente' USING errcode = 'PT409';
    END IF;
    IF p_data->>'status' NOT IN ('EN_ANALYSE', 'CLASSE', 'RECU') THEN
      RAISE EXCEPTION 'Statut invalide' USING errcode = '23514';
    END IF;

    UPDATE escen.online_applications
    SET status = p_data->>'status', version = version + 1, reason = p_data->>'reason'
    WHERE id = target;
  ELSE
    RAISE EXCEPTION 'Commande inconnue' USING errcode = '42501';
  END IF;

  RETURN jsonb_build_object('id', target);
END;
$function$;

-- 2. Insertion des deux articles officiels antidatés
DO $$
DECLARE
  v_author_id uuid;
  v_year_2025 uuid;
BEGIN
  SELECT id INTO v_author_id FROM escen.accounts WHERE active AND archived_at IS NULL LIMIT 1;
  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id FROM escen.accounts LIMIT 1;
  END IF;

  SELECT id INTO v_year_2025
  FROM escen.academic_years
  WHERE (code = '2025-2026' OR name = '2025-2026' OR code = '2024-2025' OR name = '2024-2025')
    AND archived_at IS NULL
  ORDER BY starts_on DESC
  LIMIT 1;

  IF v_year_2025 IS NULL THEN
    SELECT academic_year_id INTO v_year_2025 FROM escen.academic_working_year WHERE singleton;
  END IF;

  IF v_year_2025 IS NULL THEN
    SELECT id INTO v_year_2025 FROM escen.academic_years WHERE archived_at IS NULL ORDER BY starts_on DESC LIMIT 1;
  END IF;

  IF v_author_id IS NOT NULL AND v_year_2025 IS NOT NULL THEN
    PERFORM set_config('escen.selected_year', v_year_2025::text, true);

    -- Article 1 : Partenariat PMI Togo Chapter (29 septembre 2025)
    INSERT INTO escen.website_articles(
      id, academic_year_id, title, slug, excerpt, content, image, status, created_by, published_at
    )
    VALUES (
      '11111111-1111-4111-8111-000000000001'::uuid,
      v_year_2025,
      'ESCEN et PMI Togo Chapter : un partenariat pour renforcer l’employabilité des étudiants',
      'escen-et-pmi-togo-chapter-partenariat-employabilite-etudiants',
      'Dans sa volonté de proposer une formation supérieure en phase avec les exigences du monde professionnel, l’ESCEN a conclu le 27 septembre 2025 un partenariat avec le PMI Togo Chapter, représentation togolaise du Project Management Institute.',
      'ESCEN_ARTICLE_V1' || E'\n' || '{"blocks":[{"type":"paragraph","content":[{"text":"Dans sa volonté de proposer une formation supérieure en phase avec les exigences du monde professionnel, l’École Supérieure de Commerce et d’Économie Numérique (ESCEN) a conclu, le 27 septembre 2025, un partenariat avec le "},{"text":"PMI Togo Chapter","href":"https://pmi-togo.org/"},{"text":", représentation togolaise du "},{"text":"Project Management Institute","href":"https://www.pmi.org/"},{"text":" (PMI), organisation internationale de référence en management de projet."}]},{"type":"paragraph","content":[{"text":"Cette collaboration officialisée lors de la Conférence Annuelle 2025 du Chapitre Togo vise principalement à renforcer l’enseignement de la gestion de projet au sein de l''ESCEN, à travers un Club Etudiant PMI et des formations adaptées aux réalités académiques et professionnelles."}]},{"type":"paragraph","content":[{"text":"Elle ouvre également aux étudiants des opportunités de préparation aux certifications internationales du PMI, notamment la CAPM® (Certified Associate in Project Management), qui valide les fondamentaux du management de projet."}]},{"type":"paragraph","content":[{"text":"Un autre enjeu important de ce partenariat est de rendre ces certifications plus accessibles aux apprenants, grâce à des conditions financières préférentielles sur les dispositifs concernés."}]},{"type":"paragraph","content":[{"text":"À travers cette initiative, ESCEN entend aller au-delà de la formation académique en donnant à ses étudiants des outils supplémentaires pour valoriser leurs compétences et renforcer leur employabilité."}]},{"type":"paragraph","content":[{"text":"Cette démarche s’inscrit pleinement dans la vision de l’école : former des professionnels capables de répondre aux enjeux du numérique et aux transformations des organisations."}]},{"type":"paragraph","content":[{"text":"Elle trouve notamment son prolongement dans les parcours de Management de Projets Numériques offerts par l’école, qui préparent les apprenants à structurer, gérer, suivre et évaluer des projets dans divers environnements professionnels."}]}]}',
      '/actualites/escen-partenariat-pmi-togo.jpg',
      'PUBLIE',
      v_author_id,
      '2025-09-29 10:00:00+00'::timestamptz
    )
    ON CONFLICT (slug) DO UPDATE SET
      academic_year_id = excluded.academic_year_id,
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      image = excluded.image,
      status = excluded.status,
      published_at = excluded.published_at,
      updated_at = now();

    -- Article 2 : Audience Ministère Enseignement Supérieur (25 mars 2025)
    INSERT INTO escen.website_articles(
      id, academic_year_id, title, slug, excerpt, content, image, status, created_by, published_at
    )
    VALUES (
      '11111111-1111-4111-8111-000000000002'::uuid,
      v_year_2025,
      'ESCEN reçue par le Ministère de l’Enseignement Supérieur et de la Recherche',
      'escen-recue-par-le-ministere-de-l-enseignement-superieur-et-de-la-recherche',
      'L’École Supérieure de Commerce et d’Économie Numérique (ESCEN) a été reçue en audience par le Ministre de l’Enseignement Supérieur et de la Recherche, M. Kanka-Malik Natchaba, pour échanger autour des enjeux de l’éducation numérique.',
      'ESCEN_ARTICLE_V1' || E'\n' || '{"blocks":[{"type":"paragraph","content":[{"text":"L’École Supérieure de Commerce et d’Économie Numérique (ESCEN) a été reçue en audience par le Ministre de l’Enseignement Supérieur et de la Recherche, M. Kanka-Malik Natchaba. Cette rencontre a permis d’engager des échanges autour des enjeux de l’éducation numérique et des perspectives de collaboration entre les deux parties."}]},{"type":"paragraph","content":[{"text":"Au cours de cette audience, la délégation de l’ESCEN a eu l’occasion de présenter sa vision et d’évoquer les opportunités offertes par le numérique pour faire évoluer les pratiques de formation et accompagner le développement des compétences. Les discussions ont également permis d’explorer des pistes de partenariat susceptibles de contribuer au renforcement de l’écosystème éducatif et numérique togolais."}]},{"type":"paragraph","content":[{"text":"L’ESCEN adresse ses sincères remerciements au Ministre pour son accueil, la qualité des échanges ainsi que les orientations et conseils partagés à cette occasion. Ces recommandations constituent des repères importants pour la poursuite de ses initiatives."}]},{"type":"paragraph","content":[{"text":"Cette audience s’inscrit dans la volonté de l’ESCEN de travailler en synergie avec les acteurs institutionnels et les parties prenantes de l’écosystème, afin de promouvoir un enseignement supérieur en phase avec les mutations économiques et technologiques."}]},{"type":"paragraph","content":[{"text":"Former les compétences d’aujourd’hui et préparer les talents de demain : une ambition qui nécessite un dialogue continu entre les institutions et les acteurs de l’éducation."}]}]}',
      '/actualites/escen-audience-ministre-enseignement-superieur.jpg',
      'PUBLIE',
      v_author_id,
      '2025-03-25 10:00:00+00'::timestamptz
    )
    ON CONFLICT (slug) DO UPDATE SET
      academic_year_id = excluded.academic_year_id,
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      image = excluded.image,
      status = excluded.status,
      published_at = excluded.published_at,
      updated_at = now();
  END IF;

END $$;

COMMIT;
