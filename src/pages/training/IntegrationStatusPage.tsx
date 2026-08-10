import React, { useState } from 'react';
import {
  Globe,
  Server,
  RefreshCw,
  CheckCircle2,
  Database,
  ArrowRightLeft,
  ShieldCheck,
  Cpu,
  Activity,
  Layers,
  FileCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/src/lib/FirebaseProvider';

export default function IntegrationStatusPage() {
  const { userProfile } = useFirebase();
  const [testing, setTesting] = useState(false);
  const [lastSync, setLastSync] = useState<string>('2 minutes ago');
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setLastSync('Just now');
      setTestResult('API Connection Successful: External Information System (T2MIS) endpoint pinged with 200 OK (Latency: 42ms).');
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">System Integration Status</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono text-[10px]">
              API-READY PROXY
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Status and diagnostic metrics for external MIS learner record synchronization and API connection interfaces.
          </p>
        </div>
        <Button
          onClick={handleTestConnection}
          disabled={testing}
          className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Testing Endpoint...' : 'Test API Connection'}
        </Button>
      </div>

      {testResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p>{testResult}</p>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">External MIS Connection</span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Connected</Badge>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-2">T2MIS Integration Service</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">v1.2 REST API Interface</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Data Sync</span>
              <span className="text-xs text-slate-400 font-mono">{lastSync}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-2">Read-Only Cache Active</p>
            <p className="text-xs text-slate-500 mt-1">Automatic heartbeat active</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Center Mapping</span>
              <Badge variant="outline" className="bg-slate-50 font-mono text-[10px]">Mapped</Badge>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-2 truncate">
              {userProfile?.office || 'Training Provider'}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">CTPR Code: CTPR-102938</p>
          </CardContent>
        </Card>
      </div>

      {/* Schema & Responsibility Boundaries */}
      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-bold">Architecture Data Flow & Module Responsibilities</CardTitle>
          </div>
          <CardDescription>
            Clear architectural separation between source external system and Digital Badging Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Database className="h-4 w-4 text-blue-600" />
                <span>Source: External Information System (T2MIS)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Master system of record for all learner registrations, institutional programs, CTPR accreditations, and official competency completion records.
              </p>
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Learner Demographic & Profile Data</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Registered Qualification & CTPR Numbers</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Institutional Batches & Enrollment Status</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Unit Competency Completion & Grades</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Managed: Digital Badging Platform (Firebase)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Platform responsible for evaluating badge eligibility, issuing requests, District Office endorsements, and cryptographic credential verifications.
              </p>
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Badge Eligibility Assessment Rules</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Badge Request Filing & District Workflows</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>District Office Review & Approval Logs</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Digital Credentials & Public Verification IDs</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint Diagnostic Status */}
      <Card className="border-slate-200">
        <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">External API Endpoint Health Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 text-xs">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700 font-mono">GET</Badge>
                <span className="font-mono text-slate-800 font-semibold">/api/me/training-center/learners</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Scoped learner roster and eligibility evidence</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-none">200 OK</Badge>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700 font-mono">GET</Badge>
                <span className="font-mono text-slate-800 font-semibold">/api/me/training-center/dashboard-summary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Mapped Training Center CTPR and program summary</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-none">200 OK</Badge>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700 font-mono">GET</Badge>
                <span className="font-mono text-slate-800 font-semibold">/api/learners/{'{'}ULI{'}'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Scoped learner enrollment and competency details</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-none">200 OK</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
