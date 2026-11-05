begin;

alter table escen.programs
  add column double_degree_eligible boolean not null default false;

update escen.programs
set double_degree_eligible = true
where code = 'IA-GL';

alter table escen.enrollments
  add column double_degree boolean not null default false;

create function escen_private.check_double_degree_eligibility()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.double_degree and not exists (
    select 1
    from escen.academic_offerings o
    join escen.curricula c on c.id = o.curriculum_id
    join escen.programs p on p.id = c.program_id
    where o.id = new.offering_id
      and p.double_degree_eligible
  ) then
    raise exception 'Cette filière ne permet pas la double diplomation.';
  end if;
  return new;
end;
$$;

create trigger double_degree_eligibility_guard
before insert or update on escen.enrollments
for each row
execute function escen_private.check_double_degree_eligibility();

commit;
