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
  const [hoveredPoint, setHoveredPoint] = useState<DailyForecastPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DailyForecastPoint | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

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

  // Render D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !forecastData || forecastData.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const containerWidth = containerRef.current.clientWidth || 900;
    const width = Math.max(680, containerWidth);
    const height = 360;

    const margin = { top: 30, right: 35, bottom: 50, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Days 1 to horizon)
    const xScale = d3
      .scaleLinear()
      .domain([1, horizon])
      .range([0, innerWidth]);

    // Y Scale (Manpower headcount) - Zooms dynamically to max demand when baseline is hidden to isolate spikes
    const maxVal = d3.max(forecastData, (d: DailyForecastPoint) =>
      showCapacityBaseline ? Math.max(d.manpowerRequired, d.manpowerAvailable) : d.manpowerRequired
    ) || 180;
    const yMax = Math.ceil((maxVal * 1.15) / 10) * 10;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0])
      .nice();

    // Deficit Threshold lines
    const warnPct = thresholdSettings.manpowerWarningThresholdPct;
    const critPct = thresholdSettings.manpowerCriticalThresholdPct;

    // --- GRID LINES ---
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(6);

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

    // Demand Line Glow Filter
    const glowFilter = defs.append('filter').attr('id', 'demandGlow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

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
        .y0(innerHeight)
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

    // --- X AXIS (Days & Dates) ---
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(15, horizon))
      .tickFormat((d) => {
        const pt = forecastData.find((p) => p.dayNumber === Number(d));
        return pt ? `${pt.displayDate}` : `D${d}`;
      });

    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis text-slate-400 font-mono text-[11px]')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll('text').attr('dy', '1em').attr('fill', '#94a3b8');
    xAxisGroup.selectAll('line').attr('stroke', '#334155');
    xAxisGroup.select('.domain').attr('stroke', '#334155');

    // --- Y AXIS (Headcount) ---
    const yAxis = d3.axisLeft(yScale).ticks(6);

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
      .attr('y', -42)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .text('Gang Staffing / Headcount');

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

    // Overlay rect for mouse movements
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
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

          setHoveredPoint(point);
        }
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        hoverCircleDemand.style('opacity', 0);
        hoverCircleCapacity.style('opacity', 0);
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
  }, [forecastData, horizon, showWarningBuffer, showCapacityBaseline, thresholdSettings, onSelectShiftDay, selectedPoint]);

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

      {/* D3 SVG Container */}
      <div className="relative bg-[#070d1e] rounded-xl border border-slate-800/90 p-2 overflow-x-auto">
        {/* Interactive Floating Tooltip Bar */}
        {hoveredPoint ? (
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

        {/* The D3 SVG Element */}
        <svg ref={svgRef} className="w-full h-[360px] overflow-visible" />

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

            <div
              className={`flex items-center gap-2 transition-opacity ${
                showCapacityBaseline ? 'opacity-100' : 'opacity-40'
              }`}
              title={showCapacityBaseline ? undefined : 'Capacity baseline is currently hidden'}
            >
              <span className="w-3.5 h-3.5 rounded bg-rose-500/40 border border-rose-500"></span>
              <span className="text-rose-300 font-semibold">
                Upcoming Deficit Zone (Demand &gt; Staffing)
              </span>
            </div>

            <div
              className={`flex items-center gap-2 transition-opacity ${
                showCapacityBaseline ? 'opacity-100' : 'opacity-40'
              }`}
              title={showCapacityBaseline ? undefined : 'Capacity baseline is currently hidden'}
            >
              <span className="w-3.5 h-3.5 rounded bg-sky-500/20 border border-sky-500"></span>
              <span className="text-sky-300">Surplus Operating Reserve</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-white"></span>
              <span className="text-slate-300">Severe Shortage Day Marker</span>
            </div>
          </div>

          <div className="text-[11px] text-sky-400/90 font-sans flex items-center gap-2">
            {!showCapacityBaseline && (
              <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/80 text-sky-300 font-mono text-[10px] font-bold animate-pulse">
                Baseline Hidden — Isolating Pure Demand Spikes
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            <span>Click any point along the curve to open side-panel with contributing maintenance tasks & staffing roster</span>
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
      />
    </div>
  );
};
