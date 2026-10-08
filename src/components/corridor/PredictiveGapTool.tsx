import React, { useState } from 'react';
import {
  Wrench,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Move,
  Flame,
  Clock,
  Layers,
  Zap,
  Info,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { Corridor } from '../../types';

export interface StagedMaintenanceBlock {
  id: string;
  code: string;
  name: string;
  department: 'ENGINEERING' | 'TRACTION' | 'S&T' | 'SAFETY';
  durationHours: number;
  targetMachine: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  taskType: string;
  assetType: string;
  description: string;
  recommendedCorridorId: string;
  estimatedStrainReliefPoints: number; // e.g. 16
  estimatedBacklogClearedHours: number; // e.g. 3.5
  colorBadge: string;
}

export interface SimulatedDroppedBlock {
  simulatedId: string;
  block: StagedMaintenanceBlock;
  targetCorridorId: string;
  targetDayOffset?: number;
  placedTimestamp: number;
  timeWindow: string;
  strainShiftDelta: number;
  backlogClearedHours: number;
  preStrainScore: number;
  postStrainScore: number;
  preBacklog7dMA: number;
  postBacklog7dMA: number;
}

export const PRESET_MAINTENANCE_BLOCKS: StagedMaintenanceBlock[] = [
  {
    id: 'SIM-BLK-01',
    code: '09-3X TAMP',
    name: '09-3X Continuous Track Tamper',
    department: 'ENGINEERING',
    durationHours: 3.5,
    targetMachine: '09-3X Dynamic Continuous Tamping Express',
    priority: 'CRITICAL',
    taskType: 'Track Alignment & Packing',
    assetType: 'Continuous Welded Rail (60kg)',
    description: 'Eliminates cross-level and twist defects, lifting 15km/h speed restriction.',
    recommendedCorridorId: 'C003',
    estimatedStrainReliefPoints: 16,
    estimatedBacklogClearedHours: 3.5,
    colorBadge: 'bg-rose-950/80 text-rose-300 border-rose-700/80',
  },
  {
    id: 'SIM-BLK-02',
    code: 'RGM-72 GRIND',
    name: '72-Stone Rail Grinding Machine',
    department: 'ENGINEERING',
    durationHours: 2.5,
    targetMachine: 'RGM-72 High-Speed Rail Grinder',
    priority: 'HIGH',
    taskType: 'Rail Profile Restoration',
    assetType: 'Head-Hardened Rail (1080 grade)',
    description: 'Removes rolling contact fatigue micro-cracks before ultrasonic defect formation.',
    recommendedCorridorId: 'C001',
    estimatedStrainReliefPoints: 12,
    estimatedBacklogClearedHours: 2.5,
    colorBadge: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
  },
  {
    id: 'SIM-BLK-03',
    code: 'OHE OVERHAUL',
    name: '25kV Traction Catenary & OHE Overhaul',
    department: 'TRACTION',
    durationHours: 2.0,
    targetMachine: '8-Wheeler Tower Inspection Wagon',
    priority: 'MEDIUM',
    taskType: 'Catenary Dropper & Pantograph Profiling',
    assetType: '25kV AC Traction 107sqmm Catenary',
    description: 'Adjusts contact wire height and dropper tension in golden night gap.',
    recommendedCorridorId: 'C004',
    estimatedStrainReliefPoints: 8,
    estimatedBacklogClearedHours: 2.0,
    colorBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80',
  },
  {
    id: 'SIM-BLK-04',
    code: 'TURNOUT 08-4S',
    name: '1-in-12 Turnout & Switch Overhaul',
    department: 'ENGINEERING',
    durationHours: 4.0,
    targetMachine: 'UNIMAT 08-4S Turnout Tamper',
    priority: 'HIGH',
    taskType: 'Switch & Crossings Overhaul',
    assetType: 'Thick Web Switch 1-in-12',
    description: 'Restores switch tongue clearances, avoiding yard approach deceleration.',
    recommendedCorridorId: 'C002',
    estimatedStrainReliefPoints: 14,
    estimatedBacklogClearedHours: 4.0,
    colorBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
  },
  {
    id: 'SIM-BLK-05',
    code: 'BCM-800 CLEAN',
    name: 'Deep Ballast Cleaning Machine',
    department: 'ENGINEERING',
    durationHours: 4.5,
    targetMachine: 'BCM-800 High-Capacity Ballast Cleaner',
    priority: 'CRITICAL',
    taskType: 'Cushion Screening & Ballast Profiling',
    assetType: 'Track Bed Ballast Cushion 350mm',
    description: 'Removes slurry and fouled ballast, draining waterlogging near culverts.',
    recommendedCorridorId: 'C003',
    estimatedStrainReliefPoints: 18,
    estimatedBacklogClearedHours: 4.5,
    colorBadge: 'bg-purple-950/80 text-purple-300 border-purple-700/80',
  },
  {
    id: 'SIM-BLK-06',
    code: 'EI DIAGNOSTIC',
    name: 'Electronic Interlocking SSI Diagnostic',
    department: 'S&T',
    durationHours: 1.5,
    targetMachine: 'Solid State EI Diagnostic Rig',
    priority: 'LOW',
    taskType: 'Relay Logic & Point Machine Health',
    assetType: 'Solid State EI (Kyoritsu/Siemens)',
    description: 'Runs automated diagnostic routines with zero passenger train delays.',
    recommendedCorridorId: 'C001',
    estimatedStrainReliefPoints: 6,
    estimatedBacklogClearedHours: 1.5,
    colorBadge: 'bg-blue-950/80 text-blue-300 border-blue-700/80',
  },
];

export interface PredictiveGapToolProps {
  corridors: Corridor[];
  simulatedBlocks: SimulatedDroppedBlock[];
  onSimulateBlock: (block: StagedMaintenanceBlock, targetCorridorId: string) => void;
  onRemoveSimulatedBlock: (simulatedId: string) => void;
  onResetSimulation: () => void;
  onCommitSimulation: () => void;
  activeDraggingBlock: StagedMaintenanceBlock | null;
  setActiveDraggingBlock: (block: StagedMaintenanceBlock | null) => void;
  isSimulating: boolean;
}

export const PredictiveGapTool: React.FC<PredictiveGapToolProps> = ({
  corridors,
  simulatedBlocks,
  onSimulateBlock,
  onRemoveSimulatedBlock,
  onResetSimulation,
  onCommitSimulation,
  activeDraggingBlock,
  setActiveDraggingBlock,
  isSimulating,
}) => {
  const [selectedQuickTarget, setSelectedQuickTarget] = useState<string>('C003');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('Emergency Track Tamper Blitz');
  const [customDuration, setCustomDuration] = useState<number>(3.0);
  const [customDept, setCustomDept] = useState<'ENGINEERING' | 'TRACTION' | 'S&T' | 'SAFETY'>('ENGINEERING');
  const [customPriority, setCustomPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // Total strain points relief accumulated in simulation
  const totalStrainRelief = simulatedBlocks.reduce((sum, b) => sum + b.strainShiftDelta, 0);
  const totalBacklogCleared = +simulatedBlocks.reduce((sum, b) => sum + b.backlogClearedHours, 0).toFixed(1);

  const handleCreateCustomBlock = () => {
    const customBlock: StagedMaintenanceBlock = {
      id: `SIM-CUSTOM-${Date.now()}`,
      code: `CUSTOM-${customDuration}h`,
      name: customName,
      department: customDept,
      durationHours: customDuration,
      targetMachine: `${customDept} Mobile Task Force`,
      priority: customPriority,
      taskType: 'Special Preventive Maintenance',
      assetType: 'Track Infrastructure',
      description: `Custom simulation package scheduled for ${customDuration}h.`,
      recommendedCorridorId: selectedQuickTarget,
      estimatedStrainReliefPoints: Math.round(customDuration * 4.2),
      estimatedBacklogClearedHours: customDuration,
      colorBadge: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80',
    };

    onSimulateBlock(customBlock, selectedQuickTarget);
    setShowCustomModal(false);
  };

  return (
    <div className="bg-[#090f22] p-4.5 rounded-xl border border-purple-900/70 shadow-2xl font-mono text-xs space-y-4 relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-purple-600/5 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-950 border border-purple-600/70 text-purple-300 shadow-sm shadow-purple-950/60">
            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <span>Predictive Gap Tool</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700 font-normal">
                  Interactive D3 Simulation Deck
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Drag maintenance blocks directly onto the D3 trend-line above to simulate instantaneous network strain reduction and backlog clearance.
            </p>
          </div>
        </div>

        {/* Global Simulation Actions */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {simulatedBlocks.length > 0 && (
            <div className="px-2.5 py-1 rounded-md bg-purple-950/80 text-purple-300 border border-purple-700 flex items-center gap-1.5 text-[11px] font-bold">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shift: -{totalStrainRelief} pts</span>
              <span className="text-slate-500">|</span>
              <span>-{totalBacklogCleared}h MA Backlog</span>
            </div>
          )}

          <button
            onClick={() => setShowCustomModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-800/60 flex items-center gap-1 transition-colors cursor-pointer"
            title="Create Custom Simulation Block"
          >
            <Plus className="w-3 h-3 text-purple-400" />
            <span>Custom Block</span>
          </button>

          {simulatedBlocks.length > 0 && (
            <>
              <button
                onClick={onResetSimulation}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset simulation and restore live telemetry baseline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              <button
                onClick={onCommitSimulation}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-950/60 transition-colors cursor-pointer"
                title="Commit simulated blocks into the AI Master Schedule"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>Commit to Master Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Drag & Drop Visual Instruction Bar */}
      <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-purple-200">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
          <span>
            <strong className="text-purple-300">DRAG-TO-SIMULATE:</strong> Grab any block package below and drop it onto the D3 chart's dotted trend-line, or click <span className="font-bold underline">Place on Trendline</span>.
          </span>
        </div>

        {/* Quick Target Corridor Selector for direct placement */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-400 text-[10px]">Target Corridor:</span>
          <select
            value={selectedQuickTarget}
            onChange={(e) => setSelectedQuickTarget(e.target.value)}
            className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-[11px] font-mono cursor-pointer focus:outline-none focus:border-purple-500"
          >
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} ({c.code || c.name.slice(0, 10)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Draggable Maintenance Blocks Palette Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {PRESET_MAINTENANCE_BLOCKS.map((block) => {
          const isDraggingThis = activeDraggingBlock?.id === block.id;

          return (
            <div
              key={block.id}
              draggable={true}
              onDragStart={(e) => {
                setActiveDraggingBlock(block);
                e.dataTransfer.setData('application/json', JSON.stringify(block));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onDragEnd={() => setActiveDraggingBlock(null)}
              className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none relative group ${
                isDraggingThis
                  ? 'bg-purple-950/90 border-purple-400 shadow-xl scale-95 opacity-60'
                  : 'bg-[#0d1630] border-slate-800/90 hover:border-purple-600/80 hover:bg-[#121e42] shadow-sm'
              }`}
            >
              {/* Top row: Code, Department, Duration */}
              <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-slate-900 text-purple-400 border border-slate-800">
                    <Wrench className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="font-bold text-slate-200 text-xs">{block.code}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${block.colorBadge}`}>
                    {block.priority}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
                    {block.durationHours}h
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-1.5 space-y-0.5">
                <div className="text-[11px] font-bold text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                  {block.name}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {block.description}
                </p>
              </div>

              {/* Simulation Impact Forecast Pills */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingDown className="w-3 h-3" />
                  <span>Strain: -{block.estimatedStrainReliefPoints} pts</span>
                </div>
                <div className="text-purple-300 font-bold">
                  -{block.estimatedBacklogClearedHours}h Backlog MA
                </div>
              </div>

              {/* Bottom Direct Action Bar */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" />
                  <span>Drag onto chart</span>
                </span>
                <button
                  onClick={() => onSimulateBlock(block, selectedQuickTarget)}
                  className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/80 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title={`Directly simulate placing onto corridor ${selectedQuickTarget}`}
                >
                  <span>Place on {selectedQuickTarget}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SIMULATED RESULTS OVERVIEW (WHEN BLOCKS ARE STAGED)            */}
      {/* ------------------------------------------------------------- */}
      {simulatedBlocks.length > 0 && (
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-700/80 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-900/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-purple-200 uppercase tracking-wide">
                Active Simulation Shift Summary ({simulatedBlocks.length} Staged {simulatedBlocks.length === 1 ? 'Block' : 'Blocks'})
              </span>
            </div>
            <span className="text-[10px] text-purple-300 font-bold">
              Observed on D3 Trend-Line: Ghost Baseline vs Shifted Trend-Line
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/60">
              <span className="text-[10px] text-slate-400 block">TOTAL STRAIN RELIEF</span>
              <span className="text-base font-bold text-emerald-400 block mt-0.5">
                -{totalStrainRelief} pts
              </span>
              <span className="text-[9px] text-slate-400">Cumulative index drop</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/60">
              <span className="text-[10px] text-slate-400 block">BACKLOG 7D MA CLEARED</span>
              <span className="text-base font-bold text-purple-300 block mt-0.5">
                -{totalBacklogCleared}h
              </span>
              <span className="text-[9px] text-slate-400">Deferred hours resolved</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/60">
              <span className="text-[10px] text-slate-400 block">CAUTION ORDERS AVERTED</span>
              <span className="text-base font-bold text-cyan-400 block mt-0.5">
                {simulatedBlocks.length >= 2 ? '2 Averted' : '1 Averted'}
              </span>
              <span className="text-[9px] text-slate-400">Saves ~35m train delay</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/60">
              <span className="text-[10px] text-slate-400 block">HEADWAY WINDOW STATUS</span>
              <span className="text-base font-bold text-emerald-300 block mt-0.5">
                100% Absorbed
              </span>
              <span className="text-[9px] text-slate-400">Night Golden Window fit</span>
            </div>
          </div>

          {/* Staged blocks list */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Staged Blocks on D3 Trend-Line:
            </span>
            <div className="space-y-1">
              {simulatedBlocks.map((sb) => (
                <div
                  key={sb.simulatedId}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold text-[10px]">
                      {sb.targetCorridorId}
                    </span>
                    <span className="font-bold text-slate-200">{sb.block.code}</span>
                    <span className="text-slate-400">({sb.block.name})</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-400 font-bold">{sb.block.durationHours}h</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-rose-400 line-through">{sb.preStrainScore}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-emerald-400">{sb.postStrainScore} Strain</span>
                      <span className="text-emerald-300 text-[10px]">(-{sb.strainShiftDelta})</span>
                    </div>

                    <button
                      onClick={() => onRemoveSimulatedBlock(sb.simulatedId)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Remove this simulated block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM BLOCK MODAL                                            */}
      {/* ------------------------------------------------------------- */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e172e] p-5 rounded-2xl border border-purple-700/80 shadow-2xl max-w-md w-full font-mono space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Configure Custom Simulation Block</span>
              </h4>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">TASK NAME</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">DURATION (HOURS)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">TARGET CORRIDOR</label>
                  <select
                    value={selectedQuickTarget}
                    onChange={(e) => setSelectedQuickTarget(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {corridors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} ({c.code || c.name.slice(0, 10)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">DEPARTMENT</label>
                  <select
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="ENGINEERING">Civil Engineering</option>
                    <option value="TRACTION">Traction / OHE</option>
                    <option value="S&T">Signal & Telecom</option>
                    <option value="SAFETY">Safety</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">PRIORITY</label>
                  <select
                    value={customPriority}
                    onChange={(e) => setCustomPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomBlock}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Inject into Simulation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
