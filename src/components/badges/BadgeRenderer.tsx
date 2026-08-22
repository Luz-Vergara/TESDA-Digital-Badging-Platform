import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Calendar, X, Maximize2, ShieldCheck } from 'lucide-react';
import { FieldPosition } from '../../types';

export interface BadgeRendererData {
  id: string;
  name: string;
  learnerName: string;
  trainingProvider?: string;
  issueDate: string;
  validUntil: string;
  verificationId: string;
  badgeId?: string;
  imageUrl?: string;
  level: string; // Display value; legacy values are rendered defensively.
  qualificationTitle: string;
  qualificationCode: string;
  competencyTitle?: string;
  competencyCode?: string;
  templateConfig?: {
    fitMode?: 'cover' | 'contain' | 'fill';
    name?: FieldPosition;
    date?: FieldPosition;
    validUntil?: FieldPosition;
    id?: FieldPosition;
    level?: FieldPosition;
    qualificationTitle?: FieldPosition;
    qualificationCode?: FieldPosition;
    trainingProvider?: FieldPosition;
    competencyTitle?: FieldPosition;
    competencyCode?: FieldPosition;
    badgeId?: FieldPosition;
    verificationId?: FieldPosition;
    qr?: {
      x: number;
      y: number;
      size?: number;
      enabled?: boolean;
    };
  };
}

interface BadgeRendererProps {
  scale?: number;
  data: BadgeRendererData;
  allowEnlarge?: boolean;
}

