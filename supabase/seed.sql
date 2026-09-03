-- Canonical external-system fixture. This seed mirrors
-- reference_data/canonical_training_records.csv; Firestore remains the sole
-- source of truth for badge requests, approval, issuance, wallet, and public
-- verification.
begin;

insert into public.training_centers (
  id, center_code, name, status, district_name, address_line, city, province,
  contact_email, contact_phone, created_at
) values
  ('TC-DEMO-001', 'TC-DEMO-001', 'Sample Training Center - Metro Manila', 'Active', 'Taguig-Pateros', 'Taguig Training Campus', 'Taguig City', 'Metro Manila', 'training.metro@example.invalid', '+63-2-8000-0001', '2026-01-01T00:00:00Z'),
  ('TC-DEMO-002', 'TC-DEMO-002', 'Sample Regional Training Center - Central Luzon', 'Active', 'District V', 'Guiguinto Training Campus', 'Guiguinto', 'Bulacan', 'training.central-luzon@example.invalid', '+63-44-8000-0002', '2026-01-01T00:00:00Z'),
  ('TC-DEMO-003', 'TC-DEMO-003', 'Sample Provincial Training Center - Ilocos', 'Active', 'District V', 'Urdaneta Training Campus', 'Urdaneta City', 'Pangasinan', 'training.ilocos@example.invalid', '+63-75-8000-0003', '2026-01-01T00:00:00Z');

insert into public.qualifications (
  id, qualification_code, title, pqf_level, status, created_at
) values
  ('QUAL-WH-NC-II', 'WH-NC-II', 'Warehousing Services NC II', 2, 'Active', '2026-01-01T00:00:00Z'),
  ('QUAL-KNX-MC-001', 'KNX-MC-001', 'KNX Certified Devices Installation and Programming', 4, 'Active', '2026-01-01T00:00:00Z'),
  ('QUAL-VGD-NC-III-MC', 'VGD-NC-III-MC', 'Developing Design for Print Media Leading to Visual Graphics Design NC III', 3, 'Active', '2026-01-01T00:00:00Z');

insert into public.competencies (
  id, qualification_id, competency_code, title, sequence_no, created_at
) values
  ('COMP-WH-001', 'QUAL-WH-NC-II', 'WH-COMP-001', 'Complete warehousing services requirements', 1, '2026-01-01T00:00:00Z'),
  ('COMP-KNX-001', 'QUAL-KNX-MC-001', 'KNX-COMP-001', 'Program KNX certified devices', 1, '2026-01-01T00:00:00Z'),
  ('COMP-VGD-001', 'QUAL-VGD-NC-III-MC', 'VGD-COMP-001', 'Develop print-media visual graphics design', 1, '2026-01-01T00:00:00Z');

insert into public.registered_programs (
  id, training_center_id, qualification_id, ctpr_number, delivery_mode, status,
  registered_at, valid_until, created_at
) values
  ('RP-DEMO-WH-001', 'TC-DEMO-001', 'QUAL-WH-NC-II', 'DEMO-CTPR-WH-2026-001', 'Institution-Based', 'Active', '2026-01-01', '2027-01-01', '2026-01-01T00:00:00Z'),
  ('RP-DEMO-KNX-001', 'TC-DEMO-002', 'QUAL-KNX-MC-001', 'DEMO-CTPR-KNX-2026-001', 'Blended', 'Active', '2026-01-01', '2027-01-01', '2026-01-01T00:00:00Z'),
  ('RP-DEMO-VGD-001', 'TC-DEMO-003', 'QUAL-VGD-NC-III-MC', 'DEMO-CTPR-VGD-2026-001', 'Institution-Based', 'Active', '2026-01-01', '2027-01-01', '2026-01-01T00:00:00Z');

