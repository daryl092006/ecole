-- Accord utilisateur du 28 octobre 2026 : migration et validation locales uniquement.
-- PostgREST 14 relance indéfiniment les erreurs 40001 déterministes.
-- PT409 conserve le refus métier et renvoie HTTP 409 sans relance automatique.
-- CREATE OR REPLACE conserve signatures, propriétaires, droits et paramètres.
begin;

do $fix$
declare
  target record;
  definition text;
begin
  for target in
    select p.oid, p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname in ('public', 'escen', 'escen_private')
      and l.lanname = 'plpgsql'
      and p.prokind = 'f'
      and p.prosrc ~* $pattern$\merrcode\s*=\s*'40001'$pattern$
    order by p.oid
  loop
    definition := regexp_replace(
      pg_get_functiondef(target.oid),
      $pattern$(\merrcode\s*=\s*)'40001'$pattern$,
      $replacement$\1'PT409'$replacement$,
      'gi'
    );
    execute definition;
    raise notice 'Conflit métier sans relance : %', target.signature;
  end loop;
end $fix$;

notify pgrst, 'reload schema';
commit;
