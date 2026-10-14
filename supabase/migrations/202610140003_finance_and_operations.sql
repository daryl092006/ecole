begin;
create table escen.fee_types (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  category text not null check (category in ('SCOLARITE','INSCRIPTION','ANNEXE')),
  active boolean not null default true
);
create table escen.fee_rates (
  id uuid primary key default gen_random_uuid(),
  fee_type_id uuid not null references escen.fee_types(id) on delete restrict,
  offering_id uuid not null references escen.academic_offerings(id) on delete restrict,
  amount escen.xof_amount not null,
  valid_from date not null,
  valid_until date,
  eligibility jsonb not null default '{}',
  approved_by uuid not null references escen.accounts(id) on delete restrict,
  check (valid_until is null or valid_until > valid_from)
);
create table escen.scholarships (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  kind text not null check (kind in ('POURCENTAGE','MONTANT_FIXE')),
  percent numeric check (percent > 0 and percent <= 100),
  amount escen.xof_amount,
  active boolean not null default true,
  check ((kind = 'POURCENTAGE' and percent is not null and amount is null)
    or (kind = 'MONTANT_FIXE' and amount is not null and amount > 0 and percent is null))
);
create table escen.scholarship_awards (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references escen.scholarships(id) on delete restrict,
  enrollment_id uuid not null references escen.enrollments(id) on delete restrict,
  valid_from date not null,
  valid_until date,
  terms_snapshot jsonb not null,
  granted_by uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  revoked_at timestamptz,
  revocation_reason text,
  check (valid_until is null or valid_until > valid_from),
  check (revoked_at is null or (revocation_reason is not null and length(btrim(revocation_reason)) > 0)),
  unique (scholarship_id, enrollment_id, valid_from), unique (id, enrollment_id)
);
create table escen.financial_contracts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references escen.enrollments(id) on delete restrict,
  reference escen.nonempty_text not null unique,
  currency text not null default 'XOF' check (currency = 'XOF'),
  created_at timestamptz not null default now(),
  unique (id, enrollment_id)
);
create table escen.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references escen.financial_contracts(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','SUPERSEDED')),
  supersedes_id uuid,
  approved_by uuid references escen.accounts(id) on delete restrict,
  approved_at timestamptz,
  reason escen.nonempty_text not null,
  foreign key (supersedes_id, contract_id) references escen.contract_versions(id, contract_id) on delete restrict,
  unique (contract_id, version), unique (id, contract_id),
  check (supersedes_id is null or supersedes_id <> id),
  check (status = 'DRAFT' or (approved_by is not null and approved_at is not null))
);
create unique index one_approved_contract_version on escen.contract_versions(contract_id) where status = 'APPROVED';
create table escen.contract_lines (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null,
  version_id uuid not null,
  fee_type_id uuid not null references escen.fee_types(id) on delete restrict,
  rate_id uuid references escen.fee_rates(id) on delete restrict,
  description escen.nonempty_text not null,
  amount escen.xof_amount not null,
  foreign key (version_id, contract_id) references escen.contract_versions(id, contract_id) on delete restrict,
  unique (id, version_id), unique (id, contract_id)
);
create table escen.contract_discounts (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null,
  version_id uuid not null,
  scholarship_award_id uuid references escen.scholarship_awards(id) on delete restrict,
  amount escen.xof_amount not null check (amount > 0),
  reason escen.nonempty_text not null,
  foreign key (line_id, version_id) references escen.contract_lines(id, version_id) on delete restrict
);
create table escen.installments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references escen.contract_versions(id) on delete restrict,
  position integer not null check (position > 0),
  due_on date not null,
  amount escen.xof_amount not null check (amount > 0),
  description escen.nonempty_text not null,
  unique (version_id, position), unique (id, version_id)
);
create table escen.payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references escen.enrollments(id) on delete restrict,
  payer_person_id uuid references escen.people(id) on delete restrict,
  payer_name escen.nonempty_text not null,
  amount escen.xof_amount not null check (amount > 0),
  method text not null check (method in ('ESPECES','VIREMENT','CARTE','MOBILE_MONEY','CHEQUE')),
  provider escen.nonempty_text not null,
  reference escen.nonempty_text not null,
  paid_on date not null,
  recorded_by uuid not null references escen.accounts(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  withdrawal_fee escen.xof_amount not null default 0,
  comment text,
  unique (provider, reference), unique (id, enrollment_id)
);
create table escen.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references escen.payments(id) on delete restrict,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  reversed_at timestamptz not null default now()
);
create table escen.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references escen.payments(id) on delete restrict,
  reference escen.nonempty_text not null unique,
  snapshot jsonb not null,
  issued_by uuid not null references escen.accounts(id) on delete restrict,
  issued_at timestamptz not null default now()
);
create table escen.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null,
  enrollment_id uuid not null,
  contract_id uuid not null,
  version_id uuid not null,
  line_id uuid not null,
  installment_id uuid,
  amount escen.xof_amount not null check (amount > 0),
  allocated_by uuid not null references escen.accounts(id) on delete restrict,
  allocated_at timestamptz not null default now(),
  foreign key (payment_id, enrollment_id) references escen.payments(id, enrollment_id) on delete restrict,
  foreign key (contract_id, enrollment_id) references escen.financial_contracts(id, enrollment_id) on delete restrict,
  foreign key (version_id, contract_id) references escen.contract_versions(id, contract_id) on delete restrict,
  foreign key (line_id, version_id) references escen.contract_lines(id, version_id) on delete restrict,
  foreign key (installment_id, version_id) references escen.installments(id, version_id) on delete restrict
);
create table escen.allocation_reversals (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null unique references escen.payment_allocations(id) on delete restrict,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  reversed_at timestamptz not null default now()
);
create table escen.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references escen.payments(id) on delete restrict,
  amount escen.xof_amount not null check (amount > 0),
  reference escen.nonempty_text not null unique,
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  refunded_at timestamptz not null default now()
);
create table escen.credit_notes (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references escen.contract_lines(id) on delete restrict,
  amount escen.xof_amount not null check (amount > 0),
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  issued_at timestamptz not null default now()
);
create table escen.file_objects (
  id uuid primary key default gen_random_uuid(),
  bucket escen.nonempty_text not null,
  object_path escen.nonempty_text not null,
  original_name escen.nonempty_text not null,
  mime_type escen.nonempty_text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_by uuid not null references escen.accounts(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  unique (bucket, object_path)
);
create table escen.document_types (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  multiple boolean not null default false,
  accepted_mime_types text[] not null,
  max_byte_size bigint not null check (max_byte_size > 0),
  check (cardinality(accepted_mime_types) > 0)
);
create table escen.document_requirements (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references escen.curricula(id) on delete restrict,
  document_type_id uuid not null references escen.document_types(id) on delete restrict,
  required boolean not null,
  unique (curriculum_id, document_type_id)
);
create table escen.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references escen.students(id) on delete restrict,
  enrollment_id uuid,
  document_type_id uuid not null references escen.document_types(id) on delete restrict,
  file_id uuid not null references escen.file_objects(id) on delete restrict,
  supersedes_id uuid references escen.student_documents(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'A_VERIFIER' check (status in ('A_VERIFIER','CONFORME','NON_CONFORME')),
  foreign key (enrollment_id, student_id) references escen.enrollments(id, student_id) on delete restrict
);
create table escen.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references escen.student_documents(id) on delete restrict,
  status text not null check (status in ('CONFORME','NON_CONFORME')),
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  reviewed_at timestamptz not null default now()
);
create table escen.absence_justifications (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references escen.attendances(id) on delete restrict,
  file_id uuid not null references escen.file_objects(id) on delete restrict,
  reason escen.nonempty_text not null,
  status text not null default 'EN_ATTENTE' check (status in ('EN_ATTENTE','VALIDE','REFUSE')),
  reviewed_by uuid references escen.accounts(id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text,
  check (status = 'EN_ATTENTE' or (reviewed_by is not null and reviewed_at is not null and review_reason is not null and length(btrim(review_reason)) > 0))
);
create table escen.payment_documents (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references escen.payments(id) on delete restrict,
  file_id uuid not null references escen.file_objects(id) on delete restrict,
  unique (payment_id, file_id)
);
create table escen.communications (
  id uuid primary key default gen_random_uuid(),
  title escen.nonempty_text not null,
  content escen.nonempty_text not null,
  author_id uuid not null references escen.accounts(id) on delete restrict,
  published_at timestamptz,
  expires_at timestamptz,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  check (expires_at is null or (published_at is not null and expires_at > published_at)),
  check (withdrawn_at is null or (withdrawal_reason is not null and length(btrim(withdrawal_reason)) > 0))
);
create table escen.communication_audiences (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references escen.communications(id) on delete restrict,
  role_id uuid references escen.roles(id) on delete restrict,
  group_id uuid references escen.groups(id) on delete restrict,
  site_id uuid references escen.sites(id) on delete restrict,
  all_accounts boolean not null default false,
  check ((case when role_id is null then 0 else 1 end) + (case when group_id is null then 0 else 1 end)
    + (case when site_id is null then 0 else 1 end) + (case when all_accounts then 1 else 0 end) = 1)
);
create table escen.communication_reads (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references escen.communications(id) on delete restrict,
  account_id uuid not null references escen.accounts(id) on delete restrict,
  read_at timestamptz not null default now(),
  unique (communication_id, account_id)
);
create table escen.communication_files (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references escen.communications(id) on delete restrict,
  file_id uuid not null references escen.file_objects(id) on delete restrict,
  unique (communication_id, file_id)
);
create table escen.support_categories (
  id uuid primary key default gen_random_uuid(),
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  active boolean not null default true
);
create table escen.support_tickets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references escen.accounts(id) on delete restrict,
  assigned_to uuid references escen.accounts(id) on delete restrict,
  category_id uuid references escen.support_categories(id) on delete restrict,
  reference escen.nonempty_text not null unique,
  title escen.nonempty_text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED')),
  priority text not null check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  created_at timestamptz not null default now()
);
create table escen.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references escen.support_tickets(id) on delete restrict,
  author_id uuid not null references escen.accounts(id) on delete restrict,
  body escen.nonempty_text not null,
  created_at timestamptz not null default now()
);
create table escen.support_files (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references escen.support_messages(id) on delete restrict,
  file_id uuid not null references escen.file_objects(id) on delete restrict,
  unique (message_id, file_id)
);
create table escen.suppliers (
  id uuid primary key default gen_random_uuid(),
  name escen.nonempty_text not null,
  tax_identifier text,
  email text,
  phone text,
  active boolean not null default true
);
create table escen.purchases (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references escen.sites(id) on delete restrict,
  supplier_id uuid references escen.suppliers(id) on delete restrict,
  reference escen.nonempty_text not null unique,
  requested_by uuid not null references escen.accounts(id) on delete restrict,
  status text not null default 'DEMANDE' check (status in ('DEMANDE','APPROUVE','REFUSE','RECEPTION_PARTIELLE','RECU')),
  reason escen.nonempty_text not null,
  created_at timestamptz not null default now()
);
create table escen.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references escen.purchases(id) on delete restrict,
  description escen.nonempty_text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_amount escen.xof_amount not null,
  unique (id, purchase_id)
);
create table escen.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null,
  line_id uuid not null,
  quantity numeric(12,3) not null check (quantity > 0),
  received_by uuid not null references escen.accounts(id) on delete restrict,
  received_at timestamptz not null default now(),
  reason escen.nonempty_text not null,
  foreign key (line_id, purchase_id) references escen.purchase_lines(id, purchase_id) on delete restrict
);
create table escen.assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references escen.sites(id) on delete restrict,
  code escen.nonempty_text not null unique,
  name escen.nonempty_text not null,
  location text,
  status text not null check (status in ('DISPONIBLE','MAINTENANCE','HORS_SERVICE'))
);
create table escen.asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references escen.assets(id) on delete restrict,
  receipt_id uuid references escen.purchase_receipts(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity <> 0),
  actor_id uuid not null references escen.accounts(id) on delete restrict,
  reason escen.nonempty_text not null,
  happened_at timestamptz not null default now()
);
create table escen.expenses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references escen.sites(id) on delete restrict,
  academic_year_id uuid references escen.academic_years(id) on delete restrict,
  purchase_id uuid references escen.purchases(id) on delete restrict,
  amount escen.xof_amount not null check (amount > 0),
  reference escen.nonempty_text not null unique,
  description escen.nonempty_text not null,
  paid_on date not null,
  recorded_by uuid not null references escen.accounts(id) on delete restrict
);
commit;
