-- Migration : Synchronisation des candidatures admises vers les dossiers étudiants et inscriptions 2026-2027
do $$
declare
  r record;
  v_person_id uuid;
  v_student_id uuid;
  v_offering_id uuid;
  v_year_id uuid;
  v_next_num int;
  v_matricule text;
begin
  -- Autoriser les modifications sur online_applications dans le cadre de la migration
  perform set_config('escen.application_command', '1', true);

  select id into v_year_id from escen.academic_years where code = '2026-2027' limit 1;
  if v_year_id is null then
    select id into v_year_id from escen.academic_years where name = '2026-2027' limit 1;
  end if;

  -- Obtenir le dernier numéro de matricule pour l'année 2026
  select coalesce(max(nullif(regexp_replace(matricule, '^([0-9]+)-ESC-.*$', '\1'), matricule)::int), 145)
    into v_next_num from escen.students where matricule like '%-ESC-%';

  for r in
    select a.id as application_id,
           a.identity->>'nom' as nom,
           a.identity->>'prenom' as prenom,
           lower(btrim(a.identity->>'email')) as email,
           a.identity->>'tel' as phone,
           a.identity->>'genre' as gender,
           (a.identity->>'date_naissance')::date as birth_date,
           a.identity->>'nationalite' as nationality,
           a.identity->>'adresse' as address,
           i.level_id,
           i.program_id,
           a.legacy_student_id
    from escen.online_applications a
    join escen.website_intakes i on i.id = a.intake_id
    where ((a.legacy_state->>'admitted')::boolean = true or a.workflow_stage = 'ADMIS_OFFICIEL')
      and a.student_id is null
    order by a.created_at, a.reference
  loop
    v_next_num := v_next_num + 1;
    v_matricule := lpad(v_next_num::text, 3, '0') || '-ESC-2026';

    -- Récupérer ou créer la personne dans escen.people
    select id into v_person_id from escen.people where lower(email) = r.email limit 1;
    if v_person_id is null then
      insert into escen.people(firstname, lastname, email, phone, gender, birth_date, nationality, address)
      values (r.prenom, r.nom, r.email, r.phone, r.gender, r.birth_date, r.nationality, r.address)
      returning id into v_person_id;
    end if;

    -- Récupérer ou créer l'étudiant dans escen.students
    if r.legacy_student_id is not null then
      v_student_id := r.legacy_student_id;
    else
      select id into v_student_id from escen.students where person_id = v_person_id limit 1;
      if v_student_id is null then
        insert into escen.students(person_id, matricule)
        values (v_person_id, v_matricule)
        returning id into v_student_id;
      end if;
    end if;

    -- Trouver l'offre de formation 2026-2027
    select o.id into v_offering_id
    from escen.academic_offerings o
    join escen.curricula c on c.id = o.curriculum_id
    where o.academic_year_id = v_year_id
      and o.level_id = r.level_id
      and c.program_id = r.program_id
    limit 1;

    -- Créer l'inscription annuelle 2026-2027 si pas encore inscrite
    if v_offering_id is not null and not exists (
      select 1 from escen.enrollments where student_id = v_student_id and offering_id = v_offering_id
    ) then
      insert into escen.enrollments(student_id, offering_id, status, enrolled_on)
      values (v_student_id, v_offering_id, 'INSCRIT', current_date);
    end if;

    -- Lier la candidature avec l'étudiant et passer en ADMIS_OFFICIEL
    update escen.online_applications
    set student_id = v_student_id,
        workflow_stage = 'ADMIS_OFFICIEL'
    where id = r.application_id;
  end loop;
end $$;

