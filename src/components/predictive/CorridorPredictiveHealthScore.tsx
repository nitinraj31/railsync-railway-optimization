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
import {
  predictiveRiskNotificationService,
  PredictiveRiskAlert,
} from '../../services/predictiveRiskNotificationService';

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
  criticalThreshold: number;
  isProjected: boolean;
  activeDefectCount: number;
  cumulativeTGI: number;
  maintenanceCycleNote?: string;
  maintenanceCyclePhase?: string;
}

export const CorridorPredictiveHealthScore: React.FC<CorridorPredictiveHealthScoreProps> = ({
  corridors,
  defects,
  blocks = [],
  onNavigate,
  onRefreshData,
}) => {
  // State
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    corridors.length > 0 ? corridors[0].id : 'C001'
  );
  const [criticalThreshold, setCriticalThreshold] = useState<number>(70); // TDI threshold (70+) triggers High Risk badge
  const [timeWindowDays, setTimeWindowDays] = useState<14 | 30>(30);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH_RISK_ONLY' | 'EXCEEDING_THRESHOLD'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'TDI' | 'HEALTH_SCORE'>('TDI');

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
    const activeCorr = corridors.find((c) => c.id === selectedCorridorId) || corridors[0];
    predictiveRiskNotificationService.triggerTestAlert(activeCorr);
    setNotificationToast(`Test Browser Alert dispatched for ${activeCorr?.name || 'Corridor'}`);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Compute Predictive Health Data for each corridor
  const corridorHealthAnalytics = useMemo(() => {
    return corridors.map((corridor) => {
      const corrDefects = defects.filter((d) => d.corridorId === corridor.id);
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
  }, [corridors, defects, criticalThreshold]);

  // Selected Corridor Health Info
  const activeCorridorHealth = useMemo(() => {
    return (
      corridorHealthAnalytics.find((c) => c.corridor.id === selectedCorridorId) ||
      corridorHealthAnalytics[0]
    );
  }, [corridorHealthAnalytics, selectedCorridorId]);

  // Filtered Corridors for Top Grid
  const filteredCorridors = useMemo(() => {
    return corridorHealthAnalytics.filter((item) => {
      // Risk filter
      if (filterSeverity === 'HIGH_RISK_ONLY' && item.status !== 'HIGH_RISK') return false;
      if (filterSeverity === 'EXCEEDING_THRESHOLD' && !item.exceedsThreshold) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.corridor.name.toLowerCase().includes(q);
        const matchCode = (item.corridor.code || item.corridor.id).toLowerCase().includes(q);
        const matchSegment = item.segments.some(
          (s) => s.locationName.toLowerCase().includes(q) || s.chainage.toLowerCase().includes(q)
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

  // Slice trend points by time window (14 or 30 days) + 7 days projection
  const displayedTrendData = useMemo(() => {
    if (!activeCorridorHealth) return [];
    const all = activeCorridorHealth.trendPoints;
    const historyPoints = all.filter((p) => !p.isProjected);
    const projectedPoints = all.filter((p) => p.isProjected);

    const slicedHistory = historyPoints.slice(-timeWindowDays);
    return [...slicedHistory, ...projectedPoints];
  }, [activeCorridorHealth, timeWindowDays]);

  // Send browser-based alerts when a corridor's 30-day degradation trend crosses the critical threshold
  useEffect(() => {
    if (!notificationsEnabled) return;

    corridorHealthAnalytics.forEach((item) => {
      if (item.exceedsThreshold) {
        predictiveRiskNotificationService.notifyThresholdBreach({
          corridor: item.corridor,
          currentTDI: item.currentTDI,
          threshold: criticalThreshold,
          degradationRate: item.degradationRate30Days,
          segmentName: item.segments[0]?.chainage || 'Track Critical Segment',
          source: 'THRESHOLD_BREACH',
        });
      }
    });
  }, [corridorHealthAnalytics, criticalThreshold, notificationsEnabled]);

  // Compute specific risk driver breakdown data for the horizontal stacked bar chart
  const riskDriversData = useMemo(() => {
    // 1. Cross-corridor comparative driver breakdown
    const corridorsComparison = corridorHealthAnalytics.map((item) => {
      const cId = item.corridor.id;
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
          name: `${item.corridor.code || cId}`,
          fullName: item.corridor.name,
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
          name: `${item.corridor.code || cId}`,
          fullName: item.corridor.name,
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
    const isFreightHeavy = selectedItem?.corridor.id === 'C003';
    const isHighSpeed = selectedItem?.corridor.id === 'C002';
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
      (c) => c.corridorId === selectedItem?.corridor.id
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
      {activeCorridorHealth && (
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
                  </div>
                </div>

                {/* THE RECHARTS LINE CHART */}
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={displayedTrendData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
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
                                    r={3.5}
                                    fill="#f43f5e"
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                  />
                                );
                              }
                              return (
                                <circle
                                  key={`norm-${payload.dayNumber}`}
                                  cx={cx}
                                  cy={cy}
                                  r={2}
                                  fill="#f43f5e"
                                />
                              );
                            }}
                            activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
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
                                  r={3.5}
                                  fill="#c084fc"
                                  stroke="#581c87"
                                  strokeWidth={1.5}
                                />
                              );
                            }}
                            activeDot={{ r: 6, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
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
                                  r={2}
                                  fill="#10b981"
                                />
                              );
                            }}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
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
                                />
                              );
                            }}
                            activeDot={{ r: 6, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
                          />
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
    </div>
  );
};
