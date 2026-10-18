-- Une copie NON_TRAITE vaut 0/20 et reste identifiable comme non traitée.
-- ABSENT/JUSTIFIE restent sans note. Aucun résultat historique publié n’est réécrit.
begin;

alter table escen.grades drop constraint grades_check;
alter table escen.grades add constraint grades_value_absence_check check (
  absence_status is null
  or (absence_status in ('ABSENT', 'JUSTIFIE') and value is null)
  -- Les NULL historiques sont conservés ; les nouvelles écritures sont normalisées ci-dessous.
  or (absence_status = 'NON_TRAITE' and (value is null or value = 0))
);

create function escen_private.normalize_unprocessed_grade() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.absence_status = 'NON_TRAITE' then
    if new.value is not null and new.value <> 0 then
      raise exception 'Une copie non traitée doit avoir une note de 0/20' using errcode = '23514';
    end if;
    new.value := 0;
  end if;
  return new;
end $$;
create trigger grade_unprocessed_zero before insert or update on escen.grades
for each row execute function escen_private.normalize_unprocessed_grade();

create or replace function escen_private.apply_evaluation_transition() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare e escen.evaluations;
begin
  select * into e from escen.evaluations where id = new.evaluation_id for update;
  if e.cancelled_at is not null or e.status <> new.from_status or not (
      (new.from_status = 'BROUILLON' and new.to_status = 'SAISIES') or
      (new.from_status = 'SAISIES' and new.to_status = 'SOUMISES') or
      (new.from_status = 'SOUMISES' and new.to_status in ('A_CONTROLER', 'SAISIES')) or
      (new.from_status = 'A_CONTROLER' and new.to_status in ('VALIDEES', 'SAISIES')) or
      (new.from_status = 'VALIDEES' and new.to_status = 'PUBLIEES')) then
    raise exception 'Transition de notes interdite' using errcode = '23514';
  end if;
  if new.to_status = 'SAISIES' and new.from_status <> 'BROUILLON' and coalesce(length(btrim(new.reason)), 0) = 0 then
    raise exception 'Motif de retour obligatoire' using errcode = '23514';
  end if;
  if new.to_status = 'SOUMISES' then
    -- Les anciennes copies NON_TRAITE encore en saisie reçoivent leur zéro au moment
    -- de la soumission : modification auditée, attribuée à l’auteur de la transition.
    update escen.grades g set value = 0, last_modified_by = new.actor_id
      from escen.evaluation_candidates c
      where g.candidate_id = c.id and c.evaluation_id = e.id
        and g.absence_status = 'NON_TRAITE' and g.value is null;
    if not exists (select 1 from escen.evaluation_candidates where evaluation_id = e.id)
      or exists (
        select 1 from escen.evaluation_candidates c left join escen.grades g on g.candidate_id = c.id
        where c.evaluation_id = e.id and (c.eligibility <> 'ELIGIBLE' or not coalesce(
          (g.absence_status is null and g.value is not null)
          or (g.absence_status in ('ABSENT', 'JUSTIFIE') and g.value is null)
          or (g.absence_status = 'NON_TRAITE' and g.value = 0), false))
      ) then
      raise exception 'Notes ou traitement des absences incomplets : renseignez chaque note ou statut de copie' using errcode = '23514';
    end if;
  end if;
  update escen.evaluations set status = new.to_status where id = e.id;
  return new;
end $$;

-- Une correction motivée d’un zéro NON_TRAITE devient une note chiffrée ordinaire.
-- Le statut d’origine et les valeurs avant/après restent dans l’audit.
create or replace function escen_private.apply_grade_revision() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare g escen.grades; state text; previous_value escen.mark;
begin
  select * into g from escen.grades where id = new.grade_id for update;
  select e.status into state from escen.evaluations e
    join escen.evaluation_candidates c on c.evaluation_id = e.id where c.id = g.candidate_id;
  previous_value := case when g.absence_status = 'NON_TRAITE' then 0 else g.value end;
  if state <> 'PUBLIEES' or previous_value is distinct from new.old_value then
    raise exception 'Ancienne note ou état de publication incompatible' using errcode = '23514';
  end if;
  if new.complaint_id is not null and not exists (select 1 from escen.complaints
    where id = new.complaint_id and grade_id = g.id and status = 'CORRECTION_EVENTUELLE') then
    raise exception 'Réclamation incompatible avec la correction' using errcode = '23514';
  end if;
  update escen.grades set value = new.new_value,
    absence_status = case when g.absence_status = 'NON_TRAITE' then null else g.absence_status end,
    last_modified_by = new.actor_id where id = g.id;
  return new;
end $$;

commit;
