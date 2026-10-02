import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Flame,
  Gauge,
  Sliders,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  BarChart2,
  ArrowUpRight,
  Info,
  Calendar,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Radio,
  Sun,
  History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Corridor, Defect, OptimizedBlock } from '../../types';
import { mockStore } from '../../services/api';
import {
  predictiveRiskNotificationService,
  PredictiveRiskAlert,
} from '../../services/predictiveRiskNotificationService';
import { MaintenanceRepairForecastModal } from './MaintenanceRepairForecastModal';
import {
  predictiveRepairForecastService,
  MaintenanceRepairForecast,
} from '../../services/predictiveRepairForecastService';
import { DateInspectionLogModal } from './DateInspectionLogModal';
import {
  corridorInspectionLogService,
  DateInspectionReport,
} from '../../services/corridorInspectionLogService';

interface CorridorPredictiveHealthScoreProps {
  corridors: Corridor[];
  defects: Defect[];
  blocks?: OptimizedBlock[];
  onNavigate?: (screen: string, params?: any) => void;
  onRefreshData?: () => void;
}

export interface HighRiskSegment {
  id: string;
  corridorId: string;
  chainage: string;
  locationName: string;
  riskScorePercent: number; // e.g. 92%
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  predictedFailureHorizon: string; // e.g. "Within 48-72h"
  primaryDefectFactors: string[];
  trackGeometryIndex: number; // e.g. 52 (low is poor)
  recommendedPreventiveBlock: string;
  speedRestrictionKmph?: number;
  openDefectsCount: number;
  criticalDefectsCount: number;
}

export interface TrackHeatmapSegment {
  id: string;
  segmentIndex: number;
  chainageLabel: string;
  landmark: string;
  trackLine: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CLEAR';
  riskScorePercent: number; // 0 to 100
  tdiScore: number;
  criticalDefects: number;
  highDefects: number;
  mediumDefects: number;
  lowDefects: number;
  totalDefects: number;
  defectFactors: string[];
  cautionOrderKmph?: number;
  isTroubleSpot: boolean;
  recommendedAction: string;
  mitigationAsset: string;
}

export type PriorBaselineYear = '2025' | '2024' | '2023';

export interface DayDegradationPoint {
  dayNumber: number;
  label: string;
  dateStr: string;
  healthScore: number;
  degradationIndex: number; // Track Degradation Index (TDI) 0-100 (Higher is worse)
  historicalDegradationIndex: number | null;
  projectedDegradationIndex: number | null;
  historicalHealthScore: number | null;
  projectedHealthScore: number | null;
  seasonalPeakDegradation: number; // Historical average peak degradation observed during this month in previous years
  seasonalPeakHealthScore: number;
  baselineYearDegradation: number; // Prior year baseline degradation metric
  baselineYearHealthScore: number; // Prior year baseline health score
  priorYearDeviationDelta: number; // Current TDI - Prior year baseline TDI (positive means accelerated wear)
  priorYearsData: Record<
    PriorBaselineYear,
    { tdi: number; health: number; deviationNote: string }
  >;
  criticalThreshold: number;
  isProjected: boolean;
  activeDefectCount: number;
  cumulativeTGI: number;
  maintenanceCycleNote?: string;
  maintenanceCyclePhase?: string;
}

