import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  HardHat,
  Filter,
  Activity,
  ArrowUpRight,
  RotateCcw,
  Zap,
  Download,
  FileText,
  Eye,
  EyeOff,
  Flame,
  Grid,
  MapPin,
  Target,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import {
  Corridor,
  DailyForecastPoint,
  ForecastHorizonDays,
  ForecastScenarioType,
  DeficitAlertThresholdSettings,
  DEFAULT_DEFICIT_ALERT_SETTINGS,
} from '../../types';
import { resourceForecastService } from '../../services/resourceForecastService';
import {
  corridorSegmentHeatmapService,
  CorridorSegment,
  SegmentDailyIntensity,
  PeakDemandCluster,
} from '../../services/corridorSegmentHeatmapService';
import {
  predictiveLinearRegressionService,
  PredictiveLinearRegressionResult,
  PredictiveTrendPoint,
} from '../../services/predictiveLinearRegressionService';
import {
  predictiveAlertsService,
  PredictiveCapacityAlert,
  PredictiveAlertsSummary,
} from '../../services/predictiveAlertsService';
import { downloadCapacityAnalysisPdf } from '../../services/capacityAnalysisPdfService';
import { ForecastDayDetailSidePanel } from './ForecastDayDetailSidePanel';
import { DailyResourceStrainHeatmap } from './DailyResourceStrainHeatmap';

interface ForecastedManpowerD3ChartProps {
  corridors: Corridor[];
  selectedCorridorId?: string | null;
  onSelectCorridor?: (corridorId: string) => void;
  onSelectShiftDay?: (dayNumber: number, dateStr: string) => void;
  onMobilizeReserveGang?: (count: number) => void;
  onOpenThresholdModal?: () => void;
  onExportCsv?: () => void;
  thresholdSettings?: DeficitAlertThresholdSettings;
  onOpenManualAdjustment?: (dayNumber?: number) => void;
  overrideCount?: number;
  showPredictiveTrendLine?: boolean;
  onTogglePredictiveTrendLine?: (show: boolean) => void;
  enableAiPredictiveAlerts?: boolean;
  onToggleAiPredictiveAlerts?: (enable: boolean) => void;
  onDownloadCapacityAnalysisPdf?: () => void;
}

