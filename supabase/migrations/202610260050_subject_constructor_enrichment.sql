-- Migration 202610260050_subject_constructor_enrichment.sql
-- Enrichissement du constructeur d'épreuves : étude de cas, types de présentation et justification QCM
-- RLS et intégrité préservées, aucun corrigé exposé aux étudiants.

begin;

create or replace function escen_private.exam_attempt_view(p_attempt_id uuid) returns jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object(
    'serverNow', clock_timestamp(),
    'attempt', jsonb_build_object('id', a.id, 'evaluationId', a.evaluation_id, 'paperId', a.paper_id,
      'status', a.status, 'revision', a.revision, 'lastSaveId', a.last_save_id, 'startedAt', a.started_at,
      'deadlineAt', a.deadline_at, 'submittedAt', a.submitted_at, 'submissionKind', a.submission_kind,
      'completionStatus', a.completion_status),
    'paper', jsonb_build_object('id', a.paper_id, 'title', e.name, 'parts', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'instructions', p.instructions, 'caseStudy', coalesce(p.context->'caseStudy', 'false'::jsonb),
        'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'prompt', q.prompt, 'points', q.points,
          'presentation', q.configuration->>'presentation',
          'requiresJustification', coalesce(q.configuration->'requiresJustification', 'false'::jsonb),
          'options', coalesce((select jsonb_agg(jsonb_build_object('id', opt.id, 'label', opt.label) order by opt.position)
            from escen.exam_options opt where opt.question_id = q.id), '[]'::jsonb)) order by q.position)
          from escen.exam_questions q where q.part_id = p.id and q.paper_id = a.paper_id), '[]'::jsonb)) order by p.position)
      from escen.exam_parts p where p.paper_id = a.paper_id), '[]'::jsonb)),
    'answers', coalesce((select jsonb_object_agg(r.question_id::text, r.response) from escen.exam_answers r where r.attempt_id = a.id), '{}'::jsonb),
    'lastSavedAt', (select max(saved_at) from escen.exam_answers where attempt_id = a.id)
  ) from escen.exam_attempts a join escen.evaluations e on e.id = a.evaluation_id where a.id = p_attempt_id;
$$;

