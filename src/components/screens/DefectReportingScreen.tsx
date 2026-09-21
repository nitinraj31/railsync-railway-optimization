import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Radio,
  Bell,
  Volume2,
  FileText,
  Printer,
  Download,
  QrCode,
  Clock,
  Zap,
  ArrowUpDown,
  Flame,
  TrendingUp,
  Activity,
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
  SupervisorPushAlert,
} from '../../types';
import { submitDefect } from '../../services/api';
import { DefectLocationMapModal } from '../common/DefectLocationMapModal';
import { VoiceDictationInput } from '../common/VoiceDictationInput';
import { DefectCameraCapture } from '../common/DefectCameraCapture';
import { DefectPhotoModal } from '../common/DefectPhotoModal';
import { DefectMapThumbnail } from '../common/DefectMapThumbnail';
import { DefectAiPhotoAnalysisCard } from '../common/DefectAiPhotoAnalysisCard';
import { DefectInspectionReportModal } from '../modals/DefectInspectionReportModal';
import { DefectQrCodeModal } from '../modals/DefectQrCodeModal';
import { DefectPredictiveTimelineMap } from '../predictive/DefectPredictiveTimelineMap';
import { DefectGeospatialClusterMap } from '../common/DefectGeospatialClusterMap';
import { predictAssetCriticality } from '../../services/defectPredictiveCriticalityService';
import {
  calculatePredictiveRiskScore,
  calculateBatchPredictiveRiskScores,
  PredictiveRiskScoreResult,
} from '../../services/predictiveRiskScoringService';
import { PredictiveRiskScoreDetailModal } from '../modals/PredictiveRiskScoreDetailModal';
import { analyzeDefectPhotoWithAi } from '../../services/defectVisionAiService';
import { railwayAudio } from '../../services/railwayAudio';
import { SupervisorPushAlertBanner } from '../common/SupervisorPushAlertBanner';
import {
  dispatchCriticalDefectPushAlert,
  getStoredPushAlerts,
  subscribeToSupervisorAlerts,
  requestPushNotificationPermission,
} from '../../services/supervisorPushNotificationService';

// Asset-Type Filter Definition (Track, OHE, S&T)
export type AssetTypeFilter = 'ALL' | 'TRACK' | 'OHE' | 'ST';

export function matchesAssetType(defect: Defect, filter: AssetTypeFilter): boolean {
  if (filter === 'ALL') return true;
  const dept = (defect.department || '').toUpperCase();
  if (filter === 'TRACK') {
    return dept === 'ENGINEERING' || dept === 'TRACK' || dept === 'CIVIL' || dept === 'P-WAY';
  }
  if (filter === 'OHE') {
    return dept === 'TRACTION' || dept === 'OHE' || dept === 'TRD' || dept === 'ELECTRICAL';
  }
  if (filter === 'ST') {
    return dept === 'S&T' || dept === 'SIGNAL' || dept === 'TELECOM' || dept === 'ST';
  }
  return true;
}

interface DefectReportingScreenProps {
  currentUser: User | null;
  assets: Asset[];
  corridors: Corridor[];
  defects: Defect[];
  onRefreshDefects: () => void;
  initialSelectedDefectId?: string;
}

