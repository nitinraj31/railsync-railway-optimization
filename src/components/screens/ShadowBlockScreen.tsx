import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShadowBlockMachineConfig,
  ShadowBlockRunStatus,
  ShadowBlockTelemetry,
  SlipstreamScenario,
} from '../../types';
import {
  SLIPSTREAM_SCENARIOS,
  SHADOW_BLOCK_MACHINES,
  CORRIDOR_SIDINGS,
  calculateTelemetry,
  shadowBlockAudio,
} from '../../services/shadowBlockService';
import { mockStore } from '../../services/api';
import { ShadowBlockStage } from '../shadow/ShadowBlockStage';
import { ShadowBlockTelemetryHUD } from '../shadow/ShadowBlockTelemetryHUD';
import { ShadowBlockControlBar } from '../shadow/ShadowBlockControlBar';
import { ShadowBlockSensorStream } from '../shadow/ShadowBlockSensorStream';
import { ShadowBlockPermitModal } from '../shadow/ShadowBlockPermitModal';
import {
  Radio,
  Zap,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  FileCheck2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Activity,
  Layers,
  Award,
  ArrowRight,
} from 'lucide-react';

interface ShadowBlockScreenProps {
  onRefreshData?: () => void;
  onNavigate?: (screen: string) => void;
}

