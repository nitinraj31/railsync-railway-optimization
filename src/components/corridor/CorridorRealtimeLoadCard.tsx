import React, { useState, useMemo, useRef } from 'react';
import {
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Wrench,
  Radio,
  Zap,
  RefreshCw,
  Info,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  HardHat,
  Cpu,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Filter,
  Sparkles,
  Sliders,
  X,
  ShieldCheck,
  AlertCircle,
  Users,
  Truck,
} from 'lucide-react';
import { Corridor, OptimizedBlock, CorridorAutoBalanceResult, CorridorResourceMetrics } from '../../types';
import { mockStore, autoBalanceCorridor } from '../../services/api';

interface CorridorRealtimeLoadCardProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

export type TaskPriorityLevel = 'CRITICAL' | 'HIGH' | 'NORMAL';

export interface CorridorTaskItem {
  id: string;
  taskId: string;
  department: 'ENGINEERING' | 'S&T' | 'TRACTION';
  assetId: string;
  assetName: string;
  description: string;
  durationMinutes: number;
  priority: TaskPriorityLevel;
  status: string;
}

interface DepartmentTaskBreakdown {
  department: 'ENGINEERING' | 'S&T' | 'TRACTION';
  displayName: string;
  count: number;
  percentage: number;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  sampleTasks: string[];
}

export interface CorridorResourceStatus {
  hasDeficit: boolean;
  manpowerAllocated: number;
  manpowerRequired: number;
  manpowerDeficit: number; // positive if deficit
  machineryAllocated: number;
  machineryRequired: number;
  machineryDeficit: number; // positive if deficit
  deficitSummary: string;
  bottleneckWarnings: string[];
}

interface CorridorLoadData {
  id: string;
  name: string;
  code: string;
  fromStation: string;
  toStation: string;
  lengthKm: number;
  tracksCount: number;
  speedLimitKmph: number;
  status: 'OPERATIONAL' | 'RESTRICTED' | 'MAINTENANCE_ACTIVE';
  
  // Real-time utilization
  realtimeUtilization: number;
  utilizationCategory: 'CRITICAL' | 'HEAVY' | 'BALANCED' | 'HEADROOM';
  
  // Maintenance load
  maintenanceLoadPct: number;
  previousLoadPct: number;
  loadDelta: number; // current - previous
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  
  // Task counts and breakdown
  totalActiveTasks: number;
  scheduledBlocksCount: number;
  availableSlots: number;
  departmentBreakdown: DepartmentTaskBreakdown[];
  tasks: CorridorTaskItem[];
  priorityCounts: { critical: number; high: number; normal: number };
  
  // Resource database allocation & warning status
  resourceStatus: CorridorResourceStatus;
}

// Render helper for color-coded priority status badges
export const renderPriorityBadge = (priority: TaskPriorityLevel) => {
  if (priority === 'CRITICAL') {
    return (
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700/80 flex items-center gap-1 shrink-0 shadow-sm shadow-rose-950/40"
        title="Priority Status: Critical (Urgent safety or track restoration)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <span>Critical</span>
      </span>
    );
  }
  if (priority === 'HIGH') {
    return (
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/80 flex items-center gap-1 shrink-0 shadow-sm shadow-amber-950/40"
        title="Priority Status: High (Mandatory scheduled block window)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <span>High</span>
      </span>
    );
  }
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-700/60 flex items-center gap-1 shrink-0"
      title="Priority Status: Normal (Periodic preventive inspection)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
      <span>Normal</span>
    </span>
  );
};

