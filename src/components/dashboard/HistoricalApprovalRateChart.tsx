import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Filter,
  Sliders,
  Download,
  Info,
  Sparkles,
  Zap,
  Target,
  Wrench,
  Radio,
  Clock,
  ChevronRight,
  X,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import {
  approvalRateHistoryService,
  DailyApprovalRecord,
  ApprovalHistorySummary,
} from '../../services/approvalRateHistoryService';
import { railwayAudio } from '../../services/railwayAudio';
import { downloadFile } from '../../services/exportBulletinService';

interface HistoricalApprovalRateChartProps {
  onNavigate?: (screen: string, itemData?: any) => void;
  className?: string;
}

type TimeHorizon = 7 | 14 | 30;
type DepartmentFilter = 'ALL' | 'ENGINEERING' | 'SIGNALING' | 'TRACTION';
type ChartMode = 'RATE_ONLY' | 'VOLUME_FLOW' | 'COMBINED';
type EngineType = 'RECHARTS' | 'D3';

export const HistoricalApprovalRateChart: React.FC<HistoricalApprovalRateChartProps> = ({
  onNavigate,
  className = '',
}) => {
  const [horizon, setHorizon] = useState<TimeHorizon>(30);
  const [department, setDepartment] = useState<DepartmentFilter>('ALL');
  const [chartMode, setChartMode] = useState<ChartMode>('RATE_ONLY');
  const [engine, setEngine] = useState<EngineType>('RECHARTS');
  const [selectedDay, setSelectedDay] = useState<DailyApprovalRecord | null>(null);
  const [hoveredD3Day, setHoveredD3Day] = useState<DailyApprovalRecord | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const d3SvgRef = useRef<SVGSVGElement | null>(null);
  const d3ContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch data slice & summary metrics
  const rawData = useMemo(() => approvalRateHistoryService.getHistory(horizon), [horizon]);
  const summary = useMemo(() => approvalRateHistoryService.getSummary(horizon), [horizon]);

  // Adjust data according to selected department
  const chartData = useMemo(() => {
    return rawData.map((d) => {
      let activeRate = d.approvalRate;
      let activeApproved = d.approvedRequests;
      let activeTotal = d.totalRequests;
      let activeDeferred = d.deferredRequests;

      if (department === 'ENGINEERING') {
        activeRate = d.engineering.rate;
        activeApproved = d.engineering.approved;
        activeTotal = d.engineering.total;
        activeDeferred = d.engineering.deferred;
      } else if (department === 'SIGNALING') {
        activeRate = d.signaling.rate;
        activeApproved = d.signaling.approved;
        activeTotal = d.signaling.total;
        activeDeferred = d.signaling.deferred;
      } else if (department === 'TRACTION') {
        activeRate = d.traction.rate;
        activeApproved = d.traction.approved;
        activeTotal = d.traction.total;
        activeDeferred = d.traction.deferred;
      }

      return {
        ...d,
        activeRate,
        activeApproved,
        activeTotal,
        activeDeferred,
      };
    });
  }, [rawData, department]);

  // Auto-select the latest day on mount or horizon change
  useEffect(() => {
    if (chartData.length > 0 && !selectedDay) {
      setSelectedDay(chartData[chartData.length - 1]);
    }
  }, [chartData, selectedDay]);

  // =========================================================================
  // D3.JS ENGINE RENDERING
  // =========================================================================
  useEffect(() => {
    if (engine !== 'D3' || !d3SvgRef.current || !d3ContainerRef.current) return;

    const container = d3ContainerRef.current;
    const svg = d3.select(d3SvgRef.current);
    svg.selectAll('*').remove();

    const width = container.clientWidth || 800;
    const height = 300;
    const margin = { top: 25, right: 35, bottom: 45, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    // Defs for gradients & filters
    const defs = svg.append('defs');

    // Area Gradient
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.45);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0284c7').attr('stop-opacity', 0.02);

    // Glow Filter
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', 2.5).attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', (d) => d);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3
      .scalePoint<string>()
      .domain(chartData.map((d) => d.displayDate))
      .range([0, innerWidth])
      .padding(0.1);

    // Y Scale (fixed 60% to 100% for realistic railway approval rate visibility)
    const rawMin = chartData.reduce((min, d) => Math.min(min, d.activeRate), 100);
    const minVal = Math.min(65, Math.floor(rawMin) - 5);
    const yScale = d3.scaleLinear().domain([minVal, 100]).range([innerHeight, 0]).nice();

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '3,3');
    g.selectAll('.grid .domain').remove();

    // 85% Target Benchmark Reference Line
    const targetY = yScale(85);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', targetY)
      .attr('y2', targetY)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4')
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', targetY - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#fbbf24')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('Target Benchmark: 85%');

    // Area Generator
    const areaGenerator = d3
      .area<any>()
      .x((d) => xScale(d.displayDate) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.activeRate))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'url(#d3-area-grad)')
      .attr('d', areaGenerator);

    // Line Generator
    const lineGenerator = d3
      .line<any>()
      .x((d) => xScale(d.displayDate) || 0)
      .y((d) => yScale(d.activeRate))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#d3-glow)')
      .attr('d', lineGenerator);

    // X Axis
    const tickStep = horizon === 30 ? 3 : horizon === 14 ? 2 : 1;
    const xAxisTicks = chartData
      .filter((_, idx) => idx % tickStep === 0 || idx === chartData.length - 1)
      .map((d) => d.displayDate);

    const xAxis = d3.axisBottom(xScale).tickValues(xAxisTicks);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#334155');
        axisG.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace');
        axisG.selectAll('.tick line').attr('stroke', '#334155');
      });

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .call(yAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#334155');
        axisG.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace');
        axisG.selectAll('.tick line').attr('stroke', '#334155');
      });

    // Vertical Crosshair Tracker
    const crosshair = g
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    // Points on Line
    const dotsG = g.append('g');
    const dots = dotsG
      .selectAll<SVGCircleElement, (typeof chartData)[0]>('circle')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('cx', (d: (typeof chartData)[0]) => xScale(d.displayDate) || 0)
      .attr('cy', (d: (typeof chartData)[0]) => yScale(d.activeRate))
      .attr('r', (d: (typeof chartData)[0]) => (d.activeRate === summary.peakRate.rate ? 5.5 : 3.5))
      .attr('fill', (d: (typeof chartData)[0]) => (d.activeRate >= 85 ? '#38bdf8' : '#f43f5e'))
      .attr('stroke', '#0a1020')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer');

    // Overlay Rect for Mouse Events
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, g.node());
        if (mx < 0 || mx > innerWidth) {
          crosshair.style('opacity', 0);
          setHoveredD3Day(null);
          setTooltipPos(null);
          return;
        }

        // Find nearest point along x
        let nearest = chartData[0];
        let minDist = Infinity;
        chartData.forEach((d) => {
          const px = xScale(d.displayDate) || 0;
          const dist = Math.abs(px - mx);
          if (dist < minDist) {
            minDist = dist;
            nearest = d;
          }
        });

        const nx = xScale(nearest.displayDate) || 0;
        const ny = yScale(nearest.activeRate);

        crosshair.attr('x1', nx).attr('x2', nx).attr('y1', 0).attr('y2', innerHeight).style('opacity', 1);

        dots.attr('r', (d: (typeof chartData)[0]) => (d.dayNumber === nearest.dayNumber ? 7 : d.activeRate === summary.peakRate.rate ? 5.5 : 3.5));

        setHoveredD3Day(nearest);
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        dots.attr('r', (d: (typeof chartData)[0]) => (d.activeRate === summary.peakRate.rate ? 5.5 : 3.5));
        setHoveredD3Day(null);
        setTooltipPos(null);
      })
      .on('click', () => {
        if (hoveredD3Day) {
          railwayAudio.playBeep(840, 0.05);
          setSelectedDay(hoveredD3Day);
        }
      });
  }, [engine, chartData, horizon, summary]);

  // Handle CSV export of the historical 30-day block approval log
  const handleExportCsv = () => {
    railwayAudio.playBeep(750, 0.06);
    try {
      const csv = approvalRateHistoryService.generateCsv(horizon);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `IR_Delhi_Block_Request_Approval_Rate_${horizon}D_${dateStr}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8');
      railwayAudio.playStationChime();
      setExportFeedback(`Exported: ${filename}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (e) {
      console.error(e);
      setExportFeedback('Export error');
    }
  };

  // Custom Recharts Tooltip
  const CustomRechartsTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: DailyApprovalRecord & { activeRate: number; activeApproved: number; activeTotal: number; activeDeferred: number } = payload[0].payload;
    const isAboveTarget = data.activeRate >= 85;

    return (
      <div className="bg-[#0b1329]/95 backdrop-blur-md p-3.5 rounded-xl border border-sky-500/40 shadow-2xl text-xs font-mono max-w-xs space-y-2.5 z-50 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-slate-100">
              {data.displayDate} 2026 (Day {data.dayNumber})
            </span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isAboveTarget
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {isAboveTarget ? '✓ TARGET MET' : '⚠ BELOW 85%'}
          </span>
        </div>

        {/* Approval Rate Metric */}
        <div className="flex items-baseline justify-between bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-slate-400">Approval Rate:</span>
          <span className="text-base font-bold text-sky-300 font-mono">
            {data.activeRate.toFixed(1)}%
          </span>
        </div>

        {/* Volume Counts */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Total</span>
            <span className="font-bold text-slate-200">{data.activeTotal}</span>
          </div>
          <div className="bg-emerald-950/60 p-1.5 rounded border border-emerald-800/80">
            <span className="text-emerald-400 block">Approved</span>
            <span className="font-bold text-emerald-200">{data.activeApproved}</span>
          </div>
          <div className="bg-rose-950/60 p-1.5 rounded border border-rose-800/80">
            <span className="text-rose-400 block">Deferred</span>
            <span className="font-bold text-rose-200">{data.activeDeferred}</span>
          </div>
        </div>

        {/* Department Breakdown Mini-Bar */}
        <div className="space-y-1 text-[10px] pt-1">
          <div className="text-slate-400 font-semibold">Department Breakdown:</div>
          <div className="flex justify-between text-slate-300">
            <span>Engineering: {data.engineering.rate}%</span>
            <span>S&T: {data.signaling.rate}%</span>
            <span>TRD: {data.traction.rate}%</span>
          </div>
        </div>

        {/* Event highlight if available */}
        {data.notableEvent && (
          <div className="bg-blue-950/40 p-2 rounded border border-blue-900/60 text-[10px] text-sky-300 leading-snug">
            <Sparkles className="w-3 h-3 text-sky-400 inline mr-1" />
            {data.notableEvent}
          </div>
        )}

        <div className="text-[10px] text-slate-500 text-center pt-0.5">
          Click point to lock daily corridor breakdown
        </div>
      </div>
    );
  };

  return (
    <div
      id="historical-approval-rate-card"
      data-testid="historical-approval-rate-card"
      className={`bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4 ${className}`}
    >
      {/* =====================================================================
          HEADER SECTION
          ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
              Historical Block Request Approval Rates
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
              {horizon}-DAY OPERATIONAL CYCLE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" />
              BENCHMARK: 85% TARGET
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              DIVIS0NAL OPERATIONAL LOG
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing 30-day approval rate trajectory of maintenance block requests vetted by Chief Section Controllers against timetable constraints and line contention.
          </p>
        </div>

        {/* Action Buttons: Export & Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Renderer Engine Toggle (Recharts vs D3.js) */}
          <div
            id="chart-renderer-engine-toggle"
            data-testid="chart-renderer-engine-toggle"
            className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs shadow-inner"
          >
            <button
              type="button"
              id="btn-engine-recharts"
              data-testid="btn-engine-recharts"
              onClick={() => {
                railwayAudio.playBeep(650, 0.04);
                setEngine('RECHARTS');
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                engine === 'RECHARTS'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Render interactive vector line chart using Recharts"
            >
              Recharts Engine
            </button>
            <button
              type="button"
              id="btn-engine-d3"
              data-testid="btn-engine-d3"
              onClick={() => {
                railwayAudio.playBeep(700, 0.04);
                setEngine('D3');
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                engine === 'D3'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Render custom SVG line chart using D3.js mathematical interpolation"
            >
              <span>D3.js SVG</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            id="btn-export-approval-history-csv"
            data-testid="btn-export-approval-history-csv"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Download 30-day historical block approval dataset as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Toast */}
      {exportFeedback && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between animate-in fade-in">
          <span>✓ {exportFeedback}</span>
          <button onClick={() => setExportFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          EXECUTIVE KPI SUMMARY METRIC TILES
          ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        {/* 1. Average Approval Rate */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">30d Avg Approval</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-sky-300">{summary.avgApprovalRate}%</span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 inline" />
              +{summary.priorPeriodDelta}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            vs 85% IR Target Standard
          </span>
        </div>

        {/* 2. Total Volume Processed */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Total Volume</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-200">{summary.totalRequests}</span>
            <span className="text-[10px] text-slate-400">blks</span>
          </div>
          <span className="text-[10px] text-emerald-400 block truncate">
            {summary.totalApproved} approved / {summary.totalDeferred} deferred
          </span>
        </div>

        {/* 3. Rolling 7-Day Velocity */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Rolling 7d Rate</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-cyan-300">{summary.rolling7DayAvg}%</span>
            <span className="text-[10px] text-cyan-400">current</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            High-efficiency window
          </span>
        </div>

        {/* 4. Peak Approval Day */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Peak Daily Rate</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-300">{summary.peakRate.rate}%</span>
            <span className="text-[10px] text-slate-400">{summary.peakRate.date}</span>
          </div>
          <span className="text-[10px] text-emerald-400 block truncate">
            Day {summary.peakRate.dayNumber} Mega Block
          </span>
        </div>

        {/* 5. Target Compliance */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Target Compliance</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-300">{summary.targetCompliancePct}%</span>
            <span className="text-[10px] text-slate-400">
              ({summary.targetComplianceDays}/{horizon}d)
            </span>
          </div>
          <span className="text-[10px] text-amber-400 block truncate">
            Days &ge; 85% Benchmark
          </span>
        </div>

        {/* 6. Best Performing Dept */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Top Discipline</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-purple-300">{summary.bestDepartment.rate}%</span>
          </div>
          <span className="text-[10px] text-purple-400 block truncate">
            {summary.bestDepartment.name}
          </span>
        </div>
      </div>

      {/* =====================================================================
          CONTROLS TOOLBAR: HORIZON, DEPARTMENT & CHART MODE FILTERS
          ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Horizon Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Horizon:</span>
            </span>
            {([7, 14, 30] as TimeHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                id={`btn-horizon-${h}d`}
                data-testid={`btn-horizon-${h}d`}
                onClick={() => {
                  railwayAudio.playBeep(600, 0.04);
                  setHorizon(h);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  horizon === h
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>

          {/* Department Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5 font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-purple-400" />
              <span>Discipline:</span>
            </span>
            {(
              [
                { id: 'ALL', label: 'All Disciplines' },
                { id: 'ENGINEERING', label: 'Engineering' },
                { id: 'SIGNALING', label: 'S&T' },
                { id: 'TRACTION', label: 'Traction TRD' },
              ] as { id: DepartmentFilter; label: string }[]
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                id={`btn-dept-${d.id.toLowerCase()}`}
                data-testid={`btn-dept-${d.id.toLowerCase()}`}
                onClick={() => {
                  railwayAudio.playBeep(640, 0.04);
                  setDepartment(d.id);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  department === d.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode: Rate vs Volume */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 self-start md:self-auto">
          <span className="text-[10px] text-slate-400 uppercase px-1.5 font-bold flex items-center gap-1">
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span>Mode:</span>
          </span>
          <button
            type="button"
            id="btn-mode-rate"
            onClick={() => {
              railwayAudio.playBeep(600, 0.04);
              setChartMode('RATE_ONLY');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
              chartMode === 'RATE_ONLY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Rate (%)
          </button>
          <button
            type="button"
            id="btn-mode-volume"
            onClick={() => {
              railwayAudio.playBeep(600, 0.04);
              setChartMode('VOLUME_FLOW');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
              chartMode === 'VOLUME_FLOW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Volume (Blks)
          </button>
          <button
            type="button"
            id="btn-mode-combined"
            onClick={() => {
              railwayAudio.playBeep(600, 0.04);
              setChartMode('COMBINED');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
              chartMode === 'COMBINED'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Combined Matrix
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN CHART CONTAINER (RECHARTS OR D3.JS)
          ===================================================================== */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 relative overflow-hidden">
        {/* Chart Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">
              {department === 'ALL'
                ? 'All-Divisions Combined Approval Trend'
                : `${department} Specialized Request Approval Trend`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
              {engine === 'RECHARTS' ? 'RECHARTS SVG ENGINE' : 'D3.JS VECTOR ENGINE'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
              <span>Approval Rate (%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 border-dashed border-b border-amber-400 inline-block" />
              <span>Target Standard (85%)</span>
            </span>
            {chartMode !== 'RATE_ONLY' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 bg-emerald-500/40 border border-emerald-400 inline-block rounded-xs" />
                <span>Approved Blocks</span>
              </span>
            )}
          </div>
        </div>

        {/* ---------------- RENDERER 1: RECHARTS ENGINE ---------------- */}
        {engine === 'RECHARTS' && (
          <div
            id="recharts-approval-rate-container"
            data-testid="recharts-approval-rate-container"
            className="h-72 w-full pt-1"
          >
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'RATE_ONLY' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      railwayAudio.playBeep(800, 0.04);
                      setSelectedDay(e.activePayload[0].payload);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="recharts-approval-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={{ stroke: '#334155' }}
                    interval={horizon === 30 ? 2 : horizon === 14 ? 1 : 0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    domain={[65, 100]}
                    unit="%"
                    tickLine={{ stroke: '#334155' }}
                  />
                  <Tooltip content={<CustomRechartsTooltip />} />
                  <ReferenceLine
                    y={85}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Target Benchmark: 85%',
                      fill: '#fbbf24',
                      position: 'insideTopRight',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeRate"
                    name="Approval Rate (%)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#recharts-approval-gradient)"
                    dot={{ r: 3.5, fill: '#38bdf8', stroke: '#080d19', strokeWidth: 1.5 }}
                    activeDot={{ r: 7, fill: '#7dd3fc', stroke: '#0369a1', strokeWidth: 2, cursor: 'pointer' }}
                  />
                </AreaChart>
              ) : chartMode === 'VOLUME_FLOW' ? (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      railwayAudio.playBeep(800, 0.04);
                      setSelectedDay(e.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={10}
                    interval={horizon === 30 ? 2 : horizon === 14 ? 1 : 0}
                  />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 45]} unit=" blks" />
                  <Tooltip content={<CustomRechartsTooltip />} />
                  <Bar
                    dataKey="activeTotal"
                    name="Total Requested"
                    fill="#334155"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="activeApproved"
                    name="Approved Blocks"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeRate"
                    name="Approval Rate (%)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#38bdf8' }}
                  />
                </ComposedChart>
              ) : (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      railwayAudio.playBeep(800, 0.04);
                      setSelectedDay(e.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={10}
                    interval={horizon === 30 ? 2 : horizon === 14 ? 1 : 0}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#38bdf8"
                    fontSize={10}
                    domain={[65, 100]}
                    unit="%"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#34d399"
                    fontSize={10}
                    domain={[0, 45]}
                    unit=" blks"
                  />
                  <Tooltip content={<CustomRechartsTooltip />} />
                  <ReferenceLine
                    yAxisId="left"
                    y={85}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: '85% Benchmark', fill: '#fbbf24', fontSize: 10 }}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="activeApproved"
                    name="Approved Volume"
                    fill="#059669"
                    opacity={0.65}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="activeRate"
                    name="Approval Rate (%)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#38bdf8' }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* ---------------- RENDERER 2: D3.JS SVG ENGINE ---------------- */}
        {engine === 'D3' && (
          <div
            id="d3-approval-rate-container"
            data-testid="d3-approval-rate-container"
            ref={d3ContainerRef}
            className="w-full relative"
          >
            <svg ref={d3SvgRef} className="w-full overflow-visible" />

            {/* D3 Floating Tooltip Overlay */}
            {hoveredD3Day && tooltipPos && (
              <div
                className="pointer-events-none fixed z-50 bg-[#0b1329]/95 backdrop-blur-md p-3 rounded-xl border border-cyan-500/50 shadow-2xl text-xs font-mono max-w-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full -mt-3 text-slate-100"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-bold text-cyan-300">{hoveredD3Day.displayDate} 2026</span>
                  <span
                    className={`px-1 rounded text-[10px] font-bold ${
                      hoveredD3Day.activeRate >= 85
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {hoveredD3Day.activeRate >= 85 ? '✓ PASS' : '⚠ DEFICIT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approval Rate:</span>
                  <span className="font-bold text-sky-300 text-sm">{hoveredD3Day.activeRate}%</span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Approved: {hoveredD3Day.activeApproved}</span>
                  <span>Total: {hoveredD3Day.activeTotal}</span>
                </div>
                {hoveredD3Day.notableEvent && (
                  <div className="text-[10px] text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40">
                    {hoveredD3Day.notableEvent}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          SELECTED DAY DRILLDOWN INSPECTOR CARD
          ===================================================================== */}
      {selectedDay && (
        <div
          id="historical-selected-day-card"
          data-testid="historical-selected-day-card"
          className="bg-slate-900/90 p-4 rounded-xl border border-sky-900/60 shadow-inner space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-100 font-mono text-sm">
                Day {selectedDay.dayNumber} Focus: {selectedDay.displayDate} 2026 ({selectedDay.date})
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  selectedDay.approvalRate >= 85
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                {selectedDay.approvalRate >= 85
                  ? `EXCEEDS TARGET (+${(selectedDay.approvalRate - 85).toFixed(1)}%)`
                  : `BELOW BENCHMARK (-${(85 - selectedDay.approvalRate).toFixed(1)}%)`}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                Processed: <strong className="text-slate-200">{selectedDay.totalRequests}</strong>
              </span>
              <span className="text-emerald-400">
                Approved: <strong className="text-emerald-300">{selectedDay.approvedRequests}</strong>
              </span>
              <span className="text-rose-400">
                Deferred: <strong className="text-rose-300">{selectedDay.deferredRequests}</strong>
              </span>
            </div>
          </div>

          {/* Operational Log Highlight */}
          {selectedDay.notableEvent && (
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-xs font-mono text-sky-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sky-300">Operational Log Entry:</strong> {selectedDay.notableEvent}
              </div>
            </div>
          )}

          {/* 4 Corridors Daily Breakdown Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
            {Object.entries(selectedDay.corridorBreakdown).map(([cId, stats]: [string, { total: number; approved: number; rate: number }]) => {
              const isPass = stats.rate >= 85;
              return (
                <div
                  key={cId}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Corridor {cId}</span>
                    <span
                      className={`text-[10px] font-bold ${
                        isPass ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {stats.rate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Approved: {stats.approved}</span>
                    <span>Total: {stats.total}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isPass ? 'bg-sky-500' : 'bg-amber-500'}`}
                      style={{ width: `${stats.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Department Breakdown Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Civil Engineering:</span>
              <span className="font-bold text-sky-300">
                {selectedDay.engineering.approved}/{selectedDay.engineering.total} ({selectedDay.engineering.rate}%)
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Signaling & Telecom (S&T):</span>
              <span className="font-bold text-purple-300">
                {selectedDay.signaling.approved}/{selectedDay.signaling.total} ({selectedDay.signaling.rate}%)
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Traction / TRD:</span>
              <span className="font-bold text-emerald-300">
                {selectedDay.traction.approved}/{selectedDay.traction.total} ({selectedDay.traction.rate}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FOOTER INSIGHTS & ACTIONS
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs font-mono">
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>
            <strong>AI Auto-Optimization impact:</strong> Approval rate has climbed from an initial <strong>78.1%</strong> to <strong>94.1%</strong> over the 30-day window via shadow-block alignment.
          </span>
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigate && (
            <>
              <button
                type="button"
                id="btn-nav-to-requests"
                onClick={() => onNavigate('requests')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Submit New Block</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                id="btn-nav-to-ai-planning"
                onClick={() => onNavigate('ai_planning')}
                className="px-2.5 py-1 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>AI Planning Solver</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
