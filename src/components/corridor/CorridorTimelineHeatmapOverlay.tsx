import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Wrench,
  Clock,
  Sparkles,
  Layers,
  Sliders,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Info,
  CheckCircle2,
  Calendar,
  Compass,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  CorridorConflictIntensity,
  CorridorHeatmapMetrics,
  HourlyHeatmapCell,
  TimelineHeatmapMode,
  TimelineHeatmapSummary,
  getTierVisuals,
} from '../../services/corridorTimelineHeatmapService';
import { railwayAudio } from '../../services/railwayAudio';

export interface CorridorTimelineHeatmapControlBarProps {
  summary: TimelineHeatmapSummary;
  mode: TimelineHeatmapMode;
  onModeChange: (mode: TimelineHeatmapMode) => void;
  intensity: 'SUBTLE' | 'STANDARD' | 'VIVID';
  onIntensityChange: (intensity: 'SUBTLE' | 'STANDARD' | 'VIVID') => void;
  filterCriticalOnly?: boolean;
  onToggleFilterCritical?: () => void;
  selectedIntensities?: CorridorConflictIntensity[];
  onToggleIntensity?: (intensity: CorridorConflictIntensity) => void;
  onSelectAllIntensities?: () => void;
  onClearAllIntensities?: () => void;
  visibleCorridorsCount?: number;
  onSelectCorridorFocus?: (corridorId: string) => void;
  onOpenInspectorForCorridor?: (metrics: CorridorHeatmapMetrics) => void;
  onResolveAllNonCritical?: () => Promise<void> | void;
  isResolvingNonCritical?: boolean;
}

/**
 * Top HUD Control Bar for the Corridor Heatmap Overlay
 */
