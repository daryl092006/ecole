-- PROPOSITION : ne pas appliquer à distance. À valider avant ajout aux migrations.
-- Retirer la capacité des salles et examens de la logique applicative.
-- Les colonnes historiques restent lisibles ; aucune donnée n’est supprimée.
-- Site et bâtiment sont déjà facultatifs depuis la migration 028.
begin;
alter table escen.rooms alter column capacity drop not null;
alter table escen.exam_rooms alter column assigned_capacity drop not null;

create or replace function escen_private.guard_session() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare a escen.teaching_assignments; room escen.rooms; session_site uuid;
begin
  select * into a from escen.teaching_assignments where id = new.assignment_id;
  if (new.starts_at at time zone 'Africa/Lome')::date < a.valid_from
    or (a.valid_until is not null and (new.ends_at at time zone 'Africa/Lome')::date > a.valid_until) then
    raise exception 'Séance hors de l’affectation' using errcode = '23514';
  end if;
  if new.series_id is not null and not exists (select 1 from escen.schedule_series where id = new.series_id and assignment_id = new.assignment_id) then
    raise exception 'Série incompatible avec l’affectation' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and exists (select 1 from escen.attendances where session_id = old.id) and
    (new.starts_at <> old.starts_at or new.ends_at <> old.ends_at or new.assignment_id <> old.assignment_id or new.status in ('ANNULE','REPORTE')) then
    raise exception 'Une séance émargée conserve son contexte' using errcode = '23514';
  end if;
  if new.status in ('ANNULE','REPORTE') then return new; end if;
  select site_id into session_site from escen.academic_offerings where id = new.offering_id;
  if exists (select 1 from escen.blocked_periods b where (b.site_id is null or b.site_id = session_site)
      and (b.academic_year_id is null or b.academic_year_id = (select academic_year_id from escen.academic_offerings where id = new.offering_id))
      and b.starts_at < new.ends_at and new.starts_at < b.ends_at) then
    raise exception 'Séance dans une période bloquée' using errcode = '23514';
  end if;
  if not exists (select 1 from escen.offering_semesters os join escen.curriculum_semesters cs on cs.id = os.curriculum_semester_id
    join escen.teaching_units u on u.semester_id = cs.id join escen.curriculum_components c on c.unit_id = u.id
    where os.offering_id = new.offering_id and c.id = a.component_id
      and (new.starts_at at time zone 'Africa/Lome')::date >= os.starts_on
      and (new.ends_at at time zone 'Africa/Lome')::date <= os.ends_on) then
    raise exception 'Séance hors du semestre de la matière' using errcode = '23514';
  end if;
  if new.room_id is not null then
    select * into room from escen.rooms where id = coalesce(new.actual_room_id, new.room_id) for update;
    if room.site_id <> session_site or room.status <> 'AVAILABLE' then
      raise exception 'Salle indisponible ou d’un autre site' using errcode = '23514';
    end if;

  end if;
  return new;
end $$;

create or replace function escen_private.guard_room_assignment() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare start_time timestamptz; end_time timestamptz; session_uuid uuid; room_site uuid; course_site uuid;
begin
  if tg_table_name = 'exam_rooms' then
    select r.site_id into room_site from escen.rooms r where r.id = new.room_id for update;
    select d.access_opens_at,d.access_closes_at,d.session_id,o.site_id into start_time,end_time,session_uuid,course_site
      from escen.exam_deliveries d join escen.evaluations e on e.id = d.evaluation_id
      join escen.academic_offerings o on o.id = e.offering_id where d.id = new.delivery_id;
    if room_site <> course_site
      or exists (select 1 from escen.sessions where id <> session_uuid and effective_room_id = new.room_id
        and status not in ('ANNULE','REPORTE') and starts_at < end_time and start_time < ends_at)
      or exists (select 1 from escen.exam_rooms r join escen.exam_deliveries d on d.id = r.delivery_id
        join escen.sessions s on s.id = d.session_id where r.id <> new.id and r.room_id = new.room_id
        and s.status not in ('ANNULE','REPORTE') and d.access_opens_at < end_time and start_time < d.access_closes_at) then
      raise exception 'Salle d’examen incompatible ou conflit' using errcode = '23514';
    end if;

  end if;
  return new;
end $$;

commit;
