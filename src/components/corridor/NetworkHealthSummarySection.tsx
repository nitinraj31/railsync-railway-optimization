import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Gauge,
  Layers,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Radio,
  Sliders,
  RotateCcw,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Maximize2,
  Info,
  ShieldCheck,
  ShieldAlert,
  Train,
  Flame,
  Zap,
  BarChart3,
  ScatterChart,
  Calendar,
  CalendarDays,
  Target,
  Move,
  Check,
  FileDown,
  FileText,
  Image,
  Download,
} from 'lucide-react';
import { Corridor, OptimizedBlock, BlockRequest } from '../../types';
import { mockStore } from '../../services/api';
import {
  exportNetworkHealthAsPdf,
  exportNetworkHealthAsPng,
} from '../../services/networkHealthExportService';
import {
  PredictiveGapTool,
  StagedMaintenanceBlock,
  SimulatedDroppedBlock,
  PRESET_MAINTENANCE_BLOCKS,
} from './PredictiveGapTool';

export type NetworkHealthViewMode = 'QUADRANT' | 'COMPARATIVE' | 'PREDICTIVE_7D' | 'DIURNAL';
export type VolumeUnit = 'HOURS' | 'BLOCKS';

export interface NetworkHealthSummarySectionProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  requests?: BlockRequest[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

export interface CorridorHealthTelemetry {
  id: string;
  name: string;
  code: string;
  fromStation: string;
  toStation: string;
  lengthKm: number;
  tracksCount: number;
  speedLimitKmph: number;
  utilization: number; // %
  baseUtilization: number; // original %
  scheduledBlocks: number;
  availableSlots: number;
  totalBlockHours: number; // sum duration in hours
  criticalBlocksCount: number;
  activeTrainsCount: number;
  deployedGangsCount: number;
  activeConflicts: number;
  strainIndex: number; // 0-100 composite
  strainCategory: 'CRITICAL_STRAIN' | 'HIGH_VOLUME' | 'CONSTRAINED' | 'BALANCED_OPTIMAL';
  status: 'OPERATIONAL' | 'RESTRICTED' | 'MAINTENANCE_ACTIVE';
  aiRecommendation: string;

  // 7-Day Maintenance Backlog & Predictive Corridor Strain Telemetry
  backlogHours: number; // current backlog in hours
  backlogBlocks: number; // current backlog in blocks
  backlog7DayHistory: number[]; // 7 daily backlog volumes (Day -6 to Day 0)
  backlog7DayMA: number; // 7-day moving average of maintenance backlog
  predictedFutureStrain: number; // 0-100 predicted corridor strain over next 7 days
  strainTrend: 'ESCALATING' | 'ELEVATED' | 'STABLE';
  strainDeltaPct: number; // % delta vs baseline
  speedCautionRisk: boolean;
  backlogRecommendation: string;

  // Predictive Gap Simulation Telemetry
  baselineStrainIndex: number;
  baselineBacklog7DayMA: number;
  hasSimulatedBlock: boolean;
  simulatedBlocksCount: number;
  simulatedStrainRelief: number;
  simulatedBacklogCleared: number;
}

export interface Predictive7DayPoint {
  dayOffset: number; // -6 to +7
  dayLabel: string; // e.g. "02 Oct", "Today", "+4d"
  fullDate: string;
  isForecast: boolean;
  dailyBacklogHours: number;
  backlog7DayMA: number;
  baselineBacklog7DayMA: number;
  corridorStrainIndex: number;
  baselineStrainIndex: number;
  criticalCorridorsCount: number;
  riskTier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  operationalNote: string;
  hasSimulatedBlock: boolean;
}

export const NetworkHealthSummarySection: React.FC<NetworkHealthSummarySectionProps> = ({
  corridors,
  blocks = [],
  requests = [],
  onNavigate,
  onRefreshData,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // User State
  const [viewMode, setViewMode] = useState<NetworkHealthViewMode>('COMPARATIVE');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('HOURS');
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const [isLiveTelemetryActive, setIsLiveTelemetryActive] = useState<boolean>(true);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState<Date>(new Date());
  const [telemetryPulseTick, setTelemetryPulseTick] = useState<number>(0);

  // 7-Day Moving Average Backlog Dotted Trend-line Toggle (default true for immediate visibility)
  const [showBacklogTrend, setShowBacklogTrend] = useState<boolean>(true);

  // Predictive Gap Tool Drag & Drop Simulation State
  const [simulatedBlocks, setSimulatedBlocks] = useState<SimulatedDroppedBlock[]>([]);
  const [activeDraggingBlock, setActiveDraggingBlock] = useState<StagedMaintenanceBlock | null>(null);
  const [isDragOverSvg, setIsDragOverSvg] = useState<boolean>(false);
  const [hoveredDropCorridorId, setHoveredDropCorridorId] = useState<string | null>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<CorridorHealthTelemetry | null>(null);
  const [showPredictiveGapTool, setShowPredictiveGapTool] = useState<boolean>(true);
  const [notificationMsg, setNotificationMsg] = useState<{ title: string; text: string; type: 'success' | 'info' | 'danger' } | null>(null);

  // Official Reporting Export State
  const [isExporting, setIsExporting] = useState<'pdf' | 'png' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showExportMenu]);

  // Simulation Stress Test & Recalculation State
  const [utilizationSurgePct, setUtilizationSurgePct] = useState<number>(0); // -15% to +15%
  const [blockVolumeSurgeDelta, setBlockVolumeSurgeDelta] = useState<number>(0); // -5h to +6h
  const [showStressControls, setShowStressControls] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalculationVersion, setRecalculationVersion] = useState<number>(0);
  const [transitionDurationMs, setTransitionDurationMs] = useState<number>(800);

  // Reference trackers for continuous point-interpolated D3 transitions
  const prevComparativeBacklogMapRef = useRef<Map<string, number>>(new Map());
  const prevPredictive7DBacklogMapRef = useRef<Map<string, number>>(new Map());

  // Live telemetry pulse timer (updates micro-fluctuations every 3.5 seconds if active)
  useEffect(() => {
    if (!isLiveTelemetryActive) return;
    const interval = setInterval(() => {
      setTelemetryPulseTick((prev) => prev + 1);
      setLastTelemetryTimestamp(new Date());
    }, 3500);
    return () => clearInterval(interval);
  }, [isLiveTelemetryActive]);

  // Compute enriched corridor telemetry data including 7-day backlog moving average & simulation shifts
  const telemetryData: CorridorHealthTelemetry[] = useMemo(() => {
    const rawBlocks = blocks.length > 0 ? blocks : mockStore.getOptimizedBlocks();

    // Baseline historical 7-day backlog patterns per corridor
    const baseBacklogHistories: Record<string, number[]> = {
      C001: [12.0, 12.8, 13.5, 12.2, 14.0, 13.6, 14.8], // 7d MA ~ 13.3h
      C002: [6.8, 7.2, 7.5, 6.9, 7.4, 7.8, 7.2], // 7d MA ~ 7.3h
      C003: [15.5, 16.2, 17.0, 16.8, 18.2, 19.0, 20.4], // 7d MA ~ 17.6h (Severe strain)
      C004: [13.2, 13.8, 14.5, 14.0, 15.0, 15.2, 15.8], // 7d MA ~ 14.5h
    };

    return corridors.map((c, index) => {
      const corrBlocks = rawBlocks.filter((b) => b.corridorId === c.id);
      const totalMinutes = corrBlocks.reduce((acc, b) => acc + (b.durationMinutes || 90), 0);
      const computedHours = totalMinutes > 0 ? +(totalMinutes / 60).toFixed(1) : (c.scheduledBlocks || 8) * 1.5;

      const criticalBlocks = corrBlocks.filter(
        (b) => b.priority === 'CRITICAL' || b.priority === 'HIGH'
      ).length;

      // Realistic pseudo-random live fluctuation based on tick
      const microVariance = isLiveTelemetryActive
        ? Math.sin(telemetryPulseTick * 0.7 + index * 1.5) * 1.8
        : 0;

      const effectiveUtil = Math.max(
        40,
        Math.min(99, Math.round(c.utilization + utilizationSurgePct + microVariance))
      );

      const effectiveHours = Math.max(2, +(computedHours + blockVolumeSurgeDelta).toFixed(1));
      const effectiveBlockCount = Math.max(
        1,
        corrBlocks.length > 0 ? corrBlocks.length : c.scheduledBlocks || 8
      );

      // Baseline strain index formulation
      const utilWeight = (effectiveUtil / 100) * 60;
      const volWeight = Math.min(40, (effectiveHours / 22) * 40);
      const rawBaselineStrain = Math.min(100, Math.round(utilWeight + volWeight));

      // 7-Day Moving Average Maintenance Backlog Computation
      const defaultHistory = [12.0, 12.5, 13.0, 13.2, 14.0, 14.5, 15.0];
      const rawHistory = baseBacklogHistories[c.id] || defaultHistory;
      // Recalculation factor simulates active telemetry resync micro-variances
      const recalcVariation = recalculationVersion > 0
        ? Math.sin(recalculationVersion * 2.1 + index * 1.3) * 1.4
        : 0;
      const adjustedHistory = rawHistory.map((val) => {
        const surgeEffect = blockVolumeSurgeDelta * 0.85 + Math.max(0, utilizationSurgePct * 0.12) + recalcVariation;
        return Math.max(2.0, +(val + surgeEffect).toFixed(1));
      });

      const sumBacklog7D = adjustedHistory.reduce((acc, v) => acc + v, 0);
      const rawBaselineBacklog7DayMA = +(sumBacklog7D / 7).toFixed(1);
      const currentBacklogHours = adjustedHistory[adjustedHistory.length - 1];

      // PREDICTIVE GAP TOOL SIMULATION OVERLAY
      const corrSimBlocks = simulatedBlocks.filter((sb) => sb.targetCorridorId === c.id);
      const simStrainRelief = corrSimBlocks.reduce((sum, sb) => sum + sb.strainShiftDelta, 0);
      const simBacklogCleared = +corrSimBlocks.reduce((sum, sb) => sum + sb.backlogClearedHours, 0).toFixed(1);

      // Shifted values resulting from simulated dropped blocks
      const effectiveBacklog7DayMA = Math.max(
        2.5,
        +(rawBaselineBacklog7DayMA - simBacklogCleared * 0.75).toFixed(1)
      );

      const backlogBlocksCount = Math.max(2, Math.round(effectiveBacklog7DayMA / 1.45));

      // Effective strain index after simulated relief
      const effectiveStrainScore = Math.max(30, Math.round(rawBaselineStrain - simStrainRelief));

      // Predictive Future Corridor Strain formulation
      const backlogStrainSurcharge = Math.max(0, (effectiveBacklog7DayMA - 11.5) * 1.85);
      const predictedFutureStrain = Math.min(100, Math.round(effectiveStrainScore + backlogStrainSurcharge));

      const strainDeltaPct = +(((predictedFutureStrain - effectiveStrainScore) / (effectiveStrainScore || 1)) * 100).toFixed(1);
      const speedCautionRisk = predictedFutureStrain >= 86;

      let strainTrend: CorridorHealthTelemetry['strainTrend'] = 'STABLE';
      if (strainDeltaPct >= 8) strainTrend = 'ESCALATING';
      else if (strainDeltaPct >= 3) strainTrend = 'ELEVATED';

      let strainCategory: CorridorHealthTelemetry['strainCategory'] = 'BALANCED_OPTIMAL';
      let recommendation = 'Nominal operational headroom. Maintenance windows clear on schedule.';
      let backlogRec = 'Backlog moving average within safe margins. Track assets in good order.';

      if (effectiveStrainScore >= 88) {
        strainCategory = 'CRITICAL_STRAIN';
        recommendation =
          'High traffic density combined with heavy track block volume. Recommended: activate moving shadow-blocks or defer non-critical tampers.';
        backlogRec = `7-Day MA Backlog of ${effectiveBacklog7DayMA}h drives predicted strain to ${predictedFutureStrain}/100. High risk of 30km/h caution order within 5 days.`;
      } else if (effectiveUtil >= 88 && effectiveHours < 14) {
        strainCategory = 'CONSTRAINED';
        recommendation =
          'Track capacity constrained. Maintenance block requests face high deferral risk due to train headway congestion.';
        backlogRec = `Headway saturation starves maintenance windows. 7-Day Backlog MA (${effectiveBacklog7DayMA}h) is accumulating unfulfilled possession requests.`;
      } else if (effectiveHours >= 14) {
        strainCategory = 'HIGH_VOLUME';
        recommendation =
          'High maintenance work density absorbed safely within generous traffic headway windows. Monitor gang fatigue.';
        backlogRec = `Work dense but headways permit possession execution. 7-Day Backlog MA (${effectiveBacklog7DayMA}h) stable.`;
      } else {
        strainCategory = 'BALANCED_OPTIMAL';
        recommendation =
          'Optimal equilibrium between passenger/freight traffic throughput and scheduled maintenance execution.';
        backlogRec = `7-Day MA Backlog (${effectiveBacklog7DayMA}h) well below 14h threshold. No speed restrictions projected.`;
      }

      if (corrSimBlocks.length > 0) {
        recommendation = `[SIMULATED SHIFT] Absorbed ${corrSimBlocks.length} maintenance blocks (-${simStrainRelief} strain points). Headway buffer preserved in Night Golden Window.`;
      }

      return {
        id: c.id,
        name: c.name,
        code: c.code || c.id,
        fromStation: c.stationFrom || c.fromStation || 'Station A',
        toStation: c.stationTo || c.toStation || 'Station B',
        lengthKm: c.lengthKm || 50,
        tracksCount: c.tracksCount || 2,
        speedLimitKmph: c.speedLimitKmph || 130,
        utilization: effectiveUtil,
        baseUtilization: c.utilization,
        scheduledBlocks: effectiveBlockCount + corrSimBlocks.length,
        availableSlots: c.availableSlots || 4,
        totalBlockHours: +(effectiveHours + simBacklogCleared).toFixed(1),
        criticalBlocksCount: criticalBlocks || Math.ceil(effectiveBlockCount * 0.4),
        activeTrainsCount: c.trainCount || Math.round(effectiveUtil * 0.38),
        deployedGangsCount: Math.round(effectiveBlockCount * 0.9),
        activeConflicts: c.activeConflicts || 0,
        strainIndex: effectiveStrainScore,
        strainCategory,
        status: c.status || (effectiveUtil > 90 ? 'RESTRICTED' : 'OPERATIONAL'),
        aiRecommendation: recommendation,

        backlogHours: currentBacklogHours,
        backlogBlocks: backlogBlocksCount,
        backlog7DayHistory: adjustedHistory,
        backlog7DayMA: effectiveBacklog7DayMA,
        predictedFutureStrain,
        strainTrend,
        strainDeltaPct,
        speedCautionRisk,
        backlogRecommendation: backlogRec,

        baselineStrainIndex: rawBaselineStrain,
        baselineBacklog7DayMA: rawBaselineBacklog7DayMA,
        hasSimulatedBlock: corrSimBlocks.length > 0,
        simulatedBlocksCount: corrSimBlocks.length,
        simulatedStrainRelief: simStrainRelief,
        simulatedBacklogCleared: simBacklogCleared,
      };
    });
  }, [
    corridors,
    blocks,
    utilizationSurgePct,
    blockVolumeSurgeDelta,
    isLiveTelemetryActive,
    telemetryPulseTick,
    simulatedBlocks,
    recalculationVersion,
  ]);

  // Aggregate Network Health KPIs
  const networkKpis = useMemo(() => {
    if (telemetryData.length === 0) {
      return {
        overallHealthScore: 84,
        averageUtilization: 85,
        totalBlockHours: 58.5,
        totalScheduledBlocks: 42,
        criticalStrainCorridorsCount: 1,
        peakStrainedCorridor: null as CorridorHealthTelemetry | null,
        optimalCorridorsCount: 2,
        networkStatus: 'OPTIMAL_EQUILIBRIUM',
        network7DayBacklogMA: 13.3,
        predictedNetworkStrain: 82,
        totalSimulatedRelief: 0,
      };
    }

    const totalHours = +telemetryData.reduce((sum, c) => sum + c.totalBlockHours, 0).toFixed(1);
    const totalBlocks = telemetryData.reduce((sum, c) => sum + c.scheduledBlocks, 0);
    const avgUtil = Math.round(
      telemetryData.reduce((sum, c) => sum + c.utilization, 0) / telemetryData.length
    );

    const sortedByStrain = [...telemetryData].sort((a, b) => b.strainIndex - a.strainIndex);
    const peakCorridor = sortedByStrain[0];

    const criticalCount = telemetryData.filter((c) => c.strainCategory === 'CRITICAL_STRAIN').length;
    const optimalCount = telemetryData.filter((c) => c.strainCategory === 'BALANCED_OPTIMAL').length;

    // Composite Network Health
    const avgStrain = telemetryData.reduce((sum, c) => sum + c.strainIndex, 0) / telemetryData.length;
    const healthScore = Math.max(50, Math.min(98, Math.round(100 - (avgStrain - 50) * 0.7)));

    // Aggregate 7-Day Backlog MA
    const avgBacklogMA = +(
      telemetryData.reduce((sum, c) => sum + c.backlog7DayMA, 0) / telemetryData.length
    ).toFixed(1);

    const avgPredictedStrain = Math.round(
      telemetryData.reduce((sum, c) => sum + c.predictedFutureStrain, 0) / telemetryData.length
    );

    const totalSimRelief = simulatedBlocks.reduce((sum, sb) => sum + sb.strainShiftDelta, 0);

    let status = 'HEALTHY & BALANCED';
    if (criticalCount >= 2) status = 'ELEVATED CONGESTION RISK';
    else if (criticalCount === 1) status = 'LOCALIZED STRAIN (C003)';

    if (simulatedBlocks.length > 0) {
      status = `SIMULATED SHIFT (-${totalSimRelief} STRAIN)`;
    }

    return {
      overallHealthScore: healthScore,
      averageUtilization: avgUtil,
      totalBlockHours: totalHours,
      totalScheduledBlocks: totalBlocks,
      criticalStrainCorridorsCount: criticalCount,
      peakStrainedCorridor: peakCorridor,
      optimalCorridorsCount: optimalCount,
      networkStatus: status,
      network7DayBacklogMA: avgBacklogMA,
      predictedNetworkStrain: avgPredictedStrain,
      totalSimulatedRelief: totalSimRelief,
    };
  }, [telemetryData, simulatedBlocks]);

  // Currently focused corridor object
  const activeCorridor = useMemo(() => {
    if (!selectedCorridorId) return telemetryData[0] || null;
    return telemetryData.find((c) => c.id === selectedCorridorId) || telemetryData[0];
  }, [selectedCorridorId, telemetryData]);

  // Display corridor for hover-state indicator & tooltip inspection
  const tooltipCorridor = hoveredCorridor || activeCorridor;

  // Strain color helper for UI elements
  const getCorridorStrainColor = (category?: CorridorHealthTelemetry['strainCategory']) => {
    switch (category) {
      case 'CRITICAL_STRAIN':
        return '#f43f5e';
      case 'CONSTRAINED':
        return '#f59e0b';
      case 'HIGH_VOLUME':
        return '#06b6d4';
      case 'BALANCED_OPTIMAL':
      default:
        return '#10b981';
    }
  };

  // 14-Day Rolling Timeline Dataset (Day -6 to Day 0 to Day +7) for PREDICTIVE_7D mode
  const predictive7DSeries: Predictive7DayPoint[] = useMemo(() => {
    const baseDailyBacklogs = [
      11.8, 12.4, 13.1, 12.8, 13.9, 14.2, 14.8, // Days -6 to 0 (Historical)
      15.4, 16.2, 16.9, 17.5, 18.2, 18.9, 19.4, // Days +1 to +7 (Forecast)
    ];

    const todayIndex = 6;
    const months = ['Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct'];
    const days = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    // Simulation effect across the predictive window
    const simBacklogRelief = simulatedBlocks.reduce((sum, sb) => sum + sb.backlogClearedHours, 0);
    const simStrainRelief = simulatedBlocks.reduce((sum, sb) => sum + sb.strainShiftDelta, 0);

    return baseDailyBacklogs.map((baseVal, idx) => {
      const dayOffset = idx - todayIndex;
      const recalcJitter = recalculationVersion > 0 ? Math.sin(recalculationVersion * 1.6 + idx * 0.7) * 1.1 : 0;
      const surgeEffect = blockVolumeSurgeDelta * 0.8 + Math.max(0, utilizationSurgePct * 0.15) + recalcJitter;
      const dailyVal = Math.max(4.0, +(baseVal + surgeEffect).toFixed(1));

      const windowStart = Math.max(0, idx - 6);
      const windowValues = baseDailyBacklogs.slice(windowStart, idx + 1);
      const rawMaVal = +(
        windowValues.reduce((sum, v) => sum + (v + surgeEffect), 0) / windowValues.length
      ).toFixed(1);

      // Shifted MA value if simulated blocks exist in forecast window
      const shiftedMaVal = dayOffset >= 0
        ? Math.max(3.0, +(rawMaVal - simBacklogRelief * 0.7).toFixed(1))
        : rawMaVal;

      const rawStrainIdx = Math.min(
        98,
        Math.max(60, Math.round(68 + (rawMaVal - 11) * 2.8 + (dayOffset > 0 ? dayOffset * 1.5 : 0)))
      );

      const shiftedStrainIdx = dayOffset >= 0
        ? Math.max(45, Math.round(rawStrainIdx - simStrainRelief * 0.9))
        : rawStrainIdx;

      let riskTier: Predictive7DayPoint['riskTier'] = 'LOW';
      if (shiftedStrainIdx >= 86) riskTier = 'CRITICAL';
      else if (shiftedStrainIdx >= 78) riskTier = 'HIGH';
      else if (shiftedStrainIdx >= 70) riskTier = 'MODERATE';

      let note = 'Nominal maintenance clearance';
      if (dayOffset === 0) note = 'Current Live Telemetry Anchor';
      else if (dayOffset > 0 && simStrainRelief > 0)
        note = `Simulated relief active: Strain reduced from ${rawStrainIdx} → ${shiftedStrainIdx}`;
      else if (dayOffset > 0 && shiftedStrainIdx >= 85)
        note = `Predicted Corridor Strain Threshold Breach (Strain ${shiftedStrainIdx}/100)`;
      else if (dayOffset > 0)
        note = `Predictive MA Backlog: ${shiftedMaVal}h backlog accumulation`;

      const dayLabel = dayOffset === 0 ? 'Today' : dayOffset > 0 ? `+${dayOffset}d` : `${dayOffset}d`;
      const fullDate = `${days[idx]} ${months[idx]} 2026`;

      return {
        dayOffset,
        dayLabel,
        fullDate,
        isForecast: dayOffset > 0,
        dailyBacklogHours: dailyVal,
        backlog7DayMA: shiftedMaVal,
        baselineBacklog7DayMA: rawMaVal,
        corridorStrainIndex: shiftedStrainIdx,
        baselineStrainIndex: rawStrainIdx,
        criticalCorridorsCount: shiftedStrainIdx >= 85 ? 2 : 1,
        riskTier,
        operationalNote: note,
        hasSimulatedBlock: simulatedBlocks.length > 0 && dayOffset > 0,
      };
    });
  }, [blockVolumeSurgeDelta, utilizationSurgePct, simulatedBlocks, recalculationVersion]);

  // 24-Hour Diurnal distribution curve data
  const diurnalData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      let trafficFactor = 0.55;
      if (hour >= 7 && hour <= 11) trafficFactor = 0.94;
      else if (hour >= 17 && hour <= 21) trafficFactor = 0.96;
      else if (hour >= 12 && hour <= 16) trafficFactor = 0.78;
      else if (hour >= 1 && hour <= 5) trafficFactor = 0.32;

      let maintenanceFactor = 0.2;
      if (hour >= 0 && hour <= 4) maintenanceFactor = 0.92;
      else if (hour >= 13 && hour <= 15) maintenanceFactor = 0.65;
      else if (hour >= 9 && hour <= 12) maintenanceFactor = 0.25;

      const util = Math.round(trafficFactor * 100);
      const volHours = +(maintenanceFactor * (networkKpis.totalBlockHours / 6.5)).toFixed(1);

      return {
        hour,
        timeLabel: `${hour.toString().padStart(2, '0')}:00`,
        trafficUtilization: util,
        maintenanceVolumeHours: volHours,
        isGoldenWindow: hour >= 0 && hour <= 4,
        isMiddayGap: hour >= 13 && hour <= 15,
      };
    });
  }, [networkKpis.totalBlockHours]);

  // ==========================================
  // HANDLERS FOR SIMULATED BLOCKS
  // ==========================================
  const handleSimulateBlock = (block: StagedMaintenanceBlock, targetCorridorId: string) => {
    const targetCorr = telemetryData.find((c) => c.id === targetCorridorId) || telemetryData[0];
    const preStrain = targetCorr ? targetCorr.strainIndex : 85;
    const postStrain = Math.max(35, preStrain - block.estimatedStrainReliefPoints);
    const preMA = targetCorr ? targetCorr.backlog7DayMA : 14.5;
    const postMA = Math.max(2.5, +(preMA - block.estimatedBacklogClearedHours * 0.75).toFixed(1));

    const newSimulated: SimulatedDroppedBlock = {
      simulatedId: `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      block,
      targetCorridorId,
      placedTimestamp: Date.now(),
      timeWindow: '01:30 - 05:00 (Night Golden Window)',
      strainShiftDelta: block.estimatedStrainReliefPoints,
      backlogClearedHours: block.estimatedBacklogClearedHours,
      preStrainScore: preStrain,
      postStrainScore: postStrain,
      preBacklog7dMA: preMA,
      postBacklog7dMA: postMA,
    };

    setSimulatedBlocks((prev) => [...prev, newSimulated]);

    setNotificationMsg({
      title: `⚡ Simulation Shift on ${targetCorridorId}`,
      text: `${block.name} staged on D3 trend-line: Strain shifted from ${preStrain} → ${postStrain} (-${block.estimatedStrainReliefPoints} pts), Backlog 7d MA dropped to ${postMA}h.`,
      type: 'success',
    });
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleRemoveSimulatedBlock = (simulatedId: string) => {
    setSimulatedBlocks((prev) => prev.filter((b) => b.simulatedId !== simulatedId));
  };

  const handleResetSimulation = () => {
    setSimulatedBlocks([]);
    setNotificationMsg({
      title: 'Simulation Reset',
      text: 'Cleared all simulated blocks from D3 trend-line. Restored live telemetry baseline.',
      type: 'info',
    });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Recalculates 7-day maintenance backlog moving average and animates D3 trend-line
  const handleRecalculateBacklog = () => {
    setIsRecalculating(true);
    setRecalculationVersion((prev) => prev + 1);
    setNotificationMsg({
      title: '⚡ Recalculating Backlog 7-Day MA',
      text: `Syncing telemetry sensors & recalculating moving averages. D3 dotted trend-line smoothly animating over ${transitionDurationMs}ms...`,
      type: 'info',
    });

    setTimeout(() => {
      setIsRecalculating(false);
      setNotificationMsg({
        title: '✓ Backlog Recalculation Complete',
        text: `D3 dotted trend-line smoothly transitioned to updated positions across all corridors.`,
        type: 'success',
      });
      setTimeout(() => setNotificationMsg(null), 3500);
    }, transitionDurationMs);
  };

  // Quick preset calibration adjustments with smooth D3 transitions
  const handlePresetBacklog = (deltaHours: number, label: string) => {
    setBlockVolumeSurgeDelta(deltaHours);
    setNotificationMsg({
      title: `⚡ Recalculating Backlog: ${label}`,
      text: `Backlog offset set to ${deltaHours >= 0 ? `+${deltaHours}` : deltaHours}h. D3 dotted trend-line smoothly gliding to new position...`,
      type: 'info',
    });
    setTimeout(() => setNotificationMsg(null), 3200);
  };

  const handleResetBacklogToBaseline = () => {
    setBlockVolumeSurgeDelta(0);
    setUtilizationSurgePct(0);
    setRecalculationVersion(0);
    setNotificationMsg({
      title: '✓ Backlog Baseline Restored',
      text: 'Maintenance backlog reset to certified operational baseline. D3 trend-line animating smoothly...',
      type: 'success',
    });
    setTimeout(() => setNotificationMsg(null), 3200);
  };

  // Official Reporting Export Handlers (PDF & PNG)
  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting('pdf');
    setShowExportMenu(false);
    try {
      setNotificationMsg({
        title: 'Generating Official PDF Report...',
        text: 'Capturing predictive strain map, 7D backlog trend-line, and corridor telemetry tables.',
        type: 'info',
      });
      await exportNetworkHealthAsPdf({
        svgElement: svgRef.current,
        viewMode,
        volumeUnit,
        corridors: telemetryData,
        networkKpis,
        simulatedBlocksCount: simulatedBlocks.length,
        showBacklogTrend,
      });
      setNotificationMsg({
        title: '✓ Official PDF Report Exported',
        text: 'Divisional Network Health & Predictive Strain Report (PDF) saved successfully.',
        type: 'success',
      });
      setTimeout(() => setNotificationMsg(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setNotificationMsg({
        title: 'Export Failed',
        text: 'Unable to render PDF report document. Please try again.',
        type: 'danger',
      });
      setTimeout(() => setNotificationMsg(null), 4000);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPng = async () => {
    if (isExporting) return;
    setIsExporting('png');
    setShowExportMenu(false);
    try {
      setNotificationMsg({
        title: 'Generating High-Resolution PNG Snapshot...',
        text: 'Rendering predictive strain map and D3 trend-line into high-DPI graphic.',
        type: 'info',
      });
      await exportNetworkHealthAsPng({
        svgElement: svgRef.current,
        viewMode,
        volumeUnit,
        corridors: telemetryData,
        networkKpis,
        simulatedBlocksCount: simulatedBlocks.length,
        showBacklogTrend,
      });
      setNotificationMsg({
        title: '✓ PNG Snapshot Exported',
        text: 'High-resolution graphic snapshot saved successfully for briefings.',
        type: 'success',
      });
      setTimeout(() => setNotificationMsg(null), 4000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      setNotificationMsg({
        title: 'Export Failed',
        text: 'Unable to capture PNG graphic. Please try again.',
        type: 'danger',
      });
      setTimeout(() => setNotificationMsg(null), 4000);
    } finally {
      setIsExporting(null);
    }
  };

  const handleCommitSimulation = () => {
    if (simulatedBlocks.length === 0) return;

    simulatedBlocks.forEach((sb) => {
      const newBlock: OptimizedBlock = {
        blockId: `BLK-OPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        taskId: `TSK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        department: (sb.block.department === 'CIVIL' ? 'CIVIL_ENGINEERING' : sb.block.department) as any,
        assetId: 'TRK-001',
        corridorId: sb.targetCorridorId,
        section: `${sb.targetCorridorId} Section KM 14/0 - 28/0`,
        date: new Date().toISOString().split('T')[0],
        startTime: '01:30',
        endTime: `${Math.floor(1 + sb.block.durationHours)}:30`,
        durationMinutes: Math.round(sb.block.durationHours * 60),
        priority: sb.block.priority as any,
        status: 'OPTIMIZED',
        validationStatus: 'VALID',
        hasConflict: false,
        explainability: {
          whyThisSlot: [
            'Predictive Gap Tool simulation confirmed optimal headway slot with zero traffic clash.',
            `Cleared ${sb.block.estimatedBacklogClearedHours}h of deferred maintenance backlog.`,
            `Relieved corridor strain by -${sb.strainShiftDelta} points.`,
          ],
          optimizationFactors: {
            priorityScore: 95,
            assetAvailability: 'Asset isolated during Night Golden Window',
            corridorAvailability: 'Optimal headway slot confirmed',
            trainCompatibility: 'Zero clash with express train services',
            constraintCompatibility: 'Full speed clearance upon completion',
            operationalImpact: `Strain relief: -${sb.strainShiftDelta} points`,
          },
          alternateEvaluatedCount: 3,
          disruptionAvoidanceMinutes: 45,
          constraintCheckSummary: 'Simulated gap committed to live AI schedule',
        },
      };

      mockStore.getOptimizedBlocks().push(newBlock);
    });

    mockStore.addAuditLogEntry(
      'Chief Operations Manager',
      'CONTROL_ROOM',
      'Predictive Gap Tool: Simulated Blocks Committed',
      `Committed ${simulatedBlocks.length} maintenance blocks to AI Master Schedule`,
      'SUCCESS',
      `Relieved network strain by -${networkKpis.totalSimulatedRelief} pts across ${simulatedBlocks.map((b) => b.targetCorridorId).join(', ')}.`
    );

    setNotificationMsg({
      title: '✓ Committed to AI Master Schedule!',
      text: `Successfully registered ${simulatedBlocks.length} simulated blocks into dispatch database. Corridor telemetry updated.`,
      type: 'success',
    });
    setTimeout(() => setNotificationMsg(null), 5000);

    setSimulatedBlocks([]);
    onRefreshData?.();
  };

  // Canvas Drop Handler (Maps mouse X coordinate to corridor column)
  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSvg(false);
    setHoveredDropCorridorId(null);

    let blockData: StagedMaintenanceBlock | null = activeDraggingBlock;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) blockData = JSON.parse(raw);
    } catch {
      // fallback to activeDraggingBlock
    }

    if (!blockData) return;

    let targetCorridorId = 'C003';
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - 60; // 60px margin left
      const innerW = rect.width - 125;
      const idx = Math.min(corridors.length - 1, Math.max(0, Math.floor((mouseX / innerW) * corridors.length)));
      targetCorridorId = corridors[idx]?.id || blockData.recommendedCorridorId || 'C003';
    }

    handleSimulateBlock(blockData, targetCorridorId);
    setActiveDraggingBlock(null);
  };

  // ==========================================
  // D3 RENDERING ENGINE WITH SMOOTH TRANSITIONS
  // ==========================================
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || telemetryData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const containerWidth = containerRef.current.clientWidth || 880;
    const width = Math.max(680, containerWidth);
    const height = viewMode === 'DIURNAL' || viewMode === 'PREDICTIVE_7D' ? 370 : 380;

    svg.attr('width', width).attr('height', height);

    // Color helpers based on strain category
    const getStrainColor = (category: CorridorHealthTelemetry['strainCategory']) => {
      switch (category) {
        case 'CRITICAL_STRAIN':
          return '#f43f5e';
        case 'CONSTRAINED':
          return '#f59e0b';
        case 'HIGH_VOLUME':
          return '#06b6d4';
        case 'BALANCED_OPTIMAL':
        default:
          return '#10b981';
      }
    };

    // Global D3 Transition Configuration (Fluid cubic ease for smooth morphing)
    const transitionDuration = transitionDurationMs;
    const transitionEase = d3.easeCubicInOut;

    // Check if the current viewMode matches the existing rendered mode
    const renderedMode = svg.attr('data-rendered-mode');
    const isModeChanged = renderedMode !== viewMode;

    if (isModeChanged) {
      svg.selectAll('*').remove();
      svg.attr('data-rendered-mode', viewMode);
    }

    // -------------------------------------------------------------
    // RENDER MODE 1: D3 QUADRANT SCATTER/BUBBLE MATRIX
    // -------------------------------------------------------------
    if (viewMode === 'QUADRANT') {
      const margin = { top: 40, right: 45, bottom: 55, left: 65 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      let g = svg.select<SVGGElement>('g.quadrant-root');
      if (g.empty()) {
        g = svg.append('g').attr('class', 'quadrant-root').attr('transform', `translate(${margin.left},${margin.top})`);

        // Static quadrant backgrounds & lines
        const utilThreshold = 85;
        const volumeThreshold = volumeUnit === 'HOURS' ? 14 : 10;
        const xScaleStatic = d3.scaleLinear().domain([50, 100]).range([0, innerWidth]);
        const yScaleStatic = d3.scaleLinear().domain([0, 24]).range([innerHeight, 0]);

        // Quadrants
        g.append('rect').attr('class', 'q1').attr('x', xScaleStatic(utilThreshold)).attr('y', 0).attr('width', innerWidth - xScaleStatic(utilThreshold)).attr('height', yScaleStatic(volumeThreshold)).attr('fill', '#f43f5e').attr('fill-opacity', 0.05).attr('rx', 6);
        g.append('rect').attr('class', 'q2').attr('x', 0).attr('y', 0).attr('width', xScaleStatic(utilThreshold)).attr('height', yScaleStatic(volumeThreshold)).attr('fill', '#06b6d4').attr('fill-opacity', 0.04).attr('rx', 6);
        g.append('rect').attr('class', 'q3').attr('x', xScaleStatic(utilThreshold)).attr('y', yScaleStatic(volumeThreshold)).attr('width', innerWidth - xScaleStatic(utilThreshold)).attr('height', innerHeight - yScaleStatic(volumeThreshold)).attr('fill', '#f59e0b').attr('fill-opacity', 0.04).attr('rx', 6);
        g.append('rect').attr('class', 'q4').attr('x', 0).attr('y', yScaleStatic(volumeThreshold)).attr('width', xScaleStatic(utilThreshold)).attr('height', innerHeight - yScaleStatic(volumeThreshold)).attr('fill', '#10b981').attr('fill-opacity', 0.04).attr('rx', 6);

        const labelStyle = 'font-mono text-[10px] uppercase font-bold tracking-wider select-none';
        g.append('text').attr('x', innerWidth - 8).attr('y', 16).attr('text-anchor', 'end').attr('class', `${labelStyle} fill-rose-400/70`).text('⚠️ CRITICAL STRAIN ZONE');
        g.append('text').attr('x', 10).attr('y', 16).attr('text-anchor', 'start').attr('class', `${labelStyle} fill-cyan-400/70`).text('⚡ HIGH MAINTENANCE ABSORPTION');
        g.append('text').attr('x', innerWidth - 8).attr('y', innerHeight - 10).attr('text-anchor', 'end').attr('class', `${labelStyle} fill-amber-400/70`).text('⏳ CAPACITY CONSTRAINED');
        g.append('text').attr('x', 10).attr('y', innerHeight - 10).attr('text-anchor', 'start').attr('class', `${labelStyle} fill-emerald-400/70`).text('✓ OPTIMAL EQUILIBRIUM');

        // Grid container
        g.append('g').attr('class', 'grid-x').attr('transform', `translate(0,${innerHeight})`);
        g.append('g').attr('class', 'grid-y');

        // Axes
        g.append('g').attr('class', 'axis-x').attr('transform', `translate(0,${innerHeight})`);
        g.append('g').attr('class', 'axis-y');

        // 85% Util line
        g.append('line').attr('x1', xScaleStatic(utilThreshold)).attr('x2', xScaleStatic(utilThreshold)).attr('y1', 0).attr('y2', innerHeight).attr('stroke', '#f43f5e').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4').attr('stroke-opacity', 0.8);
        g.append('text').attr('x', xScaleStatic(utilThreshold) + 5).attr('y', innerHeight - 26).attr('class', 'fill-rose-400 font-mono text-[9px] font-bold').text('RDSO Limit 85%');

        // Groups
        g.append('g').attr('class', 'vectors-group');
        g.append('g').attr('class', 'nodes-group');
        g.append('g').attr('class', 'quadrant-hover-layer');
      }

      const xScale = d3.scaleLinear().domain([50, 100]).range([0, innerWidth]);
      const maxVolume =
        volumeUnit === 'HOURS'
          ? Math.max(22, d3.max(telemetryData, (d) => Math.max(d.totalBlockHours, d.backlog7DayMA)) || 20) + 2
          : Math.max(16, d3.max(telemetryData, (d) => Math.max(d.scheduledBlocks, d.backlogBlocks)) || 14) + 2;

      const yScale = d3.scaleLinear().domain([0, maxVolume]).range([innerHeight, 0]);

      const t = d3.transition().duration(transitionDuration).ease(transitionEase);

      // Transition Axes & Grid
      const xGrid = d3.axisBottom(xScale).ticks(6).tickSize(-innerHeight).tickFormat(() => '');
      const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
      g.select<SVGGElement>('g.grid-x').call(xGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');
      g.select<SVGGElement>('g.grid-y').call(yGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');

      const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}%`);
      const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}${volumeUnit === 'HOURS' ? 'h' : 'b'}`);
      g.select<SVGGElement>('g.axis-x').transition(t).call(xAxis);
      g.select<SVGGElement>('g.axis-y').transition(t).call(yAxis);

      // Predictive shift vectors
      const vectorsGroup = g.select('g.vectors-group');
      const vectors = vectorsGroup.selectAll<SVGLineElement, CorridorHealthTelemetry>('line.shift-vector')
        .data(showBacklogTrend ? telemetryData : [], (d) => d.id);

      vectors.enter()
        .append('line')
        .attr('class', 'shift-vector')
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0)
        .attr('x1', (d) => xScale(d.utilization))
        .attr('y1', (d) => yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .attr('x2', (d) => xScale(d.utilization))
        .attr('y2', (d) => yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .merge(vectors)
        .transition(t)
        .attr('stroke-opacity', 0.7)
        .attr('x1', (d) => xScale(d.utilization))
        .attr('y1', (d) => yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .attr('x2', (d) => xScale(Math.min(99, d.utilization + Math.round((d.backlog7DayMA / 14) * 2.5))))
        .attr('y2', (d) => yScale(Math.min(maxVolume - 1, (volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks) + (d.backlog7DayMA - 11.5) * 0.45)));

      vectors.exit().transition(t).attr('stroke-opacity', 0).remove();

      // Smooth Animated Nodes
      const nodesGroup = g.select('g.nodes-group');
      const nodes = nodesGroup.selectAll<SVGGElement, CorridorHealthTelemetry>('g.node-bubble')
        .data(telemetryData, (d) => d.id);

      const nodesEnter = nodes.enter()
        .append('g')
        .attr('class', 'node-bubble cursor-pointer group select-none')
        .attr('transform', (d) => `translate(${xScale(d.utilization)}, ${yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks)})`)
        .on('click', (_, d) => setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id));

      nodesEnter.append('circle').attr('class', 'halo-ring');
      nodesEnter.append('circle').attr('class', 'sim-ring');
      nodesEnter.append('circle').attr('class', 'core-circle');
      nodesEnter.append('text').attr('class', 'code-text').attr('text-anchor', 'middle').attr('font-family', 'monospace').attr('font-size', '11px').attr('font-weight', 'bold').attr('fill', '#ffffff').attr('y', 4);
      nodesEnter.append('text').attr('class', 'val-text').attr('text-anchor', 'middle').attr('font-family', 'monospace').attr('font-size', '10px').attr('font-weight', '600').attr('fill', '#f1f5f9');

      const mergedNodes = nodes.merge(nodesEnter);

      mergedNodes
        .transition(t)
        .attr('transform', (d) => `translate(${xScale(d.utilization)}, ${yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks)})`);

      mergedNodes.each(function (d) {
        const radius = Math.max(14, Math.min(26, Math.sqrt(d.lengthKm) * 2.8));
        const color = getStrainColor(d.strainCategory);
        const isSelected = selectedCorridorId === d.id;
        const el = d3.select(this);

        el.select('circle.sim-ring')
          .transition(t)
          .attr('r', radius + 8)
          .attr('fill', 'none')
          .attr('stroke', '#a855f7')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3')
          .attr('stroke-opacity', d.hasSimulatedBlock ? 0.9 : 0);

        el.select('circle.core-circle')
          .transition(t)
          .attr('r', radius)
          .attr('fill', isSelected ? color : '#0e172e')
          .attr('stroke', d.hasSimulatedBlock ? '#c084fc' : color)
          .attr('stroke-width', isSelected || d.hasSimulatedBlock ? 3 : 2);

        el.select('text.code-text').text(d.id);
        el.select('text.val-text').attr('y', -radius - 6).text(`${d.utilization}% | ${volumeUnit === 'HOURS' ? `${d.totalBlockHours}h` : `${d.scheduledBlocks}b`}`);
      });

      // Interactive Hover-State Indicator for QUADRANT nodes
      mergedNodes
        .on('mouseenter', function (event, d) {
          setHoveredCorridor(d);
          if (tooltipRef.current && containerRef.current) {
            d3.select(tooltipRef.current).style('opacity', 1);
            const [mx, my] = d3.pointer(event, containerRef.current);
            d3.select(tooltipRef.current)
              .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 80)}px`);
          }

          const qHover = g.select('g.quadrant-hover-layer');
          qHover.selectAll('*').remove();

          const cx = xScale(d.utilization);
          const cy = yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks);
          const radius = Math.max(14, Math.min(26, Math.sqrt(d.lengthKm) * 2.8));
          const color = getStrainColor(d.strainCategory);

          // Luminous ring indicator around hovered bubble
          qHover.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', radius + 9)
            .attr('fill', 'none')
            .attr('stroke', '#38bdf8')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '4,3')
            .attr('pointer-events', 'none');

          // On-chart floating callout badge directly displaying active maintenance blocks & utilization
          const badgeG = qHover.append('g')
            .attr('class', 'quadrant-hover-badge pointer-events-none')
            .attr('transform', `translate(${cx}, ${Math.max(24, cy - radius - 26)})`);

          badgeG.append('rect')
            .attr('x', -95)
            .attr('y', -19)
            .attr('width', 190)
            .attr('height', 38)
            .attr('rx', 7)
            .attr('fill', '#070e1e')
            .attr('fill-opacity', 0.96)
            .attr('stroke', color)
            .attr('stroke-width', 1.8)
            .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))');

          badgeG.append('circle')
            .attr('cx', -80)
            .attr('cy', -7)
            .attr('r', 3.5)
            .attr('fill', color);

          badgeG.append('text')
            .attr('x', -70)
            .attr('y', -3)
            .attr('font-family', 'monospace')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', '#f8fafc')
            .text(`${d.id} • ${d.utilization}% UTILIZATION`);

          badgeG.append('text')
            .attr('x', -70)
            .attr('y', 11)
            .attr('font-family', 'monospace')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', '#38bdf8')
            .text(`⚡ ${d.scheduledBlocks} Active Blocks (${d.totalBlockHours}h)`);
        })
        .on('mousemove', function (event) {
          if (tooltipRef.current && containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            d3.select(tooltipRef.current)
              .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 80)}px`);
          }
        })
        .on('mouseleave', function () {
          setHoveredCorridor(null);
          if (tooltipRef.current) {
            d3.select(tooltipRef.current).style('opacity', 0);
          }
          g.select('g.quadrant-hover-layer').selectAll('*').remove();
        });

      nodes.exit().transition(t).attr('opacity', 0).remove();
    }

    // -------------------------------------------------------------
    // RENDER MODE 2: D3 DUAL-AXIS COMPARATIVE TELEMETRY (SMOOTH TRANSITIONS)
    // -------------------------------------------------------------
    else if (viewMode === 'COMPARATIVE') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      let g = svg.select<SVGGElement>('g.comparative-root');
      if (g.empty()) {
        g = svg.append('g').attr('class', 'comparative-root').attr('transform', `translate(${margin.left},${margin.top})`);

        // Static visual layers in order
        g.append('g').attr('class', 'grid-layer');
        g.append('g').attr('class', 'target-line-layer');
        g.append('g').attr('class', 'drop-guides-layer');
        g.append('g').attr('class', 'hover-column-layer');
        g.append('g').attr('class', 'bars-layer');
        g.append('g').attr('class', 'vol-area-layer');
        g.append('g').attr('class', 'ghost-trend-layer');
        g.append('g').attr('class', 'active-trend-layer'); // <--- DOTTED TRENDLINE LAYER
        g.append('g').attr('class', 'markers-layer');
        g.append('g').attr('class', 'axes-layer');
        g.append('g').attr('class', 'hit-areas-layer');
        g.append('g').attr('class', 'hover-overlay-layer');

        // Initialize empty paths for line generators
        g.select('g.vol-area-layer').append('path').attr('class', 'volume-area-path').attr('fill', '#38bdf8').attr('fill-opacity', 0.1);
        g.select('g.vol-area-layer').append('path').attr('class', 'volume-curve-path').attr('fill', 'none').attr('stroke', '#38bdf8').attr('stroke-width', 2.5);
        g.select('g.ghost-trend-layer').append('path').attr('class', 'ghost-baseline-path').attr('fill', 'none').attr('stroke', '#64748b').attr('stroke-width', 2).attr('stroke-dasharray', '3,3');
        g.select('g.active-trend-layer').append('path').attr('class', 'backlog-ma-dotted-path').attr('fill', 'none').attr('stroke-linecap', 'round');

        // Axes containers
        g.select('g.axes-layer').append('g').attr('class', 'x-axis-group').attr('transform', `translate(0,${innerHeight})`);
        g.select('g.axes-layer').append('g').attr('class', 'y-util-group');
        g.select('g.axes-layer').append('g').attr('class', 'y-vol-group').attr('transform', `translate(${innerWidth},0)`);

        // Axis Titles
        g.select('g.axes-layer').append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -42).attr('text-anchor', 'middle').attr('class', 'fill-slate-300 font-mono text-[11px] font-semibold').text('← UTILIZATION (%) [BARS]');
        g.select('g.axes-layer').append('text').attr('transform', 'rotate(90)').attr('x', innerHeight / 2).attr('y', -innerWidth - 48).attr('text-anchor', 'middle').attr('class', 'fill-sky-400 font-mono text-[11px] font-semibold').text('BLOCK VOLUME & 7d MA BACKLOG →');
      }

      const xScale = d3.scaleBand().domain(telemetryData.map((d) => d.id)).range([0, innerWidth]).padding(0.35);
      const yUtilScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      const maxVolume =
        volumeUnit === 'HOURS'
          ? Math.max(24, d3.max(telemetryData, (d) => Math.max(d.totalBlockHours, d.backlog7DayMA, d.baselineBacklog7DayMA)) || 22) + 2
          : Math.max(18, d3.max(telemetryData, (d) => Math.max(d.scheduledBlocks, d.backlogBlocks)) || 14) + 2;

      const yVolScale = d3.scaleLinear().domain([0, maxVolume]).range([innerHeight, 0]);

      // D3 Transition instance (Butter-smooth 800ms animation)
      const t = d3.transition().duration(transitionDuration).ease(transitionEase);

      // Grid & 85% Target Line
      const yGrid = d3.axisLeft(yUtilScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
      g.select<SVGGElement>('g.grid-layer').call(yGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,2');

      const targetLayer = g.select('g.target-line-layer');
      targetLayer.selectAll('*').remove();
      targetLayer.append('line').attr('x1', 0).attr('x2', innerWidth).attr('y1', yUtilScale(85)).attr('y2', yUtilScale(85)).attr('stroke', '#f43f5e').attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5).attr('stroke-opacity', 0.8);
      targetLayer.append('text').attr('x', innerWidth - 5).attr('y', yUtilScale(85) - 6).attr('text-anchor', 'end').attr('class', 'fill-rose-400 font-mono text-[9px] font-bold').text('85% Util Threshold');

      // Drop Guides (when dragging)
      const dropGuidesLayer = g.select('g.drop-guides-layer');
      dropGuidesLayer.selectAll('*').remove();
      if (activeDraggingBlock || isDragOverSvg) {
        telemetryData.forEach((d) => {
          const x = xScale(d.id) || 0;
          const barWidth = xScale.bandwidth();
          const isTargeted = hoveredDropCorridorId === d.id;
          dropGuidesLayer.append('rect').attr('x', x - 4).attr('y', 0).attr('width', barWidth + 8).attr('height', innerHeight).attr('fill', '#c084fc').attr('fill-opacity', isTargeted ? 0.22 : 0.08).attr('stroke', '#c084fc').attr('stroke-width', isTargeted ? 2 : 1).attr('stroke-dasharray', '4,4').attr('rx', 6);
          dropGuidesLayer.append('text').attr('x', x + barWidth / 2).attr('y', 20).attr('text-anchor', 'middle').attr('class', 'fill-purple-300 font-mono text-[9px] font-bold select-none').text(`DROP ON ${d.id}`);
        });
      }

      // In-chart Corridor Hover-State Indicator Triggers
      const triggerCorridorHover = (event: any, d: CorridorHealthTelemetry) => {
        setHoveredCorridor(d);
        if (tooltipRef.current && containerRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1);
          const [mx, my] = d3.pointer(event, containerRef.current);
          tooltip
            .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
            .style('top', `${Math.max(10, my - 80)}px`);
        }

        const hoverCol = g.select('g.hover-column-layer');
        const hoverOverlay = g.select('g.hover-overlay-layer');
        hoverCol.selectAll('*').remove();
        hoverOverlay.selectAll('*').remove();

        const x = xScale(d.id) || 0;
        const barWidth = xScale.bandwidth();
        const color = getStrainColor(d.strainCategory);

        // 1. Column beam highlight
        hoverCol.append('rect')
          .attr('x', x - 4)
          .attr('y', 0)
          .attr('width', barWidth + 8)
          .attr('height', innerHeight)
          .attr('fill', color)
          .attr('fill-opacity', 0.12)
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
          .attr('rx', 6);

        // 2. High-visibility on-chart floating badge directly indicating utilization & active blocks
        const badgeY = Math.max(22, Math.min(innerHeight - 50, yUtilScale(d.utilization) - 26));
        const badgeG = hoverOverlay.append('g')
          .attr('class', 'hover-badge-callout pointer-events-none')
          .attr('transform', `translate(${x + barWidth / 2}, ${badgeY})`);

        badgeG.append('rect')
          .attr('x', -95)
          .attr('y', -19)
          .attr('width', 190)
          .attr('height', 38)
          .attr('rx', 7)
          .attr('fill', '#070e1e')
          .attr('fill-opacity', 0.96)
          .attr('stroke', color)
          .attr('stroke-width', 1.8)
          .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))');

        badgeG.append('circle')
          .attr('cx', -80)
          .attr('cy', -7)
          .attr('r', 3.5)
          .attr('fill', color);

        badgeG.append('text')
          .attr('x', -70)
          .attr('y', -3)
          .attr('font-family', 'monospace')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#f8fafc')
          .text(`${d.id} • ${d.utilization}% UTILIZATION`);

        badgeG.append('text')
          .attr('x', -70)
          .attr('y', 11)
          .attr('font-family', 'monospace')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#38bdf8')
          .text(`⚡ ${d.scheduledBlocks} Active Blocks (${d.totalBlockHours}h)`);
      };

      const clearCorridorHover = () => {
        setHoveredCorridor(null);
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
        g.select('g.hover-column-layer').selectAll('*').remove();
        g.select('g.hover-overlay-layer').selectAll('*').remove();
      };

      // Utilization Bars with Smooth Transitions
      const barsLayer = g.select('g.bars-layer');
      const bars = barsLayer.selectAll<SVGGElement, CorridorHealthTelemetry>('g.bar-unit')
        .data(telemetryData, (d) => d.id);

      const barsEnter = bars.enter()
        .append('g')
        .attr('class', 'bar-unit cursor-pointer')
        .on('click', (_, d) => setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id));

      barsEnter.append('rect').attr('rx', 4);
      barsEnter.append('text').attr('text-anchor', 'middle').attr('font-family', 'monospace').attr('font-size', '11px').attr('font-weight', 'bold');

      const mergedBars = bars.merge(barsEnter);
      mergedBars.each(function (d) {
        const x = xScale(d.id) || 0;
        const barWidth = xScale.bandwidth();
        const isSelected = selectedCorridorId === d.id;
        const color = getStrainColor(d.strainCategory);
        const el = d3.select(this);

        el.select('rect')
          .transition(t)
          .attr('x', x)
          .attr('y', yUtilScale(d.utilization))
          .attr('width', barWidth)
          .attr('height', innerHeight - yUtilScale(d.utilization))
          .attr('fill', color)
          .attr('fill-opacity', isSelected ? 0.9 : 0.6)
          .attr('stroke', isSelected ? '#ffffff' : color)
          .attr('stroke-width', isSelected ? 2 : 1);

        el.select('text')
          .transition(t)
          .attr('x', x + barWidth / 2)
          .attr('y', yUtilScale(d.utilization) - 6)
          .attr('fill', color)
          .text(`${d.utilization}%`);
      });

      // Attach hover interactions to utilization bars
      mergedBars
        .on('mouseenter', function (event, d) {
          triggerCorridorHover(event, d);
          d3.select(this).select('rect')
            .attr('stroke', '#38bdf8')
            .attr('stroke-width', 2.5)
            .attr('fill-opacity', 0.95);
        })
        .on('mousemove', function (event) {
          if (tooltipRef.current && containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            d3.select(tooltipRef.current)
              .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 80)}px`);
          }
        })
        .on('mouseleave', function (_, d) {
          clearCorridorHover();
          const isSelected = selectedCorridorId === d.id;
          const color = getStrainColor(d.strainCategory);
          d3.select(this).select('rect')
            .attr('stroke', isSelected ? '#ffffff' : color)
            .attr('stroke-width', isSelected ? 2 : 1)
            .attr('fill-opacity', isSelected ? 0.9 : 0.6);
        });

      bars.exit().remove();

      // Volume Curve Generators
      const lineGenerator = d3
        .line<CorridorHealthTelemetry>()
        .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y((d) => yVolScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .curve(d3.curveMonotoneX);

      const areaGenerator = d3
        .area<CorridorHealthTelemetry>()
        .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1((d) => yVolScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .curve(d3.curveMonotoneX);

      // Smoothly Animate Volume Area & Curve
      g.select('path.volume-area-path')
        .datum(telemetryData)
        .transition(t)
        .attr('d', areaGenerator);

      g.select('path.volume-curve-path')
        .datum(telemetryData)
        .transition(t)
        .attr('d', lineGenerator);

      // Ghost Baseline Trend-line (Smoothed Transition)
      const baselineMaLineGen = d3
        .line<CorridorHealthTelemetry>()
        .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y((d) => yVolScale(volumeUnit === 'HOURS' ? d.baselineBacklog7DayMA : Math.round(d.baselineBacklog7DayMA / 1.45)))
        .curve(d3.curveMonotoneX);

      g.select('path.ghost-baseline-path')
        .datum(telemetryData)
        .transition(t)
        .attr('stroke-opacity', simulatedBlocks.length > 0 ? 0.7 : 0)
        .attr('d', baselineMaLineGen);

      // -------------------------------------------------------------
      // D3 DOTTED TREND-LINE WITH SMOOTH POINT-WISE CUBIC MONOTONE TRANSITION
      // -------------------------------------------------------------
      const comparativePoints = telemetryData.map((d) => {
        const currentVal = volumeUnit === 'HOURS' ? d.backlog7DayMA : d.backlogBlocks;
        const prevVal = prevComparativeBacklogMapRef.current.get(d.id) ?? currentVal;
        const x = (xScale(d.id) || 0) + xScale.bandwidth() / 2;
        const prevY = yVolScale(prevVal);
        const targetY = yVolScale(currentVal);
        return {
          id: d.id,
          x,
          prevVal,
          currentVal,
          prevY,
          targetY,
          interpolateY: d3.interpolateNumber(prevY, targetY),
        };
      });

      // Update ref store for future recalculations
      telemetryData.forEach((d) => {
        prevComparativeBacklogMapRef.current.set(
          d.id,
          volumeUnit === 'HOURS' ? d.backlog7DayMA : d.backlogBlocks
        );
      });

      const comparativeCurveGen = d3
        .line<[number, number]>()
        .x((p) => p[0])
        .y((p) => p[1])
        .curve(d3.curveMonotoneX);

      const activeTrendPath = g.select<SVGPathElement>('path.backlog-ma-dotted-path');

      // Initialize path geometry immediately if empty so transition has a defined baseline
      if (!activeTrendPath.attr('d')) {
        const initialPoints: [number, number][] = comparativePoints.map((p) => [p.x, p.prevY]);
        activeTrendPath.attr('d', comparativeCurveGen(initialPoints) || '');
      }

      // Animated D3 Morphing of the Dotted Trend-Line with Point-wise Monotone Cubic Interpolation
      activeTrendPath
        .datum(telemetryData)
        .transition(t)
        .attrTween('d', () => {
          return (progress: number) => {
            const intermediatePoints: [number, number][] = comparativePoints.map((p) => [
              p.x,
              p.interpolateY(progress),
            ]);
            return comparativeCurveGen(intermediatePoints) || '';
          };
        })
        .attr('stroke', simulatedBlocks.length > 0 ? '#a855f7' : '#c084fc')
        .attr('stroke-width', 2.8)
        .attr('stroke-dasharray', '6,4') // CRISP DOTTED SPECIFICATION
        .attr('opacity', showBacklogTrend ? 1 : 0)
        .attr('class', 'backlog-ma-dotted-path filter drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]');

      // -------------------------------------------------------------
      // SMOOTH ANIMATED MARKERS & HALOS (IN LOCKSTEP WITH TREND-LINE)
      // -------------------------------------------------------------
      const markersLayer = g.select('g.markers-layer');
      const markers = markersLayer.selectAll<SVGGElement, CorridorHealthTelemetry>('g.trend-marker')
        .data(showBacklogTrend ? telemetryData : [], (d) => d.id);

      const markersEnter = markers.enter()
        .append('g')
        .attr('class', 'trend-marker select-none')
        .attr('transform', (d) => {
          const pt = comparativePoints.find((p) => p.id === d.id);
          const cx = pt ? pt.x : (xScale(d.id) || 0) + xScale.bandwidth() / 2;
          const cy = pt ? pt.prevY : yVolScale(volumeUnit === 'HOURS' ? d.backlog7DayMA : d.backlogBlocks);
          return `translate(${cx}, ${cy})`;
        });

      // Halo ring
      markersEnter.append('circle').attr('class', 'halo-circle').attr('r', 7).attr('fill', '#c084fc').attr('fill-opacity', 0.25);

      // Volume marker circle
      markersEnter.append('circle').attr('class', 'vol-point').attr('r', 4).attr('fill', '#38bdf8').attr('stroke', '#0e172e').attr('stroke-width', 2);

      // Main interactive node circle
      markersEnter.append('circle').attr('class', 'core-node cursor-pointer').attr('stroke', '#0b1329').attr('stroke-width', 2);

      // Value label below
      markersEnter.append('text').attr('class', 'node-val-text').attr('text-anchor', 'middle').attr('font-family', 'monospace').attr('font-size', '10px').attr('font-weight', 'bold').attr('y', 18);

      // Dropped simulation badge container
      const badgeGroup = markersEnter.append('g').attr('class', 'sim-badge-pill').attr('transform', 'translate(0, -22)');
      badgeGroup.append('rect').attr('width', 80).attr('height', 16).attr('x', -40).attr('y', -8).attr('fill', '#581c87').attr('stroke', '#a855f7').attr('stroke-width', 1).attr('rx', 4);
      badgeGroup.append('text').attr('text-anchor', 'middle').attr('y', 3).attr('font-family', 'monospace').attr('font-size', '9px').attr('font-weight', 'bold').attr('fill', '#34d399');

      const mergedMarkers = markers.merge(markersEnter);

      // Smoothly Animate Marker Node Positions in lockstep with the dotted trendline
      mergedMarkers
        .transition(t)
        .attrTween('transform', function (d) {
          const pt = comparativePoints.find((p) => p.id === d.id);
          if (!pt) return () => 'translate(0, 0)';
          return (progress: number) => {
            const cy = pt.interpolateY(progress);
            return `translate(${pt.x}, ${cy})`;
          };
        });

      mergedMarkers.each(function (d) {
        const el = d3.select(this);

        el.select('circle.core-node')
          .transition(t)
          .attr('r', d.hasSimulatedBlock ? 6.5 : 5)
          .attr('fill', d.hasSimulatedBlock ? '#34d399' : '#c084fc');

        el.select('text.node-val-text')
          .transition(t)
          .attr('fill', d.hasSimulatedBlock ? '#34d399' : '#c084fc')
          .text(`${volumeUnit === 'HOURS' ? `${d.backlog7DayMA}h` : `${d.backlogBlocks}b`} (7d MA)`);

        el.select('g.sim-badge-pill')
          .transition(t)
          .attr('opacity', d.hasSimulatedBlock ? 1 : 0);

        if (d.hasSimulatedBlock) {
          el.select('g.sim-badge-pill text').text(`⚡ ↓ -${d.simulatedStrainRelief} Strain`);
        }

        // Hover triggers on core node
        el.select('circle.core-node')
          .on('mouseover', (event) => {
            triggerCorridorHover(event, d);
          })
          .on('mousemove', (event) => {
            if (tooltipRef.current && containerRef.current) {
              const [mx, my] = d3.pointer(event, containerRef.current);
              d3.select(tooltipRef.current)
                .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
                .style('top', `${Math.max(10, my - 80)}px`);
            }
          })
          .on('mouseout', () => {
            clearCorridorHover();
          })
          .on('click', () => setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id));
      });

      markers.exit().transition(t).attr('opacity', 0).remove();

      // Transparent column hit areas for full-column hover activation
      const hitAreasLayer = g.select('g.hit-areas-layer');
      const hitAreas = hitAreasLayer.selectAll<SVGRectElement, CorridorHealthTelemetry>('rect.col-hit-area')
        .data(telemetryData, (d) => d.id);

      hitAreas.enter()
        .append('rect')
        .attr('class', 'col-hit-area cursor-pointer')
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .merge(hitAreas)
        .attr('x', (d) => (xScale(d.id) || 0) - 2)
        .attr('y', 0)
        .attr('width', xScale.bandwidth() + 4)
        .attr('height', innerHeight)
        .on('mouseenter', (event, d) => triggerCorridorHover(event, d))
        .on('mousemove', (event) => {
          if (tooltipRef.current && containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            d3.select(tooltipRef.current)
              .style('left', `${Math.min(width - 290, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 80)}px`);
          }
        })
        .on('mouseleave', () => clearCorridorHover())
        .on('click', (_, d) => setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id));

      hitAreas.exit().remove();

      // Smoothly Animate Axes
      const xAxis = d3.axisBottom(xScale);
      const yUtilAxis = d3.axisLeft(yUtilScale).ticks(5).tickFormat((d) => `${d}%`);
      const yVolAxis = d3.axisRight(yVolScale).ticks(5).tickFormat((d) => `${d}${volumeUnit === 'HOURS' ? 'h' : 'b'}`);

      g.select<SVGGElement>('g.x-axis-group').transition(t).call(xAxis);
      g.select<SVGGElement>('g.y-util-group').transition(t).call(yUtilAxis);
      g.select<SVGGElement>('g.y-vol-group').transition(t).call(yVolAxis);
    }

    // -------------------------------------------------------------
    // RENDER MODE 3: D3 7-DAY PREDICTIVE STRAIN TIMELINE (ANIMATED)
    // -------------------------------------------------------------
    else if (viewMode === 'PREDICTIVE_7D') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      let g = svg.select<SVGGElement>('g.predictive-root');
      if (g.empty()) {
        g = svg.append('g').attr('class', 'predictive-root').attr('transform', `translate(${margin.left},${margin.top})`);

        g.append('g').attr('class', 'pred-shading-layer');
        g.append('g').attr('class', 'pred-grid-layer');
        g.append('g').attr('class', 'pred-bars-layer');
        g.append('g').attr('class', 'pred-ghost-layer');
        g.append('g').attr('class', 'pred-strain-layer');
        g.append('g').attr('class', 'pred-trend-layer');
        g.append('g').attr('class', 'pred-markers-layer');
        g.append('g').attr('class', 'pred-axes-layer');

        // Paths
        g.select('g.pred-ghost-layer').append('path').attr('class', 'ghost-strain-path').attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 1.5).attr('stroke-dasharray', '3,3');
        g.select('g.pred-strain-layer').append('path').attr('class', 'strain-curve-path').attr('fill', 'none').attr('stroke-width', 2.4);
        g.select('g.pred-trend-layer').append('path').attr('class', 'pred-ma-dotted-path').attr('fill', 'none').attr('stroke', '#c084fc').attr('stroke-width', 3).attr('stroke-dasharray', '6,4').attr('stroke-linecap', 'round');

        // Axes containers
        g.select('g.pred-axes-layer').append('g').attr('class', 'pred-x-axis').attr('transform', `translate(0,${innerHeight})`);
        g.select('g.pred-axes-layer').append('g').attr('class', 'pred-y-left');
        g.select('g.pred-axes-layer').append('g').attr('class', 'pred-y-right').attr('transform', `translate(${innerWidth},0)`);

        g.select('g.pred-axes-layer').append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -42).attr('text-anchor', 'middle').attr('class', 'fill-purple-300 font-mono text-[11px] font-semibold').text('← BACKLOG 7D MA (HOURS) [DOTTED]');
        g.select('g.pred-axes-layer').append('text').attr('transform', 'rotate(90)').attr('x', innerHeight / 2).attr('y', -innerWidth - 48).attr('text-anchor', 'middle').attr('class', 'fill-rose-400 font-mono text-[11px] font-semibold').text('PREDICTIVE STRAIN INDEX →');
      }

      const xScale = d3.scaleBand().domain(predictive7DSeries.map((d) => d.dayLabel)).range([0, innerWidth]).padding(0.25);
      const maxBacklog = Math.max(22, d3.max(predictive7DSeries, (d) => Math.max(d.dailyBacklogHours, d.backlog7DayMA, d.baselineBacklog7DayMA)) || 20) + 2;
      const yBacklogScale = d3.scaleLinear().domain([0, maxBacklog]).range([innerHeight, 0]);
      const yStrainScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      const t = d3.transition().duration(transitionDuration).ease(transitionEase);

      // Shaded Forecast Region & 85 line
      const shadingLayer = g.select('g.pred-shading-layer');
      shadingLayer.selectAll('*').remove();
      const forecastStartIndex = predictive7DSeries.findIndex((d) => d.dayOffset === 1);
      if (forecastStartIndex !== -1) {
        const forecastX = xScale(predictive7DSeries[forecastStartIndex].dayLabel) || 0;
        shadingLayer.append('rect').attr('x', forecastX - 4).attr('y', 0).attr('width', innerWidth - forecastX + 4).attr('height', innerHeight).attr('fill', '#c084fc').attr('fill-opacity', 0.06).attr('rx', 4);
        shadingLayer.append('text').attr('x', innerWidth - 8).attr('y', 16).attr('text-anchor', 'end').attr('class', 'fill-purple-400 font-mono text-[9px] font-bold tracking-wider select-none').text('PREDICTIVE 7-DAY STRAIN FORECAST HORIZON');
      }
      shadingLayer.append('line').attr('x1', 0).attr('x2', innerWidth).attr('y1', yStrainScale(85)).attr('y2', yStrainScale(85)).attr('stroke', '#f43f5e').attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5).attr('stroke-opacity', 0.85);
      shadingLayer.append('text').attr('x', innerWidth - 6).attr('y', yStrainScale(85) - 6).attr('text-anchor', 'end').attr('class', 'fill-rose-400 font-mono text-[9px] font-bold').text('RDSO Critical Limit 85');

      // Animate Daily Bars
      const bars = g.select('g.pred-bars-layer').selectAll<SVGRectElement, Predictive7DayPoint>('rect.daily-bar')
        .data(predictive7DSeries, (d) => d.dayLabel);

      bars.enter().append('rect').attr('class', 'daily-bar').attr('rx', 3)
        .merge(bars)
        .transition(t)
        .attr('x', (d) => xScale(d.dayLabel) || 0)
        .attr('y', (d) => yBacklogScale(d.dailyBacklogHours))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => innerHeight - yBacklogScale(d.dailyBacklogHours))
        .attr('fill', (d) => (d.isForecast ? '#8b5cf6' : '#64748b'))
        .attr('fill-opacity', (d) => (d.isForecast ? 0.28 : 0.22));

      bars.exit().remove();

      // Ghost strain curve
      const ghostStrainGen = d3.line<Predictive7DayPoint>().x((d) => (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2).y((d) => yStrainScale(d.baselineStrainIndex)).curve(d3.curveMonotoneX);
      g.select('path.ghost-strain-path')
        .datum(predictive7DSeries)
        .transition(t)
        .attr('stroke-opacity', simulatedBlocks.length > 0 ? 0.6 : 0)
        .attr('d', ghostStrainGen);

      // Shifted Strain Curve with Smooth Transition
      const strainLineGenerator = d3.line<Predictive7DayPoint>().x((d) => (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2).y((d) => yStrainScale(d.corridorStrainIndex)).curve(d3.curveMonotoneX);
      g.select('path.strain-curve-path')
        .datum(predictive7DSeries)
        .transition(t)
        .attr('stroke', simulatedBlocks.length > 0 ? '#10b981' : '#f43f5e')
        .attr('d', strainLineGenerator);

      // DOTTED 7-DAY MA TREND-LINE SMOOTH POINT-WISE TRANSITION
      const predPoints = predictive7DSeries.map((d) => {
        const currentVal = d.backlog7DayMA;
        const prevVal = prevPredictive7DBacklogMapRef.current.get(d.dayLabel) ?? currentVal;
        const x = (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2;
        const prevY = yBacklogScale(prevVal);
        const targetY = yBacklogScale(currentVal);
        return {
          dayLabel: d.dayLabel,
          x,
          prevVal,
          currentVal,
          prevY,
          targetY,
          interpolateY: d3.interpolateNumber(prevY, targetY),
        };
      });

      predictive7DSeries.forEach((d) => {
        prevPredictive7DBacklogMapRef.current.set(d.dayLabel, d.backlog7DayMA);
      });

      const predMonotoneGen = d3
        .line<[number, number]>()
        .x((p) => p[0])
        .y((p) => p[1])
        .curve(d3.curveMonotoneX);

      const predTrendPath = g.select<SVGPathElement>('path.pred-ma-dotted-path');
      if (!predTrendPath.attr('d')) {
        const initialPoints: [number, number][] = predPoints.map((p) => [p.x, p.prevY]);
        predTrendPath.attr('d', predMonotoneGen(initialPoints) || '');
      }

      predTrendPath
        .datum(predictive7DSeries)
        .transition(t)
        .attrTween('d', () => {
          return (progress: number) => {
            const intermediatePoints: [number, number][] = predPoints.map((p) => [
              p.x,
              p.interpolateY(progress),
            ]);
            return predMonotoneGen(intermediatePoints) || '';
          };
        });

      // Marker Nodes in lockstep
      const nodes = g.select('g.pred-markers-layer').selectAll<SVGCircleElement, Predictive7DayPoint>('circle.pred-node')
        .data(predictive7DSeries, (d) => d.dayLabel);

      nodes.enter().append('circle').attr('class', 'pred-node').attr('r', 4.5).attr('stroke', '#0e172e').attr('stroke-width', 2)
        .merge(nodes)
        .transition(t)
        .attr('cx', (d) => (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2)
        .attrTween('cy', function (d) {
          const pt = predPoints.find((p) => p.dayLabel === d.dayLabel);
          if (!pt) return () => '0';
          return (progress: number) => String(pt.interpolateY(progress));
        })
        .attr('fill', (d) => (d.dayOffset === 0 ? '#38bdf8' : '#c084fc'));

      nodes.exit().remove();

      // Axes transitions
      const xAxis = d3.axisBottom(xScale);
      const yBacklogAxis = d3.axisLeft(yBacklogScale).ticks(5).tickFormat((d) => `${d}h`);
      const yStrainAxis = d3.axisRight(yStrainScale).ticks(5).tickFormat((d) => `${d}`);
      g.select<SVGGElement>('g.pred-x-axis').transition(t).call(xAxis);
      g.select<SVGGElement>('g.pred-y-left').transition(t).call(yBacklogAxis);
      g.select<SVGGElement>('g.pred-y-right').transition(t).call(yStrainAxis);
    }

    // -------------------------------------------------------------
    // RENDER MODE 4: D3 24-HOUR DIURNAL PROFILE
    // -------------------------------------------------------------
    else if (viewMode === 'DIURNAL') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      let g = svg.select<SVGGElement>('g.diurnal-root');
      if (g.empty()) {
        g = svg.append('g').attr('class', 'diurnal-root').attr('transform', `translate(${margin.left},${margin.top})`);
        g.append('g').attr('class', 'diurnal-areas');
        g.append('g').attr('class', 'diurnal-axes');
        g.select('g.diurnal-areas').append('path').attr('class', 'traffic-area').attr('fill', '#f59e0b').attr('fill-opacity', 0.14);
        g.select('g.diurnal-areas').append('path').attr('class', 'traffic-line').attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 2.5);
        g.select('g.diurnal-areas').append('path').attr('class', 'maint-area').attr('fill', '#38bdf8').attr('fill-opacity', 0.22);
        g.select('g.diurnal-areas').append('path').attr('class', 'maint-line').attr('fill', 'none').attr('stroke', '#38bdf8').attr('stroke-width', 2.5);

        g.select('g.diurnal-axes').append('g').attr('class', 'diurnal-x').attr('transform', `translate(0,${innerHeight})`);
        g.select('g.diurnal-axes').append('g').attr('class', 'diurnal-y-left');
        g.select('g.diurnal-axes').append('g').attr('class', 'diurnal-y-right').attr('transform', `translate(${innerWidth},0)`);
      }

      const xScale = d3.scaleLinear().domain([0, 23]).range([0, innerWidth]);
      const yUtilScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
      const rawMaxVol = d3.max(diurnalData, (d: { maintenanceVolumeHours: number }) => d.maintenanceVolumeHours);
      const maxVolHour = Math.max(10, typeof rawMaxVol === 'number' ? rawMaxVol : 8) + 1;
      const yVolScale = d3.scaleLinear().domain([0, maxVolHour]).range([innerHeight, 0]);

      const t = d3.transition().duration(transitionDuration).ease(transitionEase);

      const trafficArea = d3.area<(typeof diurnalData)[0]>().x((d) => xScale(d.hour)).y0(innerHeight).y1((d) => yUtilScale(d.trafficUtilization)).curve(d3.curveMonotoneX);
      const trafficLine = d3.line<(typeof diurnalData)[0]>().x((d) => xScale(d.hour)).y((d) => yUtilScale(d.trafficUtilization)).curve(d3.curveMonotoneX);
      g.select('path.traffic-area').datum(diurnalData).transition(t).attr('d', trafficArea);
      g.select('path.traffic-line').datum(diurnalData).transition(t).attr('d', trafficLine);

      const maintenanceArea = d3.area<(typeof diurnalData)[0]>().x((d) => xScale(d.hour)).y0(innerHeight).y1((d) => yVolScale(d.maintenanceVolumeHours)).curve(d3.curveBasis);
      const maintenanceLine = d3.line<(typeof diurnalData)[0]>().x((d) => xScale(d.hour)).y((d) => yVolScale(d.maintenanceVolumeHours)).curve(d3.curveBasis);
      g.select('path.maint-area').datum(diurnalData).transition(t).attr('d', maintenanceArea);
      g.select('path.maint-line').datum(diurnalData).transition(t).attr('d', maintenanceLine);

      const xAxis = d3.axisBottom(xScale).ticks(12).tickFormat((d) => `${d.toString().padStart(2, '0')}:00`);
      const yUtilAxis = d3.axisLeft(yUtilScale).ticks(5).tickFormat((d) => `${d}%`);
      const yVolAxis = d3.axisRight(yVolScale).ticks(5).tickFormat((d) => `${d}h`);

      g.select<SVGGElement>('g.diurnal-x').transition(t).call(xAxis);
      g.select<SVGGElement>('g.diurnal-y-left').transition(t).call(yUtilAxis);
      g.select<SVGGElement>('g.diurnal-y-right').transition(t).call(yVolAxis);
    }
  }, [
    telemetryData,
    viewMode,
    volumeUnit,
    selectedCorridorId,
    showBacklogTrend,
    diurnalData,
    predictive7DSeries,
    simulatedBlocks,
    activeDraggingBlock,
    isDragOverSvg,
    hoveredDropCorridorId,
    networkKpis.totalBlockHours,
    transitionDurationMs,
    recalculationVersion,
  ]);

  return (
    <div
      id="network-health-summary-section"
      className="bg-[#0b1329] p-5 rounded-2xl border border-sky-950/90 shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Background radial atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 blur-3xl pointer-events-none" />

      {/* Floating Notification Toast */}
      {notificationMsg && (
        <div className="fixed top-20 right-6 z-50 animate-fadeIn pointer-events-auto max-w-sm">
          <div className="p-3.5 rounded-xl bg-[#0e172e] border border-purple-500 shadow-2xl font-mono text-xs text-slate-100 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-purple-300 block">{notificationMsg.title}</span>
              <p className="text-[11px] text-slate-300 leading-snug">{notificationMsg.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION HEADER & CONTROL BAR                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 border border-sky-600/50 text-sky-400 shrink-0 mt-0.5 shadow-md shadow-sky-950/50">
            <Activity className="w-5 h-5 animate-pulse text-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base md:text-lg font-black text-slate-100 font-mono tracking-wider uppercase">
                Network Health Summary
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60 font-bold flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-sky-400" />
                D3.JS DYNAMIC TELEMETRY
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/80 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                D3 {transitionDurationMs}ms SMOOTH TRANSITIONS
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1.5 border ${
                  simulatedBlocks.length > 0
                    ? 'bg-purple-950/80 text-purple-300 border-purple-700/80'
                    : networkKpis.criticalStrainCorridorsCount > 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    simulatedBlocks.length > 0
                      ? 'bg-purple-400 animate-ping'
                      : networkKpis.criticalStrainCorridorsCount > 0
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                STATUS: {networkKpis.networkStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time corridor utilization versus maintenance block volume with a smoothly animated 7-day moving average backlog trend-line. Drag-and-drop maintenance blocks via the Predictive Gap Tool to observe fluid D3 transitions.
            </p>
          </div>
        </div>

        {/* Action & Mode Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center font-mono text-xs">
          {/* Predictive Gap Tool Deck Toggle */}
          <button
            onClick={() => setShowPredictiveGapTool(!showPredictiveGapTool)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              showPredictiveGapTool
                ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-md shadow-purple-950/60'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Predictive Gap Tool Draggable Staging Deck"
          >
            <Zap className={`w-3.5 h-3.5 ${showPredictiveGapTool ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <span>PREDICTIVE GAP TOOL</span>
            {simulatedBlocks.length > 0 && (
              <span className="px-1 rounded bg-purple-600 text-white text-[10px] font-bold">
                {simulatedBlocks.length}
              </span>
            )}
          </button>

          {/* Recalculate Backlog MA Button */}
          <button
            onClick={handleRecalculateBacklog}
            disabled={isRecalculating}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              isRecalculating
                ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-md shadow-amber-950/50'
                : 'bg-purple-950/80 border-purple-500/80 text-purple-200 hover:bg-purple-900/80 hover:border-purple-400 shadow-sm shadow-purple-950/40'
            }`}
            title="Recalculate 7-day maintenance backlog moving average and trigger smooth D3 transition animation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-amber-400' : 'text-purple-400'}`} />
            <span>{isRecalculating ? 'RECALCULATING...' : 'RECALCULATE BACKLOG'}</span>
          </button>

          {/* Calibrate Backlog Toggle */}
          <button
            onClick={() => setShowStressControls(!showStressControls)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              showStressControls
                ? 'bg-sky-950/90 border-sky-500 text-sky-200 shadow-sm shadow-sky-950/60'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Backlog Calibration & Recalculation Controls (Stress presets & sliders)"
          >
            <Sliders className={`w-3.5 h-3.5 ${showStressControls ? 'text-sky-400' : 'text-slate-500'}`} />
            <span>CALIBRATE</span>
          </button>

          {/* Live Telemetry Stream Toggle */}
          <button
            onClick={() => setIsLiveTelemetryActive(!isLiveTelemetryActive)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              isLiveTelemetryActive
                ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-sm shadow-emerald-950/40'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Live Telemetry Stream: simulates active sensor micro-fluctuations every 3.5s with smooth D3 animation"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveTelemetryActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{isLiveTelemetryActive ? 'LIVE TELEMETRY ON' : 'PAUSED'}</span>
          </button>

          {/* 7-Day Backlog MA Trend-Line Quick Toggle Button */}
          <button
            onClick={() => setShowBacklogTrend((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              showBacklogTrend
                ? 'bg-purple-950/80 border-purple-600/80 text-purple-200 shadow-sm shadow-purple-950/50'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 7-day moving average dotted trend-line of maintenance backlog"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${showBacklogTrend ? 'text-purple-400' : 'text-slate-500'}`} />
            <span>{showBacklogTrend ? '7D MA: ON' : '7D MA: OFF'}</span>
            <span
              className={`inline-block w-2.5 border-t-2 border-dashed ${
                showBacklogTrend ? 'border-purple-400' : 'border-slate-500'
              }`}
            />
          </button>

          {/* Volume Unit Switcher */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setVolumeUnit('HOURS')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                volumeUnit === 'HOURS'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hours
            </button>
            <button
              onClick={() => setVolumeUnit('BLOCKS')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                volumeUnit === 'BLOCKS'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Blocks
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('QUADRANT')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'QUADRANT'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ScatterChart className="w-3.5 h-3.5" />
              <span>Quadrant</span>
            </button>
            <button
              onClick={() => setViewMode('COMPARATIVE')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'COMPARATIVE'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparative</span>
            </button>
            <button
              onClick={() => setViewMode('PREDICTIVE_7D')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'PREDICTIVE_7D'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="7-Day Predictive Strain & Backlog Moving Average Timeline"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>7D Predictive</span>
            </button>
            <button
              onClick={() => setViewMode('DIURNAL')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'DIURNAL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>24h Diurnal</span>
            </button>
          </div>

          {/* Export as PDF/PNG Official Reporting Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!!isExporting}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                showExportMenu || isExporting
                  ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-950/60'
                  : 'bg-slate-900 border-slate-700 text-sky-300 hover:text-white hover:border-sky-500 hover:bg-slate-800'
              }`}
              title="Export predictive strain map and trend-line status for official reporting (PDF / PNG)"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{isExporting ? `EXPORTING ${isExporting.toUpperCase()}...` : 'EXPORT AS PDF/PNG'}</span>
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#091427]/98 backdrop-blur-md border border-sky-500/80 rounded-xl shadow-2xl p-2 z-50 space-y-1.5 font-mono text-xs">
                <div className="px-2 py-1 border-b border-slate-800 text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center justify-between">
                  <span>Official Report Export</span>
                  <span className="text-sky-400 font-bold">{viewMode}</span>
                </div>

                {/* Option 1: PDF Export */}
                <button
                  onClick={handleExportPdf}
                  disabled={!!isExporting}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-sky-950 border border-slate-800 hover:border-sky-500/70 text-slate-200 hover:text-white transition-all flex items-start gap-2.5 cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs block group-hover:text-sky-300">
                      Export as PDF (Official Report)
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      Divisional Railway report with embedded high-res chart, KPIs, corridor breakdown & DRM sign-off.
                    </span>
                  </div>
                </button>

                {/* Option 2: PNG Export */}
                <button
                  onClick={handleExportPng}
                  disabled={!!isExporting}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/90 hover:bg-sky-950 border border-slate-800 hover:border-sky-500/70 text-slate-200 hover:text-white transition-all flex items-start gap-2.5 cursor-pointer group"
                >
                  <Image className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs block group-hover:text-sky-300">
                      Export as PNG (High-Res Map)
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      High-DPI graphic snapshot of current predictive strain map & 7-day backlog trend-line for briefings.
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PREDICTIVE GAP TOOL STAGING DECK                              */}
      {/* ------------------------------------------------------------- */}
      {showPredictiveGapTool && (
        <PredictiveGapTool
          corridors={corridors}
          simulatedBlocks={simulatedBlocks}
          onSimulateBlock={handleSimulateBlock}
          onRemoveSimulatedBlock={handleRemoveSimulatedBlock}
          onResetSimulation={handleResetSimulation}
          onCommitSimulation={handleCommitSimulation}
          activeDraggingBlock={activeDraggingBlock}
          setActiveDraggingBlock={setActiveDraggingBlock}
          isSimulating={simulatedBlocks.length > 0}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* BACKLOG CALIBRATION & RECALCULATION CONTROL DECK             */}
      {/* ------------------------------------------------------------- */}
      {showStressControls && (
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-800/80 shadow-lg space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-100 uppercase tracking-wider text-xs">
                Maintenance Backlog Calibration & D3 Transition Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/80 font-bold">
                {transitionDurationMs}ms CUBIC EASING
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Transition Speed:</span>
              {([400, 800, 1400] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setTransitionDurationMs(spd)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer transition-all ${
                    transitionDurationMs === spd
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd === 400 ? 'Fast (400ms)' : spd === 800 ? 'Smooth (800ms)' : 'Fluid (1.4s)'}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders and Quick Recalculate Presets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Slider: Backlog Volume Delta */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">Backlog Recalculation Offset</span>
                <span className="text-purple-300 font-bold">
                  {blockVolumeSurgeDelta >= 0 ? `+${blockVolumeSurgeDelta}` : blockVolumeSurgeDelta}h / day
                </span>
              </div>
              <input
                type="range"
                min={-5}
                max={6}
                step={0.5}
                value={blockVolumeSurgeDelta}
                onChange={(e) => setBlockVolumeSurgeDelta(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-5h (High Clearance)</span>
                <span>Baseline (0h)</span>
                <span>+6h (Severe Deferred)</span>
              </div>
            </div>

            {/* Slider: Traffic Utilization Surge */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">Traffic Headway Pressure</span>
                <span className="text-sky-300 font-bold">
                  {utilizationSurgePct >= 0 ? `+${utilizationSurgePct}` : utilizationSurgePct}%
                </span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                step={1}
                value={utilizationSurgePct}
                onChange={(e) => setUtilizationSurgePct(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-15% (Low Headway)</span>
                <span>0% (Nominal)</span>
                <span>+15% (Congested)</span>
              </div>
            </div>

            {/* Quick Recalculate Presets & Actions */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <span className="text-slate-300 font-bold block">Quick Recalculation Presets</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handlePresetBacklog(3.0, 'Surge (+3.0h Deferred Work)')}
                  className="px-2 py-1.5 rounded bg-rose-950/70 border border-rose-800/80 hover:bg-rose-900 text-rose-200 text-[10px] font-bold transition-all cursor-pointer truncate"
                >
                  ⚠️ +3.0h Surge
                </button>
                <button
                  onClick={() => handlePresetBacklog(-2.5, 'Relief (-2.5h Clearance Sprint)')}
                  className="px-2 py-1.5 rounded bg-emerald-950/70 border border-emerald-800/80 hover:bg-emerald-900 text-emerald-200 text-[10px] font-bold transition-all cursor-pointer truncate"
                >
                  ✓ -2.5h Relief
                </button>
                <button
                  onClick={() => handlePresetBacklog(4.5, 'Headway Saturation (+4.5h)')}
                  className="px-2 py-1.5 rounded bg-amber-950/70 border border-amber-800/80 hover:bg-amber-900 text-amber-200 text-[10px] font-bold transition-all cursor-pointer truncate"
                >
                  ⏳ +4.5h Saturation
                </button>
                <button
                  onClick={handleResetBacklogToBaseline}
                  className="px-2 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset Baseline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4 HIGH-IMPACT KPI TILES INCLUDING SIMULATION SHIFT DELTAS     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI Tile 1: Overall Network Health Score */}
        <div className="bg-[#0e172e] p-3.5 rounded-xl border border-sky-950/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Network Health Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-300">
              {networkKpis.overallHealthScore}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">composite</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-emerald-400">
            {simulatedBlocks.length > 0 ? (
              <span className="text-purple-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Shifted by -{networkKpis.totalSimulatedRelief} pts</span>
              </span>
            ) : (
              <>
                <TrendingUp className="w-3 h-3" />
                <span>Optimal balance across 4 lines</span>
              </>
            )}
          </div>
        </div>

        {/* KPI Tile 2: Aggregate Track Utilization */}
        <div className="bg-[#0e172e] p-3.5 rounded-xl border border-sky-950/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Avg Track Utilization</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-sky-300">
              {networkKpis.averageUtilization}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">capacity</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>Target: &le;85%</span>
            <span className={networkKpis.averageUtilization > 85 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {networkKpis.averageUtilization > 85 ? '(Threshold Exceeded)' : '(Safe Buffer)'}
            </span>
          </div>
        </div>

        {/* KPI Tile 3: 7-Day Backlog Moving Average */}
        <div className="bg-[#0e172e] p-3.5 rounded-xl border border-purple-950/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-300 text-xs font-mono">
            <span className="flex items-center gap-1">
              <span>7d Backlog MA</span>
              <span className="w-2.5 border-t border-dashed border-purple-400 inline-block" />
            </span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-purple-300">
              {networkKpis.network7DayBacklogMA}h
            </span>
            <span className="text-[11px] font-mono text-slate-400">rolling avg</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-purple-400">
            <Target className="w-3 h-3" />
            <span>Pred. Strain: {networkKpis.predictedNetworkStrain}/100</span>
          </div>
        </div>

        {/* KPI Tile 4: Peak Strained Corridor */}
        <div className="bg-[#0e172e] p-3.5 rounded-xl border border-sky-950/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Peak Strained Section</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-300">
              {networkKpis.peakStrainedCorridor?.id || 'C003'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {networkKpis.peakStrainedCorridor?.utilization}% Util
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-rose-400 truncate">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {networkKpis.peakStrainedCorridor?.code || 'NDLS-ROK'} Strain: {networkKpis.peakStrainedCorridor?.strainIndex}/100
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN D3 VISUALIZATION CANVAS (WITH DRAG-AND-DROP DROP ZONE)   */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl bg-[#090f22] border border-sky-950/90 relative overflow-hidden">
        {/* Sub-header info banner inside chart */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold uppercase">
              {viewMode === 'QUADRANT' && 'D3 QUADRANT MATRIX: UTILIZATION VS BLOCK VOLUME WITH PREDICTIVE SHIFT VECTORS'}
              {viewMode === 'COMPARATIVE' && 'D3 DUAL-AXIS TELEMETRY: DROP BLOCKS ONTO 7D MA DOTTED TREND-LINE TO SIMULATE SHIFT'}
              {viewMode === 'PREDICTIVE_7D' && 'D3 7-DAY PREDICTIVE STRAIN TIMELINE: 7-DAY MA BACKLOG DOTTED TREND VS FUTURE STRAIN'}
              {viewMode === 'DIURNAL' && 'D3 24-HOUR DIURNAL PROFILE: TRAFFIC THROUGHPUT VS MAINTENANCE TIMING'}
            </span>
            <span className="text-[10px] text-purple-400 font-bold">
              {simulatedBlocks.length > 0 && `(Simulating ${simulatedBlocks.length} Staged Blocks)`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            {/* Legend Item: Scheduled Volume */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              <span className="text-sky-300">Scheduled Volume</span>
            </div>

            {/* Legend Item: 7-Day MA Backlog Dotted Trend-line */}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 border-t-2 border-dashed border-purple-400 inline-block" />
              <span className="text-purple-300 font-bold">7-Day MA Backlog (Predictive)</span>
            </div>

            {/* Ghost Baseline Legend (if simulated) */}
            {simulatedBlocks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dashed border-slate-500 inline-block" />
                <span className="text-slate-400">Baseline Pre-Sim</span>
              </div>
            )}

            {/* Legend Item: Utilization Bars */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span>Optimal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>Critical Strain</span>
            </div>
          </div>
        </div>

        {/* D3 SVG Container with Drag & Drop Event Listeners */}
        <div
          ref={containerRef}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const mouseX = e.clientX - rect.left - 60;
              const innerW = rect.width - 125;
              const idx = Math.min(corridors.length - 1, Math.max(0, Math.floor((mouseX / innerW) * corridors.length)));
              const corr = corridors[idx]?.id || 'C001';
              if (hoveredDropCorridorId !== corr) setHoveredDropCorridorId(corr);
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOverSvg(true);
          }}
          onDragLeave={() => {
            setIsDragOverSvg(false);
            setHoveredDropCorridorId(null);
          }}
          onDrop={handleDropOnCanvas}
          className={`w-full relative overflow-x-auto transition-colors rounded-lg ${
            isDragOverSvg ? 'ring-2 ring-purple-500/80 bg-purple-950/10' : ''
          }`}
        >
          {/* Active Drag Drop Instruction Banner inside SVG */}
          {(isDragOverSvg || activeDraggingBlock) && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-purple-900/95 border border-purple-400 text-purple-200 text-[11px] font-mono font-bold shadow-xl animate-bounce pointer-events-none flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-purple-300" />
              <span>RELEASE TO DROP ONTO TREND-LINE & SIMULATE SHIFT</span>
            </div>
          )}

          <svg ref={svgRef} className="mx-auto block" />

          {/* D3 Floating Interactive Tooltip HUD (Corridor Hover-State Indicator) */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none transition-opacity duration-150 opacity-0 bg-[#070e1e]/98 backdrop-blur-md p-4 rounded-xl border border-sky-500/80 shadow-2xl text-xs font-mono min-w-[290px] max-w-sm z-30 space-y-2.5"
          >
            {/* Tooltip Header */}
            <div className="font-bold text-white text-xs pb-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: getCorridorStrainColor(tooltipCorridor?.strainCategory) }}
                />
                <span className="text-slate-100 font-bold truncate max-w-[190px]">
                  {tooltipCorridor?.name || 'Corridor Telemetry'}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/80 font-bold">
                {tooltipCorridor?.id}
              </span>
            </div>

            {/* PRIMARY HOVER INDICATORS: EXACT NUMBER OF ACTIVE MAINTENANCE BLOCKS & CURRENT UTILIZATION */}
            <div className="grid grid-cols-2 gap-2">
              {/* Indicator 1: Current Utilization */}
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[9px]">UTILIZATION</span>
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span
                    className={`text-2xl font-black ${
                      tooltipCorridor && tooltipCorridor.utilization > 85 ? 'text-rose-400' : 'text-sky-300'
                    }`}
                  >
                    {tooltipCorridor?.utilization}%
                  </span>
                  <span className="text-[10px] text-slate-400">load</span>
                </div>
                {/* Visual headway capacity bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      tooltipCorridor && tooltipCorridor.utilization > 85
                        ? 'bg-rose-500'
                        : tooltipCorridor && tooltipCorridor.utilization > 75
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, tooltipCorridor?.utilization || 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  {tooltipCorridor && tooltipCorridor.utilization > 85 ? 'Threshold Exceeded' : `${100 - (tooltipCorridor?.utilization || 0)}% Buffer`}
                </span>
              </div>

              {/* Indicator 2: Exact Number of Active Maintenance Blocks */}
              <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-sky-300">
                  <span className="font-semibold uppercase tracking-wider text-[9px]">ACTIVE BLOCKS</span>
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-cyan-300">
                    {tooltipCorridor?.scheduledBlocks}
                  </span>
                  <span className="text-[10px] text-slate-400">blocks</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-bold text-cyan-300">{tooltipCorridor?.totalBlockHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Critical:</span>
                    <span className="font-bold text-amber-400">{tooltipCorridor?.criticalBlocksCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Telemetry: 7-Day MA & Predicted Strain */}
            <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-800/50 space-y-1 text-[11px]">
              <div className="flex justify-between text-purple-300">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-400" />
                  <span>7-Day Backlog MA:</span>
                </span>
                <span className="font-bold">{tooltipCorridor?.backlog7DayMA}h / day</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Predicted Future Strain:</span>
                <span
                  className={`font-bold ${
                    tooltipCorridor && tooltipCorridor.predictedFutureStrain >= 85
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {tooltipCorridor?.predictedFutureStrain} / 100
                </span>
              </div>
              {tooltipCorridor?.hasSimulatedBlock && (
                <div className="text-emerald-300 font-bold flex items-center gap-1 text-[10px]">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Simulated Strain Relief: -{tooltipCorridor.simulatedStrainRelief} pts</span>
                </div>
              )}
            </div>

            {/* Status & Recommendation */}
            <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 leading-snug">
              <span className="font-bold text-slate-300 uppercase block mb-0.5">
                STATUS: {tooltipCorridor?.strainCategory.replace('_', ' ')}
              </span>
              {tooltipCorridor?.backlogRecommendation}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CORRIDOR DEEP INSPECTION CARD (ON CLICK)                      */}
      {/* ------------------------------------------------------------- */}
      {activeCorridor && (
        <div className="bg-[#0e172e] p-4.5 rounded-xl border border-sky-900/60 shadow-md font-mono space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-sky-950 text-sky-300 border border-sky-700/80 font-bold text-xs">
                {activeCorridor.id}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{activeCorridor.name}</span>
                  <span className="text-xs text-slate-400">({activeCorridor.code})</span>
                </h4>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Route: {activeCorridor.fromStation} ↔ {activeCorridor.toStation} | Length: {activeCorridor.lengthKm} km | Tracks: {activeCorridor.tracksCount} | Max Speed: {activeCorridor.speedLimitKmph} km/h
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2">
              {activeCorridor.hasSimulatedBlock && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border bg-purple-950 text-purple-300 border-purple-600 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span>{activeCorridor.simulatedBlocksCount} Simulated Blocks</span>
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                  activeCorridor.strainCategory === 'CRITICAL_STRAIN'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : activeCorridor.strainCategory === 'CONSTRAINED'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : activeCorridor.strainCategory === 'HIGH_VOLUME'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {activeCorridor.strainCategory.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Metric Stats Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">LIVE CORRIDOR LOAD</span>
              <span className="text-base font-bold text-sky-400 mt-0.5 block">
                {activeCorridor.utilization}%
              </span>
              <span className="text-[10px] text-slate-400">Headway buffer: {100 - activeCorridor.utilization}%</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">SCHEDULED BLOCK VOLUME</span>
              <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                {activeCorridor.totalBlockHours}h
              </span>
              <span className="text-[10px] text-slate-400">{activeCorridor.scheduledBlocks} total maintenance blocks</span>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/60">
              <span className="text-purple-300 text-[10px] block flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-purple-400" />
                <span>7-DAY BACKLOG MA</span>
              </span>
              <span className="text-base font-bold text-purple-300 mt-0.5 block">
                {activeCorridor.backlog7DayMA}h
              </span>
              <span className="text-[10px] text-slate-400">
                Predicted Strain: <span className="text-rose-400 font-bold">{activeCorridor.predictedFutureStrain}/100</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">GANG DEPLOYMENT</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                {activeCorridor.deployedGangsCount} crews
              </span>
              <span className="text-[10px] text-slate-400">{activeCorridor.criticalBlocksCount} critical priority</span>
            </div>
          </div>

          {/* AI Operational Recommendation Callout */}
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-start gap-2.5 text-xs text-sky-200">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-sky-300">RAILSYNC DISPATCH RECOMMENDATION:</span>
              <p className="text-[11px] text-slate-300">{activeCorridor.aiRecommendation}</p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
            <button
              onClick={() => setShowExportMenu(true)}
              disabled={!!isExporting}
              className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export predictive strain map and trend-line status for official reporting (PDF / PNG)"
            >
              <FileDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Export as PDF/PNG</span>
            </button>
            <button
              onClick={() => onNavigate('corridors', { corridorId: activeCorridor.id })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Inspect Corridor Operations</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('resource_allocation', { corridorId: activeCorridor.id })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Inspect Resource Gangs</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate('planning', { corridorId: activeCorridor.id })}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimize Maintenance Blocks</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
