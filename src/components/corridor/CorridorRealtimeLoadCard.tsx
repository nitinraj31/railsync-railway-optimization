import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Filter,
} from 'lucide-react';
import { Corridor, OptimizedBlock, MaintenanceTask } from '../../types';
import { mockStore } from '../../services/api';

interface CorridorRealtimeLoadCardProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
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
}

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

  // Compute live data for each corridor defined in the corridors state array
  const corridorLoadDataList: CorridorLoadData[] = useMemo(() => {
    const allTasks: any[] = mockStore.getMaintenanceTasks();
    const rawBlocks = blocks.length > 0 ? blocks : mockStore.getOptimizedBlocks();

    return corridors.map((corridor) => {
      // 1. Match tasks associated with this corridor
      const corridorTasks = allTasks.filter(
        (t) => t.corridorId === corridor.id || t.corridor === corridor.id
      );
      
      // Fallback count if no specific tasks found in store
      const effectiveTasks = corridorTasks.length > 0 ? corridorTasks : [];
      const totalActiveTasksCount = effectiveTasks.length > 0 
        ? effectiveTasks.length 
        : (corridor.maintenanceTasks || 14);

      // 2. Department Breakdown (Engineering, S&T, Traction)
      const engTasks = effectiveTasks.filter((t) => {
        const d = String(t.department || '').toUpperCase();
        return d.includes('ENG') || d.includes('CIVIL') || d.includes('TRACK');
      });
      const stTasks = effectiveTasks.filter((t) => {
        const d = String(t.department || '').toUpperCase();
        return d.includes('S&T') || d.includes('SIGNAL') || d.includes('TELE');
      });
      const trcTasks = effectiveTasks.filter((t) => {
        const d = String(t.department || '').toUpperCase();
        return d.includes('TRAC') || d.includes('OHE') || d.includes('ELEC');
      });

      // Calculate counts (with proportional fallbacks if raw tasks are empty)
      let engCount = engTasks.length;
      let stCount = stTasks.length;
      let trcCount = trcTasks.length;

      if (engCount + stCount + trcCount === 0) {
        // Realistic distribution across the 3 departments
        engCount = Math.round(totalActiveTasksCount * 0.42);
        stCount = Math.round(totalActiveTasksCount * 0.32);
        trcCount = Math.max(1, totalActiveTasksCount - engCount - stCount);
      }

      const totalForPct = Math.max(1, engCount + stCount + trcCount);

      // Sample activity highlights per department
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

      // 4. Maintenance Load Percentage & Trend Arrow Calculation
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

      // 5. Real-time Utilization
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
        totalActiveTasks: totalActiveTasksCount,
        scheduledBlocksCount,
        availableSlots,
        departmentBreakdown,
      };
    });
  }, [corridors, blocks, refreshTick]);

  // Apply sorting and filtering
  const filteredAndSortedList = useMemo(() => {
    let list = [...corridorLoadDataList];

    if (filterStatus === 'CRITICAL') {
      list = list.filter((c) => c.realtimeUtilization >= 90 || c.maintenanceLoadPct >= 85);
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
    if (corridorLoadDataList.length === 0) return { avgUtil: 0, avgLoad: 0, totalTasks: 0 };
    const avgUtil = Math.round(
      corridorLoadDataList.reduce((sum, c) => sum + c.realtimeUtilization, 0) /
        corridorLoadDataList.length
    );
    const avgLoad = +(
      corridorLoadDataList.reduce((sum, c) => sum + c.maintenanceLoadPct, 0) /
      corridorLoadDataList.length
    ).toFixed(1);
    const totalTasks = corridorLoadDataList.reduce((sum, c) => sum + c.totalActiveTasks, 0);

    return { avgUtil, avgLoad, totalTasks };
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
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Real-time traffic occupancy vs scheduled maintenance load per corridor. Hover on active task counts to inspect cross-departmental breakdown (Engineering, S&T, Traction).
            </p>
          </div>
        </div>

        {/* CONTROLS: REFRESH, SORT & SUMMARY PILLS */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
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
            <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH TELEMETRY'}</span>
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
            <span className="text-emerald-400 font-bold">↑ / ↓ Trend Arrows</span>
            <div className="text-[10px] text-slate-500">Reflect shift since last refresh</div>
          </div>
        </div>
      </div>

      {/* CORRIDORS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {filteredAndSortedList.map((corridor) => {
          const isTooltipOpen = activeTooltipCorridorId === corridor.id;

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
              className="bg-[#0e1833] rounded-xl border border-sky-950 hover:border-sky-700/70 p-4 transition-all duration-200 hover:shadow-lg hover:shadow-sky-950/50 flex flex-col justify-between group relative"
            >
              {/* TOP HEADER: CODE & STATUS BADGE */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                      {corridor.code}
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]" title={corridor.name}>
                      {corridor.id}
                    </span>
                  </div>

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
                </div>

                {/* Corridor Station Name & Specs */}
                <div className="text-[11px] text-slate-300 font-medium truncate mb-1" title={corridor.name}>
                  {corridor.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-3.5 flex items-center justify-between">
                  <span>{corridor.fromStation} → {corridor.toStation}</span>
                  <span className="text-slate-500">{corridor.lengthKm} km · {corridor.tracksCount} Tracks</span>
                </div>

                {/* 1. REAL-TIME TRACK UTILIZATION SECTION */}
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 mb-3 space-y-2">
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

                {/* 2. ACTIVE MAINTENANCE LOAD SECTION (WITH TREND ARROW) */}
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 mb-3 space-y-2">
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
                        } by ${Math.abs(corridor.loadDelta)}% since last refresh (${lastRefreshTime.toLocaleTimeString()})`}
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

                  {/* Maintenance Load Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, corridor.maintenanceLoadPct)}%` }}
                    />
                  </div>

                  {/* Scheduled blocks vs available slots */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Blocks: {corridor.scheduledBlocksCount} Active</span>
                    <span>Slots Left: {corridor.availableSlots} Available</span>
                  </div>
                </div>

                {/* 3. ACTIVE MAINTENANCE TASK COUNT (WITH INTERACTIVE HOVER TOOLTIP) */}
                <div className="relative">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>Active Tasks:</span>
                    </span>

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
                        className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-950 to-orange-950 hover:from-amber-900 hover:to-orange-900 border border-amber-600/70 text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                        title="Hover to view breakdown of active tasks by department (Engineering, S&T, Traction)"
                      >
                        <HardHat className="w-3.5 h-3.5 text-amber-400" />
                        <span>{corridor.totalActiveTasks} Tasks</span>
                        <Info className="w-3 h-3 text-amber-400/80" />
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

                          <p className="text-[10px] text-slate-400 font-sans leading-tight">
                            Total <span className="text-white font-bold">{corridor.totalActiveTasks}</span> maintenance tasks actively committed on this corridor:
                          </p>

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
                </div>
              </div>

              {/* CARD FOOTER: DIRECT INSPECT BUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => onNavigate('timeline', { corridorId: corridor.id })}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Inspect maintenance timeline for this corridor"
                >
                  <span>Inspect Timeline</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => onNavigate('conflicts', { corridorId: corridor.id })}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title="Review open conflicts on this corridor"
                >
                  Conflicts →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
