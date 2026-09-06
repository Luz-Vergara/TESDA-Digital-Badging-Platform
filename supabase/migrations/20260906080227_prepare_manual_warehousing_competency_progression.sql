begin;

-- PB-3A prepares the six real Warehousing Services NC II competency badges.
-- It is deliberately data-only and must not be applied until PB-3B.
do $$
begin
  if not exists (
    select 1
    from public.qualifications
    where id = 'QUAL-WH-NC-II'
      and qualification_code = 'WH-NC-II'
      and title = 'Warehousing Services NC II'
      and standard_type = 'TR'
      and status = 'Active'
  ) then
    raise exception 'Expected active Warehousing Services NC II TR qualification is missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.competencies
    where id = 'COMP-WH-LOG432301'
      and qualification_id = 'QUAL-WH-NC-II'
      and competency_code = 'LOG432301'
      and title = 'Receive stocks/goods'
      and sequence_no = 2
  ) then
    raise exception 'Existing LOG432301 competency is missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.badge_definitions
    where id = 'BADGE-DEF-WH-LOG432301-PROFICIENT'
      and qualification_id = 'QUAL-WH-NC-II'
      and badge_code = 'BADGE-WH-LOG432301-PROFICIENT'
      and name = 'Receive stocks/goods — Proficient'
      and badge_type = 'Proficient'
      and status = 'Active'
      and firebase_badge_template_id = 'vurWRNY5Wq20Xu3UxS2c'
  ) then
    raise exception 'Existing LOG432301 Proficient definition is missing or mismatched';
  end if;

  if (
    select count(*)
    from public.badge_requirements
    where badge_definition_id = 'BADGE-DEF-WH-LOG432301-PROFICIENT'
      and competency_id = 'COMP-WH-LOG432301'
  ) <> 1 or (
    select count(*)
    from public.badge_requirements
    where badge_definition_id = 'BADGE-DEF-WH-LOG432301-PROFICIENT'
  ) <> 1 then
    raise exception 'Existing LOG432301 Proficient requirement is missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.badge_definitions
    where id = 'BADGE-DEF-WH-001'
      and badge_type = 'Skilled'
      and status = 'Inactive'
  ) then
    raise exception 'Legacy Warehousing Skilled definition must already be Inactive';
  end if;

  if exists (
    with expected(id, competency_code, title, sequence_no) as (
      values
        ('COMP-WH-LOG432302', 'LOG432302', 'Store stocks/goods', 3),
        ('COMP-WH-LOG432303', 'LOG432303', 'Pick stocks/goods', 4),
        ('COMP-WH-LOG432304', 'LOG432304', 'Issue/dispatch stocks/goods', 5),
        ('COMP-WH-LOG432305', 'LOG432305', 'Pack stocks/goods', 6),
        ('COMP-WH-LOG432306', 'LOG432306', 'Operate and maintain manual material handling equipment', 7)
    )
    select 1
    from expected e
    join public.competencies c
      on c.id = e.id
      or c.competency_code = e.competency_code
      or (c.qualification_id = 'QUAL-WH-NC-II' and c.sequence_no = e.sequence_no)
    where c.id <> e.id
       or c.qualification_id <> 'QUAL-WH-NC-II'
       or c.competency_code <> e.competency_code
       or c.title <> e.title
       or c.sequence_no <> e.sequence_no
  ) then
    raise exception 'A Warehousing competency row conflicts with the expected LOG432302-LOG432306 data';
  end if;

  if exists (
    with expected(id, badge_code, name, competency_code, competency_title, firebase_badge_template_id) as (
      values
        ('BADGE-DEF-WH-LOG432302-PROFICIENT', 'BADGE-WH-LOG432302-PROFICIENT', 'Store stocks/goods — Proficient', 'LOG432302', 'Store stocks/goods', '5xGNugoZoZWfLIvCs8zT'),
        ('BADGE-DEF-WH-LOG432303-PROFICIENT', 'BADGE-WH-LOG432303-PROFICIENT', 'Pick stocks/goods — Proficient', 'LOG432303', 'Pick stocks/goods', 'ZtPT4ShwUFigafBTA5Sa'),
        ('BADGE-DEF-WH-LOG432304-PROFICIENT', 'BADGE-WH-LOG432304-PROFICIENT', 'Issue/dispatch stocks/goods — Proficient', 'LOG432304', 'Issue/dispatch stocks/goods', '5IcvSWBdrNzlr5bL2Hr2'),
        ('BADGE-DEF-WH-LOG432305-PROFICIENT', 'BADGE-WH-LOG432305-PROFICIENT', 'Pack stocks/goods — Proficient', 'LOG432305', 'Pack stocks/goods', '4VLphRnCuFZONX1tCyia'),
        ('BADGE-DEF-WH-LOG432306-PROFICIENT', 'BADGE-WH-LOG432306-PROFICIENT', 'Operate and maintain manual material handling equipment — Proficient', 'LOG432306', 'Operate and maintain manual material handling equipment', '5gzqcaV3r0ecLjOgOMwT')
    )
    select 1
    from expected e
    join public.badge_definitions bd
      on bd.id = e.id or bd.badge_code = e.badge_code
    where bd.id <> e.id
       or bd.qualification_id <> 'QUAL-WH-NC-II'
       or bd.badge_code <> e.badge_code
       or bd.name <> e.name
       or bd.badge_type <> 'Proficient'
       or bd.description <> 'External competency badge for ' || e.competency_code || ' in Warehousing Services NC II.'
       or bd.criteria <> 'External evidence confirms completion of ' || e.competency_code || ' — ' || e.competency_title || '.'
       or bd.validity_months <> 36
       or bd.status <> 'Active'
       or bd.firebase_badge_template_id <> e.firebase_badge_template_id
  ) then
    raise exception 'A Warehousing badge definition conflicts with the expected LOG432302-LOG432306 data';
  end if;

  if exists (
    with expected(id, firebase_badge_template_id) as (
      values
        ('BADGE-DEF-WH-LOG432301-PROFICIENT', 'vurWRNY5Wq20Xu3UxS2c'),
        ('BADGE-DEF-WH-LOG432302-PROFICIENT', '5xGNugoZoZWfLIvCs8zT'),
        ('BADGE-DEF-WH-LOG432303-PROFICIENT', 'ZtPT4ShwUFigafBTA5Sa'),
        ('BADGE-DEF-WH-LOG432304-PROFICIENT', '5IcvSWBdrNzlr5bL2Hr2'),
        ('BADGE-DEF-WH-LOG432305-PROFICIENT', '4VLphRnCuFZONX1tCyia'),
        ('BADGE-DEF-WH-LOG432306-PROFICIENT', '5gzqcaV3r0ecLjOgOMwT')
    )
    select 1
    from expected e
    join public.badge_definitions bd
      on bd.firebase_badge_template_id = e.firebase_badge_template_id
    where bd.id <> e.id
  ) then
    raise exception 'A Firestore badge template is already mapped to another external badge definition';
  end if;

  if exists (
    with expected(badge_definition_id, competency_id) as (
      values
        ('BADGE-DEF-WH-LOG432302-PROFICIENT', 'COMP-WH-LOG432302'),
        ('BADGE-DEF-WH-LOG432303-PROFICIENT', 'COMP-WH-LOG432303'),
        ('BADGE-DEF-WH-LOG432304-PROFICIENT', 'COMP-WH-LOG432304'),
        ('BADGE-DEF-WH-LOG432305-PROFICIENT', 'COMP-WH-LOG432305'),
        ('BADGE-DEF-WH-LOG432306-PROFICIENT', 'COMP-WH-LOG432306')
    )
    select 1
    from expected e
    join public.badge_requirements br
      on br.badge_definition_id = e.badge_definition_id
    where br.competency_id <> e.competency_id
  ) then
    raise exception 'A Warehousing Proficient definition has a conflicting competency requirement';
  end if;

  if (
    select count(*)
    from public.learners l
    join public.enrollments e on e.learner_id = l.id
    where (l.id, l.learner_uli, e.id) in (
      ('LEARNER-DEMO-0001', 'DEMO-ULI-0001', 'ENR-MOCK-TRAINING-0001'),
      ('LEARNER-DEMO-0002', 'DEMO-ULI-0002', 'ENR-MOCK-TRAINING-0002'),
      ('LEARNER-DEMO-0003', 'DEMO-ULI-0003', 'ENR-MOCK-TRAINING-0003'),
      ('LEARNER-DEMO-0004', 'DEMO-ULI-0004', 'ENR-MOCK-TRAINING-0004'),
      ('LEARNER-DEMO-0005', 'DEMO-ULI-0005', 'ENR-MOCK-TRAINING-0005')
    )
  ) <> 5 then
    raise exception 'Expected demo learner identities or enrollments are missing or mismatched';
  end if;

  if not exists (
    select 1
    from public.learner_competency_completions
    where id = 'LCC-PB1-LEARNER-0002-LOG432301'
      and learner_id = 'LEARNER-DEMO-0002'
      and enrollment_id = 'ENR-MOCK-TRAINING-0002'
      and competency_id = 'COMP-WH-LOG432301'
      and status = 'Completed'
  ) then
    raise exception 'Learner 2 LOG432301 completion is missing or mismatched';
  end if;

  if exists (
    select 1
    from public.learner_competency_completions lcc
    join public.competencies c on c.id = lcc.competency_id
    where lcc.learner_id = 'LEARNER-DEMO-0002'
      and c.competency_code in ('LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) then
    raise exception 'Learner 2 has an unexpected LOG432302-LOG432306 completion row';
  end if;

  if exists (
    select 1
    from public.learner_competency_completions lcc
    join public.competencies c on c.id = lcc.competency_id
    where lcc.learner_id in ('LEARNER-DEMO-0003', 'LEARNER-DEMO-0004', 'LEARNER-DEMO-0005')
      and c.competency_code in ('LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) then
    raise exception 'Learners 3-5 must have no real Warehousing competency rows before this migration';
  end if;

  if exists (
    with expected(id, competency_id) as (
      values
        ('LCC-PB3-LEARNER-0001-LOG432301', 'COMP-WH-LOG432301'),
        ('LCC-PB3-LEARNER-0001-LOG432302', 'COMP-WH-LOG432302'),
        ('LCC-PB3-LEARNER-0001-LOG432303', 'COMP-WH-LOG432303'),
        ('LCC-PB3-LEARNER-0001-LOG432304', 'COMP-WH-LOG432304'),
        ('LCC-PB3-LEARNER-0001-LOG432305', 'COMP-WH-LOG432305'),
        ('LCC-PB3-LEARNER-0001-LOG432306', 'COMP-WH-LOG432306')
    )
    select 1
    from expected e
    join public.learner_competency_completions lcc
      on lcc.id = e.id
      or (lcc.enrollment_id = 'ENR-MOCK-TRAINING-0001' and lcc.competency_id = e.competency_id)
    where lcc.id <> e.id
       or lcc.learner_id <> 'LEARNER-DEMO-0001'
       or lcc.enrollment_id <> 'ENR-MOCK-TRAINING-0001'
       or lcc.competency_id <> e.competency_id
       or lcc.status <> 'Completed'
       or lcc.completed_at <> '2026-02-28T00:00:00Z'::timestamptz
       or lcc.verified_by <> 'MOCK_T2MIS'
  ) then
    raise exception 'A Learner 1 completion conflicts with the expected six-competency baseline';
  end if;
end;
$$;

with expected(id, competency_code, title, sequence_no) as (
  values
    ('COMP-WH-LOG432302', 'LOG432302', 'Store stocks/goods', 3),
    ('COMP-WH-LOG432303', 'LOG432303', 'Pick stocks/goods', 4),
    ('COMP-WH-LOG432304', 'LOG432304', 'Issue/dispatch stocks/goods', 5),
    ('COMP-WH-LOG432305', 'LOG432305', 'Pack stocks/goods', 6),
    ('COMP-WH-LOG432306', 'LOG432306', 'Operate and maintain manual material handling equipment', 7)
)
insert into public.competencies (
  id, qualification_id, competency_code, title, sequence_no
)
select e.id, 'QUAL-WH-NC-II', e.competency_code, e.title, e.sequence_no
from expected e
where not exists (
  select 1 from public.competencies c where c.id = e.id
);

with expected(
  id, badge_code, name, competency_code, competency_title, firebase_badge_template_id
) as (
  values
    ('BADGE-DEF-WH-LOG432302-PROFICIENT', 'BADGE-WH-LOG432302-PROFICIENT', 'Store stocks/goods — Proficient', 'LOG432302', 'Store stocks/goods', '5xGNugoZoZWfLIvCs8zT'),
    ('BADGE-DEF-WH-LOG432303-PROFICIENT', 'BADGE-WH-LOG432303-PROFICIENT', 'Pick stocks/goods — Proficient', 'LOG432303', 'Pick stocks/goods', 'ZtPT4ShwUFigafBTA5Sa'),
    ('BADGE-DEF-WH-LOG432304-PROFICIENT', 'BADGE-WH-LOG432304-PROFICIENT', 'Issue/dispatch stocks/goods — Proficient', 'LOG432304', 'Issue/dispatch stocks/goods', '5IcvSWBdrNzlr5bL2Hr2'),
    ('BADGE-DEF-WH-LOG432305-PROFICIENT', 'BADGE-WH-LOG432305-PROFICIENT', 'Pack stocks/goods — Proficient', 'LOG432305', 'Pack stocks/goods', '4VLphRnCuFZONX1tCyia'),
    ('BADGE-DEF-WH-LOG432306-PROFICIENT', 'BADGE-WH-LOG432306-PROFICIENT', 'Operate and maintain manual material handling equipment — Proficient', 'LOG432306', 'Operate and maintain manual material handling equipment', '5gzqcaV3r0ecLjOgOMwT')
)
insert into public.badge_definitions (
  id, qualification_id, badge_code, name, badge_type, description, criteria,
  validity_months, status, firebase_badge_template_id
)
select
  e.id,
  'QUAL-WH-NC-II',
  e.badge_code,
  e.name,
  'Proficient',
  'External competency badge for ' || e.competency_code || ' in Warehousing Services NC II.',
  'External evidence confirms completion of ' || e.competency_code || ' — ' || e.competency_title || '.',
  36,
  'Active',
  e.firebase_badge_template_id
from expected e
where not exists (
  select 1 from public.badge_definitions bd where bd.id = e.id
);

with expected(badge_definition_id, competency_id) as (
  values
    ('BADGE-DEF-WH-LOG432302-PROFICIENT', 'COMP-WH-LOG432302'),
    ('BADGE-DEF-WH-LOG432303-PROFICIENT', 'COMP-WH-LOG432303'),
    ('BADGE-DEF-WH-LOG432304-PROFICIENT', 'COMP-WH-LOG432304'),
    ('BADGE-DEF-WH-LOG432305-PROFICIENT', 'COMP-WH-LOG432305'),
    ('BADGE-DEF-WH-LOG432306-PROFICIENT', 'COMP-WH-LOG432306')
)
insert into public.badge_requirements (badge_definition_id, competency_id)
select e.badge_definition_id, e.competency_id
from expected e
where not exists (
  select 1
  from public.badge_requirements br
  where br.badge_definition_id = e.badge_definition_id
    and br.competency_id = e.competency_id
);

with expected(id, competency_id) as (
  values
    ('LCC-PB3-LEARNER-0001-LOG432301', 'COMP-WH-LOG432301'),
    ('LCC-PB3-LEARNER-0001-LOG432302', 'COMP-WH-LOG432302'),
    ('LCC-PB3-LEARNER-0001-LOG432303', 'COMP-WH-LOG432303'),
    ('LCC-PB3-LEARNER-0001-LOG432304', 'COMP-WH-LOG432304'),
    ('LCC-PB3-LEARNER-0001-LOG432305', 'COMP-WH-LOG432305'),
    ('LCC-PB3-LEARNER-0001-LOG432306', 'COMP-WH-LOG432306')
)
insert into public.learner_competency_completions (
  id, learner_id, enrollment_id, competency_id, status, completed_at, verified_by
)
select
  e.id,
  'LEARNER-DEMO-0001',
  'ENR-MOCK-TRAINING-0001',
  e.competency_id,
  'Completed',
  '2026-02-28T00:00:00Z'::timestamptz,
  'MOCK_T2MIS'
from expected e
where not exists (
  select 1
  from public.learner_competency_completions lcc
  where lcc.id = e.id
);

-- Learners 3-5 are intentionally reset only at the enrollment-summary level.
-- Their historical WH-COMP-001 audit rows remain intact and are ignored because
-- the only Skilled definition is Inactive.
update public.enrollments
set
  enrollment_status = 'Enrolled',
  completion_status = 'In Progress',
  completed_at = null
where (id, learner_id) in (
  ('ENR-MOCK-TRAINING-0003', 'LEARNER-DEMO-0003'),
  ('ENR-MOCK-TRAINING-0004', 'LEARNER-DEMO-0004'),
  ('ENR-MOCK-TRAINING-0005', 'LEARNER-DEMO-0005')
);

do $$
begin
  if (
    select count(*)
    from public.competencies
    where qualification_id = 'QUAL-WH-NC-II'
      and competency_code in ('LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) <> 6 then
    raise exception 'The six real Warehousing competencies were not prepared exactly once';
  end if;

  if exists (
    select 1
    from public.badge_definitions bd
    left join public.badge_requirements br on br.badge_definition_id = bd.id
    where bd.id in (
      'BADGE-DEF-WH-LOG432301-PROFICIENT',
      'BADGE-DEF-WH-LOG432302-PROFICIENT',
      'BADGE-DEF-WH-LOG432303-PROFICIENT',
      'BADGE-DEF-WH-LOG432304-PROFICIENT',
      'BADGE-DEF-WH-LOG432305-PROFICIENT',
      'BADGE-DEF-WH-LOG432306-PROFICIENT'
    )
    group by bd.id
    having bd.badge_type <> 'Proficient'
       or bd.status <> 'Active'
       or count(br.competency_id) <> 1
  ) or (
    select count(distinct firebase_badge_template_id)
    from public.badge_definitions
    where id in (
      'BADGE-DEF-WH-LOG432301-PROFICIENT',
      'BADGE-DEF-WH-LOG432302-PROFICIENT',
      'BADGE-DEF-WH-LOG432303-PROFICIENT',
      'BADGE-DEF-WH-LOG432304-PROFICIENT',
      'BADGE-DEF-WH-LOG432305-PROFICIENT',
      'BADGE-DEF-WH-LOG432306-PROFICIENT'
    )
  ) <> 6 then
    raise exception 'Warehousing Proficient definitions, requirements, or mappings are incomplete';
  end if;

  if exists (
    select 1
    from public.badge_definitions
    where qualification_id = 'QUAL-WH-NC-II'
      and badge_type = 'Skilled'
      and status = 'Active'
  ) then
    raise exception 'External Skilled eligibility must remain disabled';
  end if;

  if (
    select count(*)
    from public.learner_competency_completions lcc
    join public.competencies c on c.id = lcc.competency_id
    where lcc.learner_id = 'LEARNER-DEMO-0001'
      and lcc.status = 'Completed'
      and c.competency_code in ('LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) <> 6 then
    raise exception 'Learner 1 must have all six real Warehousing competencies completed';
  end if;

  if (
    select count(*)
    from public.learner_competency_completions lcc
    join public.competencies c on c.id = lcc.competency_id
    where lcc.learner_id = 'LEARNER-DEMO-0002'
      and lcc.status = 'Completed'
      and c.competency_code in ('LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) <> 1 then
    raise exception 'Learner 2 must retain exactly one real Warehousing competency completion';
  end if;

  if exists (
    select 1
    from public.learner_competency_completions lcc
    join public.competencies c on c.id = lcc.competency_id
    where lcc.learner_id in ('LEARNER-DEMO-0003', 'LEARNER-DEMO-0004', 'LEARNER-DEMO-0005')
      and lcc.status = 'Completed'
      and c.competency_code in ('LOG432301', 'LOG432302', 'LOG432303', 'LOG432304', 'LOG432305', 'LOG432306')
  ) then
    raise exception 'Learners 3-5 must start with zero real Warehousing competency completions';
  end if;
end;
$$;

commit;