export const CorridorPredictiveHealthScore: React.FC<CorridorPredictiveHealthScoreProps> = ({
  corridors = mockStore.getCorridors(),
  defects = mockStore.getDefects(),
  blocks = [],
  onNavigate,
  onRefreshData,
}) => {
  const safeCorridors = useMemo(() => {
    if (corridors && Array.isArray(corridors) && corridors.length > 0) return corridors;
    return mockStore.getCorridors();
  }, [corridors]);

  // State
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(() => {
    return (corridors && corridors.length > 0 ? corridors[0].id : 'C001');
  });
  const [criticalThreshold, setCriticalThreshold] = useState<number>(70); // TDI threshold (70+) triggers High Risk badge
  const [timeWindowDays, setTimeWindowDays] = useState<14 | 30>(30);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH_RISK_ONLY' | 'EXCEEDING_THRESHOLD'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'TDI' | 'HEALTH_SCORE'>('TDI');
  const [showSeasonalPeak, setShowSeasonalPeak] = useState<boolean>(true); // Toggle to show/hide Historical Seasonal Peak line
  const [showHistoricalBaseline, setShowHistoricalBaseline] = useState<boolean>(true); // Overlay Historical Baseline toggle
  const [selectedBaselineYear, setSelectedBaselineYear] = useState<PriorBaselineYear>('2025'); // Selected prior year series

  // AI-Generated Maintenance Repair Forecast State
  const [isForecastModalOpen, setIsForecastModalOpen] = useState<boolean>(false);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState<boolean>(false);
  const [currentForecast, setCurrentForecast] = useState<MaintenanceRepairForecast | null>(null);

  // Date Inspection Log Drill-down Modal State
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);
  const [activeInspectionReport, setActiveInspectionReport] = useState<DateInspectionReport | null>(null);

  // Track Segment Defect Mini-Heatmap State
  const [selectedHeatmapSegmentId, setSelectedHeatmapSegmentId] = useState<string | null>(null);
  const [heatmapFilter, setHeatmapFilter] = useState<'ALL' | 'TROUBLE_SPOTS_ONLY' | 'CAUTION_ORDERS_ONLY'>('ALL');

  // Risk Drivers Horizontal Stacked Bar Chart State
  const [driverViewMode, setDriverViewMode] = useState<
    'SELECTED_CORRIDOR_EVOLUTION' | 'ALL_CORRIDORS_COMPARISON'
  >('SELECTED_CORRIDOR_EVOLUTION');
  const [driverUnit, setDriverUnit] = useState<'PERCENT' | 'TDI_POINTS'>('PERCENT');

  // Predictive Risk Notification States
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    predictiveRiskNotificationService.getIsEnabled()
  );
  const [permissionStatus, setPermissionStatus] = useState<string>(() =>
    predictiveRiskNotificationService.getPermissionStatus()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    predictiveRiskNotificationService.getIsSoundEnabled()
  );
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Sync with global service updates
  useEffect(() => {
    const checkState = () => {
      setNotificationsEnabled(predictiveRiskNotificationService.getIsEnabled());
      setPermissionStatus(predictiveRiskNotificationService.getPermissionStatus());
      setSoundEnabled(predictiveRiskNotificationService.getIsSoundEnabled());
    };
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, []);

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;
    predictiveRiskNotificationService.setIsEnabled(next);
    setNotificationsEnabled(next);

    if (next) {
      const perm = await predictiveRiskNotificationService.requestPermission();
      setPermissionStatus(perm);
      setNotificationToast(
        perm === 'granted'
          ? 'Predictive Risk Notifications ENABLED (Browser Push Active)'
          : 'Predictive Risk Notifications ENABLED (In-App Floating Alert Mode)'
      );
    } else {
      setNotificationToast('Predictive Risk Notifications MUTED');
    }
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    predictiveRiskNotificationService.setIsSoundEnabled(next);
    setSoundEnabled(next);
    setNotificationToast(next ? 'Risk Alert Siren Sound: ON' : 'Risk Alert Siren Sound: MUTED');
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const handleTriggerTestAlert = () => {
    const activeCorr = safeCorridors.find((c) => c.id === selectedCorridorId) || safeCorridors[0];
    if (activeCorr) {
      predictiveRiskNotificationService.triggerTestAlert(activeCorr);
      setNotificationToast(`Test Browser Alert dispatched for ${activeCorr?.name || 'Corridor'}`);
      setTimeout(() => setNotificationToast(null), 4000);
    }
  };

  // Compute Predictive Health Data for each corridor
  const corridorHealthAnalytics = useMemo(() => {
    return safeCorridors.map((corridor) => {
      const corrDefects = (defects || []).filter((d) => d.corridorId === corridor.id);
      const criticalDefects = corrDefects.filter((d) => d.severity === 'CRITICAL');
      const highDefects = corrDefects.filter((d) => d.severity === 'HIGH');
      const mediumDefects = corrDefects.filter((d) => d.severity === 'MEDIUM');
      const lowDefects = corrDefects.filter((d) => d.severity === 'LOW');

      // Weighted defect penalty calculation based on historical defect data
      const defectPenalty =
        criticalDefects.length * 9.5 +
        highDefects.length * 4.5 +
        mediumDefects.length * 2.0 +
        lowDefects.length * 0.8;

      // Defect density: defects per 10 km
      const corridorLength = corridor.lengthKm || 40;
      const defectDensity = Number(((corrDefects.length / corridorLength) * 10).toFixed(1));

      // Utilization & speed stress multiplier
      const utilFactor = (corridor.utilization || 80) / 100;
      const baseHealthScore = Math.max(
        35,
        Math.min(98, Math.round(100 - defectPenalty * 0.9 - utilFactor * 12))
      );

      // Current Track Degradation Index (TDI) (0 = pristine, 100 = critical failure threshold)
      const currentTDI = Math.min(
        96,
        Math.max(20, Math.round(100 - baseHealthScore + (criticalDefects.length > 0 ? 12 : 4)))
      );

      // Historical 30-day degradation trend calculation
      // Corridors like C003 and C004 experience heavy freight / delayed maintenance causing steep degradation
      const isHighDegradationCorridor = corridor.id === 'C003' || corridor.id === 'C004' || currentTDI >= criticalThreshold;
      const degradationRate30Days = isHighDegradationCorridor
        ? +(24 + (criticalDefects.length * 2.5)).toFixed(1)
        : +(7.5 + (highDefects.length * 1.1)).toFixed(1);

      // Historical seasonal peak baseline: average degradation observed during this month (September) in previous years
      const seasonalPeakBase =
        corridor.id === 'C003' ? 76 : corridor.id === 'C004' ? 68 : corridor.id === 'C001' ? 64 : 52;

      // Generate 30-day degradation history points (Day -30 up to Day 0, plus 7-day predictive forward projection)
      const trendPoints: DayDegradationPoint[] = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayNumber = 30 - i;
        const progress = (30 - i) / 30; // 0 to 1

        // Baseline progression: how TDI degraded over past 30 days
        const startTDI = Math.max(15, currentTDI - degradationRate30Days);
        // Add realistic non-linear inflection where defects accumulated
        const midBump = Math.sin(progress * Math.PI) * 4.2;
        const computedTDI = Math.min(
          98,
          Math.max(10, Math.round(startTDI + (currentTDI - startTDI) * Math.pow(progress, 1.2) + (i < 10 ? midBump : 0)))
        );
        const computedHealth = Math.max(30, 100 - computedTDI);

        // Bridge anchor on Day 30: both historical and projected lines meet here so dashed continuation has zero gap
        const isBridgeDay = i === 0;

        // Historical seasonal peak calculation for this day in previous years (September multi-year observed average)
        const seasonalProgress = dayNumber / 37;
        const seasonalPeakTDI = Math.round(
          seasonalPeakBase + Math.sin(seasonalProgress * Math.PI) * 5.5 + ((dayNumber % 3) * 0.4)
        );
        const seasonalPeakHealth = Math.max(25, 100 - seasonalPeakTDI);

        // Historical prior years baseline series calculation for this day
        // 2025: Normal monsoon; mid-month tamping executed on day 16
        const tdi2025 = Math.max(
          15,
          Math.min(
            95,
            Math.round(
              startTDI * 0.94 +
              (currentTDI * 0.91 - startTDI * 0.94) * Math.pow(progress, 1.1) -
              (dayNumber >= 15 && dayNumber <= 22 ? 3.5 : 0) +
              Math.sin(progress * Math.PI) * 2.1
            )
          )
        );
        const health2025 = Math.max(25, 100 - tdi2025);

        // 2024: Heavy monsoon runoff; soil saturation acceleration in weeks 2-3
        const tdi2024 = Math.max(
          18,
          Math.min(
            98,
            Math.round(
              startTDI * 1.04 +
              (currentTDI * 1.06 - startTDI * 1.04) * Math.pow(progress, 1.25) +
              (dayNumber >= 9 && dayNumber <= 21 ? 4.5 : 0)
            )
          )
        );
        const health2024 = Math.max(20, 100 - tdi2024);

        // 2023: Drier post-monsoon period; lower moisture fouling, delayed renewals
        const tdi2023 = Math.max(
          14,
          Math.min(
            90,
            Math.round(
              startTDI * 0.88 +
              (currentTDI * 0.86 - startTDI * 0.88) * Math.pow(progress, 1.0) -
              2.0
            )
          )
        );
        const health2023 = Math.max(30, 100 - tdi2023);

        const priorYearsData: Record<PriorBaselineYear, { tdi: number; health: number; deviationNote: string }> = {
          '2025': {
            tdi: tdi2025,
            health: health2025,
            deviationNote: '2025 Baseline: Post-monsoon tamping on Day 16 arrested wear velocity',
          },
          '2024': {
            tdi: tdi2024,
            health: health2024,
            deviationNote: '2024 Baseline: Intense monsoon soil saturation accelerated mid-month fouling',
          },
          '2023': {
            tdi: tdi2023,
            health: health2023,
            deviationNote: '2023 Baseline: Drier climate pattern kept ballast voiding below historical median',
          },
        };

        const activeBaselineTDI = priorYearsData[selectedBaselineYear].tdi;
        const activeBaselineHealth = priorYearsData[selectedBaselineYear].health;
        const activeDeviation = computedTDI - activeBaselineTDI;

        trendPoints.push({
          dayNumber,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateStr: d.toISOString().split('T')[0],
          healthScore: computedHealth,
          degradationIndex: computedTDI,
          historicalDegradationIndex: computedTDI,
          projectedDegradationIndex: isBridgeDay ? computedTDI : null,
          historicalHealthScore: computedHealth,
          projectedHealthScore: isBridgeDay ? computedHealth : null,
          seasonalPeakDegradation: seasonalPeakTDI,
          seasonalPeakHealthScore: seasonalPeakHealth,
          baselineYearDegradation: activeBaselineTDI,
          baselineYearHealthScore: activeBaselineHealth,
          priorYearDeviationDelta: activeDeviation,
          priorYearsData,
          criticalThreshold,
          isProjected: false,
          activeDefectCount: Math.round(corrDefects.length * (0.6 + 0.4 * progress)),
          cumulativeTGI: Math.max(48, Math.round(85 - computedTDI * 0.4)),
          maintenanceCycleNote: isBridgeDay ? 'Day 30 (Current Day Anchor — Baseline Condition)' : undefined,
          maintenanceCyclePhase: 'OBSERVED_30D',
        });
      }

      // Add 7-day forward projected values based on historical maintenance cycles
      const lastPoint = trendPoints[trendPoints.length - 1];

      // Historical maintenance cycle parameters
      const maintenanceIntervalDays =
        corridor.id === 'C003' ? 21 : corridor.id === 'C002' ? 14 : corridor.id === 'C004' ? 35 : 28;
      const daysSinceLastBlock =
        corridor.id === 'C003' ? 24 : corridor.id === 'C004' ? 33 : 11;
      const isCycleOverdue = daysSinceLastBlock >= maintenanceIntervalDays;

      for (let f = 1; f <= 7; f++) {
        const d = new Date(now);
        d.setDate(now.getDate() + f);

        // Maintenance cycle wear progression rate:
        // When cycle is overdue (e.g. C003), non-linear wear acceleration occurs due to uncleaned ballast / micro-crack growth
        const cycleAcceleration = isCycleOverdue
          ? 1.9 + f * 0.15
          : isHighDegradationCorridor
          ? 1.5 + f * 0.08
          : 0.55 + f * 0.04;

        const projectedTDI = Math.min(
          99,
          Math.round(lastPoint.degradationIndex + f * cycleAcceleration)
        );
        const projectedHealth = Math.max(20, 100 - projectedTDI);

        // Historical maintenance cycle description for each projected day
        let cycleNote = `Day +${f}: Projected maintenance progression`;
        if (corridor.id === 'C003') {
          cycleNote =
            f <= 2
              ? `Day +${f}: Sampla 21-day tamping interval breached (+${daysSinceLastBlock + f}d total)`
              : f <= 5
              ? `Day +${f}: Ballast pocket slurry voiding acceleration under 25T axle load`
              : `Day +${f}: USFD 28-day testing cycle deadline reached (High derailment risk)`;
        } else if (corridor.id === 'C004') {
          cycleNote =
            f <= 3
              ? `Day +${f}: Palwal interlocking point machine 35-day inspection overdue`
              : `Day +${f}: 25kV Catenary tension relaxation beyond permissible tolerance`;
        } else if (corridor.id === 'C002') {
          cycleNote = `Day +${f}: Within nominal 14-day high-speed alignment maintenance buffer`;
        } else {
          cycleNote = `Day +${f}: 28-day routine trunk renewal maintenance cycle projection`;
        }

        const seasonalProgress = (30 + f) / 37;
        const seasonalPeakTDI = Math.round(
          seasonalPeakBase + Math.sin(seasonalProgress * Math.PI) * 5.5 + ((f % 3) * 0.4)
        );
        const seasonalPeakHealth = Math.max(25, 100 - seasonalPeakTDI);

        // Forward projected prior year baseline comparison trajectories
        const projTdi2025 = Math.min(96, Math.round(lastPoint.priorYearsData['2025'].tdi + f * 1.0));
        const projHealth2025 = Math.max(25, 100 - projTdi2025);

        const projTdi2024 = Math.min(98, Math.round(lastPoint.priorYearsData['2024'].tdi + f * 1.3));
        const projHealth2024 = Math.max(20, 100 - projTdi2024);

        const projTdi2023 = Math.min(92, Math.round(lastPoint.priorYearsData['2023'].tdi + f * 0.85));
        const projHealth2023 = Math.max(28, 100 - projTdi2023);

        const projPriorYearsData: Record<PriorBaselineYear, { tdi: number; health: number; deviationNote: string }> = {
          '2025': {
            tdi: projTdi2025,
            health: projHealth2025,
            deviationNote: '2025 Forward: Post-cycle stabilized trajectory',
          },
          '2024': {
            tdi: projTdi2024,
            health: projHealth2024,
            deviationNote: '2024 Forward: Post-flood cumulative wear curve',
          },
          '2023': {
            tdi: projTdi2023,
            health: projHealth2023,
            deviationNote: '2023 Forward: Nominal dry-season wear progression',
          },
        };

        const projActiveBaselineTDI = projPriorYearsData[selectedBaselineYear].tdi;
        const projActiveBaselineHealth = projPriorYearsData[selectedBaselineYear].health;
        const projActiveDeviation = projectedTDI - projActiveBaselineTDI;

        trendPoints.push({
          dayNumber: 30 + f,
          label: `+${f}d (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
          dateStr: d.toISOString().split('T')[0],
          healthScore: projectedHealth,
          degradationIndex: projectedTDI,
          historicalDegradationIndex: null, // Solid line ends cleanly at Day 30
          projectedDegradationIndex: projectedTDI, // Dashed continuation continues seamlessly from Day 30
          historicalHealthScore: null,
          projectedHealthScore: projectedHealth,
          seasonalPeakDegradation: seasonalPeakTDI,
          seasonalPeakHealthScore: seasonalPeakHealth,
          baselineYearDegradation: projActiveBaselineTDI,
          baselineYearHealthScore: projActiveBaselineHealth,
          priorYearDeviationDelta: projActiveDeviation,
          priorYearsData: projPriorYearsData,
          criticalThreshold,
          isProjected: true,
          activeDefectCount: corrDefects.length + Math.round(f * 0.7),
          cumulativeTGI: Math.max(38, Math.round(85 - projectedTDI * 0.45)),
          maintenanceCycleNote: cycleNote,
          maintenanceCyclePhase: isCycleOverdue
            ? 'CYCLE_OVERRUN_PROJECTION'
            : 'ROUTINE_CYCLE_PROJECTION',
        });
      }

      // High-Risk upcoming track segments based on historical defect locations
      const segments: HighRiskSegment[] = [];

      if (corridor.id === 'C001') {
        segments.push({
          id: 'SEG-C001-01',
          corridorId: 'C001',
          chainage: 'KM 22.4 – KM 26.8 Up Main',
          locationName: 'Sahibabad Junction Crossover & Yard Approach',
          riskScorePercent: 88,
          riskLevel: 'CRITICAL',
          predictedFailureHorizon: 'Within 48–72 Hours',
          primaryDefectFactors: [
            'USFD Ultrasonic Rail Weld Flaw',
            'OHE Dropper Loose / Hotspot Arcing',
            'Point Machine 104A Throw Resistance',
          ],
          trackGeometryIndex: 58,
          recommendedPreventiveBlock: '2.5h Night Mega-Block (CSM-902 Tamping + Tower Wagon)',
          speedRestrictionKmph: 45,
          openDefectsCount: 5,
          criticalDefectsCount: 2,
        });
        segments.push({
          id: 'SEG-C001-02',
          corridorId: 'C001',
          chainage: 'KM 14.1 – KM 16.5 Down Fast Line',
          locationName: 'Anand Vihar Terminal Curve',
          riskScorePercent: 68,
          riskLevel: 'HIGH',
          predictedFailureHorizon: '5–7 Days',
          primaryDefectFactors: [
            'Rail Head Shelling & Micro-cracks',
            'Fishplate Bolt Torque Relaxation',
          ],
          trackGeometryIndex: 66,
          recommendedPreventiveBlock: '1.5h Off-Peak Shadow Block',
          openDefectsCount: 3,
          criticalDefectsCount: 0,
        });
      } else if (corridor.id === 'C002') {
        segments.push({
          id: 'SEG-C002-01',
          corridorId: 'C002',
          chainage: 'KM 16.2 – KM 19.8 High-Speed Up Spur',
          locationName: 'Okhla — Tughlakabad Container Curve',
          riskScorePercent: 64,
          riskLevel: 'MEDIUM',
          predictedFailureHorizon: '8–12 Days',
          primaryDefectFactors: [
            'AFTC Track Circuit Ballast Leakage',
            'Switch Expansion Joint Lubrication Gap',
          ],
          trackGeometryIndex: 72,
          recommendedPreventiveBlock: '2.0h Midday Traffic Lull Block',
          openDefectsCount: 3,
          criticalDefectsCount: 0,
        });
      } else if (corridor.id === 'C003') {
        segments.push({
          id: 'SEG-C003-01',
          corridorId: 'C003',
          chainage: 'KM 34.2 – KM 41.0 Up Heavy Freight Track',
          locationName: 'Bahadurgarh — Sampla Industrial Section',
          riskScorePercent: 94,
          riskLevel: 'CRITICAL',
          predictedFailureHorizon: 'URGENT: Within 24–48 Hours',
          primaryDefectFactors: [
            'Severe Ballast Fouling & Mud Pumping',
            '25T Axle Load Rail Fatigue Cracking',
            'Missing Elastic Rail Clips (ERC) Density Drop',
          ],
          trackGeometryIndex: 49,
          recommendedPreventiveBlock: '3.5h Emergency Night Mega-Block (BCM Ballast Cleaner + Dynamic Stabilizer)',
          speedRestrictionKmph: 30,
          openDefectsCount: 8,
          criticalDefectsCount: 4,
        });
        segments.push({
          id: 'SEG-C003-02',
          corridorId: 'C003',
          chainage: 'KM 58.5 – KM 62.1 Rohtak Outer Yard',
          riskScorePercent: 78,
          riskLevel: 'HIGH',
          locationName: 'Rohtak Freight Marshalling Entry',
          predictedFailureHorizon: '3–5 Days',
          primaryDefectFactors: [
            'Turnout Diamond Crossing Wear',
            'Axle Counter Section Inconsistent Reset',
          ],
          trackGeometryIndex: 61,
          recommendedPreventiveBlock: '2.5h Pre-Dawn Maintenance Block',
          speedRestrictionKmph: 50,
          openDefectsCount: 4,
          criticalDefectsCount: 1,
        });
      } else if (corridor.id === 'C004') {
        segments.push({
          id: 'SEG-C004-01',
          corridorId: 'C004',
          chainage: 'KM 52.1 – KM 58.6 Down Mixed Main',
          locationName: 'Palwal Interlocking Area & Crossover Cluster',
          riskScorePercent: 86,
          riskLevel: 'CRITICAL',
          predictedFailureHorizon: 'Within 48–72 Hours',
          primaryDefectFactors: [
            '25kV Catenary Stagger Beyond Permissible Limit',
            'Electric Point Machine Throw Drag / Motor Stall Current',
            'Bridge Expansion Joint Debris Accumulation',
          ],
          trackGeometryIndex: 56,
          recommendedPreventiveBlock: '3.0h Night Mega-Block (OHE Tower Wagon + S&T Gang)',
          speedRestrictionKmph: 45,
          openDefectsCount: 6,
          criticalDefectsCount: 2,
        });
      } else {
        // Fallback segment for any dynamic corridors
        segments.push({
          id: `SEG-${corridor.id}-01`,
          corridorId: corridor.id,
          chainage: `KM ${(corridorLength * 0.4).toFixed(1)} – KM ${(corridorLength * 0.55).toFixed(1)}`,
          locationName: `${corridor.stationFrom} — ${corridor.stationTo} Main Line`,
          riskScorePercent: baseHealthScore < 70 ? 82 : 55,
          riskLevel: baseHealthScore < 70 ? 'HIGH' : 'MEDIUM',
          predictedFailureHorizon: baseHealthScore < 70 ? '3–5 Days' : '10–14 Days',
          primaryDefectFactors: ['Track Geometry Anomaly', 'Wear Pattern Anomaly'],
          trackGeometryIndex: Math.round(baseHealthScore * 0.8),
          recommendedPreventiveBlock: '2.0h Preventive Maintenance Window',
          openDefectsCount: corrDefects.length,
          criticalDefectsCount: criticalDefects.length,
        });
      }

      // Check if 30-day degradation trend exceeds critical threshold
      const exceedsThreshold = currentTDI >= criticalThreshold || degradationRate30Days >= 20;

      // Status label
      let status: 'OPTIMAL' | 'MODERATE_WATCH' | 'HIGH_RISK';
      if (exceedsThreshold || baseHealthScore < 65) {
        status = 'HIGH_RISK';
      } else if (baseHealthScore < 80 || currentTDI > 55) {
        status = 'MODERATE_WATCH';
      } else {
        status = 'OPTIMAL';
      }

      return {
        corridor,
        healthScore: baseHealthScore,
        currentTDI,
        degradationRate30Days,
        exceedsThreshold,
        status,
        defectsCount: corrDefects.length,
        criticalDefectsCount: criticalDefects.length,
        highDefectsCount: highDefects.length,
        mediumDefectsCount: mediumDefects.length,
        lowDefectsCount: lowDefects.length,
        defectDensity,
        trendPoints,
        segments,
      };
    });
  }, [safeCorridors, defects, criticalThreshold, selectedBaselineYear]);

  // Selected Corridor Health Info
  const activeCorridorHealth = useMemo(() => {
    if (!corridorHealthAnalytics || corridorHealthAnalytics.length === 0) return null;
    return (
      corridorHealthAnalytics.find((c) => c?.corridor?.id === selectedCorridorId) ||
      corridorHealthAnalytics[0] ||
      null
    );
  }, [corridorHealthAnalytics, selectedCorridorId]);

  // Filtered Corridors for Top Grid
  const filteredCorridors = useMemo(() => {
    return (corridorHealthAnalytics || []).filter((item) => {
      if (!item || !item.corridor) return false;
      // Risk filter
      if (filterSeverity === 'HIGH_RISK_ONLY' && item.status !== 'HIGH_RISK') return false;
      if (filterSeverity === 'EXCEEDING_THRESHOLD' && !item.exceedsThreshold) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.corridor.name || '').toLowerCase().includes(q);
        const matchCode = (item.corridor.code || item.corridor.id || '').toLowerCase().includes(q);
        const matchSegment = (item.segments || []).some(
          (s) => (s.locationName || '').toLowerCase().includes(q) || (s.chainage || '').toLowerCase().includes(q)
        );
        return matchName || matchCode || matchSegment;
      }

      return true;
    });
  }, [corridorHealthAnalytics, filterSeverity, searchQuery]);

  // Count high risk corridors exceeding threshold
  const highRiskCorridorsCount = useMemo(() => {
    return corridorHealthAnalytics.filter((c) => c.exceedsThreshold).length;
  }, [corridorHealthAnalytics]);

  // Sliced trend points by time window (14 or 30 days) + 7 days projection
  const displayedTrendData = useMemo(() => {
    if (!activeCorridorHealth) return [];
    const all = activeCorridorHealth.trendPoints;
    const historyPoints = all.filter((p) => !p.isProjected);
    const projectedPoints = all.filter((p) => p.isProjected);

    const slicedHistory = historyPoints.slice(-timeWindowDays);
    return [...slicedHistory, ...projectedPoints];
  }, [activeCorridorHealth, timeWindowDays]);

  // Seasonal Deviation pattern analytics comparing current trend with selected prior year
  const activeDeviationStats = useMemo(() => {
    if (!activeCorridorHealth) return null;
    const historyPoints = activeCorridorHealth.trendPoints.filter((p) => !p.isProjected);
    if (historyPoints.length === 0) return null;

    const deltas = historyPoints.map((p) => p.priorYearDeviationDelta);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const latestDelta = deltas[deltas.length - 1];

    let patternSummary = '';
    if (selectedBaselineYear === '2025') {
      patternSummary =
        avgDelta > 2
          ? 'Current track wear is advancing +5.4 TDI higher due to deferred mid-month tamping compared to Sep 2025 cycle'
          : 'Degradation trajectory remains consistent with Sep 2025 post-monsoon baseline';
    } else if (selectedBaselineYear === '2024') {
      patternSummary =
        avgDelta < 0
          ? `Current degradation is ${Math.abs(avgDelta).toFixed(1)} TDI lower than Sep 2024 (fewer waterlogged ballast failures)`
          : `Higher freight load acceleration noted vs Sep 2024 flood disruption cycle`;
    } else {
      patternSummary =
        avgDelta > 3
          ? 'Current moisture-driven degradation exceeds dry Sep 2023 benchmark (+6.8 TDI delta)'
          : 'Within normal multi-year variance vs Sep 2023 baseline';
    }

    return {
      avgDelta: Number(avgDelta.toFixed(1)),
      latestDelta,
      patternSummary,
    };
  }, [activeCorridorHealth, selectedBaselineYear]);

  // Corridor Track Segments Mini-Heatmap Data Model
  const corridorTrackSegments = useMemo<TrackHeatmapSegment[]>(() => {
    if (!activeCorridorHealth || !activeCorridorHealth.corridor) return [];
    const cId = activeCorridorHealth.corridor.id;

    if (cId === 'C001') {
      return [
        {
          id: 'C001-SEG-01',
          segmentIndex: 1,
          chainageLabel: 'KM 0.0 – KM 4.5',
          landmark: 'New Delhi Central Yard Approach',
          trackLine: 'Up / Dn Express Main',
          riskLevel: 'CLEAR',
          riskScorePercent: 22,
          tdiScore: 32,
          criticalDefects: 0,
          highDefects: 0,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 2,
          defectFactors: ['Minor rail head wear', 'Routine ballast profile'],
          isTroubleSpot: false,
          recommendedAction: 'Routine visual track inspection',
          mitigationAsset: 'Track Patrol Gang',
        },
        {
          id: 'C001-SEG-02',
          segmentIndex: 2,
          chainageLabel: 'KM 4.5 – KM 9.0',
          landmark: 'Tilak Bridge — Pragati Maidan Curve',
          trackLine: 'Up Suburban Fast Line',
          riskLevel: 'MEDIUM',
          riskScorePercent: 48,
          tdiScore: 46,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 2,
          defectFactors: ['Curve gauge widening', 'Check rail clearance margin'],
          isTroubleSpot: false,
          recommendedAction: 'Gauge tie bar adjustment on curve',
          mitigationAsset: 'Gang 02 Track Maintainer',
        },
        {
          id: 'C001-SEG-03',
          segmentIndex: 3,
          chainageLabel: 'KM 9.0 – KM 14.0',
          landmark: 'Yamuna River Main Bridge Approach',
          trackLine: 'Up / Dn Steel Girder Spans',
          riskLevel: 'MEDIUM',
          riskScorePercent: 54,
          tdiScore: 52,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 2,
          lowDefects: 1,
          totalDefects: 4,
          defectFactors: ['Bridge sleeper pad wear', 'Expansion joint gap relaxation'],
          isTroubleSpot: false,
          recommendedAction: 'Bridge expansion joint greasing & torque test',
          mitigationAsset: 'Bridge Inspection Gang',
        },
        {
          id: 'C001-SEG-04',
          segmentIndex: 4,
          chainageLabel: 'KM 14.0 – KM 18.0',
          landmark: 'Anand Vihar Terminal South Crossover',
          trackLine: 'Down Fast Line & Loop Entry',
          riskLevel: 'HIGH',
          riskScorePercent: 68,
          tdiScore: 66,
          criticalDefects: 0,
          highDefects: 2,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 3,
          defectFactors: ['Rail head shelling & micro-cracks', 'Fishplate bolt torque relaxation'],
          cautionOrderKmph: 75,
          isTroubleSpot: true,
          recommendedAction: '1.5h Off-Peak Shadow Block (Rail grinding + bolt tightening)',
          mitigationAsset: 'RG-30 Rail Grinder',
        },
        {
          id: 'C001-SEG-05',
          segmentIndex: 5,
          chainageLabel: 'KM 18.0 – KM 22.0',
          landmark: 'Chander Nagar Suburban Spur',
          trackLine: 'Up Main',
          riskLevel: 'CLEAR',
          riskScorePercent: 28,
          tdiScore: 35,
          criticalDefects: 0,
          highDefects: 0,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 2,
          defectFactors: ['Nominal rail wear', 'Clean ballast cushion'],
          isTroubleSpot: false,
          recommendedAction: 'Nominal monthly track telemetry scan',
          mitigationAsset: 'LIDAR Geometry Rover',
        },
        {
          id: 'C001-SEG-06',
          segmentIndex: 6,
          chainageLabel: 'KM 22.0 – KM 26.8',
          landmark: 'Sahibabad Junction Crossover & Yard',
          trackLine: 'Up Main & Turnout 104A',
          riskLevel: 'CRITICAL',
          riskScorePercent: 88,
          tdiScore: 82,
          criticalDefects: 2,
          highDefects: 2,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 5,
          defectFactors: [
            'USFD Ultrasonic Rail Weld Flaw',
            'OHE Dropper Loose / Hotspot Arcing',
            'Point Machine 104A Throw Resistance',
          ],
          cautionOrderKmph: 45,
          isTroubleSpot: true,
          recommendedAction: '2.5h Night Mega-Block (CSM-902 Tamping + Tower Wagon + Point Overhaul)',
          mitigationAsset: 'CSM-902 & Tower Wagon 04',
        },
        {
          id: 'C001-SEG-07',
          segmentIndex: 7,
          chainageLabel: 'KM 26.8 – KM 31.5',
          landmark: 'Mohan Nagar Industrial Siding',
          trackLine: 'Up Freight Bypass',
          riskLevel: 'MEDIUM',
          riskScorePercent: 44,
          tdiScore: 48,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 3,
          defectFactors: ['Sleeper chipping on freight turnout', 'Ballast dust accumulation'],
          isTroubleSpot: false,
          recommendedAction: 'Ballast screening and packing',
          mitigationAsset: 'DUOMATIC Tamping Machine',
        },
        {
          id: 'C001-SEG-08',
          segmentIndex: 8,
          chainageLabel: 'KM 31.5 – KM 36.5',
          landmark: 'Ghaziabad Outer Yard Interlocking Approach',
          trackLine: 'Down Trunk & Crossover Cluster',
          riskLevel: 'HIGH',
          riskScorePercent: 65,
          tdiScore: 63,
          criticalDefects: 0,
          highDefects: 2,
          mediumDefects: 2,
          lowDefects: 0,
          totalDefects: 4,
          defectFactors: ['Axle counter sensor sensitivity drift', 'Insulated rail joint fatigue'],
          cautionOrderKmph: 60,
          isTroubleSpot: true,
          recommendedAction: 'Signal & Telecom shadow inspection window',
          mitigationAsset: 'S&T Telemetry Inspection Unit',
        },
        {
          id: 'C001-SEG-09',
          segmentIndex: 9,
          chainageLabel: 'KM 36.5 – KM 40.0',
          landmark: 'Ghaziabad Junction Platform Approach',
          trackLine: 'Station Terminal Tracks 1–5',
          riskLevel: 'CLEAR',
          riskScorePercent: 25,
          tdiScore: 34,
          criticalDefects: 0,
          highDefects: 0,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 2,
          defectFactors: ['Platform clearance nominal', 'OHE wire tension within tolerance'],
          isTroubleSpot: false,
          recommendedAction: 'Routine station yard audit',
          mitigationAsset: 'Station Maintenance Gang',
        },
      ];
    }

    if (cId === 'C003') {
      return [
        {
          id: 'C003-SEG-01',
          segmentIndex: 1,
          chainageLabel: 'KM 0.0 – KM 12.0',
          landmark: 'Shakurbasti Marshalling Outer',
          trackLine: 'Up Heavy Line',
          riskLevel: 'MEDIUM',
          riskScorePercent: 45,
          tdiScore: 49,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 2,
          lowDefects: 1,
          totalDefects: 4,
          defectFactors: ['Turnout frog tip wear', 'Bogie hunting marks'],
          isTroubleSpot: false,
          recommendedAction: 'Re-profiling turnout frog welding',
          mitigationAsset: 'Flash Butt Welding Gang',
        },
        {
          id: 'C003-SEG-02',
          segmentIndex: 2,
          chainageLabel: 'KM 12.0 – KM 24.0',
          landmark: 'Nangloi — Mundka High-Tonnage Section',
          trackLine: 'Up / Dn 25T Axle Main',
          riskLevel: 'HIGH',
          riskScorePercent: 72,
          tdiScore: 68,
          criticalDefects: 1,
          highDefects: 2,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 4,
          defectFactors: ['Fastener clip loosening under heavy dynamic axle load', 'Subgrade compaction deficit'],
          cautionOrderKmph: 65,
          isTroubleSpot: true,
          recommendedAction: 'ERC clip renewal and dynamic track stabilization',
          mitigationAsset: 'DGS Dynamic Track Stabilizer',
        },
        {
          id: 'C003-SEG-03',
          segmentIndex: 3,
          chainageLabel: 'KM 24.0 – KM 34.0',
          landmark: 'Bahadurgarh Yard Freight Bypass',
          trackLine: 'Heavy Freight Loop',
          riskLevel: 'HIGH',
          riskScorePercent: 78,
          tdiScore: 74,
          criticalDefects: 1,
          highDefects: 2,
          mediumDefects: 2,
          lowDefects: 0,
          totalDefects: 5,
          defectFactors: ['Turnout diamond crossing wear', 'Axle counter section reset glitch'],
          cautionOrderKmph: 50,
          isTroubleSpot: true,
          recommendedAction: '2.5h Pre-Dawn Maintenance Block (Diamond replacement)',
          mitigationAsset: 'CSM-902 & S&T Unit',
        },
        {
          id: 'C003-SEG-04',
          segmentIndex: 4,
          chainageLabel: 'KM 34.0 – KM 42.0',
          landmark: 'Bahadurgarh — Sampla Industrial Section',
          trackLine: 'Up Heavy Freight Track',
          riskLevel: 'CRITICAL',
          riskScorePercent: 94,
          tdiScore: 92,
          criticalDefects: 4,
          highDefects: 3,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 8,
          defectFactors: [
            'Severe Ballast Fouling & Mud Pumping',
            '25T Axle Load Rail Fatigue Cracking',
            'Missing Elastic Rail Clips (ERC) Density Drop',
          ],
          cautionOrderKmph: 30,
          isTroubleSpot: true,
          recommendedAction: '3.5h Emergency Night Mega-Block (BCM Ballast Cleaner + Dynamic Stabilizer)',
          mitigationAsset: 'BCM-03 Ballast Cleaner & DGS-01',
        },
        {
          id: 'C003-SEG-05',
          segmentIndex: 5,
          chainageLabel: 'KM 42.0 – KM 56.0',
          landmark: 'Kharawar High-Axle Line',
          trackLine: 'Through Freight Main',
          riskLevel: 'MEDIUM',
          riskScorePercent: 52,
          tdiScore: 56,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 2,
          lowDefects: 1,
          totalDefects: 4,
          defectFactors: ['Minor rail corrugation', 'Subgrade moisture pocket'],
          isTroubleSpot: false,
          recommendedAction: 'Rail grinding and drainage ditch clearing',
          mitigationAsset: 'Track Excavator Gang',
        },
        {
          id: 'C003-SEG-06',
          segmentIndex: 6,
          chainageLabel: 'KM 56.0 – KM 68.0',
          landmark: 'Rohtak Outer Yard Freight Entry',
          trackLine: 'Marshalling Yard Inflow',
          riskLevel: 'HIGH',
          riskScorePercent: 76,
          tdiScore: 71,
          criticalDefects: 1,
          highDefects: 2,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 4,
          defectFactors: ['Switch expansion joint wear', 'Point motor stall warning'],
          cautionOrderKmph: 45,
          isTroubleSpot: true,
          recommendedAction: '2.0h Yard Lull Block for Switch Replacement',
          mitigationAsset: 'Yard Maintenance Gang',
        },
      ];
    }

    if (cId === 'C004') {
      return [
        {
          id: 'C004-SEG-01',
          segmentIndex: 1,
          chainageLabel: 'KM 0.0 – KM 16.0',
          landmark: 'Okhla Industrial Spur',
          trackLine: 'Dn Mixed Line',
          riskLevel: 'CLEAR',
          riskScorePercent: 30,
          tdiScore: 38,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 2,
          defectFactors: ['Nominal alignment drift', 'OHE dropper alignment OK'],
          isTroubleSpot: false,
          recommendedAction: 'Routine telemetry recording',
          mitigationAsset: 'USFD Testing Car',
        },
        {
          id: 'C004-SEG-02',
          segmentIndex: 2,
          chainageLabel: 'KM 16.0 – KM 32.0',
          landmark: 'Faridabad South Down Main',
          trackLine: 'Down Mixed Trunk',
          riskLevel: 'HIGH',
          riskScorePercent: 72,
          tdiScore: 69,
          criticalDefects: 1,
          highDefects: 2,
          mediumDefects: 2,
          lowDefects: 0,
          totalDefects: 5,
          defectFactors: ['Catenary dropper tension relaxation', 'Rail head corrugation waves'],
          cautionOrderKmph: 65,
          isTroubleSpot: true,
          recommendedAction: 'Tower Wagon tensioning & rail grinding',
          mitigationAsset: 'Tower Wagon 02',
        },
        {
          id: 'C004-SEG-03',
          segmentIndex: 3,
          chainageLabel: 'KM 32.0 – KM 48.0',
          landmark: 'Ballabgarh Mixed Junction',
          trackLine: 'Up / Dn Crossover',
          riskLevel: 'MEDIUM',
          riskScorePercent: 55,
          tdiScore: 54,
          criticalDefects: 0,
          highDefects: 2,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 4,
          defectFactors: ['Insulated joint end post degradation', 'Ballast fouling on turnout'],
          isTroubleSpot: false,
          recommendedAction: 'Glued joint overhaul',
          mitigationAsset: 'S&T Fast Reaction Gang',
        },
        {
          id: 'C004-SEG-04',
          segmentIndex: 4,
          chainageLabel: 'KM 48.0 – KM 60.0',
          landmark: 'Palwal Interlocking Area & Crossover Cluster',
          trackLine: 'Down Mixed Main Line',
          riskLevel: 'CRITICAL',
          riskScorePercent: 86,
          tdiScore: 81,
          criticalDefects: 2,
          highDefects: 3,
          mediumDefects: 1,
          lowDefects: 0,
          totalDefects: 6,
          defectFactors: [
            '25kV Catenary Stagger Beyond Permissible Limit',
            'Electric Point Machine Throw Drag / Motor Stall Current',
            'Bridge Expansion Joint Debris Accumulation',
          ],
          cautionOrderKmph: 45,
          isTroubleSpot: true,
          recommendedAction: '3.0h Night Mega-Block (OHE Tower Wagon + S&T Gang)',
          mitigationAsset: 'Tower Wagon & Point Specialist',
        },
        {
          id: 'C004-SEG-05',
          segmentIndex: 5,
          chainageLabel: 'KM 60.0 – KM 72.0',
          landmark: 'Asaoti Suburban Feeder',
          trackLine: 'Through Main',
          riskLevel: 'MEDIUM',
          riskScorePercent: 42,
          tdiScore: 45,
          criticalDefects: 0,
          highDefects: 1,
          mediumDefects: 1,
          lowDefects: 1,
          totalDefects: 3,
          defectFactors: ['Slight vertical track twist', 'Fastener torque within tolerance'],
          isTroubleSpot: false,
          recommendedAction: 'Routine tamping pass',
          mitigationAsset: 'CSM-902',
        },
        {
          id: 'C004-SEG-06',
          segmentIndex: 6,
          chainageLabel: 'KM 72.0 – KM 85.6',
          landmark: 'Moradabad Gateway Outflow',
          trackLine: 'Interchange Junction Links',
          riskLevel: 'CLEAR',
          riskScorePercent: 32,
          tdiScore: 39,
          criticalDefects: 0,
          highDefects: 0,
          mediumDefects: 2,
          lowDefects: 1,
          totalDefects: 3,
          defectFactors: ['Clean ballast section', 'Signal telemetry operating nominal'],
          isTroubleSpot: false,
          recommendedAction: 'Standard weekly yard inspection',
          mitigationAsset: 'Inspection Car',
        },
      ];
    }

    // Default / C002 / Generic corridors
    const len = activeCorridorHealth?.corridor?.lengthKm || 60;
    const step = len / 6;
    return Array.from({ length: 6 }).map((_, idx) => {
      const startKm = +(idx * step).toFixed(1);
      const endKm = +((idx + 1) * step).toFixed(1);
      const isCritical = idx === 3 && activeCorridorHealth.exceedsThreshold;
      const isHigh = idx === 1 || (idx === 4 && activeCorridorHealth.currentTDI > 55);

      return {
        id: `${cId}-SEG-${idx + 1}`,
        segmentIndex: idx + 1,
        chainageLabel: `KM ${startKm} – KM ${endKm}`,
        landmark: idx === 0 ? `${activeCorridorHealth?.corridor?.stationFrom || 'Start'} Approach` : idx === 5 ? `${activeCorridorHealth?.corridor?.stationTo || 'End'} Outer Yard` : `Mid-Corridor Section ${idx + 1}`,
        trackLine: 'Up / Dn Main Line',
        riskLevel: isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : idx % 2 === 0 ? 'MEDIUM' : 'CLEAR',
        riskScorePercent: isCritical ? 88 : isHigh ? 70 : 40,
        tdiScore: isCritical ? activeCorridorHealth.currentTDI : isHigh ? Math.round(activeCorridorHealth.currentTDI * 0.85) : 42,
        criticalDefects: isCritical ? 2 : 0,
        highDefects: isCritical ? 2 : isHigh ? 2 : 1,
        mediumDefects: 1,
        lowDefects: 1,
        totalDefects: isCritical ? 5 : isHigh ? 3 : 2,
        defectFactors: isCritical ? ['Track Geometry Anomaly', 'Ultrasonic Rail Flaw'] : ['Routine alignment drift'],
        cautionOrderKmph: isCritical ? 50 : undefined,
        isTroubleSpot: isCritical || isHigh,
        recommendedAction: isCritical ? '2.5h Night Mega-Block' : 'Scheduled maintenance pass',
        mitigationAsset: 'CSM-902 Tamping Machine',
      };
    });
  }, [activeCorridorHealth]);

  // Trouble spot count & active inspected segment
  const troubleSpotsCount = useMemo(() => {
    return corridorTrackSegments.filter((s) => s.isTroubleSpot || s.riskLevel === 'CRITICAL' || s.riskLevel === 'HIGH').length;
  }, [corridorTrackSegments]);

  const totalCautionOrdersInSegments = useMemo(() => {
    return corridorTrackSegments.filter((s) => !!s.cautionOrderKmph).length;
  }, [corridorTrackSegments]);

  const filteredHeatmapSegments = useMemo(() => {
    return corridorTrackSegments.filter((seg) => {
      if (heatmapFilter === 'TROUBLE_SPOTS_ONLY') {
        return seg.riskLevel === 'CRITICAL' || seg.riskLevel === 'HIGH';
      }
      if (heatmapFilter === 'CAUTION_ORDERS_ONLY') {
        return !!seg.cautionOrderKmph;
      }
      return true;
    });
  }, [corridorTrackSegments, heatmapFilter]);

  const activeInspectedSegment = useMemo(() => {
    if (selectedHeatmapSegmentId) {
      const found = corridorTrackSegments.find((s) => s.id === selectedHeatmapSegmentId);
      if (found) return found;
    }
    const sorted = [...corridorTrackSegments].sort((a, b) => b.riskScorePercent - a.riskScorePercent);
    return sorted[0] || corridorTrackSegments[0] || null;
  }, [corridorTrackSegments, selectedHeatmapSegmentId]);

  // Send browser-based alerts when a corridor's 30-day degradation trend crosses the critical threshold
  useEffect(() => {
    if (!notificationsEnabled) return;

    (corridorHealthAnalytics || []).forEach((item) => {
      if (item && item.corridor && item.exceedsThreshold) {
        predictiveRiskNotificationService.notifyThresholdBreach({
          corridor: item.corridor,
          currentTDI: item.currentTDI,
          threshold: criticalThreshold,
          degradationRate: item.degradationRate30Days,
          segmentName: item.segments?.[0]?.chainage || 'Track Critical Segment',
          source: 'THRESHOLD_BREACH',
        });
      }
    });
  }, [corridorHealthAnalytics, criticalThreshold, notificationsEnabled]);

  // Trigger AI-generated Maintenance Repair Forecast
  const handleTriggerRepairForecast = async () => {
    if (!activeCorridorHealth || !activeCorridorHealth.corridor) return;
    setIsForecastModalOpen(true);
    setIsGeneratingForecast(true);
    try {
      const forecast = await predictiveRepairForecastService.generateRepairForecast({
        corridor: activeCorridorHealth.corridor,
        currentTDI: activeCorridorHealth.currentTDI,
        degradationRate30Days: activeCorridorHealth.degradationRate30Days,
        criticalThreshold,
        criticalDefectsCount: activeCorridorHealth.criticalDefectsCount,
        highDefectsCount: activeCorridorHealth.highDefectsCount,
        mediumDefectsCount: activeCorridorHealth.mediumDefectsCount,
        troubleSpotsCount,
        cautionOrdersCount: totalCautionOrdersInSegments,
      });
      setCurrentForecast(forecast);
    } catch (err) {
      console.error('Failed to generate maintenance repair forecast', err);
    } finally {
      setIsGeneratingForecast(false);
    }
  };

  // Drill-down into detailed date inspection log for specific data point
  const handleOpenDateInspectionModal = (point: DayDegradationPoint) => {
    if (!activeCorridorHealth || !activeCorridorHealth.corridor) return;
    const report = corridorInspectionLogService.getDateInspectionReport(
      point.dateStr,
      point.dayNumber,
      activeCorridorHealth.corridor,
      point.degradationIndex,
      point.healthScore,
      criticalThreshold,
      point.isProjected
    );
    setActiveInspectionReport(report);
    setIsInspectionModalOpen(true);
  };

  // Compute specific risk driver breakdown data for the horizontal stacked bar chart
  const riskDriversData = useMemo(() => {
    // 1. Cross-corridor comparative driver breakdown
    const corridorsComparison = (corridorHealthAnalytics || []).map((item) => {
      const cId = item.corridor?.id || 'C001';
      const tdi = item.currentTDI;

      let tgPct = 28;
      let fiPct = 22;
      let bfPct = 24;
      let rwPct = 15;
      let oiPct = 11;

      if (cId === 'C001') {
        tgPct = 30;
        fiPct = 21;
        bfPct = 22;
        rwPct = 16;
        oiPct = 11;
      } else if (cId === 'C002') {
        tgPct = 36;
        fiPct = 26;
        bfPct = 14;
        rwPct = 12;
        oiPct = 12;
      } else if (cId === 'C003') {
        // Western Heavy Freight: Ballast Fouling is dominant
        tgPct = 24;
        fiPct = 18;
        bfPct = 38;
        rwPct = 14;
        oiPct = 6;
      } else if (cId === 'C004') {
        tgPct = 26;
        fiPct = 19;
        bfPct = 21;
        rwPct = 14;
        oiPct = 20;
      }

      if (driverUnit === 'PERCENT') {
        return {
          name: `${item.corridor?.code || cId}`,
          fullName: item.corridor?.name || cId,
          corridorId: cId,
          trackGeometry: tgPct,
          fastenerIntegrity: fiPct,
          ballastFouling: bfPct,
          railWeldFatigue: rwPct,
          oheInterlocking: oiPct,
          totalTDI: tdi,
          primaryDriver: bfPct >= tgPct && bfPct >= fiPct ? 'Ballast Fouling' : tgPct >= fiPct ? 'Track Geometry' : 'Fastener Integrity',
        };
      } else {
        return {
          name: `${item.corridor?.code || cId}`,
          fullName: item.corridor?.name || cId,
          corridorId: cId,
          trackGeometry: Number(((tgPct / 100) * tdi).toFixed(1)),
          fastenerIntegrity: Number(((fiPct / 100) * tdi).toFixed(1)),
          ballastFouling: Number(((bfPct / 100) * tdi).toFixed(1)),
          railWeldFatigue: Number(((rwPct / 100) * tdi).toFixed(1)),
          oheInterlocking: Number(((oiPct / 100) * tdi).toFixed(1)),
          totalTDI: tdi,
          primaryDriver: bfPct >= tgPct && bfPct >= fiPct ? 'Ballast Fouling' : tgPct >= fiPct ? 'Track Geometry' : 'Fastener Integrity',
        };
      }
    });

    // 2. Selected Corridor 30-Day Evolution (by 4 weeks + 7d projection)
    const selectedItem = activeCorridorHealth;
    const isFreightHeavy = selectedItem?.corridor?.id === 'C003';
    const isHighSpeed = selectedItem?.corridor?.id === 'C002';
    const totalTdi = selectedItem?.currentTDI || 60;

    const evolutionPoints = [
      {
        weekName: 'W1: Days 1–7',
        tgShare: isHighSpeed ? 40 : isFreightHeavy ? 30 : 34,
        fiShare: isHighSpeed ? 28 : isFreightHeavy ? 26 : 24,
        bfShare: isHighSpeed ? 12 : isFreightHeavy ? 24 : 18,
        rwShare: 12,
        oiShare: isHighSpeed ? 8 : isFreightHeavy ? 8 : 12,
        weekTDI: Math.max(20, Math.round(totalTdi * 0.62)),
      },
      {
        weekName: 'W2: Days 8–14',
        tgShare: isHighSpeed ? 38 : isFreightHeavy ? 28 : 32,
        fiShare: isHighSpeed ? 27 : isFreightHeavy ? 23 : 23,
        bfShare: isHighSpeed ? 14 : isFreightHeavy ? 29 : 20,
        rwShare: 12,
        oiShare: isHighSpeed ? 9 : isFreightHeavy ? 8 : 13,
        weekTDI: Math.max(25, Math.round(totalTdi * 0.74)),
      },
      {
        weekName: 'W3: Days 15–21',
        tgShare: isHighSpeed ? 36 : isFreightHeavy ? 26 : 30,
        fiShare: isHighSpeed ? 25 : isFreightHeavy ? 20 : 21,
        bfShare: isHighSpeed ? 16 : isFreightHeavy ? 34 : 23,
        rwShare: 13,
        oiShare: isHighSpeed ? 10 : isFreightHeavy ? 7 : 13,
        weekTDI: Math.max(30, Math.round(totalTdi * 0.86)),
      },
      {
        weekName: 'W4: Days 22–30',
        tgShare: isHighSpeed ? 35 : isFreightHeavy ? 24 : 28,
        fiShare: isHighSpeed ? 24 : isFreightHeavy ? 18 : 20,
        bfShare: isHighSpeed ? 17 : isFreightHeavy ? 38 : 25,
        rwShare: 14,
        oiShare: isHighSpeed ? 10 : isFreightHeavy ? 6 : 13,
        weekTDI: totalTdi,
      },
      {
        weekName: 'AI Forecast (+7d)',
        tgShare: isHighSpeed ? 33 : isFreightHeavy ? 22 : 26,
        fiShare: isHighSpeed ? 23 : isFreightHeavy ? 17 : 19,
        bfShare: isHighSpeed ? 19 : isFreightHeavy ? 42 : 28,
        rwShare: 14,
        oiShare: isHighSpeed ? 11 : isFreightHeavy ? 5 : 13,
        weekTDI: Math.min(99, Math.round(totalTdi * 1.14)),
      },
    ];

    const selectedEvolution = evolutionPoints.map((pt) => {
      if (driverUnit === 'PERCENT') {
        return {
          name: pt.weekName,
          trackGeometry: pt.tgShare,
          fastenerIntegrity: pt.fiShare,
          ballastFouling: pt.bfShare,
          railWeldFatigue: pt.rwShare,
          oheInterlocking: pt.oiShare,
          totalTDI: pt.weekTDI,
          primaryDriver: pt.bfShare >= pt.tgShare && pt.bfShare >= pt.fiShare ? 'Ballast Fouling' : pt.tgShare >= pt.fiShare ? 'Track Geometry' : 'Fastener Integrity',
        };
      } else {
        return {
          name: pt.weekName,
          trackGeometry: Number(((pt.tgShare / 100) * pt.weekTDI).toFixed(1)),
          fastenerIntegrity: Number(((pt.fiShare / 100) * pt.weekTDI).toFixed(1)),
          ballastFouling: Number(((pt.bfShare / 100) * pt.weekTDI).toFixed(1)),
          railWeldFatigue: Number(((pt.rwShare / 100) * pt.weekTDI).toFixed(1)),
          oheInterlocking: Number(((pt.oiShare / 100) * pt.weekTDI).toFixed(1)),
          totalTDI: pt.weekTDI,
          primaryDriver: pt.bfShare >= pt.tgShare && pt.bfShare >= pt.fiShare ? 'Ballast Fouling' : pt.tgShare >= pt.fiShare ? 'Track Geometry' : 'Fastener Integrity',
        };
      }
    });

    // 3. Highlighted metrics for current corridor
    const currentCorridorRow = corridorsComparison.find(
      (c) => c.corridorId === selectedItem?.corridor?.id
    ) || corridorsComparison[0];

    return {
      corridorsComparison,
      selectedEvolution,
      currentCorridorRow,
    };
  }, [corridorHealthAnalytics, activeCorridorHealth, driverUnit]);

  return (
    <div
      id="corridor-predictive-health-section"
      className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-5"
    >
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-400 shrink-0 mt-0.5 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                Predictive Health Score & Corridor Degradation Radar
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-700/60 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                HISTORICAL DEFECT AI MODEL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-medium">
                30-DAY DEGRADATION TREND
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Corridor health scores dynamically synthesized from USFD ultrasonic flaw scans, track geometry indexes (TGI), catenary arcing telemetry, and point machine motor wear.
            </p>
          </div>
        </div>

        {/* Global Risk KPI Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {highRiskCorridorsCount > 0 ? (
            <div className="px-3 py-1.5 rounded-lg bg-rose-950/90 border-2 border-rose-500/80 text-rose-200 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>{highRiskCorridorsCount} CORRIDOR(S) IN CRITICAL DEGRADATION</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ALL CORRIDORS WITHIN TOLERANCE</span>
            </div>
          )}

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              title="Refresh defect telemetry"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            id="header-ai-repair-forecast-btn"
            onClick={handleTriggerRepairForecast}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-950 text-purple-200 hover:text-white border border-purple-500/80 hover:border-purple-400 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all cursor-pointer"
            title="Trigger AI-generated Maintenance Repair Forecast estimating manpower and machinery hours required to restore target safety standards"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span>AI Repair Forecast</span>
          </button>
        </div>
      </div>

      {/* FILTER & CRITICAL THRESHOLD ADJUSTMENT TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/70 rounded-lg border border-slate-800 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search corridor or high-risk segment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterSeverity === 'ALL'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({corridors.length})
            </button>
            <button
              onClick={() => setFilterSeverity('EXCEEDING_THRESHOLD')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterSeverity === 'EXCEEDING_THRESHOLD'
                  ? 'bg-rose-700 text-white font-bold shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Critical Threshold Exceeded ({highRiskCorridorsCount})
            </button>
            <button
              onClick={() => setFilterSeverity('HIGH_RISK_ONLY')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterSeverity === 'HIGH_RISK_ONLY'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              High Risk Status
            </button>
          </div>
        </div>

        {/* Dynamic Critical Threshold Slider */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-md border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px]">Critical TDI Threshold:</span>
            <span className="font-bold text-rose-400">{criticalThreshold} TDI</span>
          </div>
          <input
            type="range"
            min={50}
            max={85}
            step={5}
            value={criticalThreshold}
            onChange={(e) => setCriticalThreshold(Number(e.target.value))}
            className="w-24 accent-rose-500 cursor-pointer"
            title="Adjust degradation threshold that triggers High Risk badge"
          />
          <span className="text-[10px] text-slate-500">(&gt;{criticalThreshold} = High Risk)</span>
        </div>

        {/* PREDICTIVE RISK NOTIFICATIONS TOGGLE & BROWSER ALERT CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Toggle Button */}
          <button
            id="toggle-predictive-risk-notifications-btn"
            onClick={handleToggleNotifications}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 font-mono text-xs font-bold transition-all border cursor-pointer ${
              notificationsEnabled
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle browser-based alerts when corridor 30-day degradation crosses critical threshold"
          >
            {notificationsEnabled ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Predictive Risk Alerts: ON</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Predictive Risk Alerts: MUTED</span>
              </>
            )}
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-950 text-amber-300 border-slate-800 hover:border-amber-600'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Emergency Siren Klaxon: ON' : 'Emergency Siren Klaxon: MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Test Alert Dispatcher */}
          <button
            onClick={handleTriggerTestAlert}
            className="px-2.5 py-1.5 rounded-md bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Dispatch a simulated browser notification alert to test browser alert delivery"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Test Alert</span>
          </button>

          {/* Permission Status Pill */}
          <span
            className={`text-[10px] px-2 py-1 rounded font-mono border ${
              permissionStatus === 'granted'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : permissionStatus === 'denied'
                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title="Browser Notification Permission Status"
          >
            {permissionStatus === 'granted'
              ? 'Push: Granted'
              : permissionStatus === 'denied'
              ? 'Push: Blocked'
              : 'In-App Mode'}
          </span>

          {/* Seasonal Peak Quick Toggle in Main Toolbar */}
          <button
            id="toggle-seasonal-peak-main-btn"
            onClick={() => setShowSeasonalPeak(!showSeasonalPeak)}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-mono text-xs font-bold transition-all border cursor-pointer ${
              showSeasonalPeak
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Historical Seasonal Peak benchmark line on the degradation trend chart"
          >
            <Sun className={`w-3.5 h-3.5 ${showSeasonalPeak ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Seasonal Peak: {showSeasonalPeak ? 'ON' : 'OFF'}</span>
          </button>

          {/* Overlay Historical Baseline Quick Selector in Main Toolbar */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <button
              id="toggle-historical-baseline-main-btn"
              onClick={() => setShowHistoricalBaseline(!showHistoricalBaseline)}
              className={`flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                showHistoricalBaseline
                  ? 'text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Overlay Historical Baseline on the 30-day degradation chart"
            >
              <History className={`w-3.5 h-3.5 ${showHistoricalBaseline ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Baseline Overlay: {showHistoricalBaseline ? `${selectedBaselineYear}` : 'OFF'}</span>
            </button>
            {showHistoricalBaseline && (
              <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-800">
                {(['2025', '2024', '2023'] as PriorBaselineYear[]).map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedBaselineYear(yr)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                      selectedBaselineYear === yr
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating inline notification feedback toast */}
      {notificationToast && (
        <div className="bg-sky-950/90 border border-sky-600 text-sky-200 px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{notificationToast}</span>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* CORRIDOR PREDICTIVE HEALTH SCORE CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="font-bold uppercase tracking-wider">Corridor Health Scorecards</span>
            <span className="text-slate-500">
              (Click a card to inspect 30-day degradation trend &amp; high-risk segments)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Showing {filteredCorridors.length} of {corridors.length} corridors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredCorridors.map((item) => {
            const isSelected = item.corridor.id === selectedCorridorId;
            const isHighRisk = item.status === 'HIGH_RISK' || item.exceedsThreshold;

            return (
              <div
                key={item.corridor.id}
                onClick={() => setSelectedCorridorId(item.corridor.id)}
                className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 border text-left flex flex-col justify-between ${
                  isSelected
                    ? isHighRisk
                      ? 'bg-[#181124] border-rose-500 ring-2 ring-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                      : 'bg-[#0f1d3a] border-sky-500 ring-2 ring-sky-500/40 shadow-lg'
                    : isHighRisk
                    ? 'bg-[#13111f] border-rose-900/70 hover:border-rose-700/80 hover:bg-[#161224]'
                    : 'bg-[#0b1329] border-slate-800 hover:border-slate-700 hover:bg-[#0e172e]'
                }`}
              >
                {/* PROMINENT HIGH RISK BADGE ON CORRIDOR CARD HEADER */}
                {item.exceedsThreshold && (
                  <div className="mb-2.5 -mx-1 px-2.5 py-1.5 rounded-lg bg-rose-950/95 border-2 border-rose-500 text-rose-200 text-[11px] font-mono font-black flex items-center justify-between shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>HIGH RISK — THRESHOLD EXCEEDED</span>
                    </div>
                    <span className="text-[10px] bg-rose-900/90 px-1.5 py-0.5 rounded text-rose-100">
                      {item.currentTDI} TDI
                    </span>
                  </div>
                )}

                {/* Normal / Watch badge when not exceeding critical threshold */}
                {!item.exceedsThreshold && item.status === 'MODERATE_WATCH' && (
                  <div className="mb-2.5 -mx-1 px-2 py-1 rounded-md bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>ELEVATED WATCH — ACCELERATING WEAR</span>
                  </div>
                )}

                {!item.exceedsThreshold && item.status === 'OPTIMAL' && (
                  <div className="mb-2.5 -mx-1 px-2 py-1 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>OPTIMAL HEALTH — WITHIN TOLERANCE</span>
                  </div>
                )}

                {/* Corridor Title & Identification */}
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] font-bold border border-slate-700">
                          {item.corridor.code || item.corridor.id}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {item.corridor.lengthKm} km • {item.corridor.tracksCount} Tracks
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 font-mono mt-1 line-clamp-1">
                        {item.corridor.name}
                      </h4>
                    </div>

                    {/* Circular Health Score Badge */}
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-mono border ${
                        item.healthScore >= 80
                          ? 'bg-emerald-950/90 border-emerald-600/70 text-emerald-300'
                          : item.healthScore >= 65
                          ? 'bg-amber-950/90 border-amber-600/70 text-amber-300'
                          : 'bg-rose-950/95 border-rose-600/80 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                      }`}
                    >
                      <span className="text-sm font-black leading-none">{item.healthScore}</span>
                      <span className="text-[8px] font-semibold opacity-75">/ 100</span>
                    </div>
                  </div>

                  {/* Health Score Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Corridor Health Index</span>
                      <span
                        className={`font-bold ${
                          item.healthScore >= 80
                            ? 'text-emerald-400'
                            : item.healthScore >= 65
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.healthScore >= 80
                          ? 'EXCELLENT'
                          : item.healthScore >= 65
                          ? 'MODERATE'
                          : 'CRITICAL'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.healthScore >= 80
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : item.healthScore >= 65
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-rose-600 to-red-500'
                        }`}
                        style={{ width: `${item.healthScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Defect Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px]">30D DEGRADATION</span>
                      <span
                        className={`font-bold flex items-center gap-0.5 ${
                          item.degradationRate30Days >= 20 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        +{item.degradationRate30Days}% TDI
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px]">ACTIVE DEFECTS</span>
                      <span className="text-slate-200 font-bold">
                        {item.defectsCount} total{' '}
                        {item.criticalDefectsCount > 0 && (
                          <span className="text-rose-400 font-bold">({item.criticalDefectsCount} crit)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Upcoming High-Risk Segment Micro-Highlight */}
                  {item.segments.length > 0 && (
                    <div className="mt-2.5 p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono">
                      <div className="flex items-center justify-between text-slate-400 mb-0.5">
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> High-Risk Segment:
                        </span>
                        <span className="text-rose-400 font-bold">
                          {item.segments[0].riskScorePercent}% Risk
                        </span>
                      </div>
                      <div className="text-slate-200 font-medium line-clamp-1">
                        {item.segments[0].chainage}
                      </div>
                      <div className="text-slate-400 text-[9px] line-clamp-1 mt-0.5">
                        {item.segments[0].primaryDefectFactors[0]}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Selection Indicator */}
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className={`${isSelected ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                    {isSelected ? '● ACTIVE INSPECTION' : 'Select to view trend'}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isSelected ? 'text-sky-400 translate-x-1' : 'text-slate-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED CORRIDOR DETAILED INSPECTION: 30-DAY DEGRADATION TREND CHART & HIGH-RISK SEGMENTS */}
      {activeCorridorHealth && activeCorridorHealth.corridor && (
        <div className="bg-slate-950/80 rounded-xl p-5 border border-sky-900/60 shadow-xl space-y-5">
          {/* Active Corridor Banner with PROMINENT 'High Risk' Status Badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono text-xs font-bold border border-sky-700">
                  {activeCorridorHealth.corridor.code || activeCorridorHealth.corridor.id}
                </span>
                <h3 className="text-base font-black text-slate-100 font-mono tracking-wide">
                  {activeCorridorHealth.corridor.name}
                </h3>

                {/* PROMINENT HIGH RISK BADGE WHEN 30-DAY DEGRADATION TREND EXCEEDS THRESHOLD */}
                {activeCorridorHealth.exceedsThreshold ? (
                  <span className="px-3 py-1 rounded-full bg-rose-950/95 text-rose-200 border-2 border-rose-500 font-mono text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    HIGH RISK: 30-DAY DEGRADATION THRESHOLD EXCEEDED ({activeCorridorHealth.currentTDI} &gt; {criticalThreshold} TDI)
                  </span>
                ) : activeCorridorHealth.status === 'MODERATE_WATCH' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-600 font-mono text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    MODERATE RISK WATCH
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600 font-mono text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    OPTIMAL STABILITY
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 font-mono mt-1">
                Route: {activeCorridorHealth.corridor.stationFrom} ➔ {activeCorridorHealth.corridor.stationTo} •{' '}
                {activeCorridorHealth.corridor.lengthKm} km • Max Permissible Speed:{' '}
                {activeCorridorHealth.corridor.speedLimitKmph} km/h • Route Utilization:{' '}
                {activeCorridorHealth.corridor.utilization}%
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                id="active-corridor-ai-repair-forecast-btn"
                onClick={handleTriggerRepairForecast}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-950 text-purple-200 hover:text-white border border-purple-500/80 hover:border-purple-400 flex items-center gap-2 transition-all font-bold shadow-[0_0_12px_rgba(168,85,247,0.35)] hover:shadow-[0_0_18px_rgba(168,85,247,0.5)] cursor-pointer"
                title="Trigger AI-generated Maintenance Repair Forecast using 30-day degradation trend to estimate manpower and machinery hours required to restore target safety standards"
              >
                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                <span>AI Repair Forecast</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 text-[9px]">
                  RDSO AI
                </span>
              </button>

              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('timeline', { corridorId: activeCorridorHealth.corridor.id });
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-900/70 hover:bg-sky-800 text-sky-200 border border-sky-600/70 flex items-center gap-1.5 transition-colors font-semibold"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Preventive Block</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('resource_allocation', { corridorId: activeCorridorHealth.corridor.id, tab: 'MACHINERY' });
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Deploy Machinery</span>
              </button>
            </div>
          </div>

          {/* CORRIDOR TRACK SEGMENT DEFECT DISTRIBUTION MINI-HEATMAP */}
          <div className="bg-[#0c1427] p-4 rounded-xl border border-sky-950/90 space-y-3.5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Corridor Track Segment Defect Mini-Heatmap
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">
                    SPATIAL TROUBLE SPOT DISTRIBUTION
                  </span>
                  {troubleSpotsCount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                      <span>{troubleSpotsCount} Trouble Spot(s) Pinpointed</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Spatial density of high-risk defects and track anomalies mapped along railway chainage from {activeCorridorHealth.corridor.stationFrom} to {activeCorridorHealth.corridor.stationTo}. Click any segment to inspect trouble spot diagnostics.
                </p>
              </div>

              {/* Heatmap Filters & Scale */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto font-mono text-xs">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setHeatmapFilter('ALL')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      heatmapFilter === 'ALL'
                        ? 'bg-sky-700 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Segments ({corridorTrackSegments.length})
                  </button>
                  <button
                    onClick={() => setHeatmapFilter('TROUBLE_SPOTS_ONLY')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      heatmapFilter === 'TROUBLE_SPOTS_ONLY'
                        ? 'bg-rose-700 text-white font-bold'
                        : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    Trouble Spots ({troubleSpotsCount})
                  </button>
                  <button
                    onClick={() => setHeatmapFilter('CAUTION_ORDERS_ONLY')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      heatmapFilter === 'CAUTION_ORDERS_ONLY'
                        ? 'bg-amber-700 text-white font-bold'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    Caution Orders ({totalCautionOrdersInSegments})
                  </button>
                </div>
              </div>
            </div>

            {/* LINEAR RAILWAY CHAINAGE RUNNING RIBBON */}
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>KM 0.0 ({activeCorridorHealth.corridor.stationFrom})</span>
              </span>
              <span className="text-slate-600 hidden md:inline">
                ═══════════════ Railway Corridor Chainage Vector ═══════════════
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <span>KM {activeCorridorHealth.corridor.lengthKm} ({activeCorridorHealth.corridor.stationTo})</span>
                <MapPin className="w-3 h-3 text-emerald-400" />
              </span>
            </div>

            {/* MINI-HEATMAP TILES GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
              {filteredHeatmapSegments.map((seg) => {
                const isSelected = activeInspectedSegment?.id === seg.id;
                const isCritical = seg.riskLevel === 'CRITICAL';
                const isHigh = seg.riskLevel === 'HIGH';
                const isMedium = seg.riskLevel === 'MEDIUM';

                return (
                  <div
                    key={seg.id}
                    onClick={() => setSelectedHeatmapSegmentId(seg.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between select-none relative group ${
                      isSelected
                        ? 'ring-2 ring-rose-400 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)] scale-[1.02]'
                        : ''
                    } ${
                      isCritical
                        ? 'bg-gradient-to-b from-rose-950/90 to-red-950/80 border-rose-600/80 hover:border-rose-400 text-rose-100'
                        : isHigh
                        ? 'bg-gradient-to-b from-amber-950/80 to-yellow-950/70 border-amber-600/70 hover:border-amber-400 text-amber-100'
                        : isMedium
                        ? 'bg-gradient-to-b from-sky-950/50 to-slate-900 border-sky-800/60 hover:border-sky-500 text-slate-200'
                        : 'bg-gradient-to-b from-[#0b1424] to-[#0c192d] border-emerald-900/60 hover:border-emerald-600 text-emerald-300'
                    }`}
                    title={`Click to inspect trouble spot diagnostics for ${seg.chainageLabel} (${seg.landmark})`}
                  >
                    <div>
                      {/* Top Header: Chainage & Trouble Spot Badge */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-300 truncate">
                          {seg.chainageLabel}
                        </span>
                        {isCritical ? (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                        ) : isHigh ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        ) : null}
                      </div>

                      {/* Landmark Title */}
                      <div className="text-[11px] font-mono font-bold line-clamp-2 leading-tight min-h-[28px] text-slate-100">
                        {seg.landmark}
                      </div>
                    </div>

                    {/* Bottom Metrics: Risk Score & Defect Counts */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between font-mono text-[10px]">
                      <span
                        className={`font-black ${
                          isCritical
                            ? 'text-rose-300'
                            : isHigh
                            ? 'text-amber-300'
                            : isMedium
                            ? 'text-sky-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {seg.riskScorePercent}% Risk
                      </span>

                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                        {seg.criticalDefects > 0 ? (
                          <span className="text-rose-400 font-bold">{seg.criticalDefects} Crit</span>
                        ) : seg.highDefects > 0 ? (
                          <span className="text-amber-400">{seg.highDefects} High</span>
                        ) : seg.totalDefects > 0 ? (
                          <span>{seg.totalDefects} Def</span>
                        ) : (
                          <span className="text-emerald-400">Clear</span>
                        )}
                      </span>
                    </div>

                    {/* Caution Order Pill if active */}
                    {seg.cautionOrderKmph && (
                      <div className="mt-1 -mx-0.5 px-1 py-0.5 rounded bg-yellow-950/90 text-yellow-300 border border-yellow-700/80 text-[8px] font-mono font-bold flex items-center justify-between">
                        <span>Caution:</span>
                        <span>{seg.cautionOrderKmph} km/h</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TROUBLE SPOT PINPOINT DIAGNOSTIC CARD (When a segment is clicked / inspected) */}
            {activeInspectedSegment && (
              <div className="p-3.5 rounded-lg bg-slate-950/90 border border-sky-800/60 font-mono text-xs shadow-inner">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-bold text-sm text-slate-100">
                        {activeInspectedSegment.chainageLabel} • {activeInspectedSegment.landmark}
                      </span>
                      <span className="text-slate-400 text-xs">({activeInspectedSegment.trackLine})</span>

                      {activeInspectedSegment.riskLevel === 'CRITICAL' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-600 font-bold text-[10px] animate-pulse">
                          CRITICAL TROUBLE SPOT
                        </span>
                      ) : activeInspectedSegment.riskLevel === 'HIGH' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-600 font-bold text-[10px]">
                          ELEVATED RISK SPOT
                        </span>
                      ) : activeInspectedSegment.riskLevel === 'MEDIUM' ? (
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-200 border border-sky-800 font-bold text-[10px]">
                          MODERATE ATTENTION
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-800 font-bold text-[10px]">
                          NOMINAL STABILITY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Segment TDI: <strong className="text-slate-200">{activeInspectedSegment.tdiScore}</strong> • Overall Segment Risk Score:{' '}
                      <strong className={activeInspectedSegment.riskScorePercent >= 70 ? 'text-rose-400' : 'text-amber-400'}>
                        {activeInspectedSegment.riskScorePercent}%
                      </strong>{' '}
                      • Active Defect Count:{' '}
                      <span className="text-rose-300 font-bold">{activeInspectedSegment.criticalDefects} Critical</span>,{' '}
                      <span className="text-amber-300 font-bold">{activeInspectedSegment.highDefects} High</span>,{' '}
                      <span className="text-slate-300">{activeInspectedSegment.mediumDefects} Medium</span>
                    </p>
                  </div>

                  {activeInspectedSegment.cautionOrderKmph && (
                    <div className="px-3 py-1.5 rounded bg-yellow-950/80 border border-yellow-700/80 text-yellow-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span>Speed Restriction (Caution Order): {activeInspectedSegment.cautionOrderKmph} km/h</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-6 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Contributing Defect Factors at Trouble Spot:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeInspectedSegment.defectFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[11px] flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>{factor}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-6 flex flex-col sm:flex-row sm:items-center justify-end gap-2 text-xs">
                    <div className="text-right sm:text-right mr-2">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Recommended Mitigation:</span>
                      <span className="text-slate-200 text-[11px] font-semibold">{activeInspectedSegment.recommendedAction}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('timeline', {
                            corridorId: activeCorridorHealth.corridor.id,
                            highlightChainage: activeInspectedSegment.chainageLabel,
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Plan Segment Block</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Heatmap Legend */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-950 border border-rose-500 inline-block shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
                  <span>Critical Trouble Spot (≥80% Risk)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-950 border border-amber-600 inline-block" />
                  <span>Elevated Risk (60–79%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-950 border border-sky-800 inline-block" />
                  <span>Moderate Attention (40–59%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800 inline-block" />
                  <span>Nominal Clear (&lt;40%)</span>
                </span>
              </div>
              <span className="text-slate-500">
                Click any tile to pin trouble spot diagnostics &amp; speed restrictions
              </span>
            </div>
          </div>

          {/* TWO COLUMN SECTION: RECHARTS 30-DAY DEGRADATION TREND LINE CHART & UPCOMING HIGH-RISK SEGMENTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT / CENTER (8 COLS): RECHARTS 30-DAY DEGRADATION TREND CHART */}
            <div className="lg:col-span-7 bg-[#0c1427] p-4 rounded-xl border border-sky-950/90 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                        30-Day Degradation Trend Line Chart
                      </h4>
                      {activeCorridorHealth.exceedsThreshold && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          CRITICAL DEGRADATION VELOCITY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Tracking Track Degradation Index (TDI) vs Critical Threshold ({criticalThreshold} TDI) over 30 days + 7-day predictive projection.
                    </p>
                  </div>

                  {/* Chart controls: Metric & Window Selector */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-900/90 p-1 rounded-md border border-slate-800 self-start sm:self-auto">
                    <button
                      onClick={() => setChartMetric('TDI')}
                      className={`px-2 py-0.5 rounded ${
                        chartMetric === 'TDI'
                          ? 'bg-rose-900/90 text-rose-200 font-bold border border-rose-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      TDI (Degradation)
                    </button>
                    <button
                      onClick={() => setChartMetric('HEALTH_SCORE')}
                      className={`px-2 py-0.5 rounded ${
                        chartMetric === 'HEALTH_SCORE'
                          ? 'bg-sky-800 text-sky-100 font-bold border border-sky-600'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Health Score (0-100)
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      onClick={() => setTimeWindowDays(14)}
                      className={`px-1.5 py-0.5 rounded ${
                        timeWindowDays === 14 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      14D
                    </button>
                    <button
                      onClick={() => setTimeWindowDays(30)}
                      className={`px-1.5 py-0.5 rounded ${
                        timeWindowDays === 30 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      30D
                    </button>
                    <span className="text-slate-700">|</span>
                    {/* TOGGLE HISTORICAL SEASONAL PEAK */}
                    <button
                      id="toggle-seasonal-peak-btn"
                      onClick={() => setShowSeasonalPeak(!showSeasonalPeak)}
                      className={`px-2 py-0.5 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all border cursor-pointer ${
                        showSeasonalPeak
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                      title="Show or hide the Historical Seasonal Peak line representing the average degradation observed during this month in previous years"
                    >
                      <Sun className={`w-3 h-3 ${showSeasonalPeak ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                      <span>Seasonal Peak: {showSeasonalPeak ? 'ON' : 'OFF'}</span>
                    </button>
                    <span className="text-slate-700">|</span>
                    {/* OVERLAY HISTORICAL BASELINE TOGGLE */}
                    <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded border border-slate-800">
                      <button
                        id="toggle-historical-baseline-btn"
                        onClick={() => setShowHistoricalBaseline(!showHistoricalBaseline)}
                        className={`px-2 py-0.5 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all border cursor-pointer ${
                          showHistoricalBaseline
                            ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                        title="Overlay a prior year's baseline degradation series to identify seasonal deviation patterns"
                      >
                        <History className={`w-3 h-3 ${showHistoricalBaseline ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                        <span>Baseline Overlay: {showHistoricalBaseline ? 'ON' : 'OFF'}</span>
                      </button>

                      {showHistoricalBaseline && (
                        <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800">
                          {(['2025', '2024', '2023'] as PriorBaselineYear[]).map((yr) => (
                            <button
                              key={yr}
                              onClick={() => setSelectedBaselineYear(yr)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                                selectedBaselineYear === yr
                                  ? 'bg-cyan-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-850'
                              }`}
                              title={`Select ${yr} historical baseline data series`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="text-slate-700">|</span>
                    {/* TRIGGER AI MAINTENANCE REPAIR FORECAST */}
                    <button
                      id="chart-trigger-repair-forecast-btn"
                      onClick={handleTriggerRepairForecast}
                      className="px-2.5 py-0.5 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all border border-purple-500/80 bg-gradient-to-r from-purple-950 to-indigo-950 text-purple-200 hover:text-white hover:border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)] cursor-pointer"
                      title="Trigger AI-generated Maintenance Repair Forecast using the 30-day degradation trend to estimate manpower and machinery hours required to restore target safety standards"
                    >
                      <Sparkles className="w-3 h-3 text-purple-300 animate-pulse" />
                      <span>AI Repair Forecast</span>
                    </button>

                    <span className="text-slate-700">|</span>
                    {/* DRILL DOWN DATE INSPECTION LOGS QUICK BUTTON */}
                    <button
                      id="drill-down-inspection-logs-btn"
                      onClick={() => {
                        const targetPoint =
                          displayedTrendData.find((p) => p.dayNumber === 30) ||
                          displayedTrendData[displayedTrendData.length - 1];
                        if (targetPoint) handleOpenDateInspectionModal(targetPoint);
                      }}
                      className="px-2.5 py-0.5 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all border border-sky-500/80 bg-gradient-to-r from-sky-950 to-blue-950 text-sky-200 hover:text-white hover:border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.25)] cursor-pointer"
                      title="Drill down into detailed inspection logs, defect locations, and 5-inspection severity trend sparklines"
                    >
                      <Calendar className="w-3 h-3 text-sky-400" />
                      <span>Inspection Logs Drill-Down</span>
                    </button>
                  </div>
                </div>

                {/* SEASONAL DEVIATION PATTERN SUMMARY BANNER */}
                {showHistoricalBaseline && activeDeviationStats && (
                  <div className="mt-2.5 px-3 py-2 rounded-lg bg-cyan-950/30 border border-cyan-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      <span className="text-cyan-300 font-bold">
                        {selectedBaselineYear} Seasonal Deviation Pattern:
                      </span>
                      <span className="text-slate-300">
                        {activeDeviationStats.patternSummary}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400 text-[11px]">30-Day Mean Delta:</span>
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded ${
                          activeDeviationStats.avgDelta > 0
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {activeDeviationStats.avgDelta > 0
                          ? `+${activeDeviationStats.avgDelta} TDI (Accelerated Degradation)`
                          : `${activeDeviationStats.avgDelta} TDI (Improved Stability)`}
                      </span>
                    </div>
                  </div>
                )}

                {/* THE RECHARTS LINE CHART */}
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={displayedTrendData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length) {
                          const point = e.activePayload[0].payload as DayDegradationPoint;
                          handleOpenDateInspectionModal(point);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.8} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                        interval={chartMetric === 'TDI' ? (timeWindowDays === 30 ? 4 : 2) : (timeWindowDays === 30 ? 4 : 2)}
                      />
                      <YAxis
                        domain={chartMetric === 'TDI' ? [0, 100] : [0, 100]}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                        tickFormatter={(v) => `${v}${chartMetric === 'TDI' ? '' : '%'}`}
                      />
                      <Tooltip
                        cursor={{ stroke: '#38bdf8', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as DayDegradationPoint;
                            const isAbove = data.degradationIndex >= criticalThreshold;
                            const baselinePoint = activeCorridorHealth?.trendPoints.find((p) => p.dayNumber === 30);
                            const baselineTDI = baselinePoint ? baselinePoint.degradationIndex : (activeCorridorHealth?.currentTDI || 60);
                            const baselineHealth = baselinePoint ? baselinePoint.healthScore : (activeCorridorHealth?.healthScore || 70);
                            const tdiDelta = data.degradationIndex - baselineTDI;
                            const isProjectedPoint = data.isProjected;
                            const isAnchorPoint = data.dayNumber === 30;

                            return (
                              <div className="bg-[#0b1329]/95 backdrop-blur-md border border-sky-700/80 p-3 rounded-xl shadow-2xl text-xs font-mono max-w-sm z-50">
                                {/* Header: Date / Day Label & Badge */}
                                <div className="flex items-center justify-between gap-3 text-slate-200 font-bold border-b border-slate-800 pb-1.5 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                                    <span>{data.label}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">({data.dateStr})</span>
                                  </div>
                                  {isProjectedPoint ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                                      <span>7D PROJECTION</span>
                                    </span>
                                  ) : isAnchorPoint ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-700 font-bold">
                                      DAY 30 ANCHOR
                                    </span>
                                  ) : isAbove ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700 font-bold">
                                      THRESHOLD EXCEEDED
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700">
                                      HISTORICAL OBSERVED
                                    </span>
                                  )}
                                </div>

                                {/* Main Metrics Grid */}
                                <div className="space-y-1.5">
                                  {/* EXACT DEGRADATION METRIC */}
                                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-400 font-medium">Exact Degradation Metric:</span>
                                      <span
                                        className={`font-black text-sm ${
                                          data.degradationIndex >= criticalThreshold
                                            ? 'text-rose-400'
                                            : data.degradationIndex >= 55
                                            ? 'text-amber-400'
                                            : 'text-emerald-400'
                                        }`}
                                      >
                                        {data.degradationIndex} TDI
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                      <span>Metric Classification:</span>
                                      <span className={data.degradationIndex >= criticalThreshold ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                        {data.degradationIndex >= criticalThreshold
                                          ? `CRITICAL (+${data.degradationIndex - criticalThreshold} above threshold)`
                                          : `SAFE (${criticalThreshold - data.degradationIndex} margin)`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* EXACT PROJECTION VALUE */}
                                  <div className={`p-2 rounded-lg border ${
                                    isProjectedPoint
                                      ? 'bg-purple-950/40 border-purple-700/60'
                                      : 'bg-slate-900/60 border-slate-800'
                                  }`}>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-purple-300 font-medium flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3 text-purple-400" />
                                        <span>7-Day Projection Value:</span>
                                      </span>
                                      <span className="font-black text-sm text-purple-200">
                                        {isProjectedPoint
                                          ? `${data.projectedDegradationIndex} TDI`
                                          : isAnchorPoint
                                          ? `${data.degradationIndex} TDI (Baseline)`
                                          : 'Observational Data'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                      <span>Projection Status:</span>
                                      <span className="text-purple-300 font-semibold">
                                        {isProjectedPoint
                                          ? `+${tdiDelta > 0 ? tdiDelta : 0} TDI projected vs Day 30 baseline`
                                          : isAnchorPoint
                                          ? 'Baseline anchor for 7-day dashed model'
                                          : `Pre-projection history (${30 - data.dayNumber}d ago)`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Secondary Metrics: Health Score & Defect Burden */}
                                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <div className="p-1.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                                      <span className="text-[10px] text-slate-400">Health Score:</span>
                                      <span className="text-xs font-bold text-sky-300">
                                        {data.healthScore}/100 {isProjectedPoint && <span className="text-[9px] text-purple-300">(Projected)</span>}
                                      </span>
                                    </div>
                                    <div className="p-1.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                                      <span className="text-[10px] text-slate-400">Geometry (TGI):</span>
                                      <span className="text-xs font-bold text-slate-200">{data.cumulativeTGI} pts</span>
                                    </div>
                                  </div>

                                  {/* HISTORICAL SEASONAL PEAK BENCHMARK */}
                                  {showSeasonalPeak && (
                                    <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-600/50">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-amber-300 font-medium flex items-center gap-1">
                                          <Sun className="w-3 h-3 text-amber-400" />
                                          <span>Historical Seasonal Peak:</span>
                                        </span>
                                        <span className="font-black text-sm text-amber-200">
                                          {chartMetric === 'TDI'
                                            ? `${data.seasonalPeakDegradation} TDI`
                                            : `${data.seasonalPeakHealthScore}/100`}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                        <span>Seasonal Variance:</span>
                                        <span
                                          className={`font-bold ${
                                            chartMetric === 'TDI'
                                              ? data.degradationIndex >= data.seasonalPeakDegradation
                                                ? 'text-rose-400'
                                                : 'text-emerald-400'
                                              : data.healthScore <= data.seasonalPeakHealthScore
                                              ? 'text-rose-400'
                                              : 'text-emerald-400'
                                          }`}
                                        >
                                          {chartMetric === 'TDI'
                                            ? data.degradationIndex >= data.seasonalPeakDegradation
                                              ? `+${data.degradationIndex - data.seasonalPeakDegradation} TDI above previous years' avg peak`
                                              : `${data.seasonalPeakDegradation - data.degradationIndex} TDI below previous years' avg peak`
                                            : data.healthScore <= data.seasonalPeakHealthScore
                                            ? `-${data.seasonalPeakHealthScore - data.healthScore} pts below previous years' peak`
                                            : `+${data.healthScore - data.seasonalPeakHealthScore} pts above previous years' peak`}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* OVERLAY HISTORICAL BASELINE & SEASONAL DEVIATION PATTERN */}
                                  {showHistoricalBaseline && (
                                    <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-600/60">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-cyan-300 font-medium flex items-center gap-1">
                                          <History className="w-3 h-3 text-cyan-400" />
                                          <span>{selectedBaselineYear} Historical Baseline:</span>
                                        </span>
                                        <span className="font-black text-sm text-cyan-200">
                                          {chartMetric === 'TDI'
                                            ? `${data.baselineYearDegradation} TDI`
                                            : `${data.baselineYearHealthScore}/100`}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                        <span>Seasonal Deviation:</span>
                                        <span
                                          className={`font-bold ${
                                            chartMetric === 'TDI'
                                              ? data.priorYearDeviationDelta > 0
                                                ? 'text-rose-400'
                                                : 'text-emerald-400'
                                              : (data.healthScore - data.baselineYearHealthScore) < 0
                                              ? 'text-rose-400'
                                              : 'text-emerald-400'
                                          }`}
                                        >
                                          {chartMetric === 'TDI'
                                            ? data.priorYearDeviationDelta > 0
                                              ? `+${data.priorYearDeviationDelta} TDI (${selectedBaselineYear} wear acceleration pattern)`
                                              : `${data.priorYearDeviationDelta} TDI (${selectedBaselineYear} stabilization pattern)`
                                            : (data.healthScore - data.baselineYearHealthScore) >= 0
                                            ? `+${data.healthScore - data.baselineYearHealthScore} pts higher health vs ${selectedBaselineYear}`
                                            : `${data.healthScore - data.baselineYearHealthScore} pts lower health vs ${selectedBaselineYear}`}
                                        </span>
                                      </div>
                                      {data.priorYearsData?.[selectedBaselineYear]?.deviationNote && (
                                        <div className="mt-1 pt-1 border-t border-cyan-800/40 text-[9px] text-cyan-300/90 italic">
                                          {data.priorYearsData[selectedBaselineYear].deviationNote}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Active Hovered Line Series Values */}
                                  {payload.length > 0 && (
                                    <div className="pt-1.5 mt-1 border-t border-slate-800/80">
                                      <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                                        Active Series at Hovered Point:
                                      </span>
                                      <div className="space-y-0.5">
                                        {payload.map((p, idx) => (
                                          p.value != null && (
                                            <div key={idx} className="flex items-center justify-between text-[10px]">
                                              <span className="flex items-center gap-1.5 text-slate-300">
                                                <span
                                                  className="w-2 h-2 rounded-full inline-block shrink-0"
                                                  style={{ backgroundColor: p.color || '#38bdf8' }}
                                                />
                                                <span className="truncate max-w-[170px]">{p.name}:</span>
                                              </span>
                                              <span className="font-bold font-mono text-slate-100">
                                                {p.value} {chartMetric === 'TDI' ? (p.name?.includes('TGI') ? 'pts' : 'TDI') : '%'}
                                              </span>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Maintenance Cycle Model Note */}
                                  {data.maintenanceCycleNote && (
                                    <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[10px] text-purple-300 leading-tight">
                                      <div className="flex items-center gap-1 text-slate-400 text-[9px] uppercase font-bold mb-0.5">
                                        <Wrench className="w-2.5 h-2.5 text-purple-400" />
                                        <span>Maintenance Cycle Driver:</span>
                                      </div>
                                      <span className="italic">{data.maintenanceCycleNote}</span>
                                    </div>
                                  )}

                                  {/* CLICK-TO-DRILLDOWN CALLOUT */}
                                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                                    <div className="text-center text-[10px] text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-700/80 rounded py-1 px-2 flex items-center justify-center gap-1.5 shadow-sm">
                                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                                      <span>Click data point to inspect detailed logs &amp; 5-log sparklines</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                      />

                      {/* Reference line for critical safety threshold */}
                      <ReferenceLine
                        y={chartMetric === 'TDI' ? criticalThreshold : 100 - criticalThreshold}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: `Critical Threshold (${chartMetric === 'TDI' ? criticalThreshold : 100 - criticalThreshold})`,
                          fill: '#f43f5e',
                          fontSize: 10,
                          position: 'insideTopRight',
                          fontFamily: 'monospace',
                        }}
                      />

                      {chartMetric === 'TDI' ? (
                        <>
                          {/* 1. SOLID LINE: Observed 30-Day Degradation Trend */}
                          <Line
                            name="Observed 30-Day Trend"
                            type="monotone"
                            dataKey="historicalDegradationIndex"
                            stroke="#f43f5e"
                            strokeWidth={2.5}
                            connectNulls={false}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (!payload || payload.historicalDegradationIndex == null) return null;
                              if (payload.degradationIndex >= criticalThreshold) {
                                return (
                                  <circle
                                    key={`crit-${payload.dayNumber}`}
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill="#f43f5e"
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                    className="cursor-pointer hover:scale-125 transition-transform"
                                    onClick={() => handleOpenDateInspectionModal(payload)}
                                  />
                                );
                              }
                              return (
                                <circle
                                  key={`norm-${payload.dayNumber}`}
                                  cx={cx}
                                  cy={cy}
                                  r={2.5}
                                  fill="#f43f5e"
                                  className="cursor-pointer hover:scale-125 transition-transform"
                                  onClick={() => handleOpenDateInspectionModal(payload)}
                                />
                              );
                            }}
                            activeDot={{
                              r: 6.5,
                              fill: '#f43f5e',
                              stroke: '#fff',
                              strokeWidth: 2,
                              cursor: 'pointer',
                              onClick: (_: any, payload: any) => {
                                if (payload && payload.payload) {
                                  handleOpenDateInspectionModal(payload.payload as DayDegradationPoint);
                                }
                              },
                            }}
                          />

                          {/* 2. DASHED CONTINUATION LINE: 7-Day Projected Trend based on Historical Maintenance Cycles */}
                          <Line
                            name="7-Day Projected Trend (Maintenance Cycles)"
                            type="monotone"
                            dataKey="projectedDegradationIndex"
                            stroke="#c084fc"
                            strokeWidth={2.5}
                            strokeDasharray="5 5"
                            connectNulls={false}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (!payload || payload.projectedDegradationIndex == null) return null;
                              return (
                                <circle
                                  key={`proj-${payload.dayNumber}`}
                                  cx={cx}
                                  cy={cy}
                                  r={4}
                                  fill="#c084fc"
                                  stroke="#581c87"
                                  strokeWidth={1.5}
                                  className="cursor-pointer hover:scale-125 transition-transform"
                                  onClick={() => handleOpenDateInspectionModal(payload)}
                                />
                              );
                            }}
                            activeDot={{
                              r: 6.5,
                              fill: '#c084fc',
                              stroke: '#fff',
                              strokeWidth: 2,
                              cursor: 'pointer',
                              onClick: (_: any, payload: any) => {
                                if (payload && payload.payload) {
                                  handleOpenDateInspectionModal(payload.payload as DayDegradationPoint);
                                }
                              },
                            }}
                          />

                          {/* 3. Track Geometry Index Reference Line */}
                          <Line
                            name="Track Geometry Index (TGI)"
                            type="monotone"
                            dataKey="cumulativeTGI"
                            stroke="#38bdf8"
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                            dot={false}
                          />

                          {/* 4. HISTORICAL SEASONAL PEAK LINE */}
                          {showSeasonalPeak && (
                            <Line
                              name="Historical Seasonal Peak (Prev. Years)"
                              type="monotone"
                              dataKey="seasonalPeakDegradation"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              strokeDasharray="4 3"
                              dot={false}
                              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#78350f', strokeWidth: 1.5 }}
                            />
                          )}

                          {/* 5. OVERLAY HISTORICAL BASELINE LINE (Prior Year Series) */}
                          {showHistoricalBaseline && (
                            <Line
                              name={`Historical Baseline (${selectedBaselineYear})`}
                              type="monotone"
                              dataKey="baselineYearDegradation"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              strokeDasharray="6 3"
                              dot={false}
                              activeDot={{ r: 5, fill: '#06b6d4', stroke: '#164e63', strokeWidth: 1.5 }}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {/* 1. SOLID LINE: Observed Corridor Health Score */}
                          <Line
                            name="Observed Health Score"
                            type="monotone"
                            dataKey="historicalHealthScore"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            connectNulls={false}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (!payload || payload.historicalHealthScore == null) return null;
                              return (
                                <circle
                                  key={`health-norm-${payload.dayNumber}`}
                                  cx={cx}
                                  cy={cy}
                                  r={2.5}
                                  fill="#10b981"
                                  className="cursor-pointer hover:scale-125 transition-transform"
                                  onClick={() => handleOpenDateInspectionModal(payload)}
                                />
                              );
                            }}
                            activeDot={{
                              r: 6.5,
                              fill: '#10b981',
                              stroke: '#fff',
                              strokeWidth: 2,
                              cursor: 'pointer',
                              onClick: (_: any, payload: any) => {
                                if (payload && payload.payload) {
                                  handleOpenDateInspectionModal(payload.payload as DayDegradationPoint);
                                }
                              },
                            }}
                          />

                          {/* 2. DASHED CONTINUATION LINE: 7-Day Projected Health Score based on Maintenance Cycles */}
                          <Line
                            name="7-Day Projected Health (Maintenance Cycles)"
                            type="monotone"
                            dataKey="projectedHealthScore"
                            stroke="#34d399"
                            strokeWidth={2.5}
                            strokeDasharray="5 5"
                            connectNulls={false}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (!payload || payload.projectedHealthScore == null) return null;
                              return (
                                <circle
                                  key={`health-proj-${payload.dayNumber}`}
                                  cx={cx}
                                  cy={cy}
                                  r={3.5}
                                  fill="#34d399"
                                  stroke="#065f46"
                                  strokeWidth={1.5}
                                  className="cursor-pointer hover:scale-125 transition-transform"
                                  onClick={() => handleOpenDateInspectionModal(payload)}
                                />
                              );
                            }}
                            activeDot={{
                              r: 6.5,
                              fill: '#34d399',
                              stroke: '#fff',
                              strokeWidth: 2,
                              cursor: 'pointer',
                              onClick: (_: any, payload: any) => {
                                if (payload && payload.payload) {
                                  handleOpenDateInspectionModal(payload.payload as DayDegradationPoint);
                                }
                              },
                            }}
                          />

                          {/* 3. HISTORICAL SEASONAL PEAK HEALTH SCORE LINE */}
                          {showSeasonalPeak && (
                            <Line
                              name="Historical Seasonal Peak (Prev. Years)"
                              type="monotone"
                              dataKey="seasonalPeakHealthScore"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              strokeDasharray="4 3"
                              dot={false}
                              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#78350f', strokeWidth: 1.5 }}
                            />
                          )}

                          {/* 4. OVERLAY HISTORICAL BASELINE HEALTH SCORE LINE */}
                          {showHistoricalBaseline && (
                            <Line
                              name={`Historical Baseline (${selectedBaselineYear})`}
                              type="monotone"
                              dataKey="baselineYearHealthScore"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              strokeDasharray="6 3"
                              dot={false}
                              activeDot={{ r: 5, fill: '#06b6d4', stroke: '#164e63', strokeWidth: 1.5 }}
                            />
                          )}
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart Legend / Explanation Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-rose-500 inline-block"></span>
                    <span>Solid Line: Observed 30-Day Rate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-purple-400 inline-block"></span>
                    <span className="text-purple-300 font-semibold">
                      Dashed Line: 7-Day Maintenance Cycle Continuation
                    </span>
                  </span>
                  {showSeasonalPeak && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400 inline-block"></span>
                      <span className="text-amber-300 font-semibold">
                        Amber Dotted Line: Historical Seasonal Peak (Previous Years)
                      </span>
                    </span>
                  )}
                  {showHistoricalBaseline && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block"></span>
                      <span className="text-cyan-300 font-semibold">
                        Cyan Dashed Line: Historical Baseline ({selectedBaselineYear} Seasonal Trajectory)
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-slate-400">
                  Net 30-Day Degradation Delta:{' '}
                  <span
                    className={`font-bold ${
                      activeCorridorHealth.degradationRate30Days >= 20
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }`}
                  >
                    +{activeCorridorHealth.degradationRate30Days}% TDI
                  </span>
                </div>
                <div className="w-full mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-cyan-300">
                  <span className="flex items-center gap-1 font-semibold">
                    <span>💡 Tip: Click any data point on the chart to drill down into detailed inspection logs, 5-log defect sparklines &amp; schedule follow-ups.</span>
                  </span>
                  <button
                    onClick={() => {
                      const todayPoint = displayedTrendData.find((p) => p.dayNumber === 30) || displayedTrendData[displayedTrendData.length - 1];
                      if (todayPoint) handleOpenDateInspectionModal(todayPoint);
                    }}
                    className="text-cyan-400 hover:text-white underline font-bold transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    Inspect Date Log ➔
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT (5 COLS): UPCOMING HIGH-RISK SEGMENTS FOR SELECTED CORRIDOR */}
            <div className="lg:col-span-5 bg-[#0c1427] p-4 rounded-xl border border-sky-950/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Upcoming High-Risk Segments
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                    {activeCorridorHealth.segments.length} VULNERABLE ZONE(S)
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[290px] pr-1">
                  {activeCorridorHealth.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                        segment.riskLevel === 'CRITICAL'
                          ? 'bg-rose-950/30 border-rose-800/80 hover:border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                          : 'bg-amber-950/20 border-amber-800/70 hover:border-amber-600'
                      }`}
                    >
                      {/* Segment Header */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="font-bold text-slate-100">{segment.chainage}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 pl-5">
                            {segment.locationName}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] shrink-0 ${
                            segment.riskLevel === 'CRITICAL'
                              ? 'bg-rose-900/90 text-rose-100 border border-rose-600 animate-pulse'
                              : 'bg-amber-900/90 text-amber-100 border border-amber-600'
                          }`}
                        >
                          {segment.riskScorePercent}% RISK
                        </span>
                      </div>

                      {/* Contributing Defect Factors */}
                      <div className="pl-5 space-y-1 mt-2">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Primary Vulnerability Drivers:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {segment.primaryDefectFactors.map((factor, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                            >
                              • {factor}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Failure Horizon & Recommended Preventive Action */}
                      <div className="pl-5 mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">FAILURE HORIZON</span>
                          <span className="text-rose-300 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-400" />
                            {segment.predictedFailureHorizon}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TRACK GEOMETRY (TGI)</span>
                          <span
                            className={`font-bold ${
                              segment.trackGeometryIndex < 60 ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            TGI {segment.trackGeometryIndex} / 100
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pl-5 mt-2.5 flex items-center justify-between">
                        {segment.speedRestrictionKmph && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-950/80 text-yellow-300 border border-yellow-700/60 font-semibold">
                            Caution Order: {segment.speedRestrictionKmph} km/h
                          </span>
                        )}
                        <button
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate('timeline', {
                                corridorId: segment.corridorId,
                                highlightChainage: segment.chainage,
                              });
                            }
                          }}
                          className="ml-auto text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                        >
                          <span>Plan Segment Block</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick-Summary */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>USFD Ultrasonic Scans Active</span>
                <span className="text-slate-300 font-bold">
                  {activeCorridorHealth.defectsCount} Open Corridor Defects
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: 30-DAY DEGRADATION RISK DRIVER BREAKDOWN (HORIZONTAL STACKED BAR CHART) */}
          <div className="mt-5 pt-5 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    30-Day Degradation Trend: Specific Risk Driver Breakdown
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold">
                    HORIZONTAL STACKED ANALYSIS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Decomposing cumulative 30-day degradation velocity into mechanical &amp; structural risk drivers: Track Geometry, Fastener Integrity, Ballast Fouling, Rail Weld Fatigue, and OHE/Interlocking.
                </p>
              </div>

              {/* View mode & unit controls */}
              <div className="flex items-center gap-2 font-mono text-[10px] self-start sm:self-auto">
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-md border border-slate-800">
                  <button
                    onClick={() => setDriverViewMode('SELECTED_CORRIDOR_EVOLUTION')}
                    className={`px-2 py-1 rounded transition-colors ${
                      driverViewMode === 'SELECTED_CORRIDOR_EVOLUTION'
                        ? 'bg-sky-800 text-sky-100 font-bold border border-sky-600'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    30-Day Timeline Evolution
                  </button>
                  <button
                    onClick={() => setDriverViewMode('ALL_CORRIDORS_COMPARISON')}
                    className={`px-2 py-1 rounded transition-colors ${
                      driverViewMode === 'ALL_CORRIDORS_COMPARISON'
                        ? 'bg-sky-800 text-sky-100 font-bold border border-sky-600'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Corridors Comparison
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-md border border-slate-800">
                  <button
                    onClick={() => setDriverUnit('PERCENT')}
                    className={`px-2 py-1 rounded transition-colors ${
                      driverUnit === 'PERCENT'
                        ? 'bg-amber-800 text-amber-100 font-bold border border-amber-600'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    % Share
                  </button>
                  <button
                    onClick={() => setDriverUnit('TDI_POINTS')}
                    className={`px-2 py-1 rounded transition-colors ${
                      driverUnit === 'TDI_POINTS'
                        ? 'bg-amber-800 text-amber-100 font-bold border border-amber-600'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TDI Points
                  </button>
                </div>
              </div>
            </div>

            {/* THREE PRIMARY RISK DRIVER CARDS: Track Geometry, Fastener Integrity, Ballast Fouling */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Track Geometry Card */}
              <div className="bg-[#0b1329] p-3 rounded-lg border border-sky-900/60 font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <Activity className="w-3.5 h-3.5" />
                    Track Geometry
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                    {driverUnit === 'PERCENT'
                      ? `${riskDriversData.currentCorridorRow?.trackGeometry}% Share`
                      : `${riskDriversData.currentCorridorRow?.trackGeometry} TDI pts`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Gauge widening, twist anomalies &amp; alignment variance.
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Mitigating Asset:</span>
                  <span className="text-sky-300 font-semibold">09-3X Tamping Gang</span>
                </div>
              </div>

              {/* 2. Fastener Integrity Card */}
              <div className="bg-[#0b1329] p-3 rounded-lg border border-amber-900/60 font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Wrench className="w-3.5 h-3.5" />
                    Fastener Integrity
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    {driverUnit === 'PERCENT'
                      ? `${riskDriversData.currentCorridorRow?.fastenerIntegrity}% Share`
                      : `${riskDriversData.currentCorridorRow?.fastenerIntegrity} TDI pts`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Missing/relaxed ERC clips &amp; fishplate bolt torque relaxation.
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Mitigating Asset:</span>
                  <span className="text-amber-300 font-semibold">PWI Gang 4 (Fasteners)</span>
                </div>
              </div>

              {/* 3. Ballast Fouling Card */}
              <div className="bg-[#0b1329] p-3 rounded-lg border border-rose-900/60 font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <Flame className="w-3.5 h-3.5" />
                    Ballast Fouling
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                    {driverUnit === 'PERCENT'
                      ? `${riskDriversData.currentCorridorRow?.ballastFouling}% Share`
                      : `${riskDriversData.currentCorridorRow?.ballastFouling} TDI pts`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Subgrade clay slurry mud pumping &amp; ballast voiding under 25T axle cycles.
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Mitigating Asset:</span>
                  <span className="text-rose-300 font-semibold">BCM-03 Ballast Cleaner</span>
                </div>
              </div>
            </div>

            {/* HORIZONTAL STACKED BAR CHART */}
            <div className="bg-[#0c1427] p-4 rounded-xl border border-sky-950/90">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={
                      driverViewMode === 'SELECTED_CORRIDOR_EVOLUTION'
                        ? riskDriversData.selectedEvolution
                        : riskDriversData.corridorsComparison
                    }
                    margin={{ top: 10, right: 30, left: 110, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} opacity={0.8} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      unit={driverUnit === 'PERCENT' ? '%' : ''}
                      domain={driverUnit === 'PERCENT' ? [0, 100] : [0, 'auto']}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                      width={105}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[#0b1329] border border-sky-800 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                              <div className="flex items-center justify-between gap-3 text-slate-300 font-bold border-b border-slate-800 pb-1 mb-1.5">
                                <span>{item.fullName || label}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                  {driverUnit === 'PERCENT' ? '100% Breakdown' : `${item.totalTDI} Total TDI`}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-sky-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span> Track Geometry:
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    {item.trackGeometry}{driverUnit === 'PERCENT' ? '%' : ' pts'}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Fastener Integrity:
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    {item.fastenerIntegrity}{driverUnit === 'PERCENT' ? '%' : ' pts'}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-rose-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> Ballast Fouling:
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    {item.ballastFouling}{driverUnit === 'PERCENT' ? '%' : ' pts'}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-purple-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span> Rail Weld Fatigue:
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    {item.railWeldFatigue}{driverUnit === 'PERCENT' ? '%' : ' pts'}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> OHE &amp; Interlocking:
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    {item.oheInterlocking}{driverUnit === 'PERCENT' ? '%' : ' pts'}
                                  </span>
                                </div>
                              </div>
                              <div className="pt-1.5 mt-1.5 border-t border-slate-800 text-[10px] text-amber-300">
                                Leading Driver: <strong>{item.primaryDriver}</strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Bar
                      dataKey="trackGeometry"
                      name="Track Geometry"
                      stackId="riskDrivers"
                      fill="#38bdf8"
                    />
                    <Bar
                      dataKey="fastenerIntegrity"
                      name="Fastener Integrity"
                      stackId="riskDrivers"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="ballastFouling"
                      name="Ballast Fouling"
                      stackId="riskDrivers"
                      fill="#f43f5e"
                    />
                    <Bar
                      dataKey="railWeldFatigue"
                      name="Rail Weld Fatigue (USFD)"
                      stackId="riskDrivers"
                      fill="#a855f7"
                    />
                    <Bar
                      dataKey="oheInterlocking"
                      name="OHE & Interlocking"
                      stackId="riskDrivers"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Operational Insight */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <div>
                  Dominant Degradation Driver:{' '}
                  <strong className="text-rose-400">
                    {riskDriversData.currentCorridorRow?.primaryDriver}
                  </strong>{' '}
                  ({riskDriversData.currentCorridorRow?.ballastFouling}{driverUnit === 'PERCENT' ? '%' : ' pts'}). Mitigating action: Deep ballast screening &amp; continuous tamping block.
                </div>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('resource_allocation', {
                        corridorId: activeCorridorHealth.corridor.id,
                        tab: 'MACHINERY',
                      });
                    }
                  }}
                  className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 self-start sm:self-auto transition-colors"
                >
                  <span>Assign Mitigating Fleet Asset</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI-GENERATED MAINTENANCE REPAIR FORECAST MODAL */}
      <MaintenanceRepairForecastModal
        isOpen={isForecastModalOpen}
        onClose={() => setIsForecastModalOpen(false)}
        forecast={currentForecast}
        isLoading={isGeneratingForecast}
        onNavigate={onNavigate}
      />

      {/* DATE INSPECTION LOG & DEFECT SEVERITY DRILL-DOWN MODAL */}
      {activeCorridorHealth && activeCorridorHealth.corridor && (
        <DateInspectionLogModal
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          report={activeInspectionReport}
          corridor={activeCorridorHealth.corridor}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
