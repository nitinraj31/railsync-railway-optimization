import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Wrench,
  Truck,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Flame,
  Layers,
  Filter,
  RefreshCw,
  Clock,
  ShieldAlert,
  Info,
  ChevronRight,
  Sliders,
  Sparkles,
  Radio,
  HardHat,
  Gauge,
  X,
  Check,
  Send,
  Zap,
  Activity,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import { Corridor, ManpowerGang, MachineryResource, DepartmentType } from '../../types';
import { mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';
import { GangDeploymentTimelineGantt } from './GangDeploymentTimelineGantt';

interface ResourceAllocationHeatmapModuleProps {
  corridors: Corridor[];
  onNavigate?: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

type ShiftFilter = 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK' | 'ALL';
type ResourceViewType = 'ALL_RESOURCES' | 'MANPOWER_ONLY' | 'MACHINERY_ONLY';

interface HeatmapMetricCell {
  key: string;
  label: string;
  type: 'MANPOWER' | 'MACHINERY' | 'COMPOSITE';
  value: number; // percentage or count
  displayValue: string;
  subText: string;
  utilizationPct: number;
  status: 'UNDER_UTILIZED' | 'BALANCED' | 'OPTIMAL' | 'OVER_CAPACITY';
  isUnderUtilized: boolean;
  rawCount: number;
  capacity: number;
  underUtilizedGangsCount?: number;
}

interface CorridorHeatmapRow {
  corridor: Corridor;
  corridorId: string;
  name: string;
  shortCode: string;
  gangs: ManpowerGang[];
  machines: MachineryResource[];
  manpowerHeadcount: number;
  manpowerCapacity: number;
  manpowerUtilPct: number;
  machineryCount: number;
  machineryCapacity: number;
  machineryUtilPct: number;
  compositeUtilPct: number;
  loadStatus: 'UNDER_UTILIZED' | 'BALANCED' | 'NEAR_CAPACITY' | 'OVER_CAPACITY';
  underUtilizedGangs: ManpowerGang[];
  cells: HeatmapMetricCell[];
}

export const ResourceAllocationHeatmapModule: React.FC<ResourceAllocationHeatmapModuleProps> = ({
  corridors,
  onNavigate,
  onRefreshData,
}) => {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [activeModuleTab, setActiveModuleTab] = useState<'HEATMAP' | 'TIMELINE'>('HEATMAP');
  const [activeShift, setActiveShift] = useState<ShiftFilter>('DAY_SHIFT');
  const [resourceView, setResourceView] = useState<ResourceViewType>('ALL_RESOURCES');
  const [filterUnderUtilizedOnly, setFilterUnderUtilizedOnly] = useState<boolean>(false);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<'ALL' | DepartmentType>('ALL');

  // Reassignment Modal & Action State
  const [selectedGangForReassign, setSelectedGangForReassign] = useState<ManpowerGang | null>(null);
  const [targetCorridorId, setTargetCorridorId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick auto-refresh trigger counter
  const [localVersion, setLocalVersion] = useState<number>(0);

  // Clear notifications automatically
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ---------------------------------------------------------------------------
  // DATA FETCHING & DERIVATIONS
  // ---------------------------------------------------------------------------
  const allGangs = useMemo<ManpowerGang[]>(() => {
    try {
      return mockStore.getManpowerGangs() || [];
    } catch {
      return [];
    }
  }, [localVersion]);

  const allMachines = useMemo<MachineryResource[]>(() => {
    try {
      return mockStore.getMachinery() || [];
    } catch {
      return [];
    }
  }, [localVersion]);

  // Corridor base capacity map (standardized RDSO baseline)
  const baseCapacities: Record<string, { manpower: number; machinery: number; title: string }> = {
    C001: { manpower: 80, machinery: 4, title: 'Delhi - Ghaziabad Quad Trunk' },
    C002: { manpower: 55, machinery: 3, title: 'New Delhi - Tuglakabad Freight Corridor' },
    C003: { manpower: 95, machinery: 4, title: 'Delhi - Ambala High-Speed Mainline' },
    C004: { manpower: 65, machinery: 3, title: 'Hazrat Nizamuddin - Palwal Heavy Section' },
  };

  // Gang utilization score calculator
  const calculateGangUtilization = (gang: ManpowerGang, corridor: Corridor): { score: number; isUnderUtilized: boolean; statusText: string } => {
    if (gang.status === 'STANDBY') {
      return { score: 25, isUnderUtilized: true, statusText: 'STANDBY (Idle Reserve)' };
    }
    if (gang.status === 'RELIEVING') {
      return { score: 45, isUnderUtilized: true, statusText: 'RELIEVING BUFFER' };
    }

    // Active gang utilization based on corridor load and shift
    const corridorBaseUtil = corridor.utilization || 70;
    let base = corridorBaseUtil;
    if (gang.department === 'ENGINEERING') base += 5;
    if (gang.department === 'TRACTION') base -= 5;
    if (gang.headcount > 20) base += 4;

    const score = Math.min(100, Math.max(30, Math.round(base)));
    const isUnderUtilized = score < 55;
    const statusText = score < 55 ? 'LOW WORKLOAD' : score > 85 ? 'HIGH STRAIN' : 'BALANCED LOAD';

    return { score, isUnderUtilized, statusText };
  };

  // Heatmap rows data aggregation
  const heatmapRows = useMemo<CorridorHeatmapRow[]>(() => {
    return corridors.map((corridor) => {
      const cid = corridor.id;
      const base = baseCapacities[cid] || { manpower: 70, machinery: 3, title: corridor.name };

      // Filter gangs for this corridor & shift
      const corridorGangs = allGangs.filter((g) => {
        if (g.corridorId !== cid) return false;
        if (activeShift !== 'ALL' && g.shift !== activeShift) return false;
        if (selectedDepartment !== 'ALL' && g.department !== selectedDepartment) return false;
        return true;
      });

      // Filter machinery for this corridor
      const corridorMachines = allMachines.filter((m) => m.corridorId === cid);
      const deployedMachines = corridorMachines.filter((m) => m.status === 'DEPLOYED');

      // Headcount totals
      const totalHeadcount = corridorGangs.reduce((sum, g) => sum + (g.headcount || 0), 0);
      const manpowerUtilPct = Math.round((totalHeadcount / (base.manpower || 1)) * 100);

      // Machinery totals
      const machineryUtilPct = Math.round((deployedMachines.length / (base.machinery || 1)) * 100);

      // Composite utilization (weighted 60% manpower, 40% machinery)
      const compositeUtilPct = Math.round(manpowerUtilPct * 0.6 + machineryUtilPct * 0.4);

      // Identify under-utilized gangs in this corridor
      const underUtilizedGangs = corridorGangs.filter((g) => {
        const { isUnderUtilized } = calculateGangUtilization(g, corridor);
        return isUnderUtilized;
      });

      // Detailed Cells for Heatmap Grid
      const trackGangs = corridorGangs.filter((g) => g.trade === 'TRACK_MAINTENANCE');
      const sntGangs = corridorGangs.filter((g) => g.trade === 'SIGNAL_TELECOM');
      const trdGangs = corridorGangs.filter((g) => g.trade === 'TRACTION_OHE');

      const tampers = corridorMachines.filter((m) => m.type === 'TRACK_TAMPING_MACHINE' || m.type === 'DUOMATIC_TAMPER');
      const towerWagons = corridorMachines.filter((m) => m.type === 'TOWER_WAGON' || m.type === 'OHE_INSPECTION_CAR');
      const regulators = corridorMachines.filter((m) => m.type === 'BALLAST_REGULATOR' || m.type === 'DYNAMIC_TRACK_STABILIZER');

      const cells: HeatmapMetricCell[] = [
        // 1. Civil P-Way Gangs
        {
          key: 'pway_gangs',
          label: 'P-Way Track Gangs',
          type: 'MANPOWER',
          value: Math.round((trackGangs.reduce((s, g) => s + g.headcount, 0) / 45) * 100),
          displayValue: `${trackGangs.reduce((s, g) => s + g.headcount, 0)} Staff`,
          subText: `${trackGangs.length} Gangs (${trackGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK').length} Active)`,
          utilizationPct: Math.round((trackGangs.reduce((s, g) => s + g.headcount, 0) / 45) * 100),
          status:
            trackGangs.some((g) => g.status === 'STANDBY') || trackGangs.length === 0
              ? 'UNDER_UTILIZED'
              : 'BALANCED',
          isUnderUtilized: trackGangs.some((g) => g.status === 'STANDBY'),
          rawCount: trackGangs.length,
          capacity: 45,
          underUtilizedGangsCount: trackGangs.filter((g) => calculateGangUtilization(g, corridor).isUnderUtilized).length,
        },
        // 2. S&T Point & Interlocking Teams
        {
          key: 'snt_gangs',
          label: 'S&T Gangs',
          type: 'MANPOWER',
          value: Math.round((sntGangs.reduce((s, g) => s + g.headcount, 0) / 20) * 100),
          displayValue: `${sntGangs.reduce((s, g) => s + g.headcount, 0)} Staff`,
          subText: `${sntGangs.length} Gangs (${sntGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK').length} Active)`,
          utilizationPct: Math.round((sntGangs.reduce((s, g) => s + g.headcount, 0) / 20) * 100),
          status: sntGangs.some((g) => g.status === 'STANDBY') ? 'UNDER_UTILIZED' : 'BALANCED',
          isUnderUtilized: sntGangs.some((g) => g.status === 'STANDBY'),
          rawCount: sntGangs.length,
          capacity: 20,
          underUtilizedGangsCount: sntGangs.filter((g) => calculateGangUtilization(g, corridor).isUnderUtilized).length,
        },
        // 3. TRD Traction & OHE Linesmen
        {
          key: 'trd_gangs',
          label: 'TRD Traction OHE',
          type: 'MANPOWER',
          value: Math.round((trdGangs.reduce((s, g) => s + g.headcount, 0) / 20) * 100),
          displayValue: `${trdGangs.reduce((s, g) => s + g.headcount, 0)} Staff`,
          subText: `${trdGangs.length} Gangs (${trdGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK').length} Active)`,
          utilizationPct: Math.round((trdGangs.reduce((s, g) => s + g.headcount, 0) / 20) * 100),
          status: trdGangs.some((g) => g.status === 'STANDBY') ? 'UNDER_UTILIZED' : 'BALANCED',
          isUnderUtilized: trdGangs.some((g) => g.status === 'STANDBY'),
          rawCount: trdGangs.length,
          capacity: 20,
          underUtilizedGangsCount: trdGangs.filter((g) => calculateGangUtilization(g, corridor).isUnderUtilized).length,
        },
        // 4. Heavy Track Tampers (CSM/Duomatic)
        {
          key: 'tamping_machines',
          label: 'Track Tampers',
          type: 'MACHINERY',
          value: Math.round((tampers.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, tampers.length || 1)) * 100),
          displayValue: `${tampers.filter((m) => m.status === 'DEPLOYED').length} / ${Math.max(1, tampers.length)}`,
          subText: `${tampers.filter((m) => m.status === 'STANDBY_RESERVE').length} Standby in TMD`,
          utilizationPct: Math.round((tampers.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, tampers.length || 1)) * 100),
          status: tampers.some((m) => m.status === 'STANDBY_RESERVE') ? 'UNDER_UTILIZED' : 'BALANCED',
          isUnderUtilized: tampers.some((m) => m.status === 'STANDBY_RESERVE'),
          rawCount: tampers.length,
          capacity: 2,
        },
        // 5. Tower Wagons (TRD Inspection)
        {
          key: 'tower_wagons',
          label: 'Tower Wagons',
          type: 'MACHINERY',
          value: Math.round((towerWagons.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, towerWagons.length || 1)) * 100),
          displayValue: `${towerWagons.filter((m) => m.status === 'DEPLOYED').length} / ${Math.max(1, towerWagons.length)}`,
          subText: `${towerWagons.filter((m) => m.status === 'STANDBY_RESERVE').length} Standby`,
          utilizationPct: Math.round((towerWagons.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, towerWagons.length || 1)) * 100),
          status: towerWagons.some((m) => m.status === 'STANDBY_RESERVE') ? 'UNDER_UTILIZED' : 'BALANCED',
          isUnderUtilized: towerWagons.some((m) => m.status === 'STANDBY_RESERVE'),
          rawCount: towerWagons.length,
          capacity: 1,
        },
        // 6. Ballast Regulators & Stabilizers
        {
          key: 'ballast_regulators',
          label: 'Regulators & DTS',
          type: 'MACHINERY',
          value: Math.round((regulators.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, regulators.length || 1)) * 100),
          displayValue: `${regulators.filter((m) => m.status === 'DEPLOYED').length} / ${Math.max(1, regulators.length)}`,
          subText: `${regulators.filter((m) => m.status === 'STANDBY_RESERVE').length} Standby`,
          utilizationPct: Math.round((regulators.filter((m) => m.status === 'DEPLOYED').length / Math.max(1, regulators.length || 1)) * 100),
          status: regulators.some((m) => m.status === 'STANDBY_RESERVE') ? 'UNDER_UTILIZED' : 'BALANCED',
          isUnderUtilized: regulators.some((m) => m.status === 'STANDBY_RESERVE'),
          rawCount: regulators.length,
          capacity: 1,
        },
      ];

      const loadStatus =
        compositeUtilPct < 50
          ? 'UNDER_UTILIZED'
          : compositeUtilPct <= 75
          ? 'BALANCED'
          : compositeUtilPct <= 90
          ? 'NEAR_CAPACITY'
          : 'OVER_CAPACITY';

      return {
        corridor,
        corridorId: cid,
        name: corridor.name,
        shortCode: corridor.code || cid,
        gangs: corridorGangs,
        machines: corridorMachines,
        manpowerHeadcount: totalHeadcount,
        manpowerCapacity: base.manpower,
        manpowerUtilPct,
        machineryCount: deployedMachines.length,
        machineryCapacity: base.machinery,
        machineryUtilPct,
        compositeUtilPct,
        loadStatus,
        underUtilizedGangs,
        cells,
      };
    });
  }, [corridors, allGangs, allMachines, activeShift, selectedDepartment]);

  // All under-utilized gangs across corridors (candidate roster for reassignment)
  const candidateUnderUtilizedGangs = useMemo(() => {
    const list: Array<{ gang: ManpowerGang; corridor: Corridor; utilScore: number; statusText: string }> = [];
    corridors.forEach((c) => {
      const cGangs = allGangs.filter((g) => g.corridorId === c.id);
      cGangs.forEach((g) => {
        const { score, isUnderUtilized, statusText } = calculateGangUtilization(g, c);
        if (isUnderUtilized) {
          list.push({ gang: g, corridor: c, utilScore: score, statusText });
        }
      });
    });
    return list;
  }, [corridors, allGangs]);

  // Calculate highest deficit corridor (target suggestion for reassignments)
  const highestDeficitCorridor = useMemo(() => {
    const sorted = [...heatmapRows].sort((a, b) => b.compositeUtilPct - a.compositeUtilPct);
    return sorted[0] || null;
  }, [heatmapRows]);

  // Overall network surplus/deficit summary
  const networkResourceSummary = useMemo(() => {
    const totalGangs = allGangs.length;
    const activeGangs = allGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK').length;
    const standbyGangs = allGangs.filter((g) => g.status === 'STANDBY').length;
    const underUtilizedCount = candidateUnderUtilizedGangs.length;

    const totalMachines = allMachines.length;
    const deployedMachines = allMachines.filter((m) => m.status === 'DEPLOYED').length;
    const reserveMachines = allMachines.filter((m) => m.status === 'STANDBY_RESERVE').length;

    return {
      totalGangs,
      activeGangs,
      standbyGangs,
      underUtilizedCount,
      totalMachines,
      deployedMachines,
      reserveMachines,
    };
  }, [allGangs, allMachines, candidateUnderUtilizedGangs]);

  // ---------------------------------------------------------------------------
  // REASSIGNMENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenReassignModal = (gang: ManpowerGang) => {
    railwayAudio.playBeep(780, 0.03);
    setSelectedGangForReassign(gang);

    // Pick smart default target: corridor with highest strain different from gang's current corridor
    const target = corridors.find((c) => c.id !== gang.corridorId) || corridors[0];
    setTargetCorridorId(target?.id || 'C002');
    setReassignReason(
      `Strategic redeployment to balance shift workload and eliminate block execution bottleneck.`
    );
  };

  const handleExecuteReassignment = async () => {
    if (!selectedGangForReassign || !targetCorridorId) return;

    setIsReassigning(true);
    railwayAudio.playBeep(850, 0.05);

    try {
      const res = mockStore.reallocateGang(
        selectedGangForReassign.id,
        targetCorridorId,
        reassignReason || 'Reassigned via Command Center Resource Allocation Heatmap'
      );

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Reassigned ${selectedGangForReassign.name} to Corridor ${targetCorridorId} successfully.`,
        });
        railwayAudio.playBeep(920, 0.08);
        setLocalVersion((v) => v + 1);

        // Notify parent screens and service consumers
        if (onRefreshData) {
          await onRefreshData();
        }

        setSelectedGangForReassign(null);
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to reallocate maintenance gang.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Unexpected error during gang reallocation.',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Helper for heatmap cell color class
  const getCellVisuals = (pct: number, isUnder: boolean) => {
    if (isUnder || pct < 45) {
      return {
        bg: 'bg-sky-950/70 hover:bg-sky-900/90',
        border: 'border-sky-800/80',
        text: 'text-sky-300',
        pill: 'bg-sky-900/80 text-sky-200 border-sky-700/60',
        label: 'Under-Utilized',
        indicatorColor: 'bg-sky-400',
      };
    }
    if (pct <= 75) {
      return {
        bg: 'bg-emerald-950/60 hover:bg-emerald-900/80',
        border: 'border-emerald-800/60',
        text: 'text-emerald-300',
        pill: 'bg-emerald-900/80 text-emerald-200 border-emerald-700/60',
        label: 'Balanced Load',
        indicatorColor: 'bg-emerald-400',
      };
    }
    if (pct <= 90) {
      return {
        bg: 'bg-amber-950/60 hover:bg-amber-900/80',
        border: 'border-amber-800/60',
        text: 'text-amber-300',
        pill: 'bg-amber-900/80 text-amber-200 border-amber-700/60',
        label: 'High Capacity',
        indicatorColor: 'bg-amber-400',
      };
    }
    return {
      bg: 'bg-rose-950/75 hover:bg-rose-900/90',
      border: 'border-rose-800/80',
      text: 'text-rose-300',
      pill: 'bg-rose-900/80 text-rose-200 border-rose-700/60',
      label: 'Over Capacity',
      indicatorColor: 'bg-rose-500 animate-pulse',
    };
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <section
      id="resource-allocation-heatmap-module"
      aria-label="Resource Allocation Heatmap and Gang Reassignment Module"
      className="bg-[#091124] border border-sky-900/60 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden"
    >
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-mono shadow-lg transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODULE HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-sky-950/90 border border-sky-500/50 text-sky-400 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Resource Allocation Heatmap
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
                  CROSS-CORRIDOR TELEMETRY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>MANPOWER &amp; MACHINERY MATRIX</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Multi-dimensional density heatmap tracking track gangs, heavy equipment, and standby reserve capacity. Identify and reallocate idle gangs to deficit sectors.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: TABS, SHIFT, VIEW, & UNDER-UTILIZED TOGGLE */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Top-Level Module Tab Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center font-mono text-xs">
            <button
              type="button"
              id="tab-allocation-heatmap"
              onClick={() => {
                railwayAudio.playBeep(750, 0.02);
                setActiveModuleTab('HEATMAP');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeModuleTab === 'HEATMAP'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Allocation Heatmap</span>
            </button>

            <button
              type="button"
              id="tab-deployment-timeline"
              onClick={() => {
                railwayAudio.playBeep(750, 0.02);
                setActiveModuleTab('TIMELINE');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeModuleTab === 'TIMELINE'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Deployment Timeline</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-800/80 font-mono">
                FATIGUE
              </span>
            </button>
          </div>

          {activeModuleTab === 'HEATMAP' && (
            <>
              {/* Shift Filter */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px] font-mono">
                <button
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setActiveShift('DAY_SHIFT');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeShift === 'DAY_SHIFT'
                      ? 'bg-sky-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setActiveShift('AFTERNOON_SHIFT');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeShift === 'AFTERNOON_SHIFT'
                      ? 'bg-sky-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Afternoon
                </button>
                <button
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setActiveShift('NIGHT_MEGA_BLOCK');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeShift === 'NIGHT_MEGA_BLOCK'
                      ? 'bg-purple-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Night Mega
                </button>
                <button
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setActiveShift('ALL');
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeShift === 'ALL'
                      ? 'bg-slate-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Shifts
                </button>
              </div>

              {/* Under-Utilized Only Toggle Filter */}
              <button
                onClick={() => {
                  railwayAudio.playBeep(800, 0.03);
                  setFilterUnderUtilizedOnly(!filterUnderUtilizedOnly);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  filterUnderUtilizedOnly
                    ? 'bg-sky-900 text-sky-100 border-sky-500 ring-1 ring-sky-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
                title="Filter corridors and rosters to show only under-utilized maintenance gangs for reassignment"
              >
                <Filter className={`w-3.5 h-3.5 ${filterUnderUtilizedOnly ? 'text-sky-300' : 'text-slate-400'}`} />
                <span>Under-Utilized Gangs Only</span>
                {networkResourceSummary.underUtilizedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-500 text-slate-950 font-black">
                    {networkResourceSummary.underUtilizedCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODULE VIEW CONTENT: HEATMAP MATRIX VS DEPLOYMENT TIMELINE GANTT */}
      {activeModuleTab === 'TIMELINE' ? (
        <GangDeploymentTimelineGantt
          corridors={corridors}
          onReassignGang={handleOpenReassignModal}
          onRefreshData={onRefreshData}
        />
      ) : (
        <>
          {/* QUICK METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-[#0b162f] border border-slate-800/80 rounded-xl p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Active Field Gangs</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {networkResourceSummary.activeGangs} / {networkResourceSummary.totalGangs}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {Math.round((networkResourceSummary.activeGangs / (networkResourceSummary.totalGangs || 1)) * 100)}% track deployment
          </div>
        </div>

        <div className="bg-[#0b162f] border border-sky-800/70 rounded-xl p-2.5 font-mono">
          <div className="text-[10px] text-sky-300 uppercase flex items-center justify-between">
            <span>Standby / Idle Gangs</span>
            <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-300 mt-1">
            {networkResourceSummary.underUtilizedCount} Candidate Gangs
          </div>
          <div className="text-[10px] text-sky-400 mt-0.5">
            Available for instant reassignment
          </div>
        </div>

        <div className="bg-[#0b162f] border border-slate-800/80 rounded-xl p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Heavy Machinery Fleet</span>
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {networkResourceSummary.deployedMachines} Deployed
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {networkResourceSummary.reserveMachines} Standby in TMD depots
          </div>
        </div>

        <div className="bg-[#0b162f] border border-slate-800/80 rounded-xl p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Highest Strain Corridor</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base font-bold text-rose-300 mt-1 truncate">
            {highestDeficitCorridor?.shortCode} ({highestDeficitCorridor?.compositeUtilPct}%)
          </div>
          <div className="text-[10px] text-rose-400 mt-0.5">
            Recommended reassignment target
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. CROSS-CORRIDOR HEATMAP MATRIX TABLE */}
      {/* ==================================================================== */}
      <div className="bg-[#0b152d] border border-slate-800 rounded-xl overflow-hidden mb-5">
        <div className="px-3.5 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">CORRIDOR RESOURCE DENSITY MATRIX</span>
            <span className="text-[11px] text-slate-400">· Click any cell or gang to triage</span>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-950 border border-sky-700" />
              <span>&lt; 50% Idle / Under-Utilized</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-950 border border-emerald-700" />
              <span>50–75% Balanced</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-950 border border-amber-700" />
              <span>76–90% High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-950 border border-rose-700" />
              <span>&gt; 90% Strain</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-slate-950/40 text-[11px] font-mono text-slate-400">
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[160px]">Corridor Sector</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">P-Way Gangs</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">S&amp;T Gangs</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">TRD Traction</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">Tampers (CSM)</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">Tower Wagons</th>
                <th className="py-2.5 px-3 font-semibold uppercase min-w-[130px]">Regulators</th>
                <th className="py-2.5 px-3 font-semibold uppercase text-right min-w-[130px]">Composite Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono text-xs">
              {heatmapRows.map((row) => {
                const isSelected = selectedCorridorId === row.corridorId;
                const hasUnderUtilized = row.underUtilizedGangs.length > 0;

                return (
                  <tr
                    key={row.corridorId}
                    onClick={() => {
                      railwayAudio.playBeep(720, 0.02);
                      setSelectedCorridorId(isSelected ? null : row.corridorId);
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/50'
                        : 'hover:bg-slate-850/60'
                    }`}
                  >
                    {/* Corridor Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {row.shortCode}
                        </span>
                        {hasUnderUtilized && (
                          <span
                            className="px-1.5 py-0.2 rounded text-[9px] bg-sky-950 text-sky-300 border border-sky-700/60"
                            title={`${row.underUtilizedGangs.length} under-utilized gangs in this corridor`}
                          >
                            {row.underUtilizedGangs.length} Idle
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {row.name}
                      </div>
                    </td>

                    {/* Metric Cells (1 to 6) */}
                    {row.cells.map((cell) => {
                      const visuals = getCellVisuals(cell.utilizationPct, cell.isUnderUtilized);
                      return (
                        <td key={cell.key} className="py-2.5 px-2.5">
                          <div
                            className={`p-2 rounded-lg border transition-all ${visuals.bg} ${visuals.border}`}
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-bold ${visuals.text}`}>
                                {cell.displayValue}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {cell.utilizationPct}%
                              </span>
                            </div>

                            {/* Mini Density Bar */}
                            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full ${visuals.indicatorColor} rounded-full`}
                                style={{ width: `${Math.min(100, cell.utilizationPct)}%` }}
                              />
                            </div>

                            <div className="text-[9px] text-slate-400 truncate flex items-center justify-between">
                              <span>{cell.subText}</span>
                              {cell.isUnderUtilized && (
                                <span className="text-sky-300 font-bold ml-1">Surplus</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Composite Load & Reassign Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            row.loadStatus === 'UNDER_UTILIZED'
                              ? 'bg-sky-950 text-sky-300 border-sky-700/60'
                              : row.loadStatus === 'BALANCED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                              : row.loadStatus === 'NEAR_CAPACITY'
                              ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                              : 'bg-rose-950 text-rose-300 border-rose-700/60'
                          }`}
                        >
                          {row.compositeUtilPct}% · {row.loadStatus.replace('_', ' ')}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-1">
                          {row.manpowerHeadcount}/{row.manpowerCapacity} staff · {row.machineryCount} machines
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. UNDER-UTILIZED GANGS ROSTER & REASSIGNMENT WORKFLOW */}
      {/* ==================================================================== */}
      <div className="bg-[#0b152d] border border-sky-900/50 rounded-xl p-3.5 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/60">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
                <span>Under-Utilized Maintenance Gangs for Reassignment</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500 text-slate-950 font-black font-mono">
                  {candidateUnderUtilizedGangs.length} READY
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Gangs operating on standby or low utilization. Reallocate to high-strain corridors to balance network capacity.
              </p>
            </div>
          </div>

          {/* Department Filter for Gangs */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-slate-400">Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="ENGINEERING">Civil Engineering (P-Way)</option>
              <option value="S&T">Signaling &amp; Telecom</option>
              <option value="TRACTION">Traction (TRD)</option>
            </select>
          </div>
        </div>

        {candidateUnderUtilizedGangs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-mono bg-slate-950/40 rounded-lg border border-slate-800/80">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-slate-200 font-bold">Optimal Distribution Achieved</div>
            <div>No idle or under-utilized maintenance gangs detected across current shift.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidateUnderUtilizedGangs.map(({ gang, corridor, utilScore, statusText }) => {
              const suggestedTarget = corridors.find((c) => c.id !== gang.corridorId) || corridors[0];

              return (
                <div
                  key={gang.id}
                  className="bg-[#070e20] border border-sky-900/60 hover:border-sky-500/80 rounded-xl p-3 transition-all shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Gang Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold font-mono text-slate-100 group-hover:text-sky-300 transition-colors">
                          {gang.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="text-sky-400 font-bold">{gang.id}</span>
                          <span>•</span>
                          <span>{gang.department}</span>
                        </div>
                      </div>

                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
                        {statusText}
                      </span>
                    </div>

                    {/* Gang Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/70 rounded-lg p-2 border border-slate-800 mb-3">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Current Corridor:</span>
                        <span className="text-slate-200 font-bold">{corridor.code || corridor.id}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{corridor.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Headcount / Crew:</span>
                        <span className="text-emerald-400 font-bold">{gang.headcount} Personnel</span>
                        <span className="text-[9px] text-slate-400 block">{gang.trade.replace('_', ' ')}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800">
                        <span className="text-slate-500 text-[9px] uppercase">Supervisor in Charge:</span>
                        <div className="text-slate-300 truncate text-[10px]">{gang.supervisor}</div>
                      </div>
                    </div>

                    {/* Utilization Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Gang Utilization Rating:</span>
                        <span className="font-bold text-sky-400">{utilScore}% (Idle Capacity)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                          style={{ width: `${utilScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Trigger Reassignment */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      Target: <span className="text-rose-300 font-bold">{suggestedTarget?.code || 'Deficit Area'}</span>
                    </span>

                    <button
                      onClick={() => handleOpenReassignModal(gang)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-sky-950/40"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Reassign Gang</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* ==================================================================== */}
      {/* 3. REASSIGNMENT MODAL DIALOG */}
      {/* ==================================================================== */}
      {selectedGangForReassign && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#0b152d] border border-sky-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-700/60">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Reassign Maintenance Gang
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Dynamic Load Rebalancing Authorization
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGangForReassign(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Gang Summary Card */}
            <div className="bg-[#070e20] rounded-xl p-3 border border-slate-800 font-mono text-xs mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sky-300">{selectedGangForReassign.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700/60">
                  {selectedGangForReassign.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">Current Corridor:</span>
                  <span className="font-bold">{selectedGangForReassign.corridorId}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Crew Headcount:</span>
                  <span className="font-bold text-emerald-400">{selectedGangForReassign.headcount} Staff</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] block">Supervisor:</span>
                  <span className="truncate block">{selectedGangForReassign.supervisor}</span>
                </div>
              </div>
            </div>

            {/* Target Corridor Selection */}
            <div className="space-y-3 font-mono text-xs mb-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Destination Corridor:
                </label>
                <select
                  value={targetCorridorId}
                  onChange={(e) => setTargetCorridorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono cursor-pointer focus:border-sky-500 outline-none"
                >
                  {corridors
                    .filter((c) => c.id !== selectedGangForReassign.corridorId)
                    .map((c) => {
                      const row = heatmapRows.find((r) => r.corridorId === c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.code || c.id} — {c.name} ({row?.compositeUtilPct || 70}% Load)
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Reassignment Justification &amp; Notes:
                </label>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Enter operational rationale for gang transfer..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-slate-500 focus:border-sky-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Impact Projection Notice */}
            <div className="p-2.5 rounded-lg bg-sky-950/50 border border-sky-800/60 font-mono text-[11px] text-sky-200 flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span>Impact Assessment: </span>
                <span className="text-slate-300">
                  Transferring this gang immediately injects +{selectedGangForReassign.headcount} personnel into Corridor {targetCorridorId}, balancing network maintenance turnaround and mitigating block conflict risk.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedGangForReassign(null)}
                disabled={isReassigning}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteReassignment}
                disabled={isReassigning || !targetCorridorId}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-sky-900/50"
              >
                {isReassigning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Transfer...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Reassignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