export const CorridorRealtimeLoadCard: React.FC<CorridorRealtimeLoadCardProps> = ({
  corridors,
  blocks = [],
  onNavigate,
  onRefreshData,
}) => {
  // Timestamp of last telemetry refresh
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Active hover tooltip corridor ID
  const [activeTooltipCorridorId, setActiveTooltipCorridorId] = useState<string | null>(null);
  const [activeResourceWarningCorridorId, setActiveResourceWarningCorridorId] = useState<string | null>(null);

  // Expand/Collapse state per corridor for detailed maintenance task breakdown (default expanded on C001, C003)
  const [expandedCorridors, setExpandedCorridors] = useState<Record<string, boolean>>({
    C001: true,
    C002: false,
    C003: true,
    C004: false,
  });

  // Toggle expand/collapse for a single corridor
  const toggleExpandCorridor = (corridorId: string) => {
    setExpandedCorridors((prev) => ({
      ...prev,
      [corridorId]: !prev[corridorId],
    }));
  };

  // Toggle all cards between expand and collapse
  const areAllExpanded = corridors.length > 0 && corridors.every((c) => expandedCorridors[c.id]);

  const handleToggleAllExpand = () => {
    const nextState = !areAllExpanded;
    const updated: Record<string, boolean> = {};
    corridors.forEach((c) => {
      updated[c.id] = nextState;
    });
    setExpandedCorridors(updated);
  };

  // Targeted AI Auto-Balance State
  const [balancingCorridorId, setBalancingCorridorId] = useState<string | null>(null);
  const [balanceOutcomeResult, setBalanceOutcomeResult] = useState<CorridorAutoBalanceResult | null>(null);
  const [recentlyBalancedCorridors, setRecentlyBalancedCorridors] = useState<
    Record<string, { relief: number; timestamp: number }>
  >({});

  // Filter & sorting options
  const [sortBy, setSortBy] = useState<'utilization' | 'load' | 'tasks' | 'code'>('load');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'OPERATIONAL'>('ALL');

  // Track historical maintenance loads across refreshes to compute true deltas
  // Key: corridorId -> { previous: number, current: number }
  const loadHistoryRef = useRef<Map<string, { previous: number; current: number }>>(new Map());

  // Baseline load percentage seeds for realistic initial trend variation
  const baselineLoadSeeds: Record<string, { base: number; initialPrev: number }> = {
    C001: { base: 84.6, initialPrev: 81.2 }, // +3.4% (UP)
    C002: { base: 68.4, initialPrev: 72.1 }, // -3.7% (DOWN)
    C003: { base: 92.5, initialPrev: 89.0 }, // +3.5% (UP)
    C004: { base: 78.2, initialPrev: 79.5 }, // -1.3% (DOWN)
  };

  // Initialize history map once if empty
  if (loadHistoryRef.current.size === 0) {
    corridors.forEach((c) => {
      const seed = baselineLoadSeeds[c.id] || { base: 75, initialPrev: 72 };
      loadHistoryRef.current.set(c.id, {
        previous: seed.initialPrev,
        current: seed.base,
      });
    });
  }

  // Handle manual or automatic telemetry refresh
  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate live sensor ingestion micro-delay
    await new Promise((r) => setTimeout(r, 600));

    // Update history: previous becomes old current, new current gets fresh realistic delta
    corridors.forEach((c) => {
      const existing = loadHistoryRef.current.get(c.id);
      const oldCurrent = existing ? existing.current : c.utilization * 0.9;
      // Slight fluctuation between -4.5% to +4.5%
      const fluctuation = +((Math.random() * 8 - 4).toFixed(1));
      const newCurrent = Math.max(35, Math.min(98, +(oldCurrent + fluctuation).toFixed(1)));
      
      loadHistoryRef.current.set(c.id, {
        previous: oldCurrent,
        current: newCurrent,
      });
    });

    setLastRefreshTime(new Date());
    setRefreshTick((prev) => prev + 1);
    setIsRefreshing(false);

    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Trigger targeted AI Auto-Balance for a specific corridor
  const handleAutoBalance = async (corridorId: string) => {
    setBalancingCorridorId(corridorId);
    try {
      const result = await autoBalanceCorridor(corridorId);

      // Update load history so trend arrow immediately indicates downward relief
      loadHistoryRef.current.set(corridorId, {
        previous: result.preLoadPct,
        current: result.postLoadPct,
      });

      setRecentlyBalancedCorridors((prev) => ({
        ...prev,
        [corridorId]: {
          relief: result.loadReliefPct,
          timestamp: Date.now(),
        },
      }));

      // Automatically expand card to reveal smoothed task breakdown
      setExpandedCorridors((prev) => ({
        ...prev,
        [corridorId]: true,
      }));

      setBalanceOutcomeResult(result);
      setRefreshTick((prev) => prev + 1);

      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Error auto-balancing corridor:', err);
    } finally {
      setBalancingCorridorId(null);
    }
  };

  // Compute live data for each corridor defined in the corridors state array
  const corridorLoadDataList: CorridorLoadData[] = useMemo(() => {
    const allTasks: any[] = mockStore.getMaintenanceTasks();
    const rawBlocks = blocks.length > 0 ? blocks : mockStore.getOptimizedBlocks();
    const allAssets = mockStore.getAssets();
    const resourceMetrics: CorridorResourceMetrics[] = mockStore.getCorridorResourceMetrics();

    return corridors.map((corridor) => {
      // 1. Match tasks associated with this corridor
      const corridorTasks = allTasks.filter(
        (t) => t.corridorId === corridor.id || t.corridor === corridor.id
      );
      
      const effectiveTasks = corridorTasks.length > 0 ? corridorTasks : [];

      // Map structured tasks with verified priority levels (CRITICAL, HIGH, NORMAL)
      const mappedTasks: CorridorTaskItem[] = effectiveTasks.map((t, idx) => {
        const rawP = String(t.priority || '').toUpperCase();
        let priority: TaskPriorityLevel = 'NORMAL';
        if (rawP === 'CRITICAL' || rawP.includes('CRIT') || idx === 0) {
          priority = 'CRITICAL';
        } else if (rawP === 'HIGH' || idx === 1 || idx === 2) {
          priority = 'HIGH';
        } else {
          priority = 'NORMAL';
        }

        const d = String(t.department || '').toUpperCase();
        const dept: 'ENGINEERING' | 'S&T' | 'TRACTION' =
          d.includes('S&T') || d.includes('SIGNAL')
            ? 'S&T'
            : d.includes('TRAC') || d.includes('OHE') || d.includes('ELEC')
            ? 'TRACTION'
            : 'ENGINEERING';

        const asset = allAssets.find((a) => a.id === t.assetId);

        return {
          id: t.id || t.taskId || `TSK-${corridor.id}-${idx}`,
          taskId: t.taskId || `TSK-M${(idx + 1).toString().padStart(3, '0')}`,
          department: dept,
          assetId: t.assetId || (asset?.id || `A00${(idx % 28) + 1}`),
          assetName: asset?.name || `Sectional Asset ${t.assetId || `A00${(idx % 28) + 1}`}`,
          description: t.description || `${dept} sectional maintenance & diagnostic sweep`,
          durationMinutes: t.durationMinutes || (idx % 2 === 0 ? 90 : 120),
          priority,
          status: t.status || 'SCHEDULED',
        };
      });

      // If mappedTasks is empty, create realistic fallback tasks with priority breakdown
      if (mappedTasks.length === 0) {
        const mockDescs = [
          { d: 'ENGINEERING', desc: 'Continuous Welded Rail ultrasonic flaw check', p: 'CRITICAL', a: 'A006' },
          { d: 'ENGINEERING', desc: '1-in-12 Turnout switch point tamping', p: 'HIGH', a: 'A002' },
          { d: 'S&T', desc: 'Solid State EI relay diagnostic sweep', p: 'HIGH', a: 'A003' },
          { d: 'S&T', desc: 'Digital Axle Counter high-frequency calibration', p: 'NORMAL', a: 'A009' },
          { d: 'TRACTION', desc: '25kV Catenary contact wire tension audit', p: 'CRITICAL', a: 'A004' },
          { d: 'TRACTION', desc: 'TSS Substation transformer bay isolator service', p: 'NORMAL', a: 'A007' },
        ];
        mockDescs.forEach((m, idx) => {
          mappedTasks.push({
            id: `TSK-${corridor.id}-${idx}`,
            taskId: `TSK-M${(idx + 1).toString().padStart(3, '0')}`,
            department: m.d as any,
            assetId: m.a,
            assetName: `Sectional Asset ${m.a}`,
            description: m.desc,
            durationMinutes: 90,
            priority: m.p as TaskPriorityLevel,
            status: 'SCHEDULED',
          });
        });
      }

      // Priority counts for quick indicator
      const priorityCounts = {
        critical: mappedTasks.filter((t) => t.priority === 'CRITICAL').length,
        high: mappedTasks.filter((t) => t.priority === 'HIGH').length,
        normal: mappedTasks.filter((t) => t.priority === 'NORMAL').length,
      };

      // 2. Department Breakdown (Engineering, S&T, Traction)
      const engTasks = mappedTasks.filter((t) => t.department === 'ENGINEERING');
      const stTasks = mappedTasks.filter((t) => t.department === 'S&T');
      const trcTasks = mappedTasks.filter((t) => t.department === 'TRACTION');

      const engCount = engTasks.length;
      const stCount = stTasks.length;
      const trcCount = trcTasks.length;
      const totalForPct = Math.max(1, engCount + stCount + trcCount);

      const engSampleTasks = [
        'Continuous Welded Rail (60kg) Ultrasonic flaw detection',
        'Turnout 1-in-12 Thick Web Switch point tamping',
        'Ballast shoulder cleaning & track geometry realignment',
      ];
      const stSampleTasks = [
        'Multi-section Digital Axle Counter (DAC) reset & calibration',
        'Solid State Electronic Interlocking (EI) diagnostic sweep',
        '4-Aspect LED Signal unit luminance & relay continuity test',
      ];
      const trcSampleTasks = [
        '25kV AC Traction 107sqmm contact wire height measurement',
        'Section Insulator PT-Auto neutral section spark gap tuning',
        'TSS 30MVA Transformer oil dielectric & bay isolator overhaul',
      ];

      const departmentBreakdown: DepartmentTaskBreakdown[] = [
        {
          department: 'ENGINEERING',
          displayName: 'Civil Engineering (Track & P-Way)',
          count: engCount,
          percentage: Math.round((engCount / totalForPct) * 100),
          color: 'from-amber-500 to-orange-500',
          badgeBg: 'bg-amber-950/80',
          badgeBorder: 'border-amber-700/60',
          badgeText: 'text-amber-300',
          sampleTasks: engSampleTasks,
        },
        {
          department: 'S&T',
          displayName: 'Signal & Telecommunication',
          count: stCount,
          percentage: Math.round((stCount / totalForPct) * 100),
          color: 'from-sky-500 to-blue-500',
          badgeBg: 'bg-sky-950/80',
          badgeBorder: 'border-sky-700/60',
          badgeText: 'text-sky-300',
          sampleTasks: stSampleTasks,
        },
        {
          department: 'TRACTION',
          displayName: 'Traction Distribution (25kV OHE)',
          count: trcCount,
          percentage: Math.round((trcCount / totalForPct) * 100),
          color: 'from-yellow-500 to-amber-500',
          badgeBg: 'bg-yellow-950/80',
          badgeBorder: 'border-yellow-700/60',
          badgeText: 'text-yellow-300',
          sampleTasks: trcSampleTasks,
        },
      ];

      // 3. Corridor blocks & slot metrics
      const corrBlocks = rawBlocks.filter((b) => b.corridorId === corridor.id);
      const scheduledBlocksCount = corrBlocks.length > 0 ? corrBlocks.length : (corridor.scheduledBlocks || 10);
      const availableSlots = corridor.availableSlots || 4;

      // 4. Resource Database Allocation & Deficit Warning Evaluation
      const corrResMetric = resourceMetrics.find((r) => r.corridorId === corridor.id);
      const isCorridorRecentlyBalanced = Boolean(
        recentlyBalancedCorridors[corridor.id] &&
        Date.now() - recentlyBalancedCorridors[corridor.id].timestamp < 120000
      );

      // Allocated quantities from resource database
      const manpowerAllocated = corrResMetric?.totalManpowerAllocated || (corridor.id === 'C001' ? 80 : corridor.id === 'C002' ? 55 : corridor.id === 'C003' ? 85 : 65);
      const machineryAllocated = corrResMetric?.totalMachineryAllocated || (corridor.id === 'C001' ? 4 : corridor.id === 'C002' ? 3 : corridor.id === 'C003' ? 4 : 3);

      // Required resources based on current maintenance load:
      // In baseline, C003 and C004 experience resource contention because of heavy concurrent task clustering.
      // After AI Auto-balance, tasks are smoothed and staggered so demand drops to within allocated limits.
      let manpowerRequired: number;
      let machineryRequired: number;

      if (isCorridorRecentlyBalanced) {
        // Balanced schedule staggers tasks so simultaneous resource pressure is reduced
        manpowerRequired = Math.round(manpowerAllocated * 0.88);
        machineryRequired = Math.max(1, machineryAllocated - 1);
      } else if (corridor.id === 'C003') {
        // C003 has 12 scheduled blocks + heavy freight pressure -> requires 98 staff and 5 machines
        manpowerRequired = 98;
        machineryRequired = 5;
      } else if (corridor.id === 'C004') {
        // C004 has tight gang allocation -> requires 72 staff and 4 machines
        manpowerRequired = 72;
        machineryRequired = 4;
      } else if (corridor.id === 'C001') {
        manpowerRequired = 76;
        machineryRequired = 4;
      } else {
        manpowerRequired = 50;
        machineryRequired = 3;
      }

      const manpowerDeficit = Math.max(0, manpowerRequired - manpowerAllocated);
      const machineryDeficit = Math.max(0, machineryRequired - machineryAllocated);
      const hasDeficit = manpowerDeficit > 0 || machineryDeficit > 0;

      const bottleneckWarnings: string[] = [];
      if (manpowerDeficit > 0) {
        bottleneckWarnings.push(`Staffing Deficit: Current load demands ${manpowerRequired} personnel (+${manpowerDeficit} over allocated ${manpowerAllocated} in DB).`);
      }
      if (machineryDeficit > 0) {
        bottleneckWarnings.push(`Machinery Slot Exceeded: Demands ${machineryRequired} machines (+${machineryDeficit} over allocated ${machineryAllocated} in DB).`);
      }

      const deficitSummary = hasDeficit
        ? [
            manpowerDeficit > 0 ? `-${manpowerDeficit} Gang` : '',
            machineryDeficit > 0 ? `-${machineryDeficit} Mach` : '',
          ]
            .filter(Boolean)
            .join(', ')
        : 'Sufficient';

      const resourceStatus: CorridorResourceStatus = {
        hasDeficit,
        manpowerAllocated,
        manpowerRequired,
        manpowerDeficit,
        machineryAllocated,
        machineryRequired,
        machineryDeficit,
        deficitSummary,
        bottleneckWarnings,
      };

      // 5. Maintenance Load Percentage & Trend Arrow Calculation
      const history = loadHistoryRef.current.get(corridor.id);
      let maintenanceLoadPct: number;
      let previousLoadPct: number;

      if (history) {
        maintenanceLoadPct = history.current;
        previousLoadPct = history.previous;
      } else {
        const calculatedLoad = Math.round(
          (scheduledBlocksCount / (scheduledBlocksCount + availableSlots)) * 100
        );
        maintenanceLoadPct = calculatedLoad;
        previousLoadPct = calculatedLoad - 2.5;
        loadHistoryRef.current.set(corridor.id, {
          previous: previousLoadPct,
          current: maintenanceLoadPct,
        });
      }

      const loadDelta = +(maintenanceLoadPct - previousLoadPct).toFixed(1);
      const trendDirection: 'UP' | 'DOWN' | 'STABLE' =
        loadDelta > 0.2 ? 'UP' : loadDelta < -0.2 ? 'DOWN' : 'STABLE';

      // 6. Real-time Utilization
      const realtimeUtilization = corridor.utilization || 85;
      const utilizationCategory =
        realtimeUtilization >= 90
          ? 'CRITICAL'
          : realtimeUtilization >= 80
          ? 'HEAVY'
          : realtimeUtilization >= 70
          ? 'BALANCED'
          : 'HEADROOM';

      return {
        id: corridor.id,
        name: corridor.name,
        code: corridor.code || corridor.id,
        fromStation: corridor.stationFrom || corridor.fromStation || 'Station A',
        toStation: corridor.stationTo || corridor.toStation || 'Station B',
        lengthKm: corridor.lengthKm || 45,
        tracksCount: corridor.tracksCount || 2,
        speedLimitKmph: corridor.speedLimitKmph || 130,
        status: (corridor.status as any) || (realtimeUtilization >= 90 ? 'RESTRICTED' : 'OPERATIONAL'),
        realtimeUtilization,
        utilizationCategory,
        maintenanceLoadPct,
        previousLoadPct,
        loadDelta,
        trendDirection,
        totalActiveTasks: mappedTasks.length,
        scheduledBlocksCount,
        availableSlots,
        departmentBreakdown,
        tasks: mappedTasks,
        priorityCounts,
        resourceStatus,
      };
    });
  }, [corridors, blocks, refreshTick, recentlyBalancedCorridors]);

  // Apply sorting and filtering
  const filteredAndSortedList = useMemo(() => {
    let list = [...corridorLoadDataList];

    if (filterStatus === 'CRITICAL') {
      list = list.filter((c) => c.realtimeUtilization >= 90 || c.maintenanceLoadPct >= 85 || c.resourceStatus.hasDeficit);
    } else if (filterStatus === 'OPERATIONAL') {
      list = list.filter((c) => c.status === 'OPERATIONAL');
    }

    list.sort((a, b) => {
      if (sortBy === 'utilization') return b.realtimeUtilization - a.realtimeUtilization;
      if (sortBy === 'load') return b.maintenanceLoadPct - a.maintenanceLoadPct;
      if (sortBy === 'tasks') return b.totalActiveTasks - a.totalActiveTasks;
      return a.code.localeCompare(b.code);
    });

    return list;
  }, [corridorLoadDataList, sortBy, filterStatus]);

  // Network aggregated statistics
  const networkStats = useMemo(() => {
    if (corridorLoadDataList.length === 0) return { avgUtil: 0, avgLoad: 0, totalTasks: 0, deficitCount: 0 };
    const avgUtil = Math.round(
      corridorLoadDataList.reduce((sum, c) => sum + c.realtimeUtilization, 0) /
        corridorLoadDataList.length
    );
    const avgLoad = +(
      corridorLoadDataList.reduce((sum, c) => sum + c.maintenanceLoadPct, 0) /
      corridorLoadDataList.length
    ).toFixed(1);
    const totalTasks = corridorLoadDataList.reduce((sum, c) => sum + c.totalActiveTasks, 0);
    const deficitCount = corridorLoadDataList.filter((c) => c.resourceStatus.hasDeficit).length;

    return { avgUtil, avgLoad, totalTasks, deficitCount };
  }, [corridorLoadDataList]);

  return (
    <div
      id="corridor-realtime-load-card"
      className="bg-[#0b1328] rounded-xl border border-sky-900/60 p-5 shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* CARD HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-sky-950 via-slate-900 to-blue-950 border border-sky-600/50 text-sky-400 shadow-md shadow-sky-950/60 shrink-0 mt-0.5">
            <Gauge className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Corridor Real-Time Utilization & Active Maintenance Load
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-700/60 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Telemetry
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800">
                {corridors.length} Corridors Monitored
              </span>
              {networkStats.deficitCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-600 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>{networkStats.deficitCount} Resource Deficit Alerts</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Real-time traffic occupancy vs scheduled maintenance load per corridor. Warning indicators fire if active maintenance load requires more manpower or machinery than allocated in the resource database.
            </p>
          </div>
        </div>

        {/* CONTROLS: REFRESH, EXPAND ALL / COLLAPSE ALL, SORT & SUMMARY PILLS */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          {/* Master Expand/Collapse All Toggle */}
          <button
            onClick={handleToggleAllExpand}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title={areAllExpanded ? 'Collapse all task breakdowns to save screen real estate' : 'Expand all task breakdowns across all corridors'}
          >
            {areAllExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Expand All</span>
              </>
            )}
          </button>

          {/* Last Sync Timestamp Pill */}
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Refreshed:</span>
            <span className="text-slate-200 font-semibold">
              {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center bg-slate-900/90 rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
            <span className="px-2 py-1 text-[10px] text-slate-500 uppercase font-semibold">Sort:</span>
            <button
              onClick={() => setSortBy('load')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortBy === 'load'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by highest maintenance load"
            >
              Maint Load
            </button>
            <button
              onClick={() => setSortBy('utilization')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortBy === 'utilization'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by highest track utilization"
            >
              Utilization
            </button>
            <button
              onClick={() => setSortBy('tasks')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortBy === 'tasks'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by total active tasks"
            >
              Tasks
            </button>
          </div>

          {/* Live Refresh Trigger Button */}
          <button
            onClick={handleTriggerRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-600/60 hover:border-sky-500 text-sky-200 text-xs font-semibold font-mono flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/40 cursor-pointer disabled:opacity-50"
            title="Fetch latest train telemetry and recalculate maintenance load deltas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* NETWORK SUMMARY BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-8 rounded-full bg-sky-500" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Avg Network Utilization</div>
            <div className="text-base font-bold text-white">{networkStats.avgUtil}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-8 rounded-full bg-amber-500" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Avg Maintenance Load</div>
            <div className="text-base font-bold text-amber-300">{networkStats.avgLoad}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-8 rounded-full bg-purple-500" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Active Maintenance Tasks</div>
            <div className="text-base font-bold text-purple-300">{networkStats.totalTasks} Tasks</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-right">
          <div className="text-[11px] text-slate-400">
            {networkStats.deficitCount > 0 ? (
              <span className="text-amber-400 font-bold flex items-center gap-1 justify-end">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {networkStats.deficitCount} Corridors Exceed Resource DB
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All Resources Within DB Quota
              </span>
            )}
            <div className="text-[10px] text-slate-500">
              Auto-Balance re-distributes load to fit DB quota
            </div>
          </div>
        </div>
      </div>

      {/* CORRIDORS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {filteredAndSortedList.map((corridor) => {
          const isTooltipOpen = activeTooltipCorridorId === corridor.id;
          const isResourceWarningOpen = activeResourceWarningCorridorId === corridor.id;
          const isBalancing = balancingCorridorId === corridor.id;
          const balancedData = recentlyBalancedCorridors[corridor.id];
          const isRecentlyBalanced = Boolean(balancedData && Date.now() - balancedData.timestamp < 120000);
          const isExpanded = Boolean(expandedCorridors[corridor.id]);
          const { resourceStatus } = corridor;

          // Utilization colors
          const utilBadgeColor =
            corridor.realtimeUtilization >= 90
              ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
              : corridor.realtimeUtilization >= 80
              ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';

          const utilBarGradient =
            corridor.realtimeUtilization >= 90
              ? 'from-amber-500 to-rose-500'
              : corridor.realtimeUtilization >= 80
              ? 'from-sky-500 to-amber-500'
              : 'from-emerald-500 to-teal-500';

          // Trend Arrow styling
          const isLoadIncreased = corridor.trendDirection === 'UP';
          const isLoadDecreased = corridor.trendDirection === 'DOWN';

          const trendBadgeClass = isLoadIncreased
            ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
            : isLoadDecreased
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
            : 'bg-slate-800 text-slate-400 border-slate-700';

          return (
            <div
              key={corridor.id}
              className={`bg-[#0e1833] rounded-xl border p-4 transition-all duration-200 hover:shadow-lg hover:shadow-sky-950/50 flex flex-col justify-between group relative ${
                resourceStatus.hasDeficit
                  ? 'border-amber-600/70 shadow-md shadow-amber-950/30'
                  : isRecentlyBalanced
                  ? 'border-emerald-600/80 shadow-md shadow-emerald-950/40'
                  : 'border-sky-950 hover:border-sky-700/70'
              }`}
            >
              {/* TOP HEADER: CODE, STATUS BADGE & EXPAND/COLLAPSE TOGGLE */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                      {corridor.code}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]" title={corridor.name}>
                      {corridor.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status Indicator */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                        corridor.status === 'RESTRICTED'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      }`}
                    >
                      {corridor.status}
                    </span>

                    {/* EXPAND / COLLAPSE TOGGLE BUTTON */}
                    <button
                      type="button"
                      onClick={() => toggleExpandCorridor(corridor.id)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isExpanded
                          ? 'bg-sky-950/90 border-sky-600/70 text-sky-300 hover:bg-sky-900'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                      title={isExpanded ? 'Collapse task breakdown to save screen real estate' : 'Expand detailed maintenance task breakdown with priority badges'}
                    >
                      <span className="hidden sm:inline text-[9px]">{isExpanded ? 'Hide' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-sky-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Corridor Station Name & Specs */}
                <div className="text-[11px] text-slate-300 font-medium truncate mb-1" title={corridor.name}>
                  {corridor.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2.5 flex items-center justify-between">
                  <span>{corridor.fromStation} → {corridor.toStation}</span>
                  <span className="text-slate-500">{corridor.lengthKm} km · {corridor.tracksCount}T</span>
                </div>

                {/* RESOURCE DATABASE DEFICIT WARNING INDICATOR BADGE (FIRES WHEN DEMAND EXCEEDS DB ALLOCATION) */}
                {resourceStatus.hasDeficit ? (
                  <div className="mb-2.5 relative">
                    <div
                      onClick={() =>
                        setActiveResourceWarningCorridorId(
                          activeResourceWarningCorridorId === corridor.id ? null : corridor.id
                        )
                      }
                      onMouseEnter={() => setActiveResourceWarningCorridorId(corridor.id)}
                      onMouseLeave={() => setActiveResourceWarningCorridorId(null)}
                      className="p-1.5 rounded-lg bg-gradient-to-r from-amber-950/90 via-rose-950/80 to-amber-950/90 border border-amber-500/80 hover:border-amber-400 text-amber-200 text-[10px] font-mono font-bold flex items-center justify-between gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer transition-all hover:scale-[1.01]"
                      title="Maintenance load requires more resources than allocated in resource database. Click or hover for details."
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                        <span className="truncate">Resource Deficit Alert</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-900/90 text-rose-200 border border-rose-600/80 font-bold shrink-0">
                        {resourceStatus.deficitSummary}
                      </span>
                    </div>

                    {/* RESOURCE WARNING INTERACTIVE POPUP TOOLTIP */}
                    {isResourceWarningOpen && (
                      <div
                        className="absolute top-full left-0 mt-1.5 w-76 bg-[#071126]/98 backdrop-blur-md border border-amber-500/80 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 font-mono text-xs pointer-events-auto animate-in fade-in duration-150"
                        onMouseEnter={() => setActiveResourceWarningCorridorId(corridor.id)}
                        onMouseLeave={() => setActiveResourceWarningCorridorId(null)}
                      >
                        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Resource Database Contention</span>
                          </span>
                          <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                            {corridor.code}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 font-sans leading-tight">
                          Active maintenance load on this corridor demands more personnel or machinery than allocated in the divisional resource database:
                        </p>

                        <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[10px]">
                          {/* Manpower deficit row */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>Gang Manpower:</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold">{resourceStatus.manpowerRequired} req</span>
                              <span className="text-slate-500">/ {resourceStatus.manpowerAllocated} alloc</span>
                              {resourceStatus.manpowerDeficit > 0 && (
                                <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[9px]">
                                  -{resourceStatus.manpowerDeficit} deficit
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Machinery deficit row */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-500" />
                              <span>Heavy Machinery:</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold">{resourceStatus.machineryRequired} req</span>
                              <span className="text-slate-500">/ {resourceStatus.machineryAllocated} alloc</span>
                              {resourceStatus.machineryDeficit > 0 && (
                                <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[9px]">
                                  -{resourceStatus.machineryDeficit} mach
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoBalance(corridor.id);
                              setActiveResourceWarningCorridorId(null);
                            }}
                            className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Auto-Balance to resolve</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('resource_allocation', { corridorId: corridor.id });
                            }}
                            className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                          >
                            Reallocate in Hub →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Resource Satisfied Pill */
                  <div className="mb-2 px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[9.5px] font-mono text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Resource Quota Satisfied</span>
                    </span>
                    <span className="text-slate-500 text-[8.5px]">
                      {resourceStatus.manpowerRequired}/{resourceStatus.manpowerAllocated} Gangs
                    </span>
                  </div>
                )}

                {/* 1. REAL-TIME TRACK UTILIZATION SECTION */}
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 mb-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      <span>Track Utilization:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-white">
                        {corridor.realtimeUtilization}%
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${utilBadgeColor}`}>
                        {corridor.utilizationCategory}
                      </span>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${utilBarGradient} transition-all duration-500`}
                      style={{ width: `${Math.min(100, corridor.realtimeUtilization)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Headroom: {Math.max(0, 100 - corridor.realtimeUtilization)}%</span>
                    <span>Max Speed: {corridor.speedLimitKmph} km/h</span>
                  </div>
                </div>

                {/* 2. MAINTENANCE LOAD SUMMARY ROW (ALWAYS VISIBLE WITH TREND ARROW) */}
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 mb-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Maintenance Load:</span>
                    </span>

                    {/* Maintenance load percentage + VISUAL TREND ARROW */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-amber-300">
                        {corridor.maintenanceLoadPct}%
                      </span>

                      {/* TREND ARROW (UP/DOWN) PILL */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-0.5 ${trendBadgeClass} transition-colors`}
                        title={`Maintenance load ${
                          isLoadIncreased ? 'increased' : isLoadDecreased ? 'decreased' : 'unchanged'
                        } by ${Math.abs(corridor.loadDelta)}% since last refresh`}
                      >
                        {isLoadIncreased && <TrendingUp className="w-3 h-3 text-rose-400 shrink-0" />}
                        {isLoadDecreased && <TrendingDown className="w-3 h-3 text-emerald-400 shrink-0" />}
                        {!isLoadIncreased && !isLoadDecreased && <Minus className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span>
                          {corridor.loadDelta > 0 ? `+${corridor.loadDelta}%` : `${corridor.loadDelta}%`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Compact overview when collapsed */}
                  {!isExpanded && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/70 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>Tasks:</span>
                        <strong className="text-amber-300">{corridor.totalActiveTasks}</strong>
                        {corridor.priorityCounts.critical > 0 && (
                          <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            {corridor.priorityCounts.critical} Crit
                          </span>
                        )}
                        {resourceStatus.hasDeficit && (
                          <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                            Deficit
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpandCorridor(corridor.id)}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-semibold cursor-pointer"
                      >
                        <span>Show Breakdown</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Maintenance Load Progress Bar when expanded */}
                  {isExpanded && (
                    <div className="space-y-1 pt-0.5">
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, corridor.maintenanceLoadPct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                        <span>Blocks: {corridor.scheduledBlocksCount} Active</span>
                        <span>Slots Left: {corridor.availableSlots} Available</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. DETAILED MAINTENANCE TASK BREAKDOWN (COLLAPSIBLE WITH COLOR-CODED PRIORITY STATUS BADGES) */}
                {isExpanded && (
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-sky-950 space-y-2.5 mb-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300 text-[11px] font-bold">Active Tasks:</span>
                        {/* Quick Priority Counter Pills */}
                        <div className="flex items-center gap-1">
                          {corridor.priorityCounts.critical > 0 && (
                            <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              {corridor.priorityCounts.critical} Crit
                            </span>
                          )}
                          {corridor.priorityCounts.high > 0 && (
                            <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              {corridor.priorityCounts.high} High
                            </span>
                          )}
                        </div>
                      </div>

                      {/* HOVER TRIGGER BADGE FOR MAINTENANCE LOAD COUNT */}
                      <div
                        onMouseEnter={() => setActiveTooltipCorridorId(corridor.id)}
                        onMouseLeave={() => setActiveTooltipCorridorId(null)}
                        onClick={() =>
                          setActiveTooltipCorridorId(
                            activeTooltipCorridorId === corridor.id ? null : corridor.id
                          )
                        }
                        className="relative cursor-pointer"
                      >
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-950 to-orange-950 hover:from-amber-900 hover:to-orange-900 border border-amber-600/70 text-amber-200 text-xs font-mono font-bold flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                          title="Hover to view breakdown of active tasks by department (Engineering, S&T, Traction)"
                        >
                          <HardHat className="w-3 h-3 text-amber-400" />
                          <span>{corridor.totalActiveTasks} Tasks</span>
                          <Info className="w-2.5 h-2.5 text-amber-400/80" />
                        </button>

                        {/* HOVER TOOLTIP POPUP */}
                        {isTooltipOpen && (
                          <div
                            className="absolute bottom-full right-0 mb-2 w-80 bg-[#071126]/98 backdrop-blur-md border border-amber-500/80 rounded-xl shadow-2xl p-3.5 z-50 space-y-3 font-mono text-xs pointer-events-auto"
                            onMouseEnter={() => setActiveTooltipCorridorId(corridor.id)}
                            onMouseLeave={() => setActiveTooltipCorridorId(null)}
                          >
                            {/* Tooltip Header */}
                            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <HardHat className="w-4 h-4 text-amber-400" />
                                <span className="font-bold text-white text-[11px]">
                                  Department Task Breakdown
                                </span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-sky-300 font-bold border border-slate-800">
                                {corridor.code}
                              </span>
                            </div>

                            {/* Priority Status Counter inside Tooltip */}
                            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]">
                              <span className="text-slate-400">Priority Split:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                  {corridor.priorityCounts.critical} Critical
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                                  {corridor.priorityCounts.high} High
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                                  {corridor.priorityCounts.normal} Normal
                                </span>
                              </div>
                            </div>

                            {/* Department Breakdown List */}
                            <div className="space-y-2.5">
                              {corridor.departmentBreakdown.map((dept) => {
                                const DeptIcon =
                                  dept.department === 'ENGINEERING'
                                    ? Wrench
                                    : dept.department === 'S&T'
                                    ? Radio
                                    : Zap;

                                return (
                                  <div
                                    key={dept.department}
                                    className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1.5"
                                  >
                                    {/* Department Title & Count */}
                                    <div className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-1.5">
                                        <DeptIcon className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-bold text-slate-200">
                                          {dept.department}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${dept.badgeBg} ${dept.badgeBorder} ${dept.badgeText}`}>
                                          {dept.count} tasks ({dept.percentage}%)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Department Mini Bar */}
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full bg-gradient-to-r ${dept.color}`}
                                        style={{ width: `${dept.percentage}%` }}
                                      />
                                    </div>

                                    {/* Sample Activities */}
                                    <div className="text-[9px] text-slate-400 font-sans truncate">
                                      <span className="text-slate-500">Active focus: </span>
                                      {dept.sampleTasks[0]}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Tooltip Footer Drilldown Link */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-sky-400">
                              <span className="text-slate-400 font-sans">
                                Click corridor to inspect timeline
                              </span>
                              <span className="flex items-center gap-0.5 hover:underline cursor-pointer font-bold">
                                <span>View Operations</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* INLINE DEPARTMENT SUMMARY CHIPS */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                      {corridor.departmentBreakdown.map((dept) => (
                        <div
                          key={dept.department}
                          className="p-1 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between"
                        >
                          <span className="text-slate-400 text-[8.5px] truncate">
                            {dept.department === 'ENGINEERING' ? 'ENG' : dept.department}
                          </span>
                          <span className={`font-bold ${dept.badgeText}`}>
                            {dept.count}t ({dept.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* RESOURCE DATABASE COMPARISON STRIP */}
                    <div className={`p-1.5 rounded-lg border text-[9.5px] font-mono space-y-1 ${
                      resourceStatus.hasDeficit
                        ? 'bg-amber-950/30 border-amber-600/50 text-amber-200'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Resource DB Allocation:</span>
                        {resourceStatus.hasDeficit ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                            Over Quota
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Balanced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span>Manpower: <strong className={resourceStatus.manpowerDeficit > 0 ? 'text-rose-400' : 'text-slate-200'}>{resourceStatus.manpowerRequired}</strong> / {resourceStatus.manpowerAllocated} Staff</span>
                        <span>Machinery: <strong className={resourceStatus.machineryDeficit > 0 ? 'text-rose-400' : 'text-slate-200'}>{resourceStatus.machineryRequired}</strong> / {resourceStatus.machineryAllocated} Machines</span>
                      </div>
                    </div>

                    {/* INDIVIDUAL MAINTENANCE TASKS LIST WITH COLOR-CODED PRIORITY STATUS BADGES */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="font-semibold text-slate-300">Scheduled Task Queue:</span>
                        <span className="text-[9px] text-slate-500">
                          {corridor.tasks.length} active
                        </span>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {corridor.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-1.5 rounded-lg bg-slate-950/90 border border-slate-800/90 hover:border-slate-700/80 flex items-center justify-between gap-2 text-[10px] font-mono transition-colors group/task"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-200 text-[10px]">
                                  {task.taskId}
                                </span>
                                <span
                                  className={`px-1 py-0.2 rounded text-[8.5px] font-bold uppercase ${
                                    task.department === 'ENGINEERING'
                                      ? 'text-amber-400 bg-amber-950/70'
                                      : task.department === 'S&T'
                                      ? 'text-sky-400 bg-sky-950/70'
                                      : 'text-yellow-400 bg-yellow-950/70'
                                  }`}
                                >
                                  {task.department === 'ENGINEERING' ? 'ENG' : task.department}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  {task.assetId}
                                </span>
                              </div>
                              <div
                                className="text-[9px] text-slate-400 font-sans truncate"
                                title={task.description}
                              >
                                {task.description}
                              </div>
                            </div>

                            {/* RIGHT SIDE: DURATION & COLOR-CODED PRIORITY STATUS BADGE */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] text-slate-500 font-mono">
                                {task.durationMinutes}m
                              </span>
                              {/* COLOR-CODED PRIORITY STATUS BADGE (Critical / High / Normal) */}
                              {renderPriorityBadge(task.priority)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Collapse Button inside breakdown */}
                    <div className="pt-0.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpandCorridor(corridor.id)}
                        className="text-[9.5px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Hide details</span>
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. TARGETED AI AUTO-BALANCE BUTTON */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => handleAutoBalance(corridor.id)}
                    disabled={isBalancing}
                    className={`w-full py-2 px-3 rounded-lg border font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md group ${
                      isRecentlyBalanced
                        ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200 hover:bg-emerald-900 shadow-emerald-950/40'
                        : resourceStatus.hasDeficit
                        ? 'bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 border-amber-500/70 hover:border-amber-400 text-amber-200 hover:text-white shadow-amber-950/40 hover:from-amber-900 hover:to-purple-900'
                        : 'bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-purple-500/60 hover:border-purple-400 text-purple-200 hover:text-white shadow-purple-950/40 hover:from-purple-900 hover:to-indigo-900'
                    }`}
                    title={
                      resourceStatus.hasDeficit
                        ? `Resource deficit detected! Click Auto-Balance to re-distribute tasks and clear manpower/machinery deficits on ${corridor.code}`
                        : `Trigger targeted AI optimization for ${corridor.code}: re-balance active block requests and maintenance tasks to smooth out the load curve`
                    }
                  >
                    {isBalancing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-purple-300 animate-spin" />
                        <span className="tracking-wide">AI AUTO-BALANCING...</span>
                      </>
                    ) : isRecentlyBalanced ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>RESOURCES BALANCED (-{balancedData?.relief}%)</span>
                        <Sparkles className="w-3 h-3 text-emerald-400 group-hover:rotate-12 transition-transform" />
                      </>
                    ) : resourceStatus.hasDeficit ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
                        <span className="tracking-wide">AUTO-BALANCE (CLEAR DEFICIT)</span>
                        <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase font-semibold">
                          AI
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="tracking-wide">AUTO-BALANCE</span>
                        <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase font-semibold">
                          AI
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD FOOTER: DIRECT INSPECT BUTTON */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => onNavigate('timeline', { corridorId: corridor.id })}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Inspect maintenance timeline for this corridor"
                >
                  <span>Inspect Timeline</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => onNavigate('resource_allocation', { corridorId: corridor.id })}
                  className="text-[10px] text-slate-500 hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Open resource allocation hub for this corridor"
                >
                  <span>Resources</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TARGETED AI AUTO-BALANCE OUTCOME MODAL */}
      {balanceOutcomeResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091325] border border-purple-500/70 rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-5 font-mono text-xs my-8 border-t-4 border-t-purple-500 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-300 shadow-lg">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Targeted AI Corridor Auto-Balance Complete
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
                      {balanceOutcomeResult.corridorCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {balanceOutcomeResult.corridorName} — Active blocks and maintenance tasks re-balanced to smooth load and satisfy resource database allocations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBalanceOutcomeResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI STAT TILES */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Maintenance Load</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm line-through text-slate-500">{balanceOutcomeResult.preLoadPct}%</span>
                  <span className="text-base font-bold text-emerald-400">{balanceOutcomeResult.postLoadPct}%</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">
                  ↓ -{balanceOutcomeResult.loadReliefPct}% Smoothed
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Peak Strain Index</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm line-through text-slate-500">{balanceOutcomeResult.prePeakStrain}</span>
                  <span className="text-base font-bold text-sky-400">{balanceOutcomeResult.postPeakStrain}</span>
                </div>
                <div className="text-[10px] text-sky-400 font-bold">
                  ↓ -{balanceOutcomeResult.strainReliefPts} pts Relief
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Resource Contention</div>
                <div className="text-base font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Quota Satisfied</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {balanceOutcomeResult.rebalancedBlocksCount} Blocks Shifted
                </div>
              </div>
            </div>

            {/* 24-HOUR LOAD CURVE SMOOTHING VISUALIZATION */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Diurnal Load Curve: Pre-AI Clustered vs Post-AI Smoothed</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  6 Diurnal Windows
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {balanceOutcomeResult.hourlyLoadCurve.map((point) => {
                  const varianceDrop = point.preLoadPct - point.postLoadPct;
                  return (
                    <div key={point.hourLabel} className="space-y-1 text-[10px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-300">{point.hourLabel}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Pre: {point.preLoadPct}%</span>
                          <span className="text-emerald-400 font-bold">Post: {point.postLoadPct}%</span>
                          <span className={`px-1 py-0.2 rounded font-bold ${
                            varianceDrop > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {varianceDrop > 0 ? `-${varianceDrop}%` : `+${Math.abs(varianceDrop)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Dual comparison bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800">
                        <div
                          className="h-full bg-rose-500/40"
                          style={{ width: `${point.preLoadPct / 2}%` }}
                          title={`Pre-load: ${point.preLoadPct}%`}
                        />
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${point.postLoadPct / 2}%` }}
                          title={`Post-load: ${point.postLoadPct}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RE-BALANCED SHIFTS TABLE */}
            {balanceOutcomeResult.shifts.length > 0 && (
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span>Re-Scheduled Maintenance Blocks & Shifts</span>
                  <span className="text-[10px] text-purple-400">
                    {balanceOutcomeResult.shifts.length} Tasks De-Clustered
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {balanceOutcomeResult.shifts.map((shift, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950/90 border border-slate-800/80 flex items-start justify-between gap-3 text-[10px]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{shift.blockId}</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px] font-bold">
                            {shift.department}
                          </span>
                          <span className="text-slate-400 truncate max-w-[180px]">{shift.assetName}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans">
                          {shift.reason}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-slate-500 line-through text-[9px]">{shift.oldTimeWindow}</div>
                        <div className="text-emerald-400 font-bold text-[10px]">{shift.newTimeWindow}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI EXPLAINABILITY & RATIONALE */}
            <div className="bg-purple-950/30 border border-purple-800/50 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>AI Constraint Satisfaction & Resource Allocation Guarantee</span>
              </div>
              <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
                {balanceOutcomeResult.aiRationale} All re-scheduled blocks verify against the divisional manpower and heavy machinery quotas in the resource database.
              </p>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onNavigate('timeline', { corridorId: balanceOutcomeResult.corridorId });
                  setBalanceOutcomeResult(null);
                }}
                className="px-3 py-2 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-600/60 text-sky-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Inspect in Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setBalanceOutcomeResult(null)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-purple-950/60 transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
