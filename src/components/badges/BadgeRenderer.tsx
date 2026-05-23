import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Calendar } from 'lucide-react';
import { FieldPosition } from '../../types';

export interface BadgeRendererData {
  id: string;
  name: string;
  learnerName: string;
  issueDate: string;
  validUntil: string;
  verificationId: string;
  imageUrl?: string;
  level: string; // e.g. Proficient, Expert, etc.
  qualificationTitle: string;
  qualificationCode: string;
  templateConfig?: {
    fitMode?: 'cover' | 'contain' | 'fill';
    name?: FieldPosition;
    date?: FieldPosition;
    validUntil?: FieldPosition;
    id?: FieldPosition;
    level?: FieldPosition;
    qualificationTitle?: FieldPosition;
    qualificationCode?: FieldPosition;
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
}

export const BadgeRenderer: React.FC<BadgeRendererProps> = ({ scale = 1, data }) => {
  const [imageError, setImageError] = useState(false);

  const {
    id,
    name,
    learnerName,
    issueDate,
    validUntil,
    verificationId,
    imageUrl,
    level,
    qualificationTitle,
    qualificationCode,
    templateConfig,
  } = data;

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

  const showTemplate = imageUrl && !imageError;

  if (showTemplate) {
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    return (
      <div
        id={`badge-renderer-container-${id}`}
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          overflow: 'hidden',
        }}
        className="relative transition-all duration-300 rounded-xl shadow-lg border border-slate-100 flex-shrink-0"
      >
        <div
          style={{
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
            transform: `scale(${scale})`,
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
            templateConfig?.id,
            verificationId ? `ID: ${verificationId}` : '',
            {
              fontSize: templateConfig?.id?.fontSize || '0.7rem',
              color: templateConfig?.id?.color || '#64748b',
              fontFamily: 'monospace',
            }
          )}

          {/* QR Code Overlay (linked to verification endpoint or details) */}
          {renderQR(
            templateConfig?.qr,
            verificationId ? `https://tesda.gov.ph/verify/${verificationId}` : id
          )}
        </div>
      </div>
    );
  }

  // Beautiful fallback rendering matching TESDA aesthetic
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

  const badgePrimaryColor = getBadgeTypeColor(level);

  return (
    <div
      id={`badge-fallback-${id}`}
      className="max-w-[340px] w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col justify-between"
      style={{
        aspectRatio: '1 / 1.35',
      }}
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
              value={verificationId ? `https://tesda.gov.ph/verify/${verificationId}` : id}
              size={64}
            />
          </div>
          <span className="text-[9px] font-mono font-medium text-slate-500 select-all max-w-[200px] truncate leading-none">
            {verificationId || 'PENDING'}
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
  );
};
