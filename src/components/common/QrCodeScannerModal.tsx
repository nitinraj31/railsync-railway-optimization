import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Scan,
  Zap,
  ZapOff,
  SwitchCamera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Search,
  Copy,
  Check,
  History,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Wrench,
  Clock,
  Layers,
  FileText,
  Volume2,
  VolumeX,
} from 'lucide-react';
import jsQR from 'jsqr';
import { parseScannedQrData, ParsedQrResult } from '../../services/qrScanParserService';
import { railwayAudio } from '../../services/railwayAudio';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string, itemData?: any) => void;
  onOpenSearchWithQuery?: (query: string) => void;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenSearchWithQuery,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Scanner state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Result state
  const [scannedResult, setScannedResult] = useState<ParsedQrResult | null>(null);
  const [autoNavigateSeconds, setAutoNavigateSeconds] = useState<number | null>(null);
  const [autoNavigateEnabled, setAutoNavigateEnabled] = useState<boolean>(true);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ParsedQrResult[]>([]);
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'HISTORY'>('SCANNER');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Quick preset test samples
  const PRESET_SAMPLES = [
    { label: 'DEF-2026-001 (Rail Defect)', value: 'DEF-2026-001', type: 'DEFECT' },
    { label: 'DEF-2026-002 (OHE Sag)', value: 'DEF-2026-002', type: 'DEFECT' },
    { label: 'BLK-001 (Mainline Block)', value: 'BLK-001', type: 'BLOCK' },
    { label: 'BLK-T012 (Conflicting Slot)', value: 'BLK-T012', type: 'BLOCK' },
    { label: 'Deep Link: DEF-2026-003', value: 'https://railsync.indianrailways.gov.in/defects/inspect?defectId=DEF-2026-003', type: 'URL' },
    { label: 'Validation Gazette Dossier', value: 'https://railsync.indianrailways.gov.in/safety-audit/verify/RB-IR-BLK-2026-4190?scheduleId=SCH-IR-2026-8492', type: 'VALIDATION' },
  ];

  /**
   * Stops active camera stream and clean up resources
   */
  const stopCamera = useCallback(() => {
    if (scanLoopIdRef.current) {
      cancelAnimationFrame(scanLoopIdRef.current);
      scanLoopIdRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  /**
   * Initializes and starts camera video stream
   */
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access API is not supported in this browser environment. Use image file upload or test chips below.');
      return;
    }

    try {
      // Check if multiple camera devices exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      // Attempt to access environment (rear) camera, fallback to any available
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        // Fallback to basic video constraint
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && (track.getCapabilities as any)) {
        const capabilities = (track.getCapabilities as any)();
        if (capabilities && capabilities.torch) {
          setTorchAvailable(true);
        }
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let errorMsg = 'Could not access camera. Please allow camera permissions or upload a QR image.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings or use image upload.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system. You can upload an image or test with quick simulation chips.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application.';
      }
      setCameraError(errorMsg);
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  /**
   * Handles detection of a valid QR code
   */
  const handleQrDetected = useCallback(
    (rawValue: string) => {
      // Play scanner beep feedback
      if (!isMuted) {
        railwayAudio.playBeep(920, 0.08);
      }

      // Parse the payload
      const result = parseScannedQrData(rawValue);
      setScannedResult(result);

      // Update scan history
      setScanHistory((prev) => [result, ...prev.filter((item) => item.rawValue !== rawValue)].slice(0, 8));

      // Handle auto-navigation if enabled
      if (autoNavigateEnabled) {
        setAutoNavigateSeconds(2);
      }
    },
    [autoNavigateEnabled, isMuted]
  );

  /**
   * Continuous animation scan loop over video canvas
   */
  useEffect(() => {
    if (!cameraActive || scannedResult) return;

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data && code.data.trim().length > 0) {
            handleQrDetected(code.data);
            return; // Pause scanning on detection
          }
        }
      }

      scanLoopIdRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (scanLoopIdRef.current) {
        cancelAnimationFrame(scanLoopIdRef.current);
      }
    };
  }, [cameraActive, scannedResult, handleQrDetected]);

  /**
   * Countdown timer for auto-navigation
   */
  useEffect(() => {
    if (autoNavigateSeconds === null) return;

    if (autoNavigateSeconds <= 0) {
      if (scannedResult) {
        triggerDirectNavigation(scannedResult);
      }
      setAutoNavigateSeconds(null);
      return;
    }

    countdownTimerRef.current = window.setTimeout(() => {
      setAutoNavigateSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [autoNavigateSeconds, scannedResult]);

  /**
   * Lifecycle trigger on modal open/close
   */
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setAutoNavigateSeconds(null);
    }
  }, [isOpen, startCamera, stopCamera]);

  /**
   * Toggle Torch / Flashlight
   */
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.applyConstraints as any)) {
      try {
        await (track.applyConstraints as any)({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  /**
   * Flip between front and rear cameras
   */
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  /**
   * Process an uploaded QR code image file
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleQrDetected(code.data);
          } else {
            setCameraError('No readable QR code found in the uploaded image. Please try another image or test sample.');
          }
        }
        setIsProcessingFile(false);
      };
      img.onerror = () => {
        setCameraError('Failed to load image file.');
        setIsProcessingFile(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setCameraError('Failed to read image file.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /**
   * Direct Navigation execution
   */
  const triggerDirectNavigation = (result: ParsedQrResult) => {
    stopCamera();
    onClose();

    if (result.directNavigateParams) {
      onNavigate(result.directNavigateParams.screen, result.directNavigateParams.itemData);
    } else {
      onNavigate(result.targetScreen);
    }
  };

  /**
   * Open in Global Search
   */
  const triggerSearch = (query: string) => {
    stopCamera();
    onClose();
    if (onOpenSearchWithQuery) {
      onOpenSearchWithQuery(query);
    } else {
      onNavigate('command_center', { searchQuery: query });
    }
  };

  /**
   * Copy raw QR string to clipboard
   */
  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  /**
   * Reset to scan another QR code
   */
  const handleScanAgain = () => {
    setScannedResult(null);
    setAutoNavigateSeconds(null);
    setCameraError(null);
    if (!cameraActive) {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-[#0b1329] border border-cyan-500/40 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-950/80 bg-[#070d1e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Scan className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Field QR Code Scanner
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                  CAMERA HUD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Scan track-side defect placards, maintenance blocks, or official bulletins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              title={isMuted ? 'Unmute Scan Chime' : 'Mute Scan Chime'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080f22] px-5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('SCANNER')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'SCANNER'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Viewfinder</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Scans ({scanHistory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'SCANNER' ? (
            <>
              {/* Camera Video Viewfinder with Tactical Reticle Overlay */}
              <div className="relative aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-cyan-900/60 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Tactical Camera HUD Overlay */}
                {cameraActive && !scannedResult && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                    {/* Top Status */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/90">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-cyan-800/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE TRACKING</span>
                      </div>
                      <div className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-cyan-800/40">
                        <span>DETECTOR: JSQR v1.4</span>
                      </div>
                    </div>

                    {/* Central Target Reticle & Sweeping Laser */}
                    <div className="self-center relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />

                      {/* Center Crosshair */}
                      <div className="w-6 h-0.5 bg-cyan-400/60" />
                      <div className="h-6 w-0.5 bg-cyan-400/60 absolute" />

                      {/* Laser Sweep Animation */}
                      <div className="absolute inset-x-2 h-0.5 bg-cyan-400 shadow-[0_0_12px_#38bdf8] animate-scan-beam" />
                    </div>

                    {/* Bottom Prompt */}
                    <div className="text-center">
                      <span className="bg-black/75 px-3 py-1 rounded-full text-[11px] font-mono text-cyan-200 border border-cyan-800/60">
                        Align QR code inside reticle for automatic recognition
                      </span>
                    </div>
                  </div>
                )}

                {/* Standby / Error Fallback Display */}
                {(!cameraActive || cameraError) && (
                  <div className="p-6 text-center space-y-3 max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                    {cameraError ? (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Camera Stream Inactive</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {cameraError}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        Initializing high-frequency QR video feed...
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={startCamera}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Controls Bar */}
              <div className="flex items-center justify-between text-xs font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  {/* File Upload Hidden Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors"
                    title="Upload QR code image file from disk"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isProcessingFile ? 'Decoding...' : 'Upload Image'}</span>
                  </button>

                  {/* Camera Switcher (Front/Back) */}
                  {hasMultipleCameras && (
                    <button
                      onClick={handleFlipCamera}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors"
                      title="Flip between front and rear cameras"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Flip Camera</span>
                    </button>
                  )}

                  {/* Torch / Flashlight Toggle */}
                  {torchAvailable && (
                    <button
                      onClick={handleToggleTorch}
                      className={`px-2.5 py-1 rounded flex items-center gap-1.5 border transition-colors ${
                        torchOn
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Toggle camera flashlight"
                    >
                      {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{torchOn ? 'Torch On' : 'Torch'}</span>
                    </button>
                  )}
                </div>

                {/* Auto Navigate Toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={autoNavigateEnabled}
                    onChange={(e) => setAutoNavigateEnabled(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-Navigate (2s)</span>
                </label>
              </div>

              {/* Scanned Result Card Overlay */}
              {scannedResult && (
                <div className="p-4 rounded-xl bg-[#0e1a38] border-2 border-cyan-500 shadow-xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>QR CODE DECODED</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            scannedResult.badgeColor === 'rose'
                              ? 'bg-rose-950 border border-rose-600 text-rose-300'
                              : scannedResult.badgeColor === 'amber'
                              ? 'bg-amber-950 border border-amber-600 text-amber-300'
                              : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                          }`}
                        >
                          {scannedResult.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 font-sans">
                        {scannedResult.title}
                      </h3>
                      <p className="text-xs text-slate-300 font-sans">
                        {scannedResult.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={handleScanAgain}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono shrink-0 flex items-center gap-1"
                      title="Clear and scan another code"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Scan Next</span>
                    </button>
                  </div>

                  {/* Scanned Details Strip */}
                  {scannedResult.details && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
                      {Object.entries(scannedResult.details).slice(0, 6).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-slate-500 uppercase text-[9px] block">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-slate-200 font-semibold truncate block">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw Payload Row */}
                  <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 truncate max-w-sm" title={scannedResult.rawValue}>
                      Payload: {scannedResult.rawValue}
                    </span>
                    <button
                      onClick={() => handleCopyRaw(scannedResult.rawValue)}
                      className="text-cyan-400 hover:text-cyan-200 ml-2 shrink-0 flex items-center gap-1"
                    >
                      {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {/* Primary Direct Navigation Action */}
                    <button
                      onClick={() => triggerDirectNavigation(scannedResult)}
                      className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 cursor-pointer"
                    >
                      <span>
                        {autoNavigateSeconds !== null && autoNavigateSeconds > 0
                          ? `Navigating to ${scannedResult.targetScreen.toUpperCase()} in ${autoNavigateSeconds}s...`
                          : `Navigate to ${scannedResult.targetType} Screen`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Cancel Countdown if active */}
                    {autoNavigateSeconds !== null && (
                      <button
                        onClick={() => setAutoNavigateSeconds(null)}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                      >
                        Cancel Timer
                      </button>
                    )}

                    {/* Secondary Global Search Action */}
                    <button
                      onClick={() => triggerSearch(scannedResult.targetId)}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700"
                      title="Open item in Global Search modal"
                    >
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                      <span>Search Global</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Field Simulation Badges */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Quick Test Samples (Instant Simulation):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Click to scan payload</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SAMPLES.map((sample) => (
                    <button
                      key={sample.label}
                      onClick={() => handleQrDetected(sample.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-700/60 text-slate-300 text-[11px] font-mono border border-slate-800 transition-all text-left flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3 font-mono text-xs">
              {scanHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-600" />
                  <p>No recent QR code scans in this session.</p>
                  <button
                    onClick={() => setActiveTab('SCANNER')}
                    className="text-cyan-400 hover:underline text-xs"
                  >
                    Open Viewfinder to scan now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Scanned in current browser session ({scanHistory.length})</span>
                    <button
                      onClick={() => setScanHistory([])}
                      className="text-slate-500 hover:text-rose-400 text-[10px]"
                    >
                      Clear Log
                    </button>
                  </div>
                  {scanHistory.map((item, index) => (
                    <div
                      key={`${item.targetId}-${index}`}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-700/50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">{item.targetId}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.targetType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate font-sans">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{item.rawValue}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => triggerDirectNavigation(item)}
                          className="px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#070d1e] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hardware camera detector active (HTML5 Video &amp; Barcode API)</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