export const DefectReportingScreen: React.FC<DefectReportingScreenProps> = ({
  currentUser,
  assets,
  corridors,
  defects,
  onRefreshDefects,
  initialSelectedDefectId,
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

  // Supervisor Emergency Push Alert state
  const [activeSupervisorAlert, setActiveSupervisorAlert] = useState<SupervisorPushAlert | null>(null);

  // Subscribe to real-time supervisor push alerts (including across browser tabs)
  useEffect(() => {
    // Check initial stored unacknowledged alert
    const stored = getStoredPushAlerts();
    const unacked = stored.find((a) => a.deliveryStatus !== 'ACKNOWLEDGED');
    if (unacked) {
      setActiveSupervisorAlert(unacked);
    }

    // Subscribe to incoming push alerts broadcast
    const unsubscribe = subscribeToSupervisorAlerts((alert) => {
      setActiveSupervisorAlert(alert);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Table & Dashboard Filters
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterGpsOnly, setFilterGpsOnly] = useState(false);
  const [filterPhotosOnly, setFilterPhotosOnly] = useState(false);
  const [filterAiPriorities, setFilterAiPriorities] = useState<PriorityLevel[]>([]);
  const [sortByAiUrgency, setSortByAiUrgency] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handler for Asset-Type toggle with sound and dept synchronization
  const handleAssetTypeFilterChange = useCallback((newFilter: AssetTypeFilter) => {
    setAssetTypeFilter(newFilter);
    if (newFilter === 'TRACK') setFilterDept('ENGINEERING');
    else if (newFilter === 'OHE') setFilterDept('TRACTION');
    else if (newFilter === 'ST') setFilterDept('S&T');
    else setFilterDept('ALL');
    railwayAudio.playBeep(750, 0.04);
  }, []);

  // Compute breakdown of defects by asset type group
  const assetGroupCounts = useMemo(() => {
    let track = 0;
    let ohe = 0;
    let st = 0;
    let trackCrit = 0;
    let oheCrit = 0;
    let stCrit = 0;

    for (const d of defects) {
      const dept = (d.department || '').toUpperCase();
      const isCrit = d.severity === 'CRITICAL';
      if (dept === 'ENGINEERING' || dept === 'TRACK' || dept === 'CIVIL' || dept === 'P-WAY') {
        track++;
        if (isCrit) trackCrit++;
      } else if (dept === 'TRACTION' || dept === 'OHE' || dept === 'TRD' || dept === 'ELECTRICAL') {
        ohe++;
        if (isCrit) oheCrit++;
      } else if (dept === 'S&T' || dept === 'SIGNAL' || dept === 'TELECOM' || dept === 'ST') {
        st++;
        if (isCrit) stCrit++;
      }
    }

    return {
      ALL: defects.length,
      ALL_CRIT: defects.filter((d) => d.severity === 'CRITICAL').length,
      TRACK: track,
      TRACK_CRIT: trackCrit,
      OHE: ohe,
      OHE_CRIT: oheCrit,
      ST: st,
      ST_CRIT: stCrit,
    };
  }, [defects]);

  // Subset of defects isolated by Asset-Type for map markers and cluster recalculation
  const assetTypeFilteredDefects = useMemo(() => {
    if (assetTypeFilter === 'ALL') return defects;
    return defects.filter((d) => matchesAssetType(d, assetTypeFilter));
  }, [defects, assetTypeFilter]);

  // Predictive Risk Score & 30-Day Criticality Forecast States
  const [selectedDefectForRiskScore, setSelectedDefectForRiskScore] = useState<PredictiveRiskScoreResult | null>(null);
  const [filterForecastCritical30DaysOnly, setFilterForecastCritical30DaysOnly] = useState<boolean>(false);
  const [sortByPredictiveRisk, setSortByPredictiveRisk] = useState<'NONE' | 'DESC' | 'ASC'>('NONE');

  // Compute Predictive Risk Batch Metrics (Historical Asset Failure Rates + Corridor Age)
  const predictiveRiskBatch = useMemo(() => {
    return calculateBatchPredictiveRiskScores(defects, assets, corridors);
  }, [defects, assets, corridors]);

  // Screen View Mode: Active Defect Registry vs Network Geospatial Map vs Predictive Timeline Map
  const [activeViewTab, setActiveViewTab] = useState<'REGISTRY' | 'GEOSPATIAL_MAP' | 'PREDICTIVE_TIMELINE'>('REGISTRY');
  const [selectedDefectForPredictiveTimeline, setSelectedDefectForPredictiveTimeline] = useState<string | undefined>(undefined);
  const [filteredClusterDefectIds, setFilteredClusterDefectIds] = useState<string[] | null>(null);

  // Calculate count of assets projected to reach CRITICAL state within 7 days
  const criticalHorizonAssetsCount = useMemo(() => {
    return defects.filter((d) => {
      const pred = predictAssetCriticality(d, defects);
      return pred.daysUntilCritical <= 7;
    }).length;
  }, [defects]);

  // PDF Maintenance Inspection Report state
  const [isPdfReportModalOpen, setIsPdfReportModalOpen] = useState(false);
  const [pdfReportCustomDefects, setPdfReportCustomDefects] = useState<Defect[] | null>(null);
  const [pdfReportCustomTitle, setPdfReportCustomTitle] = useState<string | null>(null);

  const handleOpenPdfReport = (customDefects?: Defect[], customTitle?: string) => {
    setPdfReportCustomDefects(customDefects || null);
    setPdfReportCustomTitle(customTitle || null);
    setIsPdfReportModalOpen(true);
    railwayAudio.playBeep(840, 0.05);
  };

  // Field QR Code & Safety Protocols state
  const [selectedDefectForQr, setSelectedDefectForQr] = useState<Defect | null>(null);

  // Auto-open QR & Safety Protocols if navigated with deep link (?defectId=... or hash)
  useEffect(() => {
    if (initialSelectedDefectId && defects.length > 0) {
      const found = defects.find((d) => d.defectId === initialSelectedDefectId);
      if (found) {
        setSelectedDefectForQr(found);
      }
    } else if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const urlDefectId = params.get('defectId');
      if (urlDefectId && defects.length > 0) {
        const found = defects.find((d) => d.defectId === urlDefectId);
        if (found) {
          setSelectedDefectForQr(found);
        }
      }
    }
  }, [initialSelectedDefectId, defects]);

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

      // If defect is CRITICAL, immediately dispatch push notification to nearby maintenance supervisors
      if (severity === 'CRITICAL' || created.severity === 'CRITICAL') {
        try {
          const pushAlert = await dispatchCriticalDefectPushAlert({
            defectId: created.defectId,
            corridorId: created.corridorId,
            section: created.geoCoordinates?.railwayChainageKm || `Corridor ${created.corridorId} Section`,
            chainageKm: created.geoCoordinates?.railwayChainageKm,
            defectType: created.defectType,
            description: created.description,
            reportedBy: created.reportedBy,
            geoCoordinates: created.geoCoordinates,
            speedRestrictionKmph: created.speedRestrictionKmph,
            department: created.department,
          });
          setActiveSupervisorAlert(pushAlert);
        } catch (pushErr) {
          console.error('Failed to dispatch supervisor push alert:', pushErr);
        }
      }

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
  const getDefectAiPriority = (d: Defect): PriorityLevel => {
    return (
      d.aiVisualAnalysis?.suggestedPriority ||
      d.photoAttachment?.aiAnalysis?.suggestedPriority ||
      (d.severity as PriorityLevel)
    );
  };

  const currentAiDropdownValue = useMemo(() => {
    if (filterAiPriorities.length === 0) return 'ALL';
    if (
      filterAiPriorities.length === 2 &&
      filterAiPriorities.includes('CRITICAL') &&
      filterAiPriorities.includes('HIGH')
    ) {
      return 'URGENT';
    }
    if (filterAiPriorities.length === 1) {
      return filterAiPriorities[0];
    }
    return 'MULTI';
  }, [filterAiPriorities]);

  const handleAiPriorityDropdownChange = (val: string) => {
    railwayAudio.playBeep(700, 0.04);
    if (val === 'ALL') {
      setFilterAiPriorities([]);
    } else if (val === 'URGENT') {
      setFilterAiPriorities(['CRITICAL', 'HIGH']);
    } else if (val === 'CRITICAL' || val === 'HIGH' || val === 'MEDIUM' || val === 'LOW') {
      setFilterAiPriorities([val as PriorityLevel]);
    }
  };

  const handleQuickFocusUrgent = () => {
    railwayAudio.playStationChime();
    if (
      filterAiPriorities.length === 2 &&
      filterAiPriorities.includes('CRITICAL') &&
      filterAiPriorities.includes('HIGH')
    ) {
      // Toggle to CRITICAL only
      setFilterAiPriorities(['CRITICAL']);
    } else if (
      filterAiPriorities.length === 1 &&
      filterAiPriorities[0] === 'CRITICAL'
    ) {
      // If already critical, clear filter
      setFilterAiPriorities([]);
    } else {
      // Focus on Urgent (CRITICAL & HIGH)
      setFilterAiPriorities(['CRITICAL', 'HIGH']);
    }
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

  const filteredDefects = useMemo(() => {
    const list = defects.filter((d) => {
      if (filteredClusterDefectIds && !filteredClusterDefectIds.includes(d.defectId)) {
        return false;
      }
      // Asset-Type Isolation Filter: Track (P-Way), OHE (Traction), or S&T (Signaling)
      if (assetTypeFilter !== 'ALL' && !matchesAssetType(d, assetTypeFilter)) {
        return false;
      }
      if (filterSeverity !== 'ALL' && d.severity !== filterSeverity) return false;
      if (filterDept !== 'ALL' && d.department !== filterDept) return false;
      if (filterGpsOnly && !d.geoCoordinates) return false;
      if (filterPhotosOnly && !d.photoAttachment) return false;

      // 30-Day Criticality Forecast Filter: Isolates non-critical defects forecasted to become critical within 30 days
      if (filterForecastCritical30DaysOnly) {
        const risk = predictiveRiskBatch.scoresMap.get(d.defectId);
        if (!risk || !risk.isLikelyCriticalWithin30Days || risk.isCurrentlyCritical) {
          return false;
        }
      }

      // AI Maintenance Priority Level Filtering
      if (filterAiPriorities.length > 0) {
        const aiPriority = getDefectAiPriority(d);
        if (!filterAiPriorities.includes(aiPriority)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const coordsMatch = d.geoCoordinates
          ? `${d.geoCoordinates.latitude} ${d.geoCoordinates.longitude} ${d.geoCoordinates.railwayChainageKm || ''}`.toLowerCase().includes(q)
          : false;
        const aiPriorityMatch = getDefectAiPriority(d).toLowerCase().includes(q);
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

    // Sort by Predictive Risk Score (30-Day Criticality Horizon)
    if (sortByPredictiveRisk !== 'NONE') {
      return [...list].sort((a, b) => {
        const scoreA = predictiveRiskBatch.scoresMap.get(a.defectId)?.predictiveRiskScore ?? 0;
        const scoreB = predictiveRiskBatch.scoresMap.get(b.defectId)?.predictiveRiskScore ?? 0;
        if (scoreB !== scoreA) {
          return sortByPredictiveRisk === 'DESC' ? scoreB - scoreA : scoreA - scoreB;
        }
        return b.defectId.localeCompare(a.defectId);
      });
    }

    if (sortByAiUrgency) {
      const PRIORITY_ORDER: Record<PriorityLevel, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };
      return [...list].sort((a, b) => {
        const pA = PRIORITY_ORDER[getDefectAiPriority(a)] || 0;
        const pB = PRIORITY_ORDER[getDefectAiPriority(b)] || 0;
        if (pB !== pA) {
          return pB - pA;
        }
        return b.defectId.localeCompare(a.defectId);
      });
    }

    return list;
  }, [
    defects,
    assetTypeFilter,
    filterSeverity,
    filterDept,
    filterGpsOnly,
    filterPhotosOnly,
    filterAiPriorities,
    filterForecastCritical30DaysOnly,
    searchQuery,
    sortByAiUrgency,
    sortByPredictiveRisk,
    predictiveRiskBatch,
    filteredClusterDefectIds,
  ]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filteredClusterDefectIds) parts.push(`Cluster Filter (${filteredClusterDefectIds.length} defects)`);
    if (assetTypeFilter !== 'ALL') {
      const assetLabel =
        assetTypeFilter === 'TRACK' ? 'Track (P-Way)' : assetTypeFilter === 'OHE' ? 'OHE (Traction)' : 'S&T (Signaling)';
      parts.push(`Asset Group: ${assetLabel}`);
    }
    if (filterForecastCritical30DaysOnly) parts.push('Forecast: Critical in ≤30d (Non-Critical)');
    if (filterSeverity !== 'ALL') parts.push(`Severity: ${filterSeverity}`);
    if (filterDept !== 'ALL') parts.push(`Dept: ${filterDept}`);
    if (filterGpsOnly) parts.push('GPS Tagged Only');
    if (filterPhotosOnly) parts.push('Photo Evidence Only');
    if (filterAiPriorities.length > 0) parts.push(`AI Priority: ${filterAiPriorities.join('/')}`);
    if (sortByPredictiveRisk !== 'NONE') parts.push(`Risk Score Sort (${sortByPredictiveRisk})`);
    if (sortByAiUrgency) parts.push('Sorted: Urgent First');
    if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
    return parts.length > 0 ? parts.join(' | ') : 'All Active Track Defects';
  }, [
    assetTypeFilter,
    filterSeverity,
    filterDept,
    filterGpsOnly,
    filterPhotosOnly,
    filterAiPriorities,
    filterForecastCritical30DaysOnly,
    sortByAiUrgency,
    sortByPredictiveRisk,
    searchQuery,
    filteredClusterDefectIds,
  ]);

  const geotaggedCount = defects.filter((d) => !!d.geoCoordinates).length;
  const photosCount = defects.filter((d) => !!d.photoAttachment).length;

  const aiPriorityCounts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    defects.forEach((d) => {
      const p = getDefectAiPriority(d);
      if (p === 'CRITICAL') critical++;
      else if (p === 'HIGH') high++;
      else if (p === 'MEDIUM') medium++;
      else if (p === 'LOW') low++;
    });
    return {
      CRITICAL: critical,
      HIGH: high,
      MEDIUM: medium,
      LOW: low,
      URGENT: critical + high,
      TOTAL: defects.length,
    };
  }, [defects]);

  // Proactive criticality prediction for currently selected asset in reporting form
  const activeFormPrediction = useMemo(() => {
    const dummy: Defect = {
      defectId: 'FORM-PREVIEW',
      assetId: selectedAssetId || (assets[0]?.id || 'A001'),
      department,
      corridorId,
      defectType: defectType || 'General Track Wear',
      severity,
      detectedDate: detectedDate || '2026-09-13',
      description: description || 'Form inspection observation',
      reportedBy: reportedBy || 'Inspector',
      status: 'PENDING_PRIORITY_ANALYSIS',
      geoCoordinates,
    };
    return predictAssetCriticality(dummy, defects);
  }, [selectedAssetId, assets, department, corridorId, defectType, severity, detectedDate, description, reportedBy, geoCoordinates, defects]);

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-switch-to-geospatial-cluster-map"
              onClick={() => {
                setActiveViewTab(activeViewTab === 'GEOSPATIAL_MAP' ? 'REGISTRY' : 'GEOSPATIAL_MAP');
                railwayAudio.playBeep(750, 0.05);
              }}
              className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border ${
                activeViewTab === 'GEOSPATIAL_MAP'
                  ? 'bg-rose-900 text-white border-rose-500 ring-1 ring-rose-400'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-700'
              }`}
              title="Open Geospatial Cluster Radar & Critical Defect Density Heatmap Layer"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>CLUSTER HEATMAP</span>
            </button>
            <button
              type="button"
              id="btn-switch-to-predictive-map"
              onClick={() => {
                setActiveViewTab(activeViewTab === 'PREDICTIVE_TIMELINE' ? 'REGISTRY' : 'PREDICTIVE_TIMELINE');
                railwayAudio.playBeep(880, 0.05);
              }}
              className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border ${
                activeViewTab === 'PREDICTIVE_TIMELINE'
                  ? 'bg-rose-900 text-white border-rose-500'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-700'
              }`}
              title="Toggle Predictive Maintenance Timeline on Map"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {criticalHorizonAssetsCount > 0
                  ? `${criticalHorizonAssetsCount} CRITICAL HORIZON (<7D)`
                  : 'PREDICTIVE MAP'}
              </span>
            </button>
            <button
              type="button"
              id="btn-open-pdf-inspection-report-top"
              onClick={() => {
                setIsPdfReportModalOpen(true);
                railwayAudio.playBeep(840, 0.05);
              }}
              className="text-xs font-mono px-3 py-1 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/60"
              title="Generate and download formatted PDF Maintenance Inspection Report for current defects"
            >
              <FileText className="w-3.5 h-3.5 text-slate-950" />
              <span>PDF INSPECTION REPORT</span>
            </button>
            <button
              type="button"
              id="btn-test-supervisor-push"
              onClick={async () => {
                await requestPushNotificationPermission();
                const alert = await dispatchCriticalDefectPushAlert({
                  defectId: `DEF-CRIT-${Math.floor(100 + Math.random() * 900)}`,
                  corridorId: corridorId || 'COR-SBC-MYS',
                  section: geoCoordinates?.railwayChainageKm || 'KM 28.4/4 Up Main',
                  chainageKm: geoCoordinates?.railwayChainageKm || 'KM 28.4/4 Up Main',
                  defectType: defectType || 'Critical Track Weld Fracture / Rail Separation',
                  description:
                    description ||
                    'Transverse fissuring observed at thermite weld junction under dynamic 25T axle load. Immediate supervisor inspection required.',
                  reportedBy: reportedBy || currentUser?.name || 'Section Safety Auditor',
                  geoCoordinates: geoCoordinates || undefined,
                  speedRestrictionKmph: 30,
                  department: department || 'ENGINEERING',
                });
                setActiveSupervisorAlert(alert);
              }}
              className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Simulate dispatching a Critical Defect push alert to nearby track maintenance supervisors"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>TEST SUPERVISOR PUSH</span>
            </button>
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

      {/* Real-time Push Notification Alert Banner for Maintenance Supervisors */}
      {activeSupervisorAlert && (
        <SupervisorPushAlertBanner
          alert={activeSupervisorAlert}
          onDismiss={() => setActiveSupervisorAlert(null)}
        />
      )}

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

              {/* On-Site Field QR Placard Generation Banner */}
              <div className="mt-3 pt-2.5 border-t border-emerald-900/60 flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-[11px] text-slate-300 font-mono">
                  Defect logged into RailSync ITMS. Generate an on-site field QR placard for track crews:
                </span>
                <button
                  type="button"
                  id="btn-success-view-qr"
                  onClick={() => {
                    const found = defects.find((d) => d.defectId === submissionSuccess.id);
                    if (found) {
                      setSelectedDefectForQr(found);
                    } else {
                      setSelectedDefectForQr({
                        defectId: submissionSuccess.id,
                        assetId: selectedAssetId,
                        department,
                        corridorId,
                        defectType,
                        severity,
                        detectedDate,
                        description,
                        reportedBy,
                        speedRestrictionKmph: speedRestriction,
                        status: submissionSuccess.status as any,
                        geoCoordinates: submissionSuccess.geoCoordinates,
                        photoAttachment: submissionSuccess.photoAttachment,
                      });
                    }
                    railwayAudio.playBeep(880, 0.05);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-mono text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generate Field QR Placard &amp; Safety Protocols</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5">
                Defect sent to Python backend and registered for automatic maintenance prioritization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Asset-Type Filter Toggle Bar: Isolate Track, OHE, or S&T */}
      <div className="p-3.5 bg-[#0a1122] rounded-xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-sky-300 font-mono text-xs font-bold uppercase tracking-wider shadow-inner">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Asset-Type Filter</span>
          </div>
          <span className="text-[11.5px] text-slate-400 font-mono">
            Isolate defects by railway asset group to immediately update map markers &amp; table view:
          </span>
        </div>

        {/* Toggle Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/90 rounded-lg border border-slate-800 font-mono">
          {/* ALL Assets */}
          <button
            type="button"
            id="btn-asset-filter-all"
            onClick={() => handleAssetTypeFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              assetTypeFilter === 'ALL'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Show all asset groups (Track, OHE, and S&T)"
          >
            <span>All Assets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                assetTypeFilter === 'ALL' ? 'bg-sky-800 text-white font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {assetGroupCounts.ALL}
            </span>
          </button>

          {/* Track (P-Way Engineering) */}
          <button
            type="button"
            id="btn-asset-filter-track"
            onClick={() => handleAssetTypeFilterChange(assetTypeFilter === 'TRACK' ? 'ALL' : 'TRACK')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              assetTypeFilter === 'TRACK'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-500 ring-2 ring-emerald-500/70 shadow-lg shadow-emerald-950/80'
                : 'bg-slate-900/60 text-emerald-400/90 border-slate-800 hover:border-emerald-700/60 hover:text-emerald-300'
            }`}
            title="Isolate Track defects: Rails, Sleepers, Ballast, Turnouts, Fastenings, Civil formations"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Track</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                assetTypeFilter === 'TRACK'
                  ? 'bg-emerald-800 text-white font-bold'
                  : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {assetGroupCounts.TRACK}
            </span>
            {assetGroupCounts.TRACK_CRIT > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                title={`${assetGroupCounts.TRACK_CRIT} Critical Track defects`}
              />
            )}
          </button>

          {/* OHE (Traction 25kV) */}
          <button
            type="button"
            id="btn-asset-filter-ohe"
            onClick={() => handleAssetTypeFilterChange(assetTypeFilter === 'OHE' ? 'ALL' : 'OHE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              assetTypeFilter === 'OHE'
                ? 'bg-amber-950 text-amber-100 border-amber-500 ring-2 ring-amber-500/70 shadow-lg shadow-amber-950/80'
                : 'bg-slate-900/60 text-amber-400/90 border-slate-800 hover:border-amber-700/60 hover:text-amber-300'
            }`}
            title="Isolate OHE defects: 25kV Catenary, Contact Wires, Droppers, Cantilevers, Insulators, Mast structures"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>OHE</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                assetTypeFilter === 'OHE'
                  ? 'bg-amber-800 text-white font-bold'
                  : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
              }`}
            >
              {assetGroupCounts.OHE}
            </span>
            {assetGroupCounts.OHE_CRIT > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                title={`${assetGroupCounts.OHE_CRIT} Critical OHE defects`}
              />
            )}
          </button>

          {/* S&T (Signaling & Telecom) */}
          <button
            type="button"
            id="btn-asset-filter-st"
            onClick={() => handleAssetTypeFilterChange(assetTypeFilter === 'ST' ? 'ALL' : 'ST')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              assetTypeFilter === 'ST'
                ? 'bg-cyan-950 text-cyan-100 border-cyan-500 ring-2 ring-cyan-500/70 shadow-lg shadow-cyan-950/80'
                : 'bg-slate-900/60 text-cyan-400/90 border-slate-800 hover:border-cyan-700/60 hover:text-cyan-300'
            }`}
            title="Isolate S&T defects: Point Machines, Track Circuits, Axle Counters, Color Light Signals, Electronic Interlocking"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>S&amp;T</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                assetTypeFilter === 'ST'
                  ? 'bg-cyan-800 text-white font-bold'
                  : 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60'
              }`}
            >
              {assetGroupCounts.ST}
            </span>
            {assetGroupCounts.ST_CRIT > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                title={`${assetGroupCounts.ST_CRIT} Critical S&T defects`}
              />
            )}
          </button>
        </div>
      </div>

      {/* Active Asset-Type Isolation Banner */}
      {assetTypeFilter !== 'ALL' && (
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 font-mono text-xs text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <span>
              <strong className="text-sky-300 font-bold uppercase tracking-wider">
                Asset Isolation Active:
              </strong>{' '}
              Showing only{' '}
              <span className="text-white font-bold underline">
                {assetTypeFilter === 'TRACK'
                  ? 'Track (P-Way Engineering)'
                  : assetTypeFilter === 'OHE'
                  ? 'OHE (25kV Traction)'
                  : 'S&T (Signaling & Telecom)'}
              </span>{' '}
              defects ({filteredDefects.length} of {defects.length} total). Geospatial radar map markers, clusters, and registry table are synchronized.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleAssetTypeFilterChange('ALL')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            Clear Asset Filter (Show All) ✕
          </button>
        </div>
      )}

      {/* Top View Mode Switcher: Active Defect Registry vs Network Cluster & Critical Heatmap vs Predictive Timeline Map */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#0a1122] rounded-xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-view-mode-registry"
            onClick={() => {
              setActiveViewTab('REGISTRY');
              railwayAudio.playBeep(600, 0.04);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'REGISTRY'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Active Defect Registry &amp; Logging</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900/80 text-[10px] text-sky-200 border border-slate-700">
              {assetTypeFilter === 'ALL' ? defects.length : `${filteredDefects.length} / ${defects.length}`}
            </span>
          </button>

          {/* GEOSPATIAL CLUSTER RADAR & CRITICAL HEATMAP TAB */}
          <button
            type="button"
            id="btn-view-mode-geospatial-map"
            onClick={() => {
              setActiveViewTab('GEOSPATIAL_MAP');
              railwayAudio.playBeep(750, 0.05);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'GEOSPATIAL_MAP'
                ? 'bg-gradient-to-r from-rose-800 via-rose-700 to-sky-700 text-white shadow-md ring-1 ring-rose-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Network Cluster Map &amp; Critical Heatmap</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-200 border border-rose-600 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>{assetTypeFilteredDefects.filter((d) => d.severity === 'CRITICAL').length} Critical</span>
            </span>
          </button>

          <button
            type="button"
            id="btn-view-mode-predictive-timeline"
            onClick={() => {
              setActiveViewTab('PREDICTIVE_TIMELINE');
              railwayAudio.playBeep(880, 0.05);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'PREDICTIVE_TIMELINE'
                ? 'bg-gradient-to-r from-rose-700 to-amber-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Predictive Criticality Timeline Map</span>
            {criticalHorizonAssetsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-200 border border-rose-600 text-[10px] animate-pulse font-bold">
                {criticalHorizonAssetsCount} Near Critical (&lt;7d)
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden md:flex items-center gap-2">
          {activeViewTab === 'GEOSPATIAL_MAP' ? (
            <span className="text-rose-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
              <span>Geospatial Clustering &amp; Critical Density Heatmap Layer Active</span>
            </span>
          ) : activeViewTab === 'PREDICTIVE_TIMELINE' ? (
            <span className="text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Historical Pattern Degradation Forecast • 30-Day Simulation &amp; Caution Orders</span>
            </span>
          ) : (
            <span>
              Real-time ITMS Defect Logging, Geodetic Radar &amp; Field QR Placards
            </span>
          )}
        </div>
      </div>

      {activeViewTab === 'PREDICTIVE_TIMELINE' ? (
        <DefectPredictiveTimelineMap
          defects={assetTypeFilteredDefects}
          selectedDefectId={selectedDefectForPredictiveTimeline}
          onSelectDefect={(id) => setSelectedDefectForPredictiveTimeline(id)}
          onOpenDefectLocationModal={(d) => setSelectedDefectForLocation(d)}
          onScheduleBlockSuccess={() => onRefreshDefects()}
        />
      ) : activeViewTab === 'GEOSPATIAL_MAP' ? (
        <DefectGeospatialClusterMap
          defects={assetTypeFilteredDefects}
          activeAssetTypeFilter={assetTypeFilter}
          onAssetTypeFilterChange={(filter) => handleAssetTypeFilterChange(filter)}
          onSelectDefect={(id) => {
            const found = defects.find((d) => d.defectId === id);
            if (found) setSelectedDefectForLocation(found);
          }}
          onOpenDefectLocationModal={(d) => setSelectedDefectForLocation(d)}
          onOpenDefectPhotoModal={(d) => setSelectedDefectForPhoto(d)}
          onFilterRegistryByCluster={(defectIds) => {
            setFilteredClusterDefectIds(defectIds);
            setActiveViewTab('REGISTRY');
            railwayAudio.playBeep(700, 0.05);
          }}
          onOpenPdfReportModal={(customDefects, customTitle) => {
            handleOpenPdfReport(customDefects, customTitle);
          }}
        />
      ) : (
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

              {/* Historical Defect Pattern Criticality Forecast for this Asset/Defect */}
              <div className="mb-2.5 p-2.5 rounded-lg bg-[#0b1426] border border-amber-500/40 text-[11px] font-mono space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Predictive Criticality Forecast</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                    CRITICAL in ~{activeFormPrediction.daysUntilCritical.toFixed(1)}d
                  </span>
                </div>
                <p className="text-slate-300 text-[10px] leading-relaxed">
                  Based on historical defect patterns for asset <strong className="text-white">{selectedAssetId}</strong> ({activeFormPrediction.historicalDefectCount} past records), failure reaches CRITICAL state by <strong className="text-rose-300">{activeFormPrediction.predictedCriticalDate}</strong>.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] text-slate-400">
                    Degradation: ~{activeFormPrediction.dailyDegradationRate}%/day
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab('PREDICTIVE_TIMELINE');
                      railwayAudio.playBeep(880, 0.04);
                    }}
                    className="px-2 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-600 text-sky-200 text-[9.5px] font-bold transition-all cursor-pointer"
                  >
                    View Timeline Map →
                  </button>
                </div>
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

              <button
                type="button"
                id="btn-registry-export-pdf"
                onClick={() => {
                  setIsPdfReportModalOpen(true);
                  railwayAudio.playBeep(800, 0.04);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all border cursor-pointer bg-gradient-to-r from-amber-950/90 to-amber-900/90 hover:from-amber-900 hover:to-amber-850 text-amber-300 border-amber-600 shadow-sm"
                title="Generate and download formatted PDF maintenance inspection report for the current list of defects"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>PDF Report ({filteredDefects.length})</span>
              </button>

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

              {/* Field Supervisor AI Priority Dropdown Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-indigo-700/80 rounded px-2 py-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                <label
                  htmlFor="select-ai-priority-filter"
                  className="text-[11px] font-mono font-semibold text-indigo-300 hidden sm:inline"
                >
                  AI Priority:
                </label>
                <select
                  id="select-ai-priority-filter"
                  value={currentAiDropdownValue}
                  onChange={(e) => handleAiPriorityDropdownChange(e.target.value)}
                  className="bg-transparent text-xs text-indigo-200 font-mono font-semibold focus:outline-none cursor-pointer pr-1"
                  title="Filter defects by AI-suggested priority level (CRITICAL, HIGH, MEDIUM, LOW) to prioritize field tasks"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">
                    All AI Priorities ({aiPriorityCounts.TOTAL})
                  </option>
                  <option value="URGENT" className="bg-slate-900 text-amber-300 font-bold">
                    ⚡ Focus Urgent: CRITICAL &amp; HIGH ({aiPriorityCounts.URGENT})
                  </option>
                  <option value="CRITICAL" className="bg-slate-900 text-rose-300 font-bold">
                    🔴 CRITICAL Priority ({aiPriorityCounts.CRITICAL})
                  </option>
                  <option value="HIGH" className="bg-slate-900 text-amber-300">
                    🟠 HIGH Priority ({aiPriorityCounts.HIGH})
                  </option>
                  <option value="MEDIUM" className="bg-slate-900 text-sky-300">
                    🔵 MEDIUM Priority ({aiPriorityCounts.MEDIUM})
                  </option>
                  <option value="LOW" className="bg-slate-900 text-emerald-300">
                    🟢 LOW Priority ({aiPriorityCounts.LOW})
                  </option>
                  {currentAiDropdownValue === 'MULTI' && (
                    <option value="MULTI" className="bg-slate-900 text-indigo-300">
                      AI: Custom Selection ({filterAiPriorities.length} active)
                    </option>
                  )}
                </select>
              </div>

              {/* Field Supervisor Quick Focus Action Button */}
              <button
                type="button"
                id="btn-quick-urgent-focus"
                onClick={handleQuickFocusUrgent}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono font-bold transition-all border cursor-pointer ${
                  filterAiPriorities.length === 2 &&
                  filterAiPriorities.includes('CRITICAL') &&
                  filterAiPriorities.includes('HIGH')
                    ? 'bg-amber-900/90 text-amber-200 border-amber-500 shadow-md shadow-amber-950/50 ring-1 ring-amber-400'
                    : filterAiPriorities.length === 1 && filterAiPriorities[0] === 'CRITICAL'
                    ? 'bg-rose-900/90 text-rose-200 border-rose-500 shadow-md shadow-rose-950/50 ring-1 ring-rose-400'
                    : 'bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border-indigo-700/70 hover:border-indigo-500'
                }`}
                title="Field Supervisor Quick Action: Focus on Urgent AI Priority Tasks First"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {filterAiPriorities.length === 1 && filterAiPriorities[0] === 'CRITICAL'
                    ? 'Critical Focus (Active)'
                    : filterAiPriorities.length === 2 &&
                      filterAiPriorities.includes('CRITICAL') &&
                      filterAiPriorities.includes('HIGH')
                    ? 'Urgent Focus (Active)'
                    : `Focus Urgent (${aiPriorityCounts.URGENT})`}
                </span>
              </button>
            </div>
          </div>

          {/* AI Maintenance Priority Filtering Control Bar */}
          <div
            id="ai-priority-filter-control-panel"
            className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-slate-950 via-[#0c1326] to-slate-950 border border-indigo-900/60 shadow-inner"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-200">
                      Field Supervisor AI Priority Filter
                    </span>
                    {filterAiPriorities.length > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-900/70 border border-indigo-600 text-indigo-200 text-[10px] font-mono font-bold">
                        {filterAiPriorities.join(' + ')} ({filteredDefects.length} urgent shown)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        Showing all {defects.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-mono">
                    Filter defects by AI-suggested priority level (CRITICAL, HIGH, MEDIUM, LOW) to prioritize urgent tasks first
                  </p>
                </div>
              </div>

              {/* Quick controls: Sort by urgency, Dropdown selector, and Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-indigo-700/60 rounded px-2 py-1 text-xs">
                  <label htmlFor="panel-select-ai-priority-filter" className="text-[10.5px] font-mono text-indigo-300">
                    Dropdown:
                  </label>
                  <select
                    id="panel-select-ai-priority-filter"
                    value={currentAiDropdownValue}
                    onChange={(e) => handleAiPriorityDropdownChange(e.target.value)}
                    className="bg-transparent text-xs text-indigo-200 font-mono font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">
                      All Priorities ({aiPriorityCounts.TOTAL})
                    </option>
                    <option value="URGENT" className="bg-slate-900 text-amber-300 font-bold">
                      ⚡ Urgent: CRITICAL &amp; HIGH ({aiPriorityCounts.URGENT})
                    </option>
                    <option value="CRITICAL" className="bg-slate-900 text-rose-300">
                      CRITICAL Priority ({aiPriorityCounts.CRITICAL})
                    </option>
                    <option value="HIGH" className="bg-slate-900 text-amber-300">
                      HIGH Priority ({aiPriorityCounts.HIGH})
                    </option>
                    <option value="MEDIUM" className="bg-slate-900 text-sky-300">
                      MEDIUM Priority ({aiPriorityCounts.MEDIUM})
                    </option>
                    <option value="LOW" className="bg-slate-900 text-emerald-300">
                      LOW Priority ({aiPriorityCounts.LOW})
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  id="btn-sort-ai-urgency"
                  onClick={() => {
                    setSortByAiUrgency(!sortByAiUrgency);
                    if (!sortByAiUrgency) setSortByPredictiveRisk('NONE');
                    railwayAudio.playBeep(800, 0.04);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold transition-all border cursor-pointer ${
                    sortByAiUrgency
                      ? 'bg-indigo-900/90 border-indigo-500 text-indigo-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle sorting defects by AI urgency (CRITICAL first)"
                >
                  <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  <span>{sortByAiUrgency ? 'Urgent Sorted' : 'Sort Urgency'}</span>
                </button>

                {/* Sort by Predictive Risk Score */}
                <button
                  type="button"
                  id="btn-sort-predictive-risk"
                  onClick={() => {
                    setSortByAiUrgency(false);
                    setSortByPredictiveRisk((prev) => {
                      if (prev === 'NONE') return 'DESC';
                      if (prev === 'DESC') return 'ASC';
                      return 'NONE';
                    });
                    railwayAudio.playBeep(850, 0.04);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold transition-all border cursor-pointer ${
                    sortByPredictiveRisk !== 'NONE'
                      ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-800'
                  }`}
                  title="Sort defects by Predictive Risk Score (Historical Asset Failure Rates + Corridor Age 30-Day Forecast)"
                >
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  <span>
                    {sortByPredictiveRisk === 'DESC'
                      ? 'Risk Score (High→Low)'
                      : sortByPredictiveRisk === 'ASC'
                      ? 'Risk Score (Low→High)'
                      : 'Sort Risk Score'}
                  </span>
                  {sortByPredictiveRisk !== 'NONE' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-900 font-mono font-bold text-white">
                      {sortByPredictiveRisk}
                    </span>
                  )}
                </button>

                {(filterAiPriorities.length > 0 || filterForecastCritical30DaysOnly || sortByPredictiveRisk !== 'NONE' || sortByAiUrgency) && (
                  <button
                    type="button"
                    id="btn-reset-ai-priority-filter"
                    onClick={() => {
                      setFilterAiPriorities([]);
                      setFilterForecastCritical30DaysOnly(false);
                      setSortByPredictiveRisk('NONE');
                      setSortByAiUrgency(false);
                      railwayAudio.playBeep(650, 0.04);
                    }}
                    className="text-[11px] font-mono text-rose-300 hover:text-rose-200 underline flex items-center gap-1 cursor-pointer transition-colors px-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Priority Toggle Chips */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Select:</span>

              {/* All Toggle */}
              <button
                type="button"
                id="btn-filter-ai-all"
                onClick={() => {
                  setFilterAiPriorities([]);
                  railwayAudio.playBeep(700, 0.04);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
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

              {/* Urgent Combo Toggle */}
              <button
                type="button"
                id="btn-filter-ai-urgent"
                onClick={() =>
                  handleAiPriorityDropdownChange(
                    filterAiPriorities.length === 2 &&
                      filterAiPriorities.includes('CRITICAL') &&
                      filterAiPriorities.includes('HIGH')
                      ? 'ALL'
                      : 'URGENT'
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  filterAiPriorities.length === 2 &&
                  filterAiPriorities.includes('CRITICAL') &&
                  filterAiPriorities.includes('HIGH')
                    ? 'bg-gradient-to-r from-rose-950 via-amber-950 to-amber-900 text-amber-200 border-amber-500 ring-1 ring-amber-400 shadow-md'
                    : 'bg-slate-900/90 text-amber-300/80 border-amber-900/60 hover:border-amber-700 hover:text-amber-200'
                }`}
                title="Field Supervisor Quick Action: Focus on both CRITICAL and HIGH priority tasks"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Urgent Focus (Crit &amp; High)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-700">
                  {aiPriorityCounts.URGENT}
                </span>
              </button>

              {/* CRITICAL Toggle */}
              <button
                type="button"
                id="btn-filter-ai-critical"
                onClick={() => handleToggleAiPriority('CRITICAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
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

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* 30-Day Criticality Forecast Quick Filter Button */}
              <button
                type="button"
                id="btn-filter-forecast-30d"
                onClick={() => {
                  railwayAudio.playBeep(850, 0.04);
                  setFilterForecastCritical30DaysOnly((prev) => !prev);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  filterForecastCritical30DaysOnly
                    ? 'bg-gradient-to-r from-rose-950 via-amber-950 to-rose-900 text-rose-100 border-rose-500 ring-2 ring-rose-500/80 shadow-lg shadow-rose-950/70 font-bold'
                    : 'bg-slate-900/90 text-amber-300/90 border-amber-800/60 hover:border-rose-600 hover:text-rose-200'
                }`}
                title="Forecast filter: isolates currently non-critical defects projected to become critical within 30 days based on asset failure rates and corridor age."
              >
                <Flame
                  className={`w-3.5 h-3.5 ${
                    filterForecastCritical30DaysOnly ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                  }`}
                />
                <span>Forecast: Critical in &le;30d</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    filterForecastCritical30DaysOnly
                      ? 'bg-rose-800 text-white shadow-sm'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}
                >
                  {predictiveRiskBatch.forecastedCriticalWithin30DaysCount}
                </span>
              </button>
            </div>

            {/* 30-Day Criticality Horizon Active Banner */}
            {filterForecastCritical30DaysOnly && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-gradient-to-r from-rose-950/90 via-amber-950/70 to-slate-950 border border-rose-600/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono shadow-md shadow-rose-950/60">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-bold text-rose-200">30-DAY CRITICALITY FORECAST ACTIVE: </span>
                    <span className="text-slate-300">
                      Displaying <strong>{filteredDefects.length} non-critical defect(s)</strong> calculated by asset failure rates &amp; corridor aging to cross statutory critical thresholds within 30 days ({predictiveRiskBatch.highestRiskCorridor.corridorName} is highest risk corridor).
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSortByPredictiveRisk('DESC');
                      railwayAudio.playBeep(850, 0.04);
                    }}
                    className="px-2 py-1 rounded bg-rose-900/90 hover:bg-rose-800 text-white border border-rose-500 text-[10.5px] font-bold cursor-pointer"
                  >
                    Sort Highest Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterForecastCritical30DaysOnly(false);
                      railwayAudio.playBeep(600, 0.04);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] cursor-pointer"
                  >
                    Clear Filter ✕
                  </button>
                </div>
              </div>
            )}

            {/* Field Supervisor Urgent Focus Banner */}
            {filterAiPriorities.length > 0 &&
              (filterAiPriorities.includes('CRITICAL') || filterAiPriorities.includes('HIGH')) && (
                <div className="mt-2.5 p-2 rounded-lg bg-gradient-to-r from-rose-950/70 via-amber-950/40 to-slate-950 border border-rose-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                    <div>
                      <span className="font-bold text-rose-200">SUPERVISOR URGENT FOCUS: </span>
                      <span className="text-slate-300">
                        Displaying {filteredDefects.length} high-urgency tasks requiring prompt track possession or caution order dispatch.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveViewTab('PREDICTIVE_TIMELINE');
                        railwayAudio.playBeep(800, 0.04);
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 text-[10.5px] cursor-pointer"
                    >
                      View on Predictive Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPdfReportModalOpen(true);
                        railwayAudio.playBeep(800, 0.04);
                      }}
                      className="px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600 text-[10.5px] font-bold cursor-pointer"
                    >
                      Export Urgent PDF
                    </button>
                  </div>
                </div>
              )}

            {/* Geographic Cluster Active Filter Banner */}
            {filteredClusterDefectIds && (
              <div className="mt-2.5 p-2 rounded-lg bg-sky-950/90 border border-sky-600 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sky-200">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    <strong>Geographic Cluster Filter Active:</strong> Showing {filteredDefects.length} defect(s) filtered from map cluster selection.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab('GEOSPATIAL_MAP');
                      railwayAudio.playBeep(700, 0.04);
                    }}
                    className="px-2.5 py-1 rounded bg-sky-900 hover:bg-sky-800 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Return to Map Radar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilteredClusterDefectIds(null);
                      railwayAudio.playBeep(600, 0.04);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                  >
                    Clear Cluster Filter ✕
                  </button>
                </div>
              </div>
            )}
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
                  {/* Predictive Risk Score Column Header */}
                  <th className="py-2.5 px-3 text-amber-300">
                    <button
                      type="button"
                      id="btn-col-sort-predictive-risk"
                      onClick={() => {
                        railwayAudio.playBeep(850, 0.04);
                        setSortByAiUrgency(false);
                        setSortByPredictiveRisk((prev) => {
                          if (prev === 'NONE') return 'DESC';
                          if (prev === 'DESC') return 'ASC';
                          return 'NONE';
                        });
                      }}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group"
                      title="Predictive Risk Score: Forecasted via Historical Failure Rates per Asset Type & Corridor Infrastructure Age (30-Day Criticality Horizon). Click to toggle Sort Desc/Asc."
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>Predictive Risk Score</span>
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortByPredictiveRisk !== 'NONE' ? 'text-amber-400 font-bold opacity-100' : 'opacity-50'
                        }`}
                      />
                      {sortByPredictiveRisk !== 'NONE' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 border border-amber-600 text-amber-200">
                          {sortByPredictiveRisk}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-rose-300">Predictive Criticality</th>
                  <th className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 text-indigo-300">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>AI Suggested Priority</span>
                      {filterAiPriorities.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-900 border border-indigo-500 text-indigo-200 text-[9px] font-bold">
                          {filterAiPriorities.join('/')}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Site GPS Location</th>
                  <th className="py-2.5 px-3">Site Photo</th>
                  <th className="py-2.5 px-3 text-sky-300">Field QR &amp; Protocols</th>
                  <th className="py-2.5 px-3">Restriction</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredDefects.map((d) => {
                  const aiAnalysis = d.aiVisualAnalysis || d.photoAttachment?.aiAnalysis;
                  const aiPriority = getDefectAiPriority(d);
                  const isAiFiltered = filterAiPriorities.length > 0 && filterAiPriorities.includes(aiPriority);

                  return (
                    <tr
                      key={d.defectId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isAiFiltered ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-rose-300">{d.defectId}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span>{d.assetId}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase border ${
                              d.department === 'ENGINEERING'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-850'
                                : d.department === 'TRACTION'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-850'
                                : 'bg-cyan-950/80 text-cyan-300 border-cyan-850'
                            }`}
                            title={`Asset Group: ${d.department === 'ENGINEERING' ? 'Track (P-Way Civil)' : d.department === 'TRACTION' ? 'OHE (25kV Traction)' : 'S&T (Signaling & Telecom)'}`}
                          >
                            {d.department === 'ENGINEERING' ? 'Track' : d.department === 'TRACTION' ? 'OHE' : 'S&T'}
                          </span>
                        </div>
                      </td>
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

                      {/* Predictive Risk Score (Historical Failure Rates & Corridor Age Forecast) */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const riskRes =
                            predictiveRiskBatch.scoresMap.get(d.defectId) ||
                            calculatePredictiveRiskScore(d, assets, corridors);

                          if (riskRes.isCurrentlyCritical) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  railwayAudio.playBeep(800, 0.04);
                                  setSelectedDefectForRiskScore(riskRes);
                                }}
                                className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 flex items-center gap-1.5 font-mono text-[10px] transition-all cursor-pointer"
                                title="Defect is already active statutory CRITICAL. Click for full risk score and failure rates breakdown."
                              >
                                <span className="font-bold text-xs">{riskRes.predictiveRiskScore}</span>
                                <span className="px-1 py-0.2 rounded bg-rose-900 text-white font-bold text-[8.5px]">
                                  ACTIVE CRIT
                                </span>
                              </button>
                            );
                          }

                          if (riskRes.isLikelyCriticalWithin30Days) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  railwayAudio.playBeep(880, 0.04);
                                  setSelectedDefectForRiskScore(riskRes);
                                }}
                                className="px-2 py-1 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-600 text-rose-100 flex items-center gap-1.5 font-mono text-[10.5px] transition-all cursor-pointer shadow-sm shadow-rose-950/80 animate-pulse group"
                                title={`⚡ HIGH PROBABILITY: Forecasted to cross critical threshold in ${riskRes.forecastedDaysUntilCritical.toFixed(1)} days (${riskRes.forecastedCriticalDate})!\nAsset Type: ${riskRes.assetType} (${riskRes.historicalAnnualFailureRatePercent}% annual failure rate)\nCorridor: ${riskRes.corridorId} (${riskRes.corridorAgeYears}y infrastructure age, ${riskRes.annualTonnageGMT} GMT)\nClick for full mathematical degradation forecast.`}
                              >
                                <Flame className="w-3.5 h-3.5 text-rose-400 group-hover:scale-125 transition-transform shrink-0" />
                                <span className="font-bold text-xs">{riskRes.predictiveRiskScore}</span>
                                <span className="px-1.5 py-0.2 rounded bg-rose-900 text-white font-bold text-[9px] border border-rose-600 whitespace-nowrap">
                                  ⚡ CRIT IN {riskRes.forecastedDaysUntilCritical.toFixed(0)}d
                                </span>
                              </button>
                            );
                          }

                          if (riskRes.riskTier === 'ELEVATED_30_60D') {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  railwayAudio.playBeep(750, 0.04);
                                  setSelectedDefectForRiskScore(riskRes);
                                }}
                                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700/80 text-amber-200 flex items-center gap-1.5 font-mono text-[10px] transition-all cursor-pointer"
                                title={`Elevated risk: Forecasted to become critical in ${riskRes.forecastedDaysUntilCritical.toFixed(1)} days (${riskRes.forecastedCriticalDate})\nAsset failure rate: ${riskRes.historicalAnnualFailureRatePercent}%\nClick for breakdown.`}
                              >
                                <span className="font-bold text-xs">{riskRes.predictiveRiskScore}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-900/80 text-amber-100 font-bold text-[9px] border border-amber-700 whitespace-nowrap">
                                  Elevated ({riskRes.forecastedDaysUntilCritical.toFixed(0)}d)
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                railwayAudio.playBeep(700, 0.04);
                                setSelectedDefectForRiskScore(riskRes);
                              }}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5 font-mono text-[10px] transition-all cursor-pointer"
                              title={`Stable condition: ${riskRes.forecastedDaysUntilCritical.toFixed(1)} days until critical threshold\nCorridor age: ${riskRes.corridorAgeYears} yrs\nClick for breakdown.`}
                            >
                              <span className="font-bold text-xs text-slate-200">{riskRes.predictiveRiskScore}</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[9px] whitespace-nowrap">
                                Stable ({riskRes.forecastedDaysUntilCritical.toFixed(0)}d)
                              </span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-3">
                        {(() => {
                          const pred = predictAssetCriticality(d, defects);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDefectForPredictiveTimeline(d.defectId);
                                setActiveViewTab('PREDICTIVE_TIMELINE');
                                railwayAudio.playBeep(880, 0.04);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                pred.daysUntilCritical <= 7
                                  ? 'bg-rose-950 text-rose-300 border-rose-700 hover:bg-rose-900 shadow-sm animate-pulse'
                                  : pred.daysUntilCritical <= 14
                                  ? 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                              }`}
                              title={`Historical Pattern Forecast: Reaches CRITICAL in ${pred.daysUntilCritical.toFixed(1)} days (${pred.predictedCriticalDate}). Click to open predictive timeline map.`}
                            >
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{pred.daysUntilCritical.toFixed(1)}d to CRIT</span>
                            </button>
                          );
                        })()}
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
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        id={`btn-view-qr-${d.defectId}`}
                        onClick={() => {
                          setSelectedDefectForQr(d);
                          railwayAudio.playBeep(880, 0.04);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-sky-950/90 to-blue-950/90 hover:from-sky-900 hover:to-blue-900 border border-sky-600/80 hover:border-sky-400 text-sky-200 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm group"
                        title="Generate unique QR code for field staff & view safety protocols"
                      >
                        <QrCode className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span>QR Tag</span>
                      </button>
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
      )}

      {/* Precise Defect Site Identification Map Modal */}
      <DefectLocationMapModal
        defect={selectedDefectForLocation}
        onClose={() => setSelectedDefectForLocation(null)}
        onOpenPredictiveTimelineScreen={(defectId) => {
          setSelectedDefectForLocation(null);
          setActiveViewTab('PREDICTIVE_TIMELINE');
          setSelectedDefectForPredictiveTimeline(defectId);
        }}
      />

      {/* Defect Photographic Evidence Modal */}
      <DefectPhotoModal
        defect={selectedDefectForPhoto}
        onClose={() => setSelectedDefectForPhoto(null)}
        onOpenQrProtocols={(d) => {
          setSelectedDefectForPhoto(null);
          setSelectedDefectForQr(d);
        }}
      />

      {/* Defect Field QR Code & Safety Protocols Modal */}
      <DefectQrCodeModal
        defect={selectedDefectForQr}
        isOpen={!!selectedDefectForQr}
        onClose={() => setSelectedDefectForQr(null)}
        onUpdateDefectStatus={(defectId, newStatus) => {
          const target = defects.find((d) => d.defectId === defectId);
          if (target) {
            target.status = newStatus;
            onRefreshDefects();
          }
        }}
      />

      {/* PDF Maintenance Inspection Report Modal */}
      <DefectInspectionReportModal
        isOpen={isPdfReportModalOpen}
        onClose={() => {
          setIsPdfReportModalOpen(false);
          setPdfReportCustomDefects(null);
          setPdfReportCustomTitle(null);
        }}
        filteredDefects={pdfReportCustomDefects || filteredDefects}
        allDefects={defects}
        activeFilterSummary={
          pdfReportCustomTitle
            ? `${pdfReportCustomTitle} (Asset Filter: ${assetTypeFilter})`
            : activeFilterSummary
        }
        reportTitle={pdfReportCustomTitle || undefined}
        inspectorName={reportedBy || currentUser?.name || 'Senior Section Engineer (P-Way / Safety)'}
      />

      {/* Predictive Risk Score & 30-Day Criticality Forecast Detail Modal */}
      <PredictiveRiskScoreDetailModal
        scoreResult={selectedDefectForRiskScore}
        onClose={() => setSelectedDefectForRiskScore(null)}
        onOpenPredictiveTimeline={(defectId) => {
          setSelectedDefectForRiskScore(null);
          setSelectedDefectForPredictiveTimeline(defectId);
          setActiveViewTab('PREDICTIVE_TIMELINE');
        }}
      />
    </div>
  );
};