insert into public.learners (
  id, external_learner_id, learner_uli, display_name, email, created_at
) values
  ('LEARNER-DEMO-0001', 'EXTERNAL-DEMO-0001', 'DEMO-ULI-0001', 'Sample Learner 001', 'learner001@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0002', 'EXTERNAL-DEMO-0002', 'DEMO-ULI-0002', 'Sample Learner 002', 'learner002@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0003', 'EXTERNAL-DEMO-0003', 'DEMO-ULI-0003', 'Sample Learner 003', 'learner003@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0004', 'EXTERNAL-DEMO-0004', 'DEMO-ULI-0004', 'Sample Learner 004', 'learner004@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0005', 'EXTERNAL-DEMO-0005', 'DEMO-ULI-0005', 'Sample Learner 005', 'learner005@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0006', 'EXTERNAL-DEMO-0006', 'DEMO-ULI-0006', 'Sample Learner 006', 'learner006@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0007', 'EXTERNAL-DEMO-0007', 'DEMO-ULI-0007', 'Sample Learner 007', 'learner007@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0008', 'EXTERNAL-DEMO-0008', 'DEMO-ULI-0008', 'Sample Learner 008', 'learner008@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0009', 'EXTERNAL-DEMO-0009', 'DEMO-ULI-0009', 'Sample Learner 009', 'learner009@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0010', 'EXTERNAL-DEMO-0010', 'DEMO-ULI-0010', 'Sample Learner 010', 'learner010@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0011', 'EXTERNAL-DEMO-0011', 'DEMO-ULI-0011', 'Sample Learner 011', 'learner011@example.invalid', '2026-01-01T00:00:00Z'),
  ('LEARNER-DEMO-0012', 'EXTERNAL-DEMO-0012', 'DEMO-ULI-0012', 'Sample Learner 012', 'learner012@example.invalid', '2026-01-01T00:00:00Z');

insert into public.enrollments (
  id, learner_id, registered_program_id, enrollment_status, completion_status,
  enrolled_at, completed_at, source_record_id, created_at
) values
  ('ENR-MOCK-TRAINING-0001', 'LEARNER-DEMO-0001', 'RP-DEMO-WH-001', 'Completed', 'Completed', '2026-01-08T00:00:00Z', '2026-02-28T00:00:00Z', 'MOCK-TRAINING-0001', '2026-01-08T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0002', 'LEARNER-DEMO-0002', 'RP-DEMO-WH-001', 'Enrolled', 'In Progress', '2026-07-01T00:00:00Z', null, 'MOCK-TRAINING-0002', '2026-07-01T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0003', 'LEARNER-DEMO-0003', 'RP-DEMO-WH-001', 'Completed', 'Completed', '2026-03-02T00:00:00Z', '2026-04-20T00:00:00Z', 'MOCK-TRAINING-0003', '2026-03-02T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0004', 'LEARNER-DEMO-0004', 'RP-DEMO-WH-001', 'Completed', 'Completed', '2026-02-03T00:00:00Z', '2026-03-25T00:00:00Z', 'MOCK-TRAINING-0004', '2026-02-03T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0005', 'LEARNER-DEMO-0005', 'RP-DEMO-WH-001', 'Completed', 'Completed', '2026-04-06T00:00:00Z', '2026-05-29T00:00:00Z', 'MOCK-TRAINING-0005', '2026-04-06T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0006', 'LEARNER-DEMO-0006', 'RP-DEMO-KNX-001', 'Completed', 'Completed', '2026-03-01T00:00:00Z', '2026-03-25T00:00:00Z', 'MOCK-TRAINING-0006', '2026-03-01T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0007', 'LEARNER-DEMO-0007', 'RP-DEMO-KNX-001', 'Enrolled', 'In Progress', '2026-07-10T00:00:00Z', null, 'MOCK-TRAINING-0007', '2026-07-10T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0008', 'LEARNER-DEMO-0008', 'RP-DEMO-KNX-001', 'Completed', 'Completed', '2026-05-04T00:00:00Z', '2026-05-28T00:00:00Z', 'MOCK-TRAINING-0008', '2026-05-04T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0009', 'LEARNER-DEMO-0009', 'RP-DEMO-VGD-001', 'Completed', 'Completed', '2026-04-06T00:00:00Z', '2026-04-10T00:00:00Z', 'MOCK-TRAINING-0009', '2026-04-06T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0010', 'LEARNER-DEMO-0010', 'RP-DEMO-VGD-001', 'Completed', 'Completed', '2026-05-11T00:00:00Z', '2026-05-15T00:00:00Z', 'MOCK-TRAINING-0010', '2026-05-11T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0011', 'LEARNER-DEMO-0011', 'RP-DEMO-VGD-001', 'Enrolled', 'In Progress', '2026-07-20T00:00:00Z', null, 'MOCK-TRAINING-0011', '2026-07-20T00:00:00Z'),
  ('ENR-MOCK-TRAINING-0012', 'LEARNER-DEMO-0012', 'RP-DEMO-VGD-001', 'Withdrawn', 'Not Started', '2026-06-08T00:00:00Z', '2026-06-09T00:00:00Z', 'MOCK-TRAINING-0012', '2026-06-08T00:00:00Z');

