import React, { useState } from 'react';
import {
  GitFork,
  Train as TrainIcon,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ArrowRight,
  Zap,
  Layers,
  ChevronRight,
  X,
  Flame,
  Activity,
  ShieldAlert,
  Clock,
  Sliders,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { Corridor, OptimizedBlock, Train, Conflict } from '../../types';
import { CorridorDefectPredictiveModule } from '../predictive/CorridorDefectPredictiveModule';
import { CorridorTrackSegmentHeatmap } from '../corridor/CorridorTrackSegmentHeatmap';
import { railwayAudio } from '../../services/railwayAudio';

interface CorridorOperationsScreenProps {
  corridors: Corridor[];
  blocks: OptimizedBlock[];
  trains: Train[];
  conflicts: Conflict[];
  onNavigateToBlockTimeline: () => void;
  onNavigateToConflict: (blockId?: string) => void;
}

export const CorridorOperationsScreen: React.FC<CorridorOperationsScreenProps> = ({
  corridors,
  blocks,
  trains,
  conflicts,
  onNavigateToBlockTimeline,
  onNavigateToConflict,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('C001');
  const [activeViewMode, setActiveViewMode] = useState<'INTEGRATED' | 'HEATMAP_ONLY' | 'PREDICTIVE_ONLY' | 'TOPOLOGY_ONLY'>('INTEGRATED');
  const [heatmapMode, setHeatmapMode] = useState<'SEVERITY' | 'DURATION'>('SEVERITY');
  const [hideZeroMaintenance, setHideZeroMaintenance] = useState<boolean>(false);

  const selectedCorridor = corridors.find((c) => c.id === selectedCorridorId) || corridors[0];
  const corridorBlocks = blocks.filter((b) => b.corridorId === selectedCorridor.id);
  const corridorTrains = trains.filter((t) => t.corridorId === selectedCorridor.id);
  const corridorConflicts = conflicts.filter(
    (c) => c.corridorId === selectedCorridor.id && c.status === 'OPEN'
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <GitFork className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Corridor Operations & Network Topology
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 7 / TOPOLOGY & UTILIZATION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 text-rose-400" />
                4 URGENT TRACK SEGMENTS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                RED-TO-GREEN HEATMAP ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Topological schematic across 4 primary railway sections with red-to-green maintenance severity & repair duration heatmap analytics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Heatmap Mode Toggle: Severity-based vs Repair Duration-based */}
            <div
              id="corridor-heatmap-mode-toggle"
              data-testid="corridor-heatmap-mode-toggle"
              className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs shadow-inner"
            >
              <span className="text-[10px] text-slate-400 uppercase px-2 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-sky-400" />
                <span>Heatmap Mode:</span>
              </span>

              <button
                type="button"
                id="btn-toggle-heatmap-severity"
                data-testid="btn-toggle-heatmap-severity"
                onClick={() => {
                  railwayAudio.playBeep(700, 0.06);
                  setHeatmapMode('SEVERITY');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  heatmapMode === 'SEVERITY'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/60 ring-1 ring-rose-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Switch heatmap visualization to 'Severity-based' mode (Green to Red representing failure risk and degradation)"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Severity-based</span>
              </button>

              <button
                type="button"
                id="btn-toggle-heatmap-duration"
                data-testid="btn-toggle-heatmap-duration"
                onClick={() => {
                  railwayAudio.playBeep(750, 0.06);
                  setHeatmapMode('DURATION');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  heatmapMode === 'DURATION'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-950/60 ring-1 ring-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Switch heatmap visualization to 'Repair Duration-based' mode (Green to Red representing estimated block duration)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Repair Duration-based</span>
              </button>
            </div>

            {/* Active Visualization Mode Pill */}
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono">
              {heatmapMode === 'SEVERITY' ? (
                <span
                  id="header-scale-pill-severity"
                  data-testid="header-scale-pill-severity"
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Flame className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Green (0%) ➔ Red (100% Criticality)</span>
                </span>
              ) : (
                <span
                  id="header-scale-pill-duration"
                  data-testid="header-scale-pill-duration"
                  className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Green (&lt;30m) ➔ Red (180m+ Mega-Block)</span>
                </span>
              )}

              {hideZeroMaintenance && (
                <span
                  id="header-declutter-pill"
                  data-testid="header-declutter-pill"
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-600 font-bold flex items-center gap-1.5 shadow-sm animate-in fade-in"
                >
                  <EyeOff className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>DECLUTTER ACTIVE (Zero-Maint Hidden)</span>
                </span>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(600, 0.05);
                  setActiveViewMode('INTEGRATED');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  activeViewMode === 'INTEGRATED'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Integrated View
              </button>

              <button
                type="button"
                id="btn-view-heatmap-module"
                onClick={() => {
                  railwayAudio.playBeep(650, 0.05);
                  setActiveViewMode('HEATMAP_ONLY');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeViewMode === 'HEATMAP_ONLY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-300/80 hover:text-emerald-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Track Heatmap</span>
              </button>

              <button
                type="button"
                id="btn-view-predictive-module"
                onClick={() => {
                  railwayAudio.playBeep(650, 0.05);
                  setActiveViewMode('PREDICTIVE_ONLY');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeViewMode === 'PREDICTIVE_ONLY'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-300/80 hover:text-amber-200 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Predictive Module</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(600, 0.05);
                  setActiveViewMode('TOPOLOGY_ONLY');
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  activeViewMode === 'TOPOLOGY_ONLY'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Topology Only
              </button>
            </div>

            <button
              onClick={onNavigateToBlockTimeline}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Inspect Gantt Timeline</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TRACK SEGMENTS HEATMAP VISUALIZATION (RED-TO-GREEN COLOR CODING)
          ========================================================================= */}
      {(activeViewMode === 'INTEGRATED' || activeViewMode === 'HEATMAP_ONLY') && (
        <CorridorTrackSegmentHeatmap
          selectedCorridorId={selectedCorridorId}
          onSelectCorridor={(corr) => setSelectedCorridorId(corr)}
          metricMode={heatmapMode}
          onMetricModeChange={(m) => setHeatmapMode(m === 'DURATION' ? 'DURATION' : 'SEVERITY')}
          hideZeroMaintenance={hideZeroMaintenance}
          onToggleHideZeroMaintenance={(hide) => setHideZeroMaintenance(hide)}
        />
      )}

      {/* =========================================================================
          AUTOMATED PREDICTIVE DEFECT ANALYSIS MODULE
          ========================================================================= */}
      {(activeViewMode === 'INTEGRATED' || activeViewMode === 'PREDICTIVE_ONLY') && (
        <CorridorDefectPredictiveModule
          selectedCorridorId={selectedCorridorId}
          onSelectCorridor={(corr) => setSelectedCorridorId(corr)}
          onNavigateToTimeline={onNavigateToBlockTimeline}
        />
      )}

      {/* TOPOLOGICAL SCHEMATIC CARD */}
      {(activeViewMode === 'INTEGRATED' || activeViewMode === 'TOPOLOGY_ONLY') && (
        <>
          <div className="bg-[#0a1020] p-6 rounded-xl border border-sky-950/80 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Railway Section Network Schematic
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Click any section to filter both topology details & predictive maintenance forecasts
              </span>
            </div>

            {/* Schematic Layout Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* C001 Route */}
          <div
            onClick={() => setSelectedCorridorId('C001')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedCorridorId === 'C001'
                ? 'bg-blue-950/50 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300">C001: Main Trunk Route</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                UTIL: 75%
              </span>
            </div>
            <div className="my-3 flex items-center justify-between text-slate-300 px-2 py-2 bg-slate-950/60 rounded border border-slate-800">
              <span className="font-bold text-slate-100">STATION A</span>
              <span className="text-slate-500 flex-1 text-center font-bold tracking-widest text-sky-400">
                ━━━━ C001 (142 KM) ━━━━
              </span>
              <span className="font-bold text-slate-100">STATION B</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Double Track 25kV Electrified</span>
              <span>130 km/h Max Speed</span>
            </div>
          </div>

          {/* C002 Route */}
          <div
            onClick={() => setSelectedCorridorId('C002')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedCorridorId === 'C002'
                ? 'bg-blue-950/50 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300">C002: High-Speed Passenger</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                UTIL: 83%
              </span>
            </div>
            <div className="my-3 flex items-center justify-between text-slate-300 px-2 py-2 bg-slate-950/60 rounded border border-slate-800">
              <span className="font-bold text-slate-100">STATION A</span>
              <span className="text-slate-500 flex-1 text-center font-bold tracking-widest text-purple-400">
                ━━━━ C002 (98 KM) ━━━━
              </span>
              <span className="font-bold text-slate-100">STATION C</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Double Track Auto-Signaled</span>
              <span>160 km/h (Vande Bharat)</span>
            </div>
          </div>

          {/* C003 Route */}
          <div
            onClick={() => setSelectedCorridorId('C003')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedCorridorId === 'C003'
                ? 'bg-blue-950/50 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300">C003: Mixed Traffic Link</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                2 CONFLICTS ⚠
              </span>
            </div>
            <div className="my-3 flex items-center justify-between text-slate-300 px-2 py-2 bg-slate-950/60 rounded border border-slate-800">
              <span className="font-bold text-slate-100">STATION B</span>
              <span className="text-slate-500 flex-1 text-center font-bold tracking-widest text-amber-400">
                ━━━━ C003 (165 KM) ━━━━
              </span>
              <span className="font-bold text-slate-100">STATION D</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Single Track with Passing Loops</span>
              <span>110 km/h Heavy Freight</span>
            </div>
          </div>

          {/* C004 Route */}
          <div
            onClick={() => setSelectedCorridorId('C004')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedCorridorId === 'C004'
                ? 'bg-blue-950/50 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300">C004: Southern Industrial Branch</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                2 CONFLICTS ⚠
              </span>
            </div>
            <div className="my-3 flex items-center justify-between text-slate-300 px-2 py-2 bg-slate-950/60 rounded border border-slate-800">
              <span className="font-bold text-slate-100">STATION C</span>
              <span className="text-slate-500 flex-1 text-center font-bold tracking-widest text-cyan-400">
                ━━━━ C004 (115 KM) ━━━━
              </span>
              <span className="font-bold text-slate-100">STATION D</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Double Track Mineral Corridor</span>
              <span>100 km/h Mixed Freight</span>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTED CORRIDOR DRILLDOWN DETAILS */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-sky-300 font-mono">
                {selectedCorridor.id}: {selectedCorridor.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-sky-200 border border-blue-800">
                ACTIVE FOCUS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Section span: {selectedCorridor.fromStation} to {selectedCorridor.toStation} | Length: {selectedCorridor.lengthKm} KM | Max Speed: {selectedCorridor.maxSpeedKmph} km/h
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Utilization:</span>
              <span className="font-bold text-slate-200">{selectedCorridor.utilization}%</span>
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${selectedCorridor.utilization}%` }}
                ></div>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Heatmap Mode:</span>
              {heatmapMode === 'SEVERITY' ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Severity-based</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Repair Duration-based</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Detail Columns for Corridor: Blocks, Trains, Conflicts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs font-mono">
          {/* Column 1: Scheduled Blocks */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-bold">
              <span className="text-sky-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Scheduled Blocks ({corridorBlocks.length})
              </span>
              <span className="text-slate-400 text-[10px]">
                {selectedCorridor.availableSlots} SLOTS
              </span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {corridorBlocks.map((b, idx) => (
                <div
                  key={`${b.blockId}-${idx}`}
                  className={`p-2 rounded border text-[11px] ${
                    b.hasConflict
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>{b.blockId} ({b.assetId})</span>
                    <span>{b.startTime}–{b.endTime}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{b.department}</span>
                    <span className={b.hasConflict ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {b.hasConflict ? '⚠ OVERLAP' : 'VALID'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Scheduled Trains */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-bold">
              <span className="text-purple-300 flex items-center gap-1.5">
                <TrainIcon className="w-3.5 h-3.5" />
                Trains on Corridor ({corridorTrains.length})
              </span>
              <span className="text-slate-400 text-[10px]">TIMETABLE</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {corridorTrains.slice(0, 8).map((t, idx) => (
                <div
                  key={`${t.trainNumber}-${idx}`}
                  className={`p-2 rounded border text-[11px] ${
                    t.conflictWithBlockId
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>{t.trainNumber} - {t.trainName}</span>
                    <span>{t.arrivalTime}–{t.departureTime}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{t.category}</span>
                    <span className={t.conflictWithBlockId ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {t.conflictWithBlockId ? '⚠ CONFLICT' : t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Active Conflicts on Corridor */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-bold">
              <span className="text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Active Conflicts ({corridorConflicts.length})
              </span>
              <span className="text-rose-400 text-[10px]">CRITICAL</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {corridorConflicts.length > 0 ? (
                corridorConflicts.map((c) => (
                  <div
                    key={c.conflictId}
                    className="p-2.5 rounded bg-rose-950/50 border border-rose-800/80 text-[11px] space-y-1.5"
                  >
                    <div className="flex justify-between font-bold text-rose-200">
                      <span>{c.blockId} ↔ {c.trainNumber}</span>
                      <span className="text-amber-300">{c.maintenanceInterval}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-normal">
                      {c.description}
                    </p>
                    <button
                      onClick={() => onNavigateToConflict(c.blockId)}
                      className="w-full py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-semibold text-[10px] flex items-center justify-center gap-1"
                    >
                      <span>Find Alternative Slot</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  No open conflicts on corridor {selectedCorridor.id}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
