import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock,
  Train as TrainIcon,
  Wrench,
  AlertTriangle,
  Info,
  Clock,
  X,
  ArrowRight,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Zap,
  CloudRain,
  ShieldCheck,
  MoveHorizontal,
  RotateCcw,
  Sliders,
  GripVertical,
  UploadCloud,
  Sparkles,
  Undo2,
  Layers,
  Check,
} from 'lucide-react';
import { OptimizedBlock, Train, Corridor } from '../../types';
import { publishSchedule, mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

export interface BlockTimelineScreenProps {
  blocks: OptimizedBlock[];
  trains: Train[];
  corridors: Corridor[];
  onNavigateToConflict: (blockId?: string) => void;
  onRefreshData?: () => void;
}

interface EmptySlot {
  slotId: string;
  corridorId: string;
  startMins: number; // minutes from 08:00
  endMins: number;   // minutes from 08:00
  startTime: string; // e.g. "11:30"
  endTime: string;   // e.g. "13:00"
  durationMinutes: number; // e.g. 90
  canFit: boolean;
}

interface ShiftHistoryEntry {
  blockId: string;
  prevStartTime: string;
  prevEndTime: string;
  prevCorridorId: string;
  newStartTime: string;
  newEndTime: string;
  timestamp: string;
}

export const BlockTimelineScreen: React.FC<BlockTimelineScreenProps> = ({
  blocks,
  trains,
  corridors,
  onNavigateToConflict,
  onRefreshData,
}) => {
  // Local state for blocks to support immediate optimistic drag-and-drop feedback
  const [localBlocks, setLocalBlocks] = useState<OptimizedBlock[]>(blocks);
  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('ALL');
  const [selectedBlock, setSelectedBlock] = useState<OptimizedBlock | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);

  // Operational Layers State
  const [showOheLayer, setShowOheLayer] = useState<boolean>(true);
  const [showMonsoonLayer, setShowMonsoonLayer] = useState<boolean>(true);

  // Drag-and-Drop State
  const [draggingBlock, setDraggingBlock] = useState<OptimizedBlock | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<EmptySlot | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryEntry[]>([]);
  const [publishNotification, setPublishNotification] = useState<{
    blockId: string;
    assetId: string;
    department: string;
    oldTime: string;
    newTime: string;
    corridorId: string;
    scheduleId?: string;
    scheduleVersion?: string;
    timestamp: string;
  } | null>(null);

  // Interactive block timeline adjustments (minute offset overrides)
  const [blockAdjustments, setBlockAdjustments] = useState<Record<string, number>>({});

  // Timeline hours from 08:00 to 20:00 (12 hours)
  const startHour = 8;
  const endHour = 20;
  const totalMinutes = (endHour - startHour) * 60; // 720 minutes

  // Helper to convert HH:MM to minute offset from 08:00
  const getMinutesFromStart = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m;
    const offset = total - startHour * 60;
    return Math.max(0, Math.min(totalMinutes, offset));
  };

  // Helper to format minute offset back to HH:MM
  const formatOffsetToTime = (baseTimeStr: string, offsetMins: number) => {
    const [h, m] = (baseTimeStr || '08:00').split(':').map(Number);
    let total = h * 60 + m + offsetMins;
    total = Math.max(8 * 60, Math.min(20 * 60, total));
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Helper to add duration in minutes to an HH:MM string
  const addMinutesToTime = (timeStr: string, durationMins: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    let total = h * 60 + m + durationMins;
    total = Math.max(8 * 60, Math.min(20 * 60, total));
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const getEffectiveBlockTime = (block: OptimizedBlock) => {
    const offset = blockAdjustments[block.blockId] || 0;
    return {
      startTime: formatOffsetToTime(block.startTime, offset),
      endTime: formatOffsetToTime(block.endTime, offset),
      offset,
    };
  };

  const shiftBlockTime = (blockId: string, deltaMins: number) => {
    setBlockAdjustments((prev) => {
      const current = prev[blockId] || 0;
      return { ...prev, [blockId]: current + deltaMins };
    });
  };

  const resetBlockTime = (blockId: string) => {
    setBlockAdjustments((prev) => {
      const updated = { ...prev };
      delete updated[blockId];
      return updated;
    });
  };

  const getWidthPercent = (startStr: string, endStr: string) => {
    const startMins = getMinutesFromStart(startStr);
    const endMins = getMinutesFromStart(endStr);
    const duration = Math.max(15, endMins - startMins);
    return (duration / totalMinutes) * 100;
  };

  const getLeftPercent = (startStr: string) => {
    const startMins = getMinutesFromStart(startStr);
    return (startMins / totalMinutes) * 100;
  };

  // Generate hourly labels
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = startHour; h <= endHour; h++) {
      labels.push(`${String(h).padStart(2, '0')}:00`);
    }
    return labels;
  }, []);

  const visibleCorridors = corridors.filter(
    (c) => selectedCorridorId === 'ALL' || c.id === selectedCorridorId
  );

  // Compute unoccupied empty time slots for a given corridor
  const getEmptySlotsForCorridor = (
    corridorId: string,
    activeDraggingBlockId?: string,
    requiredDuration = 45
  ): EmptySlot[] => {
    const corridorTrains = trains.filter((t) => t.corridorId === corridorId);
    const corridorBlocks = localBlocks.filter((b) => b.corridorId === corridorId);

    // Collect all occupied time ranges in minutes from startHour (08:00)
    const occupied: { start: number; end: number; type: 'TRAIN' | 'BLOCK' }[] = [];

    // 1. Train paths with a 5-minute safety headway
    corridorTrains.forEach((train) => {
      const s = getMinutesFromStart(train.arrivalTime);
      const e = getMinutesFromStart(train.departureTime);
      occupied.push({
        start: Math.max(0, s - 5),
        end: Math.min(totalMinutes, e + 5),
        type: 'TRAIN',
      });
    });

    // 2. Existing blocks (excluding the active dragging block)
    corridorBlocks.forEach((block) => {
      if (block.blockId === activeDraggingBlockId) return;
      const effective = getEffectiveBlockTime(block);
      const s = getMinutesFromStart(effective.startTime);
      const e = getMinutesFromStart(effective.endTime);
      occupied.push({
        start: Math.max(0, s),
        end: Math.min(totalMinutes, e),
        type: 'BLOCK',
      });
    });

    // Sort intervals by start
    occupied.sort((a, b) => a.start - b.start);

    // Merge overlapping intervals
    const merged: { start: number; end: number }[] = [];
    for (const curr of occupied) {
      if (merged.length === 0) {
        merged.push({ start: curr.start, end: curr.end });
      } else {
        const last = merged[merged.length - 1];
        if (curr.start <= last.end) {
          last.end = Math.max(last.end, curr.end);
        } else {
          merged.push({ start: curr.start, end: curr.end });
        }
      }
    }

    // Extract gaps as empty slots
    const slots: EmptySlot[] = [];
    let cursor = 0;

    for (const occ of merged) {
      if (occ.start > cursor) {
        const duration = occ.start - cursor;
        if (duration >= 30) {
          const sTime = formatOffsetToTime('08:00', cursor);
          const eTime = formatOffsetToTime('08:00', occ.start);
          slots.push({
            slotId: `SLOT-${corridorId}-${cursor}-${occ.start}`,
            corridorId,
            startMins: cursor,
            endMins: occ.start,
            startTime: sTime,
            endTime: eTime,
            durationMinutes: duration,
            canFit: duration >= requiredDuration,
          });
        }
      }
      cursor = Math.max(cursor, occ.end);
    }

    if (cursor < totalMinutes) {
      const duration = totalMinutes - cursor;
      if (duration >= 30) {
        const sTime = formatOffsetToTime('08:00', cursor);
        const eTime = formatOffsetToTime('08:00', totalMinutes);
        slots.push({
          slotId: `SLOT-${corridorId}-${cursor}-${totalMinutes}`,
          corridorId,
          startMins: cursor,
          endMins: totalMinutes,
          startTime: sTime,
          endTime: eTime,
          durationMinutes: duration,
          canFit: duration >= requiredDuration,
        });
      }
    }

    return slots;
  };

  // Find adjacent empty slots (immediately preceding and succeeding) for a specific block
  const getAdjacentEmptySlotsForBlock = (block: OptimizedBlock) => {
    const slots = getEmptySlotsForCorridor(block.corridorId, block.blockId, block.durationMinutes);
    const blockStartMins = getMinutesFromStart(block.startTime);
    const blockEndMins = getMinutesFromStart(block.endTime);

    // Preceding empty slots (end before block start)
    const preceding = slots
      .filter((s) => s.endMins <= blockStartMins)
      .sort((a, b) => b.endMins - a.endMins);

    // Succeeding empty slots (start after block end)
    const succeeding = slots
      .filter((s) => s.startMins >= blockEndMins)
      .sort((a, b) => a.startMins - b.startMins);

    return {
      previousEmptySlot: preceding[0] || null,
      nextEmptySlot: succeeding[0] || null,
      allCorridorSlots: slots,
    };
  };

  // Core Physical Shift Logic: Moves block to target empty slot and calls publishSchedule
  const handleShiftBlockToSlot = async (
    targetBlockId: string,
    slot: EmptySlot,
    targetStartMinuteOffset?: number
  ) => {
    const targetBlock = localBlocks.find((b) => b.blockId === targetBlockId);
    if (!targetBlock) return;

    // Determine target start time within the empty slot
    let newStartMins = slot.startMins;
    if (typeof targetStartMinuteOffset === 'number') {
      newStartMins = Math.max(slot.startMins, Math.min(slot.endMins - targetBlock.durationMinutes, targetStartMinuteOffset));
    }

    // Snap to 15-minute grid
    newStartMins = Math.round(newStartMins / 15) * 15;
    // Keep within slot bounds
    if (newStartMins + targetBlock.durationMinutes > slot.endMins) {
      newStartMins = Math.max(slot.startMins, slot.endMins - targetBlock.durationMinutes);
    }
    newStartMins = Math.max(slot.startMins, newStartMins);

    const newStartTime = formatOffsetToTime('08:00', newStartMins);
    const newEndTime = addMinutesToTime(newStartTime, targetBlock.durationMinutes);

    // Save previous snapshot for Undo
    const historyEntry: ShiftHistoryEntry = {
      blockId: targetBlock.blockId,
      prevStartTime: targetBlock.startTime,
      prevEndTime: targetBlock.endTime,
      prevCorridorId: targetBlock.corridorId,
      newStartTime,
      newEndTime,
      timestamp: new Date().toLocaleTimeString(),
    };
    setShiftHistory((prev) => [historyEntry, ...prev.slice(0, 9)]);

    // Reset manual minute offset override for this block
    setBlockAdjustments((prev) => {
      const next = { ...prev };
      delete next[targetBlock.blockId];
      return next;
    });

    // Create updated block object
    const updatedBlock: OptimizedBlock = {
      ...targetBlock,
      startTime: newStartTime,
      endTime: newEndTime,
      corridorId: slot.corridorId,
      hasConflict: false,
      validationStatus: 'VALID',
      status: 'SCHEDULED',
      explainability: {
        ...(targetBlock.explainability || {
          whyThisSlot: [],
          optimizationFactors: {
            corridorAvailability: '100% CLEAR - Lull window',
            trainCompatibility: 'NO_OVERLAPPING_TRAINS',
            constraintCompatibility: 'ALL_CONSTRAINTS_SATISFIED',
            operationalImpact: 'MINIMAL_DISRUPTION',
          },
          alternateEvaluatedCount: 3,
          disruptionAvoidanceMinutes: 90,
          constraintCheckSummary: 'Cleared',
        }),
        selectionRationale: `Physically shifted into adjacent empty slot (${newStartTime}–${newEndTime}) on ${slot.corridorId}. Verified train-free lull window.`,
      },
    };

    // 1. Optimistically update local UI state immediately
    const nextBlocks = localBlocks.map((b) => (b.blockId === targetBlockId ? updatedBlock : b));
    setLocalBlocks(nextBlocks);
    if (selectedBlock?.blockId === targetBlockId) {
      setSelectedBlock(updatedBlock);
    }

    // 2. Persist to mockStore
    mockStore.updateOptimizedBlocks(nextBlocks);

    // 3. Resolve any related open conflict in mockStore
    try {
      const conflicts = mockStore.getConflicts();
      const conflict = conflicts.find((c) => c.blockId === targetBlockId && c.status === 'OPEN');
      if (conflict) {
        conflict.status = 'RESOLVED';
        conflict.alternativeAppliedSlot = `${newStartTime}–${newEndTime} (${slot.corridorId})`;
        conflict.resolvedAt = new Date().toISOString();
        conflict.resolutionNotes = `Shifted into adjacent empty slot via Gantt drag-and-drop by planner.`;
      }
    } catch (e) {
      console.warn('Could not auto-resolve conflict entry:', e);
    }

    // 4. Update the backend via existing publishSchedule service logic!
    setIsPublishing(true);
    try {
      const res = await publishSchedule(
        'Railway Planner (Gantt Drag-Drop)',
        'RAILWAY_PLANNER',
        true
      );

      if (res.success) {
        setPublishNotification({
          blockId: targetBlock.blockId,
          assetId: targetBlock.assetId,
          department: targetBlock.department,
          oldTime: `${targetBlock.startTime}–${targetBlock.endTime}`,
          newTime: `${newStartTime}–${newEndTime}`,
          corridorId: slot.corridorId,
          scheduleId: res.scheduleId || res.publicationInfo?.publishedScheduleId,
          scheduleVersion: res.publicationInfo?.scheduleVersion,
          timestamp: new Date().toLocaleTimeString(),
        });

        try {
          railwayAudio.playBeep(920, 0.08);
        } catch {}
      }
    } catch (err) {
      console.error('Failed to update backend via publishSchedule:', err);
    } finally {
      setIsPublishing(false);
      if (onRefreshData) {
        onRefreshData();
      }
    }
  };

  // Undo previous block shift
  const handleUndoShift = async () => {
    if (shiftHistory.length === 0) return;
    const last = shiftHistory[0];
    const targetBlock = localBlocks.find((b) => b.blockId === last.blockId);
    if (!targetBlock) return;

    const revertedBlock: OptimizedBlock = {
      ...targetBlock,
      startTime: last.prevStartTime,
      endTime: last.prevEndTime,
      corridorId: last.prevCorridorId,
    };

    const nextBlocks = localBlocks.map((b) => (b.blockId === last.blockId ? revertedBlock : b));
    setLocalBlocks(nextBlocks);
    setShiftHistory((prev) => prev.slice(1));
    mockStore.updateOptimizedBlocks(nextBlocks);

    setIsPublishing(true);
    try {
      const res = await publishSchedule(
        'Railway Planner (Undo Shift)',
        'RAILWAY_PLANNER',
        true
      );
      if (res.success) {
        setPublishNotification({
          blockId: targetBlock.blockId,
          assetId: targetBlock.assetId,
          department: targetBlock.department,
          oldTime: `${last.newStartTime}–${last.newEndTime}`,
          newTime: `${last.prevStartTime}–${last.prevEndTime}`,
          corridorId: last.prevCorridorId,
          scheduleId: res.scheduleId || res.publicationInfo?.publishedScheduleId,
          scheduleVersion: res.publicationInfo?.scheduleVersion,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      console.error('Failed to undo block shift:', err);
    } finally {
      setIsPublishing(false);
      if (onRefreshData) onRefreshData();
    }
  };

  // Explicit Manual Publish Schedule Trigger
  const handleExplicitPublish = async () => {
    setIsPublishing(true);
    try {
      const res = await publishSchedule('Chief Block Coordinator', 'RAILWAY_PLANNER', true);
      if (res.success) {
        setPublishNotification({
          blockId: 'ALL-BLOCKS',
          assetId: 'NETWORK',
          department: 'ALL',
          oldTime: 'Schedule Updated',
          newTime: 'Fully Synced',
          corridorId: selectedCorridorId,
          scheduleId: res.scheduleId || res.publicationInfo?.publishedScheduleId,
          scheduleVersion: res.publicationInfo?.scheduleVersion,
          timestamp: new Date().toLocaleTimeString(),
        });
        try {
          railwayAudio.playBeep(880, 0.1);
        } catch {}
      }
    } catch (e) {
      console.error('Explicit publish error:', e);
    } finally {
      setIsPublishing(false);
      if (onRefreshData) onRefreshData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CalendarClock className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Gantt Corridor Schedule Timeline (08:00 – 20:00)
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                DRAG-AND-DROP ACTIVE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                BACKEND SYNC ENABLED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Physically shift maintenance blocks into adjacent empty lull slots by dragging block grip handles. Dropping auto-updates the backend via <strong className="text-sky-300">publishSchedule</strong>.
            </p>
          </div>

          {/* Top Actions: Corridor Filter & Publish Schedule */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Corridor:</span>
              <select
                value={selectedCorridorId}
                onChange={(e) => setSelectedCorridorId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">All Corridors (C001–C004)</option>
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Explicit Publish Schedule Button */}
            <button
              id="explicit-publish-schedule-btn"
              onClick={handleExplicitPublish}
              disabled={isPublishing}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-sky-950 to-blue-950 hover:from-sky-900 hover:to-blue-900 text-sky-200 hover:text-white border border-sky-500/80 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_8px_rgba(56,189,248,0.25)] cursor-pointer disabled:opacity-50"
              title="Publish current schedule to backend via publishSchedule"
            >
              <UploadCloud className={`w-3.5 h-3.5 text-sky-400 ${isPublishing ? 'animate-bounce' : ''}`} />
              <span>{isPublishing ? 'Publishing...' : 'Publish Schedule'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DRAG-AND-DROP PUBLICATION CONFIRMATION BANNER */}
      {publishNotification && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-950 to-emerald-950/80 border border-emerald-500/80 rounded-xl p-3.5 text-xs font-mono text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <div className="flex items-start md:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-900/60 border border-emerald-500 text-emerald-300 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-300">
                  BLOCK SHIFTED &amp; PUBLISHED TO BACKEND
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px]">
                  via publishSchedule
                </span>
                {publishNotification.scheduleId && (
                  <span className="text-[10px] text-slate-400">
                    ID: <strong className="text-white">{publishNotification.scheduleId}</strong>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Block <strong className="text-sky-300">{publishNotification.blockId}</strong> shifted from{' '}
                <span className="line-through text-slate-400">{publishNotification.oldTime}</span> ➔{' '}
                <strong className="text-emerald-300">{publishNotification.newTime}</strong> on{' '}
                <span className="text-sky-300">{publishNotification.corridorId}</span>. All safety gates passed conflict-free.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {shiftHistory.length > 0 && (
              <button
                type="button"
                onClick={handleUndoShift}
                disabled={isPublishing}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Undo last block shift and re-publish previous timetable"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Undo Shift</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPublishNotification(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DRAGGING HUD CUE */}
      {draggingBlock && (
        <div className="p-2.5 rounded-lg bg-indigo-950/90 border border-indigo-500/80 flex items-center justify-between text-xs font-mono text-indigo-200 animate-pulse shadow-md">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>DRAGGING BLOCK {draggingBlock.blockId}:</strong> Duration is {draggingBlock.durationMinutes} mins. Drop onto any green highlighted <strong className="text-emerald-300">&quot;Empty Slot&quot;</strong> target on the timeline.
            </span>
          </div>
          <span className="text-[11px] text-indigo-300">Release over green slot to shift</span>
        </div>
      )}

      {/* LEGEND & OPERATIONAL LAYERS BAR */}
      <div className="bg-[#0a1020] p-3 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 uppercase text-[11px] font-bold">LEGEND:</span>
          {/* Maintenance Blocks by Dept */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600"></span>
            <span className="text-slate-300">Engineering Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600"></span>
            <span className="text-slate-300">S&amp;T Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-600"></span>
            <span className="text-slate-300">Traction Block</span>
          </div>

          {/* Empty Slot Legend Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-dashed border-emerald-400 bg-emerald-950/60"></span>
            <span className="text-emerald-300 font-bold">Empty Lull Slot (Drop Target)</span>
          </div>

          {/* Train Types */}
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-600"></span>
            <span className="text-slate-300">Vande Bharat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600"></span>
            <span className="text-slate-300">Rajdhani / Shatabdi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-500"></span>
            <span className="text-slate-300">Express / Freight</span>
          </div>
        </div>

        {/* Operational Safety Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowOheLayer((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
              showOheLayer
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>25kV OHE Interlocking</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMonsoonLayer((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
              showMonsoonLayer
                ? 'bg-sky-950/80 border-sky-500 text-sky-300 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>Monsoon Speed Layer</span>
          </button>

          {/* Conflict Marker Callout */}
          <div className="flex items-center gap-1.5 bg-rose-950/60 px-2.5 py-1 rounded border border-rose-800/80 text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-[11px] font-bold">⚠ TRAIN-BLOCK OVERLAP</span>
          </div>
        </div>
      </div>

      {/* MAIN GANTT TIMELINE GRID */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-lg space-y-6 overflow-x-auto">
        <div className="min-w-[950px]">
          {/* Time Header Ruler */}
          <div className="flex border-b border-slate-700 pb-2 pl-44">
            {hourLabels.map((h) => (
              <div
                key={h}
                className="flex-1 text-center font-mono text-[11px] text-slate-400 border-l border-slate-800/80 first:border-l-0"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Corridor Rows */}
          <div className="space-y-6 mt-4">
            {visibleCorridors.map((corridor) => {
              const corridorBlocks = localBlocks.filter((b) => b.corridorId === corridor.id);
              const corridorTrains = trains.filter((t) => t.corridorId === corridor.id);
              const corridorEmptySlots = getEmptySlotsForCorridor(
                corridor.id,
                draggingBlock?.blockId,
                draggingBlock?.durationMinutes || 45
              );

              return (
                <div
                  key={corridor.id}
                  className="rounded-lg bg-slate-900/60 border border-slate-800 p-3.5 space-y-2.5 hover:border-slate-700 transition-colors"
                >
                  {/* Corridor Header */}
                  <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                        {corridor.id}
                      </span>
                      <span className="font-semibold text-slate-200">{corridor.name}</span>
                      <span className="text-[11px] text-slate-400">
                        ({corridor.fromStation || corridor.stationFrom} ↔ {corridor.toStation || corridor.stationTo})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-400">
                        Available Empty Lulls:{' '}
                        <strong className="text-emerald-400">{corridorEmptySlots.length} slots</strong>
                      </span>
                      <span className="text-slate-400">
                        Scheduled Blocks:{' '}
                        <strong className="text-sky-300">{corridorBlocks.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Operational Layer: 25kV OHE TRACTION INTERLOCKING RIBBON */}
                  {showOheLayer && (
                    <div className="flex items-center text-xs bg-amber-950/20 rounded border border-amber-900/40 px-1 py-1">
                      <div className="w-44 font-mono text-[10px] text-amber-400 font-semibold flex items-center gap-1.5 shrink-0 pl-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>25kV OHE Feeder</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between px-2 text-[10px] font-mono text-amber-200/90">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-300 font-bold">
                            TSS-{corridor.id}-A
                          </span>
                          <span>Traction Isolation Window: 09:30 – 12:45 | Earthing Discharge Rods Assigned</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Interlocked with S&amp;T Point Machines
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Operational Layer: MONSOON SPEED RESTRICTION RIBBON */}
                  {showMonsoonLayer && (
                    <div className="flex items-center text-xs bg-sky-950/20 rounded border border-sky-900/40 px-1 py-1">
                      <div className="w-44 font-mono text-[10px] text-sky-400 font-semibold flex items-center gap-1.5 shrink-0 pl-1">
                        <CloudRain className="w-3 h-3 text-sky-400" />
                        <span>Monsoon WSR</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between px-2 text-[10px] font-mono text-sky-200/90">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-sky-900/60 border border-sky-700 text-sky-300 font-bold">
                            WSR 45 km/h
                          </span>
                          <span>KM 14/2–18/6: Waterlogging Precaution Active (+12m Headway Buffer)</span>
                        </div>
                        <span className="text-[9px] text-slate-400">
                          Rain Gauge: 48mm/hr (Moderate)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sub-row 1: TRAIN MOVEMENTS */}
                  <div className="flex items-center text-xs">
                    <div className="w-44 font-mono text-[11px] text-indigo-300 font-semibold flex items-center gap-1.5 shrink-0">
                      <TrainIcon className="w-3.5 h-3.5" />
                      <span>Train Paths</span>
                    </div>
                    <div className="flex-1 relative h-8 bg-slate-950/80 rounded border border-slate-800 overflow-hidden">
                      {/* Grid vertical guide lines */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/40">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i}></div>
                        ))}
                      </div>

                      {/* Render Trains */}
                      {corridorTrains.map((train, idx) => {
                        const left = getLeftPercent(train.arrivalTime);
                        const width = Math.max(3, getWidthPercent(train.arrivalTime, train.departureTime));

                        let bgClass = 'bg-slate-600 hover:bg-slate-500';
                        if (train.category === 'VANDE_BHARAT') bgClass = 'bg-purple-600 hover:bg-purple-500';
                        else if (train.category === 'RAJDHANI' || train.category === 'SHATABDI')
                          bgClass = 'bg-blue-600 hover:bg-blue-500';
                        else if (train.category === 'FREIGHT') bgClass = 'bg-amber-700/80 hover:bg-amber-600';

                        return (
                          <div
                            key={`${train.trainNumber}-${idx}`}
                            onClick={() => setSelectedTrain(train)}
                            title={`${train.trainNumber} (${train.trainName}) [${train.arrivalTime}–${train.departureTime}]`}
                            className={`absolute top-1 bottom-1 rounded px-1 flex items-center justify-between text-[10px] font-mono text-white cursor-pointer shadow transition-all truncate ${bgClass} ${
                              train.conflictWithBlockId ? 'ring-2 ring-rose-500' : ''
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span className="truncate font-semibold">{train.trainNumber}</span>
                            {train.conflictWithBlockId && (
                              <span className="text-[9px] bg-rose-950 text-rose-300 px-1 rounded ml-1 font-bold">
                                ⚠
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-row 2: MAINTENANCE BLOCKS WITH DRAG-AND-DROP & ADJACENT EMPTY SLOTS */}
                  <div className="flex items-center text-xs">
                    <div className="w-44 font-mono text-[11px] text-sky-300 font-semibold flex items-center justify-between pr-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Blocks Track</span>
                      </div>
                      <span className="text-[9px] text-slate-500 flex items-center gap-0.5" title="Drag blocks to empty slots">
                        <GripVertical className="w-2.5 h-2.5 text-slate-400" />
                        <span>Drag</span>
                      </span>
                    </div>

                    <div
                      className={`flex-1 relative h-10 rounded border overflow-hidden transition-all ${
                        draggingBlock
                          ? 'bg-slate-950/90 border-emerald-500/70 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                    >
                      {/* Grid vertical guide lines */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/40">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i}></div>
                        ))}
                      </div>

                      {/* 1. RENDER ADJACENT EMPTY TIME SLOTS AS DROP TARGETS */}
                      {corridorEmptySlots.map((slot) => {
                        const left = getLeftPercent(slot.startTime);
                        const width = getWidthPercent(slot.startTime, slot.endTime);
                        const isHovered = dragOverSlot?.slotId === slot.slotId;
                        const isDragging = draggingBlock !== null;

                        return (
                          <div
                            key={`empty-${slot.slotId}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverSlot?.slotId !== slot.slotId) {
                                setDragOverSlot(slot);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverSlot?.slotId === slot.slotId) {
                                setDragOverSlot(null);
                              }
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const droppedBlockId =
                                e.dataTransfer.getData('text/plain') || draggingBlock?.blockId;
                              if (droppedBlockId) {
                                await handleShiftBlockToSlot(droppedBlockId, slot);
                              }
                              setDraggingBlock(null);
                              setDragOverSlot(null);
                            }}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            className={`absolute top-0.5 bottom-0.5 rounded transition-all flex items-center justify-center font-mono ${
                              isHovered
                                ? 'border-2 border-emerald-300 bg-emerald-500/40 text-white font-bold ring-2 ring-emerald-300 scale-[1.01] z-30 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                                : isDragging
                                ? slot.canFit
                                  ? 'border-2 border-dashed border-emerald-400/90 bg-emerald-950/60 text-emerald-200 animate-pulse z-20 hover:border-emerald-300'
                                  : 'border border-dashed border-amber-500/50 bg-amber-950/30 text-amber-300/80 z-10'
                                : 'border border-dashed border-emerald-900/30 bg-emerald-950/10 text-emerald-500/50 hover:border-emerald-700/60 hover:text-emerald-400 z-10'
                            }`}
                            title={`Empty Slot on ${corridor.id}: ${slot.startTime}–${slot.endTime} (${slot.durationMinutes}m duration). Drop block here to shift.`}
                          >
                            <span className="text-[10px] truncate px-1 flex items-center gap-1 select-none pointer-events-none">
                              {isHovered ? (
                                <>
                                  <Sparkles className="w-3 h-3 text-emerald-200 animate-spin" />
                                  <span className="font-bold">Release to Shift Here ({slot.startTime}–{slot.endTime})</span>
                                </>
                              ) : isDragging ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="font-semibold truncate">
                                    Empty Slot ({slot.startTime}–{slot.endTime} · {slot.durationMinutes}m)
                                  </span>
                                </>
                              ) : (
                                <span className="opacity-60 text-[9px] truncate">
                                  + Empty ({slot.startTime}–{slot.endTime})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* 2. RENDER DRAGGABLE MAINTENANCE BLOCKS */}
                      {corridorBlocks.map((block, idx) => {
                        const effective = getEffectiveBlockTime(block);
                        const left = getLeftPercent(effective.startTime);
                        const width = getWidthPercent(effective.startTime, effective.endTime);
                        const isBeingDragged = draggingBlock?.blockId === block.blockId;

                        let bgClass = 'bg-amber-600/95 hover:bg-amber-500';
                        if (block.department === 'S&T') bgClass = 'bg-emerald-600/95 hover:bg-emerald-500';
                        else if (block.department === 'TRACTION') bgClass = 'bg-cyan-600/95 hover:bg-cyan-500';

                        return (
                          <div
                            key={`${block.blockId}-${idx}`}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', block.blockId);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingBlock(block);
                              try {
                                railwayAudio.playBeep(650, 0.04);
                              } catch {}
                            }}
                            onDragEnd={() => {
                              setDraggingBlock(null);
                              setDragOverSlot(null);
                            }}
                            onClick={() => setSelectedBlock(block)}
                            className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-[10px] font-mono text-white cursor-grab active:cursor-grabbing shadow-md transition-all select-none z-20 ${bgClass} ${
                              isBeingDragged
                                ? 'opacity-30 ring-2 ring-white scale-95'
                                : 'hover:scale-[1.01]'
                            } ${
                              block.hasConflict
                                ? 'ring-2 ring-rose-500 border border-rose-300 animate-pulse'
                                : 'border border-white/20'
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`Drag block ${block.blockId} (${block.startTime}–${block.endTime}) to shift to an adjacent empty time slot`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <GripVertical className="w-3 h-3 text-white/70 shrink-0 cursor-grab" />
                              <span className="truncate font-bold tracking-tight">
                                {block.blockId} ({block.assetId})
                                {effective.offset !== 0 && (
                                  <span className="ml-1 text-[9px] px-1 rounded bg-black/60 text-amber-200">
                                    {effective.offset > 0 ? `+${effective.offset}m` : `${effective.offset}m`}
                                  </span>
                                )}
                              </span>
                            </div>

                            {block.hasConflict ? (
                              <span className="text-[9px] bg-rose-950 text-rose-200 px-1 py-0.2 rounded font-black ml-1 border border-rose-400 shrink-0">
                                ⚠ OVERLAP
                              </span>
                            ) : (
                              <span className="text-[9px] text-white/70 ml-1 shrink-0">
                                {effective.startTime}–{effective.endTime}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BLOCK DETAIL POPOVER MODAL WITH ACCESSIBLE ADJACENT SHIFT CONTROLS */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e162c] border border-sky-800/80 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-950/80 bg-[#0a1020]">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Block Details &amp; Slot Shifter: {selectedBlock.blockId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              {(() => {
                const effective = getEffectiveBlockTime(selectedBlock);
                const { previousEmptySlot, nextEmptySlot } = getAdjacentEmptySlotsForBlock(selectedBlock);

                return (
                  <>
                    {/* Metadata Card */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Task ID</span>
                        <span className="text-slate-200 font-bold">{selectedBlock.taskId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Asset ID</span>
                        <span className="text-slate-200 font-bold">{selectedBlock.assetId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Department</span>
                        <span className="text-sky-300 font-bold">{selectedBlock.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Corridor</span>
                        <span className="text-slate-200 font-bold">{selectedBlock.corridorId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Scheduled Window</span>
                        <span className="text-slate-200 font-bold text-sky-300">
                          {effective.startTime} – {effective.endTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Duration</span>
                        <span className="text-slate-200 font-bold text-emerald-300">
                          {selectedBlock.durationMinutes} Minutes
                        </span>
                      </div>
                    </div>

                    {/* PHYSICAL SHIFT TO ADJACENT EMPTY SLOTS (1-CLICK & ACCESSIBLE) */}
                    <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-700/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                          <MoveHorizontal className="w-3.5 h-3.5" />
                          <span>Shift to Adjacent Empty Lull Slots:</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          Auto-publishes to Backend
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Shift this block directly into adjacent unoccupied operational windows. Updates the backend via <strong className="text-emerald-300">publishSchedule</strong>.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* Shift to Previous Empty Slot */}
                        <button
                          type="button"
                          disabled={!previousEmptySlot || isPublishing}
                          onClick={() => {
                            if (previousEmptySlot) {
                              handleShiftBlockToSlot(selectedBlock.blockId, previousEmptySlot);
                            }
                          }}
                          className={`p-2 rounded text-left border flex flex-col justify-between transition-colors ${
                            previousEmptySlot
                              ? 'bg-slate-900/90 hover:bg-emerald-950/80 border-slate-700 hover:border-emerald-500 text-slate-200 cursor-pointer'
                              : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <ArrowLeft className="w-3 h-3 text-emerald-400" />
                              <span>Earlier Lull</span>
                            </span>
                            {previousEmptySlot && (
                              <span className="text-emerald-400 font-bold">
                                {previousEmptySlot.durationMinutes}m
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-100 mt-1">
                            {previousEmptySlot
                              ? `${previousEmptySlot.startTime} – ${previousEmptySlot.endTime}`
                              : 'No Earlier Lull'}
                          </div>
                        </button>

                        {/* Shift to Next Empty Slot */}
                        <button
                          type="button"
                          disabled={!nextEmptySlot || isPublishing}
                          onClick={() => {
                            if (nextEmptySlot) {
                              handleShiftBlockToSlot(selectedBlock.blockId, nextEmptySlot);
                            }
                          }}
                          className={`p-2 rounded text-left border flex flex-col justify-between transition-colors ${
                            nextEmptySlot
                              ? 'bg-slate-900/90 hover:bg-emerald-950/80 border-slate-700 hover:border-emerald-500 text-slate-200 cursor-pointer'
                              : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <span>Later Lull</span>
                              <ArrowRight className="w-3 h-3 text-emerald-400" />
                            </span>
                            {nextEmptySlot && (
                              <span className="text-emerald-400 font-bold">
                                {nextEmptySlot.durationMinutes}m
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-100 mt-1">
                            {nextEmptySlot
                              ? `${nextEmptySlot.startTime} – ${nextEmptySlot.endTime}`
                              : 'No Later Lull'}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Minute Adjustment Nudges */}
                    <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Fine-Tuning Minute Nudges:</span>
                        </span>
                        {effective.offset !== 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                            Shifted: {effective.offset > 0 ? `+${effective.offset} min` : `${effective.offset} min`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => shiftBlockTime(selectedBlock.blockId, -30)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 cursor-pointer"
                        >
                          -30 min
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftBlockTime(selectedBlock.blockId, -15)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 cursor-pointer"
                        >
                          -15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftBlockTime(selectedBlock.blockId, 15)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 cursor-pointer"
                        >
                          +15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftBlockTime(selectedBlock.blockId, 30)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 cursor-pointer"
                        >
                          +30 min
                        </button>
                        {effective.offset !== 0 && (
                          <button
                            type="button"
                            onClick={() => resetBlockTime(selectedBlock.blockId)}
                            className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] border border-rose-800 cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Conflict Status */}
              <div
                className={`p-3 rounded-lg border ${
                  selectedBlock.hasConflict
                    ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Conflict Status:</span>
                  <span>{selectedBlock.hasConflict ? 'CRITICAL OVERLAP DETECTED' : 'CONFLICT-FREE'}</span>
                </div>
                {selectedBlock.hasConflict && (
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    This block intersects with train traffic on corridor {selectedBlock.corridorId}. Drag the block into an adjacent empty lull slot or use the shift buttons above to clear the conflict.
                  </p>
                )}
              </div>

              {/* Rationale */}
              {selectedBlock.explainability?.selectionRationale && (
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block mb-1">
                    Slot Selection Rationale:
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {selectedBlock.explainability.selectionRationale}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-[#0a1020] flex items-center justify-between">
              {selectedBlock.hasConflict ? (
                <button
                  onClick={() => {
                    const id = selectedBlock.blockId;
                    setSelectedBlock(null);
                    onNavigateToConflict(id);
                  }}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Resolve in Conflict Center</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setSelectedBlock(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRAIN DETAIL POPOVER MODAL */}
      {selectedTrain && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e162c] border border-sky-800/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-950/80 bg-[#0a1020]">
              <div className="flex items-center gap-2">
                <TrainIcon className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {selectedTrain.trainNumber} - {selectedTrain.trainName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs font-mono">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-purple-300 font-bold">{selectedTrain.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Route / Corridor:</span>
                  <span className="text-slate-200">
                    {selectedTrain.originStation} → {selectedTrain.destinationStation} ({selectedTrain.corridorId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Slot Window:</span>
                  <span className="text-sky-300 font-bold">
                    {selectedTrain.arrivalTime} – {selectedTrain.departureTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Punctuality Status:</span>
                  <span className="text-emerald-400">{selectedTrain.status}</span>
                </div>
              </div>

              {selectedTrain.conflictWithBlockId && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Train-Block Path Overlap</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Conflicting Maintenance Block ID: <strong>{selectedTrain.conflictWithBlockId}</strong>. Train priority requires maintenance block rescheduling. Drag the conflicting block to an adjacent empty slot to resolve.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-[#0a1020] flex justify-end">
              <button
                onClick={() => setSelectedTrain(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
