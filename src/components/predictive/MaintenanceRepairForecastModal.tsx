import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Wrench,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  Printer,
  ChevronRight,
  Calendar,
  Layers,
  MapPin,
  FileText,
  DollarSign,
} from 'lucide-react';
import { MaintenanceRepairForecast } from '../../services/predictiveRepairForecastService';

interface MaintenanceRepairForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecast: MaintenanceRepairForecast | null;
  isLoading: boolean;
  onNavigate?: (screen: string, params?: any) => void;
}

export const MaintenanceRepairForecastModal: React.FC<MaintenanceRepairForecastModalProps> = ({
  isOpen,
  onClose,
  forecast,
  isLoading,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MACHINERY' | 'MANPOWER' | 'PHASED_PLAN'>('OVERVIEW');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!forecast) return;
    navigator.clipboard.writeText(forecast.executiveSummary);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b1328] border border-sky-600/60 rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0d1733] via-[#0f2048] to-[#0a1226] border-b border-sky-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-900 to-indigo-950 border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.35)] shrink-0">
              <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  AI Maintenance Repair Forecast
                </h3>
                {forecast && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                    <span>{forecast.modelUsed}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                30-Day Degradation Trend Manpower &amp; Machinery Restoration Requirements
                {forecast && (
                  <span className="text-sky-300 font-bold ml-1">
                    • {forecast.corridorCode} ({forecast.corridorName})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Print / Save Work Order Forecast as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="p-16 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-sky-900 border-t-purple-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-slate-800 border-b-cyan-400 animate-spin" />
              <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">
                Synthesizing 30-Day Degradation Vector with Gemini AI...
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Estimating machine-operating hours (CSM-902, BCM-03, DGS-01) and engineering squad allocations to restore target safety threshold standards.
              </p>
            </div>
          </div>
        )}

        {/* CONTENT BODY */}
        {!isLoading && forecast && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Total Manpower Hours */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-950/70 to-slate-900/90 border border-sky-800/70 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-sky-300 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Total Manpower</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-normal">4 Gangs</span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {forecast.estimatedTotalManpowerHours}{' '}
                  <span className="text-xs text-sky-300 font-normal">Hours</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {forecast.manpowerHoursBreakdown.length} engineering squads mobilized
                </div>
              </div>

              {/* Total Heavy Machinery Hours */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/60 to-slate-900/90 border border-amber-800/70 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Heavy Machinery</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-normal">5 Machines</span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {forecast.estimatedTotalMachineryHours}{' '}
                  <span className="text-xs text-amber-300 font-normal">Hours</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tamping, Ballast Cleaner, Stabilizer
                </div>
              </div>

              {/* Target TDI Safety Restoration */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border border-emerald-800/70 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span>Safety Standard</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">TARGET RESTORED</span>
                </div>
                <div className="text-2xl font-black text-emerald-300 font-mono flex items-center gap-2">
                  <span>{forecast.baselineTDI}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-white font-black">{forecast.targetSafetyTDI}</span>
                  <span className="text-xs text-emerald-400 font-normal">TDI</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Health score recovery: +{forecast.projectedRestoredHealthScore - (100 - forecast.baselineTDI)} pts
                </div>
              </div>

              {/* Estimated Block Shifts */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/60 to-slate-900/90 border border-purple-800/70 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-purple-300 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>Block Windows</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold">NIGHT SHIFTS</span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {forecast.estimatedBlockShiftsCount}{' '}
                  <span className="text-xs text-purple-300 font-normal">Mega-Blocks</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Est. Cost: ₹{(forecast.estimatedCostInr / 100000).toFixed(2)} Lakhs
                </div>
              </div>
            </div>

            {/* EXECUTIVE SUMMARY & AI DIAGNOSTIC CALLOUT */}
            <div className="p-4 rounded-xl bg-[#091024] border border-sky-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    AI Forecast Synthesis &amp; Degradation Rationale
                  </span>
                </div>
                <button
                  onClick={handleCopySummary}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  <span>{copiedToast ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans sm:font-mono">
                {forecast.executiveSummary}
              </p>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-purple-900/80 text-purple-200 font-bold border border-purple-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Safety Restoration Roadmap
              </button>
              <button
                onClick={() => setActiveTab('MACHINERY')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'MACHINERY'
                    ? 'bg-amber-900/80 text-amber-200 font-bold border border-amber-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Machinery Hours ({forecast.estimatedTotalMachineryHours}h)
              </button>
              <button
                onClick={() => setActiveTab('MANPOWER')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'MANPOWER'
                    ? 'bg-sky-900/80 text-sky-200 font-bold border border-sky-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manpower Gangs ({forecast.estimatedTotalManpowerHours}h)
              </button>
              <button
                onClick={() => setActiveTab('PHASED_PLAN')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'PHASED_PLAN'
                    ? 'bg-emerald-900/80 text-emerald-200 font-bold border border-emerald-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3-Phase Block Plan
              </button>
            </div>

            {/* TAB 1: SAFETY RESTORATION ROADMAP & SUMMARY */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Safety Standards Relief &amp; Speed Restorations</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Caution Order Cleared Chainage:</span>
                      <span className="text-sky-300 font-bold">{forecast.safetyStandardRestoration.cautionOrderClearedChainage}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Speed Restriction Relief:</span>
                      <span className="text-emerald-400 font-bold">
                        +{forecast.safetyStandardRestoration.speedRestrictionReliefKmph} km/h (Restored to 130 km/h)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Target Track Geometry Index (TGI):</span>
                      <span className="text-slate-100 font-bold">{forecast.safetyStandardRestoration.trackGeometryIndexTarget} / 100</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Derailment Propensity Drop:</span>
                      <span className="text-rose-400 font-bold">
                        -{forecast.safetyStandardRestoration.derailmentRiskReductionPercent}% reduction
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Corridor Degradation Stress Drivers Addressed</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Current 30-Day Degradation Stress:</span>
                      <span className="text-rose-400 font-bold">{forecast.baselineTDI} TDI (Critical Threshold)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Target Standard Safety Threshold:</span>
                      <span className="text-emerald-400 font-bold">{forecast.targetSafetyTDI} TDI</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Net Required Deficit Elimination:</span>
                      <span className="text-purple-300 font-bold">-{forecast.baselineTDI - forecast.targetSafetyTDI} TDI Points</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Estimated Total Operational Budget:</span>
                      <span className="text-amber-300 font-bold">₹{forecast.estimatedCostInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MACHINERY HOURS BREAKDOWN */}
            {activeTab === 'MACHINERY' && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Machinery Asset &amp; Type</th>
                      <th className="p-3 text-center">Required Hours</th>
                      <th className="p-3">Target Chainage</th>
                      <th className="p-3">Restoration Task</th>
                      <th className="p-3 text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                    {forecast.machineryHoursBreakdown.map((machine, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3">
                          <div className="font-bold text-slate-100">{machine.machineName}</div>
                          <div className="text-[11px] text-amber-400">{machine.machineType}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/80 font-black">
                            {machine.hoursRequired} hrs
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{machine.targetChainage}</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs">{machine.taskDescription}</td>
                        <td className="p-3 text-right font-bold text-slate-200">
                          ₹{(machine.hoursRequired * machine.hourlyOperatingCostInr).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: MANPOWER GANGS BREAKDOWN */}
            {activeTab === 'MANPOWER' && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Gang Specialization</th>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-center">Gang Strength</th>
                      <th className="p-3 text-center">Allocated Man-Hours</th>
                      <th className="p-3">Primary Repair Focus</th>
                      <th className="p-3">Shift Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                    {forecast.manpowerHoursBreakdown.map((gang, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-slate-100">{gang.gangType}</td>
                        <td className="p-3">
                          <span className="text-sky-300 font-semibold">{gang.department}</span>
                        </td>
                        <td className="p-3 text-center text-slate-300">{gang.gangStrength} Workers</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-700/80 font-black">
                            {gang.totalHours} hrs
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs">{gang.primaryFocus}</td>
                        <td className="p-3 text-slate-300 text-[11px]">{gang.shiftType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: PHASED EXECUTION PLAN */}
            {activeTab === 'PHASED_PLAN' && (
              <div className="space-y-3">
                {forecast.phasedExecutionPlan.map((phase) => (
                  <div
                    key={phase.phaseNumber}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-900 text-purple-200 border border-purple-600 font-bold flex items-center justify-center text-xs">
                          {phase.phaseNumber}
                        </span>
                        <h5 className="font-bold text-slate-100 text-sm">{phase.phaseTitle}</h5>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                          {phase.windowType}
                        </span>
                        <span className="font-bold text-slate-300">{phase.durationHours} hrs window</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-8">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Scheduled Corrective Tasks:
                      </span>
                      <ul className="space-y-1">
                        {phase.tasks.map((task, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-purple-400 font-bold">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 mt-1 border-t border-slate-800/60 text-xs">
                        <span className="text-rose-400 font-semibold">Risk Mitigated: </span>
                        <span className="text-slate-400">{phase.riskMitigated}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px]">
            Forecast grounded in Indian Railways RDSO Maintenance Norms (30-day wear velocity model)
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            {forecast && onNavigate && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('timeline', {
                    corridorId: forecast.corridorId,
                    highlightBlocks: true,
                  });
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-950/60 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Auto-Schedule Maintenance Blocks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
