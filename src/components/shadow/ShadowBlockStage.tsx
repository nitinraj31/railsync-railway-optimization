import React, { useMemo } from 'react';
import {
  ShadowBlockMachineType,
  ShadowBlockRunStatus,
  ShadowBlockTelemetry,
  SidingDockPoint,
} from '../../types';
import {
  Sparkles,
  Radio,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Train,
  Compass,
} from 'lucide-react';

interface ShadowBlockStageProps {
  telemetry: ShadowBlockTelemetry;
  sidings: SidingDockPoint[];
  corridorName: string;
  maxKm?: number;
  onSelectEntity?: (entityType: 'lead' | 'machine' | 'trail' | 'siding', id?: string) => void;
  onExecuteDocking?: () => void;
}

export const ShadowBlockStage: React.FC<ShadowBlockStageProps> = ({
  telemetry,
  sidings,
  corridorName,
  maxKm = 60,
  onSelectEntity,
  onExecuteDocking,
}) => {
  // Convert KM (0 - maxKm) to percentage (0% - 100%)
  const kmToPercent = (km: number) => {
    return Math.min(100, Math.max(0, (km / maxKm) * 100));
  };

  const leadPct = kmToPercent(telemetry.leadKm);
  const machinePct = kmToPercent(telemetry.machineKm);
  const trailPct = kmToPercent(telemetry.trailKm);

  // Kavach Braking Cone percentages
  const kavachStopKm = Math.min(
    telemetry.machineKm,
    telemetry.trailKm + (telemetry.trailSpeedKmph * telemetry.trailSpeedKmph) / (2 * 0.65 * 1000 * 3.6) + 1.2
  );
  const kavachConeEndPct = kmToPercent(kavachStopKm);

  // Signal gantries positioned every 5 KM
  const signalLocations = useMemo(() => {
    const list: { km: number; aspect: 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED' }[] = [];
    for (let km = 3; km <= maxKm; km += 4) {
      let aspect: 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED' = 'GREEN';

      // Red if train or machine is inside this block
      const inBlock =
        (telemetry.trailKm <= km && km <= telemetry.trailKm + 2) ||
        (telemetry.machineKm <= km && km <= telemetry.machineKm + 2) ||
        (telemetry.leadKm <= km && km <= telemetry.leadKm + 2);

      // Distance to machine
      const distToMachine = telemetry.machineKm - km;
      const distToLead = telemetry.leadKm - km;

      if (inBlock) {
        aspect = 'RED';
      } else if (
        (distToMachine > 0 && distToMachine < 2.5) ||
        (distToLead > 0 && distToLead < 2.5)
      ) {
        aspect = 'YELLOW';
      } else if (
        (distToMachine >= 2.5 && distToMachine < 5.0) ||
        (distToLead >= 2.5 && distToLead < 5.0)
      ) {
        aspect = 'DOUBLE_YELLOW';
      } else {
        aspect = 'GREEN';
      }

      list.push({ km, aspect });
    }
    return list;
  }, [telemetry.leadKm, telemetry.machineKm, telemetry.trailKm, maxKm]);

  return (
    <div className="w-full bg-[#080e1c] border border-cyan-950/80 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4">
      {/* Background Grid Pattern & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Track Stage Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-sky-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/60">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-base tracking-wide font-mono">
                KINETIC SLIPSTREAM CORRIDOR STAGE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                ETCS L2 / Kavach SIL-4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {corridorName} • Real-Time Dynamic Moving Block Spacing (0.0 to {maxKm}.0 KM)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300 shadow-sm" />
            <span className="text-slate-400">Leading Express</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-cyan-400 border border-cyan-200 animate-pulse shadow-sm shadow-cyan-500/50" />
            <span className="text-cyan-300 font-semibold">Shadow Machine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 shadow-sm" />
            <span className="text-slate-400">Trailing Train</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500/60" />
            <span className="text-emerald-400">Siding Loop Line</span>
          </div>
        </div>
      </div>

      {/* Main Schematic Track Diagram */}
      <div className="relative w-full h-80 bg-[#050a14] rounded-xl border border-slate-800/80 p-3 flex flex-col justify-between overflow-x-auto select-none">
        {/* Overhead 25kV Catenary Wire Graphic */}
        <div className="relative w-full h-8 flex items-center">
          <div className="absolute left-0 right-0 h-[1.5px] bg-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
          <div className="absolute left-0 right-0 h-[0.5px] top-1 border-b border-dashed border-amber-500/30" />
          <span className="absolute right-2 text-[9px] font-mono text-amber-400/70 uppercase">
            25kV AC Traction Catenary Wire
          </span>
        </div>

        {/* Automatic 4-Aspect Signal Gantries Row */}
        <div className="relative w-full h-10 flex items-center px-6">
          {signalLocations.map((sig, idx) => {
            const leftPct = kmToPercent(sig.km);
            return (
              <div
                key={idx}
                style={{ left: `${leftPct}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                title={`Signal S-${sig.km} (KM ${sig.km.toFixed(1)}): ${sig.aspect}`}
              >
                {/* 4-Aspect Signal Lamp Box */}
                <div className="w-4 h-9 bg-slate-950 border border-slate-700 rounded-sm flex flex-col items-center justify-around py-0.5 shadow-md">
                  {/* Green */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sig.aspect === 'GREEN'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-emerald-950/40 opacity-40'
                    }`}
                  />
                  {/* Yellow Top */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sig.aspect === 'YELLOW' || sig.aspect === 'DOUBLE_YELLOW'
                        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-amber-950/40 opacity-40'
                    }`}
                  />
                  {/* Yellow Bottom */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sig.aspect === 'DOUBLE_YELLOW'
                        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-amber-950/40 opacity-40'
                    }`}
                  />
                  {/* Red */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sig.aspect === 'RED'
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-rose-950/40 opacity-40'
                    }`}
                  />
                </div>
                {/* Mast Post */}
                <div className="w-[1.5px] h-3 bg-slate-600" />
                <span className="text-[8px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {sig.km}k
                </span>
              </div>
            );
          })}
        </div>

        {/* TRACK BED & RAILS SECTION */}
        <div className="relative w-full h-36 flex flex-col justify-center px-6">
          {/* Loop Lines / Siding Tracks Overhead */}
          {sidings.map((siding, sIdx) => {
            const startPct = kmToPercent(siding.kmMarker - 0.8);
            const endPct = kmToPercent(siding.kmMarker + 1.2);
            const centerPct = kmToPercent(siding.kmMarker);
            const widthPct = Math.max(4, endPct - startPct);

            const isNext = telemetry.nextSiding.sidingId === siding.sidingId;

            return (
              <div
                key={siding.sidingId}
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                  top: '12px',
                }}
                className={`absolute h-7 rounded border-t-2 border-r-2 ${
                  isNext
                    ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'border-slate-600/70 bg-slate-900/40'
                } flex items-center justify-between px-2 cursor-pointer transition-all hover:bg-emerald-900/40 group`}
                onClick={() => onSelectEntity?.('siding', siding.sidingId)}
                title={`${siding.name} (KM ${siding.kmMarker.toFixed(1)}) - Turnout speed limit: ${siding.turnoutSpeedLimitKmph} km/h`}
              >
                {/* Turnout Points Blade Indicator */}
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[9px] font-mono font-bold text-emerald-300 truncate max-w-[140px]">
                  {siding.name.split(' ')[0]} (KM {siding.kmMarker.toFixed(1)})
                </span>
                {isNext && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400/50">
                    TARGET EGRESS
                  </span>
                )}
              </div>
            );
          })}

          {/* MAIN LINE BALLAST BED & TRACK */}
          <div className="relative w-full h-16 bg-[#131b2e] rounded-lg border border-slate-700/80 shadow-inner flex items-center overflow-hidden my-auto">
            {/* Wooden/Concrete Sleepers repeated pattern */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#24324f,#24324f_3px,transparent_3px,transparent_16px)] opacity-50" />

            {/* Upper Rail Steel Line */}
            <div className="absolute left-0 right-0 h-[2.5px] top-3.5 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />

            {/* Lower Rail Steel Line */}
            <div className="absolute left-0 right-0 h-[2.5px] bottom-3.5 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />

            {/* Verified Track Scan Layer (Green scanned overlay from 0 to machineKm) */}
            <div
              style={{ width: `${machinePct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500/10 via-emerald-400/20 to-emerald-400/40 border-r-2 border-emerald-400/80 pointer-events-none"
            >
              <div className="absolute right-2 top-1 text-[8px] font-mono font-bold text-emerald-400 tracking-wider">
                ✓ TRACK SCANNED ({telemetry.trackKmScanned.toFixed(1)} KM)
              </div>
            </div>

            {/* KAVACH BRAKING CONE (Gradient area ahead of Trailing Train) */}
            <div
              style={{
                left: `${trailPct}%`,
                width: `${Math.max(0, kavachConeEndPct - trailPct)}%`,
              }}
              className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/30 via-amber-500/15 to-transparent pointer-events-none flex items-center justify-center border-l-2 border-amber-400/80"
            >
              <span className="text-[8px] font-mono text-amber-300 font-bold tracking-widest uppercase opacity-80">
                Kavach ATP Braking Horizon
              </span>
            </div>

            {/* THE DYNAMIC MOVING SHADOW-BLOCK BUBBLE */}
            {/* The holographic envelope surrounding the maintenance machine */}
            <div
              style={{
                left: `${Math.max(0, machinePct - 7)}%`,
                width: `14%`,
              }}
              className={`absolute top-[-10px] bottom-[-10px] rounded-2xl pointer-events-none transition-all duration-300 ${
                telemetry.isCautionZoneActive
                  ? 'bg-amber-500/20 border-2 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.4)]'
                  : 'bg-cyan-500/20 border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.5)]'
              } flex items-center justify-center`}
            >
              {/* Pulsating animated radar ripple */}
              <div className="absolute inset-0 rounded-2xl border border-cyan-300/40 animate-ping opacity-30" />
              <div className="text-[8px] font-mono font-bold text-cyan-200 tracking-wider bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/60 uppercase">
                SHADOW-BLOCK BUBBLE (Δx = {telemetry.slipstreamGapKm.toFixed(1)} KM)
              </div>
            </div>

            {/* 1. LEADING TRAIN ICON */}
            <div
              style={{ left: `${leadPct}%` }}
              className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 cursor-pointer group flex flex-col items-center"
              onClick={() => onSelectEntity?.('lead', telemetry.leadTrainId)}
            >
              {/* Headlight beam */}
              <div className="absolute right-[-48px] top-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-r from-yellow-100/40 to-transparent pointer-events-none rounded-r-full" />
              <div className="px-2.5 py-1 rounded bg-blue-600 border border-blue-300 text-white font-mono font-bold text-[11px] shadow-lg shadow-blue-900/60 flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
                <span>{telemetry.leadTrainName.split(' ')[0]}</span>
                <span className="text-[9px] opacity-80">({telemetry.leadSpeedKmph} km/h)</span>
              </div>
              <div className="text-[8px] font-mono text-blue-300 bg-slate-950/80 px-1 rounded mt-0.5 border border-blue-900/60">
                KM {telemetry.leadKm.toFixed(1)}
              </div>
            </div>

            {/* 2. MAINTENANCE MACHINE ICON (In the Slipstream) */}
            <div
              style={{ left: `${machinePct}%` }}
              className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 cursor-pointer group flex flex-col items-center"
              onClick={() => onSelectEntity?.('machine', telemetry.machineId)}
            >
              {/* Laser / Ultrasonic scanning probe beam going down onto rail */}
              <div className="absolute top-[-16px] w-28 h-4 bg-cyan-400/20 border-b-2 border-cyan-300 blur-[1px] animate-pulse pointer-events-none" />
              <div
                className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs shadow-xl flex items-center gap-1.5 whitespace-nowrap transition-transform transform group-hover:scale-110 ${
                  telemetry.machineStatus === 'DOCKING_LOOP'
                    ? 'bg-emerald-600 border-2 border-emerald-300 text-white shadow-emerald-900/80'
                    : telemetry.isCautionZoneActive
                    ? 'bg-amber-600 border-2 border-amber-300 text-white shadow-amber-900/80'
                    : 'bg-cyan-500 border-2 border-cyan-200 text-slate-950 shadow-cyan-900/80'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>{telemetry.machineId}</span>
                <span className="text-[10px] bg-slate-950/80 text-cyan-300 px-1.5 py-0.5 rounded ml-0.5">
                  {telemetry.machineSpeedKmph} km/h
                </span>
              </div>

              {/* Status Badge below machine */}
              <div className="text-[8px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-1.5 py-0.5 rounded mt-1 border border-cyan-500/40 shadow-md">
                KM {telemetry.machineKm.toFixed(1)} • {telemetry.machineStatus}
              </div>
            </div>

            {/* 3. TRAILING TRAIN ICON */}
            <div
              style={{ left: `${trailPct}%` }}
              className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 cursor-pointer group flex flex-col items-center"
              onClick={() => onSelectEntity?.('trail', telemetry.trailTrainId)}
            >
              <div className="px-2.5 py-1 rounded bg-amber-600 border border-amber-300 text-white font-mono font-bold text-[11px] shadow-lg shadow-amber-950/60 flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-amber-200 animate-ping" />
                <span>{telemetry.trailTrainName.split(' ')[0]}</span>
                <span className="text-[9px] opacity-80">({telemetry.trailSpeedKmph} km/h)</span>
              </div>
              <div className="text-[8px] font-mono text-amber-300 bg-slate-950/80 px-1 rounded mt-0.5 border border-amber-900/60">
                KM {telemetry.trailKm.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM KM DISTANCE RULER */}
        <div className="relative w-full h-8 flex items-center px-6 border-t border-slate-800 pt-2">
          {Array.from({ length: 13 }).map((_, i) => {
            const kmVal = (i * maxKm) / 12;
            const pct = kmToPercent(kmVal);
            return (
              <div
                key={i}
                style={{ left: `${pct}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center"
              >
                <div className="w-[1px] h-2.5 bg-slate-700" />
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                  {kmVal.toFixed(0)}k
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Bottom Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Next Certified Siding:</span>
          <span className="text-white font-bold">{telemetry.nextSiding.name}</span>
          <span className="text-cyan-400">
            ({telemetry.distanceToNextSidingKm.toFixed(1)} KM ahead / ~{Math.round(telemetry.timeToSidingSeconds / 60)} min)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="stage-siding-egress-btn"
            onClick={onExecuteDocking}
            disabled={telemetry.machineStatus === 'DOCKING_LOOP' || telemetry.machineStatus === 'COMPLETED'}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              telemetry.isCautionZoneActive
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white animate-pulse'
                : 'bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {telemetry.machineStatus === 'DOCKING_LOOP'
                ? 'Diverting to Siding Loop Line...'
                : `Execute Docking at ${telemetry.nextSiding.name.split(' ')[0]}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
