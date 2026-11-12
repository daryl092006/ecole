begin;

alter table escen.people
  add column if not exists nif text;

alter table escen.people
  drop constraint if exists people_nif_length_check;

alter table escen.people
  add constraint people_nif_length_check
  check (nif is null or (char_length(btrim(nif)) >= 1 and char_length(btrim(nif)) <= 80));

commit;

