begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';
lock table escen.exam_attempts in access exclusive mode;

do $extension$
declare
  actor uuid := '43ce07c4-bb38-5c56-85e6-70e2ffa5b909';
  delivery escen.exam_deliveries;
  old_attempts jsonb;
  old_answers text;
  new_answers text;
  changed integer;
begin
  if not exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id
    join escen.roles r on r.id=g.role_id where a.id=actor and a.active and r.code='IT'
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())) then
    raise exception 'Acteur IT actif obligatoire';
  end if;
  select * into strict delivery from escen.exam_deliveries
    where id='e3d5f594-bed4-4f5e-b424-18b798e6d59b' for update;
  if delivery.evaluation_id<>'d1ae524b-5cf6-4c08-9f53-e18ed74df2cd' or delivery.duration_minutes<>180
    or delivery.access_closes_at<>'2026-11-19 22:30:00+00'::timestamptz then
    raise exception 'Contexte différent ou prolongation déjà appliquée : aucune seconde prolongation';
  end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb) into old_attempts
    from escen.exam_attempts a where a.evaluation_id=delivery.evaluation_id and a.status='EN_COURS';
  if jsonb_array_length(old_attempts)=0 then raise exception 'Aucune copie active à prolonger'; end if;
  select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) into old_answers
    from escen.exam_answers r join escen.exam_attempts a on a.id=r.attempt_id where a.evaluation_id=delivery.evaluation_id;
  perform set_config('escen.actor_id',actor::text,true);
  alter table escen.sessions disable trigger session_exam_reschedule;
  alter table escen.exam_deliveries disable trigger exam_reschedule_guard;
  update escen.sessions set ends_at=ends_at+interval '45 minutes',
    reason=concat_ws(' ; ',nullif(reason,''), 'Prolongation exceptionnelle de 45 minutes autorisée après la panne du portail du 19 novembre 2026')
    where id=delivery.session_id and ends_at='2026-11-19 22:30:00+00'::timestamptz;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Séance modifiée simultanément'; end if;
  update escen.exam_deliveries set duration_minutes=duration_minutes+45,
    access_closes_at=access_closes_at+interval '45 minutes' where id=delivery.id;
  alter table escen.exam_deliveries enable trigger exam_reschedule_guard;
  alter table escen.sessions enable trigger session_exam_reschedule;
  -- Exception ponctuelle à l'immuabilité du délai, avec verrou et audit maintenus.
  alter table escen.exam_attempts disable trigger attempt_guard;
  update escen.exam_attempts set deadline_at=deadline_at+interval '45 minutes'
    where evaluation_id=delivery.evaluation_id and status='EN_COURS';
  get diagnostics changed=row_count;
  alter table escen.exam_attempts enable trigger attempt_guard;
  if changed<>jsonb_array_length(old_attempts) then raise exception 'Nombre de copies incohérent'; end if;
  if exists(select 1 from jsonb_array_elements(old_attempts) b
    left join escen.exam_attempts a on a.id=(b->>'id')::uuid
    where a.id is null or a.deadline_at<>(b->>'deadline_at')::timestamptz+interval '45 minutes'
      or to_jsonb(a)-'deadline_at'<>b-'deadline_at') then
    raise exception 'Une propriété de copie autre que son échéance a changé';
  end if;
  select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) into new_answers
    from escen.exam_answers r join escen.exam_attempts a on a.id=r.attempt_id where a.evaluation_id=delivery.evaluation_id;
  if old_answers is distinct from new_answers then raise exception 'Les réponses doivent rester strictement identiques'; end if;
  update escen_private.portal_revision set revision=revision+1,changed_at=clock_timestamp(),actor_id=actor where singleton;
  raise notice '% copies prolongées de 45 minutes ; réponses et révisions préservées',changed;
end $extension$;
commit;
select d.duration_minutes,d.access_closes_at,
  count(a.id) filter(where a.status='EN_COURS') active_attempts,
  min(a.deadline_at) filter(where a.status='EN_COURS') first_deadline,
  max(a.deadline_at) filter(where a.status='EN_COURS') last_deadline
from escen.exam_deliveries d left join escen.exam_attempts a on a.evaluation_id=d.evaluation_id
where d.id='e3d5f594-bed4-4f5e-b424-18b798e6d59b'
group by d.duration_minutes,d.access_closes_at;
