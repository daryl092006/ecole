-- Stockage présenté puis autorisé pour création et vérifications locales.
-- Stockage privé des nouvelles pièces étudiantes ; accès uniquement via le serveur.
begin;
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
      values ('escen-student-documents', 'escen-student-documents', false, 5242880,
        array['application/pdf','image/jpeg','image/png'])
      on conflict (id) do nothing;
    if exists (select 1 from storage.buckets
        where id = 'escen-student-documents' and public) then
      raise exception 'Le stockage des pièces étudiantes doit être privé';
    end if;
  end if;
end $$;
commit;
