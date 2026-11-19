-- Proposition uniquement : aucune application distante.
-- Conserve les exclusions, le classement des comptes et les droits existants.
begin;

create or replace function public.escen_backend_snapshot_before_level_documents() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare item record; records jsonb; result jsonb; fragments text[] := array[]::text[];
begin
  for item in select tablename from pg_tables where schemaname='escen' and tablename not in
    ('website_articles','website_intakes','online_applications','application_documents','website_brochures','website_galleries','email_outbox') order by tablename loop
    if item.tablename='accounts' then
      select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('account_type',case
        when exists(select 1 from escen.students s where s.person_id=a.person_id) then 'student'
        when exists(select 1 from escen.staff s where s.person_id=a.person_id) or exists(
          select 1 from escen_private.source_mappings m join escen_private.legacy_rows l on l.id=m.row_id
          where m.target_table='accounts' and m.target_id=a.id and l.source_table='users') then 'staff'
        else 'unclassified' end)),'[]') into records from escen.accounts a where a.archived_at is null;
    else execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from escen.%I t',item.tablename) into records;
    end if;
    fragments:=array_append(fragments,to_jsonb(item.tablename)::text||':'||records::text);
  end loop;
  result:=('{'||array_to_string(fragments,',')||'}')::jsonb;
  return jsonb_build_object('revision',(select revision from escen_private.portal_revision where singleton),'tables',result);
end $$;

commit;
