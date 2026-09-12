import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Send,
  Search,
  Filter,
  ShieldAlert,
  Gauge,
  Calendar,
  Layers,
  MapPin,
  Crosshair,
  Satellite,
  Compass,
  ExternalLink,
  RotateCcw,
  Trash2,
  Loader2,
  ShieldCheck,
  Navigation,
  Info,
  Check,
  Map,
  Camera,
  Eye,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import {
  Defect,
  DepartmentType,
  PriorityLevel,
  Asset,
  Corridor,
  User,
  GeoCoordinates,
  DefectPhotoAttachment,
  DefectAiVisualAnalysis,
} from '../../types';
import { submitDefect } from '../../services/api';
import { DefectLocationMapModal } from '../common/DefectLocationMapModal';
import { VoiceDictationInput } from '../common/VoiceDictationInput';
import { DefectCameraCapture } from '../common/DefectCameraCapture';
import { DefectPhotoModal } from '../common/DefectPhotoModal';
import { DefectMapThumbnail } from '../common/DefectMapThumbnail';
import { DefectAiPhotoAnalysisCard } from '../common/DefectAiPhotoAnalysisCard';
import { analyzeDefectPhotoWithAi } from '../../services/defectVisionAiService';
import { railwayAudio } from '../../services/railwayAudio';

interface DefectReportingScreenProps {
  currentUser: User | null;
  assets: Asset[];
  corridors: Corridor[];
  defects: Defect[];
  onRefreshDefects: () => void;
}