export const ForecastedManpowerD3Chart: React.FC<ForecastedManpowerD3ChartProps> = ({
  corridors,
  selectedCorridorId,
  onSelectCorridor,
  onSelectShiftDay,
  onMobilizeReserveGang,
  onOpenThresholdModal,
  onExportCsv,
  thresholdSettings = DEFAULT_DEFICIT_ALERT_SETTINGS,
  onOpenManualAdjustment,
  overrideCount = 0,
  showPredictiveTrendLine,
  onTogglePredictiveTrendLine,
  enableAiPredictiveAlerts,
  onToggleAiPredictiveAlerts,
  onDownloadCapacityAnalysisPdf,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // User Interactive Controls
  const [scenario, setScenario] = useState<ForecastScenarioType>('BASELINE');
  const [horizon, setHorizon] = useState<ForecastHorizonDays>(30);
  const [corridorFilter, setCorridorFilter] = useState<string>(selectedCorridorId || 'ALL');
  const [showTradeBreakdown, setShowTradeBreakdown] = useState<boolean>(false);
  const [showWarningBuffer, setShowWarningBuffer] = useState<boolean>(true);
  const [showCapacityBaseline, setShowCapacityBaseline] = useState<boolean>(true);
  const [showComparePeriods, setShowComparePeriods] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<DailyForecastPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DailyForecastPoint | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  // Heatmap Layer Interactive State
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(true);
  const [heatmapMetric, setHeatmapMetric] = useState<'COMBINED' | 'MANPOWER' | 'MACHINERY'>('COMBINED');
  const [highlightClustersOnly, setHighlightClustersOnly] = useState<boolean>(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [hoveredSegmentCell, setHoveredSegmentCell] = useState<SegmentDailyIntensity | null>(null);

  // Predictive Linear Regression Trend Line Interactive State (Based on Historical Maintenance Cycles)
  const [internalShowPredictiveTrendLine, setInternalShowPredictiveTrendLine] = useState<boolean>(false);
  const effectiveShowTrendLine =
    showPredictiveTrendLine !== undefined ? showPredictiveTrendLine : internalShowPredictiveTrendLine;

  const handleToggleTrendLine = () => {
    const nextVal = !effectiveShowTrendLine;
    setInternalShowPredictiveTrendLine(nextVal);
    if (onTogglePredictiveTrendLine) {
      onTogglePredictiveTrendLine(nextVal);
    }
  };

  // AI Predictive Alerts Interactive State (>90% Sectional Capacity Highlight & Conflict Driver)
  const [internalEnableAiPredictiveAlerts, setInternalEnableAiPredictiveAlerts] = useState<boolean>(true);
  const effectiveEnableAiAlerts =
    enableAiPredictiveAlerts !== undefined ? enableAiPredictiveAlerts : internalEnableAiPredictiveAlerts;

  const handleToggleAiAlerts = () => {
    const nextVal = !effectiveEnableAiAlerts;
    setInternalEnableAiPredictiveAlerts(nextVal);
    if (onToggleAiPredictiveAlerts) {
      onToggleAiPredictiveAlerts(nextVal);
    }
  };

  // Sync internal corridorFilter if selectedCorridorId changes from parent
  useEffect(() => {
    if (selectedCorridorId) {
      setCorridorFilter(selectedCorridorId);
    }
  }, [selectedCorridorId]);

  // Compute Forecast Data
  const forecastData = useMemo(() => {
    const res = resourceForecastService.computeForecast(scenario, horizon, corridorFilter);
    return res.dailyForecast;
  }, [scenario, horizon, corridorFilter]);

  // Compute Predictive Linear Regression Trend Line based on Historical Maintenance Cycles
  const regressionResult = useMemo(() => {
    return predictiveLinearRegressionService.computeLinearRegression(forecastData, corridorFilter);
  }, [forecastData, corridorFilter]);

  // Compute Corridor Segment Daily Resource Intensity Matrix & Peak Clusters
  const segmentHeatmapData = useMemo(() => {
    return corridorSegmentHeatmapService.computeSegmentDailyIntensityMatrix(
      forecastData,
      scenario,
      corridorFilter,
      thresholdSettings
    );
  }, [forecastData, scenario, corridorFilter, thresholdSettings]);

  // Compute AI Predictive Alerts (>90% Sectional Capacity Highlight & Conflict Drivers)
  const predictiveAlertsResult = useMemo(() => {
    return predictiveAlertsService.evaluatePredictiveAlerts(
      forecastData,
      corridorFilter,
      corridors,
      thresholdSettings
    );
  }, [forecastData, corridorFilter, corridors, thresholdSettings]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!forecastData || forecastData.length === 0) {
      return {
        totalDays: 0,
        deficitDaysCount: 0,
        peakDeficit: 0,
        peakDeficitDay: null as DailyForecastPoint | null,
        averageDemand: 0,
        maxDemand: 0,
        capacityBase: 0,
        totalShortfallManDays: 0,
      };
    }

    let deficitCount = 0;
    let peakDef = 0;
    let peakDay: DailyForecastPoint | null = null;
    let sumDemand = 0;
    let maxDem = 0;
    let sumShortfall = 0;
    const baseCap = forecastData[0]?.manpowerAvailable || 0;

    forecastData.forEach((pt) => {
      sumDemand += pt.manpowerRequired;
      if (pt.manpowerRequired > maxDem) {
        maxDem = pt.manpowerRequired;
      }
      const def = Math.max(0, pt.manpowerRequired - pt.manpowerAvailable);
      if (def > 0) {
        deficitCount++;
        sumShortfall += def;
        if (def > peakDef) {
          peakDef = def;
          peakDay = pt;
        }
      }
    });

    return {
      totalDays: forecastData.length,
      deficitDaysCount: deficitCount,
      peakDeficit: peakDef,
      peakDeficitDay: peakDay,
      averageDemand: Math.round(sumDemand / forecastData.length),
      maxDemand: maxDem,
      capacityBase: baseCap,
      totalShortfallManDays: sumShortfall,
    };
  }, [forecastData]);

  // Cyclical Seasonality Metrics (Current 30-Day vs Previous Month / Late Monsoon)
  const seasonalityMetrics = useMemo(() => {
    if (!forecastData || forecastData.length === 0) {
      return {
        avgPrevDemand: 0,
        avgCurrDemand: 0,
        totalPrevDemand: 0,
        totalCurrDemand: 0,
        netVariancePct: 0,
        peakSurgeDay: null as DailyForecastPoint | null,
        maxSurgeVariancePct: 0,
        dominantDriver: 'Late-Monsoon Drainage & Wet-Ground Stabilization',
      };
    }

    let sumPrev = 0;
    let sumCurr = 0;
    let maxVar = -Infinity;
    let surgePoint: DailyForecastPoint | null = null;

    forecastData.forEach((pt) => {
      const prev = pt.previousPeriodManpowerRequired || pt.manpowerRequired;
      sumPrev += prev;
      sumCurr += pt.manpowerRequired;

      const variance =
        pt.seasonalityVariancePct !== undefined
          ? pt.seasonalityVariancePct
          : Math.round(((pt.manpowerRequired - prev) / prev) * 100);

      if (variance > maxVar) {
        maxVar = variance;
        surgePoint = pt;
      }
    });

    const avgPrev = Math.round(sumPrev / forecastData.length);
    const avgCurr = Math.round(sumCurr / forecastData.length);
    const netVariance = sumPrev > 0 ? Math.round(((sumCurr - sumPrev) / sumPrev) * 100) : 0;

    return {
      avgPrevDemand: avgPrev,
      avgCurrDemand: avgCurr,
      totalPrevDemand: sumPrev,
      totalCurrDemand: sumCurr,
      netVariancePct: netVariance,
      peakSurgeDay: surgePoint,
      maxSurgeVariancePct: maxVar,
      dominantDriver: 'Post-Monsoon Track Tamping & USFD Fatigue Flaw Rectification',
    };
  }, [forecastData]);

  // Export CSV handler
  const handleInternalExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    const fullForecast = resourceForecastService.computeForecast(scenario, horizon, corridorFilter);
    const csvContent = resourceForecastService.exportForecastCsv(fullForecast);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `IR_Forecast_${corridorFilter}_${horizon}D_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render D3 Line Chart & Synchronized Corridor Segment Heatmap Layer
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !forecastData || forecastData.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const containerWidth = containerRef.current.clientWidth || 900;
    const width = Math.max(720, containerWidth);

    const activeSegments = segmentHeatmapData.segments;
    const heatmapRowsCount = activeSegments.length;
    const cellHeight = Math.max(18, Math.min(24, Math.floor(180 / Math.max(1, heatmapRowsCount))));
    const rowGap = 4;
    const heatmapContentHeight = showHeatmapLayer ? heatmapRowsCount * (cellHeight + rowGap) : 0;
    const lineChartHeight = showHeatmapLayer ? 210 : 280;
    const separatorHeight = showHeatmapLayer ? 38 : 0;

    const margin = showHeatmapLayer
      ? { top: 25, right: 35, bottom: 42, left: 165 }
      : { top: 30, right: 35, bottom: 50, left: 55 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = lineChartHeight + separatorHeight + heatmapContentHeight;
    const totalHeight = margin.top + innerHeight + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${totalHeight}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Days 1 to horizon)
    const xScale = d3
      .scaleLinear()
      .domain([1, horizon])
      .range([0, innerWidth]);

    // Y Scale (Manpower headcount) - Zooms dynamically to max demand when baseline is hidden, includes comparison period if active, and accommodates regression trend line
    const maxVal: number =
      d3.max(forecastData, (d: DailyForecastPoint) => {
        const vals = [d.manpowerRequired];
        if (showCapacityBaseline) vals.push(d.manpowerAvailable);
        if (showComparePeriods && d.previousPeriodManpowerRequired) vals.push(d.previousPeriodManpowerRequired);
        return Math.max(...vals);
      }) ?? 180;
    const trendMax: number = effectiveShowTrendLine
      ? (d3.max(regressionResult.points, (p: PredictiveTrendPoint) => p.upperConfidence95) ?? 0)
      : 0;
    const peakMax: number = Math.max(Number(maxVal), Number(trendMax));
    const yMax = Math.ceil((peakMax * 1.15) / 10) * 10;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([lineChartHeight, 0])
      .nice();

    // Deficit Threshold lines
    const warnPct = thresholdSettings.manpowerWarningThresholdPct;
    const critPct = thresholdSettings.manpowerCriticalThresholdPct;

    // --- GRID LINES ---
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid grid-y text-slate-800')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '3,3');

    // Remove unneeded domain path
    g.selectAll('.grid .domain').remove();

    // --- GRADIENT DEFINITIONS ---
    const defs = svg.append('defs');

    // Deficit Zone Gradient (Red/Rose)
    const deficitGradient = defs
      .append('linearGradient')
      .attr('id', 'deficitAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    deficitGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.55);
    deficitGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ef4444').attr('stop-opacity', 0.08);

    // Surplus Safe Zone Gradient (Emerald/Sky)
    const surplusGradient = defs
      .append('linearGradient')
      .attr('id', 'surplusAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    surplusGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0ea5e9').attr('stop-opacity', 0.25);
    surplusGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0ea5e9').attr('stop-opacity', 0.02);

    // Predictive Trend Line 95% Confidence Band Gradient (Indigo/Violet)
    const trendBandGrad = defs
      .append('linearGradient')
      .attr('id', 'trendBandGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    trendBandGrad.append('stop').attr('offset', '0%').attr('stop-color', '#818cf8').attr('stop-opacity', 0.24);
    trendBandGrad.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.05);

    // Demand Line Glow Filter
    const glowFilter = defs.append('filter').attr('id', 'demandGlow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Peak Cluster Glow Filter
    const clusterGlow = defs.append('filter').attr('id', 'clusterGlow').attr('x', '-25%').attr('y', '-25%').attr('width', '150%').attr('height', '150%');
    clusterGlow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'glow');
    const clusterMerge = clusterGlow.append('feMerge');
    clusterMerge.append('feMergeNode').attr('in', 'glow');
    clusterMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Predictive Trend Line Glow Filter
    const trendGlow = defs
      .append('filter')
      .attr('id', 'trendGlow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    trendGlow.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const trendFeMerge = trendGlow.append('feMerge');
    trendFeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    trendFeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // --- DEFICIT / SURPLUS HIGHLIGHT AREA OR PURE DEMAND FILL ---
    if (showCapacityBaseline) {
      // Deficit polygon / area where demand exceeds capacity
      const deficitArea = d3
        .area<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y0((d) => yScale(d.manpowerAvailable))
        .y1((d) => yScale(Math.max(d.manpowerAvailable, d.manpowerRequired)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'area-deficit')
        .attr('fill', 'url(#deficitAreaGrad)')
        .attr('d', deficitArea);

      // Safe / Surplus Area where capacity exceeds demand
      const surplusArea = d3
        .area<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y0((d) => yScale(d.manpowerRequired))
        .y1((d) => yScale(Math.min(d.manpowerRequired, d.manpowerAvailable)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'area-surplus')
        .attr('fill', 'url(#surplusAreaGrad)')
        .attr('d', surplusArea);
    } else {
      // Pure Demand Fill when capacity baseline is hidden to isolate the demand trajectory
      const pureDemandArea = d3
        .area<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y0(lineChartHeight)
        .y1((d) => yScale(d.manpowerRequired))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'area-pure-demand')
        .attr('fill', 'url(#surplusAreaGrad)')
        .attr('opacity', 0.6)
        .attr('d', pureDemandArea);
    }

    // --- WARNING BUFFER BAND (OPTIONAL - ONLY WHEN BASELINE IS VISIBLE) ---
    if (showWarningBuffer && showCapacityBaseline && forecastData[0]) {
      const baseCap = forecastData[0].manpowerAvailable;
      const warnCap = baseCap * (1 + warnPct / 100);
      const critCap = baseCap * (1 + critPct / 100);

      // Warning threshold line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(warnCap))
        .attr('y2', yScale(warnCap))
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yScale(warnCap) - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#f59e0b')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('opacity', 0.8)
        .text(`Warning Deficit (+${warnPct}%)`);

      // Critical threshold line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(critCap))
        .attr('y2', yScale(critCap))
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '2,3')
        .attr('opacity', 0.75);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yScale(critCap) - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#f43f5e')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('opacity', 0.85)
        .text(`Critical Threshold (+${critPct}%)`);
    }

    // --- CURRENT STAFFING / AVAILABLE CAPACITY BASELINE LINE (Green dashed) ---
    if (showCapacityBaseline) {
      const capacityLine = d3
        .line<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y((d) => yScale(d.manpowerAvailable))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'line-capacity')
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,4')
        .attr('d', capacityLine);
    }

    // --- FORECASTED MANPOWER DEMAND LINE (Cyan / Amber with glow) ---
    const demandLine = d3
      .line<DailyForecastPoint>()
      .x((d) => xScale(d.dayNumber))
      .y((d) => yScale(d.manpowerRequired))
      .curve(d3.curveMonotoneX);

    // Glow background
    g.append('path')
      .datum(forecastData)
      .attr('class', 'line-demand-glow')
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.4)
      .attr('filter', 'url(#demandGlow)')
      .attr('d', demandLine);

    // Main demand line
    g.append('path')
      .datum(forecastData)
      .attr('class', 'line-demand')
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('d', demandLine);

    // --- PREVIOUS PERIOD / CYCLICAL SEASONALITY OVERLAY (Violet / Purple dashed line) ---
    if (showComparePeriods) {
      // Subtle purple fill for cyclical benchmark
      const prevArea = d3
        .area<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y0(lineChartHeight)
        .y1((d) => yScale(d.previousPeriodManpowerRequired || d.manpowerRequired))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'area-prev-period')
        .attr('fill', '#a855f7')
        .attr('fill-opacity', 0.08)
        .attr('d', prevArea);

      // Previous period demand line
      const prevLine = d3
        .line<DailyForecastPoint>()
        .x((d) => xScale(d.dayNumber))
        .y((d) => yScale(d.previousPeriodManpowerRequired || d.manpowerRequired))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(forecastData)
        .attr('class', 'line-prev-period')
        .attr('fill', 'none')
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 2.2)
        .attr('stroke-dasharray', '5,3')
        .attr('stroke-opacity', 0.9)
        .attr('d', prevLine);

      // Previous month point nodes
      forecastData.forEach((point) => {
        if (point.previousPeriodManpowerRequired) {
          const cx = xScale(point.dayNumber);
          const cy = yScale(point.previousPeriodManpowerRequired);
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 3)
            .attr('fill', '#c084fc')
            .attr('stroke', '#581c87')
            .attr('stroke-width', 1)
            .attr('opacity', 0.9);
        }
      });
    }

    // --- PREDICTIVE LINEAR REGRESSION TREND LINE & 95% PREDICTION INTERVAL (HISTORICAL CYCLES MODEL) ---
    if (effectiveShowTrendLine && regressionResult.points.length > 0) {
      // 1. Prediction Interval Band (95% Confidence)
      const confidenceArea = d3
        .area<PredictiveTrendPoint>()
        .x((d) => xScale(d.dayNumber))
        .y0((d) => yScale(d.lowerConfidence95))
        .y1((d) => yScale(d.upperConfidence95))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(regressionResult.points)
        .attr('class', 'area-trend-confidence-band')
        .attr('fill', 'url(#trendBandGrad)')
        .attr('d', confidenceArea);

      // Prediction interval dashed boundary lines
      const upperConfLine = d3
        .line<PredictiveTrendPoint>()
        .x((d) => xScale(d.dayNumber))
        .y((d) => yScale(d.upperConfidence95))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(regressionResult.points)
        .attr('class', 'line-upper-confidence')
        .attr('fill', 'none')
        .attr('stroke', '#a5b4fc')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-opacity', 0.55)
        .attr('d', upperConfLine);

      const lowerConfLine = d3
        .line<PredictiveTrendPoint>()
        .x((d) => xScale(d.dayNumber))
        .y((d) => yScale(d.lowerConfidence95))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(regressionResult.points)
        .attr('class', 'line-lower-confidence')
        .attr('fill', 'none')
        .attr('stroke', '#a5b4fc')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-opacity', 0.55)
        .attr('d', lowerConfLine);

      // 2. Linear Regression Trend Line (Glow + Dashed Stroke)
      const trendLine = d3
        .line<PredictiveTrendPoint>()
        .x((d) => xScale(d.dayNumber))
        .y((d) => yScale(d.trendDemandRaw))
        .curve(d3.curveLinear);

      // Glow layer
      g.append('path')
        .datum(regressionResult.points)
        .attr('class', 'line-trend-glow')
        .attr('fill', 'none')
        .attr('stroke', '#818cf8')
        .attr('stroke-width', 3.5)
        .attr('stroke-opacity', 0.45)
        .attr('filter', 'url(#trendGlow)')
        .attr('d', trendLine);

      // Main dashed trend line
      g.append('path')
        .datum(regressionResult.points)
        .attr('class', 'line-predictive-trend')
        .attr('fill', 'none')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 2.8)
        .attr('stroke-dasharray', '7,3')
        .attr('d', trendLine);

      // Terminal end badge on the rightmost data point
      const lastPt = regressionResult.points[regressionResult.points.length - 1];
      if (lastPt) {
        const badgeX = xScale(lastPt.dayNumber);
        const badgeY = yScale(lastPt.trendDemandRaw);

        g.append('circle')
          .attr('cx', badgeX)
          .attr('cy', badgeY)
          .attr('r', 5)
          .attr('fill', '#818cf8')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        const badgeGroup = g
          .append('g')
          .attr('class', 'trend-badge-group')
          .attr('transform', `translate(${Math.max(90, badgeX - 8)}, ${Math.max(16, badgeY - 14)})`);

        badgeGroup
          .append('rect')
          .attr('x', -95)
          .attr('y', -10)
          .attr('width', 104)
          .attr('height', 20)
          .attr('rx', 4)
          .attr('fill', '#1e1b4b')
          .attr('stroke', '#818cf8')
          .attr('stroke-width', 1.2)
          .attr('opacity', 0.96);

        badgeGroup
          .append('text')
          .attr('x', -43)
          .attr('y', 3)
          .attr('text-anchor', 'middle')
          .attr('fill', '#e0e7ff')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`OLS: ${lastPt.trendDemand} (${regressionResult.slope >= 0 ? '+' : ''}${regressionResult.slope}/d)`);
      }
    }

    // --- AI PREDICTIVE ALERTS: DYNAMICALLY HIGHLIGHT DATES WHERE DEMAND EXCEEDS 90% OF SECTIONAL CAPACITY ---
    if (effectiveEnableAiAlerts && predictiveAlertsResult.alerts.length > 0) {
      const colWidth = Math.max(14, innerWidth / horizon);

      predictiveAlertsResult.alerts.forEach((alt) => {
        if (alt.isCapacityStrainExceeded90 && alt.dayNumber <= horizon) {
          const cx = xScale(alt.dayNumber);
          const bandX = cx - colWidth / 2;
          const isMach = alt.primaryConflictDriver === 'Machinery Contention';

          const alertColGroup = g.append('g').attr('class', `ai-alert-col-group day-${alt.dayNumber}`);

          // Vertical Alert Highlight Column
          alertColGroup
            .append('rect')
            .attr('x', bandX)
            .attr('y', 0)
            .attr('width', colWidth)
            .attr('height', lineChartHeight)
            .attr('fill', isMach ? '#f59e0b' : '#f43f5e')
            .attr('fill-opacity', 0.12)
            .attr('stroke', isMach ? '#d97706' : '#e11d48')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,2')
            .attr('stroke-opacity', 0.65)
            .attr('rx', 2);

          // Top Badge Tag on the highlight column
          const tagGroup = alertColGroup
            .append('g')
            .attr('transform', `translate(${cx}, 10)`);

          tagGroup
            .append('rect')
            .attr('x', -26)
            .attr('y', -7)
            .attr('width', 52)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', isMach ? '#451a03' : '#4c0519')
            .attr('stroke', isMach ? '#f59e0b' : '#fb7185')
            .attr('stroke-width', 0.9)
            .attr('opacity', 0.95);

          tagGroup
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 3)
            .attr('fill', isMach ? '#fef08a' : '#ffe4e6')
            .attr('font-size', '7.5px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(`>90% ${isMach ? 'MACH' : 'GANG'}`);
        }
      });
    }

    // --- DEFICIT SPIKE MARKERS & CLICKABLE DATA POINTS ---
    forecastData.forEach((point) => {
      const isDeficit = point.manpowerRequired > point.manpowerAvailable;
      const deficit = point.manpowerRequired - point.manpowerAvailable;
      const cx = xScale(point.dayNumber);
      const cyDemand = yScale(point.manpowerRequired);
      const isSelected = selectedPoint?.dayNumber === point.dayNumber;

      // Active selection beacon ring
      if (isSelected) {
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cyDemand)
          .attr('r', 11)
          .attr('fill', 'none')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3');
      }

      // AI Predictive Alert beacon ring (>90% Sectional Capacity Strain)
      if (effectiveEnableAiAlerts) {
        const alertInfo = predictiveAlertsResult.alerts.find((a) => a.dayNumber === point.dayNumber);
        if (alertInfo && alertInfo.isCapacityStrainExceeded90) {
          const isMach = alertInfo.primaryConflictDriver === 'Machinery Contention';
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cyDemand)
            .attr('r', 13)
            .attr('fill', 'none')
            .attr('stroke', isMach ? '#f59e0b' : '#f43f5e')
            .attr('stroke-width', 1.8)
            .attr('stroke-dasharray', '2,2')
            .attr('opacity', 0.85);
        }
      }

      // Manual Override Beacon Ring
      if (point.isManualOverride) {
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cyDemand)
          .attr('r', 9)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '2,2')
          .attr('title', 'Manual Planner Override Active');
      }

      if (isDeficit) {
        // Red warning beacon circle
        const isSevere = deficit >= (thresholdSettings?.manpowerCriticalThresholdPct || 15);
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cyDemand)
          .attr('r', isSevere ? 6.5 : 5)
          .attr('fill', '#ef4444')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('class', 'cursor-pointer transition-all hover:scale-150 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]')
          .on('click', () => {
            setSelectedPoint(point);
            setIsSidePanelOpen(true);
            if (onSelectShiftDay) {
              onSelectShiftDay(point.dayNumber, point.date);
            }
          });

        if (isSevere) {
          // Pulsing halo circle
          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cyDemand)
            .attr('r', 11)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 1.2)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-dasharray', '2,2');
        }
      } else {
        // Interactive balanced data point dot
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cyDemand)
          .attr('r', isSelected ? 5.5 : 3.5)
          .attr('fill', '#38bdf8')
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1.2)
          .attr('class', 'cursor-pointer transition-all hover:scale-150 hover:fill-sky-200')
          .on('click', () => {
            setSelectedPoint(point);
            setIsSidePanelOpen(true);
            if (onSelectShiftDay) {
              onSelectShiftDay(point.dayNumber, point.date);
            }
          });
      }

      // Invisible hit area for effortless clicking on touch and mouse
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cyDemand)
        .attr('r', 14)
        .attr('fill', 'transparent')
        .attr('class', 'cursor-pointer')
        .on('click', () => {
          setSelectedPoint(point);
          setIsSidePanelOpen(true);
          if (onSelectShiftDay) {
            onSelectShiftDay(point.dayNumber, point.date);
          }
        });
    });

    // --- Y AXIS (Headcount) ---
    const yAxis = d3.axisLeft(yScale).ticks(5);

    const yAxisGroup = g
      .append('g')
      .attr('class', 'y-axis text-slate-400 font-mono text-[11px]')
      .call(yAxis);

    yAxisGroup.selectAll('text').attr('fill', '#94a3b8');
    yAxisGroup.selectAll('line').attr('stroke', '#334155');
    yAxisGroup.select('.domain').attr('stroke', '#334155');

    // Y Axis Title
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -38)
      .attr('x', -lineChartHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text('Headcount');

    // --- X AXIS FOR LINE CHART BASELINE ---
    const xAxisLineChart = d3
      .axisBottom(xScale)
      .ticks(Math.min(15, horizon))
      .tickFormat((d) => {
        const pt = forecastData.find((p) => p.dayNumber === Number(d));
        return pt ? `${pt.displayDate}` : `D${d}`;
      });

    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis text-slate-400 font-mono text-[10px]')
      .attr('transform', `translate(0,${lineChartHeight})`)
      .call(xAxisLineChart);

    xAxisGroup.selectAll('text').attr('dy', '1em').attr('fill', showHeatmapLayer ? '#64748b' : '#94a3b8');
    xAxisGroup.selectAll('line').attr('stroke', '#334155');
    xAxisGroup.select('.domain').attr('stroke', '#334155');

    // --- HEATMAP LAYER: CORRIDOR SEGMENTS DAILY RESOURCE CONSUMPTION INTENSITY ---
    if (showHeatmapLayer) {
      const heatmapTop = lineChartHeight + separatorHeight;

      // --- SEPARATOR SECTION BANNER ---
      const separatorGroup = g
        .append('g')
        .attr('class', 'heatmap-separator-group')
        .attr('transform', `translate(0,${lineChartHeight + 14})`);

      // Subtle Divider Line
      separatorGroup
        .append('line')
        .attr('x1', -margin.left + 15)
        .attr('x2', innerWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

      // Section Title & Badges
      separatorGroup
        .append('text')
        .attr('x', -margin.left + 15)
        .attr('y', 15)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text('CORRIDOR SEGMENTS DAILY RESOURCE INTENSITY (HEATMAP LAYER)');

      // In-chart intensity legend labels
      const legendGroup = separatorGroup
        .append('g')
        .attr('transform', `translate(${innerWidth}, 15)`)
        .attr('text-anchor', 'end')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace');

      legendGroup
        .append('text')
        .attr('fill', '#94a3b8')
        .text('Intensity: ')
        .append('tspan')
        .attr('fill', '#10b981')
        .text('■ Safe (<45%) ')
        .append('tspan')
        .attr('fill', '#2dd4bf')
        .text('■ Mod (45-67%) ')
        .append('tspan')
        .attr('fill', '#fb923c')
        .text('■ Elev (68-84%) ')
        .append('tspan')
        .attr('fill', '#f43f5e')
        .attr('font-weight', 'bold')
        .text('■ Peak Cluster (≥85%)');

      // --- HEATMAP MATRIX ROWS ---
      const heatmapGroup = g
        .append('g')
        .attr('class', 'heatmap-matrix-group')
        .attr('transform', `translate(0,${heatmapTop})`);

      const cellWidth = innerWidth / horizon;

      activeSegments.forEach((seg, sIdx) => {
        const rowY = sIdx * (cellHeight + rowGap);
        const isSelectedSeg = selectedSegmentId === seg.id;
        const segItems = segmentHeatmapData.matrix.filter((m) => m.segmentId === seg.id);
        const hasPeakClusterInHorizon = segItems.some(
          (m) => m.dayNumber <= horizon && (m.isPeakCluster || m.intensityPct >= 85)
        );

        // Row background highlight
        heatmapGroup
          .append('rect')
          .attr('x', -margin.left + 15)
          .attr('y', rowY)
          .attr('width', innerWidth + margin.left - 15)
          .attr('height', cellHeight)
          .attr('rx', 3)
          .attr('fill', isSelectedSeg ? '#1e293b' : sIdx % 2 === 0 ? '#0b1329' : 'transparent')
          .attr('fill-opacity', 0.6)
          .attr('cursor', 'pointer')
          .on('click', () => {
            setSelectedSegmentId((prev) => (prev === seg.id ? null : seg.id));
          });

        // Segment Label Group on Left
        const labelText = heatmapGroup
          .append('text')
          .attr('x', -8)
          .attr('y', rowY + cellHeight / 2 + 3.5)
          .attr('text-anchor', 'end')
          .attr('font-family', 'monospace')
          .attr('font-size', '10px')
          .attr('cursor', 'pointer')
          .on('click', () => {
            setSelectedSegmentId((prev) => (prev === seg.id ? null : seg.id));
          });

        labelText
          .append('tspan')
          .attr('fill', isSelectedSeg ? '#38bdf8' : '#7dd3fc')
          .attr('font-weight', 'bold')
          .text(`[${seg.shortCode}] `);

        const truncatedName = seg.name.length > 17 ? `${seg.name.substring(0, 15)}..` : seg.name;
        labelText
          .append('tspan')
          .attr('fill', isSelectedSeg ? '#f8fafc' : '#94a3b8')
          .text(truncatedName);

        if (hasPeakClusterInHorizon) {
          labelText
            .append('tspan')
            .attr('fill', '#f43f5e')
            .attr('font-weight', 'bold')
            .text(' 🔥');
        }

        // Cells across Days 1 to horizon
        for (let day = 1; day <= horizon; day++) {
          const cell = segItems.find((m) => m.dayNumber === day);
          if (!cell) continue;

          const cellX = (day - 1) * cellWidth + 1;
          const cellW = Math.max(3, cellWidth - 2);

          // Metric evaluation based on user selection
          const metricVal =
            heatmapMetric === 'MANPOWER'
              ? cell.manpowerIntensityPct
              : heatmapMetric === 'MACHINERY'
              ? cell.machineryIntensityPct
              : cell.intensityPct;

          const colorInfo = corridorSegmentHeatmapService.getIntensityColor(metricVal);
          const isCellSelectedDay = selectedPoint?.dayNumber === day;

          const cellRect = heatmapGroup
            .append('rect')
            .attr('class', 'heatmap-cell cursor-pointer transition-all')
            .attr('x', cellX)
            .attr('y', rowY)
            .attr('width', cellW)
            .attr('height', cellHeight)
            .attr('rx', 2.5)
            .attr('fill', colorInfo.fillColor)
            .attr('stroke', cell.isPeakCluster ? '#f43f5e' : isCellSelectedDay ? '#38bdf8' : '#1e293b')
            .attr('stroke-width', cell.isPeakCluster ? 1.5 : isCellSelectedDay ? 2 : 0.6)
            .attr(
              'opacity',
              highlightClustersOnly && !cell.isPeakCluster
                ? 0.2
                : selectedSegmentId && selectedSegmentId !== seg.id
                ? 0.4
                : 0.95
            );

          // Interactive hover & click
          cellRect
            .on('mouseenter', () => {
              cellRect.attr('stroke', '#ffffff').attr('stroke-width', 2);
              setHoveredSegmentCell(cell);
              const targetPoint = forecastData.find((p) => p.dayNumber === day);
              if (targetPoint) {
                setHoveredPoint(targetPoint);
                const cx = xScale(day);
                crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 0.85);
                hoverCircleDemand.attr('cx', cx).attr('cy', yScale(targetPoint.manpowerRequired)).style('opacity', 1);
                if (showCapacityBaseline) {
                  hoverCircleCapacity.attr('cx', cx).attr('cy', yScale(targetPoint.manpowerAvailable)).style('opacity', 1);
                }
              }
            })
            .on('mouseleave', () => {
              cellRect
                .attr('stroke', cell.isPeakCluster ? '#f43f5e' : isCellSelectedDay ? '#38bdf8' : '#1e293b')
                .attr('stroke-width', cell.isPeakCluster ? 1.5 : isCellSelectedDay ? 2 : 0.6);
              setHoveredSegmentCell(null);
              crosshair.style('opacity', 0);
              hoverCircleDemand.style('opacity', 0);
              hoverCircleCapacity.style('opacity', 0);
              setHoveredPoint(null);
            })
            .on('click', () => {
              const targetPoint = forecastData.find((p) => p.dayNumber === day);
              if (targetPoint) {
                setSelectedPoint(targetPoint);
                setSelectedSegmentId(seg.id);
                setIsSidePanelOpen(true);
                if (onSelectShiftDay) {
                  onSelectShiftDay(day, cell.date);
                }
              }
            });

          // Center flame marker for peak demand cluster cell if cell width permits
          if (cell.isPeakCluster && cellW >= 14) {
            heatmapGroup
              .append('text')
              .attr('x', cellX + cellW / 2)
              .attr('y', rowY + cellHeight / 2 + 3)
              .attr('text-anchor', 'middle')
              .attr('font-size', '8px')
              .attr('pointer-events', 'none')
              .text('🔥');
          }
        }
      });

      // Bottom X-Axis for Heatmap
      const xAxisHeatmap = d3
        .axisBottom(xScale)
        .ticks(Math.min(15, horizon))
        .tickFormat((d) => {
          const pt = forecastData.find((p) => p.dayNumber === Number(d));
          return pt ? `${pt.displayDate}` : `D${d}`;
        });

      const heatmapAxisGroup = heatmapGroup
        .append('g')
        .attr('class', 'x-axis text-slate-400 font-mono text-[10px]')
        .attr('transform', `translate(0,${heatmapContentHeight + 4})`)
        .call(xAxisHeatmap);

      heatmapAxisGroup.selectAll('text').attr('dy', '1em').attr('fill', '#94a3b8');
      heatmapAxisGroup.selectAll('line').attr('stroke', '#334155');
      heatmapAxisGroup.select('.domain').attr('stroke', '#334155');
    }

    // --- INTERACTIVE VERTICAL CROSSHAIR & HOVER LISTENER ---
    const crosshair = g
      .append('line')
      .attr('class', 'crosshair')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const hoverCircleDemand = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const hoverCircleCapacity = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const hoverCirclePrev = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#c084fc')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const hoverCircleTrend = g
      .append('circle')
      .attr('r', 5.5)
      .attr('fill', '#818cf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    // Overlay rect for mouse movements over line chart
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', lineChartHeight)
      .attr('fill', 'transparent')
      .attr('class', 'cursor-crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const dayHovered = Math.round(xScale.invert(mx));
        const clampedDay = Math.max(1, Math.min(horizon, dayHovered));
        const point = forecastData.find((p) => p.dayNumber === clampedDay);

        if (point) {
          const cx = xScale(point.dayNumber);
          crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 0.85);

          hoverCircleDemand.attr('cx', cx).attr('cy', yScale(point.manpowerRequired)).style('opacity', 1);
          if (showCapacityBaseline) {
            hoverCircleCapacity.attr('cx', cx).attr('cy', yScale(point.manpowerAvailable)).style('opacity', 1);
          } else {
            hoverCircleCapacity.style('opacity', 0);
          }

          if (showComparePeriods && point.previousPeriodManpowerRequired) {
            hoverCirclePrev.attr('cx', cx).attr('cy', yScale(point.previousPeriodManpowerRequired)).style('opacity', 1);
          } else {
            hoverCirclePrev.style('opacity', 0);
          }

          if (effectiveShowTrendLine) {
            const regPt = regressionResult.points.find((p) => p.dayNumber === clampedDay);
            if (regPt) {
              hoverCircleTrend.attr('cx', cx).attr('cy', yScale(regPt.trendDemandRaw)).style('opacity', 1);
            } else {
              hoverCircleTrend.style('opacity', 0);
            }
          } else {
            hoverCircleTrend.style('opacity', 0);
          }

          setHoveredPoint(point);
          setHoveredSegmentCell(null);
        }
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        hoverCircleDemand.style('opacity', 0);
        hoverCircleCapacity.style('opacity', 0);
        hoverCirclePrev.style('opacity', 0);
        hoverCircleTrend.style('opacity', 0);
        setHoveredPoint(null);
      })
      .on('click', (event) => {
        const [mx] = d3.pointer(event);
        const dayHovered = Math.round(xScale.invert(mx));
        const clampedDay = Math.max(1, Math.min(horizon, dayHovered));
        const point = forecastData.find((p) => p.dayNumber === clampedDay);
        if (point) {
          setSelectedPoint(point);
          setIsSidePanelOpen(true);
          if (onSelectShiftDay) {
            onSelectShiftDay(point.dayNumber, point.date);
          }
        }
      });
  }, [
    forecastData,
    horizon,
    showWarningBuffer,
    showCapacityBaseline,
    showComparePeriods,
    thresholdSettings,
    onSelectShiftDay,
    selectedPoint,
    showHeatmapLayer,
    heatmapMetric,
    highlightClustersOnly,
    selectedSegmentId,
    segmentHeatmapData,
    effectiveShowTrendLine,
    regressionResult,
    effectiveEnableAiAlerts,
    predictiveAlertsResult,
  ]);

  return (
    <div
      ref={containerRef}
      id="forecasted-manpower-d3-chart-card"
      className="bg-[#0b1226] p-5 rounded-xl border border-sky-950/90 shadow-xl space-y-4"
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
              30-Day Manpower Demand vs Staffing Forecast (D3.js Line Analysis)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>D3 Engine Active</span>
            </span>
            {summaryMetrics.deficitDaysCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold animate-pulse">
                {summaryMetrics.deficitDaysCount} Deficit Days Identified
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Continuous 30-day projection contrasting scheduled maintenance work orders and defect surge workloads against active gang headcounts to pinpoint upcoming trade deficits.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Corridor Filter */}
          <div className="flex items-center gap-1 bg-[#070c1b] px-2 py-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={corridorFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCorridorFilter(val);
                if (onSelectCorridor && val !== 'ALL') {
                  onSelectCorridor(val);
                }
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Corridors (Total Fleet)</option>
              {corridors.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  Corridor {c.id} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-1 bg-[#070c1b] px-2 py-1 rounded-lg border border-slate-800">
            <Zap className="w-3 h-3 text-amber-400" />
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ForecastScenarioType)}
              className="bg-transparent text-amber-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="BASELINE" className="bg-slate-900">Baseline Schedule</option>
              <option value="MONSOON_MOISTURE" className="bg-slate-900">Monsoon Weather (+25%)</option>
              <option value="FREIGHT_SURGE" className="bg-slate-900">Freight Surge (+20%)</option>
              <option value="THERMAL_EXPANSION" className="bg-slate-900">Summer Heat Stress (+18%)</option>
            </select>
          </div>

          {/* Horizon Toggle */}
          <div className="inline-flex rounded-lg bg-[#070c1b] p-0.5 border border-slate-800">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setHorizon(days as ForecastHorizonDays)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  horizon === days
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Staffing Capacity Baseline Line Toggle */}
          <button
            id="btn-toolbar-toggle-capacity-baseline"
            onClick={() => setShowCapacityBaseline(!showCapacityBaseline)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
              showCapacityBaseline
                ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 'Current Staffing Capacity' baseline line to isolate demand spikes"
          >
            {showCapacityBaseline ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
            <span>Staffing Baseline</span>
          </button>

          {/* Heatmap Layer Toggle for Corridor Segments */}
          <button
            id="btn-toolbar-toggle-heatmap-layer"
            onClick={() => setShowHeatmapLayer((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono select-none ${
              showHeatmapLayer
                ? 'bg-rose-950/80 border-rose-600/80 text-rose-200 shadow-sm shadow-rose-950/40'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Toggle Corridor Segments Heatmap Layer to visualize daily consumption intensity & identify peak demand clusters at a glance"
            aria-pressed={showHeatmapLayer}
          >
            <Layers className={`w-3.5 h-3.5 ${showHeatmapLayer ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Heatmap Layer</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                showHeatmapLayer
                  ? 'bg-rose-900 text-rose-200 border border-rose-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showHeatmapLayer ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Heatmap Metric Selector (When Heatmap Layer is Active) */}
          {showHeatmapLayer && (
            <div className="flex items-center gap-1 bg-[#070c1b] px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <SlidersHorizontal className="w-3 h-3 text-rose-400" />
              <select
                value={heatmapMetric}
                onChange={(e) => setHeatmapMetric(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                title="Select resource consumption metric for corridor segments heatmap"
              >
                <option value="COMBINED" className="bg-slate-900">Intensity (Manpower + Machine)</option>
                <option value="MANPOWER" className="bg-slate-900">Manpower Demand Intensity</option>
                <option value="MACHINERY" className="bg-slate-900">Machinery Slot Intensity</option>
              </select>
            </div>
          )}

          {/* Focus Peak Demand Clusters Only */}
          {showHeatmapLayer && (
            <button
              id="btn-toolbar-toggle-clusters-only"
              onClick={() => setHighlightClustersOnly((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-mono ${
                highlightClustersOnly
                  ? 'bg-amber-950/80 border-amber-600 text-amber-200 shadow-sm'
                  : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Isolate and highlight only peak demand cluster cells across corridor segments"
            >
              <Flame className={`w-3.5 h-3.5 ${highlightClustersOnly ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Focus Clusters</span>
              {highlightClustersOnly && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
          )}

          {/* Compare Periods Toggle Button */}
          <button
            id="btn-toolbar-toggle-compare-periods"
            onClick={() => setShowComparePeriods((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono select-none ${
              showComparePeriods
                ? 'bg-purple-950/80 border-purple-500/90 text-purple-200 shadow-md shadow-purple-950/50'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Overlay previous month's resource demand data against current 30-day forecast to highlight cyclical seasonality in maintenance needs"
            aria-pressed={showComparePeriods}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${showComparePeriods ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>Compare Periods</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                showComparePeriods
                  ? 'bg-purple-900 text-purple-200 border border-purple-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showComparePeriods ? 'ON (-30D)' : 'OFF'}
            </span>
          </button>

          {/* Predictive Linear Regression Trend Line Toggle Button */}
          <button
            id="btn-toolbar-toggle-predictive-trend"
            onClick={handleToggleTrendLine}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono select-none ${
              effectiveShowTrendLine
                ? 'bg-indigo-950/80 border-indigo-500/90 text-indigo-200 shadow-md shadow-indigo-950/50'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Enable Predictive Linear Regression trend line forecasting 30-day resource demand based on historical maintenance cycles"
            aria-pressed={effectiveShowTrendLine}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${effectiveShowTrendLine ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>Predictive Trend</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                effectiveShowTrendLine
                  ? 'bg-indigo-900 text-indigo-200 border border-indigo-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {effectiveShowTrendLine ? 'ON (OLS)' : 'OFF'}
            </span>
          </button>

          {/* AI Predictive Alerts (>90% Sectional Capacity) Toggle Button */}
          <button
            id="btn-toolbar-toggle-ai-predictive-alerts"
            onClick={handleToggleAiAlerts}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono select-none ${
              effectiveEnableAiAlerts
                ? 'bg-amber-950/80 border-amber-500/90 text-amber-200 shadow-md shadow-amber-950/50'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Enable AI Predictive Alerts dynamically highlighting dates where resource demand exceeds 90% of sectional capacity and summarizing primary conflict drivers"
            aria-pressed={effectiveEnableAiAlerts}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${effectiveEnableAiAlerts ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span>AI Alerts</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                effectiveEnableAiAlerts
                  ? 'bg-amber-900 text-amber-100 border border-amber-500'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {effectiveEnableAiAlerts ? 'ON (>90%)' : 'OFF'}
            </span>
          </button>

          {/* Download Capacity Analysis PDF Button */}
          <button
            id="btn-toolbar-download-capacity-pdf"
            onClick={() => {
              if (onDownloadCapacityAnalysisPdf) {
                onDownloadCapacityAnalysisPdf();
              } else {
                const selCorridor = corridors.find((c) => c.id === corridorFilter) || null;
                downloadCapacityAnalysisPdf({
                  corridor: selCorridor,
                  forecastData,
                  regressionResult,
                  thresholdSettings,
                });
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-mono shadow-sm"
            title="Download comprehensive PDF report containing current chart, resource demand summaries, and conflict driver justifications for the selected corridor"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Capacity PDF</span>
          </button>

          {/* Warning Buffer Line Toggle */}
          <button
            onClick={() => setShowWarningBuffer(!showWarningBuffer)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
              showWarningBuffer
                ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                : 'bg-[#070c1b] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle IRTMM warning & critical threshold guidelines on D3 line chart"
          >
            <Sliders className="w-3 h-3" />
            <span>Guide Lines</span>
          </button>

          {/* Quick Trigger for Deficit Threshold Modal */}
          {onOpenThresholdModal && (
            <button
              onClick={onOpenThresholdModal}
              className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configure 'Manpower Deficit' & 'Machinery Deficit' percentage thresholds"
            >
              <span>Limits:</span>
              <span className="font-bold text-white bg-amber-900 px-1 rounded text-[10px]">
                +{thresholdSettings.manpowerWarningThresholdPct}% / +{thresholdSettings.manpowerCriticalThresholdPct}%
              </span>
            </button>
          )}

          {/* Export Forecast CSV Button */}
          <button
            onClick={handleInternalExportCsv}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export 30-day resource forecast data as CSV for offline maintenance planning & reporting"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Manual Forecast Override Trigger */}
          {onOpenManualAdjustment && (
            <button
              onClick={() => onOpenManualAdjustment(selectedPoint?.dayNumber || hoveredPoint?.dayNumber || 1)}
              className="btn-open-forecast-override px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-600/80 text-blue-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm font-medium"
              title="Override daily forecast counts to simulate directives and trigger conflict engine recalculation"
            >
              <Sliders className="w-3 h-3 text-blue-400" />
              <span>Adjust Day</span>
              {overrideCount !== undefined && overrideCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold text-[9px]">
                  {overrideCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#070c1b] p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Active Current Staffing</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {summaryMetrics.capacityBase}{' '}
            <span className="text-xs font-normal text-slate-400">personnel</span>
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Allocated Gangs & Standby</span>
          </div>
        </div>

        <div className="bg-[#070c1b] p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Forecasted Peak Demand</div>
          <div className="text-xl font-bold text-sky-400 mt-1">
            {summaryMetrics.maxDemand}{' '}
            <span className="text-xs font-normal text-slate-400">staff req</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Avg: {summaryMetrics.averageDemand} staff / day
          </div>
        </div>

        <div
          onClick={() => {
            if (summaryMetrics.peakDeficitDay) {
              setSelectedPoint(summaryMetrics.peakDeficitDay);
              setIsSidePanelOpen(true);
            }
          }}
          className={`bg-[#070c1b] p-3 rounded-lg border transition-all ${
            summaryMetrics.peakDeficitDay
              ? 'border-rose-900/60 hover:border-rose-500 hover:bg-rose-950/20 cursor-pointer group'
              : 'border-slate-800'
          }`}
          title={summaryMetrics.peakDeficitDay ? 'Click to open side-panel for peak deficit day' : undefined}
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
            <span>Peak Deficit Day</span>
            {summaryMetrics.peakDeficitDay && (
              <ArrowUpRight className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {summaryMetrics.peakDeficit > 0 ? `-${summaryMetrics.peakDeficit} staff` : '0 (Balanced)'}
          </div>
          <div className="text-[10px] text-rose-400/90 mt-0.5 truncate flex items-center justify-between">
            <span>
              {summaryMetrics.peakDeficitDay
                ? `${summaryMetrics.peakDeficitDay.displayDate} (${summaryMetrics.peakDeficitDay.targetCorridorId})`
                : 'No deficits forecasted'}
            </span>
            {summaryMetrics.peakDeficitDay && (
              <span className="text-[9px] text-sky-400 underline font-sans">Inspect Tasks ↗</span>
            )}
          </div>
        </div>

        <div className="bg-[#070c1b] p-3 rounded-lg border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase">Upcoming Deficit Window</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {summaryMetrics.deficitDaysCount} / {summaryMetrics.totalDays} Days
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            Cumulative: {summaryMetrics.totalShortfallManDays} man-days shortfall
          </div>
        </div>
      </div>

      {/* CYCLICAL SEASONALITY COMPARISON INSIGHT STRIP (Appears when Compare Periods is ON) */}
      {showComparePeriods && (
        <div
          id="seasonality-cyclical-banner"
          className="bg-gradient-to-r from-purple-950/40 via-[#101432] to-[#070c1b] border border-purple-800/60 rounded-xl p-4 text-xs font-mono shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-purple-900/40 border border-purple-700/60 text-purple-300 mt-0.5 shrink-0 shadow-inner">
                <RotateCcw className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-purple-200 text-sm tracking-wide">
                    Cyclical Seasonality Analysis: Previous Month (Aug 22 – Sep 20, 2026) Demand Overlay
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-600/80 text-[10px] font-bold">
                    MoM Benchmark Active
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      seasonalityMetrics.netVariancePct >= 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    <span>
                      {seasonalityMetrics.netVariancePct >= 0
                        ? `+${seasonalityMetrics.netVariancePct}% Net Demand Surge vs Prior Month`
                        : `${seasonalityMetrics.netVariancePct}% Demand vs Prior Month`}
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Contrasting late-monsoon waterlogging drainage and 25kV catenary moisture flashover patrols with current post-monsoon accelerated tamping cycles. The dashed purple curve reveals recurring weekend freight traffic clusters and seasonal fatigue micro-cracks.
                </p>
                <div className="text-[11px] text-purple-300/90 font-sans flex items-center gap-2 pt-0.5">
                  <span className="font-bold font-mono text-purple-400">Dominant Cyclical Driver:</span>
                  <span>{seasonalityMetrics.dominantDriver}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="flex items-center gap-3 shrink-0 bg-[#090d1f] px-3.5 py-2.5 rounded-lg border border-purple-800/40 shadow-sm self-stretch lg:self-auto justify-between lg:justify-start">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Prior MoM Avg</div>
                <div className="text-base font-bold text-purple-300 font-mono">
                  {seasonalityMetrics.avgPrevDemand}{' '}
                  <span className="text-[10px] font-normal text-slate-400">staff/day</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Current 30D Avg</div>
                <div className="text-base font-bold text-sky-400 font-mono">
                  {seasonalityMetrics.avgCurrDemand}{' '}
                  <span className="text-[10px] font-normal text-slate-400">staff/day</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Peak Surge Day</div>
                <div className="text-base font-bold text-amber-300 font-mono">
                  {seasonalityMetrics.peakSurgeDay
                    ? `${seasonalityMetrics.peakSurgeDay.displayDate} (+${seasonalityMetrics.maxSurgeVariancePct}%)`
                    : 'Balanced'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTIVE LINEAR REGRESSION INSIGHTS BANNER (Appears when Predictive Trend is ON) */}
      {effectiveShowTrendLine && (
        <div
          id="predictive-linear-regression-banner"
          className="bg-gradient-to-r from-indigo-950/50 via-[#0f1738] to-[#070c1b] border border-indigo-700/70 rounded-xl p-4 text-xs font-mono shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-900/50 border border-indigo-600/70 text-indigo-300 mt-0.5 shrink-0 shadow-inner">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-indigo-200 text-sm tracking-wide">
                    Predictive Linear Regression Trend (Next 30 Days Forecast)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-500/80 text-[10px] font-bold">
                    Formula: {regressionResult.formulaStr}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                    R² = {regressionResult.rSquared} (r = {regressionResult.pearsonR})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      regressionResult.slope >= 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    <span>
                      {regressionResult.slope >= 0
                        ? `+${regressionResult.slope}/day Demand Surge (+${regressionResult.percentChangeOver30Days}% 30D)`
                        : `${regressionResult.slope}/day Demand Taper (${regressionResult.percentChangeOver30Days}% 30D)`}
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {regressionResult.operationalInsights.summary}{' '}
                  {regressionResult.operationalInsights.historicalContext}
                </p>
                <div className="text-[11px] text-indigo-300/90 font-sans flex items-center gap-2 pt-0.5">
                  <span className="font-bold font-mono text-indigo-400">Operational Advisory:</span>
                  <span>{regressionResult.operationalInsights.recommendedMitigation}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="flex items-center gap-3 shrink-0 bg-[#090d24] px-3.5 py-2.5 rounded-lg border border-indigo-800/50 shadow-sm self-stretch lg:self-auto justify-between lg:justify-start">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Day 1 Proj</div>
                <div className="text-base font-bold text-indigo-300 font-mono">
                  {regressionResult.day1Projected}{' '}
                  <span className="text-[10px] font-normal text-slate-400">staff</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Day 15 Mid</div>
                <div className="text-base font-bold text-sky-400 font-mono">
                  {regressionResult.day15Projected}{' '}
                  <span className="text-[10px] font-normal text-slate-400">staff</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Day 30 Proj</div>
                <div className="text-base font-bold text-amber-300 font-mono">
                  {regressionResult.day30Projected}{' '}
                  <span className="text-[10px] font-normal text-slate-400">staff</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Residual SE</div>
                <div className="text-base font-bold text-violet-300 font-mono">
                  ±{regressionResult.standardError}{' '}
                  <span className="text-[10px] font-normal text-slate-400">95% CI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Maintenance Cycle Calibration Drivers Badges */}
          <div className="border-t border-indigo-900/60 pt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-indigo-300 uppercase">Historical Cycle Calibration Drivers:</span>
            {regressionResult.historicalCycleDrivers.map((driver) => (
              <span
                key={driver.id}
                className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-200 border border-indigo-800/70 text-[10px] flex items-center gap-1.5"
                title={driver.description}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span className="font-semibold">{driver.name}</span>
                <span className="text-slate-400 font-normal">({driver.cycleIntervalDays}D Cycle)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI PREDICTIVE ALERTS INSIGHTS BANNER (Appears when AI Predictive Alerts is ON) */}
      {effectiveEnableAiAlerts && (
        <div
          id="ai-predictive-alerts-insights-banner"
          className="bg-gradient-to-r from-[#211204] via-[#1c1228] to-[#070c1b] border border-amber-600/70 rounded-xl p-4 text-xs font-mono shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/80 text-amber-400 mt-0.5 shrink-0 shadow-inner">
                <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-200 text-sm tracking-wide">
                    AI Predictive Capacity Alerts (&gt;90% Sectional Capacity)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-900/90 text-amber-100 border border-amber-500/80 text-[10px] font-bold">
                    Active Alert Engine
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-800 text-[10px] font-bold">
                    {predictiveAlertsResult.strainDaysCount} Strain Dates Identified
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Threshold: &gt;90% of Corridor / Sectional Limit
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Real-time detection engine isolating dates where combined manpower or heavy machine slot demands exceed 90% of sectional throughput capacity. Hovering highlighted dates on the D3 chart below reveals the primary conflict driver (<span className="text-amber-300 font-semibold">Machinery Contention</span> vs <span className="text-rose-300 font-semibold">Manpower Shortage</span>) alongside statutory IRTMM mitigations.
                </p>
                <div className="text-[11px] text-amber-300/90 font-sans flex items-center gap-2 pt-0.5">
                  <span className="font-bold font-mono text-amber-400">Dominant Conflict Driver:</span>
                  <span>{predictiveAlertsResult.dominantNetworkDriver}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="flex items-center gap-3 shrink-0 bg-[#0c0d1e] px-3.5 py-2.5 rounded-lg border border-amber-800/40 shadow-sm self-stretch lg:self-auto justify-between lg:justify-start">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Machinery Contention</div>
                <div className="text-base font-bold text-amber-300 font-mono">
                  {predictiveAlertsResult.machineryContentionCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">dates</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Manpower Shortage</div>
                <div className="text-base font-bold text-rose-300 font-mono">
                  {predictiveAlertsResult.manpowerShortageCount}{' '}
                  <span className="text-[10px] font-normal text-slate-400">dates</span>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Peak Strain Date</div>
                <div className="text-base font-bold text-amber-200 font-mono">
                  {predictiveAlertsResult.peakStrainDate || 'None'} ({predictiveAlertsResult.peakStrainPct}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DAILY HEATMAP VISUALIZATION: RESOURCE STRAIN GRADIENT (SAFE GREEN TO DEEP RED DEFICIT) */}
      <DailyResourceStrainHeatmap
        forecastData={forecastData}
        selectedDayNumber={selectedPoint?.dayNumber}
        onSelectDay={(point) => {
          setSelectedPoint(point);
          setIsSidePanelOpen(true);
          if (onSelectShiftDay) {
            onSelectShiftDay(point.dayNumber, point.date);
          }
        }}
        thresholdSettings={thresholdSettings}
      />

      {/* PEAK DEMAND CLUSTERS AT A GLANCE BANNER */}
      {showHeatmapLayer && segmentHeatmapData.clusters.length > 0 && (
        <div
          id="peak-demand-clusters-ribbon"
          className="bg-gradient-to-r from-[#160b24] via-[#0f142b] to-[#0c1228] p-3.5 rounded-xl border border-rose-900/60 shadow-lg space-y-2 text-xs font-mono"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded bg-rose-900/80 text-rose-300 border border-rose-700">
                <Flame className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              </span>
              <span className="font-bold text-slate-100 uppercase tracking-wider text-xs">
                Peak Demand Clusters ({segmentHeatmapData.clusters.length} Identified Across Corridor Segments)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                High Strain Clusters (Intensity &gt; 85%)
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-sans">
              Click any cluster card below to jump directly to the corridor segment and inspect peak shift tasks
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-1">
            {segmentHeatmapData.clusters.map((cluster) => {
              const isSelected = selectedSegmentId === cluster.segmentId && selectedPoint?.dayNumber === cluster.peakDay;
              return (
                <button
                  key={cluster.clusterId}
                  onClick={() => {
                    setSelectedSegmentId(cluster.segmentId);
                    const targetPoint = forecastData.find((p) => p.dayNumber === cluster.peakDay) || forecastData[0];
                    if (targetPoint) {
                      setSelectedPoint(targetPoint);
                      setIsSidePanelOpen(true);
                      if (onSelectShiftDay) {
                        onSelectShiftDay(targetPoint.dayNumber, targetPoint.date);
                      }
                    }
                  }}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-rose-900/50 border-rose-500 shadow-md shadow-rose-950/70 ring-1 ring-rose-400'
                      : 'bg-[#080d21] border-slate-800/90 hover:border-rose-700 hover:bg-slate-900/90'
                  }`}
                  title={`Jump to ${cluster.clusterTitle}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-rose-300 group-hover:text-rose-200 text-xs truncate">
                      {cluster.segmentId}: {cluster.segmentName.split('—')[0]}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-200 border border-rose-800">
                      {cluster.maxIntensityPct}% Strain
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-sans mb-1">
                    <span className="font-mono text-amber-300 font-semibold">
                      {cluster.startDay === cluster.endDay ? `Day ${cluster.startDay}` : `Days ${cluster.startDay}–${cluster.endDay}`}
                    </span>
                    {cluster.totalManpowerDeficit > 0 ? (
                      <span className="font-bold text-rose-400">-{cluster.totalManpowerDeficit} staff gap</span>
                    ) : (
                      <span className="text-amber-400">Heavy Machine Surge</span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 font-sans line-clamp-1 group-hover:text-slate-300" title={cluster.primaryWorkDriver}>
                    {cluster.primaryWorkDriver}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* D3 SVG Container */}
      <div className="relative bg-[#070d1e] rounded-xl border border-slate-800/90 p-2 overflow-x-auto">
        {/* Interactive Floating Tooltip Bar: Supports both Corridor Segment Cells and Line Chart Points */}
        {hoveredSegmentCell ? (
          <div className="absolute top-4 left-4 z-20 bg-[#0d162f]/95 border border-rose-500/80 p-3.5 rounded-lg shadow-2xl text-xs font-mono backdrop-blur-md max-w-md pointer-events-none animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-2 mb-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-sky-900/90 text-sky-200 border border-sky-600 font-bold text-[10px]">
                    {hoveredSegmentCell.shortCode}
                  </span>
                  <span className="font-bold text-slate-100 text-xs">
                    {hoveredSegmentCell.segmentName}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {hoveredSegmentCell.segmentId} • Day {hoveredSegmentCell.dayNumber}: {hoveredSegmentCell.displayDate} ({hoveredSegmentCell.dayOfWeek})
                </div>
              </div>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                  hoveredSegmentCell.intensityLevel === 'PEAK_CLUSTER'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                    : hoveredSegmentCell.intensityLevel === 'ELEVATED'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : hoveredSegmentCell.intensityLevel === 'MODERATE'
                    ? 'bg-teal-950 text-teal-300 border border-teal-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {hoveredSegmentCell.intensityLevel === 'PEAK_CLUSTER' && <Flame className="w-3 h-3 text-rose-400" />}
                <span>{hoveredSegmentCell.intensityPct}% Intensity</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 bg-slate-900/60 p-2 rounded border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] block">Segment Manpower:</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sky-300 font-bold text-sm">
                    {hoveredSegmentCell.manpowerRequired} staff req
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    / {hoveredSegmentCell.manpowerAvailable} base
                  </span>
                </div>
                {hoveredSegmentCell.manpowerDeficit > 0 ? (
                  <span className="text-rose-400 font-bold text-[10px]">
                    Deficit: -{hoveredSegmentCell.manpowerDeficit} personnel
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px]">Staffing Sufficient</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Segment Machinery:</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-amber-300 font-bold text-sm">
                    {hoveredSegmentCell.machinerySlotsRequired} machines
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    / {hoveredSegmentCell.machinerySlotsAvailable} cap
                  </span>
                </div>
                {hoveredSegmentCell.machineryDeficit > 0 ? (
                  <span className="text-rose-400 font-bold text-[10px]">
                    Deficit: -{hoveredSegmentCell.machineryDeficit} machine slot(s)
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px]">Slot Allocation Met</span>
                )}
              </div>
            </div>

            <div className="space-y-1 text-[10px] text-slate-300 border-t border-slate-800 pt-2 font-sans">
              <div>
                <span className="font-bold text-slate-400 font-mono">Work Driver:</span>{' '}
                <span className="text-amber-200">{hoveredSegmentCell.primaryWorkDriver}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 font-mono">Target Asset:</span>{' '}
                <span className="text-sky-300">{hoveredSegmentCell.assetTarget}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 font-mono">Assigned Machinery:</span>{' '}
                <span className="text-slate-300 font-mono">
                  {hoveredSegmentCell.activeMachineryTypes.join(', ')}
                </span>
              </div>
              {hoveredSegmentCell.isPeakCluster && (
                <div className="p-1.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-200 mt-1.5 text-[10px]">
                  <span className="font-bold text-rose-300 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Peak Demand Cluster Directive:</span>
                  </span>
                  <p className="mt-0.5">{hoveredSegmentCell.mitigationRecommendation}</p>
                </div>
              )}
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-700/80 text-[10px] text-sky-300 font-semibold flex items-center justify-between">
              <span>Click cell to open shift task breakdown & roster</span>
              <span className="text-sky-400 font-mono">↗</span>
            </div>
          </div>
        ) : hoveredPoint ? (
          <div className="absolute top-4 left-4 z-20 bg-[#0d162f]/95 border border-sky-600/70 p-3 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md max-w-sm pointer-events-none animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Day {hoveredPoint.dayNumber}: {hoveredPoint.displayDate} ({hoveredPoint.dayOfWeek})
                </span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  hoveredPoint.riskLevel === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : hoveredPoint.riskLevel === 'HIGH'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {hoveredPoint.riskLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
              <div>
                <span className="text-slate-400 block">Forecast Demand:</span>
                <span className="text-sky-300 font-bold text-sm">
                  {hoveredPoint.manpowerRequired} personnel
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Staffing:</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {hoveredPoint.manpowerAvailable} staff
                </span>
              </div>
            </div>

            {/* Previous Period / Seasonality Breakdown in Tooltip */}
            {showComparePeriods && hoveredPoint.previousPeriodManpowerRequired !== undefined && (
              <div className="p-2 rounded bg-purple-950/70 border border-purple-800/80 mb-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-purple-300 font-semibold flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-purple-400" />
                    <span>Prior MoM ({hoveredPoint.previousPeriodDisplayDate}):</span>
                  </span>
                  <span className="text-white font-bold font-mono">
                    {hoveredPoint.previousPeriodManpowerRequired} staff
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Cyclical Variance:</span>
                  <span
                    className={`font-mono font-bold ${
                      (hoveredPoint.seasonalityVariancePct || 0) >= 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {(hoveredPoint.seasonalityVariancePct || 0) >= 0 ? '+' : ''}
                    {hoveredPoint.seasonalityVariancePct}% vs prior cycle
                  </span>
                </div>
                {hoveredPoint.seasonalityDriver && (
                  <div
                    className="text-[10px] text-purple-200/90 truncate font-sans pt-0.5 border-t border-purple-900/60"
                    title={hoveredPoint.seasonalityDriver}
                  >
                    {hoveredPoint.seasonalityDriver}
                  </div>
                )}
              </div>
            )}

            {/* Predictive Linear Regression Breakdown in Tooltip */}
            {effectiveShowTrendLine && (
              (() => {
                const regPoint = regressionResult.points.find((p) => p.dayNumber === hoveredPoint.dayNumber);
                if (!regPoint) return null;
                return (
                  <div className="p-2 rounded bg-indigo-950/80 border border-indigo-700/80 mb-2 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-300 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        <span>Predictive Trend (OLS):</span>
                      </span>
                      <span className="text-white font-bold">
                        {regPoint.trendDemand} staff req
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Residual vs Actual:</span>
                      <span
                        className={`font-mono font-bold ${
                          regPoint.residual >= 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {regPoint.residual >= 0 ? '+' : ''}
                        {regPoint.residual} staff ({regPoint.residual >= 0 ? 'Surge Above Trend' : 'Sub-Trend Margin'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">95% Prediction Interval:</span>
                      <span className="text-indigo-200">
                        [{regPoint.lowerConfidence95} – {regPoint.upperConfidence95} staff]
                      </span>
                    </div>
                    <div
                      className="text-[10px] text-indigo-200/90 truncate font-sans pt-0.5 border-t border-indigo-900/60"
                      title={regPoint.dominantCycleDriver}
                    >
                      Cycle: {regPoint.dominantCycleDriver}
                    </div>
                  </div>
                );
              })()
            )}

            {/* AI PREDICTIVE ALERT (>90% SECTIONAL CAPACITY) TOOLTIP SUMMARY */}
            {effectiveEnableAiAlerts && (() => {
              const alertInfo = predictiveAlertsResult.alerts.find((a) => a.dayNumber === hoveredPoint.dayNumber);
              if (!alertInfo || !alertInfo.isCapacityStrainExceeded90) return null;

              const isMach = alertInfo.primaryConflictDriver === 'Machinery Contention';

              return (
                <div
                  id="tooltip-ai-predictive-alert-card"
                  className={`p-2.5 rounded-lg border mb-2 font-mono text-[11px] shadow-lg ${
                    isMach
                      ? 'bg-amber-950/95 border-amber-500/90 text-amber-100 ring-1 ring-amber-500/50'
                      : 'bg-rose-950/95 border-rose-500/90 text-rose-100 ring-1 ring-rose-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 pb-1 border-b border-amber-700/60 mb-1.5">
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className={`w-3.5 h-3.5 ${isMach ? 'text-amber-400' : 'text-rose-400'} animate-bounce`} />
                      <span className="tracking-wide text-white">AI PREDICTIVE ALERT</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/40 text-amber-300 border border-amber-500/50">
                      {alertInfo.maxUtilizationPct}% Saturation
                    </span>
                  </div>

                  {/* Primary Conflict Driver */}
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Conflict Driver:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-sm ${
                        isMach
                          ? 'bg-amber-900 text-amber-100 border border-amber-400'
                          : 'bg-rose-900 text-rose-100 border border-rose-400'
                      }`}
                    >
                      {isMach ? <Wrench className="w-3 h-3 text-amber-300" /> : <Users className="w-3 h-3 text-rose-300" />}
                      <span>{alertInfo.primaryConflictDriver}</span>
                    </span>
                  </div>

                  {/* Demand vs Capacity Utilization Details */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] bg-black/40 p-1.5 rounded border border-slate-700/60 mb-1.5">
                    <div>
                      <span className="text-slate-400 block">Manpower Load:</span>
                      <span className={`font-bold ${alertInfo.manpowerUtilizationPct >= 90 ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {alertInfo.manpowerUtilizationPct}% ({alertInfo.manpowerRequired}/{alertInfo.manpowerAvailable})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Machinery Slots:</span>
                      <span className={`font-bold ${alertInfo.machineryUtilizationPct >= 90 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {alertInfo.machineryUtilizationPct}% ({alertInfo.machinerySlotsRequired}/{alertInfo.machinerySlotsAvailable} slots)
                      </span>
                    </div>
                  </div>

                  {/* Detailed Conflict Driver Justification */}
                  <div className="space-y-1 text-[10px] font-sans text-slate-200">
                    <div>
                      <span className="font-bold text-amber-300 font-mono">Affected Section:</span>{' '}
                      <span>{alertInfo.affectedSectionName} ({alertInfo.affectedSectionCode})</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-300 font-mono">Driver Justification:</span>{' '}
                      <span className="text-slate-200 leading-snug">{alertInfo.conflictDriverJustification}</span>
                    </div>
                    <div className="pt-1 border-t border-amber-800/60 text-amber-200">
                      <span className="font-bold font-mono">AI Mitigation:</span>{' '}
                      <span>{alertInfo.recommendedMitigationAction}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {hoveredPoint.manpowerRequired > hoveredPoint.manpowerAvailable ? (
              <div className="p-1.5 rounded bg-rose-950/80 border border-rose-800 text-rose-200 text-[11px] font-semibold flex items-center justify-between mb-2">
                <span>DEFICIT DETECTED:</span>
                <span>
                  -{hoveredPoint.manpowerRequired - hoveredPoint.manpowerAvailable} staff (
                  {Math.round(
                    ((hoveredPoint.manpowerRequired - hoveredPoint.manpowerAvailable) /
                      hoveredPoint.manpowerAvailable) *
                      100
                  )}
                  %)
                </span>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-[11px] flex items-center justify-between mb-2">
                <span>CAPACITY SURPLUS:</span>
                <span>
                  +{hoveredPoint.manpowerAvailable - hoveredPoint.manpowerRequired} staff reserve
                </span>
              </div>
            )}

            <div className="text-[10px] space-y-0.5 text-slate-300 border-t border-slate-800 pt-1.5 font-sans">
              <div>
                <span className="font-semibold text-slate-400 font-mono">P-Way Trackmen:</span>{' '}
                {hoveredPoint.trackmenRequired} req
              </div>
              <div>
                <span className="font-semibold text-slate-400 font-mono">S&T Interlocking:</span>{' '}
                {hoveredPoint.signalTechsRequired} req
              </div>
              <div>
                <span className="font-semibold text-slate-400 font-mono">TRD 25kV OHE:</span>{' '}
                {hoveredPoint.oheLinesmenRequired} req
              </div>
              <div>
                <span className="font-semibold text-slate-400 font-mono">Defect Driver:</span>{' '}
                <span className="text-amber-300">{hoveredPoint.primaryDefectDriver}</span>
              </div>
            </div>
            <div className="mt-1.5 pt-1 border-t border-slate-700/80 text-[10px] text-sky-300 font-semibold flex items-center justify-between">
              <span>Click data point to open deficit task breakdown side-panel</span>
              <span className="text-sky-400 font-mono">↗</span>
            </div>
          </div>
        ) : null}

        {/* The D3 SVG Element with dynamic responsive height */}
        <svg
          ref={svgRef}
          className={`w-full overflow-visible transition-all duration-300 ${
            showHeatmapLayer ? 'h-[520px] md:h-[560px]' : 'h-[360px]'
          }`}
        />

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 px-3 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-sky-400 shadow-sm shadow-sky-400/80"></span>
              <span className="text-slate-300 font-semibold">Forecasted Manpower Demand</span>
            </div>

            {/* Toggle Button for Current Staffing Capacity Baseline */}
            <button
              type="button"
              id="btn-toggle-capacity-baseline-legend"
              onClick={() => setShowCapacityBaseline((prev) => !prev)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer group shadow-sm select-none ${
                showCapacityBaseline
                  ? 'bg-emerald-950/70 border-emerald-600/90 text-emerald-200 hover:bg-emerald-900/80 shadow-emerald-950/40'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title={
                showCapacityBaseline
                  ? "Click to hide 'Current Staffing Capacity' baseline line (isolates demand spikes)"
                  : "Click to show 'Current Staffing Capacity' baseline line"
              }
              aria-pressed={showCapacityBaseline}
              aria-label="Toggle Current Staffing Capacity baseline line"
            >
              <span
                className={`w-4 h-0.5 border-t-2 border-dashed transition-colors ${
                  showCapacityBaseline ? 'border-emerald-400' : 'border-slate-500'
                }`}
              ></span>
              <span
                className={`font-semibold transition-colors ${
                  showCapacityBaseline
                    ? 'text-emerald-200 group-hover:text-white'
                    : 'text-slate-400 line-through decoration-slate-500'
                }`}
              >
                Current Staffing Capacity
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors ${
                  showCapacityBaseline
                    ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/70'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {showCapacityBaseline ? (
                  <>
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>VISIBLE</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>HIDDEN</span>
                  </>
                )}
              </span>
            </button>

            {/* Toggle Button for Previous Month Cyclical Demand Overlay */}
            <button
              type="button"
              id="btn-toggle-compare-periods-legend"
              onClick={() => setShowComparePeriods((prev) => !prev)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer group shadow-sm select-none ${
                showComparePeriods
                  ? 'bg-purple-950/70 border-purple-600/90 text-purple-200 hover:bg-purple-900/80 shadow-purple-950/40'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title={
                showComparePeriods
                  ? "Click to hide Previous Month overlay"
                  : "Click to overlay Previous Month resource demand (Aug-Sep '26 Cyclical)"
              }
              aria-pressed={showComparePeriods}
              aria-label="Toggle Previous Month Demand Comparison overlay"
            >
              <span
                className={`w-4 h-0.5 border-t-2 border-dashed transition-colors ${
                  showComparePeriods ? 'border-purple-400' : 'border-slate-500'
                }`}
              ></span>
              <span
                className={`font-semibold transition-colors ${
                  showComparePeriods
                    ? 'text-purple-200 group-hover:text-white'
                    : 'text-slate-400 line-through decoration-slate-500'
                }`}
              >
                Previous Month Demand
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors ${
                  showComparePeriods
                    ? 'bg-purple-900 text-purple-200 border border-purple-500/70'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {showComparePeriods ? (
                  <>
                    <Eye className="w-3 h-3 text-purple-400" />
                    <span>VISIBLE</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>HIDDEN</span>
                  </>
                )}
              </span>
            </button>

            {/* Toggle Button for Predictive Linear Regression Trend Line */}
            <button
              type="button"
              id="btn-toggle-predictive-trend-legend"
              onClick={handleToggleTrendLine}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer group shadow-sm select-none ${
                effectiveShowTrendLine
                  ? 'bg-indigo-950/70 border-indigo-600/90 text-indigo-200 hover:bg-indigo-900/80 shadow-indigo-950/40'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title={
                effectiveShowTrendLine
                  ? "Click to hide Predictive Linear Regression trend line"
                  : "Click to enable Predictive Linear Regression trend line based on historical maintenance cycles"
              }
              aria-pressed={effectiveShowTrendLine}
              aria-label="Toggle Predictive Linear Regression trend line overlay"
            >
              <span
                className={`w-4 h-0.5 border-t-2 border-dashed transition-colors ${
                  effectiveShowTrendLine ? 'border-indigo-400' : 'border-slate-500'
                }`}
              ></span>
              <span
                className={`font-semibold transition-colors ${
                  effectiveShowTrendLine
                    ? 'text-indigo-200 group-hover:text-white'
                    : 'text-slate-400 line-through decoration-slate-500'
                }`}
              >
                Predictive Trend Line (OLS 95% CI)
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors ${
                  effectiveShowTrendLine
                    ? 'bg-indigo-900 text-indigo-200 border border-indigo-500/70'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {effectiveShowTrendLine ? (
                  <>
                    <Eye className="w-3 h-3 text-indigo-400" />
                    <span>VISIBLE</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>HIDDEN</span>
                  </>
                )}
              </span>
            </button>

            {/* Toggle Button for AI Predictive Alerts */}
            <button
              type="button"
              id="btn-toggle-ai-alerts-legend"
              onClick={handleToggleAiAlerts}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer group shadow-sm select-none ${
                effectiveEnableAiAlerts
                  ? 'bg-amber-950/70 border-amber-600/90 text-amber-200 hover:bg-amber-900/80 shadow-amber-950/40'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
              title={
                effectiveEnableAiAlerts
                  ? "Click to hide AI Predictive Alerts (>90% Sectional Capacity)"
                  : "Click to enable AI Predictive Alerts (>90% Sectional Capacity)"
              }
              aria-pressed={effectiveEnableAiAlerts}
              aria-label="Toggle AI Predictive Alerts highlight"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${effectiveEnableAiAlerts ? 'text-amber-400' : 'text-slate-500'}`} />
              <span
                className={`font-semibold transition-colors ${
                  effectiveEnableAiAlerts
                    ? 'text-amber-200 group-hover:text-white'
                    : 'text-slate-400 line-through decoration-slate-500'
                }`}
              >
                AI Alerts (&gt;90% Strain)
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors ${
                  effectiveEnableAiAlerts
                    ? 'bg-amber-900 text-amber-100 border border-amber-500/70'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {effectiveEnableAiAlerts ? (
                  <>
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>VISIBLE</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>HIDDEN</span>
                  </>
                )}
              </span>
            </button>

            {/* Heatmap Layer Intensity Swatches (When Heatmap Layer is active) */}
            {showHeatmapLayer && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <span className="text-slate-400 text-[11px]">Heatmap Segments:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-900 border border-emerald-600" title="Safe (<45% consumption)"></span>
                  <span className="text-[10px] text-slate-400">Low</span>
                  <span className="w-3 h-3 rounded bg-teal-800 border border-teal-500" title="Balanced (45-67% consumption)"></span>
                  <span className="text-[10px] text-slate-400">Mod</span>
                  <span className="w-3 h-3 rounded bg-amber-700 border border-amber-500" title="Elevated (68-84% consumption)"></span>
                  <span className="text-[10px] text-slate-400">Elev</span>
                  <span className="w-3 h-3 rounded bg-rose-900 border border-rose-500 animate-pulse" title="Peak Cluster (≥85% deficit)"></span>
                  <span className="text-[10px] text-rose-300 font-bold flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-rose-400" />
                    <span>Peak</span>
                  </span>
                </div>
              </div>
            )}

            {/* Active Segment Focus Reset Pill */}
            {selectedSegmentId && (
              <button
                onClick={() => setSelectedSegmentId(null)}
                className="px-2 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-600 text-sky-200 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="Click to reset segment isolation and show all segments equally"
              >
                <span>Focus: {selectedSegmentId}</span>
                <span className="text-rose-400 font-bold hover:text-white">✕</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-sky-400/90 font-sans flex items-center gap-2">
            {!showCapacityBaseline && (
              <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/80 text-sky-300 font-mono text-[10px] font-bold animate-pulse">
                Baseline Hidden — Isolating Pure Demand Spikes
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            <span>Hover or click any segment cell to inspect contributing shift tasks &amp; cluster gaps</span>
          </div>
        </div>
      </div>

      {/* Selected Day Drill-Down Drawer (If user clicks a point) */}
      {selectedPoint && (
        <div className="p-4 bg-gradient-to-r from-[#111936] via-[#101732] to-[#0c1228] rounded-xl border border-sky-600/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-sm">
                Selected Day {selectedPoint.dayNumber}: {selectedPoint.displayDate} ({selectedPoint.dayOfWeek})
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-900/80 text-sky-200 border border-sky-700">
                Corridor {selectedPoint.targetCorridorId}
              </span>
              {selectedPoint.manpowerDeficit > 0 ? (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                  Deficit: -{selectedPoint.manpowerDeficit} Personnel
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Capacity Balanced
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 font-sans">
              <span className="font-bold text-amber-400">Aging Asset Driver:</span> {selectedPoint.primaryAgingDriver}.{' '}
              <span className="font-bold text-rose-400">Recommended Action:</span> {selectedPoint.recommendedAction}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsSidePanelOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-950/60"
              title="Open full slide-over side-panel with task-by-task breakdown and staffing requirements"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Tasks & Staffing Gap</span>
            </button>

            {selectedPoint.manpowerDeficit > 0 && onMobilizeReserveGang && (
              <button
                onClick={() => onMobilizeReserveGang(selectedPoint.manpowerDeficit)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/60"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Mobilize +{selectedPoint.manpowerDeficit} Reserve Staff</span>
              </button>
            )}

            <button
              onClick={() => setSelectedPoint(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Side Panel Displaying Contributing Maintenance Tasks & Staffing Requirements */}
      <ForecastDayDetailSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        dayPoint={selectedPoint}
        corridors={corridors}
        onMobilizeReserveGang={onMobilizeReserveGang}
        onSelectShiftDay={onSelectShiftDay}
        onOpenManualAdjustment={onOpenManualAdjustment}
      />
    </div>
  );
};
