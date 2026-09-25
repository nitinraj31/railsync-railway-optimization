import React, { useState } from 'react';
import {
  Users,
  Truck,
  HeartPulse,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Zap,
  Radio,
  HardHat,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { FatigueRiskTier } from '../../types';

export type LegendCategoryFilter = 'ALL' | 'MANPOWER' | 'MACHINERY' | 'FATIGUE';

export interface DynamicResourceLegendProps {
  activeChartView?: 'MANPOWER_TRADES' | 'MACHINERY_CLASSES' | 'UTILIZATION_LOAD';
  onSelectChartView?: (view: 'MANPOWER_TRADES' | 'MACHINERY_CLASSES' | 'UTILIZATION_LOAD') => void;
  activeTab?: 'MACHINERY' | 'MANPOWER' | 'FATIGUE' | 'FORECAST';
  onSelectTab?: (tab: 'MACHINERY' | 'MANPOWER' | 'FATIGUE' | 'FORECAST') => void;
  manpowerStats?: {
    trackGangs: number;
    signalTechs: number;
    oheLinesmen: number;
    safetyLookouts: number;
    totalAllocated: number;
    capacity: number;
  };
  machineryStats?: {
    tampers: number;
    regulators: number;
    towerWagons: number;
    grinders: number;
    stabilizers: number;
    totalAllocated: number;
    capacity: number;
  };
  fatigueStats?: {
    lowCount: number;
    moderateCount: number;
    highCount: number;
    criticalCount: number;
    averageScore: number;
    totalEvaluated: number;
  };
  selectedCorridorName?: string | null;
  className?: string;
}

export const DynamicResourceLegend: React.FC<DynamicResourceLegendProps> = ({
  activeChartView = 'MANPOWER_TRADES',
  onSelectChartView,
  activeTab = 'MANPOWER',
  onSelectTab,
  manpowerStats = {
    trackGangs: 38,
    signalTechs: 22,
    oheLinesmen: 18,
    safetyLookouts: 12,
    totalAllocated: 90,
    capacity: 100,
  },
  machineryStats = {
    tampers: 4,
    regulators: 2,
    towerWagons: 3,
    grinders: 1,
    stabilizers: 2,
    totalAllocated: 12,
    capacity: 16,
  },
  fatigueStats = {
    lowCount: 14,
    moderateCount: 6,
    highCount: 3,
    criticalCount: 1,
    averageScore: 42,
    totalEvaluated: 24,
  },
  selectedCorridorName = null,
  className = '',
}) => {
  const [selectedFilter, setSelectedFilter] = useState<LegendCategoryFilter>('ALL');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Manpower Categories
  const manpowerCategories = [
    {
      id: 'pwi-track',
      name: 'PWI Track Maintenance',
      shortCode: 'P-Way',
      color: '#38bdf8',
      bgClass: 'bg-sky-400',
      borderClass: 'border-sky-400',
      textClass: 'text-sky-300',
      badgeClass: 'bg-sky-950/80 text-sky-200 border-sky-600',
      count: manpowerStats.trackGangs,
      unit: 'gang staff',
      role: 'Heavy plain track packing, rail renewals, continuous welded rail destressing.',
      rule: 'P-Way Manual Para 2.14',
      chartTarget: 'MANPOWER_TRADES' as const,
    },
    {
      id: 'snt-signal',
      name: 'S&T Interlocking',
      shortCode: 'S&T',
      color: '#10b981',
      bgClass: 'bg-emerald-500',
      borderClass: 'border-emerald-500',
      textClass: 'text-emerald-300',
      badgeClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-600',
      count: manpowerStats.signalTechs,
      unit: 'technicians',
      role: 'Point machines, track circuits, relay interlocking, axle counters.',
      rule: 'Signal Engineering Manual Part II',
      chartTarget: 'MANPOWER_TRADES' as const,
    },
    {
      id: 'trd-ohe',
      name: 'TRD 25kV Catenary',
      shortCode: 'TRD/OHE',
      color: '#f59e0b',
      bgClass: 'bg-amber-500',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-300',
      badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-600',
      count: manpowerStats.oheLinesmen,
      unit: 'linesmen',
      role: 'Catenary & contact wire height, droppers, insulator washing under power isolation.',
      rule: 'IR AC Traction Manual Vol II',
      chartTarget: 'MANPOWER_TRADES' as const,
    },
    {
      id: 'safety-lookouts',
      name: 'Safety Marshals',
      shortCode: 'Safety',
      color: '#818cf8',
      bgClass: 'bg-indigo-400',
      borderClass: 'border-indigo-400',
      textClass: 'text-indigo-300',
      badgeClass: 'bg-indigo-950/80 text-indigo-200 border-indigo-600',
      count: manpowerStats.safetyLookouts,
      unit: 'lookouts',
      role: 'Audible hooter warning, detonator stationing, banner flag protection.',
      rule: 'General Rules (GR) 15.09',
      chartTarget: 'MANPOWER_TRADES' as const,
    },
    {
      id: 'manpower-ceiling',
      name: 'Staffing Ceiling',
      shortCode: 'Ceiling',
      color: '#f43f5e',
      bgClass: 'bg-rose-500',
      borderClass: 'border-rose-500',
      textClass: 'text-rose-300',
      badgeClass: 'bg-rose-950/80 text-rose-200 border-rose-600',
      count: manpowerStats.capacity,
      unit: 'cap limit',
      role: 'Upper authorized safety headcount limit per maintenance corridor.',
      rule: 'HOER Schedule IV Section B',
      dashed: true,
      chartTarget: 'UTILIZATION_LOAD' as const,
    },
  ];

  // Machinery Categories
  const machineryCategories = [
    {
      id: 'mach-tamper',
      name: 'Tie Tampers (CSM/09-3X)',
      shortCode: 'CSM/09-3X',
      color: '#a855f7',
      bgClass: 'bg-purple-500',
      borderClass: 'border-purple-500',
      textClass: 'text-purple-300',
      badgeClass: 'bg-purple-950/80 text-purple-200 border-purple-600',
      count: machineryStats.tampers,
      unit: 'units',
      role: 'Continuous plain track & turnout tamping, lifting & lining squeeze cycles.',
      rule: 'IRTMM Para 3.02',
      chartTarget: 'MACHINERY_CLASSES' as const,
    },
    {
      id: 'mach-brm',
      name: 'Ballast Regulators (BRM)',
      shortCode: 'BRM',
      color: '#f59e0b',
      bgClass: 'bg-amber-500',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-300',
      badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-600',
      count: machineryStats.regulators,
      unit: 'units',
      role: 'Ballast shoulder profiling, boxing, sweeping excess ballast from rail web.',
      rule: 'IRTMM Para 3.14',
      chartTarget: 'MACHINERY_CLASSES' as const,
    },
    {
      id: 'mach-tower',
      name: 'OHE Tower Wagons (RUPS)',
      shortCode: 'RUPS',
      color: '#06b6d4',
      bgClass: 'bg-cyan-500',
      borderClass: 'border-cyan-500',
      textClass: 'text-cyan-300',
      badgeClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-600',
      count: machineryStats.towerWagons,
      unit: 'units',
      role: 'Self-propelled 25kV catenary maintenance, tensioning, and mast inspection.',
      rule: 'ACTM Para 20412',
      chartTarget: 'MACHINERY_CLASSES' as const,
    },
    {
      id: 'mach-grinder',
      name: 'Rail Grinder / USFD',
      shortCode: 'RGM/USFD',
      color: '#f43f5e',
      bgClass: 'bg-rose-500',
      borderClass: 'border-rose-500',
      textClass: 'text-rose-300',
      badgeClass: 'bg-rose-950/80 text-rose-200 border-rose-600',
      count: machineryStats.grinders,
      unit: 'units',
      role: 'Railhead reprofiling, corrugation removal & ultrasonic rail flaw detection.',
      rule: 'USFD Manual 2022',
      chartTarget: 'MACHINERY_CLASSES' as const,
    },
    {
      id: 'mach-dts',
      name: 'Track Stabilizers (DTS)',
      shortCode: 'DTS',
      color: '#10b981',
      bgClass: 'bg-emerald-500',
      borderClass: 'border-emerald-500',
      textClass: 'text-emerald-300',
      badgeClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-600',
      count: machineryStats.stabilizers,
      unit: 'units',
      role: 'Dynamic track stabilization to allow immediate high-speed train clearance.',
      rule: 'IRTMM Para 4.08',
      chartTarget: 'MACHINERY_CLASSES' as const,
    },
    {
      id: 'mach-headway-limit',
      name: 'IRTMM Headway Limit',
      shortCode: 'Headway',
      color: '#ef4444',
      bgClass: 'bg-red-500',
      borderClass: 'border-red-500',
      textClass: 'text-red-300',
      badgeClass: 'bg-red-950/80 text-red-200 border-red-600',
      count: machineryStats.capacity,
      unit: 'max slots',
      role: 'Max 4 machine units per block section with 120m mandatory spacing.',
      rule: 'IRTMM Safety Rule 5.01',
      dashed: true,
      chartTarget: 'UTILIZATION_LOAD' as const,
    },
  ];

  // Fatigue Level Categories
  const fatigueCategories = [
    {
      id: 'fatigue-low',
      tier: 'LOW' as FatigueRiskTier,
      name: 'Low Fatigue Risk',
      shortCode: 'Score < 35',
      scoreRange: '< 35',
      color: '#10b981',
      bgClass: 'bg-emerald-500',
      borderClass: 'border-emerald-500',
      textClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-950/90 text-emerald-200 border-emerald-600',
      count: fatigueStats.lowCount,
      unit: 'gangs',
      status: 'Optimal Alertness',
      description: 'Full cognitive alertness; compliant HOER restorative sleep cycles; zero violation.',
      rule: 'IR HOER 2005 Rule 8',
      action: 'Standard block duty authorized',
    },
    {
      id: 'fatigue-moderate',
      tier: 'MODERATE' as FatigueRiskTier,
      name: 'Moderate Fatigue Risk',
      shortCode: 'Score 35–65',
      scoreRange: '35–65',
      color: '#0284c7',
      bgClass: 'bg-sky-500',
      borderClass: 'border-sky-500',
      textClass: 'text-sky-400',
      badgeClass: 'bg-sky-950/90 text-sky-200 border-sky-600',
      count: fatigueStats.moderateCount,
      unit: 'gangs',
      status: 'Elevated Watch',
      description: 'Minor sleep debt accumulation; monitor during circadian trough (02:00–04:00 AM).',
      rule: 'RDSO Fatigue Study 2024',
      action: 'Buddy system required during night blocks',
    },
    {
      id: 'fatigue-high',
      tier: 'HIGH' as FatigueRiskTier,
      name: 'High Fatigue Risk',
      shortCode: 'Score 66–80',
      scoreRange: '66–80',
      color: '#f59e0b',
      bgClass: 'bg-amber-500',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-400',
      badgeClass: 'bg-amber-950/90 text-amber-200 border-amber-600',
      count: fatigueStats.highCount,
      unit: 'gangs',
      status: 'Pre-Critical Strain',
      description: 'Exhaustion threshold reached; high micro-sleep vulnerability; 15-min mandatory rest.',
      rule: 'Railway Board Safety Directive No. 2024/CE',
      action: 'Rotate off heavy machine controls',
    },
    {
      id: 'fatigue-critical',
      tier: 'CRITICAL' as FatigueRiskTier,
      name: 'Critical Fatigue Level',
      shortCode: 'Score > 80',
      scoreRange: '> 80',
      color: '#ef4444',
      bgClass: 'bg-rose-500',
      borderClass: 'border-rose-500',
      textClass: 'text-rose-400',
      badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-600 animate-pulse',
      count: fatigueStats.criticalCount,
      unit: 'gangs',
      status: 'Statutory Violation Alert',
      description: 'Immediate grounding required; HOER continuous duty ceiling breached; imminent hazard.',
      rule: 'IR HOER Rule 14 (Mandatory Grounding)',
      action: 'Ground immediately & deploy standby crew',
    },
  ];

  const handleCategoryClick = (categoryTarget?: 'MANPOWER_TRADES' | 'MACHINERY_CLASSES' | 'UTILIZATION_LOAD', tabTarget?: 'MACHINERY' | 'MANPOWER' | 'FATIGUE') => {
    if (categoryTarget && onSelectChartView) {
      onSelectChartView(categoryTarget);
    }
    if (tabTarget && onSelectTab) {
      onSelectTab(tabTarget);
    }
  };

  const showManpower = selectedFilter === 'ALL' || selectedFilter === 'MANPOWER';
  const showMachinery = selectedFilter === 'ALL' || selectedFilter === 'MACHINERY';
  const showFatigue = selectedFilter === 'ALL' || selectedFilter === 'FATIGUE';

  return (
    <div
      id="dynamic-resource-legend-card"
      className={`rounded-xl border border-sky-900/60 bg-[#070d1e]/95 backdrop-blur-md shadow-lg overflow-hidden transition-all ${className}`}
    >
      {/* Top Bar with Category Filter Tabs & Toggle */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a1126]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-sky-950 border border-sky-700/80 text-sky-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              Dynamic Chart Legend
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            | Color-coded categories for Manpower, Machinery &amp; Fatigue
          </span>

          {selectedCorridorName && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300">
              Scope: {selectedCorridorName}
            </span>
          )}
        </div>

        {/* Dynamic Category Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg bg-[#040814] p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              id="legend-filter-all"
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all color-coded categories: Manpower trades, Machinery classes & Fatigue tiers"
            >
              All Categories
            </button>

            <button
              type="button"
              id="legend-filter-manpower"
              onClick={() => {
                setSelectedFilter('MANPOWER');
                if (onSelectChartView) onSelectChartView('MANPOWER_TRADES');
              }}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedFilter === 'MANPOWER'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-sky-400 hover:text-sky-200'
              }`}
              title="Filter legend to Manpower Trades (P-Way, S&T, TRD, Safety Lookouts)"
            >
              <Users className="w-3 h-3" />
              <span>Manpower</span>
              <span className="text-[9px] px-1 rounded bg-sky-950 text-sky-300 border border-sky-700/50">
                {manpowerStats.totalAllocated}
              </span>
            </button>

            <button
              type="button"
              id="legend-filter-machinery"
              onClick={() => {
                setSelectedFilter('MACHINERY');
                if (onSelectChartView) onSelectChartView('MACHINERY_CLASSES');
              }}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedFilter === 'MACHINERY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
              title="Filter legend to Track Machinery Classes (CSM, BRM, RUPS, RGM, DTS)"
            >
              <Truck className="w-3 h-3" />
              <span>Machinery</span>
              <span className="text-[9px] px-1 rounded bg-purple-950 text-purple-300 border border-purple-700/50">
                {machineryStats.totalAllocated}
              </span>
            </button>

            <button
              type="button"
              id="legend-filter-fatigue"
              onClick={() => {
                setSelectedFilter('FATIGUE');
                if (onSelectTab) onSelectTab('FATIGUE');
              }}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedFilter === 'FATIGUE'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-200'
              }`}
              title="Filter legend to HOER Crew Fatigue Risk Tiers (Low, Moderate, High, Critical)"
            >
              <HeartPulse className="w-3 h-3 text-rose-400" />
              <span>Fatigue</span>
              <span className="text-[9px] px-1 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                {fatigueStats.criticalCount > 0 ? `${fatigueStats.criticalCount} Crit` : 'OK'}
              </span>
            </button>
          </div>

          {/* Expand / Collapse Details Button */}
          <button
            type="button"
            id="btn-toggle-legend-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse dynamic legend details' : 'Expand full dynamic legend details'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Legend Content */}
      <div className={`p-4 space-y-4 transition-all ${isExpanded ? 'block' : 'hidden'}`}>
        {/* MANPOWER CATEGORIES SECTION */}
        {showManpower && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 font-mono uppercase tracking-wide">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Manpower Headcount Categories (Departmental Trades)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Total Active: <strong className="text-sky-300">{manpowerStats.totalAllocated}</strong></span>
                <span>/</span>
                <span>Capacity: <strong className="text-slate-200">{manpowerStats.capacity}</strong></span>
                {onSelectChartView && (
                  <button
                    type="button"
                    onClick={() => onSelectChartView('MANPOWER_TRADES')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      activeChartView === 'MANPOWER_TRADES'
                        ? 'bg-sky-900 text-sky-200 border-sky-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {activeChartView === 'MANPOWER_TRADES' ? '✓ In Chart' : 'View In Chart'}
                  </button>
                )}
              </div>
            </div>

            {/* Manpower Category Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {manpowerCategories.map((cat) => {
                const isHovered = hoveredItem === cat.id;
                return (
                  <div
                    key={cat.id}
                    onMouseEnter={() => setHoveredItem(cat.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleCategoryClick(cat.chartTarget, 'MANPOWER')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none relative group ${
                      isHovered
                        ? 'bg-[#101b3b] border-sky-400 shadow-md ring-1 ring-sky-400/40'
                        : 'bg-[#090f22] border-slate-800/90 hover:border-slate-700'
                    }`}
                    title={`${cat.name}: ${cat.role} (${cat.rule})`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        {cat.dashed ? (
                          <span
                            className="w-3.5 h-0.5 border-t-2 border-dashed border-rose-400 shrink-0"
                            style={{ borderColor: cat.color }}
                          />
                        ) : (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <span className="text-xs font-semibold text-slate-100 truncate font-mono">
                          {cat.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                        {cat.count}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 line-clamp-1 font-sans">
                      {cat.role}
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span className="truncate">{cat.rule}</span>
                      <span className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Apply ↗
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MACHINERY CATEGORIES SECTION */}
        {showMachinery && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-300 font-mono uppercase tracking-wide">
                <Truck className="w-3.5 h-3.5 text-purple-400" />
                <span>Machinery Class Categories (Heavy Track Machines)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Active Slots: <strong className="text-purple-300">{machineryStats.totalAllocated}</strong></span>
                <span>/</span>
                <span>Fleet Limit: <strong className="text-slate-200">{machineryStats.capacity}</strong></span>
                {onSelectChartView && (
                  <button
                    type="button"
                    onClick={() => onSelectChartView('MACHINERY_CLASSES')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      activeChartView === 'MACHINERY_CLASSES'
                        ? 'bg-purple-900 text-purple-200 border-purple-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {activeChartView === 'MACHINERY_CLASSES' ? '✓ In Chart' : 'View In Chart'}
                  </button>
                )}
              </div>
            </div>

            {/* Machinery Category Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {machineryCategories.map((cat) => {
                const isHovered = hoveredItem === cat.id;
                return (
                  <div
                    key={cat.id}
                    onMouseEnter={() => setHoveredItem(cat.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleCategoryClick(cat.chartTarget, 'MACHINERY')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none relative group ${
                      isHovered
                        ? 'bg-[#18112c] border-purple-400 shadow-md ring-1 ring-purple-400/40'
                        : 'bg-[#090f22] border-slate-800/90 hover:border-slate-700'
                    }`}
                    title={`${cat.name}: ${cat.role} (${cat.rule})`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        {cat.dashed ? (
                          <span
                            className="w-3.5 h-0.5 border-t-2 border-dashed border-red-500 shrink-0"
                            style={{ borderColor: cat.color }}
                          />
                        ) : (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <span className="text-xs font-semibold text-slate-100 truncate font-mono">
                          {cat.shortCode}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                        {cat.count}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 line-clamp-1 font-sans">
                      {cat.name}
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span className="truncate">{cat.rule}</span>
                      <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Apply ↗
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FATIGUE LEVELS CATEGORIES SECTION */}
        {showFatigue && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 font-mono uppercase tracking-wide">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Crew Fatigue Level Categories (HOER Statutory Alert Tiers)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Avg Fleet Score: <strong className={fatigueStats.averageScore > 40 ? 'text-amber-400' : 'text-emerald-400'}>{fatigueStats.averageScore}/100</strong></span>
                <span>•</span>
                <span className="text-rose-400 font-bold">{fatigueStats.criticalCount} Critical</span>
                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('FATIGUE')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      activeTab === 'FATIGUE'
                        ? 'bg-rose-900 text-rose-200 border-rose-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {activeTab === 'FATIGUE' ? '✓ Active Tab' : 'Open Predictor Tab'}
                  </button>
                )}
              </div>
            </div>

            {/* Fatigue Category Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {fatigueCategories.map((cat) => {
                const isHovered = hoveredItem === cat.id;
                return (
                  <div
                    key={cat.id}
                    onMouseEnter={() => setHoveredItem(cat.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleCategoryClick(undefined, 'FATIGUE')}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none relative group ${
                      isHovered
                        ? 'bg-[#220d18] border-rose-400 shadow-md ring-1 ring-rose-400/40'
                        : 'bg-[#090f22] border-slate-800/90 hover:border-slate-700'
                    }`}
                    title={`${cat.name} (${cat.scoreRange}): ${cat.description} - ${cat.action}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-semibold text-slate-100 truncate font-mono">
                          {cat.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${cat.badgeClass}`}>
                        {cat.count} {cat.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className={cat.textClass}>{cat.status}</span>
                      <span className="text-slate-400 font-bold">{cat.shortCode}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 line-clamp-1 font-sans">
                      {cat.description}
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span className="truncate">{cat.rule}</span>
                      <span className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Inspect ↗
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Compact Quick Summary Strip (Always Visible) */}
      <div className="px-4 py-2 bg-[#040916] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Manpower quick dots */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Manpower:</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" title="PWI Track Maintenance (#38bdf8)" />
            <span className="text-slate-300">P-Way</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="S&T Interlocking (#10b981)" />
            <span className="text-slate-300">S&T</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" title="TRD 25kV OHE (#f59e0b)" />
            <span className="text-slate-300">TRD</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400" title="Safety Lookouts (#818cf8)" />
            <span className="text-slate-300">Safety</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Machinery quick dots */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Machinery:</span>
            <span className="w-2 h-2 rounded-full bg-purple-500" title="Tie Tampers CSM (#a855f7)" />
            <span className="text-slate-300">CSM</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Ballast Regulators BRM (#f59e0b)" />
            <span className="text-slate-300">BRM</span>
            <span className="w-2 h-2 rounded-full bg-cyan-500" title="Tower Wagons RUPS (#06b6d4)" />
            <span className="text-slate-300">RUPS</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" title="Rail Grinder/USFD (#f43f5e)" />
            <span className="text-slate-300">RGM</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Stabilizer DTS (#10b981)" />
            <span className="text-slate-300">DTS</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Fatigue quick dots */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Fatigue:</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Low Risk <35 (#10b981)" />
            <span className="text-emerald-400">Low</span>
            <span className="w-2 h-2 rounded-full bg-sky-500" title="Moderate Risk 35-65 (#0284c7)" />
            <span className="text-sky-400">Mod</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" title="High Risk 66-80 (#f59e0b)" />
            <span className="text-amber-400">High</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Critical >80 (#ef4444)" />
            <span className="text-rose-400 font-bold">Critical</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Info className="w-3 h-3 text-sky-400" />
          <span>Click any category card to cross-filter chart views &amp; fleet rosters</span>
        </div>
      </div>
    </div>
  );
};