insert into public.badge_definitions (
  id, qualification_id, badge_code, name, badge_type, description, criteria,
  validity_months, status, firebase_badge_template_id, created_at
) values
  ('BADGE-DEF-WH-001', 'QUAL-WH-NC-II', 'BADGE-WH-NC-II', 'Warehousing Services NC II', 'Skilled', 'External eligibility definition for Warehousing Services NC II.', 'All required external competencies are complete.', 36, 'Active', 'demo-template-1', '2026-01-01T00:00:00Z'),
  ('BADGE-DEF-KNX-001', 'QUAL-KNX-MC-001', 'BADGE-KNX-MC-001', 'KNX Certified Devices Installation and Programming', 'Proficient', 'External eligibility definition for KNX programming.', 'All required external competencies are complete.', 24, 'Active', 'demo-template-2', '2026-01-01T00:00:00Z'),
  ('BADGE-DEF-VGD-001', 'QUAL-VGD-NC-III-MC', 'BADGE-VGD-NC-III-MC', 'Visual Graphics Design NC III', 'Proficient', 'External eligibility definition for Visual Graphics Design.', 'All required external competencies are complete.', 36, 'Active', 'demo-template-3', '2026-01-01T00:00:00Z');

insert into public.badge_requirements (badge_definition_id, competency_id) values
  ('BADGE-DEF-WH-001', 'COMP-WH-001'),
  ('BADGE-DEF-KNX-001', 'COMP-KNX-001'),
  ('BADGE-DEF-VGD-001', 'COMP-VGD-001');

-- Eight canonical eligible scenarios have completed evidence. The remaining
-- four fixture records intentionally have no completion and evaluate ineligible.
insert into public.learner_competency_completions (
  id, learner_id, enrollment_id, competency_id, status, completed_at, verified_by, created_at
) values
  ('LCC-MOCK-0001', 'LEARNER-DEMO-0001', 'ENR-MOCK-TRAINING-0001', 'COMP-WH-001', 'Completed', '2026-02-28T00:00:00Z', 'MOCK_T2MIS', '2026-02-28T00:00:00Z'),
  ('LCC-MOCK-0003', 'LEARNER-DEMO-0003', 'ENR-MOCK-TRAINING-0003', 'COMP-WH-001', 'Completed', '2026-04-20T00:00:00Z', 'MOCK_T2MIS', '2026-04-20T00:00:00Z'),
  ('LCC-MOCK-0004', 'LEARNER-DEMO-0004', 'ENR-MOCK-TRAINING-0004', 'COMP-WH-001', 'Completed', '2026-03-25T00:00:00Z', 'MOCK_T2MIS', '2026-03-25T00:00:00Z'),
  ('LCC-MOCK-0005', 'LEARNER-DEMO-0005', 'ENR-MOCK-TRAINING-0005', 'COMP-WH-001', 'Completed', '2026-05-29T00:00:00Z', 'MOCK_T2MIS', '2026-05-29T00:00:00Z'),
  ('LCC-MOCK-0006', 'LEARNER-DEMO-0006', 'ENR-MOCK-TRAINING-0006', 'COMP-KNX-001', 'Completed', '2026-03-25T00:00:00Z', 'MOCK_T2MIS', '2026-03-25T00:00:00Z'),
  ('LCC-MOCK-0008', 'LEARNER-DEMO-0008', 'ENR-MOCK-TRAINING-0008', 'COMP-KNX-001', 'Completed', '2026-05-28T00:00:00Z', 'MOCK_T2MIS', '2026-05-28T00:00:00Z'),
  ('LCC-MOCK-0009', 'LEARNER-DEMO-0009', 'ENR-MOCK-TRAINING-0009', 'COMP-VGD-001', 'Completed', '2026-04-10T00:00:00Z', 'MOCK_T2MIS', '2026-04-10T00:00:00Z'),
  ('LCC-MOCK-0010', 'LEARNER-DEMO-0010', 'ENR-MOCK-TRAINING-0010', 'COMP-VGD-001', 'Completed', '2026-05-15T00:00:00Z', 'MOCK_T2MIS', '2026-05-15T00:00:00Z');

commit;
