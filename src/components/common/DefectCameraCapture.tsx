import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  RefreshCw,
  Check,
  AlertCircle,
  Eye,
  Trash2,
  Sparkles,
  Maximize2,
  Shield,
  MapPin,
  Clock,
  Radio,
} from 'lucide-react';
import { DefectPhotoAttachment, GeoCoordinates } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';

interface DefectCameraCaptureProps {
  photo: DefectPhotoAttachment | null;
  onPhotoChange: (photo: DefectPhotoAttachment | null) => void;
  assetId: string;
  corridorId: string;
  geoCoordinates?: GeoCoordinates | null;
  isAnalyzingAi?: boolean;
}

// Generate realistic technical track defect preset SVGs/Data URLs for instant fallback/testing
const generateTrackDefectSvg = (
  type: 'RAIL_CRACK' | 'CATENARY_SAG' | 'FISHPLATE_LOOSE',
  assetId: string,
  corridorId: string
): string => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let visualElements = '';
  let defectTitle = '';

  if (type === 'RAIL_CRACK') {
    defectTitle = 'RAIL GAUGE FACE TRANSVERSE FATIGUE FRACTURE';
    visualElements = `
      <!-- Steel rail head -->
      <path d="M 0 160 L 400 160 L 400 230 L 0 230 Z" fill="#475569" />
      <path d="M 0 155 L 400 155 L 400 160 L 0 160 Z" fill="#94a3b8" />
      <!-- Rail web & base -->
      <path d="M 0 230 L 400 230 L 400 270 L 0 270 Z" fill="#334155" />
      <!-- Concrete sleeper and ballast -->
      <rect x="0" y="270" width="400" height="90" fill="#1e293b" />
      <circle cx="60" cy="290" r="12" fill="#0f172a" />
      <circle cx="120" cy="310" r="14" fill="#0f172a" />
      <circle cx="210" cy="295" r="10" fill="#0f172a" />
      <circle cx="320" cy="305" r="16" fill="#0f172a" />
      <!-- Severe transverse crack on rail head -->
      <path d="M 185 155 Q 192 180 188 200 Q 183 215 190 230" stroke="#f43f5e" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M 188 180 L 198 188" stroke="#f43f5e" stroke-width="2.5" fill="none" />
      <path d="M 184 195 L 174 202" stroke="#f43f5e" stroke-width="2" fill="none" />
      <!-- Measurement callout -->
      <circle cx="188" cy="190" r="28" stroke="#fb7185" stroke-width="1.5" stroke-dasharray="3,3" fill="none" />
      <text x="225" y="195" fill="#fda4af" font-family="monospace" font-size="11" font-weight="bold">Δ = 18.5mm DEPTH</text>
    `;
  } else if (type === 'CATENARY_SAG') {
    defectTitle = 'OHE CATENARY DROPPER ARCNG & WIRE SAG';
    visualElements = `
      <!-- Sky / Catenary mast background -->
      <rect x="0" y="0" width="400" height="360" fill="#090d16" />
      <!-- Mast structure -->
      <line x1="50" y1="0" x2="50" y2="360" stroke="#475569" stroke-width="16" />
      <line x1="50" y1="60" x2="380" y2="60" stroke="#334155" stroke-width="8" />
      <!-- Messenger wire (top) -->
      <path d="M 50 60 Q 200 75 400 65" stroke="#94a3b8" stroke-width="3.5" fill="none" />
      <!-- Contact wire (bottom) with sag -->
      <path d="M 50 190 Q 210 245 400 200" stroke="#f59e0b" stroke-width="4.5" fill="none" />
      <!-- Droppers -->
      <line x1="120" y1="68" x2="120" y2="200" stroke="#cbd5e1" stroke-width="2" />
      <!-- Broken/Snapped Dropper -->
      <line x1="210" y1="75" x2="210" y2="125" stroke="#f43f5e" stroke-width="2.5" />
      <circle cx="210" cy="128" r="4" fill="#f43f5e" />
      <!-- Arcing scorch -->
      <path d="M 195 235 Q 210 215 225 240" stroke="#38bdf8" stroke-width="3" fill="none" />
      <text x="230" y="240" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">ARC BURST RESIDUE</text>
    `;
  } else {
    defectTitle = 'INSULATED RAIL JOINT - FISHPLATE BOLT MISSING';
    visualElements = `
      <rect x="0" y="0" width="400" height="360" fill="#0f172a" />
      <!-- Rail pair with gap -->
      <rect x="20" y="140" width="160" height="70" fill="#64748b" />
      <rect x="200" y="140" width="180" height="70" fill="#64748b" />
      <!-- End post insulation gap -->
      <rect x="180" y="130" width="20" height="90" fill="#e2e8f0" />
      <!-- Fishplate bar -->
      <rect x="60" y="155" width="280" height="40" fill="#334155" rx="6" stroke="#475569" stroke-width="2" />
      <!-- Bolt 1, 2, 4 intact -->
      <circle cx="95" cy="175" r="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2" />
      <circle cx="145" cy="175" r="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2" />
      <circle cx="295" cy="175" r="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2" />
      <!-- Bolt 3 MISSING with warning -->
      <circle cx="245" cy="175" r="14" fill="#450a0a" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="3,2" />
      <text x="210" y="225" fill="#f87171" font-family="monospace" font-size="10" font-weight="bold">BOLT #3 SHEARED</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" width="800" height="720">
      <rect width="400" height="360" fill="#0a0f1d" />
      ${visualElements}
      <!-- Reticle / Inspection grid overlay -->
      <line x1="200" y1="20" x2="200" y2="300" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.4" />
      <line x1="20" y1="180" x2="380" y2="180" stroke="#38bdf8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.4" />
      <!-- HUD Watermark Banner -->
      <rect x="0" y="305" width="400" height="55" fill="#020617" opacity="0.92" />
      <text x="12" y="322" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">IR FIELD DEFECT INSPECTION | ASSET: ${assetId} (${corridorId})</text>
      <text x="12" y="336" fill="#e2e8f0" font-family="monospace" font-size="8.5">${defectTitle}</text>
      <text x="12" y="350" fill="#94a3b8" font-family="monospace" font-size="8">RECORDED: ${timestamp} IST | CORRIDOR TRACK EVIDENCE</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DefectCameraCapture: React.FC<DefectCameraCaptureProps> = ({
  photo,
  onPhotoChange,
  assetId,
  corridorId,
  geoCoordinates,
  isAnalyzingAi = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop video stream cleanly
  const stopVideoStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoStream();
    };
  }, [stopVideoStream]);

  // Start video stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    stopVideoStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API (getUserMedia) is not supported in this browser. You can upload a photo file or select an inspection preset below.'
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error:', err);
        });
      }

      setStreamActive(true);
      railwayAudio.playBeep(880, 0.08);
    } catch (err: any) {
      console.error('Camera stream access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video camera hardware detected on this device. You can upload an image file instead.');
      } else {
        setCameraError(`Unable to start camera stream (${err.message || 'Device busy'}).`);
      }
      setStreamActive(false);
    }
  };

  const handleOpenModal = () => {
    setIsCameraOpen(true);
    startCamera(facingMode);
  };

  const handleCloseModal = () => {
    stopVideoStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take Snapshot from video element
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw camera frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay Railway Inspection Watermark Banner at bottom
    const bannerHeight = Math.max(50, canvas.height * 0.1);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

    // Accent line
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 3);

    // Watermark text
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.round(bannerHeight * 0.26)}px monospace`;
    ctx.fillText(
      `INDIAN RAILWAYS FIELD DEFECT INSPECTION | ASSET: ${assetId} (${corridorId})`,
      18,
      canvas.height - bannerHeight + bannerHeight * 0.38
    );

    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const coordsStr = geoCoordinates
      ? ` | GPS: ${geoCoordinates.latitude.toFixed(5)}°N, ${geoCoordinates.longitude.toFixed(5)}°E (±${Math.round(geoCoordinates.accuracyMeters || 3)}m)`
      : '';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${Math.round(bannerHeight * 0.22)}px monospace`;
    ctx.fillText(
      `CAPTURED: ${nowIso} IST${coordsStr}`,
      18,
      canvas.height - bannerHeight + bannerHeight * 0.78
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Play camera shutter tone
    railwayAudio.playBeep(1200, 0.05);
    setTimeout(() => railwayAudio.playBeep(800, 0.07), 60);

    const attachment: DefectPhotoAttachment = {
      dataUrl,
      capturedAt: new Date().toISOString(),
      fileName: `defect-${assetId}-${Date.now()}.jpg`,
      fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
      source: 'CAMERA_CAPTURE',
      caption: `Track Defect Photographic Evidence (${assetId})`,
    };

    onPhotoChange(attachment);
    handleCloseModal();
  };

  // Process selected or dropped file
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      if (!originalDataUrl) return;

      // Compress/watermark using canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);

        // Watermark
        const bannerHeight = Math.max(45, height * 0.09);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.round(bannerHeight * 0.3)}px monospace`;
        ctx.fillText(`IR FIELD EVIDENCE | ASSET: ${assetId} (${corridorId})`, 16, height - bannerHeight * 0.55);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `${Math.round(bannerHeight * 0.24)}px monospace`;
        ctx.fillText(`ATTACHED: ${new Date().toLocaleString('en-IN')}`, 16, height - bannerHeight * 0.2);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        const attachment: DefectPhotoAttachment = {
          dataUrl,
          capturedAt: new Date().toISOString(),
          fileName: file.name,
          fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
          source: 'FILE_UPLOAD',
          caption: `Uploaded Evidence: ${file.name}`,
        };

        onPhotoChange(attachment);
        railwayAudio.playBeep(750, 0.08);
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handlePresetSelect = (type: 'RAIL_CRACK' | 'CATENARY_SAG' | 'FISHPLATE_LOOSE') => {
    const dataUrl = generateTrackDefectSvg(type, assetId, corridorId);
    const label =
      type === 'RAIL_CRACK'
        ? 'Rail Gauge Face Transverse Fracture'
        : type === 'CATENARY_SAG'
        ? 'OHE Catenary Dropper Snapped'
        : 'Insulated Rail Joint Bolt Missing';

    const attachment: DefectPhotoAttachment = {
      dataUrl,
      capturedAt: new Date().toISOString(),
      fileName: `${type.toLowerCase()}-${assetId}.svg`,
      fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
      source: 'FIELD_PRESET',
      caption: label,
    };

    onPhotoChange(attachment);
    setShowPresets(false);
    railwayAudio.playBeep(880, 0.08);
  };

  return (
    <div className="space-y-2">
      {/* Hidden File Input for Direct Gallery / Mobile Camera Capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-300 font-mono text-xs">
          Defect Photo Evidence <span className="text-slate-500 font-normal">(Camera / Attachment)</span>
        </label>
        <span className="text-[10px] text-slate-400 font-mono">
          {photo ? '1 Photo Attached' : 'Optional but Recommended'}
        </span>
      </div>

      {/* Case 1: Photo is Attached -> Display Preview Card */}
      {photo ? (
        <div
          id="defect-attached-photo-card"
          className={`p-3 rounded-xl bg-slate-900 border shadow-md space-y-2.5 animate-in fade-in duration-200 transition-all ${
            isAnalyzingAi
              ? 'border-sky-500 shadow-lg shadow-sky-950/60 ring-1 ring-sky-400/40'
              : 'border-sky-600/70'
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="relative group w-24 h-20 bg-black rounded-lg overflow-hidden border border-slate-700 shrink-0">
              <img
                src={photo.dataUrl}
                alt="Defect Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              {/* Laser Scanning Animation Overlay during AI Analysis */}
              {isAnalyzingAi ? (
                <div className="absolute inset-0 bg-sky-950/40 pointer-events-none overflow-hidden">
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#38bdf8]"
                  />
                  <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] font-mono text-cyan-300 font-bold border border-cyan-500/50 animate-pulse">
                    SCAN
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Photo Info */}
            <div className="flex-1 min-w-0 space-y-1 font-mono text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-sky-400" />
                  <span>
                    {photo.source === 'CAMERA_CAPTURE'
                      ? 'Live Camera Snapshot'
                      : photo.source === 'FIELD_PRESET'
                      ? 'Field Preset Record'
                      : 'Uploaded Photo'}
                  </span>
                </span>
                {isAnalyzingAi && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                    <span>AI Scanning...</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  {photo.fileSizeBytes ? `${Math.round(photo.fileSizeBytes / 1024)} KB` : 'Verified'}
                </span>
              </div>

              <p className="text-slate-200 font-semibold truncate text-[11px]">
                {photo.caption || photo.fileName || 'Track Defect Site Inspection'}
              </p>

              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(photo.capturedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                {geoCoordinates && (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-rose-400" /> Geotagged
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-retake-camera-photo"
                onClick={handleOpenModal}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Retake photo using camera"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Replace with an image file"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload File</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-remove-defect-photo"
              onClick={() => {
                onPhotoChange(null);
                railwayAudio.playBeep(450, 0.05);
              }}
              className="px-2 py-1 rounded hover:bg-rose-950/70 text-slate-400 hover:text-rose-400 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              title="Remove attached photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: No Photo Attached -> Interactive Camera Trigger & Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`p-3.5 rounded-xl border border-dashed transition-all ${
            isDragOver
              ? 'bg-sky-950/50 border-sky-400 ring-2 ring-sky-500/30'
              : 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-xl bg-sky-950 border border-sky-700/80 text-sky-400 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-slate-200 font-mono text-xs block">
                  Capture or Attach Track Photo
                </strong>
                <p className="text-[11px] text-slate-400">
                  Take a field photo with camera or drag & drop image here
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* PRIMARY LIVE CAMERA BUTTON */}
              <button
                type="button"
                id="btn-open-defect-camera"
                onClick={handleOpenModal}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-950/60 transition-all cursor-pointer"
                title="Launch device camera to capture live track defect photo"
              >
                <Camera className="w-4 h-4" />
                <span>Open Camera</span>
              </button>

              {/* Upload File */}
              <button
                type="button"
                id="btn-upload-defect-photo"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Browse file system for photo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {/* Presets Toggle for quick testing */}
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className={`p-2 rounded-lg border font-mono text-xs transition-colors cursor-pointer ${
                  showPresets
                    ? 'bg-sky-950 text-sky-200 border-sky-600'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Select field inspection defect preset (Rail crack, catenary, fishplate)"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Quick Presets Drawer */}
          {showPresets && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Railway Defect Photographic Presets
                </span>
                <span className="text-[10px] text-slate-500">For testing without physical track</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('RAIL_CRACK')}
                  className="p-2 rounded bg-slate-950 hover:bg-sky-950 border border-slate-800 hover:border-sky-700 text-left transition-colors cursor-pointer font-mono"
                >
                  <span className="text-xs font-bold text-rose-300 block">Rail Fatigue Crack</span>
                  <span className="text-[10px] text-slate-400 block truncate">Transverse gauge face</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('CATENARY_SAG')}
                  className="p-2 rounded bg-slate-950 hover:bg-sky-950 border border-slate-800 hover:border-sky-700 text-left transition-colors cursor-pointer font-mono"
                >
                  <span className="text-xs font-bold text-amber-300 block">OHE Dropper Sag</span>
                  <span className="text-[10px] text-slate-400 block truncate">Snapped dropper & arc</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('FISHPLATE_LOOSE')}
                  className="p-2 rounded bg-slate-950 hover:bg-sky-950 border border-slate-800 hover:border-sky-700 text-left transition-colors cursor-pointer font-mono"
                >
                  <span className="text-xs font-bold text-sky-300 block">Fishplate Bolt Loose</span>
                  <span className="text-[10px] text-slate-400 block truncate">Insulated rail joint</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL CAMERA VIEWFINDER MODAL */}
      {isCameraOpen && (
        <div
          id="camera-viewfinder-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            className="bg-slate-950 border border-sky-500/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden font-mono text-slate-200 flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Camera Header */}
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-rose-950 border border-rose-600 text-rose-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Live Field Camera Viewfinder
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Target: <span className="text-sky-300 font-bold">{assetId}</span> | Corridor: {corridorId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Switch Camera */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={`Flip camera (Current: ${facingMode})`}
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Close Viewfinder */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewport with Reticle Overlay */}
            <div className="relative bg-black min-h-[360px] max-h-[60vh] flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                id="camera-viewfinder-video"
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[58vh]"
              />

              {/* HUD / Reticle Overlay when stream is active */}
              {streamActive && (
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                  {/* Top HUD */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950/60 backdrop-blur-sm p-1.5 rounded border border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>LIVE SENSOR FEED</span>
                    </div>
                    {geoCoordinates && (
                      <span className="text-emerald-300 text-[10px]">
                        GPS: {geoCoordinates.latitude.toFixed(4)}°, {geoCoordinates.longitude.toFixed(4)}°
                      </span>
                    )}
                  </div>

                  {/* Framing Reticle */}
                  <div className="self-center my-auto w-48 h-48 sm:w-64 sm:h-64 border border-dashed border-sky-400/60 rounded-xl relative flex items-center justify-center">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-sky-300 absolute top-0 left-0"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-sky-300 absolute top-0 right-0"></div>
                    <div className="w-4 h-4 border-b-2 border-l-2 border-sky-300 absolute bottom-0 left-0"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-sky-300 absolute bottom-0 right-0"></div>
                    <div className="w-2 h-2 rounded-full bg-sky-400/80"></div>
                  </div>

                  {/* Bottom HUD info */}
                  <div className="text-[10px] text-center text-slate-300 bg-slate-950/60 backdrop-blur-sm py-1 rounded">
                    Align defect within framing box. Click 'Capture Photo' below.
                  </div>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-3 rounded-full bg-rose-950 border border-rose-600 text-rose-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-300">Camera Unavailable</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">{cameraError}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        handlePresetSelect('RAIL_CRACK');
                      }}
                      className="px-3 py-1.5 rounded bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use Rail Preset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Viewfinder Controls Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Auto-watermarked with Asset ID, Corridor, & timestamp
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>

                {/* BIG SHUTTER CAPTURE BUTTON */}
                <button
                  type="button"
                  id="btn-capture-camera-photo"
                  disabled={!streamActive}
                  onClick={handleCaptureSnapshot}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    streamActive
                      ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-950/70'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Capture snapshot frame from camera feed"
                >
                  <Camera className="w-4 h-4" />
                  <span>CAPTURE PHOTO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
