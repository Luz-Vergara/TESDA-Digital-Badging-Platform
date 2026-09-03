begin;

-- Integration authorization is deliberately private. These rows are a
-- server-provisioned projection of approved Firestore links, not a second
-- business-link registry.
create schema if not exists integration;

create table if not exists integration.api_scopes (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  scope_type text not null check (scope_type in ('training_center_read', 'learner_read')),
  external_training_center_id text references public.training_centers(id),
  external_learner_uli text,
  firestore_link_id text not null,
  firestore_link_version integer not null check (firestore_link_version > 0),
  active boolean not null default true,
  provisioned_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (firebase_uid, scope_type, firestore_link_id, firestore_link_version)
);

create index if not exists api_scopes_active_firebase_uid_idx
  on integration.api_scopes(firebase_uid, scope_type)
  where active;

-- Defense in depth: this table is not exposed through the Data API and has no
-- user policies. service_role bypasses RLS only inside the Edge Function and
-- the privileged provisioning task.
alter table integration.api_scopes enable row level security;

revoke all on schema integration from public, anon, authenticated;
revoke all on all tables in schema integration from public, anon, authenticated;
grant usage on schema integration to service_role;
grant select, insert, update, delete on integration.api_scopes to service_role;

-- PostgREST cannot query an unexposed schema directly. These public RPCs keep
-- the table private while allowing only service_role callers to read or replace
-- the derived enforcement projection. Both are SECURITY INVOKER, so no public
-- SECURITY DEFINER privilege boundary is introduced.
create or replace function public.get_active_integration_api_scopes(
  target_firebase_uid text
)
returns table (
  firebase_uid text,
  scope_type text,
  external_training_center_id text,
  external_learner_uli text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    scope.firebase_uid,
    scope.scope_type,
    scope.external_training_center_id,
    scope.external_learner_uli
  from integration.api_scopes as scope
  where scope.firebase_uid = target_firebase_uid
    and scope.active = true;
$$;

create or replace function public.replace_integration_api_scopes(
  p_link_ids text[],
  p_scopes jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update integration.api_scopes
  set active = false, revoked_at = now()
  where firestore_link_id = any(p_link_ids)
    and active = true;

  insert into integration.api_scopes (
    firebase_uid,
    scope_type,
    external_training_center_id,
    external_learner_uli,
    firestore_link_id,
    firestore_link_version,
    active,
    revoked_at
  )
  select
    scope.firebase_uid,
    scope.scope_type,
    scope.external_training_center_id,
    scope.external_learner_uli,
    scope.firestore_link_id,
    scope.firestore_link_version,
    true,
    null
  from jsonb_to_recordset(coalesce(p_scopes, '[]'::jsonb)) as scope(
    firebase_uid text,
    scope_type text,
    external_training_center_id text,
    external_learner_uli text,
    firestore_link_id text,
    firestore_link_version integer
  )
  on conflict (firebase_uid, scope_type, firestore_link_id, firestore_link_version)
  do update set
    external_training_center_id = excluded.external_training_center_id,
    external_learner_uli = excluded.external_learner_uli,
    active = true,
    revoked_at = null,
    provisioned_at = now();
end;
$$;

revoke all on function public.get_active_integration_api_scopes(text) from public, anon, authenticated;
revoke all on function public.replace_integration_api_scopes(text[], jsonb) from public, anon, authenticated;
grant execute on function public.get_active_integration_api_scopes(text) to service_role;
grant execute on function public.replace_integration_api_scopes(text[], jsonb) to service_role;

-- Existing linked projects have this legacy maintenance helper. It is not part
-- of the runtime architecture, so prevent it from remaining publicly callable
-- with SECURITY DEFINER privileges.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- This field is an eligibility-rule link only. Firebase continues to own badge
-- template metadata, badge requests, approval, issuance, and verification.
alter table public.badge_definitions
  add column if not exists firebase_badge_template_id text;

alter table public.learners
  add column if not exists learner_uli text;

update public.learners
set learner_uli = external_learner_id
where learner_uli is null;

alter table public.learners
  alter column learner_uli set not null;

create unique index if not exists learners_learner_uli_key
  on public.learners(learner_uli);

alter table public.enrollments
  add column if not exists source_record_id text;

update public.enrollments
set source_record_id = id
where source_record_id is null;

alter table public.enrollments
  alter column source_record_id set not null;

comment on column public.badge_definitions.firebase_badge_template_id is
  'Non-authoritative Firebase badge-template link used only when returning external eligibility evidence.';
comment on column public.learners.learner_uli is
  'Canonical external learner identifier used by the integration API.';

-- The first demo schema used these tables before the architecture was split.
-- They are retained for migration compatibility but are no longer an API or
-- application source of truth. A later approved cleanup may remove them.
comment on table public.badge_requests is
  'Deprecated external-prototype table. Firestore badgeRequests is canonical.';
comment on table public.badge_request_items is
  'Deprecated external-prototype table. Firestore badgeRequests is canonical.';
comment on table public.issued_badges is
  'Deprecated external-prototype table. Firestore issuedBadges is canonical.';

commit;
