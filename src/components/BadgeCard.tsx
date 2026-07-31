import React from 'react';
import { Award, ExternalLink, Calendar, ShieldCheck, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BadgeMetadata, BadgeTemplate } from '@/src/types';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { useNavigate } from 'react-router-dom';

const formatDate = (value: any) => {
  if (!value) return "N/A";

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return String(value);
};

interface BadgeCardProps {
  badge: BadgeMetadata;
  template?: BadgeTemplate;
  onViewDetails?: (badge: BadgeMetadata) => void;
}

export default function BadgeCard({ badge, template, onViewDetails }: BadgeCardProps) {
  const { user } = useFirebase();
  const navigate = useNavigate();

  return (
    <Card className="group overflow-hidden border-slate-200 hover:border-blue-300 transition-all hover:shadow-lg">
      <div className={`h-2 ${getBadgeColor(badge.badgeType).split(' ')[0]}`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getBadgeColor(badge.badgeType)}`}>
            <Award className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
            <div className={`w-2 h-2 rounded-full ${getStatusColor((badge.status as string) === 'Approved' ? 'Active' : badge.status)}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{(badge.status as string) === 'Approved' ? 'Active' : badge.status}</span>
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <BadgeRenderer
            scale={0.52}
            data={{
              id: badge.id,
              name: template?.badgeName || badge.badgeName || badge.programName || "TESDA Digital Badge",
              learnerName: (badge as any).learnerName || user?.displayName || "Learner Name",
              issueDate: formatDate((badge as any).issueDate || badge.issuanceDate || (badge as any).dateIssued || (badge as any).submittedAt),
              validUntil: formatDate((badge as any).validUntil || badge.validity || (badge as any).expiryDate),
              verificationId: badge.verificationId || (badge as any).certificationId || badge.badgeId || badge.id || "PENDING",
              imageUrl: template?.imageUrl || "",
              level: template?.badgeType || badge.badgeType || "Proficient",
              qualificationTitle:
                template?.badgeName ||
                badge.badgeName ||
                template?.qualificationName ||
                badge.qualificationName ||
                (badge as any).badgeTemplateName ||
                badge.programName ||
                (badge as any).programTitle ||
                "Technical Qualification",
              qualificationCode:
                template?.qualificationCode ||
                badge.qualificationCode ||
                (badge as any).qualificationCode ||
                "NC-II",
              templateConfig: template?.templateConfig
            }}
          />
        </div>
        
        <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-widest font-bold border-slate-200">
          {badge.badgeType}
        </Badge>
        <div className="min-h-[3rem] mb-1 flex items-start">
          <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors" title={template?.badgeName || badge.badgeName || badge.programName || 'Untitled Badge'}>
            {template?.badgeName || badge.badgeName || badge.programName || (badge as any).programTitle || (badge as any).badgeTemplateName || 'Untitled Badge'}
          </h3>
        </div>
        <div className="min-h-[1.25rem] mb-3 flex items-center">
          {(template?.qualificationName || badge.qualificationName) && (
            <div className="text-xs text-slate-500 font-medium line-clamp-1 flex items-center gap-1">
              <span className="text-slate-400 font-semibold font-sans">Profile:</span>
              <span title={template?.qualificationName || badge.qualificationName}>{template?.qualificationName || badge.qualificationName}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            Issued: {badge.issuanceDate || formatDate((badge as any).issueDate) || 'Pending Registration'}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            ID: {badge.verificationId || (badge as any).certificationId || badge.badgeId || 'PENDING'}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs gap-2 font-semibold"
          onClick={() => {
            if (onViewDetails) {
              onViewDetails(badge);
            } else {
              navigate('/learner/wallet');
            }
          }}
        >
          Details
        </Button>
        <Button 
          size="sm" 
          className="flex-1 text-xs gap-2 bg-blue-600 hover:bg-blue-700 font-semibold text-white"
          onClick={() => navigate('/learner/wallet')}
        >
          <ExternalLink className="h-3 w-3" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}
