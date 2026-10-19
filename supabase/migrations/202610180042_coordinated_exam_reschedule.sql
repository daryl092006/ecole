begin;

alter table escen.exam_deliveries
  add column reason text default null,
  add constraint exam_delivery_reason_length
    check (reason is null or char_length(btrim(reason)) between 3 and 1000);

create function escen_private.assert_exam_reschedule(
  p_evaluation_id uuid,
  p_previous_open timestamptz,
  p_next_open timestamptz,
  p_reason text
) returns void
language plpgsql set search_path = pg_catalog as $$
begin
  if coalesce(char_length(btrim(p_reason)), 0) not between 3 and 1000 then
    raise exception 'Déplacement d’épreuve : motif de 3 à 1000 caractères obligatoire'
      using errcode = '23514';
  end if;

  -- Sérialiser la vérification avec une première copie ou un premier résultat.
  lock table escen.exam_attempts, escen.grades in share row exclusive mode;

  if p_previous_open <= clock_timestamp() then
    raise exception 'Épreuve déjà ouverte : déplacement interdit'
      using errcode = '23514';
  end if;
  if p_next_open <= clock_timestamp() then
    raise exception 'La nouvelle ouverture de l’épreuve doit rester dans le futur'
      using errcode = '23514';
  end if;
  if exists (
    select 1 from escen.exam_attempts where evaluation_id = p_evaluation_id
  ) or exists (
    select 1 from escen.grades g
    join escen.evaluation_candidates c on c.id = g.candidate_id
    where c.evaluation_id = p_evaluation_id
      and (g.value is not null or g.absence_status is not null)
  ) then
    raise exception 'Épreuve avec copie ou résultat : déplacement interdit'
      using errcode = '23514';
  end if;
end $$;

-- Couvrir aussi un changement direct des horaires d’accès par une écriture serveur.
create function escen_private.guard_exam_reschedule() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  perform escen_private.assert_exam_reschedule(
    old.evaluation_id, old.access_opens_at, new.access_opens_at, new.reason
  );
  return new;
end $$;

create trigger exam_reschedule_guard
before update of access_opens_at, access_closes_at on escen.exam_deliveries
for each row
when (old.access_opens_at is distinct from new.access_opens_at
   or old.access_closes_at is distinct from new.access_closes_at)
execute function escen_private.guard_exam_reschedule();

create function escen_private.move_session_exam() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare
  delivery escen.exam_deliveries;
  next_open timestamptz;
  next_close timestamptz;
begin
  select * into delivery from escen.exam_deliveries
    where session_id = new.id for update;
  if not found then return new; end if;

  next_open := delivery.access_opens_at + (new.starts_at - old.starts_at);
  next_close := delivery.access_closes_at + (new.starts_at - old.starts_at);
  if next_open < new.starts_at or next_close > new.ends_at then
    raise exception 'Le nouveau créneau doit contenir toute la fenêtre d’accès à l’épreuve'
      using errcode = '23514';
  end if;

  -- Les écritures existantes de salles secondaires prennent le même verrou.
  perform r.id from escen.rooms r
    where r.id in (
      select er.room_id from escen.exam_rooms er where er.delivery_id = delivery.id
    ) order by r.id for update;

  if exists (
    select 1 from escen.exam_rooms er
    where er.delivery_id = delivery.id and (
      exists (
        select 1 from escen.sessions s
        where s.id <> new.id and s.status not in ('ANNULE', 'REPORTE')
          and s.effective_room_id = er.room_id
          and s.starts_at < next_close and next_open < s.ends_at
      ) or exists (
        select 1 from escen.exam_rooms other_room
        join escen.exam_deliveries other_delivery on other_delivery.id = other_room.delivery_id
        join escen.sessions other_session on other_session.id = other_delivery.session_id
        where other_delivery.id <> delivery.id and other_room.room_id = er.room_id
          and other_session.status not in ('ANNULE', 'REPORTE')
          and other_delivery.access_opens_at < next_close
          and next_open < other_delivery.access_closes_at
      )
    )
  ) then
    raise exception 'Conflit de salle secondaire sur le nouveau créneau de l’épreuve'
      using errcode = '23514';
  end if;

  -- Les affectations de surveillant verrouillent déjà le compte concerné.
  perform a.id from escen.accounts a where a.id in (
    select ss.account_id from escen.session_supervisors ss where ss.session_id = new.id
    union
    select rs.account_id from escen.exam_room_supervisors rs
      join escen.exam_rooms er on er.id = rs.exam_room_id
      where er.delivery_id = delivery.id
  ) order by a.id for update;

  if exists (
    with own_supervisors as (
      select ss.account_id from escen.session_supervisors ss where ss.session_id = new.id
      union
      select rs.account_id from escen.exam_room_supervisors rs
        join escen.exam_rooms er on er.id = rs.exam_room_id
        where er.delivery_id = delivery.id
    ), other_assignments as (
      select ss.account_id, ss.session_id from escen.session_supervisors ss
      union
      select rs.account_id, ed.session_id from escen.exam_room_supervisors rs
        join escen.exam_rooms er on er.id = rs.exam_room_id
        join escen.exam_deliveries ed on ed.id = er.delivery_id
    )
    select 1 from own_supervisors own
      join other_assignments other_assignment on other_assignment.account_id = own.account_id
      join escen.sessions s on s.id = other_assignment.session_id
      where s.id <> new.id and s.status not in ('ANNULE', 'REPORTE')
        and s.starts_at < new.ends_at and new.starts_at < s.ends_at
  ) then
    raise exception 'Surveillant déjà affecté sur le nouveau créneau de l’épreuve'
      using errcode = '23514';
  end if;

  -- Vérifier l’heure après toute attente de verrou, y compris si seul le terme change.
  perform escen_private.assert_exam_reschedule(
    delivery.evaluation_id, delivery.access_opens_at, next_open, new.reason
  );

  update escen.exam_deliveries
    set access_opens_at = next_open,
        access_closes_at = next_close,
        reason = new.reason
    where id = delivery.id;
  return new;
end $$;

-- AFTER : le contrôle existant de diffusion voit les nouveaux horaires de séance.
-- Toute erreur annule aussi la séance, l’audit et la révision de la transaction.
create trigger session_exam_reschedule
after update of starts_at, ends_at on escen.sessions
for each row
when (old.starts_at is distinct from new.starts_at
   or old.ends_at is distinct from new.ends_at)
execute function escen_private.move_session_exam();

revoke all on function escen_private.assert_exam_reschedule(uuid, timestamptz, timestamptz, text) from public;
revoke all on function escen_private.guard_exam_reschedule() from public;
revoke all on function escen_private.move_session_exam() from public;

commit;
