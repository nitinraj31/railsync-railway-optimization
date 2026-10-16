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
  Banknote,
  Coins,
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
  alertThreshold: number;
  monthsUntilThreshold: number;
  daysUntilThreshold: number;
  thresholdBreachedDate: string;
  thresholdBreachedMonthLabel: string;
  monthsUntilMandatoryThreshold: number; // for backward compat
  monthsUntilCriticalFloor: number; // to 55%
  recommendedMaintenanceMonth: string;
  recommendedMaintenanceWindowHours: number;
  recommendedInterventionType: string;
  statutoryCode: string;
  urgencyLevel: 'IMMEDIATE' | 'HIGH' | 'PLANNED' | 'MONITORING';
  // Financial & Repair Cost Telemetry
  baseRepairCost: number;
  estimatedRepairCost: number;
  wearSurchargeAmount: number;
  wearPenaltyPercent: number;
  deferredCostPenalty: number;
  projectedSavingsVsFailure: number;
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
  const [alertThreshold, setAlertThreshold] = useState<number>(70); // Real-time Alert Threshold Slider (50% - 85%, default 70%)
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
  // Calculate baseline repair expenditure based on asset class under Indian Railways cost schedules
  const getBaseRepairCost = (asset: Asset): number => {
    const name = asset.name.toLowerCase();
    const type = asset.type.toLowerCase();
    if (name.includes('bridge') || type.includes('girder')) return 380000; // Girder bearings, expansion joints, camber jacks
    if (name.includes('curve') || name.includes('track') || type.includes('rail')) return 220000; // Continuous rail welding, rail grinding, tamping
    if (name.includes('point') || name.includes('turnout') || name.includes('crossing')) return 175000; // Point machine, tongue rail renewal
    if (name.includes('catenary') || name.includes('ohe')) return 150000; // OHE tower wagon, contact wire stagger
    return 200000;
  };

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

    let monthsToThreshold = 12;
    let thresholdBreachedDate = monthLabels[12]?.fullDate || 'October 2027';
    let thresholdBreachedMonthLabel = monthLabels[12]?.label || 'M+12';
    let monthsTo70 = 12;
    let monthsTo55 = 12;

    // Determine when unmitigated health falls below user alertThreshold, 70%, and 55%
    for (let m = 1; m <= 12; m++) {
      // Non-linear wear acceleration: slight exponential curve as slack accumulates
      const degradation = m * effectiveDecayRate * (1 + m * 0.035);
      const h = Math.max(20, Number((initialHealth - degradation).toFixed(1)));
      if (h <= alertThreshold && monthsToThreshold === 12) {
        monthsToThreshold = m;
        thresholdBreachedDate = monthLabels[m]?.fullDate || `Month ${m}`;
        thresholdBreachedMonthLabel = monthLabels[m]?.label || `M+${m}`;
      }
      if (h <= 70 && monthsTo70 === 12) monthsTo70 = m;
      if (h <= 55 && monthsTo55 === 12) monthsTo55 = m;
    }

    // If asset initial health is already below user alert threshold at baseline (M+0)
    if (initialHealth <= alertThreshold) {
      monthsToThreshold = 0;
      thresholdBreachedDate = `${monthLabels[0]?.fullDate} (Immediate)`;
      thresholdBreachedMonthLabel = 'Immediate (M+0)';
    }

    const daysUntilThreshold = monthsToThreshold * 30;

    // Dynamically set planned maintenance month based on alert threshold
    const plannedMaintenanceMonth = initialHealth <= alertThreshold ? 1 : Math.max(1, Math.min(10, monthsToThreshold));

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
        mandatoryMaintenanceThreshold: alertThreshold, // dynamically updated via alertThreshold slider
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

    // Urgency level determined by alertThreshold proximity
    const urgencyLevel: 'IMMEDIATE' | 'HIGH' | 'PLANNED' | 'MONITORING' =
      initialHealth <= alertThreshold
        ? 'IMMEDIATE'
        : monthsToThreshold <= 2
        ? 'HIGH'
        : monthsToThreshold <= 5
        ? 'PLANNED'
        : 'MONITORING';

    // -------------------------------------------------------------------------
    // DYNAMIC REPAIR COST CALCULATION ENGINE
    // -------------------------------------------------------------------------
    // Base cost by asset category
    const baseCost = getBaseRepairCost(asset);

    // Wear severity escalation:
    // When intervening conservatively (e.g. >= 78% health), minimal work is needed (clean grease, tighten fasteners).
    // As intervention threshold drops, fatigue micro-cracks propagate exponentially, requiring
    // structural component renewal, deeper ballast excavation, and extended block curfew penalties.
    const wearPenaltyPercent = Math.max(
      0,
      Number(((78 - alertThreshold) * (alertThreshold < 65 ? 4.8 : 3.8)).toFixed(1))
    );
    const wearMultiplier = 1 + wearPenaltyPercent / 100;
    const estimatedCost = Math.round(baseCost * wearMultiplier * trafficTonnageMultiplier);
    const wearSurcharge = estimatedCost - Math.round(baseCost * trafficTonnageMultiplier);
    const deferredCostPenalty = Math.round(estimatedCost * 1.35); // 35% extra surcharge if deferred past threshold
    const failureEmergencyCost = Math.round(baseCost * 2.45 * trafficTonnageMultiplier); // Emergency derailment/failure replacement
    const projectedSavingsVsFailure = Math.max(0, failureEmergencyCost - estimatedCost);

    return {
      asset,
      corridorName,
      initialHealth,
      monthlyDecayRate: effectiveDecayRate,
      forecastPoints,
      alertThreshold,
      monthsUntilThreshold: monthsToThreshold,
      daysUntilThreshold,
      thresholdBreachedDate,
      thresholdBreachedMonthLabel,
      monthsUntilMandatoryThreshold: monthsToThreshold,
      monthsUntilCriticalFloor: monthsTo55,
      recommendedMaintenanceMonth: recommendedMonthDate,
      recommendedMaintenanceWindowHours: windowHours,
      recommendedInterventionType: interventionType,
      statutoryCode,
      urgencyLevel,
      // Cost Engine Telemetry
      baseRepairCost: baseCost,
      estimatedRepairCost: estimatedCost,
      wearSurchargeAmount: wearSurcharge,
      wearPenaltyPercent,
      deferredCostPenalty,
      projectedSavingsVsFailure,
    };
  }, [assets, selectedAssetId, criticalAssets, corridors, trafficTonnageMultiplier, monthLabels, alertThreshold]);

  // Comparative ranking of top critical assets using real-time alertThreshold
  const criticalAssetsTable = useMemo(() => {
    return criticalAssets.map((asset) => {
      const initialHealth = asset.healthIndex || 78;
      const rate = getAssetBaseDecayRate(asset) * trafficTonnageMultiplier;
      let monthsToThreshold = 12;
      for (let m = 1; m <= 12; m++) {
        if (initialHealth - m * rate * (1 + m * 0.035) <= alertThreshold) {
          monthsToThreshold = m;
          break;
        }
      }
      if (initialHealth <= alertThreshold) {
        monthsToThreshold = 0;
      }
      return {
        asset,
        health: initialHealth,
        decayRate: Number(rate.toFixed(2)),
        monthsTo70: monthsToThreshold,
        forecastCriticalMonth: monthLabels[monthsToThreshold]?.label || 'M+12',
        status:
          initialHealth <= alertThreshold
            ? 'CRITICAL_URGENT'
            : monthsToThreshold <= 3
            ? 'HIGH_RISK'
            : monthsToThreshold <= 6
            ? 'PREVENTIVE_WINDOW'
            : 'NORMAL',
      };
    }).sort((a, b) => a.monthsTo70 - b.monthsTo70);
  }, [criticalAssets, trafficTonnageMultiplier, monthLabels, alertThreshold]);

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
                <span>Intervention Trigger Floor:</span>
                <span className="text-amber-400 font-bold">{alertThreshold}%</span>
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

      {/* ==================================================================== */}
      {/* REAL-TIME ALERT THRESHOLD CONTROLLER SLIDER */}
      {/* ==================================================================== */}
      <div className="bg-[#09132b] border border-amber-600/60 rounded-xl p-4 mb-4 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 right-1/3 w-64 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/90 text-amber-400 border border-amber-600/80 shrink-0 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                  Maintenance Alert Threshold (Intervention Point):
                </span>
                <span
                  id="badge-alert-threshold-value"
                  data-testid="badge-alert-threshold-value"
                  className="px-2.5 py-0.5 rounded-lg text-xs font-black font-mono bg-amber-950 text-amber-300 border border-amber-500 shadow-md"
                >
                  {alertThreshold}% Health Index
                </span>
                <span className="text-[11px] font-mono text-slate-300 font-semibold">
                  {alertThreshold >= 75
                    ? '• Strict Preventive Regime (Early Action, Lowest Cost)'
                    : alertThreshold >= 68
                    ? '• Standard Indian Railways RDSO Para 504 Floor'
                    : '• High Wear Tolerance (Elevated Repair Surcharge)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                Drag slider to dynamically adjust the maintenance trigger point. Recalculates the forecasted repair date, track closure window, and expenditure in real time.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0 self-start lg:self-center">
            <span className="text-slate-400 mr-1 hidden sm:inline">Presets:</span>
            <button
              type="button"
              id="btn-preset-strict-75"
              onClick={() => {
                railwayAudio.playBeep(780, 0.02);
                setAlertThreshold(75);
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
                alertThreshold === 75
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
              }`}
            >
              Strict (75%)
            </button>
            <button
              type="button"
              id="btn-preset-rdso-70"
              onClick={() => {
                railwayAudio.playBeep(720, 0.02);
                setAlertThreshold(70);
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
                alertThreshold === 70
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
              }`}
            >
              RDSO Standard (70%)
            </button>
            <button
              type="button"
              id="btn-preset-wear-62"
              onClick={() => {
                railwayAudio.playBeep(660, 0.02);
                setAlertThreshold(62);
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
                alertThreshold === 62
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
              }`}
            >
              Extended Wear (62%)
            </button>
          </div>
        </div>

        {/* Range Slider Track */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400 shrink-0 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critical Floor (50%)</span>
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              id="input-alert-threshold-slider"
              data-testid="input-alert-threshold-slider"
              min={50}
              max={85}
              step={1}
              value={alertThreshold}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                railwayAudio.playBeep(560 + (val - 50) * 12, 0.012);
                setAlertThreshold(val);
              }}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 shrink-0 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Conservative (85%)</span>
          </div>
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

                    {/* Dynamic Alert Threshold Reference Line (User Adjusted) */}
                    <ReferenceLine
                      y={alertThreshold}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: `Alert Threshold ${alertThreshold}%`,
                        fill: '#f59e0b',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
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
              <span>Base Wear: ~{selectedAnalysis.monthlyDecayRate}% per month · Alert Floor: {alertThreshold}%</span>
              <span className="text-amber-400 font-bold">
                {selectedAnalysis.monthsUntilThreshold === 0
                  ? `Asset currently below ${alertThreshold}% alert floor! Immediate repair required.`
                  : `Breaches ${alertThreshold}% floor in ${selectedAnalysis.thresholdBreachedMonthLabel} (${selectedAnalysis.thresholdBreachedDate})`}
              </span>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 2. FORECASTED MAINTENANCE INTERVAL & EXPENDITURE SIDEBAR CARD (1 COL) */}
          {/* ==================================================================== */}
          <div className="bg-[#0b162f] rounded-xl p-4 border border-sky-800/60 font-mono text-xs flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Forecasted Repair &amp; Cost</span>
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

              {/* Current Health vs Dynamically Forecasted Repair Date */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Tile 1: Current Health */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Current Health:</span>
                    <span className="text-xl font-black text-white">{selectedAnalysis.initialHealth}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 truncate">
                    Condition: {selectedAnalysis.asset.condition}
                  </span>
                </div>

                {/* Tile 2: Dynamically Forecasted Repair Date */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase text-amber-300">
                      Forecasted Repair Date:
                    </span>
                    <span
                      id="sidebar-forecasted-date"
                      data-testid="sidebar-forecasted-date"
                      className="text-base font-black text-amber-400 leading-tight block mt-0.5"
                    >
                      {selectedAnalysis.thresholdBreachedMonthLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-bold">
                    <span>{selectedAnalysis.thresholdBreachedDate.split(' ')[0]}</span>
                    <span className="text-sky-300">
                      {selectedAnalysis.monthsUntilThreshold === 0
                        ? 'OVERDUE'
                        : `~${selectedAnalysis.daysUntilThreshold}d Left`}
                    </span>
                  </div>
                </div>
              </div>

              {/* DYNAMIC REPAIR COST TELEMETRY CARD */}
              <div className="bg-gradient-to-br from-[#0c1a38] to-[#071126] p-3 rounded-xl border border-sky-700/60 mb-3 shadow-inner">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Forecasted Repair Cost</span>
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                      selectedAnalysis.alertThreshold >= 75
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : selectedAnalysis.alertThreshold >= 68
                        ? 'bg-sky-950 text-sky-300 border-sky-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    }`}
                  >
                    {selectedAnalysis.alertThreshold >= 75
                      ? 'PREVENTIVE'
                      : selectedAnalysis.alertThreshold >= 68
                      ? 'STANDARD'
                      : 'DEEP FATIGUE'}
                  </span>
                </div>

                {/* Big Currency Display */}
                <div className="flex items-baseline justify-between mt-2 mb-1.5">
                  <span
                    id="sidebar-forecasted-cost"
                    data-testid="sidebar-forecasted-cost"
                    className="text-2xl font-black text-white tracking-tight"
                  >
                    ₹{(selectedAnalysis.estimatedRepairCost / 100000).toFixed(2)} Lakhs
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (₹{selectedAnalysis.estimatedRepairCost.toLocaleString('en-IN')})
                  </span>
                </div>

                {/* Cost Breakdown Line Items */}
                <div className="space-y-1 text-[10px] pt-1.5 border-t border-slate-800/80">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Machinery &amp; Gang:</span>
                    <span className="text-slate-200 font-semibold">
                      ₹{(selectedAnalysis.baseRepairCost / 100000).toFixed(2)}L
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Wear Surcharge ({selectedAnalysis.wearPenaltyPercent}% at {selectedAnalysis.alertThreshold}% floor):
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedAnalysis.wearSurchargeAmount > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedAnalysis.wearSurchargeAmount > 0
                        ? `+₹${(selectedAnalysis.wearSurchargeAmount / 100000).toFixed(2)}L`
                        : '₹0 (Par Window)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                    <span>Projected Savings vs Emergency Failure:</span>
                    <span>₹{(selectedAnalysis.projectedSavingsVsFailure / 100000).toFixed(2)}L Saved</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Directive Details */}
              <div className="space-y-2 mb-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Recommended Intervention:</span>
                  <span className="text-slate-200 font-bold">{selectedAnalysis.recommendedInterventionType}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Intervention Floor:</span>
                  <span className="font-bold text-amber-400">{alertThreshold}% Health Index</span>
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
                id="btn-schedule-preventive-block-sidebar"
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
                <th className="py-2 px-3">Alert Limit Breached ({alertThreshold}%)</th>
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
                        {status === 'CRITICAL_URGENT' ? `Already \u2264 ${alertThreshold}%` : `Month +${monthsTo70}`}
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
