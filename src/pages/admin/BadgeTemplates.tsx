import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  MoreVertical,
  BookOpen,
  Calendar,
  Tag,
  CheckCircle2,
  Archive,
  FileText,
  Settings,
  Sliders,
  Eye,
  Save,
  Move,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Image,
  Sparkles,
  Check,
  Lock,
  ChevronRight,
  Upload
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  serverTimestamp,
  getDocs,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BadgeRenderer } from '@/src/components/badges/BadgeRenderer';
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
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { BadgeDesign, BadgeTemplate, RecognitionScope } from '@/src/types';
import { BADGE_TYPES, getBadgeColor, getBadgeTypeLabel, isBadgeType, STANDARD_TYPES } from '@/src/lib/badge-utils';
import { demoStandards, getDemoStandard } from '@/src/data/demoStandards';
import { DEFAULT_BADGE_DESIGNS, mergeBadgeDesigns, resolveBadgeDesign } from '@/src/lib/badge-designs';

const createDefaultTemplateConfig = () => ({
  fitMode: 'cover' as const,
  name: { x: 50, y: 45, fontSize: '1.4rem', color: '#111827', enabled: true },
  trainingProvider: { x: 50, y: 51, fontSize: '0.7rem', color: '#475569', enabled: true },
  qualificationTitle: { x: 50, y: 58, fontSize: '0.95rem', color: '#111827', enabled: true },
  qualificationCode: { x: 50, y: 63, fontSize: '0.8rem', color: '#374151', enabled: true },
  competencyTitle: { x: 50, y: 68, fontSize: '0.8rem', color: '#334155', enabled: true },
  competencyCode: { x: 50, y: 72, fontSize: '0.7rem', color: '#64748b', enabled: true },
  level: { x: 50, y: 76, fontSize: '0.9rem', color: '#1d4ed8', enabled: true },
  date: { x: 27, y: 88, fontSize: '0.7rem', color: '#111827', enabled: true },
  validUntil: { x: 73, y: 88, fontSize: '0.7rem', color: '#111827', enabled: true },
  badgeId: { x: 50, y: 81, fontSize: '0.65rem', color: '#374151', enabled: true },
  verificationId: { x: 50, y: 84, fontSize: '0.6rem', color: '#64748b', enabled: true },
  qr: { x: 84, y: 76, size: 58, enabled: true },
});

const ACTIVE_STANDARD_PROFILES = [
  "Create 2D Digital Cut-Out Animation",
  "Develop 2D Animation",
  "Produce 3D Animation",
  "Advanced Multimedia Production",
  "Web Development NC III",
  "Visual Graphic Design NC III",
  "Software Development NC IV",
  "Cybersecurity Analyst",
  "Game Development",
  "Data Science Associate",
  "IT Support Specialist",
  "Technical Drafting NC II"
];

const PROFILE_CODE_MAPPING: { [key: string]: string } = {
  "Create 2D Digital Cut-Out Animation": "ANIM-NC3-2D",
  "Develop 2D Animation": "ANIM-NC2-2D",
  "Produce 3D Animation": "ANIM-NC3-3D",
  "Advanced Multimedia Production": "ICT-AMP-23",
  "Web Development NC III": "ICT-WD-3",
  "Visual Graphic Design NC III": "ICT-VGD-3",
  "Software Development NC IV": "ICT-SD-4",
  "Cybersecurity Analyst": "ICT-CSA-4",
  "Game Development": "ICT-GD-3",
  "Data Science Associate": "ICT-DSA-3",
  "IT Support Specialist": "ICT-ITSS-2",
  "Technical Drafting NC II": "IND-TD-2"
};

