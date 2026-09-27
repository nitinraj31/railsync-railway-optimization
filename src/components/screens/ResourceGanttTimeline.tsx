import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Layers,
  Filter,
  Search,
  Truck,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Info,
  Zap,
  HardHat,
  Sun,
  Sunrise,
  Moon,
  ShieldCheck,
  X,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Gauge,
  Activity,
  Check,
  Link as LinkIcon,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Corridor,
  MachineryResource,
  ManpowerGang,
  OptimizedBlock,
  Conflict,
  DepartmentType,
  MachineryType,
} from '../../types';
import { getOptimizedBlocks } from '../../services/api';

export type GanttTimeRange = '24_HOURS' | 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';

interface ResourceGanttTimelineProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  machinery: MachineryResource[];
  gangs: ManpowerGang[];
  conflicts?: Conflict[];
  initialCorridorId?: string;
  initialShift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  onNavigateToTimeline?: () => void;
  onNavigateToConflicts?: () => void;
  onReallocateMachinery?: (machineId: string, toCorridorId: string) => Promise<any>;
  onReallocateGang?: (gangId: string, toCorridorId: string) => Promise<any>;
}

// Convert "HH:MM" to total minutes from 00:00
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Convert minutes to "HH:MM" string
function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.floor(normalized % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const ResourceGanttTimeline: React.FC<ResourceGanttTimelineProps> = ({
  corridors,
  blocks = [],
  machinery,
  gangs,
  conflicts = [],
  initialCorridorId,
  initialShift,
  onNavigateToTimeline,
  onNavigateToConflicts,
  onReallocateMachinery,
  onReallocateGang,
}) => {
  // Controls & Filters
  const [activeBlocks, setActiveBlocks] = useState<OptimizedBlock[]>(blocks || []);

  useEffect(() => {
    if (blocks && blocks.length > 0) {
      setActiveBlocks(blocks);
    } else {
      getOptimizedBlocks()
        .then((res) => {
          if (res && res.length > 0) {
            setActiveBlocks(res);
          }
        })
        .catch((e) => console.warn('Failed to load blocks in ResourceGanttTimeline', e));
    }
  }, [blocks]);

  const [timeRange, setTimeRange] = useState<GanttTimeRange>(
    initialShift ? (initialShift as GanttTimeRange) : '24_HOURS'
  );
  const [selectedCorridor, setSelectedCorridor] = useState<string>(initialCorridorId || 'ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBlocksLayer, setShowBlocksLayer] = useState<boolean>(true);
  const [showMachineryLayer, setShowMachineryLayer] = useState<boolean>(true);
  const [showGangsLayer, setShowGangsLayer] = useState<boolean>(true);
  const [highlightGaps, setHighlightGaps] = useState<boolean>(true);

  // Reallocation interactive state
  const [reallocateTargetCorridor, setReallocateTargetCorridor] = useState<string>('');
  const [isReallocating, setIsReallocating] = useState<boolean>(false);
  const [reallocationNotice, setReallocationNotice] = useState<string | null>(null);

  const handlePerformReallocation = async () => {
    if (!selectedEntity || !reallocateTargetCorridor) return;
    setIsReallocating(true);
    try {
      if (selectedEntity.type === 'MACHINERY' && onReallocateMachinery) {
        await onReallocateMachinery(selectedEntity.data.id, reallocateTargetCorridor);
        setReallocationNotice(`Machine ${selectedEntity.data.id} successfully redeployed to ${reallocateTargetCorridor}`);
      } else if (selectedEntity.type === 'GANG' && onReallocateGang) {
        await onReallocateGang(selectedEntity.data.id, reallocateTargetCorridor);
        setReallocationNotice(`Gang ${selectedEntity.data.name} transferred to corridor ${reallocateTargetCorridor}`);
      }
      setTimeout(() => setReallocationNotice(null), 4000);
      setReallocateTargetCorridor('');
    } catch (e) {
      console.error('Reallocation error:', e);
    } finally {
      setIsReallocating(false);
    }
  };

  // Selection & Inspector state
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'BLOCK' | 'MACHINERY' | 'GANG';
    data: any;
  } | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  // Time window bounds in minutes
  const timeWindow = useMemo(() => {
    switch (timeRange) {
      case 'DAY_SHIFT':
        return { startMin: 360, endMin: 840, totalMin: 480, label: 'Day Shift (06:00 – 14:00)' };
      case 'AFTERNOON_SHIFT':
        return { startMin: 840, endMin: 1320, totalMin: 480, label: 'Afternoon Shift (14:00 – 22:00)' };
      case 'NIGHT_MEGA_BLOCK':
        // Overnight window: 22:00 to 06:00 (8 hours)
        return { startMin: 1320, endMin: 1800, totalMin: 480, label: 'Night Mega-Block (22:00 – 06:00)' };
      case '24_HOURS':
      default:
        return { startMin: 0, endMin: 1440, totalMin: 1440, label: '24-Hour Master Operational Cycle (00:00 – 24:00)' };
    }
  }, [timeRange]);

  // Hourly markers for the ruler
  const hourMarkers = useMemo(() => {
    const markers: { label: string; offsetPct: number }[] = [];
    if (timeRange === '24_HOURS') {
      for (let h = 0; h <= 24; h += 2) {
        const mins = h * 60;
        const pct = (mins / 1440) * 100;
        markers.push({ label: `${String(h % 24).padStart(2, '0')}:00`, offsetPct: pct });
      }
    } else if (timeRange === 'NIGHT_MEGA_BLOCK') {
      for (let m = 1320; m <= 1800; m += 60) {
        const pct = ((m - 1320) / 480) * 100;
        const normalizedH = Math.floor((m % 1440) / 60);
        markers.push({ label: `${String(normalizedH).padStart(2, '0')}:00`, offsetPct: pct });
      }
    } else {
      const step = 60;
      for (let m = timeWindow.startMin; m <= timeWindow.endMin; m += step) {
        const pct = ((m - timeWindow.startMin) / timeWindow.totalMin) * 100;
        const h = Math.floor(m / 60);
        markers.push({ label: `${String(h).padStart(2, '0')}:00`, offsetPct: pct });
      }
    }
    return markers;
  }, [timeRange, timeWindow]);

  // Function to calculate timeline horizontal positioning (%)
  const getTimelinePosition = (startStr: string, endStr: string) => {
    let sMin = timeToMinutes(startStr);
    let eMin = timeToMinutes(endStr);

    if (eMin <= sMin) {
      eMin += 1440; // overnight handling
    }

    if (timeRange === '24_HOURS') {
      const left = Math.max(0, Math.min(100, (sMin / 1440) * 100));
      const width = Math.max(1.8, Math.min(100 - left, ((eMin - sMin) / 1440) * 100));
      return { left: `${left}%`, width: `${width}%`, isVisible: true };
    }

    if (timeRange === 'NIGHT_MEGA_BLOCK') {
      // Offset range from 1320 (22:00) to 1800 (06:00 next day)
      let adjustedStart = sMin < 360 ? sMin + 1440 : sMin;
      let adjustedEnd = eMin < 360 ? eMin + 1440 : eMin;

      // Check visibility overlap
      if (adjustedEnd < 1320 || adjustedStart > 1800) {
        return { left: '0%', width: '0%', isVisible: false };
      }

      const clampedStart = Math.max(1320, adjustedStart);
      const clampedEnd = Math.min(1800, adjustedEnd);
      const left = ((clampedStart - 1320) / 480) * 100;
      const width = Math.max(2, ((clampedEnd - clampedStart) / 480) * 100);
      return { left: `${left}%`, width: `${width}%`, isVisible: true };
    }

    // Specific Day / Afternoon shift
    if (eMin < timeWindow.startMin || sMin > timeWindow.endMin) {
      return { left: '0%', width: '0%', isVisible: false };
    }

    const clampedStart = Math.max(timeWindow.startMin, sMin);
    const clampedEnd = Math.min(timeWindow.endMin, eMin);
    const left = ((clampedStart - timeWindow.startMin) / timeWindow.totalMin) * 100;
    const width = Math.max(2, ((clampedEnd - clampedStart) / timeWindow.totalMin) * 100);
    return { left: `${left}%`, width: `${width}%`, isVisible: true };
  };

  // Gang shift time boundaries helper
  const getGangShiftTimes = (shift: string): { start: string; end: string } => {
    switch (shift) {
      case 'DAY_SHIFT':
        return { start: '06:00', end: '14:00' };
      case 'AFTERNOON_SHIFT':
        return { start: '14:00', end: '22:00' };
      case 'NIGHT_MEGA_BLOCK':
        return { start: '22:00', end: '06:00' };
      default:
        return { start: '08:00', end: '16:00' };
    }
  };

  // Active blocks filtered by search & corridor & department
  const filteredBlocks = useMemo(() => {
    return activeBlocks.filter((b) => {
      if (selectedCorridor !== 'ALL' && b.corridorId !== selectedCorridor) return false;
      if (selectedDepartment !== 'ALL') {
        const deptNorm = selectedDepartment.toUpperCase();
        if (!b.department.toUpperCase().includes(deptNorm)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = b.blockId.toLowerCase().includes(q);
        const matchesCorr = b.corridorId.toLowerCase().includes(q);
        const matchesSec = b.section.toLowerCase().includes(q);
        const matchesDept = b.department.toLowerCase().includes(q);
        return matchesId || matchesCorr || matchesSec || matchesDept;
      }
      return true;
    });
  }, [activeBlocks, selectedCorridor, selectedDepartment, searchQuery]);

  // Machinery filtered by corridor & search
  const filteredMachinery = useMemo(() => {
    return machinery.filter((m) => {
      if (selectedCorridor !== 'ALL' && m.corridorId !== selectedCorridor && m.corridorId !== 'CENTRAL_DEPOT') {
        return false;
      }
      if (selectedDepartment !== 'ALL') {
        if (selectedDepartment === 'CIVIL' && m.type !== 'TAMPING_MACHINE' && m.type !== 'BALLAST_REGULATOR' && m.type !== 'RAIL_GRINDER' && m.type !== 'TRACK_STABILIZER') {
          return false;
        }
        if (selectedDepartment === 'TRACTION' && m.type !== 'TOWER_WAGON') {
          return false;
        }
        if (selectedDepartment === 'SIGNALLING' && m.type !== 'USFD_CAR') {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = m.id.toLowerCase().includes(q);
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesModel = m.model.toLowerCase().includes(q);
        const matchesOp = m.operatorName.toLowerCase().includes(q);
        const matchesSec = (m.currentSection || '').toLowerCase().includes(q);
        return matchesId || matchesName || matchesModel || matchesOp || matchesSec;
      }
      return true;
    });
  }, [machinery, selectedCorridor, selectedDepartment, searchQuery]);

  // Gangs filtered by corridor & department & search
  const filteredGangs = useMemo(() => {
    return gangs.filter((g) => {
      if (selectedCorridor !== 'ALL' && g.corridorId !== selectedCorridor) return false;
      if (selectedDepartment !== 'ALL') {
        const deptNorm = selectedDepartment.toUpperCase();
        if (!g.department.toUpperCase().includes(deptNorm) && !g.trade.toUpperCase().includes(deptNorm)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesSupervisor = g.supervisor.toLowerCase().includes(q);
        const matchesTrade = g.trade.toLowerCase().includes(q);
        const matchesSec = (g.assignedSection || '').toLowerCase().includes(q);
        return matchesName || matchesSupervisor || matchesTrade || matchesSec;
      }
      return true;
    });
  }, [gangs, selectedCorridor, selectedDepartment, searchQuery]);

  // Active Corridors to display as swimlane groups
  const activeCorridorList = useMemo(() => {
    if (selectedCorridor !== 'ALL') {
      return corridors.filter((c) => c.id === selectedCorridor);
    }
    return corridors;
  }, [corridors, selectedCorridor]);

  // Machine icon & color helper
  const getMachineTypeBadge = (type: MachineryType) => {
    switch (type) {
      case 'TAMPING_MACHINE':
        return { label: 'Tamping Machine', color: 'text-amber-400 bg-amber-950/80 border-amber-800' };
      case 'BALLAST_REGULATOR':
        return { label: 'Ballast Regulator', color: 'text-orange-400 bg-orange-950/80 border-orange-800' };
      case 'TOWER_WAGON':
        return { label: 'OHE Tower Wagon', color: 'text-sky-400 bg-sky-950/80 border-sky-800' };
      case 'RAIL_GRINDER':
        return { label: 'Rail Grinder (RGM)', color: 'text-purple-400 bg-purple-950/80 border-purple-800' };
      case 'TRACK_STABILIZER':
        return { label: 'Track Stabilizer', color: 'text-teal-400 bg-teal-950/80 border-teal-800' };
      case 'USFD_CAR':
        return { label: 'USFD Testing Car', color: 'text-rose-400 bg-rose-950/80 border-rose-800' };
      default:
        return { label: 'Specialized Machine', color: 'text-slate-300 bg-slate-900 border-slate-700' };
    }
  };

  // Department color indicator for blocks
  const getDeptColorClass = (dept: string) => {
    switch (dept) {
      case 'ENGINEERING':
        return 'bg-amber-600/90 hover:bg-amber-500 border-amber-400 text-amber-100 shadow-amber-950/40';
      case 'TRACTION':
        return 'bg-sky-600/90 hover:bg-sky-500 border-sky-400 text-sky-100 shadow-sky-950/40';
      case 'S&T':
        return 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400 text-emerald-100 shadow-emerald-950/40';
      default:
        return 'bg-slate-700 hover:bg-slate-600 border-slate-500 text-slate-100';
    }
  };

  // Find linked entities for any selected or hovered item
  const linkedDetails = useMemo(() => {
    if (!selectedEntity && !hoveredEntityId) return null;
    const targetId = selectedEntity?.data?.id || selectedEntity?.data?.blockId || hoveredEntityId;
    if (!targetId) return null;

    // Check if target is a block
    const block = activeBlocks.find((b) => b.blockId === targetId);
    if (block) {
      const assignedMachines = machinery.filter((m) => m.assignedBlockId === block.blockId || m.corridorId === block.corridorId);
      const supportingGangs = gangs.filter((g) => g.corridorId === block.corridorId);
      return {
        type: 'BLOCK' as const,
        block,
        machines: assignedMachines,
        gangs: supportingGangs,
      };
    }

    // Check if target is a machine
    const machine = machinery.find((m) => m.id === targetId);
    if (machine) {
      const linkedBlock = activeBlocks.find((b) => b.blockId === machine.assignedBlockId || b.corridorId === machine.corridorId);
      const linkedGangs = gangs.filter((g) => g.corridorId === machine.corridorId);
      return {
        type: 'MACHINERY' as const,
        machine,
        block: linkedBlock,
        gangs: linkedGangs,
      };
    }

    // Check if target is a gang
    const gang = gangs.find((g) => g.id === targetId);
    if (gang) {
      const linkedBlocks = activeBlocks.filter((b) => b.corridorId === gang.corridorId);
      const linkedMachines = machinery.filter((m) => m.corridorId === gang.corridorId);
      return {
        type: 'GANG' as const,
        gang,
        blocks: linkedBlocks,
        machines: linkedMachines,
      };
    }

    return null;
  }, [selectedEntity, hoveredEntityId, activeBlocks, machinery, gangs]);

  // Interval scheduling for multi-row sub-lane layout of blocks within a corridor
  const layoutCorridorBlocks = (cBlocks: OptimizedBlock[]) => {
    const sorted = [...cBlocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const items: { block: OptimizedBlock; rowIndex: number }[] = [];
    const rowEndTimes: number[] = [];

    for (const blk of sorted) {
      let sMin = timeToMinutes(blk.startTime);
      let eMin = timeToMinutes(blk.endTime);
      if (eMin <= sMin) eMin += 1440;

      let placed = false;
      for (let r = 0; r < rowEndTimes.length; r++) {
        if (rowEndTimes[r] <= sMin) {
          items.push({ block: blk, rowIndex: r });
          rowEndTimes[r] = eMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        items.push({ block: blk, rowIndex: rowEndTimes.length });
        rowEndTimes.push(eMin);
      }
    }

    const totalRows = Math.max(1, rowEndTimes.length);
    return { items, totalRows };
  };

  // Resource gap analytics
  const gapAnalysis = useMemo(() => {
    let unassignedBlocksCount = 0;
    let nightShiftGangsCount = gangs.filter((g) => g.shift === 'NIGHT_MEGA_BLOCK').length;
    let nightBlocksCount = activeBlocks.filter((b) => {
      const s = timeToMinutes(b.startTime);
      return s >= 1320 || s <= 360;
    }).length;

    activeBlocks.forEach((b) => {
      const hasMachinery = machinery.some((m) => m.assignedBlockId === b.blockId || (m.corridorId === b.corridorId && m.status === 'DEPLOYED'));
      if (!hasMachinery) unassignedBlocksCount++;
    });

    return {
      unassignedBlocksCount,
      nightShiftGangsCount,
      nightBlocksCount,
      isNightCovered: nightShiftGangsCount >= nightBlocksCount,
    };
  }, [activeBlocks, machinery, gangs]);

  return (
    <div
      id="resource-gantt-timeline-container"
      data-testid="resource-gantt-timeline-container"
      className="space-y-4 font-sans text-slate-100"
    >
      {/* HEADER & TIME CONTROLS BAR */}
      <div className="bg-[#0b1329] p-4 md:p-5 rounded-xl border border-sky-900/60 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-400 shrink-0 shadow-md">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Resource Gantt Timeline & Schedule Mapping
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  LIVE DUAL-LAYER MAPPING
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800">
                  {timeWindow.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-1">
                Visualizes spatial-temporal synchronization of heavy on-track machinery deployments and specialized manpower gangs against active maintenance blocks across Indian Railways corridors.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Blocks: </span>
              <strong className="text-amber-300">{filteredBlocks.length}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Deployed Machines: </span>
              <strong className="text-purple-300">{filteredMachinery.filter((m) => m.status === 'DEPLOYED').length}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Active Gangs: </span>
              <strong className="text-sky-300">{filteredGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK').length}</strong>
            </div>
          </div>
        </div>

        {/* CONTROLS STRIP: TIME RANGE / CORRIDOR / SEARCH / LAYER TOGGLES */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Time Window Switcher Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 px-2 font-semibold uppercase">
              Time Scope:
            </span>
            <button
              id="gantt-time-btn-24h"
              data-testid="gantt-time-btn-24h"
              onClick={() => setTimeRange('24_HOURS')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                timeRange === '24_HOURS'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24-Hour Cycle
            </button>
            <button
              id="gantt-time-btn-day"
              data-testid="gantt-time-btn-day"
              onClick={() => setTimeRange('DAY_SHIFT')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                timeRange === 'DAY_SHIFT'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-300" />
              <span>Day (06–14)</span>
            </button>
            <button
              id="gantt-time-btn-afternoon"
              data-testid="gantt-time-btn-afternoon"
              onClick={() => setTimeRange('AFTERNOON_SHIFT')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                timeRange === 'AFTERNOON_SHIFT'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sunrise className="w-3 h-3 text-indigo-300" />
              <span>Afternoon (14–22)</span>
            </button>
            <button
              id="gantt-time-btn-night"
              data-testid="gantt-time-btn-night"
              onClick={() => setTimeRange('NIGHT_MEGA_BLOCK')}
              className={`px-3 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-all cursor-pointer ${
                timeRange === 'NIGHT_MEGA_BLOCK'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3 h-3 text-purple-300" />
              <span>Night Mega (22–06)</span>
            </button>
          </div>

          {/* Corridor & Department Selectors */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 text-[11px]">Corridor:</span>
              <select
                id="gantt-filter-corridor-select"
                data-testid="gantt-filter-corridor-select"
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Corridors (C001–C004)</option>
                {corridors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 text-[11px]">Dept:</span>
              <select
                id="gantt-filter-dept-select"
                data-testid="gantt-filter-dept-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="CIVIL">Civil / Engineering</option>
                <option value="TRACTION">Traction / OHE</option>
                <option value="SIGNALLING">Signalling / S&T</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="gantt-search-input"
                data-testid="gantt-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search machine, gang, block..."
                className="pl-8 pr-7 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LAYER TOGGLE CONTROLS & GAP HIGHLIGHTER */}
        <div className="flex items-center justify-between text-xs font-mono flex-wrap gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-[11px] font-bold uppercase">Gantt Layers:</span>

            <button
              onClick={() => setShowBlocksLayer(!showBlocksLayer)}
              className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                showBlocksLayer
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>1. Maintenance Schedule Blocks</span>
            </button>

            <button
              onClick={() => setShowMachineryLayer(!showMachineryLayer)}
              className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                showMachineryLayer
                  ? 'bg-purple-950/80 border-purple-600 text-purple-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>2. Heavy Track Machinery</span>
            </button>

            <button
              onClick={() => setShowGangsLayer(!showGangsLayer)}
              className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                showGangsLayer
                  ? 'bg-sky-950/80 border-sky-600 text-sky-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Manpower Shifts & Gangs</span>
            </button>

            <button
              onClick={() => setHighlightGaps(!highlightGaps)}
              className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                highlightGaps
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300 font-bold animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Highlight maintenance blocks that have resource deficits or unassigned machinery"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Deficit Highlights ({gapAnalysis.unassignedBlocksCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Click any Gantt bar to inspect linked assets & RDSO parameters
            </span>
          </div>
        </div>
      </div>

      {/* RESOURCE DEFICIT OR LINKAGE CALLOUT BANNER */}
      {highlightGaps && gapAnalysis.unassignedBlocksCount > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-amber-200">
              <strong>Resource Alignment Notice:</strong> {gapAnalysis.unassignedBlocksCount} scheduled maintenance block(s) currently lack dedicated heavy track machines. Ensure machine dispatch from Central Base TMD or allocate standby fleet.
            </span>
          </div>
          {onNavigateToTimeline && (
            <button
              onClick={onNavigateToTimeline}
              className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Cross-check Block Timeline</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* MAIN GANTT TIMELINE CANVAS */}
      <div className="bg-[#0e172e] p-4 md:p-5 rounded-xl border border-sky-950/80 shadow-xl overflow-x-auto space-y-6">
        <div className="min-w-[950px] space-y-4">
          {/* TIMELINE RULER */}
          <div className="relative pl-52 pr-4 border-b border-slate-700/80 pb-2">
            <div className="h-6 relative">
              {hourMarkers.map((m, idx) => (
                <div
                  key={`${m.label}-${idx}`}
                  className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
                  style={{ left: `${m.offsetPct}%` }}
                >
                  <span className="text-[10px] font-mono text-slate-400 font-bold tracking-tight">
                    {m.label}
                  </span>
                  <div className="w-px h-2 bg-slate-700 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Shift Boundary Markers / Background Tint Indicators */}
            {timeRange === '24_HOURS' && (
              <div className="absolute inset-0 pl-52 pr-4 top-6 pointer-events-none flex h-3 text-[9px] font-mono font-semibold">
                <div className="w-[25%] border-r border-slate-800/80 text-amber-400/60 flex items-center justify-center bg-amber-950/10">
                  Night Shift (00–06)
                </div>
                <div className="w-[33.33%] border-r border-slate-800/80 text-sky-400/60 flex items-center justify-center bg-sky-950/10">
                  Day Shift (06–14)
                </div>
                <div className="w-[33.33%] border-r border-slate-800/80 text-indigo-400/60 flex items-center justify-center bg-indigo-950/10">
                  Afternoon Shift (14–22)
                </div>
                <div className="w-[8.34%] text-purple-400/60 flex items-center justify-center bg-purple-950/10">
                  Night (22–24)
                </div>
              </div>
            )}
          </div>

          {/* CORRIDOR SWIMLANE GROUPS */}
          <div className="space-y-6">
            {activeCorridorList.map((corridor) => {
              const corridorBlocks = filteredBlocks.filter((b) => b.corridorId === corridor.id);
              const corridorMachines = filteredMachinery.filter((m) => m.corridorId === corridor.id);
              const corridorGangs = filteredGangs.filter((g) => g.corridorId === corridor.id);

              return (
                <div
                  key={corridor.id}
                  id={`gantt-corridor-${corridor.id.toLowerCase()}`}
                  data-testid={`gantt-corridor-${corridor.id.toLowerCase()}`}
                  className="rounded-xl bg-[#090f20]/90 border border-slate-800/80 p-3.5 space-y-3.5 shadow-md hover:border-sky-900/60 transition-colors"
                >
                  {/* Corridor Group Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700 font-bold text-sky-300">
                        {corridor.id}
                      </span>
                      <span className="font-bold text-slate-100">{corridor.name}</span>
                      <span className="text-slate-400 text-[11px] hidden sm:inline">
                        ({corridor.fromStation} ↔ {corridor.toStation}, {corridor.trackType})
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-slate-400">
                        Active Blocks: <strong className="text-amber-300">{corridorBlocks.length}</strong>
                      </span>
                      <span className="text-slate-400">
                        Machines: <strong className="text-purple-300">{corridorMachines.length}</strong>
                      </span>
                      <span className="text-slate-400">
                        Gangs: <strong className="text-sky-300">{corridorGangs.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 1. LAYER: ACTIVE MAINTENANCE BLOCKS SCHEDULE */}
                  {showBlocksLayer && (
                    <div className="flex items-center text-xs">
                      {/* Lane Label */}
                      <div className="w-52 pr-3 shrink-0 flex items-center justify-between text-amber-300 font-mono text-[11px] font-semibold border-r border-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                          <span>Maintenance Blocks</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {corridorBlocks.length}
                        </span>
                      </div>

                      {/* Lane Track Grid */}
                      {(() => {
                        const { items: blockLayoutItems, totalRows: blockTotalRows } = layoutCorridorBlocks(corridorBlocks);
                        const containerHeightPx = blockTotalRows === 1 ? 40 : blockTotalRows === 2 ? 70 : blockTotalRows * 34 + 6;

                        return (
                          <div
                            className="flex-1 relative bg-slate-950/70 rounded-lg border border-slate-800/90 ml-3 overflow-hidden transition-all"
                            style={{ height: `${containerHeightPx}px` }}
                          >
                            {/* Vertical Grid Guides */}
                            <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/30" />

                            {corridorBlocks.length === 0 ? (
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono italic">
                                No maintenance blocks scheduled in this operational window
                              </div>
                            ) : (
                              blockLayoutItems.map(({ block, rowIndex }) => {
                                const { left, width, isVisible } = getTimelinePosition(block.startTime, block.endTime);
                                if (!isVisible) return null;

                                const isSelected = selectedEntity?.data?.blockId === block.blockId;
                                const isHovered = hoveredEntityId === block.blockId;
                                const isLinked = linkedDetails?.block?.blockId === block.blockId;
                                const barTop = blockTotalRows === 1 ? 4 : rowIndex * 32 + 4;
                                const barHeight = blockTotalRows === 1 ? 32 : 28;

                                return (
                                  <div
                                    key={block.blockId}
                                    id={`gantt-bar-block-${block.blockId}`}
                                    data-testid={`gantt-bar-block-${block.blockId}`}
                                    onClick={() => setSelectedEntity({ type: 'BLOCK', data: block })}
                                    onMouseEnter={() => setHoveredEntityId(block.blockId)}
                                    onMouseLeave={() => setHoveredEntityId(null)}
                                    className={`absolute rounded px-2 flex items-center justify-between text-[11px] font-mono cursor-pointer border transition-all truncate select-none shadow-md ${getDeptColorClass(
                                      block.department
                                    )} ${
                                      isSelected || isLinked
                                        ? 'ring-2 ring-white scale-[1.02] z-20 shadow-lg'
                                        : isHovered
                                        ? 'ring-1 ring-sky-300 z-10'
                                        : 'z-0'
                                    }`}
                                    style={{ left, width, top: `${barTop}px`, height: `${barHeight}px` }}
                                    title={`Block ${block.blockId} [${block.startTime}–${block.endTime}] ${block.section} (${block.department})`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-bold truncate">{block.blockId}</span>
                                      <span className="text-[9px] opacity-80 truncate hidden md:inline">
                                        {block.startTime}–{block.endTime}
                                      </span>
                                    </div>
                                    {block.hasConflict && (
                                      <span className="text-[9px] px-1 bg-rose-950 text-rose-300 border border-rose-700 rounded font-bold shrink-0 animate-pulse">
                                        ⚠ CLASH
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 2. LAYER: HEAVY TRACK MACHINERY DEPLOYMENTS */}
                  {showMachineryLayer && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                      <div className="flex items-center text-xs">
                        <div className="w-52 pr-3 shrink-0 flex items-center justify-between text-purple-300 font-mono text-[11px] font-semibold border-r border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-purple-400" />
                            <span>Machinery Fleet</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            {corridorMachines.length}
                          </span>
                        </div>

                        {/* Machinery Fleet Multi-Row Track */}
                        <div className="flex-1 ml-3 space-y-1.5">
                          {corridorMachines.length === 0 ? (
                            <div className="h-8 bg-slate-950/50 rounded border border-slate-800/60 flex items-center justify-center text-[10px] text-slate-500 font-mono italic">
                              No heavy machinery assigned to this corridor
                            </div>
                          ) : (
                            corridorMachines.map((machine) => {
                              // Match machine deployment time to assigned block or active corridor block
                              const assignedBlock = activeBlocks.find((b) => b.blockId === machine.assignedBlockId) ||
                                activeBlocks.find((b) => b.corridorId === machine.corridorId && (
                                  (machine.type === 'TOWER_WAGON' && b.department === 'TRACTION') ||
                                  (machine.type === 'USFD_CAR' && (b.department === 'S&T' || b.department === 'ENGINEERING')) ||
                                  (machine.type !== 'TOWER_WAGON' && b.department === 'ENGINEERING')
                                )) ||
                                activeBlocks.find((b) => b.corridorId === machine.corridorId);

                              const deployStart = assignedBlock ? assignedBlock.startTime : (machine.status === 'STANDBY_RESERVE' ? '12:00' : '09:00');
                              const deployEnd = assignedBlock ? assignedBlock.endTime : (machine.status === 'STANDBY_RESERVE' ? '16:00' : '17:00');
                              const { left, width, isVisible } = getTimelinePosition(deployStart, deployEnd);
                              const badge = getMachineTypeBadge(machine.type);

                              const isSelected = selectedEntity?.data?.id === machine.id;
                              const isHovered = hoveredEntityId === machine.id;
                              const isLinked = linkedDetails?.machines?.some((m: any) => m.id === machine.id) || linkedDetails?.machine?.id === machine.id;

                              return (
                                <div key={machine.id} className="relative h-8 bg-slate-950/70 rounded-md border border-slate-800/70 flex items-center">
                                  {/* Grid guide */}
                                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/20" />

                                  {/* Sub-label for Machine Identity */}
                                  <div className="absolute left-2 z-10 flex items-center gap-2 pointer-events-none text-[10px] font-mono">
                                    <span className="text-slate-300 font-semibold">{machine.id}</span>
                                    <span className="text-slate-400 truncate max-w-[130px] hidden lg:inline">
                                      {machine.name}
                                    </span>
                                  </div>

                                  {/* Machine Deployment Bar */}
                                  {isVisible && (
                                    <div
                                      id={`gantt-bar-machinery-${machine.id}`}
                                      data-testid={`gantt-bar-machinery-${machine.id}`}
                                      onClick={() => setSelectedEntity({ type: 'MACHINERY', data: machine })}
                                      onMouseEnter={() => setHoveredEntityId(machine.id)}
                                      onMouseLeave={() => setHoveredEntityId(null)}
                                      className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-[10px] font-mono cursor-pointer border transition-all truncate select-none shadow-md ${
                                        machine.status === 'DEPLOYED'
                                          ? 'bg-purple-900/80 hover:bg-purple-800 border-purple-500 text-purple-100'
                                          : machine.status === 'STANDBY_RESERVE'
                                          ? 'bg-amber-900/60 hover:bg-amber-800 border-amber-600 text-amber-200'
                                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                                      } ${
                                        isSelected || isLinked
                                          ? 'ring-2 ring-purple-300 scale-[1.02] z-20 shadow-lg shadow-purple-950/50'
                                          : isHovered
                                          ? 'ring-1 ring-white z-10'
                                          : 'z-0'
                                      }`}
                                      style={{ left, width }}
                                      title={`${machine.name} (${machine.id}) [${deployStart}–${deployEnd}] Operator: ${machine.operatorName}, Fuel: ${machine.fuelLevelPct}%`}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <Truck className="w-3 h-3 text-purple-300 shrink-0" />
                                        <span className="font-bold truncate">{machine.type.replace('_', ' ')}</span>
                                        {assignedBlock && (
                                          <span className="text-[9px] px-1 bg-purple-950/90 text-purple-200 border border-purple-700/80 rounded font-semibold truncate hidden md:inline">
                                            {assignedBlock.blockId}
                                          </span>
                                        )}
                                        <span className="text-[9px] opacity-80 hidden sm:inline">
                                          ({deployStart}–{deployEnd})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 text-[9px]">
                                        <span className="px-1 rounded bg-black/40 text-purple-200">
                                          {machine.fuelLevelPct}% Fuel
                                        </span>
                                        {machine.status === 'DEPLOYED' ? (
                                          <span className="px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[8px] font-bold hidden lg:inline">
                                            SYNCED
                                          </span>
                                        ) : (
                                          <span className="px-1 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[8px] font-bold hidden lg:inline">
                                            STANDBY
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. LAYER: MANPOWER GANG SHIFTS */}
                  {showGangsLayer && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                      <div className="flex items-center text-xs">
                        <div className="w-52 pr-3 shrink-0 flex items-center justify-between text-sky-300 font-mono text-[11px] font-semibold border-r border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                            <span>Manpower Shifts</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                            {corridorGangs.length}
                          </span>
                        </div>

                        {/* Gang Shifts Multi-Row Track */}
                        <div className="flex-1 ml-3 space-y-1.5">
                          {corridorGangs.length === 0 ? (
                            <div className="h-8 bg-slate-950/50 rounded border border-slate-800/60 flex items-center justify-center text-[10px] text-slate-500 font-mono italic">
                              No maintenance gangs assigned to this corridor
                            </div>
                          ) : (
                            corridorGangs.map((gang) => {
                              const shiftTimes = getGangShiftTimes(gang.shift);
                              const { left, width, isVisible } = getTimelinePosition(shiftTimes.start, shiftTimes.end);

                              // Active scheduled blocks covered during this shift
                              const sM = timeToMinutes(shiftTimes.start);
                              const eM = timeToMinutes(shiftTimes.end) <= sM ? timeToMinutes(shiftTimes.end) + 1440 : timeToMinutes(shiftTimes.end);
                              const coveredBlocks = activeBlocks.filter((b) => {
                                if (b.corridorId !== gang.corridorId) return false;
                                const bS = timeToMinutes(b.startTime);
                                const bE = timeToMinutes(b.endTime) <= bS ? timeToMinutes(b.endTime) + 1440 : timeToMinutes(b.endTime);
                                return (bS >= sM && bS < eM) || (bE > sM && bE <= eM);
                              });

                              const isSelected = selectedEntity?.data?.id === gang.id;
                              const isHovered = hoveredEntityId === gang.id;
                              const isLinked = linkedDetails?.gangs?.some((g: any) => g.id === gang.id) || linkedDetails?.gang?.id === gang.id;

                              return (
                                <div key={gang.id} className="relative h-8 bg-slate-950/70 rounded-md border border-slate-800/70 flex items-center">
                                  {/* Grid guide */}
                                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/20" />

                                  {/* Sub-label for Gang Identity */}
                                  <div className="absolute left-2 z-10 flex items-center gap-2 pointer-events-none text-[10px] font-mono">
                                    <span className="text-slate-300 font-semibold">{gang.name.split(' ')[0]}</span>
                                    <span className="text-slate-400 truncate max-w-[120px] hidden lg:inline">
                                      {gang.supervisor}
                                    </span>
                                  </div>

                                  {/* Gang Shift Bar */}
                                  {isVisible && (
                                    <div
                                      id={`gantt-bar-gang-${gang.id}`}
                                      data-testid={`gantt-bar-gang-${gang.id}`}
                                      onClick={() => setSelectedEntity({ type: 'GANG', data: gang })}
                                      onMouseEnter={() => setHoveredEntityId(gang.id)}
                                      onMouseLeave={() => setHoveredEntityId(null)}
                                      className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-[10px] font-mono cursor-pointer border transition-all truncate select-none shadow-md ${
                                        gang.shift === 'DAY_SHIFT'
                                          ? 'bg-sky-900/80 hover:bg-sky-800 border-sky-500 text-sky-100'
                                          : gang.shift === 'AFTERNOON_SHIFT'
                                          ? 'bg-indigo-900/80 hover:bg-indigo-800 border-indigo-500 text-indigo-100'
                                          : 'bg-purple-900/80 hover:bg-purple-800 border-purple-500 text-purple-100'
                                      } ${
                                        isSelected || isLinked
                                          ? 'ring-2 ring-sky-300 scale-[1.02] z-20 shadow-lg shadow-sky-950/50'
                                          : isHovered
                                          ? 'ring-1 ring-white z-10'
                                          : 'z-0'
                                      }`}
                                      style={{ left, width }}
                                      title={`${gang.name} (${gang.shift}) [${shiftTimes.start}–${shiftTimes.end}] Supervisor: ${gang.supervisor}, Crew: ${gang.headcount} ${coveredBlocks.length > 0 ? `| Covers: ${coveredBlocks.map(b => b.blockId).join(', ')}` : ''}`}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <HardHat className="w-3 h-3 text-sky-300 shrink-0" />
                                        <span className="font-bold truncate">{gang.trade.replace('_', ' ')}</span>
                                        {coveredBlocks.length > 0 && (
                                          <span className="text-[9px] px-1 bg-sky-950/90 text-sky-200 border border-sky-700/80 rounded font-semibold truncate hidden md:inline">
                                            {coveredBlocks.length} Block{coveredBlocks.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                        <span className="text-[9px] opacity-80 hidden sm:inline">
                                          ({shiftTimes.start}–{shiftTimes.end})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 text-[9px]">
                                        <span className="px-1 rounded bg-black/40 text-sky-200">
                                          {gang.headcount} Crew
                                        </span>
                                        {gang.safetyBriefingCompleted ? (
                                          <Check className="w-3 h-3 text-emerald-400" title="Safety Briefing Certified" />
                                        ) : (
                                          <AlertTriangle className="w-3 h-3 text-amber-400" title="Safety Briefing Pending" />
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INTERACTIVE INSPECTOR PANEL FOR SELECTED TIMELINE ENTITY */}
      {selectedEntity && (
        <div
          id="gantt-entity-inspector-card"
          data-testid="gantt-entity-inspector-card"
          className="bg-[#0b1429] p-5 rounded-xl border border-sky-800/80 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${
                selectedEntity.type === 'BLOCK'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : selectedEntity.type === 'MACHINERY'
                  ? 'bg-purple-950 text-purple-400 border-purple-800'
                  : 'bg-sky-950 text-sky-400 border-sky-800'
              }`}>
                {selectedEntity.type === 'BLOCK' ? (
                  <Wrench className="w-5 h-5" />
                ) : selectedEntity.type === 'MACHINERY' ? (
                  <Truck className="w-5 h-5" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
                    {selectedEntity.type === 'BLOCK'
                      ? `Maintenance Block ${selectedEntity.data.blockId}`
                      : selectedEntity.type === 'MACHINERY'
                      ? `Machine ${selectedEntity.data.id} - ${selectedEntity.data.name}`
                      : `Manpower Gang ${selectedEntity.data.name}`}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                    {selectedEntity.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Detailed RDSO and IRTMM compliance metadata with cross-linked maintenance entities.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* INSPECTOR DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {selectedEntity.type === 'BLOCK' && (
              <>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Corridor & Section:</div>
                  <div className="font-bold text-slate-200">
                    {selectedEntity.data.corridorId} · {selectedEntity.data.section}
                  </div>
                  <div className="text-slate-400 text-[11px] pt-1">Window:</div>
                  <div className="font-bold text-amber-300">
                    {selectedEntity.data.startTime} – {selectedEntity.data.endTime} ({selectedEntity.data.durationMinutes} min)
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Department & Priority:</div>
                  <div className="font-bold text-slate-200">
                    {selectedEntity.data.department} · {selectedEntity.data.priority}
                  </div>
                  <div className="text-slate-400 text-[11px] pt-1">Conflict Status:</div>
                  <div className={`font-bold ${selectedEntity.data.hasConflict ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedEntity.data.hasConflict ? '⚠ Active Train Collision Detected' : '✓ Verified Conflict-Free'}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Assigned Operational Resources:</div>
                  <div className="text-purple-300">
                    Machine: {machinery.find((m) => m.assignedBlockId === selectedEntity.data.blockId)?.name || 'Auto-Allocated from Depot'}
                  </div>
                  <div className="text-sky-300 pt-1">
                    Gang: {gangs.find((g) => g.corridorId === selectedEntity.data.corridorId)?.name || 'PWI Section Gang'}
                  </div>
                </div>
              </>
            )}

            {selectedEntity.type === 'MACHINERY' && (
              <>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Machine Model & Type:</div>
                  <div className="font-bold text-slate-200">{selectedEntity.data.model}</div>
                  <div className="text-purple-300">{selectedEntity.data.type}</div>
                  <div className="text-slate-400 text-[11px] pt-1">Home Depot:</div>
                  <div className="text-slate-300">{selectedEntity.data.homeDepot}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Operator & Pilot:</div>
                  <div className="font-bold text-slate-200">{selectedEntity.data.operatorName}</div>
                  <div className="text-slate-400 text-[11px] pt-1">Health & Speed:</div>
                  <div className="text-emerald-400 font-bold">
                    Health Index: {selectedEntity.data.healthIndex}/100 · Max: {selectedEntity.data.speedLimitKmph} km/h
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Fuel Level & Section:</div>
                  <div className="font-bold text-amber-300">{selectedEntity.data.fuelLevelPct}% Tank Capacity</div>
                  <div className="text-slate-300 text-[11px]">{selectedEntity.data.currentSection}</div>
                  <div className="text-slate-400 text-[11px] pt-1">Assigned Block:</div>
                  <div className="text-sky-300 font-bold">{selectedEntity.data.assignedBlockId || 'Available for Dispatch'}</div>
                </div>
              </>
            )}

            {selectedEntity.type === 'GANG' && (
              <>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Trade & Department:</div>
                  <div className="font-bold text-slate-200">{selectedEntity.data.trade}</div>
                  <div className="text-sky-300">{selectedEntity.data.department}</div>
                  <div className="text-slate-400 text-[11px] pt-1">Assigned Section:</div>
                  <div className="text-slate-300">{selectedEntity.data.assignedSection}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Supervisor & Crew Size:</div>
                  <div className="font-bold text-slate-200">{selectedEntity.data.supervisor}</div>
                  <div className="text-emerald-300 font-bold">{selectedEntity.data.headcount} Workers On-Roster</div>
                  <div className="text-slate-400 text-[11px] pt-1">Equipped With:</div>
                  <div className="text-slate-300 text-[11px] truncate">{selectedEntity.data.equippedWith}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Shift & Safety Briefing:</div>
                  <div className="font-bold text-amber-300">{selectedEntity.data.shift}</div>
                  <div className={`font-bold flex items-center gap-1 ${
                    selectedEntity.data.safetyBriefingCompleted ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedEntity.data.safetyBriefingCompleted ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Safety Briefing Certified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Briefing Pending Before Entry</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* INSPECTOR ACTION BAR & SCHEDULE REALLOCATION CONTROLS */}
          {selectedEntity.type === 'BLOCK' && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-slate-400 font-mono">
                Active schedule possession mapped against IR track capacity. Cross-linked to timeline.
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToTimeline && (
                  <button
                    onClick={onNavigateToTimeline}
                    className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-sky-200 text-xs rounded font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Inspect in Master Timeline</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {selectedEntity.data.hasConflict && onNavigateToConflicts && (
                  <button
                    onClick={onNavigateToConflicts}
                    className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-200 text-xs rounded font-mono flex items-center gap-1 cursor-pointer transition-colors animate-pulse"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Reconcile Clash in Conflict Engine</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedEntity.type === 'MACHINERY' && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Reallocate Machine to Corridor:</span>
                <select
                  value={reallocateTargetCorridor}
                  onChange={(e) => setReallocateTargetCorridor(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono cursor-pointer"
                >
                  <option value="">Choose Corridor...</option>
                  {corridors.filter((c) => c.id !== selectedEntity.data.corridorId).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                  <option value="CENTRAL_DEPOT">Central TMD (Reserve Fleet)</option>
                </select>
                <button
                  disabled={!reallocateTargetCorridor || isReallocating}
                  onClick={handlePerformReallocation}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isReallocating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                  <span>Deploy / Transfer</span>
                </button>
              </div>
              {reallocationNotice && (
                <span className="text-xs text-emerald-400 font-mono font-bold animate-pulse">
                  ✓ {reallocationNotice}
                </span>
              )}
            </div>
          )}

          {selectedEntity.type === 'GANG' && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Reallocate Gang to Corridor:</span>
                <select
                  value={reallocateTargetCorridor}
                  onChange={(e) => setReallocateTargetCorridor(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono cursor-pointer"
                >
                  <option value="">Choose Corridor...</option>
                  {corridors.filter((c) => c.id !== selectedEntity.data.corridorId).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!reallocateTargetCorridor || isReallocating}
                  onClick={handlePerformReallocation}
                  className="px-3 py-1 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white rounded text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isReallocating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                  <span>Transfer Gang Shift</span>
                </button>
              </div>
              {reallocationNotice && (
                <span className="text-xs text-emerald-400 font-mono font-bold animate-pulse">
                  ✓ {reallocationNotice}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE SYNCHRONIZATION & IRTMM COMPLIANCE GUIDE */}
      <div className="bg-[#090f22] p-4 rounded-xl border border-sky-950/70 text-xs font-mono space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
              IRTMM & RDSO Synchronization Principles
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Indian Railways Track Machine Manual Chapter 3 · Headway & Track Possession Roster
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>Layer 1: Maintenance Schedule</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Approved corridor maintenance possessions. Civil, Traction, and Signalling windows are locked in spatial headways to avoid simultaneous opposing movements.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Layer 2: Heavy Track Machines</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Self-propelled tampers, regulators, tower wagons & rail grinders mapped directly into the approved blocks with fuel & speed constraints.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-sky-400 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Layer 3: Manpower Shifts & Gangs</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              PWI gangs, TRD linesmen, and lookouts deployed across Day, Afternoon, and Night Mega-Block shifts with mandatory pre-possession safety briefings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
