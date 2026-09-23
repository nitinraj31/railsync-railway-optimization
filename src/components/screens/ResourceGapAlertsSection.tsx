import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Truck,
  Users,
  HardHat,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Filter,
  Layers,
  Zap,
  Check,
  Eye,
  Activity,
  Flame,
  CloudRain,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  X,
  Sliders,
  Percent,
} from 'lucide-react';
import {
  MaintenanceResourceForecastResult,
  DailyForecastPoint,
  ForecastScenarioType,
  ForecastHorizonDays,
  Corridor,
  MachineryResource,
  ManpowerGang,
  DeficitAlertThresholdSettings,
  DEFAULT_DEFICIT_ALERT_SETTINGS,
} from '../../types';
import { resourceForecastService } from '../../services/resourceForecastService';

interface ResourceGapAlertsSectionProps {
  corridors?: Corridor[];
  currentSelectedShift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  onSelectShift?: (shift: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK') => void;
  onSelectCorridor?: (corridorId: string) => void;
  onOpenFullForecast?: () => void;
  onMobilizeReserveFleet?: (corridorId: string, resourceType: 'MANPOWER' | 'MACHINERY', count: number) => void;
  thresholdSettings?: DeficitAlertThresholdSettings;
  onOpenThresholdModal?: () => void;
}

export type GapFilterType = 'ALL_GAPS' | 'CRITICAL_ONLY' | 'MANPOWER_GAPS' | 'MACHINERY_GAPS';

export interface ShiftGapAlert {
  id: string;
  dayNumber: number;
  date: string;
  displayDate: string;
  dayOfWeek: string;
  shiftName: 'Day Shift (08:00 – 14:00)' | 'Afternoon Shift (14:00 – 20:00)' | 'Night Mega Block (22:00 – 04:00)';
  shiftKey: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  corridorId: string;
  corridorName: string;
  manpowerRequired: number;
  manpowerAvailable: number;
  manpowerDeficit: number;
  manpowerDeficitPct: number;
  manpowerUtilizationPct: number;
  machinerySlotsRequired: number;
  machinerySlotsAvailable: number;
  machineryDeficit: number;
  machineryDeficitPct: number;
  machineryUtilizationPct: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  tradeDeficits: string[];
  machineDeficits: string[];
  primaryDefectDriver: string;
  primaryAgingDriver: string;
  recommendedAction: string;
  statutoryReference: string;
  requiresSrDenEscalation?: boolean;
  isResolved?: boolean;
}

export const ResourceGapAlertsSection: React.FC<ResourceGapAlertsSectionProps> = ({
  corridors = [],
  currentSelectedShift,
  onSelectShift,
  onSelectCorridor,
  onOpenFullForecast,
  onMobilizeReserveFleet,
  thresholdSettings,
  onOpenThresholdModal,
}) => {
  // Horizon & Scenario State
  const [horizonDays, setHorizonDays] = useState<ForecastHorizonDays>(30);
  const [scenario, setScenario] = useState<ForecastScenarioType>('BASELINE');
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>('ALL');
  const [gapFilter, setGapFilter] = useState<GapFilterType>('ALL_GAPS');
  const [isSectionCollapsed, setIsSectionCollapsed] = useState<boolean>(false);
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);
  const [actionFeedbackMessage, setActionFeedbackMessage] = useState<string | null>(null);
  const [resolvedAlertIds, setResolvedAlertIds] = useState<Set<string>>(new Set());
  const [activeDrilldownAlert, setActiveDrilldownAlert] = useState<ShiftGapAlert | null>(null);

  // Compute forecast dynamically based on scenario and horizon
  const forecast: MaintenanceResourceForecastResult = useMemo(() => {
    return resourceForecastService.computeForecast(scenario, horizonDays, selectedCorridorFilter);
  }, [scenario, horizonDays, selectedCorridorFilter]);

  // Transform dailyForecast into actionable ShiftGapAlert items
  const effectiveSettings = thresholdSettings || DEFAULT_DEFICIT_ALERT_SETTINGS;

