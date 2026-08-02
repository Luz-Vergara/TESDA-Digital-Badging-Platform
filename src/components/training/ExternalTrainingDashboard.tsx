import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Building2,
  CheckCircle,
  Database,
  Layers,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { externalApi, ExternalApiError } from '@/src/services/externalApi';
import type {
  ExternalApiMeta,
  ExternalBadgeRequest,
  ExternalBadgeVerification,
  ExternalDashboardSummary,
  ExternalLearnerDetails,
  ExternalLearnerSummary,
} from '@/src/types/external-api';

interface Props {
  trainingCenterId: string;
}

function displayDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function errorMessage(error: unknown): string {
  if (error instanceof ExternalApiError) return error.message;
  return 'The external dashboard data could not be loaded.';
}

export default function ExternalTrainingDashboard({
  trainingCenterId,
}: Props) {
  const [summary, setSummary] = useState<ExternalDashboardSummary | null>(null);
  const [learners, setLearners] = useState<ExternalLearnerSummary[]>([]);
  const [requests, setRequests] = useState<ExternalBadgeRequest[]>([]);
  const [meta, setMeta] = useState<ExternalApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLearner, setSelectedLearner] =
    useState<ExternalLearnerDetails | null>(null);
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerError, setLearnerError] = useState<string | null>(null);
  const [verification, setVerification] =
    useState<ExternalBadgeVerification | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, learnerResult, requestResult] = await Promise.all([
        externalApi.getTrainingCenterDashboardSummary(trainingCenterId),
        externalApi.getTrainingCenterLearners(trainingCenterId),
        externalApi.getTrainingCenterBadgeRequests(trainingCenterId),
      ]);
      setSummary(summaryResult.data);
      setLearners(learnerResult.data);
      setRequests(requestResult.data);
      setMeta(summaryResult.meta);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [trainingCenterId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const showLearner = async (learnerId: string) => {
    setLearnerLoading(true);
    setLearnerError(null);
    setSelectedLearner(null);
    setVerification(null);
    try {
      const result = await externalApi.getLearnerDetails(learnerId);
      setSelectedLearner(result.data);
    } catch (caught) {
      setLearnerError(errorMessage(caught));
    } finally {
      setLearnerLoading(false);
    }
  };

  const showVerification = async (verificationId: string) => {
    setVerificationLoading(true);
    setVerification(null);
    try {
      const result = await externalApi.getBadgeVerification(verificationId);
      setVerification(result.data);
    } catch (caught) {
      setLearnerError(errorMessage(caught));
    } finally {
      setVerificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-sm text-slate-500">
          Loading Training Center data through the Integration API…
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Training Center Dashboard
          </h1>
          <p className="text-slate-500">External information system demo</p>
        </div>
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-8 text-center space-y-4">
            <Database className="h-10 w-10 text-rose-500 mx-auto" />
            <div>
              <p className="font-bold text-rose-900">Integration API unavailable</p>
              <p className="text-sm text-rose-700 mt-1">
                {error || 'No dashboard summary was returned.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadDashboard()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      label: 'Learners',
      value: summary.counts.learners,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Enrollments',
      value: summary.counts.activeEnrollments,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Registered Programs',
      value: summary.registeredPrograms.length,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Completed Competencies',
      value: summary.counts.completedCompetencies,
      icon: CheckCircle,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Eligible Learners',
      value: summary.counts.eligibleLearners,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pending Requests',
      value: summary.counts.pendingBadgeRequests,
      icon: Award,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Issued Badges',
      value: summary.counts.issuedBadges,
      icon: Award,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">
              Training Center Dashboard
            </h1>
            <Badge className="bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100">
              <Database className="h-3 w-3 mr-1" />
              Mock External System
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Data retrieved through the Digital Badging Integration API
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/trainingcenter/learners">
            <Button className="bg-blue-600 hover:bg-blue-700">Manage Learners</Button>
          </Link>
          <Button variant="outline" onClick={() => void loadDashboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh API Data
          </Button>
        </div>
      </div>

      <Card className="border-violet-200 bg-violet-50/40">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-6 w-6 text-violet-700 mt-1" />
            <div>
              <p className="font-bold text-slate-900">
                {summary.trainingCenter.name}
              </p>
              <p className="text-sm text-slate-600">
                {summary.trainingCenter.code} · {summary.trainingCenter.districtName}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {summary.trainingCenter.address.line},{' '}
                {summary.trainingCenter.address.city},{' '}
                {summary.trainingCenter.address.province}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Adapter selected on the server</p>
            <p className="font-mono mt-1">
              {meta?.dataSource || 'external'} · {meta ? displayDate(meta.retrievedAt) : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} w-fit mb-3`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Programs</CardTitle>
          <CardDescription>Programs supplied by the mock external system</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.registeredPrograms.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No registered programs were returned.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CTPR No.</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.registeredPrograms.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-mono text-xs">
                      {program.ctprNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{program.qualification.title}</p>
                      <p className="text-xs text-slate-500">
                        {program.qualification.code}
                      </p>
                    </TableCell>
                    <TableCell>{program.deliveryMode}</TableCell>
                    <TableCell>{displayDate(program.validUntil)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{program.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learners and Eligibility</CardTitle>
          <CardDescription>
            Enrollment, competency, and eligibility summaries from the Integration API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learners.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No learners were returned for this Training Center.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Competencies</TableHead>
                  <TableHead>Badge Eligibility</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map((learner) => {
                  const eligibility = learner.badgeEligibility[0];
                  return (
                    <TableRow key={learner.id}>
                      <TableCell>
                        <p className="font-medium">{learner.displayName}</p>
                        <p className="text-xs font-mono text-slate-500">
                          {learner.externalLearnerId}
                        </p>
                      </TableCell>
                      <TableCell>
                        {learner.enrollments[0] ? (
                          <>
                            <p>{learner.enrollments[0].enrollmentStatus}</p>
                            <p className="text-xs font-mono text-slate-500">
                              CTPR No.: {learner.enrollments[0].registeredProgram.ctprNumber}
                            </p>
                          </>
                        ) : (
                          'No enrollment'
                        )}
                      </TableCell>
                      <TableCell>{learner.completedCompetencyCount}</TableCell>
                      <TableCell>
                        {eligibility ? (
                          <Badge
                            className={
                              eligibility.eligible
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                            }
                          >
                            {eligibility.eligible ? 'Eligible' : 'Not Eligible'} ·{' '}
                            {eligibility.completedCompetencyCount}/
                            {eligibility.requiredCompetencyCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not evaluated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void showLearner(learner.id)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(learnerLoading || learnerError || selectedLearner) && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Learner Detail</CardTitle>
            <CardDescription>
              Loaded from GET /api/learners/{'{id}'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {learnerLoading ? (
              <div className="py-10 text-center text-slate-500">
                Loading learner details…
              </div>
            ) : learnerError ? (
              <div className="py-8 text-center text-rose-700">{learnerError}</div>
            ) : selectedLearner ? (
              <div className="space-y-6">
                <div>
                  <p className="text-lg font-bold">{selectedLearner.displayName}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {selectedLearner.externalLearnerId}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="font-semibold mb-3">Completed competencies</p>
                    {selectedLearner.competencyCompletions.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No competency completions found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedLearner.competencyCompletions.map((completion) => (
                          <div
                            key={completion.id}
                            className="p-3 rounded-lg bg-slate-50 border"
                          >
                            <p className="font-medium">
                              {completion.competency.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {completion.competency.code} ·{' '}
                              {displayDate(completion.completedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold mb-3">Issued badges</p>
                    {selectedLearner.issuedBadges.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No issued badge found for this learner.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedLearner.issuedBadges.map((issued) => (
                          <div key={issued.id} className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                            <p className="font-medium">{issued.badgeName}</p>
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              {issued.verificationId}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              disabled={verificationLoading}
                              onClick={() => void showVerification(issued.verificationId)}
                            >
                              {verificationLoading ? 'Verifying…' : 'Verify Badge'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {verification && (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="font-bold text-emerald-900">
                      Verified: {verification.badge.name}
                    </p>
                    <p className="text-sm text-emerald-800 mt-1">
                      {verification.credentialId} · {verification.status} · issued{' '}
                      {displayDate(verification.issuedAt)}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Badge Requests</CardTitle>
          <CardDescription>Pending and approved requests from the mock source</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No badge requests were returned.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued Badge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">
                      {request.requestNumber}
                    </TableCell>
                    <TableCell>{request.badgeDefinition.name}</TableCell>
                    <TableCell>
                      {request.items.map((item) => item.learnerName).join(', ')}
                    </TableCell>
                    <TableCell>{displayDate(request.submittedAt)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          request.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.items[0]?.issuedBadge?.credentialId || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
