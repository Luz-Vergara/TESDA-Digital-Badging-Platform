begin;

insert into public.training_centers (
  id, center_code, name, status, district_name, address_line, city, province,
  contact_email, contact_phone, created_at
) values (
  'TC-DEMO-001',
  'TC-DEMO-001',
  'Demo Technical Training Center',
  'Active',
  'Demo District Office',
  '100 Demonstration Avenue',
  'Sample City',
  'Sample Province',
  'center@example.invalid',
  '+63-000-000-0000',
  '2026-01-05T00:00:00Z'
) on conflict do nothing;

insert into public.qualifications (
  id, qualification_code, title, pqf_level, status, created_at
) values (
  'QUAL-DEMO-001',
  'DEMO-DSS-II',
  'Demonstration Digital Systems Support Level II',
  2,
  'Active',
  '2026-01-05T00:00:00Z'
) on conflict do nothing;

insert into public.competencies (
  id, qualification_id, competency_code, title, sequence_no, created_at
) values
  (
    'COMP-DEMO-001',
    'QUAL-DEMO-001',
    'DEMO-COMP-001',
    'Configure a Demonstration Workstation',
    1,
    '2026-01-05T00:00:00Z'
  ),
  (
    'COMP-DEMO-002',
    'QUAL-DEMO-001',
    'DEMO-COMP-002',
    'Validate a Demonstration Network',
    2,
    '2026-01-05T00:00:00Z'
  )
on conflict do nothing;

insert into public.registered_programs (
  id, training_center_id, qualification_id, ctpr_number, delivery_mode,
  status, registered_at, valid_until, created_at
) values (
  'PROG-DEMO-001',
  'TC-DEMO-001',
  'QUAL-DEMO-001',
  'CTPR-DEMO-2026-001',
  'Institution-Based',
  'Active',
  '2026-01-10',
  '2027-01-09',
  '2026-01-10T00:00:00Z'
) on conflict do nothing;

insert into public.learners (
  id, external_learner_id, display_name, email, created_at
) values
  (
    'LR-DEMO-ALPHA',
    'EXT-DEMO-ALPHA',
    'Demo Learner Alpha',
    'alpha@example.invalid',
    '2026-02-01T00:00:00Z'
  ),
  (
    'LR-DEMO-BETA',
    'EXT-DEMO-BETA',
    'Demo Learner Beta',
    'beta@example.invalid',
    '2026-02-01T00:00:00Z'
  ),
  (
    'LR-DEMO-GAMMA',
    'EXT-DEMO-GAMMA',
    'Demo Learner Gamma',
    'gamma@example.invalid',
    '2026-02-01T00:00:00Z'
  )
on conflict do nothing;

insert into public.enrollments (
  id, learner_id, registered_program_id, enrollment_status, completion_status,
  enrolled_at, completed_at, created_at
) values
  (
    'ENR-DEMO-ALPHA',
    'LR-DEMO-ALPHA',
    'PROG-DEMO-001',
    'Completed',
    'Completed',
    '2026-02-10T00:00:00Z',
    '2026-05-15T00:00:00Z',
    '2026-02-10T00:00:00Z'
  ),
  (
    'ENR-DEMO-BETA',
    'LR-DEMO-BETA',
    'PROG-DEMO-001',
    'Enrolled',
    'In Progress',
    '2026-03-01T00:00:00Z',
    null,
    '2026-03-01T00:00:00Z'
  ),
  (
    'ENR-DEMO-GAMMA',
    'LR-DEMO-GAMMA',
    'PROG-DEMO-001',
    'Completed',
    'Completed',
    '2026-01-15T00:00:00Z',
    '2026-04-20T00:00:00Z',
    '2026-01-15T00:00:00Z'
  )
on conflict do nothing;

