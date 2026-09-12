import React, { useState } from 'react';
import {
  X,
  Camera,
  Download,
  MapPin,
  Calendar,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Defect } from '../../types';

interface DefectPhotoModalProps {
  defect: Defect | null;
  onClose: () => void;
}

export const DefectPhotoModal: React.FC<DefectPhotoModalProps> = ({ defect, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!defect || !defect.photoAttachment) return null;

  const photo = defect.photoAttachment;
  const aiAnalysis = defect.aiVisualAnalysis || photo.aiAnalysis;
  const formattedCapturedAt = photo.capturedAt
    ? new Date(photo.capturedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : defect.detectedDate;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `${defect.defectId}-track-evidence.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.3, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.3, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      id="defect-photo-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="defect-photo-modal-container"
        className="bg-slate-900 border border-sky-600/70 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden font-mono text-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-600 text-sky-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Field Defect Photographic Evidence
                </h3>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    defect.severity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : defect.severity === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {defect.severity}
                </span>
                {aiAnalysis && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>AI Suggested: {aiAnalysis.suggestedPriority} ({aiAnalysis.confidencePercent}%)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {defect.defectId} | Asset: <span className="text-sky-300">{defect.assetId}</span> ({defect.corridorId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-download-defect-photo"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Download Photo"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              id="btn-close-defect-photo-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo Viewport with Pan/Zoom */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[320px] max-h-[58vh]">
          <div
            className="transition-transform duration-150 ease-out flex items-center justify-center p-2"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={photo.dataUrl}
              alt={`Track Defect ${defect.defectId}`}
              className="max-h-[54vh] max-w-full object-contain rounded shadow-lg select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1 text-slate-300">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-800 rounded cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded cursor-pointer font-bold"
              title="Reset zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-800 rounded cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Source Watermark Tag */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-slate-700/80 rounded-md px-2 py-1 text-[10px] text-slate-300">
            <Camera className="w-3 h-3 text-sky-400" />
            <span>
              {photo.source === 'CAMERA_CAPTURE'
                ? 'Field Camera Snapshot'
                : photo.source === 'FIELD_PRESET'
                ? 'High-Resolution Field Archive'
                : 'Officer Uploaded Evidence'}
            </span>
          </div>
        </div>

        {/* Metadata & Defect Context Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 shrink-0 text-xs">
          {aiAnalysis && (
            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-700/60 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI Visual Priority Suggestion:</span>
                  <strong className="text-white underline">{aiAnalysis.suggestedPriority}</strong>
                  <span className="text-[9px] text-slate-400">({aiAnalysis.confidencePercent}% confidence)</span>
                </span>
                <span className="text-[9px] text-slate-400">{aiAnalysis.modelUsed}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">{aiAnalysis.structuralRiskSummary}</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {aiAnalysis.detectedVisualPatterns.map((p, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-700 text-slate-300">
                    • {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase">Classification & Details</span>
              <p className="font-semibold text-slate-100">{defect.defectType}</p>
              <p className="text-[11px] text-slate-400 line-clamp-2">{defect.description}</p>
            </div>

            <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-sky-400" /> Captured:
                </span>
                <span className="text-slate-200">{formattedCapturedAt}</span>
              </div>

              {defect.geoCoordinates && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" /> Site Coordinates:
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${defect.geoCoordinates.latitude},${defect.geoCoordinates.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:text-sky-200 underline flex items-center gap-1"
                  >
                    <span>
                      {defect.geoCoordinates.latitude.toFixed(4)}°, {defect.geoCoordinates.longitude.toFixed(4)}°
                    </span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Inspector / Reported By:</span>
                <span className="text-slate-300">{defect.reportedBy}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
