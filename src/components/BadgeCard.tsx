import React from 'react';
import { Award, ExternalLink, Calendar, ShieldCheck, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BadgeMetadata } from '@/src/types';
import { getBadgeColor, getStatusColor } from '@/src/lib/badge-utils';

interface BadgeCardProps {
  badge: BadgeMetadata;
  onViewDetails?: (badge: BadgeMetadata) => void;
}

export default function BadgeCard({ badge, onViewDetails }: BadgeCardProps) {
  return (
    <Card className="group overflow-hidden border-slate-200 hover:border-blue-300 transition-all hover:shadow-lg">
      <div className={`h-2 ${getBadgeColor(badge.badgeType).split(' ')[0]}`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getBadgeColor(badge.badgeType)}`}>
            <Award className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(badge.status)}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{badge.status}</span>
          </div>
        </div>
        
        <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-widest font-bold border-slate-200">
          {badge.badgeType}
        </Badge>
        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors">
          {badge.badgeName || badge.programName || (badge as any).programTitle || (badge as any).badgeTemplateName || 'Untitled Badge'}
        </h3>
        {badge.qualificationName && (
          <div className="text-xs text-slate-500 font-medium mb-3 line-clamp-1 flex items-center gap-1">
            <span className="text-slate-400 font-semibold font-sans">Profile:</span>
            <span>{badge.qualificationName}</span>
          </div>
        )}
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            Issued: {badge.issuanceDate || 'Pending Registration'}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            ID: {badge.verificationId || (badge as any).certificationId || 'PENDING'}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs gap-2"
          onClick={() => onViewDetails?.(badge)}
        >
          Details
        </Button>
        <Button 
          size="sm" 
          className="flex-1 text-xs gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <ExternalLink className="h-3 w-3" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}
