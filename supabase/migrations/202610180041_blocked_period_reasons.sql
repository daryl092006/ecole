begin;

alter table escen.blocked_periods
  add column reason text default null,
  add constraint blocked_period_reason_length
    check (
      reason is null
      or char_length(btrim(reason)) between 3 and 1000
    );

commit;
