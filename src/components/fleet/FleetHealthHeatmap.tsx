import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  Info,
  Layers,
  Fuel,
  Cpu,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { Corridor, MachineryResource, MachineryType } from '../../types';
import { mockStore } from '../../services/api';

interface FleetHealthHeatmapProps {
  corridors: Corridor[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

type HeatmapMode = 'MACHINE_CELLS' | 'SUBSYSTEM_GRID';
type ReadinessFilter = 'ALL' | 'MISSION_READY' | 'WATCH_LIST' | 'STANDBY';

interface AugmentedMachine extends MachineryResource {
  engineHealth: number;
  hydraulicsHealth: number;
  toolingWearHealth: number;
  sensorCalibrationHealth: number;
  brakeWheelHealth: number;
  readinessTier: 'MISSION_READY' | 'OPERATIONAL_WATCH' | 'MAINTENANCE_DUE' | 'STANDBY_RESERVE';
  readinessLabel: string;
  nextPohIohDays: number;
  nextPohType: 'IOH' | 'POH' | 'DAILY_TRIP';
  deploymentAdvisory: string;
  suitability: string;
}

export const FleetHealthHeatmap: React.FC<FleetHealthHeatmapProps> = ({
  corridors,
  onNavigate,
  onRefreshData,
}) => {
  const [mode, setMode] = useState<HeatmapMode>('MACHINE_CELLS');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedMachine, setSelectedMachine] = useState<AugmentedMachine | null>(null);
  const [showMobilizeModal, setShowMobilizeModal] = useState<boolean>(false);
  const [targetCorridorForMobilize, setTargetCorridorForMobilize] = useState<string>('C001');
  const [mobilizeSuccessMsg, setMobilizeSuccessMsg] = useState<string | null>(null);

  // Fetch machinery from live store
  const [machineryList, setMachineryList] = useState<MachineryResource[]>(() => mockStore.getMachinery());

  const refreshLocalMachinery = () => {
    setMachineryList([...mockStore.getMachinery()]);
    if (onRefreshData) onRefreshData();
  };

  // Augment machines with mechanical subsystem diagnostics
  const augmentedMachines: AugmentedMachine[] = useMemo(() => {
    return machineryList.map((m) => {
      // Deterministic subsystem generation based on machine ID and base health
      const baseH = m.healthIndex || 85;
      const idHash = m.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

      const engineDelta = ((idHash % 7) - 3);
      const engineHealth = Math.min(100, Math.max(50, baseH + engineDelta));

      const hydDelta = (((idHash * 3) % 9) - 5);
      const hydraulicsHealth = Math.min(100, Math.max(45, baseH + hydDelta));

      const toolDelta = (((idHash * 5) % 11) - 6);
      const toolingWearHealth = Math.min(100, Math.max(40, baseH + toolDelta));

      const sensorDelta = (((idHash * 7) % 7) - 2);
      const sensorCalibrationHealth = Math.min(100, Math.max(60, baseH + sensorDelta));

      const brakeDelta = (((idHash * 2) % 6) - 2);
      const brakeWheelHealth = Math.min(100, Math.max(55, baseH + brakeDelta));

      const nextPohIohDays = 25 + (idHash % 160);
      const nextPohType = nextPohIohDays < 45 ? 'IOH' : 'POH';

      let readinessTier: 'MISSION_READY' | 'OPERATIONAL_WATCH' | 'MAINTENANCE_DUE' | 'STANDBY_RESERVE';
      let readinessLabel = '';
      let deploymentAdvisory = '';
      let suitability = '';

      if (m.status === 'STANDBY_RESERVE') {
        readinessTier = 'STANDBY_RESERVE';
        readinessLabel = 'Standby Reserve (100% Ready)';
        deploymentAdvisory = 'Held in Central Base Depot. Ready for immediate emergency callout within 30 minutes.';
        suitability = 'Emergency Track Relief / Mega Block Backup';
      } else if (baseH >= 88 && m.fuelLevelPct >= 70) {
        readinessTier = 'MISSION_READY';
        readinessLabel = 'Mission-Ready (Optimal)';
        deploymentAdvisory = 'Fully certified for heavy night mega blocks and high-speed trunk operations.';
        suitability = 'Heavy High-Density Trunk Operations';
      } else if (baseH >= 78) {
        readinessTier = 'OPERATIONAL_WATCH';
        readinessLabel = 'Operational (Watch List)';
        deploymentAdvisory = 'Suitable for standard maintenance blocks. Monitor hydraulic pressure and vibration logs.';
        suitability = 'Standard Block (Secondary Line / Daylight)';
      } else {
        readinessTier = 'MAINTENANCE_DUE';
        readinessLabel = 'Preventive Overhaul Due';
        deploymentAdvisory = 'Nearing RDSO vibration tolerance limits. Recommend depot inspection before next deployment.';
        suitability = 'Restricted Operation / Depot Overhaul Due';
      }

      return {
        ...m,
        engineHealth,
        hydraulicsHealth,
        toolingWearHealth,
        sensorCalibrationHealth,
        brakeWheelHealth,
        readinessTier,
        readinessLabel,
        nextPohIohDays,
        nextPohType,
        deploymentAdvisory,
        suitability,
      };
    });
  }, [machineryList]);

  // Grouping corridors and depots
  const corridorRows = useMemo(() => {
    const list = [
      { id: 'C001', name: 'Northern Main Trunk (NDLS - GZB)', shortCode: 'C001', lengthKm: 52 },
      { id: 'C002', name: 'Southern High-Speed Spur (NDLS - FDB)', shortCode: 'C002', lengthKm: 48 },
      { id: 'C003', name: 'Western Heavy Freight & Passenger (SSB - ROK)', shortCode: 'C003', lengthKm: 64 },
      { id: 'C004', name: 'Eastern Mixed Express Link (ANVT - MB)', shortCode: 'C004', lengthKm: 76 },
      { id: 'CENTRAL_DEPOT', name: 'Central Base Track Machine Depot (C-TMD)', shortCode: 'DEPOT', lengthKm: 0 },
    ];
    return list;
  }, []);

  // Filtered machines
  const filteredMachines = useMemo(() => {
    return augmentedMachines.filter((m) => {
      // Readiness filter
      if (readinessFilter === 'MISSION_READY' && m.readinessTier !== 'MISSION_READY') return false;
      if (readinessFilter === 'WATCH_LIST' && m.readinessTier !== 'OPERATIONAL_WATCH' && m.readinessTier !== 'MAINTENANCE_DUE') return false;
      if (readinessFilter === 'STANDBY' && m.readinessTier !== 'STANDBY_RESERVE') return false;

      // Type filter
      if (selectedTypeFilter !== 'ALL' && m.type !== selectedTypeFilter) return false;

      return true;
    });
  }, [augmentedMachines, readinessFilter, selectedTypeFilter]);

  // Fleet Statistics
  const stats = useMemo(() => {
    const total = augmentedMachines.length;
    const missionReady = augmentedMachines.filter((m) => m.readinessTier === 'MISSION_READY').length;
    const watchList = augmentedMachines.filter((m) => m.readinessTier === 'OPERATIONAL_WATCH').length;
    const maintenanceDue = augmentedMachines.filter((m) => m.readinessTier === 'MAINTENANCE_DUE').length;
    const standbyCount = augmentedMachines.filter((m) => m.readinessTier === 'STANDBY_RESERVE').length;
    const avgHealth = Math.round(augmentedMachines.reduce((sum, m) => sum + m.healthIndex, 0) / (total || 1));
    const avgFuel = Math.round(augmentedMachines.reduce((sum, m) => sum + m.fuelLevelPct, 0) / (total || 1));

    return {
      total,
      missionReady,
      watchList,
      maintenanceDue,
      standbyCount,
      avgHealth,
      avgFuel,
      readinessPct: Math.round(((missionReady + standbyCount) / (total || 1)) * 100),
    };
  }, [augmentedMachines]);

  // Subsystem averages per corridor
  const corridorSubsystemAverages = useMemo(() => {
    return corridorRows.map((row) => {
      const rowMachines = augmentedMachines.filter((m) => m.corridorId === row.id);
      if (rowMachines.length === 0) {
        return {
          rowId: row.id,
          rowName: row.name,
          count: 0,
          overallHealth: 0,
          engine: 0,
          hydraulics: 0,
          tooling: 0,
          sensors: 0,
          fuel: 0,
          readinessStatus: 'NO_FLEET',
        };
      }

      const count = rowMachines.length;
      const overallHealth = Math.round(rowMachines.reduce((sum, m) => sum + m.healthIndex, 0) / count);
      const engine = Math.round(rowMachines.reduce((sum, m) => sum + m.engineHealth, 0) / count);
      const hydraulics = Math.round(rowMachines.reduce((sum, m) => sum + m.hydraulicsHealth, 0) / count);
      const tooling = Math.round(rowMachines.reduce((sum, m) => sum + m.toolingWearHealth, 0) / count);
      const sensors = Math.round(rowMachines.reduce((sum, m) => sum + m.sensorCalibrationHealth, 0) / count);
      const fuel = Math.round(rowMachines.reduce((sum, m) => sum + m.fuelLevelPct, 0) / count);

      let readinessStatus: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL' = 'GOOD';
      if (overallHealth >= 90) readinessStatus = 'EXCELLENT';
      else if (overallHealth >= 82) readinessStatus = 'GOOD';
      else if (overallHealth >= 75) readinessStatus = 'ATTENTION';
      else readinessStatus = 'CRITICAL';

      return {
        rowId: row.id,
        rowName: row.name,
        count,
        overallHealth,
        engine,
        hydraulics,
        tooling,
        sensors,
        fuel,
        readinessStatus,
      };
    });
  }, [corridorRows, augmentedMachines]);

  // Handle Quick Mobilize / Reallocate
  const handleExecuteMobilization = () => {
    if (!selectedMachine) return;
    const res = mockStore.reallocateMachinery(
      selectedMachine.id,
      targetCorridorForMobilize,
      `Strategic redeployment via Fleet Health Heatmap to Corridor ${targetCorridorForMobilize}`
    );

    if (res.success) {
      setMobilizeSuccessMsg(`Successfully mobilized ${selectedMachine.name} (${selectedMachine.id}) to Corridor ${targetCorridorForMobilize}!`);
      refreshLocalMachinery();
      setTimeout(() => {
        setMobilizeSuccessMsg(null);
        setShowMobilizeModal(false);
        setSelectedMachine(null);
      }, 1600);
    }
  };

  // Heatmap color helper
  const getHealthColorClasses = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-950/70 hover:bg-emerald-900/80',
        border: 'border-emerald-700/60',
        text: 'text-emerald-300',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-950 text-emerald-400 border-emerald-800',
      };
    } else if (score >= 80) {
      return {
        bg: 'bg-sky-950/70 hover:bg-sky-900/80',
        border: 'border-sky-700/60',
        text: 'text-sky-300',
        bar: 'bg-sky-500',
        badge: 'bg-sky-950 text-sky-400 border-sky-800',
      };
    } else if (score >= 70) {
      return {
        bg: 'bg-amber-950/70 hover:bg-amber-900/80',
        border: 'border-amber-700/60',
        text: 'text-amber-300',
        bar: 'bg-amber-500',
        badge: 'bg-amber-950 text-amber-400 border-amber-800',
      };
    } else {
      return {
        bg: 'bg-rose-950/70 hover:bg-rose-900/80',
        border: 'border-rose-700/60',
        text: 'text-rose-300',
        bar: 'bg-rose-500',
        badge: 'bg-rose-950 text-rose-400 border-rose-800',
      };
    }
  };

  return (
    <div
      id="fleet-health-heatmap-card"
      className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md p-5 space-y-5 transition-all"
    >
      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg border bg-sky-950/80 border-sky-800/60 text-sky-400 shrink-0 mt-0.5">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                Fleet Health & Maintenance Readiness Heatmap
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60 font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-sky-400 animate-pulse" />
                MECHANICAL TELEMETRY
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
                {stats.readinessPct}% DEPLOYMENT READY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizes mechanical condition, hydraulic pressure, tooling wear, and depot readiness of heavy track machinery across railway corridors to guide real-time block allocation.
            </p>
          </div>
        </div>

        {/* CONTROLS: VIEW SWITCHER & FILTERS */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto font-mono text-xs">
          {/* View Mode Toggle */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              id="heatmap-view-cells-btn"
              onClick={() => setMode('MACHINE_CELLS')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                mode === 'MACHINE_CELLS'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Machine Roster
            </button>
            <button
              id="heatmap-view-grid-btn"
              onClick={() => setMode('SUBSYSTEM_GRID')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                mode === 'SUBSYSTEM_GRID'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Subsystem Thermal Grid
            </button>
          </div>

          <button
            onClick={refreshLocalMachinery}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Fleet Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* QUICK KPI TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Total Fleet Assets</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">{stats.total} Machines</div>
          <div className="text-[10px] text-slate-500">Track & OHE Fleet</div>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <div className="text-[10px] text-emerald-400">Mission-Ready</div>
          <div className="text-lg font-bold text-emerald-300 mt-0.5">{stats.missionReady} Units</div>
          <div className="text-[10px] text-emerald-400/70">&ge;88% Index (Immediate)</div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40">
          <div className="text-[10px] text-amber-400">Watch List</div>
          <div className="text-lg font-bold text-amber-300 mt-0.5">{stats.watchList} Units</div>
          <div className="text-[10px] text-amber-400/70">78–87% (Monitor Wear)</div>
        </div>

        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
          <div className="text-[10px] text-indigo-400">Depot Standby Headroom</div>
          <div className="text-lg font-bold text-indigo-300 mt-0.5">{stats.standbyCount} Units</div>
          <div className="text-[10px] text-indigo-400/70">Central Yard Reserves</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Fleet Average Health</div>
          <div className="text-lg font-bold text-sky-400 mt-0.5">{stats.avgHealth}%</div>
          <div className="text-[10px] text-slate-500">RDSO Norm: &gt;75%</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Average Fuel Level</div>
          <div className="text-lg font-bold text-amber-300 mt-0.5">{stats.avgFuel}%</div>
          <div className="text-[10px] text-slate-500">HSD High-Speed Diesel</div>
        </div>
      </div>

      {/* FILTER BAR FOR ROSTER VIEW */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-[11px] font-bold flex items-center gap-1">
            <Filter className="w-3 h-3 text-sky-400" />
            FILTER:
          </span>

          {(['ALL', 'MISSION_READY', 'WATCH_LIST', 'STANDBY'] as ReadinessFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setReadinessFilter(f)}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                readinessFilter === f
                  ? 'bg-sky-900/80 text-sky-200 border border-sky-600/70 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f === 'ALL'
                ? 'All Units'
                : f === 'MISSION_READY'
                ? 'Mission-Ready (88%+)'
                : f === 'WATCH_LIST'
                ? 'Watch List (78-87%)'
                : 'Standby Reserves'}
            </button>
          ))}
        </div>

        {/* Machine Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Type:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded text-[11px] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="TAMPING_MACHINE">Tie Tamping Machines</option>
            <option value="BALLAST_REGULATOR">Ballast Regulators</option>
            <option value="TOWER_WAGON">OHE Tower Wagons</option>
            <option value="TRACK_STABILIZER">Track Stabilizers</option>
            <option value="RAIL_GRINDER">Rail Grinders</option>
            <option value="USFD_CAR">USFD Cars</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: MACHINE ROSTER CELL HEATMAP */}
      {mode === 'MACHINE_CELLS' && (
        <div className="space-y-4">
          {corridorRows.map((corridor) => {
            const rowMachines = filteredMachines.filter((m) => m.corridorId === corridor.id);
            const isDepot = corridor.id === 'CENTRAL_DEPOT';

            return (
              <div
                key={corridor.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isDepot
                    ? 'bg-indigo-950/20 border-indigo-900/40'
                    : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                {/* Corridor Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800/60 font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        isDepot
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-700/70'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}
                    >
                      {corridor.shortCode}
                    </span>
                    <span className="font-bold text-slate-200 text-xs sm:text-sm">
                      {corridor.name}
                    </span>
                    {corridor.lengthKm > 0 && (
                      <span className="text-slate-500 text-[11px]">({corridor.lengthKm} km)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>
                      Deployed:{' '}
                      <strong className="text-slate-200">{rowMachines.length} assets</strong>
                    </span>
                    <button
                      onClick={() => onNavigate('resource_allocation', { corridorId: corridor.id, tab: 'MACHINERY' })}
                      className="text-sky-400 hover:text-sky-300 underline font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Roster Detail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Machines in this corridor */}
                {rowMachines.length === 0 ? (
                  <div className="p-4 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    No machinery matches the selected filter in this section.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rowMachines.map((machine) => {
                      const colors = getHealthColorClasses(machine.healthIndex);
                      const isSelected = selectedMachine?.id === machine.id;

                      return (
                        <div
                          key={machine.id}
                          onClick={() => setSelectedMachine(machine)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer font-mono relative overflow-hidden ${
                            colors.bg
                          } ${colors.border} ${
                            isSelected ? 'ring-2 ring-sky-400 shadow-lg scale-[1.01]' : 'hover:scale-[1.005]'
                          }`}
                        >
                          {/* Top row: ID, Type badge, Health Pill */}
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wide">{machine.id}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700">
                                {machine.type.replace('_', ' ')}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${colors.badge}`}
                            >
                              {machine.healthIndex}% Health
                            </span>
                          </div>

                          {/* Machine Name & Model */}
                          <div className="text-xs font-semibold text-slate-200 truncate mb-1">
                            {machine.name}
                          </div>

                          <div className="text-[10px] text-slate-400 truncate mb-2">
                            {machine.model}
                          </div>

                          {/* Mini Subsystem Gauge Bars */}
                          <div className="grid grid-cols-3 gap-1.5 py-1.5 border-t border-slate-800/80 text-[9px]">
                            <div>
                              <div className="flex justify-between text-slate-400">
                                <span>Engine</span>
                                <span className={machine.engineHealth >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                                  {machine.engineHealth}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1 mt-0.5">
                                <div
                                  className={`h-full rounded-full ${machine.engineHealth >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                  style={{ width: `${machine.engineHealth}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-400">
                                <span>Hydraulics</span>
                                <span className={machine.hydraulicsHealth >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                                  {machine.hydraulicsHealth}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1 mt-0.5">
                                <div
                                  className={`h-full rounded-full ${machine.hydraulicsHealth >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                  style={{ width: `${machine.hydraulicsHealth}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-400">
                                <span>Fuel HSD</span>
                                <span className={machine.fuelLevelPct >= 70 ? 'text-sky-400' : 'text-rose-400'}>
                                  {machine.fuelLevelPct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1 mt-0.5">
                                <div
                                  className={`h-full rounded-full ${machine.fuelLevelPct >= 70 ? 'bg-sky-400' : 'bg-rose-400'}`}
                                  style={{ width: `${machine.fuelLevelPct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Footer Info: Operator & Next Overhaul */}
                          <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-slate-800/80 text-slate-400">
                            <span className="truncate max-w-[130px]">{machine.operatorName.split(' ')[0]} (Pilot)</span>
                            <span className="text-slate-300">
                              {machine.nextPohType} in {machine.nextPohIohDays}d
                            </span>
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

      {/* VIEW 2: SUBSYSTEM THERMAL GRID */}
      {mode === 'SUBSYSTEM_GRID' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80 text-[11px]">
                <th className="p-3">Railway Corridor / Siding</th>
                <th className="p-3 text-center">Fleet Count</th>
                <th className="p-3 text-center">Power & Transmission</th>
                <th className="p-3 text-center">Hydraulic Circuit</th>
                <th className="p-3 text-center">Tooling & Tines</th>
                <th className="p-3 text-center">Sensors & USFD</th>
                <th className="p-3 text-center">Fuel Reserve</th>
                <th className="p-3 text-center">Overall Health</th>
                <th className="p-3 text-right">Deployment Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {corridorSubsystemAverages.map((row) => {
                const colors = getHealthColorClasses(row.overallHealth);
                return (
                  <tr key={row.rowId} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 text-[10px]">
                          {row.rowId === 'CENTRAL_DEPOT' ? 'DEPOT' : row.rowId}
                        </span>
                        <span>{row.rowName}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center text-slate-300 font-bold">
                      {row.count} units
                    </td>

                    {/* Engine Heatmap Cell */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-[11px] border ${getHealthColorClasses(row.engine).badge}`}>
                        {row.engine}%
                      </span>
                    </td>

                    {/* Hydraulics Heatmap Cell */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-[11px] border ${getHealthColorClasses(row.hydraulics).badge}`}>
                        {row.hydraulics}%
                      </span>
                    </td>

                    {/* Tooling Heatmap Cell */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-[11px] border ${getHealthColorClasses(row.tooling).badge}`}>
                        {row.tooling}%
                      </span>
                    </td>

                    {/* Sensors Heatmap Cell */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-[11px] border ${getHealthColorClasses(row.sensors).badge}`}>
                        {row.sensors}%
                      </span>
                    </td>

                    {/* Fuel Heatmap Cell */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-[11px] border ${getHealthColorClasses(row.fuel).badge}`}>
                        {row.fuel}%
                      </span>
                    </td>

                    {/* Overall Score */}
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded font-extrabold text-xs border ${colors.badge}`}>
                        {row.overallHealth}%
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.readinessStatus === 'EXCELLENT'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : row.readinessStatus === 'GOOD'
                            ? 'bg-sky-950 text-sky-300 border-sky-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        {row.readinessStatus === 'EXCELLENT' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            OPTIMAL
                          </>
                        ) : row.readinessStatus === 'GOOD' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            MISSION-READY
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            CAUTION (ATTN)
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER CALLOUT & ACTION ADVISORY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            <strong>Deployment Decision Rule:</strong> Never deploy heavy tampers with &lt;80% hydraulic health on 130 km/h passenger trunks. Reallocate Central Standby Units to prevent in-block stalls.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('resource_allocation', { tab: 'MACHINERY' })}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Full Resource Allocation Screen</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SELECTED MACHINE DETAIL DRAWER / MODAL */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border border-sky-800/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-mono animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{selectedMachine.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                    {selectedMachine.id}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Model: {selectedMachine.model} • Home Depot: {selectedMachine.homeDepot}
                </div>
              </div>

              <button
                onClick={() => setSelectedMachine(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Subsystem Health Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold uppercase tracking-wider text-sky-400">
                  Mechanical Subsystem Diagnostics
                </span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getHealthColorClasses(selectedMachine.healthIndex).badge}`}>
                  Overall Index: {selectedMachine.healthIndex}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Power & Engine</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedMachine.engineHealth}%</div>
                  <div className="text-[10px] text-slate-500">Cylinder Pressure OK</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Hydraulic Circuit</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedMachine.hydraulicsHealth}%</div>
                  <div className="text-[10px] text-slate-500">210 Bar Nominal</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Work Tooling Wear</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedMachine.toolingWearHealth}%</div>
                  <div className="text-[10px] text-slate-500">Tines & Shapers</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Sensors & Laser</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedMachine.sensorCalibrationHealth}%</div>
                  <div className="text-[10px] text-slate-500">Versine Calibrated</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Braking & Wheelset</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{selectedMachine.brakeWheelHealth}%</div>
                  <div className="text-[10px] text-slate-500">Flange Profile Standard</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Diesel Fuel Reserve</div>
                  <div className="text-base font-bold text-sky-400 mt-0.5">{selectedMachine.fuelLevelPct}%</div>
                  <div className="text-[10px] text-slate-500">1,850 Liters Available</div>
                </div>
              </div>
            </div>

            {/* Deployment Advisory Box */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Deployment Advisory:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {selectedMachine.deploymentAdvisory}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                <span>Current Section: <strong className="text-slate-200">{selectedMachine.currentSection}</strong></span>
                <span>•</span>
                <span>Max Speed: <strong className="text-slate-200">{selectedMachine.speedLimitKmph} km/h</strong></span>
                <span>•</span>
                <span>Next {selectedMachine.nextPohType}: <strong className="text-slate-200">{selectedMachine.nextPohIohDays} days</strong></span>
              </div>
            </div>

            {/* Mobilize / Reallocate Action Area */}
            {showMobilizeModal ? (
              <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800 text-xs space-y-3">
                <div className="font-bold text-sky-300">
                  Deploy / Transfer Machine to Corridor:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {corridors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setTargetCorridorForMobilize(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        targetCorridorForMobilize === c.id
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {c.id} ({c.name.split(' ')[0]})
                    </button>
                  ))}
                  <button
                    onClick={() => setTargetCorridorForMobilize('CENTRAL_DEPOT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetCorridorForMobilize === 'CENTRAL_DEPOT'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    Return to Central Depot
                  </button>
                </div>

                {mobilizeSuccessMsg && (
                  <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold">
                    {mobilizeSuccessMsg}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowMobilizeModal(false)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteMobilization}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Deployment</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedMachine(null);
                    onNavigate('resource_allocation', { corridorId: selectedMachine.corridorId, machineId: selectedMachine.id, tab: 'MACHINERY' });
                  }}
                  className="text-sky-400 hover:text-sky-300 underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Resource Allocation Console</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMobilizeModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Reallocate / Mobilize Machine</span>
                  </button>
                  <button
                    onClick={() => setSelectedMachine(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
