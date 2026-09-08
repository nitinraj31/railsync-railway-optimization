import React, { useEffect, useState } from 'react';
import { ShadowBlockTelemetry, ShadowBlockMachineConfig } from '../../types';
import { Activity, Radio, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ShadowBlockSensorStreamProps {
  telemetry: ShadowBlockTelemetry;
  machine: ShadowBlockMachineConfig;
  isRunning: boolean;
}

interface DetectedDefectLog {
  id: string;
  timestamp: string;
  kmMarker: number;
  anomalyType: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  value: string;
}

export const ShadowBlockSensorStream: React.FC<ShadowBlockSensorStreamProps> = ({
  telemetry,
  machine,
  isRunning,
}) => {
  const [waveformBars, setWaveformBars] = useState<number[]>(() =>
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 40 + 20))
  );

  const [defectLogs, setDefectLogs] = useState<DetectedDefectLog[]>([
    {
      id: 'ANOM-101',
      timestamp: '10:42:15',
      kmMarker: 14.8,
      anomalyType: 'USFD 70° Gauge Corner Micro-Fissure',
      severity: 'WARNING',
      value: 'Depth: 2.1mm (Within safe limit, PWI gang flagged)',
    },
    {
      id: 'ANOM-102',
      timestamp: '10:43:08',
      kmMarker: 18.2,
      anomalyType: 'OHE Contact Wire Stagger Deviation',
      severity: 'INFO',
      value: 'Stagger: +215mm (RDSO limit: ±200mm)',
    },
    {
      id: 'ANOM-103',
      timestamp: '10:44:50',
      kmMarker: 21.6,
      anomalyType: 'Track Gauge Tightening',
      severity: 'INFO',
      value: 'Gauge: 1673mm (Nominal: 1676mm)',
    },
  ]);

  // Animate oscilloscope waveform when running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setWaveformBars((prev) =>
        prev.map((val) => {
          const delta = (Math.random() - 0.48) * 15;
          return Math.max(10, Math.min(85, Math.floor(val + delta)));
        })
      );
    }, 180);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left 2 Cols: Live Oscilloscope / Radar Waveform */}
      <div className="lg:col-span-2 bg-[#091021] border border-cyan-950/80 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between border-b border-sky-950 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {machine.inspectionSensorName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono text-cyan-300">
              160 SAMPLES / SEC • REAL-TIME A-SCAN
            </span>
          </div>
        </div>

        {/* Oscilloscope Visualizer */}
        <div className="my-4 h-24 bg-[#050914] rounded-lg border border-cyan-900/30 p-2 relative flex items-end justify-between gap-1 overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1e38_1px,transparent_1px),linear-gradient(to_bottom,#0e1e38_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

          {/* Reference Zero Line */}
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-500/20 pointer-events-none" />

          {waveformBars.map((height, idx) => (
            <div
              key={idx}
              style={{ height: `${height}%` }}
              className={`w-full rounded-t-sm transition-all duration-150 ${
                height > 70
                  ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                  : 'bg-cyan-400/80 shadow-[0_0_4px_#22d3ee]'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-1">
          <span>
            Current Track Sensor Pos: <strong className="text-cyan-300">KM {telemetry.machineKm.toFixed(2)}</strong>
          </span>
          <span>
            Certified Chief: <strong className="text-slate-200">{machine.crewChief}</strong>
          </span>
          <span className="text-emerald-400 font-semibold">
            {machine.certificationAuthority}
          </span>
        </div>
      </div>

      {/* Right Col: Live Micro-Defects Log Stream */}
      <div className="bg-[#091021] border border-sky-950/80 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between border-b border-sky-950 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              IN-TRANSIT DEFECT STREAM
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {defectLogs.length} LOGGED
          </span>
        </div>

        <div className="my-3 space-y-2 max-h-36 overflow-y-auto pr-1">
          {defectLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  KM {log.kmMarker.toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-slate-200 text-xs font-semibold">{log.anomalyType}</p>
              <p className="text-[10px] text-slate-400 truncate">{log.value}</p>
            </div>
          ))}
        </div>

        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span>Automatic TMS/COA Ingestion</span>
          <span className="text-emerald-400 font-bold">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