export const CorridorTimelineHeatmapControlBar: React.FC<CorridorTimelineHeatmapControlBarProps> = ({
  summary,
  mode,
  onModeChange,
  intensity,
  onIntensityChange,
  filterCriticalOnly = false,
  onToggleFilterCritical,
  selectedIntensities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  onToggleIntensity = (_intensity: CorridorConflictIntensity) => {},
  onSelectAllIntensities = () => {},
  onClearAllIntensities = () => {},
  visibleCorridorsCount,
  onSelectCorridorFocus,
  onOpenInspectorForCorridor,
  onResolveAllNonCritical,
  isResolvingNonCritical = false,
}) => {
  return (
    <div
      id="corridor-timeline-heatmap-hud"
      className="bg-gradient-to-r from-slate-950 via-[#0a1226] to-slate-950 p-3.5 rounded-xl border border-sky-900/60 shadow-lg space-y-3 font-mono text-xs animate-in fade-in duration-200"
    >
      {/* Top row: Title, Mode Toggles, and Quick Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-600/80 text-rose-300 font-bold tracking-wide shadow-sm shadow-rose-950/40">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-[11px] uppercase">Corridor Heatmap Overlay Active</span>
          </div>

          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Highlighting corridors with high conflict frequency &amp; pending unresolved maintenance requests.
          </span>
        </div>

        {/* Mode Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            Heatmap Focus:
          </span>
          <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                onModeChange('COMBINED');
                try {
                  railwayAudio.playBeep(720, 0.04);
                } catch {}
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'COMBINED'
                  ? 'bg-gradient-to-r from-rose-900/90 to-amber-900/90 text-white shadow-sm border border-rose-500/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Combined weighted risk: 60% conflict frequency + 40% maintenance backlog"
            >
              <Activity className="w-3 h-3 text-rose-400" />
              <span>Combined Risk</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onModeChange('CONFLICTS');
                try {
                  railwayAudio.playBeep(750, 0.04);
                } catch {}
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'CONFLICTS'
                  ? 'bg-rose-900 text-white shadow-sm border border-rose-500/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus strictly on train/block conflicts and overlap hotspots"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Conflict Hotspots</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onModeChange('MAINTENANCE_BACKLOG');
                try {
                  railwayAudio.playBeep(700, 0.04);
                } catch {}
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'MAINTENANCE_BACKLOG'
                  ? 'bg-amber-900 text-white shadow-sm border border-amber-500/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus strictly on unresolved maintenance requests & pending work orders"
            >
              <Wrench className="w-3 h-3 text-amber-400" />
              <span>Maintenance Backlog</span>
            </button>
          </div>

          {/* Visual Intensity Control */}
          <div className="flex items-center gap-1 pl-1">
            <span className="text-slate-400 text-[10px] uppercase">Glow:</span>
            <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-slate-700/80 text-[10px]">
              <button
                type="button"
                onClick={() => onIntensityChange('SUBTLE')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  intensity === 'SUBTLE'
                    ? 'bg-slate-700 text-sky-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Subtle
              </button>
              <button
                type="button"
                onClick={() => onIntensityChange('STANDARD')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  intensity === 'STANDARD'
                    ? 'bg-slate-700 text-sky-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => onIntensityChange('VIVID')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  intensity === 'VIVID'
                    ? 'bg-rose-900 text-rose-200 font-bold shadow-sm shadow-rose-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vivid Glow
              </button>
            </div>
          </div>

          {/* Filter Critical Only */}
          <button
            type="button"
            onClick={onToggleFilterCritical}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterCriticalOnly
                ? 'bg-rose-950 border-rose-500 text-rose-300 ring-1 ring-rose-400'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>{filterCriticalOnly ? 'Critical Only: ON' : 'Filter Critical'}</span>
          </button>
        </div>
      </div>

      {/* Middle row: Live Heatmap Network KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Critical / High Corridors</span>
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              {summary.criticalCorridorsCount + summary.highCorridorsCount} of {summary.totalCorridors} Corridors
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-black">
            {summary.criticalCorridorsCount} CRIT
          </span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Open Conflict Overlaps</span>
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {summary.totalOpenConflicts} Active Conflicts
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-black">
            {summary.totalCriticalConflicts} P1
          </span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Unresolved Maintenance</span>
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-sky-400" />
              {summary.totalPendingRequests} Pending Requests
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-black">
            {summary.totalCriticalPendingRequests} CRIT
          </span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Peak Congestion Window</span>
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              {summary.peakCongestionWindow}
            </span>
          </div>
          {summary.highestRiskCorridorId && (
            <button
              type="button"
              onClick={() => {
                const metric = summary.metricsByCorridor[summary.highestRiskCorridorId];
                if (metric && onOpenInspectorForCorridor) {
                  onOpenInspectorForCorridor(metric);
                } else if (onSelectCorridorFocus) {
                  onSelectCorridorFocus(summary.highestRiskCorridorId);
                }
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600 cursor-pointer flex items-center gap-0.5 font-bold"
              title="Inspect highest risk corridor"
            >
              <span>{summary.highestRiskCorridorId}</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Dynamic Heatmap Gradient Scale Bar, Interactive Conflict Intensity Checkboxes & Resolve All Non-Critical Action */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Continuous gradient strip & Scale title */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 uppercase flex items-center gap-1">
              <Sliders className="w-3 h-3 text-sky-400" />
              <span>Risk Scale:</span>
            </span>
            <div className="flex items-center gap-1.5" title="Continuous Corridor Heatmap Risk Scale (0% Nominal to 100% Critical Hotspot)">
              <span className="text-[9px] text-slate-500 font-mono">0%</span>
              <div className="h-2 w-16 sm:w-24 rounded-full bg-gradient-to-r from-emerald-600 via-amber-500 to-rose-600 shadow-inner"></div>
              <span className="text-[9px] text-slate-500 font-mono">100%</span>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Interactive Checkboxes for Filtering Corridors by Conflict Intensity */}
          <div className="flex items-center gap-1.5 flex-wrap" id="corridor-intensity-checkbox-group">
            <span className="font-bold text-slate-300 uppercase text-[10px] flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-amber-400" />
              <span>Filter Conflict Intensity:</span>
            </span>

            {/* CRITICAL Checkbox */}
            <label
              htmlFor="filter-checkbox-critical"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono cursor-pointer transition-all select-none ${
                selectedIntensities.includes('CRITICAL')
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-400 shadow-sm shadow-rose-950/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
              title="Filter corridors with CRITICAL conflict intensity (critical train/block overlaps or ≥70 risk score)"
            >
              <input
                type="checkbox"
                id="filter-checkbox-critical"
                name="intensity-filter-critical"
                checked={selectedIntensities.includes('CRITICAL')}
                onChange={() => onToggleIntensity('CRITICAL')}
                className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
              />
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-1 ring-rose-300"></span>
              <span className="font-bold tracking-tight">CRITICAL</span>
              <span className="text-[9px] opacity-75 hidden 2xl:inline">(70–100%)</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                  selectedIntensities.includes('CRITICAL')
                    ? 'bg-rose-900 text-rose-100 border border-rose-600'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title={`${summary.corridorCountByIntensity?.CRITICAL ?? summary.criticalCorridorsCount} corridor(s)`}
              >
                {summary.corridorCountByIntensity?.CRITICAL ?? summary.criticalCorridorsCount}
              </span>
            </label>

            {/* HIGH Checkbox */}
            <label
              htmlFor="filter-checkbox-high"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono cursor-pointer transition-all select-none ${
                selectedIntensities.includes('HIGH')
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-400 shadow-sm shadow-amber-950/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
              title="Filter corridors with HIGH conflict intensity (high strain or 45–69 risk score)"
            >
              <input
                type="checkbox"
                id="filter-checkbox-high"
                name="intensity-filter-high"
                checked={selectedIntensities.includes('HIGH')}
                onChange={() => onToggleIntensity('HIGH')}
                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
              />
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="font-bold tracking-tight">HIGH</span>
              <span className="text-[9px] opacity-75 hidden 2xl:inline">(45–69%)</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                  selectedIntensities.includes('HIGH')
                    ? 'bg-amber-900 text-amber-100 border border-amber-600'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title={`${summary.corridorCountByIntensity?.HIGH ?? summary.highCorridorsCount} corridor(s)`}
              >
                {summary.corridorCountByIntensity?.HIGH ?? summary.highCorridorsCount}
              </span>
            </label>

            {/* MEDIUM Checkbox */}
            <label
              htmlFor="filter-checkbox-medium"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono cursor-pointer transition-all select-none ${
                selectedIntensities.includes('MEDIUM')
                  ? 'bg-yellow-950/80 border-yellow-500 text-yellow-200 ring-1 ring-yellow-400 shadow-sm shadow-yellow-950/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
              title="Filter corridors with MEDIUM conflict intensity (medium pressure or 20–44 risk score)"
            >
              <input
                type="checkbox"
                id="filter-checkbox-medium"
                name="intensity-filter-medium"
                checked={selectedIntensities.includes('MEDIUM')}
                onChange={() => onToggleIntensity('MEDIUM')}
                className="w-3.5 h-3.5 rounded accent-yellow-500 cursor-pointer"
              />
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="font-bold tracking-tight">MEDIUM</span>
              <span className="text-[9px] opacity-75 hidden 2xl:inline">(20–44%)</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                  selectedIntensities.includes('MEDIUM')
                    ? 'bg-yellow-900 text-yellow-100 border border-yellow-600'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title={`${summary.corridorCountByIntensity?.MEDIUM ?? summary.mediumCorridorsCount ?? 0} corridor(s)`}
              >
                {summary.corridorCountByIntensity?.MEDIUM ?? summary.mediumCorridorsCount ?? 0}
              </span>
            </label>

            {/* LOW Checkbox */}
            <label
              htmlFor="filter-checkbox-low"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono cursor-pointer transition-all select-none ${
                selectedIntensities.includes('LOW')
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-400 shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
              title="Filter corridors with LOW conflict intensity (nominal traffic or 0–19 risk score)"
            >
              <input
                type="checkbox"
                id="filter-checkbox-low"
                name="intensity-filter-low"
                checked={selectedIntensities.includes('LOW')}
                onChange={() => onToggleIntensity('LOW')}
                className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold tracking-tight">LOW</span>
              <span className="text-[9px] opacity-75 hidden 2xl:inline">(0–19%)</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                  selectedIntensities.includes('LOW')
                    ? 'bg-emerald-900 text-emerald-100 border border-emerald-600'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title={`${summary.corridorCountByIntensity?.LOW ?? summary.lowCorridorsCount} corridor(s)`}
              >
                {summary.corridorCountByIntensity?.LOW ?? summary.lowCorridorsCount}
              </span>
            </label>

            {/* Quick Actions: All / Reset */}
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                id="filter-intensity-all-btn"
                onClick={onSelectAllIntensities}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono cursor-pointer transition-colors"
                title="Select all conflict intensity tiers"
              >
                All
              </button>
              <button
                type="button"
                id="filter-intensity-clear-btn"
                onClick={onClearAllIntensities}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-[10px] font-mono cursor-pointer transition-colors"
                title="Deselect all conflict intensity tiers"
              >
                Clear
              </button>
            </div>

            {/* Active filter status pill */}
            {selectedIntensities.length < 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700 font-bold animate-in fade-in flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                <span>
                  Filtered: {visibleCorridorsCount ?? '?'} of {summary.totalCorridors} Corridors
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Resolve All Non-Critical */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-[10px] text-slate-400 hidden 2xl:inline italic">
            💡 Click any corridor risk chip or hourly cell to inspect.
          </div>

          <button
            type="button"
            id="resolve-all-non-critical-btn"
            onClick={onResolveAllNonCritical}
            disabled={isResolvingNonCritical || summary.totalNonCriticalOpenConflicts === 0}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              summary.totalNonCriticalOpenConflicts > 0
                ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] active:scale-95'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title={
              summary.totalNonCriticalOpenConflicts > 0
                ? `Automatically accept AI-proposed schedule offsets for all ${summary.totalNonCriticalOpenConflicts} open conflict(s) marked as 'MEDIUM' or 'LOW' priority`
                : "No open Medium or Low priority conflicts to resolve"
            }
          >
            <Sparkles className={`w-3.5 h-3.5 text-emerald-300 ${isResolvingNonCritical ? 'animate-spin' : ''}`} />
            <span>{isResolvingNonCritical ? 'Applying AI Offsets...' : 'Resolve All Non-Critical'}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                summary.totalNonCriticalOpenConflicts > 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {summary.totalNonCriticalOpenConflicts}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface CorridorHourlyHeatmapRibbonProps {
  metrics: CorridorHeatmapMetrics;
  mode: TimelineHeatmapMode;
  intensity: 'SUBTLE' | 'STANDARD' | 'VIVID';
  onCellClick?: (cell: HourlyHeatmapCell, metrics: CorridorHeatmapMetrics) => void;
}

/**
 * 12-Hour Chronological Heatmap Ribbon for a specific corridor row, aligned with 08:00 – 20:00 ruler
 */
export const CorridorHourlyHeatmapRibbon: React.FC<CorridorHourlyHeatmapRibbonProps> = ({
  metrics,
  mode,
  intensity,
  onCellClick,
}) => {
  const [hoveredCell, setHoveredCell] = useState<HourlyHeatmapCell | null>(null);

  return (
    <div className="flex items-center text-xs relative">
      <div className="w-44 font-mono text-[10px] text-rose-300 font-semibold flex items-center justify-between pr-2 shrink-0 pl-1">
        <div className="flex items-center gap-1.5 truncate">
          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">Risk Heatmap</span>
        </div>
        <span
          className={`text-[9px] px-1 py-0.2 rounded border font-mono font-bold ${
            metrics.riskTier === 'CRITICAL'
              ? 'bg-rose-950 text-rose-300 border-rose-700'
              : metrics.riskTier === 'HIGH'
              ? 'bg-amber-950 text-amber-300 border-amber-700'
              : metrics.riskTier === 'MODERATE'
              ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}
        >
          {metrics.compositeRiskScore}%
        </span>
      </div>

      {/* 12-Hour Grid Cells aligned exactly with timeline columns (8:00 to 20:00) */}
      <div className="flex-1 relative h-6 rounded border border-slate-800 bg-slate-950/90 overflow-hidden flex divide-x divide-slate-800/80">
        {metrics.hourlyCells.map((cell) => {
          const hasConflict = cell.conflictCount > 0;
          const hasPending = cell.pendingRequestCount > 0;
          const isCritical = cell.tier === 'CRITICAL';
          const isHigh = cell.tier === 'HIGH';

          return (
            <div
              key={cell.hour}
              onClick={() => {
                if (onCellClick) onCellClick(cell, metrics);
              }}
              onMouseEnter={() => setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
              className={`flex-1 h-full transition-all cursor-pointer relative flex items-center justify-center font-mono text-[9px] select-none ${cell.colorClass} ${
                isCritical && intensity === 'VIVID' ? 'animate-pulse' : ''
              } ${hoveredCell?.hour === cell.hour ? 'ring-2 ring-white z-20 scale-[1.05]' : ''}`}
              title={cell.summaryTooltip}
            >
              {/* Badges or Strain Value */}
              <div className="flex items-center gap-0.5 px-0.5 truncate pointer-events-none">
                {hasConflict ? (
                  <span className="flex items-center text-white font-black drop-shadow-sm">
                    <span className="text-[8px] mr-0.5">⚡</span>
                    {cell.conflictCount}
                  </span>
                ) : hasPending ? (
                  <span className="flex items-center text-slate-100 font-bold opacity-90">
                    <span className="text-[8px] mr-0.5">🔧</span>
                    {cell.pendingRequestCount}
                  </span>
                ) : cell.scheduledBlocksCount > 0 ? (
                  <span className="text-[8px] text-slate-300/80">
                    {cell.scheduledBlocksCount}b
                  </span>
                ) : (
                  <span className="text-[8px] opacity-30 text-slate-400">·</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Tooltip during Hover */}
      {hoveredCell && (
        <div className="absolute top-7 left-44 z-30 bg-slate-950/95 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 font-mono shadow-xl max-w-sm pointer-events-none animate-in fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-bold">
            <span className="text-sky-300">{hoveredCell.timeRange} Window</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] ${
                hoveredCell.tier === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                  : hoveredCell.tier === 'HIGH'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : hoveredCell.tier === 'MODERATE'
                  ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              Strain: {hoveredCell.strainScore}% ({hoveredCell.tier})
            </span>
          </div>
          <div className="mt-1 space-y-0.5 text-[9px]">
            <div>
              Active Conflicts:{' '}
              <strong className={hoveredCell.conflictCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
                {hoveredCell.conflictCount} ({hoveredCell.criticalConflictCount} Critical)
              </strong>
            </div>
            <div>
              Pending Requests:{' '}
              <strong className={hoveredCell.pendingRequestCount > 0 ? 'text-amber-400' : 'text-slate-400'}>
                {hoveredCell.pendingRequestCount} ({hoveredCell.criticalPendingCount} Critical)
              </strong>
            </div>
            <div>
              Scheduled Blocks: <strong className="text-sky-300">{hoveredCell.scheduledBlocksCount}</strong>
            </div>
          </div>
          <div className="text-[8px] text-slate-400 mt-1 border-t border-slate-800 pt-0.5 italic">
            Click to view breakdown of conflicting trains &amp; work requests.
          </div>
        </div>
      )}
    </div>
  );
};

export interface CorridorRiskHeaderBadgeProps {
  metrics: CorridorHeatmapMetrics;
  onInspect: (metrics: CorridorHeatmapMetrics) => void;
}

/**
 * Visual badge displayed on each corridor header when heatmap overlay is enabled
 */
export const CorridorRiskHeaderBadge: React.FC<CorridorRiskHeaderBadgeProps> = ({
  metrics,
  onInspect,
}) => {
  const isCrit = metrics.riskTier === 'CRITICAL';
  const isHigh = metrics.riskTier === 'HIGH';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Risk Tier & Score Pill */}
      <button
        type="button"
        onClick={() => onInspect(metrics)}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
          isCrit
            ? 'bg-rose-950 text-rose-200 border-rose-500 hover:bg-rose-900 shadow-rose-950/60 ring-1 ring-rose-500 animate-pulse'
            : isHigh
            ? 'bg-amber-950 text-amber-200 border-amber-500 hover:bg-amber-900 shadow-amber-950/40'
            : metrics.riskTier === 'MODERATE'
            ? 'bg-yellow-950 text-yellow-200 border-yellow-700 hover:bg-yellow-900'
            : 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:bg-emerald-900'
        }`}
        title={`Click to inspect corridor risk factors: Score ${metrics.compositeRiskScore}/100`}
      >
        <Flame
          className={`w-3 h-3 ${
            isCrit
              ? 'text-rose-400'
              : isHigh
              ? 'text-amber-400'
              : metrics.riskTier === 'MODERATE'
              ? 'text-yellow-400'
              : 'text-emerald-400'
          }`}
        />
        <span>
          Risk: <strong className="text-white">{metrics.compositeRiskScore}%</strong>
        </span>
        <span className="text-[9px] opacity-90 uppercase">({metrics.riskTier})</span>
      </button>

      {/* Conflict Intensity Pill */}
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          metrics.conflictIntensity === 'CRITICAL'
            ? 'bg-rose-950/90 text-rose-300 border-rose-600 shadow-xs'
            : metrics.conflictIntensity === 'HIGH'
            ? 'bg-amber-950/90 text-amber-300 border-amber-600'
            : metrics.conflictIntensity === 'MEDIUM'
            ? 'bg-yellow-950/90 text-yellow-300 border-yellow-700'
            : 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
        }`}
        title={`Current Conflict Intensity: ${metrics.conflictIntensity}`}
      >
        {metrics.conflictIntensity}
      </span>

      {/* Conflict frequency counter */}
      {metrics.openConflicts > 0 && (
        <span
          className="px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-900"
          onClick={() => onInspect(metrics)}
          title={`${metrics.openConflicts} active train/block conflicts (${metrics.criticalConflicts} Critical)`}
        >
          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
          <span>{metrics.openConflicts} Conflicts</span>
          {metrics.criticalConflicts > 0 && (
            <span className="bg-rose-900 text-white px-1 rounded text-[8px]">
              {metrics.criticalConflicts} P1
            </span>
          )}
        </span>
      )}

      {/* Pending maintenance requests counter */}
      {metrics.totalPendingRequests > 0 && (
        <span
          className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-900"
          onClick={() => onInspect(metrics)}
          title={`${metrics.totalPendingRequests} unresolved maintenance requests (${metrics.criticalPendingRequests} Critical priority)`}
        >
          <Wrench className="w-2.5 h-2.5 text-amber-400" />
          <span>{metrics.totalPendingRequests} Pending Req</span>
          {metrics.criticalPendingRequests > 0 && (
            <span className="bg-amber-900 text-white px-1 rounded text-[8px]">
              {metrics.criticalPendingRequests} P1
            </span>
          )}
        </span>
      )}

      {/* 1-Click Inspect Action Button */}
      <button
        type="button"
        onClick={() => onInspect(metrics)}
        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
        title="Open detailed risk and backlog breakdown"
      >
        <span>Inspect Heatmap</span>
        <ChevronRight className="w-3 h-3 text-sky-400" />
      </button>
    </div>
  );
};

export interface CorridorRiskInspectorModalProps {
  metrics: CorridorHeatmapMetrics;
  onClose: () => void;
  onNavigateToConflict: (blockId?: string) => void;
}

/**
 * Deep Inspector Modal showing why the corridor is highlighted, all conflicts, pending requests, and AI mitigation advice
 */
export const CorridorRiskInspectorModal: React.FC<CorridorRiskInspectorModalProps> = ({
  metrics,
  onClose,
  onNavigateToConflict,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONFLICTS' | 'PENDING_REQUESTS' | 'HOURLY'>('OVERVIEW');
  const visuals = getTierVisuals(metrics.riskTier, 'VIVID');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0e162c] border border-sky-800/90 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-950 bg-[#0a1020]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                metrics.riskTier === 'CRITICAL'
                  ? 'bg-rose-950/80 border-rose-600 text-rose-400 shadow-md shadow-rose-950'
                  : metrics.riskTier === 'HIGH'
                  ? 'bg-amber-950/80 border-amber-600 text-amber-400'
                  : 'bg-yellow-950/80 border-yellow-700 text-yellow-400'
              }`}
            >
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-300 text-xs px-2 py-0.5 rounded bg-sky-950 border border-sky-800">
                  {metrics.corridorId}
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  {metrics.corridorName} — Heatmap Risk Inspection
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Composite Risk Score: <strong className="text-white">{metrics.compositeRiskScore}/100</strong> ·{' '}
                <span className={metrics.riskTier === 'CRITICAL' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                  {metrics.tierLabel}
                </span>{' '}
                · Peak Overlap: <strong className="text-sky-300">{metrics.peakHour}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-[#0c1326] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-2 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-sky-400 text-sky-300 bg-sky-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONFLICTS')}
            className={`px-3 py-2 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONFLICTS'
                ? 'border-rose-400 text-rose-300 bg-rose-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Conflict Hotspots ({metrics.openConflicts})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_REQUESTS')}
            className={`px-3 py-2 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PENDING_REQUESTS'
                ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Unresolved Maintenance ({metrics.totalPendingRequests})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HOURLY')}
            className={`px-3 py-2 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'HOURLY'
                ? 'border-purple-400 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Hourly Strain Heatmap</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Composite Risk Score</span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-black ${
                        metrics.riskTier === 'CRITICAL'
                          ? 'text-rose-400'
                          : metrics.riskTier === 'HIGH'
                          ? 'text-amber-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {metrics.compositeRiskScore}
                    </span>
                    <span className="text-slate-400 text-xs">/ 100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        metrics.riskTier === 'CRITICAL'
                          ? 'bg-rose-500'
                          : metrics.riskTier === 'HIGH'
                          ? 'bg-amber-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${metrics.compositeRiskScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Conflict Frequency Score</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-300">{metrics.conflictScore}</span>
                    <span className="text-slate-400 text-xs">/ 100</span>
                  </div>
                  <span className="text-[10px] text-rose-300/80 block">
                    {metrics.openConflicts} active ({metrics.criticalConflicts} Critical)
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Maintenance Backlog Score</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-300">{metrics.maintenanceScore}</span>
                    <span className="text-slate-400 text-xs">/ 100</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 block">
                    {metrics.totalPendingRequests} requests ({Math.round(metrics.totalPendingDurationMinutes / 60)}h work)
                  </span>
                </div>
              </div>

              {/* Primary Risk Drivers */}
              <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-900/60 space-y-2">
                <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Primary Risk Drivers for {metrics.corridorId}:</span>
                </span>
                <ul className="space-y-1.5 pl-5 list-disc text-slate-300 text-[11px]">
                  {metrics.primaryDrivers.map((driver, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tactical AI Recommendations */}
              <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/60 space-y-2">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>AI Tactical Mitigation Strategies:</span>
                </span>
                <ul className="space-y-1.5 pl-5 list-disc text-slate-300 text-[11px]">
                  {metrics.recommendedActions.map((action, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick links */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('CONFLICTS')}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Inspect {metrics.openConflicts} Conflicts</span>
                  <ArrowRight className="w-3 h-3 text-rose-300 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING_REQUESTS')}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Review {metrics.totalPendingRequests} Pending Requests</span>
                  <ArrowRight className="w-3 h-3 text-amber-300 ml-1" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'CONFLICTS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 text-xs">
                  Active Conflicts on {metrics.corridorId} ({metrics.conflictsList.filter((c) => c.status === 'OPEN').length} Open)
                </span>
                <span className="text-[10px] text-slate-400">
                  High conflict frequency indicates tight headways and dense train schedules.
                </span>
              </div>

              {metrics.conflictsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-200">Zero Conflicts on {metrics.corridorId}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    All scheduled maintenance blocks operate clear of passenger paths.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.conflictsList.map((conflict) => {
                    const isOpen = conflict.status === 'OPEN' || conflict.status === 'PENDING_REVIEW';
                    const isCrit = conflict.severity === 'CRITICAL';

                    return (
                      <div
                        key={conflict.conflictId}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isOpen
                            ? isCrit
                              ? 'bg-rose-950/40 border-rose-700/80 shadow-sm'
                              : 'bg-amber-950/30 border-amber-700/80'
                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-100">{conflict.conflictId}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  isCrit
                                    ? 'bg-rose-900 text-rose-200 border border-rose-600'
                                    : 'bg-amber-900 text-amber-200 border border-amber-600'
                                }`}
                              >
                                {conflict.severity}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-slate-700 text-[10px]">
                                {conflict.conflictType}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Block: <strong className="text-slate-200">{conflict.blockId}</strong> ↔ Train:{' '}
                                <strong className="text-slate-200">{conflict.trainNumber} ({conflict.trainName})</strong>
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                              {conflict.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1">
                              <span>
                                Maintenance Interval:{' '}
                                <strong className="text-amber-300">{conflict.maintenanceInterval}</strong>
                              </span>
                              <span>
                                Train Window: <strong className="text-purple-300">{conflict.trainInterval}</strong>
                              </span>
                            </div>
                          </div>

                          {isOpen && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigateToConflict(conflict.blockId);
                              }}
                              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer shadow"
                            >
                              <span>Resolve</span>
                              <ArrowRight className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'PENDING_REQUESTS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 text-xs">
                  Pending Maintenance Demands on {metrics.corridorId} ({metrics.totalPendingRequests} Requests)
                </span>
                <span className="text-[10px] text-slate-400">
                  Unallocated work orders awaiting timetable lull window assignment.
                </span>
              </div>

              {metrics.pendingRequestsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-200">Zero Unresolved Maintenance Requests</p>
                  <p className="text-xs text-slate-400 mt-1">
                    All departmental requests on this corridor have been scheduled.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.pendingRequestsList.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3.5 rounded-xl border border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/30 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-100">{req.requestId}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              req.priority === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                : req.priority === 'HIGH'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {req.priority}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                            {req.department}
                          </span>
                          <span className="text-slate-300 font-semibold">{req.taskType}</span>
                        </div>

                        <span className="text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                          {req.requiredDurationMinutes} mins
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">{req.description}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-950 text-[10px] text-slate-400">
                        <div>
                          Asset: <strong className="text-slate-200">{req.assetId}</strong> ({req.assetType}) ·
                          Preferred: <strong className="text-sky-300">{req.preferredStartTime} – {req.preferredEndTime}</strong>
                        </div>
                        {req.operationalConstraints && (
                          <span className="text-amber-300/80 italic">
                            Constraint: {req.operationalConstraints}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'HOURLY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 text-xs">
                  Hourly Congestion &amp; Conflict Profile (08:00 – 20:00)
                </span>
                <span className="text-[10px] text-slate-400">
                  Peak strain occurs at <strong className="text-rose-400">{metrics.peakHour}</strong> with {metrics.peakHourStrain}% strain.
                </span>
              </div>

              <div className="space-y-2">
                {metrics.hourlyCells.map((cell) => (
                  <div
                    key={cell.hour}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="w-24 font-bold text-sky-300 shrink-0">{cell.timeRange}</div>

                    {/* Progress Bar of Strain */}
                    <div className="flex-1 bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 relative">
                      <div
                        className={`h-full rounded-full transition-all ${cell.colorClass}`}
                        style={{ width: `${Math.max(5, cell.strainScore)}%` }}
                      ></div>
                    </div>

                    <div className="w-16 text-right font-bold shrink-0">
                      <span
                        className={
                          cell.tier === 'CRITICAL'
                            ? 'text-rose-400'
                            : cell.tier === 'HIGH'
                            ? 'text-amber-400'
                            : cell.tier === 'MODERATE'
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                        }
                      >
                        {cell.strainScore}%
                      </span>
                    </div>

                    <div className="w-44 text-[10px] text-slate-400 flex items-center justify-end gap-2 shrink-0">
                      {cell.conflictCount > 0 ? (
                        <span className="text-rose-400 font-bold">
                          ⚡ {cell.conflictCount} Conflict{cell.conflictCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-600">0 Conflicts</span>
                      )}
                      {cell.pendingRequestCount > 0 ? (
                        <span className="text-amber-400 font-bold">
                          🔧 {cell.pendingRequestCount} Pending
                        </span>
                      ) : (
                        <span className="text-slate-600">0 Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0a1020] flex items-center justify-between">
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Use the Gantt drag handles on the timeline to shift blocks into unoccupied empty slots.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
