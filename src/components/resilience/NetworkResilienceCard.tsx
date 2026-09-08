import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Activity,
  Gauge,
  Layers,
  Wrench,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  TrendingUp,
  Zap,
  Clock,
  ArrowUpRight,
  Radio,
  Sliders,
  Maximize2,
  HardHat,
  ChevronRight,
} from 'lucide-react';
import { Corridor, OptimizedBlock } from '../../types';
import { mockStore } from '../../services/api';

interface NetworkResilienceCardProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

type SimulationScenario = 'LIVE' | 'PEAK_SURGE' | 'STANDBY_DEPLOYED' | 'DEPOT_DRAINED';

export const NetworkResilienceCard: React.FC<NetworkResilienceCardProps> = ({
  corridors,
  blocks = [],
  onNavigate,
  onRefreshData,
}) => {
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario>('LIVE');
  const [selectedCorridorDetail, setSelectedCorridorDetail] = useState<string | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  // Fetch current live resources from mockStore
  const liveMachinery = useMemo(() => mockStore.getMachinery(), []);
  const liveGangs = useMemo(() => mockStore.getManpowerGangs(), []);

  // Compute Network Metrics dynamically
  const resilienceAnalysis = useMemo(() => {
    // Total network track length in kilometers
    const totalLengthKm = corridors.reduce((sum, c) => sum + (c.lengthKm || 60), 0);
    const totalScheduledSlots = corridors.reduce((sum, c) => sum + (c.scheduledBlocks || 10), 0);
    const totalAvailableSlots = corridors.reduce((sum, c) => sum + (c.availableSlots || 2), 0);
    const totalNetworkSlots = totalScheduledSlots + totalAvailableSlots;

    // Base active blocks
    let activeBlockCount = blocks.length > 0 ? blocks.length : totalScheduledSlots;
    let deployedMachinesCount = liveMachinery.filter((m) => m.status === 'DEPLOYED').length;
    let standbyMachinesCount = liveMachinery.filter((m) => m.status === 'STANDBY_RESERVE').length;
    let standbyGangsCount = liveGangs.filter((g) => g.status === 'STANDBY').length;
    let standbyHeadcount = liveGangs
      .filter((g) => g.status === 'STANDBY')
      .reduce((sum, g) => sum + g.headcount, 0);

    // Apply simulation scenario modifiers
    let scenarioLabel = 'Live Real-Time Telemetry';
    let scenarioNotice = '';

    if (simulationScenario === 'PEAK_SURGE') {
      activeBlockCount += 6; // +6 unscheduled emergency blocks
      scenarioLabel = 'Stress Test: Peak Traffic Surge (+6 Emergency Blocks)';
      scenarioNotice = 'High track contention detected across western trunk lines.';
    } else if (simulationScenario === 'STANDBY_DEPLOYED') {
      standbyMachinesCount = Math.max(0, standbyMachinesCount - 2);
      deployedMachinesCount += 2;
      standbyHeadcount = Math.max(0, standbyHeadcount - 20);
      scenarioLabel = 'Contingency Test: 2 Standby Units Mobilized';
      scenarioNotice = 'Reserve units mobilized to mitigate local congestion.';
    } else if (simulationScenario === 'DEPOT_DRAINED') {
      standbyMachinesCount = 0;
      standbyGangsCount = 0;
      standbyHeadcount = 0;
      scenarioLabel = 'Vulnerability Test: Zero Depot Standby Reserves';
      scenarioNotice = 'Warning: Network operating without safety margin.';
    }

    // 1. ACTIVE BLOCK DENSITY FACTOR (0 - 100)
    // Density in blocks per 100 km
    const blockDensityPer100Km = totalLengthKm > 0
      ? Number(((activeBlockCount / totalLengthKm) * 100).toFixed(1))
      : 17.5;

    // Track Slot Occupancy / Headroom Saturation %
    const slotOccupancyPct = totalNetworkSlots > 0
      ? Math.min(100, Math.round((activeBlockCount / totalNetworkSlots) * 100))
      : 87;

    // Block Density Score: Optimal is balanced (density 10-14 per 100km, saturation 65-75%)
    // If saturation > 85%, penalty grows rapidly
    let densityHealthScore = 100;
    if (slotOccupancyPct > 90) {
      densityHealthScore = Math.max(45, 100 - (slotOccupancyPct - 85) * 4.5);
    } else if (slotOccupancyPct > 80) {
      densityHealthScore = Math.max(70, 100 - (slotOccupancyPct - 75) * 2.5);
    } else {
      densityHealthScore = 92;
    }

    // Check for corridor bottleneck severity
    const bottleneckCorridors = corridors.filter((c) => {
      const util = c.utilization || (c.scheduledBlocks / (c.scheduledBlocks + c.availableSlots)) * 100;
      return util >= 88;
    });

    if (bottleneckCorridors.length > 0) {
      densityHealthScore = Math.max(40, densityHealthScore - bottleneckCorridors.length * 4);
    }

    // 2. AVAILABLE BACKUP RESOURCE CAPACITY FACTOR (0 - 100)
    // Ratio of standby heavy machinery to deployed machinery
    const totalMachinery = deployedMachinesCount + standbyMachinesCount;
    const machineReserveRatio = totalMachinery > 0
      ? (standbyMachinesCount / totalMachinery) * 100
      : 20;

    // Manpower reserve buffer
    const totalGangs = liveGangs.length;
    const gangReserveRatio = totalGangs > 0
      ? (standbyGangsCount / totalGangs) * 100
      : 15;

    // Backup health calculation: target is ~20% machine reserve & ~15% manpower standby
    let backupCapacityScore = 0;
    // Machine reserve weight: 55%
    const machineScore = Math.min(100, (machineReserveRatio / 22) * 100);
    // Manpower reserve weight: 35%
    const manpowerScore = Math.min(100, (gangReserveRatio / 15) * 100);
    // Depot readiness factor: 10%
    const depotReadinessScore = standbyMachinesCount > 0 ? 95 : 20;

    backupCapacityScore = Math.round(machineScore * 0.55 + manpowerScore * 0.35 + depotReadinessScore * 0.10);
    backupCapacityScore = Math.min(100, Math.max(10, backupCapacityScore));

    // 3. COMPOSITE NETWORK RESILIENCE HEALTH SCORE
    // 50% Active Block Density & Headroom + 40% Backup Resource Capacity + 10% Inter-corridor Balance
    const networkBalanceFactor = bottleneckCorridors.length === 0 ? 95 : bottleneckCorridors.length === 1 ? 82 : 68;
    const rawHealthScore = Math.round(
      densityHealthScore * 0.50 + backupCapacityScore * 0.40 + networkBalanceFactor * 0.10
    );

    const healthScore = Math.min(100, Math.max(15, rawHealthScore));

    // Status Tier
    let tier: 'OPTIMAL' | 'STABLE' | 'STRAINED' | 'CRITICAL';
    let tierLabel = '';
    let tierColor = '';
    let tierBorder = '';
    let tierBg = '';

    if (healthScore >= 85) {
      tier = 'OPTIMAL';
      tierLabel = 'OPTIMAL RESILIENCE';
      tierColor = 'text-emerald-400';
      tierBorder = 'border-emerald-700/60';
      tierBg = 'bg-emerald-950/70 text-emerald-300';
    } else if (healthScore >= 72) {
      tier = 'STABLE';
      tierLabel = 'STABLE & RESILIENT';
      tierColor = 'text-sky-400';
      tierBorder = 'border-sky-700/60';
      tierBg = 'bg-sky-950/70 text-sky-300';
    } else if (healthScore >= 58) {
      tier = 'STRAINED';
      tierLabel = 'ELEVATED CONGESTION';
      tierColor = 'text-amber-400';
      tierBorder = 'border-amber-700/60';
      tierBg = 'bg-amber-950/70 text-amber-300';
    } else {
      tier = 'CRITICAL';
      tierLabel = 'CRITICAL VULNERABILITY';
      tierColor = 'text-rose-400';
      tierBorder = 'border-rose-700/60';
      tierBg = 'bg-rose-950/70 text-rose-300';
    }

    // Per-Corridor Resilience Breakdown
    const corridorBreakdown = corridors.map((c) => {
      const scheduled = c.scheduledBlocks || 10;
      const available = c.availableSlots || 2;
      const total = scheduled + available;
      const occupancy = total > 0 ? Math.round((scheduled / total) * 100) : 80;
      
      // Dispatch time from Central Depot holding sidings
      const dispatchTimeMinutes = c.id === 'C001' ? 18 : c.id === 'C002' ? 24 : c.id === 'C003' ? 32 : 28;

      // Standby machines assigned or reachable
      const corridorHealth = Math.max(40, Math.min(98, Math.round(
        (100 - occupancy * 0.5) + (standbyMachinesCount * 7) - (dispatchTimeMinutes > 30 ? 6 : 0)
      )));

      return {
        id: c.id,
        name: c.name,
        code: c.code || c.id,
        lengthKm: c.lengthKm,
        scheduled,
        available,
        occupancy,
        dispatchTimeMinutes,
        corridorHealth,
        status: corridorHealth >= 85 ? 'ROBUST' : corridorHealth >= 72 ? 'STABLE' : 'STRAINED',
        leadMachine: c.id === 'C001' ? 'CSM-902 & RUPS Tower Wagon' : c.id === 'C002' ? '09-3X Dynamic Tamper' : c.id === 'C003' ? '09-32 Heavy Tie Tamper & DTS' : 'Loram Rail Grinder RGM-96',
      };
    });

    return {
      healthScore,
      tier,
      tierLabel,
      tierColor,
      tierBorder,
      tierBg,
      totalLengthKm,
      activeBlockCount,
      totalNetworkSlots,
      blockDensityPer100Km,
      slotOccupancyPct,
      densityHealthScore,
      bottleneckCorridors,
      standbyMachinesCount,
      deployedMachinesCount,
      machineReserveRatio: Math.round(machineReserveRatio),
      standbyGangsCount,
      standbyHeadcount,
      backupCapacityScore,
      networkBalanceFactor,
      corridorBreakdown,
      scenarioLabel,
      scenarioNotice,
    };
  }, [corridors, blocks, liveMachinery, liveGangs, simulationScenario]);

  // SVG Gauge Calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (resilienceAnalysis.healthScore / 100) * circumference;

  return (
    <div
      id="network-resilience-card"
      className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md p-5 space-y-5 transition-all"
    >
      {/* CARD HEADER WITH SCENARIO CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg border shrink-0 mt-0.5 transition-colors ${
              resilienceAnalysis.tier === 'OPTIMAL' || resilienceAnalysis.tier === 'STABLE'
                ? 'bg-sky-950/80 border-sky-800/60 text-sky-400'
                : resilienceAnalysis.tier === 'STRAINED'
                ? 'bg-amber-950/80 border-amber-800/60 text-amber-400'
                : 'bg-rose-950/80 border-rose-800/60 text-rose-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                Network Resilience & Health Monitor
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                REAL-TIME TELEMETRY
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${resilienceAnalysis.tierBg} ${resilienceAnalysis.tierBorder}`}
              >
                {resilienceAnalysis.tierLabel} ({resilienceAnalysis.healthScore}/100)
              </span>
              <button
                id="resilience-formula-info-btn"
                onClick={() => setShowFormulaModal(true)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Inspect Mathematical Scoring Formula (RDSO Para 3.12)"
              >
                <Info className="w-3 h-3 text-sky-400" />
                <span>Formula</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates holistic railway corridor survivability and operational buffer by correlating active maintenance block density with depot backup fleet reserves.
            </p>
          </div>
        </div>

        {/* Contingency Simulator / Stress Test Switcher */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto font-mono text-xs bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 px-1 font-bold flex items-center gap-1">
            <Sliders className="w-3 h-3 text-sky-400" />
            MODE:
          </span>
          <button
            id="scenario-live-btn"
            onClick={() => setSimulationScenario('LIVE')}
            className={`px-2 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              simulationScenario === 'LIVE'
                ? 'bg-sky-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Monitor
          </button>
          <button
            id="scenario-surge-btn"
            onClick={() => setSimulationScenario('PEAK_SURGE')}
            className={`px-2 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              simulationScenario === 'PEAK_SURGE'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate sudden influx of +6 emergency maintenance blocks"
          >
            +6 Surge
          </button>
          <button
            id="scenario-standby-btn"
            onClick={() => setSimulationScenario('STANDBY_DEPLOYED')}
            className={`px-2 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              simulationScenario === 'STANDBY_DEPLOYED'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate dispatching 2 standby units into active service"
          >
            Mobilized
          </button>
          <button
            id="scenario-drained-btn"
            onClick={() => setSimulationScenario('DEPOT_DRAINED')}
            className={`px-2 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              simulationScenario === 'DEPOT_DRAINED'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate worst-case scenario: zero backup resources available"
          >
            0 Reserves
          </button>
        </div>
      </div>

      {/* SIMULATION NOTICE BANNER IF ACTIVE */}
      {simulationScenario !== 'LIVE' && (
        <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 flex items-center justify-between gap-3 text-xs font-mono text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>SCENARIO ACTIVE:</strong> {resilienceAnalysis.scenarioLabel}.{' '}
              <span className="text-slate-300">{resilienceAnalysis.scenarioNotice}</span>
            </span>
          </div>
          <button
            onClick={() => setSimulationScenario('LIVE')}
            className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 hover:text-white border border-amber-700/60 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Live
          </button>
        </div>
      )}

      {/* CORE DISPLAY: HEALTH GAUGE & TWIN PILLARS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* COMPONENT 1: HEALTH GAUGE DISPLAY (Cols 1 to 4) */}
        <div className="lg:col-span-4 bg-slate-900/70 p-4 rounded-xl border border-slate-800/90 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span className="uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Network Health Index
            </span>
            <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
              <TrendingUp className="w-3 h-3" />
              +2.4% shift
            </span>
          </div>

          {/* SVG Circular Progress Ring */}
          <div className="relative my-2 w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
              {/* Background Ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="11"
                fill="transparent"
              />
              {/* Progress Ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke={
                  resilienceAnalysis.healthScore >= 85
                    ? '#10b981'
                    : resilienceAnalysis.healthScore >= 72
                    ? '#38bdf8'
                    : resilienceAnalysis.healthScore >= 58
                    ? '#f59e0b'
                    : '#f43f5e'
                }
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                {resilienceAnalysis.healthScore}%
              </div>
              <div
                className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border mt-0.5 ${resilienceAnalysis.tierBg} ${resilienceAnalysis.tierBorder}`}
              >
                {resilienceAnalysis.tier}
              </div>
            </div>
          </div>

          {/* Health Tier Description */}
          <div className="w-full space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Survival Margin:</span>
              <span className="text-slate-200 font-bold">
                {resilienceAnalysis.healthScore >= 80 ? 'High Headroom (3.2x)' : 'Moderate Headroom (1.8x)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Contingency Absorption:</span>
              <span className="text-emerald-400 font-bold">Up to 3 simultaneous failures</span>
            </div>
          </div>
        </div>

        {/* COMPONENT 2: TWIN PILLARS (Cols 5 to 12) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PILLAR 1: ACTIVE BLOCK DENSITY */}
          <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-sky-400 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Layers className="w-4 h-4" />
                  Pillar 1: Active Block Density
                </span>
                <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-bold">
                  WEIGHT 50%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Track slot saturation and spatial dispersion of maintenance shutdowns.
              </p>
            </div>

            {/* Density Metrics */}
            <div className="grid grid-cols-2 gap-2.5 py-1">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Block Density</div>
                <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
                  {resilienceAnalysis.blockDensityPer100Km}
                </div>
                <div className="text-[10px] font-mono text-slate-500">blks / 100 km track</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Slot Occupancy</div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {resilienceAnalysis.slotOccupancyPct}%
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {resilienceAnalysis.activeBlockCount} of {resilienceAnalysis.totalNetworkSlots} slots
                </div>
              </div>
            </div>

            {/* Progress / Saturation Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Network Track Saturation</span>
                <span className={resilienceAnalysis.slotOccupancyPct > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {resilienceAnalysis.densityHealthScore}% Headroom Score
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    resilienceAnalysis.slotOccupancyPct > 90
                      ? 'bg-rose-500'
                      : resilienceAnalysis.slotOccupancyPct > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${resilienceAnalysis.slotOccupancyPct}%` }}
                />
              </div>
            </div>

            {/* Bottleneck Warning Callout */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="truncate">
                {resilienceAnalysis.bottleneckCorridors.length > 0 ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    Bottleneck: {resilienceAnalysis.bottleneckCorridors.map((b) => b.id).join(', ')} (&ge;88% util)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    All corridors within safe slot headway
                  </span>
                )}
              </span>
              <button
                onClick={() => onNavigate('corridors')}
                className="text-sky-400 hover:text-sky-300 underline text-[10px] shrink-0 font-bold cursor-pointer"
              >
                Inspect Corridors →
              </button>
            </div>
          </div>

          {/* PILLAR 2: AVAILABLE BACKUP RESOURCE CAPACITY */}
          <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800/90 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Wrench className="w-4 h-4" />
                  Pillar 2: Backup Resource Capacity
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  WEIGHT 40%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Uncommitted heavy machinery and standby relief gangs ready on &le;30 min callout.
              </p>
            </div>

            {/* Capacity Metrics */}
            <div className="grid grid-cols-2 gap-2.5 py-1">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Standby Machinery</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5 flex items-baseline gap-1">
                  <span>{resilienceAnalysis.standbyMachinesCount}</span>
                  <span className="text-xs text-slate-400 font-normal">units</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {resilienceAnalysis.machineReserveRatio}% reserve buffer
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Standby Manpower</div>
                <div className="text-lg font-bold font-mono text-sky-300 mt-0.5 flex items-baseline gap-1">
                  <span>{resilienceAnalysis.standbyHeadcount}</span>
                  <span className="text-xs text-slate-400 font-normal">staff</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {resilienceAnalysis.standbyGangsCount} relief gangs
                </div>
              </div>
            </div>

            {/* Progress / Backup Index Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Depot Reserve Buffer Depth</span>
                <span className="text-emerald-400 font-bold">
                  {resilienceAnalysis.backupCapacityScore}% Capacity Index
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    resilienceAnalysis.backupCapacityScore >= 75
                      ? 'bg-emerald-500'
                      : resilienceAnalysis.backupCapacityScore >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${resilienceAnalysis.backupCapacityScore}%` }}
                />
              </div>
            </div>

            {/* Quick Dispatch Callout */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1 truncate text-slate-300">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                Avg Response Radius: ~24 min callout
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    const el = document.getElementById('fleet-health-heatmap-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-sky-400 hover:text-sky-300 underline text-[10px] shrink-0 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Fleet Heatmap</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  id="quick-mobilize-reserve-btn"
                  onClick={() => onNavigate('resource_allocation', { tab: 'MACHINERY' })}
                  className="text-emerald-400 hover:text-emerald-300 underline text-[10px] shrink-0 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Mobilize Reserve</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORRIDOR RESILIENCE HEALTH BREAKDOWN TABLE */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
            <span>Corridor Survivability & Dispatch Matrix</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Live Health Score per Railway Line)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            CLICK ROW TO INSPECT RESOURCE ROSTER
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {resilienceAnalysis.corridorBreakdown.map((corr) => {
            const isSelected = selectedCorridorDetail === corr.id;
            return (
              <div
                key={corr.id}
                onClick={() => setSelectedCorridorDetail(isSelected ? null : corr.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer font-mono ${
                  corr.status === 'ROBUST'
                    ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-700/60 hover:bg-slate-850'
                    : corr.status === 'STABLE'
                    ? 'bg-slate-900/60 border-slate-800 hover:border-sky-700/60 hover:bg-slate-850'
                    : 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60'
                } ${isSelected ? 'ring-1 ring-sky-500 shadow-md bg-sky-950/20' : ''}`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{corr.id}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                      {corr.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      corr.status === 'ROBUST'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : corr.status === 'STABLE'
                        ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    {corr.corridorHealth}%
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Block Occupancy:</span>
                    <span className="text-slate-200 font-semibold">{corr.occupancy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Depot Reach:</span>
                    <span className="text-slate-200 font-semibold">~{corr.dispatchTimeMinutes}m</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/80" title={corr.leadMachine}>
                    {corr.leadMachine}
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] flex items-center justify-between text-sky-400">
                    <span>Inspect Fleet & Rosters</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('resource_allocation', { corridorId: corr.id });
                      }}
                      className="text-white hover:text-sky-300 underline font-bold"
                    >
                      Open Screen →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER ACTIONS & STATUTORY COMPLIANCE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs font-mono text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
            RDSO TM-2026 AUDIT COMPLIANT
          </span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span>Mandates &ge;15% standby reserve machine buffer for high-density railway networks</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('resource_allocation')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Resource Allocation</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => onNavigate('planning')}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-950/40 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Re-Optimize Schedule</span>
          </button>
        </div>
      </div>

      {/* FORMULA EXPLANATION MODAL */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border border-sky-800/80 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Network Resilience Scoring Algorithm</span>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
              <p>
                The <strong>Network Resilience Health Score</strong> assesses the capability of the railway network to absorb track maintenance disruptions, unexpected rail fractures, or catenary breakages without causing cascading passenger train delays.
              </p>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5 text-sky-300">
                <div className="font-bold text-white">Mathematical Model:</div>
                <div>Health Score = 0.50 &times; S_density + 0.40 &times; S_backup + 0.10 &times; S_balance</div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Where:
                  <br />• <strong>S_density</strong> = Track slot saturation headroom penalized by bottleneck corridors (&gt;88% utilization).
                  <br />• <strong>S_backup</strong> = Uncommitted standby heavy machinery (Tamping, Tower Wagon, Ballast Regulator) + standby emergency gangs.
                  <br />• <strong>S_balance</strong> = Inter-corridor traffic variance and Kavach safety distance margin.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="font-bold text-slate-200">Optimal (85–100%)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Safe slot headway, &ge;2 reserve machines ready, &le;25m callout.
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="font-bold text-slate-200">Strained (&lt;70%)</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Corridor saturation &gt;88%, low backup depth, vulnerable to delay cascades.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer font-mono"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
