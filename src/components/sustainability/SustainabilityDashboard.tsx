import React, { useState, useMemo } from 'react';
import {
  DEFAULT_SUSTAINABILITY_LEDGER,
  calculateSustainabilityMetrics,
  get24HourEmissionsTrajectory,
  getCorridorAbatementData,
  SUSTAINABILITY_CONSTANTS,
} from '../../services/sustainabilityService';
import {
  SustainabilityBlockLedgerItem,
  LocomotiveTractionType,
} from '../../types';
import { SustainabilityCertificateModal } from './SustainabilityCertificateModal';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Leaf,
  Fuel,
  Zap,
  Clock,
  TreePine,
  Award,
  Filter,
  Sliders,
  Sparkles,
  ArrowRight,
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  Info,
  Layers,
  Train,
  Flame,
  Search,
  RotateCcw,
} from 'lucide-react';

interface SustainabilityDashboardProps {
  onNavigate?: (screen: string, itemData?: any) => void;
}

export const SustainabilityDashboard: React.FC<SustainabilityDashboardProps> = ({
  onNavigate,
}) => {
  // Interactive Simulation State
  const [dwellFactor, setDwellFactor] = useState<number>(1.0); // 0.5 to 1.5
  const [aessAdoptionRate, setAessAdoptionRate] = useState<number>(0.85); // 0 to 1
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [selectedTraction, setSelectedTraction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCertificateOpen, setIsCertificateOpen] = useState<boolean>(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);

  // Derived Metrics
  const metrics = useMemo(() => {
    return calculateSustainabilityMetrics(
      DEFAULT_SUSTAINABILITY_LEDGER,
      dwellFactor,
      aessAdoptionRate,
      selectedCorridor,
      selectedTraction
    );
  }, [dwellFactor, aessAdoptionRate, selectedCorridor, selectedTraction]);

  // Trajectory Chart Data
  const trajectoryData = useMemo(() => {
    return get24HourEmissionsTrajectory(dwellFactor);
  }, [dwellFactor]);

  // Corridor Breakdown Chart Data
  const corridorData = useMemo(() => {
    return getCorridorAbatementData(dwellFactor);
  }, [dwellFactor]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return DEFAULT_SUSTAINABILITY_LEDGER.filter((item) => {
      if (selectedCorridor !== 'ALL' && item.corridorId !== selectedCorridor) return false;
      if (selectedTraction !== 'ALL' && item.tractionType !== selectedTraction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.blockName.toLowerCase().includes(q);
        const matchesId = item.blockId.toLowerCase().includes(q);
        const matchesTrain =
          item.heldTrainName.toLowerCase().includes(q) ||
          item.heldTrainNumber.toLowerCase().includes(q);
        const matchesLoco = item.locoModel.toLowerCase().includes(q);
        const matchesSection = item.section.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesTrain && !matchesLoco && !matchesSection) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCorridor, selectedTraction, searchQuery]);

  // Reset sliders to defaults
  const handleResetFilters = () => {
    setDwellFactor(1.0);
    setAessAdoptionRate(0.85);
    setSelectedCorridor('ALL');
    setSelectedTraction('ALL');
    setSearchQuery('');
  };

  return (
    <div
      id="sustainability-dashboard-module"
      className="bg-[#0a1424] p-5 sm:p-6 rounded-2xl border border-emerald-500/40 shadow-2xl space-y-6 font-mono"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-950/80 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/80 shrink-0">
            <Leaf className="w-6 h-6 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                SUSTAINABILITY & CARBON REDUCTION DASHBOARD
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-emerald-400" />
                RDSO GREEN RAIL VISION 2030
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40">
                ISO 14064-1 COMPLIANT
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              Empirical modeling of direct greenhouse gas abatement achieved by optimizing train dwell times,
              suppressing unnecessary locomotive engine idling, and eliminating static halts during scheduled maintenance blocks.
            </p>
          </div>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            id="toggle-sustainability-formula-btn"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="View empirical emissions formulas and RDSO standards"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showFormulaInfo ? 'Hide Methodology' : 'Emissions Methodology'}</span>
          </button>

          <button
            id="open-esg-certificate-btn"
            onClick={() => setIsCertificateOpen(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all"
          >
            <FileCheck2 className="w-4 h-4 fill-slate-950" />
            <span>Generate ESG Certificate</span>
          </button>
        </div>
      </div>

      {/* Methodology & Calculation Formula Card (Expandable) */}
      {showFormulaInfo && (
        <div className="bg-[#07101c] p-4 rounded-xl border border-emerald-700/50 space-y-3 text-xs text-slate-300 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Empirical Combustion & Traction Decarbonization Formulas (RDSO & CEA India)
            </span>
            <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              AUDITED COEFFICIENTS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[11px] leading-relaxed">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5" />
                Diesel Freight & Passenger Traction (WDG-4, WDP-4D)
              </span>
              <p>
                • <strong>Idling Fuel Rate:</strong> 30.0 Liters HSD / Locomotive-Hour (~60 L/hr for twin-cab consists).
                <br />
                • <strong>Carbon Intensity:</strong> 2.68 kg CO₂e emitted per Liter of High-Speed Diesel combusted.
                <br />
                • <strong>Anti-Idling AESS Protocol:</strong> Automatically cuts fuel flow when station or siding hold exceeds 20 minutes.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                25kV AC Electric Traction (WAG-9, WAP-7, Trainset-18)
              </span>
              <p>
                • <strong>Auxiliary Hotel Load:</strong> 55.0 kWh per hour for traction blowers, air compressors, and HVAC.
                <br />
                • <strong>Grid Carbon Factor:</strong> 0.82 kg CO₂e / kWh based on CEA National Grid Mix baseline.
                <br />
                • <strong>Green Wave Pacing:</strong> Prevents stop-and-restart kinetic energy dissipation at outer signals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total CO2 Abated */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-emerald-500/50 shadow-md relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              CO₂e Abated
            </span>
            <Leaf className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-2">
            {metrics.totalCo2AbatedTonnes}{' '}
            <span className="text-xs font-normal text-slate-400">MT</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-semibold">
            <TrendingDown className="w-3 h-3" />
            <span>-{metrics.carbonIntensityReductionPercent}% Intensity</span>
          </div>
        </div>

        {/* Card 2: Diesel Conserved */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-amber-500/40 shadow-md relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Diesel Saved
            </span>
            <Fuel className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 mt-2">
            {metrics.dieselSavedLiters.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">L</span>
          </div>
          <div className="text-[10px] text-amber-400/90 mt-1 truncate">
            ₹{(metrics.dieselSavedLiters * SUSTAINABILITY_CONSTANTS.DIESEL_PRICE_PER_LITER_INR / 100000).toFixed(2)} Lakhs saved
          </div>
        </div>

        {/* Card 3: Electric Auxiliary Energy */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-cyan-500/40 shadow-md relative overflow-hidden group hover:border-cyan-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Aux Electric
            </span>
            <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-2">
            {metrics.electricSavedKwh.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <div className="text-[10px] text-cyan-400/90 mt-1 truncate">
            ₹{(metrics.electricSavedKwh * SUSTAINABILITY_CONSTANTS.ELECTRIC_PRICE_PER_KWH_INR / 1000).toFixed(1)}k tariff saved
          </div>
        </div>

        {/* Card 4: Idling Hours Suppressed */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-sky-500/40 shadow-md relative overflow-hidden group hover:border-sky-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Idling Eliminated
            </span>
            <Clock className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-300 mt-2">
            {metrics.idlingHoursEliminated}{' '}
            <span className="text-xs font-normal text-slate-400">Loco-Hrs</span>
          </div>
          <div className="text-[10px] text-sky-400/90 mt-1 truncate">
            Across {DEFAULT_SUSTAINABILITY_LEDGER.length} scheduled blocks
          </div>
        </div>

        {/* Card 5: Average Dwell Compression */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-purple-500/40 shadow-md relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Avg Dwell Saved
            </span>
            <TrendingDown className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300 mt-2">
            -{metrics.avgDwellMinutesSavedPerTrain}{' '}
            <span className="text-xs font-normal text-slate-400">min/train</span>
          </div>
          <div className="text-[10px] text-purple-300/90 mt-1 truncate">
            Outer signal buffers removed
          </div>
        </div>

        {/* Card 6: Tree Sequestration Equivalent */}
        <div className="bg-[#0c192d] p-3.5 rounded-xl border border-teal-500/40 shadow-md relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Trees Equivalent
            </span>
            <TreePine className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-300 mt-2">
            {metrics.treesOffsetEquivalent.toLocaleString()}
          </div>
          <div className="text-[10px] text-teal-300/90 mt-1 truncate">
            ≈ {(metrics.totalCo2AbatedTonnes * 0.42).toFixed(1)} acres forest
          </div>
        </div>
      </div>

      {/* Interactive Simulation Parameters & Policy Controls */}
      <div className="bg-[#081220] p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Interactive Policy Governor & Decarbonization Simulator
            </h3>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Slider 1: Dwell Time Optimization Multiplier */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-medium">Dwell Compression Target:</span>
              <span className="text-emerald-300 font-bold font-mono">
                {Math.round(dwellFactor * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={dwellFactor}
              onChange={(e) => setDwellFactor(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>50% (Conservative)</span>
              <span>100% (Nominal)</span>
              <span>150% (Aggressive)</span>
            </div>
          </div>

          {/* Slider 2: AESS Auxiliary Engine Stop-Start Rate */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-medium">AESS Adoption Compliance:</span>
              <span className="text-amber-300 font-bold font-mono">
                {Math.round(aessAdoptionRate * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={aessAdoptionRate}
              onChange={(e) => setAessAdoptionRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>20% (Manual)</span>
              <span>85% (Smart Dispatch)</span>
              <span>100% (Automated)</span>
            </div>
          </div>

          {/* Select: Corridor Filter */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <label className="text-slate-300 font-medium block">Filter by Corridor:</label>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="w-full bg-[#050c17] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Corridors (C001–C004)</option>
              <option value="C001">C001: Delhi - Agra Main Trunk</option>
              <option value="C002">C002: Western DFC (Heavy-Haul)</option>
              <option value="C003">C003: Howrah - Dhanbad Coal Link</option>
              <option value="C004">C004: Mathura - Jhansi Mixed</option>
            </select>
          </div>

          {/* Select: Traction Fleet Filter */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <label className="text-slate-300 font-medium block">Locomotive Traction Fleet:</label>
            <select
              value={selectedTraction}
              onChange={(e) => setSelectedTraction(e.target.value)}
              className="w-full bg-[#050c17] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Tractions (Diesel + Electric)</option>
              <option value="DIESEL">Diesel Locomotives Only (WDG-4)</option>
              <option value="ELECTRIC">25kV Electric Locos (WAP-7, WAG-9)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts: Trajectory & Corridor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: 24-Hour Emissions Trajectory */}
        <div className="bg-[#081220] p-4 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                24-Hour Idling Emissions Trajectory (MT CO₂e)
              </h4>
              <p className="text-[10px] text-slate-400">
                Baseline Static Lockout Idling vs. RAILSYNC Optimized Schedule
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              68% AVERAGE ABATEMENT
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trajectoryData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} unit=" MT" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  name="Baseline Static Lockout Idling"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#baselineGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="optimized"
                  name="RAILSYNC Optimized Schedule"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#optimizedGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Corridor-Wise Decarbonization & Dwell Compression */}
        <div className="bg-[#081220] p-4 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Carbon Abatement by Corridor (kg CO₂e)
              </h4>
              <p className="text-[10px] text-slate-400">
                Diesel Freight Mitigation (Amber) vs. Electric Traction Optimization (Cyan)
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              CROSS-CORRIDOR AUDIT
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={corridorData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="corridor" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} unit=" kg" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar
                  dataKey="dieselCo2Kg"
                  name="Diesel HSD Savings (kg CO₂e)"
                  fill="#f59e0b"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="electricCo2Kg"
                  name="Electric Traction Savings (kg CO₂e)"
                  fill="#06b6d4"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Granular Maintenance Block Carbon Ledger Table */}
      <div className="bg-[#081220] p-4 rounded-xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Scheduled Maintenance Block Decarbonization Ledger
              </h3>
              <p className="text-[10px] text-slate-400">
                Detailed audit trail of trailing train idling suppression & dwell compression per maintenance block
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search train, block, loco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050c17] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                <th className="py-2.5 px-3">Block ID & Overhaul</th>
                <th className="py-2.5 px-3">Corridor & Section</th>
                <th className="py-2.5 px-3">Held / Impacted Train</th>
                <th className="py-2.5 px-3">Loco Model</th>
                <th className="py-2.5 px-3 text-center">Baseline vs Opt Idling</th>
                <th className="py-2.5 px-3 text-center">Dwell Saved</th>
                <th className="py-2.5 px-3 text-right">Energy / Fuel Conserved</th>
                <th className="py-2.5 px-3 text-right">CO₂e Abated</th>
                <th className="py-2.5 px-3 text-center">Anti-Idling Protocol</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-500">
                    No maintenance blocks matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => {
                  const effectiveDwellSaved = Math.round(item.dwellMinutesSaved * dwellFactor);
                  const effectiveDieselSaved =
                    item.tractionType === 'DIESEL'
                      ? Math.round(
                          (effectiveDwellSaved / 60) *
                            SUSTAINABILITY_CONSTANTS.DIESEL_IDLE_LITERS_PER_HOUR *
                            (item.locoModel.includes('Twin') ? 2 : 1) *
                            (item.antiIdlingProtocol === 'AESS_ENGAGED' ? aessAdoptionRate : 1.0)
                        )
                      : 0;
                  const effectiveElectricSaved =
                    item.tractionType === 'ELECTRIC'
                      ? Math.round(
                          (effectiveDwellSaved / 60) *
                            SUSTAINABILITY_CONSTANTS.ELECTRIC_IDLE_KWH_PER_HOUR *
                            (item.antiIdlingProtocol === 'AESS_ENGAGED' ? aessAdoptionRate : 1.0)
                        )
                      : 0;
                  const effectiveCo2Kg =
                    item.tractionType === 'DIESEL'
                      ? +(effectiveDieselSaved * SUSTAINABILITY_CONSTANTS.DIESEL_CO2_PER_LITER).toFixed(1)
                      : +(effectiveElectricSaved * SUSTAINABILITY_CONSTANTS.ELECTRIC_CO2_PER_KWH).toFixed(1);

                  return (
                    <tr
                      key={item.blockId}
                      className="hover:bg-slate-900/60 transition-colors group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.blockId}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.department}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {item.blockName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-cyan-300">{item.corridorId}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {item.section}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-white font-medium flex items-center gap-1">
                          <Train className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.heldTrainNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {item.heldTrainName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.tractionType === 'DIESEL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {item.tractionType === 'DIESEL' ? (
                            <Fuel className="w-2.5 h-2.5 text-amber-400" />
                          ) : (
                            <Zap className="w-2.5 h-2.5 text-cyan-400" />
                          )}
                          {item.locoModel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="line-through text-rose-400/80 mr-1.5">
                          {item.baselineIdlingMinutes}m
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {Math.max(0, item.baselineIdlingMinutes - effectiveDwellSaved)}m
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        -{effectiveDwellSaved} min
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.tractionType === 'DIESEL' ? (
                          <span className="text-amber-300 font-bold">
                            {effectiveDieselSaved} L HSD
                          </span>
                        ) : (
                          <span className="text-cyan-300 font-bold">
                            {effectiveElectricSaved} kWh
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-300">
                        {effectiveCo2Kg} kg
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            item.antiIdlingProtocol === 'SHADOW_BLOCK_SLIPSTREAM'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : item.antiIdlingProtocol === 'AESS_ENGAGED'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {item.antiIdlingProtocol.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.certificationStatus}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official ESG Decarbonization Certificate Modal */}
      <SustainabilityCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        metrics={metrics}
        corridorFilter={selectedCorridor}
      />
    </div>
  );
};
