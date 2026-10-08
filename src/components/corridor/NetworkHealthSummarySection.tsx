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
  Clock,
  ArrowUpRight,
  Radio,
  Sliders,
  RotateCcw,
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
} from 'lucide-react';
import { Corridor, OptimizedBlock, BlockRequest } from '../../types';
import { mockStore } from '../../services/api';

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
}

export interface Predictive7DayPoint {
  dayOffset: number; // -6 to +7
  dayLabel: string; // e.g. "02 Oct", "Today", "+4d"
  fullDate: string;
  isForecast: boolean;
  dailyBacklogHours: number;
  backlog7DayMA: number;
  corridorStrainIndex: number;
  criticalCorridorsCount: number;
  riskTier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  operationalNote: string;
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

  // Simulation Stress Test State
  const [utilizationSurgePct, setUtilizationSurgePct] = useState<number>(0); // -15% to +15%
  const [blockVolumeSurgeDelta, setBlockVolumeSurgeDelta] = useState<number>(0); // -4h to +8h
  const [showStressControls, setShowStressControls] = useState<boolean>(false);

  // Live telemetry pulse timer (updates micro-fluctuations every 3.5 seconds if active)
  useEffect(() => {
    if (!isLiveTelemetryActive) return;
    const interval = setInterval(() => {
      setTelemetryPulseTick((prev) => prev + 1);
      setLastTelemetryTimestamp(new Date());
    }, 3500);
    return () => clearInterval(interval);
  }, [isLiveTelemetryActive]);

  // Compute enriched corridor telemetry data including 7-day backlog moving average & future strain
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

      // Strain index formulation: 55% Utilization + 45% Block Volume Intensity
      const utilWeight = (effectiveUtil / 100) * 60;
      const volWeight = Math.min(40, (effectiveHours / 22) * 40);
      const strainScore = Math.min(100, Math.round(utilWeight + volWeight));

      // 7-Day Moving Average Maintenance Backlog Computation
      const defaultHistory = [12.0, 12.5, 13.0, 13.2, 14.0, 14.5, 15.0];
      const rawHistory = baseBacklogHistories[c.id] || defaultHistory;
      // Adjust history dynamically with user stress-test controls
      const adjustedHistory = rawHistory.map((val) => {
        const surgeEffect = blockVolumeSurgeDelta * 0.85 + Math.max(0, utilizationSurgePct * 0.12);
        return Math.max(2.0, +(val + surgeEffect).toFixed(1));
      });

      const sumBacklog7D = adjustedHistory.reduce((acc, v) => acc + v, 0);
      const backlog7DayMA = +(sumBacklog7D / 7).toFixed(1);
      const currentBacklogHours = adjustedHistory[adjustedHistory.length - 1];
      const backlogBlocksCount = Math.max(2, Math.round(backlog7DayMA / 1.45));

      // Predictive Future Corridor Strain formulation (7-Day Projection):
      // When 7-day backlog MA exceeds 14 hours and utilization > 85%, future strain accelerates steeply
      const backlogStrainSurcharge = Math.max(0, (backlog7DayMA - 11.5) * 1.85);
      const predictedFutureStrain = Math.min(100, Math.round(strainScore + backlogStrainSurcharge));

      const strainDeltaPct = +(((predictedFutureStrain - strainScore) / (strainScore || 1)) * 100).toFixed(1);
      const speedCautionRisk = predictedFutureStrain >= 86;

      let strainTrend: CorridorHealthTelemetry['strainTrend'] = 'STABLE';
      if (strainDeltaPct >= 8) strainTrend = 'ESCALATING';
      else if (strainDeltaPct >= 3) strainTrend = 'ELEVATED';

      let strainCategory: CorridorHealthTelemetry['strainCategory'] = 'BALANCED_OPTIMAL';
      let recommendation = 'Nominal operational headroom. Maintenance windows clear on schedule.';
      let backlogRec = 'Backlog moving average within safe margins. Track assets in good order.';

