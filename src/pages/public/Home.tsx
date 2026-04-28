import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, CheckCircle, Users, Building2, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/src/components/layout/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 -z-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/5 skew-x-12 transform translate-x-1/4 -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
                <Shield className="h-3 w-3" />
                Official TESDA Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                The Future of <span className="text-blue-600">TVET Credentials</span> is Digital.
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Secure, verifiable, and portable digital badges for TESDA micro-credentials. 
                Empowering learners and industry with trusted competency verification.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-8 text-lg">
                    Access My Wallet
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/verify">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-slate-200">
                    Verify a Badge
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100">
                <img 
                  src="https://picsum.photos/seed/tesda-badge/800/600" 
                  alt="Digital Badge Interface" 
                  className="rounded-xl w-full h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white p-6 rounded-2xl shadow-xl z-20 hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">100% Secure</p>
                    <p className="text-blue-100 text-sm">Blockchain-backed verification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Issued Badges', value: '1.2M+', icon: Award },
              { label: 'Active Learners', value: '850K+', icon: Users },
              { label: 'Partner Institutions', value: '4.5K+', icon: Building2 },
              { label: 'Verifications', value: '250K+', icon: Search },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 text-blue-600 mb-4">
                  <stat.icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Badge Hierarchy Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The TESDA Badge Hierarchy</h2>
            <p className="text-slate-600">Our multi-tiered badging system recognizes every step of your competency journey, from individual units to national certifications.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: 'Proficient', desc: 'Unit of Competency', color: 'blue' },
              { title: 'Expert', desc: 'Program Completion', color: 'green' },
              { title: 'Skilled', desc: 'Certificate of Competency', color: 'amber' },
              { title: 'Master', desc: 'National Certificate', color: 'purple' },
            ].map((tier) => (
              <Card key={tier.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className={`w-20 h-20 mx-auto rounded-full bg-${tier.color}-100 flex items-center justify-center mb-6`}>
                    <Award className={`h-10 w-10 text-${tier.color}-600`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.title} Badge</h3>
                  <p className="text-sm text-slate-500">{tier.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-8 w-8 text-blue-500" />
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
