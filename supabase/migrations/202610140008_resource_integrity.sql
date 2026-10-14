begin;
create function escen_private.guard_additional_room_conflicts() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.status not in ('ANNULE','REPORTE') and exists (
    select 1 from escen.exam_rooms r join escen.exam_deliveries d on d.id = r.delivery_id join escen.sessions s on s.id = d.session_id
      where d.session_id <> new.id and s.status not in ('ANNULE','REPORTE') and r.room_id = coalesce(new.actual_room_id,new.room_id)
        and d.access_opens_at < new.ends_at and new.starts_at < d.access_closes_at) then
    raise exception 'Conflit avec une salle secondaire d’examen' using errcode = '23514';
  end if;
  if new.status in ('ANNULE','REPORTE') and exists (
    select 1 from escen.exam_deliveries d where d.session_id = new.id and (
      exists (select 1 from escen.exam_attempts a where a.evaluation_id = d.evaluation_id) or
      exists (select 1 from escen.evaluation_candidates c join escen.grades g on g.candidate_id = c.id
        where c.evaluation_id = d.evaluation_id and (g.value is not null or g.absence_status is not null)))) then
    raise exception 'Séance d’examen avec copies ou résultats conservée' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger session_secondary_room_guard before insert or update on escen.sessions for each row execute function escen_private.guard_additional_room_conflicts();
create function escen_private.guard_blocked_period() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if exists (select 1 from escen.sessions s join escen.academic_offerings o on o.id = s.offering_id
    where s.status not in ('ANNULE','REPORTE') and s.starts_at < new.ends_at and new.starts_at < s.ends_at
      and (new.site_id is null or new.site_id = o.site_id) and (new.academic_year_id is null or new.academic_year_id = o.academic_year_id)) then
    raise exception 'Traiter les séances existantes avant de bloquer la période' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger blocked_period_guard before insert or update on escen.blocked_periods for each row execute function escen_private.guard_blocked_period();
create function escen_private.guard_paper_options() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.status = 'AUTORISE' and old.status = 'BROUILLON' and exists (
    select 1 from escen.exam_questions q where q.paper_id = new.id and q.kind in ('QCM_SIMPLE','QCM_MULTIPLE')
      and ((select count(*) from escen.exam_options where question_id = q.id) < 2
        or (q.kind = 'QCM_SIMPLE' and (select count(*) from escen.exam_options where question_id = q.id and is_correct) <> 1)
        or (q.kind = 'QCM_MULTIPLE' and not exists (select 1 from escen.exam_options where question_id = q.id and is_correct)))) then
    raise exception 'Options ou corrigé du QCM incomplets' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger paper_option_guard before update on escen.exam_papers for each row execute function escen_private.guard_paper_options();

create function escen_private.guard_supervisor_conflict() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare start_time timestamptz; end_time timestamptz; own_session uuid;
begin
  -- Le verrou de compte sérialise les affectations concurrentes du surveillant.
  perform 1 from escen.accounts where id = new.account_id for update;
  if tg_table_name = 'session_supervisors' then own_session := new.session_id;
  else select d.session_id into own_session from escen.exam_rooms r join escen.exam_deliveries d on d.id = r.delivery_id where r.id = new.exam_room_id; end if;
  select starts_at,ends_at into start_time,end_time from escen.sessions where id = own_session;
  if exists (select 1 from escen.session_supervisors a join escen.sessions s on s.id = a.session_id
    where a.account_id = new.account_id and a.session_id <> own_session and s.status not in ('ANNULE','REPORTE')
      and s.starts_at < end_time and start_time < s.ends_at)
    or exists (select 1 from escen.exam_room_supervisors a join escen.exam_rooms r on r.id = a.exam_room_id
      join escen.exam_deliveries d on d.id = r.delivery_id join escen.sessions s on s.id = d.session_id
      where a.account_id = new.account_id and d.session_id <> own_session and s.status not in ('ANNULE','REPORTE')
        and s.starts_at < end_time and start_time < s.ends_at) then
    raise exception 'Surveillant déjà affecté sur ce créneau' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger session_supervisor_guard before insert or update on escen.session_supervisors for each row execute function escen_private.guard_supervisor_conflict();
create trigger room_supervisor_guard before insert or update on escen.exam_room_supervisors for each row execute function escen_private.guard_supervisor_conflict();
revoke all on all functions in schema escen_private from public;
commit;
