import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sliders,
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Users,
  Truck,
  Layers,
  Info,
  Sparkles,
  Percent,
  CheckCircle2,
  BookmarkCheck,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react';
import {
  DeficitAlertThresholdSettings,
  DEFAULT_DEFICIT_ALERT_SETTINGS,
  DeficitAlertPresetName,
  ThresholdMetricMode,
  Corridor,
} from '../../types';
import { resourceForecastService } from '../../services/resourceForecastService';

interface DeficitAlertThresholdModalProps {
  isOpen: boolean;
  onClose: (revert?: boolean) => void;
  currentSettings: DeficitAlertThresholdSettings;
  onSaveSettings: (newSettings: DeficitAlertThresholdSettings) => void;
  onLiveUpdate?: (newSettings: DeficitAlertThresholdSettings) => void;
  corridors?: Corridor[];
}

interface PresetOption {
  id: DeficitAlertPresetName;
  title: string;
  badge: string;
  description: string;
  settings: Partial<DeficitAlertThresholdSettings>;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'IRTMM_STANDARD',
    title: 'IRTMM Standard Compliance',
    badge: 'Standard IR',
    description: 'Indian Railways Track Machine Manual baseline (Warning at 5% deficit, Critical at 15% deficit).',
    settings: {
      manpowerWarningThresholdPct: 5,
      manpowerCriticalThresholdPct: 15,
      machineryWarningThresholdPct: 5,
      machineryCriticalThresholdPct: 15,
      thresholdMode: 'DEFICIT_PERCENT',
      minimumManpowerDeficitHeadcount: 1,
      minimumMachineryDeficitUnits: 1,
    },
  },
  {
    id: 'HEAVY_FREIGHT_SURGE',
    title: '25T Heavy Axle Freight Surge',
    badge: 'High Sensitivity',
    description: 'Aggressive early-warning buffers for high-density heavy haul lines with rapid ballast degradation.',
    settings: {
      manpowerWarningThresholdPct: 3,
      manpowerCriticalThresholdPct: 10,
      machineryWarningThresholdPct: 3,
      machineryCriticalThresholdPct: 10,
      thresholdMode: 'DEFICIT_PERCENT',
      minimumManpowerDeficitHeadcount: 1,
      minimumMachineryDeficitUnits: 1,
    },
  },
  {
    id: 'SAFETY_BUFFER_CONSERVATIVE',
    title: 'Monsoon Zero-Tolerance Buffer',
    badge: 'Max Protection',
    description: 'Zero margin for shortages during soil saturation periods; alerts trigger as soon as capacity equals demand.',
    settings: {
      manpowerWarningThresholdPct: 0,
      manpowerCriticalThresholdPct: 8,
      machineryWarningThresholdPct: 0,
      machineryCriticalThresholdPct: 8,
      thresholdMode: 'DEFICIT_PERCENT',
      minimumManpowerDeficitHeadcount: 1,
      minimumMachineryDeficitUnits: 1,
    },
  },
  {
    id: 'CUSTOM',
    title: 'Custom Planner Thresholds',
    badge: 'Planner Custom',
    description: 'Fully customizable threshold parameters tailored to divisional locomotive and gang constraints.',
    settings: {},
  },
];