create or replace function public.escen_online_exam(
  p_actor_id uuid, p_role_code text, p_action text, p_year_id uuid default null,
  p_evaluation_id uuid default null, p_attempt_id uuid default null,
  p_expected_revision bigint default null, p_save_id uuid default null, p_answers jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare v_student_id uuid; candidate escen.evaluation_candidates; attempt escen.exam_attempts; v_paper_id uuid;
  evaluation escen.evaluations; offering escen.academic_offerings; assignment escen.teaching_assignments;
  answer jsonb; question escen.exam_questions; response jsonb; option_id jsonb; previous_actor text; directory jsonb;
begin
  if not exists (select 1 from escen.accounts a join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
      and r.active and r.code = p_role_code and p.code = 'exam.take'
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())) then
    raise exception 'Permission de passage d’épreuve requise' using errcode = '42501';
  end if;
  select s.id into v_student_id from escen.students s join escen.accounts a on a.person_id = s.person_id where a.id = p_actor_id;
  if p_action not in ('list', 'start', 'read', 'save', 'submit') or p_action is null then
    raise exception 'Action d’épreuve inconnue' using errcode = '23514';
  end if;
  if v_student_id is null then
    if p_action = 'list' then return jsonb_build_object('serverNow', clock_timestamp(), 'exams', '[]'::jsonb); end if;
    raise exception 'Profil étudiant personnel requis' using errcode = '42501';
  end if;
  perform escen_private.expire_exam_attempts(p_evaluation_id, v_student_id);
  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object('evaluationId', e.id, 'name', e.name, 'kind', e.kind,
      'opensAt', d.access_opens_at, 'closesAt', d.access_closes_at, 'durationMinutes', d.duration_minutes,
      'attemptId', a.id, 'status', a.status, 'deadlineAt', a.deadline_at, 'submittedAt', a.submitted_at,
      'completionStatus', a.completion_status) order by d.access_opens_at), '[]'::jsonb) into directory
    from escen.evaluation_candidates c join escen.enrollments n on n.id = c.enrollment_id
    join escen.academic_offerings o on o.id = n.offering_id join escen.evaluations e on e.id = c.evaluation_id
    join escen.teaching_assignments t on t.id = e.assignment_id
    join escen.exam_deliveries d on d.evaluation_id = e.id
    left join lateral (select * from escen.exam_attempts x where x.candidate_id = c.id order by x.attempt_number desc limit 1) a on true
    where n.student_id = v_student_id and (p_year_id is null or o.academic_year_id = p_year_id)
      and e.cancelled_at is null and (a.id is not null or (c.eligibility = 'ELIGIBLE' and n.status in ('INSCRIT', 'REINSCRIT')
        and exists (select 1 from escen.exam_papers p where p.evaluation_id = e.id and p.status = 'AUTORISE')))
      and exists (select 1 from escen.role_grants g join escen.roles r on r.id = g.role_id
        where g.account_id = p_actor_id and r.code = p_role_code and r.active
          and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
          and (g.site_id is null or g.site_id = o.site_id) and (g.academic_year_id is null or g.academic_year_id = o.academic_year_id)
          and (g.group_id is null or g.group_id = t.group_id));
    return jsonb_build_object('serverNow', clock_timestamp(), 'exams', directory);
  end if;

  if p_action = 'start' then
    select c.* into candidate from escen.evaluation_candidates c join escen.enrollments n on n.id = c.enrollment_id
      where c.evaluation_id = p_evaluation_id and n.student_id = v_student_id for update of c;
  else
    select c.* into candidate from escen.evaluation_candidates c join escen.enrollments n on n.id = c.enrollment_id
      join escen.exam_attempts a on a.candidate_id = c.id where a.id = p_attempt_id and n.student_id = v_student_id;
  end if;
  if candidate.id is null then raise exception 'Copie personnelle introuvable' using errcode = '42501'; end if;
  select * into evaluation from escen.evaluations where id = candidate.evaluation_id;
  select * into offering from escen.academic_offerings where id = candidate.offering_id;
  select * into assignment from escen.teaching_assignments where id = evaluation.assignment_id;
  if not exists (select 1 from escen.role_grants g join escen.roles r on r.id = g.role_id
    where g.account_id = p_actor_id and r.code = p_role_code and r.active
      and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
      and (g.site_id is null or g.site_id = offering.site_id) and (g.academic_year_id is null or g.academic_year_id = offering.academic_year_id)
      and (g.group_id is null or g.group_id = assignment.group_id)) then
    raise exception 'Épreuve hors du périmètre autorisé' using errcode = '42501';
  end if;
  previous_actor := current_setting('escen.actor_id', true);
  perform set_config('escen.actor_id', p_actor_id::text, true);
  if p_action = 'start' then
    select * into attempt from escen.exam_attempts where candidate_id = candidate.id order by attempt_number desc limit 1 for update;
    if attempt.id is null then
      if candidate.eligibility <> 'ELIGIBLE' or not exists (select 1 from escen.enrollments
        where id = candidate.enrollment_id and status in ('INSCRIT', 'REINSCRIT')) then
        raise exception 'Inscription ou admissibilité incompatible avec le passage' using errcode = '23514';
      end if;
      select p.id into v_paper_id from escen.exam_papers p where p.evaluation_id = evaluation.id and p.status = 'AUTORISE' order by p.version desc limit 1;
      insert into escen.exam_attempts(candidate_id, evaluation_id, paper_id, attempt_number, started_at, deadline_at, status, started_by)
        values(candidate.id, evaluation.id, v_paper_id, 1, clock_timestamp(), clock_timestamp() + interval '1 second', 'EN_COURS', p_actor_id) returning * into attempt;
    end if;
  else select * into attempt from escen.exam_attempts where id = p_attempt_id for update;
  end if;
  if evaluation.cancelled_at is not null and attempt.status = 'EN_COURS' then
    update escen.exam_attempts set status = 'INTERROMPUE' where id = attempt.id returning * into attempt;
  end if;
  if attempt.status = 'EN_COURS' and clock_timestamp() >= attempt.deadline_at then
    perform set_config('escen.actor_id', '', true);
    update escen.exam_attempts set status = 'EXPIREE' where id = attempt.id returning * into attempt;
  end if;
  if p_action in ('save', 'submit') and attempt.status = 'EN_COURS' then
    if p_save_id is null or p_expected_revision is null then raise exception 'Révision et identifiant de sauvegarde requis' using errcode = '23514'; end if;
    if p_save_id = attempt.last_save_id and p_action = 'save' then
      perform set_config('escen.actor_id', coalesce(previous_actor, ''), true);
      return escen_private.exam_attempt_view(attempt.id) || jsonb_build_object('accepted', true);
    end if;
    if attempt.revision <> p_expected_revision then raise exception 'EXAM_CONCURRENT_UPDATE' using errcode = '40001'; end if;
    if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Réponses invalides' using errcode = '23514'; end if;
    if jsonb_array_length(p_answers) > 500 or (select count(distinct value->>'questionId') from jsonb_array_elements(p_answers)) <> jsonb_array_length(p_answers) then
      raise exception 'Questions dupliquées ou trop nombreuses' using errcode = '23514';
    end if;
    for answer in select value from jsonb_array_elements(p_answers) loop
      select * into question from escen.exam_questions where id = (answer->>'questionId')::uuid and paper_id = attempt.paper_id;
      response := answer->'response';
      if question.id is null or jsonb_typeof(response) is distinct from 'object'
        or (response - array['text','option_ids']) <> '{}'::jsonb
        or jsonb_typeof(response->'text') is distinct from 'string'
        or length(response->>'text') > 20000 or jsonb_typeof(response->'option_ids') is distinct from 'array' then
        raise exception 'Question ou format de réponse invalide' using errcode = '23514';
      end if;
      if question.kind in ('QCM_SIMPLE', 'QCM_MULTIPLE') then
        if (response->>'text' <> '' and coalesce(question.configuration->'requiresJustification', 'false'::jsonb) <> 'true'::jsonb) or (question.kind = 'QCM_SIMPLE' and jsonb_array_length(response->'option_ids') > 1) then
          raise exception 'Choix QCM invalide' using errcode = '23514';
        end if;
        for option_id in select value from jsonb_array_elements(response->'option_ids') loop
          if not exists (select 1 from escen.exam_options where id = (option_id #>> '{}')::uuid and question_id = question.id) then
            raise exception 'Choix hors de la question' using errcode = '23514';
          end if;
        end loop;
      elsif jsonb_array_length(response->'option_ids') > 0 then raise exception 'Réponse textuelle attendue' using errcode = '23514';
      end if;
      insert into escen.exam_answers(attempt_id, question_id, paper_id, response)
        values(attempt.id, question.id, attempt.paper_id, response)
        on conflict(attempt_id, question_id) do update set response = excluded.response;
    end loop;
    update escen.exam_attempts set last_save_id = p_save_id,
      status = case when p_action = 'submit' then 'REMISE' else 'EN_COURS' end
      where id = attempt.id returning * into attempt;
  end if;
  perform set_config('escen.actor_id', coalesce(previous_actor, ''), true);
  return escen_private.exam_attempt_view(attempt.id)
    || jsonb_build_object('accepted', p_action not in ('save', 'submit') or coalesce(attempt.last_save_id = p_save_id, false));
end $$;

create or replace function escen_private.guard_attempt() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare d escen.exam_deliveries; state text; eligible text; answered integer; completed integer; total integer;
begin
  if tg_op = 'UPDATE' then
    if old.status in ('REMISE', 'EXPIREE', 'INTERROMPUE') or
      (to_jsonb(new) - array['status','submitted_at','revision','last_save_id','submission_kind','completion_status'])
      <> (to_jsonb(old) - array['status','submitted_at','revision','last_save_id','submission_kind','completion_status']) then
      raise exception 'Contexte de tentative immuable' using errcode = '23514';
    end if;
    if new.status in ('REMISE', 'EXPIREE') then
      if new.status = 'EXPIREE' and clock_timestamp() < old.deadline_at then
        raise exception 'La tentative n’est pas encore expirée' using errcode = '23514';
      end if;
      new.status := case when clock_timestamp() >= old.deadline_at then 'EXPIREE' else 'REMISE' end;
      new.submitted_at := least(clock_timestamp(), old.deadline_at);
      new.submission_kind := case when new.status = 'EXPIREE' then 'AUTO_DEADLINE' else 'MANUAL' end;
      select count(*) into total from escen.exam_questions where paper_id = old.paper_id;
      select count(*) into answered from escen.exam_answers
        where attempt_id = old.id and escen_private.exam_response_has_content(response);
      select count(*) into completed from escen.exam_answers r
        join escen.exam_questions q on q.id = r.question_id and q.paper_id = old.paper_id
        where r.attempt_id = old.id and escen_private.exam_response_has_content(r.response)
          and (coalesce(q.configuration->'requiresJustification', 'false'::jsonb) <> 'true'::jsonb
            or (length(btrim(r.response->>'text')) > 0 and jsonb_array_length(r.response->'option_ids') > 0));
      new.completion_status := case when answered = 0 then 'NON_TRAITE' when completed < total then 'PARTIELLE' else 'COMPLETE' end;
    elsif new.status = 'EN_COURS' then
      if clock_timestamp() >= old.deadline_at then raise exception 'Copie remise ou expirée' using errcode = '23514'; end if;
      new.submitted_at := null; new.submission_kind := null; new.completion_status := null;
    elsif new.status = 'INTERROMPUE' then
      new.submitted_at := null; new.submission_kind := null; new.completion_status := null;
    else raise exception 'État de tentative interdit' using errcode = '23514';
    end if;
    new.revision := old.revision + 1;
    return new;
  end if;
  select * into d from escen.exam_deliveries where evaluation_id = new.evaluation_id;
  select status into state from escen.exam_papers where id = new.paper_id;
  select eligibility into eligible from escen.evaluation_candidates where id = new.candidate_id;
  new.started_at := clock_timestamp();
  new.deadline_at := least(d.access_closes_at, new.started_at + make_interval(mins => d.duration_minutes));
  new.revision := 0; new.last_save_id := null; new.submission_kind := null; new.completion_status := null;
  if d.id is null or state <> 'AUTORISE' or eligible <> 'ELIGIBLE' or new.started_at < d.access_opens_at
    or new.started_at >= d.access_closes_at or d.duration_minutes is null or new.status <> 'EN_COURS'
    or not exists (select 1 from escen.sessions where id = d.session_id and mode = 'EN_LIGNE' and status not in ('ANNULE','REPORTE'))
    or exists (select 1 from escen.evaluations where id = new.evaluation_id and cancelled_at is not null) then
    raise exception 'Tentative hors fenêtre, durée, sujet ou admissibilité' using errcode = '23514';
  end if;
  return new;
end $$;

commit;
