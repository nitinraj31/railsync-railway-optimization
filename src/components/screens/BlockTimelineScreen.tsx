import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Train as TrainIcon,
  Wrench,
  AlertTriangle,
  Info,
  Clock,
  X,
  ArrowRight,
  Filter,
  CheckCircle2,
  Zap,
  CloudRain,
  ShieldCheck,
  MoveHorizontal,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { OptimizedBlock, Train, Corridor } from '../../types';

interface BlockTimelineScreenProps {
  blocks: OptimizedBlock[];
  trains: Train[];
  corridors: Corridor[];
  onNavigateToConflict: (blockId?: string) => void;
}

export const BlockTimelineScreen: React.FC<BlockTimelineScreenProps> = ({
  blocks,
  trains,
  corridors,
  onNavigateToConflict,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('ALL');
  const [selectedBlock, setSelectedBlock] = useState<OptimizedBlock | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);

  // Operational Layers State
  const [showOheLayer, setShowOheLayer] = useState<boolean>(true);
  const [showMonsoonLayer, setShowMonsoonLayer] = useState<boolean>(true);

  // Interactive block timeline adjustments (offset in minutes)
  const [blockAdjustments, setBlockAdjustments] = useState<Record<string, number>>({});

  // Timeline hours from 08:00 to 20:00 (12 hours)
  const startHour = 8;
  const endHour = 20;
  const totalMinutes = (endHour - startHour) * 60; // 720 minutes

  // Helper to convert HH:MM to minute offset from 08:00
  const getMinutesFromStart = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m;
    const offset = total - startHour * 60;
    return Math.max(0, Math.min(totalMinutes, offset));
  };

  // Helper to format minute offset back to HH:MM
  const formatOffsetToTime = (timeStr: string, offsetMins: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    let total = h * 60 + m + offsetMins;
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <CalendarClock className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Gantt Corridor Schedule Timeline (08:00 – 20:00)
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 5 / DUAL-AXIS TIMELINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualizes simultaneous train timetables vs maintenance blocks across Corridors C001–C004. Overlapping train-block collisions are highlighted.
            </p>
          </div>

          {/* Filter Corridor */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Filter Corridor:</span>
            <select
              value={selectedCorridorId}
              onChange={(e) => setSelectedCorridorId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Corridors (C001–C004)</option>
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend & Operations Layers Bar */}
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
            <span className="text-slate-300">S&T Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-600"></span>
            <span className="text-slate-300">Traction Block</span>
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

      {/* Main Gantt Grid */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-lg space-y-6 overflow-x-auto">
        {/* Time Header Ruler */}
        <div className="min-w-[900px]">
          <div className="flex border-b border-slate-700 pb-2 pl-40">
            {hourLabels.map((h, i) => (
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
              const corridorBlocks = blocks.filter((b) => b.corridorId === corridor.id);
              const corridorTrains = trains.filter((t) => t.corridorId === corridor.id);

              return (
                <div
                  key={corridor.id}
                  className="rounded-lg bg-slate-900/60 border border-slate-800 p-3 space-y-2 hover:border-slate-700 transition-colors"
                >
                  {/* Corridor Header */}
                  <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                        {corridor.id}
                      </span>
                      <span className="font-semibold text-slate-200">{corridor.name}</span>
                      <span className="text-[11px] text-slate-400">
                        ({corridor.fromStation} ↔ {corridor.toStation}, {corridor.trackType})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-400">
                        Speed: <strong className="text-slate-200">{corridor.maxSpeedKmph} km/h</strong>
                      </span>
                      <span className="text-slate-400">
                        Blocks:{' '}
                        <strong className="text-sky-300">{corridorBlocks.length}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Operational Layer: 25kV OHE TRACTION INTERLOCKING RIBBON */}
                  {showOheLayer && (
                    <div className="flex items-center text-xs bg-amber-950/20 rounded border border-amber-900/40 px-1 py-1">
                      <div className="w-40 font-mono text-[10px] text-amber-400 font-semibold flex items-center gap-1.5 shrink-0 pl-1">
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
                          Interlocked with S&T Point Machines
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Operational Layer: MONSOON SPEED RESTRICTION RIBBON */}
                  {showMonsoonLayer && (
                    <div className="flex items-center text-xs bg-sky-950/20 rounded border border-sky-900/40 px-1 py-1">
                      <div className="w-40 font-mono text-[10px] text-sky-400 font-semibold flex items-center gap-1.5 shrink-0 pl-1">
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
                    <div className="w-40 font-mono text-[11px] text-indigo-300 font-semibold flex items-center gap-1.5 shrink-0">
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

                  {/* Sub-row 2: MAINTENANCE BLOCKS (WITH TIME-SHIFT ADJUSTMENT SUPPORT) */}
                  <div className="flex items-center text-xs">
                    <div className="w-40 font-mono text-[11px] text-sky-300 font-semibold flex items-center gap-1.5 shrink-0">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Blocks</span>
                    </div>
                    <div className="flex-1 relative h-9 bg-slate-950/80 rounded border border-slate-800 overflow-hidden">
                      {/* Grid vertical guide lines */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-800/40">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i}></div>
                        ))}
                      </div>

                      {/* Render Maintenance Blocks */}
                      {corridorBlocks.map((block, idx) => {
                        const effective = getEffectiveBlockTime(block);
                        const left = getLeftPercent(effective.startTime);
                        const width = getWidthPercent(effective.startTime, effective.endTime);

                        let bgClass = 'bg-amber-600/90 hover:bg-amber-500';
                        if (block.department === 'S&T') bgClass = 'bg-emerald-600/90 hover:bg-emerald-500';
                        else if (block.department === 'TRACTION') bgClass = 'bg-cyan-600/90 hover:bg-cyan-500';

                        return (
                          <div
                            key={`${block.blockId}-${idx}`}
                            onClick={() => setSelectedBlock(block)}
                            className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center justify-between text-[10px] font-mono text-white cursor-pointer shadow-md transition-all ${bgClass} ${
                              block.hasConflict
                                ? 'ring-2 ring-rose-500 border border-rose-300 animate-pulse'
                                : 'border border-white/20'
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span className="truncate font-bold tracking-tight">
                              {block.blockId} ({block.assetId})
                              {effective.offset !== 0 && (
                                <span className="ml-1 text-[9px] px-1 rounded bg-black/60 text-amber-200">
                                  {effective.offset > 0 ? `+${effective.offset}m` : `${effective.offset}m`}
                                </span>
                              )}
                            </span>
                            {block.hasConflict && (
                              <span className="text-[9px] bg-rose-950 text-rose-200 px-1 py-0.2 rounded font-black ml-1 border border-rose-400">
                                ⚠ OVERLAP
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

      {/* BLOCK DETAIL POPOVER MODAL WITH INTERACTIVE SHIFT CONTROLS */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e162c] border border-sky-800/80 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-950/80 bg-[#0a1020]">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Block Details: {selectedBlock.blockId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-mono">
              {(() => {
                const effective = getEffectiveBlockTime(selectedBlock);
                return (
                  <>
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
                        <span className="text-slate-400 text-[10px] block">Effective Start</span>
                        <span className="text-slate-200 font-bold text-sky-300">{effective.startTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Effective End</span>
                        <span className="text-slate-200 font-bold text-sky-300">{effective.endTime}</span>
                      </div>
                    </div>

                    {/* Interactive Timeline Shift Controls */}
                    <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5" />
                          Interactive Timeline Slot Shift:
                        </span>
                        {effective.offset !== 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                            Shifted: {effective.offset > 0 ? `+${effective.offset} min` : `${effective.offset} min`}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Adjust block start time interactively to simulate clearance from conflicting train paths.
                      </p>
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
                    This block intersects with train traffic on corridor {selectedBlock.corridorId}. Use the Conflict & Resolution Center to find alternative slots or use the shift buttons above.
                  </p>
                )}
              </div>

              {/* Rationale */}
              {selectedBlock.aiReasoning && (
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block mb-1">
                    AI Planning Rationale:
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {selectedBlock.aiReasoning.selectionRationale}
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
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Resolve in Conflict Center</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setSelectedBlock(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
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
                    Conflicting Maintenance Block ID: <strong>{selectedTrain.conflictWithBlockId}</strong>. Train priority requires maintenance block rescheduling.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-[#0a1020] flex justify-end">
              <button
                onClick={() => setSelectedTrain(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
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
