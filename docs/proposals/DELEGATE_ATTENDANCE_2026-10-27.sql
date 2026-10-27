-- Proposition : présences du groupe par le délégué. Ne pas appliquer avant accord.
begin;
insert into escen.role_permissions(role_id,permission_id)
select r.id,p.id from escen.roles r cross join escen.permissions p
where r.code='DEL' and p.code in ('attendance.view','attendance.record')
on conflict(role_id,permission_id) do nothing;

-- Un groupe autorisé est un groupe d'inscription du délégué à la date de séance.
-- Une attribution DEL complète doit aussi couvrir le site, l'année et le groupe.
create function escen_private.delegate_attendance_session(p_actor_id uuid,p_session_id uuid,p_year_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(
  select 1 from escen.accounts a join escen.students st on st.person_id=a.person_id
  join escen.enrollments e on e.student_id=st.id
  join escen.enrollment_groups eg on eg.enrollment_id=e.id and eg.offering_id=e.offering_id
  join escen.sessions s on s.group_id=eg.group_id and s.offering_id=e.offering_id
  join escen.academic_offerings o on o.id=s.offering_id
  join escen.role_grants g on g.account_id=a.id
  join escen.roles r on r.id=g.role_id
  where a.id=p_actor_id and a.active and a.archived_at is null and a.auth_user_id is not null
   and s.id=p_session_id and o.academic_year_id=p_year_id and r.code='DEL' and r.active
   and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date
   and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)
   and g.valid_from<=now() and (g.valid_until is null or g.valid_until>now())
   and (g.site_id is null or g.site_id=o.site_id)
   and (g.academic_year_id is null or g.academic_year_id=o.academic_year_id)
   and (g.group_id is null or g.group_id=s.group_id)
   and exists(select 1 from escen.role_permissions rp join escen.permissions p on p.id=rp.permission_id where rp.role_id=r.id and p.code='attendance.record')
 );
$$;

create function public.escen_delegate_attendance_transaction(p_actor_id uuid,p_expected_revision bigint,p_session_id uuid,p_year_id uuid,p_changes jsonb) returns bigint
language plpgsql security definer set search_path=pg_catalog as $$
declare s escen.sessions; change jsonb; rec jsonb; previous jsonb; target text; operation text;
 allowed text[]; key text; student_enrollment uuid; effective_teacher uuid;
begin
 -- Même verrou que la RPC existante : contrôle de concurrence et lot atomique.
 perform 1 from escen_private.portal_revision where singleton for update;
 if p_year_id is null or not escen_private.delegate_attendance_session(p_actor_id,p_session_id,p_year_id) then
  raise exception 'Séance hors du groupe du délégué' using errcode='42501';
 end if;
 select * into strict s from escen.sessions where id=p_session_id for share;
 if s.status in ('ANNULE','REPORTE') or not exists(select 1 from escen.academic_years y where y.id=p_year_id and y.archived_at is null and y.status in ('OUVERTE','EN_CLOTURE')) then
  raise exception 'Séance ou année non modifiable' using errcode='42501';
 end if;
 if jsonb_typeof(p_changes) is distinct from 'array' then raise exception 'Lot invalide' using errcode='23514'; end if;
 if jsonb_array_length(p_changes) not between 1 and 5000 then raise exception 'Lot vide ou trop volumineux' using errcode='23514'; end if;
 effective_teacher:=coalesce(s.replacement_teacher_id,s.teacher_id);
 for change in select value from jsonb_array_elements(p_changes) loop
  target:=change->>'table'; operation:=change->>'operation'; rec:=change->'record'; previous:=null;
  if target is null or target not in ('attendances','teacher_attendances') or operation is null or operation not in ('insert','update') or jsonb_typeof(rec) is distinct from 'object' then
   raise exception 'Opération hors du circuit délégué' using errcode='42501';
  end if;
  allowed:=case when target='attendances' then array['id','status','arrived_at','left_at','late_minutes','comment','reason'] else array['id','arrived_at','left_at','comment'] end;
  if operation='insert' then allowed:=allowed||case when target='attendances' then array['session_id','enrollment_id','offering_id','recorded_by'] else array['session_id','teacher_id','recorded_by'] end; end if;
  for key in select jsonb_object_keys(rec) loop
   if not key=any(allowed) then raise exception 'Champ non autorisé' using errcode='42501'; end if;
  end loop;
  if operation='update' then
   if target='attendances' then select to_jsonb(a) into previous from escen.attendances a where a.id=(rec->>'id')::uuid and a.session_id=s.id for update;
   else select to_jsonb(a) into previous from escen.teacher_attendances a where a.id=(rec->>'id')::uuid and a.session_id=s.id for update; end if;
   if previous is null then raise exception 'Présence hors de la séance' using errcode='42501'; end if;
  elsif (rec->>'session_id')::uuid is distinct from s.id then raise exception 'Présence hors de la séance' using errcode='42501';
  end if;
  if target='attendances' then
   student_enrollment:=coalesce((previous->>'enrollment_id')::uuid,(rec->>'enrollment_id')::uuid);
   if not exists(select 1 from escen.enrollments e join escen.enrollment_groups eg on eg.enrollment_id=e.id and eg.offering_id=e.offering_id where e.id=student_enrollment and e.offering_id=s.offering_id and eg.group_id=s.group_id and eg.valid_from<=(s.starts_at at time zone 'Africa/Lome')::date and (eg.valid_until is null or eg.valid_until>(s.starts_at at time zone 'Africa/Lome')::date)) then
    raise exception 'Étudiant hors du groupe de la séance' using errcode='42501';
   end if;
   if operation='insert' and (rec->>'offering_id')::uuid is distinct from s.offering_id then raise exception 'Formation hors de la séance' using errcode='42501'; end if;
   if rec ? 'status' and (rec->>'status') is distinct from (previous->>'status') and
    ((rec->>'status') not in ('PRESENT','ABSENT','RETARD') or coalesce(previous->>'status','') in ('ABSENT_JUSTIFIE','RETARD_JUSTIFIE','DISPENSE')) then
    raise exception 'Justification et dispense réservées à la direction académique' using errcode='42501';
   end if;
  elsif coalesce((previous->>'teacher_id')::uuid,(rec->>'teacher_id')::uuid) is distinct from effective_teacher then
   raise exception 'Enseignant hors de la séance' using errcode='42501';
  end if;
 end loop;
 return public.escen_attendance_transaction(p_actor_id,p_expected_revision,p_changes);
end $$;

revoke all on function escen_private.delegate_attendance_session(uuid,uuid,uuid),public.escen_delegate_attendance_transaction(uuid,bigint,uuid,uuid,jsonb) from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on function public.escen_delegate_attendance_transaction(uuid,bigint,uuid,uuid,jsonb) from %I',r); end if;
 end loop;
 if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.escen_delegate_attendance_transaction(uuid,bigint,uuid,uuid,jsonb) to service_role; end if;
end $$;
commit;
