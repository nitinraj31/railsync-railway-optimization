import React, { useState, useRef, useEffect, useId } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  Target,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { railwayAudio } from '../../services/railwayAudio';

export interface DailyTrendPoint {
  dayOffset: number; // e.g. -6 to 0
  dayName: string; // e.g. "D-6", "Mon", "Oct 06"
  dateFormatted: string; // e.g. "06 Oct 2026"
  isToday?: boolean;
  value: number; // score percentage e.g. 85.4
  deltaVsPrev?: number; // delta e.g. +0.8 or -0.5
  statusNote: string; // operational event e.g. "Track tamped at C002"
}

export interface KpiTrendSparklineTooltipProps {
  id?: string;
  metricLabel: string;
  currentValue: number;
  unit?: string;
  benchmarkValue?: number;
  benchmarkLabel?: string;
  colorScheme: 'sky' | 'emerald';
  trendBadgeText: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  dataPoints: DailyTrendPoint[];
  triggerPosition?: 'badge' | 'icon' | 'compact';
  customTrigger?: React.ReactNode;
}

export const KpiTrendSparklineTooltip: React.FC<KpiTrendSparklineTooltipProps> = ({
  id,
  metricLabel,
  currentValue,
  unit = '%',
  benchmarkValue = 85,
  benchmarkLabel = 'Target Ceiling',
  colorScheme = 'sky',
  trendBadgeText,
  trendDirection = 'up',
  dataPoints,
  triggerPosition = 'badge',
  customTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();

  // Colors based on scheme
  const isSky = colorScheme === 'sky';
  const primaryStroke = isSky ? '#38bdf8' : '#34d399'; // sky-400 vs emerald-400
  const gradientId = `sparkline-grad-${uniqueId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Default active point is the latest day (Today)
  const activeIndex = hoveredPointIndex !== null ? hoveredPointIndex : dataPoints.length - 1;
  const activePoint = dataPoints[activeIndex] || dataPoints[dataPoints.length - 1];

  // Derived 7-day stats
  const values = dataPoints.map((p) => p.value);
  const sevenDayAvg = Number((values.reduce((s, v) => s + v, 0) / (values.length || 1)).toFixed(1));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const netDelta = Number((values[values.length - 1] - values[0]).toFixed(1));

  // Sparkline coordinates
  const svgWidth = 290;
  const svgHeight = 76;
  const padding = { top: 12, bottom: 22, left: 16, right: 16 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Scaling with extra head/foot room
  const valMargin = Math.max(1.5, (maxVal - minVal) * 0.25);
  const yDomainMin = Math.max(0, minVal - valMargin);
  const yDomainMax = Math.min(100, maxVal + valMargin);
  const yDomainSpan = Math.max(0.1, yDomainMax - yDomainMin);

  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (dataPoints.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const norm = (val - yDomainMin) / yDomainSpan;
    return padding.top + (1 - norm) * plotHeight;
  };

  // Build SVG polyline and area path
  const points = dataPoints.map((p, idx) => ({
    x: getX(idx),
    y: getY(p.value),
    point: p,
    idx,
  }));

  const linePathD = points.length > 0
    ? `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`
    : '';

  const areaPathD = points.length > 0
    ? `M ${points[0].x.toFixed(1)} ${svgHeight - padding.bottom} L ${points
        .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' L ')} L ${points[points.length - 1].x.toFixed(1)} ${svgHeight - padding.bottom} Z`
    : '';

  // Benchmark reference line Y position
  const benchmarkY = benchmarkValue ? getY(benchmarkValue) : null;

  // Handlers for hover & click
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setHoveredPointIndex(null);
    }, 220);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    railwayAudio.playBeep(780, 0.03);
    if (!isOpen) {
      setIsOpen(true);
      setIsPinned(true);
    } else if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      setIsPinned(true);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    railwayAudio.playBeep(650, 0.03);
    setIsPinned(false);
    setIsOpen(false);
    setHoveredPointIndex(null);
  };

  // Close on outside click when pinned
  useEffect(() => {
    if (!isPinned && !isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsPinned(false);
        setIsOpen(false);
        setHoveredPointIndex(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isPinned, isOpen]);

  return (
    <div
      ref={tooltipRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {/* TRIGGER BUTTON / BADGE */}
      {customTrigger ? (
        <div onClick={handleToggleClick} className="cursor-pointer">
          {customTrigger}
        </div>
      ) : (
        <button
          type="button"
          id={id ? `${id}-trigger` : undefined}
          onClick={handleToggleClick}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Interactive 7-day trend breakdown and sparkline for ${metricLabel}`}
          className={`group/btn relative text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
            isSky
              ? 'bg-sky-950/80 hover:bg-sky-900/90 text-sky-300 border-sky-700/60 hover:border-sky-400/80 shadow-sm'
              : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-700/60 hover:border-emerald-400/80 shadow-sm'
          } ${isOpen ? 'ring-1 ring-sky-400 shadow-md' : ''}`}
          title="Click or hover to inspect interactive 7-day trend sparkline"
        >
          {trendDirection === 'up' ? (
            <TrendingUp className={`w-3 h-3 ${isSky ? 'text-sky-400' : 'text-emerald-400'}`} />
          ) : trendDirection === 'down' ? (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          ) : (
            <Activity className="w-3 h-3 text-cyan-400" />
          )}

          <span>{trendBadgeText}</span>

          {/* Mini Sparkline Hint Icon */}
          <span
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
              isOpen
                ? 'bg-sky-500 text-slate-950 font-black'
                : 'bg-slate-800 text-slate-300 group-hover/btn:bg-slate-700'
            }`}
          >
            ~
          </span>
        </button>
      )}

      {/* INTERACTIVE TOOLTIP FLYOUT CONTAINER */}
      {isOpen && (
        <div
          role="tooltip"
          id={id ? `${id}-tooltip` : undefined}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute z-50 top-full right-0 sm:left-0 sm:right-auto mt-2 w-[310px] sm:w-[330px] p-3.5 rounded-xl bg-[#070e20]/95 backdrop-blur-md border border-sky-500/50 shadow-2xl shadow-slate-950/90 text-left text-slate-200 transition-all animate-in fade-in zoom-in-95 duration-150"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Subtle Tooltip Top Indicator Arrow */}
          <div className="absolute -top-1.5 right-6 sm:left-6 sm:right-auto w-3 h-3 rotate-45 bg-[#070e20] border-t border-l border-sky-500/50" />

          {/* Tooltip Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/90">
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  isSky ? 'bg-sky-950 text-sky-400 border border-sky-700/60' : 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  7-Day Trend Breakdown
                </div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{metricLabel}</span>
                  {isPinned && (
                    <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-300 text-[9px] font-mono border border-amber-800/60">
                      PINNED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
                title="Close sparkline breakdown"
                aria-label="Close tooltip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sparkline Canvas / SVG Area */}
          <div className="bg-[#040814] rounded-lg p-2 border border-slate-800/80 mb-2.5 relative">
            {/* Header info in sparkline canvas */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Past 7 Days Telemetry</span>
              </span>
              <span className="text-[9px] text-slate-500">
                Hover point to inspect
              </span>
            </div>

            {/* SVG Sparkline */}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[76px] overflow-visible select-none"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryStroke} stopOpacity="0.4" />
                  <stop offset="85%" stopColor={primaryStroke} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={primaryStroke} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Benchmark Reference Line */}
              {benchmarkY !== null && benchmarkY >= padding.top && benchmarkY <= svgHeight - padding.bottom && (
                <g>
                  <line
                    x1={padding.left}
                    y1={benchmarkY}
                    x2={svgWidth - padding.right}
                    y2={benchmarkY}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={svgWidth - padding.right}
                    y={benchmarkY - 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {benchmarkLabel} ({benchmarkValue}{unit})
                  </text>
                </g>
              )}

              {/* Area fill */}
              {areaPathD && (
                <path d={areaPathD} fill={`url(#${gradientId})`} />
              )}

              {/* Main sparkline path */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke={primaryStroke}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Baseline axis line */}
              <line
                x1={padding.left}
                y1={svgHeight - padding.bottom}
                x2={svgWidth - padding.right}
                y2={svgHeight - padding.bottom}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Data points and hover zones */}
              {points.map((p, idx) => {
                const isSelected = idx === activeIndex;
                const isToday = p.point.isToday;

                return (
                  <g key={idx}>
                    {/* Vertical guideline on hover */}
                    {isSelected && (
                      <line
                        x1={p.x}
                        y1={padding.top}
                        x2={p.x}
                        y2={svgHeight - padding.bottom}
                        stroke={primaryStroke}
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                        strokeOpacity="0.8"
                      />
                    )}

                    {/* Outer glowing ring for hovered point */}
                    {isSelected && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="7"
                        fill="none"
                        stroke={primaryStroke}
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Center point dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 4.5 : isToday ? 3.5 : 2.5}
                      fill={isSelected ? '#ffffff' : primaryStroke}
                      stroke={isSelected ? primaryStroke : '#040814'}
                      strokeWidth={isSelected ? '2' : '1'}
                      className="transition-all duration-150"
                    />

                    {/* Day label text beneath baseline */}
                    <text
                      x={p.x}
                      y={svgHeight - 6}
                      textAnchor="middle"
                      fill={isSelected ? '#f8fafc' : isToday ? primaryStroke : '#64748b'}
                      fontSize="8"
                      fontWeight={isSelected || isToday ? 'bold' : 'normal'}
                      fontFamily="monospace"
                    >
                      {p.point.dayName}
                    </text>

                    {/* Invisible large hover hit target */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="14"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        railwayAudio.playBeep(920, 0.015);
                        setHoveredPointIndex(idx);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredPointIndex(idx);
                        setIsPinned(true);
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ACTIVE / HOVERED DAY CALLOUT */}
          {activePoint && (
            <div
              className={`p-2.5 rounded-lg border mb-2.5 transition-all ${
                isSky
                  ? 'bg-sky-950/50 border-sky-800/60'
                  : 'bg-emerald-950/50 border-emerald-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isSky ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                  <span>{activePoint.dateFormatted}</span>
                  {activePoint.isToday && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-900/80 text-sky-200 border border-sky-600/60">
                      TODAY
                    </span>
                  )}
                </span>
                <span className="text-sm font-black font-mono text-white">
                  {activePoint.value}{unit}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="truncate pr-2 text-slate-300 text-[10.5px]">
                  {activePoint.statusNote}
                </span>
                {activePoint.deltaVsPrev !== undefined && (
                  <span
                    className={`shrink-0 font-bold ${
                      activePoint.deltaVsPrev > 0
                        ? 'text-emerald-400'
                        : activePoint.deltaVsPrev < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {activePoint.deltaVsPrev > 0 ? `+${activePoint.deltaVsPrev}%` : `${activePoint.deltaVsPrev}%`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 7-DAY SUMMARY KPI METRICS GRID */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono mb-2">
            <div className="bg-slate-900/90 rounded-md p-1.5 border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">7D Average</div>
              <div className="text-xs font-bold text-slate-100">{sevenDayAvg}{unit}</div>
            </div>
            <div className="bg-slate-900/90 rounded-md p-1.5 border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">7D Range</div>
              <div className="text-xs font-bold text-slate-100">
                {minVal}–{maxVal}{unit}
              </div>
            </div>
            <div className="bg-slate-900/90 rounded-md p-1.5 border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">Net 7D Gain</div>
              <div
                className={`text-xs font-bold ${
                  netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netDelta >= 0 ? `+${netDelta}%` : `${netDelta}%`}
              </div>
            </div>
          </div>

          {/* MINI DAY SELECTOR PILLS */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
            {dataPoints.map((p, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    railwayAudio.playBeep(880, 0.02);
                    setHoveredPointIndex(idx);
                    setIsPinned(true);
                  }}
                  className={`flex-1 py-1 rounded text-[9px] font-mono text-center transition-all cursor-pointer ${
                    isSelected
                      ? isSky
                        ? 'bg-sky-500 text-slate-950 font-black shadow-sm'
                        : 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title={`${p.dateFormatted}: ${p.value}${unit}`}
                >
                  {p.dayName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
