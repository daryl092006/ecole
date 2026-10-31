-- Migration : Initialisation des types officiels de pièces et transfert automatique des pièces de candidature
begin;

-- 1. Initialiser les types de pièces standard dans escen.document_types
insert into escen.document_types (id, code, name, multiple, accepted_mime_types, max_byte_size) values
  ('b1000000-0000-0000-0000-000000000001', 'photo_identite_file', 'Photo d’identité', false, array['image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000002', 'naissance_file', 'Acte de naissance', false, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000003', 'nationalite_file', 'Pièce d’identité / Nationalité', false, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000004', 'diplome_file', 'Dernier diplôme / Attestation', false, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000005', 'releve_notes', 'Relevés de notes', true, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000006', 'certificat_medical_file', 'Certificat médical', false, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000007', 'cv_file', 'Curriculum vitæ', false, array['application/pdf', 'image/jpeg', 'image/png'], 5242880),
  ('b1000000-0000-0000-0000-000000000008', 'autre_document', 'Autre pièce justificative', true, array['application/pdf', 'image/jpeg', 'image/png'], 5242880)
on conflict (code) do update set
  name = excluded.name,
  multiple = excluded.multiple,
  accepted_mime_types = excluded.accepted_mime_types,
  max_byte_size = excluded.max_byte_size;

-- 2. Fonction de correspondance entre clé de candidature et type officiel
create or replace function escen_private.map_document_key_to_type_code(p_key text) returns text
language sql immutable as $$
  select case
    when lower(p_key) like '%photo%' then 'photo_identite_file'
    when lower(p_key) like '%naissance%' then 'naissance_file'
    when lower(p_key) like '%nationalite%' or lower(p_key) like '%cni%' or lower(p_key) like '%identite%' or lower(p_key) like '%passeport%' then 'nationalite_file'
    when lower(p_key) like '%diplome%' or (lower(p_key) like '%bac%' and lower(p_key) not like '%releve%' and lower(p_key) not like '%notes%') then 'diplome_file'
    when lower(p_key) like '%releve%' or lower(p_key) like '%bulletin%' or lower(p_key) like '%notes%' then 'releve_notes'
    when lower(p_key) like '%medical%' or lower(p_key) like '%sante%' then 'certificat_medical_file'
    when lower(p_key) like '%cv%' or lower(p_key) like '%curriculum%' then 'cv_file'
    else 'autre_document'
  end;
$$;

-- 3. Fonction de transfert des pièces de candidature vers le dossier étudiant
create or replace function escen_private.transfer_application_documents(p_application_id uuid, p_student_id uuid, p_actor_id uuid default null)
returns integer
language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_actor_id uuid;
  v_enrollment_id uuid;
  v_year_id uuid;
  v_app_doc record;
  v_file_id uuid;
  v_type_code text;
  v_type_id uuid;
  v_count integer := 0;
begin
  if p_application_id is null or p_student_id is null then
    return 0;
  end if;

  -- Compte responsable pour uploaded_by
  select id into v_actor_id from escen.accounts where id = p_actor_id and active limit 1;
  if v_actor_id is null then
    select id into v_actor_id from escen.accounts where active order by created_at asc limit 1;
  end if;
  if v_actor_id is null then
    return 0;
  end if;

  -- Inscription active et année scolaire de rattachement
  select e.id, o.academic_year_id into v_enrollment_id, v_year_id
  from escen.enrollments e
  join escen.academic_offerings o on o.id = e.offering_id
  where e.student_id = p_student_id
  order by e.enrolled_on desc, e.id desc
  limit 1;

  if v_year_id is null then
    select academic_year_id into v_year_id from escen.online_applications where id = p_application_id;
  end if;
  if v_year_id is null then
    select academic_year_id into v_year_id from escen.academic_working_year where singleton;
  end if;

  for v_app_doc in
    select d.*
    from escen.application_documents d
    where d.application_id = p_application_id
    order by d.created_at asc, d.id asc
  loop
    -- Enregistrer le fichier dans escen.file_objects
    select id into v_file_id
    from escen.file_objects
    where bucket = v_app_doc.bucket and object_path = v_app_doc.object_path;

    if v_file_id is null then
      insert into escen.file_objects (
        id, bucket, object_path, original_name, mime_type, byte_size, sha256, uploaded_by, uploaded_at
      ) values (
        gen_random_uuid(),
        v_app_doc.bucket,
        v_app_doc.object_path,
        v_app_doc.filename,
        v_app_doc.mime_type,
        v_app_doc.byte_size,
        v_app_doc.sha256,
        v_actor_id,
        v_app_doc.created_at
      )
      returning id into v_file_id;
    end if;

    -- Trouver le type officiel correspondant
    v_type_code := escen_private.map_document_key_to_type_code(v_app_doc.document_key);
    select id into v_type_id from escen.document_types where code = v_type_code;

    -- Rattacher au dossier étudiant dans escen.student_documents
    if v_type_id is not null and not exists (
      select 1 from escen.student_documents where student_id = p_student_id and file_id = v_file_id
    ) then
      insert into escen.student_documents (
        id, student_id, enrollment_id, document_type_id, file_id, version, status, academic_year_id
      ) values (
        gen_random_uuid(),
        p_student_id,
        v_enrollment_id,
        v_type_id,
        v_file_id,
        1,
        'CONFORME',
        v_year_id
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

-- 4. RPC publique pour synchronisation
create or replace function public.escen_sync_student_application_documents(p_student_id uuid, p_actor_id uuid default null)
returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_total integer := 0;
  v_app record;
begin
  if p_student_id is not null then
    for v_app in
      select a.id as application_id
      from escen.online_applications a
      where a.student_id = p_student_id
         or exists (
           select 1 from escen.students s
           join escen.people p on p.id = s.person_id
           where s.id = p_student_id and lower(btrim(p.email)) = lower(btrim(a.identity->>'email'))
         )
    loop
      v_total := v_total + escen_private.transfer_application_documents(v_app.application_id, p_student_id, p_actor_id);
    end loop;
  else
    for v_app in
      select a.id as application_id, coalesce(a.student_id, s.id) as student_id
      from escen.online_applications a
      left join escen.people p on lower(btrim(p.email)) = lower(btrim(a.identity->>'email'))
      left join escen.students s on s.person_id = p.id
      where coalesce(a.student_id, s.id) is not null
    loop
      v_total := v_total + escen_private.transfer_application_documents(v_app.application_id, v_app.student_id, p_actor_id);
    end loop;
  end if;

  if v_total > 0 then
    update escen_private.portal_revision set revision = revision + 1, changed_at = now() where singleton;
  end if;

  return jsonb_build_object('transferredCount', v_total, 'studentId', p_student_id);
end $$;

do $$ declare r text; begin
  foreach r in array array['authenticated', 'service_role'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute 'grant execute on function public.escen_sync_student_application_documents(uuid, uuid) to ' || quote_ident(r);
    end if;
  end loop;
end $$;

-- 5. Rétro-transfert immédiat de toutes les candidatures en ligne déjà admises
do $$
declare
  r record;
  v_count integer;
begin
  perform set_config('escen.application_command', '1', true);
  for r in
    select a.id as application_id, coalesce(a.student_id, s.id) as student_id
    from escen.online_applications a
    left join escen.people p on lower(btrim(p.email)) = lower(btrim(a.identity->>'email'))
    left join escen.students s on s.person_id = p.id
    where coalesce(a.student_id, s.id) is not null
  loop
    if exists (select 1 from escen.online_applications where id = r.application_id and student_id is null) then
      update escen.online_applications set student_id = r.student_id where id = r.application_id;
    end if;
    v_count := escen_private.transfer_application_documents(r.application_id, r.student_id, null);
  end loop;
end $$;

commit;
