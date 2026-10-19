begin;

-- A projection only: original audit payloads and access to private tables stay unchanged.
create function escen_private.audit_visible_values(p_value jsonb) returns jsonb
language sql immutable set search_path = pg_catalog as $$
  select case when p_value is null then null else coalesce((
    select jsonb_object_agg(key,value) from jsonb_each(p_value)
    where key = any(array['id','code','name','title','status','active','archived_at','reference',
      'academic_year_id','student_id','enrollment_id','offering_id','group_id','teacher_id',
      'assignment_id','evaluation_id','candidate_id','grade_id','complaint_id','payment_id',
      'contract_id','version_id','amount','value','old_value','new_value','absence_status',
      'from_status','to_status','old_status','new_status','version','revision','category',
      'method','currency','quantity','unit_amount','capacity','starts_on','ends_on','paid_on','due_on'])
      and jsonb_typeof(value) in ('string','number','boolean','null')
  ),'{}'::jsonb) end;
$$;

create function escen_private.audit_matches_year(p_value jsonb,p_table text,p_year uuid,p_scope jsonb) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select case
    when p_value is null then false
    when p_table = 'academic_years' then p_value->>'id' = p_year::text
    when p_value->>'academic_year_id' is not null then p_value->>'academic_year_id' = p_year::text
    else exists (
      select 1 from jsonb_each_text(coalesce(p_scope->'references'->p_table,'{}'::jsonb)) relation
      join lateral jsonb_array_elements_text(coalesce(p_scope->'ids'->relation.value,'[]'::jsonb)) parent on true
      where p_value->>relation.key = parent.value
    ) end;
$$;

create function public.escen_audit_journal_page(
  p_actor_id uuid,p_role_code text,p_source text default 'current',p_offset integer default 0,
  p_query text default '',p_author text default '',p_table text default '',p_action text default '',
  p_start date default null,p_end date default null,p_year_id uuid default null,p_scope jsonb default '{}'
) returns jsonb
language plpgsql stable security definer set search_path = pg_catalog as $$
declare result jsonb;
begin
  if p_role_code not in ('DG','IT') or not exists (
    select 1 from escen.accounts a
    join escen.role_grants g on g.account_id=a.id
    join escen.roles r on r.id=g.role_id
    join escen.role_permissions rp on rp.role_id=r.id
    join escen.permissions permission on permission.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.auth_user_id is not null and a.archived_at is null
      and r.code=p_role_code and r.active and permission.code='system.audit.view'
      and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
      and g.site_id is null and g.group_id is null and g.academic_year_id is null
  ) then raise exception 'Consultation du journal réservée à la direction ou administration globale' using errcode='42501'; end if;
  if p_source is null or p_source not in ('current','history') or p_offset is null or p_offset<0 or p_offset>1000000
    or p_query is null or length(p_query)>160 or p_author is null or length(p_author)>160
    or p_table is null or length(p_table)>160 or p_action is null or length(p_action)>80
    or (p_start is not null and p_end is not null and p_start>p_end)
    or jsonb_typeof(p_scope) is distinct from 'object'
  then raise exception 'Filtres du journal invalides' using errcode='22023'; end if;

  with events as (
    select a.id::text as id,to_char(a.happened_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as date,
      a.actor_id::text as actor_id,nullif(concat_ws(' ',person.firstname,person.lastname),'') as actor_name,
      to_jsonb(a.role_codes) as roles,a.table_name as table_name,a.entity_id::text as entity_id,a.action,
      a.reason,escen_private.audit_visible_values(a.old_value) as old_value,
      escen_private.audit_visible_values(a.new_value) as new_value,null::text as batch_id,null::text as source_id
    from escen_private.audit_events a
    left join escen.accounts account on account.id=a.actor_id
    left join escen.people person on person.id=account.person_id
    where p_source='current' and a.table_schema='escen'
      and (p_year_id is null or escen_private.audit_matches_year(a.old_value,a.table_name,p_year_id,p_scope)
        or escen_private.audit_matches_year(a.new_value,a.table_name,p_year_id,p_scope))
    union all
    select r.id::text,nullif(r.payload->>'created_at',''),nullif(r.payload->>'causer_id',''),null::text,
      '[]'::jsonb,r.payload->>'subject_type',r.payload->>'subject_id',r.payload->>'event',
      null::text,null::jsonb,null::jsonb,r.batch_id::text,r.source_id
    from escen_private.legacy_rows r
    -- No historical year or canonical author is inferred from a date or source identifier.
    where p_source='history' and p_year_id is null and r.source_table='activity_log'
  ), filtered as (
    select * from events e where
      (p_query='' or strpos(lower(concat_ws(' ',e.id,e.actor_id,e.actor_name,e.table_name,e.entity_id,e.action,e.reason)),lower(p_query))>0)
      and (p_author='' or strpos(lower(concat_ws(' ',e.actor_id,e.actor_name)),lower(p_author))>0)
      and (p_table='' or e.table_name=p_table)
      and (p_action='' or e.action=p_action)
      and (p_start is null or (left(e.date,10) ~ '^\d{4}-\d{2}-\d{2}$' and left(e.date,10)>=p_start::text))
      and (p_end is null or (left(e.date,10) ~ '^\d{4}-\d{2}-\d{2}$' and left(e.date,10)<=p_end::text))
  ), page as (
    select * from filtered order by date desc nulls last,id desc limit 50 offset p_offset
  )
  select jsonb_build_object('source',p_source,'yearId',p_year_id,'offset',p_offset,'limit',50,
    'total',(select count(*) from filtered),
    'records',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'date',date,'actorId',actor_id,'actorName',actor_name,'roles',roles,
      'table',table_name,'entityId',entity_id,'action',action,'reason',reason,
      'oldValue',old_value,'newValue',new_value,'batchId',batch_id,'sourceId',source_id
    ) order by date desc nulls last,id desc) from page),'[]'::jsonb)) into result;
  return result;
end $$;

revoke all on function escen_private.audit_visible_values(jsonb),escen_private.audit_matches_year(jsonb,text,uuid,jsonb) from public;
revoke all on function public.escen_audit_journal_page(uuid,text,text,integer,text,text,text,text,date,date,uuid,jsonb) from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on function public.escen_audit_journal_page(uuid,text,text,integer,text,text,text,text,date,date,uuid,jsonb) from %I',role_name);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.escen_audit_journal_page(uuid,text,text,integer,text,text,text,text,date,date,uuid,jsonb) to service_role;
  end if;
end $$;
commit;
