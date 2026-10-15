begin;
-- Physical location catalogues are retired from the application. Preserve old
-- relationships and authorization scopes; normal operations need no location.
alter table escen.rooms alter column site_id drop not null, alter column building_id drop not null;
alter table escen.academic_offerings alter column site_id drop not null;
alter table escen.groups alter column site_id drop not null;
alter table escen.group_offerings alter column site_id drop not null;
alter table escen.staff_contracts alter column site_id drop not null;
alter table escen.purchases alter column site_id drop not null;
alter table escen.assets alter column site_id drop not null;
alter table escen.expenses alter column site_id drop not null;
-- NULL location must not bypass the normal uniqueness rules.
create unique index room_without_location_code on escen.rooms(code) where site_id is null;
create unique index offering_without_location on escen.academic_offerings(curriculum_id,academic_year_id) where site_id is null;
create unique index group_without_location on escen.groups(academic_year_id,level_id,name) where site_id is null;
commit;