export default function BadgeTemplates() {
  const { user, isAuthReady } = useFirebase();
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [badgeDesigns, setBadgeDesigns] = useState<BadgeDesign[]>(DEFAULT_BADGE_DESIGNS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BadgeTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<BadgeTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'designs' | 'designer'>('catalog');
  const [showJsonConfig, setShowJsonConfig] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('all');

  // Layout Designer Workspace States
  const [designerTemplateId, setDesignerTemplateId] = useState<string>('');
  const [designerImgUrl, setDesignerImgUrl] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('Determine Traditional Key Poses');
  const [designerConfig, setDesignerConfig] = useState<any>(createDefaultTemplateConfig());
  const [activeField, setActiveField] = useState<string>('name');
  const [designerSuccess, setDesignerSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savingDesignId, setSavingDesignId] = useState<string | null>(null);
  const [designFeedback, setDesignFeedback] = useState<string | null>(null);

  // Shared image processing keeps reusable-design uploads consistent with the
  // existing layout-background workflow.
  const processImageFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      alert('Highly specified file selection requested: Please upload a standard image format (PNG, JPG, or JPEG)!');
      reject(new Error('Unsupported image format'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.onload = (event) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('The selected file is not a valid image.'));
      img.onload = () => {
        // Enforce high compatibility limit by compressing background preview template bounds to max 1024px dynamic fit
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  const processFile = (file: File) => {
    void processImageFile(file)
      .then(setDesignerImgUrl)
      .catch(() => undefined);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDesignArtworkUpload = async (design: BadgeDesign, file?: File) => {
    if (!file || !user) return;

    setSavingDesignId(design.id);
    setDesignFeedback(null);
    try {
      const artworkUrl = await processImageFile(file);
      await setDoc(doc(db, 'badgeDesigns', design.id), {
        id: design.id,
        name: design.name,
        badgeType: design.badgeType,
        status: design.status,
        artworkUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setDesignFeedback(`Saved artwork for ${design.name}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'badgeDesigns');
    } finally {
      setSavingDesignId(null);
    }
  };
  
  const [formData, setFormData] = useState({
    badgeName: '',
    qualificationName: '',
    qualificationCode: '',
    standardId: '',
    badgeType: 'Proficient' as BadgeTemplate['badgeType'],
    standardType: 'CS' as NonNullable<BadgeTemplate['standardType']>,
    recognitionScope: 'Competency' as RecognitionScope,
    competencyCode: '',
    competencyTitle: '',
    badgeDesignId: 'default-proficient-design',
    credentialLevel: 'Unit of Competency' as BadgeTemplate['credentialLevel'],
    relatedCompetency: '',
    description: '',
    criteria: '',
    validityMonths: 36,
    alignment: 'TESDA Training Standard',
    tags: '',
    issuableBy: ['TrainingCenter'] as BadgeTemplate['issuableBy'],
    requiresApproval: true,
    displayOrder: 1,
    hierarchyVisible: true,
    status: 'Approved' as BadgeTemplate['status'],
    imageUrl: '',
    badgeIdPrefix: '',
    issuingSeries: 'TESDA',
    templateConfig: JSON.stringify(createDefaultTemplateConfig(), null, 2)
  });

  // Subscribe to real-time sync of badge template details
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubTemplates = onSnapshot(collection(db, 'badgeTemplates'), (snapshot) => {
      const templateData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BadgeTemplate[];
      setTemplates(templateData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'badgeTemplates');
    });

    const unsubDesigns = onSnapshot(collection(db, 'badgeDesigns'), (snapshot) => {
      const remoteDesigns = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BadgeDesign);
      setBadgeDesigns(mergeBadgeDesigns(remoteDesigns));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'badgeDesigns'));

    return () => { unsubTemplates(); unsubDesigns(); };
  }, [isAuthReady]);

  // Load standard template in layout designer when chosen in selector
  useEffect(() => {
    if (!designerTemplateId) return;
    const t = templates.find(doc => doc.id === designerTemplateId);
    if (t) {
      // A template background remains a layout concern. Reusable badge artwork
      // is configured independently in the Reusable Badge Designs view.
      setDesignerImgUrl(t.imageUrl || '');
      setTestTitle(t.badgeName || t.qualificationName || 'Determine Traditional Key Poses');
      if (t.templateConfig && typeof t.templateConfig === 'object') {
        setDesignerConfig(t.templateConfig);
      } else {
        // Use nice defaults
        setDesignerConfig(createDefaultTemplateConfig());
      }
    }
  }, [designerTemplateId, templates]);

  // Set initial selected template standard
  useEffect(() => {
    if (templates.length > 0 && !designerTemplateId) {
      setDesignerTemplateId(templates[0].id!);
    }
  }, [templates, designerTemplateId]);

  const updateFieldPosition = (fieldKey: string, updates: Partial<any>) => {
    setDesignerConfig((prev: any) => {
      const currentField = prev[fieldKey] || { x: 50, y: 50, enabled: true, fontSize: "1rem", color: "#111827" };
      return {
        ...prev,
        [fieldKey]: {
          ...currentField,
          ...updates
        }
      };
    });
  };

  const handleSaveDesignerLayout = async () => {
    if (!user) {
      alert("Auth is not ready yet. Please refresh or log in again.");
      return;
    }
    if (!designerTemplateId) {
      alert("Please select a standard template to configure.");
      return;
    }
    
    setIsSubmitting(true);
    setDesignerSuccess(null);
    const matched = templates.find(t => t.id === designerTemplateId);
    
    try {
      await updateDoc(doc(db, 'badgeTemplates', designerTemplateId), {
        templateConfig: designerConfig,
        imageUrl: designerImgUrl.trim(),
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Designed Layout Standards: ${matched?.badgeName || 'Badge Standard'}`,
        userName: 'QSO Admin',
        timestamp: serverTimestamp(),
        details: `Coordinated layout parameters for ${matched?.qualificationName || 'Qualification'}`
      });
      
      setDesignerSuccess(`Saved credential layout for "${matched?.badgeName || 'Badge'}". Reusable badge artwork is managed separately.`);
      setTimeout(() => setDesignerSuccess(null), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'badgeTemplates');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Badge type and standard type are intentionally selected independently.
  // Do not infer one from the other.
  const handleBadgeTypeChange = (type: BadgeTemplate['badgeType']) => {
    setFormData(prev => ({ ...prev, badgeType: type, badgeDesignId: type === 'Skilled' ? 'default-skilled-design' : 'default-proficient-design' }));
  };

  const handleDemoStandardChange = (standardId: string) => {
    if (standardId === 'none') {
      setFormData(prev => ({ ...prev, standardId: '' }));
      return;
    }

    const standard = getDemoStandard(standardId);
    if (!standard) return;

    setFormData(prev => ({
      ...prev,
      standardId: standard.id,
      standardType: standard.type,
      qualificationName: standard.title,
      qualificationCode: standard.code || '',
      relatedCompetency: standard.competencies
        .map((competency) => [competency.code, competency.title].filter(Boolean).join(' — '))
        .join('; '),
      competencyCode: standard.competencies[0]?.code || '',
      competencyTitle: standard.competencies[0]?.title || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Auth session not ready. Please refresh or log in again.");
      return;
    }
    if (!formData.standardId || !formData.qualificationName || !formData.badgeType || !formData.credentialLevel || !formData.status || !formData.badgeDesignId) {
       alert("Please complete the badge definition and select reusable badge artwork.");
       return;
    }

    let parsedConfig = undefined;
    if (formData.templateConfig) {
      try {
        parsedConfig = JSON.parse(formData.templateConfig);
      } catch (e) {
        alert("Invalid Layout Configuration JSON format. Please verify the brace layout!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { imageUrl: _legacyImageUrl, ...mappingData } = formData;
      const templateData = {
        ...mappingData,
        templateConfig: parsedConfig,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        updatedAt: serverTimestamp()
      };
      
      if (editingTemplate) {
        await updateDoc(doc(db, 'badgeTemplates', editingTemplate.id!), templateData);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Updated Badge Template: ${formData.badgeName}`,
          userName: 'QSO Admin',
          timestamp: serverTimestamp(),
          details: `Qualification: ${formData.qualificationName} | Type: ${formData.badgeType}`
        });
      } else {
        const newTemplate = {
          ...templateData,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'badgeTemplates'), newTemplate);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Created Badge Template: ${formData.badgeName}`,
          userName: 'QSO Admin',
          timestamp: serverTimestamp(),
          details: `Qualification: ${formData.qualificationName} | Type: ${formData.badgeType}`
        });
      }

      setIsModalOpen(false);
      setEditingTemplate(null);
      resetForm();
      setActiveTab('catalog');
    } catch (error) {
      handleFirestoreError(error, editingTemplate ? OperationType.UPDATE : OperationType.CREATE, 'badgeTemplates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      badgeName: '',
      qualificationName: '',
      qualificationCode: '',
      standardId: '',
      badgeType: 'Proficient',
      standardType: 'CS',
      recognitionScope: 'Competency',
      competencyCode: '',
      competencyTitle: '',
      badgeDesignId: 'default-proficient-design',
      credentialLevel: 'Unit of Competency',
      relatedCompetency: '',
      description: '',
      criteria: '',
      validityMonths: 36,
      alignment: 'TESDA Training Standard',
      tags: '',
      issuableBy: ['TrainingCenter'],
      requiresApproval: true,
      displayOrder: 1,
      hierarchyVisible: true,
      status: 'Approved',
      imageUrl: '',
      badgeIdPrefix: '',
      issuingSeries: 'TESDA',
      templateConfig: JSON.stringify(createDefaultTemplateConfig(), null, 2)
    });
  };

  const handleEdit = (template: BadgeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      badgeName: template.badgeName || '',
      qualificationName: template.qualificationName || '',
      qualificationCode: template.qualificationCode || '',
      standardId: template.standardId || demoStandards.find((standard) =>
        standard.code === template.qualificationCode || standard.title === template.qualificationName,
      )?.id || '',
      // Legacy template values must not re-enter the active authoring model.
      badgeType: isBadgeType(template.badgeType) ? template.badgeType : 'Proficient',
      standardType: template.standardType || 'CS',
      recognitionScope: template.recognitionScope || (template.relatedCompetency ? 'Competency' : 'CompleteStandard'),
      competencyCode: template.competencyCode || '',
      competencyTitle: template.competencyTitle || template.relatedCompetency || '',
      badgeDesignId: template.badgeDesignId || (template.badgeType === 'Skilled' ? 'default-skilled-design' : 'default-proficient-design'),
      credentialLevel: template.credentialLevel || 'Unit of Competency',
      relatedCompetency: template.relatedCompetency || '',
      description: template.description,
      criteria: template.criteria,
      validityMonths: template.validityMonths,
      alignment: template.alignment || 'TESDA Training Standard',
      tags: template.tags.join(', '),
      issuableBy: template.issuableBy,
      requiresApproval: template.requiresApproval,
      displayOrder: template.displayOrder || 1,
      hierarchyVisible: template.hierarchyVisible !== undefined ? template.hierarchyVisible : true,
      status: template.status,
      imageUrl: template.imageUrl || '',
      badgeIdPrefix: template.badgeIdPrefix || '',
      issuingSeries: template.issuingSeries || 'TESDA',
      templateConfig: template.templateConfig ? JSON.stringify(template.templateConfig, null, 2) : JSON.stringify(createDefaultTemplateConfig(), null, 2)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const templateId = templateToDelete.id!;
      const qualificationName = templateToDelete.qualificationName || '';
      const badgeName = templateToDelete.badgeName || '';

      // Fetch all candidate records for inline in-memory robust cascade deletion
      const [
        allTemplates,
        allOfferings,
        allBatches,
        allEnrollments,
        allCompletions,
        allBadgeRequests,
        allIssuedBadges,
        allAssessmentRecords,
        allRplApplications,
        allLearners
      ] = await Promise.all([
        getDocs(collection(db, 'badgeTemplates')),
        getDocs(collection(db, 'programOfferings')),
        getDocs(collection(db, 'programBatches')),
        getDocs(collection(db, 'enrollments')),
        getDocs(collection(db, 'ucCompletions')),
        getDocs(collection(db, 'badgeRequests')),
        getDocs(collection(db, 'issuedBadges')),
        getDocs(collection(db, 'assessmentRecords')),
        getDocs(collection(db, 'rplApplications')),
        getDocs(collection(db, 'learners'))
      ]);

      // 1. Delete matching badge templates and write sentinel
      allTemplates.docs.forEach(snap => {
        const id = snap.id;
        if (id === templateId) {
          batch.delete(snap.ref);
          batch.set(doc(db, 'deletedDemoItems', id), {
            deletedAt: serverTimestamp(),
            type: 'badgeTemplate'
          });
        }
      });

      // 2. Delete matching programOfferings and write sentinel
      const matchedOfferingIds = new Set<string>();
      allOfferings.docs.forEach(snap => {
        const data = snap.data();
        const id = snap.id;
        if (data.badgeTemplateId === templateId) {
          batch.delete(snap.ref);
          matchedOfferingIds.add(id);
          batch.set(doc(db, 'deletedDemoItems', id), {
            deletedAt: serverTimestamp(),
            type: 'programOffering'
          });
        }
      });

      // 3. Delete matching programBatches
      const matchedBatchIds = new Set<string>();
      allBatches.docs.forEach(snap => {
        const data = snap.data();
        const id = snap.id;
        if (data.badgeTemplateId === templateId || (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId))) {
          batch.delete(snap.ref);
          matchedBatchIds.add(id);
        }
      });

      // 4. Delete matching enrollments
      const matchedEnrollmentIds = new Set<string>();
      allEnrollments.docs.forEach(snap => {
        const data = snap.data();
        const id = snap.id;
        if (
          data.badgeTemplateId === templateId ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId)) ||
          (data.programBatchId && matchedBatchIds.has(data.programBatchId))
        ) {
          batch.delete(snap.ref);
          matchedEnrollmentIds.add(id);
        }
      });

      // 5. Delete matching ucCompletions
      allCompletions.docs.forEach(snap => {
        const data = snap.data();
        if (
          data.badgeTemplateId === templateId ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId)) ||
          (data.programBatchId && matchedBatchIds.has(data.programBatchId)) ||
          (data.enrollmentId && matchedEnrollmentIds.has(data.enrollmentId))
        ) {
          batch.delete(snap.ref);
        }
      });

      // 6. Delete matching badgeRequests
      const matchedBadgeRequestIds = new Set<string>();
      allBadgeRequests.docs.forEach(snap => {
        const data = snap.data();
        const id = snap.id;
        if (
          data.badgeTemplateId === templateId ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId)) ||
          (data.programBatchId && matchedBatchIds.has(data.programBatchId))
        ) {
          batch.delete(snap.ref);
          matchedBadgeRequestIds.add(id);
        }
      });

      // 7. Delete matching issuedBadges
      allIssuedBadges.docs.forEach(snap => {
        const data = snap.data();
        if (
          data.badgeTemplateId === templateId ||
          (data.badgeRequestId && matchedBadgeRequestIds.has(data.badgeRequestId)) ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId)) ||
          (data.programBatchId && matchedBatchIds.has(data.programBatchId))
        ) {
          batch.delete(snap.ref);
        }
      });

      // 8. Delete matching assessmentRecords
      allAssessmentRecords.docs.forEach(snap => {
        const data = snap.data();
        if (
          data.badgeTemplateId === templateId ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId)) ||
          (data.programBatchId && matchedBatchIds.has(data.programBatchId))
        ) {
          batch.delete(snap.ref);
        } else if (
          data.qualification === qualificationName &&
          (!data.badgeType || data.badgeType !== 'Proficient')
        ) {
          const hasMatchingEnrollment = allEnrollments.docs.some(esnap => {
            const edata = esnap.data();
            return edata.learnerId === data.learnerId && (edata.badgeTemplateId === templateId || matchedOfferingIds.has(edata.programOfferingId || ''));
          });
          if (hasMatchingEnrollment) {
            batch.delete(snap.ref);
          }
        }
      });

      // 9. Delete matching rplApplications
      allRplApplications.docs.forEach(snap => {
        const data = snap.data();
        if (
          data.qualificationId === templateId ||
          (data.programOfferingId && matchedOfferingIds.has(data.programOfferingId))
        ) {
          batch.delete(snap.ref);
        } else if (data.qualificationName === qualificationName) {
          const hasMatchingEnrollment = allEnrollments.docs.some(esnap => {
            const edata = esnap.data();
            return edata.learnerId === data.learnerId && (edata.badgeTemplateId === templateId || matchedOfferingIds.has(edata.programOfferingId || ''));
          });
          if (hasMatchingEnrollment) {
            batch.delete(snap.ref);
          }
        }
      });

      // 10. Update learners to set a remaining active program template as fallback
      const remainingTemplates = allTemplates.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => t.id !== templateId && t.status === 'Approved');
      
      const fallbackQual = remainingTemplates.length > 0 
        ? (remainingTemplates[0].qualificationName || remainingTemplates[0].badgeName)
        : 'Cloud Computing Fundamentals';

      allLearners.docs.forEach(snap => {
        const data = snap.data();
        const hasDeletedEnrollment = allEnrollments.docs.some(esnap => {
          const edata = esnap.data();
          return edata.learnerId === data.id && (edata.badgeTemplateId === templateId || matchedOfferingIds.has(edata.programOfferingId || ''));
        });

        if (hasDeletedEnrollment || data.qualification === qualificationName) {
          batch.update(snap.ref, {
            qualification: remainingTemplates.length > 0 ? fallbackQual : '',
            programTitle: remainingTemplates.length > 0 ? fallbackQual : '',
            programOfferingId: '',
            programBatchId: '',
            batchName: '',
            status: remainingTemplates.length > 0 ? 'Enrolled' : 'Applied',
            updatedAt: serverTimestamp()
          });
        }
      });

      // 11. Add audit log entry
      const auditLogRef = doc(collection(db, 'auditLogs'));
      batch.set(auditLogRef, {
        action: `Deleted Badge Template: ${templateToDelete.badgeName || templateToDelete.programName}. Cascaded hard deletions to relevant offerings, batches, active enrollments, progress records, and reset learner profiles to remaining active programs.`,
        userName: 'QSO Admin',
        timestamp: serverTimestamp(),
        details: `Qualification: ${qualificationName} | Type: ${templateToDelete.badgeType}`
      });

      // Commit the atomic bundle
      await batch.commit();

      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'badgeTemplates');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter templates list based on filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      (template.badgeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.qualificationName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesQual = qualificationFilter === 'all' || template.qualificationName === qualificationFilter;
    
    return matchesSearch && matchesQual;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-600" />
            Badge Standards
          </h1>
          <p className="text-slate-500 text-sm">Define, upload backgrounds, manage templates, and lay out visual placeholders in real-time.</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700 gap-2 font-semibold shadow-sm"
          onClick={() => {
            setEditingTemplate(null);
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 p-1 bg-slate-100/80 rounded-lg">
          <TabsTrigger value="catalog" className="font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Templates Library
          </TabsTrigger>
          <TabsTrigger value="designs" className="font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
            <Image className="h-4 w-4 text-blue-600" />
            Reusable Badge Designs
          </TabsTrigger>
          <TabsTrigger value="designer" className="font-semibold text-slate-700 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
            <Sliders className="h-4 w-4 text-emerald-600" />
            Visual Badge Designer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            {BADGE_TYPES.map((type) => (
              <Card key={type} className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-lg ${
                      type === 'Proficient' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      <Award className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {templates.filter(t => t.badgeType === type).length}
                  </p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{type} Templates</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Badge Template Library
              </CardTitle>
              <CardDescription>System-wide standards for all digital credentials.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by badge name or qualification..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="w-full md:w-64">
                  <Select value={qualificationFilter} onValueChange={setQualificationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by qualification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Qualifications</SelectItem>
                      {Array.from(new Set(templates.map(t => t.qualificationName).filter(Boolean))).map(qName => (
                        <SelectItem key={qName} value={qName!}>{qName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Preview</TableHead>
                      <TableHead className="font-bold text-slate-700">Badge/Standard Name</TableHead>
                      <TableHead className="font-bold text-slate-700 font-mono text-center">Type</TableHead>
                      <TableHead className="font-bold text-slate-700">Qualification Group</TableHead>
                      <TableHead className="font-bold text-slate-700">Validity</TableHead>
                      <TableHead className="font-bold text-slate-700">Issuing Authority</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="right-0 font-bold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length > 0 ? (
                      filteredTemplates.map((template) => (
                        <TableRow key={template.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="h-11 w-11 rounded border bg-slate-50 overflow-hidden flex items-center justify-center relative">
                              {template.imageUrl ? (
                                <img 
                                  src={template.imageUrl} 
                                  alt="" 
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Award className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 leading-tight">
                            {template.badgeName}
                            {template.qualificationCode && (
                              <span className="block font-mono text-[10px] text-slate-500 font-medium mt-0.5">{template.qualificationCode}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                              getBadgeColor(template.badgeType)
                            }`}>
                              {getBadgeTypeLabel(template.badgeType)}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            <div className="font-medium text-slate-800">{template.qualificationName}</div>
                            <div className="text-[10px] text-slate-400">{template.credentialLevel}</div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs font-medium">
                            {template.validityMonths ? `${template.validityMonths} Months` : 'Permanent'}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {template.issuableBy?.map(role => (
                              <span key={role} className="block text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded mb-0.5 font-medium truncate max-w-[120px]">
                                {role === 'TrainingCenter' ? 'TCO Office' : role === 'AssessmentCenter' ? 'Assessment Ctr' : 'PO/RO Auth'}
                              </span>
                            ))}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              template.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-650'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${template.status === 'Approved' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                              {template.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100">
                                    <MoreVertical className="h-4 w-4 text-slate-500" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-[180px] bg-white border rounded shadow-md">
                                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem 
                                    onClick={() => handleEdit(template)}
                                    className="cursor-pointer hover:bg-slate-50"
                                  >
                                    <Edit2 className="mr-2 h-4 w-4 text-slate-600" />
                                    <span>Edit Template</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setDesignerTemplateId(template.id!);
                                      setActiveTab('designer');
                                    }}
                                    className="cursor-pointer hover:bg-slate-50"
                                  >
                                    <Sliders className="mr-2 h-4 w-4 text-emerald-600" />
                                    <span>Layout Designer</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setTemplateToDelete(template);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="cursor-pointer text-rose-650 focus:text-rose-700 focus:bg-rose-50 hover:bg-rose-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4 text-rose-500" />
                                    <span>Delete Template</span>
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-550">
                          {templates.length === 0 ? "No templates standard found." : "No templates match search filters."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designs" className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-600" />
                Reusable Badge Designs
              </CardTitle>
              <CardDescription>
                Configure reusable badge artwork independently. Badge definitions and mappings reference these stable designs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {designFeedback && (
                <div className="mb-5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  {designFeedback}
                </div>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                {badgeDesigns.map((design) => {
                  const isSaving = savingDesignId === design.id;
                  const artworkInputId = `badge-design-artwork-${design.id}`;
                  return (
                    <Card key={design.id} className="overflow-hidden border-slate-200 shadow-none">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {design.artworkUrl ? (
                              <img
                                src={design.artworkUrl}
                                alt={`${design.name} artwork`}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="px-2 text-center text-xs leading-4 text-slate-500">Artwork not configured</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900">{design.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className={getBadgeColor(design.badgeType)}>{getBadgeTypeLabel(design.badgeType)}</Badge>
                              <Badge variant="outline" className="border-slate-300 text-slate-600">{design.status}</Badge>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              {design.artworkUrl ? 'Artwork configured and available to active badge mappings.' : 'Artwork not configured.'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 flex items-center gap-3">
                          <input
                            id={artworkInputId}
                            type="file"
                            accept="image/png,image/jpeg"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              void handleDesignArtworkUpload(design, file).finally(() => { event.target.value = ''; });
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!user || isSaving}
                            onClick={() => document.getElementById(artworkInputId)?.click()}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            {isSaving ? 'Saving artwork...' : design.artworkUrl ? 'Replace Artwork' : 'Upload Artwork'}
                          </Button>
                          <span className="text-[11px] text-slate-400">PNG, JPG, or JPEG · max 3 MB</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designer" className="space-y-6">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Visual Parameters Layout Controls */}
            <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-950 flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                  Layout Coordinator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure coordinates layout in percentage size from center of layout. Drag variable sliders or click overlays directly inside real-time preview canvas to bind targets.
                </p>
              </div>

              <div className="space-y-4">
                {/* Template Profile Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-600">Active Standard Profile</Label>
                  <Select value={designerTemplateId} onValueChange={setDesignerTemplateId}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Choose standard template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id!} className="text-xs">
                          {t.badgeName || t.programName} ({t.badgeType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Title (Real-time Preview) Input Field */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                    Test Title (Real-time Preview)
                  </Label>
                  <Input 
                    placeholder="Enter any program or certificate title..." 
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="text-xs border-emerald-500/30 focus:border-emerald-500 bg-emerald-50/5"
                  />
                  <p className="text-[10px] text-slate-400">
                    Type a long program title (e.g., <em>Determine Traditional Key Poses</em>) to test layout formatting.
                  </p>
                </div>

                {/* Change background image URL */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1">
                    <Image className="h-3 w-3 text-emerald-500" />
                    Credential Layout Background Image URL
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste ImgBB JPG/PNG direct file URL..." 
                      value={designerImgUrl}
                      onChange={(e) => setDesignerImgUrl(e.target.value)}
                      className="text-xs"
                    />
                    {designerImgUrl && (
                      <Button size="icon" variant="outline" onClick={() => setDesignerImgUrl('')} className="h-9 w-9">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Optional legacy template background used to position credential fields. Manage reusable badge artwork in the Reusable Badge Designs tab.
                  </p>
                </div>

                {/* Upload Custom Badge Template Background */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 text-emerald-500" />
                    Upload Credential Layout Background
                  </Label>
                  <div 
                    className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-150 cursor-pointer ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50 text-slate-500 bg-slate-50/20'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('badge-upload-input')?.click()}
                  >
                    <Upload className="h-6 w-6 mb-1.5 text-slate-400" />
                    <span className="text-xs font-semibold text-center text-slate-700">Drag image file here, or browse</span>
                    <span className="text-[9px] text-slate-400 text-center mt-0.5">Supports PNG, JPG, JPEG (Max 3MB)</span>
                    <input 
                      id="badge-upload-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>

                {/* Dynamic Image Fit Adjustment Controls */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-emerald-500" />
                    How should the image fit?
                  </Label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                    {[
                      { id: 'cover', label: 'Crop (Cover)', desc: 'Fills the entire canvas, cropping overflow' },
                      { id: 'contain', label: 'Fit (Contain)', desc: 'Fits entire image inside frame, adding letterbox if needed' },
                      { id: 'fill', label: 'Stretch (Fill)', desc: 'Stretches the image to fill the exact dimensions' }
                    ].map(mode => {
                      const isActive = (designerConfig?.fitMode || 'cover') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          className={`text-[10px] py-1.5 px-1 rounded font-bold text-center transition-all ${
                            isActive 
                              ? 'bg-emerald-600 text-white shadow' 
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                          onClick={() => {
                            setDesignerConfig((prev: any) => ({
                              ...prev,
                              fitMode: mode.id as 'cover' | 'contain' | 'fill'
                            }));
                          }}
                          title={mode.desc}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Select standard <strong>Crop (Cover)</strong> to scale and zoom, <strong>Fit (Contain)</strong> to fit completely with backgrounds, or <strong>Stretch (Fill)</strong> to fill the canvas exactly.
                  </p>
                </div>



                {/* Raw Config Position JSON Editor toggle */}
                <div className="pt-2 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Coordinate system config (Raw JSON)</span>
                    <button 
                      type="button"
                      onClick={() => setShowJsonConfig(!showJsonConfig)} 
                      className="text-xs font-bold text-emerald-600 underline hover:text-emerald-700"
                    >
                      {showJsonConfig ? 'Hide Config' : 'Show Config Editor'}
                    </button>
                  </div>

                  {showJsonConfig && (
                    <div className="grid gap-2 mt-2">
                      <Label htmlFor="designer-raw-json" className="text-[10px] uppercase font-bold text-slate-400">Layout Coordinate Positions (JSON %)</Label>
                      <Textarea 
                        id="designer-raw-json" 
                        value={JSON.stringify(designerConfig, null, 2)} 
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setDesignerConfig(parsed);
                          } catch (err) {
                            // Don't crash but let them finish writing
                          }
                        }} 
                        placeholder="Layout config in JSON..." 
                        rows={6}
                        className="font-mono text-[11px] leading-tight text-white bg-slate-900 border-slate-800 focus:border-emerald-500-25"
                      />
                    </div>
                  )}
                </div>

                <Button 
                  type="button" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold py-2 shadow-md transition-all mt-4"
                  onClick={handleSaveDesignerLayout}
                  disabled={isSubmitting || !designerTemplateId}
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving Configuration...' : 'Save Coordinate Parameters'}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Interactive Placement Preview Canvas */}
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="w-full bg-slate-900 duration-300 p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center justify-center relative min-h-[580px]">
                {/* Emerald themed coordinated helper headers */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    <span className="tracking-wide">INTERACTIVE PLACEHOLDER PLACEMENT CANVAS</span>
                  </div>
                  {designerTemplateId && (
                    <div className="bg-emerald-950/80 px-2.5 py-1 rounded text-emerald-400 font-extrabold border border-emerald-800 uppercase tracking-widest text-[9px]">
                      Live Synchronized Profile
                    </div>
                  )}
                </div>

                {designerSuccess && (
                  <div className="absolute top-16 left-4 right-4 bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs py-2 px-3 rounded-lg shadow-lg flex items-center gap-2 z-10 animate-bounce">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>{designerSuccess}</span>
                  </div>
                )}

                {designerTemplateId ? (
                  <div className="flex flex-col xl:flex-row items-center xl:items-start gap-8 w-full justify-center mt-4">
                    {/* Left side: Canvas & Tips */}
                    <div className="flex flex-col items-center shrink-0">
                      {/* The canvas frame wrapper */}
                      <div className="relative border-4 border-slate-800 rounded-2xl p-2 bg-slate-950 shadow-2xl">
                        <BadgeRenderer
                          scale={0.88}
                          data={{
                            id: 'designer-temp-preview',
                            name: 'Designer Standard Preview',
                            learnerName: 'DEMO RECIPIENT FULL NAME',
                            trainingProvider: 'DEMO TRAINING CENTER',
                            issueDate: '05/21/2026',
                            validUntil: '05/21/2029',
                            verificationId: 'TESDA-NC3-A89102',
                            badgeId: 'BADGE-2026-000123',
                            imageUrl: designerImgUrl,
                            level: templates.find(t => t.id === designerTemplateId)?.badgeType || 'Proficient',
                            qualificationTitle: testTitle,
                            qualificationCode: templates.find(t => t.id === designerTemplateId)?.qualificationCode || 'ICT-AMP-23',
                            competencyTitle: 'DEMO COMPETENCY TITLE',
                            competencyCode: 'DEMO-COMP-001',
                            templateConfig: designerConfig
                          }}
                        />

                        {/* Overlaid Guideline overlays */}
                        {designerImgUrl ? (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ width: `${500 * 0.88}px`, height: `${500 * 0.88}px`, margin: '12px' }}
                          >
                            {/* Symmetrical central guidelines */}
                            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-emerald-500/20" />
                            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-emerald-500/20" />

                            {/* Interactive boundary clicks on selected elements */}
                            {Object.entries(designerConfig).map(([key, config]: [string, any]) => {
                              if (key === 'fitMode' || !config || config.enabled === false) return null;
                              const isSelected = activeField === key;
                              const size = key === 'qr' ? (config.size || 70) * 0.88 : 16;
                              
                              return (
                                <div 
                                  key={key}
                                  className={`absolute pointer-events-auto cursor-pointer rounded transition-all flex items-center justify-center ${
                                    isSelected 
                                      ? 'border-2 border-dashed border-emerald-550 bg-emerald-500/25 shadow-lg scale-105 z-25' 
                                      : 'border border-emerald-450/40 bg-emerald-400/5 hover:border-emerald-500 hover:bg-emerald-450/15'
                                  }`}
                                  style={{
                                    left: `${config.x}%`,
                                    top: `${config.y}%`,
                                    width: key === 'qr' ? `${size}px` : 'auto',
                                    height: key === 'qr' ? `${size}px` : '32px',
                                    padding: key === 'qr' ? '0' : '2px 8px',
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                  title={`Click to drag coordinate sliders for ${key}`}
                                  onClick={() => setActiveField(key)}
                                >
                                  {key !== 'qr' && (
                                    <span className={`text-[9px] font-bold select-none truncate ${isSelected ? 'text-white bg-emerald-600 px-1 py-0.5 rounded shadow-sm text-center font-extrabold' : 'text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-center'}`}>
                                      {key === 'name' ? 'Learner Name' : key === 'trainingProvider' ? 'Training Center' : key === 'qualificationTitle' ? 'Standard Title' : key === 'qualificationCode' ? 'Standard Code' : key === 'competencyTitle' ? 'Competency Title' : key === 'competencyCode' ? 'Competency Code' : key === 'badgeId' ? 'Badge ID' : key === 'verificationId' ? 'Verification ID' : key === 'validUntil' ? 'Expiry Date' : key}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-6 flex flex-col items-center text-center max-w-sm">
                        <span className="text-white text-xs font-bold flex items-center gap-1.5 mb-1 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-750">
                          <Sliders className="h-4 w-4 text-emerald-400" />
                          Interactive Coordinate Overlay Guides
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Click directly on any translucent label overlay on the badge preview above to select that variable, then configure its sliders.
                        </p>
                      </div>
                    </div>

                    {/* Right side: Field Selectors & Sliders */}
                    <div className="flex-1 w-full max-w-md space-y-4">
                      {/* Active Layout Placeholder Selector Chips */}
                      <div className="w-full space-y-2">
                        <Label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          Select Active Layout Placeholder Variable
                        </Label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-800/60 p-1.5 rounded-lg border border-slate-750/80">
                          {[
                            { id: 'name', label: 'Learner Name' },
                            { id: 'trainingProvider', label: 'Training Center' },
                            { id: 'qualificationTitle', label: 'Qualific. Title' },
                            { id: 'qualificationCode', label: 'Qualific. Code' },
                            { id: 'competencyTitle', label: 'Competency Title' },
                            { id: 'competencyCode', label: 'Competency Code' },
                            { id: 'level', label: 'Badge Level' },
                            { id: 'date', label: 'Issue Date' },
                            { id: 'validUntil', label: 'Expiry Date' },
                            { id: 'badgeId', label: 'Badge ID' },
                            { id: 'verificationId', label: 'Verification ID' },
                            { id: 'qr', label: 'QR Secure Code' }
                          ].map(field => (
                            <button
                              key={field.id}
                              type="button"
                              className={`text-[11px] py-1.5 px-2 rounded font-medium text-center transition-all ${
                                activeField === field.id 
                                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold' 
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                              onClick={() => setActiveField(field.id)}
                            >
                              {field.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Coordinate Parameter / Slide controls for Active Layout Selection */}
                      {designerConfig[activeField] && (
                        <div className="w-full p-5 bg-slate-800/40 rounded-xl border border-slate-755/90 space-y-4 text-left animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-750/50 pb-3">
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              {activeField === 'name' ? 'Learner Name' : activeField === 'qualificationTitle' ? 'Qualification Title' : activeField === 'qualificationCode' ? 'Qualification Code' : activeField === 'qr' ? 'QR Code Security' : activeField} Options & Parameters
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="designer-field-enabled"
                                checked={designerConfig[activeField]?.enabled !== false}
                                onChange={(e) => updateFieldPosition(activeField, { enabled: e.target.checked })}
                                className="rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer h-4 w-4"
                              />
                              <Label htmlFor="designer-field-enabled" className="text-xs cursor-pointer select-none text-slate-300 font-semibold">Visible on Badge</Label>
                            </div>
                          </div>

                          {designerConfig[activeField]?.enabled !== false && (
                            <div className="space-y-4">
                              {/* Horizontal X Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400 font-medium">Horizontal Coordinate (X Position)</span>
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.x || 50}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={designerConfig[activeField]?.x || 50} 
                                  onChange={(e) => updateFieldPosition(activeField, { x: parseInt(e.target.value) })}
                                  className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                />
                              </div>

                              {/* Vertical Y Slider */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400 font-medium">Vertical Coordinate (Y Position)</span>
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.y || 50}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={designerConfig[activeField]?.y || 50} 
                                  onChange={(e) => updateFieldPosition(activeField, { y: parseInt(e.target.value) })}
                                  className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                />
                              </div>

                              {/* Font sizing slider for non-QR elements */}
                              {activeField !== 'qr' && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-400">Font Dimension Size</span>
                                    <span className="font-mono text-emerald-400 font-extrabold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.fontSize || '1.1rem'}</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="5" 
                                    max="30" 
                                    step="1"
                                    value={Math.round(parseFloat(designerConfig[activeField]?.fontSize || '1.1rem') * 10)} 
                                    onChange={(e) => updateFieldPosition(activeField, { fontSize: `${parseFloat(e.target.value) / 10}rem` })}
                                    className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                  />
                                </div>
                              )}

                              {/* Color Selector */}
                              {activeField !== 'qr' && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-400">Font Color Override</span>
                                    <span className="font-mono text-slate-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-750">{designerConfig[activeField]?.color || '#111827'}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <input 
                                      type="color" 
                                      value={designerConfig[activeField]?.color || '#111827'} 
                                      onChange={(e) => updateFieldPosition(activeField, { color: e.target.value })}
                                      className="h-8 w-12 border border-slate-700 rounded cursor-pointer p-0 bg-transparent"
                                    />
                                    <div className="grid grid-cols-5 gap-1.5 flex-1">
                                      {['#111827', '#1e1b4b', '#0038a8', '#047857', '#b45309', '#ffffff', '#e2e8f0', '#ef4444', '#3b82f6', '#10b981'].map(presetColor => (
                                        <button
                                          key={presetColor}
                                          type="button"
                                          className="h-5.5 w-5.5 rounded-full border border-slate-700 shadow-sm"
                                          style={{ backgroundColor: presetColor }}
                                          onClick={() => updateFieldPosition(activeField, { color: presetColor })}
                                          title={presetColor}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* QR Dimension controls */}
                              {activeField === 'qr' && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-400">QR Code Dimensions (Scale)</span>
                                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/55">{designerConfig[activeField]?.size || 70}px</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="40" 
                                    max="150" 
                                    value={designerConfig[activeField]?.size || 70} 
                                    onChange={(e) => updateFieldPosition(activeField, { size: parseInt(e.target.value) })}
                                    className="w-full cursor-pointer accent-emerald-500 h-1 bg-slate-700 rounded-lg"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <Award className="h-12 w-12 text-slate-750 mx-auto mb-4" />
                    <h4 className="font-bold text-slate-300">No Standards Installed</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Please publish at least one badge standard template on the library catalog first to arrange visual coordinates layouts.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Preset Layout Sliders */}
              <div className="w-full mt-4 bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center text-xs text-slate-650">
                <div>
                  <span className="font-bold text-slate-800">Quick Alignment Templates:</span>
                  <p className="text-[11px] text-slate-500">Snaps preset coordinates instantly to align your active layout profiles.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs hover:bg-slate-100 text-slate-700 font-bold" 
                    onClick={() => {
                      setDesignerConfig({
                        name: { x: 50, y: 44, fontSize: "1.45rem", color: "#1e1b4b", enabled: true },
                        qualificationTitle: { x: 50, y: 56, fontSize: "0.95rem", color: "#0038a8", enabled: true },
                        qualificationCode: { x: 50, y: 62, fontSize: "0.8rem", color: "#475569", enabled: true },
                        level: { x: 50, y: 35, fontSize: "0.9rem", color: "#b45309", enabled: true },
                        date: { x: 30, y: 88, fontSize: "0.7rem", color: "#334155", enabled: true },
                        validUntil: { x: 70, y: 88, fontSize: "0.7rem", color: "#334155", enabled: true },
                        id: { x: 50, y: 82, fontSize: "0.65rem", color: "#475569", enabled: true },
                        qr: { x: 50, y: 73, size: 70, enabled: true }
                      });
                    }}
                  >
                    Classic Laurel Layout
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs hover:bg-slate-100 text-slate-700 font-bold" 
                    onClick={() => {
                      setDesignerConfig({
                        name: { x: 50, y: 45, fontSize: "1.5rem", color: "#000000", enabled: true },
                        qualificationTitle: { x: 50, y: 58, fontSize: "1.02rem", color: "#334155", enabled: true },
                        qualificationCode: { x: 50, y: 64, fontSize: "0.8rem", color: "#64748b", enabled: true },
                        level: { x: 50, y: 71, fontSize: "0.9rem", color: "#1d4ed8", enabled: true },
                        date: { x: 28, y: 88, fontSize: "0.75rem", color: "#475569", enabled: true },
                        validUntil: { x: 60, y: 88, fontSize: "0.75rem", color: "#475569", enabled: true },
                        id: { x: 50, y: 82, fontSize: "0.7rem", color: "#64748b", enabled: true },
                        qr: { x: 50, y: 75, size: 70, enabled: true }
                      });
                    }}
                  >
                    Standard Flat Layout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Badge Template Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">
              {editingTemplate ? 'Edit Standard Template' : 'Create New Standard Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define the metadata, badge type, standard mappings, and reusable badge design reference.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="demoStandard" className="text-xs font-semibold text-slate-700">Demo Standard</Label>
                <Select
                  value={formData.standardId || 'none'}
                  onValueChange={handleDemoStandardChange}
                >
                  <SelectTrigger id="demoStandard" className="w-full text-xs">
                    <SelectValue placeholder="Select a temporary demo standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">No demo standard</SelectItem>
                    {demoStandards.map((standard) => (
                      <SelectItem key={standard.id} value={standard.id} className="text-xs">
                        {standard.type} · {standard.title}{standard.code ? ` (${standard.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  Selecting a standard fills its reference details only; Badge Type remains an independent choice.
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <h3 className="text-sm font-bold text-blue-950">A. Badge Definition Mapping</h3>
                <p className="mt-1 text-[11px] text-blue-800">Map this credential to a standard independently from its reusable visual artwork.</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Recognition Scope</Label>
                    <Select value={formData.recognitionScope} onValueChange={(value: RecognitionScope) => setFormData(prev => ({ ...prev, recognitionScope: value }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Competency" className="text-xs">Competency</SelectItem><SelectItem value="CompleteStandard" className="text-xs">Complete Standard</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Mapped Competency Code</Label>
                    <Input value={formData.competencyCode} onChange={(e) => setFormData(prev => ({ ...prev, competencyCode: e.target.value }))} placeholder="e.g. UC-001" className="text-xs" />
                  </div>
                  {formData.recognitionScope === 'Competency' && <div className="space-y-1.5 col-span-2"><Label className="text-xs font-semibold text-slate-700">Mapped Competency Title</Label><Input value={formData.competencyTitle} onChange={(e) => setFormData(prev => ({ ...prev, competencyTitle: e.target.value, relatedCompetency: e.target.value }))} placeholder="Mapped competency title" className="text-xs" /></div>}
                </div>
              </div>

              {/* Badge Name */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="badgeName" className="text-xs font-semibold text-slate-700">Badge/Standard Name</Label>
                <Input
                  id="badgeName"
                  placeholder="e.g. 2D Digital Animation Specialist"
                  value={formData.badgeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, badgeName: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              {/* Qualification Name Display / Override */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="qualificationName" className="text-xs font-semibold text-slate-700">Qualification Title Display</Label>
                <Input
                  id="qualificationName"
                  placeholder="Displays as the qualification title text on the canvas"
                  value={formData.qualificationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualificationName: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              {/* Qualification Code */}
              <div className="space-y-1.5">
                <Label htmlFor="qualificationCode" className="text-xs font-semibold text-slate-700">Qualification Code (if provided)</Label>
                <Input
                  id="qualificationCode"
                  placeholder="e.g. ANIM-NC3-2D"
                  value={formData.qualificationCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualificationCode: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Badge ID Prefix */}
              <div className="space-y-1.5">
                <Label htmlFor="badgeIdPrefix" className="text-xs font-semibold text-slate-700">Badge ID Prefix (Optional)</Label>
                <Input
                  id="badgeIdPrefix"
                  placeholder="e.g. CSSNCII-PROF (leave empty for auto)"
                  value={formData.badgeIdPrefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, badgeIdPrefix: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Issuing Series */}
              <div className="space-y-1.5">
                <Label htmlFor="issuingSeries" className="text-xs font-semibold text-slate-700">Issuing Series</Label>
                <Input
                  id="issuingSeries"
                  placeholder="e.g. TESDA"
                  value={formData.issuingSeries}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuingSeries: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Badge Type */}
              <div className="space-y-1.5">
                <Label htmlFor="badgeType" className="text-xs font-semibold text-slate-700">Badge Type</Label>
                <Select
                  value={formData.badgeType}
                  onValueChange={(val: any) => handleBadgeTypeChange(val)}
                >
                  <SelectTrigger id="badgeType" className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Standard type is independent from the selected badge type. */}
              <div className="space-y-1.5">
                <Label htmlFor="standardType" className="text-xs font-semibold text-slate-700">Standard Type</Label>
                <Select
                  value={formData.standardType}
                  onValueChange={(value: NonNullable<BadgeTemplate['standardType']>) => setFormData(prev => ({ ...prev, standardType: value }))}
                >
                  <SelectTrigger id="standardType" className="w-full text-xs">
                    <SelectValue placeholder="Select standard type" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_TYPES.map((type) => <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credentialLevel" className="text-xs font-semibold text-slate-700">Target Credential Level</Label>
                <Select
                  value={formData.credentialLevel}
                  onValueChange={(value: BadgeTemplate['credentialLevel']) => setFormData(prev => ({ ...prev, credentialLevel: value }))}
                >
                  <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unit of Competency" className="text-xs">Unit of Competency</SelectItem>
                    <SelectItem value="Full Qualification / Certificate of Training" className="text-xs">Full Qualification / Certificate of Training</SelectItem>
                    <SelectItem value="Certificate of Competency" className="text-xs">Certificate of Competency</SelectItem>
                    <SelectItem value="National Certificate" className="text-xs">National Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Related Competency */}
              <div className="space-y-1.5">
                <Label htmlFor="relatedCompetency" className="text-xs font-semibold text-slate-700">Related Units of Competency</Label>
                <Input
                  id="relatedCompetency"
                  placeholder="e.g. UC1, UC2, UC3"
                  value={formData.relatedCompetency}
                  onChange={(e) => setFormData(prev => ({ ...prev, relatedCompetency: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Validity Months */}
              <div className="space-y-1.5">
                <Label htmlFor="validityMonths" className="text-xs font-semibold text-slate-700">Validity (Months)</Label>
                <Input
                  id="validityMonths"
                  type="number"
                  min="1"
                  value={formData.validityMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, validityMonths: parseInt(e.target.value) || 36 }))}
                  className="text-xs"
                />
              </div>

              {/* Issuing Authority Scope */}
              <div className="space-y-1.5">
                <Label htmlFor="issuableBy" className="text-xs font-semibold text-slate-700">Issuable Authority</Label>
                <Select
                  value={formData.issuableBy[0]}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, issuableBy: [val] }))}
                >
                  <SelectTrigger id="issuableBy" className="w-full text-xs">
                    <SelectValue placeholder="Authority scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TrainingCenter" className="text-xs">Training Center (RPL & course)</SelectItem>
                    <SelectItem value="AssessmentCenter" className="text-xs">Assessment Center (National assessments)</SelectItem>
                    <SelectItem value="CertificationOffice" className="text-xs">Certification Office (TESDA Central CO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">Initial Template Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger id="status" className="w-full text-xs">
                    <SelectValue placeholder="Standard status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved" className="text-xs">Approved / Active</SelectItem>
                    <SelectItem value="Draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="Archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="description" className="text-xs font-semibold text-slate-700">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Summarized goals and objectives of the standard profile template..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Criteria */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="criteria" className="text-xs font-semibold text-slate-700">Completion Criteria</Label>
                <Textarea
                  id="criteria"
                  placeholder="Detail the grading points, minimum hours, and assessments necessary to grant this standard badge..."
                  value={formData.criteria}
                  onChange={(e) => setFormData(prev => ({ ...prev, criteria: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Alignment */}
              <div className="space-y-1.5">
                <Label htmlFor="alignment" className="text-xs font-semibold text-slate-700">Framework Alignment Reference</Label>
                <Input
                  id="alignment"
                  value={formData.alignment}
                  onChange={(e) => setFormData(prev => ({ ...prev, alignment: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="tags" className="text-xs font-semibold text-slate-700">Search Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="multimedia, animation, creative, nc3"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="col-span-2 mt-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <h3 className="text-sm font-bold text-emerald-950">B. Badge Artwork</h3>
                <p className="mt-1 text-[11px] text-emerald-800">Artwork is reusable. Multiple mappings can select the same Proficient design.</p>
                <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-700">Reusable Badge Design</Label><Select value={formData.badgeDesignId} onValueChange={(value) => setFormData(prev => ({ ...prev, badgeDesignId: value }))}><SelectTrigger className="text-xs"><SelectValue placeholder="Select reusable artwork" /></SelectTrigger><SelectContent>{badgeDesigns.filter((design) => design.status === 'Active').map((design) => <SelectItem key={design.id} value={design.id} className="text-xs">{design.name} — {design.badgeType}</SelectItem>)}</SelectContent></Select></div>
                  {resolveBadgeDesign({ ...formData, id: editingTemplate?.id || 'preview' } as BadgeTemplate, badgeDesigns).artworkUrl ? <img src={resolveBadgeDesign({ ...formData, id: editingTemplate?.id || 'preview' } as BadgeTemplate, badgeDesigns).artworkUrl} alt="Selected reusable artwork" className="h-12 w-12 rounded border object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-center text-[9px] leading-3 text-slate-500">Artwork<br />not configured</div>}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-3 text-xs" onClick={() => { setActiveTab('designs'); setIsModalOpen(false); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Manage reusable badge artwork</Button>
              </div>

              <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Image className="h-4 w-4 text-slate-500" />C. Credential Layout</Label>
                <p className="mt-2 text-[11px] text-slate-600">Use the Visual Badge Designer to position, style, size, and toggle dynamic fields. It never stores learner-specific values.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3 text-xs" onClick={() => { setActiveTab('designer'); setIsModalOpen(false); }}><Sliders className="mr-1.5 h-3.5 w-3.5" />Open Visual Badge Designer</Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isSubmitting ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Delete Certificate Standard Template</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to delete the certificate standard template for <span className="font-extrabold text-slate-905">"{templateToDelete?.badgeName || templateToDelete?.programName}"</span>? This will permanently erase the configuration and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t flex justify-end">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="text-xs h-9">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
