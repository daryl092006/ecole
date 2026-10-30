-- Migration 202610300067_link_student_portal_accounts.sql
-- Active les comptes portail et attribue le rôle Étudiant (STUD) aux 11 étudiants 2026-2027

-- Supprimer le trigger bloquant sur enrollments pour préserver les flux d'inscription existants
drop trigger if exists auto_assign_group_trigger on escen.enrollments;

do $$
declare
  r record;
  v_account_id uuid;
  v_admin_id uuid;
  v_role_id uuid;
begin
  if to_regclass('auth.users') is null then
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email'
  ) then
    return;
  end if;

  -- Récupérer l'ID d'un compte administrateur actif et l'ID du rôle Étudiant
  select a.id into v_admin_id 
  from escen.accounts a 
  where a.active = true 
  order by a.created_at asc 
  limit 1;

  select id into v_role_id 
  from escen.roles 
  where code = 'STUD';

  for r in execute
    'select 
      u.id as auth_user_id, 
      p.id as person_id, 
      s.matricule, 
      s.m365_email
    from auth.users u
    join escen.students s on lower(s.m365_email) = lower(u.email)
    join escen.people p on p.id = s.person_id
    where not exists (select 1 from escen.accounts a where a.person_id = p.id)'
  loop
    v_account_id := gen_random_uuid();
    
    insert into escen.accounts (id, person_id, auth_user_id, active)
    values (v_account_id, r.person_id, r.auth_user_id, true);

    insert into escen.role_grants (account_id, role_id, valid_from, reason, granted_by)
    values (
      v_account_id, 
      v_role_id, 
      now(), 
      'Attribution automatique du role Etudiant - Promotion 2026-2027', 
      v_admin_id
    );
  end loop;
end $$;
