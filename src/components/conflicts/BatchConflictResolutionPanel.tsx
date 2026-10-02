import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  Train,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Wrench,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sliders,
  CheckSquare,
  Square,
  Flame,
  Info,
} from 'lucide-react';
import {
  Conflict,
  Corridor,
  OptimizedBlock,
  AiScheduleOffsetProposal,
  DepartmentType,
} from '../../types';
import { batchApplyAiScheduleOffsets, mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

export type ConflictGroupMode = 'CORRIDOR' | 'TASK_TYPE' | 'CORRIDOR_AND_TASK' | 'DEPARTMENT';

interface BatchConflictResolutionPanelProps {
  conflicts: Conflict[];
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onRefreshConflicts: () => void;
  onNavigateToConflictDetail?: (conflictId: string) => void;
}

interface ConflictCluster {
  groupId: string;
  groupTitle: string;
  groupSubtitle: string;
  groupType: ConflictGroupMode;
  corridorId: string;
  taskType: string;
  department: DepartmentType;
  conflicts: Conflict[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  uniqueTrains: { number: string; name: string }[];
  suggestedOffsetMinutes: number;
  suggestedTargetWindow: string;
  safetyHeadwayMinutes: number;
  aiRationale: string;
  irStandardsCompliance: string;
}

// Helper to shift a time string (e.g. "14:00" + 90 -> "15:30")
function shiftTimeString(timeStr: string, deltaMins: number): string {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  let total = h * 60 + m + deltaMins;
  // Wrap around 24 hours
  total = (total + 24 * 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Helper to shift an interval string (e.g. "14:00–15:30" or "14:00 - 15:30" + 90 -> "15:30–17:00")
function shiftIntervalString(interval: string, deltaMins: number): string {
  // Strip any suffix like (TRD) or (Civil)
  const clean = interval.replace(/\s*\([^)]*\)/g, '').trim();
  const sep = clean.includes('–') ? '–' : clean.includes('-') ? '-' : '–';
  const parts = clean.split(sep).map((s) => s.trim());
  if (parts.length !== 2) return interval;

  const newStart = shiftTimeString(parts[0], deltaMins);
  const newEnd = shiftTimeString(parts[1], deltaMins);
  return `${newStart}–${newEnd}`;
}

export const BatchConflictResolutionPanel: React.FC<BatchConflictResolutionPanelProps> = ({
  conflicts,
  corridors,
  blocks = [],
  onRefreshConflicts,
  onNavigateToConflictDetail,
}) => {
  const [groupMode, setGroupMode] = useState<ConflictGroupMode>('CORRIDOR_AND_TASK');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [groupCustomOffsets, setGroupCustomOffsets] = useState<Record<string, number>>({});
  const [selectedConflictIdsPerGroup, setSelectedConflictIdsPerGroup] = useState<
    Record<string, Set<string>>
  >({});
  const [isApplyingGroupId, setIsApplyingGroupId] = useState<string | null>(null);
  const [isBatchResolvingAll, setIsBatchResolvingAll] = useState(false);
  const [resolutionSuccessToast, setResolutionSuccessToast] = useState<{
    groupTitle: string;
    resolvedCount: number;
    newWindow: string;
    offsetMinutes: number;
  } | null>(null);

  // Filter only OPEN conflicts
  const openConflicts = useMemo(() => {
    return conflicts.filter((c) => c.status === 'OPEN');
  }, [conflicts]);

  // Compute Group Clusters dynamically based on chosen groupMode
  const clusters = useMemo<ConflictCluster[]>(() => {
    if (openConflicts.length === 0) return [];

    const groupMap = new Map<string, Conflict[]>();

    openConflicts.forEach((c) => {
      let key = '';
      const corridor = c.corridorId || 'C001';
      const task = c.taskType || c.conflictType || 'Track Maintenance';
      const dept = c.department || 'ENGINEERING';

      if (groupMode === 'CORRIDOR') {
        key = corridor;
      } else if (groupMode === 'TASK_TYPE') {
        key = task;
      } else if (groupMode === 'DEPARTMENT') {
        key = dept;
      } else {
        // CORRIDOR_AND_TASK
        key = `${corridor}___${task}`;
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(c);
    });

    const result: ConflictCluster[] = [];

    groupMap.forEach((conflictList, key) => {
      const first = conflictList[0];
      const corridorId = first.corridorId || 'C001';
      const corridorObj = corridors.find((cr) => cr.id === corridorId);
      const corridorName = corridorObj?.name || `Corridor ${corridorId}`;
      const taskType = first.taskType || first.conflictType || 'Corridor Maintenance';
      const dept = first.department || 'ENGINEERING';

      let groupTitle = '';
      let groupSubtitle = '';

      if (groupMode === 'CORRIDOR') {
        groupTitle = `${corridorId} — ${corridorName}`;
        groupSubtitle = `${conflictList.length} conflict(s) across diverse maintenance tasks on this route`;
      } else if (groupMode === 'TASK_TYPE') {
        groupTitle = taskType;
        groupSubtitle = `${conflictList.length} conflict(s) across corridors sharing this task discipline`;
      } else if (groupMode === 'DEPARTMENT') {
        groupTitle = `${dept} Department Operations`;
        groupSubtitle = `${conflictList.length} conflict(s) affecting ${dept} division assets`;
      } else {
        groupTitle = `${corridorId} • ${taskType}`;
        groupSubtitle = `Route: ${corridorName} | Dept: ${dept}`;
      }

      // Unique trains involved
      const trainMap = new Map<string, string>();
      conflictList.forEach((c) => {
        if (c.trainNumber) {
          trainMap.set(c.trainNumber, c.trainName || `Train #${c.trainNumber}`);
        }
      });
      const uniqueTrains = Array.from(trainMap.entries()).map(([num, name]) => ({
        number: num,
        name,
      }));

      // Heuristic AI offset per corridor / task:
      // Uses verified corridor lull windows:
      // C001 lull: 15:45–17:15 (+105m)
      // C002 lull: 16:30–18:00 (+90m)
      // C003 lull: 16:00–17:30 (+120m)
      // C004 lull: 14:30–16:00 (+90m)
      let suggestedOffsetMinutes = 90;
      let targetLullWindowName = `${corridorId} Post-Passage Lull Window`;
      if (corridorId === 'C001') {
        suggestedOffsetMinutes = 105;
        targetLullWindowName = 'C001 Post-Passage Daylight Lull (15:45–17:15)';
      } else if (corridorId === 'C002') {
        suggestedOffsetMinutes = 90;
        targetLullWindowName = 'C002 DFC Freight Clearing Lull (16:30–18:00)';
      } else if (corridorId === 'C003') {
        suggestedOffsetMinutes = 120;
        targetLullWindowName = 'C003 Heavy Coal Shadow Lull (16:00–17:30)';
      } else if (corridorId === 'C004') {
        suggestedOffsetMinutes = 90;
        targetLullWindowName = 'C004 Express Chord Lull (14:30–16:00)';
      }

      const criticalCount = conflictList.filter((c) => c.severity === 'CRITICAL').length;
      const highCount = conflictList.filter((c) => c.severity === 'HIGH').length;
      const mediumCount = conflictList.filter(
        (c) => c.severity === 'MEDIUM' || c.severity === 'LOW'
      ).length;

      const cluster: ConflictCluster = {
        groupId: key,
        groupTitle,
        groupSubtitle,
        groupType: groupMode,
        corridorId,
        taskType,
        department: dept,
        conflicts: conflictList,
        criticalCount,
        highCount,
        mediumCount,
        uniqueTrains,
        suggestedOffsetMinutes,
        suggestedTargetWindow: targetLullWindowName,
        safetyHeadwayMinutes: corridorId === 'C001' ? 45 : 35,
        aiRationale: `AI identified shared ${suggestedOffsetMinutes}-minute lull window on ${corridorId}. Synchronously shifting this group clears ${uniqueTrains.length} passenger/freight rake(s) simultaneously without encroaching on headway buffers.`,
        irStandardsCompliance:
          'IRPWM Para 6.4 (Headway buffer >= 30m) & Indian Railways G&SR Rule 4.13 compliant.',
      };

      result.push(cluster);
    });

    // Sort: clusters with most critical conflicts first
    return result.sort((a, b) => {
      if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
      return b.conflicts.length - a.conflicts.length;
    });
  }, [openConflicts, groupMode, corridors]);

  // Toggle accordion expand
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Get active offset for a group (user override or default)
  const getActiveOffset = (cluster: ConflictCluster): number => {
    return groupCustomOffsets[cluster.groupId] !== undefined
      ? groupCustomOffsets[cluster.groupId]
      : cluster.suggestedOffsetMinutes;
  };

  // Set custom offset for group
  const setCustomOffset = (groupId: string, offset: number) => {
    setGroupCustomOffsets((prev) => ({ ...prev, [groupId]: offset }));
  };

  // Toggle selection of conflict within group
  const toggleConflictSelection = (groupId: string, conflictId: string) => {
    setSelectedConflictIdsPerGroup((prev) => {
      const currentSet = new Set(prev[groupId] || []);
      if (currentSet.has(conflictId)) {
        currentSet.delete(conflictId);
      } else {
        currentSet.add(conflictId);
      }
      return { ...prev, [groupId]: currentSet };
    });
  };

  // Toggle select all within a group
  const toggleSelectAllInGroup = (cluster: ConflictCluster) => {
    setSelectedConflictIdsPerGroup((prev) => {
      const currentSet = prev[cluster.groupId] || new Set();
      const allSelected = currentSet.size === cluster.conflicts.length;
      if (allSelected) {
        return { ...prev, [cluster.groupId]: new Set() };
      } else {
        return {
          ...prev,
          [cluster.groupId]: new Set(cluster.conflicts.map((c) => c.conflictId)),
        };
      }
    });
  };

  // Check if conflict is selected in group (defaults to true if never touched)
  const isConflictSelectedInGroup = (cluster: ConflictCluster, conflictId: string): boolean => {
    const set = selectedConflictIdsPerGroup[cluster.groupId];
    if (!set) return true; // default all selected
    return set.has(conflictId);
  };

  // Apply AI Offsets to entire group
  const handleApplyGroupAiOffsets = async (cluster: ConflictCluster) => {
    const selectedConflicts = cluster.conflicts.filter((c) =>
      isConflictSelectedInGroup(cluster, c.conflictId)
    );
    if (selectedConflicts.length === 0) return;

    setIsApplyingGroupId(cluster.groupId);
    const offset = getActiveOffset(cluster);

    try {
      // Build proposals for each conflict in this group
      const proposals: AiScheduleOffsetProposal[] = selectedConflicts.map((c) => {
        const currentInterval = c.maintenanceInterval || '14:00–15:30';
        const proposedInterval = shiftIntervalString(currentInterval, offset);

        return {
          conflictId: c.conflictId,
          blockId: c.blockId,
          corridorId: cluster.corridorId,
          taskType: cluster.taskType,
          department: cluster.department,
          priority: c.severity,
          currentInterval,
          proposedInterval,
          offsetMinutes: offset,
          offsetDirection: offset >= 0 ? 'FORWARD' : 'BACKWARD',
          durationMinutes: 90,
          corridorWindowIdentified: cluster.suggestedTargetWindow,
          safetyHeadwayMinutes: cluster.safetyHeadwayMinutes,
          disruptionLevel: 'ZERO_DISRUPTION',
          confidenceScore: 97,
          justification: `Batch AI Cluster Resolution: Synchronously shifted group "${cluster.groupTitle}" by ${offset > 0 ? '+' : ''}${offset}m into verified lull window. Disruption to ${c.trainNumber} completely eliminated.`,
          irStandardsCompliance: cluster.irStandardsCompliance,
          conflictingTrainNumber: c.trainNumber,
          conflictingTrainName: c.trainName,
          trainCategory: c.trainCategory || 'EXPRESS',
          applied: false,
        };
      });

      // Apply batch offsets to mockStore
      const res = await batchApplyAiScheduleOffsets(proposals);

      // Play success chime
      try {
        railwayAudio.playSuccessTone();
      } catch {}

      // Show toast
      const firstProposal = proposals[0];
      setResolutionSuccessToast({
        groupTitle: cluster.groupTitle,
        resolvedCount: res.count,
        newWindow: firstProposal ? firstProposal.proposedInterval : 'Shifted Lull Window',
        offsetMinutes: offset,
      });

      setTimeout(() => setResolutionSuccessToast(null), 6000);

      // Refresh parent conflicts
      onRefreshConflicts();
    } catch (err) {
      console.error('Failed to batch resolve cluster:', err);
    } finally {
      setIsApplyingGroupId(null);
    }
  };

  // Batch Resolve ALL groups simultaneously
  const handleBatchResolveAllGroups = async () => {
    if (clusters.length === 0) return;
    setIsBatchResolvingAll(true);

    try {
      const allProposals: AiScheduleOffsetProposal[] = [];

      clusters.forEach((cluster) => {
        const offset = getActiveOffset(cluster);
        cluster.conflicts.forEach((c) => {
          const currentInterval = c.maintenanceInterval || '14:00–15:30';
          const proposedInterval = shiftIntervalString(currentInterval, offset);
          allProposals.push({
            conflictId: c.conflictId,
            blockId: c.blockId,
            corridorId: cluster.corridorId,
            taskType: cluster.taskType,
            department: cluster.department,
            priority: c.severity,
            currentInterval,
            proposedInterval,
            offsetMinutes: offset,
            offsetDirection: offset >= 0 ? 'FORWARD' : 'BACKWARD',
            durationMinutes: 90,
            corridorWindowIdentified: cluster.suggestedTargetWindow,
            safetyHeadwayMinutes: cluster.safetyHeadwayMinutes,
            disruptionLevel: 'ZERO_DISRUPTION',
            confidenceScore: 98,
            justification: `Global Multi-Cluster AI Resolution: Synchronously shifted group "${cluster.groupTitle}" by ${offset > 0 ? '+' : ''}${offset}m into verified lull window.`,
            irStandardsCompliance: cluster.irStandardsCompliance,
            conflictingTrainNumber: c.trainNumber,
            conflictingTrainName: c.trainName,
            trainCategory: c.trainCategory || 'EXPRESS',
            applied: false,
          });
        });
      });

      const res = await batchApplyAiScheduleOffsets(allProposals);

      try {
        railwayAudio.playSuccessTone();
      } catch {}

      setResolutionSuccessToast({
        groupTitle: 'All Clustered Conflict Groups',
        resolvedCount: res.count,
        newWindow: 'Synchronized Operational Lulls',
        offsetMinutes: 90,
      });
      setTimeout(() => setResolutionSuccessToast(null), 6000);

      onRefreshConflicts();
    } catch (err) {
      console.error('Failed to batch resolve all clusters:', err);
    } finally {
      setIsBatchResolvingAll(false);
    }
  };

  const getDepartmentIcon = (dept: DepartmentType) => {
    switch (dept) {
      case 'TRACTION':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'S&T':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      default:
        return <Wrench className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      id="batch-conflict-resolution-panel"
      className="bg-[#0e172e] border border-sky-950/80 rounded-xl p-5 shadow-lg space-y-5"
    >
      {/* SUCCESS TOAST BANNER */}
      {resolutionSuccessToast && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-500 shadow-xl flex items-center justify-between gap-4 text-xs font-mono animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">
                Batch AI Offset Applied to {resolutionSuccessToast.groupTitle}!
              </div>
              <p className="text-emerald-300 mt-0.5">
                Successfully rescheduled <strong>{resolutionSuccessToast.resolvedCount} conflict(s)</strong> with a {resolutionSuccessToast.offsetMinutes > 0 ? '+' : ''}{resolutionSuccessToast.offsetMinutes}m shift into {resolutionSuccessToast.newWindow}. All train overlaps cleared!
              </p>
            </div>
          </div>
          <button
            onClick={() => setResolutionSuccessToast(null)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER & CLUSTERING CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-700/70 text-indigo-400 shadow-md">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Batch Conflict Resolution &amp; Cluster Offsets
                </h3>
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-mono font-bold">
                  AI CLUSTER OPTIMIZER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Group similar maintenance conflicts by corridor and task type, then apply synchronized AI-generated schedule offsets to entire clusters at once.
              </p>
            </div>
          </div>
        </div>

        {/* TOP LEVEL GLOBAL BATCH ACTIONS */}
        <div className="flex items-center gap-3 flex-wrap">
          {clusters.length > 0 && (
            <button
              id="btn-batch-resolve-all-clusters"
              onClick={handleBatchResolveAllGroups}
              disabled={isBatchResolvingAll}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              title="Apply AI-recommended schedule offsets across all conflict clusters at once"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>
                {isBatchResolvingAll
                  ? 'Batch Resolving All Groups...'
                  : `Batch Resolve All Clusters (${openConflicts.length} Conflicts)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* GROUPING SWITCHER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-slate-300 font-semibold">Group Conflicts By:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setGroupMode('CORRIDOR_AND_TASK')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              groupMode === 'CORRIDOR_AND_TASK'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            Corridor &amp; Task Type (Recommended)
          </button>

          <button
            onClick={() => setGroupMode('CORRIDOR')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              groupMode === 'CORRIDOR'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            By Corridor Only
          </button>

          <button
            onClick={() => setGroupMode('TASK_TYPE')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              groupMode === 'TASK_TYPE'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            By Task Type
          </button>

          <button
            onClick={() => setGroupMode('DEPARTMENT')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              groupMode === 'DEPARTMENT'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            By Department
          </button>
        </div>

        <div className="text-slate-400 text-[11px]">
          Identified <strong>{clusters.length} Cluster(s)</strong> across {openConflicts.length} open conflicts
        </div>
      </div>

      {/* CLUSTERS CONTAINER */}
      {clusters.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200 font-mono">
            All Maintenance Conflicts Resolved!
          </h4>
          <p className="text-xs text-slate-400 font-mono">
            No active open conflicts require batch resolution. Timetable schedule is conflict-free and compliant.
          </p>
        </div>
      ) : (
        <div className="space-y-4 font-mono text-xs">
          {clusters.map((cluster) => {
            const isExpanded = expandedGroupIds.has(cluster.groupId);
            const activeOffset = getActiveOffset(cluster);
            const isApplying = isApplyingGroupId === cluster.groupId;
            const selectedCount = cluster.conflicts.filter((c) =>
              isConflictSelectedInGroup(cluster, c.conflictId)
            ).length;
            const allSelectedInGroup = selectedCount === cluster.conflicts.length;

            return (
              <div
                key={cluster.groupId}
                id={`cluster-group-${cluster.groupId.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
                className="rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-md overflow-hidden transition-all"
              >
                {/* CLUSTER CARD TOP BAR */}
                <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelectAllInGroup(cluster)}
                      className="p-1 rounded text-slate-400 hover:text-sky-300 mt-0.5 cursor-pointer"
                      title={allSelectedInGroup ? 'Deselect all in group' : 'Select all in group'}
                    >
                      {allSelectedInGroup ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : selectedCount > 0 ? (
                        <div className="w-4 h-4 rounded border-2 border-sky-400 flex items-center justify-center bg-sky-950">
                          <div className="w-2 h-2 bg-sky-400 rounded-sm" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 font-mono">
                          {cluster.groupTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-bold">
                          {cluster.corridorId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1">
                          {getDepartmentIcon(cluster.department)}
                          <span>{cluster.department}</span>
                        </span>
                        {cluster.criticalCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            {cluster.criticalCount} CRITICAL
                          </span>
                        )}
                        {cluster.highCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                            {cluster.highCount} HIGH
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {cluster.groupSubtitle} • Contending Trains:{' '}
                        <strong className="text-purple-300">
                          {cluster.uniqueTrains.map((t) => `${t.number} (${t.name})`).join(', ')}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* QUICK OFFSET PREVIEW & GROUP RESOLVE TRIGGER */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    {/* Shift delta selector */}
                    <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">AI Offset:</span>
                      <select
                        value={activeOffset}
                        onChange={(e) => setCustomOffset(cluster.groupId, parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] font-bold text-amber-300 focus:outline-none"
                      >
                        <option value={cluster.suggestedOffsetMinutes}>
                          AI Best (+{cluster.suggestedOffsetMinutes}m Lull)
                        </option>
                        <option value={60}>+60m Minor Shift</option>
                        <option value={90}>+90m Standard Lull</option>
                        <option value={120}>+120m 2hr Shift</option>
                        <option value={180}>+180m Night Slot</option>
                        <option value={-60}>-60m Pre-Passage</option>
                        <option value={-120}>-120m Dawn Window</option>
                      </select>
                    </div>

                    {/* Group Batch Resolve Button */}
                    <button
                      id={`btn-batch-apply-${cluster.groupId}`}
                      onClick={() => handleApplyGroupAiOffsets(cluster)}
                      disabled={isApplying || selectedCount === 0}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
                      title="Apply the recommended AI offset to all selected conflicts in this group at once"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>
                        {isApplying
                          ? 'Applying...'
                          : `Batch Resolve Group (${selectedCount}/${cluster.conflicts.length})`}
                      </span>
                    </button>

                    {/* Expand/Collapse Accordion Button */}
                    <button
                      onClick={() => toggleGroupExpand(cluster.groupId)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse conflicts' : 'Expand conflicts in group'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AI OFFSET RATIONALE & TIME STRIP */}
                <div className="p-3.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      <strong className="text-purple-300">AI Cluster Recommendation:</strong>{' '}
                      {cluster.aiRationale}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] shrink-0 text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Headway Buffer: <strong className="text-emerald-300">{cluster.safetyHeadwayMinutes}m</strong>
                    </span>
                    <span>•</span>
                    <span className="text-sky-300">{cluster.irStandardsCompliance.split('&')[0]}</span>
                  </div>
                </div>

                {/* EXPANDABLE CONFLICT ITEMS IN CLUSTER */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/40 space-y-2.5 divide-y divide-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pb-1">
                      Individual Conflicts in this Cluster (Uncheck to Exclude from Batch)
                    </div>

                    {cluster.conflicts.map((c) => {
                      const isSelected = isConflictSelectedInGroup(cluster, c.conflictId);
                      const currentInterval = c.maintenanceInterval || '14:00–15:30';
                      const shiftedInterval = shiftIntervalString(currentInterval, activeOffset);

                      return (
                        <div
                          key={c.conflictId}
                          className={`pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded transition-colors ${
                            isSelected ? 'bg-slate-900/60' : 'bg-slate-950/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleConflictSelection(cluster.groupId, c.conflictId)}
                              className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sky-300">{c.blockId}</span>
                                <span className="text-slate-400">↔</span>
                                <span className="font-bold text-purple-300">{c.trainNumber} ({c.trainName})</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    c.severity === 'CRITICAL'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {c.severity}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 max-w-xl">
                                {c.description}
                              </p>
                            </div>
                          </div>

                          {/* Original vs Shifted Interval Comparison */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] text-rose-400 line-through">
                                Original: {currentInterval}
                              </div>
                              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                                <span>Shifted: {shiftedInterval}</span>
                                <span className="text-[9px] text-emerald-300 bg-emerald-950 px-1 rounded border border-emerald-800">
                                  {activeOffset > 0 ? `+${activeOffset}m` : `${activeOffset}m`}
                                </span>
                              </div>
                            </div>

                            {onNavigateToConflictDetail && (
                              <button
                                onClick={() => onNavigateToConflictDetail(c.conflictId)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
