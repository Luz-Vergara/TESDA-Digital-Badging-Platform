import assert from 'node:assert/strict';
import { notificationBaselineId, notificationDestination, notificationQueries, projectNotification, sortNotifications } from '../src/lib/notification-model.ts';

const scope = { uid: 'learner-1', role: 'Learner', isDemo: false };
assert.deepEqual(notificationQueries(scope).map(q => [q.source, q.field, q.operator, q.value]), [
  ['badgeRequests', 'learnerIds', 'array-contains', 'learner-1'],
  ['issuedBadges', 'learnerId', '==', 'learner-1'],
  ['rplApplications', 'learnerId', '==', 'learner-1'],
]);
assert.equal(notificationQueries({ ...scope, role: 'TrainingCenter' }).length, 0);
assert.ok(notificationQueries({ ...scope, role: 'TrainingCenter', organizationId: 'tc-1' }).every(q => q.value === 'tc-1'));
assert.equal(notificationQueries({ ...scope, role: 'DistrictOffice', organizationId: 'd-1', assignedDistrictId: 'd-1' }).length, 2);
assert.equal(notificationQueries({ ...scope, role: 'Admin' }).length, 0);
const data = { status: 'Pending Review', submittedAt: { seconds: 100 }, badgeTemplateName: 'Sample badge' };
const pending = projectNotification('badgeRequests', 'request/1', data, false)!;
const approved = projectNotification('badgeRequests', 'request/1', { ...data, status: 'Approved', updatedAt: { seconds: 200 } }, false)!;
assert.notEqual(pending.id, approved.id);
assert.equal(pending.id, projectNotification('badgeRequests', 'request/1', { ...data, updatedAt: { seconds: 900 }, remarks: 'Metadata edit' }, false)!.id);
assert.equal(approved.id, projectNotification('badgeRequests', 'request/1', { ...data, status: 'Approved', updatedAt: { seconds: 999 } }, false)!.id);
assert.equal(pending.entityId, 'request/1');
assert.equal(pending.source, 'badgeRequests');
assert.equal(notificationDestination(pending, 'TrainingCenter'), '/trainingcenter/requests');
assert.equal(notificationDestination(pending, 'DistrictOffice'), '/districtoffice/queue');
assert.equal(notificationDestination(approved, 'DistrictOffice'), null);
assert.equal(notificationDestination(pending, 'Learner'), null);
assert.equal(notificationDestination(approved, 'Learner'), '/learner');
assert.equal(notificationDestination(pending, 'Admin'), null);
assert.notEqual(notificationBaselineId(scope), notificationBaselineId({ ...scope, isDemo: true }));
assert.notEqual(notificationBaselineId({ ...scope, role: 'TrainingCenter', organizationId: 'one' }), notificationBaselineId({ ...scope, role: 'TrainingCenter', organizationId: 'two' }));
assert.ok(!pending.id.includes('/'));
assert.equal(projectNotification('badgeRequests', '1', { ...data, isDemo: true }, false), null);
assert.equal(projectNotification('badgeRequests', '1', data, true), null);
assert.ok(projectNotification('badgeRequests', '1', { ...data, isDemo: true }, true));
assert.equal(projectNotification('badgeRequests', '1', {}, false), null);
assert.deepEqual(sortNotifications([pending, approved, pending]).map(n => n.id), [approved.id, pending.id]);
const issued = { badgeName: 'Sample', issueDate: { seconds: 150 }, status: 'Active' };
assert.equal(projectNotification('issuedBadges', '1', issued, false)!.id,
  projectNotification('issuedBadges', '1', { ...issued, status: 'Revoked', updatedAt: { seconds: 300 } }, false)!.id);
const rpl = projectNotification('rplApplications', '1', { status: 'Needs Additional Evidence', updatedAt: '2026-09-12T00:00:00Z' }, false)!;
assert.equal(rpl.time, Date.parse('2026-09-12T00:00:00Z'));
assert.equal(rpl.id, projectNotification('rplApplications', '1', { status: 'Needs Additional Evidence', updatedAt: '2026-09-13T00:00:00Z', remarks: 'Edited' }, false)!.id);
assert.equal(notificationDestination(rpl, 'TrainingCenter'), '/trainingcenter/rpl');
assert.equal(notificationDestination(rpl, 'Learner'), '/learner/rpl');
assert.equal(notificationDestination(projectNotification('issuedBadges', '1', issued, false)!, 'Learner'), '/learner/wallet');
assert.equal(projectNotification('rplApplications', '1', { status: 'Submitted', updatedAt: 'invalid' }, false)!.time, 0);
console.log('Notification projection, scope, isolation, ordering and event identity tests passed.');