      if (effectiveUtil >= 88 && effectiveHours >= 14) {
        strainCategory = 'CRITICAL_STRAIN';
        recommendation =
          'High traffic density combined with heavy track block volume. Recommended: activate moving shadow-blocks or defer non-critical tampers.';
        backlogRec = `7-Day MA Backlog of ${backlog7DayMA}h drives predicted strain to ${predictedFutureStrain}/100. High risk of 30km/h caution order within 5 days.`;
      } else if (effectiveUtil >= 88 && effectiveHours < 14) {
        strainCategory = 'CONSTRAINED';
        recommendation =
          'Track capacity constrained. Maintenance block requests face high deferral risk due to train headway congestion.';
        backlogRec = `Headway saturation starves maintenance windows. 7-Day Backlog MA (${backlog7DayMA}h) is accumulating unfulfilled possession requests.`;
      } else if (effectiveUtil < 88 && effectiveHours >= 14) {
        strainCategory = 'HIGH_VOLUME';
        recommendation =
          'High maintenance work density absorbed safely within generous traffic headway windows. Monitor gang fatigue.';
        backlogRec = `Work dense but headways permit possession execution. 7-Day Backlog MA (${backlog7DayMA}h) stable.`;
      } else {
        strainCategory = 'BALANCED_OPTIMAL';
        recommendation =
          'Optimal equilibrium between passenger/freight traffic throughput and scheduled maintenance execution.';
        backlogRec = `7-Day MA Backlog (${backlog7DayMA}h) well below 14h threshold. No speed restrictions projected.`;
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
        scheduledBlocks: effectiveBlockCount,
        availableSlots: c.availableSlots || 4,
        totalBlockHours: effectiveHours,
        criticalBlocksCount: criticalBlocks || Math.ceil(effectiveBlockCount * 0.4),
        activeTrainsCount: c.trainCount || Math.round(effectiveUtil * 0.38),
        deployedGangsCount: Math.round(effectiveBlockCount * 0.9),
        activeConflicts: c.activeConflicts || 0,
        strainIndex: strainScore,
        strainCategory,
        status: c.status || (effectiveUtil > 90 ? 'RESTRICTED' : 'OPERATIONAL'),
        aiRecommendation: recommendation,

        backlogHours: currentBacklogHours,
        backlogBlocks: backlogBlocksCount,
        backlog7DayHistory: adjustedHistory,
        backlog7DayMA,
        predictedFutureStrain,
        strainTrend,
        strainDeltaPct,
        speedCautionRisk,
        backlogRecommendation: backlogRec,
      };
    });
  }, [
    corridors,
    blocks,
    utilizationSurgePct,
    blockVolumeSurgeDelta,
    isLiveTelemetryActive,
    telemetryPulseTick,
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

    let status = 'HEALTHY & BALANCED';
    if (criticalCount >= 2) status = 'ELEVATED CONGESTION RISK';
    else if (criticalCount === 1) status = 'LOCALIZED STRAIN (C003)';

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
    };
  }, [telemetryData]);

  // Currently focused corridor object
  const activeCorridor = useMemo(() => {
    if (!selectedCorridorId) return telemetryData[0] || null;
    return telemetryData.find((c) => c.id === selectedCorridorId) || telemetryData[0];
  }, [selectedCorridorId, telemetryData]);

  // 14-Day Rolling Timeline Dataset (Day -6 to Day 0 to Day +7) for PREDICTIVE_7D mode
  const predictive7DSeries: Predictive7DayPoint[] = useMemo(() => {
    // Generate dates around today (Day 0)
    const baseDailyBacklogs = [
      11.8, 12.4, 13.1, 12.8, 13.9, 14.2, 14.8, // Days -6 to 0 (Historical)
      15.4, 16.2, 16.9, 17.5, 18.2, 18.9, 19.4, // Days +1 to +7 (7-day predictive strain forecast)
    ];

    const todayIndex = 6; // index 6 is Day 0 (Today)
    const months = ['Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct', 'Oct'];
    const days = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    return baseDailyBacklogs.map((baseVal, idx) => {
      const dayOffset = idx - todayIndex;
      const surgeEffect = blockVolumeSurgeDelta * 0.8 + Math.max(0, utilizationSurgePct * 0.15);
      const dailyVal = Math.max(4.0, +(baseVal + surgeEffect).toFixed(1));

      // Calculate rolling 7-day moving average up to this index
      const windowStart = Math.max(0, idx - 6);
      const windowValues = baseDailyBacklogs.slice(windowStart, idx + 1);
      const maVal = +(
        windowValues.reduce((sum, v) => sum + (v + surgeEffect), 0) / windowValues.length
      ).toFixed(1);

      // Predicted corridor strain index (escalating with 7d MA backlog)
      const strainIdx = Math.min(
        98,
        Math.max(60, Math.round(68 + (maVal - 11) * 2.8 + (dayOffset > 0 ? dayOffset * 1.5 : 0)))
      );

      let riskTier: Predictive7DayPoint['riskTier'] = 'LOW';
      if (strainIdx >= 86) riskTier = 'CRITICAL';
      else if (strainIdx >= 78) riskTier = 'HIGH';
      else if (strainIdx >= 70) riskTier = 'MODERATE';

      let note = 'Nominal maintenance clearance';
      if (dayOffset === 0) note = 'Current Live Telemetry Anchor';
      else if (dayOffset > 0 && strainIdx >= 85)
        note = `Predicted Corridor Strain Threshold Breach (Strain ${strainIdx}/100)`;
      else if (dayOffset > 0)
        note = `Predictive MA Backlog: ${maVal}h backlog accumulation`;

      const dayLabel = dayOffset === 0 ? 'Today' : dayOffset > 0 ? `+${dayOffset}d` : `${dayOffset}d`;
      const fullDate = `${days[idx]} ${months[idx]} 2026`;

      return {
        dayOffset,
        dayLabel,
        fullDate,
        isForecast: dayOffset > 0,
        dailyBacklogHours: dailyVal,
        backlog7DayMA: maVal,
        corridorStrainIndex: strainIdx,
        criticalCorridorsCount: strainIdx >= 85 ? 2 : 1,
        riskTier,
        operationalNote: note,
      };
    });
  }, [blockVolumeSurgeDelta, utilizationSurgePct]);

  // 24-Hour Diurnal distribution curve data for ViewMode === 'DIURNAL'
  const diurnalData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      // Train traffic peaks at 08:00-11:00 and 17:00-21:00
      let trafficFactor = 0.55;
      if (hour >= 7 && hour <= 11) trafficFactor = 0.94;
      else if (hour >= 17 && hour <= 21) trafficFactor = 0.96;
      else if (hour >= 12 && hour <= 16) trafficFactor = 0.78;
      else if (hour >= 1 && hour <= 5) trafficFactor = 0.32; // Golden night window

      // Maintenance block volume is inversely concentrated in night golden window (00:00 - 04:30) and midday gap (13:00 - 15:30)
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
  // D3 RENDERING ENGINE
  // ==========================================
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || telemetryData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth || 880;
    const width = Math.max(680, containerWidth);
    const height = viewMode === 'DIURNAL' || viewMode === 'PREDICTIVE_7D' ? 370 : 380;

    svg.attr('width', width).attr('height', height);

    // Color helpers based on strain category
    const getStrainColor = (category: CorridorHealthTelemetry['strainCategory']) => {
      switch (category) {
        case 'CRITICAL_STRAIN':
          return '#f43f5e'; // rose-500
        case 'CONSTRAINED':
          return '#f59e0b'; // amber-500
        case 'HIGH_VOLUME':
          return '#06b6d4'; // cyan-500
        case 'BALANCED_OPTIMAL':
        default:
          return '#10b981'; // emerald-500
      }
    };

    // -------------------------------------------------------------
    // RENDER MODE 1: D3 QUADRANT SCATTER/BUBBLE MATRIX
    // -------------------------------------------------------------
    if (viewMode === 'QUADRANT') {
      const margin = { top: 40, right: 45, bottom: 55, left: 65 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X Scale: Corridor Utilization (50% to 100%)
      const xScale = d3.scaleLinear().domain([50, 100]).range([0, innerWidth]);

      // Y Scale: Maintenance Block Volume (Hours 0 to 24 or Blocks 0 to 18)
      const maxVolume =
        volumeUnit === 'HOURS'
          ? Math.max(22, d3.max(telemetryData, (d) => Math.max(d.totalBlockHours, d.backlog7DayMA)) || 20) + 2
          : Math.max(16, d3.max(telemetryData, (d) => Math.max(d.scheduledBlocks, d.backlogBlocks)) || 14) + 2;

      const yScale = d3.scaleLinear().domain([0, maxVolume]).range([innerHeight, 0]);

      // Reference threshold lines: 85% Utilization ceiling & median Block Volume
      const utilThreshold = 85;
      const volumeThreshold = volumeUnit === 'HOURS' ? 14 : 10;

      // Quadrant Background Shading
      // Quadrant 1 (Top-Right): Critical Strain
      g.append('rect')
        .attr('x', xScale(utilThreshold))
        .attr('y', 0)
        .attr('width', innerWidth - xScale(utilThreshold))
        .attr('height', yScale(volumeThreshold))
        .attr('fill', '#f43f5e')
        .attr('fill-opacity', 0.05)
        .attr('rx', 6);

      // Quadrant 2 (Top-Left): High Volume Absorption
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(utilThreshold))
        .attr('height', yScale(volumeThreshold))
        .attr('fill', '#06b6d4')
        .attr('fill-opacity', 0.04)
        .attr('rx', 6);

      // Quadrant 3 (Bottom-Right): Constrained Backlog
      g.append('rect')
        .attr('x', xScale(utilThreshold))
        .attr('y', yScale(volumeThreshold))
        .attr('width', innerWidth - xScale(utilThreshold))
        .attr('height', innerHeight - yScale(volumeThreshold))
        .attr('fill', '#f59e0b')
        .attr('fill-opacity', 0.04)
        .attr('rx', 6);

      // Quadrant 4 (Bottom-Left): Optimal Equilibrium
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(volumeThreshold))
        .attr('width', xScale(utilThreshold))
        .attr('height', innerHeight - yScale(volumeThreshold))
        .attr('fill', '#10b981')
        .attr('fill-opacity', 0.04)
        .attr('rx', 6);

      // Quadrant Labels
      const labelStyle = 'font-mono text-[10px] uppercase font-bold tracking-wider select-none';

      g.append('text')
        .attr('x', innerWidth - 8)
        .attr('y', 16)
        .attr('text-anchor', 'end')
        .attr('class', `${labelStyle} fill-rose-400/70`)
        .text('⚠️ CRITICAL STRAIN ZONE');

      g.append('text')
        .attr('x', 10)
        .attr('y', 16)
        .attr('text-anchor', 'start')
        .attr('class', `${labelStyle} fill-cyan-400/70`)
        .text('⚡ HIGH MAINTENANCE ABSORPTION');

      g.append('text')
        .attr('x', innerWidth - 8)
        .attr('y', innerHeight - 10)
        .attr('text-anchor', 'end')
        .attr('class', `${labelStyle} fill-amber-400/70`)
        .text('⏳ CAPACITY CONSTRAINED (BACKLOG)');

      g.append('text')
        .attr('x', 10)
        .attr('y', innerHeight - 10)
        .attr('text-anchor', 'start')
        .attr('class', `${labelStyle} fill-emerald-400/70`)
        .text('✓ OPTIMAL EQUILIBRIUM');

      // Grid Lines
      const xGrid = d3.axisBottom(xScale).ticks(6).tickSize(-innerHeight).tickFormat(() => '');
      const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .attr('class', 'stroke-slate-800/60')
        .call(xGrid)
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');

      g.append('g')
        .attr('class', 'stroke-slate-800/60')
        .call(yGrid)
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');

      // Threshold Divider Reference Lines
      // Vertical Threshold Line (85% Utilization)
      g.append('line')
        .attr('x1', xScale(utilThreshold))
        .attr('x2', xScale(utilThreshold))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.8);

      g.append('text')
        .attr('x', xScale(utilThreshold) + 5)
        .attr('y', innerHeight - 26)
        .attr('class', 'fill-rose-400 font-mono text-[9px] font-bold')
        .text('RDSO Util Limit 85%');

      // Horizontal Threshold Line (14h Volume)
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(volumeThreshold))
        .attr('y2', yScale(volumeThreshold))
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.8);

      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', yScale(volumeThreshold) - 6)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-sky-400 font-mono text-[9px] font-bold')
        .text(`Nominal Volume Ceiling (${volumeThreshold}${volumeUnit === 'HOURS' ? 'h' : ' blk'})`);

      // 7-Day Predictive Strain Shift Vectors & Trajectories (when showBacklogTrend is active)
      if (showBacklogTrend) {
        telemetryData.forEach((d) => {
          const cx = xScale(d.utilization);
          const cy = yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks);
          // Projected coordinate based on 7-day backlog moving average escalation
          const projUtil = Math.min(99, d.utilization + Math.round((d.backlog7DayMA / 14) * 2.5));
          const projVol =
            volumeUnit === 'HOURS'
              ? Math.min(maxVolume - 1, d.totalBlockHours + (d.backlog7DayMA - 11.5) * 0.45)
              : Math.min(maxVolume - 1, d.scheduledBlocks + (d.backlogBlocks - 7) * 0.4);

          const px = xScale(projUtil);
          const py = yScale(projVol);

          // Dotted trajectory line representing 7-day predictive strain shift
          g.append('line')
            .attr('x1', cx)
            .attr('y1', cy)
            .attr('x2', px)
            .attr('y2', py)
            .attr('stroke', '#c084fc')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '3,3')
            .attr('stroke-opacity', 0.7);

          // Projected point marker
          g.append('circle')
            .attr('cx', px)
            .attr('cy', py)
            .attr('r', 3.5)
            .attr('fill', '#c084fc')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .attr('fill-opacity', 0.85);

          // Predictive label
          g.append('text')
            .attr('x', px + 5)
            .attr('y', py - 4)
            .attr('class', 'fill-purple-300 font-mono text-[8px] font-bold')
            .text(`+7d proj (${d.predictedFutureStrain})`);
        });
      }

      // X Axis
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(6)
        .tickFormat((d) => `${d}%`);
      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.select('.domain').attr('stroke', '#334155');
      xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace');

      // X Axis Label
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 42)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-slate-300 font-mono text-xs font-semibold tracking-wide')
        .text('REAL-TIME CORRIDOR UTILIZATION (%) →');

      // Y Axis
      const yAxis = d3
        .axisLeft(yScale)
        .ticks(5)
        .tickFormat((d) => `${d}${volumeUnit === 'HOURS' ? 'h' : 'b'}`);

      const yAxisGroup = g.append('g').call(yAxis);
      yAxisGroup.select('.domain').attr('stroke', '#334155');
      yAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      yAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace');

      // Y Axis Label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -48)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-slate-300 font-mono text-xs font-semibold tracking-wide')
        .text(
          volumeUnit === 'HOURS'
            ? '↑ MAINTENANCE BLOCK VOLUME (TOTAL DURATION HOURS)'
            : '↑ MAINTENANCE BLOCK VOLUME (TOTAL BLOCKS SCHEDULED)'
        );

      // Render Corridor Nodes
      telemetryData.forEach((d) => {
        const cx = xScale(d.utilization);
        const cy = yScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks);
        const radius = Math.max(14, Math.min(26, Math.sqrt(d.lengthKm) * 2.8));
        const color = getStrainColor(d.strainCategory);
        const isSelected = selectedCorridorId === d.id;

        const nodeGroup = g
          .append('g')
          .attr('class', 'cursor-pointer group select-none')
          .on('click', () => {
            setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id);
          });

        // Pulsing radar ring for Critical strain or Selected corridor
        if (d.strainCategory === 'CRITICAL_STRAIN' || isSelected) {
          nodeGroup
            .append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', radius + 9)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.5)
            .attr('stroke-dasharray', '3,3')
            .append('animate')
            .attr('attributeName', 'r')
            .attr('values', `${radius + 4};${radius + 14};${radius + 4}`)
            .attr('dur', '2.5s')
            .attr('repeatCount', 'indefinite');
        }

        // Drop shadow / glow filter
        nodeGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius + 3)
          .attr('fill', color)
          .attr('fill-opacity', isSelected ? 0.35 : 0.15);

        // Core Bubble
        nodeGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius)
          .attr('fill', isSelected ? color : '#0e172e')
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 3 : 2)
          .attr('filter', 'drop-shadow(0px 2px 6px rgba(0,0,0,0.6))');

        // Text: Corridor Code
        nodeGroup
          .append('text')
          .attr('x', cx)
          .attr('y', cy + 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('fill', isSelected ? '#ffffff' : color)
          .text(d.id);

        // Text Label badge above node
        nodeGroup
          .append('text')
          .attr('x', cx)
          .attr('y', cy - radius - 6)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', '#f1f5f9')
          .text(`${d.utilization}% | ${volumeUnit === 'HOURS' ? `${d.totalBlockHours}h` : `${d.scheduledBlocks}b`}`);

        // Tooltip triggers
        nodeGroup
          .on('mouseover', (event) => {
            if (!tooltipRef.current) return;
            const tooltip = d3.select(tooltipRef.current);
            tooltip.style('opacity', 1);

            const [mx, my] = d3.pointer(event, containerRef.current);
            tooltip
              .style('left', `${Math.min(width - 260, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 60)}px`);
          })
          .on('mouseout', () => {
            if (!tooltipRef.current) return;
            d3.select(tooltipRef.current).style('opacity', 0);
          });
      });
    }

    // -------------------------------------------------------------
    // RENDER MODE 2: D3 DUAL-AXIS COMPARATIVE TELEMETRY (BARS + CURVE + 7-DAY BACKLOG MA DOTTED TRENDLINE)
    // -------------------------------------------------------------
    else if (viewMode === 'COMPARATIVE') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X Scale: Corridor bands
      const xScale = d3
        .scaleBand()
        .domain(telemetryData.map((d) => d.id))
        .range([0, innerWidth])
        .padding(0.35);

      // Left Y Scale: Utilization (0% to 100%)
      const yUtilScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      // Right Y Scale: Block Volume & Backlog 7d MA (0 to Max Volume)
      const maxVolume =
        volumeUnit === 'HOURS'
          ? Math.max(
              24,
              d3.max(telemetryData, (d) => Math.max(d.totalBlockHours, d.backlog7DayMA)) || 22
            ) + 2
          : Math.max(
              18,
              d3.max(telemetryData, (d) => Math.max(d.scheduledBlocks, d.backlogBlocks)) || 14
            ) + 2;

      const yVolScale = d3.scaleLinear().domain([0, maxVolume]).range([innerHeight, 0]);

      // Grid lines
      const yGrid = d3.axisLeft(yUtilScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
      g.append('g')
        .call(yGrid)
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');

      // 85% Target Line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yUtilScale(85))
        .attr('y2', yUtilScale(85))
        .attr('stroke', '#f43f5e')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8);

      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', yUtilScale(85) - 6)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-rose-400 font-mono text-[9px] font-bold')
        .text('85% Util Threshold');

      // Utilization Bars
      telemetryData.forEach((d) => {
        const x = xScale(d.id) || 0;
        const barWidth = xScale.bandwidth();
        const barHeight = innerHeight - yUtilScale(d.utilization);
        const isSelected = selectedCorridorId === d.id;
        const color = getStrainColor(d.strainCategory);

        // Bar container
        const barGroup = g
          .append('g')
          .attr('class', 'cursor-pointer')
          .on('click', () => {
            setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id);
          });

        // Bar background fill
        barGroup
          .append('rect')
          .attr('x', x)
          .attr('y', yUtilScale(d.utilization))
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('fill', color)
          .attr('fill-opacity', isSelected ? 0.9 : 0.6)
          .attr('rx', 4)
          .attr('stroke', isSelected ? '#ffffff' : color)
          .attr('stroke-width', isSelected ? 2 : 1);

        // Value text inside / above bar
        barGroup
          .append('text')
          .attr('x', x + barWidth / 2)
          .attr('y', yUtilScale(d.utilization) - 6)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .attr('fill', color)
          .text(`${d.utilization}%`);
      });

      // Volume Overlay Line & Step Points (Solid Sky Blue)
      const lineGenerator = d3
        .line<CorridorHealthTelemetry>()
        .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y((d) => yVolScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .curve(d3.curveMonotoneX);

      // Area fill underneath volume curve
      const areaGenerator = d3
        .area<CorridorHealthTelemetry>()
        .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1((d) => yVolScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(telemetryData)
        .attr('d', areaGenerator)
        .attr('fill', '#38bdf8')
        .attr('fill-opacity', 0.1);

      g.append('path')
        .datum(telemetryData)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2.5);

      // Volume Data Markers
      telemetryData.forEach((d) => {
        const cx = (xScale(d.id) || 0) + xScale.bandwidth() / 2;
        const cy = yVolScale(volumeUnit === 'HOURS' ? d.totalBlockHours : d.scheduledBlocks);

        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 4.5)
          .attr('fill', '#38bdf8')
          .attr('stroke', '#0e172e')
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', cx)
          .attr('y', cy - 10)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'monospace')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#38bdf8')
          .text(`${volumeUnit === 'HOURS' ? `${d.totalBlockHours}h` : `${d.scheduledBlocks} blk`}`);
      });

      // -------------------------------------------------------------
      // 7-DAY MOVING AVERAGE MAINTENANCE BACKLOG DOTTED TREND-LINE
      // -------------------------------------------------------------
      if (showBacklogTrend) {
        const backlogMaLineGenerator = d3
          .line<CorridorHealthTelemetry>()
          .x((d) => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
          .y((d) => yVolScale(volumeUnit === 'HOURS' ? d.backlog7DayMA : d.backlogBlocks))
          .curve(d3.curveMonotoneX);

        // Dotted trend-line path (vibrant violet/magenta #c084fc with dash pattern)
        g.append('path')
          .datum(telemetryData)
          .attr('d', backlogMaLineGenerator)
          .attr('fill', 'none')
          .attr('stroke', '#c084fc')
          .attr('stroke-width', 2.8)
          .attr('stroke-dasharray', '6,4') // DOTTED TREND-LINE SPECIFICATION
          .attr('stroke-linecap', 'round')
          .attr('class', 'filter drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]');

        // Backlog MA Marker Nodes and Predictive Strain Tooltip Triggers
        telemetryData.forEach((d) => {
          const cx = (xScale(d.id) || 0) + xScale.bandwidth() / 2;
          const cy = yVolScale(volumeUnit === 'HOURS' ? d.backlog7DayMA : d.backlogBlocks);

          // Subtle outer halo ring
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 7)
            .attr('fill', '#c084fc')
            .attr('fill-opacity', 0.25);

          // Inner marker node
          const maNode = g
            .append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 5)
            .attr('fill', '#c084fc')
            .attr('stroke', '#0b1329')
            .attr('stroke-width', 2)
            .attr('class', 'cursor-pointer');

          // Data label badge below node
          g.append('text')
            .attr('x', cx)
            .attr('y', cy + 18)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'monospace')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', '#c084fc')
            .text(`${volumeUnit === 'HOURS' ? `${d.backlog7DayMA}h` : `${d.backlogBlocks}b`} (7d MA)`);

          // Predictive strain risk indicator
          if (d.predictedFutureStrain >= 86) {
            g.append('text')
              .attr('x', cx)
              .attr('y', cy + 30)
              .attr('text-anchor', 'middle')
              .attr('font-family', 'monospace')
              .attr('font-size', '8px')
              .attr('font-weight', 'bold')
              .attr('fill', '#f43f5e')
              .text(`⚠️ Strain: ${d.predictedFutureStrain}`);
          }

          // Tooltip on MA node hover
          maNode
            .on('mouseover', (event) => {
              if (!tooltipRef.current) return;
              const tooltip = d3.select(tooltipRef.current);
              tooltip.style('opacity', 1);

              const [mx, my] = d3.pointer(event, containerRef.current);
              tooltip
                .style('left', `${Math.min(width - 260, Math.max(10, mx + 15))}px`)
                .style('top', `${Math.max(10, my - 60)}px`);
            })
            .on('mouseout', () => {
              if (!tooltipRef.current) return;
              d3.select(tooltipRef.current).style('opacity', 0);
            })
            .on('click', () => {
              setSelectedCorridorId(d.id === selectedCorridorId ? null : d.id);
            });
        });
      }

      // X Axis
      const xAxis = d3.axisBottom(xScale);
      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.select('.domain').attr('stroke', '#334155');
      xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      xAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold');

      // Left Y Axis (Utilization %)
      const yUtilAxis = d3
        .axisLeft(yUtilScale)
        .ticks(5)
        .tickFormat((d) => `${d}%`);
      const yUtilAxisGroup = g.append('g').call(yUtilAxis);
      yUtilAxisGroup.select('.domain').attr('stroke', '#334155');
      yUtilAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      yUtilAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-slate-300 font-mono text-[11px] font-semibold')
        .text('← UTILIZATION (%) [BARS]');

      // Right Y Axis (Block Volume & Backlog MA)
      const yVolAxis = d3
        .axisRight(yVolScale)
        .ticks(5)
        .tickFormat((d) => `${d}${volumeUnit === 'HOURS' ? 'h' : 'b'}`);
      const yVolAxisGroup = g
        .append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yVolAxis);
      yVolAxisGroup.select('.domain').attr('stroke', '#38bdf8');
      yVolAxisGroup.selectAll('.tick line').attr('stroke', '#38bdf8');
      yVolAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#38bdf8')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(90)')
        .attr('x', innerHeight / 2)
        .attr('y', -innerWidth - 48)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-sky-400 font-mono text-[11px] font-semibold')
        .text('BLOCK VOLUME & 7d MA BACKLOG →');
    }

    // -------------------------------------------------------------
    // RENDER MODE 3: D3 7-DAY PREDICTIVE STRAIN & BACKLOG TIMELINE
    // -------------------------------------------------------------
    else if (viewMode === 'PREDICTIVE_7D') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X Scale: 14 Days (-6d to +7d)
      const xScale = d3
        .scaleBand()
        .domain(predictive7DSeries.map((d) => d.dayLabel))
        .range([0, innerWidth])
        .padding(0.25);

      // Left Y Scale: Backlog Volume Hours (0 to 25h)
      const maxBacklog =
        Math.max(22, d3.max(predictive7DSeries, (d) => Math.max(d.dailyBacklogHours, d.backlog7DayMA)) || 20) + 2;
      const yBacklogScale = d3.scaleLinear().domain([0, maxBacklog]).range([innerHeight, 0]);

      // Right Y Scale: Predictive Corridor Strain Index (0 to 100)
      const yStrainScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      // Shaded Forecast Region for Days +1 to +7 (Purple Tint)
      const forecastStartIndex = predictive7DSeries.findIndex((d) => d.dayOffset === 1);
      if (forecastStartIndex !== -1) {
        const forecastX = xScale(predictive7DSeries[forecastStartIndex].dayLabel) || 0;
        g.append('rect')
          .attr('x', forecastX - 4)
          .attr('y', 0)
          .attr('width', innerWidth - forecastX + 4)
          .attr('height', innerHeight)
          .attr('fill', '#c084fc')
          .attr('fill-opacity', 0.06)
          .attr('rx', 4);

        g.append('text')
          .attr('x', innerWidth - 8)
          .attr('y', 16)
          .attr('text-anchor', 'end')
          .attr('class', 'fill-purple-400 font-mono text-[9px] font-bold tracking-wider select-none')
          .text('PREDICTIVE 7-DAY STRAIN FORECAST HORIZON');
      }

      // Historical Baseline Label
      g.append('text')
        .attr('x', 10)
        .attr('y', 16)
        .attr('text-anchor', 'start')
        .attr('class', 'fill-slate-400 font-mono text-[9px] font-bold tracking-wider select-none')
        .text('HISTORICAL 7-DAY BASELINE');

      // Grid Lines
      const yGrid = d3.axisLeft(yBacklogScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
      g.append('g')
        .call(yGrid)
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');

      // 85 Strain Threshold Reference Line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yStrainScale(85))
        .attr('y2', yStrainScale(85))
        .attr('stroke', '#f43f5e')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.85);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yStrainScale(85) - 6)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-rose-400 font-mono text-[9px] font-bold')
        .text('RDSO Critical Strain Limit 85');

      // Vertical Today Anchor Line
      const todayPoint = predictive7DSeries.find((d) => d.dayOffset === 0);
      if (todayPoint) {
        const todayX = (xScale(todayPoint.dayLabel) || 0) + xScale.bandwidth() / 2;
        g.append('line')
          .attr('x1', todayX)
          .attr('x2', todayX)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');

        g.append('text')
          .attr('x', todayX)
          .attr('y', 28)
          .attr('text-anchor', 'middle')
          .attr('class', 'fill-sky-400 font-mono text-[9px] font-bold')
          .text('LIVE TODAY');
      }

      // Daily Backlog Bars (Subtle Purple/Slate Bars)
      predictive7DSeries.forEach((d) => {
        const x = xScale(d.dayLabel) || 0;
        const barWidth = xScale.bandwidth();
        const barHeight = innerHeight - yBacklogScale(d.dailyBacklogHours);

        g.append('rect')
          .attr('x', x)
          .attr('y', yBacklogScale(d.dailyBacklogHours))
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('fill', d.isForecast ? '#8b5cf6' : '#64748b')
          .attr('fill-opacity', d.isForecast ? 0.28 : 0.22)
          .attr('rx', 3);
      });

      // Corridor Strain Index Curve (Rose/Amber)
      const strainLineGenerator = d3
        .line<Predictive7DayPoint>()
        .x((d) => (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2)
        .y((d) => yStrainScale(d.corridorStrainIndex))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(predictive7DSeries)
        .attr('d', strainLineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.2)
        .attr('stroke-opacity', 0.85);

      // -------------------------------------------------------------
      // DOTTED TREND-LINE: 7-DAY MOVING AVERAGE OF MAINTENANCE BACKLOG
      // -------------------------------------------------------------
      const maLineGenerator = d3
        .line<Predictive7DayPoint>()
        .x((d) => (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2)
        .y((d) => yBacklogScale(d.backlog7DayMA))
        .curve(d3.curveMonotoneX);

      // Glowing Dotted Trend-Line
      g.append('path')
        .datum(predictive7DSeries)
        .attr('d', maLineGenerator)
        .attr('fill', 'none')
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '6,4') // DOTTED TREND-LINE
        .attr('stroke-linecap', 'round')
        .attr('class', 'filter drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]');

      // Markers & Tooltips for 7-Day MA Points
      predictive7DSeries.forEach((d) => {
        const cx = (xScale(d.dayLabel) || 0) + xScale.bandwidth() / 2;
        const cy = yBacklogScale(d.backlog7DayMA);

        // Marker halo
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', '#c084fc')
          .attr('fill-opacity', 0.2);

        // Marker node
        const node = g
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', d.dayOffset === 0 ? 5.5 : 4)
          .attr('fill', d.dayOffset === 0 ? '#38bdf8' : '#c084fc')
          .attr('stroke', '#0e172e')
          .attr('stroke-width', 2)
          .attr('class', 'cursor-pointer');

        // Text value on forecast endpoints
        if (d.dayOffset === -6 || d.dayOffset === 0 || d.dayOffset === 7) {
          g.append('text')
            .attr('x', cx)
            .attr('y', cy - 10)
            .attr('text-anchor', 'middle')
            .attr('class', 'fill-purple-300 font-mono text-[9px] font-bold')
            .text(`${d.backlog7DayMA}h MA`);
        }

        // Tooltip
        node
          .on('mouseover', (event) => {
            if (!tooltipRef.current) return;
            const tooltip = d3.select(tooltipRef.current);
            tooltip.style('opacity', 1);

            const [mx, my] = d3.pointer(event, containerRef.current);
            tooltip
              .style('left', `${Math.min(width - 260, Math.max(10, mx + 15))}px`)
              .style('top', `${Math.max(10, my - 60)}px`);
          })
          .on('mouseout', () => {
            if (!tooltipRef.current) return;
            d3.select(tooltipRef.current).style('opacity', 0);
          });
      });

      // X Axis
      const xAxis = d3.axisBottom(xScale);
      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.select('.domain').attr('stroke', '#334155');
      xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      xAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold');

      // Left Y Axis (Backlog Volume Hours)
      const yBacklogAxis = d3
        .axisLeft(yBacklogScale)
        .ticks(5)
        .tickFormat((d) => `${d}h`);
      const yBacklogAxisGroup = g.append('g').call(yBacklogAxis);
      yBacklogAxisGroup.select('.domain').attr('stroke', '#334155');
      yBacklogAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      yBacklogAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#c084fc')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-purple-300 font-mono text-[11px] font-semibold')
        .text('← BACKLOG 7D MA (HOURS) [DOTTED]');

      // Right Y Axis (Corridor Strain Index)
      const yStrainAxis = d3
        .axisRight(yStrainScale)
        .ticks(5)
        .tickFormat((d) => `${d}`);
      const yStrainAxisGroup = g
        .append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yStrainAxis);
      yStrainAxisGroup.select('.domain').attr('stroke', '#f43f5e');
      yStrainAxisGroup.selectAll('.tick line').attr('stroke', '#f43f5e');
      yStrainAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#f43f5e')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(90)')
        .attr('x', innerHeight / 2)
        .attr('y', -innerWidth - 48)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-rose-400 font-mono text-[11px] font-semibold')
        .text('PREDICTIVE STRAIN INDEX [ROSE CURVE] →');
    }

    // -------------------------------------------------------------
    // RENDER MODE 4: D3 24-HOUR DIURNAL PROFILE (TRAFFIC vs BLOCKS)
    // -------------------------------------------------------------
    else if (viewMode === 'DIURNAL') {
      const margin = { top: 35, right: 65, bottom: 50, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X Scale: 0 to 23 Hours
      const xScale = d3.scaleLinear().domain([0, 23]).range([0, innerWidth]);

      // Left Y Scale: Traffic Utilization (0% to 100%)
      const yUtilScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      // Right Y Scale: Block Volume per hour (0 to 12h)
      const rawMaxVol = d3.max(diurnalData, (d: { maintenanceVolumeHours: number }) => d.maintenanceVolumeHours);
      const maxVolHour = Math.max(10, typeof rawMaxVol === 'number' ? rawMaxVol : 8) + 1;
      const yVolScale = d3.scaleLinear().domain([0, maxVolHour]).range([innerHeight, 0]);

      // Highlight Night Golden Window Band (00:00 - 04:30)
      g.append('rect')
        .attr('x', xScale(0))
        .attr('y', 0)
        .attr('width', xScale(4.5) - xScale(0))
        .attr('height', innerHeight)
        .attr('fill', '#06b6d4')
        .attr('fill-opacity', 0.08)
        .attr('rx', 4);

      g.append('text')
        .attr('x', xScale(2.25))
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-cyan-300 font-mono text-[9px] font-bold')
        .text('NIGHT GOLDEN WINDOW (00:00-04:30)');

      // Highlight Midday Freight Gap (13:00 - 15:30)
      g.append('rect')
        .attr('x', xScale(13))
        .attr('y', 0)
        .attr('width', xScale(15.5) - xScale(13))
        .attr('height', innerHeight)
        .attr('fill', '#10b981')
        .attr('fill-opacity', 0.08)
        .attr('rx', 4);

      g.append('text')
        .attr('x', xScale(14.25))
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-emerald-300 font-mono text-[9px] font-bold')
        .text('MIDDAY GAP');

      // Grid
      const yGrid = d3.axisLeft(yUtilScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
      g.append('g')
        .call(yGrid)
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');

      // Traffic Utilization Area & Curve (Orange/Amber)
      const trafficArea = d3
        .area<(typeof diurnalData)[0]>()
        .x((d) => xScale(d.hour))
        .y0(innerHeight)
        .y1((d) => yUtilScale(d.trafficUtilization))
        .curve(d3.curveMonotoneX);

      const trafficLine = d3
        .line<(typeof diurnalData)[0]>()
        .x((d) => xScale(d.hour))
        .y((d) => yUtilScale(d.trafficUtilization))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(diurnalData)
        .attr('d', trafficArea)
        .attr('fill', '#f59e0b')
        .attr('fill-opacity', 0.14);

      g.append('path')
        .datum(diurnalData)
        .attr('d', trafficLine)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2.5);

      // Maintenance Volume Area & Curve (Cyan/Sky)
      const maintenanceArea = d3
        .area<(typeof diurnalData)[0]>()
        .x((d) => xScale(d.hour))
        .y0(innerHeight)
        .y1((d) => yVolScale(d.maintenanceVolumeHours))
        .curve(d3.curveBasis);

      const maintenanceLine = d3
        .line<(typeof diurnalData)[0]>()
        .x((d) => xScale(d.hour))
        .y((d) => yVolScale(d.maintenanceVolumeHours))
        .curve(d3.curveBasis);

      g.append('path')
        .datum(diurnalData)
        .attr('d', maintenanceArea)
        .attr('fill', '#38bdf8')
        .attr('fill-opacity', 0.22);

      g.append('path')
        .datum(diurnalData)
        .attr('d', maintenanceLine)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2.5);

      // Data Markers on peak hours
      diurnalData.forEach((d) => {
        if (d.hour === 2 || d.hour === 9 || d.hour === 14 || d.hour === 19) {
          // Traffic dot
          g.append('circle')
            .attr('cx', xScale(d.hour))
            .attr('cy', yUtilScale(d.trafficUtilization))
            .attr('r', 4.5)
            .attr('fill', '#f59e0b')
            .attr('stroke', '#0e172e')
            .attr('stroke-width', 1.5);

          // Maintenance dot
          g.append('circle')
            .attr('cx', xScale(d.hour))
            .attr('cy', yVolScale(d.maintenanceVolumeHours))
            .attr('r', 4.5)
            .attr('fill', '#38bdf8')
            .attr('stroke', '#0e172e')
            .attr('stroke-width', 1.5);
        }
      });

      // X Axis
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(12)
        .tickFormat((d) => `${d.toString().padStart(2, '0')}:00`);

      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.select('.domain').attr('stroke', '#334155');
      xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
      xAxisGroup
        .selectAll('.tick text')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-slate-300 font-mono text-xs font-semibold tracking-wide')
        .text('24-HOUR DIURNAL TIMELINE (HOURS) →');

      // Left Y Axis
      const yUtilAxis = d3
        .axisLeft(yUtilScale)
        .ticks(5)
        .tickFormat((d) => `${d}%`);
      const yUtilAxisGroup = g.append('g').call(yUtilAxis);
      yUtilAxisGroup.select('.domain').attr('stroke', '#334155');
      yUtilAxisGroup.selectAll('.tick text').attr('fill', '#f59e0b').attr('font-size', '10px').attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -42)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-amber-400 font-mono text-[10px] font-semibold')
        .text('← TRAFFIC UTILIZATION (%) [AMBER]');

      // Right Y Axis
      const yVolAxis = d3
        .axisRight(yVolScale)
        .ticks(5)
        .tickFormat((d) => `${d}h`);
      const yVolAxisGroup = g
        .append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yVolAxis);
      yVolAxisGroup.select('.domain').attr('stroke', '#38bdf8');
      yVolAxisGroup.selectAll('.tick text').attr('fill', '#38bdf8').attr('font-size', '10px').attr('font-family', 'monospace');

      g.append('text')
        .attr('transform', 'rotate(90)')
        .attr('x', innerHeight / 2)
        .attr('y', -innerWidth - 46)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-sky-400 font-mono text-[10px] font-semibold')
        .text('MAINTENANCE VOLUME (HRS) [SKY] →');
    }
  }, [
    telemetryData,
    viewMode,
    volumeUnit,
    selectedCorridorId,
    showBacklogTrend,
    diurnalData,
    predictive7DSeries,
    networkKpis.totalBlockHours,
  ]);

  return (
    <div
      id="network-health-summary-section"
      className="bg-[#0b1329] p-5 rounded-2xl border border-sky-950/90 shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Background radial atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 blur-3xl pointer-events-none" />

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
                D3.JS TELEMETRY ENGINE
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1.5 border ${
                  networkKpis.criticalStrainCorridorsCount > 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    networkKpis.criticalStrainCorridorsCount > 0
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                STATUS: {networkKpis.networkStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time cross-correlation of corridor operational utilization (%) versus maintenance block volume. Featuring a dotted trend-line representing the 7-day moving average of maintenance backlog to predict future corridor strain.
            </p>
          </div>
        </div>

        {/* Action & Mode Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center font-mono text-xs">
          {/* Live Telemetry Stream Toggle */}
          <button
            onClick={() => setIsLiveTelemetryActive(!isLiveTelemetryActive)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              isLiveTelemetryActive
                ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-sm shadow-emerald-950/40'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Live Telemetry Stream: simulates active sensor micro-fluctuations every 3.5s"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveTelemetryActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{isLiveTelemetryActive ? 'LIVE TELEMETRY ON' : 'TELEMETRY PAUSED'}</span>
          </button>

          {/* 7-Day Backlog MA Trend-Line Quick Toggle Button */}
          <button
            onClick={() => setShowBacklogTrend((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              showBacklogTrend
                ? 'bg-purple-950/90 border-purple-600/80 text-purple-200 shadow-sm shadow-purple-950/50'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 7-day moving average dotted trend-line of maintenance backlog"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${showBacklogTrend ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{showBacklogTrend ? '7D BACKLOG MA: ON' : '7D BACKLOG MA: OFF'}</span>
            <span
              className={`inline-block w-3 border-t-2 border-dashed ${
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

          {/* View Mode Switcher (Quadrant, Comparative, 7D Predictive, 24h Diurnal) */}
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

          {/* Stress-Test Simulation Drawer Toggle */}
          <button
            onClick={() => setShowStressControls(!showStressControls)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showStressControls || utilizationSurgePct !== 0 || blockVolumeSurgeDelta !== 0
                ? 'bg-amber-950/80 border-amber-600/70 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
            title="Simulate Traffic Surge & Maintenance Volume Shock Scenarios"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Stress Simulator</span>
            {(utilizationSurgePct !== 0 || blockVolumeSurgeDelta !== 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STRESS TEST & SCENARIO SIMULATION DRAWER                      */}
      {/* ------------------------------------------------------------- */}
      {showStressControls && (
        <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-800/60 shadow-lg space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-300 uppercase tracking-wide">
                Network Health Stress-Testing Sandbox
              </span>
              <span className="text-[10px] text-slate-400">
                (Simulate real-time traffic surge or heavy maintenance blitz to observe dynamic 7-day backlog MA and predicted strain impact)
              </span>
            </div>
            <button
              onClick={() => {
                setUtilizationSurgePct(0);
                setBlockVolumeSurgeDelta(0);
              }}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Baseline</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Slider 1: Traffic Utilization Surge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Train className="w-3.5 h-3.5 text-sky-400" />
                  <span>Traffic Utilization Shift:</span>
                </span>
                <span className={`font-bold font-mono ${utilizationSurgePct >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {utilizationSurgePct >= 0 ? `+${utilizationSurgePct}%` : `${utilizationSurgePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="1"
                value={utilizationSurgePct}
                onChange={(e) => setUtilizationSurgePct(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-15% (Off-Peak Relief)</span>
                <span>0% (Live Baseline)</span>
                <span>+15% (Festival/Peak Rush)</span>
              </div>
            </div>

            {/* Slider 2: Maintenance Block Volume Shift */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  <span>Maintenance Block Volume Delta:</span>
                </span>
                <span className={`font-bold font-mono ${blockVolumeSurgeDelta >= 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {blockVolumeSurgeDelta >= 0 ? `+${blockVolumeSurgeDelta}h` : `${blockVolumeSurgeDelta}h`}
                </span>
              </div>
              <input
                type="range"
                min="-4"
                max="8"
                step="0.5"
                value={blockVolumeSurgeDelta}
                onChange={(e) => setBlockVolumeSurgeDelta(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-4.0h (Deferred Maintenance)</span>
                <span>0.0h (Scheduled Plan)</span>
                <span>+8.0h (Heavy Track Renewal Blitz)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4 HIGH-IMPACT KPI TILES INCLUDING 7-DAY BACKLOG MA METRICS    */}
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
            <TrendingUp className="w-3 h-3" />
            <span>Optimal balance</span>
            <span className="text-slate-500">across 4 lines</span>
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

        {/* KPI Tile 3: 7-Day Backlog Moving Average & Predictive Strain */}
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

        {/* KPI Tile 4: Peak Strained Corridor & Future Strain Projection */}
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
              {networkKpis.peakStrainedCorridor?.code || 'NDLS-ROK'} Proj: {networkKpis.peakStrainedCorridor?.predictedFutureStrain}/100
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN D3 VISUALIZATION CANVAS                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl bg-[#090f22] border border-sky-950/90 relative overflow-hidden">
        {/* Sub-header info banner inside chart */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold uppercase">
              {viewMode === 'QUADRANT' && 'D3 QUADRANT MATRIX: UTILIZATION VS BLOCK VOLUME WITH 7D SHIFT VECTORS'}
              {viewMode === 'COMPARATIVE' && 'D3 DUAL-AXIS TELEMETRY: UTILIZATION BARS, VOLUME CURVE & 7-DAY MA BACKLOG DOTTED TREND'}
              {viewMode === 'PREDICTIVE_7D' && 'D3 7-DAY PREDICTIVE STRAIN TIMELINE: 7-DAY MA BACKLOG DOTTED TREND VS FUTURE CORRIDOR STRAIN'}
              {viewMode === 'DIURNAL' && 'D3 24-HOUR DIURNAL PROFILE: TRAFFIC THROUGHPUT VS MAINTENANCE TIMING'}
            </span>
            <span className="text-[10px] text-slate-500">
              (Click any node or bar to inspect telemetry)
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

        {/* D3 SVG Container */}
        <div ref={containerRef} className="w-full relative overflow-x-auto">
          <svg ref={svgRef} className="mx-auto block" />

          {/* D3 Floating Interactive Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none transition-opacity duration-150 opacity-0 bg-[#070e1e]/95 backdrop-blur-md p-3.5 rounded-lg border border-purple-500/80 shadow-2xl text-xs font-mono min-w-[260px] z-30"
          >
            <div className="font-bold text-white text-xs pb-1.5 mb-1.5 border-b border-slate-800 flex items-center justify-between">
              <span>{activeCorridor?.name || 'Corridor Telemetry'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {activeCorridor?.id}
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Live Utilization:</span>
                <span className="font-bold text-sky-400">{activeCorridor?.utilization}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Volume:</span>
                <span className="font-bold text-cyan-400">
                  {activeCorridor?.totalBlockHours}h ({activeCorridor?.scheduledBlocks} blocks)
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1 text-purple-300">
                <span className="text-purple-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>7-Day Backlog MA:</span>
                </span>
                <span className="font-bold text-purple-300">{activeCorridor?.backlog7DayMA}h / day</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span className="text-slate-400">Predicted Future Strain:</span>
                <span className="font-bold text-rose-400">{activeCorridor?.predictedFutureStrain} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Backlog Velocity:</span>
                <span className="text-amber-400">
                  {activeCorridor?.strainDeltaPct && activeCorridor.strainDeltaPct >= 0 ? '+' : ''}
                  {activeCorridor?.strainDeltaPct}% 7d escalation
                </span>
              </div>
              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 leading-snug">
                {activeCorridor?.backlogRecommendation}
              </div>
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

          {/* Predictive Backlog & Corridor Strain Advisory Callout */}
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/70 flex items-start gap-2.5 text-xs text-purple-200">
            <TrendingUp className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-purple-300">
                PREDICTIVE 7-DAY CORRIDOR STRAIN ADVISORY ({activeCorridor.id}):
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {activeCorridor.backlogRecommendation}
              </p>
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
