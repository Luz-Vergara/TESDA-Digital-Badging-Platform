begin;

create table public.training_centers (
  id text primary key,
  center_code text not null unique,
  name text not null,
  status text not null check (status in ('Active', 'Inactive')),
  district_name text not null,
  address_line text not null,
  city text not null,
  province text not null,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table public.qualifications (
  id text primary key,
  qualification_code text not null unique,
  title text not null,
  pqf_level integer,
  status text not null check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

create table public.competencies (
  id text primary key,
  qualification_id text not null references public.qualifications(id),
  competency_code text not null unique,
  title text not null,
  sequence_no integer not null check (sequence_no > 0),
  created_at timestamptz not null default now(),
  unique (qualification_id, sequence_no)
);

create table public.registered_programs (
  id text primary key,
  training_center_id text not null references public.training_centers(id),
  qualification_id text not null references public.qualifications(id),
  registration_code text not null unique,
  delivery_mode text not null check (
    delivery_mode in ('Institution-Based', 'Enterprise-Based', 'Online', 'Blended')
  ),
  status text not null check (status in ('Active', 'Inactive', 'Expired')),
  registered_at date not null,
  valid_until date,
  created_at timestamptz not null default now(),
  unique (training_center_id, qualification_id)
);

create table public.learners (
  id text primary key,
  external_learner_id text not null unique,
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id text primary key,
  learner_id text not null references public.learners(id),
  registered_program_id text not null references public.registered_programs(id),
  enrollment_status text not null check (
    enrollment_status in ('Applied', 'Enrolled', 'Completed', 'Dropped', 'Withdrawn')
  ),
  completion_status text not null check (
    completion_status in ('Not Started', 'In Progress', 'Completed', 'For Assessment')
  ),
  enrolled_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (learner_id, registered_program_id),
  unique (id, learner_id)
);

create table public.learner_competency_completions (
  id text primary key,
  learner_id text not null references public.learners(id),
  enrollment_id text not null,
  competency_id text not null references public.competencies(id),
  status text not null check (status in ('Completed', 'Revoked')),
  completed_at timestamptz not null,
  verified_by text not null,
  created_at timestamptz not null default now(),
  foreign key (enrollment_id, learner_id)
    references public.enrollments(id, learner_id),
  unique (enrollment_id, competency_id)
);

create table public.badge_definitions (
  id text primary key,
  qualification_id text not null references public.qualifications(id),
  badge_code text not null unique,
  name text not null,
  badge_type text not null check (
    badge_type in ('Proficient', 'Expert', 'Skilled', 'Master')
  ),
  description text not null,
  criteria text not null,
  validity_months integer check (validity_months is null or validity_months > 0),
  status text not null check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

create table public.badge_requirements (
  badge_definition_id text not null references public.badge_definitions(id),
  competency_id text not null references public.competencies(id),
  primary key (badge_definition_id, competency_id)
);

create table public.badge_requests (
  id text primary key,
  request_number text not null unique,
  training_center_id text not null references public.training_centers(id),
  badge_definition_id text not null references public.badge_definitions(id),
  status text not null check (status in ('Pending', 'Approved', 'Rejected')),
  submitted_at timestamptz not null,
  reviewed_at timestamptz,
  review_remarks text,
  created_at timestamptz not null default now()
);

create table public.badge_request_items (
  id text primary key,
  badge_request_id text not null references public.badge_requests(id),
  learner_id text not null references public.learners(id),
  enrollment_id text not null,
  eligibility_status text not null check (
    eligibility_status in ('Eligible', 'Not Eligible')
  ),
  created_at timestamptz not null default now(),
  foreign key (enrollment_id, learner_id)
    references public.enrollments(id, learner_id),
  unique (badge_request_id, learner_id)
);

create table public.issued_badges (
  id text primary key,
  verification_id text not null unique,
  credential_id text not null unique,
  badge_request_item_id text not null unique references public.badge_request_items(id),
  learner_id text not null references public.learners(id),
  training_center_id text not null references public.training_centers(id),
  badge_definition_id text not null references public.badge_definitions(id),
  status text not null check (status in ('Active', 'Expired', 'Revoked')),
  issued_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index registered_programs_training_center_idx
  on public.registered_programs(training_center_id);
create index enrollments_registered_program_idx
  on public.enrollments(registered_program_id);
create index enrollments_learner_idx
  on public.enrollments(learner_id);
create index competency_completions_learner_enrollment_idx
  on public.learner_competency_completions(learner_id, enrollment_id);
create index badge_requests_training_center_status_idx
  on public.badge_requests(training_center_id, status);
create index badge_request_items_request_idx
  on public.badge_request_items(badge_request_id);
create index issued_badges_training_center_idx
  on public.issued_badges(training_center_id);

create view public.learner_badge_eligibility
with (security_invoker = true)
as
select
  e.learner_id,
  e.id as enrollment_id,
  bd.id as badge_definition_id,
  count(distinct br.competency_id)::integer as required_competency_count,
  count(distinct lcc.competency_id) filter (
    where lcc.status = 'Completed'
  )::integer as completed_competency_count,
  coalesce(
    array_agg(distinct c.competency_code order by c.competency_code)
      filter (where lcc.competency_id is null),
    array[]::text[]
  ) as missing_competency_codes,
  (
    count(distinct br.competency_id) > 0
    and count(distinct br.competency_id)
      = count(distinct lcc.competency_id) filter (where lcc.status = 'Completed')
  ) as eligible,
  current_timestamp as evaluated_at
from public.enrollments e
join public.registered_programs rp
  on rp.id = e.registered_program_id
join public.badge_definitions bd
  on bd.qualification_id = rp.qualification_id
 and bd.status = 'Active'
join public.badge_requirements br
  on br.badge_definition_id = bd.id
join public.competencies c
  on c.id = br.competency_id
left join public.learner_competency_completions lcc
  on lcc.learner_id = e.learner_id
 and lcc.enrollment_id = e.id
 and lcc.competency_id = br.competency_id
 and lcc.status = 'Completed'
group by e.learner_id, e.id, bd.id;

alter table public.training_centers enable row level security;
alter table public.qualifications enable row level security;
alter table public.competencies enable row level security;
alter table public.registered_programs enable row level security;
alter table public.learners enable row level security;
alter table public.enrollments enable row level security;
alter table public.learner_competency_completions enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.badge_requirements enable row level security;
alter table public.badge_requests enable row level security;
alter table public.badge_request_items enable row level security;
alter table public.issued_badges enable row level security;

revoke all on public.training_centers from anon, authenticated;
revoke all on public.qualifications from anon, authenticated;
revoke all on public.competencies from anon, authenticated;
revoke all on public.registered_programs from anon, authenticated;
revoke all on public.learners from anon, authenticated;
revoke all on public.enrollments from anon, authenticated;
revoke all on public.learner_competency_completions from anon, authenticated;
revoke all on public.badge_definitions from anon, authenticated;
revoke all on public.badge_requirements from anon, authenticated;
revoke all on public.badge_requests from anon, authenticated;
revoke all on public.badge_request_items from anon, authenticated;
revoke all on public.issued_badges from anon, authenticated;
revoke all on public.learner_badge_eligibility from anon, authenticated;

grant select on public.training_centers to service_role;
grant select on public.qualifications to service_role;
grant select on public.competencies to service_role;
grant select on public.registered_programs to service_role;
grant select on public.learners to service_role;
grant select on public.enrollments to service_role;
grant select on public.learner_competency_completions to service_role;
grant select on public.badge_definitions to service_role;
grant select on public.badge_requirements to service_role;
grant select on public.badge_requests to service_role;
grant select on public.badge_request_items to service_role;
grant select on public.issued_badges to service_role;
grant select on public.learner_badge_eligibility to service_role;

commit;
