-- Migration 202611100101_ia_standard_fee_schedules.sql
-- Grille des frais de scolarité normaux (sans double diplomation, tarif réduit de moitié)
-- pour la filière IA-GL 2026-2027 :
-- L1 : 425 000 FCFA (soit 850 000 / 2)
-- L2 : 487 500 FCFA (soit 975 000 / 2)
-- L3 : 550 000 FCFA (soit 1 100 000 / 2)
-- Inscription : 50 000 FCFA pour chaque niveau

do $$
declare
  target_year uuid;
  target_program uuid;
  target_level uuid;
  tariff record;
begin
  select id into target_year
  from escen.academic_years
  where code = '2026-2027' and archived_at is null;

  select id into target_program
  from escen.programs
  where code = 'IA-GL' and archived_at is null;

  -- Si l'année ou le programme n'existe pas encore (ex. base vierge), ne rien faire
  if target_year is null or target_program is null then return; end if;

  for tariff in select * from (values
    ('L1', 425000), ('L2', 487500), ('L3', 550000)
  ) as prices(level_code, amount)
  loop
    select id into target_level
    from escen.levels
    where code = tariff.level_code and archived_at is null;

    if target_level is not null then
      -- Frais de scolarité normale (sans double diplomation)
      insert into escen.annual_fee_schedules
        (academic_year_id, category, program_id, level_id,
         delivery_mode, double_degree, amount, reason)
      values
        (target_year, 'SCOLARITE', target_program, target_level,
         'Présentiel', false, tariff.amount,
         'Grille normale sans double diplomation IA-GL 2026-2027 : tarif réduit de moitié')
      on conflict (academic_year_id, category, program_id, level_id, delivery_mode, double_degree, archived_at)
      do update set amount = excluded.amount, reason = excluded.reason;

      -- Frais d'inscription normale
      insert into escen.annual_fee_schedules
        (academic_year_id, category, program_id, level_id,
         delivery_mode, double_degree, amount, reason)
      values
        (target_year, 'INSCRIPTION', target_program, target_level,
         'Présentiel', false, 50000,
         'Inscription normale IA-GL 2026-2027')
      on conflict (academic_year_id, category, program_id, level_id, delivery_mode, double_degree, archived_at)
      do update set amount = excluded.amount, reason = excluded.reason;
    end if;
  end loop;
end;
$$;