export const DefectReportingScreen: React.FC<DefectReportingScreenProps> = ({
  currentUser,
  assets,
  corridors,
  defects,
  onRefreshDefects,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState('A023');
  const [department, setDepartment] = useState<DepartmentType>('S&T');
  const [corridorId, setCorridorId] = useState('C004');
  const [defectType, setDefectType] = useState('Automatic Block Signaling Intermittent Lamp Voltage');
  const [severity, setSeverity] = useState<PriorityLevel>('CRITICAL');
  const [detectedDate, setDetectedDate] = useState('2026-09-05');
  const [description, setDescription] = useState(
    'Oscillating signal power supply recorded during nighttime test run at KM 28/4. Potential fail-to-danger hazard if uncorrected.'
  );
  const [reportedBy, setReportedBy] = useState(
    currentUser?.name || 'Vikram Joshi (DSTE / S&T)'
  );
  const [speedRestriction, setSpeedRestriction] = useState<number | undefined>(30);

  // Geo-coordinates & GPS tracking state
  const [geoCoordinates, setGeoCoordinates] = useState<GeoCoordinates | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState<string | null>(null);
  const [selectedDefectForLocation, setSelectedDefectForLocation] = useState<Defect | null>(null);
  const [showManualGpsInput, setShowManualGpsInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualChainage, setManualChainage] = useState('');

  // Camera Photo Attachment & Inspection Modal state
  const [photoAttachment, setPhotoAttachment] = useState<DefectPhotoAttachment | null>(null);
  const [selectedDefectForPhoto, setSelectedDefectForPhoto] = useState<Defect | null>(null);

  // AI Defect Photo Visual Priority Analysis state
  const [aiVisualAnalysis, setAiVisualAnalysis] = useState<DefectAiVisualAnalysis | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const lastAnalyzedPhotoRef = useRef<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    id: string;
    status: string;
    geoCoordinates?: GeoCoordinates;
    photoAttachment?: DefectPhotoAttachment;
  } | null>(null);

  // Table Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterGpsOnly, setFilterGpsOnly] = useState(false);
  const [filterPhotosOnly, setFilterPhotosOnly] = useState(false);
  const [filterAiPriorities, setFilterAiPriorities] = useState<PriorityLevel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAssetSelect = (id: string) => {
    setSelectedAssetId(id);
    const asset = assets.find((a) => a.id === id);
    if (asset) {
      setCorridorId(asset.corridorId);
      setDepartment(asset.department);
    }
  };

  /**
   * Captures the user's current GPS position via the browser's Geolocation API
   * with high-precision geodetic accuracy.
   */
  const handleCaptureGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('HTML5 Geolocation is not supported by your browser or environment.');
      return;
    }

    setCapturingGps(true);
    setGpsError(null);
    setGpsSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);
        const asset = assets.find((a) => a.id === selectedAssetId);

        const coords: GeoCoordinates = {
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          altitudeMeters: position.coords.altitude ? Math.round(position.coords.altitude) : null,
          headingDegrees: position.coords.heading || null,
          speedMps: position.coords.speed || null,
          capturedAt: new Date().toISOString(),
          source: 'GPS_DEVICE',
          railwayChainageKm: `${corridorId} - Near ${asset?.name || 'Section'} (Track KM Fix)`,
        };

        setGeoCoordinates(coords);
        setCapturingGps(false);
        setGpsSuccessMessage(`Precision GPS lock acquired (±${accuracy}m survey margin)`);
        railwayAudio.playBeep(880, 0.08);
      },
      (error) => {
        setCapturingGps(false);
        let msg = 'Unable to acquire satellite GPS fix.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can allow location access or click "Use Track Preset Fix".';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS satellite signals unavailable. Satellites may be obstructed or device is indoors.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS acquisition timed out. Please try again or use track corridor coordinates.';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Preset track corridor anchor for railway track sections
   * Used when indoors in the Divisional Control Office or when testing without satellite hardware
   */
  const handleUseCorridorAnchor = () => {
    const corridorBaseCoords: Record<string, [number, number]> = {
      C001: [28.6448, 77.2250], // NDLS - GZB
      C002: [28.6650, 77.2150], // DLI - PNP
      C003: [28.6920, 76.9210], // BGZ - ROK
      C004: [28.5830, 77.2450], // NZM - PWL
    };
    const base = corridorBaseCoords[corridorId] || [28.6448, 77.2250];
    const assetNum = parseInt(selectedAssetId.replace(/\D/g, '') || '12', 10);
    const lat = Number((base[0] + ((assetNum * 0.0031) % 0.04)).toFixed(6));
    const lng = Number((base[1] + ((assetNum * 0.0047) % 0.05)).toFixed(6));

    const coords: GeoCoordinates = {
      latitude: lat,
      longitude: lng,
      accuracyMeters: 3.2,
      altitudeMeters: 215,
      capturedAt: new Date().toISOString(),
      source: 'CORRIDOR_ANCHOR',
      railwayChainageKm: `KM ${(24 + (assetNum % 12)).toFixed(1)}/4 Up Main`,
    };

    setGeoCoordinates(coords);
    setGpsError(null);
    setGpsSuccessMessage('Corridor track geodetic coordinates locked (±3.2m survey margin).');
    railwayAudio.playBeep(770, 0.08);
  };

  /**
   * Apply custom manual coordinates entered by field officer
   */
  const handleApplyManualCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setGpsError('Invalid latitude value (-90 to +90).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setGpsError('Invalid longitude value (-180 to +180).');
      return;
    }

    const coords: GeoCoordinates = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracyMeters: 5.0,
      capturedAt: new Date().toISOString(),
      source: 'MANUAL_ENTRY',
      railwayChainageKm: manualChainage.trim() || `${corridorId} - Manual Field Entry`,
    };

    setGeoCoordinates(coords);
    setShowManualGpsInput(false);
    setGpsError(null);
    setGpsSuccessMessage('Manual field survey coordinates attached.');
    railwayAudio.playBeep(770, 0.08);
  };

  const handleClearGps = () => {
    setGeoCoordinates(null);
    setGpsError(null);
    setGpsSuccessMessage(null);
  };

  /**
   * Automatically triggers AI analysis of the captured defect photo
   * to suggest the likely maintenance priority level based on visual patterns.
   */
  const triggerAiPhotoAnalysis = useCallback(
    async (photo: DefectPhotoAttachment) => {
      setAnalyzingPhoto(true);
      try {
        const result = await analyzeDefectPhotoWithAi({
          photoDataUrl: photo.dataUrl,
          assetId: selectedAssetId,
          corridorId,
          defectType,
          caption: photo.caption,
          source: photo.source,
          geoCoordinates,
        });

        setAiVisualAnalysis(result);
        railwayAudio.playStationChime();

        // Automatically associate analysis with photo attachment
        setPhotoAttachment((prev) => (prev ? { ...prev, aiAnalysis: result } : prev));
      } catch (err) {
        console.error('Failed to analyze photo with AI:', err);
      } finally {
        setAnalyzingPhoto(false);
      }
    },
    [selectedAssetId, corridorId, defectType, geoCoordinates]
  );

  // Automatically trigger AI analysis whenever a photo is captured, uploaded, or attached
  useEffect(() => {
    if (photoAttachment && photoAttachment.dataUrl) {
      if (lastAnalyzedPhotoRef.current !== photoAttachment.dataUrl) {
        lastAnalyzedPhotoRef.current = photoAttachment.dataUrl;
        triggerAiPhotoAnalysis(photoAttachment);
      }
    } else {
      lastAnalyzedPhotoRef.current = null;
      setAiVisualAnalysis(null);
    }
  }, [photoAttachment, triggerAiPhotoAnalysis]);

  const handleReanalyzePhoto = () => {
    if (photoAttachment) {
      triggerAiPhotoAnalysis(photoAttachment);
    }
  };

  /**
   * Open the geodetic radar modal for the currently pinned coordinates
   */
  const handleOpenCurrentMapModal = () => {
    if (geoCoordinates) {
      setSelectedDefectForLocation({
        defectId: 'FIELD-SITE-DRAFT',
        assetId: selectedAssetId,
        department,
        corridorId,
        defectType: defectType || 'Permanent Way Defect',
        severity,
        detectedDate,
        description: description || 'Site geodetic survey underway',
        reportedBy: reportedBy || 'Permanent Way Officer',
        status: 'PENDING',
        geoCoordinates,
        photoAttachment: photoAttachment || undefined,
        aiVisualAnalysis: aiVisualAnalysis || undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const created = await submitDefect({
        assetId: selectedAssetId,
        department,
        corridorId,
        defectType,
        severity,
        detectedDate,
        description,
        reportedBy,
        speedRestrictionKmph: speedRestriction,
        geoCoordinates: geoCoordinates || undefined,
        photoAttachment: photoAttachment
          ? {
              ...photoAttachment,
              aiAnalysis: aiVisualAnalysis || photoAttachment.aiAnalysis,
            }
          : undefined,
        aiVisualAnalysis: aiVisualAnalysis || undefined,
      });

      setSubmissionSuccess({
        id: created.defectId,
        status: created.status,
        geoCoordinates: created.geoCoordinates,
        photoAttachment: created.photoAttachment,
      });

      // Clear geo coordinates, photo attachment, and AI visual analysis after successful report
      setGeoCoordinates(null);
      setPhotoAttachment(null);
      setAiVisualAnalysis(null);
      lastAnalyzedPhotoRef.current = null;
      setGpsSuccessMessage(null);

      onRefreshDefects();
    } catch (err) {
      console.error('Error reporting defect:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract suggested AI maintenance priority from defect visual analysis or photo attachment
  const getDefectAiPriority = (d: Defect): PriorityLevel | undefined => {
    return d.aiVisualAnalysis?.suggestedPriority || d.photoAttachment?.aiAnalysis?.suggestedPriority;
  };

  const handleToggleAiPriority = (priority: PriorityLevel) => {
    railwayAudio.playBeep(700, 0.04);
    setFilterAiPriorities((prev) => {
      if (prev.includes(priority)) {
        return prev.filter((p) => p !== priority);
      } else {
        return [...prev, priority];
      }
    });
  };

  const filteredDefects = defects.filter((d) => {
    if (filterSeverity !== 'ALL' && d.severity !== filterSeverity) return false;
    if (filterDept !== 'ALL' && d.department !== filterDept) return false;
    if (filterGpsOnly && !d.geoCoordinates) return false;
    if (filterPhotosOnly && !d.photoAttachment) return false;

    // AI Maintenance Priority Level Filtering
    if (filterAiPriorities.length > 0) {
      const aiPriority = getDefectAiPriority(d);
      if (!aiPriority || !filterAiPriorities.includes(aiPriority)) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const coordsMatch = d.geoCoordinates
        ? `${d.geoCoordinates.latitude} ${d.geoCoordinates.longitude} ${d.geoCoordinates.railwayChainageKm || ''}`.toLowerCase().includes(q)
        : false;
      const aiPriorityMatch = getDefectAiPriority(d)?.toLowerCase().includes(q) || false;
      return (
        d.defectId.toLowerCase().includes(q) ||
        d.assetId.toLowerCase().includes(q) ||
        d.defectType.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        coordsMatch ||
        aiPriorityMatch
      );
    }
    return true;
  });

  const geotaggedCount = defects.filter((d) => !!d.geoCoordinates).length;
  const photosCount = defects.filter((d) => !!d.photoAttachment).length;

  const aiPriorityCounts = {
    CRITICAL: defects.filter((d) => getDefectAiPriority(d) === 'CRITICAL').length,
    HIGH: defects.filter((d) => getDefectAiPriority(d) === 'HIGH').length,
    MEDIUM: defects.filter((d) => getDefectAiPriority(d) === 'MEDIUM').length,
    LOW: defects.filter((d) => getDefectAiPriority(d) === 'LOW').length,
    TOTAL: defects.filter((d) => !!getDefectAiPriority(d)).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bug className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Defect Reporting & Intelligence
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Screen 3: Operational defect logging feeds directly into AI priority weightings and maintenance block allocations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{aiPriorityCounts.TOTAL} AI EVALUATED</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-950/80 text-sky-300 border border-sky-800 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>{photosCount} WITH PHOTO</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-950/80 text-sky-300 border border-sky-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{geotaggedCount} GEOTAGGED</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
              {defects.length} DEFECTS LOGGED
            </span>
          </div>
        </div>
      </div>

      {/* Submission Success Banner */}
      {submissionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="w-full">
              <h4 className="text-sm font-bold text-emerald-200 font-mono">DEFECT REPORTED SUCCESSFULLY</h4>
              <p className="text-xs text-slate-300 mt-1">
                Defect ID: <strong className="font-mono text-emerald-300">{submissionSuccess.id}</strong> | Status:{' '}
                <span className="font-mono text-sky-300 px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800">
                  {submissionSuccess.status}
                </span>
              </p>

              {submissionSuccess.geoCoordinates && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[11px] block">Attached Site Geo-coordinates</span>
                      <strong className="text-emerald-300 font-mono">
                        {submissionSuccess.geoCoordinates.latitude.toFixed(6)}° N,{' '}
                        {submissionSuccess.geoCoordinates.longitude.toFixed(6)}° E
                      </strong>
                      <span className="text-slate-400 text-[11px] ml-1.5 font-mono">
                        (±{Math.round(submissionSuccess.geoCoordinates.accuracyMeters || 0)}m margin)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDefectForLocation({
                          defectId: submissionSuccess.id,
                          assetId: selectedAssetId,
                          department,
                          corridorId,
                          defectType,
                          severity,
                          detectedDate,
                          description,
                          reportedBy,
                          status: submissionSuccess.status as any,
                          geoCoordinates: submissionSuccess.geoCoordinates,
                          photoAttachment: submissionSuccess.photoAttachment,
                        });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-900/80 hover:bg-sky-800 text-sky-200 font-mono text-[11px] border border-sky-700 transition-colors cursor-pointer"
                      title="Inspect pinned location on full railway radar modal"
                    >
                      <Map className="w-3 h-3 text-sky-400" />
                      <span>Radar Map</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${submissionSuccess.geoCoordinates.latitude},${submissionSuccess.geoCoordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Maps</span>
                    </a>
                  </div>
                </div>
              )}

              {submissionSuccess.photoAttachment && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-emerald-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 rounded-lg overflow-hidden bg-black border border-slate-700 shrink-0">
                      <img
                        src={submissionSuccess.photoAttachment.dataUrl}
                        alt="Attached Evidence"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Attached Photo Evidence</span>
                      <strong className="text-emerald-300 font-mono text-[11px]">
                        {submissionSuccess.photoAttachment.source === 'CAMERA_CAPTURE'
                          ? 'Live Field Camera Snapshot Locked'
                          : submissionSuccess.photoAttachment.source === 'FIELD_PRESET'
                          ? 'Field Preset Record Attached'
                          : 'Uploaded Photographic Proof'}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const found = defects.find((d) => d.defectId === submissionSuccess.id);
                      if (found) {
                        setSelectedDefectForPhoto(found);
                      } else {
                        setSelectedDefectForPhoto({
                          defectId: submissionSuccess.id,
                          assetId: selectedAssetId,
                          department,
                          corridorId,
                          defectType,
                          severity,
                          detectedDate,
                          description,
                          reportedBy,
                          status: submissionSuccess.status as any,
                          geoCoordinates: submissionSuccess.geoCoordinates,
                          photoAttachment: submissionSuccess.photoAttachment,
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-900/80 hover:bg-sky-800 text-sky-200 font-mono text-[11px] border border-sky-700 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>View Evidence Fullscreen</span>
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-1.5">
                Defect sent to Python backend and registered for automatic maintenance prioritization.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-1 bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-4 pb-2 border-b border-slate-800">
            Log New Operational Defect
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Asset ID *</label>
              <select
                value={selectedAssetId}
                onChange={(e) => handleAssetSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} — {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="ENGINEERING">Engineering</option>
                  <option value="S&T">S&T</option>
                  <option value="TRACTION">Traction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Corridor</label>
                <select
                  value={corridorId}
                  onChange={(e) => setCorridorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  {corridors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Defect Classification *</label>
              <input
                type="text"
                value={defectType}
                onChange={(e) => setDefectType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Severity Level *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as PriorityLevel)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Speed Restriction</label>
                <input
                  type="number"
                  placeholder="e.g. 30 kmph"
                  value={speedRestriction || ''}
                  onChange={(e) => setSpeedRestriction(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Site Geolocation & GPS Capture Section */}
            <div className="pt-2 pb-1 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Site Geolocation & Spatial Identification</span>
                </label>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                  WGS-84 GNSS
                </span>
              </div>

              {/* Lightweight Interactive Map Preview Thumbnail with Track Kilometer-Post Confirmation */}
              <div className="mb-2.5">
                <DefectMapThumbnail
                  geoCoordinates={geoCoordinates}
                  onCoordinatesChange={(coords) => {
                    setGeoCoordinates(coords);
                    setGpsError(null);
                    setGpsSuccessMessage(`Track chainage updated: ${coords.railwayChainageKm || 'Locked'}`);
                  }}
                  corridorId={corridorId}
                  assetId={selectedAssetId}
                  defectType={defectType}
                  severity={severity}
                  onOpenFullModal={geoCoordinates ? handleOpenCurrentMapModal : undefined}
                />
              </div>

              {/* Geo-coordinates Display Card (When Captured) */}
              {geoCoordinates ? (
                <div className="p-3 rounded-lg bg-slate-950/90 border border-emerald-600/70 space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      GPS Locked (Precise Site ID)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ±{Math.round(geoCoordinates.accuracyMeters || 3)}m accuracy
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800 font-mono">
                    <div className="text-emerald-300 font-bold text-sm tracking-wide">
                      {geoCoordinates.latitude.toFixed(6)}° N, {geoCoordinates.longitude.toFixed(6)}° E
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                      <span className="text-amber-300">{geoCoordinates.railwayChainageKm}</span>
                      <span>Source: {geoCoordinates.source === 'GPS_DEVICE' ? 'GNSS Receiver' : 'Track Anchor'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={`https://www.google.com/maps?q=${geoCoordinates.latitude},${geoCoordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-sky-300 hover:text-sky-200 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Verify on Google Maps</span>
                    </a>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={capturingGps}
                        className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                        title="Re-acquire GPS fix"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-log</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearGps}
                        className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        title="Remove attached coordinates"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Primary 'Log Geo-coordinates' Button */
                <div className="space-y-2 mb-2">
                  <button
                    type="button"
                    id="btn-log-geo-coordinates"
                    onClick={handleCaptureGps}
                    disabled={capturingGps}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition-all border border-sky-400/40 cursor-pointer"
                    title="Capture device GPS position and attach to defect report"
                  >
                    {capturingGps ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-200" />
                        <span>Acquiring High-Precision GPS Lock...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-4 h-4 text-sky-200" />
                        <span>Log Geo-coordinates (Current Site)</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Uses high-accuracy GNSS/WGS-84 to pinpoint exact track KM, sleepers, and catenary masts for maintenance gangs.
                  </p>
                </div>
              )}

              {/* Feedback & Error Handling */}
              {gpsSuccessMessage && !geoCoordinates && (
                <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-1.5 mb-2">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{gpsSuccessMessage}</span>
                </div>
              )}

              {gpsError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-[11px] text-rose-300 space-y-2 mb-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{gpsError}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-900/60">
                    <button
                      type="button"
                      onClick={handleUseCorridorAnchor}
                      className="px-2 py-1 rounded bg-sky-900 hover:bg-sky-800 text-sky-200 text-[10px] font-mono border border-sky-700 transition-colors cursor-pointer"
                    >
                      Use Corridor Track Preset Fix
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualGpsInput(!showManualGpsInput)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                    >
                      {showManualGpsInput ? 'Hide Manual' : 'Enter Manual Coords'}
                    </button>
                  </div>
                </div>
              )}

              {/* Fallback Simulation / Manual Entry Trigger if no coordinates and no error */}
              {!geoCoordinates && !gpsError && !capturingGps && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Indoor control room or testing?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUseCorridorAnchor}
                      className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                    >
                      Use Track Anchor
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setShowManualGpsInput(!showManualGpsInput)}
                      className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Manual Lat/Long
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Coordinate Form */}
              {showManualGpsInput && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-300 block font-mono">
                    Manual Field Geodetic Entry
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Latitude (°N)</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="e.g. 28.644810"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Longitude (°E)</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="e.g. 77.225140"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Track Chainage Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. KM 28/4 Up Main"
                      value={manualChainage}
                      onChange={(e) => setManualChainage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualGpsInput(false)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyManualCoordinates}
                      className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]"
                    >
                      Apply Coordinates
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Detected Date *</label>
              <input
                type="date"
                value={detectedDate}
                onChange={(e) => setDetectedDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <VoiceDictationInput
              id="defect-description-input"
              value={description}
              onChange={setDescription}
              placeholder="Describe track anomaly, kilometer mark, mast number, observed vibration, loose fitting or visual signs..."
              required
              rows={3}
              label="Description"
            />

            {/* Camera Photo Capture & Attachment */}
            <DefectCameraCapture
              photo={photoAttachment}
              onPhotoChange={setPhotoAttachment}
              assetId={selectedAssetId}
              corridorId={corridorId}
              geoCoordinates={geoCoordinates}
              isAnalyzingAi={analyzingPhoto}
            />

            {/* Automatic AI Visual Priority Analysis */}
            <DefectAiPhotoAnalysisCard
              hasPhoto={!!photoAttachment}
              photoUrl={photoAttachment?.dataUrl}
              assetId={selectedAssetId}
              corridorId={corridorId}
              defectType={defectType}
              analysis={aiVisualAnalysis}
              analyzing={analyzingPhoto}
              currentSeverity={severity}
              onApplyPriority={(sev) => setSeverity(sev)}
              currentSpeedRestriction={speedRestriction}
              onApplySpeedRestriction={(spd) => setSpeedRestriction(spd)}
              onAppendToDescription={(notes) =>
                setDescription((prev) => (prev ? `${prev}\n${notes}` : notes))
              }
              onReanalyze={handleReanalyzePhoto}
            />

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reported By *</label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 mt-4 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting to Backend...' : 'SUBMIT DEFECT REPORT'}</span>
            </button>
          </form>
        </div>

        {/* Defects List (2 Columns) */}
        <div className="lg:col-span-2 bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Active Defect Registry ({defects.length} Tracked)
              </h3>
              <p className="text-[11px] text-slate-400">
                Defects detected by Track Recording Cars, OMS, and Footplate Patrols
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterGpsOnly(!filterGpsOnly)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border cursor-pointer ${
                  filterGpsOnly
                    ? 'bg-sky-900 text-sky-200 border-sky-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Filter to only defects with GPS coordinates"
              >
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>GPS Only ({geotaggedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterPhotosOnly(!filterPhotosOnly)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border cursor-pointer ${
                  filterPhotosOnly
                    ? 'bg-sky-900 text-sky-200 border-sky-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Filter to only defects with photo evidence"
              >
                <Camera className="w-3 h-3 text-sky-400" />
                <span>Photos ({photosCount})</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Defect, Asset, KM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono w-44 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                id="select-ai-priority-filter"
                value={
                  filterAiPriorities.length === 0
                    ? 'ALL'
                    : filterAiPriorities.length === 1
                    ? filterAiPriorities[0]
                    : 'MULTI'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL') {
                    setFilterAiPriorities([]);
                  } else if (val !== 'MULTI') {
                    setFilterAiPriorities([val as PriorityLevel]);
                  }
                  railwayAudio.playBeep(700, 0.04);
                }}
                className="bg-slate-900 border border-indigo-700/80 rounded px-2 py-1.5 text-xs text-indigo-200 font-mono focus:outline-none"
                title="Filter by AI Suggested Priority"
              >
                <option value="ALL">AI Priority: All</option>
                {filterAiPriorities.length > 1 && (
                  <option value="MULTI">AI: Custom ({filterAiPriorities.length} Active)</option>
                )}
                <option value="CRITICAL">AI: Critical ({aiPriorityCounts.CRITICAL})</option>
                <option value="HIGH">AI: High ({aiPriorityCounts.HIGH})</option>
                <option value="MEDIUM">AI: Medium ({aiPriorityCounts.MEDIUM})</option>
                <option value="LOW">AI: Low ({aiPriorityCounts.LOW})</option>
              </select>
            </div>
          </div>

          {/* AI Maintenance Priority Filtering Control Bar */}
          <div
            id="ai-priority-filter-control-panel"
            className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-slate-950 via-[#0c1326] to-slate-950 border border-indigo-900/60 shadow-inner"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-200">
                      AI Suggested Priority Filter
                    </span>
                    {filterAiPriorities.length > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-900/70 border border-indigo-600 text-indigo-200 text-[10px] font-mono">
                        {filterAiPriorities.join(' + ')} ({filteredDefects.length} shown)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        Showing all {defects.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-mono">
                    Toggle AI maintenance priority levels to filter defects diagnosed by vision and sensor pattern engines
                  </p>
                </div>
              </div>

              {filterAiPriorities.length > 0 && (
                <button
                  type="button"
                  id="btn-reset-ai-priority-filter"
                  onClick={() => {
                    setFilterAiPriorities([]);
                    railwayAudio.playBeep(650, 0.04);
                  }}
                  className="self-start sm:self-auto text-[11px] font-mono text-rose-300 hover:text-rose-200 underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset AI Filter</span>
                </button>
              )}
            </div>

            {/* Interactive Priority Toggle Chips */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 mr-1">Toggle Visibility:</span>

              {/* All Toggle */}
              <button
                type="button"
                id="btn-filter-ai-all"
                onClick={() => {
                  setFilterAiPriorities([]);
                  railwayAudio.playBeep(700, 0.04);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  filterAiPriorities.length === 0
                    ? 'bg-slate-100 text-slate-900 border-white shadow-md shadow-slate-950 font-bold'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>All Defects</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterAiPriorities.length === 0 ? 'bg-slate-900 text-slate-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {defects.length}
                </span>
              </button>

              {/* CRITICAL Toggle */}
              <button
                type="button"
                id="btn-filter-ai-critical"
                onClick={() => handleToggleAiPriority('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                  filterAiPriorities.includes('CRITICAL')
                    ? 'bg-rose-950 text-rose-100 border-rose-500 ring-1 ring-rose-500 shadow-md shadow-rose-950/60'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:border-rose-700/70 hover:text-rose-300'
                }`}
                title="Toggle visibility of AI suggested CRITICAL defects"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filterAiPriorities.includes('CRITICAL') ? 'bg-rose-400 animate-ping' : 'bg-rose-500'
                  }`}
                />
                <span>Critical</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    filterAiPriorities.includes('CRITICAL')
                      ? 'bg-rose-800 text-white'
                      : 'bg-slate-800 text-rose-300 border border-rose-900/50'
                  }`}
                >
                  {aiPriorityCounts.CRITICAL}
                </span>
              </button>

              {/* HIGH Toggle */}
              <button
                type="button"
                id="btn-filter-ai-high"
                onClick={() => handleToggleAiPriority('HIGH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                  filterAiPriorities.includes('HIGH')
                    ? 'bg-amber-950 text-amber-100 border-amber-500 ring-1 ring-amber-500 shadow-md shadow-amber-950/60'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:border-amber-700/70 hover:text-amber-300'
                }`}
                title="Toggle visibility of AI suggested HIGH defects"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filterAiPriorities.includes('HIGH') ? 'bg-amber-400 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <span>High</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    filterAiPriorities.includes('HIGH')
                      ? 'bg-amber-800 text-white'
                      : 'bg-slate-800 text-amber-300 border border-amber-900/50'
                  }`}
                >
                  {aiPriorityCounts.HIGH}
                </span>
              </button>

              {/* MEDIUM Toggle */}
              <button
                type="button"
                id="btn-filter-ai-medium"
                onClick={() => handleToggleAiPriority('MEDIUM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                  filterAiPriorities.includes('MEDIUM')
                    ? 'bg-sky-950 text-sky-100 border-sky-500 ring-1 ring-sky-500 shadow-md shadow-sky-950/60'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:border-sky-700/70 hover:text-sky-300'
                }`}
                title="Toggle visibility of AI suggested MEDIUM defects"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filterAiPriorities.includes('MEDIUM') ? 'bg-sky-400 animate-ping' : 'bg-sky-500'
                  }`}
                />
                <span>Medium</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    filterAiPriorities.includes('MEDIUM')
                      ? 'bg-sky-800 text-white'
                      : 'bg-slate-800 text-sky-300 border border-sky-900/50'
                  }`}
                >
                  {aiPriorityCounts.MEDIUM}
                </span>
              </button>

              {/* LOW Toggle */}
              <button
                type="button"
                id="btn-filter-ai-low"
                onClick={() => handleToggleAiPriority('LOW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                  filterAiPriorities.includes('LOW')
                    ? 'bg-emerald-950 text-emerald-100 border-emerald-500 ring-1 ring-emerald-500 shadow-md shadow-emerald-950/60'
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:border-emerald-700/70 hover:text-emerald-300'
                }`}
                title="Toggle visibility of AI suggested LOW defects"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filterAiPriorities.includes('LOW') ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                  }`}
                />
                <span>Low</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    filterAiPriorities.includes('LOW')
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-800 text-emerald-300 border border-emerald-900/50'
                  }`}
                >
                  {aiPriorityCounts.LOW}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Defect ID</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Logged Severity</th>
                  <th className="py-2.5 px-3">AI Suggested Priority</th>
                  <th className="py-2.5 px-3">Site GPS Location</th>
                  <th className="py-2.5 px-3">Site Photo</th>
                  <th className="py-2.5 px-3">Restriction</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredDefects.map((d) => {
                  const aiAnalysis = d.aiVisualAnalysis || d.photoAttachment?.aiAnalysis;
                  const aiPriority = aiAnalysis?.suggestedPriority;
                  const isAiFiltered = aiPriority && filterAiPriorities.includes(aiPriority);

                  return (
                    <tr
                      key={d.defectId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isAiFiltered ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-rose-300">{d.defectId}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">{d.assetId}</td>
                      <td className="py-2.5 px-3 text-slate-300">{d.corridorId}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[170px]" title={d.defectType}>
                        {d.defectType}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.severity === 'CRITICAL'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              : d.severity === 'HIGH'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : d.severity === 'MEDIUM'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {d.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {aiPriority ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAiPriority(aiPriority)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer ${
                              aiPriority === 'CRITICAL'
                                ? 'bg-rose-950/90 text-rose-200 border-rose-700 hover:border-rose-500'
                                : aiPriority === 'HIGH'
                                ? 'bg-amber-950/90 text-amber-200 border-amber-700 hover:border-amber-500'
                                : aiPriority === 'MEDIUM'
                                ? 'bg-sky-950/90 text-sky-200 border-sky-700 hover:border-sky-500'
                                : 'bg-emerald-950/90 text-emerald-200 border-emerald-700 hover:border-emerald-500'
                            } ${filterAiPriorities.includes(aiPriority) ? 'ring-1 ring-white/60 shadow-sm' : ''}`}
                            title={`AI suggested priority: ${aiPriority} (${aiAnalysis?.confidencePercent || 90}% confidence)\nClick to filter/toggle visibility`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                            <span>{aiPriority}</span>
                            {aiAnalysis?.confidencePercent && (
                              <span className="text-[9px] opacity-75 font-normal">
                                {aiAnalysis.confidencePercent}%
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono italic">
                            No AI Suggestion
                          </span>
                        )}
                      </td>
                    <td className="py-2.5 px-3">
                      {d.geoCoordinates ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDefectForLocation(d)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-sky-950/90 hover:bg-sky-900 border border-sky-700/80 text-sky-300 text-[10px] font-mono transition-colors cursor-pointer group"
                          title="Click to view precise geodetic coordinates, map & track chainage"
                        >
                          <MapPin className="w-3 h-3 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="font-bold">
                            {d.geoCoordinates.latitude.toFixed(4)}°, {d.geoCoordinates.longitude.toFixed(4)}°
                          </span>
                          <span className="text-[9px] text-emerald-300 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-700">
                            ±{Math.round(d.geoCoordinates.accuracyMeters || 3)}m
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">No GPS Fix</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {d.photoAttachment ? (
                        <button
                          type="button"
                          id={`btn-view-photo-${d.defectId}`}
                          onClick={() => setSelectedDefectForPhoto(d)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-sky-950 border border-sky-600/70 text-sky-300 text-[10px] font-mono transition-colors cursor-pointer group"
                          title="Click to inspect field defect photo evidence"
                        >
                          <div className="w-5 h-5 rounded overflow-hidden bg-black shrink-0 border border-slate-700">
                            <img
                              src={d.photoAttachment.dataUrl}
                              alt={d.defectId}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="font-bold hidden sm:inline">Photo</span>
                          <Eye className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">No Photo</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {d.speedRestrictionKmph ? `${d.speedRestrictionKmph} km/h` : 'None'}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400">
                      {d.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Precise Defect Site Identification Map Modal */}
      <DefectLocationMapModal
        defect={selectedDefectForLocation}
        onClose={() => setSelectedDefectForLocation(null)}
      />

      {/* Defect Photographic Evidence Modal */}
      <DefectPhotoModal
        defect={selectedDefectForPhoto}
        onClose={() => setSelectedDefectForPhoto(null)}
      />
    </div>
  );
};

