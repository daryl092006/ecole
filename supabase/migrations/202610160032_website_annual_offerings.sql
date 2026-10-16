begin;
-- The public application catalog follows exact formations of the working year.
create function escen_private.sync_website_offerings() returns void
language sql security definer set search_path=pg_catalog as $$
  insert into escen.website_intakes(academic_year_id,level_id,program_id,label,active,required_documents,reason)
  select distinct o.academic_year_id,o.level_id,c.program_id,p.name || ' · ' || l.name,true,'[]'::jsonb,
    'Synchronisation des formations de l’année de travail — demande utilisateur du 16 octobre 2026'
  from escen.academic_working_year w
  join escen.academic_years y on y.id=w.academic_year_id and y.status='OUVERTE' and y.archived_at is null
  join escen.academic_offerings o on o.academic_year_id=y.id and o.archived_at is null
  join escen.curricula c on c.id=o.curriculum_id and c.archived_at is null
  join escen.programs p on p.id=c.program_id and p.archived_at is null
  join escen.levels l on l.id=o.level_id and l.archived_at is null
  where w.singleton
  on conflict(academic_year_id,level_id,program_id) do nothing;
$$;
create function escen_private.sync_website_offerings_trigger() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform escen_private.sync_website_offerings();
  return null;
end $$;
create trigger website_offerings_sync after insert or update on escen.academic_offerings for each statement execute function escen_private.sync_website_offerings_trigger();
create trigger website_working_year_sync after insert or update on escen.academic_working_year for each statement execute function escen_private.sync_website_offerings_trigger();
create trigger website_curricula_sync after insert or update on escen.curricula for each statement execute function escen_private.sync_website_offerings_trigger();
create trigger website_programs_sync after insert or update on escen.programs for each statement execute function escen_private.sync_website_offerings_trigger();
create trigger website_levels_sync after insert or update on escen.levels for each statement execute function escen_private.sync_website_offerings_trigger();
select escen_private.sync_website_offerings();
revoke all on function escen_private.sync_website_offerings(),escen_private.sync_website_offerings_trigger() from public;
create function escen_private.website_formation_available(p_year uuid,p_level uuid,p_program uuid) returns boolean
language sql stable set search_path=pg_catalog as $$
  select exists(select 1 from escen.academic_offerings o
    join escen.curricula c on c.id=o.curriculum_id and c.archived_at is null
    join escen.levels l on l.id=o.level_id and l.archived_at is null
    join escen.programs p on p.id=c.program_id and p.archived_at is null
    where o.academic_year_id=p_year and o.level_id=p_level and c.program_id=p_program and o.archived_at is null);
$$;
alter function public.escen_website_public(text,text,jsonb) rename to escen_website_public_before_offerings;
create function public.escen_website_public(p_action text,p_token_hash text default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb; application escen.online_applications; intake escen.website_intakes;
begin
  if p_action in ('documents','submit') then
    select a.* into application from escen.online_applications a join escen_private.application_access x on x.id=a.id
      where x.token_hash=p_token_hash and x.expires_at>now() for update of a;
    if application.id is not null and application.status='BROUILLON' then
      if p_action='documents' then
        if not escen_private.website_formation_available(application.academic_year_id,(p_data->>'niveau_id')::uuid,(p_data->>'filiere_id')::uuid) then
          raise exception 'Formation absente de l’année du dossier' using errcode='23514';
        end if;
      else
        select * into intake from escen.website_intakes where id=application.intake_id;
        if intake.id is not null and not escen_private.website_formation_available(application.academic_year_id,intake.level_id,intake.program_id) then
          raise exception 'Formation absente de l’année du dossier' using errcode='23514';
        end if;
      end if;
    end if;
  end if;
  result:=public.escen_website_public_before_offerings(p_action,p_token_hash,p_data);
  if p_action='intakes' then
    return coalesce((select jsonb_agg(item order by item->>'level_name',item->>'program_name') from jsonb_array_elements(result) item
      where escen_private.website_formation_available((item->>'academic_year_id')::uuid,(item->>'level_id')::uuid,(item->>'program_id')::uuid)),'[]');
  end if;
  return result;
end $$;
revoke all on function escen_private.website_formation_available(uuid,uuid,uuid),public.escen_website_public_before_offerings(text,text,jsonb),public.escen_website_public(text,text,jsonb) from public;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke all on function public.escen_website_public_before_offerings(text,text,jsonb),public.escen_website_public(text,text,jsonb) from %I',r);
    end if;
  end loop;
  if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_website_public(text,text,jsonb) to service_role; end if;
end $$;
commit;
