import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Building2,
  CheckCircle,
  Database,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ExternalCompetencyCompletion,
  ExternalDashboardSummary,
  ExternalIssuedBadge,
  ExternalLearnerDetails,
  ExternalLearnerSummary,
  ExternalRegisteredProgram,
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

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all');
  const [badgeRequestStatusFilter, setBadgeRequestStatusFilter] = useState('all');
  const [issuedBadgeStatusFilter, setIssuedBadgeStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'recent'>('name');

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
      setLearners(asArray(learnerResult.data));
      setRequests(asArray(requestResult.data));
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
      value: asArray(summary?.registeredPrograms).length,
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

  const programs = asArray<ExternalRegisteredProgram>(summary.registeredPrograms);
  const learnerEnrollments = (learner: ExternalLearnerSummary) =>
    asArray(learner.enrollments);
  const learnerEligibility = (learner: ExternalLearnerSummary) =>
    asArray(learner.badgeEligibility);
  const requestItems = (request: ExternalBadgeRequest) => asArray(request.items);
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (...values: unknown[]) =>
    !normalizedSearch || values.some((value) =>
      String(value ?? '').toLowerCase().includes(normalizedSearch),
    );
  const enrollmentStatuses = [...new Set(
    learners.flatMap((learner) =>
      learnerEnrollments(learner).map((enrollment) => enrollment.enrollmentStatus),
    ),
  )].sort();
  const badgeRequestStatuses = [...new Set(requests.map((request) => request.status))].sort();
  const issuedBadgeStatuses = [...new Set(
    requests.flatMap((request) =>
      requestItems(request).flatMap((item) => item.issuedBadge ? [item.issuedBadge.status] : []),
    ),
  )].sort();
  const resetFilters = () => {
    setSearch('');
    setEligibilityFilter('all');
    setEnrollmentStatusFilter('all');
    setBadgeRequestStatusFilter('all');
    setIssuedBadgeStatusFilter('all');
    setSortBy('name');
  };
  const hasActiveFilters = Boolean(
    search ||
      eligibilityFilter !== 'all' ||
      enrollmentStatusFilter !== 'all' ||
      badgeRequestStatusFilter !== 'all' ||
      issuedBadgeStatusFilter !== 'all' ||
      sortBy !== 'name',
  );
  const mostRecentEnrollment = (learner: ExternalLearnerSummary) => Math.max(
    ...learnerEnrollments(learner).map((enrollment) => Date.parse(enrollment.enrolledAt)),
    0,
  );
  const visiblePrograms = programs
    .filter((program) => matchesSearch(
      program.ctprNumber,
      program.qualification?.title,
      program.qualification?.code,
      program.deliveryMode,
      program.status,
    ))
    .sort((first, second) => {
      if (sortBy === 'status') {
        return String(first.status ?? '').localeCompare(String(second.status ?? ''));
      }
      if (sortBy === 'recent') {
        return Date.parse(second.registeredAt) - Date.parse(first.registeredAt);
      }
      return String(first.qualification?.title ?? '').localeCompare(
        String(second.qualification?.title ?? ''),
      );
    });
  const visibleLearners = learners
    .filter((learner) => {
      const eligibility = learnerEligibility(learner);
      const enrollments = learnerEnrollments(learner);
      const eligible = eligibility.some((item) => item.eligible);
      const notEligible = eligibility.some((item) => !item.eligible);
      const matchesEligibility = eligibilityFilter === 'all' ||
        (eligibilityFilter === 'eligible' && eligible) ||
        (eligibilityFilter === 'not-eligible' && notEligible);
      const matchesEnrollment = enrollmentStatusFilter === 'all' ||
        enrollments.some(
          (enrollment) => enrollment.enrollmentStatus === enrollmentStatusFilter,
        );

      return matchesEligibility && matchesEnrollment && matchesSearch(
        learner.displayName,
        learner.externalLearnerId,
        ...enrollments.flatMap((enrollment) => [
          enrollment.enrollmentStatus,
          enrollment.completionStatus,
          enrollment.registeredProgram?.ctprNumber,
          enrollment.registeredProgram?.qualification?.title,
          enrollment.registeredProgram?.qualification?.code,
        ]),
      );
    })
    .sort((first, second) => {
      if (sortBy === 'status') {
        return (learnerEnrollments(first)[0]?.enrollmentStatus || '').localeCompare(
          learnerEnrollments(second)[0]?.enrollmentStatus || '',
        );
      }
      if (sortBy === 'recent') {
        return mostRecentEnrollment(second) - mostRecentEnrollment(first);
      }
      return first.displayName.localeCompare(second.displayName);
    });
  const visibleRequests = requests.filter((request) => {
    const matchesRequestStatus = badgeRequestStatusFilter === 'all' ||
      request.status === badgeRequestStatusFilter;
    const matchesIssuedStatus = issuedBadgeStatusFilter === 'all' ||
      requestItems(request).some((item) => item.issuedBadge?.status === issuedBadgeStatusFilter);

    return matchesRequestStatus && matchesIssuedStatus && matchesSearch(
      request.requestNumber,
      request.badgeDefinition?.name,
      ...requestItems(request).map((item) => item.learnerName),
    );
  });
  const selectedCompetencyCompletions = selectedLearner
    ? asArray<ExternalCompetencyCompletion>(selectedLearner.competencyCompletions)
    : [];
  const selectedIssuedBadges = selectedLearner
    ? asArray<ExternalIssuedBadge>(selectedLearner.issuedBadges)
    : [];

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

      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">Search and filter demo records</p>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search learners or programs"
                aria-label="Search learners or programs"
              />
            </div>
            <select
              value={eligibilityFilter}
              onChange={(event) => setEligibilityFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter learners by eligibility"
            >
              <option value="all">All eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="not-eligible">Not eligible</option>
            </select>
            <select
              value={enrollmentStatusFilter}
              onChange={(event) => setEnrollmentStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter learners by enrollment status"
            >
              <option value="all">All enrollments</option>
              {enrollmentStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={badgeRequestStatusFilter}
              onChange={(event) => setBadgeRequestStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter badge requests by status"
            >
              <option value="all">All requests</option>
              {badgeRequestStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={issuedBadgeStatusFilter}
              onChange={(event) => setIssuedBadgeStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter issued badges by status"
            >
              <option value="all">All issued badges</option>
              {issuedBadgeStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              Showing {visibleLearners.length} of {learners.length} learners,{' '}
              {visiblePrograms.length} of {programs.length} programs, and{' '}
              {visibleRequests.length} of {requests.length} requests.
            </p>
            <label className="flex items-center gap-2">
              <span className="font-medium">Sort learners by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as 'name' | 'status' | 'recent')}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                aria-label="Sort learners and programs"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="recent">Most recent</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Programs</CardTitle>
          <CardDescription>Programs supplied by the mock external system</CardDescription>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No registered programs were returned.
            </div>
          ) : visiblePrograms.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No registered programs match the current search.
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
                {visiblePrograms.map((program) => (
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
          ) : visibleLearners.length === 0 ? (
            <div className="py-10 text-center text-slate-500 space-y-3">
              <p>No learners match the current filters.</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
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
                {visibleLearners.map((learner) => {
                  const eligibility = learnerEligibility(learner)[0];
                  const enrollments = learnerEnrollments(learner);
                  return (
                    <TableRow key={learner.id}>
                      <TableCell>
                        <p className="font-medium">{learner.displayName}</p>
                        <p className="text-xs font-mono text-slate-500">
                          {learner.externalLearnerId}
                        </p>
                      </TableCell>
                      <TableCell>
                        {enrollments[0] ? (
                          <>
                            <p>{enrollments[0].enrollmentStatus}</p>
                            <p className="text-xs font-mono text-slate-500">
                              CTPR No.: {enrollments[0].registeredProgram.ctprNumber}
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
                    {selectedCompetencyCompletions.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No competency completions found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCompetencyCompletions.map((completion) => (
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
                    {selectedIssuedBadges.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No issued badge found for this learner.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedIssuedBadges.map((issued) => (
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
          ) : visibleRequests.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No badge requests match the current filters.
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
                {visibleRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">
                      {request.requestNumber}
                    </TableCell>
                    <TableCell>{request.badgeDefinition.name}</TableCell>
                    <TableCell>
                      {requestItems(request).map((item) => item.learnerName).join(', ')}
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
                      {requestItems(request)[0]?.issuedBadge?.credentialId || '—'}
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
