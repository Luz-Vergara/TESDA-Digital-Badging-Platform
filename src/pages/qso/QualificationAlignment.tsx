import React, { useState } from 'react';
import { 
  BadgeCheck, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Sliders,
  ChevronRight,
  Database
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface AlignedQualification {
  id: string;
  code: string;
  title: string;
  sector: 'ICT' | 'Tourism' | 'Construction' | 'Agricultural' | 'Automotive' | 'Health';
  pqfLevel: 1 | 2 | 3 | 4 | 5;
  alignedBadges: number;
  status: 'Aligned' | 'Pending Review' | 'Revision Required';
  alignmentProgress: number;
  lastUpdated: string;
}

export default function QualificationAlignment() {
  const [qualifications, setQualifications] = useState<AlignedQualification[]>([
    { id: '1', code: 'ANIM-NC3-2D', title: '2D Digital Cut-Out Animation NC III', sector: 'ICT', pqfLevel: 3, alignedBadges: 8, status: 'Aligned', alignmentProgress: 100, lastUpdated: '2026-05-10' },
    { id: '2', code: 'ANIM-NC2-2D', title: '2D Animation NC II', sector: 'ICT', pqfLevel: 2, alignedBadges: 6, status: 'Aligned', alignmentProgress: 100, lastUpdated: '2026-05-11' },
    { id: '3', code: 'ICT-WD-3', title: 'Web Development NC III', sector: 'ICT', pqfLevel: 3, alignedBadges: 7, status: 'Aligned', alignmentProgress: 92, lastUpdated: '2026-05-24' },
    { id: '4', code: 'ICT-SD-4', title: 'Software Development NC IV', sector: 'ICT', pqfLevel: 4, alignedBadges: 11, status: 'Pending Review', alignmentProgress: 88, lastUpdated: '2026-05-28' },
    { id: '5', code: 'ICT-CSA-4', title: 'Cybersecurity Analyst NC IV', sector: 'ICT', pqfLevel: 4, alignedBadges: 4, status: 'Revision Required', alignmentProgress: 45, lastUpdated: '2026-05-15' },
    { id: '6', code: 'IND-TD-2', title: 'Technical Drafting NC II', sector: 'Construction', pqfLevel: 2, alignedBadges: 5, status: 'Aligned', alignmentProgress: 100, lastUpdated: '2026-05-02' },
    { id: '7', code: 'AGR-SP-2', title: 'Solar Panel Maintenance NC II', sector: 'Agricultural', pqfLevel: 2, alignedBadges: 2, status: 'Pending Review', alignmentProgress: 60, lastUpdated: '2026-05-27' },
  ]);

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredQuals = qualifications.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          q.code.toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === 'all' || q.sector === sectorFilter;
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesSector && matchesStatus;
  });

  const getStatusBadge = (status: AlignedQualification['status']) => {
    switch (status) {
      case 'Aligned':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 text-[10px] font-bold">Standard Aligned</Badge>;
      case 'Pending Review':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 text-[10px] font-bold">QSO Under Review</Badge>;
      case 'Revision Required':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 text-[10px] font-bold">Requires Action</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-emerald-600" />
            Qualification Alignment
          </h1>
          <p className="text-slate-500 mt-1">Map, cross-verify, and audit digital badge alignment to current National Training Regulations & Standards.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2">
          <Plus className="h-4 w-4" />
          Align Regulation (TR)
        </Button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alignment Rate</p>
              <h2 className="text-3xl font-black text-slate-900">89.2%</h2>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                +2.4% vs last quarter
              </p>
            </div>
            <div className="h-14 w-14 rounded-full border-4 border-emerald-500 border-r-transparent animate-spin-slow shrink-0" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Aligned Programs</p>
              <h2 className="text-3xl font-black text-slate-900">{qualifications.filter(q => q.status === 'Aligned').length} / {qualifications.length}</h2>
              <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                Mapped to Philippine Qualifications Framework
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BadgeCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pending Standards Audit</p>
              <h2 className="text-3xl font-black text-slate-900">{qualifications.filter(q => q.status === 'Pending Review').length} Items</h2>
              <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                Requires active validation signature
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search by qualification descriptor or regulation code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full bg-white border-slate-200 text-slate-950 font-medium text-sm"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Industry Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="ICT">Information (ICT)</SelectItem>
                <SelectItem value="Tourism">Tourism & Culinary</SelectItem>
                <SelectItem value="Construction">Construction</SelectItem>
                <SelectItem value="Agricultural">Agricultural</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Alignment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Aligned">Standard Aligned</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Revision Required">Revision Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Aligned Catalog Grid */}
      <div className="grid gap-4">
        {filteredQuals.map((qualification) => (
          <Card key={qualification.id} className="border-slate-200 hover:shadow-xs transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Qualification Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black tracking-wide text-slate-400 bg-slate-100 border border-slate-100 px-2 py-0.5 rounded leading-none shrink-0 uppercase">
                      {qualification.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-blue-50/50 text-blue-700 px-2 py-0.5 rounded border border-blue-50">
                      PQF Level {qualification.pqfLevel}
                    </span>
                    {getStatusBadge(qualification.status)}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{qualification.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>Sector: <strong>{qualification.sector}</strong></span>
                      <span>•</span>
                      <span>Last Audited: <strong>{qualification.lastUpdated}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Tracking Progress */}
                <div className="lg:w-72 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      {qualification.alignedBadges} Aligned Badges
                    </span>
                    <span className={qualification.alignmentProgress === 100 ? "text-emerald-600" : "text-blue-600"}>
                      {qualification.alignmentProgress}% Mapped
                    </span>
                  </div>
                  <Progress 
                    value={qualification.alignmentProgress} 
                    className="h-2 bg-slate-100 [&>div]:bg-blue-600"
                  />
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700">
                    Audit Map
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>
        ))}

        {filteredQuals.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6">
            <Database className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">No alignments aligned with parameters</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Try refining your filter preferences or enter another search pattern.</p>
          </div>
        )}
      </div>

    </div>
  );
}
