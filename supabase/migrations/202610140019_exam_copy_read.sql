-- Lecture des copies par évaluation et archive exacte ; aucun rapprochement inter-archives.
begin;
create function public.escen_history_exam(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare exam escen_private.legacy_rows; result jsonb;
begin
  select * into exam from escen_private.legacy_rows where id=p_id and source_table='evaluations' and escen_private.history_visible_row(legacy_rows);
  if exam.id is null then return null; end if;
  with related as (
    select l.* from escen_private.legacy_rows l where l.batch_id=exam.batch_id and escen_private.history_visible_row(l) and (
      l.source_table in ('exam_submissions','exam_parts','notes') and l.payload->>'evaluation_id'=exam.source_id
      or l.source_table='exam_questions' and exists(select 1 from escen_private.legacy_rows p where p.batch_id=exam.batch_id and p.source_table='exam_parts' and p.source_id=l.payload->>'part_id' and p.payload->>'evaluation_id'=exam.source_id)
      or l.source_table='exam_question_options' and exists(select 1 from escen_private.legacy_rows q join escen_private.legacy_rows p on p.batch_id=q.batch_id and p.source_table='exam_parts' and p.source_id=q.payload->>'part_id' where q.batch_id=exam.batch_id and q.source_table='exam_questions' and q.source_id=l.payload->>'question_id' and p.payload->>'evaluation_id'=exam.source_id)
    )
  ) select jsonb_build_object('exam',escen_private.safe_history_record(exam),'tables',coalesce((select jsonb_object_agg(source_table,records) from (select source_table,jsonb_agg(escen_private.safe_history_record(related) order by source_id,id) records from related group by source_table) grouped),'{}')) into result;
  return result;
end $$;
revoke all on function public.escen_history_exam(uuid) from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on function public.escen_history_exam(uuid) from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on function public.escen_history_exam(uuid) from authenticated; end if;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_history_exam(uuid) to service_role; end if;
end $$;
commit;
