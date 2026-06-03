import { BadgeMetadata } from '@/src/types';
import { db } from './firebase';
import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';

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
  const s = status?.toLowerCase() || '';
  
  if (s.includes('published') || s === 'active' || s === 'approved') {
    return 'bg-emerald-500';
  }
  
  if (s.includes('forwarded') || s.includes('submitted') || s.includes('review') || s.includes('generation') || s.includes('pending')) {
    return 'bg-orange-500';
  }
  
  if (s.includes('rejected') || s.includes('returned') || s.includes('revoked') || s.includes('suspended')) {
    return 'bg-rose-500';
  }
  
  if (s === 'expired') {
    return 'bg-slate-500';
  }
  
  return 'bg-slate-400';
};

export const generateRequestNumber = async (trainingCenterId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const tcClean = trainingCenterId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || "TC";
  const docId = `${year}_${tcClean}`;
  const counterRef = doc(db, 'requestCounters', docId);

  try {
    const finalSequence = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;

      if (counterDoc.exists()) {
        const data = counterDoc.data();
        nextNumber = (data.lastNumber || 0) + 1;
        transaction.update(counterRef, {
          lastNumber: nextNumber,
          updatedAt: serverTimestamp()
        });
      } else {
        transaction.set(counterRef, {
          year,
          trainingCenterId,
          lastNumber: 1,
          updatedAt: serverTimestamp()
        });
      }
      return nextNumber;
    });

    const paddedSequence = String(finalSequence).padStart(5, '0');
    return `BR-${year}-${tcClean}-${paddedSequence}`;
  } catch (err) {
    console.error("Failed to generate request number via transaction:", err);
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `BR-${year}-${tcClean}-${rand}`;
  }
};

export const generateOfficialBadgeId = async (
  year: number,
  districtOfficeId: string,
  badgeTemplateId: string,
  prefix: string
): Promise<string> => {
  const cleanDistrict = districtOfficeId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) || "NCR";
  const docId = `${year}_${cleanDistrict}_${badgeTemplateId}`;
  const counterRef = doc(db, 'badgeCounters', docId);

  try {
    const finalSequence = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;

      if (counterDoc.exists()) {
        const data = counterDoc.data();
        nextNumber = (data.lastNumber || 0) + 1;
        transaction.update(counterRef, {
          lastNumber: nextNumber,
          updatedAt: serverTimestamp()
        });
      } else {
        transaction.set(counterRef, {
          year,
          districtOfficeId,
          badgeTemplateId,
          prefix,
          lastNumber: 1,
          updatedAt: serverTimestamp()
        });
      }
      return nextNumber;
    });

    const paddedSequence = String(finalSequence).padStart(6, '0');
    return `TESDA-${year}-${cleanDistrict}-${prefix}-${paddedSequence}`;
  } catch (err) {
    console.error("Failed to generate official Badge ID via transaction:", err);
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `TESDA-${year}-${cleanDistrict}-${prefix}-${rand}`;
  }
};

