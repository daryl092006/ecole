-- Historical payments may have a known amount but no exact payment date.
-- Keep recorded_at as the independent timestamp of entry into the system.
ALTER TABLE escen.payments
ALTER COLUMN paid_on DROP NOT NULL;
