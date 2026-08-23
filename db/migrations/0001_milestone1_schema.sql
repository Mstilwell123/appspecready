-- App Builder Super App — Milestone 1 schema
-- Decision graph DM-01..DM-09 with Row-Level Security (SEC-02)
-- and append-only audit/version tables (NFR-04).
-- Apply to a NEW dedicated Supabase project only.

-- ---------- DM-01 Project ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text,
  goal text,                        -- the founder's Goal (capital-G), PRD v3 §1
  status text not null default 'active',
  product_category text,
  current_stage text not null default 'capture',
  risk_tier text not null default 'standard',
  active_build_pack_version int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- DM-02 Decision ----------
create type decision_state as enum (
  'Unasked','Asked','Partial','Proposed','Needs Evidence',
  'Assumption','Unknown','Conflict','Approved','Deferred','Rejected','Superseded'
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  domain text not null,             -- e.g. goal, user, problem, vendor
  question text,
  raw_answer text,
  system_interpretation text,
  approved_answer text,
  state decision_state not null default 'Unasked',
  confidence smallint check (confidence between 0 and 4),
  approved_at timestamptz,
  version int not null default 1,
  change_reason text,
  created_at timestamptz not null default now()
);

-- ---------- DM-03 Evidence ----------
create table evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_type text not null,        -- web, founder, observation, inference
  source_ref text,                  -- URL or reference
  published_at date,
  retrieved_at timestamptz not null default now(),
  excerpt text,
  supported_claim text,
  limitation text,
  confidence smallint check (confidence between 0 and 4),
  stale_after timestamptz           -- FR-RES-06 staleness
);

-- ---------- DM-04 Relationship ----------
create type relation_kind as enum (
  'supports','opposes','depends_on','conflicts_with','supersedes','affects','verifies'
);

create table relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_id uuid not null,
  to_id uuid not null,
  kind relation_kind not null,
  created_at timestamptz not null default now()
);

-- ---------- DM-05 Requirement ----------
create table requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stable_id text not null,          -- e.g. FR-INT-01 style project-local ID
  actor text, trigger text, behavior text, rule text, failure_behavior text,
  release text not null default 'r1',
  priority text not null default 'should',
  acceptance_criteria text,
  verifier_type text,               -- automated, manual, review
  approved boolean not null default false,
  unique (project_id, stable_id)
);

-- ---------- DM-06 Journey ----------
create table journeys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  actor text, entry text, steps jsonb, first_value text,
  successful_end text, empty_state text, failure text, recovery text,
  data text, permissions text
);

-- ---------- DM-07 Validation Experiment ----------
create table validation_experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  hypothesis text, method text, participants text,
  threshold text, deadline date, evidence text, result text, decision text
);

-- ---------- DM-09 Vendor Dependency (PRD v3) ----------
create table vendor_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,           -- payments, sms, transcription...
  triggering_requirement_ids uuid[],
  candidates jsonb,                 -- [{name, evidence_ids, pricing_model, lockin_rating, portability_notes}]
  selected_vendor text,             -- null = deferred open decision
  founder_accounts_needed text[],
  approved boolean not null default false
);

-- ---------- DM-08 Build Pack + NFR-04 append-only audit ----------
create table build_packs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version int not null,
  approved_decision_ids uuid[] not null,
  artifact jsonb not null,
  readiness_result jsonb,
  unresolved_risks jsonb,
  approved_by uuid not null,        -- founder (P-05); no third-party review
  export_checksum text,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table audit_log (            -- append-only (SEC-03, NFR-04)
  id bigint generated always as identity primary key,
  project_id uuid references projects(id) on delete cascade,
  actor uuid not null,
  action text not null,             -- approve, export, change...
  detail jsonb,
  created_at timestamptz not null default now()
);
revoke update, delete on audit_log from authenticated;

-- ---------- Row-Level Security: owner-only on every table (SEC-02) ----------
do $$
declare t text;
begin
  foreach t in array array['projects','decisions','evidence','relationships',
    'requirements','journeys','validation_experiments','vendor_dependencies',
    'build_packs','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy "own projects" on projects
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Child tables: allowed when the parent project is owned by the caller.
create or replace function owns_project(pid uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from projects where id = pid and owner = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['decisions','evidence','relationships','requirements',
    'journeys','validation_experiments','vendor_dependencies','build_packs','audit_log']
  loop
    execute format(
      'create policy "own project rows" on %I using (owns_project(project_id))
       with check (owns_project(project_id))', t);
  end loop;
end $$;
