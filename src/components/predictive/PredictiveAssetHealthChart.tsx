import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Wrench,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
  Sliders,
  ChevronRight,
  Check,
  Zap,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Asset, Corridor, DepartmentType } from '../../types';
import { mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

interface PredictiveAssetHealthChartProps {
  assets?: Asset[];
  corridors?: Corridor[];
  onNavigate?: (screen: string, itemData?: any) => void;
  className?: string;
}

interface MonthlyHealthForecastPoint {
  monthIndex: number;
  monthLabel: string;
  calendarDate: string;
  unmitigatedHealth: number;
  mitigatedHealth: number;
  optimalThreshold: number;
  mandatoryMaintenanceThreshold: number;
  criticalSafetyFloor: number;
  isMaintenanceMonth?: boolean;
}

interface CriticalAssetAnalysis {
  asset: Asset;
  corridorName: string;
  initialHealth: number;
  monthlyDecayRate: number;
  forecastPoints: MonthlyHealthForecastPoint[];
  monthsUntilMandatoryThreshold: number; // to 70%
  monthsUntilCriticalFloor: number; // to 55%
  recommendedMaintenanceMonth: string;
  recommendedMaintenanceWindowHours: number;
  recommendedInterventionType: string;
  statutoryCode: string;
  urgencyLevel: 'IMMEDIATE' | 'HIGH' | 'PLANNED' | 'MONITORING';
}

export const PredictiveAssetHealthChart: React.FC<PredictiveAssetHealthChartProps> = ({
  assets: propAssets,
  corridors: propCorridors,
  onNavigate,
  className = '',
}) => {
  // ---------------------------------------------------------------------------
  // DATA SOURCING
  // ---------------------------------------------------------------------------
  const assets = useMemo<Asset[]>(() => {
    if (propAssets && propAssets.length > 0) return propAssets;
    try {
      return mockStore.getAssets() || [];
    } catch {
      return [];
    }
  }, [propAssets]);

  const corridors = useMemo<Corridor[]>(() => {
    if (propCorridors && propCorridors.length > 0) return propCorridors;
    try {
      return mockStore.getCorridors() || [];
    } catch {
      return [];
    }
  }, [propCorridors]);

  // Filters & Controls
  const [selectedAssetId, setSelectedAssetId] = useState<string>('A006'); // Girder Bridge Br-104 (Yamuna Link) as default
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<'ALL' | DepartmentType>('ALL');
  const [showMitigatedCurve, setShowMitigatedCurve] = useState<boolean>(true);
  const [trafficTonnageMultiplier, setTrafficTonnageMultiplier] = useState<number>(1.0); // 1.0 standard, 1.25 peak, 0.8 low
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'ALL' | 'BRIDGES' | 'TRACKS' | 'TURNOUTS' | 'CATENARY'>('ALL');

  // Month names for next 12 months starting from current month (Oct 2026)
  const monthLabels = useMemo(() => {
    const baseDate = new Date(2026, 9, 1); // Oct 2026
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const mStr = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      return {
        index: i,
        label: i === 0 ? 'M+0 (Oct)' : `M+${i} (${mStr.split(' ')[0]})`,
        fullDate: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // DECAY MODEL CALCULATION
  // ---------------------------------------------------------------------------
  // Calculate decay rate based on physical asset physics and materials
  const getAssetBaseDecayRate = (asset: Asset): number => {
    const name = asset.name.toLowerCase();
    const type = asset.type.toLowerCase();

    // 1. Bridges & Culverts (Cyclic deflection fatigue, water scour, rivet looseness)
    if (name.includes('bridge') || type.includes('girder')) return 1.45;
    if (name.includes('culvert') || type.includes('culvert')) return 1.15;

    // 2. Track & Rail Sections (Wheel contact wear, ballast pulverization, alignment slip)
    if (name.includes('curve') || type.includes('curve')) return 1.95;
    if (name.includes('heavy axle') || type.includes('ballast bed')) return 1.65;
    if (name.includes('track section') || type.includes('rail')) return 1.35;

    // 3. Turnouts & Switches (Dynamic point impacts, manganese tongue wear)
    if (name.includes('crossover') || name.includes('crossing') || type.includes('crossing')) return 1.75;
    if (name.includes('point machine') || name.includes('turnout')) return 1.60;

    // 4. Traction OHE Catenary (Contact wire groove erosion, thermal sag)
    if (name.includes('catenary') || name.includes('ohe') || name.includes('contact wire')) return 1.25;
    if (name.includes('insulator') || name.includes('cantilever')) return 1.35;

    // 5. Signaling Electronics
    if (name.includes('signal') || name.includes('axle counter')) return 1.05;

    return 1.30;
  };

  // Pre-filter critical infrastructure assets
  const criticalAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterCorridor !== 'ALL' && a.corridorId !== filterCorridor) return false;
      if (filterDepartment !== 'ALL' && a.department !== filterDepartment) return false;

      const name = a.name.toLowerCase();
      const type = a.type.toLowerCase();

      if (selectedCategoryTab === 'BRIDGES') {
        return name.includes('bridge') || name.includes('culvert') || type.includes('girder');
      }
      if (selectedCategoryTab === 'TRACKS') {
        return name.includes('track') || name.includes('rail') || name.includes('bed') || name.includes('curve');
      }
      if (selectedCategoryTab === 'TURNOUTS') {
        return name.includes('turnout') || name.includes('crossing') || name.includes('point machine') || name.includes('crossover');
      }
      if (selectedCategoryTab === 'CATENARY') {
        return name.includes('catenary') || name.includes('ohe') || name.includes('mast') || name.includes('wire');
      }

      return true;
    });
  }, [assets, filterCorridor, filterDepartment, selectedCategoryTab]);

  // Compute 12-Month decay analysis for the selected asset
  const selectedAnalysis = useMemo<CriticalAssetAnalysis | null>(() => {
    const asset = assets.find((a) => a.id === selectedAssetId) || criticalAssets[0] || assets[0];
    if (!asset) return null;

    const corridor = corridors.find((c) => c.id === asset.corridorId);
    const corridorName = corridor ? `${corridor.code || corridor.id} - ${corridor.name}` : `Corridor ${asset.corridorId}`;

    const initialHealth = asset.healthIndex || 78;
    const baseDecayRate = getAssetBaseDecayRate(asset);
    const effectiveDecayRate = Number((baseDecayRate * trafficTonnageMultiplier).toFixed(2));

    let monthsTo70 = 12;
    let monthsTo55 = 12;
    let plannedMaintenanceMonth = 4; // default scheduled intervention month

    // Determine when unmitigated health falls below 70% and 55%
    for (let m = 1; m <= 12; m++) {
      // Non-linear wear acceleration: slight exponential curve as slack accumulates
      const degradation = m * effectiveDecayRate * (1 + m * 0.035);
      const h = Math.max(20, Number((initialHealth - degradation).toFixed(1)));
      if (h <= 70 && monthsTo70 === 12) monthsTo70 = m;
      if (h <= 55 && monthsTo55 === 12) monthsTo55 = m;
    }

    // Set planned maintenance month to 1 month before hitting 70% threshold (or month 2 if already low)
    plannedMaintenanceMonth = initialHealth <= 70 ? 2 : Math.max(1, Math.min(10, monthsTo70 - 1));

    // Generate monthly forecast points
    const forecastPoints: MonthlyHealthForecastPoint[] = monthLabels.map(({ index, label, fullDate }) => {
      // 1. Unmitigated Degradation Curve
      const degradation = index * effectiveDecayRate * (1 + index * 0.035);
      const unmitigated = Math.max(20, Number((initialHealth - degradation).toFixed(1)));

      // 2. Mitigated Trajectory (with scheduled renewal block intervention)
      let mitigated = unmitigated;
      const isMaintenanceMonth = index === plannedMaintenanceMonth;

      if (index >= plannedMaintenanceMonth) {
        // Health restored to 95% at maintenance block, then decays at 60% lower rate (freshly renewed)
        const postMaintenanceMonths = index - plannedMaintenanceMonth;
        const postMaintenanceDegradation = postMaintenanceMonths * (effectiveDecayRate * 0.55);
        mitigated = Math.max(30, Number((95.0 - postMaintenanceDegradation).toFixed(1)));
      }

      return {
        monthIndex: index,
        monthLabel: label,
        calendarDate: fullDate,
        unmitigatedHealth: unmitigated,
        mitigatedHealth: mitigated,
        optimalThreshold: 80,
        mandatoryMaintenanceThreshold: 70,
        criticalSafetyFloor: 55,
        isMaintenanceMonth,
      };
    });

    // Recommended intervention metadata
    const name = asset.name.toLowerCase();
    let interventionType = 'Ultrasonic Flaw Detection (USFD) & Track Geometry Tamping';
    let windowHours = 3.5;
    let statutoryCode = 'Indian Railways Permanent Way Manual (IRPWM) Para 504';

    if (name.includes('bridge')) {
      interventionType = 'Girder Deflection Camber Realignment & Bearing Greasing';
      windowHours = 4.5;
      statutoryCode = 'RDSO Bridge Inspection Code Rule 11.2 (Underwater & Span Audit)';
    } else if (name.includes('curve')) {
      interventionType = 'Rail Grinding (RGM) & High-Speed Curve Re-gauging';
      windowHours = 4.0;
      statutoryCode = 'IRPWM Chapter 3 (Curve Transition Maintenance)';
    } else if (name.includes('point') || name.includes('crossing') || name.includes('turnout')) {
      interventionType = 'Switch Expansion Joint (SEJ) Packing & Tongue Rail Welding';
      windowHours = 3.0;
      statutoryCode = 'Signal Engineering Manual (SEM) Part II Rule 14.7';
    } else if (name.includes('catenary') || name.includes('ohe')) {
      interventionType = '25kV Contact Wire Height & Stagger Realignment via Tower Wagon';
      windowHours = 3.5;
      statutoryCode = 'Traction Operation Code (ACTM Vol II) Rule 20.3';
    }

    const recommendedMonthDate = monthLabels[plannedMaintenanceMonth]?.fullDate || 'February 2027';

    const urgencyLevel: 'IMMEDIATE' | 'HIGH' | 'PLANNED' | 'MONITORING' =
      initialHealth <= 68
        ? 'IMMEDIATE'
        : monthsTo70 <= 3
        ? 'HIGH'
        : monthsTo70 <= 6
        ? 'PLANNED'
        : 'MONITORING';

    return {
      asset,
      corridorName,
      initialHealth,
      monthlyDecayRate: effectiveDecayRate,
      forecastPoints,
      monthsUntilMandatoryThreshold: monthsTo70,
      monthsUntilCriticalFloor: monthsTo55,
      recommendedMaintenanceMonth: recommendedMonthDate,
      recommendedMaintenanceWindowHours: windowHours,
      recommendedInterventionType: interventionType,
      statutoryCode,
      urgencyLevel,
    };
  }, [assets, selectedAssetId, criticalAssets, corridors, trafficTonnageMultiplier, monthLabels]);

  // Comparative ranking of top critical assets
  const criticalAssetsTable = useMemo(() => {
    return criticalAssets.map((asset) => {
      const initialHealth = asset.healthIndex || 78;
      const rate = getAssetBaseDecayRate(asset) * trafficTonnageMultiplier;
      let monthsTo70 = 12;
      for (let m = 1; m <= 12; m++) {
        if (initialHealth - m * rate * (1 + m * 0.035) <= 70) {
          monthsTo70 = m;
          break;
        }
      }
      return {
        asset,
        health: initialHealth,
        decayRate: Number(rate.toFixed(2)),
        monthsTo70,
        forecastCriticalMonth: monthLabels[monthsTo70]?.label || 'M+12',
        status:
          initialHealth <= 68
            ? 'CRITICAL_URGENT'
            : monthsTo70 <= 3
            ? 'HIGH_RISK'
            : monthsTo70 <= 6
            ? 'PREVENTIVE_WINDOW'
            : 'NORMAL',
      };
    }).sort((a, b) => a.monthsTo70 - b.monthsTo70);
  }, [criticalAssets, trafficTonnageMultiplier, monthLabels]);

  // Custom Chart Tooltip
  const CustomForecastTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyHealthForecastPoint;
      return (
        <div className="bg-[#070e20]/95 backdrop-blur-md p-3.5 rounded-xl border border-sky-500/50 shadow-2xl text-xs font-mono text-slate-200 min-w-[240px]">
          <div className="pb-1.5 mb-2 border-b border-slate-800">
            <div className="font-bold text-white text-sm flex items-center justify-between">
              <span>{data.monthLabel}</span>
              {data.isMaintenanceMonth && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9px]">
                  INTERVENTION MONTH
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">{data.calendarDate}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                <span>Unmitigated Decay:</span>
              </span>
              <span className="font-bold text-white text-sm">{data.unmitigatedHealth}%</span>
            </div>

            {showMitigatedCurve && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>With Planned Renewal:</span>
                </span>
                <span className="font-bold text-emerald-300 text-sm">{data.mitigatedHealth}%</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Optimal Safety Floor:</span>
                <span className="text-sky-300">&ge; 80%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mandatory Renewal Limit:</span>
                <span className="text-amber-400">70%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Critical Speed Restriction:</span>
                <span className="text-rose-400">&le; 55%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="predictive-asset-health-module"
      className={`bg-[#070e20] border border-sky-900/60 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* MODULE HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 rounded-xl bg-sky-950/90 border border-sky-500/50 text-sky-400 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Predictive Asset Health Decay Forecast
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
                  12-MONTH HORIZON
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  <span>MAINTENANCE INTERVAL FORECASTING</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simulates progressive structural and mechanical wear curves for bridges, rail sections, and turnouts to determine precise statutory renewal windows before critical thresholds.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: CATEGORIES, TONNAGE SCENARIO, MITIGATED TOGGLE */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {/* Category Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px]">
            <button
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setSelectedCategoryTab('ALL');
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedCategoryTab === 'ALL'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Assets
            </button>
            <button
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setSelectedCategoryTab('BRIDGES');
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedCategoryTab === 'BRIDGES'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bridges
            </button>
            <button
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setSelectedCategoryTab('TRACKS');
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedCategoryTab === 'TRACKS'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rail Tracks
            </button>
            <button
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setSelectedCategoryTab('TURNOUTS');
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedCategoryTab === 'TURNOUTS'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Turnouts
            </button>
          </div>

          {/* Planned Maintenance Intervention Toggle */}
          <button
            onClick={() => {
              railwayAudio.playBeep(780, 0.02);
              setShowMitigatedCurve(!showMitigatedCurve);
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              showMitigatedCurve
                ? 'bg-emerald-950 text-emerald-200 border-emerald-500 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title="Toggle simulation of planned maintenance intervention recovery"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate Renewal Lift</span>
          </button>

          {/* Tonnage Multiplier */}
          <div className="flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-slate-400">Load Factor:</span>
            <select
              value={trafficTonnageMultiplier}
              onChange={(e) => {
                railwayAudio.playBeep(720, 0.02);
                setTrafficTonnageMultiplier(parseFloat(e.target.value));
              }}
              className="bg-slate-950 text-slate-200 rounded px-1.5 py-0.5 outline-none cursor-pointer border border-slate-700"
            >
              <option value="0.85">0.85x Regulated Speed</option>
              <option value="1.0">1.0x Normal GMT</option>
              <option value="1.3">1.3x Heavy Freight Strain</option>
            </select>
          </div>
        </div>
      </div>

      {/* ASSET SELECTOR BAR */}
      <div className="mb-4">
        <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
          <span>Select Critical Infrastructure Asset to Inspect Decay Trajectory:</span>
          <span className="text-sky-400">{criticalAssets.length} Critical Assets Filtered</span>
        </div>

        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
          {criticalAssets.slice(0, 12).map((a) => {
            const isSelected = selectedAssetId === a.id;
            const health = a.healthIndex || 75;
            return (
              <button
                key={a.id}
                onClick={() => {
                  railwayAudio.playBeep(760, 0.03);
                  setSelectedAssetId(a.id);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950 text-sky-100 border-sky-400 ring-1 ring-sky-400/60 shadow-md'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    health <= 68 ? 'bg-rose-400 animate-ping' : health <= 75 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="font-bold text-white">{a.id}</span>
                <span className="truncate max-w-[170px]">{a.name}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    health <= 70
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {health}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* ==================================================================== */}
          {/* 1. 12-MONTH DECAY CURVE GRAPH (2 COLS) */}
          {/* ==================================================================== */}
          <div className="lg:col-span-2 bg-[#040814] rounded-xl p-3 md:p-4 border border-slate-800/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {selectedAnalysis.asset.id}: {selectedAnalysis.asset.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-sky-300 border border-slate-700">
                    {selectedAnalysis.corridorName}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                    <span>Unmitigated Decay</span>
                  </span>
                  {showMitigatedCurve && (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                      <span>With Planned Renewal</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={selectedAnalysis.forecastPoints}
                    margin={{ top: 20, right: 25, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                    <XAxis
                      dataKey="monthLabel"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#334155' }}
                    />

                    <YAxis
                      domain={[20, 100]}
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#334155' }}
                      tickFormatter={(val) => `${val}%`}
                    />

                    <Tooltip content={<CustomForecastTooltip />} />

                    {/* Optimal Health Floor Reference Line (80%) */}
                    <ReferenceLine
                      y={80}
                      stroke="#38bdf8"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{
                        value: 'Optimal &ge;80%',
                        fill: '#38bdf8',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        position: 'insideTopLeft',
                      }}
                    />

                    {/* Mandatory Maintenance Interval Reference Line (70%) */}
                    <ReferenceLine
                      y={70}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      strokeOpacity={0.8}
                      label={{
                        value: 'Mandatory Maintenance 70%',
                        fill: '#f59e0b',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        position: 'insideBottomLeft',
                      }}
                    />

                    {/* Critical Speed Restriction Floor (55%) */}
                    <ReferenceLine
                      y={55}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{
                        value: 'Critical TSR Floor 55%',
                        fill: '#ef4444',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        position: 'insideBottomRight',
                      }}
                    />

                    {/* Unmitigated Decay Curve */}
                    <Line
                      type="monotone"
                      dataKey="unmitigatedHealth"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f43f5e', stroke: '#040814', strokeWidth: 1 }}
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 2 }}
                    />

                    {/* Mitigated Curve (with planned intervention) */}
                    {showMitigatedCurve && (
                      <Line
                        type="monotone"
                        dataKey="mitigatedHealth"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        strokeDasharray="2 2"
                        dot={{ r: 3.5, fill: '#10b981', stroke: '#040814', strokeWidth: 1 }}
                        activeDot={{ r: 6, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Legend Note */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800 px-1 mt-1">
              <span>Base Wear: ~{selectedAnalysis.monthlyDecayRate}% per month</span>
              <span className="text-amber-400">
                Breaches 70% in M+{selectedAnalysis.monthsUntilMandatoryThreshold} · Breaches 55% in M+{selectedAnalysis.monthsUntilCriticalFloor}
              </span>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 2. FORECASTED MAINTENANCE INTERVAL TELEMETRY CARD (1 COL) */}
          {/* ==================================================================== */}
          <div className="bg-[#0b162f] rounded-xl p-4 border border-sky-800/60 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Forecasted Interval</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedAnalysis.urgencyLevel === 'IMMEDIATE'
                      ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                      : selectedAnalysis.urgencyLevel === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {selectedAnalysis.urgencyLevel} ACTION
                </span>
              </div>

              {/* Current Health vs Critical Window */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Current Health Index:</span>
                  <span className="text-xl font-black text-white">{selectedAnalysis.initialHealth}%</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Asset Condition: {selectedAnalysis.asset.condition}</span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Maintenance Ceiling:</span>
                  <span className="text-xl font-black text-amber-400">M+{selectedAnalysis.monthsUntilMandatoryThreshold}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">~{selectedAnalysis.monthsUntilMandatoryThreshold * 30} Days Left</span>
                </div>
              </div>

              {/* Maintenance Directive Details */}
              <div className="space-y-2 mb-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Recommended Intervention:</span>
                  <span className="text-slate-200 font-bold">{selectedAnalysis.recommendedInterventionType}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Optimal Window:</span>
                  <span className="font-bold text-emerald-400">{selectedAnalysis.recommendedMaintenanceMonth}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Required Block Window:</span>
                  <span className="font-bold text-sky-400">{selectedAnalysis.recommendedMaintenanceWindowHours} Hours (Mega Block)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Statutory Standard:</span>
                  <span className="text-slate-300 truncate max-w-[140px]">{selectedAnalysis.statutoryCode}</span>
                </div>
              </div>
            </div>

            {/* Action Button: Reserve Slot */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(880, 0.05);
                  if (onNavigate) {
                    onNavigate('block_timeline', {
                      highlightAssetId: selectedAnalysis.asset.id,
                      targetCorridorId: selectedAnalysis.asset.corridorId,
                    });
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Schedule Preventive Block in Timeline →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MULTI-ASSET 12-MONTH DECAY AUDIT ROSTER TABLE */}
      {/* ==================================================================== */}
      <div className="bg-[#0b152d] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="px-3.5 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">CRITICAL INFRASTRUCTURE DEGRADATION AUDIT (12-MONTH HORIZON)</span>
            <span className="text-[10px] text-slate-400">· Sorted by urgency to mandatory renewal</span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Immediate (&le; 68%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Urgent (&le; 3 Months)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Planned (4–6 Months)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-56">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-[10px] uppercase text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Asset ID &amp; Structure</th>
                <th className="py-2 px-3">Corridor</th>
                <th className="py-2 px-3">Current Health</th>
                <th className="py-2 px-3">Monthly Wear</th>
                <th className="py-2 px-3">Mandatory Limit Breached</th>
                <th className="py-2 px-3">Forecasted Window</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#070e1e]">
              {criticalAssetsTable.map(({ asset, health, decayRate, monthsTo70, forecastCriticalMonth, status }) => {
                const isSelected = selectedAssetId === asset.id;
                return (
                  <tr
                    key={asset.id}
                    onClick={() => {
                      railwayAudio.playBeep(720, 0.02);
                      setSelectedAssetId(asset.id);
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-sky-950/60' : 'hover:bg-slate-850/60'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{asset.id}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{asset.section}</div>
                    </td>

                    <td className="py-2.5 px-3 text-sky-300 font-bold">
                      {asset.corridorId}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            health <= 68 ? 'text-rose-400' : health <= 75 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {health}%
                        </span>
                        <div className="w-14 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              health <= 68 ? 'bg-rose-500' : health <= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      -{decayRate}% / mo
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          status === 'CRITICAL_URGENT'
                            ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                            : status === 'HIGH_RISK'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {status === 'CRITICAL_URGENT' ? 'Already &le; 70%' : `Month +${monthsTo70}`}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-200">
                      {forecastCriticalMonth}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetId(asset.id);
                          railwayAudio.playBeep(780, 0.02);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-sky-700 text-sky-300 hover:text-white border border-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Simulate Curve
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
  );
};
