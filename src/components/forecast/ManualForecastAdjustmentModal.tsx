import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RefreshCw,
  RotateCcw,
  Users,
  Wrench,
  ShieldAlert,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  DailyForecastPoint,
  DailyForecastOverride,
  ConflictRecalculationResult,
  OptimizedBlock,
  Corridor,
} from '../../types';
import { resourceForecastService } from '../../services/resourceForecastService';
import { recalculateConflictsForForecastAdjustment, resetForecastAdjustment } from '../../services/api';

interface ManualForecastAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyForecast: DailyForecastPoint[];
  initialDayNumber?: number;
  blocks: OptimizedBlock[];
  corridors: Corridor[];
  onAdjustmentSaved: (result: ConflictRecalculationResult, override: DailyForecastOverride) => void;
  onAdjustmentReset: (dayNumber: number) => void;
  onNavigateToConflicts?: () => void;
}

const PRESET_DIRECTIVES = [
  {
    title: 'DRM Emergency Track Renewal Directive',
    desc: 'Deep ballast tamping & turnout renewal surge mandated by Division.',
    manpowerDelta: 35,
    machineDelta: 4,
    shift: 'NIGHT_MEGA_BLOCK' as const,
  },
  {
    title: 'Monsoon Mud-Pumping Ballast Washout Emergency',
    desc: 'Ballast pocket drainage & subgrade stabilization following monsoon moisture.',
    manpowerDelta: 45,
    machineDelta: 3,
    shift: 'DAY_SHIFT' as const,
  },
  {
    title: '25kV Traction Catenary Drop Wire Overhaul',
    desc: 'Intensive OHE dropper alignment & insulator replacement power block.',
    manpowerDelta: 20,
    machineDelta: 3,
    shift: 'NIGHT_MEGA_BLOCK' as const,
  },
  {
    title: 'Special High-Speed Track Certification Patrol',
    desc: 'Comprehensive USFD flaw scanning & geometry calibration for Rajdhani/VB path.',
    manpowerDelta: 15,
    machineDelta: 2,
    shift: 'DAY_SHIFT' as const,
  },
  {
    title: 'Auxiliary Reserve Mobilization (Staff Surplus)',
    desc: 'Standby personnel deployed from Central Training Depot to mitigate deficit.',
    manpowerDelta: 0,
    availableDelta: 50,
    machineDelta: 0,
    shift: 'DAY_SHIFT' as const,
  },
];

