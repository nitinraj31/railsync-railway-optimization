import React, { useState, useMemo } from 'react';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Info,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { DailyForecastPoint, DeficitAlertThresholdSettings } from '../../types';

interface DailyResourceStrainHeatmapProps {
  forecastData: DailyForecastPoint[];
  selectedDayNumber?: number | null;
  onSelectDay: (point: DailyForecastPoint) => void;
  thresholdSettings?: DeficitAlertThresholdSettings;
}

export type HeatmapViewMode = 'STRIP' | 'CALENDAR';

export interface StrainInfo {
  score: number; // utilization percentage (e.g. 60 - 160)
  deficit: number;
  level: 'SAFE' | 'BALANCED' | 'TIGHT' | 'MILD_DEFICIT' | 'HIGH_DEFICIT' | 'CRITICAL_DEFICIT';
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  label: string;
  hexColor: string;
}

export function calculateDayStrain(
  point: DailyForecastPoint,
  thresholdSettings?: DeficitAlertThresholdSettings
): StrainInfo {
  const req = point.manpowerRequired;
  const avail = Math.max(1, point.manpowerAvailable);
  const score = Math.round((req / avail) * 100);
  const deficit = point.manpowerDeficit;

  const criticalCutoff = thresholdSettings?.manpowerCriticalThresholdPct || 15;
  const warningCutoff = thresholdSettings?.manpowerWarningThresholdPct || 8;

  // Level evaluation
  if (deficit >= criticalCutoff || score >= 125) {
    return {
      score,
      deficit,
      level: 'CRITICAL_DEFICIT',
      bgClass: 'bg-rose-950/90 hover:bg-rose-900',
      borderClass: 'border-rose-700/90 shadow-sm shadow-rose-950/80',
      textClass: 'text-rose-100',
      badgeBg: 'bg-rose-900 text-rose-200 border-rose-700',
      label: 'Critical Deficit',
      hexColor: '#881337', // Deep crimson red
    };
  }

  if (deficit >= warningCutoff || (deficit > 5 && score >= 110)) {
    return {
      score,
      deficit,
      level: 'HIGH_DEFICIT',
      bgClass: 'bg-red-800/80 hover:bg-red-750',
      borderClass: 'border-red-600/80 shadow-sm shadow-red-950/50',
      textClass: 'text-red-100',
      badgeBg: 'bg-red-900/80 text-red-200 border-red-700',
      label: 'High Deficit',
      hexColor: '#dc2626', // Bright red
    };
  }

  if (deficit > 0 || score > 100) {
    return {
      score,
      deficit,
      level: 'MILD_DEFICIT',
      bgClass: 'bg-orange-700/80 hover:bg-orange-650',
      borderClass: 'border-orange-500/80 shadow-sm shadow-orange-950/40',
      textClass: 'text-orange-100',
      badgeBg: 'bg-orange-900/80 text-orange-200 border-orange-700',
      label: 'Mild Deficit',
      hexColor: '#ea580c', // Orange
    };
  }

  if (score >= 92) {
    return {
      score,
      deficit: 0,
      level: 'TIGHT',
      bgClass: 'bg-amber-600/75 hover:bg-amber-500',
      borderClass: 'border-amber-400/80',
      textClass: 'text-amber-100',
      badgeBg: 'bg-amber-900/80 text-amber-200 border-amber-700',
      label: 'Near Capacity',
      hexColor: '#d97706', // Amber/Yellow
    };
  }

  if (score >= 80) {
    return {
      score,
      deficit: 0,
      level: 'BALANCED',
      bgClass: 'bg-lime-700/75 hover:bg-lime-600',
      borderClass: 'border-lime-500/80',
      textClass: 'text-lime-100',
      badgeBg: 'bg-lime-900/80 text-lime-200 border-lime-700',
      label: 'Balanced',
      hexColor: '#65a30d', // Lime Green
    };
  }

  return {
    score,
    deficit: 0,
    level: 'SAFE',
    bgClass: 'bg-emerald-700/75 hover:bg-emerald-600',
    borderClass: 'border-emerald-500/70',
    textClass: 'text-emerald-100',
    badgeBg: 'bg-emerald-900/80 text-emerald-200 border-emerald-700',
    label: 'Safe (Surplus)',
    hexColor: '#059669', // Deep Forest / Emerald Green
  };
}

