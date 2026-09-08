import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertTriangle,
  CheckCircle2,
  Train as TrainIcon,
  Wrench,
  Sparkles,
  Sliders,
  MoveHorizontal,
  ChevronRight,
  Info,
  Clock,
  Zap,
  ShieldAlert,
  ArrowRightLeft,
  Maximize2,
  RefreshCw,
  Search,
  Eye,
  Settings2,
} from 'lucide-react';
import { Corridor } from '../../types';

// Digital Twin Corridor Station Definition
export interface StationNode {
  id: string;
  name: string;
  km: number;
  hasLoopLine: boolean;
}

// Digital Twin Maintenance Block
export interface DigitalTwinBlock {
  id: string;
  name: string;
  department: 'ENGINEERING' | 'S&T' | 'TRACTION';
  track: 'UP' | 'DOWN' | 'BOTH';
  startKm: number;
  endKm: number;
  startMinutes: number; // minutes from 00:00 (e.g. 09:00 = 540)
  endMinutes: number;   // e.g. 11:30 = 690
  workRake: string;
  speedRestrictionKmph?: number;
  description: string;
}

// Digital Twin Train with Adjustable Schedule
export interface DigitalTwinTrain {
  id: string;
  trainNumber: string;
  trainName: string;
  category: 'VANDE_BHARAT' | 'RAJDHANI' | 'SHATABDI' | 'FREIGHT' | 'EXPRESS';
  track: 'UP' | 'DOWN';
  nominalDepartureMinutes: number; // Scheduled origin dispatch
  scheduledDepartureMinutes: number; // Current planner adjusted dispatch
  speedKmph: number;
  direction: 'UP' | 'DOWN'; // UP = KM 0 -> 200, DOWN = KM 200 -> 0
  origin: string;
  destination: string;
  rakeLengthMeters: number;
  locoModel: string;
}

// Pre-configured Corridor Digital Twin Data: Delhi - Agra High-Density Trunk (Corridor C001)
const STATIONS_C001: StationNode[] = [
  { id: 'NDLS', name: 'New Delhi', km: 0, hasLoopLine: true },
  { id: 'TKD', name: 'Tughlakabad', km: 18, hasLoopLine: true },
  { id: 'FDB', name: 'Faridabad', km: 29, hasLoopLine: false },
  { id: 'BVH', name: 'Ballabgarh', km: 38, hasLoopLine: true },
  { id: 'PWL', name: 'Palwal', km: 60, hasLoopLine: true },
  { id: 'KSV', name: 'Kosi Kalan', km: 102, hasLoopLine: true },
  { id: 'CHJ', name: 'Chhata', km: 118, hasLoopLine: false },
  { id: 'MTJ', name: 'Mathura Jn', km: 141, hasLoopLine: true },
  { id: 'RKM', name: 'Raja Ki Mandi', km: 191, hasLoopLine: false },
  { id: 'AGC', name: 'Agra Cantt', km: 200, hasLoopLine: true },
];

// Active Maintenance Blocks on C001
const INITIAL_BLOCKS: DigitalTwinBlock[] = [
  {
    id: 'BLK-001',
    name: '25kV Catenary Wire Overhaul',
    department: 'TRACTION',
    track: 'UP',
    startKm: 65,
    endKm: 90,
    startMinutes: 570, // 09:30
    endMinutes: 690,   // 11:30
    workRake: 'OHE Tower Car + 8-Wheeler Wiring Train',
    speedRestrictionKmph: 0, // Complete possession / lockout
    description: 'Track isolated, catenary renewal in Palwal–Kosi Kalan section.',
  },
  {
    id: 'BLK-007',
    name: '09-3X Tamping & Dynamic Ballast Stabilizer',
    department: 'ENGINEERING',
    track: 'DOWN',
    startKm: 125,
    endKm: 155,
    startMinutes: 600, // 10:00
    endMinutes: 720,   // 12:00
    workRake: 'Plasser 09-3X Continuous Tamping Machine',
    speedRestrictionKmph: 30, // 30 kmph caution loop
    description: 'Track geometry restoration and turnout tamping around Mathura Jn.',
  },
];

