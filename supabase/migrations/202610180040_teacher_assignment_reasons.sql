begin;

alter table escen.teachers
  add column reason text default null,
  add constraint teacher_reason_length
    check (
      reason is null
      or char_length(btrim(reason)) between 3 and 1000
    );

alter table escen.teaching_assignments
  add column reason text default null,
  add constraint assignment_reason_length
    check (
      reason is null
      or char_length(btrim(reason)) between 3 and 1000
    );

create function escen_private.guard_personnel_change_reason()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  changed_field text;
begin
  changed_field := case tg_table_name
    when 'teachers' then 'active'
    when 'teaching_assignments' then 'valid_until'
  end;

  if (to_jsonb(new) -> changed_field)
       is distinct from
     (to_jsonb(old) -> changed_field)
     and coalesce(char_length(btrim(new.reason)), 0)
         not between 3 and 1000
  then
    raise exception
      'Un motif de 3 à 1000 caractères est obligatoire.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger teacher_status_reason
before update of active on escen.teachers
for each row
execute function escen_private.guard_personnel_change_reason();

create trigger assignment_end_reason
before update of valid_until on escen.teaching_assignments
for each row
execute function escen_private.guard_personnel_change_reason();

-- Les triggers audit_event existants enregistreront le motif,
-- l’auteur et les valeurs avant/après. Aucune suppression.

commit;
