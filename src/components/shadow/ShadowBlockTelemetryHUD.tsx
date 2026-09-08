import React from 'react';
import { ShadowBlockTelemetry, SlipstreamScenario } from '../../types';
import {
  Gauge,
  ShieldCheck,
  Clock,
  Coins,
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface ShadowBlockTelemetryHUDProps {
  telemetry: ShadowBlockTelemetry;
  scenario: SlipstreamScenario;
}

export const ShadowBlockTelemetryHUD: React.FC<ShadowBlockTelemetryHUDProps> = ({
  telemetry,
  scenario,
}) => {
  const closingRateKmph = Math.max(0, telemetry.trailSpeedKmph - telemetry.machineSpeedKmph);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. DYNAMIC HEADWAY SLIPSTREAM GAP */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          telemetry.isCautionZoneActive
            ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/60'
            : 'bg-[#0b1329] border-sky-900/60 shadow-md'
        } flex flex-col justify-between`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            SLIPSTREAM GAP (Δx)
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
              telemetry.isCautionZoneActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {telemetry.isCautionZoneActive ? 'CAUTION' : 'NOMINAL'}
          </span>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
              {telemetry.slipstreamGapKm.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400 font-semibold">KM</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono mt-1 text-slate-400">
            <span>Closing Velocity:</span>
            <span className="text-amber-400 font-bold">-{closingRateKmph.toFixed(0)} km/h</span>
          </div>
        </div>

        {/* Headway Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, Math.max(0, (telemetry.slipstreamGapKm / 25) * 100))}%`,
              }}
              className={`h-full transition-all duration-300 ${
                telemetry.isCautionZoneActive ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Egress Limit: 3.5 km</span>
            <span>Est. Headway: {telemetry.headwayMinutes.toFixed(1)} min</span>
          </div>
        </div>
      </div>

      {/* 2. KAVACH ATP SAFETY ENVELOPE */}
      <div className="p-4 rounded-xl bg-[#0b1329] border border-sky-900/60 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            KAVACH ATP MARGIN
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            SIL-4 PROTECTED
          </span>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-extrabold text-emerald-300 tracking-tight">
              +{telemetry.kavachBrakingMarginKm.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400 font-semibold">KM BUFFER</span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Margin to Double-Yellow aspect threshold
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Emergency Braking Curve: Clear</span>
        </div>
      </div>

      {/* 3. SIDING DOCKING HORIZON */}
      <div className="p-4 rounded-xl bg-[#0b1329] border border-sky-900/60 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            DOCKING COUNTDOWN
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            LOOP LINE
          </span>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-extrabold text-purple-300 tracking-tight">
              {Math.floor(telemetry.timeToSidingSeconds / 60)}m {Math.floor(telemetry.timeToSidingSeconds % 60)}s
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1 truncate">
            Target: <span className="text-white font-semibold">{telemetry.nextSiding.name.split(' ')[0]}</span> (KM {telemetry.nextSiding.kmMarker})
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400">Turnout Speed:</span>
          <span className="text-purple-300 font-bold">{telemetry.nextSiding.turnoutSpeedLimitKmph} km/h</span>
        </div>
      </div>

      {/* 4. COMMERCIAL VALUE ARBITRAGE */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#0b1329] to-emerald-950/30 border border-emerald-500/40 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-emerald-300 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-400" />
            ZERO-DELAY ARBITRAGE
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            SAVINGS
          </span>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-extrabold text-emerald-300 tracking-tight">
              ₹{(telemetry.revenueLossAvoidedInr / 100000).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">LAKH SAVED</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono text-white font-bold">
              0 Min Passenger Delay
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300/90 bg-emerald-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
          <span>Scanned:</span>
          <span className="font-bold">{telemetry.trackKmScanned.toFixed(1)} KM</span>
          <span className="text-slate-400">|</span>
          <span>Defects:</span>
          <span className="font-bold">{telemetry.defectsDetectedLive} logged</span>
        </div>
      </div>
    </div>
  );
};