export const DeficitAlertThresholdModal: React.FC<DeficitAlertThresholdModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
  onLiveUpdate,
  corridors = [],
}) => {
  const [formState, setFormState] = useState<DeficitAlertThresholdSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<'THRESHOLDS' | 'PRESETS' | 'ESCALATION'>('THRESHOLDS');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Keep a reference to original settings when modal opens so Cancel can restore
  const originalSettingsRef = useRef<DeficitAlertThresholdSettings>(currentSettings);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      originalSettingsRef.current = { ...currentSettings };
      setFormState({ ...currentSettings });
      setSaveToast(null);
    }
  }, [isOpen, currentSettings]);

  // Centralized updater that notifies alert UI component dynamically in real-time
  const updateFormAndLiveNotify = (
    updater: (prev: DeficitAlertThresholdSettings) => DeficitAlertThresholdSettings
  ) => {
    setFormState((prev) => {
      const next = updater(prev);
      if (onLiveUpdate) {
        onLiveUpdate(next);
      }
      return next;
    });
  };

  // Live forecast preview computation
  const simulationPreview = useMemo(() => {
    // Generate baseline 30-day forecast to simulate impact of adjusted limits
    const forecast = resourceForecastService.computeForecast('BASELINE', 30, formState.targetCorridorOverride || 'ALL');
    let criticalShifts = 0;
    let warningShifts = 0;
    let balancedShifts = 0;

    forecast.dailyForecast.forEach((p) => {
      const mpAvail = Math.max(1, p.manpowerAvailable);
      const machAvail = Math.max(1, p.machinerySlotsAvailable);

      const mpDeficit = Math.max(0, p.manpowerRequired - p.manpowerAvailable);
      const machDeficit = Math.max(0, p.machinerySlotsRequired - p.machinerySlotsAvailable);

      let isMpCritical = false;
      let isMpWarning = false;
      let isMachCritical = false;
      let isMachWarning = false;

      if (formState.thresholdMode === 'DEFICIT_PERCENT') {
        const mpDeficitPct = Math.round((mpDeficit / mpAvail) * 100);
        const machDeficitPct = Math.round((machDeficit / machAvail) * 100);

        isMpCritical =
          mpDeficitPct >= formState.manpowerCriticalThresholdPct &&
          mpDeficit >= formState.minimumManpowerDeficitHeadcount;
        isMpWarning =
          mpDeficitPct >= formState.manpowerWarningThresholdPct &&
          mpDeficit >= formState.minimumManpowerDeficitHeadcount;

        isMachCritical =
          machDeficitPct >= formState.machineryCriticalThresholdPct &&
          machDeficit >= formState.minimumMachineryDeficitUnits;
        isMachWarning =
          machDeficitPct >= formState.machineryWarningThresholdPct &&
          machDeficit >= formState.minimumMachineryDeficitUnits;
      } else {
        const mpUtilPct = Math.round((p.manpowerRequired / mpAvail) * 100);
        const machUtilPct = Math.round((p.machinerySlotsRequired / machAvail) * 100);

        isMpCritical =
          mpUtilPct >= formState.manpowerCriticalThresholdPct &&
          mpDeficit >= formState.minimumManpowerDeficitHeadcount;
        isMpWarning = mpUtilPct >= formState.manpowerWarningThresholdPct;

        isMachCritical =
          machUtilPct >= formState.machineryCriticalThresholdPct &&
          machDeficit >= formState.minimumMachineryDeficitUnits;
        isMachWarning = machUtilPct >= formState.machineryWarningThresholdPct;
      }

      if (isMpCritical || isMachCritical) {
        criticalShifts++;
      } else if (isMpWarning || isMachWarning) {
        warningShifts++;
      } else {
        balancedShifts++;
      }
    });

    return {
      total: forecast.dailyForecast.length,
      criticalShifts,
      warningShifts,
      balancedShifts,
    };
  }, [formState]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetOption) => {
    updateFormAndLiveNotify((prev) => ({
      ...prev,
      ...(preset.id === 'CUSTOM' ? {} : preset.settings),
      presetName: preset.id,
    }));
  };

  const handleSave = () => {
    const updated: DeficitAlertThresholdSettings = {
      ...formState,
      lastUpdated: new Date().toISOString(),
    };
    onSaveSettings(updated);
    setSaveToast('Custom deficit alert thresholds successfully saved & applied to fleet engine!');
    setTimeout(() => {
      onClose(false);
    }, 500);
  };

  const handleCancel = () => {
    if (onLiveUpdate) {
      onLiveUpdate(originalSettingsRef.current);
    }
    onClose(true);
  };

  const handleResetToDefaults = () => {
    const defaults = { ...DEFAULT_DEFICIT_ALERT_SETTINGS, presetName: 'IRTMM_STANDARD' as const };
    updateFormAndLiveNotify(() => defaults);
  };

  const isDeficitPercentMode = formState.thresholdMode === 'DEFICIT_PERCENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b1226] border border-amber-800/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#111936] via-[#101732] to-[#0c1228] border-b border-amber-900/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/90 border border-amber-700 text-amber-400 shadow-inner">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono font-bold text-slate-100 text-base uppercase tracking-wide">
                  Resource Deficit Alert Thresholds
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  {formState.presetName.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {isDeficitPercentMode ? '% OVER CAPACITY' : '% TOTAL UTILIZATION'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure user-defined percentage deficit limits for manpower and machinery. The alert UI component updates dynamically when forecast deficits breach these limits.
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title="Close and revert unapplied changes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Nav Tabs */}
        <div className="px-5 pt-3 bg-[#080d1e] border-b border-slate-800/80 flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('THRESHOLDS')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'THRESHOLDS'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Deficit Percentage Inputs</span>
          </button>

          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PRESETS'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Operational Presets</span>
          </button>

          <button
            onClick={() => setActiveTab('ESCALATION')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ESCALATION'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Policies & Triggers</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 font-mono text-xs">
          {saveToast && (
            <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveToast}</span>
            </div>
          )}

          {/* TAB 1: THRESHOLDS CONFIGURATION */}
          {activeTab === 'THRESHOLDS' && (
            <div className="space-y-5">
              {/* Dynamic Live Sync Status Strip */}
              <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-800/70 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sky-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold">Dynamic Alert UI Sync Active</span>
                </div>
                <span className="text-slate-300 text-[10px]">
                  Alert cards and D3 timeline update dynamically in background as you edit threshold inputs.
                </span>
              </div>

              {/* Metric Calculation Mode Toggle */}
              <div className="bg-[#070c1b] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-sky-400" />
                    <span>Threshold Calculation Mode:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Formula: {isDeficitPercentMode ? '((Req - Avail) / Avail) * 100%' : '(Req / Avail) * 100%'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateFormAndLiveNotify((prev) => ({
                        ...prev,
                        thresholdMode: 'DEFICIT_PERCENT',
                        presetName: 'CUSTOM',
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isDeficitPercentMode
                        ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>Deficit % Over Capacity</span>
                      {isDeficitPercentMode && <Check className="w-3 h-3 text-amber-400 ml-auto" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-sans">
                      Alerts fire when required resources exceed available pool by +X% (e.g. +5% Warning, +15% Critical).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateFormAndLiveNotify((prev) => ({
                        ...prev,
                        thresholdMode: 'UTILIZATION_PERCENT',
                        manpowerWarningThresholdPct: Math.max(90, prev.manpowerWarningThresholdPct + 90),
                        manpowerCriticalThresholdPct: Math.max(105, prev.manpowerCriticalThresholdPct + 95),
                        machineryWarningThresholdPct: Math.max(90, prev.machineryWarningThresholdPct + 85),
                        machineryCriticalThresholdPct: Math.max(105, prev.machineryCriticalThresholdPct + 90),
                        presetName: 'CUSTOM',
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      !isDeficitPercentMode
                        ? 'bg-sky-950/60 border-sky-500/80 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>Total Capacity Utilization %</span>
                      {!isDeficitPercentMode && <Check className="w-3 h-3 text-sky-400 ml-auto" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-sans">
                      Alerts fire when total planned ratio reaches X% (e.g. 95% near-capacity, 110% severe deficit).
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 1: MANPOWER DEFICIT THRESHOLDS (INPUT FIELDS + STEPPERS + SLIDERS) */}
              <div className="bg-[#070c1b] p-4 rounded-xl border border-sky-950/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-slate-100 uppercase tracking-wide">
                      'Manpower Deficit' Percentage Thresholds
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-300 font-mono px-2 py-0.5 rounded bg-sky-950/90 border border-sky-800 font-semibold">
                    Current: +{formState.manpowerWarningThresholdPct}% (Warn) / +{formState.manpowerCriticalThresholdPct}% (Crit)
                  </span>
                </div>

                {/* Direct Numeric Input Fields Grid for Manpower Deficit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#091024] p-3.5 rounded-lg border border-slate-800/90">
                  {/* Manpower Deficit - Warning Limit Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-manpower-deficit-warning" className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>'Manpower Deficit' Warning Limit (%):</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Moderate</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            manpowerWarningThresholdPct: Math.max(0, prev.manpowerWarningThresholdPct - 1),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Decrease by 1%"
                      >
                        -
                      </button>

                      <div className="relative flex-1">
                        <input
                          id="input-manpower-deficit-warning"
                          name="manpowerDeficitWarning"
                          type="number"
                          min={0}
                          max={100}
                          value={formState.manpowerWarningThresholdPct}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            updateFormAndLiveNotify((prev) => ({
                              ...prev,
                              manpowerWarningThresholdPct: val,
                              manpowerCriticalThresholdPct: Math.max(val + 2, prev.manpowerCriticalThresholdPct),
                              presetName: 'CUSTOM',
                            }));
                          }}
                          className="w-full bg-slate-900 border border-amber-600/80 focus:border-amber-400 rounded-lg px-3 py-1.5 text-center font-mono font-bold text-amber-300 text-sm focus:outline-none"
                          placeholder="e.g. 5"
                        />
                        <span className="absolute right-3 top-2 text-amber-500 font-bold text-xs pointer-events-none">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            manpowerWarningThresholdPct: Math.min(
                              prev.manpowerCriticalThresholdPct - 1,
                              prev.manpowerWarningThresholdPct + 1
                            ),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Increase by 1%"
                      >
                        +
                      </button>
                    </div>

                    {/* Linked Synchronous Slider */}
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={formState.manpowerWarningThresholdPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          manpowerWarningThresholdPct: val,
                          manpowerCriticalThresholdPct: Math.max(val + 2, prev.manpowerCriticalThresholdPct),
                          presetName: 'CUSTOM',
                        }));
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-1"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>0% (Strict)</span>
                      <span>+15% Mid</span>
                      <span>+35% Relaxed</span>
                    </div>
                  </div>

                  {/* Manpower Deficit - Critical Limit Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-manpower-deficit-critical" className="text-rose-300 font-bold text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>'Manpower Deficit' Critical Limit (%):</span>
                      </label>
                      <span className="text-[10px] text-rose-400 font-semibold font-mono">Severe</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            manpowerCriticalThresholdPct: Math.max(
                              prev.manpowerWarningThresholdPct + 1,
                              prev.manpowerCriticalThresholdPct - 1
                            ),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Decrease by 1%"
                      >
                        -
                      </button>

                      <div className="relative flex-1">
                        <input
                          id="input-manpower-deficit-critical"
                          name="manpowerDeficitCritical"
                          type="number"
                          min={1}
                          max={150}
                          value={formState.manpowerCriticalThresholdPct}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(150, Number(e.target.value) || 1));
                            updateFormAndLiveNotify((prev) => ({
                              ...prev,
                              manpowerCriticalThresholdPct: val,
                              manpowerWarningThresholdPct: Math.min(val - 1, prev.manpowerWarningThresholdPct),
                              presetName: 'CUSTOM',
                            }));
                          }}
                          className="w-full bg-slate-900 border border-rose-600/80 focus:border-rose-400 rounded-lg px-3 py-1.5 text-center font-mono font-bold text-rose-300 text-sm focus:outline-none"
                          placeholder="e.g. 15"
                        />
                        <span className="absolute right-3 top-2 text-rose-500 font-bold text-xs pointer-events-none">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            manpowerCriticalThresholdPct: Math.min(150, prev.manpowerCriticalThresholdPct + 1),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Increase by 1%"
                      >
                        +
                      </button>
                    </div>

                    {/* Linked Synchronous Slider */}
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={formState.manpowerCriticalThresholdPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          manpowerCriticalThresholdPct: val,
                          manpowerWarningThresholdPct: Math.min(val - 2, prev.manpowerWarningThresholdPct),
                          presetName: 'CUSTOM',
                        }));
                      }}
                      className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-1"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>+5% Low</span>
                      <span>+20% Standard</span>
                      <span>+60% High</span>
                    </div>
                  </div>
                </div>

                {/* Min Headcount Cutoff */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Minimum Staff Shortage Cutoff (Suppresses single-person noise):</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-manpower-min-cutoff"
                      type="number"
                      min={1}
                      max={20}
                      value={formState.minimumManpowerDeficitHeadcount}
                      onChange={(e) =>
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          minimumManpowerDeficitHeadcount: Math.max(1, Number(e.target.value)),
                          presetName: 'CUSTOM',
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center text-slate-200 font-mono font-bold"
                    />
                    <span className="text-slate-400">personnel</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: MACHINERY DEFICIT THRESHOLDS (INPUT FIELDS + STEPPERS + SLIDERS) */}
              <div className="bg-[#070c1b] p-4 rounded-xl border border-purple-950/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-100 uppercase tracking-wide">
                      'Machinery Deficit' Percentage Thresholds
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono px-2 py-0.5 rounded bg-purple-950/90 border border-purple-800 font-semibold">
                    Current: +{formState.machineryWarningThresholdPct}% (Warn) / +{formState.machineryCriticalThresholdPct}% (Crit)
                  </span>
                </div>

                {/* Direct Numeric Input Fields Grid for Machinery Deficit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#091024] p-3.5 rounded-lg border border-slate-800/90">
                  {/* Machinery Deficit - Warning Limit Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-machinery-deficit-warning" className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>'Machinery Deficit' Warning Limit (%):</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Moderate</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            machineryWarningThresholdPct: Math.max(0, prev.machineryWarningThresholdPct - 1),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Decrease by 1%"
                      >
                        -
                      </button>

                      <div className="relative flex-1">
                        <input
                          id="input-machinery-deficit-warning"
                          name="machineryDeficitWarning"
                          type="number"
                          min={0}
                          max={100}
                          value={formState.machineryWarningThresholdPct}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            updateFormAndLiveNotify((prev) => ({
                              ...prev,
                              machineryWarningThresholdPct: val,
                              machineryCriticalThresholdPct: Math.max(val + 2, prev.machineryCriticalThresholdPct),
                              presetName: 'CUSTOM',
                            }));
                          }}
                          className="w-full bg-slate-900 border border-amber-600/80 focus:border-amber-400 rounded-lg px-3 py-1.5 text-center font-mono font-bold text-amber-300 text-sm focus:outline-none"
                          placeholder="e.g. 5"
                        />
                        <span className="absolute right-3 top-2 text-amber-500 font-bold text-xs pointer-events-none">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            machineryWarningThresholdPct: Math.min(
                              prev.machineryCriticalThresholdPct - 1,
                              prev.machineryWarningThresholdPct + 1
                            ),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Increase by 1%"
                      >
                        +
                      </button>
                    </div>

                    {/* Linked Synchronous Slider */}
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={formState.machineryWarningThresholdPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          machineryWarningThresholdPct: val,
                          machineryCriticalThresholdPct: Math.max(val + 2, prev.machineryCriticalThresholdPct),
                          presetName: 'CUSTOM',
                        }));
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-1"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>0% (Exact match)</span>
                      <span>+15% Slots</span>
                      <span>+35% Max</span>
                    </div>
                  </div>

                  {/* Machinery Deficit - Critical Limit Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-machinery-deficit-critical" className="text-rose-300 font-bold text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>'Machinery Deficit' Critical Limit (%):</span>
                      </label>
                      <span className="text-[10px] text-rose-400 font-semibold font-mono">Severe</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            machineryCriticalThresholdPct: Math.max(
                              prev.machineryWarningThresholdPct + 1,
                              prev.machineryCriticalThresholdPct - 1
                            ),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Decrease by 1%"
                      >
                        -
                      </button>

                      <div className="relative flex-1">
                        <input
                          id="input-machinery-deficit-critical"
                          name="machineryDeficitCritical"
                          type="number"
                          min={1}
                          max={150}
                          value={formState.machineryCriticalThresholdPct}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(150, Number(e.target.value) || 1));
                            updateFormAndLiveNotify((prev) => ({
                              ...prev,
                              machineryCriticalThresholdPct: val,
                              machineryWarningThresholdPct: Math.min(val - 1, prev.machineryWarningThresholdPct),
                              presetName: 'CUSTOM',
                            }));
                          }}
                          className="w-full bg-slate-900 border border-rose-600/80 focus:border-rose-400 rounded-lg px-3 py-1.5 text-center font-mono font-bold text-rose-300 text-sm focus:outline-none"
                          placeholder="e.g. 15"
                        />
                        <span className="absolute right-3 top-2 text-rose-500 font-bold text-xs pointer-events-none">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateFormAndLiveNotify((prev) => ({
                            ...prev,
                            machineryCriticalThresholdPct: Math.min(150, prev.machineryCriticalThresholdPct + 1),
                            presetName: 'CUSTOM',
                          }))
                        }
                        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer flex items-center justify-center text-sm"
                        title="Increase by 1%"
                      >
                        +
                      </button>
                    </div>

                    {/* Linked Synchronous Slider */}
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={formState.machineryCriticalThresholdPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          machineryCriticalThresholdPct: val,
                          machineryWarningThresholdPct: Math.min(val - 2, prev.machineryWarningThresholdPct),
                          presetName: 'CUSTOM',
                        }));
                      }}
                      className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-1"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>+5% Low</span>
                      <span>+20% Standard</span>
                      <span>+60% High</span>
                    </div>
                  </div>
                </div>

                {/* Min Machinery Unit Cutoff */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Minimum Machine Slot Shortage Cutoff:</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-machinery-min-cutoff"
                      type="number"
                      min={1}
                      max={10}
                      value={formState.minimumMachineryDeficitUnits}
                      onChange={(e) =>
                        updateFormAndLiveNotify((prev) => ({
                          ...prev,
                          minimumMachineryDeficitUnits: Math.max(1, Number(e.target.value)),
                          presetName: 'CUSTOM',
                        }))
                      }
                      className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center text-slate-200 font-mono font-bold"
                    />
                    <span className="text-slate-400">machine unit(s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONAL PRESETS */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs font-sans">
                Select from standardized Indian Railways operating profiles calibrated for various corridor classes and seasonal stress factors:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {PRESET_OPTIONS.map((preset) => {
                  const isSelected = formState.presetName === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
                          : 'bg-[#070c1b] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-200">{preset.title}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold ${
                              isSelected
                                ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      {preset.id !== 'CUSTOM' && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-500 block">Manpower (Warn/Crit):</span>
                            <span className="text-amber-300 font-bold">
                              +{preset.settings.manpowerWarningThresholdPct}% / +{preset.settings.manpowerCriticalThresholdPct}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Machinery (Warn/Crit):</span>
                            <span className="text-purple-300 font-bold">
                              +{preset.settings.machineryWarningThresholdPct}% / +{preset.settings.machineryCriticalThresholdPct}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: POLICIES & ADVANCED TRIGGERS */}
          {activeTab === 'ESCALATION' && (
            <div className="space-y-4">
              <div className="bg-[#070c1b] p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block border-b border-slate-800 pb-2">
                  Divisional Escalation Directives
                </span>

                {/* Sr DEN Escalation */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.autoEscalateToSrDen}
                    onChange={(e) =>
                      updateFormAndLiveNotify((prev) => ({
                        ...prev,
                        autoEscalateToSrDen: e.target.checked,
                      }))
                    }
                    className="mt-1 accent-amber-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Auto-Escalate to Senior Divisional Engineer (Sr. DEN / Co-ord)
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                      Whenever a shift exceeds the Critical Threshold, automatically flag the work block for mandatory divisional clearance and reserve gang re-allocation memo.
                    </span>
                  </div>
                </label>

                {/* Audio-Visual Beacon */}
                <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800/60">
                  <input
                    type="checkbox"
                    checked={formState.enableAudioVisualBeacon}
                    onChange={(e) =>
                      updateFormAndLiveNotify((prev) => ({
                        ...prev,
                        enableAudioVisualBeacon: e.target.checked,
                      }))
                    }
                    className="mt-1 accent-amber-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Enable High-Visibility Amber/Rose Beacon Animation
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                      Display pulsing radar beacons around contested shifts and trigger animated badge indicators in the main navigation bar.
                    </span>
                  </div>
                </label>

                {/* Target Corridor Scope */}
                <div className="pt-2 border-t border-slate-800/60">
                  <label className="text-slate-300 font-semibold block mb-1">
                    Apply Threshold Scope:
                  </label>
                  <select
                    value={formState.targetCorridorOverride}
                    onChange={(e) =>
                      updateFormAndLiveNotify((prev) => ({
                        ...prev,
                        targetCorridorOverride: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="ALL">All Network Corridors (Uniform Division-wide Policy)</option>
                    {corridors.map((c) => (
                      <option key={c.id} value={c.id}>
                        Corridor {c.id} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* REAL-TIME IMPACT SIMULATION STRIP */}
          <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-purple-950/20 to-slate-900 rounded-xl border border-amber-800/50">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase">
                <Activity className="w-4 h-4" />
                <span>Live Deficit Alert Simulation (30-Day Window)</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Breach calculation across {simulationPreview.total} shifts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-rose-950/60 border border-rose-800/80">
                <div className="text-lg font-bold text-rose-400">{simulationPreview.criticalShifts}</div>
                <div className="text-[10px] text-rose-300 uppercase">Critical Shortages</div>
              </div>
              <div className="p-2 rounded bg-amber-950/60 border border-amber-800/80">
                <div className="text-lg font-bold text-amber-400">{simulationPreview.warningShifts}</div>
                <div className="text-[10px] text-amber-300 uppercase">Warning Shifts</div>
              </div>
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800/80">
                <div className="text-lg font-bold text-emerald-400">{simulationPreview.balancedShifts}</div>
                <div className="text-[10px] text-emerald-300 uppercase">Within User Limits</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#080d1e] border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset IRTMM Standards</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            >
              Cancel (Revert)
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/60 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Thresholds</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
