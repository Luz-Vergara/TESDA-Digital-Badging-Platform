begin;

-- PB-1A prepares the first real Warehousing Services NC II competency badge.
-- This migration is intentionally data-only apart from reconciling the
-- standard_type column already used by the integration contract.
alter table public.qualifications
  add column if not exists standard_type text
  check (standard_type in ('CS', 'MCC', 'TR'));

do $$
begin
  if not exists (
    select 1
    from public.qualifications
    where id = 'QUAL-WH-NC-II'
      and qualification_code = 'WH-NC-II'
      and title = 'Warehousing Services NC II'
  ) then
    raise exception 'Expected Warehousing Services NC II qualification is missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.learners
    where id = 'LEARNER-DEMO-0002'
      and learner_uli = 'DEMO-ULI-0002'
  ) then
    raise exception 'Expected Learner 2 identity is missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.enrollments
    where id = 'ENR-MOCK-TRAINING-0002'
      and learner_id = 'LEARNER-DEMO-0002'
  ) then
    raise exception 'Expected Learner 2 enrollment is missing or mismatched';
  end if;
end;
$$;

update public.qualifications
set standard_type = 'TR'
where id = 'QUAL-WH-NC-II';

insert into public.competencies (
  id,
  qualification_id,
  competency_code,
  title,
  sequence_no
) values (
  'COMP-WH-LOG432301',
  'QUAL-WH-NC-II',
  'LOG432301',
  'Receive stocks/goods',
  2
);

insert into public.badge_definitions (
  id,
  qualification_id,
  badge_code,
  name,
  badge_type,
  description,
  criteria,
  validity_months,
  status,
  firebase_badge_template_id
) values (
  'BADGE-DEF-WH-LOG432301-PROFICIENT',
  'QUAL-WH-NC-II',
  'BADGE-WH-LOG432301-PROFICIENT',
  'Receive stocks/goods — Proficient',
  'Proficient',
  'External competency badge for LOG432301 in Warehousing Services NC II.',
  'External evidence confirms completion of LOG432301 — Receive stocks/goods.',
  36,
  'Active',
  'vurWRNY5Wq20Xu3UxS2c'
);

insert into public.badge_requirements (
  badge_definition_id,
  competency_id
) values (
  'BADGE-DEF-WH-LOG432301-PROFICIENT',
  'COMP-WH-LOG432301'
);

insert into public.learner_competency_completions (
  id,
  learner_id,
  enrollment_id,
  competency_id,
  status,
  completed_at,
  verified_by
) values (
  'LCC-PB1-LEARNER-0002-LOG432301',
  'LEARNER-DEMO-0002',
  'ENR-MOCK-TRAINING-0002',
  'COMP-WH-LOG432301',
  'Completed',
  '2026-09-03T00:00:00Z',
  'MOCK_T2MIS'
);

-- Retain the legacy definition for audit/history, but remove it from new
-- external eligibility calculations. Firestore credentials are unaffected.
update public.badge_definitions
set status = 'Inactive'
where id = 'BADGE-DEF-WH-001'
  and status = 'Active';

do $$
begin
  if (
    select count(*)
    from public.badge_requirements
    where badge_definition_id = 'BADGE-DEF-WH-LOG432301-PROFICIENT'
  ) <> 1 then
    raise exception 'LOG432301 Proficient definition must have exactly one requirement';
  end if;

  if exists (
    select 1
    from public.badge_definitions
    where id = 'BADGE-DEF-WH-001'
      and status = 'Active'
  ) then
    raise exception 'Legacy Warehousing Skilled shortcut remains active';
  end if;
end;
$$;

commit;