  const shiftGapAlerts: ShiftGapAlert[] = useMemo(() => {
    const alerts: ShiftGapAlert[] = [];

    forecast.dailyForecast.forEach((point: DailyForecastPoint) => {
      // Calculate available base capacity
      const mpAvail = Math.max(1, point.manpowerAvailable);
      const machAvail = Math.max(1, point.machinerySlotsAvailable);

      const mpDeficit = Math.max(0, point.manpowerRequired - point.manpowerAvailable);
      const machDeficit = Math.max(0, point.machinerySlotsRequired - point.machinerySlotsAvailable);

      const mpDeficitPct = Math.round((mpDeficit / mpAvail) * 100);
      const machDeficitPct = Math.round((machDeficit / machAvail) * 100);

      const mpUtilPct = Math.round((point.manpowerRequired / mpAvail) * 100);
      const machUtilPct = Math.round((point.machinerySlotsRequired / machAvail) * 100);

      let isMpCritical = false;
      let isMpWarning = false;
      let isMachCritical = false;
      let isMachWarning = false;

      if (effectiveSettings.thresholdMode === 'DEFICIT_PERCENT') {
        isMpCritical =
          mpDeficitPct >= effectiveSettings.manpowerCriticalThresholdPct &&
          mpDeficit >= effectiveSettings.minimumManpowerDeficitHeadcount;
        isMpWarning =
          mpDeficitPct >= effectiveSettings.manpowerWarningThresholdPct &&
          mpDeficit >= effectiveSettings.minimumManpowerDeficitHeadcount;

        isMachCritical =
          machDeficitPct >= effectiveSettings.machineryCriticalThresholdPct &&
          machDeficit >= effectiveSettings.minimumMachineryDeficitUnits;
        isMachWarning =
          machDeficitPct >= effectiveSettings.machineryWarningThresholdPct &&
          machDeficit >= effectiveSettings.minimumMachineryDeficitUnits;
      } else {
        isMpCritical =
          mpUtilPct >= effectiveSettings.manpowerCriticalThresholdPct &&
          mpDeficit >= effectiveSettings.minimumManpowerDeficitHeadcount;
        isMpWarning = mpUtilPct >= effectiveSettings.manpowerWarningThresholdPct;

        isMachCritical =
          machUtilPct >= effectiveSettings.machineryCriticalThresholdPct &&
          machDeficit >= effectiveSettings.minimumMachineryDeficitUnits;
        isMachWarning = machUtilPct >= effectiveSettings.machineryWarningThresholdPct;
      }

      // Check corridor override filter
      if (
        effectiveSettings.targetCorridorOverride &&
        effectiveSettings.targetCorridorOverride !== 'ALL' &&
        point.targetCorridorId !== effectiveSettings.targetCorridorOverride
      ) {
        return;
      }

      const hasManpowerGap = mpDeficit > 0;
      const hasMachineGap = machDeficit > 0;

      // Flag only shifts that deviate beyond the user-defined percentage threshold limits
      const breachesUserLimits = isMpWarning || isMpCritical || isMachWarning || isMachCritical;
      if (!breachesUserLimits) {
        return;
      }

      // Map to the most probable affected railway maintenance shift
      let shiftName: 'Day Shift (08:00 – 14:00)' | 'Afternoon Shift (14:00 – 20:00)' | 'Night Mega Block (22:00 – 04:00)' =
        'Night Mega Block (22:00 – 04:00)';
      let shiftKey: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK' = 'NIGHT_MEGA_BLOCK';

      if (point.primaryDefectDriver.toLowerCase().includes('point machine') || point.dayNumber % 4 === 1) {
        shiftName = 'Afternoon Shift (14:00 – 20:00)';
        shiftKey = 'AFTERNOON_SHIFT';
      } else if (point.primaryDefectDriver.toLowerCase().includes('routine') || point.dayNumber % 5 === 2) {
        shiftName = 'Day Shift (08:00 – 14:00)';
        shiftKey = 'DAY_SHIFT';
      }

      // Identify trade breakdown deficits
      const tradeDeficits: string[] = [];
      if (point.trackmenRequired > 85) {
        tradeDeficits.push(`Trackmen (P-Way): ${point.trackmenRequired} req vs 80 max`);
      }
      if (point.signalTechsRequired > 28) {
        tradeDeficits.push(`S&T Techs: ${point.signalTechsRequired} req vs 24 max`);
      }
      if (point.oheLinesmenRequired > 30) {
        tradeDeficits.push(`OHE Linemen (TRD): ${point.oheLinesmenRequired} req vs 28 max`);
      }
      if (point.safetyLookoutsRequired > 16) {
        tradeDeficits.push(`Lookouts / Flagmen: ${point.safetyLookoutsRequired} req`);
      }
      if (tradeDeficits.length === 0 && hasManpowerGap) {
        tradeDeficits.push(`Combined gang deficit: -${point.manpowerDeficit} personnel (+${mpDeficitPct}%)`);
      }

      // Identify machine breakdown deficits
      const machineDeficits: string[] = [];
      if (point.tampersRequired > 3) {
        machineDeficits.push(`Tie Tampers (09-3X CSM): ${point.tampersRequired} req`);
      }
      if (point.ballastRegulatorsRequired > 2) {
        machineDeficits.push(`Ballast Regulators (BRM): ${point.ballastRegulatorsRequired} req`);
      }
      if (point.towerWagonsRequired > 2) {
        machineDeficits.push(`OHE Tower Wagons (RUPS): ${point.towerWagonsRequired} req`);
      }
      if (point.specialMachinesRequired > 0) {
        machineDeficits.push(`Deep Ballast Cleaner (BCM): ${point.specialMachinesRequired} req`);
      }
      if (machineDeficits.length === 0 && hasMachineGap) {
        machineDeficits.push(`Track machinery slots: -${point.machineryDeficit} machine(s) (+${machDeficitPct}%)`);
      }

      // Severity classification driven by custom threshold rules
      let severity: 'CRITICAL' | 'HIGH' | 'MODERATE' = 'MODERATE';
      if (isMpCritical || isMachCritical || (isMpWarning && isMachWarning)) {
        severity = 'CRITICAL';
      } else if (isMpWarning || isMachWarning || point.manpowerDeficit >= 10 || point.machineryDeficit >= 1) {
        severity = 'HIGH';
      }

      // Corridor Name
      const corridorObj = corridors.find((c) => c.id === point.targetCorridorId);
      const corridorName = corridorObj ? corridorObj.name : `Corridor ${point.targetCorridorId}`;

      // Statutory IR Reference
      let statutoryRef = 'IRTMM Para 3.2.1 (Track Machine Spacing & Headway)';
      if (point.primaryDefectDriver.toLowerCase().includes('ohe') || point.primaryDefectDriver.toLowerCase().includes('catenary')) {
        statutoryRef = 'ACTM Vol II Para 20.3 (OHE Dropper Renewal & Power Block Rules)';
      } else if (point.primaryDefectDriver.toLowerCase().includes('usfd') || point.primaryAgingDriver.toLowerCase().includes('rail')) {
        statutoryRef = 'IRPWM Para 4.12 & Manual of Long Welded Rails (LWR) Para 6.2';
      } else if (point.primaryAgingDriver.toLowerCase().includes('bridge')) {
        statutoryRef = 'IRBM (Bridge Manual) Para 1102 & RDSO BS-114';
      }

      const alertId = `GAP-${point.targetCorridorId}-D${point.dayNumber}`;

      alerts.push({
        id: alertId,
        dayNumber: point.dayNumber,
        date: point.date,
        displayDate: point.displayDate,
        dayOfWeek: point.dayOfWeek,
        shiftName,
        shiftKey,
        corridorId: point.targetCorridorId,
        corridorName,
        manpowerRequired: point.manpowerRequired,
        manpowerAvailable: point.manpowerAvailable,
        manpowerDeficit: point.manpowerDeficit,
        manpowerDeficitPct: mpDeficitPct,
        manpowerUtilizationPct: mpUtilPct,
        machinerySlotsRequired: point.machinerySlotsRequired,
        machinerySlotsAvailable: point.machinerySlotsAvailable,
        machineryDeficit: point.machineryDeficit,
        machineryDeficitPct: machDeficitPct,
        machineryUtilizationPct: machUtilPct,
        severity,
        tradeDeficits,
        machineDeficits,
        primaryDefectDriver: point.primaryDefectDriver,
        primaryAgingDriver: point.primaryAgingDriver,
        recommendedAction: point.recommendedAction,
        statutoryReference: statutoryRef,
        requiresSrDenEscalation: effectiveSettings.autoEscalateToSrDen && (severity === 'CRITICAL' || isMpCritical || isMachCritical),
        isResolved: resolvedAlertIds.has(alertId),
      });
    });

    return alerts;
  }, [forecast, corridors, resolvedAlertIds, effectiveSettings]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return shiftGapAlerts.filter((alert) => {
      if (alert.isResolved) return false;

      if (gapFilter === 'CRITICAL_ONLY' && alert.severity !== 'CRITICAL') {
        return false;
      }
      if (gapFilter === 'MANPOWER_GAPS' && alert.manpowerDeficit <= 0) {
        return false;
      }
      if (gapFilter === 'MACHINERY_GAPS' && alert.machineryDeficit <= 0) {
        return false;
      }
      return true;
    });
  }, [shiftGapAlerts, gapFilter]);

  // Summary counts
  const totalGapsCount = shiftGapAlerts.filter((a) => !a.isResolved).length;
  const criticalGapsCount = shiftGapAlerts.filter((a) => !a.isResolved && a.severity === 'CRITICAL').length;
  const peakManpowerDeficit = Math.max(0, ...shiftGapAlerts.map((a) => (a.isResolved ? 0 : a.manpowerDeficit)));
  const peakMachineDeficit = Math.max(0, ...shiftGapAlerts.map((a) => (a.isResolved ? 0 : a.machineryDeficit)));

  // Handle Mobilize Standby Reserve from Alert Card
  const handleMobilizeForAlert = (alert: ShiftGapAlert) => {
    setResolvedAlertIds((prev) => new Set([...prev, alert.id]));

    if (onMobilizeReserveFleet) {
      if (alert.machineryDeficit > 0) {
        onMobilizeReserveFleet(alert.corridorId, 'MACHINERY', alert.machineryDeficit);
      }
      if (alert.manpowerDeficit > 0) {
        onMobilizeReserveFleet(alert.corridorId, 'MANPOWER', alert.manpowerDeficit);
      }
    }

    setActionFeedbackMessage(
      `Standby Resource Mobilization Confirmed: Deployed +${alert.manpowerDeficit || 0} reserve track personnel and +${alert.machineryDeficit || 0} machinery unit(s) from Central TMD to ${alert.corridorId} for ${alert.shiftName}. Gap resolved.`
    );

    setTimeout(() => {
      setActionFeedbackMessage(null);
    }, 6000);
  };

  // Handle Jump to Shift & Corridor in Workspace
  const handleJumpToShiftInWorkspace = (alert: ShiftGapAlert) => {
    if (onSelectShift) {
      onSelectShift(alert.shiftKey);
    }
    if (onSelectCorridor) {
      onSelectCorridor(alert.corridorId);
    }
    setActionFeedbackMessage(
      `Switched active workspace view to: ${alert.shiftName} on Corridor ${alert.corridorId}.`
    );
    setTimeout(() => {
      setActionFeedbackMessage(null);
    }, 4000);
  };

  // AI Strategic Re-synthesis
  const handleTriggerAiSynthesis = async () => {
    setIsAiSynthesizing(true);
    try {
      await resourceForecastService.fetchGeminiForecastSynthesis(forecast);
      setActionFeedbackMessage(
        `Gemini AI Strategic Forecast completed: Evaluated ${shiftGapAlerts.length} shifts across 30 days. Priority dispatch directives refreshed.`
      );
    } catch (err) {
      console.error('AI synthesis failed:', err);
    } finally {
      setIsAiSynthesizing(false);
      setTimeout(() => {
        setActionFeedbackMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#0d162e] via-[#0e1732] to-[#0a1126] border border-amber-900/40 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
      {/* Top Banner / Header */}
      <div className="p-4 md:p-5 border-b border-amber-900/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400 shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
                  <span>Real-Time Resource Gap & Deficit Alerts</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800">
                  {totalGapsCount > 0 ? `${totalGapsCount} SHIFTS EXCEED CAPACITY` : 'ALL SHIFTS BALANCED'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Live Predictive Engine</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Real-time foresight linking recurring defect clusters and statutory asset aging cycles to detect future
                shifts where manpower trade headcount or heavy machine slots will breach corridor limits.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenThresholdModal && (
              <button
                id="btn-alert-thresholds-gap-section"
                onClick={onOpenThresholdModal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-700/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Configure custom percentage deficit alert thresholds for manpower and machinery"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Threshold Settings</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-amber-900 text-amber-200 font-mono">
                  {effectiveSettings.thresholdMode === 'DEFICIT_PERCENT'
                    ? `+${effectiveSettings.manpowerWarningThresholdPct}%/+${effectiveSettings.manpowerCriticalThresholdPct}%`
                    : `${effectiveSettings.manpowerWarningThresholdPct}%/${effectiveSettings.manpowerCriticalThresholdPct}%`}
                </span>
              </button>
            )}

            <button
              onClick={handleTriggerAiSynthesis}
              disabled={isAiSynthesizing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isAiSynthesizing ? 'Analyzing Fleet...' : 'Gemini AI Advisor'}</span>
            </button>

            {onOpenFullForecast && (
              <button
                onClick={onOpenFullForecast}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>30-Day Forecast Model</span>
              </button>
            )}

            <button
              onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer"
              title={isSectionCollapsed ? 'Expand Gap Alerts' : 'Collapse Gap Alerts'}
            >
              {isSectionCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action feedback toast message */}
        {actionFeedbackMessage && (
          <div className="mt-3 p-3 bg-emerald-950/90 border border-emerald-600/50 rounded-lg text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionFeedbackMessage}</span>
            </div>
            <button
              onClick={() => setActionFeedbackMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 text-[11px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Forecast Controls Strip (Horizon, Scenario, Filter) */}
        {!isSectionCollapsed && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Horizon Selector */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Forecast Time Window</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#070b16] p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setHorizonDays(7)}
                  className={`py-1 text-center rounded text-[11px] font-mono font-medium transition-colors ${
                    horizonDays === 7 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setHorizonDays(14)}
                  className={`py-1 text-center rounded text-[11px] font-mono font-medium transition-colors ${
                    horizonDays === 14 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  14 Days
                </button>
                <button
                  onClick={() => setHorizonDays(30)}
                  className={`py-1 text-center rounded text-[11px] font-mono font-medium transition-colors ${
                    horizonDays === 30 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* Operating Scenario */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" />
                <span>Stress Scenario</span>
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ForecastScenarioType)}
                className="w-full bg-[#070b16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="BASELINE">IRTMM Standard Baseline</option>
                <option value="MONSOON_MOISTURE">Monsoon Soil Saturation (+25%)</option>
                <option value="FREIGHT_SURGE">25T Heavy Axle Freight Surge (+30%)</option>
                <option value="THERMAL_EXPANSION">High Thermal Stress (+35%)</option>
              </select>
            </div>

            {/* Gap Type Filter */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Filter Gap Category</span>
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#070b16] p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setGapFilter('ALL_GAPS')}
                  className={`py-1 px-1 rounded truncate text-center ${
                    gapFilter === 'ALL_GAPS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({totalGapsCount})
                </button>
                <button
                  onClick={() => setGapFilter('CRITICAL_ONLY')}
                  className={`py-1 px-1 rounded truncate text-center ${
                    gapFilter === 'CRITICAL_ONLY' ? 'bg-rose-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Critical ({criticalGapsCount})
                </button>
              </div>
            </div>

            {/* Corridor Scope */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Target Corridor Scope</span>
              </label>
              <select
                value={selectedCorridorFilter}
                onChange={(e) => setSelectedCorridorFilter(e.target.value)}
                className="w-full bg-[#070b16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Network Corridors</option>
                <option value="C001">C001 - Northern Main Trunk</option>
                <option value="C002">C002 - Southern High-Speed Spur</option>
                <option value="C003">C003 - Western Heavy Freight</option>
                <option value="C004">C004 - Eastern Express Link</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content View */}
      {!isSectionCollapsed && (
        <div className="p-4 md:p-5 space-y-4">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#090f20]/90 border border-slate-800/80 p-3 rounded-lg">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Deficit Shifts Flagged</div>
              <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                {totalGapsCount} <span className="text-xs font-normal text-slate-400">/ {forecast.horizonDays} days</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{criticalGapsCount} High-Risk Contention</div>
            </div>

            <div className="bg-[#090f20]/90 border border-slate-800/80 p-3 rounded-lg">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Peak Manpower Deficit</div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                {peakManpowerDeficit > 0 ? `-${peakManpowerDeficit}` : '0'}{' '}
                <span className="text-xs font-normal text-slate-400">staff</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">P-Way Trackmen & S&T Techs</div>
            </div>

            <div className="bg-[#090f20]/90 border border-slate-800/80 p-3 rounded-lg">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Peak Machinery Deficit</div>
              <div className="text-xl font-bold text-orange-400 font-mono mt-0.5">
                {peakMachineDeficit > 0 ? `-${peakMachineDeficit}` : '0'}{' '}
                <span className="text-xs font-normal text-slate-400">machines</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">CSM Tampers & Tower Wagons</div>
            </div>

            <div className="bg-[#090f20]/90 border border-slate-800/80 p-3 rounded-lg">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Most Contested Line</div>
              <div className="text-xl font-bold text-sky-400 font-mono mt-0.5">C003</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Heavy Freight (NDLS-ROK)</div>
            </div>
          </div>

          {/* Sub-Filters / Secondary Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">View Filter:</span>
              <button
                onClick={() => setGapFilter('ALL_GAPS')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  gapFilter === 'ALL_GAPS'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Gaps ({shiftGapAlerts.filter((a) => !a.isResolved).length})
              </button>
              <button
                onClick={() => setGapFilter('CRITICAL_ONLY')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  gapFilter === 'CRITICAL_ONLY'
                    ? 'bg-rose-700 text-white'
                    : 'bg-slate-800/60 text-rose-300 hover:text-rose-100'
                }`}
              >
                Critical Severity ({criticalGapsCount})
              </button>
              <button
                onClick={() => setGapFilter('MANPOWER_GAPS')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  gapFilter === 'MANPOWER_GAPS'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/60 text-sky-300 hover:text-sky-100'
                }`}
              >
                Manpower Shortages
              </button>
              <button
                onClick={() => setGapFilter('MACHINERY_GAPS')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  gapFilter === 'MACHINERY_GAPS'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800/60 text-purple-300 hover:text-purple-100'
                }`}
              >
                Machinery Contention
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Showing <span className="text-amber-300 font-semibold">{filteredAlerts.length}</span> active shift alerts
            </div>
          </div>

          {/* Alert Cards Container */}
          {filteredAlerts.length === 0 ? (
            <div className="bg-[#090f20]/60 border border-slate-800/60 rounded-xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-200 font-mono">
                No Resource Capacity Gaps in Selected Window
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Current gang staffing rosters and track machine depot allocations comfortably fulfill all forecasted
                defect and statutory overhaul requirements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const hasStrobeBeacon = effectiveSettings.enableAudioVisualBeacon && isCritical;
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                      isCritical
                        ? `bg-rose-950/20 border-rose-800/60 hover:border-rose-600 ${
                            hasStrobeBeacon ? 'ring-1 ring-rose-500/60 shadow-lg shadow-rose-950/40' : ''
                          }`
                        : 'bg-slate-900/60 border-slate-800 hover:border-amber-700/60'
                    }`}
                  >
                    <div>
                      {/* Top Card Info Row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                isCritical
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {alert.severity} GAP
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-200">
                              Day {alert.dayNumber}: {alert.displayDate} ({alert.dayOfWeek})
                            </span>
                            <span className="text-xs text-slate-400 font-mono">· {alert.corridorId}</span>
                          </div>
                          <div className="text-xs font-semibold text-amber-300 font-mono mt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{alert.shiftName}</span>
                          </div>
                        </div>

                        {/* Deficit Badge Pills */}
                        <div className="flex flex-col items-end gap-1">
                          {alert.manpowerDeficit > 0 && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                              <span>Gang: -{alert.manpowerDeficit} staff</span>
                              <span className="text-rose-400 font-bold">
                                (+{alert.manpowerDeficitPct}%)
                              </span>
                            </span>
                          )}
                          {alert.machineryDeficit > 0 && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-800 flex items-center gap-1">
                              <span>Fleet: -{alert.machineryDeficit} mach</span>
                              <span className="text-orange-400 font-bold">
                                (+{alert.machineryDeficitPct}%)
                              </span>
                            </span>
                          )}
                          {alert.requiresSrDenEscalation && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5 text-red-400" />
                              <span>Sr. DEN Review</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Demand vs Capacity Details */}
                      <div className="bg-[#060a17]/80 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3 text-sky-400" />
                            <span>Manpower Required:</span>
                          </span>
                          <span>
                            <strong className="text-white">{alert.manpowerRequired}</strong> / {alert.manpowerAvailable}{' '}
                            available{' '}
                            {alert.manpowerDeficit > 0 && (
                              <span className="text-rose-400 font-bold">(-{alert.manpowerDeficit})</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-purple-400" />
                            <span>Machinery Slots:</span>
                          </span>
                          <span>
                            <strong className="text-amber-300">{alert.machinerySlotsRequired}</strong> /{' '}
                            {alert.machinerySlotsAvailable} available{' '}
                            {alert.machineryDeficit > 0 && (
                              <span className="text-orange-400 font-bold">(-{alert.machineryDeficit})</span>
                            )}
                          </span>
                        </div>

                        {/* Trade Specific Shortage Breakdown */}
                        {alert.tradeDeficits.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/60 text-[11px] text-rose-300/90 font-sans">
                            <span className="font-semibold text-slate-400">Trade Shortage: </span>
                            {alert.tradeDeficits.join(' · ')}
                          </div>
                        )}

                        {/* Machine Specific Shortage Breakdown */}
                        {alert.machineDeficits.length > 0 && (
                          <div className="text-[11px] text-amber-300/90 font-sans">
                            <span className="font-semibold text-slate-400">Machines Contested: </span>
                            {alert.machineDeficits.join(' · ')}
                          </div>
                        )}
                      </div>

                      {/* Root Drivers (Defect & Aging Lifecycle) */}
                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="text-[11px] text-slate-300 line-clamp-1">
                          <span className="text-slate-400 font-mono">Defect Driver: </span>
                          <span className="text-sky-300">{alert.primaryDefectDriver}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 line-clamp-1">
                          <span className="text-slate-400 font-mono">Aging Lifecycle: </span>
                          <span className="text-amber-300">{alert.primaryAgingDriver}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono line-clamp-1">
                          Ref: {alert.statutoryReference}
                        </div>
                      </div>

                      {/* Recommended Mitigation Advice */}
                      <div className="mt-2 text-[11px] text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/60 font-sans">
                        <span className="text-amber-400 font-semibold font-mono">Recommended: </span>
                        {alert.recommendedAction}
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => handleJumpToShiftInWorkspace(alert)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono flex items-center gap-1 border border-slate-700 cursor-pointer"
                        title="Filter Resource Screen to this Shift & Corridor"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Shift</span>
                      </button>

                      <button
                        onClick={() => handleMobilizeForAlert(alert)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center gap-1 shadow-sm transition-colors cursor-pointer ml-auto"
                        title="Mobilize Standby Gangs or Machinery to resolve this gap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mobilize Standby Reserve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
