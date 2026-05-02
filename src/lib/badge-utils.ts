import { BadgeMetadata } from '@/src/types';

export const getBadgeColor = (type: string) => {
  switch (type) {
    case 'Proficient': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Expert': return 'bg-green-100 text-green-800 border-green-200';
    case 'Skilled': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Master': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
    case 'Approved': return 'bg-emerald-500';
    case 'Pending':
    case 'Pending Approval': return 'bg-orange-500';
    case 'Rejected': return 'bg-rose-500';
    case 'Expired': return 'bg-slate-500';
    case 'Revoked': return 'bg-gray-500';
    default: return 'bg-slate-400';
  }
};
