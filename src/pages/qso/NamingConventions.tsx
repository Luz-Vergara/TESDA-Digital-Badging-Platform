import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Info, 
  AlertTriangle, 
  Shuffle,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NamingConventions() {
  // Playground state
  const [level, setLevel] = useState('NCII');
  const [sector, setSector] = useState('ICT');
  const [title, setTitle] = useState('Computer Systems Servicing');
  const [competency, setCompetency] = useState('Install and Configure Computer Systems');
  const [type, setType] = useState('Skill'); // Skill, core, master
  
  const [copied, setCopied] = useState(false);

  const rules = [
    { rule: "All Level Prefixes", desc: "Digital badging standards demand prefixing with standard levels: e.g. NC I, NC II, NC III, NC IV, or TM (Trainer Methodology)." },
    { rule: "Uppercase Codes", desc: "Identification and qualification codes must represent capital strings only: e.g. 'ICT-CSS-NC2'." },
    { rule: "Special Character Sanitization", desc: "No slashes (/), exclamation marks, or symbols can exist in standard system labels due to public metadata path constraints." },
    { rule: "Descriptive Suffix", desc: "Specify if the credential represents a full Qualification Standard (QS), Unit of Competency (UC), or Micro-Credential (MC)." }
  ];

  // Title Generator logic
  const generateBadgeTitle = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return 'PLEASE_ENTER_TITLE';
    
    // Formatting matching standard TESDA nomenclature rules
    const prefix = level ? `${level} - ` : '';
    const suffix = type === 'Skill' ? '(Unit of Competency)' : '(National Certificate)';
    return `${prefix}${cleanTitle} ${suffix}`;
  };

  const generateBadgeCode = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return 'PENDING_CODE';

    const titleAcronym = cleanTitle
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const sectorCode = sector.toUpperCase();
    const levelCode = level ? `-${level}` : '';
    const typeIndicator = type === 'Skill' ? '-UC' : '-NC';

    return `${sectorCode}-${titleAcronym}${levelCode}${typeIndicator}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-amber-500" />
          Naming Conventions
        </h1>
        <p className="text-slate-500 mt-1">Configure and enforce consistent title formats to guarantee seamless integration with verification platforms.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Core Policy Guidelines */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Standardization Directives</CardTitle>
              <CardDescription>Official compliance rules approved by the Standards and Qualifications Office (QSO).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-4">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold border border-amber-100">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">{item.rule}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Policy Alert notice */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-amber-800 text-sm">Registry Integration Warning</h4>
                <p className="text-xs text-amber-700/90 leading-relaxed">
                  Badges that bypass these standardized formats risk automatic rejection during Central Certification Office audits. Please ensure any templates configured match these rules.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Playground Title Builder */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                Live Format Generator
              </CardTitle>
              <CardDescription>Verify names dynamically using standard parsing directives.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Qualification Title</label>
                <Input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Computer Systems Servicing"
                  className="h-9.5 text-xs text-slate-950 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">NC Level</label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue placeholder="NC Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NCI">NC I</SelectItem>
                      <SelectItem value="NCII">NC II</SelectItem>
                      <SelectItem value="NCIII">NC III</SelectItem>
                      <SelectItem value="NCIV">NC IV</SelectItem>
                      <SelectItem value="TM">TM I/II</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sector Code</label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="h-9.5 text-xs">
                      <SelectValue placeholder="Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICT">Information (ICT)</SelectItem>
                      <SelectItem value="TR">Tourism</SelectItem>
                      <SelectItem value="CON">Construction</SelectItem>
                      <SelectItem value="AGR">Agricultural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Badge Scope Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9.5 text-xs">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Skill">Unit of Competency (UC)</SelectItem>
                    <SelectItem value="Qualification">Full Qualification (NC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generation outputs */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                
                {/* Outbound Badge Title */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Standardized Badge Title</span>
                    <button 
                      onClick={() => copyToClipboard(generateBadgeTitle())}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 font-sans tracking-tight">
                    {generateBadgeTitle()}
                  </p>
                </div>

                {/* Outbound Code Identifier */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">TESDA Qualification Code</span>
                    <button 
                      onClick={() => copyToClipboard(generateBadgeCode())}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs font-mono font-black tracking-wide text-blue-600">
                    {generateBadgeCode()}
                  </p>
                </div>

              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
