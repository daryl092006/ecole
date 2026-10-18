begin;

-- Motif des corrections étudiantes ; historique existant inchangé.
alter table escen.attendances
  add column reason text default null,
  add constraint attendance_reason_length check (
    reason is null
    or char_length(btrim(reason)) between 3 and 1000
  );

create function escen_private.guard_attendance_correction_reason()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if (to_jsonb(new) - 'reason')
       is distinct from (to_jsonb(old) - 'reason')
     and coalesce(char_length(btrim(new.reason)), 0)
         not between 3 and 1000
  then
    raise exception
      'Un motif de 3 à 1000 caractères est obligatoire pour corriger une présence.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger attendance_correction_reason
before update on escen.attendances
for each row
execute function escen_private.guard_attendance_correction_reason();

-- Traitement des justificatifs réservé à DA et IT.
insert into escen.permissions(code, description)
values ('attendance.review', 'Accepter ou refuser les justificatifs');

insert into escen.role_permissions(role_id, permission_id)
select r.id, p.id
from escen.roles r
cross join escen.permissions p
where r.code in ('DA', 'IT')
  and p.code = 'attendance.review';

create function escen_private.review_absence_justification()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  actor uuid;
  attendance escen.attendances;
begin
  if old.status <> 'EN_ATTENTE' then
    raise exception
      'Ce justificatif a déjà fait l’objet d’une décision.'
      using errcode = '23514';
  end if;

  if new.status = 'EN_ATTENTE' then
    return new;
  end if;

  if new.attendance_id is distinct from old.attendance_id
     or new.file_id is distinct from old.file_id
     or new.reason is distinct from old.reason
  then
    raise exception
      'La décision ne peut pas modifier le justificatif d’origine.'
      using errcode = '23514';
  end if;

  if coalesce(char_length(btrim(new.review_reason)), 0)
       not between 3 and 1000
  then
    raise exception
      'Un motif de décision de 3 à 1000 caractères est obligatoire.'
      using errcode = '23514';
  end if;

  actor := nullif(current_setting('escen.actor_id', true), '')::uuid;

  if not exists (
    select 1
    from escen.accounts a
    join escen.role_grants g on g.account_id = a.id
    join escen.roles r on r.id = g.role_id
    join escen.role_permissions rp on rp.role_id = r.id
    join escen.permissions p on p.id = rp.permission_id
    where a.id = actor
      and a.active
      and a.auth_user_id is not null
      and r.active
      and r.code in ('DA', 'IT')
      and p.code = 'attendance.review'
      and g.valid_from <= now()
      and (g.valid_until is null or g.valid_until > now())
  ) then
    raise exception
      'Le traitement des justificatifs exige une autorisation DA ou IT.'
      using errcode = '42501';
  end if;

  new.reviewed_by := actor;
  new.reviewed_at := clock_timestamp();
  new.review_reason := btrim(new.review_reason);

  if new.status = 'VALIDE' then
    select * into attendance
    from escen.attendances
    where id = new.attendance_id
    for update;

    if attendance.status in ('ABSENT', 'RETARD') then
      update escen.attendances
      set status = case attendance.status
            when 'ABSENT' then 'ABSENT_JUSTIFIE'
            else 'RETARD_JUSTIFIE'
          end,
          reason = new.review_reason
      where id = attendance.id;
    elsif attendance.status not in (
      'ABSENT_JUSTIFIE', 'RETARD_JUSTIFIE'
    ) then
      raise exception
        'Cette présence ne comporte aucune absence ou retard à justifier.'
        using errcode = '23514';
    end if;
  end if;

  -- Un refus conserve le statut actuel de la présence.
  -- Les audits existants conservent le motif initial,
  -- la décision et review_reason dans les valeurs avant/après.
  return new;
end;
$$;

create trigger absence_justification_review
before update on escen.absence_justifications
for each row
execute function escen_private.review_absence_justification();

-- Écriture atomique, même au-delà de 100 présences.
-- L’API vérifiera les permissions et le périmètre de chaque séance.
create function escen.apply_attendance_changes(
  p_actor_id uuid,
  p_expected_revision bigint,
  p_changes jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_revision bigint := p_expected_revision;
  change jsonb;
  batch jsonb;
  target_teacher uuid;
begin
  if p_expected_revision is null
     or p_expected_revision < 0
     or jsonb_typeof(p_changes) is distinct from 'array'
  then
    raise exception 'Lot de présences invalide'
      using errcode = '23514';
  end if;

  if jsonb_array_length(p_changes) = 0 then
    raise exception 'Lot de présences vide'
      using errcode = '23514';
  end if;

  for change in select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(change->'record') is distinct from 'object'
       or not coalesce(
         (
           change->>'table' in ('attendances', 'teacher_attendances')
           and change->>'operation' in ('insert', 'update')
         )
         or (
           change->>'table' = 'absence_justifications'
           and change->>'operation' = 'update'
         ),
         false
       )
    then
      raise exception 'Table ou opération hors du circuit des présences'
        using errcode = '42501';
    end if;

    if change->>'table' = 'teacher_attendances' then
      target_teacher := coalesce(
        (change->'record'->>'teacher_id')::uuid,
        (
          select t.teacher_id
          from escen.teacher_attendances t
          where t.id = (change->'record'->>'id')::uuid
        )
      );

      if exists (
        select 1
        from escen.teachers t
        join escen.staff s on s.id = t.staff_id
        join escen.accounts a on a.person_id = s.person_id
        where t.id = target_teacher and a.id = p_actor_id
      ) then
        raise exception 'L’auto-émargement enseignant est interdit.'
          using errcode = '42501';
      end if;
    end if;
  end loop;

  for batch in
    select jsonb_agg(value order by ordinality)
    from jsonb_array_elements(p_changes) with ordinality
    group by (ordinality - 1) / 50
    order by (ordinality - 1) / 50
  loop
    current_revision := public.escen_backend_transaction(
      p_actor_id, current_revision, batch
    );
  end loop;

  return current_revision;
end;
$$;

-- Pont serveur conforme aux RPC publiques existantes.
create function public.escen_attendance_transaction(
  p_actor_id uuid,
  p_expected_revision bigint,
  p_changes jsonb
)
returns bigint
language sql
security definer
set search_path = pg_catalog
as $$
  select escen.apply_attendance_changes(
    p_actor_id, p_expected_revision, p_changes
  );
$$;

revoke all on function
  escen_private.guard_attendance_correction_reason() from public;
revoke all on function
  escen_private.review_absence_justification() from public;
revoke all on function
  escen.apply_attendance_changes(uuid, bigint, jsonb) from public;
revoke all on function
  public.escen_attendance_transaction(uuid, bigint, jsonb) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function
      public.escen_attendance_transaction(uuid, bigint, jsonb)
      from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function
      public.escen_attendance_transaction(uuid, bigint, jsonb)
      from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function
      public.escen_attendance_transaction(uuid, bigint, jsonb)
      to service_role;
  end if;
end;
$$;

commit;
