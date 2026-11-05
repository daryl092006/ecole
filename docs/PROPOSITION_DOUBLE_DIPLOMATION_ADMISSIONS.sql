-- Proposition complementaire a valider avant creation d'une migration.
-- Les admissions restent sur le parcours classique tant qu'aucun choix
-- individuel de double diplomation n'a ete enregistre a l'inscription.
begin;
do $$
declare
  definition text;
  old_filter text := 'f.category=''INSCRIPTION'' and f.archived_at is null';
  new_filter text := 'f.category=''INSCRIPTION'' and not f.double_degree and f.archived_at is null';
begin
  select pg_get_functiondef('public.escen_application_command(uuid,text,uuid,text,jsonb)'::regprocedure)
  into definition;
  if (length(definition)-length(replace(definition,old_filter,'')))/length(old_filter) <> 4 then
    raise exception 'Les quatre recherches de tarifs attendues sont introuvables';
  end if;
  execute replace(definition,old_filter,new_filter);
end;
$$;
commit;
