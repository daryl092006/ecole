-- PROPOSITION A VALIDER : ne pas appliquer avant accord utilisateur.
-- Tarifs 2026-2027 du parcours facultatif avec double diplomation.
-- Les tarifs existants et les contrats individuels sont conserves.
begin;

alter table escen.annual_fee_schedules
  add column double_degree boolean not null default false;

alter table escen.annual_fee_schedules
  drop constraint annual_fee_variant;

alter table escen.annual_fee_schedules
  add constraint annual_fee_variant unique nulls not distinct
  (academic_year_id, category, program_id, level_id,
   delivery_mode, double_degree, archived_at);

-- Les controles RLS et les triggers d'audit existants restent applicables.
-- Ces nouvelles grilles seront selectionnables uniquement pour le parcours
-- avec double diplomation dans les formulaires et les API d'inscription.
do $$
declare
  target_year uuid;
  target_program uuid;
  target_level uuid;
  tariff record;
begin
  select id into strict target_year
  from escen.academic_years
  where code = '2026-2027' and archived_at is null;

  select id into strict target_program
  from escen.programs
  where code = 'IA-GL' and double_degree_eligible and archived_at is null;

  for tariff in select * from (values
    ('L1', 850000), ('L2', 975000), ('L3', 1100000)
  ) as prices(level_code, amount)
  loop
    select id into strict target_level
    from escen.levels
    where code = tariff.level_code and archived_at is null;

    insert into escen.annual_fee_schedules
      (academic_year_id, category, program_id, level_id,
       delivery_mode, double_degree, amount, reason)
    values
      (target_year, 'SCOLARITE', target_program, target_level,
       'Présentiel', true, tariff.amount,
       'Grille double diplomation IA-GL 2026-2027 fournie par la direction'),
      (target_year, 'INSCRIPTION', target_program, target_level,
       'Présentiel', true, 50000,
       'Inscription double diplomation IA-GL 2026-2027');
  end loop;
end;
$$;

-- Aucun changement des paiements, contrats, remises ou affectations existants.
-- La remise individuelle de 15 % de Marianne est conservee.
commit;
