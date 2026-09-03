# External data-source adapters

The Digital Badging Integration API owns source selection. React calls the same
scoped external-record routes regardless of the selected source.

`EXTERNAL_DATA_SOURCE` is server-side and supports these planned values:

| Value | Adapter |
| --- | --- |
| `supabase` | Implemented mock external information system |
| `t2mis-api` | Reserved for an approved T2MIS REST contract |
| `t2mis-database` | Reserved for an approved read-only database contract |

`ExternalDataSourceAdapter` is the stable contract. Every adapter must map its
source records to `types.ts` before returning. Source-specific names, credentials,
queries, authentication, and transport behavior must not leak into route handlers
or the React application.

The two T2MIS values intentionally use `UnconfiguredExternalAdapter`. Do not add
field names, database drivers, URLs, or authentication assumptions until TESDA
provides an authorized integration contract.

## Standardized field mapping

| Domain | Required standardized fields |
| --- | --- |
| Training Center | `id`, `externalTrainingCenterId`, `code`, `name`, `status`, `districtName`, `address`, `contact` |
| Registered program | `id`, `externalProgramId`, `trainingCenterId`, `ctprNumber`, `qualification`, `deliveryMode`, `status`, `registeredAt`, `validUntil` |
| Learner | `id`, `learnerUli`, `displayName`, `email` |
| Enrollment | `id`, `externalEnrollmentId`, `learnerId`, `registeredProgram`, `enrollmentStatus`, `completionStatus`, `enrolledAt`, `completedAt` |
| Competency completion | `id`, `externalCompletionId`, `learnerId`, `enrollmentId`, `competency`, `status`, `completedAt`, `verifiedBy` |
| Eligibility evidence | `learnerUli`, `enrollmentId`, `sourceRecordId`, `trainingCenterId`, `ctprNumber`, linked Firebase template ID, result, counts, missing competency codes, `evaluatedAt` |

A future source might call the same learner identifier `learner_id`, `uli`, or
`learner_number`. Its mapper—not the adapter interface, API route, or frontend—
will translate that source field to `learnerUli`.

### Workflow boundary

Adapters return read-only external training evidence only. Firebase owns badge
templates, badge requests, District Office approval, issued badges, wallet, and
public verification. The Edge Function authenticates a Firebase user through
Supabase third-party auth and checks a private scope projected from an approved
Firestore integration link before it creates an adapter.

### CTPR identifier mapping

| Reference field | Database field | API field | Display label |
| --- | --- | --- | --- |
| CTPR Code / CTPR Number | `ctpr_number` | `ctprNumber` | CTPR No. |

`registration_code` was renamed because it represented the same Certificate of
TVET Program Registration Number identifier. Keeping both fields would duplicate
the same value.
