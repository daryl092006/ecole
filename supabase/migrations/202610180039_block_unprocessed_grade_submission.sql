begin;

create function escen_private.block_unprocessed_grade_submission()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.to_status = 'SOUMISES' then
    perform 1
      from escen.evaluations
      where id = new.evaluation_id
      for update;

    if exists (
      select 1
      from escen.evaluation_candidates c
      join escen.grades g on g.candidate_id = c.id
      where c.evaluation_id = new.evaluation_id
        and g.absence_status = 'NON_TRAITE'
    ) then
      raise exception
        'Soumission impossible : une ou plusieurs copies sont encore NON_TRAITE.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger evaluation_processed_grades
before insert on escen.evaluation_transitions
for each row
execute function escen_private.block_unprocessed_grade_submission();

commit;