insert into public.learner_competency_completions (
  id, learner_id, enrollment_id, competency_id, status, completed_at,
  verified_by, created_at
) values
  (
    'LCC-DEMO-ALPHA-001',
    'LR-DEMO-ALPHA',
    'ENR-DEMO-ALPHA',
    'COMP-DEMO-001',
    'Completed',
    '2026-04-10T00:00:00Z',
    'Demo Trainer',
    '2026-04-10T00:00:00Z'
  ),
  (
    'LCC-DEMO-ALPHA-002',
    'LR-DEMO-ALPHA',
    'ENR-DEMO-ALPHA',
    'COMP-DEMO-002',
    'Completed',
    '2026-05-15T00:00:00Z',
    'Demo Trainer',
    '2026-05-15T00:00:00Z'
  ),
  (
    'LCC-DEMO-BETA-001',
    'LR-DEMO-BETA',
    'ENR-DEMO-BETA',
    'COMP-DEMO-001',
    'Completed',
    '2026-05-20T00:00:00Z',
    'Demo Trainer',
    '2026-05-20T00:00:00Z'
  ),
  (
    'LCC-DEMO-GAMMA-001',
    'LR-DEMO-GAMMA',
    'ENR-DEMO-GAMMA',
    'COMP-DEMO-001',
    'Completed',
    '2026-03-10T00:00:00Z',
    'Demo Trainer',
    '2026-03-10T00:00:00Z'
  ),
  (
    'LCC-DEMO-GAMMA-002',
    'LR-DEMO-GAMMA',
    'ENR-DEMO-GAMMA',
    'COMP-DEMO-002',
    'Completed',
    '2026-04-20T00:00:00Z',
    'Demo Trainer',
    '2026-04-20T00:00:00Z'
  )
on conflict do nothing;

insert into public.badge_definitions (
  id, qualification_id, badge_code, name, badge_type, description, criteria,
  validity_months, status, created_at
) values (
  'BADGE-DEF-DEMO-001',
  'QUAL-DEMO-001',
  'DEMO-DSS-BADGE',
  'Demo Digital Systems Support Badge',
  'Expert',
  'A fictional badge used to demonstrate external-system integration.',
  'Complete both fictional demonstration competencies.',
  36,
  'Active',
  '2026-01-05T00:00:00Z'
) on conflict do nothing;

insert into public.badge_requirements (
  badge_definition_id, competency_id
) values
  ('BADGE-DEF-DEMO-001', 'COMP-DEMO-001'),
  ('BADGE-DEF-DEMO-001', 'COMP-DEMO-002')
on conflict do nothing;

insert into public.badge_requests (
  id, request_number, training_center_id, badge_definition_id, status,
  submitted_at, reviewed_at, review_remarks, created_at
) values
  (
    'BR-DEMO-001',
    'REQ-DEMO-2026-001',
    'TC-DEMO-001',
    'BADGE-DEF-DEMO-001',
    'Pending',
    '2026-05-20T00:00:00Z',
    null,
    null,
    '2026-05-20T00:00:00Z'
  ),
  (
    'BR-DEMO-002',
    'REQ-DEMO-2026-002',
    'TC-DEMO-001',
    'BADGE-DEF-DEMO-001',
    'Approved',
    '2026-04-22T00:00:00Z',
    '2026-04-25T00:00:00Z',
    'Approved fictional demonstration request.',
    '2026-04-22T00:00:00Z'
  )
on conflict do nothing;

insert into public.badge_request_items (
  id, badge_request_id, learner_id, enrollment_id, eligibility_status, created_at
) values
  (
    'BRI-DEMO-ALPHA',
    'BR-DEMO-001',
    'LR-DEMO-ALPHA',
    'ENR-DEMO-ALPHA',
    'Eligible',
    '2026-05-20T00:00:00Z'
  ),
  (
    'BRI-DEMO-GAMMA',
    'BR-DEMO-002',
    'LR-DEMO-GAMMA',
    'ENR-DEMO-GAMMA',
    'Eligible',
    '2026-04-22T00:00:00Z'
  )
on conflict do nothing;

insert into public.issued_badges (
  id, verification_id, credential_id, badge_request_item_id, learner_id,
  training_center_id, badge_definition_id, status, issued_at, expires_at,
  created_at
) values (
  'IB-DEMO-001',
  'VERIFY-DEMO-GAMMA-001',
  'CRED-DEMO-0001',
  'BRI-DEMO-GAMMA',
  'LR-DEMO-GAMMA',
  'TC-DEMO-001',
  'BADGE-DEF-DEMO-001',
  'Active',
  '2026-04-26T00:00:00Z',
  '2029-04-26T00:00:00Z',
  '2026-04-26T00:00:00Z'
) on conflict do nothing;

commit;
