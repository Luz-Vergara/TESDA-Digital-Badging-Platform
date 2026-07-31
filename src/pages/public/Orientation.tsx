import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  HelpCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Search, 
  ArrowRight, 
  BookOpen, 
  FileBadge, 
  CheckSquare, 
  FileText, 
  QrCode, 
  Info,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Navbar from '@/src/components/layout/Navbar';

export default function Orientation() {
  const badgeTiers = [
    {
      title: 'Proficient Badge',
      type: 'Training',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeClass: 'text-emerald-600 bg-emerald-100',
      desc: 'Awarded for each completed Unit of Competency (UC), based on institutional assessment or Recognition of Prior Learning (RPL). This badge recognizes that the learner has demonstrated competence in a specific unit.'
    },
    {
      title: 'Expert Badge',
      type: 'Training',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeClass: 'text-amber-600 bg-amber-100',
      desc: 'Awarded upon completion of all core units in a training program through institutional assessment, stacking of Proficient Badges, or through Recognition of Prior Learning (RPL). This badge represents completion of the required training program competencies.'
    },
    {
      title: 'Skilled Badge',
      type: 'Assessment',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeClass: 'text-blue-600 bg-blue-100',
      desc: 'Represents the issuance of a Certificate of Competency (CoC) under national assessment or Recognition of Prior Learning (RPL). This badge shows that the learner has been certified for a specific cluster or unit of competency.'
    },
    {
      title: 'Master Badge',
      type: 'Assessment',
      color: 'bg-yellow-50 text-yellow-700 border-yellow-400',
      badgeClass: 'text-yellow-600 bg-yellow-100',
      desc: 'Represents the issuance of a National Certificate (NC) by TESDA following successful completion of all required competencies or RPL equivalency. This badge is the highest badge level in the hierarchy and represents full qualification certification.'
    }
  ];

  const steps = [
    {
      id: 'step-1',
      badgeName: 'Proficient Badge',
      role: 'Unit Level Mastery',
      color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50',
      iconColor: 'bg-emerald-500 text-white',
      badgeText: 'Emerald Tier',
      desc: 'Earned for individual Units of Competency. Perfect for modular progress.'
    },
    {
      id: 'step-2',
      badgeName: 'Expert Badge',
      role: 'Program Completion',
      color: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
      iconColor: 'bg-amber-500 text-white',
      badgeText: 'Amber Tier',
      desc: 'Awarded when multiple Proficient Badges are stacked or the full core training program is completed.'
    },
    {
      id: 'step-3',
      badgeName: 'Skilled Badge',
      role: 'CoC Certification',
      color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
      iconColor: 'bg-blue-500 text-white',
      badgeText: 'Blue Tier',
      desc: 'Recognizes Certificate of Competency (CoC) credentials after passing national assessment milestones.'
    },
    {
      id: 'step-4',
      badgeName: 'Master Badge',
      role: 'National Certificate (NC)',
      color: 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50',
      iconColor: 'bg-yellow-500 text-white',
      badgeText: 'Gold Tier',
      desc: 'The pinnacle credential representing a full National Certificate (NC) qualification.'
    }
  ];

  return (
    <div id="orientation-page-container" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Hero Header Section */}
      <section id="orientation-hero" className="bg-gradient-to-b from-blue-900 to-blue-950 text-white py-16 px-4 md:px-8 border-b border-blue-800">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
            <ShieldCheck className="h-4 w-4" />
            Official TESDA Credential System
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Digital Badge Orientation
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-4xl mx-auto font-normal leading-relaxed">
            Understand how TESDA digital badges represent learner achievements, competency completion, assessment results, and certification milestones.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-5 rounded-lg text-sm transition-all shadow-lg hover:shadow-blue-500/10">
                Access Badge Wallet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/verify">
              <Button className="bg-white hover:bg-slate-100 text-blue-950 font-bold px-6 py-5 rounded-lg text-sm transition-all shadow-lg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Verify Credentials
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Introduction Container */}
      <main id="orientation-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* Intro Section */}
        <section id="introduction-section" className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <BookOpen className="h-10 w-10 md:h-12 md:h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Introduction</h2>
            <p className="text-slate-600 text-base leading-relaxed">
              TESDA Digital Badges provide a structured and verifiable way of recognizing learner achievements. Each badge represents a specific level of competency, from completion of individual Units of Competency to full qualification certification. The badge hierarchy supports training completion, institutional assessment, national assessment, Recognition of Prior Learning, and public verification of credentials.
            </p>
          </div>
        </section>

        {/* Badge Types Section */}
        <section id="badge-types-section" className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <Award className="h-3.5 w-3.5" />
              Categorization
            </div>
            <h2 className="text-3xl font-bold text-slate-900">TESDA Digital Badge Types</h2>
            <p className="text-slate-500">Explore the four core categories of digital badges categorized under training achievements and national assessment milestones.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {badgeTiers.map((badge, idx) => (
              <Card key={idx} id={`badge-card-${idx}`} className="border-slate-200/80 hover:border-blue-400 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between bg-white group select-none">
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${badge.color}`}>
                      {badge.type} Level
                    </span>
                    <Award className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-slate-900">{badge.title}</CardTitle>
                    <div className="h-1 w-12 bg-blue-600 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {badge.desc}
                  </p>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>TESDA Standard Badge</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${badge.badgeClass}`}>
                      {badge.title.split(' ')[0]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Badge Hierarchy Table */}
        <section id="badge-hierarchy-table-section" className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-blue-700 font-bold text-sm uppercase">
              <Layers className="h-4 w-4" />
              Comparison Guide
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Badge Hierarchy Matrix</h2>
            <p className="text-slate-500 text-sm">A structured reference map detailing types, corresponding credentials, and awarding bases.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 md:px-8">Badge Hierarchy</th>
                    <th className="py-4 px-6">Badge Type</th>
                    <th className="py-4 px-6">Credential Represented</th>
                    <th className="py-4 px-6 md:px-8">Typical Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 md:px-8 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      Proficient Badge
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Training
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">Unit of Competency (UC)</td>
                    <td className="py-4 px-6 md:px-8 text-slate-500">Institutional assessment or RPL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 md:px-8 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      Expert Badge
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-amber-55 text-amber-700 border border-amber-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50">
                        Training
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">Completion of Program / All Core UCs</td>
                    <td className="py-4 px-6 md:px-8 text-slate-500">Completion of training, stacked Proficient Badges, or RPL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 md:px-8 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      Skilled Badge
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Assessment
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">Certificate of Competency (CoC)</td>
                    <td className="py-4 px-6 md:px-8 text-slate-500">National assessment or RPL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 md:px-8 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                      Master Badge
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        Assessment
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">National Certificate (NC)</td>
                    <td className="py-4 px-6 md:px-8 text-slate-500">Full qualification certification or RPL equivalency</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How the Badge Progression Works */}
        <section id="badge-progression-section" className="space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How Badge Progression Works</h2>
            <p className="text-slate-500">Earn micro-credentials sequentially or leverage fast-track pathways to build an industry-recognized professional portfolio.</p>
          </div>

          {/* Graphical progression flowchart */}
          <div className="grid md:grid-cols-4 gap-4 relative">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex flex-col">
                <Card className={`border ${step.color} transition-all duration-300 rounded-2xl flex-1 flex flex-col shadow-sm relative z-10`}>
                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div className={`w-8 h-8 rounded-full ${step.iconColor} font-bold text-xs flex items-center justify-center`}>
                          0{index + 1}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {step.badgeText}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-[#0f172a] text-base mb-1">{step.badgeName}</h4>
                      <p className="text-blue-700 font-bold text-[11px] uppercase tracking-wider mb-3">{step.role}</p>
                      <p className="text-slate-600 text-xs leading-relaxed">{step.desc}</p>
                    </div>
                  </CardContent>
                </Card>
                {index < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 bg-white rounded-full border border-slate-200 p-1 shadow-sm z-20">
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detailed Explanations */}
          <div className="bg-slate-100/50 rounded-3xl p-6 md:p-8 border border-slate-200/60 font-medium text-slate-700">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Key Rules of Progression:</h3>
            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <li className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Proficient Badges may be earned for individual Units of Competency.</span>
              </li>
              <li className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Multiple Proficient Badges may support the awarding of an Expert Badge.</span>
              </li>
              <li className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Skilled Badges represent Certified Certificate of Competency (CoC) level recognition.</span>
              </li>
              <li className="flex gap-3">
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Master Badges represent high-level National Certificate (NC) qualification milestones.</span>
              </li>
              <li className="flex gap-3 md:col-span-2 lg:col-span-2">
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Recognition of Prior Learning (RPL) may be used as an alternative pathway when prior learning and experience are validated.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* RPL and Verification Section */}
        <div id="rpl-verification-containers" className="grid md:grid-cols-2 gap-8">
          
          {/* RPL Information */}
          <section id="rpl-info-section" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Recognition of Prior Learning (RPL)</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Recognition of Prior Learning (RPL) allows learners or workers to have their existing skills, work experience, training, and previous learning assessed against competency standards. Through RPL, eligible candidates may be awarded appropriate badges when their evidence demonstrates the required competence.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Alternative Pathways</span>
            </div>
          </section>

          {/* Verification Section */}
          <section id="verification-info-section" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Ecosystem Verification</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Each issued badge may be connected to a badge ID or QR verification page. Employers, institutions, and other stakeholders may verify the badge status, credential represented, learner information, issuing office, and validity of the badge. This guarantees authentic workforce micro-credentials.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Industry Trusted</span>
              <Link to="/verify" className="text-blue-600 hover:text-blue-700 font-bold text-xs inline-flex items-center gap-1">
                Go to Verification Center
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>

        {/* Important Notes Section */}
        <section id="important-notes-section" className="bg-amber-50/50 rounded-3xl p-8 border border-amber-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
              <Info className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-amber-900">Important System Notes</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm text-amber-800">
            <div className="flex gap-3">
              <div className="font-extrabold text-amber-600 text-lg leading-none select-none">•</div>
              <p className="leading-relaxed">
                Digital badges do not replace TESDA certificates unless officially linked to CoC or NC issuance.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="font-extrabold text-amber-600 text-lg leading-none select-none">•</div>
              <p className="leading-relaxed">
                Badges provide a visual and verifiable representation of achievement.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="font-extrabold text-amber-600 text-lg leading-none select-none">•</div>
              <p className="leading-relaxed">
                Badge levels must be aligned with the appropriate training, assessment, or RPL basis.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="font-extrabold text-amber-600 text-lg leading-none select-none">•</div>
              <p className="leading-relaxed">
                Issued badges should be traceable through badge ID, QR code, or verification record.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="h-8 w-8 text-blue-500" />
                <span className="text-2xl font-bold text-white">TESDA Digital Badging</span>
              </div>
              <p className="max-w-md text-slate-400 leading-relaxed">
                The official digital credentialing platform of the Technical Education and Skills Development Authority (TESDA). 
                Building a more transparent and accessible workforce for the Philippines.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About the System</Link></li>
                <li><Link to="/verify" className="hover:text-white transition-colors">Verify a Badge</Link></li>
                <li><Link to="/orientation" className="hover:text-white transition-colors">Badge Orientation</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Help & FAQs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Contact Us</h4>
              <ul className="space-y-4 text-sm">
                <li>Email: support@tesda.gov.ph</li>
                <li>Phone: (02) 8887-7777</li>
                <li>Address: East Service Road, South Luzon Expressway, Taguig City</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Technical Education and Skills Development Authority. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
