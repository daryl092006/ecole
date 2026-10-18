begin;

-- Existing audit_event, no_delete and curriculum guards remain attached.
alter table escen.curriculum_semesters
  add column reason text,
  add column archived_at timestamptz,
  add constraint semester_archive_reason check (
    archived_at is null or length(btrim(coalesce(reason, ''))) between 3 and 1000
  );
alter table escen.teaching_units
  add column reason text,
  add column archived_at timestamptz,
  add constraint unit_archive_reason check (
    archived_at is null or length(btrim(coalesce(reason, ''))) between 3 and 1000
  );
alter table escen.curriculum_components
  add column reason text,
  add column archived_at timestamptz,
  add constraint component_archive_reason check (
    archived_at is null or length(btrim(coalesce(reason, ''))) between 3 and 1000
  );

create or replace function escen_private.guard_curriculum() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare curriculum uuid; state text; archiving boolean;
begin
  if tg_table_name = 'curricula' then
    if tg_op = 'UPDATE' and old.status <> 'DRAFT' then
      if (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') or new.status <> 'ARCHIVED' then
        raise exception 'Maquette approuvée immuable' using errcode = '23514';
      end if;
    end if;
    if new.status = 'APPROVED' and (tg_op = 'INSERT' or old.status = 'DRAFT') then
      if not exists (
        select 1 from escen.curriculum_semesters
        where curriculum_id = new.id and archived_at is null
      ) or exists (
        select 1 from escen.curriculum_semesters s
        where s.curriculum_id = new.id and s.archived_at is null
          and s.target_credits <> coalesce((
            select sum(u.credits) from escen.teaching_units u
            where u.semester_id = s.id and u.archived_at is null
          ), 0)
      ) or exists (
        select 1 from escen.teaching_units u
        where u.curriculum_id = new.id and u.archived_at is null
          and u.credits <> coalesce((
            select sum(c.credits) from escen.curriculum_components c
            where c.unit_id = u.id and c.archived_at is null
          ), 0)
      ) then
        raise exception 'Budgets de crédits de la maquette incomplets' using errcode = '23514';
      end if;
    end if;
  else
    archiving := tg_table_name in ('curriculum_semesters', 'teaching_units', 'curriculum_components')
      and to_jsonb(new)->>'archived_at' is not null;
    curriculum := new.curriculum_id;
    -- Serialize child edits and archival with approval of their curriculum.
    select status into state from escen.curricula where id = curriculum for update;
    if state <> 'DRAFT' then
      if archiving then
        raise exception 'Archivage interdit : la maquette est approuvée ou archivée. Le gel de la maquette prime.' using errcode = '23514';
      end if;
      raise exception 'Maquette approuvée immuable' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and old.curriculum_id <> curriculum then
      select status into state from escen.curricula where id = old.curriculum_id for update;
      if state <> 'DRAFT' then
        if archiving then
          raise exception 'Archivage interdit : la maquette est approuvée ou archivée. Le gel de la maquette prime.' using errcode = '23514';
        end if;
        raise exception 'Maquette approuvée immuable' using errcode = '23514';
      end if;
    end if;
    if archiving then
      if tg_table_name = 'curriculum_semesters' and exists (
        select 1 from escen.teaching_units where semester_id = new.id and archived_at is null
      ) then
        raise exception 'Archivage du semestre interdit : des unités d’enseignement actives y sont encore rattachées.' using errcode = '23514';
      end if;
      if tg_table_name = 'teaching_units' and exists (
        select 1 from escen.curriculum_components where unit_id = new.id and archived_at is null
      ) then
        raise exception 'Archivage de l’unité d’enseignement interdit : des matières actives y sont encore rattachées.' using errcode = '23514';
      end if;
    elsif tg_table_name = 'teaching_units' then
      if exists (select 1 from escen.curriculum_semesters where id = new.semester_id and archived_at is not null) then
        raise exception 'Une unité d’enseignement active ne peut pas être rattachée à un semestre archivé.' using errcode = '23514';
      end if;
    elsif tg_table_name = 'curriculum_components' then
      if exists (select 1 from escen.teaching_units where id = new.unit_id and archived_at is not null) then
        raise exception 'Une matière active ne peut pas être rattachée à une unité d’enseignement archivée.' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;

create or replace function escen_private.check_assessment_budget() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.status = 'APPROVED' and old.status = 'DRAFT' and exists (
    select 1 from escen.curriculum_components c
    where c.curriculum_id = new.id and c.archived_at is null
      and coalesce((select sum(w.percent) from escen.assessment_weights w where w.component_id = c.id), 0) <> 100
  ) then
    raise exception 'Pondérations de chaque matière : total de 100 obligatoire' using errcode = '23514';
  end if;
  return new;
end $$;

commit;