export const ManualForecastAdjustmentModal: React.FC<ManualForecastAdjustmentModalProps> = ({
  isOpen,
  onClose,
  dailyForecast,
  initialDayNumber = 1,
  blocks,
  corridors,
  onAdjustmentSaved,
  onAdjustmentReset,
  onNavigateToConflicts,
}) => {
  // Selected Day
  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialDayNumber);

  // Sync selectedDayNum when initialDayNumber changes
  useEffect(() => {
    if (initialDayNumber && initialDayNumber >= 1 && initialDayNumber <= dailyForecast.length) {
      setSelectedDayNum(initialDayNumber);
    }
  }, [initialDayNumber, dailyForecast.length]);

  // Current day point from system forecast
  const currentDayPoint = useMemo(() => {
    return dailyForecast.find((d) => d.dayNumber === selectedDayNum) || dailyForecast[0] || null;
  }, [dailyForecast, selectedDayNum]);

  // Existing override if already set for this day
  const existingOverride = useMemo(() => {
    return resourceForecastService.getManualOverride(selectedDayNum);
  }, [selectedDayNum, isOpen]);

  // Form State
  const [corridorId, setCorridorId] = useState<string>('ALL');
  const [shift, setShift] = useState<'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK'>('NIGHT_MEGA_BLOCK');
  const [manpowerRequired, setManpowerRequired] = useState<number>(100);
  const [manpowerAvailable, setManpowerAvailable] = useState<number>(120);
  const [machineryRequired, setMachineryRequired] = useState<number>(10);
  const [machineryAvailable, setMachineryAvailable] = useState<number>(14);

  // Trade Breakdowns
  const [trackmen, setTrackmen] = useState<number>(55);
  const [signalTechs, setSignalTechs] = useState<number>(20);
  const [oheLinesmen, setOheLinesmen] = useState<number>(20);
  const [safetyLookouts, setSafetyLookouts] = useState<number>(5);

  // Machinery Breakdowns
  const [tampers, setTampers] = useState<number>(3);
  const [regulators, setRegulators] = useState<number>(2);
  const [stabilizers, setStabilizers] = useState<number>(1);
  const [towerWagons, setTowerWagons] = useState<number>(2);
  const [usfdCars, setUsfdCars] = useState<number>(2);

  // Metadata
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [plannerName, setPlannerName] = useState<string>('Shri A.K. Mathur (Sr. DOM / Planning)');
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [showTradeBreakdown, setShowTradeBreakdown] = useState<boolean>(false);
  const [showMachineBreakdown, setShowMachineBreakdown] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recalculationResult, setRecalculationResult] = useState<ConflictRecalculationResult | null>(null);

  // Populate form fields whenever selected day or modal opens
  useEffect(() => {
    if (!currentDayPoint) return;
    setRecalculationResult(null);

    const override = resourceForecastService.getManualOverride(selectedDayNum);
    if (override) {
      setCorridorId(override.corridorId || currentDayPoint.targetCorridorId || 'ALL');
      setShift(override.shift || 'NIGHT_MEGA_BLOCK');
      setManpowerRequired(override.overrideManpowerRequired ?? currentDayPoint.manpowerRequired);
      setManpowerAvailable(override.overrideManpowerAvailable ?? currentDayPoint.manpowerAvailable);
      setMachineryRequired(override.overrideMachinerySlotsRequired ?? currentDayPoint.machinerySlotsRequired);
      setMachineryAvailable(override.overrideMachinerySlotsAvailable ?? currentDayPoint.machinerySlotsAvailable);

      setTrackmen(override.overrideTrackmenRequired ?? currentDayPoint.trackmenRequired);
      setSignalTechs(override.overrideSignalTechsRequired ?? currentDayPoint.signalTechsRequired);
      setOheLinesmen(override.overrideOheLinesmenRequired ?? currentDayPoint.oheLinesmenRequired);
      setSafetyLookouts(override.overrideSafetyLookoutsRequired ?? currentDayPoint.safetyLookoutsRequired);

      setTampers(override.overrideTampersRequired ?? currentDayPoint.tampersRequired);
      setRegulators(override.overrideBallastRegulatorsRequired ?? currentDayPoint.ballastRegulatorsRequired);
      setStabilizers(override.overrideStabilizersRequired ?? currentDayPoint.stabilizersRequired);
      setTowerWagons(override.overrideTowerWagonsRequired ?? currentDayPoint.towerWagonsRequired);
      setUsfdCars(override.overrideUsfdCarsRequired ?? currentDayPoint.usfdCarsRequired);

      setAdjustmentReason(override.adjustmentReason || '');
      setPlannerName(override.plannerName || 'Shri A.K. Mathur (Sr. DOM / Planning)');
      setNotes(override.notes || '');
    } else {
      setCorridorId(currentDayPoint.targetCorridorId || 'ALL');
      setShift(currentDayPoint.dayOfWeek === 'Sat' || currentDayPoint.dayOfWeek === 'Sun' ? 'NIGHT_MEGA_BLOCK' : 'DAY_SHIFT');
      setManpowerRequired(currentDayPoint.manpowerRequired);
      setManpowerAvailable(currentDayPoint.manpowerAvailable);
      setMachineryRequired(currentDayPoint.machinerySlotsRequired);
      setMachineryAvailable(currentDayPoint.machinerySlotsAvailable);

      setTrackmen(currentDayPoint.trackmenRequired);
      setSignalTechs(currentDayPoint.signalTechsRequired);
      setOheLinesmen(currentDayPoint.oheLinesmenRequired);
      setSafetyLookouts(currentDayPoint.safetyLookoutsRequired);

      setTampers(currentDayPoint.tampersRequired);
      setRegulators(currentDayPoint.ballastRegulatorsRequired);
      setStabilizers(currentDayPoint.stabilizersRequired);
      setTowerWagons(currentDayPoint.towerWagonsRequired);
      setUsfdCars(currentDayPoint.usfdCarsRequired);

      setAdjustmentReason(currentDayPoint.primaryAgingDriver || 'Scheduled Maintenance Adjustment');
      setPlannerName('Shri A.K. Mathur (Sr. DOM / Planning)');
      setNotes('');
    }
  }, [selectedDayNum, currentDayPoint, isOpen]);

  // Live Calculations
  const calculatedManpowerDeficit = Math.max(0, manpowerRequired - manpowerAvailable);
  const calculatedMachineryDeficit = Math.max(0, machineryRequired - machineryAvailable);
  const isDeficit = calculatedManpowerDeficit > 0 || calculatedMachineryDeficit > 0;
  const netManpowerDelta = currentDayPoint ? manpowerRequired - currentDayPoint.manpowerRequired : 0;

  // Candidate affected blocks
  const affectedCandidateBlocks = useMemo(() => {
    if (!currentDayPoint) return [];
    const targetCid = corridorId === 'ALL' ? currentDayPoint.targetCorridorId : corridorId;
    return blocks.filter((b) => {
      if (corridorId === 'ALL') return true;
      return b.corridorId === targetCid;
    }).slice(0, 4);
  }, [blocks, corridorId, currentDayPoint]);

  // Handle Preset Selection
  const applyPreset = (preset: (typeof PRESET_DIRECTIVES)[number]) => {
    if (!currentDayPoint) return;
    const baseReq = currentDayPoint.manpowerRequired;
    const baseAvail = currentDayPoint.manpowerAvailable;
    const baseMachReq = currentDayPoint.machinerySlotsRequired;

    const newReq = baseReq + (preset.manpowerDelta || 0);
    const newAvail = baseAvail + (preset.availableDelta || 0);
    const newMachReq = baseMachReq + (preset.machineDelta || 0);

    setManpowerRequired(newReq);
    setManpowerAvailable(newAvail);
    setMachineryRequired(newMachReq);
    setShift(preset.shift);
    setAdjustmentReason(preset.title);
    setNotes(preset.desc);

    // Proportionally scale trades
    setTrackmen(Math.round(newReq * 0.52));
    setSignalTechs(Math.round(newReq * 0.18));
    setOheLinesmen(Math.round(newReq * 0.20));
    setSafetyLookouts(Math.max(2, newReq - Math.round(newReq * 0.90)));
  };

  // Handle Quick Steppers
  const adjustManpower = (delta: number) => {
    setManpowerRequired((prev) => {
      const updated = Math.max(10, prev + delta);
      setTrackmen(Math.round(updated * 0.52));
      setSignalTechs(Math.round(updated * 0.18));
      setOheLinesmen(Math.round(updated * 0.20));
      setSafetyLookouts(Math.max(2, updated - Math.round(updated * 0.90)));
      return updated;
    });
  };

  // Submit and Run Conflict Engine Recalculation
  const handleRunRecalculation = async () => {
    if (!currentDayPoint) return;
    setIsSubmitting(true);

    try {
      const overridePayload: DailyForecastOverride = {
        overrideId: `OVR-D${selectedDayNum}-${Date.now()}`,
        dayNumber: selectedDayNum,
        date: currentDayPoint.date,
        displayDate: currentDayPoint.displayDate,
        corridorId,
        shift,
        overrideManpowerRequired: manpowerRequired,
        overrideManpowerAvailable: manpowerAvailable,
        overrideMachinerySlotsRequired: machineryRequired,
        overrideMachinerySlotsAvailable: machineryAvailable,
        overrideTrackmenRequired: trackmen,
        overrideSignalTechsRequired: signalTechs,
        overrideOheLinesmenRequired: oheLinesmen,
        overrideSafetyLookoutsRequired: safetyLookouts,
        overrideTampersRequired: tampers,
        overrideBallastRegulatorsRequired: regulators,
        overrideStabilizersRequired: stabilizers,
        overrideTowerWagonsRequired: towerWagons,
        overrideUsfdCarsRequired: usfdCars,
        adjustmentReason: adjustmentReason.trim() || 'Planner Manual Allocation Override',
        plannerName: plannerName.trim() || 'Railway Operations Planner',
        adjustedAt: new Date().toISOString(),
        notes: notes.trim(),
        impactSeverity: calculatedManpowerDeficit > 25 ? 'CRITICAL' : calculatedManpowerDeficit > 0 ? 'HIGH' : 'LOW',
      };

      // 1. Update forecast service store
      resourceForecastService.setManualOverride(overridePayload);

      // 2. Prepare recalculated day point snapshot
      const simulatedDayPoint = {
        dayNumber: selectedDayNum,
        date: currentDayPoint.date,
        displayDate: currentDayPoint.displayDate,
        manpowerRequired,
        manpowerAvailable,
        manpowerDeficit: calculatedManpowerDeficit,
        machinerySlotsRequired: machineryRequired,
        machinerySlotsAvailable: machineryAvailable,
        machineryDeficit: calculatedMachineryDeficit,
        targetCorridorId: corridorId === 'ALL' ? currentDayPoint.targetCorridorId : corridorId,
      };

      // 3. Trigger Conflict Engine recalculation via API
      const result = await recalculateConflictsForForecastAdjustment(overridePayload, simulatedDayPoint);

      setRecalculationResult(result);
      onAdjustmentSaved(result, overridePayload);
    } catch (err) {
      console.error('Failed to recalculate conflicts for manual override:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset of Override for this Day
  const handleResetDay = async () => {
    if (!currentDayPoint) return;
    setIsSubmitting(true);
    try {
      resourceForecastService.removeManualOverride(selectedDayNum);
      await resetForecastAdjustment(selectedDayNum);
      onAdjustmentReset(selectedDayNum);
      setRecalculationResult(null);

      // Reset local inputs to baseline
      setManpowerRequired(currentDayPoint.manpowerRequired);
      setManpowerAvailable(currentDayPoint.manpowerAvailable);
      setMachineryRequired(currentDayPoint.machinerySlotsRequired);
      setMachineryAvailable(currentDayPoint.machinerySlotsAvailable);
      setAdjustmentReason('');
      setNotes('');
    } catch (err) {
      console.error('Failed to reset forecast override:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-override-title"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="manual-override-title" className="text-lg font-bold text-white tracking-wide">
                  Manual Forecast Adjustment & Conflict Recalculation
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  AI Conflict Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Override daily manpower and machinery demand counts to simulate division directives and trigger real-time block conflict checks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Close Adjustment Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 flex-1">
          {/* Post-Recalculation Success/Hazard Banner */}
          {recalculationResult && (
            <div
              className={`p-4 rounded-xl border transition-all animate-fade-in ${
                recalculationResult.netManpowerDeficit > 0 || recalculationResult.newConflictsGeneratedCount > 0
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      recalculationResult.netManpowerDeficit > 0 || recalculationResult.newConflictsGeneratedCount > 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {recalculationResult.netManpowerDeficit > 0 || recalculationResult.newConflictsGeneratedCount > 0 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">
                        ⚡ Conflict Engine Recalculation Complete ({recalculationResult.executionTimeMs}ms)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700">
                        Day {recalculationResult.dayNumber} ({recalculationResult.displayDate})
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-90 leading-relaxed">
                      {recalculationResult.recalculationNotes.join(' ')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900/70 border border-slate-700 font-medium">
                        Affected Blocks: <strong>{recalculationResult.affectedBlocksCount}</strong>
                      </span>
                      {recalculationResult.newConflictsGeneratedCount > 0 && (
                        <span className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-600/40 text-rose-300 font-medium">
                          New Conflicts Flagged: <strong>{recalculationResult.newConflictsGeneratedCount}</strong>
                        </span>
                      )}
                      {recalculationResult.conflictsResolvedCount > 0 && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-medium">
                          Conflicts Resolved: <strong>{recalculationResult.conflictsResolvedCount}</strong>
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-md bg-slate-900/70 border border-slate-700 font-medium">
                        Total Open Conflicts: <strong>{recalculationResult.totalActiveConflicts}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {onNavigateToConflicts && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToConflicts();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition-colors shadow-sm shrink-0 ml-3"
                  >
                    <span>Inspect Conflicts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Day & Horizon Scrubber / Selector */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Select Forecast Day (30-Day Window)</span>
              </label>
              {existingOverride ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-900/60 text-amber-300 border border-amber-600/50 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Planner Override Active on this Day</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs rounded bg-slate-700/60 text-slate-400">
                  Standard System Baseline
                </span>
              )}
            </div>

            {/* Quick Day Scrubber Strip */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {dailyForecast.slice(0, 30).map((dp) => {
                const isSelected = dp.dayNumber === selectedDayNum;
                const hasOverride = resourceForecastService.getManualOverride(dp.dayNumber);
                const hasDeficit = dp.manpowerDeficit > 0;

                return (
                  <button
                    key={dp.dayNumber}
                    onClick={() => setSelectedDayNum(dp.dayNumber)}
                    className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-1 rounded-lg text-xs transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md font-bold'
                        : hasOverride
                        ? 'bg-amber-950/40 text-amber-300 border-amber-600/50 hover:bg-amber-900/40'
                        : hasDeficit
                        ? 'bg-rose-950/30 text-rose-300 border-rose-700/40 hover:bg-rose-900/40'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">{dp.dayOfWeek}</span>
                    <span className="text-sm font-semibold leading-tight">D{dp.dayNumber}</span>
                    <span className="text-[10px] opacity-80">{dp.displayDate.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Day Header Summary */}
            {currentDayPoint && (
              <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900/80 px-3.5 py-2.5 rounded-lg border border-slate-700/80">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white text-sm">
                    Day {currentDayPoint.dayNumber}: {currentDayPoint.dayOfWeek}, {currentDayPoint.displayDate}, 2026
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-300 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Primary Corridor: <strong>{currentDayPoint.targetCorridorId}</strong></span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <span>Baseline: <strong>{currentDayPoint.manpowerRequired}</strong> Staff</span>
                  <span>•</span>
                  <span>Available: <strong>{currentDayPoint.manpowerAvailable}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Operational Directives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Quick Scenario / Directive Presets</span>
              </label>
              <span className="text-[11px] text-slate-400">Click to autofill operational scenario</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PRESET_DIRECTIVES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all text-xs group"
                >
                  <div className="font-semibold text-white group-hover:text-blue-300 truncate">
                    {preset.title}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {preset.desc}
                  </div>
                  <div className="mt-1.5 flex items-center space-x-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono">
                      {preset.manpowerDelta > 0 ? `+${preset.manpowerDelta} Staff` : preset.availableDelta ? `+${preset.availableDelta} Standby` : '0 Delta'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 font-mono">
                      +{preset.machineDelta} Machines
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Overrides Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Headcount & Machinery Counts */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Manpower & Machine Overrides</span>
              </h3>

              {/* Manpower Required */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Total Manpower Required (Staff)</span>
                  {netManpowerDelta !== 0 && (
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        netManpowerDelta > 0 ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'
                      }`}
                    >
                      {netManpowerDelta > 0 ? `+${netManpowerDelta}` : netManpowerDelta} vs Baseline
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10"
                    max="400"
                    value={manpowerRequired}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setManpowerRequired(val);
                      setTrackmen(Math.round(val * 0.52));
                      setSignalTechs(Math.round(val * 0.18));
                      setOheLinesmen(Math.round(val * 0.20));
                      setSafetyLookouts(Math.max(2, val - Math.round(val * 0.90)));
                    }}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => adjustManpower(-10)}
                      className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-mono text-xs font-bold transition-colors"
                      title="Decrease by 10"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustManpower(10)}
                      className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-mono text-xs font-bold transition-colors"
                      title="Increase by 10"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustManpower(25)}
                      className="px-2.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-mono text-xs font-bold transition-colors"
                      title="Increase by 25"
                    >
                      +25
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Original forecast: <strong>{currentDayPoint?.manpowerRequired ?? 120} staff</strong>
                </p>
              </div>

              {/* Manpower Available */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Available Roster Capacity (Gangs + Standby)</span>
                  <span className="text-[11px] text-slate-400">Baseline: {currentDayPoint?.manpowerAvailable ?? 125}</span>
                </div>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={manpowerAvailable}
                  onChange={(e) => setManpowerAvailable(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Machinery Slots Required & Available */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/60">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-200">Required Machine Slots</span>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={machineryRequired}
                    onChange={(e) => setMachineryRequired(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium text-sm focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-200">Available Machine Slots</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={machineryAvailable}
                    onChange={(e) => setMachineryAvailable(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium text-sm focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Collapsible Trade Breakdown */}
              <div className="pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowTradeBreakdown(!showTradeBreakdown)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white py-1"
                >
                  <span className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fine-Tune Trade Headcount Breakdown</span>
                  </span>
                  {showTradeBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTradeBreakdown && (
                  <div className="grid grid-cols-2 gap-2.5 mt-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-700/70 text-xs">
                    <div>
                      <span className="text-slate-400">Trackmen (P-Way):</span>
                      <input
                        type="number"
                        min="0"
                        value={trackmen}
                        onChange={(e) => setTrackmen(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">S&T Signal Techs:</span>
                      <input
                        type="number"
                        min="0"
                        value={signalTechs}
                        onChange={(e) => setSignalTechs(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">25kV OHE Linesmen:</span>
                      <input
                        type="number"
                        min="0"
                        value={oheLinesmen}
                        onChange={(e) => setOheLinesmen(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Safety Lookouts:</span>
                      <input
                        type="number"
                        min="0"
                        value={safetyLookouts}
                        onChange={(e) => setSafetyLookouts(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Corridor Scope, Operational Reason, & Live Preview */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Operational Context & Corridor Scope</span>
              </h3>

              {/* Corridor & Shift Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Target Corridor Scope</label>
                  <select
                    value={corridorId}
                    onChange={(e) => setCorridorId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Network Corridors</option>
                    {corridors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.name.split('(')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Operational Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="NIGHT_MEGA_BLOCK">Night Mega-Block (01:00 – 05:30)</option>
                    <option value="DAY_SHIFT">Day Shift Window (09:00 – 17:00)</option>
                    <option value="AFTERNOON_SHIFT">Afternoon Shadow (14:00 – 22:00)</option>
                  </select>
                </div>
              </div>

              {/* Adjustment Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Directive / Adjustment Reason *</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., DRM Emergency Ballast Renewal Directive"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Planner Remarks & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Authorizing Officer</label>
                  <input
                    type="text"
                    value={plannerName}
                    onChange={(e) => setPlannerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Operational Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ref Memo / Directive Number"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {/* Live Conflict Engine Anticipation Preview */}
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conflict Engine Anticipated Impact</span>
                </span>

                <div
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
                    isDeficit
                      ? 'bg-rose-950/30 border-rose-600/40 text-rose-200'
                      : 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Resource Balance:</span>
                    <span className="font-bold font-mono">
                      {isDeficit
                        ? `🚨 Deficit: -${calculatedManpowerDeficit} Staff, -${calculatedMachineryDeficit} Machines`
                        : `✅ Surplus: +${manpowerAvailable - manpowerRequired} Staff Buffer`}
                    </span>
                  </div>

                  <p className="text-[11px] opacity-90 leading-tight">
                    {isDeficit
                      ? `Applying this override will flag RESOURCE_CONTENTION on affected blocks on ${corridorId}. Maintenance possession windows will require rescheduling or auxiliary gang mobilization.`
                      : `Sufficient headcount verified. The conflict engine will clear any previously raised resource contention flags for this day.`}
                  </p>

                  {/* Affected Blocks list preview */}
                  {affectedCandidateBlocks.length > 0 && (
                    <div className="pt-1.5 border-t border-current/20">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-75">
                        Potentially Affected Corridor Blocks:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {affectedCandidateBlocks.map((b) => (
                          <span
                            key={b.blockId}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-slate-200"
                          >
                            {b.blockId} ({b.corridorId} {b.startTime}–{b.endTime})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-800/90 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            {existingOverride && (
              <button
                type="button"
                onClick={handleResetDay}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-700/80 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 rounded-lg text-xs font-medium border border-slate-600 hover:border-rose-600/50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Day to Baseline</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel / Close
            </button>

            <button
              type="button"
              onClick={handleRunRecalculation}
              disabled={isSubmitting || !adjustmentReason.trim()}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-lg ${
                isSubmitting || !adjustmentReason.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recalculating Conflict Engine...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Run Conflict Engine Recalculation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
