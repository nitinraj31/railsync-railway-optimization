import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Wrench,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Filter,
  Search,
  Zap,
  ShieldCheck,
  RefreshCw,
  HardHat,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Radio,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Truck,
  RotateCcw,
  Check,
  X,
  Clock,
  Calendar,
  MapPin,
  FileText,
  HeartPulse,
  Moon,
  TrendingDown,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Corridor,
  MachineryResource,
  ManpowerGang,
  CorridorResourceMetrics,
  MachineryType,
  DeficitAlertThresholdSettings,
  DEFAULT_DEFICIT_ALERT_SETTINGS,
} from '../../types';
import {
  getMachineryResources,
  getManpowerGangs,
  getCorridorResourceMetrics,
  reallocateMachinery,
  reallocateGang,
  autoBalanceCorridors,
  resetResourceFleet,
} from '../../services/api';
import { crewFatigueService } from '../../services/crewFatigueService';
import { resourceForecastService } from '../../services/resourceForecastService';
import { CrewFatiguePredictorModule } from './CrewFatiguePredictorModule';
import { ResourceGapAlertsSection } from './ResourceGapAlertsSection';
import { MaintenanceResourceForecastModule } from './MaintenanceResourceForecastModule';
import { DeficitAlertThresholdModal } from '../modals/DeficitAlertThresholdModal';
import { ForecastedManpowerD3Chart } from './ForecastedManpowerD3Chart';

interface ResourceAllocationScreenProps {
  corridors: Corridor[];
  onNavigateToTimeline?: () => void;
  onNavigateToConflicts?: () => void;
  initialResourceType?: string;
  initialCorridorId?: string;
  initialTab?: 'MACHINERY' | 'MANPOWER' | 'FATIGUE' | 'FORECAST';
  initialShift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
}

type ChartViewMode = 'MANPOWER_TRADES' | 'MACHINERY_CLASSES' | 'UTILIZATION_LOAD';
type ShiftType = 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
type ActiveTab = 'MACHINERY' | 'MANPOWER' | 'FATIGUE' | 'FORECAST';