export const DailyResourceStrainHeatmap: React.FC<DailyResourceStrainHeatmapProps> = ({
  forecastData,
  selectedDayNumber,
  onSelectDay,
  thresholdSettings,
}) => {
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('STRIP');
  const [hoveredDay, setHoveredDay] = useState<DailyForecastPoint | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'DEFICITS_ONLY'>('ALL');

  // Compute heatmap strain metrics for each day
  const strainMap = useMemo(() => {
    const map = new Map<number, StrainInfo>();
    forecastData.forEach((point) => {
      map.set(point.dayNumber, calculateDayStrain(point, thresholdSettings));
    });
    return map;
  }, [forecastData, thresholdSettings]);

  // Aggregate stats across the 30 days
  const summary = useMemo(() => {
    let safeCount = 0;
    let balancedCount = 0;
    let tightCount = 0;
    let deficitCount = 0;
    let criticalCount = 0;
    let peakDeficit = 0;
    let peakDay: DailyForecastPoint | null = null;
    let totalDemand = 0;
    let totalCapacity = 0;

    forecastData.forEach((p) => {
      const strain = strainMap.get(p.dayNumber);
      totalDemand += p.manpowerRequired;
      totalCapacity += p.manpowerAvailable;

      if (!strain) return;
      if (strain.level === 'SAFE') safeCount++;
      else if (strain.level === 'BALANCED') balancedCount++;
      else if (strain.level === 'TIGHT') tightCount++;
      else if (strain.level === 'MILD_DEFICIT') deficitCount++;
      else if (strain.level === 'HIGH_DEFICIT' || strain.level === 'CRITICAL_DEFICIT') {
        deficitCount++;
        criticalCount++;
      }

      if (p.manpowerDeficit > peakDeficit) {
        peakDeficit = p.manpowerDeficit;
        peakDay = p;
      }
    });

    const avgStrain = totalCapacity > 0 ? Math.round((totalDemand / totalCapacity) * 100) : 100;

    return {
      safeCount: safeCount + balancedCount,
      tightCount,
      deficitCount,
      criticalCount,
      peakDeficit,
      peakDay,
      avgStrain,
    };
  }, [forecastData, strainMap]);

  // Group days by 7-day weeks for calendar view
  const calendarWeeks = useMemo(() => {
    const weeks: DailyForecastPoint[][] = [];
    let currentWeek: DailyForecastPoint[] = [];

    forecastData.forEach((point, index) => {
      currentWeek.push(point);
      if (currentWeek.length === 7 || index === forecastData.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  }, [forecastData]);

  const displayedDays = useMemo(() => {
    if (filterSeverity === 'DEFICITS_ONLY') {
      return forecastData.filter((p) => p.manpowerDeficit > 0);
    }
    return forecastData;
  }, [forecastData, filterSeverity]);

  return (
    <div
      id="resource-strain-heatmap-container"
      className="bg-[#0b1226] p-4 rounded-xl border border-slate-800 shadow-lg text-xs font-sans text-slate-200 transition-all space-y-3.5"
    >
      {/* HEATMAP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-md bg-rose-950/80 text-rose-400 border border-rose-800">
              <Flame className="w-4 h-4 animate-pulse" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <span>30-Day Resource Strain Heatmap</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
              {forecastData.length} Day Horizon
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-mono text-[10px]">
              Network Avg Strain: {summary.avgStrain}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Daily operational pressure gradient reflecting manpower & machinery deficit intensity. Click any cell to inspect shift tasks & staffing shortfalls.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Jump to Peak Deficit */}
          {summary.peakDay && summary.peakDeficit > 0 && (
            <button
              onClick={() => {
                if (summary.peakDay) onSelectDay(summary.peakDay);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={`Jump to Day ${summary.peakDay.dayNumber} (-${summary.peakDeficit} staff)`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Peak: Day {summary.peakDay.dayNumber} (-{summary.peakDeficit})</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </button>
          )}

          {/* Filter: All vs Deficits Only */}
          <div className="inline-flex rounded-lg bg-[#070c1b] p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                filterSeverity === 'ALL'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (30D)
            </button>
            <button
              onClick={() => setFilterSeverity('DEFICITS_ONLY')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                filterSeverity === 'DEFICITS_ONLY'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Deficits ({summary.deficitCount})</span>
            </button>
          </div>

          {/* View Mode: Timeline Strip vs Calendar Weeks */}
          <div className="inline-flex rounded-lg bg-[#070c1b] p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('STRIP')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'STRIP'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline Strip
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'CALENDAR'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Grid
            </button>
          </div>
        </div>
      </div>

      {/* HEATMAP COLOR GRADIENT LEGEND BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#070c1b] border border-slate-800/80 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="font-semibold text-slate-300">Strain Intensity:</span>
          <span>Green (Safe)</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-rose-400 font-bold">Deep Red (Critical Deficit)</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Level 1: Safe */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#059669] border border-emerald-500/80 inline-block" />
            <span className="text-emerald-300">Safe (&lt;80%)</span>
          </div>

          {/* Level 2: Balanced */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#65a30d] border border-lime-500/80 inline-block" />
            <span className="text-lime-300">Balanced (80-91%)</span>
          </div>

          {/* Level 3: Near limit */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#d97706] border border-amber-400/80 inline-block" />
            <span className="text-amber-300">Tight (92-100%)</span>
          </div>

          {/* Level 4: Mild Deficit */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#ea580c] border border-orange-500/80 inline-block" />
            <span className="text-orange-300">Deficit (101-110%)</span>
          </div>

          {/* Level 5: High Deficit */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#dc2626] border border-red-500/80 inline-block" />
            <span className="text-red-300">High (-6 to -14)</span>
          </div>

          {/* Level 6: Critical */}
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-[#881337] border border-rose-600 inline-block" />
            <span className="text-rose-300 font-bold">Critical (-15+)</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: 30-DAY CONTINUOUS HORIZONTAL TIMELINE STRIP */}
      {viewMode === 'STRIP' && (
        <div className="relative">
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-30 gap-1.5 overflow-x-auto pb-1">
            {displayedDays.map((point) => {
              const strain = strainMap.get(point.dayNumber) || calculateDayStrain(point, thresholdSettings);
              const isSelected = selectedDayNumber === point.dayNumber;
              const isWeekend = point.dayOfWeek === 'Sat' || point.dayOfWeek === 'Sun';

              return (
                <button
                  key={point.dayNumber}
                  onClick={() => onSelectDay(point)}
                  onMouseEnter={() => setHoveredDay(point)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`group relative flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all duration-150 cursor-pointer min-w-[38px] h-20 ${
                    strain.bgClass
                  } ${strain.borderClass} ${
                    isSelected
                      ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0b1226] scale-105 z-20 shadow-lg shadow-sky-500/30'
                      : 'hover:scale-105 hover:z-10'
                  }`}
                  title={`Day ${point.dayNumber} (${point.displayDate}): ${strain.label} - Demand: ${point.manpowerRequired} / Avail: ${point.manpowerAvailable} (${strain.score}%)`}
                >
                  {/* Top: Day # & Weekday */}
                  <div className="w-full text-center">
                    <span className="text-[10px] font-mono font-bold block text-white/90 leading-tight">
                      D{point.dayNumber}
                    </span>
                    <span
                      className={`text-[8.5px] font-mono block leading-tight ${
                        isWeekend ? 'text-amber-200 font-bold' : 'text-slate-300/80'
                      }`}
                    >
                      {point.dayOfWeek}
                    </span>
                  </div>

                  {/* Middle: Deficit / Surplus Indicator */}
                  <div className="my-0.5 flex flex-col items-center justify-center">
                    {point.manpowerDeficit > 0 ? (
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/40 text-white flex items-center gap-0.5 shadow-sm">
                        -{point.manpowerDeficit}
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-mono text-emerald-100/90 font-medium">
                        ✓ OK
                      </span>
                    )}
                  </div>

                  {/* Bottom: Strain % */}
                  <div className="w-full text-center">
                    <span className="text-[8.5px] font-mono font-bold text-white/90 block leading-none">
                      {strain.score}%
                    </span>
                  </div>

                  {/* Critical pulse beacon on high deficit */}
                  {strain.level === 'CRITICAL_DEFICIT' && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping opacity-75" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: 5-WEEK CALENDAR GRID VIEW */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-2">
          {calendarWeeks.map((week, wIdx) => {
            const weekDemand = week.reduce((acc, d) => acc + d.manpowerRequired, 0);
            const weekCapacity = week.reduce((acc, d) => acc + d.manpowerAvailable, 0);
            const weekDeficit = week.reduce((acc, d) => acc + d.manpowerDeficit, 0);
            const weekStrain = weekCapacity > 0 ? Math.round((weekDemand / weekCapacity) * 100) : 100;

            return (
              <div
                key={wIdx}
                className="p-2.5 rounded-lg bg-[#070c1b] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Week Label & Summary */}
                <div className="min-w-[140px] space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-slate-200">
                      Week {wIdx + 1}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (D{week[0].dayNumber} - D{week[week.length - 1].dayNumber})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-slate-400">Strain: {weekStrain}%</span>
                    {weekDeficit > 0 ? (
                      <span className="text-rose-400 font-bold">-{weekDeficit} deficit</span>
                    ) : (
                      <span className="text-emerald-400">Balanced</span>
                    )}
                  </div>
                </div>

                {/* Day Blocks in Week */}
                <div className="grid grid-cols-7 gap-2 flex-1">
                  {week.map((point) => {
                    const strain = strainMap.get(point.dayNumber) || calculateDayStrain(point, thresholdSettings);
                    const isSelected = selectedDayNumber === point.dayNumber;
                    const isWeekend = point.dayOfWeek === 'Sat' || point.dayOfWeek === 'Sun';

                    return (
                      <button
                        key={point.dayNumber}
                        onClick={() => onSelectDay(point)}
                        onMouseEnter={() => setHoveredDay(point)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between h-16 ${
                          strain.bgClass
                        } ${strain.borderClass} ${
                          isSelected
                            ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#070c1b] scale-105 z-10 shadow-lg'
                            : 'hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono w-full">
                          <span className="font-bold text-white">D{point.dayNumber}</span>
                          <span className={isWeekend ? 'text-amber-200 font-bold text-[9px]' : 'text-slate-300 text-[9px]'}>
                            {point.dayOfWeek}
                          </span>
                        </div>

                        <div className="text-center my-0.5">
                          {point.manpowerDeficit > 0 ? (
                            <span className="text-[10px] font-mono font-bold text-white bg-black/30 px-1 rounded">
                              -{point.manpowerDeficit} staff
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-emerald-200">
                              Surplus +{point.manpowerAvailable - point.manpowerRequired}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-white/80">
                          <span>{point.displayDate}</span>
                          <span className="font-bold">{strain.score}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HOVER / ACTIVE DAY INTEL STRIP */}
      {hoveredDay ? (
        <div className="p-2.5 rounded-lg bg-[#070d1e] border border-sky-600/70 flex items-center justify-between flex-wrap gap-2 text-xs font-mono animate-in fade-in duration-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Day {hoveredDay.dayNumber}: {hoveredDay.displayDate} ({hoveredDay.dayOfWeek})
              </span>
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                hoveredDay.manpowerDeficit > 0
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {hoveredDay.manpowerDeficit > 0
                ? `Deficit: -${hoveredDay.manpowerDeficit} Staff`
                : 'Capacity Balanced'}
            </span>

            <span className="text-slate-400 text-[11px]">
              Demand: <strong className="text-sky-300">{hoveredDay.manpowerRequired}</strong> / Available:{' '}
              <strong className="text-emerald-300">{hoveredDay.manpowerAvailable}</strong> staff
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">
              Primary Driver: <strong className="text-amber-300">{hoveredDay.primaryAgingDriver.split('(')[0]}</strong>
            </span>
            <span className="text-sky-400 underline font-sans flex items-center gap-0.5">
              <span>Click cell for task breakdown</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>
              <strong>Heatmap Guidance:</strong> Red and crimson clusters indicate multi-gang possession congestion requiring advance contractor augmentation or shift staggering.
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">
            {summary.safeCount} Safe Days · {summary.tightCount} Tight Days · {summary.deficitCount} Deficit Days
          </span>
        </div>
      )}
    </div>
  );
};
