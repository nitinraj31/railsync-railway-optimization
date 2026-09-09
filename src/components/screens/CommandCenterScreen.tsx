import React, { useState } from 'react';
import {
  LayoutDashboard,
  Train,
  Wrench,
  Bug,
  AlertTriangle,
  CheckCircle2,
  GitFork,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Gauge,
  Zap,
  ArrowUpRight,
  BellRing,
  AlertCircle,
  Sliders,
  X,
  Radar,
  Flame,
  Search,
  Filter,
  Info,
  Radio,
  Leaf,
  Truck,
  CloudRain,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { ValidationResult, Corridor, OptimizedBlock, BlockRequest, Defect } from '../../types';
import { mockStore } from '../../services/api';
import { PredictiveMaintenancePanel } from '../predictive/PredictiveMaintenancePanel';
import { SustainabilityDashboard } from '../sustainability/SustainabilityDashboard';
import { CorridorDigitalTwin } from '../digitaltwin/CorridorDigitalTwin';
import { NetworkResilienceCard } from '../resilience/NetworkResilienceCard';
import { FleetHealthHeatmap } from '../fleet/FleetHealthHeatmap';
import { ElectricalGridHealth } from '../electrical/ElectricalGridHealth';
import { DepartmentOperationsHub } from '../departments/DepartmentOperationsHub';
import { EnvironmentalImpactModule } from '../environmental/EnvironmentalImpactModule';

interface CommandCenterProps {
  onNavigate: (screen: string, itemData?: any) => void;
  validation: ValidationResult;
  corridors: Corridor[];
  openConflictsCount: number;
  totalBlocksCount: number;
  totalRequestsCount: number;
  totalDefectsCount: number;
  onOpenDemoWalkthrough: () => void;
  blocks?: OptimizedBlock[];
  requests?: BlockRequest[];
  defects?: Defect[];
  onRefreshData?: () => void;
}

export const CommandCenterScreen: React.FC<CommandCenterProps> = ({
  onNavigate,
  validation,
  corridors,
  openConflictsCount,
  totalBlocksCount,
  totalRequestsCount,
  totalDefectsCount,
  onOpenDemoWalkthrough,
  blocks = [],
  requests = mockStore.getBlockRequests(),
  defects = mockStore.getDefects(),
  onRefreshData,
}) => {
  const isSafe = validation.status === 'SAFE_TO_PUBLISH';
  const [efficiencyView, setEfficiencyView] = useState<'corridors' | 'departments' | 'shifts'>('corridors');
  const [turnaroundThreshold, setTurnaroundThreshold] = useState<number>(90);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [riskSearchQuery, setRiskSearchQuery] = useState<string>('');
  const [selectedRiskBlockId, setSelectedRiskBlockId] = useState<string | null>(null);

  // Dynamic Maintenance Efficiency calculations
  const corridorEfficiencyData = corridors.map((c) => {
    const corrBlocks = blocks.filter((b) => b.corridorId === c.id);
    const avgDuration =
      corrBlocks.length > 0
        ? Math.round(corrBlocks.reduce((sum, b) => sum + (b.durationMinutes || 90), 0) / corrBlocks.length)
        : c.id === 'C001'
        ? 78
        : c.id === 'C002'
        ? 68
        : c.id === 'C003'
        ? 92
        : 82;

    // Actual turnaround time accounts for machine release, gang clearance, and OHE re-energization
    const turnaroundTime = Math.max(45, Math.min(115, avgDuration - 8));

    return {
      name: c.id,
      fullName: c.name,
      code: c.code || c.id,
      turnaroundTime,
      targetTurnaround: 90,
      utilization: c.utilization,
      scheduledBlocks: c.scheduledBlocks,
      availableSlots: c.availableSlots,
      primaryMachinery:
        c.id === 'C001'
          ? 'CSM-902 & OHE Tower Wagon'
          : c.id === 'C002'
          ? '09-3X Dynamic Tamping Machine'
          : c.id === 'C003'
          ? 'BCM-03 Ballast Cleaner & PWI Gang 4'
          : 'Duomatic Tamping Unit & TRD Gang 1',
    };
  });

  const departmentEfficiencyData = [
    {
      name: 'ENG (Track)',
      fullName: 'Civil Engineering (Permanent Way)',
      code: 'TRACK_ENG',
      turnaroundTime: 82,
      targetTurnaround: 90,
      utilization: 89,
      scheduledBlocks: 18,
      primaryMachinery: 'Continuous Action 09-3X, BCM Ballast Cleaner',
    },
    {
      name: 'S&T (Signals)',
      fullName: 'Signal & Telecommunication',
      code: 'SIGNAL_TEL',
      turnaroundTime: 62,
      targetTurnaround: 90,
      utilization: 81,
      scheduledBlocks: 14,
      primaryMachinery: 'AFTC Analyzer, Point Machine Diagnostic Rig',
    },
    {
      name: 'TRD (OHE)',
      fullName: 'Electrical Traction Distribution',
      code: 'TRACTION_OHE',
      turnaroundTime: 71,
      targetTurnaround: 90,
      utilization: 88,
      scheduledBlocks: 10,
      primaryMachinery: '8-Wheeler DETC Tower Wagon, Pantograph Rig',
    },
  ];

  const shiftEfficiencyData = [
    {
      name: 'Night Window',
      fullName: 'Night Golden Maintenance Window (00:30–04:30)',
      code: 'SHIFT_NIGHT',
      turnaroundTime: 104,
      targetTurnaround: 120,
      utilization: 95,
      scheduledBlocks: 22,
      primaryMachinery: 'Heavy Machine Fleet, Complete Corridor Block',
    },
    {
      name: 'Morning Slot',
      fullName: 'Morning Traffic Buffer (09:30–11:30)',
      code: 'SHIFT_MORN',
      turnaroundTime: 58,
      targetTurnaround: 75,
      utilization: 76,
      scheduledBlocks: 8,
      primaryMachinery: 'Rapid Track Inspection & Modular Repair',
    },
    {
      name: 'Afternoon Slot',
      fullName: 'Afternoon Freight Gap (13:00–15:30)',
      code: 'SHIFT_NOON',
      turnaroundTime: 74,
      targetTurnaround: 90,
      utilization: 85,
      scheduledBlocks: 12,
      primaryMachinery: 'Signal Overhaul, Point Calibration, OHE Check',
    },
  ];

  const currentEfficiencyData =
    efficiencyView === 'corridors'
      ? corridorEfficiencyData
      : efficiencyView === 'departments'
      ? departmentEfficiencyData
      : shiftEfficiencyData;

  const overallAvgTurnaround = Math.round(
    corridorEfficiencyData.reduce((sum, item) => sum + item.turnaroundTime, 0) /
      (corridorEfficiencyData.length || 1)
  );

  const overallAvgUtilization = Number(
    (
      corridorEfficiencyData.reduce((sum, item) => sum + item.utilization, 0) /
      (corridorEfficiencyData.length || 1)
    ).toFixed(1)
  );

  // Turnaround Threshold Breach Alert Evaluation
  const isTurnaroundBreached = overallAvgTurnaround > turnaroundThreshold;
  const turnaroundDiff = Math.abs(overallAvgTurnaround - turnaroundThreshold);
  const breachedCorridorsCount = corridorEfficiencyData.filter(
    (c) => c.turnaroundTime > turnaroundThreshold
  ).length;

  // 7-Day Historical Trend of Block Turnaround Times (Sparkline Dataset)
  const sevenDayTurnaroundTrend = [
    { day: 'Day 1', date: '02 Sep', fullDate: 'Wednesday, 02 Sep 2026', turnaroundTime: 86, target: turnaroundThreshold, completedBlocks: 38, punctuality: 94.7 },
    { day: 'Day 2', date: '03 Sep', fullDate: 'Thursday, 03 Sep 2026', turnaroundTime: 82, target: turnaroundThreshold, completedBlocks: 41, punctuality: 95.1 },
    { day: 'Day 3', date: '04 Sep', fullDate: 'Friday, 04 Sep 2026', turnaroundTime: 88, target: turnaroundThreshold, completedBlocks: 36, punctuality: 91.7 },
    { day: 'Day 4', date: '05 Sep', fullDate: 'Saturday, 05 Sep 2026', turnaroundTime: 79, target: turnaroundThreshold, completedBlocks: 44, punctuality: 97.7 },
    { day: 'Day 5', date: '06 Sep', fullDate: 'Sunday, 06 Sep 2026', turnaroundTime: 71, target: turnaroundThreshold, completedBlocks: 46, punctuality: 100.0 },
    { day: 'Day 6', date: '07 Sep', fullDate: 'Monday, 07 Sep 2026', turnaroundTime: 78, target: turnaroundThreshold, completedBlocks: 39, punctuality: 97.4 },
    { day: 'Day 7', date: '08 Sep (Today)', fullDate: 'Tuesday, 08 Sep 2026 (Live)', turnaroundTime: overallAvgTurnaround, target: turnaroundThreshold, completedBlocks: 42, punctuality: 97.6 },
  ];

  const avg7DayTurnaround = Number(
    (
      sevenDayTurnaroundTrend.reduce((sum, item) => sum + item.turnaroundTime, 0) /
      sevenDayTurnaroundTrend.length
    ).toFixed(1)
  );
  const best7DayTurnaround = Math.min(...sevenDayTurnaroundTrend.map((d) => d.turnaroundTime));
  const peak7DayTurnaround = Math.max(...sevenDayTurnaroundTrend.map((d) => d.turnaroundTime));
  const trendVelocityDiff = overallAvgTurnaround - sevenDayTurnaroundTrend[0].turnaroundTime;
  const trendVelocityPct = Number(((trendVelocityDiff / sevenDayTurnaroundTrend[0].turnaroundTime) * 100).toFixed(1));
  const total7DayBlocks = sevenDayTurnaroundTrend.reduce((sum, item) => sum + item.completedBlocks, 0);

  // Handler for clicking efficiency visualization items to navigate to Resource Allocation screen filtered by resource type
  const handleEfficiencyBarClick = (data: any) => {
    if (!data) return;

    if (efficiencyView === 'corridors') {
      const corridorId = data.name; // 'C001', 'C002', 'C003', 'C004'
      // Determine primary machine type for this corridor
      const resourceTypeMapping: Record<string, string> = {
        C001: 'CSM',
        C002: '09-3X',
        C003: 'BCM',
        C004: 'Duomatic',
      };
      const resourceType = resourceTypeMapping[corridorId] || 'TAMPING_MACHINE';
      onNavigate('resource_allocation', {
        corridorId,
        resourceType,
        tab: 'MACHINERY',
      });
    } else if (efficiencyView === 'departments') {
      // Departmental mapping to Resource Allocation trade & machinery
      if (data.code === 'TRACK_ENG') {
        onNavigate('resource_allocation', {
          resourceType: '09-3X',
          tab: 'MACHINERY',
        });
      } else if (data.code === 'SIGNAL_TEL') {
        onNavigate('resource_allocation', {
          resourceType: 'SIGNAL_TELECOM',
          tab: 'MANPOWER',
        });
      } else if (data.code === 'TRACTION_OHE') {
        onNavigate('resource_allocation', {
          resourceType: 'TOWER_WAGON',
          tab: 'MACHINERY',
        });
      } else {
        onNavigate('resource_allocation', {
          resourceType: data.name,
        });
      }
    } else if (efficiencyView === 'shifts') {
      // Shift mapping
      const shiftMapping: Record<string, 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK'> = {
        SHIFT_NIGHT: 'NIGHT_MEGA_BLOCK',
        SHIFT_MORN: 'DAY_SHIFT',
        SHIFT_NOON: 'AFTERNOON_SHIFT',
      };
      const shift = shiftMapping[data.code] || 'DAY_SHIFT';
      onNavigate('resource_allocation', {
        shift,
        resourceType: data.code === 'SHIFT_NIGHT' ? 'Heavy Machine Fleet' : 'Inspection',
      });
    }
  };

  const renderCustomEfficiencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      const corridorDiff = turnaroundThreshold - data.turnaroundTime;
      return (
        <div className="bg-[#0b1329] border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs font-mono min-w-[230px]">
          <div className="font-bold text-slate-100 text-xs mb-1.5 flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="truncate">{data.fullName || data.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
              {data.name}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Avg Turnaround:</span>
              <span className="font-bold text-sky-400">{data.turnaroundTime} mins</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Threshold ({turnaroundThreshold}m):</span>
              <span className={corridorDiff >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {corridorDiff >= 0 ? `-${corridorDiff}m under limit` : `+${Math.abs(corridorDiff)}m OVER THRESHOLD`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Resource Utilization:</span>
              <span className="font-bold text-emerald-400">{data.utilization}%</span>
            </div>
            {data.scheduledBlocks !== undefined && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Blocks Scheduled:</span>
                <span className="text-slate-200">{data.scheduledBlocks} blocks</span>
              </div>
            )}
            {data.primaryMachinery && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                <div className="text-slate-500">Fleet Deployment:</div>
                <div className="text-slate-300 truncate">{data.primaryMachinery}</div>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-sky-400 flex items-center justify-between font-sans">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>Click bar to inspect resources</span>
              </span>
              <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300 font-mono">
                Resource Allocation →
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for 7-Day Block Turnaround Sparkline Chart
  const renderSparklineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      const variance = turnaroundThreshold - data.turnaroundTime;
      const isOptimal = variance >= 0;
      return (
        <div className="bg-[#091325] border border-sky-600/70 p-3 rounded-lg shadow-2xl text-xs font-mono min-w-[220px] z-50">
          <div className="font-bold text-white text-xs mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="truncate">{data.fullDate || data.day}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
              {data.date}
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Turnaround Time:</span>
              <span className="font-bold text-sky-400">{data.turnaroundTime} mins</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target ({turnaroundThreshold}m):</span>
              <span className={isOptimal ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isOptimal ? `-${variance}m under target` : `+${Math.abs(variance)}m OVER TARGET`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Completed Blocks:</span>
              <span className="text-slate-200 font-bold">{data.completedBlocks} blocks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Handover Punctuality:</span>
              <span className="text-emerald-400 font-bold">{data.punctuality}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // RISK PREDICTION ENGINE: Forecast potential future conflicts based on historical maintenance delays
  // Department historical overrun profile (minutes & overrun likelihood) based on past RDSO log records
  const historicalDelayFactors: Record<string, { avgOverrunMin: number; overrunProbability: number; primaryRiskFactor: string }> = {
    ENGINEERING: { avgOverrunMin: 22, overrunProbability: 0.68, primaryRiskFactor: 'Ballast consolidation & heavy tamping clearance delays' },
    TRACTION: { avgOverrunMin: 18, overrunProbability: 0.54, primaryRiskFactor: 'OHE power block de-energization / ladder earthing protocol' },
    'S&T': { avgOverrunMin: 12, overrunProbability: 0.35, primaryRiskFactor: 'Interlocking point calibration & signal relay test cycle' },
  };

  // Corridor congestion multiplier based on scheduled density
  const corridorRiskWeights: Record<string, { congestionFactor: number; downlineTrainDensity: string }> = {
    C001: { congestionFactor: 1.15, downlineTrainDensity: 'High (Rajdhani / Shatabdi trunk slot)' },
    C002: { congestionFactor: 1.05, downlineTrainDensity: 'Moderate (Suburban EMU corridor)' },
    C003: { congestionFactor: 1.35, downlineTrainDensity: 'Critical (Heavy Freight & Vande Bharat mixed)' },
    C004: { congestionFactor: 1.25, downlineTrainDensity: 'High (Container Freight line)' },
  };

  const riskPredictions = blocks.map((b) => {
    const delayInfo = historicalDelayFactors[b.department] || {
      avgOverrunMin: 15,
      overrunProbability: 0.45,
      primaryRiskFactor: 'Standard operational inspection variance',
    };
    const corridorInfo = corridorRiskWeights[b.corridorId] || {
      congestionFactor: 1.1,
      downlineTrainDensity: 'Standard corridor density',
    };

    // Parse block times
    const [startH, startM] = (b.startTime || '00:00').split(':').map(Number);
    const [endH, endM] = (b.endTime || '00:00').split(':').map(Number);
    const scheduledDuration = b.durationMinutes || (endH * 60 + endM) - (startH * 60 + startM) || 90;

    // Projected overrun = base department overrun * corridor factor * priority sensitivity
    const priorityMultiplier = b.priority === 'CRITICAL' ? 1.3 : b.priority === 'HIGH' ? 1.15 : 1.0;
    const projectedOverrunMinutes = Math.round(delayInfo.avgOverrunMin * corridorInfo.congestionFactor * priorityMultiplier);
    const projectedEndMinutes = endH * 60 + endM + projectedOverrunMinutes;
    const projEndH = Math.floor(projectedEndMinutes / 60) % 24;
    const projEndM = projectedEndMinutes % 60;
    const projectedEndTime = `${projEndH.toString().padStart(2, '0')}:${projEndM.toString().padStart(2, '0')}`;

    // Risk Score: 0 to 100
    // Factor in base probability, overrun magnitude relative to 90m RDSO ceiling, and existing conflict flag
    const overrunRatio = projectedOverrunMinutes / 30; // 30m overrun is max scale
    let score = Math.round(
      (delayInfo.overrunProbability * 0.45 + overrunRatio * 0.35 + (b.priority === 'CRITICAL' ? 0.2 : 0.1)) * 100
    );
    if (b.hasConflict) score = Math.min(100, score + 25);
    score = Math.min(99, Math.max(15, score));

    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';

    // Forecasted downstream conflict scenario
    let forecastedImpact = '';
    let downstreamVulnerableTrain = '';
    if (b.corridorId === 'C003') {
      downstreamVulnerableTrain = 'TR106 (Vande Bharat Express)';
      forecastedImpact = `Projected +${projectedOverrunMinutes}m overrun risks blocking TR106 departure at Shakurbasti outer junction.`;
    } else if (b.corridorId === 'C004') {
      downstreamVulnerableTrain = 'TR057 (Rajdhani Spl) & Container Freight';
      forecastedImpact = `Clearing delay encroaches on freight transit corridor slot, forcing cautionary 30 km/h speed restriction.`;
    } else if (b.corridorId === 'C001') {
      downstreamVulnerableTrain = 'TR012 (Kalka Shatabdi)';
      forecastedImpact = `Track handback overrun may delay suburban morning commuter sequence by 12–18 mins.`;
    } else {
      downstreamVulnerableTrain = 'TR088 (Intercity Superfast)';
      forecastedImpact = `Potential platform headway compression and secondary loop dwell at junction approach.`;
    }

    const recommendedAction =
      riskLevel === 'HIGH'
        ? `Deploy secondary quick-release ballast regulator & pre-book 30m safety buffer before ${downstreamVulnerableTrain}`
        : riskLevel === 'MEDIUM'
        ? `Pre-position TRD breakdown wagon and assign dedicated track handover supervisor`
        : `Normal execution under standard interlocking clearance protocols`;

    return {
      blockId: b.blockId,
      taskId: b.taskId,
      corridorId: b.corridorId,
      department: b.department,
      section: b.section,
      scheduledTime: `${b.startTime}–${b.endTime}`,
      scheduledDuration,
      projectedEndTime,
      projectedOverrunMinutes,
      riskScore: score,
      riskLevel,
      primaryRiskFactor: delayInfo.primaryRiskFactor,
      downstreamVulnerableTrain,
      forecastedImpact,
      recommendedAction,
      hasExistingConflict: b.hasConflict,
    };
  });

  // Filtered risk predictions
  const filteredRiskPredictions = riskPredictions
    .filter((rp) => {
      if (riskSeverityFilter !== 'ALL' && rp.riskLevel !== riskSeverityFilter) return false;
      if (!riskSearchQuery) return true;
      const q = riskSearchQuery.toLowerCase();
      return (
        rp.blockId.toLowerCase().includes(q) ||
        rp.corridorId.toLowerCase().includes(q) ||
        rp.department.toLowerCase().includes(q) ||
        rp.downstreamVulnerableTrain.toLowerCase().includes(q) ||
        rp.section.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const highRiskCount = riskPredictions.filter((r) => r.riskLevel === 'HIGH').length;
  const mediumRiskCount = riskPredictions.filter((r) => r.riskLevel === 'MEDIUM').length;
  const lowRiskCount = riskPredictions.filter((r) => r.riskLevel === 'LOW').length;
  const avgForecastOverrun = Math.round(
    riskPredictions.reduce((sum, r) => sum + r.projectedOverrunMinutes, 0) / (riskPredictions.length || 1)
  );

  // Factual KPI cards matching exact prompt values + Network Resilience
  const kpis = [
    { label: 'Network Resilience', value: '84%', sub: 'Real-Time Health', icon: ShieldCheck, screen: 'resilience_anchor', color: 'text-emerald-400' },
    { label: 'Assets', value: 28, sub: 'Tracks, S&T, OHE', icon: Wrench, screen: 'maintenance_assets', color: 'text-sky-400' },
    { label: 'Maintenance Tasks', value: 60, sub: 'Periodic Overhauls', icon: Clock, screen: 'maintenance_assets', color: 'text-blue-400' },
    { label: 'Defects', value: totalDefectsCount || 55, sub: 'OMS & Trolley Logs', icon: Bug, screen: 'defects', color: 'text-rose-400' },
    { label: 'Corridor Slots', value: 48, sub: 'Across C001–C004', icon: GitFork, screen: 'corridors', color: 'text-cyan-400' },
    { label: 'Train Schedule', value: 120, sub: 'Vande Bharat, Freight', icon: Train, screen: 'trains', color: 'text-indigo-400' },
    { label: 'Block Requests', value: totalRequestsCount || 35, sub: 'Cross-Department', icon: Layers, screen: 'requests', color: 'text-emerald-400' },
    { label: 'Optimized Blocks', value: totalBlocksCount || 42, sub: 'AI Generated', icon: Sparkles, screen: 'planning', color: 'text-purple-400' },
    { label: 'Initial Conflicts', value: 23, sub: '18 Auto-Resolved', icon: AlertTriangle, screen: 'conflicts', color: 'text-amber-400' },
  ];

  // Chart data: Task Priority
  const priorityData = [
    { name: 'Critical', count: 8, fill: '#ef4444' },
    { name: 'High', count: 18, fill: '#f97316' },
    { name: 'Medium', count: 24, fill: '#eab308' },
    { name: 'Low', count: 10, fill: '#10b981' },
  ];

  // Chart data: Corridor Workload
  const corridorWorkloadData = corridors.map((c) => ({
    name: c.id,
    scheduled: c.scheduledBlocks,
    available: c.availableSlots,
    utilization: c.utilization,
  }));

  // Chart data: Conflict Distribution
  const conflictDistributionData = [
    { name: 'C001 (Main Trunk)', conflicts: 0, fill: '#10b981' },
    { name: 'C002 (High-Speed)', conflicts: 1, fill: '#f59e0b' },
    { name: 'C003 (Freight/Pass)', conflicts: 2, fill: '#ef4444' },
    { name: 'C004 (Mixed Link)', conflicts: 2, fill: '#ef4444' },
  ];

  // Chart data: Block Utilization
  const blockStatusData = [
    { name: 'Valid Blocks', value: validation.validBlocks, fill: '#10b981' },
    { name: 'Under Review / Conflict', value: validation.invalidBlocks, fill: '#ef4444' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d162d] via-[#0f1b38] to-[#0c1427] p-5 rounded-xl border border-sky-900/40 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-100 font-mono tracking-wider">
              RAILSYNC
            </h1>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SYSTEM ONLINE
            </span>
            {/* Real-time Turnaround Efficiency Badge */}
            <button
              onClick={() => {
                const el = document.getElementById('maintenance-efficiency-kpi-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              title={`Average Turnaround: ${overallAvgTurnaround}m / Threshold: ${turnaroundThreshold}m. Click to inspect.`}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                isTurnaroundBreached
                  ? 'bg-rose-950/90 text-rose-300 border-rose-600/80 animate-pulse shadow-sm shadow-rose-900/50'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 hover:border-emerald-500'
              }`}
            >
              {isTurnaroundBreached ? (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>ALERT: TURNAROUND {overallAvgTurnaround}m &gt; {turnaroundThreshold}m CEILING</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>TURNAROUND EFFICIENCY OPTIMAL ({overallAvgTurnaround}m / &le;{turnaroundThreshold}m)</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs md:text-sm text-sky-300 font-medium mt-1">
            AI-Powered Automatic Block Planning & Railway Maintenance Coordination System
          </p>
          <p className="text-[11px] text-slate-400 italic mt-0.5">
            "From Manual Block Planning to Intelligent, Conflict-Aware Railway Maintenance Scheduling"
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="open-shadow-block-btn"
            onClick={() => onNavigate('shadow_block')}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 hover:border-cyan-400/80 border border-cyan-500/50 text-cyan-300 text-xs font-semibold flex items-center gap-2 shadow-md shadow-cyan-950/60 transition-all font-mono group"
            title="Launch Dynamic Moving Shadow-Block Slipstream Simulator"
          >
            <Radio className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
            <span>Shadow-Block Engine</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 uppercase font-bold">
              World 1st
            </span>
          </button>
          <button
            id="jump-to-digital-twin-btn"
            onClick={() => {
              const el = document.getElementById('corridor-digital-twin-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950/50 transition-colors font-mono"
            title="Jump to Corridor Digital Twin & Real-Time Simulator"
          >
            <Train className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Digital Twin</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 uppercase font-bold">
              Live
            </span>
          </button>
          <button
            id="jump-to-sustainability-btn"
            onClick={() => {
              const el = document.getElementById('sustainability-dashboard-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-colors font-mono"
            title="Jump to Sustainability & Carbon Reduction Dashboard"
          >
            <Leaf className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Sustainability</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 uppercase font-bold">
              Eco
            </span>
          </button>
          <button
            id="jump-to-resilience-btn"
            onClick={() => {
              const el = document.getElementById('network-resilience-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-600/60 text-sky-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950/50 transition-colors font-mono"
            title="Jump to Network Resilience & Health Monitor"
          >
            <ShieldCheck className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Network Resilience</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-200 border border-sky-400/40 uppercase font-bold">
              Health 84%
            </span>
          </button>
          <button
            id="jump-to-fleet-heatmap-btn"
            onClick={() => {
              const el = document.getElementById('fleet-health-heatmap-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-600/60 text-sky-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950/50 transition-colors font-mono"
            title="Jump to Fleet Health & Maintenance Readiness Heatmap"
          >
            <Truck className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Fleet Heatmap</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-200 border border-sky-400/40 uppercase font-bold">
              14 Assets
            </span>
          </button>
          <button
            id="jump-to-electrical-grid-btn"
            onClick={() => {
              const el = document.getElementById('electrical-grid-health-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-950/50 transition-colors font-mono"
            title="Jump to Electrical Grid Health & Traction Substation Telemetry"
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Electrical Grid</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase font-bold">
              25kV SCADA
            </span>
          </button>
          <button
            id="jump-to-department-hub-btn"
            onClick={() => {
              const el = document.getElementById('department-operations-hub-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-blue-950/90 hover:bg-blue-900 border border-blue-600/60 text-blue-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-950/50 transition-colors font-mono"
            title="Jump to Department-Wise Operations Hub"
          >
            <Layers className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Departments</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-200 border border-blue-400/40 uppercase font-bold">
              5 Depts
            </span>
          </button>
          <button
            id="jump-to-environmental-btn"
            onClick={() => {
              const el = document.getElementById('environmental-impact-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-teal-950/90 hover:bg-teal-900 border border-teal-600/60 text-teal-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-teal-950/50 transition-colors font-mono"
            title="Jump to Environmental Impact & Regional Weather Intelligence"
          >
            <CloudRain className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>Weather Impact</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-500/20 text-teal-200 border border-teal-400/40 uppercase font-bold">
              AWS Live
            </span>
          </button>
          <button
            id="jump-to-predictive-panel-btn"
            onClick={() => {
              const el = document.getElementById('predictive-maintenance-panel');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-600/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-colors font-mono"
            title="Jump to AI Predictive Maintenance & Defect Intelligence Panel"
          >
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Predictive Maintenance</span>
          </button>
          <button
            onClick={onOpenDemoWalkthrough}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-sky-700 hover:from-blue-600 hover:to-sky-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-900/40 transition-all"
          >
            <PlayCircle className="w-4 h-4 text-sky-200" />
            <span>Launch SIH Live Demo</span>
          </button>
          <button
            onClick={() => onNavigate('planning')}
            className="px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>Open AI Planning</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 9 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              onClick={() => {
                if (kpi.screen === 'resilience_anchor') {
                  const el = document.getElementById('network-resilience-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  onNavigate(kpi.screen);
                }
              }}
              className="bg-[#0e172e] p-3 rounded-lg border border-sky-950/80 hover:border-sky-700/60 cursor-pointer transition-all hover:bg-slate-800/60 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${kpi.color} group-hover:scale-110 transition-transform`} />
                <span className="text-[9px] text-slate-500 font-mono">COUNT</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-100 mt-1.5">
                {kpi.value}
              </div>
              <div className="text-[11px] font-medium text-slate-300 truncate mt-0.5">
                {kpi.label}
              </div>
              <div className="text-[9px] text-slate-500 truncate mt-0.5">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* PLANNING STATUS & DECISION ALERT */}
      <div
        className={`p-4 md:p-5 rounded-xl border transition-all ${
          isSafe
            ? 'bg-emerald-950/30 border-emerald-800/60'
            : 'bg-rose-950/30 border-rose-800/60'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
                PLANNING STATUS:
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                Optimization Completed
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isSafe
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                DECISION: {validation.decisionText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <strong>{validation.totalBlocks}</strong> Blocks Generated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <strong>{validation.validBlocks}</strong> Valid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <strong>{validation.invalidBlocks}</strong> Require Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <strong>{validation.criticalIssuesCount}</strong> Critical Issues
              </span>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              {!isSafe
                ? 'Publishing is locked. Five critical train-block overlaps must be resolved in the Conflict Center before schedule publication.'
                : 'All safety validation constraints satisfied. Schedule is validated and ready for formal publication.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isSafe ? (
              <button
                onClick={() => onNavigate('conflicts')}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Resolve {validation.criticalIssuesCount} Conflicts</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('validation')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Validated Schedule</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('timeline')}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
            >
              Inspect Timeline
            </button>
          </div>
        </div>
      </div>

      {/* NETWORK RESILIENCE & HEALTH MONITOR CARD */}
      <NetworkResilienceCard
        corridors={corridors}
        blocks={blocks}
        onNavigate={onNavigate}
        onRefreshData={onRefreshData}
      />

      {/* FLEET HEALTH & MAINTENANCE READINESS HEATMAP */}
      <FleetHealthHeatmap
        corridors={corridors}
        onNavigate={onNavigate}
        onRefreshData={onRefreshData}
      />

      {/* ELECTRICAL GRID HEALTH & TRACTION SUBSTATION TELEMETRY */}
      <ElectricalGridHealth
        corridors={corridors}
        onNavigate={onNavigate}
      />

      {/* DEPARTMENT-WISE OPERATIONS HUB & CROSS-FUNCTIONAL COORDINATION */}
      <DepartmentOperationsHub
        corridors={corridors}
        onNavigate={onNavigate}
      />

      {/* ENVIRONMENTAL IMPACT & REGIONAL WEATHER INTELLIGENCE MODULE */}
      <EnvironmentalImpactModule
        corridors={corridors}
        blocks={blocks}
        onNavigate={onNavigate}
      />

      {/* MAINTENANCE EFFICIENCY KPI DASHBOARD CARD */}
      <div id="maintenance-efficiency-kpi-card" className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
        {/* Card Header & View Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg border shrink-0 mt-0.5 transition-colors ${
              isTurnaroundBreached
                ? 'bg-rose-950/80 border-rose-700/70 text-rose-400'
                : 'bg-sky-950/80 border-sky-800/60 text-sky-400'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Maintenance Efficiency
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  RDSO KPI DASHBOARD
                </span>
                {/* Real-Time Notification Badge */}
                <span
                  id="turnaround-kpi-badge"
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1 border transition-all ${
                    isTurnaroundBreached
                      ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  }`}
                >
                  {isTurnaroundBreached ? (
                    <>
                      <BellRing className="w-3 h-3 text-rose-400 animate-bounce" />
                      <span>ALERT: TURNAROUND &gt; {turnaroundThreshold}m (+{turnaroundDiff}m OVER)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>OPTIMAL: &le;{turnaroundThreshold}m</span>
                    </>
                  )}
                </span>
                {/* Threshold Configuration Button */}
                <button
                  id="toggle-threshold-config-btn"
                  onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                  title="Configure Alert Threshold"
                >
                  <Sliders className="w-3 h-3 text-sky-400" />
                  <span>Limit: {turnaroundThreshold}m</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of average block turnaround time (minutes) and heavy resource capacity utilization (%)
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 self-start sm:self-auto text-xs font-mono">
            <button
              id="kpi-view-corridors-btn"
              onClick={() => setEfficiencyView('corridors')}
              className={`px-2.5 py-1 rounded transition-colors ${
                efficiencyView === 'corridors'
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Corridors
            </button>
            <button
              id="kpi-view-departments-btn"
              onClick={() => setEfficiencyView('departments')}
              className={`px-2.5 py-1 rounded transition-colors ${
                efficiencyView === 'departments'
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Departments
            </button>
            <button
              id="kpi-view-shifts-btn"
              onClick={() => setEfficiencyView('shifts')}
              className={`px-2.5 py-1 rounded transition-colors ${
                efficiencyView === 'shifts'
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Shifts
            </button>
          </div>
        </div>

        {/* Real-time Threshold Breach Alert Banner */}
        {isTurnaroundBreached && !isAlertDismissed && (
          <div
            id="turnaround-breach-banner"
            className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-600/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-md animate-fadeIn"
          >
            <div className="flex items-start sm:items-center gap-2.5 text-rose-200">
              <div className="p-1 rounded bg-rose-900/80 border border-rose-700 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-300 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-rose-100">
                  EFFICIENCY THRESHOLD EXCEEDED:
                </span>{' '}
                <span>
                  Current average block turnaround is <strong>{overallAvgTurnaround} min</strong>, exceeding the defined threshold of <strong>{turnaroundThreshold} min</strong> by <strong>+{turnaroundDiff}m</strong> across {breachedCorridorsCount} corridor segment{breachedCorridorsCount > 1 ? 's' : ''}.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => onNavigate('resource_allocation')}
                className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors"
              >
                Reallocate Crews
              </button>
              <button
                onClick={() => setIsAlertDismissed(true)}
                className="p-1 rounded hover:bg-rose-900/60 text-rose-300 transition-colors"
                title="Dismiss Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Threshold Configuration Drawer */}
        {showThresholdConfig && (
          <div
            id="turnaround-threshold-config-panel"
            className="p-3.5 rounded-lg bg-slate-900 border border-sky-800/60 text-xs font-mono space-y-2.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Configure Turnaround Threshold Alert</span>
              </div>
              <button
                onClick={() => setShowThresholdConfig(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Alert Threshold Limit:</span>
                  <span className="font-bold text-sky-300">{turnaroundThreshold} minutes</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="120"
                  step="5"
                  value={turnaroundThreshold}
                  onChange={(e) => {
                    setTurnaroundThreshold(Number(e.target.value));
                    setIsAlertDismissed(false);
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>60m (Strict)</span>
                  <span>75m</span>
                  <span className="text-sky-400 font-bold">90m (RDSO Standard)</span>
                  <span>105m</span>
                  <span>120m (Permissive)</span>
                </div>
              </div>
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setTurnaroundThreshold(75);
                    setIsAlertDismissed(false);
                  }}
                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                    turnaroundThreshold === 75
                      ? 'bg-sky-600 border-sky-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  75m (High Traffic)
                </button>
                <button
                  onClick={() => {
                    setTurnaroundThreshold(90);
                    setIsAlertDismissed(false);
                  }}
                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                    turnaroundThreshold === 90
                      ? 'bg-sky-600 border-sky-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  90m (RDSO Benchmark)
                </button>
                <button
                  onClick={() => {
                    setTurnaroundThreshold(100);
                    setIsAlertDismissed(false);
                  }}
                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                    turnaroundThreshold === 100
                      ? 'bg-sky-600 border-sky-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  100m (Relaxed)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4 Summary Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
            isTurnaroundBreached
              ? 'bg-rose-950/40 border-rose-600/70 shadow-sm shadow-rose-900/30'
              : 'bg-slate-900/70 border-slate-800/90'
          }`}>
            <div>
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Avg Turnaround Time</span>
                {isTurnaroundBreached ? (
                  <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${
                  isTurnaroundBreached ? 'text-rose-300' : 'text-sky-300'
                }`}>
                  {overallAvgTurnaround}
                </span>
                <span className="text-xs font-mono text-slate-400">min / block</span>
              </div>
              <div className={`mt-1 flex items-center gap-1 text-[11px] font-mono ${
                isTurnaroundBreached ? 'text-rose-400 font-bold' : 'text-emerald-400'
              }`}>
                <span>{isTurnaroundBreached ? `+${turnaroundDiff}m OVER` : `-${turnaroundDiff}m UNDER`}</span>
                <span className="text-slate-500 font-sans">{turnaroundThreshold}m threshold</span>
              </div>
            </div>

            {/* Sparkline in Tile 1 */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/70">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="text-slate-500">7-Day Trend</span>
                <span className={`flex items-center gap-0.5 font-semibold ${trendVelocityDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {trendVelocityDiff <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {trendVelocityDiff <= 0 ? `${trendVelocityDiff}m` : `+${trendVelocityDiff}m`} ({trendVelocityPct}%)
                </span>
              </div>
              <div className="h-9 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sevenDayTurnaroundTrend} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="tileTurnaroundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isTurnaroundBreached ? '#f43f5e' : '#38bdf8'} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={isTurnaroundBreached ? '#f43f5e' : '#38bdf8'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={renderSparklineTooltip} />
                    <Area
                      type="monotone"
                      dataKey="turnaroundTime"
                      stroke={isTurnaroundBreached ? '#f43f5e' : '#38bdf8'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#tileTurnaroundGrad)"
                      dot={{ r: 2, fill: isTurnaroundBreached ? '#f43f5e' : '#38bdf8' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Resource Utilization</span>
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-emerald-300">
                {overallAvgUtilization}%
              </span>
              <span className="text-xs font-mono text-slate-400">fleet capacity</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>+6.2%</span>
              <span className="text-slate-500 font-sans">vs 80% baseline</span>
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Track Handover Punctuality</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-cyan-300">
                97.6%
              </span>
              <span className="text-xs font-mono text-slate-400">on-time release</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400 truncate">
              41/42 cleared with zero overrun
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Active Machinery & Gangs</span>
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-300">
                12 / 12
              </span>
              <span className="text-xs font-mono text-slate-400">gangs mobilized</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-sky-400">
              <Zap className="w-3 h-3" />
              <span>Zero idle machine hours</span>
            </div>
          </div>
        </div>

        {/* 7-DAY BLOCK TURNAROUND TIME SPARKLINE CHART CARD */}
        <div id="seven-day-turnaround-sparkline-panel" className="bg-slate-900/60 p-4 rounded-xl border border-sky-900/50 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-950/90 border border-sky-800/80 text-sky-400 shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs md:text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
                    7-Day Trend: Block Turnaround Times
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-emerald-400" />
                    SPARKLINE ANALYSIS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Continuous multi-day turnaround performance (minutes per block) across all active corridors vs RDSO benchmark ceiling
                </p>
              </div>
            </div>

            {/* Quick KPI Stat Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">7D AVG:</span>
                <span className="font-bold text-white">{avg7DayTurnaround}m</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">BEST:</span>
                <span className="font-bold text-emerald-300">{best7DayTurnaround}m</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">PEAK:</span>
                <span className="font-bold text-amber-300">{peak7DayTurnaround}m</span>
              </div>
              <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1 font-bold ${
                trendVelocityDiff <= 0
                  ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-700/70 text-rose-300'
              }`}>
                {trendVelocityDiff <= 0 ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingUp className="w-3.5 h-3.5 text-rose-400" />}
                <span>{trendVelocityDiff <= 0 ? `${trendVelocityDiff}m` : `+${trendVelocityDiff}m`} ({trendVelocityPct}%)</span>
              </div>
            </div>
          </div>

          {/* Sparkline Graphic Visualization with Threshold Reference */}
          <div className="bg-[#0b1329]/80 p-3 rounded-lg border border-slate-800/90">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span>7-Day Block Turnaround (Rolling Duration)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-dashed" />
                  <span>Target Limit: {turnaroundThreshold}m</span>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 font-sans">{total7DayBlocks} Total Blocks Executed</span>
              </span>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sevenDayTurnaroundTrend}
                  margin={{ top: 12, right: 18, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="turnaroundSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    domain={[60, 100]}
                    unit="m"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={renderSparklineTooltip} />
                  <ReferenceLine
                    y={turnaroundThreshold}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Target (${turnaroundThreshold}m)`,
                      position: 'insideTopRight',
                      fill: '#f43f5e',
                      fontSize: 10,
                      fontFamily: 'monospace',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="turnaroundTime"
                    name="Turnaround Time"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#turnaroundSparklineGradient)"
                    dot={{ r: 4, fill: '#38bdf8', stroke: '#0b1329', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7-Day Day-by-Day Historical Breakdown Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-0.5">
            {sevenDayTurnaroundTrend.map((item, idx) => {
              const isToday = idx === sevenDayTurnaroundTrend.length - 1;
              const isUnderTarget = item.turnaroundTime <= turnaroundThreshold;
              const delta = turnaroundThreshold - item.turnaroundTime;
              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isToday
                      ? 'bg-sky-950/70 border-sky-500/80 shadow-md shadow-sky-950/50 ring-1 ring-sky-400/50'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate">{item.date}</span>
                    {isToday ? (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500 text-slate-950 font-bold uppercase tracking-wider">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-slate-500">{item.day}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-center gap-0.5">
                    <span className="text-base font-black font-mono text-white">
                      {item.turnaroundTime}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">min</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono font-semibold">
                    <span className={isUnderTarget ? 'text-emerald-400' : 'text-rose-400'}>
                      {isUnderTarget ? `-${delta}m` : `+${Math.abs(delta)}m`}
                    </span>
                    <span className="text-[9px] text-slate-500 font-sans">
                      {isUnderTarget ? 'under' : 'over'}
                    </span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>{item.completedBlocks} blks</span>
                    <span className="text-cyan-300 font-semibold">{item.punctuality}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recharts Composed Chart Visualization */}
        <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono font-semibold text-slate-300">
                {efficiencyView === 'corridors' && 'Corridor Turnaround Time (min) vs Resource Utilization (%)'}
                {efficiencyView === 'departments' && 'Departmental Turnaround Time (min) vs Resource Utilization (%)'}
                {efficiencyView === 'shifts' && 'Shift Window Turnaround Time (min) vs Resource Utilization (%)'}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80 font-mono hidden md:inline-flex items-center gap-1">
                <ArrowUpRight className="w-2.5 h-2.5" />
                Click bar to inspect resource fleet
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              PRIMARY AXIS (LEFT): MINUTES | SECONDARY AXIS (RIGHT): UTILIZATION %
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={currentEfficiencyData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    handleEfficiencyBarClick(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  yAxisId="left"
                  stroke="#38bdf8"
                  fontSize={11}
                  domain={[0, 130]}
                  unit="m"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip content={renderCustomEfficiencyTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={turnaroundThreshold}
                  stroke={isTurnaroundBreached ? '#f43f5e' : '#ef4444'}
                  strokeDasharray="4 4"
                  strokeWidth={isTurnaroundBreached ? 2 : 1}
                  label={{
                    value: `Threshold: ${turnaroundThreshold}m ${isTurnaroundBreached ? '(BREACHED)' : ''}`,
                    fill: isTurnaroundBreached ? '#fb7185' : '#f87171',
                    position: 'insideTopLeft',
                    fontSize: 10,
                    fontWeight: isTurnaroundBreached ? 700 : 400,
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: 'Target Util: 80%', fill: '#34d399', position: 'insideTopRight', fontSize: 10 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="turnaroundTime"
                  name="Avg Block Turnaround Time (min)"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  cursor="pointer"
                  onClick={(entry: any) => handleEfficiencyBarClick(entry)}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilization"
                  name="Resource Utilization (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#10b981', stroke: '#0e172e', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#34d399', cursor: 'pointer' }}
                  cursor="pointer"
                  onClick={(entry: any) => handleEfficiencyBarClick(entry?.payload || entry)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insight & Quick Action Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            {efficiencyView === 'corridors' && (
              <span>
                <strong>C002</strong> delivers fastest turnaround (65m) via 09-3X tamping; <strong>C003</strong> maximizes freight machine utilization at 94%.
              </span>
            )}
            {efficiencyView === 'departments' && (
              <span>
                <strong>S&T</strong> achieves lowest turnaround (62m); <strong>Civil Engineering</strong> leads fleet machine utilization (89%).
              </span>
            )}
            {efficiencyView === 'shifts' && (
              <span>
                <strong>Night Window</strong> allocates 95% fleet capacity during low-traffic hours for uninterrupted heavy track renewal.
              </span>
            )}
          </p>

          <div className="flex items-center gap-2 shrink-0 font-mono">
            <button
              id="kpi-jump-to-risk-btn"
              onClick={() => {
                const el = document.getElementById('risk-prediction-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800/70 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Radar className="w-3.5 h-3.5 animate-pulse" />
              <span>Risk Radar ({highRiskCount} Alert{highRiskCount > 1 ? 's' : ''})</span>
            </button>
            <button
              id="kpi-nav-resources-btn"
              onClick={() => onNavigate('resource_allocation')}
              className="px-3 py-1.5 rounded bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
            >
              <span>Resource Allocation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="kpi-nav-timeline-btn"
              onClick={() => onNavigate('timeline')}
              className="px-3 py-1.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
            >
              <span>Block Timeline</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC MOVING "SHADOW-BLOCK" SLIPSTREAM BANNER */}
      <div className="bg-gradient-to-r from-[#061226] via-[#091b38] to-[#071329] p-5 rounded-2xl border border-cyan-500/50 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/80 shrink-0">
            <Radio className="w-6 h-6 animate-pulse text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-extrabold text-base tracking-wide">
                DYNAMIC MOVING "SHADOW-BLOCK" SLIPSTREAM ENGINE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 uppercase tracking-wider">
                WORLD-FIRST FEATURE
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Eliminates static geographic track shutdowns. Injects self-propelled USFD Ultrasonic & OHE Laser inspection cars directly into the moving headway envelope between high-speed scheduled trains with Kavach SIL-4 automated siding egress.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-cyan-400/90 pt-1 flex-wrap">
              <span>✓ 0 Min Train Detention</span>
              <span>✓ Live Kinematic Headway Physics</span>
              <span>✓ Automated Siding Docking</span>
              <span>✓ RDSO Form T/A-912-MB Verified</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0 self-end md:self-center">
          <button
            id="launch-shadow-block-simulator-btn"
            onClick={() => onNavigate('shadow_block')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl shadow-cyan-950/60 transition-all font-mono"
          >
            <Radio className="w-4 h-4" />
            <span>Launch Slipstream Simulator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI-DRIVEN PREDICTIVE MAINTENANCE INSIGHT PANEL */}
      <PredictiveMaintenancePanel
        requests={requests}
        defects={defects}
        onNavigate={onNavigate}
        onRefreshData={onRefreshData}
      />

      {/* RISK PREDICTION & FUTURE CONFLICT FORECASTING SECTION */}
      <div id="risk-prediction-section" className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-400 shrink-0 mt-0.5">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Risk Prediction & Conflict Forecaster
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/60 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  PREDICTIVE CONFLICT RADAR
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  BASED ON HISTORICAL MAINTENANCE DELAYS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Machine learning model projecting downstream rail conflicts based on track overhaul overrun statistics, OHE earthing buffers, and interlocking clearance times.
              </p>
            </div>
          </div>

          {/* Quick Summary Pill Badges */}
          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <div className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-800/70 text-rose-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span><strong>{highRiskCount}</strong> High Risk</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800/70 text-amber-300">
              <span><strong>{mediumRiskCount}</strong> Medium</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/70 text-emerald-300">
              <span><strong>{lowRiskCount}</strong> Low</span>
            </div>
          </div>
        </div>

        {/* 4 Risk KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>High Risk Overruns</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-rose-300">
                {highRiskCount}
              </span>
              <span className="text-xs font-mono text-slate-400">blocks</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-rose-400">
              Requires pre-emptive safety buffer
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Avg Forecast Overrun</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-300">
                +{avgForecastOverrun}
              </span>
              <span className="text-xs font-mono text-slate-400">minutes / block</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              Over scheduled duration baseline
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Most Vulnerable Train</span>
              <Train className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-sm font-bold font-mono text-sky-200 truncate">
                TR106 Vande Bharat
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-amber-400 truncate">
              C003 Shakurbasti corridor slot
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Conflict Prevention Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-emerald-300">
                88.5%
              </span>
              <span className="text-xs font-mono text-slate-400">forecast confidence</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-emerald-400">
              Trained on 1,420 historical work logs
            </div>
          </div>
        </div>

        {/* Controls: Search, Filter Tabs & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by severity */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-1.5 font-bold">SEVERITY:</span>
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRiskSeverityFilter(filter)}
                  className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                    riskSeverityFilter === filter
                      ? filter === 'HIGH'
                        ? 'bg-rose-600 text-white font-bold'
                        : filter === 'MEDIUM'
                        ? 'bg-amber-600 text-white font-bold'
                        : filter === 'LOW'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={riskSearchQuery}
                onChange={(e) => setRiskSearchQuery(e.target.value)}
                placeholder="Search Block, Corridor, or Train..."
                className="bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-sky-500 w-56 font-mono placeholder:text-slate-600"
              />
              {riskSearchQuery && (
                <button
                  onClick={() => setRiskSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono">
            <span className="text-slate-500 text-[11px]">
              Showing {filteredRiskPredictions.length} of {riskPredictions.length} blocks
            </span>
            <button
              onClick={() => onNavigate('conflicts')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center gap-1 transition-colors text-[11px]"
            >
              <span>View Active Conflicts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Forecasted Risk Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-400 sticky top-0 z-10 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">Block ID & Dept</th>
                  <th className="p-2.5">Corridor & Section</th>
                  <th className="p-2.5">Schedule vs Proj. End</th>
                  <th className="p-2.5">Hist. Overrun</th>
                  <th className="p-2.5">Risk Score</th>
                  <th className="p-2.5">Downstream Conflict Forecast</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {filteredRiskPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 italic font-sans text-xs">
                      No maintenance blocks match the selected risk filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRiskPredictions.map((pred) => (
                    <React.Fragment key={pred.blockId}>
                      <tr
                        onClick={() =>
                          setSelectedRiskBlockId(
                            selectedRiskBlockId === pred.blockId ? null : pred.blockId
                          )
                        }
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          selectedRiskBlockId === pred.blockId
                            ? 'bg-sky-950/30 border-l-2 border-sky-400'
                            : ''
                        }`}
                      >
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">{pred.blockId}</span>
                            {pred.hasExistingConflict && (
                              <span
                                title="Block currently flagged with active conflict"
                                className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] border border-rose-700"
                              >
                                CONFLICT
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{pred.department}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="text-slate-200 font-semibold">{pred.corridorId}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {pred.section}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="text-slate-300">{pred.scheduledTime}</div>
                          <div className="text-[10px] text-amber-400">
                            Proj: ~{pred.projectedEndTime}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-amber-300">
                            +{pred.projectedOverrunMinutes}m
                          </span>
                          <div className="text-[10px] text-slate-500">hist. avg delay</div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  pred.riskLevel === 'HIGH'
                                    ? 'bg-rose-500'
                                    : pred.riskLevel === 'MEDIUM'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pred.riskScore}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                pred.riskLevel === 'HIGH'
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                  : pred.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                              }`}
                            >
                              {pred.riskScore}% {pred.riskLevel}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="text-slate-200 truncate max-w-[200px]" title={pred.forecastedImpact}>
                            {pred.downstreamVulnerableTrain}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={pred.primaryRiskFactor}>
                            {pred.primaryRiskFactor}
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRiskBlockId(
                                selectedRiskBlockId === pred.blockId ? null : pred.blockId
                              );
                            }}
                            className="text-sky-400 hover:text-sky-300 text-[11px] underline"
                          >
                            {selectedRiskBlockId === pred.blockId ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Block Risk Diagnostic Details */}
                      {selectedRiskBlockId === pred.blockId && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={7} className="p-3.5 border-t border-b border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                                  Historical Root-Cause Profile
                                </span>
                                <p className="text-xs text-slate-200">
                                  {pred.primaryRiskFactor}
                                </p>
                                <div className="text-[10px] text-slate-400 pt-1">
                                  Historical Overrun Likelihood:{' '}
                                  <span className="text-amber-400 font-bold">
                                    {Math.round(
                                      (historicalDelayFactors[pred.department]?.overrunProbability ||
                                        0.45) * 100
                                    )}
                                    %
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-rose-400 uppercase tracking-wide block flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Forecasted Conflict Impact
                                </span>
                                <p className="text-xs text-rose-200">
                                  {pred.forecastedImpact}
                                </p>
                                <div className="text-[10px] text-slate-400 pt-1">
                                  Target Train:{' '}
                                  <span className="text-slate-200 font-bold">
                                    {pred.downstreamVulnerableTrain}
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-emerald-400 uppercase tracking-wide block flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  AI Suggested Mitigation
                                </span>
                                <p className="text-xs text-emerald-200">
                                  {pred.recommendedAction}
                                </p>
                                <div className="pt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => onNavigate('planning')}
                                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition-colors"
                                  >
                                    Adjust in AI Planner
                                  </button>
                                  <button
                                    onClick={() => onNavigate('conflicts')}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] transition-colors"
                                  >
                                    Conflict Matrix
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Footer Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Proactive buffer allocation prevents 88.5% of real-time track handback disputes and eliminates consequential passenger express deceleration.
            </span>
          </div>
          <button
            onClick={() => onNavigate('planning')}
            className="text-sky-400 hover:text-sky-300 underline shrink-0 font-bold self-start sm:self-auto"
          >
            Launch Conflict-Free Optimization →
          </button>
        </div>
      </div>

      {/* BEFORE vs AFTER ARCHITECTURE DIAGRAM */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Operational Transformation: BEFORE vs AFTER RAILSYNC
            </h3>
            <p className="text-[11px] text-slate-400">
              Shift from uncoordinated department silos to automated constraint-aware scheduling
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
            SIH ARCHITECTURE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* BEFORE CARD */}
          <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-300 font-mono uppercase tracking-wide">
                BEFORE (Manual & Siloed)
              </span>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                23 CONFLICTS
              </span>
            </div>

            <div className="flex flex-col space-y-2 font-mono text-[11px] text-slate-300">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span>35 Block Requests</span>
                <span className="text-slate-500">Department Silos</span>
              </div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span>Independent Planning</span>
                <span className="text-slate-500">Phone Calls / WhatsApp</span>
              </div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2 rounded bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-center justify-between font-bold">
                <span>23 Initial Conflicts</span>
                <span>High Delay & Risk</span>
              </div>
            </div>
          </div>

          {/* AFTER CARD */}
          <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 font-mono uppercase tracking-wide">
                AFTER (RAILSYNC AI Planning)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                SAFE & CONTROLLED
              </span>
            </div>

            <div className="flex flex-col space-y-1 font-mono text-[10px] text-slate-200">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  1. Priority Analysis
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  2. Constraint Matching
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  3. Slot Optimization
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-sky-300">
                  4. Train Conflict Detection
                </div>
              </div>
              <div className="text-center text-slate-500 text-xs">↓</div>
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 flex items-center justify-between font-bold text-[11px]">
                <span>Automated Conflict Resolution & Final Safety Gate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORRIDOR DIGITAL TWIN & REAL-TIME DISPATCH SIMULATOR MODULE */}
      <CorridorDigitalTwin corridors={corridors} onNavigate={onNavigate} />

      {/* SUSTAINABILITY & DECARBONIZATION DASHBOARD MODULE */}
      <SustainabilityDashboard onNavigate={onNavigate} />

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Task Priority Distribution */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Task Priority Breakdown (60 Tasks)
            </h4>
            <span className="text-[10px] font-mono text-slate-400">MAINTENANCE TASKS</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Corridor Workload & Capacity */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Corridor Slot Workload (48 Total Slots)
            </h4>
            <span className="text-[10px] font-mono text-slate-400">CLICK BAR TO VIEW RESOURCES</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={corridorWorkloadData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const cName = e.activePayload[0].payload.name;
                    onNavigate('resource_allocation', {
                      corridorId: cName,
                      tab: 'MACHINERY',
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar
                  dataKey="scheduled"
                  fill="#38bdf8"
                  name="Scheduled Blocks"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
                <Bar
                  dataKey="available"
                  fill="#334155"
                  name="Available Capacity"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Conflict Distribution */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Active Validation Conflicts by Corridor
            </h4>
            <span className="text-[10px] font-mono text-rose-400">5 CRITICAL ISSUES</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conflictDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Bar dataKey="conflicts" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Block Validation Readiness */}
        <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Block Validation Ratio (42 Blocks)
            </h4>
            <span className="text-[10px] font-mono text-slate-400">SAFETY GATE</span>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={blockStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {blockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
