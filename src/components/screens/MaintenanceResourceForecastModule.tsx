import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Wrench,
  Truck,
  Users,
  HardHat,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  FileText,
  ShieldAlert,
  Filter,
  ArrowRight,
  Search,
  Info,
  Activity,
  Flame,
  CloudRain,
  Gauge,
  Zap,
  ChevronRight,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  BarChart,
} from 'recharts';
import {
  MaintenanceResourceForecastResult,
  DailyForecastPoint,
  AgingAssetLifecycleForecast,
  RecurringDefectPatternForecast,
  ForecastScenarioType,
  ForecastHorizonDays,
} from '../../types';
import { resourceForecastService } from '../../services/resourceForecastService';

interface MaintenanceResourceForecastModuleProps {
  initialCorridorFilter?: string;
  onNavigateToSchedule?: (date?: string, corridorId?: string) => void;
}

type ActiveViewTab = 'OVERVIEW' | 'DAILY_TIMELINE' | 'AGING_LIFECYCLES' | 'DEFECT_PATTERNS' | 'FLEET_CAPACITY';

export const MaintenanceResourceForecastModule: React.FC<MaintenanceResourceForecastModuleProps> = ({
  initialCorridorFilter = 'ALL',
  onNavigateToSchedule,
}) => {
  // State
  const [selectedCorridor, setSelectedCorridor] = useState<string>(initialCorridorFilter);
  const [scenario, setScenario] = useState<ForecastScenarioType>('BASELINE');
  const [horizonDays, setHorizonDays] = useState<ForecastHorizonDays>(30);
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('OVERVIEW');
  const [selectedDay, setSelectedDay] = useState<DailyForecastPoint | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AgingAssetLifecycleForecast | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [advancePlanNotification, setAdvancePlanNotification] = useState<string | null>(null);
  const [showAiBriefingModal, setShowAiBriefingModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Synchronize initial filter if prop changes
  useEffect(() => {
    if (initialCorridorFilter && initialCorridorFilter !== 'ALL') {
      setSelectedCorridor(initialCorridorFilter);
    }
  }, [initialCorridorFilter]);

  // Compute forecast
  const forecast: MaintenanceResourceForecastResult = useMemo(() => {
    return resourceForecastService.computeForecast(scenario, horizonDays, selectedCorridor);
  }, [scenario, horizonDays, selectedCorridor]);

  // AI Briefing State (stored to allow on-demand regeneration)
  const [aiBriefing, setAiBriefing] = useState(forecast.aiStrategicBriefing);

  useEffect(() => {
    setAiBriefing(forecast.aiStrategicBriefing);
  }, [forecast]);

  // Handle AI Strategic Briefing Synthesis
  const handleRegenerateAiBriefing = async () => {
    setIsAiLoading(true);
    try {
      const result = await resourceForecastService.fetchGeminiForecastSynthesis(forecast);
      setAiBriefing(result);
      setShowAiBriefingModal(true);
    } catch (err) {
      console.error('Failed to generate AI briefing:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const csvContent = resourceForecastService.exportForecastCsv(forecast);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `RAILSYNC_30Day_Resource_Forecast_${scenario}_${selectedCorridor}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Mobilize Advance Staging Plan
  const handleMobilizePlan = () => {
    setAdvancePlanNotification(
      `Advance Resource Mobilization Order queued: ${forecast.machineryDeficitHotspotDays} standby machine requisitions transmitted to Central Track Machine Depot (C-TMD). Gang standby relief alert issued to ${forecast.totalManpowerShiftsNeeded} staff shifts.`
    );
    setTimeout(() => {
      setAdvancePlanNotification(null);
    }, 6000);
  };

  // Filtered daily points
  const filteredDailyPoints = useMemo(() => {
    if (!searchQuery.trim()) return forecast.dailyForecast;
    const q = searchQuery.toLowerCase();
    return forecast.dailyForecast.filter(
      (d) =>
        d.date.toLowerCase().includes(q) ||
        d.displayDate.toLowerCase().includes(q) ||
        d.dayOfWeek.toLowerCase().includes(q) ||
        d.primaryDefectDriver.toLowerCase().includes(q) ||
        d.primaryAgingDriver.toLowerCase().includes(q) ||
        d.targetCorridorId.toLowerCase().includes(q)
    );
  }, [forecast.dailyForecast, searchQuery]);

  // Corridor options
  const corridorOptions = [
    { id: 'ALL', label: 'All Corridors (Network)', code: 'SYS-WIDE' },
    { id: 'C001', label: 'C001: Northern Trunk', code: 'NDLS-GZB' },
    { id: 'C002', label: 'C002: High-Speed Spur', code: 'NDLS-FDB' },
    { id: 'C003', label: 'C003: Heavy Freight Line', code: 'NDLS-ROK' },
    { id: 'C004', label: 'C004: Eastern Link', code: 'NDLS-MBR' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification for Advance Mobilization */}
      {advancePlanNotification && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{advancePlanNotification}</p>
          </div>
          <button
            onClick={() => setAdvancePlanNotification(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Module Header & High-Level Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <div className="p-2 bg-indigo-950/80 border border-indigo-700/50 rounded-lg text-indigo-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Maintenance Resource Forecast
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/70 border border-indigo-700/50 text-indigo-300">
                30-Day Predictive Model
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-700/50 text-amber-300">
                Defect Recurrence & Asset Age Cycles
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl pt-1">
              Projects future track machinery and gang manpower requirements by analyzing historical recurring defect
              clusters (USFD rail micro-cracks, OHE catenary dropper fatigue, point motor drag) and statutory aging
              infrastructure lifecycles (525 GMT rail renewal, open-web bridge rivet cycles, ballast bed fouling).
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRegenerateAiBriefing}
              disabled={isAiLoading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Synthesizing with Gemini...' : 'AI Strategic Synthesis'}</span>
            </button>
            <button
              onClick={handleMobilizePlan}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <Truck className="w-4 h-4" />
              <span>Mobilize Advance Staging</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Corridor Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Corridor Scope</span>
            </label>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {corridorOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Forecast Horizon */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Forecast Time Horizon</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setHorizonDays(7)}
                className={`py-1.5 text-xs font-medium rounded ${
                  horizonDays === 7 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setHorizonDays(14)}
                className={`py-1.5 text-xs font-medium rounded ${
                  horizonDays === 14 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => setHorizonDays(30)}
                className={`py-1.5 text-xs font-medium rounded ${
                  horizonDays === 30 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30 Days (Full)
              </button>
            </div>
          </div>

          {/* Scenario Sensitivity */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Operating Stress Scenario</span>
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ForecastScenarioType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="BASELINE">Standard IRTMM Baseline (Normal Cycles)</option>
              <option value="MONSOON_MOISTURE">Monsoon Soil Saturation (+25% Mud Pumping & S&T)</option>
              <option value="FREIGHT_SURGE">25T Heavy Axle Freight Surge (+30% Rail Wear on C003)</option>
              <option value="THERMAL_EXPANSION">High Thermal Stress (+35% CWR & OHE Stagger)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: 5 High-Impact Projections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Manpower Total */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Manpower Demand</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {forecast.totalManpowerShiftsNeeded.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">person-shifts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            P-Way Trackmen, S&T Techs, OHE Linemen & Lookouts
          </p>
        </div>

        {/* Machinery Total */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Machine Block Time</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {forecast.totalMachineryHoursNeeded.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">machine-hours</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Tampers (CSM), Regulators, Stabilizers, Tower Wagons
          </p>
        </div>

        {/* Manpower Deficit Hotspots */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Gang Deficit Hotspots</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold ${
                forecast.manpowerDeficitHotspotDays > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {forecast.manpowerDeficitHotspotDays}
            </span>
            <span className="text-xs text-slate-400">critical days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {forecast.manpowerDeficitHotspotDays > 0
              ? 'Days where trade demand exceeds local gang roster'
              : 'Gang capacity fully balances forecasted demand'}
          </p>
        </div>

        {/* Machine Contention Days */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Machinery Contention</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold ${
                forecast.machineryDeficitHotspotDays > 0 ? 'text-orange-400' : 'text-emerald-400'
              }`}
            >
              {forecast.machineryDeficitHotspotDays}
            </span>
            <span className="text-xs text-slate-400">bottleneck days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {forecast.machineryDeficitHotspotDays > 0
              ? 'Peak simultaneous machine demand > local inventory'
              : 'Machine inventory meets all required possession blocks'}
          </p>
        </div>

        {/* Root Driver Split */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Work Driver Ratio</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full"
                style={{ width: `${forecast.defectDrivenPercentage}%` }}
                title={`Defect-Driven: ${forecast.defectDrivenPercentage}%`}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${forecast.agingInfrastructurePercentage}%` }}
                title={`Aging Asset Lifecycles: ${forecast.agingInfrastructurePercentage}%`}
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-2">
            <span className="text-indigo-300 font-medium">
              {forecast.defectDrivenPercentage}% Defects
            </span>
            <span className="text-amber-300 font-medium">
              {forecast.agingInfrastructurePercentage}% Aging Cycles
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'OVERVIEW'
              ? 'border-indigo-500 text-indigo-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Demand Curve & AI Briefing</span>
        </button>
        <button
          onClick={() => setActiveTab('DAILY_TIMELINE')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'DAILY_TIMELINE'
              ? 'border-indigo-500 text-indigo-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>30-Day Daily Schedule & Deficits ({forecast.dailyForecast.length} Days)</span>
        </button>
        <button
          onClick={() => setActiveTab('AGING_LIFECYCLES')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'AGING_LIFECYCLES'
              ? 'border-indigo-500 text-indigo-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Aging Asset Lifecycle Cycles ({forecast.agingAssets.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('DEFECT_PATTERNS')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'DEFECT_PATTERNS'
              ? 'border-indigo-500 text-indigo-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Recurring Defect Signatures ({forecast.defectPatterns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('FLEET_CAPACITY')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'FLEET_CAPACITY'
              ? 'border-indigo-500 text-indigo-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fleet & Gang Capacity Balance</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (Recharts Composed Graph + AI Briefing) */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* AI Strategic Synthesis Card */}
          {aiBriefing && (
            <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900/90 border border-indigo-700/40 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-200 tracking-wide uppercase">
                      Gemini Strategic Forecast Synthesis & Dispatch Advisory
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/40 font-mono">
                      {aiBriefing.model}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-5xl">
                    {aiBriefing.executiveSummary}
                  </p>
                </div>
                <button
                  onClick={handleRegenerateAiBriefing}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 rounded bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-700/50 text-indigo-300 text-xs font-medium flex items-center space-x-1.5 shrink-0 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh AI</span>
                </button>
              </div>

              {/* Strategic Priorities List */}
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiBriefing.strategicPriorities.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-700/50 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{p}</span>
                  </div>
                ))}
              </div>

              {/* Rebalancing & Statutory note */}
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 gap-2">
                <div>
                  <span className="font-semibold text-slate-300">Fleet Rebalancing: </span>
                  {aiBriefing.fleetRebalancingPlan}
                </div>
                <div className="text-indigo-400 font-mono">
                  {aiBriefing.irRegulationsReference}
                </div>
              </div>
            </div>
          )}

          {/* 30-Day Resource Demand vs Capacity Composed Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>30-Day Projected Manpower & Machine Slot Demand Curve</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daily required manpower headcount (Left Axis) and concurrent machinery possession slots (Right Axis) vs available capacity
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1.5 text-indigo-300">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  <span>Required Manpower</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
                  <span>Machinery Units</span>
                </span>
                <span className="flex items-center space-x-1.5 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-500" />
                  <span>Capacity Threshold</span>
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecast.dailyForecast}
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      setSelectedDay(e.activePayload[0].payload as DailyForecastPoint);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={forecast.horizonDays === 30 ? 2 : 0}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Personnel Headcount',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94a3b8',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Machine Units',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#94a3b8',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyForecastPoint;
                        return (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl text-xs space-y-1.5 max-w-xs">
                            <div className="font-semibold text-white flex justify-between items-center border-b border-slate-800 pb-1">
                              <span>
                                Day {data.dayNumber}: {data.displayDate} ({data.dayOfWeek})
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  data.riskLevel === 'CRITICAL'
                                    ? 'bg-rose-950 text-rose-300'
                                    : data.riskLevel === 'HIGH'
                                    ? 'bg-orange-950 text-orange-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {data.riskLevel}
                              </span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Target Corridor: </span>
                              <span className="font-mono text-indigo-300">{data.targetCorridorId}</span>
                            </div>
                            <div className="flex justify-between text-indigo-300">
                              <span>Manpower Demand:</span>
                              <span className="font-bold">
                                {data.manpowerRequired} staff (Avail: {data.manpowerAvailable})
                              </span>
                            </div>
                            {data.manpowerDeficit > 0 && (
                              <div className="text-rose-400 font-medium">
                                Manpower Deficit: -{data.manpowerDeficit} staff!
                              </div>
                            )}
                            <div className="flex justify-between text-amber-300">
                              <span>Machinery Slots:</span>
                              <span className="font-bold">
                                {data.machinerySlotsRequired} units (Avail: {data.machinerySlotsAvailable})
                              </span>
                            </div>
                            {data.machineryDeficit > 0 && (
                              <div className="text-rose-400 font-medium">
                                Machine Deficit: -{data.machineryDeficit} machine(s)!
                              </div>
                            )}
                            <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5">
                              <div>
                                <strong className="text-slate-300">Defect Driver:</strong> {data.primaryDefectDriver}
                              </div>
                              <div>
                                <strong className="text-slate-300">Aging Driver:</strong> {data.primaryAgingDriver}
                              </div>
                            </div>
                            <div className="text-[10px] text-indigo-400 pt-1">
                              Click bar/area to inspect details & reserve
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="manpowerRequired"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="#6366f1"
                    fillOpacity={0.25}
                    name="Manpower Required"
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={forecast.dailyForecast[0]?.manpowerAvailable || 180}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Manpower Capacity',
                      fill: '#f43f5e',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="machinerySlotsRequired"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                    name="Machinery Required"
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={forecast.dailyForecast[0]?.machinerySlotsAvailable || 15}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Tip: Click on any day data point on the graph to open detailed machine, gang, and defect drilldown.
            </p>
          </div>

          {/* Corridor Demand Heat Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {forecast.corridorSummaries.map((corr) => (
              <div
                key={corr.corridorId}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{corr.corridorId}</h4>
                    <p className="text-[11px] text-slate-400">{corr.corridorName}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      corr.stressIndex >= 90
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : corr.stressIndex >= 80
                        ? 'bg-orange-950 text-orange-300 border border-orange-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}
                  >
                    Stress: {corr.stressIndex}%
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Manpower Demanded:</span>
                    <span className="text-slate-200 font-semibold">{corr.totalManpowerHours30d.toLocaleString()} hrs</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Machine Possessions:</span>
                    <span className="text-slate-200 font-semibold">{corr.totalMachineHours30d} hrs</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Forecast Blocks:</span>
                    <span className="text-indigo-300 font-semibold">{corr.criticalBlockCount} blocks</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Peak Deficit:</span>
                    <span className={corr.peakManpowerDeficit > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                      {corr.peakManpowerDeficit > 0 ? `-${corr.peakManpowerDeficit} staff` : 'Balanced'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-400">Dominant Hazard:</span> {corr.dominantFailureRisk}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DAILY TIMELINE & DEFICITS TABLE */}
      {activeTab === 'DAILY_TIMELINE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Next 30 Days Resource Demands & Deficit Warnings</span>
              </h3>
              <p className="text-xs text-slate-400">
                Detailed day-by-day staffing, machine classes, primary defect trigger, and aging cycle milestone
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by driver or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Day / Date</th>
                    <th className="py-3 px-3">Corridor</th>
                    <th className="py-3 px-3">Manpower Demand</th>
                    <th className="py-3 px-3">Machinery Required</th>
                    <th className="py-3 px-3">Deficit Status</th>
                    <th className="py-3 px-3">Primary Defect / Aging Driver</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredDailyPoints.map((point) => {
                    const hasDeficit = point.manpowerDeficit > 0 || point.machineryDeficit > 0;
                    return (
                      <tr
                        key={point.dayNumber}
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          hasDeficit ? 'bg-rose-950/10' : ''
                        }`}
                        onClick={() => setSelectedDay(point)}
                      >
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-white">
                            Day {point.dayNumber}: {point.displayDate}
                          </div>
                          <div className="text-[10px] text-slate-400">{point.dayOfWeek}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-indigo-300 font-medium">
                          {point.targetCorridorId}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">
                            {point.manpowerRequired} staff
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {point.trackmenRequired} P-Way · {point.signalTechsRequired} S&T · {point.oheLinesmenRequired} TRD
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-amber-300">
                            {point.machinerySlotsRequired} units
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {point.tampersRequired} CSM · {point.ballastRegulatorsRequired} BRM · {point.towerWagonsRequired} RUPS
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {hasDeficit ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                              <AlertCircle className="w-3 h-3" />
                              <span>
                                {point.manpowerDeficit > 0 && `-${point.manpowerDeficit} Gang`}
                                {point.manpowerDeficit > 0 && point.machineryDeficit > 0 && ' · '}
                                {point.machineryDeficit > 0 && `-${point.machineryDeficit} Machine`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                              <Check className="w-3 h-3" />
                              <span>Sufficient Pool</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate">
                          <div className="text-slate-200 truncate font-medium">{point.primaryDefectDriver}</div>
                          <div className="text-[10px] text-amber-400/90 truncate">{point.primaryAgingDriver}</div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(point);
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          >
                            Drilldown
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AGING ASSET LIFECYCLES */}
      {activeTab === 'AGING_LIFECYCLES' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Aging Railway Infrastructure Renewal & Overhaul Cycles</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tracks assets approaching statutory fatigue thresholds (e.g. 525 GMT rail limit, 40+ year girder bridge rivets, 20-year catenary wear) triggering heavy machine possessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecast.agingAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">
                        {asset.assetId}
                      </span>
                      <h4 className="text-sm font-bold text-white">{asset.assetName}</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Corridor {asset.corridorId} · Department: {asset.department}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      asset.lifecyclePhase === 'OVERDUE_CYCLE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : asset.lifecyclePhase === 'NEAR_RENEWAL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {asset.lifecyclePhase.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress Bar of Wear */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Cumulative GMT / Fatigue Wear</span>
                    <span className="font-bold text-white">{asset.fatigueWearPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        asset.fatigueWearPercentage >= 90
                          ? 'bg-rose-500'
                          : asset.fatigueWearPercentage >= 80
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${asset.fatigueWearPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Installed: {asset.installationYear} ({asset.assetAgeYears} yrs old)</span>
                    <span>
                      {asset.cumulativeGmt} GMT / {asset.gmtThreshold} Limit
                    </span>
                  </div>
                </div>

                {/* Due Window and Machines */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Predicted Overhaul Day:</span>
                    <span className="text-indigo-300 font-semibold font-mono">
                      Day {asset.predictedMaintenanceDueDay} ({asset.predictedDueDate})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mandated Action:</span>
                    <span className="text-slate-200 font-medium text-right max-w-[240px] truncate">
                      {asset.mandatedWorkType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Fleet:</span>
                    <span className="text-amber-400 font-medium text-right max-w-[240px] truncate">
                      {asset.requiredMachinery}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Statutory IR Manual:</span>
                    <span className="text-slate-400 font-mono text-[11px]">{asset.irManualReference}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECURRING DEFECT PATTERNS */}
      {activeTab === 'DEFECT_PATTERNS' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Historical Recurring Defect Signatures & Degradation Rates</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Recurring failure signatures identified through pattern matching over patrol and telemetry logs, driving mandatory preventive block allocation over the next 30 days.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast.defectPatterns.map((pattern) => (
              <div
                key={pattern.patternId}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">
                    {pattern.patternId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      pattern.degradationVelocity === 'ACCELERATING'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {pattern.degradationVelocity}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{pattern.patternTitle}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Department: {pattern.department} · Corridors: {pattern.affectedCorridors.join(', ')}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recurrence Frequency:</span>
                    <span className="font-semibold text-indigo-300">Every ~{pattern.recurrenceCycleDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Predicted Incidents (30d):</span>
                    <span className="font-bold text-amber-300">{pattern.predictedOccurrencesNext30Days} occurrences</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cumulative Man-Hours:</span>
                    <span className="font-semibold text-slate-200">{pattern.cumulativeManpowerHours} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Machine Time Demanded:</span>
                    <span className="font-semibold text-slate-200">{pattern.cumulativeMachineryHours} hrs</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-slate-800/80">
                  <div className="text-slate-400">
                    <strong className="text-slate-300">Mandatory Machine:</strong> {pattern.keyMachineryNeeded}
                  </div>
                  <div className="text-rose-400/90 text-[11px] leading-tight">
                    <strong>Hazard if unaddressed:</strong> {pattern.primaryHazardIfUnaddressed}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FLEET & GANG CAPACITY BALANCE */}
      {activeTab === 'FLEET_CAPACITY' && (
        <div className="space-y-6">
          {/* Machinery Inventory vs Demand Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2 mb-1">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Track Machinery Demand vs Base Depot Inventory</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Comparison of 30-day demanded machine-hours and peak simultaneous unit requirements against active fleet
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecast.machinerySummaries.map((m) => (
                <div
                  key={m.machineType}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-white">{m.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.shortageRisk === 'CRITICAL_SHORTAGE'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : m.shortageRisk === 'TIGHT_BUFFER'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {m.shortageRisk.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Total 30-Day Demand:</span>
                      <span className="text-amber-300 font-bold">{m.totalHoursRequired30d} hrs</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Base Inventory:</span>
                      <span className="text-slate-200 font-semibold">{m.currentInventoryCount} units</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Peak Concurrent Needed:</span>
                      <span
                        className={
                          m.peakConcurrentUnitsRequired > m.currentInventoryCount
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-200 font-semibold'
                        }
                      >
                        {m.peakConcurrentUnitsRequired} units
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Fleet Utilization Rate:</span>
                      <span className="text-indigo-300 font-semibold">{m.utilizationRatePct}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        m.utilizationRatePct > 100
                          ? 'bg-rose-500'
                          : m.utilizationRatePct > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, m.utilizationRatePct)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug pt-1 border-t border-slate-800/80">
                    <strong className="text-slate-300">Depot Advice:</strong> {m.depotMobilizationAdvice}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Manpower Gangs Roster Balance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Departmental Manpower Staffing & Gang Balance</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Projected staff requirements across maintenance trades vs available departmental roster
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {forecast.manpowerSummaries.map((mp) => (
                <div
                  key={mp.trade}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-white">{mp.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        mp.status === 'RESERVE_MOBILIZATION'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : mp.status === 'OVERTIME_ALERT'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {mp.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Gang Shifts:</span>
                      <span className="font-bold text-indigo-300">{mp.totalGangShifts30d} shifts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Daily Headcount:</span>
                      <span className="font-semibold text-white">{mp.totalPersonnelHeadcountAvg} staff</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available Pool:</span>
                      <span className="font-semibold text-slate-200">{mp.availableHeadcount} staff</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peak Deficit:</span>
                      <span className={mp.peakDeficit > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {mp.peakDeficit > 0 ? `-${mp.peakDeficit} staff` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAY DETAIL INSPECTOR */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                  Day Detail Inspector
                </span>
                <h3 className="text-lg font-bold text-white">
                  Day {selectedDay.dayNumber}: {selectedDay.displayDate} ({selectedDay.dayOfWeek})
                </h3>
                <p className="text-xs text-slate-400">
                  Target Corridor: <strong className="text-indigo-300">{selectedDay.targetCorridorId}</strong> · Risk Level:{' '}
                  <strong className={selectedDay.riskLevel === 'CRITICAL' ? 'text-rose-400' : 'text-amber-300'}>
                    {selectedDay.riskLevel}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Manpower & Machine Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Manpower Roster</span>
                <div className="text-lg font-bold text-indigo-300 mt-1">
                  {selectedDay.manpowerRequired} staff needed
                </div>
                <div className="text-slate-400 mt-1 space-y-0.5 text-[11px]">
                  <div>P-Way Trackmen: {selectedDay.trackmenRequired}</div>
                  <div>S&T Signal Techs: {selectedDay.signalTechsRequired}</div>
                  <div>OHE Linesmen: {selectedDay.oheLinesmenRequired}</div>
                  <div>Safety Lookouts: {selectedDay.safetyLookoutsRequired}</div>
                </div>
                {selectedDay.manpowerDeficit > 0 && (
                  <div className="mt-2 text-rose-400 font-bold text-[11px]">
                    Deficit: -{selectedDay.manpowerDeficit} staff
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Machinery Units</span>
                <div className="text-lg font-bold text-amber-300 mt-1">
                  {selectedDay.machinerySlotsRequired} units needed
                </div>
                <div className="text-slate-400 mt-1 space-y-0.5 text-[11px]">
                  <div>Tampers (CSM 09-3X): {selectedDay.tampersRequired}</div>
                  <div>Ballast Regulators: {selectedDay.ballastRegulatorsRequired}</div>
                  <div>Track Stabilizers: {selectedDay.stabilizersRequired}</div>
                  <div>OHE Tower Wagons: {selectedDay.towerWagonsRequired}</div>
                  <div>USFD Cars / Special: {selectedDay.usfdCarsRequired + selectedDay.specialMachinesRequired}</div>
                </div>
                {selectedDay.machineryDeficit > 0 && (
                  <div className="mt-2 text-rose-400 font-bold text-[11px]">
                    Deficit: -{selectedDay.machineryDeficit} unit(s)
                  </div>
                )}
              </div>
            </div>

            {/* Primary Drivers */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Recurring Defect Driver:
                </span>
                <span className="text-slate-200 font-medium">{selectedDay.primaryDefectDriver}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Aging Asset Cycle Trigger:
                </span>
                <span className="text-amber-300 font-medium">{selectedDay.primaryAgingDriver}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Recommended Action:
                </span>
                <span className="text-indigo-300 font-medium">{selectedDay.recommendedAction}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (onNavigateToSchedule) {
                    onNavigateToSchedule(selectedDay.date, selectedDay.targetCorridorId);
                  }
                  setSelectedDay(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Open Schedule for {selectedDay.displayDate}
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGING ASSET DETAIL */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">
                  {selectedAsset.assetId} · Corridor {selectedAsset.corridorId}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedAsset.assetName}</h3>
                <span className="text-xs text-amber-300">
                  Lifecycle Phase: {selectedAsset.lifecyclePhase}
                </span>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Installation Year:</span>
                  <span className="text-white font-semibold">
                    {selectedAsset.installationYear} ({selectedAsset.assetAgeYears} years in service)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cumulative Freight Traffic:</span>
                  <span className="text-amber-300 font-bold">
                    {selectedAsset.cumulativeGmt} GMT (Threshold: {selectedAsset.gmtThreshold} GMT)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated Fatigue Wear:</span>
                  <span className="text-rose-400 font-bold">{selectedAsset.fatigueWearPercentage}%</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Mandated Maintenance Work:
                  </span>
                  <span className="text-slate-200 font-medium">{selectedAsset.mandatedWorkType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Required Fleet & Gang:
                  </span>
                  <span className="text-amber-300 font-medium">
                    {selectedAsset.requiredMachinery} + {selectedAsset.requiredGangTrade}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Statutory Rulebook Reference:
                  </span>
                  <span className="text-indigo-300 font-mono">{selectedAsset.irManualReference}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