export const ShadowBlockScreen: React.FC<ShadowBlockScreenProps> = ({
  onRefreshData,
  onNavigate,
}) => {
  // Active Scenario
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SLIPSTREAM_SCENARIOS[0].id);
  const activeScenario =
    SLIPSTREAM_SCENARIOS.find((s) => s.id === selectedScenarioId) || SLIPSTREAM_SCENARIOS[0];

  // Kinematic Positions & Speeds
  const [leadKm, setLeadKm] = useState<number>(activeScenario.leadTrain.initialKm);
  const [machineKm, setMachineKm] = useState<number>(activeScenario.initialMachineKm);
  const [trailKm, setTrailKm] = useState<number>(activeScenario.trailTrain.initialKm);

  const [leadSpeed, setLeadSpeed] = useState<number>(activeScenario.leadTrain.speed);
  const [machineSpeed, setMachineSpeed] = useState<number>(activeScenario.initialMachineSpeed);
  const [trailSpeed, setTrailSpeed] = useState<number>(activeScenario.trailTrain.speed);

  const [machineStatus, setMachineStatus] = useState<ShadowBlockRunStatus>('STANDBY');
  const [trackKmScanned, setTrackKmScanned] = useState<number>(0);
  const [defectsDetected, setDefectsDetected] = useState<number>(1);

  // Simulation Controls
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Modals & Panels
  const [permitModalOpen, setPermitModalOpen] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const maxKm = 60;
  const sidings = CORRIDOR_SIDINGS[activeScenario.corridorId] || CORRIDOR_SIDINGS['C001'];

  // Sound ref to avoid rapid repeated triggers
  const lastCautionSoundRef = useRef<number>(0);

  // Reset positions when scenario changes
  const resetScenario = useCallback((scn: SlipstreamScenario) => {
    setLeadKm(scn.leadTrain.initialKm);
    setMachineKm(scn.initialMachineKm);
    setTrailKm(scn.trailTrain.initialKm);
    setLeadSpeed(scn.leadTrain.speed);
    setMachineSpeed(scn.initialMachineSpeed);
    setTrailSpeed(scn.trailTrain.speed);
    setMachineStatus('STANDBY');
    setTrackKmScanned(0);
    setDefectsDetected(1);
    setIsRunning(true);
  }, []);

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    const scn = SLIPSTREAM_SCENARIOS.find((s) => s.id === id);
    if (scn) {
      resetScenario(scn);
    }
  };

  // Execute Siding Docking
  const handleExecuteDocking = () => {
    setMachineStatus('DOCKING_LOOP');
    if (soundEnabled) {
      shadowBlockAudio.playDockSuccess();
    }
    setToastMessage(
      `Interlock Locked: Machine safely diverted to Loop Line siding. Main track 100% clear!`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Main Physics Simulation Loop (Runs every 100ms)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Delta time in hours = (0.1s * multiplier) / 3600
      const dtHours = (0.1 * speedMultiplier) / 3600;

      // 1. Advance Lead Train
      setLeadKm((prev) => {
        const next = prev + leadSpeed * dtHours;
        return next > maxKm ? 15 : next;
      });

      // 2. Advance Trailing Train
      setTrailKm((prev) => {
        const next = prev + trailSpeed * dtHours;
        return next > maxKm ? 0 : next;
      });

      // 3. Advance Machine if not docked
      setMachineKm((prev) => {
        if (machineStatus === 'DOCKING_LOOP' || machineStatus === 'COMPLETED') {
          return prev; // stays in siding loop
        }

        const next = prev + machineSpeed * dtHours;

        // Cumulative track scanned
        setTrackKmScanned((old) => old + machineSpeed * dtHours);

        // Check if machine reaches or exceeds corridor end
        if (next >= maxKm) {
          setMachineStatus('COMPLETED');
          setIsRunning(false);
          return maxKm;
        }

        return next;
      });

      // Check auto-divert or caution sound trigger
      const gap = machineKm - trailKm;
      if (gap < 3.2 && machineStatus !== 'DOCKING_LOOP' && machineStatus !== 'COMPLETED') {
        const now = Date.now();
        if (soundEnabled && now - lastCautionSoundRef.current > 4000) {
          lastCautionSoundRef.current = now;
          shadowBlockAudio.playCautionAlert();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, speedMultiplier, leadSpeed, machineSpeed, trailSpeed, machineKm, trailKm, machineStatus, maxKm, soundEnabled]);

  // Periodic acoustic sonar ping when sound is on
  useEffect(() => {
    if (!isRunning || !soundEnabled || machineStatus === 'DOCKING_LOOP') return;

    const sonarInterval = setInterval(() => {
      shadowBlockAudio.playSonarPing();
    }, 3000);

    return () => clearInterval(sonarInterval);
  }, [isRunning, soundEnabled, machineStatus]);

  // Calculate instantaneous telemetry
  const telemetry = calculateTelemetry(
    activeScenario,
    leadKm,
    leadSpeed,
    machineKm,
    machineSpeed,
    machineStatus,
    trailKm,
    trailSpeed,
    trackKmScanned,
    defectsDetected
  );

  // Commit to Master Schedule handler
  const handleCommitToMasterSchedule = () => {
    const blockId = `BLK-SHADOW-${Math.floor(100 + Math.random() * 900)}`;

    mockStore.addAuditLogEntry(
      'Dynamic Traffic Director (AI)',
      'CONTROL_ROOM',
      'SHADOW_BLOCK_AUTHORIZATION_COMMITTED',
      blockId,
      'SUCCESS',
      `Authorized Dynamic Moving Shadow-Block ${blockId} for ${activeScenario.machine.name} on ${activeScenario.corridorName}. Zero train detention impact verified.`
    );

    if (onRefreshData) {
      onRefreshData();
    }

    setToastMessage(`Moving Block Permit committed! Audit log and ATP token active.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="w-full min-h-screen bg-[#060b17] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900/90 border border-emerald-400 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-sky-950 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/60">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-mono">
                  DYNAMIC MOVING "SHADOW-BLOCK" ENGINE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Award className="w-3 h-3 text-cyan-400" />
                  WORLD-FIRST CONCEPT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
                Non-Disruptive Mobile Track & Catenary Maintenance in Moving Headway Gaps (Kavach SIL-4 / ETCS L2)
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="toggle-explanation-btn"
            onClick={() => setShowExplanation(!showExplanation)}
            className="px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>{showExplanation ? 'Hide Concept Brief' : 'Why This Is Market-First'}</span>
          </button>

          <button
            id="open-permit-modal-btn"
            onClick={() => setPermitModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition-all"
          >
            <FileCheck2 className="w-4 h-4 fill-slate-950" />
            <span>Generate Moving Block Permit</span>
          </button>
        </div>
      </div>

      {/* Explanatory Banner (Why This Is Market-First) */}
      {showExplanation && (
        <div className="bg-gradient-to-r from-[#0c1836] to-[#0a1f33] p-5 rounded-2xl border border-cyan-500/40 shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-sky-900/60 pb-2.5">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              The Revolutionary Paradigm: Dynamic Moving Shadow-Blocks vs. Static Lockouts
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700">
              PATENTABLE ARCHITECTURE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1.5">
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Existing Market Practice (Siemens RailSys / IBM Maximo / Indian Railways TMS)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Tracks are completely frozen with <strong>Static Geographic Lockouts</strong>. An entire 20–30 km section is shut for 3–4 hours, forcing passenger train cancellations, massive passenger delays, crew duty overshoots, and ₹ Crores in freight idling penalties.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RAILSYNC Breakthrough (Dynamic Slipstream Protocol)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Certified self-propelled maintenance cars (USFD Ultrasonic, OHE LIDAR, Rover-X) operate <strong>inside the moving dynamic headway gap between two scheduled trains</strong>. The system paces the machine against trailing trains' Kavach braking curves and diverts into loop sidings when needed—<strong>achieving 100% maintenance with 0 minutes of train detention</strong>!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preset Operational Scenarios Switcher */}
      <div className="bg-[#0b1329] p-4 rounded-xl border border-sky-950/80 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            SELECT PRESET SLIPSTREAM SCENARIO:
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Current Corridor: <strong className="text-white">{activeScenario.corridorName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SLIPSTREAM_SCENARIOS.map((scn) => {
            const isSelected = scn.id === selectedScenarioId;
            return (
              <button
                key={scn.id}
                onClick={() => handleSelectScenario(scn.id)}
                className={`p-3 rounded-xl text-left font-mono border transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
                    {scn.badge}
                  </span>
                  <span className="text-[10px] text-slate-400">{scn.corridorId}</span>
                </div>
                <h4 className="text-white font-bold text-xs truncate mb-1">{scn.name}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {scn.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time Telemetry Cockpit HUD */}
      <ShadowBlockTelemetryHUD telemetry={telemetry} scenario={activeScenario} />

      {/* Kinetic Physics Canvas Stage */}
      <ShadowBlockStage
        telemetry={telemetry}
        sidings={sidings}
        corridorName={activeScenario.corridorName}
        maxKm={maxKm}
        onExecuteDocking={handleExecuteDocking}
      />

      {/* Interactive Simulation Controls */}
      <ShadowBlockControlBar
        isRunning={isRunning}
        onToggleRun={() => setIsRunning(!isRunning)}
        speedMultiplier={speedMultiplier}
        onChangeSpeedMultiplier={setSpeedMultiplier}
        machineSpeed={machineSpeed}
        onChangeMachineSpeed={setMachineSpeed}
        trailSpeed={trailSpeed}
        onChangeTrailSpeed={setTrailSpeed}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onReset={() => resetScenario(activeScenario)}
        onExecuteDocking={handleExecuteDocking}
        machineStatus={machineStatus}
        isCautionActive={telemetry.isCautionZoneActive}
      />

      {/* Live Sensor Feed & Diagnostic Oscilloscope */}
      <ShadowBlockSensorStream
        telemetry={telemetry}
        machine={activeScenario.machine}
        isRunning={isRunning}
      />

      {/* Official Moving Block Permit Modal */}
      <ShadowBlockPermitModal
        isOpen={permitModalOpen}
        onClose={() => setPermitModalOpen(false)}
        telemetry={telemetry}
        scenario={activeScenario}
        onCommitToMasterSchedule={handleCommitToMasterSchedule}
      />
    </div>
  );
};