export const ResourceAllocationScreen: React.FC<ResourceAllocationScreenProps> = ({
  corridors,
  onNavigateToTimeline,
  onNavigateToConflicts,
  initialResourceType,
  initialCorridorId,
  initialTab,
  initialShift,
}) => {
  // Determine initial state based on props from navigation
  const getInitialTab = (): ActiveTab => {
    if (initialTab) return initialTab;
    if (initialResourceType) {
      const lower = initialResourceType.toLowerCase();
      if (lower.includes('forecast') || lower.includes('gap') || lower.includes('predict') || lower.includes('horizon')) {
        return 'FORECAST';
      }
      if (lower.includes('fatigue') || lower.includes('rest') || lower.includes('circadian') || lower.includes('incident') || lower.includes('rotation')) {
        return 'FATIGUE';
      }
      if (lower.includes('gang') || lower.includes('pwi') || lower.includes('trd gang') || lower.includes('crew') || lower.includes('manpower') || lower.includes('signal') || lower.includes('linesm') || lower.includes('lookout')) {
        return 'MANPOWER';
      }
      return 'MACHINERY';
    }
    return 'MACHINERY';
  };

  const getInitialChartView = (): ChartViewMode => {
    if (initialResourceType) {
      const lower = initialResourceType.toLowerCase();
      if (lower.includes('gang') || lower.includes('crew') || lower.includes('manpower') || lower.includes('signal') || lower.includes('trade')) {
        return 'MANPOWER_TRADES';
      }
      if (lower.includes('util') || lower.includes('load') || lower.includes('capacity')) {
        return 'UTILIZATION_LOAD';
      }
      return 'MACHINERY_CLASSES';
    }
    return 'MANPOWER_TRADES';
  };

  // Operational state
  const [machinery, setMachinery] = useState<MachineryResource[]>([]);
  const [gangs, setGangs] = useState<ManpowerGang[]>([]);
  const [metrics, setMetrics] = useState<CorridorResourceMetrics[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(initialShift || 'DAY_SHIFT');
  const [chartView, setChartView] = useState<ChartViewMode>(getInitialChartView());
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab());
  const [filterCorridor, setFilterCorridor] = useState<string>(initialCorridorId || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialResourceType || '');
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(initialCorridorId || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fatigueSummary, setFatigueSummary] = useState(() => crewFatigueService.computeAnalysis());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(
    initialResourceType
      ? { message: `Filtered view for resource type: "${initialResourceType}"`, type: 'info' }
      : null
  );

  // Sync state if initialResourceType or initialCorridorId changes via props
  useEffect(() => {
    if (initialResourceType) {
      setSearchQuery(initialResourceType);
      setActiveTab(getInitialTab());
      setChartView(getInitialChartView());
      setNotification({ message: `Filtered view for resource type: "${initialResourceType}"`, type: 'info' });
    }
    if (initialCorridorId) {
      setFilterCorridor(initialCorridorId);
      setSelectedCorridorId(initialCorridorId);
    }
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialShift) {
      setSelectedShift(initialShift);
    }
  }, [initialResourceType, initialCorridorId, initialTab, initialShift]);

  // Custom Deficit Alert Thresholds Settings
  const [thresholdSettings, setThresholdSettings] = useState<DeficitAlertThresholdSettings>(() => {
    try {
      const saved = localStorage.getItem('IR_DEFICIT_THRESHOLD_SETTINGS');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to parse saved deficit threshold settings:', err);
    }
    return DEFAULT_DEFICIT_ALERT_SETTINGS;
  });
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState<boolean>(false);

  const handleSaveThresholdSettings = (newSettings: DeficitAlertThresholdSettings) => {
    setThresholdSettings(newSettings);
    try {
      localStorage.setItem('IR_DEFICIT_THRESHOLD_SETTINGS', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to persist threshold settings to localStorage:', err);
    }
    setNotification({
      message: `Deficit thresholds saved: Manpower (+${newSettings.manpowerWarningThresholdPct}%/+${newSettings.manpowerCriticalThresholdPct}%), Machinery (+${newSettings.machineryWarningThresholdPct}%/+${newSettings.machineryCriticalThresholdPct}%) [${newSettings.presetName.replace('_', ' ')}]`,
      type: 'success',
    });
  };

  // Real-time dynamic sync as planner modifies Manpower Deficit or Machinery Deficit input fields
  const handleLiveThresholdUpdate = (newSettings: DeficitAlertThresholdSettings) => {
    setThresholdSettings(newSettings);
  };

  // Reallocation Modal state
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState<boolean>(false);
  const [reallocateTargetType, setReallocateTargetType] = useState<'MACHINERY' | 'MANPOWER'>('MACHINERY');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [targetCorridorId, setTargetCorridorId] = useState<string>('C001');
  const [reallocationReason, setReallocationReason] = useState<string>('Capacity rebalancing for upcoming block');

  // Load data on mount & shift change
  const reloadData = async () => {
    setIsLoading(true);
    try {
      const [mList, gList, cMetrics] = await Promise.all([
        getMachineryResources(),
        getManpowerGangs(),
        getCorridorResourceMetrics(selectedShift),
      ]);
      setMachinery(mList);
      setGangs(gList);
      setMetrics(cMetrics);
      setFatigueSummary(crewFatigueService.computeAnalysis());
    } catch (err) {
      console.error('Failed to load resource data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [selectedShift]);

  // Show transient notification toast
  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1-Click Auto-Balance Corridors
  const handleAutoBalance = async () => {
    setIsLoading(true);
    try {
      const res = await autoBalanceCorridors();
      await reloadData();
      showToast(res.message, 'success');
    } catch (err) {
      showToast('Auto-balancing failed', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to Baseline
  const handleResetBaseline = async () => {
    setIsLoading(true);
    try {
      const res = await resetResourceFleet();
      await reloadData();
      showToast(res.message, 'info');
    } catch (err) {
      showToast('Failed to reset resource baseline', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  // Mobilize reserve fleet directly from Resource Gap Alert
  const handleMobilizeReserveFromGapAlert = async (
    targetCid: string,
    resourceType: 'MANPOWER' | 'MACHINERY',
    count: number
  ) => {
    setIsLoading(true);
    try {
      if (resourceType === 'MACHINERY') {
        const standbyMachine = machinery.find(
          (m) => m.status === 'STANDBY_RESERVE' || m.corridorId === 'CENTRAL_DEPOT'
        );
        if (standbyMachine) {
          const res = await reallocateMachinery(
            standbyMachine.id,
            targetCid,
            `Mobilized via Resource Gap Alert to resolve machine slot deficit in ${targetCid}`
          );
          if (res.success) {
            showToast(`Mobilized ${standbyMachine.id} (${standbyMachine.name}) to ${targetCid}`, 'success');
          }
        } else {
          showToast(`Machinery reservation signal broadcast to Central TMD for ${targetCid}`, 'info');
        }
      } else {
        const standbyGang = gangs.find(
          (g) => g.corridorId === 'CENTRAL_DEPOT' || g.status === 'STANDBY'
        );
        if (standbyGang) {
          const res = await reallocateGang(
            standbyGang.id,
            targetCid,
            `Mobilized via Resource Gap Alert to resolve gang headcount shortage in ${targetCid}`
          );
          if (res.success) {
            showToast(`Redeployed Gang ${standbyGang.id} (${standbyGang.name}) to ${targetCid}`, 'success');
          }
        } else {
          showToast(`Auxiliary Gang call-out order dispatched for ${targetCid} (+${count} staff)`, 'info');
        }
      }
      await reloadData();
    } catch (err) {
      console.error('Failed to mobilize reserve for gap alert', err);
      showToast('Reserve mobilization completed with local depot notification', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Reserve Gang Mobilization from D3 Forecast Line Chart
  const handleMobilizeReserveGangFromChart = async (count: number) => {
    const targetCid = selectedCorridorId || 'C001';
    await handleMobilizeReserveFromGapAlert(targetCid, 'MANPOWER', count);
  };

  const handleSelectShiftDayFromChart = (dayNumber: number, dateStr: string) => {
    setNotification({
      message: `Inspecting Day ${dayNumber} (${dateStr}) in 30-Day Resource Planning Matrix`,
      type: 'info',
    });
  };

  // Handler for Exporting 30-Day Resource Forecast Data as CSV for Offline Planning & Reporting
  const handleExport30DayForecastCsv = () => {
    try {
      const corridorScope = selectedCorridorId || 'ALL';
      const forecast = resourceForecastService.computeForecast('BASELINE', 30, corridorScope);
      const csvContent = resourceForecastService.exportForecastCsv(forecast);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStamp = new Date().toISOString().split('T')[0];
      const filename = `IR_30Day_Resource_Forecast_${corridorScope}_${dateStamp}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification({
        message: `Exported 30-Day Resource Forecast (${forecast.dailyForecast.length} days, Scope: ${corridorScope}) as ${filename} for offline reporting.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to export 30-day forecast CSV:', err);
      showToast('Failed to export 30-day forecast CSV. Please try again.', 'warn');
    }
  };

  // Confirm Reallocation modal action
  const handleConfirmReallocation = async () => {
    if (!selectedResourceId) {
      showToast('Please choose a resource to reallocate', 'warn');
      return;
    }

    setIsLoading(true);
    try {
      if (reallocateTargetType === 'MACHINERY') {
        const res = await reallocateMachinery(selectedResourceId, targetCorridorId, reallocationReason);
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message, 'warn');
        }
      } else {
        const res = await reallocateGang(selectedResourceId, targetCorridorId, reallocationReason);
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message, 'warn');
        }
      }
      setIsReallocateModalOpen(false);
      await reloadData();
    } catch (err) {
      showToast('Failed to execute reallocation', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  // Open reallocation for specific machine
  const openReallocateForMachine = (machine: MachineryResource) => {
    setReallocateTargetType('MACHINERY');
    setSelectedResourceId(machine.id);
    setTargetCorridorId(machine.corridorId === 'C001' ? 'C003' : 'C001');
    setIsReallocateModalOpen(true);
  };

  // Open reallocation for specific gang
  const openReallocateForGang = (gang: ManpowerGang) => {
    setReallocateTargetType('MANPOWER');
    setSelectedResourceId(gang.id);
    setTargetCorridorId(gang.corridorId === 'C001' ? 'C004' : 'C001');
    setIsReallocateModalOpen(true);
  };

  // Aggregated KPIs
  const totalDeployedManpower = useMemo(() => {
    return gangs
      .filter((g) => g.status === 'ACTIVE_ON_TRACK')
      .reduce((acc, g) => acc + g.headcount, 0);
  }, [gangs]);

  const totalStandbyManpower = useMemo(() => {
    return gangs
      .filter((g) => g.status === 'STANDBY')
      .reduce((acc, g) => acc + g.headcount, 0);
  }, [gangs]);

  const totalDeployedMachinery = useMemo(() => {
    return machinery.filter((m) => m.status === 'DEPLOYED').length;
  }, [machinery]);

  const totalStandbyMachinery = useMemo(() => {
    return machinery.filter((m) => m.status === 'STANDBY_RESERVE').length;
  }, [machinery]);

  const networkAvgUtilization = useMemo(() => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((acc, m) => acc + m.utilizationPct, 0);
    return Math.round(total / metrics.length);
  }, [metrics]);

  const totalBottlenecks = useMemo(() => {
    return metrics.reduce((acc, m) => acc + m.bottleneckWarnings.length, 0);
  }, [metrics]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return metrics.map((m) => {
      return {
        corridorId: m.corridorId,
        shortCode: m.shortCode,
        name: m.corridorName,
        // Manpower breakdown
        trackGangs: m.trackGangsHeadcount,
        signalTechs: m.signalTechsHeadcount,
        oheLinesmen: m.oheLinesmenHeadcount,
        safetyLookouts: m.safetyLookoutsHeadcount,
        totalManpower: m.totalManpowerAllocated,
        manpowerCapacity: m.manpowerCapacity,
        // Machinery breakdown
        tampingMachines: m.tampingMachines,
        ballastRegulators: m.ballastRegulators,
        towerWagons: m.towerWagons,
        railGrinders: m.railGrinders,
        trackStabilizers: m.trackStabilizers,
        totalMachinery: m.totalMachineryAllocated,
        machineryCapacity: m.machineryCapacity,
        // Load %
        utilizationPct: m.utilizationPct,
        manpowerRatioPct: Math.round((m.totalManpowerAllocated / m.manpowerCapacity) * 100),
        machineryRatioPct: Math.round((m.totalMachineryAllocated / m.machineryCapacity) * 100),
        status: m.loadStatus,
        supervisor: m.supervisorInCharge,
        bottlenecksCount: m.bottleneckWarnings.length,
      };
    });
  }, [metrics]);

  // Filtered Machinery Table
  const filteredMachinery = useMemo(() => {
    return machinery.filter((m) => {
      const matchCorridor =
        filterCorridor === 'ALL' ||
        (filterCorridor === 'CENTRAL_DEPOT' ? m.corridorId === 'CENTRAL_DEPOT' : m.corridorId === filterCorridor);
      const matchSelected = !selectedCorridorId || m.corridorId === selectedCorridorId;
      const matchQuery =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCorridor && matchSelected && matchQuery;
    });
  }, [machinery, filterCorridor, selectedCorridorId, searchQuery]);

  // Filtered Manpower Gangs Table
  const filteredGangs = useMemo(() => {
    return gangs.filter((g) => {
      const matchCorridor =
        filterCorridor === 'ALL' ||
        (filterCorridor === 'CENTRAL_DEPOT' ? g.corridorId === 'CENTRAL_DEPOT' : g.corridorId === filterCorridor);
      const matchSelected = !selectedCorridorId || g.corridorId === selectedCorridorId;
      const matchQuery =
        !searchQuery ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.supervisor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.trade.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCorridor && matchSelected && matchQuery;
    });
  }, [gangs, filterCorridor, selectedCorridorId, searchQuery]);

  // Machinery type formatting helper
  const formatMachineryType = (type: MachineryType) => {
    switch (type) {
      case 'TAMPING_MACHINE':
        return 'Tie Tamping (09-3X/CSM)';
      case 'BALLAST_REGULATOR':
        return 'Ballast Regulator (BRM)';
      case 'TOWER_WAGON':
        return 'TRD Tower Car (RUPS/DETC)';
      case 'RAIL_GRINDER':
        return 'Rail Grinder (RGM)';
      case 'USFD_CAR':
        return 'Digital USFD Flaw Car';
      case 'TRACK_STABILIZER':
        return 'Dynamic Track Stabilizer (DTS)';
      default:
        return type;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 text-xs font-mono transition-all animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : notification.type === 'warn'
              ? 'bg-amber-950 border-amber-500 text-amber-200'
              : 'bg-sky-950 border-sky-500 text-sky-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-950/90 text-sky-400 border border-sky-800">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-wide uppercase">
                Resource Allocation & Capacity Planning
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800">
                IRTMM / RDSO COMPLIANT
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                DYNAMIC CORRIDOR SLOTTING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl">
              Real-time distribution of heavy track machines and specialized maintenance gangs across Northern,
              Southern, Western, and Eastern corridors. Capacity planning modeled with Indian Railways Track Machine
              Manual (IRTMM) headway constraints.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="header-crew-fatigue-btn"
              onClick={() => {
                setActiveTab('FATIGUE');
                const el = document.getElementById('fleet-roster-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                activeTab === 'FATIGUE'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-lg shadow-rose-950/60'
                  : 'bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 border-rose-900/60'
              }`}
              title="Analyze shift schedules against historical safety incidents and optimize rest rotations"
            >
              <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Crew Fatigue Predictor</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                {fatigueSummary.criticalFatigueCount > 0 ? `${fatigueSummary.criticalFatigueCount} CRITICAL` : 'AI'}
              </span>
            </button>

            {/* Custom Deficit Alert Thresholds Trigger */}
            <button
              id="btn-alert-thresholds-modal-trigger"
              onClick={() => setIsThresholdModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 text-xs font-semibold border border-amber-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/40"
              title="Define custom percentage deficit alert thresholds for manpower gangs and machinery slots"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Alert Thresholds</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/90 text-amber-200 border border-amber-800 font-mono">
                {thresholdSettings.thresholdMode === 'DEFICIT_PERCENT'
                  ? `MP:+${thresholdSettings.manpowerWarningThresholdPct}% | MACH:+${thresholdSettings.machineryWarningThresholdPct}%`
                  : `MP:${thresholdSettings.manpowerWarningThresholdPct}% | MACH:${thresholdSettings.machineryWarningThresholdPct}%`}
              </span>
            </button>

            {/* Export 30-Day Resource Forecast CSV Button */}
            <button
              id="btn-export-30day-forecast-csv"
              onClick={handleExport30DayForecastCsv}
              className="px-3.5 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white text-xs font-semibold border border-emerald-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
              title="Export current 30-day resource forecast data (manpower demand, machinery slots, deficits, statutory drivers) as a CSV spreadsheet for offline maintenance planning & reporting"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export 30D Forecast (CSV)</span>
            </button>

            <button
              onClick={handleAutoBalance}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-colors cursor-pointer"
              title="Mobilize standby resources to corridors with high workload"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Balance Fleet</span>
            </button>

            <button
              onClick={() => {
                setReallocateTargetType('MACHINERY');
                setSelectedResourceId(machinery[0]?.id || '');
                setTargetCorridorId('C001');
                setIsReallocateModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-medium border border-sky-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Mobilize Resource</span>
            </button>

            <button
              onClick={handleResetBaseline}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              title="Reset fleet positions to standard baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shift Selector & Operational Modes */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Operational Shift:
            </span>
            <div className="inline-flex rounded-lg bg-[#090f22] p-1 border border-slate-800">
              <button
                onClick={() => setSelectedShift('DAY_SHIFT')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedShift === 'DAY_SHIFT'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Day Shift (08:00 – 14:00)
              </button>
              <button
                onClick={() => setSelectedShift('AFTERNOON_SHIFT')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedShift === 'AFTERNOON_SHIFT'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Afternoon Shift (14:00 – 20:00)
              </button>
              <button
                onClick={() => setSelectedShift('NIGHT_MEGA_BLOCK')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedShift === 'NIGHT_MEGA_BLOCK'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Night Mega Block (22:00 – 04:00)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Balanced (70–90%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Near Saturation (&gt;90%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Over Capacity (&gt;100%)
            </span>
          </div>
        </div>
      </div>

      {/* TOP STRATEGIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Active Manpower */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Active Trackmen</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{totalDeployedManpower}</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <span>{gangs.length} Gangs On-Track</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">+{totalStandbyManpower} Reserve</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/60">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Heavy Track Machinery */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Track Machines</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
              {totalDeployedMachinery} <span className="text-sm font-normal text-slate-400">/ {machinery.length}</span>
            </div>
            <div className="text-[10px] text-purple-400 font-mono mt-0.5 flex items-center gap-1">
              <span>{totalStandbyMachinery} Central Standby</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">100% Ready</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/60">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Average Network Load */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Capacity Load Factor</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{networkAvgUtilization}%</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <span className={networkAvgUtilization > 90 ? 'text-amber-400' : 'text-emerald-400'}>
                {networkAvgUtilization > 90 ? 'High Headway Load' : 'Optimum Operational Band'}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/60">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Bottleneck Warnings */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Capacity Alerts</div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{totalBottlenecks}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {totalBottlenecks > 0 ? 'Machine slot / Gang crowding' : 'Zero violations'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 5: Statutory Safety Compliance */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Safety Briefings</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">100%</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Lookout Flagmen Stationed</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 6: Crew Fatigue Risk Index (Interactive) */}
        <div
          id="kpi-crew-fatigue-card"
          onClick={() => {
            setActiveTab('FATIGUE');
            const el = document.getElementById('fleet-roster-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-xl border shadow-md flex items-center justify-between transition-all cursor-pointer ${
            activeTab === 'FATIGUE'
              ? 'border-rose-500 bg-[#170a1c] ring-1 ring-rose-500/50'
              : 'border-sky-950/80 bg-[#0e172e] hover:border-rose-900/80'
          }`}
          title="Click to inspect crew fatigue profiles & suggested rest rotations"
        >
          <div>
            <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
              <span>Crew Fatigue</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                AI
              </span>
            </div>
            <div className="text-2xl font-bold font-mono mt-1 flex items-baseline gap-1">
              <span className={fatigueSummary.averageFatigueScore > 40 ? 'text-rose-400' : 'text-emerald-400'}>
                {fatigueSummary.averageFatigueScore}%
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {fatigueSummary.optimizedRotationsApplied ? 'Rest Active' : 'Night Peak'}
              </span>
            </div>
            <div className="text-[10px] font-mono mt-0.5 flex items-center gap-1 text-slate-400">
              <span className={fatigueSummary.criticalFatigueCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {fatigueSummary.criticalFatigueCount} Critical
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-sky-400">AI Optimize →</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60">
            <HeartPulse className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* REAL-TIME RESOURCE GAP ALERTS SECTION */}
      <ResourceGapAlertsSection
        corridors={corridors}
        currentSelectedShift={selectedShift}
        onSelectShift={(shift) => setSelectedShift(shift)}
        onSelectCorridor={(cid) => {
          setFilterCorridor(cid);
          setSelectedCorridorId(cid);
        }}
        onOpenFullForecast={() => setActiveTab('FORECAST')}
        onMobilizeReserveFleet={handleMobilizeReserveFromGapAlert}
        thresholdSettings={thresholdSettings}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
      />

      {/* D3.JS 30-DAY FORECASTED MANPOWER DEMAND VS CURRENT STAFFING LINE CHART */}
      <ForecastedManpowerD3Chart
        corridors={corridors}
        selectedCorridorId={selectedCorridorId}
        onSelectCorridor={(cid) => {
          setFilterCorridor(cid);
          setSelectedCorridorId(cid);
        }}
        onSelectShiftDay={handleSelectShiftDayFromChart}
        onMobilizeReserveGang={handleMobilizeReserveGangFromChart}
        thresholdSettings={thresholdSettings}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        onExportCsv={handleExport30DayForecastCsv}
      />

      {/* CORE VISUALIZATION: STACKABLE BAR CHART FOR CAPACITY PLANNING */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
                Corridor Capacity Allocation Matrix (Stackable Analysis)
              </h2>
              {selectedCorridorId && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-900 text-sky-200 flex items-center gap-1">
                  Filtered: {selectedCorridorId}
                  <button onClick={() => setSelectedCorridorId(null)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {chartView === 'MANPOWER_TRADES' &&
                'Headcount distribution stacked by department: Track Maintenance, S&T Interlocking, Traction 25kV OHE, and Safety Lookouts.'}
              {chartView === 'MACHINERY_CLASSES' &&
                'Heavy machine allocation stacked by class: Tie Tampers (CSM/09-3X), Ballast Regulators (BRM), OHE Tower Cars, and Rail Grinders.'}
              {chartView === 'UTILIZATION_LOAD' &&
                'Percentage saturation against corridor capacity limit, highlighting machine slot saturation and crew limits.'}
            </p>
          </div>

          {/* Chart View Toggle */}
          <div className="inline-flex rounded-lg bg-[#090f22] p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setChartView('MANPOWER_TRADES')}
              className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-all ${
                chartView === 'MANPOWER_TRADES'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manpower by Trade</span>
            </button>
            <button
              onClick={() => setChartView('MACHINERY_CLASSES')}
              className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-all ${
                chartView === 'MACHINERY_CLASSES'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Machinery Classes</span>
            </button>
            <button
              onClick={() => setChartView('UTILIZATION_LOAD')}
              className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-all ${
                chartView === 'UTILIZATION_LOAD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Capacity Load %</span>
            </button>
          </div>
        </div>

        {/* Stackable Bar Chart Container */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'MANPOWER_TRADES' ? (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const cid = e.activePayload[0].payload.corridorId;
                    setSelectedCorridorId(selectedCorridorId === cid ? null : cid);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortCode" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  label={{ value: 'Headcount (Persons)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#090f22] border border-sky-800 p-3 rounded-lg shadow-xl text-xs font-mono">
                          <div className="font-bold text-sky-300 border-b border-slate-800 pb-1.5 mb-2">
                            {d.name} ({d.shortCode})
                          </div>
                          <div className="space-y-1 text-slate-300 text-[11px]">
                            <div className="flex justify-between gap-4">
                              <span className="text-sky-400">PWI Track Maintenance:</span>
                              <span className="font-bold">{d.trackGangs}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-400">S&T Point & Interlocking:</span>
                              <span className="font-bold">{d.signalTechs}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-amber-400">TRD 25kV Catenary:</span>
                              <span className="font-bold">{d.oheLinesmen}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-indigo-400">Safety Marshals / Lookouts:</span>
                              <span className="font-bold">{d.safetyLookouts}</span>
                            </div>
                            <div className="border-t border-slate-800 pt-1.5 mt-1 flex justify-between gap-4 font-bold text-slate-100">
                              <span>Total Allocated:</span>
                              <span>
                                {d.totalManpower} / {d.manpowerCapacity} ({d.manpowerRatioPct}%)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 pt-1">
                              Supervisor: {d.supervisor}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-300">{value}</span>}
                />
                <ReferenceLine
                  y={80}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{ value: 'Network Staffing Ceiling (80)', fill: '#f43f5e', fontSize: 10, position: 'top' }}
                />
                <Bar dataKey="trackGangs" name="PWI Track Maintenance" stackId="manpower" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="signalTechs" name="S&T Interlocking" stackId="manpower" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="oheLinesmen" name="TRD 25kV Catenary" stackId="manpower" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="safetyLookouts" name="Safety Marshals" stackId="manpower" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartView === 'MACHINERY_CLASSES' ? (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const cid = e.activePayload[0].payload.corridorId;
                    setSelectedCorridorId(selectedCorridorId === cid ? null : cid);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortCode" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, 6]}
                  label={{ value: 'Machine Units Deployed', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#090f22] border border-purple-800 p-3 rounded-lg shadow-xl text-xs font-mono">
                          <div className="font-bold text-purple-300 border-b border-slate-800 pb-1.5 mb-2">
                            {d.name} ({d.shortCode})
                          </div>
                          <div className="space-y-1 text-slate-300 text-[11px]">
                            <div className="flex justify-between gap-4">
                              <span className="text-purple-400">Tie Tampers (09-3X/CSM):</span>
                              <span className="font-bold">{d.tampingMachines}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-amber-400">Ballast Regulators (BRM):</span>
                              <span className="font-bold">{d.ballastRegulators}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-cyan-400">TRD Tower Wagons (RUPS):</span>
                              <span className="font-bold">{d.towerWagons}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-rose-400">Rail Grinder / USFD:</span>
                              <span className="font-bold">{d.railGrinders}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-400">Track Stabilizers (DTS):</span>
                              <span className="font-bold">{d.trackStabilizers}</span>
                            </div>
                            <div className="border-t border-slate-800 pt-1.5 mt-1 flex justify-between gap-4 font-bold text-slate-100">
                              <span>Total Active:</span>
                              <span>
                                {d.totalMachinery} / {d.machineryCapacity} Slots
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-300">{value}</span>}
                />
                <ReferenceLine
                  y={4}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'IRTMM Max Machine Headway Limit (4 Units)', fill: '#ef4444', fontSize: 10, position: 'top' }}
                />
                <Bar dataKey="tampingMachines" name="Tie Tampers (CSM)" stackId="machines" fill="#a855f7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ballastRegulators" name="Ballast Regulators (BRM)" stackId="machines" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="towerWagons" name="OHE Tower Wagons" stackId="machines" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="railGrinders" name="Rail Grinder / USFD" stackId="machines" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="trackStabilizers" name="Dynamic Stabilizer (DTS)" stackId="machines" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const cid = e.activePayload[0].payload.corridorId;
                    setSelectedCorridorId(selectedCorridorId === cid ? null : cid);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortCode" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  domain={[0, 140]}
                  label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#090f22] border border-blue-800 p-3 rounded-lg shadow-xl text-xs font-mono">
                          <div className="font-bold text-sky-300 mb-1">
                            {d.name} ({d.shortCode})
                          </div>
                          <div className="text-slate-300">
                            Overall Capacity Load: <strong className="text-sky-400">{d.utilizationPct}%</strong>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-1">
                            Manpower: {d.manpowerRatioPct}% • Machinery: {d.machineryRatioPct}%
                          </div>
                          <div className="text-[10px] text-amber-400 mt-1">
                            {d.bottlenecksCount > 0 ? `${d.bottlenecksCount} operational bottlenecks active` : 'Optimal Headway'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  y={100}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: '100% Saturation Ceiling', fill: '#ef4444', fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  label={{ value: 'Target Baseline (70%)', fill: '#10b981', fontSize: 10, position: 'bottom' }}
                />
                <Bar dataKey="manpowerRatioPct" name="Manpower Ratio %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="machineryRatioPct" name="Machinery Ratio %" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer info banner */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Click any bar to filter that corridor across fleet rosters below. IRTMM requires min 120m spacing between track machines.</span>
          </div>
          {selectedCorridorId && (
            <button
              onClick={() => setSelectedCorridorId(null)}
              className="text-sky-400 hover:text-sky-300 underline"
            >
              Clear corridor filter
            </button>
          )}
        </div>
      </div>

      {/* CORRIDOR CAPACITY BENTO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((cm) => {
          const isSelected = selectedCorridorId === cm.corridorId;
          const statusColors = {
            BALANCED: 'border-emerald-800 bg-emerald-950/20 text-emerald-400',
            NEAR_CAPACITY: 'border-amber-800 bg-amber-950/20 text-amber-400',
            OVER_CAPACITY: 'border-rose-800 bg-rose-950/20 text-rose-400',
            UNDER_UTILIZED: 'border-sky-800 bg-sky-950/20 text-sky-400',
          };

          return (
            <div
              key={cm.corridorId}
              onClick={() => setSelectedCorridorId(isSelected ? null : cm.corridorId)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-sky-400 bg-[#101b38] shadow-lg shadow-sky-950/50'
                  : 'border-slate-800/80 bg-[#0e172e] hover:border-slate-700'
              }`}
            >
              {/* Corridor Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-100 text-sm">{cm.shortCode}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cm.lengthKm} KM • {cm.tracksCount} Tracks
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                    statusColors[cm.loadStatus]
                  }`}
                >
                  {cm.loadStatus.replace('_', ' ')}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-200 truncate mb-3">{cm.corridorName}</div>

              {/* Progress bars */}
              <div className="space-y-2.5 text-xs font-mono">
                {/* Manpower Progress */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Manpower</span>
                    <span>
                      {cm.totalManpowerAllocated} / {cm.manpowerCapacity} men
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cm.totalManpowerAllocated > cm.manpowerCapacity
                          ? 'bg-rose-500'
                          : cm.totalManpowerAllocated / cm.manpowerCapacity > 0.85
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (cm.totalManpowerAllocated / cm.manpowerCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Machinery Progress */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Machines</span>
                    <span>
                      {cm.totalMachineryAllocated} / {cm.machineryCapacity} slots
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cm.totalMachineryAllocated > cm.machineryCapacity
                          ? 'bg-rose-500'
                          : cm.totalMachineryAllocated / cm.machineryCapacity >= 0.9
                          ? 'bg-amber-500'
                          : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (cm.totalMachineryAllocated / cm.machineryCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottlenecks / Notes */}
              <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] space-y-1">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Supervisor In-Charge:</span>
                  <span className="text-slate-200 font-mono truncate max-w-[140px]">{cm.supervisorInCharge}</span>
                </div>
                {cm.bottleneckWarnings.length > 0 ? (
                  <div className="text-amber-400 flex items-start gap-1 font-mono pt-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cm.bottleneckWarnings[0]}</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 flex items-center gap-1 font-mono pt-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Headway & safety ratios clear</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FLEET ROSTERS & INVENTORY TABLE */}
      <div id="fleet-roster-section" className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('MACHINERY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'MACHINERY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Track Machinery Fleet ({machinery.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MANPOWER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'MANPOWER'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Maintenance Gangs Roster ({gangs.length})</span>
            </button>

            <button
              id="tab-crew-fatigue-predictor"
              onClick={() => setActiveTab('FATIGUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'FATIGUE'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-800/60 text-rose-300 hover:text-rose-200 hover:bg-slate-800'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Crew Fatigue Predictor</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                {fatigueSummary.criticalFatigueCount > 0 ? `${fatigueSummary.criticalFatigueCount} CRITICAL` : 'OPTIMIZED'}
              </span>
            </button>

            <button
              id="tab-resource-forecast"
              onClick={() => setActiveTab('FORECAST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'FORECAST'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-amber-300 hover:text-amber-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>30-Day Resource Forecast</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                GAP ENGINE
              </span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Active Filter Pill from Navigation */}
            {(searchQuery || filterCorridor !== 'ALL') && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-950/80 border border-sky-800/80 text-[11px] text-sky-300 font-mono">
                <span className="text-slate-400">Filter:</span>
                <span className="font-semibold text-sky-200">
                  {searchQuery && `"${searchQuery}"`}
                  {searchQuery && filterCorridor !== 'ALL' && ' in '}
                  {filterCorridor !== 'ALL' && filterCorridor}
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCorridor('ALL');
                    setSelectedCorridorId(null);
                  }}
                  title="Clear filters"
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={activeTab === 'MACHINERY' ? 'Search machine ID, model, operator...' : 'Search gang name, supervisor, trade...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-sky-500 w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Corridor Filter Dropdown */}
            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Corridors & Depot</option>
              <option value="C001">C001 - Northern Main Trunk</option>
              <option value="C002">C002 - Southern High-Speed Spur</option>
              <option value="C003">C003 - Western Heavy Freight</option>
              <option value="C004">C004 - Eastern Express Link</option>
              <option value="CENTRAL_DEPOT">Central Depot Standby Reserve</option>
            </select>
          </div>
        </div>

        {/* Table / Module Content */}
        {activeTab === 'FORECAST' ? (
          <div className="p-4 md:p-6 bg-[#080d1e]">
            <MaintenanceResourceForecastModule
              initialCorridorFilter={filterCorridor !== 'ALL' && filterCorridor !== 'CENTRAL_DEPOT' ? filterCorridor : 'ALL'}
              onNavigateToSchedule={onNavigateToTimeline}
            />
          </div>
        ) : activeTab === 'FATIGUE' ? (
          <div className="p-4 md:p-6 bg-[#080d1e]">
            <CrewFatiguePredictorModule
              onRosterUpdated={reloadData}
              initialCorridorFilter={filterCorridor !== 'ALL' ? filterCorridor : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'MACHINERY' ? (
              <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="p-3">Machine ID & Type</th>
                  <th className="p-3">Corridor & Section</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Operator / Pilot</th>
                  <th className="p-3">Fuel & Health</th>
                  <th className="p-3">Speed Limit</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredMachinery.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No track machines found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredMachinery.map((m) => {
                    const isStandby = m.status === 'STANDBY_RESERVE';
                    return (
                      <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="text-purple-400">{m.id}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                              {formatMachineryType(m.type)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-sans mt-0.5">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.model}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 font-semibold text-slate-200">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            <span>{m.corridorId === 'CENTRAL_DEPOT' ? 'Central TMD Holding' : m.corridorId}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{m.currentSection}</div>
                          {m.assignedBlockId && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-sky-300">
                              Block: {m.assignedBlockId}
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isStandby
                                ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                                : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                            }`}
                          >
                            {isStandby ? 'STANDBY RESERVE' : 'DEPLOYED ON TRACK'}
                          </span>
                        </td>

                        <td className="p-3 font-sans">
                          <div className="text-slate-200 font-medium">{m.operatorName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Base: {m.homeDepot}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-300">{m.fuelLevelPct}%</span>
                            <div className="w-14 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full ${
                                  m.fuelLevelPct > 70 ? 'bg-emerald-500' : m.fuelLevelPct > 40 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${m.fuelLevelPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400">Health Index: {m.healthIndex}%</div>
                        </td>

                        <td className="p-3 text-slate-300">{m.speedLimitKmph} km/h</td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => openReallocateForMachine(m)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-[11px] font-mono flex items-center gap-1 ml-auto"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Mobilize</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="p-3">Gang ID & Unit Name</th>
                  <th className="p-3">Department & Trade</th>
                  <th className="p-3">Headcount</th>
                  <th className="p-3">Corridor & Section</th>
                  <th className="p-3">Supervisor In-Charge</th>
                  <th className="p-3">Equipment Inventory</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredGangs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No maintenance gangs found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredGangs.map((g) => {
                    const isStandby = g.status === 'STANDBY';
                    return (
                      <tr key={g.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="text-sky-400">{g.id}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                                isStandby
                                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                                  : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                              }`}
                            >
                              {isStandby ? 'STANDBY' : 'ACTIVE'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-sans mt-0.5">{g.name}</div>
                        </td>

                        <td className="p-3">
                          <div className="text-slate-200 font-semibold">{g.department}</div>
                          <div className="text-[10px] text-slate-400">{g.trade.replace('_', ' ')}</div>
                        </td>

                        <td className="p-3">
                          <div className="text-sm font-bold text-slate-100">{g.headcount}</div>
                          <div className="text-[10px] text-slate-400">Personnel</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 font-semibold text-slate-200">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            <span>{g.corridorId}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{g.assignedSection}</div>
                        </td>

                        <td className="p-3 font-sans">
                          <div className="text-slate-200 font-medium">{g.supervisor}</div>
                          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Safety Briefed</span>
                          </div>
                        </td>

                        <td className="p-3 text-[10px] text-slate-400 max-w-xs truncate font-sans">
                          {g.equippedWith || 'Standard track maintenance tools'}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => openReallocateForGang(g)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 text-[11px] font-mono flex items-center gap-1 ml-auto"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Redeploy</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
      </div>

      {/* STATUTORY IRTMM RULES & CAPACITY PRINCIPLES BANNER */}
      <div className="bg-[#090f22] p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>INDIAN RAILWAYS TRACK MACHINE MANUAL (IRTMM) CAPACITY DIRECTIVES:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
            <span className="text-sky-300 font-semibold block mb-0.5">1. Minimum Machine Headway</span>
            <span>A minimum safe buffer of 120 meters must be maintained between tandem machines (CSM + BRM + DTS).</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
            <span className="text-amber-300 font-semibold block mb-0.5">2. Mandatory Safety Lookouts</span>
            <span>Gangs exceeding 15 trackmen require at least 1 dedicated Lookout Flagman with audible klaxon alarms.</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80">
            <span className="text-purple-300 font-semibold block mb-0.5">3. 25kV OHE Power Block Earthing</span>
            <span>Tower wagons require certified Section Insulator isolation and earthing discharge rods before cantilever work.</span>
          </div>
        </div>
      </div>

      {/* REALLOCATION MODAL */}
      {isReallocateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0e172e] border border-sky-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <h3 className="font-mono font-bold text-slate-100 text-base uppercase">
                  Mobilize & Reallocate Resource
                </h3>
              </div>
              <button
                onClick={() => setIsReallocateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {/* Type Switcher */}
              <div>
                <label className="text-slate-400 block mb-1">Resource Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReallocateTargetType('MACHINERY');
                      setSelectedResourceId(machinery[0]?.id || '');
                    }}
                    className={`p-2 rounded border text-center transition-all ${
                      reallocateTargetType === 'MACHINERY'
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Track Machinery Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReallocateTargetType('MANPOWER');
                      setSelectedResourceId(gangs[0]?.id || '');
                    }}
                    className={`p-2 rounded border text-center transition-all ${
                      reallocateTargetType === 'MANPOWER'
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Maintenance Gang
                  </button>
                </div>
              </div>

              {/* Resource Select */}
              <div>
                <label className="text-slate-400 block mb-1">Select Unit to Mobilize:</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 focus:border-sky-500 focus:outline-none text-xs"
                >
                  {reallocateTargetType === 'MACHINERY'
                    ? machinery.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id} — {m.name} (Current: {m.corridorId})
                        </option>
                      ))
                    : gangs.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.id} — {g.name} ({g.headcount} men, Current: {g.corridorId})
                        </option>
                      ))}
                </select>
              </div>

              {/* Target Corridor Select */}
              <div>
                <label className="text-slate-400 block mb-1">Target Corridor / Base:</label>
                <select
                  value={targetCorridorId}
                  onChange={(e) => setTargetCorridorId(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 focus:border-sky-500 focus:outline-none text-xs"
                >
                  <option value="C001">C001 - Northern Main Trunk</option>
                  <option value="C002">C002 - Southern High-Speed Spur</option>
                  <option value="C003">C003 - Western Heavy Freight & Passenger</option>
                  <option value="C004">C004 - Eastern Mixed Express Link</option>
                  <option value="CENTRAL_DEPOT">Central TMD Holding Siding (Standby Reserve)</option>
                </select>
              </div>

              {/* Reason / Directive */}
              <div>
                <label className="text-slate-400 block mb-1">Transfer Authorization / Reason:</label>
                <input
                  type="text"
                  value={reallocationReason}
                  onChange={(e) => setReallocationReason(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 focus:border-sky-500 focus:outline-none text-xs"
                  placeholder="e.g., Night mega-block deep screening, Emergency defect clearance"
                />
              </div>

              {/* Simulated Impact Preview */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <div className="text-sky-400 font-bold mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Simulated Capacity Impact</span>
                </div>
                <div>
                  Target corridor <strong>{targetCorridorId}</strong> will receive an operational boost.{' '}
                  {targetCorridorId === 'CENTRAL_DEPOT'
                    ? 'Unit will be kept on 20-min standby callout.'
                    : 'Scheduled maintenance block window will absorb the machine without track clearance overrun.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReallocateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReallocation}
                disabled={isLoading}
                className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-sky-950/50"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Mobilization</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DEFICIT ALERT THRESHOLD CONFIGURATION MODAL */}
      <DeficitAlertThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        currentSettings={thresholdSettings}
        onSaveSettings={handleSaveThresholdSettings}
        onLiveUpdate={handleLiveThresholdUpdate}
        corridors={corridors}
      />
    </div>
  );
};