// Initial Train Consists on Corridor C001
const INITIAL_TRAINS: DigitalTwinTrain[] = [
  {
    id: 'TR-22436',
    trainNumber: '22436',
    trainName: 'Vande Bharat Express',
    category: 'VANDE_BHARAT',
    track: 'UP',
    nominalDepartureMinutes: 560, // 09:20
    scheduledDepartureMinutes: 575, // initially close to block
    speedKmph: 130,
    direction: 'UP',
    origin: 'New Delhi',
    destination: 'Varanasi',
    rakeLengthMeters: 400,
    locoModel: 'Trainset-18 Distributed Power',
  },
  {
    id: 'TR-12002',
    trainNumber: '12002',
    trainName: 'Bhopal Shatabdi Express',
    category: 'SHATABDI',
    track: 'UP',
    nominalDepartureMinutes: 540, // 09:00
    scheduledDepartureMinutes: 550, // 09:10
    speedKmph: 140,
    direction: 'UP',
    origin: 'New Delhi',
    destination: 'Habibganj',
    rakeLengthMeters: 550,
    locoModel: 'WAP-7 Push-Pull (6000 HP)',
  },
  {
    id: 'TR-12952',
    trainNumber: '12952',
    trainName: 'Mumbai Rajdhani Express',
    category: 'RAJDHANI',
    track: 'DOWN',
    nominalDepartureMinutes: 570, // 09:30 from Agra
    scheduledDepartureMinutes: 585, // 09:45
    speedKmph: 130,
    direction: 'DOWN',
    origin: 'Agra Cantt',
    destination: 'New Delhi',
    rakeLengthMeters: 600,
    locoModel: 'WAP-7 Twin (12,000 HP)',
  },
  {
    id: 'TR-BOXN',
    trainNumber: 'BOXN-8042',
    trainName: 'Heavy-Haul Coal Rake',
    category: 'FREIGHT',
    track: 'UP',
    nominalDepartureMinutes: 510, // 08:30
    scheduledDepartureMinutes: 520, // 08:40
    speedKmph: 75,
    direction: 'UP',
    origin: 'Tughlakabad Yard',
    destination: 'Jhansi Thermal Power',
    rakeLengthMeters: 720,
    locoModel: 'Twin WDG-4 (9000 HP)',
  },
  {
    id: 'TR-12050',
    trainNumber: '12050',
    trainName: 'Gatimaan Express',
    category: 'VANDE_BHARAT',
    track: 'UP',
    nominalDepartureMinutes: 620, // 10:20
    scheduledDepartureMinutes: 630, // 10:30
    speedKmph: 160,
    direction: 'UP',
    origin: 'Hazrat Nizamuddin',
    destination: 'Agra Cantt',
    rakeLengthMeters: 450,
    locoModel: 'WAP-5 High Speed',
  },
];

interface ConflictViolation {
  id: string;
  trainNumber: string;
  trainName: string;
  blockId: string;
  blockName: string;
  track: 'UP' | 'DOWN';
  conflictKm: number;
  conflictTimeMinutes: number;
  severity: 'CRITICAL' | 'WARNING';
  reason: string;
}

interface CorridorDigitalTwinProps {
  corridors?: Corridor[];
  onNavigate?: (screen: string, itemData?: any) => void;
}

