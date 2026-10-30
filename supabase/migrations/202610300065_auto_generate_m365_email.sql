-- Migration : Calcul et génération automatique de l'adresse email Microsoft 365 pour les étudiants
do $$ begin
  execute 'create extension if not exists unaccent';
exception when others then null;
end $$;

create or replace function escen_private.clean_token(p_text text) returns text language sql immutable as $$
  select regexp_replace(
    translate(lower(coalesce(p_text, '')), 'àáâãäåāăąèéêëēĕėęěìíîïĩīĭòóôõöøōŏőùúûüũūŭůñçÿý', 'aaaaaaaaaeeeeeeeeeiiiiiiioooooooooouuuuuuuuncyy'),
    '[^a-z0-9]', '', 'g'
  );
$$;

create or replace function escen_private.compute_student_m365_email(p_lastname text, p_firstname text)
returns text language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_n text := escen_private.clean_token(p_lastname);
  v_clean_firstname text := translate(lower(coalesce(p_firstname, '')), 'àáâãäåāăąèéêëēĕėęěìíîïĩīĭòóôõöøōŏőùúûüũūŭůñçÿý', 'aaaaaaaaaeeeeeeeeeiiiiiiioooooooooouuuuuuuuncyy');
  v_p_tokens text[] := regexp_split_to_array(btrim(regexp_replace(v_clean_firstname, '[^a-z0-9\s\-]+', ' ', 'g')), '[\s\-]+');
  v_p1 text;
  v_p2 text;
  v_n1 text;
  v_n2 text;
  v_candidate text;
  v_idx int := 2;
  v_domain text := 'escen.university';
begin
  v_p1 := coalesce(nullif(escen_private.clean_token(v_p_tokens[1]), ''), 'etudiant');
  if array_length(v_p_tokens, 1) > 1 then
    v_p2 := nullif(escen_private.clean_token(v_p_tokens[2]), '');
  end if;

  v_n1 := coalesce(nullif(substr(v_n, 1, 1), ''), 'e');
  if length(v_n) >= 2 then
    v_n2 := substr(v_n, 1, 2);
  end if;

  -- 1. 1ère lettre nom + 1er prénom
  v_candidate := v_n1 || '.' || v_p1 || '.etudiant@' || v_domain;
  if not exists (select 1 from escen.students where m365_email = v_candidate) then
    return v_candidate;
  end if;

  -- 2. Si doublon & 2e prénom : 1ère lettre nom + 2e prénom
  if v_p2 is not null then
    v_candidate := v_n1 || '.' || v_p2 || '.etudiant@' || v_domain;
    if not exists (select 1 from escen.students where m365_email = v_candidate) then
      return v_candidate;
    end if;
  end if;

  -- 3. Si doublon ou pas de 2e prénom : 2 premières lettres nom + 1er prénom
  if v_n2 is not null then
    v_candidate := v_n2 || '.' || v_p1 || '.etudiant@' || v_domain;
    if not exists (select 1 from escen.students where m365_email = v_candidate) then
      return v_candidate;
    end if;
  end if;

  -- 4. Si doublon & 2e prénom : 2 premières lettres nom + 2e prénom
  if v_n2 is not null and v_p2 is not null then
    v_candidate := v_n2 || '.' || v_p2 || '.etudiant@' || v_domain;
    if not exists (select 1 from escen.students where m365_email = v_candidate) then
      return v_candidate;
    end if;
  end if;

  -- 5. Secours numérique
  loop
    v_candidate := v_n1 || '.' || v_p1 || '.etudiant' || v_idx || '@' || v_domain;
    if not exists (select 1 from escen.students where m365_email = v_candidate) then
      return v_candidate;
    end if;
    v_idx := v_idx + 1;
  end loop;
end $$;

-- Trigger d'attribution automatique pour les futures insertions d'étudiants
create or replace function escen_private.auto_student_m365_email_trigger_fn()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_firstname text;
  v_lastname text;
begin
  if new.m365_email is null then
    select firstname, lastname into v_firstname, v_lastname
    from escen.people where id = new.person_id;

    if v_firstname is not null and v_lastname is not null then
      new.m365_email := escen_private.compute_student_m365_email(v_lastname, v_firstname);
      new.m365_status := 'PENDING';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists auto_student_m365_email_trigger on escen.students;
create trigger auto_student_m365_email_trigger
before insert on escen.students
for each row execute function escen_private.auto_student_m365_email_trigger_fn();

-- Rétroaction : Assigner l'adresse officielle à tous les étudiants actuels
do $$
declare
  r record;
  v_email text;
begin
  for r in
    select s.id, p.firstname, p.lastname
    from escen.students s
    join escen.people p on p.id = s.person_id
    where s.m365_email is null
    order by s.created_at, s.matricule
  loop
    v_email := escen_private.compute_student_m365_email(r.lastname, r.firstname);
    update escen.students
    set m365_email = v_email,
        m365_status = 'PENDING'
    where id = r.id;
  end loop;
end $$;
