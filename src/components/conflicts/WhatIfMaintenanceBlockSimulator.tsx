import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Train,
  X,
  Gauge,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Zap,
  HardHat,
  Radio,
  Sliders,
  Filter,
  Check,
  Search,
  Eye,
  Layers,
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronRight,
  Send,
} from 'lucide-react';
import { Conflict, OptimizedBlock, Corridor } from '../../types';
import { mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

interface WhatIfMaintenanceBlockSimulatorProps {
  conflicts: Conflict[];
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onRefreshConflicts: () => void;
  onNavigateToScreen?: (screen: string) => void;
  onClose?: () => void;
  initialTargetBlockId?: string;
}

export interface ProjectedTrain {
  trainNumber: string;
  trainName: string;
  category: 'RAJDHANI' | 'SHATABDI' | 'VANDE_BHARAT' | 'SUPERFAST' | 'MAIL_EXPRESS' | 'FREIGHT';
  corridorId: string;
  corridorName: string;
  timeSlot: string;
  baselineDelayMinutes: number;
  causativeBlockIds: string[];
  regulationType: 'UNIMPEDED' | 'SPEED_RESTRICTION' | 'LOOP_SIDING' | 'HEADWAY_BUFFER';
  passengersEstimated: number;
}

// Canonical Scheduled Trains representing real-world timetable paths
const CANONICAL_TRAINS: ProjectedTrain[] = [
  {
    trainNumber: '12004',
    trainName: 'Lucknow Swarna Shatabdi',
    category: 'SHATABDI',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    timeSlot: '14:45–15:05',
    baselineDelayMinutes: 45,
    causativeBlockIds: ['BLK-E001', 'BLK-001', 'BLK-E003'],
    regulationType: 'SPEED_RESTRICTION',
    passengersEstimated: 1140,
  },
  {
    trainNumber: '12424',
    trainName: 'Dibrugarh Rajdhani Express',
    category: 'RAJDHANI',
    corridorId: 'C001',
    corridorName: 'Northern Main Trunk',
    timeSlot: '15:10–15:30',
    baselineDelayMinutes: 30,
    causativeBlockIds: ['BLK-ST02', 'BLK-002', 'BLK-E004'],
    regulationType: 'UNIMPEDED',
    passengersEstimated: 1280,
  },
  {
    trainNumber: '12952',
    trainName: 'Mumbai Tejas Rajdhani',
    category: 'RAJDHANI',
    corridorId: 'C002',
    corridorName: 'Southern High-Speed Spur',
    timeSlot: '16:15–16:45',
    baselineDelayMinutes: 25,
    causativeBlockIds: ['BLK-TR03', 'BLK-003', 'BLK-T012'],
    regulationType: 'SPEED_RESTRICTION',
    passengersEstimated: 1350,
  },
  {
    trainNumber: '22436',
    trainName: 'Vande Bharat Express (Varanasi)',
    category: 'VANDE_BHARAT',
    corridorId: 'C001',
    corridorName: 'Northern Main Trunk',
    timeSlot: '14:10–14:35',
    baselineDelayMinutes: 20,
    causativeBlockIds: ['BLK-E004', 'BLK-004', 'BLK-ST02'],
    regulationType: 'UNIMPEDED',
    passengersEstimated: 1120,
  },
  {
    trainNumber: '12556',
    trainName: 'Gorakhdham Express',
    category: 'SUPERFAST',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    timeSlot: '15:20–15:45',
    baselineDelayMinutes: 15,
    causativeBlockIds: ['BLK-E001', 'BLK-005'],
    regulationType: 'SPEED_RESTRICTION',
    passengersEstimated: 1650,
  },
  {
    trainNumber: '12302',
    trainName: 'Kolkata Rajdhani Express',
    category: 'RAJDHANI',
    corridorId: 'C001',
    corridorName: 'Northern Main Trunk',
    timeSlot: '17:00–17:30',
    baselineDelayMinutes: 15,
    causativeBlockIds: ['BLK-E004', 'BLK-ST02'],
    regulationType: 'UNIMPEDED',
    passengersEstimated: 1220,
  },
  {
    trainNumber: '12876',
    trainName: 'Neelachal Express',
    category: 'MAIL_EXPRESS',
    corridorId: 'C004',
    corridorName: 'Eastern Mineral Freight Loop',
    timeSlot: '15:40–16:15',
    baselineDelayMinutes: 20,
    causativeBlockIds: ['BLK-E008', 'BLK-008'],
    regulationType: 'HEADWAY_BUFFER',
    passengersEstimated: 1480,
  },
  {
    trainNumber: 'BOXN-8422',
    trainName: 'Container Freight Rake Up',
    category: 'FREIGHT',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    timeSlot: '14:30–15:30',
    baselineDelayMinutes: 50,
    causativeBlockIds: ['BLK-E001', 'BLK-001', 'BLK-TR03'],
    regulationType: 'LOOP_SIDING',
    passengersEstimated: 0,
  },
  {
    trainNumber: 'BCN-9104',
    trainName: 'Coal Bulk Freight Rake',
    category: 'FREIGHT',
    corridorId: 'C004',
    corridorName: 'Eastern Mineral Freight Loop',
    timeSlot: '16:00–17:30',
    baselineDelayMinutes: 35,
    causativeBlockIds: ['BLK-E008', 'BLK-008'],
    regulationType: 'LOOP_SIDING',
    passengersEstimated: 0,
  },
];

export const WhatIfMaintenanceBlockSimulator: React.FC<WhatIfMaintenanceBlockSimulatorProps> = ({
  conflicts,
  corridors,
  blocks = [],
  onRefreshConflicts,
  onNavigateToScreen,
  onClose,
  initialTargetBlockId,
}) => {
  // Combine props blocks or fallback to mockStore optimized blocks
  const allBlocks = useMemo(() => {
    let source = blocks.length > 0 ? blocks : mockStore.getOptimizedBlocks();
    if (!source || source.length === 0) {
      // Fallback synthetic blocks covering primary corridor schedules
      return [
        {
          blockId: 'BLK-E001',
          taskId: 'TSK-M01',
          department: 'CIVIL_ENGINEERING',
          assetId: 'TRK-W-01',
          corridorId: 'C003',
          section: 'KM 42/0 to 46/0',
          date: '2026-10-09',
          startTime: '14:00',
          endTime: '15:30',
          durationMinutes: 90,
          priority: 'CRITICAL',
          status: 'OPTIMIZED',
          validationStatus: 'REQUIRES_REVIEW',
          hasConflict: true,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-ST02',
          taskId: 'TSK-S02',
          department: 'SIGNALLING',
          assetId: 'SIG-N-04',
          corridorId: 'C001',
          section: 'KM 18/4 to 20/2',
          date: '2026-10-09',
          startTime: '14:30',
          endTime: '16:00',
          durationMinutes: 90,
          priority: 'HIGH',
          status: 'OPTIMIZED',
          validationStatus: 'REQUIRES_REVIEW',
          hasConflict: true,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-TR03',
          taskId: 'TSK-T03',
          department: 'TRACTION',
          assetId: 'OHE-S-09',
          corridorId: 'C002',
          section: 'KM 65/0 to 68/5',
          date: '2026-10-09',
          startTime: '15:45',
          endTime: '17:15',
          durationMinutes: 90,
          priority: 'CRITICAL',
          status: 'OPTIMIZED',
          validationStatus: 'REQUIRES_REVIEW',
          hasConflict: true,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-E004',
          taskId: 'TSK-M04',
          department: 'CIVIL_ENGINEERING',
          assetId: 'TRK-N-08',
          corridorId: 'C001',
          section: 'KM 31/0 to 33/5',
          date: '2026-10-09',
          startTime: '13:45',
          endTime: '15:00',
          durationMinutes: 75,
          priority: 'HIGH',
          status: 'OPTIMIZED',
          validationStatus: 'VALID',
          hasConflict: true,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-E008',
          taskId: 'TSK-M08',
          department: 'CIVIL_ENGINEERING',
          assetId: 'TRK-E-12',
          corridorId: 'C004',
          section: 'KM 52/0 to 55/0',
          date: '2026-10-09',
          startTime: '15:15',
          endTime: '17:00',
          durationMinutes: 105,
          priority: 'HIGH',
          status: 'OPTIMIZED',
          validationStatus: 'REQUIRES_REVIEW',
          hasConflict: true,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-ST09',
          taskId: 'TSK-S09',
          department: 'SIGNALLING',
          assetId: 'SIG-W-14',
          corridorId: 'C003',
          section: 'KM 88/0 to 90/0',
          date: '2026-10-09',
          startTime: '09:30',
          endTime: '11:00',
          durationMinutes: 90,
          priority: 'NORMAL',
          status: 'SCHEDULED',
          validationStatus: 'VALID',
          hasConflict: false,
          explainability: {} as any,
        },
        {
          blockId: 'BLK-TR10',
          taskId: 'TSK-T10',
          department: 'TRACTION',
          assetId: 'OHE-N-22',
          corridorId: 'C001',
          section: 'KM 104/0 to 106/0',
          date: '2026-10-09',
          startTime: '02:00',
          endTime: '04:30',
          durationMinutes: 150,
          priority: 'NORMAL',
          status: 'SCHEDULED',
          validationStatus: 'VALID',
          hasConflict: false,
          explainability: {} as any,
        },
      ] as OptimizedBlock[];
    }
    return source;
  }, [blocks]);

  // Map conflict block IDs for instant lookup
  const conflictBlockMap = useMemo(() => {
    const map = new Map<string, Conflict>();
    conflicts.forEach((c) => {
      if (c.status === 'OPEN' || c.status === 'PENDING_REVIEW') {
        map.set(c.blockId, c);
      }
    });
    return map;
  }, [conflicts]);

  // Master State: which block IDs are toggled ACTIVE (true = Active/On, false = Suppressed/Off)
  // Default: all blocks are ON initially (baseline schedule)
  const [activeBlockState, setActiveBlockState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allBlocks.forEach((b) => {
      initial[b.blockId] = true;
    });
    return initial;
  });

  // Filters & Search
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL');
  const [conflictOnlyFilter, setConflictOnlyFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrainCategory, setSelectedTrainCategory] = useState<string>('ALL');

  // Plan Application notification state
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Toggle a single block On/Off
  const handleToggleBlock = (blockId: string) => {
    railwayAudio.playBeep(780, 0.04);
    setActiveBlockState((prev) => {
      const current = prev[blockId] !== false; // default true
      return {
        ...prev,
        [blockId]: !current,
      };
    });
  };

  // Preset 1: Reset All to ON (Baseline)
  const handleResetAllOn = () => {
    railwayAudio.playBeep(640, 0.05);
    const updated: Record<string, boolean> = {};
    allBlocks.forEach((b) => {
      updated[b.blockId] = true;
    });
    setActiveBlockState(updated);
  };

  // Preset 2: Mute All Conflicting Blocks
  const handleMuteAllConflicting = () => {
    railwayAudio.playBeep(880, 0.06);
    const updated: Record<string, boolean> = {};
    allBlocks.forEach((b) => {
      const isConflicting = conflictBlockMap.has(b.blockId) || b.hasConflict;
      updated[b.blockId] = !isConflicting;
    });
    setActiveBlockState(updated);
  };

  // Preset 3: Invert Current Selection
  const handleInvertSelection = () => {
    railwayAudio.playBeep(720, 0.04);
    const updated: Record<string, boolean> = {};
    allBlocks.forEach((b) => {
      const current = activeBlockState[b.blockId] !== false;
      updated[b.blockId] = !current;
    });
    setActiveBlockState(updated);
  };

  // Dynamic Delay Projections Calculation
  const simulatedProjections = useMemo(() => {
    let totalBaselineDelay = 0;
    let totalSimulatedDelay = 0;
    let baselineDelayedTrainsCount = 0;
    let simulatedDelayedTrainsCount = 0;
    let totalPassengersImpactedBaseline = 0;
    let totalPassengersImpactedSimulated = 0;

    const trainProjections = CANONICAL_TRAINS.map((train) => {
      totalBaselineDelay += train.baselineDelayMinutes;
      if (train.baselineDelayMinutes > 0) {
        baselineDelayedTrainsCount++;
        totalPassengersImpactedBaseline += train.passengersEstimated;
      }

      // Check if ANY of this train's causative blocks are currently active
      const activeCausativeBlocks = train.causativeBlockIds.filter(
        (bId) => activeBlockState[bId] !== false
      );

      // Simulated delay: proportional to active causative blocks
      let simulatedDelayMinutes = 0;
      let activeCausingBlockNames: string[] = [];

      if (activeCausativeBlocks.length === 0) {
        // All causative blocks toggled off! Train runs on-time (0 delay)
        simulatedDelayMinutes = 0;
      } else {
        // Delay is scaled by proportion of active blocks, with minimum realistic regulation
        const ratio = activeCausativeBlocks.length / train.causativeBlockIds.length;
        simulatedDelayMinutes = Math.round(train.baselineDelayMinutes * Math.max(0.4, ratio));
        activeCausingBlockNames = activeCausativeBlocks;
      }

      totalSimulatedDelay += simulatedDelayMinutes;
      if (simulatedDelayMinutes > 0) {
        simulatedDelayedTrainsCount++;
        totalPassengersImpactedSimulated += train.passengersEstimated;
      }

      const delayDelta = simulatedDelayMinutes - train.baselineDelayMinutes; // negative means minutes saved

      return {
        ...train,
        simulatedDelayMinutes,
        delayDelta,
        activeCausingBlockNames,
        isCleared: simulatedDelayMinutes === 0 && train.baselineDelayMinutes > 0,
        status:
          simulatedDelayMinutes === 0
            ? ('ON_TIME' as const)
            : simulatedDelayMinutes <= 10
            ? ('MINOR_DELAY' as const)
            : ('HEAVY_DELAY' as const),
      };
    });

    const delaySavedMinutes = totalBaselineDelay - totalSimulatedDelay;
    const delayReductionPercentage =
      totalBaselineDelay > 0
        ? Math.round((delaySavedMinutes / totalBaselineDelay) * 100)
        : 0;

    // Projected Punctuality: Base 85.2% plus bonus from delay reduction
    const basePunctuality = 85.2;
    const projectedPunctuality = Math.min(
      99.4,
      +(basePunctuality + (delayReductionPercentage * 0.14)).toFixed(1)
    );

    // Active block counts
    const totalBlocksCount = allBlocks.length;
    const activeBlocksCount = allBlocks.filter((b) => activeBlockState[b.blockId] !== false).length;
    const toggledOffBlocksCount = totalBlocksCount - activeBlocksCount;

    // Kavach Headway buffer margin (km): expands as conflicting blocks are removed
    const kavachHeadwayMarginKm = +(
      2.2 + (toggledOffBlocksCount * 0.45)
    ).toFixed(1);

    // OHE Traction cutout status
    const activeTractionBlocks = allBlocks.filter(
      (b) =>
        activeBlockState[b.blockId] !== false &&
        (b.department === 'TRACTION' || b.blockId.startsWith('BLK-TR'))
    );
    const ohePowerCutRequired = activeTractionBlocks.length > 0;

    return {
      totalBaselineDelay,
      totalSimulatedDelay,
      delaySavedMinutes,
      delayReductionPercentage,
      baselineDelayedTrainsCount,
      simulatedDelayedTrainsCount,
      trainsClearedCount: baselineDelayedTrainsCount - simulatedDelayedTrainsCount,
      totalPassengersImpactedBaseline,
      totalPassengersImpactedSimulated,
      passengersSaved: totalPassengersImpactedBaseline - totalPassengersImpactedSimulated,
      projectedPunctuality,
      totalBlocksCount,
      activeBlocksCount,
      toggledOffBlocksCount,
      kavachHeadwayMarginKm,
      ohePowerCutRequired,
      activeTractionCount: activeTractionBlocks.length,
      trainProjections,
    };
  }, [allBlocks, activeBlockState]);

  // Filtered Blocks to display in controller list
  const filteredBlocks = useMemo(() => {
    return allBlocks.filter((b) => {
      if (corridorFilter !== 'ALL' && b.corridorId !== corridorFilter) {
        return false;
      }
      const isConflicting = conflictBlockMap.has(b.blockId) || b.hasConflict;
      if (conflictOnlyFilter && !isConflicting) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = b.blockId.toLowerCase().includes(q);
        const matchesSection = b.section.toLowerCase().includes(q);
        const matchesDept = b.department.toLowerCase().includes(q);
        const matchesCorridor = b.corridorId.toLowerCase().includes(q);
        const conflict = conflictBlockMap.get(b.blockId);
        const matchesTrain = conflict
          ? conflict.trainNumber.toLowerCase().includes(q) ||
            conflict.trainName.toLowerCase().includes(q)
          : false;
        if (!matchesId && !matchesSection && !matchesDept && !matchesCorridor && !matchesTrain) {
          return false;
        }
      }
      return true;
    });
  }, [allBlocks, corridorFilter, conflictOnlyFilter, searchQuery, conflictBlockMap]);

  // Filtered Train Projections in view
  const filteredTrainProjections = useMemo(() => {
    return simulatedProjections.trainProjections.filter((t) => {
      if (selectedTrainCategory !== 'ALL' && t.category !== selectedTrainCategory) {
        return false;
      }
      if (corridorFilter !== 'ALL' && t.corridorId !== corridorFilter) {
        return false;
      }
      return true;
    });
  }, [simulatedProjections.trainProjections, selectedTrainCategory, corridorFilter]);

  // Apply Simulation as Active Plan Scenario
  const handleApplyScenario = async () => {
    setIsApplying(true);
    railwayAudio.playStationChime();

    // Log to mockStore audit log
    const toggledOffList = allBlocks
      .filter((b) => activeBlockState[b.blockId] === false)
      .map((b) => b.blockId);

    mockStore.addAuditLogEntry(
      'Senior Railway Controller',
      'RAILWAY_PLANNER',
      'What-If Delay Simulator Scenario Adopted',
      `Toggled Off: ${toggledOffList.join(', ') || 'None (Baseline)'}`,
      'SUCCESS',
      `Simulated train delay reduced from ${simulatedProjections.totalBaselineDelay}m to ${simulatedProjections.totalSimulatedDelay}m (-${simulatedProjections.delaySavedMinutes}m saved, ${simulatedProjections.delayReductionPercentage}% reduction). ${simulatedProjections.trainsClearedCount} trains restored to On-Time.`
    );

    await new Promise((r) => setTimeout(r, 600));
    setIsApplying(false);
    setAppliedNotification(
      `Scenario Applied Successfully! Saved ${simulatedProjections.delaySavedMinutes} delay minutes across ${simulatedProjections.trainsClearedCount} restored passenger trains.`
    );
    setTimeout(() => setAppliedNotification(null), 6000);
    onRefreshConflicts();
  };

  const renderDepartmentBadge = (dept: string) => {
    const d = dept.toUpperCase();
    if (d.includes('CIVIL') || d.includes('ENG')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
          <HardHat className="w-3 h-3 text-emerald-400" />
          <span>Civil/Track</span>
        </span>
      );
    }
    if (d.includes('SIG') || d.includes('S&T')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950/80 text-sky-300 border border-sky-700/60 flex items-center gap-1">
          <Radio className="w-3 h-3 text-sky-400" />
          <span>S&T</span>
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400" />
        <span>Traction</span>
      </span>
    );
  };

  return (
    <div
      id="what-if-maintenance-block-simulator-tool"
      data-testid="what-if-maintenance-block-simulator-tool"
      className="space-y-6"
    >
      {/* TOOL HEADER BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0a142e] via-[#0d1d3d] to-[#09152b] border border-sky-800/80 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-sky-700 text-white shadow-lg shadow-emerald-950/50">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-wide uppercase">
                  &quot;What-If&quot; Maintenance Block Delay Simulator
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  INSTANT REACTIVE SIMULATION
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Toggle specific maintenance blocks OFF to instantly recalculate secondary knock-on delays, Kavach headway buffers, and timetable punctuality projections in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-whatif-reset-baseline"
              onClick={handleResetAllOn}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Reset all blocks to Active state (Baseline schedule)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset to Baseline</span>
            </button>

            <button
              type="button"
              id="btn-whatif-mute-conflicting"
              onClick={handleMuteAllConflicting}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-amber-950/60"
              title="Instantly toggle off all blocks that have open train clashes"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Mute All Conflicting Blocks</span>
            </button>

            <button
              type="button"
              id="btn-whatif-apply-scenario"
              onClick={handleApplyScenario}
              disabled={isApplying}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-950/60 disabled:opacity-50"
              title="Adopt this simulated toggle state into working operational plan"
            >
              <Send className="w-3.5 h-3.5 text-emerald-100" />
              <span>{isApplying ? 'Applying Scenario...' : 'Apply Working Scenario'}</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION FEEDBACK */}
        {appliedNotification && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{appliedNotification}</span>
            </div>
            <button
              onClick={() => setAppliedNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* INSTANT PROJECTION SCOREBOARD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-sky-900/60">
          {/* Card 1: Total Projected Delay */}
          <div className="p-3 rounded-xl bg-[#081226] border border-sky-900/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Projected Delay</span>
              <Clock className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-xl font-bold font-mono ${
                simulatedProjections.totalSimulatedDelay === 0
                  ? 'text-emerald-400'
                  : simulatedProjections.totalSimulatedDelay < 60
                  ? 'text-sky-300'
                  : 'text-rose-400'
              }`}>
                {simulatedProjections.totalSimulatedDelay}m
              </span>
              <span className="text-[10px] text-slate-400 font-mono line-through">
                {simulatedProjections.totalBaselineDelay}m
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3 text-emerald-400 inline" />
              <span>-{simulatedProjections.delaySavedMinutes}m saved</span>
            </div>
          </div>

          {/* Card 2: Delay Reduction % */}
          <div className="p-3 rounded-xl bg-[#081226] border border-emerald-900/60">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Delay Reduction</span>
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {simulatedProjections.delayReductionPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, simulatedProjections.delayReductionPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Punctuality Index */}
          <div className="p-3 rounded-xl bg-[#081226] border border-sky-900/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Punctuality Index</span>
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-sky-300">
                {simulatedProjections.projectedPunctuality}%
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              +{(simulatedProjections.projectedPunctuality - 85.2).toFixed(1)}% vs Baseline
            </div>
          </div>

          {/* Card 4: Delayed Trains */}
          <div className="p-3 rounded-xl bg-[#081226] border border-sky-900/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Delayed Trains</span>
              <Train className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-amber-300">
                {simulatedProjections.simulatedDelayedTrainsCount}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                / {CANONICAL_TRAINS.length}
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              {simulatedProjections.trainsClearedCount} on-time cleared
            </div>
          </div>

          {/* Card 5: Kavach Headway Margin */}
          <div className="p-3 rounded-xl bg-[#081226] border border-sky-900/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Kavach Buffer</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {simulatedProjections.kavachHeadwayMarginKm} km
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              RDSO Para 6.4 Safe
            </div>
          </div>

          {/* Card 6: Blocks Toggled Off */}
          <div className="p-3 rounded-xl bg-[#081226] border border-sky-900/80">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>Blocks Muted (Off)</span>
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-xl font-bold font-mono ${
                simulatedProjections.toggledOffBlocksCount > 0 ? 'text-purple-300 font-bold' : 'text-slate-400'
              }`}>
                {simulatedProjections.toggledOffBlocksCount}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                / {simulatedProjections.totalBlocksCount} total
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {simulatedProjections.activeBlocksCount} active on track
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: LEFT CONTROLLER, RIGHT PROJECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MAINTENANCE BLOCKS TOGGLE CONTROLLER (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                  Maintenance Blocks Matrix ({filteredBlocks.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleInvertSelection}
                className="text-[10px] text-sky-300 hover:text-sky-100 font-mono underline cursor-pointer"
                title="Invert current active/suppressed toggle states"
              >
                Invert All
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <span className="text-[10px] text-slate-500 px-1.5 uppercase">Corridor:</span>
                {['ALL', 'C001', 'C002', 'C003', 'C004'].map((corr) => (
                  <button
                    key={corr}
                    type="button"
                    onClick={() => setCorridorFilter(corr)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      corridorFilter === corr
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {corr}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setConflictOnlyFilter(!conflictOnlyFilter)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono border cursor-pointer transition-all flex items-center gap-1 ${
                  conflictOnlyFilter
                    ? 'bg-rose-950 text-rose-200 border-rose-600 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Clashing Only</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search block ID, track KM, train..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Blocks List */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredBlocks.map((b) => {
                const isActive = activeBlockState[b.blockId] !== false; // true if on
                const conflict = conflictBlockMap.get(b.blockId);
                const hasOpenConflict = !!conflict || b.hasConflict;

                return (
                  <div
                    key={b.blockId}
                    id={`block-card-${b.blockId.toLowerCase()}`}
                    data-testid={`block-card-${b.blockId.toLowerCase()}`}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? hasOpenConflict
                          ? 'bg-[#14142b] border-rose-900/80 shadow-xs'
                          : 'bg-[#0b1633] border-sky-900/70'
                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {b.blockId}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-slate-700">
                          {b.corridorId}
                        </span>
                        {renderDepartmentBadge(b.department)}
                      </div>

                      {/* THE INTERACTIVE ON / OFF TOGGLE SWITCH */}
                      <button
                        type="button"
                        id={`toggle-block-${b.blockId.toLowerCase()}`}
                        data-testid={`toggle-block-${b.blockId.toLowerCase()}`}
                        onClick={() => handleToggleBlock(b.blockId)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                          isActive
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                        }`}
                        title={isActive ? 'Click to toggle OFF (mute block from schedule)' : 'Click to toggle ON (impose block on schedule)'}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-500'}`} />
                        <span>{isActive ? 'ACTIVE (ON)' : 'MUTED (OFF)'}</span>
                      </button>
                    </div>

                    {/* Block detail row */}
                    <div className="mt-2 text-[11px] font-mono text-slate-300 flex items-center justify-between flex-wrap gap-1">
                      <span className="text-slate-400">
                        {b.section} • {b.startTime}–{b.endTime} ({b.durationMinutes}m)
                      </span>
                      <span className="text-[10px] text-slate-400">Asset: {b.assetId}</span>
                    </div>

                    {/* Conflicting Train Callout */}
                    {hasOpenConflict && (
                      <div className={`mt-2 p-2 rounded-lg text-[10px] font-mono flex items-start gap-1.5 ${
                        isActive
                          ? 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
                          : 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-200'
                      }`}>
                        {isActive ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-rose-300">
                                Clashes with {conflict?.trainNumber || 'Express Train'}{' '}
                                {conflict ? `(${conflict.trainName})` : ''}
                              </span>
                              <p className="text-slate-400 mt-0.5">
                                Active on track — generates secondary delays. Toggle OFF to clear path!
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-300">
                                Path Cleared for {conflict?.trainNumber || 'Express Train'}!
                              </span>
                              <p className="text-slate-400 mt-0.5">
                                Block muted in simulation — train restored to unhindered green signal.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBlocks.length === 0 && (
                <div className="p-6 text-center text-xs font-mono text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
                  No maintenance blocks matching the filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSTANT TRAIN DELAY PROJECTIONS & DETAIL (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Train className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Instant Train Delay Projections ({filteredTrainProjections.length} Trains)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Projections update instantly when blocks on the left are toggled ON or OFF.
                </p>
              </div>

              {/* Train Category Filter */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                {['ALL', 'RAJDHANI', 'SHATABDI', 'VANDE_BHARAT', 'FREIGHT'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedTrainCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      selectedTrainCategory === cat
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Train Projections Cards */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredTrainProjections.map((train) => {
                const isCleared = train.simulatedDelayMinutes === 0 && train.baselineDelayMinutes > 0;
                const delaySaved = train.baselineDelayMinutes - train.simulatedDelayMinutes;

                return (
                  <div
                    key={train.trainNumber}
                    id={`train-projection-${train.trainNumber}`}
                    data-testid={`train-projection-${train.trainNumber}`}
                    className={`p-4 rounded-xl border transition-all ${
                      train.simulatedDelayMinutes === 0
                        ? 'bg-[#091b24] border-emerald-800/80 shadow-xs'
                        : train.simulatedDelayMinutes <= 15
                        ? 'bg-[#18192a] border-amber-900/70'
                        : 'bg-[#1a1226] border-rose-900/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold font-mono text-white">
                          #{train.trainNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {train.trainName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {train.category}
                        </span>
                      </div>

                      {/* Instant Delay Status Badge */}
                      <div className="flex items-center gap-2">
                        {train.simulatedDelayMinutes === 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ON-TIME (0m Delay)</span>
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
                            train.simulatedDelayMinutes <= 15
                              ? 'bg-amber-950 text-amber-300 border border-amber-600'
                              : 'bg-rose-950 text-rose-300 border border-rose-600'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>+{train.simulatedDelayMinutes}m Delay</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delay Comparison Bar */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-slate-800/70">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Route & Timetable Slot:</span>
                          <span className="text-slate-200">{train.timeSlot}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {train.corridorName} ({train.corridorId})
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Delay Comparison:</span>
                          <span className="font-mono">
                            <span className="text-slate-400 line-through mr-1.5">
                              {train.baselineDelayMinutes}m base
                            </span>
                            <span className={`font-bold ${
                              train.simulatedDelayMinutes === 0 ? 'text-emerald-400' : 'text-amber-300'
                            }`}>
                              → {train.simulatedDelayMinutes}m sim
                            </span>
                          </span>
                        </div>

                        {delaySaved > 0 ? (
                          <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-emerald-400" />
                            <span>-{delaySaved}m delay saved ({Math.round((delaySaved / train.baselineDelayMinutes) * 100)}% relief)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Baseline delay sustained
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Causative Block Attribution */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Causative Blocks:</span>
                        {train.causativeBlockIds.map((bId) => {
                          const isBlockActive = activeBlockState[bId] !== false;
                          return (
                            <span
                              key={bId}
                              className={`px-1.5 py-0.2 rounded border ${
                                isBlockActive
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 line-through opacity-70'
                              }`}
                              title={isBlockActive ? `Block ${bId} is ACTIVE (imposing delay)` : `Block ${bId} is MUTED (cleared in simulation)`}
                            >
                              {bId} {isBlockActive ? '(Active)' : '(Muted)'}
                            </span>
                          );
                        })}
                      </div>

                      {train.passengersEstimated > 0 && (
                        <span className="text-slate-400">
                          {train.simulatedDelayMinutes === 0 ? (
                            <span className="text-emerald-400">
                              ✓ {train.passengersEstimated.toLocaleString()} passengers protected
                            </span>
                          ) : (
                            <span>{train.passengersEstimated.toLocaleString()} passengers affected</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