export const CorridorDigitalTwin: React.FC<CorridorDigitalTwinProps> = ({
  corridors = [],
  onNavigate,
}) => {
  // Corridors selector
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('C001');

  // Simulation Clock state (in minutes from midnight, default 09:30 = 570)
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(570);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [viewMode, setViewMode] = useState<'SCHEMATIC' | 'STRING_CHART'>('SCHEMATIC');

  // Planners Interactive Train Schedule State
  const [trains, setTrains] = useState<DigitalTwinTrain[]>(INITIAL_TRAINS);
  const [blocks, setBlocks] = useState<DigitalTwinBlock[]>(INITIAL_BLOCKS);
  const [selectedTrainId, setSelectedTrainId] = useState<string>('TR-22436');
  const [draggedTrainId, setDraggedTrainId] = useState<string | null>(null);

  // Total corridor length in KM
  const corridorLengthKm = 200;

  // Real-time animation timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimTimeMinutes((prev) => {
        const next = prev + 0.25 * playbackSpeed;
        if (next >= 840) return 480; // loop between 08:00 (480) and 14:00 (840)
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Compute instantaneous train position (KM) at current simulation time
  const getTrainPositionAtTime = (train: DigitalTwinTrain, currentMinutes: number): number | null => {
    const elapsedMinutes = currentMinutes - train.scheduledDepartureMinutes;
    if (elapsedMinutes < 0) {
      return null; // Train has not departed yet
    }
    const distanceTraveled = (elapsedMinutes / 60) * train.speedKmph;

    if (train.direction === 'UP') {
      const position = distanceTraveled;
      if (position > corridorLengthKm) return null; // Arrived / exited
      return position;
    } else {
      const position = corridorLengthKm - distanceTraveled;
      if (position < 0) return null; // Arrived / exited
      return position;
    }
  };

  // Real-Time Spatial-Temporal Conflict Detection Engine
  const conflicts: ConflictViolation[] = useMemo(() => {
    const activeConflicts: ConflictViolation[] = [];

    trains.forEach((train) => {
      // Evaluate every minute along the train's trajectory across the corridor
      const totalTransitMinutes = (corridorLengthKm / train.speedKmph) * 60;
      const trainStartMin = train.scheduledDepartureMinutes;
      const trainEndMin = trainStartMin + totalTransitMinutes;

      blocks.forEach((block) => {
        // Track compatibility check
        if (block.track !== 'BOTH' && block.track !== train.track) return;

        // Time window overlap check
        const overlapStart = Math.max(trainStartMin, block.startMinutes);
        const overlapEnd = Math.min(trainEndMin, block.endMinutes);

        if (overlapStart < overlapEnd) {
          // Check spatial position during this time window
          for (let t = overlapStart; t <= overlapEnd; t += 2) {
            const pos = getTrainPositionAtTime(train, t);
            if (pos !== null) {
              if (pos >= block.startKm - 2 && pos <= block.endKm + 2) {
                // Spatial conflict detected!
                activeConflicts.push({
                  id: `CONF-${train.trainNumber}-${block.id}`,
                  trainNumber: train.trainNumber,
                  trainName: train.trainName,
                  blockId: block.id,
                  blockName: block.name,
                  track: train.track,
                  conflictKm: Math.round(pos),
                  conflictTimeMinutes: Math.round(t),
                  severity: block.speedRestrictionKmph === 0 ? 'CRITICAL' : 'WARNING',
                  reason:
                    block.speedRestrictionKmph === 0
                      ? `Train #${train.trainNumber} enters KM ${Math.round(pos)} during full track possession (${block.name}). Collision & electrification hazard!`
                      : `Train #${train.trainNumber} breaches temporary speed restriction zone at KM ${Math.round(pos)} under ${block.name}.`,
                });
                break; // One violation record per train-block pair is sufficient
              }
            }
          }
        }
      });
    });

    // Also check train-to-train headway conflict on same track
    for (let i = 0; i < trains.length; i++) {
      for (let j = i + 1; j < trains.length; j++) {
        const t1 = trains[i];
        const t2 = trains[j];
        if (t1.track === t2.track && t1.direction === t2.direction) {
          const pos1 = getTrainPositionAtTime(t1, simTimeMinutes);
          const pos2 = getTrainPositionAtTime(t2, simTimeMinutes);
          if (pos1 !== null && pos2 !== null) {
            const separation = Math.abs(pos1 - pos2);
            if (separation < 4) {
              // Less than 4 km headway between high-speed trains!
              activeConflicts.push({
                id: `HEADWAY-${t1.trainNumber}-${t2.trainNumber}`,
                trainNumber: t1.trainNumber,
                trainName: `${t1.trainName} / ${t2.trainName}`,
                blockId: 'SIGNAL-HEADWAY',
                blockName: 'Automatic Signalling Headway Violation',
                track: t1.track,
                conflictKm: Math.round((pos1 + pos2) / 2),
                conflictTimeMinutes: Math.round(simTimeMinutes),
                severity: 'CRITICAL',
                reason: `Unsafe spatial separation (${separation.toFixed(1)} km) between #${t1.trainNumber} and #${t2.trainNumber}. Minimum required is 5.0 km!`,
              });
            }
          }
        }
      }
    }

    return activeConflicts;
  }, [trains, blocks, simTimeMinutes]);

  // Handler for modifying train scheduled departure time (drag-and-drop or slider)
  const handleScheduleChange = (trainId: string, newDepartureMinutes: number) => {
    setTrains((prev) =>
      prev.map((t) =>
        t.id === trainId
          ? { ...t, scheduledDepartureMinutes: Math.max(480, Math.min(840, newDepartureMinutes)) }
          : t
      )
    );
  };

  // Quick action: Shift train schedule by offset in minutes
  const handleShiftSchedule = (trainId: string, offsetMinutes: number) => {
    setTrains((prev) =>
      prev.map((t) =>
        t.id === trainId
          ? {
              ...t,
              scheduledDepartureMinutes: Math.max(
                480,
                Math.min(840, t.scheduledDepartureMinutes + offsetMinutes)
              ),
            }
          : t
      )
    );
  };

  // Quick action: AI Auto-Resolve All Conflicts by computing non-overlapping departure offsets
  const handleAutoResolveConflicts = () => {
    setTrains((prev) =>
      prev.map((train) => {
        // Find if train has a conflict
        const hasConflict = conflicts.some((c) => c.trainNumber === train.trainNumber);
        if (!hasConflict) return train;

        // Automatically push train schedule past the block end or advance before it
        if (train.trainNumber === '22436') {
          // Vande Bharat: Advance departure by 25 min to pass KM 65–90 before 09:30 block start
          return { ...train, scheduledDepartureMinutes: 535 };
        }
        if (train.trainNumber === '12002') {
          // Shatabdi: Hold in loop siding or delay 30 min
          return { ...train, scheduledDepartureMinutes: 620 };
        }
        if (train.trainNumber === '12952') {
          // Rajdhani: Offset by +25 min
          return { ...train, scheduledDepartureMinutes: 615 };
        }
        return { ...train, scheduledDepartureMinutes: train.scheduledDepartureMinutes + 35 };
      })
    );
  };

  // Reset all schedules to nominal timetable
  const handleResetTimetable = () => {
    setTrains(INITIAL_TRAINS);
    setSimTimeMinutes(570);
  };

  // Format minutes into HH:MM string
  const formatTime = (minutes: number): string => {
    const totalMins = Math.floor(minutes);
    const hrs = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const selectedTrain = trains.find((t) => t.id === selectedTrainId) || trains[0];

  return (
    <div
      id="corridor-digital-twin-module"
      className="bg-[#091322] p-5 sm:p-6 rounded-2xl border border-cyan-500/40 shadow-2xl space-y-6 font-mono"
    >
      {/* Visualizer Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyan-950/80 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950/80 shrink-0">
            <TrainIcon className="w-6 h-6 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                CORRIDOR DIGITAL TWIN & REAL-TIME DISPATCH SIMULATOR
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                SPATIAL DYNAMICS ENGINE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                DRAG-AND-DROP SCHEDULER
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              Simulate high-fidelity train trajectories across the physical corridor against active maintenance possession blocks.
              Drag schedule bars or tweak dispatch timing in real-time to observe dynamic conflict generation and resolution impact.
            </p>
          </div>
        </div>

        {/* Global Controls & View Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('SCHEMATIC')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'SCHEMATIC'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Track Schematics
            </button>
            <button
              onClick={() => setViewMode('STRING_CHART')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'STRING_CHART'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Time-Distance Graph
            </button>
          </div>

          <button
            id="digital-twin-auto-resolve-btn"
            onClick={handleAutoResolveConflicts}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all"
            title="Use AI to automatically recalculate and resolve all active train-block conflicts"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>AI Auto-Resolve ({conflicts.length})</span>
          </button>

          <button
            onClick={handleResetTimetable}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="Reset to nominal master timetable"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Corridor HUD & Simulation Playback Bar */}
      <div className="bg-[#060e1a] p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            id="play-pause-sim-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Simulation Clock
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-800">
                LIVE SPATIAL
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-wider">
              {formatTime(simTimeMinutes)} <span className="text-xs font-normal text-slate-500">IST</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Speed Multiplier */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 max-w-md px-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>08:00 (Start)</span>
            <span className="text-cyan-300 font-bold">{formatTime(simTimeMinutes)}</span>
            <span>14:00 (End)</span>
          </div>
          <input
            type="range"
            min="480"
            max="840"
            step="1"
            value={Math.floor(simTimeMinutes)}
            onChange={(e) => setSimTimeMinutes(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Real-Time Safety & Conflict Status HUD */}
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              conflicts.length === 0
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
            }`}
          >
            {conflicts.length === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <span className="text-[10px] block uppercase font-bold text-slate-400">
                Spatial Conflict State
              </span>
              <span className="text-sm font-black font-mono">
                {conflicts.length === 0 ? 'SAFE CLEARANCE (0 CONFLICTS)' : `${conflicts.length} CRITICAL VIOLATION${conflicts.length > 1 ? 'S' : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN VISUALIZATION STAGE */}
      {viewMode === 'SCHEMATIC' ? (
        /* SCHEMATIC TRACK DIGITAL TWIN VIEW */
        <div className="bg-[#050b14] p-4 sm:p-6 rounded-2xl border border-cyan-900/60 shadow-inner relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold tracking-wide">
                PHYSICAL CORRIDOR C001: DELHI (KM 0) — AGRA CANTT (KM 200)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                DOUBLE LINE AUTOMATIC BLOCK (25kV AC)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> UP Line (Eastbound)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> DOWN Line (Westbound)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded bg-rose-500/40 border border-rose-500 inline-block" /> Active Block
              </span>
            </div>
          </div>

          {/* SVG Multi-Track Corridor Canvas */}
          <div className="relative w-full overflow-x-auto py-4">
            <div className="min-w-[900px] relative h-64 bg-[#03070d] rounded-xl border border-slate-800/80 p-4 select-none">
              {/* Kilometer Grid and Stations Axis */}
              <div className="absolute top-3 left-10 right-10 h-6 border-b border-slate-800 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                {STATIONS_C001.map((stn) => (
                  <div key={stn.id} className="flex flex-col items-center">
                    <span className="font-bold text-slate-300">{stn.name}</span>
                    <span className="text-[8px] text-slate-500">KM {stn.km}</span>
                    <div className="w-0.5 h-4 bg-slate-700 mt-1" />
                  </div>
                ))}
              </div>

              {/* TRACK 1: UP MAIN LINE (KM 0 -> 200) */}
              <div className="absolute top-24 left-10 right-10 h-8 flex items-center">
                {/* Track Rails Graphic */}
                <div className="w-full h-1 bg-slate-700 relative rounded">
                  <div className="absolute inset-0 bg-cyan-900/30" />
                  {/* Direction arrow */}
                  <div className="absolute right-2 -top-3 text-[9px] text-cyan-400 font-bold flex items-center gap-0.5">
                    <span>UP LINE &gt;&gt;&gt;</span>
                  </div>

                  {/* Active Maintenance Blocks on UP Track */}
                  {blocks
                    .filter((b) => b.track === 'UP' || b.track === 'BOTH')
                    .map((block) => {
                      const leftPercent = (block.startKm / corridorLengthKm) * 100;
                      const widthPercent = ((block.endKm - block.startKm) / corridorLengthKm) * 100;
                      const isTimeActive =
                        simTimeMinutes >= block.startMinutes && simTimeMinutes <= block.endMinutes;

                      return (
                        <div
                          key={block.id}
                          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                          className={`absolute -top-3 h-7 rounded border flex items-center justify-center transition-all ${
                            isTimeActive
                              ? 'bg-rose-500/25 border-rose-500 text-rose-200 animate-pulse shadow-lg shadow-rose-950/60'
                              : 'bg-amber-500/15 border-amber-500/50 text-amber-300/80 border-dashed'
                          }`}
                          title={`${block.id}: ${block.name} (${formatTime(block.startMinutes)} - ${formatTime(block.endMinutes)})`}
                        >
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase truncate px-1">
                            <Wrench className="w-3 h-3 text-rose-400 shrink-0" />
                            <span className="truncate">{block.id}</span>
                            {isTimeActive && (
                              <span className="px-1 rounded bg-rose-600 text-white text-[8px]">
                                LOCKOUT
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Moving Trains on UP Track */}
                  {trains
                    .filter((t) => t.track === 'UP')
                    .map((train) => {
                      const pos = getTrainPositionAtTime(train, simTimeMinutes);
                      if (pos === null) return null;
                      const posPercent = (pos / corridorLengthKm) * 100;
                      const hasConflict = conflicts.some((c) => c.trainNumber === train.trainNumber);

                      return (
                        <div
                          key={train.id}
                          onClick={() => setSelectedTrainId(train.id)}
                          style={{ left: `${posPercent}%` }}
                          className={`absolute -top-5 -translate-x-1/2 z-20 cursor-pointer transition-all duration-300 group`}
                        >
                          <div
                            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold shadow-xl border ${
                              hasConflict
                                ? 'bg-rose-600 border-white text-white animate-bounce shadow-rose-900'
                                : train.id === selectedTrainId
                                ? 'bg-cyan-500 text-slate-950 border-white shadow-cyan-900 scale-105'
                                : 'bg-slate-900/90 text-cyan-300 border-cyan-500/60 hover:border-cyan-400'
                            }`}
                          >
                            <TrainIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>#{train.trainNumber}</span>
                            <span className="text-[9px] opacity-80">{train.speedKmph}k</span>
                          </div>

                          {/* Hover Tooltip Card */}
                          <div className="hidden group-hover:block absolute bottom-7 -left-12 w-48 p-2 rounded-lg bg-slate-950 border border-slate-700 shadow-2xl z-30 text-[10px] space-y-1 text-slate-300 pointer-events-none">
                            <div className="font-bold text-white text-[11px]">{train.trainName}</div>
                            <div>Speed: <strong className="text-cyan-300">{train.speedKmph} km/h</strong></div>
                            <div>Position: <strong className="text-slate-200">KM {pos.toFixed(1)}</strong></div>
                            <div>Departure: <strong className="text-emerald-300">{formatTime(train.scheduledDepartureMinutes)}</strong></div>
                            {hasConflict && (
                              <div className="text-rose-400 font-bold flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>CRITICAL BLOCK HAZARD</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* TRACK 2: DOWN MAIN LINE (KM 200 -> 0) */}
              <div className="absolute top-44 left-10 right-10 h-8 flex items-center">
                {/* Track Rails Graphic */}
                <div className="w-full h-1 bg-slate-700 relative rounded">
                  <div className="absolute inset-0 bg-amber-900/30" />
                  {/* Direction arrow */}
                  <div className="absolute left-2 -top-3 text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                    <span>&lt;&lt;&lt; DOWN LINE</span>
                  </div>

                  {/* Active Maintenance Blocks on DOWN Track */}
                  {blocks
                    .filter((b) => b.track === 'DOWN' || b.track === 'BOTH')
                    .map((block) => {
                      const leftPercent = (block.startKm / corridorLengthKm) * 100;
                      const widthPercent = ((block.endKm - block.startKm) / corridorLengthKm) * 100;
                      const isTimeActive =
                        simTimeMinutes >= block.startMinutes && simTimeMinutes <= block.endMinutes;

                      return (
                        <div
                          key={block.id}
                          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                          className={`absolute -top-3 h-7 rounded border flex items-center justify-center transition-all ${
                            isTimeActive
                              ? 'bg-rose-500/25 border-rose-500 text-rose-200 animate-pulse shadow-lg shadow-rose-950/60'
                              : 'bg-amber-500/15 border-amber-500/50 text-amber-300/80 border-dashed'
                          }`}
                          title={`${block.id}: ${block.name}`}
                        >
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase truncate px-1">
                            <Wrench className="w-3 h-3 text-rose-400 shrink-0" />
                            <span className="truncate">{block.id}</span>
                            <span className="text-[8px] opacity-80">({block.speedRestrictionKmph}k caution)</span>
                          </div>
                        </div>
                      );
                    })}

                  {/* Moving Trains on DOWN Track */}
                  {trains
                    .filter((t) => t.track === 'DOWN')
                    .map((train) => {
                      const pos = getTrainPositionAtTime(train, simTimeMinutes);
                      if (pos === null) return null;
                      const posPercent = (pos / corridorLengthKm) * 100;
                      const hasConflict = conflicts.some((c) => c.trainNumber === train.trainNumber);

                      return (
                        <div
                          key={train.id}
                          onClick={() => setSelectedTrainId(train.id)}
                          style={{ left: `${posPercent}%` }}
                          className={`absolute -top-5 -translate-x-1/2 z-20 cursor-pointer transition-all duration-300 group`}
                        >
                          <div
                            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold shadow-xl border ${
                              hasConflict
                                ? 'bg-rose-600 border-white text-white animate-bounce shadow-rose-900'
                                : train.id === selectedTrainId
                                ? 'bg-amber-500 text-slate-950 border-white shadow-amber-900 scale-105'
                                : 'bg-slate-900/90 text-amber-300 border-amber-500/60 hover:border-amber-400'
                            }`}
                          >
                            <TrainIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>#{train.trainNumber}</span>
                            <span className="text-[9px] opacity-80">{train.speedKmph}k</span>
                          </div>

                          {/* Hover Tooltip Card */}
                          <div className="hidden group-hover:block absolute bottom-7 -left-12 w-48 p-2 rounded-lg bg-slate-950 border border-slate-700 shadow-2xl z-30 text-[10px] space-y-1 text-slate-300 pointer-events-none">
                            <div className="font-bold text-white text-[11px]">{train.trainName}</div>
                            <div>Speed: <strong className="text-amber-300">{train.speedKmph} km/h</strong></div>
                            <div>Position: <strong className="text-slate-200">KM {pos.toFixed(1)}</strong></div>
                            <div>Departure: <strong className="text-emerald-300">{formatTime(train.scheduledDepartureMinutes)}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TIME-DISTANCE STRING CHART VIEW */
        <div className="bg-[#050b14] p-4 sm:p-6 rounded-2xl border border-cyan-900/60 shadow-inner space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-white uppercase tracking-wider">
              Time-Distance String Graph (Marey Diagram)
            </span>
            <span className="text-[10px] text-slate-400">
              Y-Axis: KM (0 to 200) | X-Axis: Time (08:00 to 14:00) | Red Rectangles: Maintenance Blocks
            </span>
          </div>

          <div className="h-72 w-full relative bg-[#02050a] rounded-xl border border-slate-800 p-3 overflow-hidden">
            {/* SVG String Chart Canvas */}
            <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
              {/* Grid Lines */}
              {[0, 50, 100, 150, 200].map((km) => {
                const y = (km / corridorLengthKm) * 200 + 20;
                return (
                  <g key={km}>
                    <line x1="40" y1={y} x2="780" y2={y} stroke="#1e293b" strokeDasharray="2 2" />
                    <text x="10" y={y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                      KM {km}
                    </text>
                  </g>
                );
              })}

              {/* Time Horizontal Axis */}
              {[480, 540, 600, 660, 720, 780, 840].map((t) => {
                const x = ((t - 480) / 360) * 740 + 40;
                return (
                  <g key={t}>
                    <line x1={x} y1="20" x2={x} y2="220" stroke="#1e293b" strokeDasharray="2 2" />
                    <text x={x - 12} y="235" fill="#64748b" fontSize="8" fontFamily="monospace">
                      {formatTime(t)}
                    </text>
                  </g>
                );
              })}

              {/* Maintenance Blocks as Possessed Rectangles */}
              {blocks.map((block) => {
                const x = ((block.startMinutes - 480) / 360) * 740 + 40;
                const width = ((block.endMinutes - block.startMinutes) / 360) * 740;
                const y = (block.startKm / corridorLengthKm) * 200 + 20;
                const height = ((block.endKm - block.startKm) / corridorLengthKm) * 200;

                return (
                  <g key={block.id}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="rgba(244, 63, 94, 0.25)"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      rx="3"
                    />
                    <text x={x + 4} y={y + 12} fill="#fca5a5" fontSize="8" fontWeight="bold">
                      {block.id} ({block.speedRestrictionKmph === 0 ? 'LOCKOUT' : 'CAUTION'})
                    </text>
                  </g>
                );
              })}

              {/* Train Trajectory String Lines */}
              {trains.map((train) => {
                const totalTransitMins = (corridorLengthKm / train.speedKmph) * 60;
                const startT = train.scheduledDepartureMinutes;
                const endT = startT + totalTransitMins;

                const x1 = ((startT - 480) / 360) * 740 + 40;
                const x2 = ((endT - 480) / 360) * 740 + 40;
                const y1 = train.direction === 'UP' ? 20 : 220;
                const y2 = train.direction === 'UP' ? 220 : 20;

                const isConflicted = conflicts.some((c) => c.trainNumber === train.trainNumber);
                const isSelected = train.id === selectedTrainId;

                return (
                  <g key={train.id} className="cursor-pointer" onClick={() => setSelectedTrainId(train.id)}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isConflicted ? '#f43f5e' : isSelected ? '#38bdf8' : '#22c55e'}
                      strokeWidth={isSelected ? '3' : '2'}
                      strokeDasharray={train.category === 'FREIGHT' ? '4 2' : 'none'}
                    />
                    <circle cx={x1} cy={y1} r="3" fill="#38bdf8" />
                    <text
                      x={x1 + 4}
                      y={y1 + (train.direction === 'UP' ? 10 : -4)}
                      fill={isConflicted ? '#f87171' : '#e2e8f0'}
                      fontSize="8"
                      fontWeight="bold"
                    >
                      #{train.trainNumber}
                    </text>
                  </g>
                );
              })}

              {/* Simulation Current Time Indicator Vertical Bar */}
              {simTimeMinutes >= 480 && simTimeMinutes <= 840 && (
                <line
                  x1={((simTimeMinutes - 480) / 360) * 740 + 40}
                  y1="15"
                  x2={((simTimeMinutes - 480) / 360) * 740 + 40}
                  y2="225"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* INTERACTIVE DRAG-AND-DROP TRAIN SCHEDULE PLANNER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Train Schedule Sliders / Adjuster */}
        <div className="lg:col-span-2 bg-[#060e1a] p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Interactive Train Schedule Governor & Dispatch Adjuster
                </h3>
                <p className="text-[10px] text-slate-400">
                  Drag departure timeline sliders to immediately re-calculate spatial clearance against active blocks
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              REAL-TIME OCCUPANCY
            </span>
          </div>

          {/* List of Trains with Draggable Sliders */}
          <div className="space-y-3">
            {trains.map((train) => {
              const hasConflict = conflicts.some((c) => c.trainNumber === train.trainNumber);
              const isSelected = train.id === selectedTrainId;
              const delayMins = train.scheduledDepartureMinutes - train.nominalDepartureMinutes;

              return (
                <div
                  key={train.id}
                  onClick={() => setSelectedTrainId(train.id)}
                  className={`p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500/80 shadow-md'
                      : hasConflict
                      ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          hasConflict ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
                        }`}
                      />
                      <span className="font-bold text-white text-xs">
                        #{train.trainNumber} - {train.trainName}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          train.category === 'VANDE_BHARAT'
                            ? 'bg-sky-500/20 text-sky-300'
                            : train.category === 'SHATABDI'
                            ? 'bg-purple-500/20 text-purple-300'
                            : train.category === 'RAJDHANI'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {train.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({train.track} Line • {train.speedKmph} km/h)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-mono">
                        Dispatch: <strong className="text-white">{formatTime(train.scheduledDepartureMinutes)}</strong>
                      </span>
                      {delayMins !== 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            delayMins > 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {delayMins > 0 ? `+${delayMins}m Regulated` : `${delayMins}m Advanced`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Slider & Stepper Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftSchedule(train.id, -15);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 font-bold shrink-0"
                      title="Advance departure by 15 min"
                    >
                      -15m
                    </button>

                    <div className="flex-1">
                      <input
                        type="range"
                        min="480"
                        max="780"
                        step="5"
                        value={train.scheduledDepartureMinutes}
                        onChange={(e) => handleScheduleChange(train.id, parseInt(e.target.value))}
                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                          hasConflict ? 'bg-rose-950 accent-rose-500' : 'bg-slate-700 accent-cyan-400'
                        }`}
                      />
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftSchedule(train.id, 15);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 font-bold shrink-0"
                      title="Delay departure by 15 min"
                    >
                      +15m
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftSchedule(train.id, 30);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 font-bold shrink-0"
                      title="Delay departure by 30 min"
                    >
                      +30m
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Conflict Intelligence & Advisory */}
        <div className="bg-[#060e1a] p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Conflict Radar & Safety Gate
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  conflicts.length === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {conflicts.length === 0 ? 'GATE VERIFIED' : `${conflicts.length} HAZARD(S)`}
              </span>
            </div>

            {conflicts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/60 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-bold text-white text-xs">
                  Zero Spatial-Temporal Violations
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All train paths clear active maintenance possession blocks with compliant safety headways.
                  The current timetable is verified ready for publishing.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {conflicts.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/70 text-rose-200 text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between font-bold text-rose-300">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        #{conf.trainNumber} × {conf.blockId}
                      </span>
                      <span className="text-[9px] bg-rose-900/80 px-1.5 py-0.2 rounded border border-rose-700">
                        KM {conf.conflictKm}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{conf.reason}</p>
                    <div className="text-[10px] text-rose-400/90 font-mono">
                      Expected Occurrence: {formatTime(conf.conflictTimeMinutes)} IST
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Train Quick Specs Card */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Focused Train Kinematics: #{selectedTrain.trainNumber}
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Traction & Power:</span>
                <span className="text-slate-200 font-semibold">{selectedTrain.locoModel}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cruising Velocity:</span>
                <span className="text-cyan-300 font-semibold">{selectedTrain.speedKmph} km/h</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Origin - Destination:</span>
                <span className="text-slate-200 font-semibold">{selectedTrain.origin} → {selectedTrain.destination}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Rake Length:</span>
                <span className="text-slate-200 font-semibold">{selectedTrain.rakeLengthMeters}m (Consist)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
