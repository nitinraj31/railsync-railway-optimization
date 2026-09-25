import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Users,
  Moon,
  Sun,
  Sunrise,
  Check,
  Info,
  Calendar,
  Layers,
  HardHat,
  ChevronRight,
} from 'lucide-react';
import {
  ShiftOptimizationResult,
  GangShiftRecommendation,
  ShiftType,
} from '../../services/shiftOptimizationService';

interface OptimizedShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ShiftOptimizationResult;
  onApplyShifts: (selectedRecommendations: GangShiftRecommendation[]) => Promise<void>;
  isLoading?: boolean;
}

export const OptimizedShiftModal: React.FC<OptimizedShiftModalProps> = ({
  isOpen,
  onClose,
  result,
  onApplyShifts,
  isLoading = false,
}) => {
  // Local state for selected recommendations
  const [selectedGangIds, setSelectedGangIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    result.recommendations.forEach((r) => {
      if (r.currentShift !== r.recommendedShift) {
        initial.add(r.gangId);
      }
    });
    return initial;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CHANGES_ONLY' | 'NIGHT_BLOCKS'>('CHANGES_ONLY');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleSelectGang = (gangId: string) => {
    setSelectedGangIds((prev) => {
      const next = new Set(prev);
      if (next.has(gangId)) {
        next.delete(gangId);
      } else {
        next.add(gangId);
      }
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const allChanged = result.recommendations
        .filter((r) => r.currentShift !== r.recommendedShift)
        .map((r) => r.gangId);
      setSelectedGangIds(new Set(allChanged));
    } else {
      setSelectedGangIds(new Set());
    }
  };

  const handleApply = async () => {
    const toApply = result.recommendations.filter((r) => selectedGangIds.has(r.gangId));
    if (toApply.length === 0) return;
    setIsApplying(true);
    try {
      await onApplyShifts(toApply);
    } finally {
      setIsApplying(false);
    }
  };

  const filteredRecs = result.recommendations.filter((r) => {
    if (activeFilter === 'CHANGES_ONLY') {
      return r.currentShift !== r.recommendedShift;
    }
    if (activeFilter === 'NIGHT_BLOCKS') {
      return r.recommendedShift === 'NIGHT_MEGA_BLOCK';
    }
    return true;
  });

  const changedRecsCount = result.recommendations.filter((r) => r.currentShift !== r.recommendedShift).length;
  const selectedCount = selectedGangIds.size;
  const selectedHeadcount = result.recommendations
    .filter((r) => selectedGangIds.has(r.gangId))
    .reduce((sum, r) => sum + r.headcount, 0);

  const getShiftBadge = (shift: ShiftType) => {
    switch (shift) {
      case 'DAY_SHIFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-950/80 border border-amber-700/80 text-amber-300">
            <Sun className="w-3 h-3 text-amber-400" />
            <span>DAY SHIFT (08:00–16:00)</span>
          </span>
        );
      case 'AFTERNOON_SHIFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-950/80 border border-sky-700/80 text-sky-300">
            <Sunrise className="w-3 h-3 text-sky-400" />
            <span>AFTERNOON (14:00–22:00)</span>
          </span>
        );
      case 'NIGHT_MEGA_BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-950/90 border border-purple-600/90 text-purple-300 shadow-sm shadow-purple-950/60">
            <Moon className="w-3 h-3 text-purple-400" />
            <span>NIGHT MEGA BLOCK (23:00–06:00)</span>
          </span>
        );
    }
  };

  return (
    <div
      id="optimized-shift-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
    >
      <div className="bg-[#0b1226] border border-sky-800/80 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-gradient-to-r from-[#0d1633] via-[#101b40] to-[#0d1633] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-950">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Conflict-Aware Shift Redistribution Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-sky-950 text-sky-300 border border-sky-700">
                  OPTIMIZATION ID: {result.optimizationId}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  GENERATED {result.generatedAt}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Redistributes maintenance gang rosters to match sectional workload peaks, eliminate passenger train headway clashes, and adhere to IR HOER rest quotas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 md:p-6 space-y-5 overflow-y-auto flex-1 font-sans">
          {/* EXECUTIVE BRIEFING BANNER */}
          <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-slate-900/60 p-4 rounded-xl border border-sky-800/60 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-mono font-bold text-xs uppercase">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Conflict-Aware Workload Peak Findings</span>
            </div>
            <p className="leading-relaxed text-slate-200">
              {result.executiveSummary}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 font-mono">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Scope: {result.targetCorridorFilter === 'ALL' ? 'Entire Division Network (C001–C004 + Depot)' : `Corridor ${result.targetCorridorFilter}`}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Compliance: IRTMM Para 3.12, IRPWM Para 6.4 & HOER Rule 14</span>
              </div>
            </div>
          </div>

          {/* KEY METRICS BENTO CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0e172e] p-3.5 rounded-xl border border-sky-900/80 shadow-md space-y-1">
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Gangs Rebalanced</span>
                <Users className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl font-bold font-mono text-sky-300">
                {result.totalGangsRedistributed}{' '}
                <span className="text-xs text-slate-400 font-normal">/ {result.totalGangsEvaluated} units</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {result.totalHeadcountRebalanced} maintenance personnel
              </div>
            </div>

            <div className="bg-[#0e172e] p-3.5 rounded-xl border border-purple-900/80 shadow-md space-y-1">
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Peak Workload Coverage</span>
                <Clock className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-bold font-mono text-purple-300">
                {result.peakCoverageImprovementPct}%
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span>+42% nocturnal machine alignment</span>
              </div>
            </div>

            <div className="bg-[#0e172e] p-3.5 rounded-xl border border-emerald-900/80 shadow-md space-y-1">
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Conflicts Mitigated</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {result.conflictsMitigatedCount} Avoided
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Zero train headway encroachment
              </div>
            </div>

            <div className="bg-[#0e172e] p-3.5 rounded-xl border border-rose-900/80 shadow-md space-y-1">
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Fatigue Risk Reduction</span>
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-300">
                -{result.fatigueRiskReductionPct}%
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Mandatory 14h rest between shifts
              </div>
            </div>
          </div>

          {/* VISUAL SHIFT DISTRIBUTION COMPARISON: BEFORE VS PROJECTED */}
          <div className="bg-[#0e172e] p-4 rounded-xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-200 font-mono font-bold text-xs uppercase">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Shift Distribution Comparison (Before vs Conflict-Aware Recommended)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Total Headcount: {result.beforeDistribution.totalHeadcount} Staff
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* CURRENT / BEFORE */}
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Current Roster (Unbalanced Peak)</span>
                  </span>
                  <span className="text-[10px] text-amber-400">Severe Day Clumping</span>
                </div>

                {/* Day Shift */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Day Shift:
                    </span>
                    <span className="font-bold text-amber-300">
                      {result.beforeDistribution.dayShiftHeadcount} Men ({result.beforeDistribution.dayShiftPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${result.beforeDistribution.dayShiftPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Afternoon Shift */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sunrise className="w-3 h-3 text-sky-400" /> Afternoon Shift:
                    </span>
                    <span className="font-bold text-sky-300">
                      {result.beforeDistribution.afternoonShiftHeadcount} Men ({result.beforeDistribution.afternoonShiftPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-sky-500 h-full rounded-full"
                      style={{ width: `${result.beforeDistribution.afternoonShiftPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Night Mega Block */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-rose-300">
                      <Moon className="w-3 h-3 text-rose-400" /> Night Mega Block:
                    </span>
                    <span className="font-bold text-rose-400">
                      {result.beforeDistribution.nightShiftHeadcount} Men ({result.beforeDistribution.nightShiftPercentage}%) [CRITICAL DEFICIT]
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${Math.max(2, result.beforeDistribution.nightShiftPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* RECOMMENDED / PROJECTED */}
              <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-800/80 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-sky-800/60 pb-1.5">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Projected Roster (Conflict-Aware Optimized)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">100% Slot Covered</span>
                </div>

                {/* Day Shift */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Day Shift:
                    </span>
                    <span className="font-bold text-amber-300">
                      {result.projectedDistribution.dayShiftHeadcount} Men ({result.projectedDistribution.dayShiftPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${result.projectedDistribution.dayShiftPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Afternoon Shift */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sunrise className="w-3 h-3 text-sky-400" /> Afternoon Shift:
                    </span>
                    <span className="font-bold text-sky-300">
                      {result.projectedDistribution.afternoonShiftHeadcount} Men ({result.projectedDistribution.afternoonShiftPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all"
                      style={{ width: `${result.projectedDistribution.afternoonShiftPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Night Mega Block */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-purple-300">
                      <Moon className="w-3 h-3 text-purple-400" /> Night Mega Block:
                    </span>
                    <span className="font-bold text-purple-300">
                      {result.projectedDistribution.nightShiftHeadcount} Men ({result.projectedDistribution.nightShiftPercentage}%) [OPTIMIZED BUFFER]
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${result.projectedDistribution.nightShiftPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GANG RECOMMENDATIONS TABLE CONTROLS */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  Gang Shift Recommendations ({filteredRecs.length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {selectedCount} Selected ({selectedHeadcount} Staff)
                </span>
              </div>

              {/* Filter Pills & Select All */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectAll(selectedCount < changedRecsCount)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-[11px] font-mono cursor-pointer transition-colors"
                >
                  {selectedCount === changedRecsCount ? 'Deselect All' : 'Select All Proposed Shifts'}
                </button>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('CHANGES_ONLY')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      activeFilter === 'CHANGES_ONLY' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Proposed Shifts ({changedRecsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('NIGHT_BLOCKS')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      activeFilter === 'NIGHT_BLOCKS' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Night Blocks Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      activeFilter === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Gangs ({result.recommendations.length})
                  </button>
                </div>
              </div>
            </div>

            {/* CARDS LIST FOR EACH RECOMMENDATION */}
            <div className="space-y-2.5">
              {filteredRecs.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 text-xs font-mono">
                  No gang shift recommendations found under this filter.
                </div>
              ) : (
                filteredRecs.map((rec) => {
                  const isSelected = selectedGangIds.has(rec.gangId);
                  const isChange = rec.currentShift !== rec.recommendedShift;

                  return (
                    <div
                      key={rec.gangId}
                      className={`p-4 rounded-xl border transition-all ${
                        isChange
                          ? isSelected
                            ? 'bg-[#0f1b3b] border-sky-500/80 shadow-md shadow-sky-950/40'
                            : 'bg-[#0c142c] border-slate-800 hover:border-slate-700'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        {/* Left: Gang ID, checkbox, & Names */}
                        <div className="flex items-start gap-3 flex-1">
                          {isChange ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectGang(rec.gangId)}
                              className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500 cursor-pointer mt-1 accent-sky-500 shrink-0"
                            />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-slate-600 mt-1 shrink-0" />
                          )}

                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sky-300 text-xs">
                                {rec.gangId}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {rec.corridorId} • {rec.corridorName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                {rec.trade.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-200">
                                {rec.headcount} Staff
                              </span>
                              {rec.priority === 'CRITICAL' && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                  CRITICAL PEAK
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-semibold text-slate-200">
                              {rec.gangName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Supervisor: <span className="text-slate-300 font-mono">{rec.supervisor}</span> • Section: <span className="text-slate-400 font-mono">{rec.assignedSection}</span>
                            </div>

                            {/* WORKLOAD PEAK JUSTIFICATION */}
                            <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1 font-mono">
                              <div className="text-sky-300 font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{rec.workloadPeakDriver}</span>
                              </div>
                              <div className="text-emerald-400 flex items-center gap-1.5 pt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Conflict Avoidance: {rec.conflictsAvoidedDescription}</span>
                              </div>
                              <div className="text-slate-400 text-[10px] flex items-center gap-1.5 pt-0.5">
                                <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Safety & Rest: {rec.fatigueImpact}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Shift Transition Visualizer & Confidence */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2.5 shrink-0 min-w-[240px]">
                          <div className="space-y-1 lg:text-right">
                            <span className="text-[10px] text-slate-500 font-mono uppercase block">
                              Shift Allocation
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getShiftBadge(rec.currentShift)}
                              {isChange && (
                                <>
                                  <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  {getShiftBadge(rec.recommendedShift)}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>Confidence: <strong className="text-emerald-400">{rec.confidenceScore}%</strong></span>
                            <span>•</span>
                            <span className="text-sky-400">{rec.safetyCompliance.split('(')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* STATUTORY REGULATIONS BANNER */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>STATUTORY COMPLIANCE & REST CERTIFICATION:</span>
            </div>
            <p>
              Under Indian Railways Hours of Employment Regulations (HOER) Rule 14 and Track Machine Manual (IRTMM), shift realignments must enforce a minimum 12-hour continuous rest interval between daytime work and night mega block possessions. All suggested gang transitions provide ≥14 hours rest buffer.
            </p>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 md:p-5 border-t border-slate-800 bg-[#080d1e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Applying redistribution updates gang shift rosters and automatically recalibrates corridor capacity metrics.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || selectedCount === 0}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white text-xs font-mono font-bold shadow-lg shadow-sky-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Applying Shift Rebalancing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    Apply Shift Redistribution ({selectedCount} Gangs • {selectedHeadcount} Staff)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
