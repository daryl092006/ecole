-- SQL validé par l’utilisateur : retrait du motif des articles. Application locale uniquement.
-- Conserve les contrôles de droits, la concurrence et le trigger d’audit.
BEGIN;

CREATE OR REPLACE FUNCTION public.escen_website_manage_before_annual_scope(p_actor_id uuid, p_role_code text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare can_read boolean; can_write boolean; articles boolean; previous escen.website_articles; intake escen.website_intakes; application escen.online_applications; target uuid; result jsonb;
begin
  articles:=p_action like 'article%';
  select exists(select 1 from escen.accounts a join escen.role_grants g on g.account_id=a.id join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null and r.active and r.code=p_role_code and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null
    and p.code=case when articles then 'communication.view' else 'student.view' end and (articles or r.code in ('DG','DGA','DA','LOG','RAF','IT'))) into can_read;
  select exists(select 1 from escen.role_grants g join escen.roles r on r.id=g.role_id join escen.role_permissions rp on rp.role_id=r.id join escen.permissions p on p.id=rp.permission_id
    where g.account_id=p_actor_id and r.active and r.code=p_role_code and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now()) and g.site_id is null and g.group_id is null and g.academic_year_id is null and p.code=case when articles then 'communication.manage' else 'student.lifecycle.manage' end) into can_write;
  if not can_read then raise exception 'Accès refusé' using errcode='42501'; end if;
  if p_action='articles' then return coalesce((select jsonb_agg(to_jsonb(t) order by updated_at desc) from escen.website_articles t),'[]'); end if;
  if p_action='admissions' then return jsonb_build_object(
    'applications',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('intake_label',i.label,'documents',coalesce((select jsonb_agg(to_jsonb(d)-'bucket'-'object_path'-'sha256') from escen.application_documents d where d.application_id=a.id),'[]')) order by a.created_at desc) from escen.online_applications a left join escen.website_intakes i on i.id=a.intake_id where a.status<>'BROUILLON'),'[]'),
    'intakes',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('level_name',l.name,'program_name',p.name)) from escen.website_intakes i join escen.levels l on l.id=i.level_id join escen.programs p on p.id=i.program_id),'[]'),
    'years',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status)) from escen.academic_years where archived_at is null),'[]'),
    'currentYearId',(select academic_year_id from escen.academic_working_year where singleton),
    'levels',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.levels where archived_at is null),'[]'),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from escen.programs where archived_at is null),'[]')); end if;
  if p_action='document' then
    select to_jsonb(d)||jsonb_build_object('academic_year_id',a.academic_year_id) into result from escen.application_documents d join escen.online_applications a on a.id=d.application_id where d.id=(p_data->>'id')::uuid and a.status<>'BROUILLON';
    return result;
  end if;
  if not can_write or (p_action <> 'article-save' and length(btrim(coalesce(p_data->>'reason','')))<3) then raise exception 'Droits ou motif insuffisants' using errcode='42501'; end if;
  perform set_config('escen.actor_id',p_actor_id::text,true);
  target:=coalesce((p_data->>'id')::uuid,gen_random_uuid());
  if p_action='article-save' then
    select * into previous from escen.website_articles where id=target for update;
    if previous.id is not null and previous.version<>(p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='PT409'; end if;
    if p_data ? 'id' and previous.id is null then raise exception 'Article absent' using errcode='P0002'; end if;
    insert into escen.website_articles(id,title,slug,excerpt,content,image,status,created_by,published_at)
      values(target,p_data->>'title',p_data->>'slug',p_data->>'excerpt',p_data->>'content',p_data->>'image',p_data->>'status',p_actor_id,case when p_data->>'status'='PUBLIE' then now() end)
      on conflict(id) do update set title=excluded.title,slug=excluded.slug,excerpt=excluded.excerpt,content=excluded.content,image=excluded.image,status=excluded.status,
        version=escen.website_articles.version+1,published_at=case when excluded.status='PUBLIE' then coalesce(escen.website_articles.published_at,now()) else escen.website_articles.published_at end,updated_at=now();
  elsif p_action='intake-save' then
    if not exists(select 1 from escen.academic_years where id=(p_data->>'academic_year_id')::uuid and archived_at is null and (not (p_data->>'active')::boolean or status='OUVERTE')) then raise exception 'Année de campagne absente ou non ouverte' using errcode='23514'; end if;
    if not exists(select 1 from escen.levels where id=(p_data->>'level_id')::uuid and archived_at is null) or not exists(select 1 from escen.programs where id=(p_data->>'program_id')::uuid and archived_at is null) then raise exception 'Référence archivée ou absente' using errcode='23514'; end if;
    select * into intake from escen.website_intakes where id=target for update;
    if p_data ? 'id' and (intake.id is null or intake.version<>(p_data->>'version')::integer) then raise exception 'Modification concurrente' using errcode='PT409'; end if;
    if intake.id is not null and (intake.level_id<>(p_data->>'level_id')::uuid or intake.program_id<>(p_data->>'program_id')::uuid) then raise exception 'Les références de la formation sont figées' using errcode='23514'; end if;
    insert into escen.website_intakes(id,academic_year_id,level_id,program_id,label,active,required_documents,reason) values(target,(p_data->>'academic_year_id')::uuid,(p_data->>'level_id')::uuid,(p_data->>'program_id')::uuid,p_data->>'label',(p_data->>'active')::boolean,p_data->'required_documents',p_data->>'reason')
      on conflict(id) do update set academic_year_id=excluded.academic_year_id,label=excluded.label,active=excluded.active,required_documents=excluded.required_documents,version=escen.website_intakes.version+1,reason=excluded.reason;
  elsif p_action='application-status' then
    select * into application from escen.online_applications where id=target for update;
    if application.id is null or application.status='BROUILLON' then raise exception 'Dossier absent' using errcode='P0002'; end if;
    if application.version<>(p_data->>'version')::integer then raise exception 'Modification concurrente' using errcode='PT409'; end if;
    if p_data->>'status' not in ('EN_ANALYSE','CLASSE','RECU') then raise exception 'Statut invalide' using errcode='23514'; end if;
    update escen.online_applications set status=p_data->>'status',version=version+1,reason=p_data->>'reason' where id=target;
  else raise exception 'Commande inconnue' using errcode='42501'; end if;
  return jsonb_build_object('id',target);
end $function$;

ALTER TABLE escen.website_articles DROP COLUMN reason;

COMMIT;