export const BadgeRenderer: React.FC<BadgeRendererProps> = ({ scale = 1, data, allowEnlarge = true }) => {
  const [imageError, setImageError] = useState(false);

  const {
    id,
    name,
    learnerName,
    trainingProvider,
    issueDate,
    validUntil,
    verificationId,
    badgeId,
    imageUrl,
    level,
    qualificationTitle,
    qualificationCode,
    competencyTitle,
    competencyCode,
    templateConfig,
  } = data;

  const finalId = (verificationId && verificationId !== 'PENDING') 
    ? verificationId 
    : ((data as any).certificationId || (data as any).badgeId || id);

  const baseWidth = 500;
  const baseHeight = 500;

  // Render a field on top of the image template
  const renderField = (
    field: FieldPosition | undefined,
    text: string,
    fallbackStyle: React.CSSProperties = {}
  ) => {
    if (!field || field.enabled === false || !text) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: `${field.x}%`,
          top: `${field.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: field.fontSize || '0.85rem',
          color: field.color || '#111827',
          fontWeight: '600',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontFamily: 'Inter, sans-serif',
          ...fallbackStyle,
        }}
      >
        {text}
      </div>
    );
  };

  const renderQR = (
    qr: { x: number; y: number; size?: number; enabled?: boolean } | undefined,
    value: string
  ) => {
    if (!qr || qr.enabled === false || !value) return null;
    const qrSize = qr.size || 80;
    return (
      <div
        style={{
          position: 'absolute',
          left: `${qr.x}%`,
          top: `${qr.y}%`,
          transform: 'translate(-50%, -50%)',
          padding: '6px',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <QRCodeSVG value={value} size={qrSize} />
      </div>
    );
  };

  const [isOpen, setIsOpen] = useState(false);
  const [modalScale, setModalScale] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setModalScale(0.5);
      } else if (width < 460) {
        setModalScale(0.65);
      } else if (width < 640) {
        setModalScale(0.8);
      } else {
        setModalScale(1.0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const getBadgeTypeColor = (lvl: string) => {
    switch (lvl?.toLowerCase() || '') {
      case 'master':
        return 'from-amber-600 to-yellow-500 text-amber-50';
      case 'expert':
        return 'from-blue-600 to-indigo-600 text-blue-50';
      case 'skilled':
        return 'from-emerald-600 to-teal-600 text-emerald-50';
      case 'proficient':
      default:
        return 'from-slate-700 to-slate-800 text-slate-50';
    }
  };

  const renderBadgeContent = (activeScale: number) => {
    const showTemplate = imageUrl && !imageError;

    if (showTemplate) {
      const scaledWidth = baseWidth * activeScale;
      const scaledHeight = baseHeight * activeScale;

      return (
        <div
          id={`badge-renderer-container-${id}`}
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            overflow: 'hidden',
          }}
          className="relative transition-all duration-300 rounded-xl shadow-lg border border-slate-100 flex-shrink-0 mx-auto"
        >
          <div
            style={{
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
              transform: `scale(${activeScale})`,
              transformOrigin: 'top left',
              position: 'relative',
            }}
            className="bg-white select-none overflow-hidden"
          >
            {/* Badge Template Image */}
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full pointer-events-none"
              style={{ objectFit: templateConfig?.fitMode || 'cover' }}
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
            />

            {/* Overlays */}
            {renderField(templateConfig?.name, learnerName, {
              fontSize: templateConfig?.name?.fontSize || '1.6rem',
              color: templateConfig?.name?.color || '#0f172a',
              fontWeight: 'bold',
              letterSpacing: '-0.025em',
            })}

            {renderField(
              templateConfig?.qualificationTitle,
              qualificationTitle,
              {
                fontSize: templateConfig?.qualificationTitle?.fontSize || '1.05rem',
                color: templateConfig?.qualificationTitle?.color || '#334155',
                maxWidth: '85%',
                whiteSpace: 'normal',
                lineHeight: '1.2',
              }
            )}

            {renderField(
              templateConfig?.qualificationCode,
              qualificationCode ? `Code: ${qualificationCode}` : '',
              {
                fontSize: templateConfig?.qualificationCode?.fontSize || '0.8rem',
                color: templateConfig?.qualificationCode?.color || '#64748b',
                fontWeight: '500',
              }
            )}

            {renderField(templateConfig?.trainingProvider, trainingProvider || '', {
              fontSize: templateConfig?.trainingProvider?.fontSize || '0.75rem',
              color: templateConfig?.trainingProvider?.color || '#475569',
              fontWeight: '500',
            })}

            {renderField(templateConfig?.competencyTitle, competencyTitle || '', {
              fontSize: templateConfig?.competencyTitle?.fontSize || '0.85rem',
              color: templateConfig?.competencyTitle?.color || '#334155',
              maxWidth: '85%', whiteSpace: 'normal', lineHeight: '1.2',
            })}

            {renderField(templateConfig?.competencyCode, competencyCode ? `Competency: ${competencyCode}` : '', {
              fontSize: templateConfig?.competencyCode?.fontSize || '0.7rem',
              color: templateConfig?.competencyCode?.color || '#64748b',
            })}

            {renderField(templateConfig?.level, level, {
              fontSize: templateConfig?.level?.fontSize || '0.95rem',
              color: templateConfig?.level?.color || '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 'bold',
            })}

            {renderField(templateConfig?.date, issueDate, {
              fontSize: templateConfig?.date?.fontSize || '0.75rem',
              color: templateConfig?.date?.color || '#475569',
            })}

            {renderField(templateConfig?.validUntil, validUntil, {
              fontSize: templateConfig?.validUntil?.fontSize || '0.75rem',
              color: templateConfig?.validUntil?.color || '#475569',
            })}

            {renderField(
              templateConfig?.badgeId || templateConfig?.id,
              badgeId || id ? `Badge ID: ${badgeId || id}` : '',
              {
                fontSize: templateConfig?.id?.fontSize || '0.7rem',
                color: templateConfig?.id?.color || '#64748b',
                fontFamily: 'monospace',
              }
            )}

            {renderField(templateConfig?.verificationId, finalId ? `Verification: ${finalId}` : '', {
              fontSize: templateConfig?.verificationId?.fontSize || '0.65rem',
              color: templateConfig?.verificationId?.color || '#64748b',
              fontFamily: 'monospace',
            })}

            {/* QR Code Overlay (linked to verification endpoint or details) */}
            {renderQR(
              templateConfig?.qr,
              `${window.location.origin}/#/verify/${finalId}`
            )}
          </div>
        </div>
      );
    }

    const badgePrimaryColor = getBadgeTypeColor(level);

    const baseW = 340;
    const baseH = 459;
    const scaledW = baseW * activeScale;
    const scaledH = baseH * activeScale;

    return (
      <div
        style={{
          width: `${scaledW}px`,
          height: `${scaledH}px`,
          overflow: 'hidden',
        }}
        className="relative transition-all duration-300 rounded-xl shadow-lg border border-slate-100 flex-shrink-0 mx-auto"
      >
        <div
          id={`badge-fallback-${id}`}
          style={{
            width: `${baseW}px`,
            height: `${baseH}px`,
            transform: `scale(${activeScale})`,
            transformOrigin: 'top left',
            position: 'absolute',
          }}
          className="rounded-2xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden select-none"
        >
          {/* Fallback Banner Header */}
          <div className={`p-4 bg-gradient-to-r ${badgePrimaryColor} text-center relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -translate-x-6 translate-y-6" />

            <div className="flex justify-center mb-1.5">
              <Award className="w-10 h-10 text-white drop-shadow" />
            </div>
            <h4 className="font-bold text-sm tracking-wide uppercase text-white/90">
              TESDA DIGITAL BADGE
            </h4>
            <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/10 shadow-sm backdrop-blur-sm">
              {level}
            </div>
          </div>

          {/* Main Metadata Content */}
          <div className="p-5 flex-1 flex flex-col justify-between items-center text-center workspace-detail">
            {/* Name and qualification */}
            <div className="space-y-2 w-full mt-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#0038A8]/80">
                Awarded To
              </p>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight tracking-tight px-2">
                {learnerName}
              </h3>
              <div className="h-[2px] w-12 bg-blue-600 mx-auto rounded-full" />
            </div>

            <div className="space-y-1 w-full my-3 px-2">
              <p className="text-[11px] font-bold text-slate-900 line-clamp-2">
                {qualificationTitle}
              </p>
              {qualificationCode && (
                <p className="text-[10px] font-mono text-slate-500 bg-slate-100 py-0.5 px-2 rounded inline-block">
                  {qualificationCode}
                </p>
              )}
            </div>

            {/* QR Code for validation */}
            <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
              <div className="p-1 px-[6px] bg-slate-50 border border-slate-100 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={`${window.location.origin}/#/verify/${finalId}`}
                  size={64}
                />
              </div>
              <span className="text-[9px] font-mono font-medium text-slate-500 select-all max-w-[200px] truncate leading-none">
                {finalId || 'PENDING'}
              </span>
            </div>
          </div>

          {/* Footer Details */}
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Issued: {issueDate}</span>
            </div>
            {validUntil && validUntil !== 'N/A' && (
              <div className="font-semibold text-slate-600">
                Expires: {validUntil}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`w-full flex justify-center items-center ${allowEnlarge ? 'group relative cursor-pointer hover:scale-[1.015] active:scale-[0.99] transition-all duration-200' : ''}`}
        onClick={allowEnlarge ? () => setIsOpen(true) : undefined}
      >
        {/* Floating Expand/Maximize Icon on hover */}
        {allowEnlarge && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
            <div className="bg-slate-900/80 backdrop-blur-md text-white rounded-full p-2 shadow-lg flex items-center justify-center border border-white/20 hover:bg-slate-950 hover:scale-105 active:scale-95 transition-all">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        )}
        
        {renderBadgeContent(scale)}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          {/* Modal Content Card */}
          <div 
            className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative flex flex-col items-center space-y-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-slate-850 whitespace-normal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 hover:bg-slate-100 rounded-full transition-colors z-20 cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title / Header of the enlarged view */}
            <div className="text-center space-y-1 w-full max-w-[420px]">
              <span className="text-[10px] font-bold tracking-widest text-[#0038A8] uppercase font-sans">
                Digital Credential Preview
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-tight">
                {name || qualificationTitle}
              </h2>
              <div className="flex justify-center items-center gap-1.5 pt-1">
                <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
                  Level: {level}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Code: {qualificationCode || 'N/A'}</span>
              </div>
            </div>

            {/* The Badge Itself rendered at Enlarged Scale */}
            <div className="flex justify-center items-center py-2 w-full">
              <div className="rounded-2xl overflow-hidden bg-white p-2 border border-slate-100 shadow-md">
                {renderBadgeContent(modalScale)}
              </div>
            </div>

            {/* Action Section / Information */}
            <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Recipient</span>
                  <span className="font-bold text-slate-800 text-sm select-all">{learnerName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Credential ID</span>
                  <span className="font-mono font-bold text-slate-800 text-sm truncate block select-all">{finalId || 'PENDING'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Issue Date</span>
                  <span className="font-medium text-slate-700 text-sm">{issueDate}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Validity Status</span>
                  <span className="font-medium text-slate-700 text-sm">{validUntil && validUntil !== 'N/A' ? validUntil : 'Permanent'}</span>
                </div>
              </div>

              {/* Verify Badge Option */}
              {finalId && finalId !== 'PENDING' && (
                <div className="border-t border-slate-200/60 pt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium leading-relaxed">Secured & Cryptographically Verified</span>
                  </div>
                  <a 
                    href={`${window.location.origin}/#/verify/${finalId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl px-4 py-2 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    Verify Authenticity
                    <Maximize2 className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Instruction footnote */}
            <div className="text-center text-[10px] text-slate-400 italic">
              Click anywhere outside or use the close button to dismiss.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
