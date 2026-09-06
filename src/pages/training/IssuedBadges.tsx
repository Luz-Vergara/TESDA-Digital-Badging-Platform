import React, { useEffect, useState } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  ExternalLink,
  Calendar,
  User,
  QrCode,
  ShieldCheck,
  Eye,
  BadgeCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const formatIssuedDate = (value: unknown): string => {
  try {
    let date: Date | null = null;

    if (value instanceof Date) {
      date = value;
    } else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    }

    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—';
  } catch {
    return '—';
  }
};

const verificationPath = (verificationId: string): string => `/#/verify/${encodeURIComponent(verificationId)}`;

interface IssuedBadgeRecord {
  id: string;
  learnerName?: unknown;
  learnerUli?: unknown;
  verificationId?: unknown;
  badgeType?: unknown;
  badgeTemplateName?: unknown;
  badgeTitle?: unknown;
  competencyCode?: unknown;
  competencyTitle?: unknown;
  recognitionScope?: unknown;
  qualificationName?: unknown;
  qualificationTitle?: unknown;
  programTitle?: unknown;
  issueDate?: unknown;
  createdAt?: unknown;
  badgeArtworkUrl?: unknown;
}

const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

const issuedBadgeDisplay = (badge: IssuedBadgeRecord) => {
  const badgeType = text(badge.badgeType);
  const competencyCode = text(badge.competencyCode);
  const competencyTitle = text(badge.competencyTitle);
  const competency = competencyCode && competencyTitle
    ? `${competencyCode} — ${competencyTitle}`
    : competencyCode || competencyTitle;
  const templateName = text(badge.badgeTemplateName) || text(badge.badgeTitle);

  return {
    badgeType,
    competency: text(badge.recognitionScope) === 'Competency' ? competency : null,
    title: templateName || badgeType || 'TESDA Digital Badge',
    qualification: text(badge.qualificationName) || text(badge.programTitle) || text(badge.qualificationTitle) || 'National Certificate',
    artworkUrl: text(badge.badgeArtworkUrl),
  };
};

export default function IssuedBadges() {
  const { user, userProfile, isAuthReady } = useFirebase();
  const [issuedBadges, setIssuedBadges] = useState<IssuedBadgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<IssuedBadgeRecord | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const tcId = userProfile?.organizationId || user.uid;
    const path = 'issuedBadges';
    const q = query(collection(db, path), where('trainingCenterId', '==', tcId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIssuedBadges(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as IssuedBadgeRecord)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, userProfile]);

  const filteredBadges = issuedBadges.filter(badge => {
    const term = searchQuery.toLowerCase();
    return (
      text(badge.learnerName)?.toLowerCase().includes(term) ||
      text(badge.verificationId)?.toLowerCase().includes(term) ||
      issuedBadgeDisplay(badge).qualification.toLowerCase().includes(term) ||
      issuedBadgeDisplay(badge).title.toLowerCase().includes(term) ||
      issuedBadgeDisplay(badge).competency?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Issued Digital Badges</h1>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-mono text-[10px]">
              DIGITAL CREDENTIAL REPOSITORY
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Official digital credentials issued to learners of this Training Center following District Office endorsement.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by learner, verification ID, qualification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredBadges.length}</span> issued credentials
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Verification / Credential ID</TableHead>
                <TableHead>Learner Name</TableHead>
                <TableHead>Digital Badge</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBadges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <BadgeCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No issued badges found</p>
                    <p className="text-xs text-slate-400 mt-1">Once District Office approves badge requests, issued credentials will appear here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBadges.map((badge) => {
                  const display = issuedBadgeDisplay(badge);
                  return (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {text(badge.verificationId) || badge.id.slice(0, 8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900">{text(badge.learnerName) || 'Learner'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ULI: {text(badge.learnerUli) || 'ULI-2026-DEMO'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                        <div><span className="font-semibold text-slate-800 text-sm">{display.badgeType || display.title}</span>{display.competency ? <p className="text-xs text-slate-500">{display.competency}</p> : display.title !== display.badgeType ? <p className="text-xs text-slate-500">{display.title}</p> : null}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-slate-700">{display.qualification}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-600">
                        {formatIssuedDate(badge.issueDate ?? badge.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        Active / Valid
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBadge(badge)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <a
                          href={verificationPath(text(badge.verificationId) || badge.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-blue-600">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Credential Modal */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-xl">Digital Credential Preview</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Official TESDA Digital Badge Record
            </DialogDescription>
          </DialogHeader>

          {selectedBadge && (() => {
            const display = issuedBadgeDisplay(selectedBadge);
            return (
            <div className="space-y-4 py-2">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl text-center shadow-lg relative overflow-hidden">
                {display.artworkUrl ? <img className="mx-auto mb-3 h-16 w-16 rounded-full border border-blue-400/30 object-cover" src={display.artworkUrl} alt="Issued badge artwork" /> : <div className="mx-auto w-16 h-16 bg-blue-500/20 backdrop-blur-md rounded-full flex items-center justify-center border border-blue-400/30 text-blue-300 mb-3"><Award className="h-8 w-8" /></div>}
                <h3 className="text-lg font-bold">{display.badgeType || display.title}</h3>
                {display.competency ? <p className="text-xs text-blue-200 mt-1">{display.competency}</p> : display.title !== display.badgeType ? <p className="text-xs text-blue-200 mt-1">{display.title}</p> : null}
                <p className="text-xs text-blue-200 mt-1">{display.qualification}</p>
                <p className="text-sm font-bold text-emerald-400 mt-4">Issued to: {text(selectedBadge.learnerName) || 'Learner'}</p>
                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-300">
                  <span>ID: {text(selectedBadge.verificationId) || selectedBadge.id}</span>
                  <span>Issued: {formatIssuedDate(selectedBadge.issueDate ?? selectedBadge.createdAt)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Training Center:</span>
                  <span className="font-bold">{userProfile?.office || 'Authorized Provider'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Verification Link:</span>
                  <span className="font-mono text-blue-600">{verificationPath(text(selectedBadge.verificationId) || selectedBadge.id)}</span>
                </div>
              </div>
            </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedBadge(null)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
