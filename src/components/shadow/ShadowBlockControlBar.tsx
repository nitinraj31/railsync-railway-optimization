import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Sliders,
  Compass,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { ShadowBlockRunStatus } from '../../types';

interface ShadowBlockControlBarProps {
  isRunning: boolean;
  onToggleRun: () => void;
  speedMultiplier: number;
  onChangeSpeedMultiplier: (multiplier: number) => void;
  machineSpeed: number;
  onChangeMachineSpeed: (speed: number) => void;
  trailSpeed: number;
  onChangeTrailSpeed: (speed: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onReset: () => void;
  onExecuteDocking: () => void;
  machineStatus: ShadowBlockRunStatus;
  isCautionActive: boolean;
}

export const ShadowBlockControlBar: React.FC<ShadowBlockControlBarProps> = ({
  isRunning,
  onToggleRun,
  speedMultiplier,
  onChangeSpeedMultiplier,
  machineSpeed,
  onChangeMachineSpeed,
  trailSpeed,
  onChangeTrailSpeed,
  soundEnabled,
  onToggleSound,
  onReset,
  onExecuteDocking,
  machineStatus,
  isCautionActive,
}) => {
  return (
    <div className="w-full bg-[#0d1527] border border-sky-950/80 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-900/40 pb-3">
        {/* Play / Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            id="sim-play-pause-btn"
            onClick={onToggleRun}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Physics</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Physics Engine</span>
              </>
            )}
          </button>

          <button
            id="sim-reset-btn"
            onClick={onReset}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Reset Simulation Positions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Time Multiplier Buttons */}
          <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-800 ml-2">
            {[1, 2, 5, 10].map((mult) => (
              <button
                key={mult}
                onClick={() => onChangeSpeedMultiplier(mult)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                  speedMultiplier === mult
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Audio Toggle & Emergency Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="sim-audio-toggle-btn"
            onClick={onToggleSound}
            className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-colors ${
              soundEnabled
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Sonar & Kavach Caution Audio"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Audio: OFF</span>
              </>
            )}
          </button>

          {/* Siding Egress Interlock Execution */}
          <button
            id="sim-docking-btn"
            onClick={onExecuteDocking}
            disabled={machineStatus === 'DOCKING_LOOP' || machineStatus === 'COMPLETED'}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isCautionActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Compass className="w-4 h-4" />
            <span>
              {machineStatus === 'DOCKING_LOOP' ? 'Docking to Siding...' : 'Trigger Siding Egress'}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Pacing & Kinematic Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Machine Pacing Slider */}
        <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5 font-bold">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Machine Operating Speed Governor:
            </span>
            <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
              {machineSpeed} km/h
            </span>
          </div>
          <input
            id="machine-speed-slider"
            type="range"
            min={20}
            max={75}
            step={1}
            value={machineSpeed}
            onChange={(e) => onChangeMachineSpeed(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>20 km/h (Dense Scan)</span>
            <span>45 km/h (Nominal)</span>
            <span>75 km/h (Max Transit)</span>
          </div>
        </div>

        {/* Trailing Train Speed Slider */}
        <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5 font-bold">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Trailing Express Approach Speed:
            </span>
            <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
              {trailSpeed} km/h
            </span>
          </div>
          <input
            id="trail-speed-slider"
            type="range"
            min={70}
            max={140}
            step={1}
            value={trailSpeed}
            onChange={(e) => onChangeTrailSpeed(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>70 km/h (Freight)</span>
            <span>110 km/h (Superfast)</span>
            <span>140 km/h (Vande Bharat)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
