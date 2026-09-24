import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Users,
  HardHat,
  Wrench,
  Clock,
  MapPin,
  FileText,
  Download,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Cpu,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Table,
  LayoutGrid,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { DailyForecastPoint, Corridor, DepartmentType } from '../../types';
import {
  resourceForecastService,
  DayContributingTask,
} from '../../services/resourceForecastService';
import { DayTasksSortableTable } from './DayTasksSortableTable';

interface ForecastDayDetailSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayPoint: DailyForecastPoint | null;
  corridors?: Corridor[];
  onMobilizeReserveGang?: (count: number) => void;
  onSelectShiftDay?: (dayNumber: number, dateStr: string) => void;
  onOpenManualAdjustment?: (dayNumber: number) => void;
}

export const ForecastDayDetailSidePanel: React.FC<ForecastDayDetailSidePanelProps> = ({
  isOpen,
  onClose,
  dayPoint,
  corridors = [],
  onMobilizeReserveGang,
  onSelectShiftDay,
  onOpenManualAdjustment,
}) => {
  const [activeTab, setActiveTab] = useState<'TABLE' | 'CARDS' | 'STAFFING' | 'DRIVERS'>('TABLE');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'DEFICIT_ONLY' | 'ENGINEERING' | 'S&T' | 'TRACTION'>('ALL');
  const [hasMobilized, setHasMobilized] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset mobilization state when dayPoint changes
  useEffect(() => {
    setHasMobilized(false);
  }, [dayPoint?.dayNumber, dayPoint?.date]);

  // Compute contributing tasks for this day
  const contributingTasks: DayContributingTask[] = useMemo(() => {
    if (!dayPoint) return [];
    return resourceForecastService.getDayContributingTasks(dayPoint);
  }, [dayPoint]);

  // Corridor details
  const corridor = useMemo(() => {
    if (!dayPoint) return null;
    return corridors.find((c) => c.id === dayPoint.targetCorridorId);
  }, [dayPoint, corridors]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return contributingTasks.filter((t) => {
      if (taskFilter === 'DEFICIT_ONLY') return t.isDeficitContributor;
      if (taskFilter === 'ENGINEERING') return t.department === 'ENGINEERING';
      if (taskFilter === 'S&T') return t.department === 'S&T';
      if (taskFilter === 'TRACTION') return t.department === 'TRACTION';
      return true;
    });
  }, [contributingTasks, taskFilter]);

  const deficitTasksCount = useMemo(() => {
    return contributingTasks.filter((t) => t.isDeficitContributor).length;
  }, [contributingTasks]);

  if (!isOpen || !dayPoint) {
    return null;
  }

  const isDeficit = dayPoint.manpowerDeficit > 0;
  const isSevere = dayPoint.manpowerDeficit >= 15;
  const deficitPct = dayPoint.manpowerAvailable > 0
    ? Math.round((dayPoint.manpowerDeficit / dayPoint.manpowerAvailable) * 100)
    : 0;

  // Handle CSV export of day tasks
  const handleExportTasksCsv = () => {
    const csv = resourceForecastService.exportDayTasksCsv(dayPoint, contributingTasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `IR_Day${dayPoint.dayNumber}_${dayPoint.date}_Contributing_Tasks_Roster.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMobilize = () => {
    if (onMobilizeReserveGang && dayPoint.manpowerDeficit > 0) {
      onMobilizeReserveGang(dayPoint.manpowerDeficit);
      setHasMobilized(true);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side-panel container */}
      <aside
        id="forecast-day-side-panel"
        className="fixed inset-y-0 right-0 w-full max-w-4xl lg:max-w-5xl bg-[#090e1f] border-l border-slate-700/80 shadow-2xl z-50 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300 ease-out font-sans text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label={`Forecast Deficit Breakdown for Day ${dayPoint.dayNumber}`}
      >
        {/* PANEL HEADER */}
        <div className="p-5 border-b border-slate-800 bg-[#0c142b]/95 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono text-[10px] font-bold uppercase tracking-wider">
                Day {dayPoint.dayNumber} of 30 Forecast
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                {dayPoint.dayOfWeek} · {dayPoint.date}
              </span>
              {dayPoint.isManualOverride && (
                <span className="px-2.5 py-0.5 rounded bg-amber-900/70 text-amber-300 border border-amber-600/60 font-mono text-[10px] font-bold flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  <span>PLANNER OVERRIDE</span>
                </span>
              )}
              {isDeficit ? (
                <span
                  className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 ${
                    isSevere
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    DEFICIT: -{dayPoint.manpowerDeficit} STAFF ({deficitPct}%)
                  </span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>CAPACITY BALANCED (+{dayPoint.manpowerAvailable - dayPoint.manpowerRequired} Reserve)</span>
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Shift Detail: {dayPoint.displayDate} ({dayPoint.dayOfWeek})</span>
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Corridor: <strong className="text-slate-200">{corridor?.name || dayPoint.targetCorridorId}</strong>{' '}
                <span className="font-mono text-sky-400">({dayPoint.targetCorridorId})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenManualAdjustment && (
              <button
                type="button"
                onClick={() => onOpenManualAdjustment(dayPoint.dayNumber)}
                className="btn-manual-override-day flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md border border-blue-400/40 transition-all active:scale-95"
                title="Override forecast counts and trigger conflict recalculation"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Override Day</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP METRICS SUMMARY BANNER */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#070c1b] border-b border-slate-800 text-xs">
          {/* Manpower Gauge */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-medium text-[11px]">Staffing Demand</span>
              <Users className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white font-mono">{dayPoint.manpowerRequired}</span>
              <span className="text-slate-400 text-[11px] font-mono">/ {dayPoint.manpowerAvailable} avail</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isDeficit ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (dayPoint.manpowerRequired / Math.max(1, dayPoint.manpowerAvailable)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Machinery Units Gauge */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-medium text-[11px]">Machine Slots</span>
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-300 font-mono">{dayPoint.machinerySlotsRequired}</span>
              <span className="text-slate-400 text-[11px] font-mono">/ {dayPoint.machinerySlotsAvailable} slots</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-mono">
              {dayPoint.machineryDeficit > 0 ? (
                <span className="text-rose-400 font-bold">-{dayPoint.machineryDeficit} slot shortage</span>
              ) : (
                <span className="text-emerald-400">Slots fully allocated</span>
              )}
            </div>
          </div>

          {/* Cyclical Seasonality Prior Month Gauge */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-medium text-[11px]">Prior Month (MoM)</span>
              <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-purple-300 font-mono">
                {dayPoint.previousPeriodManpowerRequired || '—'}
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                req ({dayPoint.previousPeriodDisplayDate || 'Prior Cycle'})
              </span>
            </div>
            <div className="mt-2 text-[10px] font-mono flex items-center justify-between">
              <span className="text-slate-400">Cyclical Delta:</span>
              <span
                className={`font-bold ${
                  (dayPoint.seasonalityVariancePct || 0) >= 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {(dayPoint.seasonalityVariancePct || 0) >= 0 ? '+' : ''}
                {dayPoint.seasonalityVariancePct}%
              </span>
            </div>
          </div>

          {/* Risk & Root Driver */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-medium text-[11px]">Risk Profile</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  dayPoint.riskLevel === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : dayPoint.riskLevel === 'HIGH'
                    ? 'bg-orange-950 text-orange-300 border border-orange-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {dayPoint.riskLevel} CONGESTION
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate" title={dayPoint.primaryAgingDriver}>
              {dayPoint.primaryAgingDriver.split('(')[0]}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center px-5 border-b border-slate-800 bg-[#090e1f] text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'TABLE'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tasks & Gangs Data Table ({contributingTasks.length})</span>
            {deficitTasksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                {deficitTasksCount} Short
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CARDS')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'CARDS'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Task Cards</span>
          </button>

          <button
            onClick={() => setActiveTab('STAFFING')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'STAFFING'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staffing Requirements</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'DRIVERS'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>IRTMM Deficit Causes</span>
          </button>
        </div>

        {/* SCROLLABLE TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: SORTABLE DATA TABLE OF INDIVIDUAL MAINTENANCE TASKS, ASSIGNED GANGS & MACHINE HOURS */}
          {activeTab === 'TABLE' && (
            <DayTasksSortableTable
              tasks={contributingTasks}
              dayPoint={dayPoint}
              onMobilizeReserveGang={handleMobilize}
            />
          )}

          {/* TAB 2: DETAILED TASK CARDS VIEW */}
          {activeTab === 'CARDS' && (
            <div className="space-y-4">
              {/* Task Filter Chips */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setTaskFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      taskFilter === 'ALL'
                        ? 'bg-sky-600 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Tasks ({contributingTasks.length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('DEFICIT_ONLY')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                      taskFilter === 'DEFICIT_ONLY'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-rose-950/40 text-rose-300 border border-rose-900/60 hover:bg-rose-950/80'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Deficit Drivers ({deficitTasksCount})</span>
                  </button>
                  <button
                    onClick={() => setTaskFilter('ENGINEERING')}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      taskFilter === 'ENGINEERING'
                        ? 'bg-sky-700 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    P-Way ({contributingTasks.filter((t) => t.department === 'ENGINEERING').length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('S&T')}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      taskFilter === 'S&T'
                        ? 'bg-purple-700 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S&T ({contributingTasks.filter((t) => t.department === 'S&T').length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('TRACTION')}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      taskFilter === 'TRACTION'
                        ? 'bg-amber-700 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TRD ({contributingTasks.filter((t) => t.department === 'TRACTION').length})
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  {filteredTasks.length} task(s) on Day {dayPoint.dayNumber}
                </span>
              </div>

              {/* Task Cards List */}
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const deptColors = {
                    ENGINEERING: 'bg-sky-950/80 border-sky-800 text-sky-300',
                    'S&T': 'bg-purple-950/80 border-purple-800 text-purple-300',
                    TRACTION: 'bg-amber-950/80 border-amber-800 text-amber-300',
                    OPERATIONS: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
                    SAFETY: 'bg-teal-950/80 border-teal-800 text-teal-300',
                  };

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all ${
                        task.isDeficitContributor
                          ? 'bg-gradient-to-br from-[#1b101c] via-[#161021] to-[#0c0f20] border-rose-800/80 shadow-md shadow-rose-950/20'
                          : 'bg-[#0d1428] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {task.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              deptColors[task.department]
                            }`}
                          >
                            {task.department}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              task.priority === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {task.assetId} · {task.section}
                          </span>
                        </div>

                        {task.isDeficitContributor && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Deficit Contributor (-{task.staffShortfall})</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-slate-100 mb-1 leading-snug">
                        {task.title}
                      </h4>

                      {/* Schedule Window & Asset */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-3">
                        <span className="flex items-center gap-1 text-sky-400">
                          <Clock className="w-3 h-3" />
                          <span>{task.timeSlot}</span>
                        </span>
                        <span>·</span>
                        <span className="text-slate-300">{task.assetName}</span>
                      </div>

                      {/* Deficit Warning Banner */}
                      {task.isDeficitContributor ? (
                        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-900/80 text-rose-200 text-[11px] mb-3 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold block text-rose-300">
                              STAFFING SHORTAGE IMPACT: -{task.staffShortfall} Gang Staff
                            </span>
                            <p className="text-rose-200/90">{task.deficitContributionReason}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 text-[11px] mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{task.deficitContributionReason}</span>
                        </div>
                      )}

                      {/* Staffing Breakdown for this specific task */}
                      <div className="bg-[#080d1e] p-3 rounded-lg border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Task Staffing Required:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {task.allocatedStaff} allocated / <span className="text-sky-300">{task.requiredStaff.total} required</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">P-Way Trackmen</span>
                            <span className="text-sky-300 font-bold">{task.requiredStaff.trackmen}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">Signal Techs</span>
                            <span className="text-purple-300 font-bold">{task.requiredStaff.signalTechs}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">OHE Linesmen</span>
                            <span className="text-amber-300 font-bold">{task.requiredStaff.oheLinesmen}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[9px]">Lookouts & Flags</span>
                            <span className="text-emerald-300 font-bold">{task.requiredStaff.safetyLookouts}</span>
                          </div>
                        </div>

                        {/* Assigned Gangs */}
                        {task.assignedGangs && task.assignedGangs.length > 0 && (
                          <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-mono font-bold text-sky-400 flex items-center gap-1">
                              <HardHat className="w-3 h-3" />
                              <span>Assigned Maintenance Gang(s):</span>
                            </div>
                            <div className="space-y-1">
                              {task.assignedGangs.map((gang) => (
                                <div key={gang.id} className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-slate-200 font-semibold">{gang.name}</span>
                                  <span className="text-slate-400">
                                    Lead: <strong className="text-amber-300">{gang.lead}</strong> ({gang.assignedCount} staff)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Machinery & Regulatory rule */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 text-amber-400 flex-wrap">
                            <Wrench className="w-3 h-3" />
                            <span>Machines ({task.machineryHours}h):</span>
                            {task.requiredMachinery.map((m, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/80">
                                {m}
                              </span>
                            ))}
                          </div>

                          <div className="text-slate-400 text-[10px]">
                            Rule: <span className="text-indigo-300">{task.statutoryRule}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED STAFFING REQUIREMENTS BY DISCIPLINE */}
          {activeTab === 'STAFFING' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Trade-by-Trade Staffing Allocation Matrix</span>
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  IRTMM and Indian Railways Track Machine Manual mandates specific certified gang compositions for heavy maintenance possessions.
                  Below is the trade breakdown contributing to Day {dayPoint.dayNumber} staffing pressure:
                </p>
              </div>

              {/* Trade breakdown cards */}
              <div className="space-y-3">
                {/* P-Way Trackmen */}
                <div className="p-4 rounded-xl bg-[#0d1428] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Permanent Way Division</span>
                      <h4 className="text-sm font-bold text-white">P-Way Gang Trackmen & Keymen</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-sky-300 font-mono">{dayPoint.trackmenRequired}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">Personnel Required</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dayPoint.trackmenRequired / (dayPoint.manpowerRequired || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Share of Daily Demand: {Math.round((dayPoint.trackmenRequired / (dayPoint.manpowerRequired || 1)) * 100)}%</span>
                    <span className="text-slate-300">Roles: Tie tamping support, ballast boxing, CWR destressing</span>
                  </div>
                </div>

                {/* S&T Signal Technicians */}
                <div className="p-4 rounded-xl bg-[#0d1428] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Signalling & Telecomm</span>
                      <h4 className="text-sm font-bold text-white">S&T Signal Technicians (ESM / JE Signal)</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-purple-300 font-mono">{dayPoint.signalTechsRequired}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">Personnel Required</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dayPoint.signalTechsRequired / (dayPoint.manpowerRequired || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Share of Daily Demand: {Math.round((dayPoint.signalTechsRequired / (dayPoint.manpowerRequired || 1)) * 100)}%</span>
                    <span className="text-slate-300">Roles: Point machine motor test, track circuit impedance testing</span>
                  </div>
                </div>

                {/* TRD OHE Linesmen */}
                <div className="p-4 rounded-xl bg-[#0d1428] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Traction Distribution</span>
                      <h4 className="text-sm font-bold text-white">TRD 25kV OHE Linesmen & Fitters</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-amber-300 font-mono">{dayPoint.oheLinesmenRequired}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">Personnel Required</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dayPoint.oheLinesmenRequired / (dayPoint.manpowerRequired || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Share of Daily Demand: {Math.round((dayPoint.oheLinesmenRequired / (dayPoint.manpowerRequired || 1)) * 100)}%</span>
                    <span className="text-slate-300">Roles: Catenary height adjustment, discharge earthing protection</span>
                  </div>
                </div>

                {/* Safety Lookouts & Flagmen */}
                <div className="p-4 rounded-xl bg-[#0d1428] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Statutory Safety Protocol</span>
                      <h4 className="text-sm font-bold text-white">Safety Lookouts & Banner Flagmen</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-300 font-mono">{dayPoint.safetyLookoutsRequired}</span>
                      <span className="text-slate-400 text-[10px] block font-mono">Personnel Required</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dayPoint.safetyLookoutsRequired / (dayPoint.manpowerRequired || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Share of Daily Demand: {Math.round((dayPoint.safetyLookoutsRequired / (dayPoint.manpowerRequired || 1)) * 100)}%</span>
                    <span className="text-emerald-300 font-semibold">Mandatory under G&SR Para 15.06 (Cannot be reduced)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROOT CAUSES & IRTMM STATUTORY DRIVERS */}
          {activeTab === 'DRIVERS' && (
            <div className="space-y-4">
              {/* Primary Aging Driver Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Aging Infrastructure Cycle Milestone</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px]">
                    Statutory Cycle
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{dayPoint.primaryAgingDriver}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Triggered by accumulated gross million tonnes (GMT) or statutory time thresholds under IRTMM & IRBM rules.
                  Postponing this activity causes safety speed restriction (PSR) imposition.
                </p>
              </div>

              {/* Cyclical Seasonality Driver Card */}
              {dayPoint.seasonalityDriver && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/90 border border-purple-800/70 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-mono uppercase text-purple-300 font-bold flex items-center gap-1">
                      <RotateCcw className="w-3 h-3 text-purple-400" />
                      <span>Cyclical Seasonality Pattern (30-Day MoM Benchmark)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-600/80 font-mono text-[10px] font-semibold">
                      Prior: {dayPoint.previousPeriodDisplayDate} ({dayPoint.previousPeriodDayOfWeek})
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{dayPoint.seasonalityDriver}</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Prior monthly cycle demanded <strong className="text-purple-300">{dayPoint.previousPeriodManpowerRequired} personnel</strong> versus current forecast of <strong className="text-sky-300">{dayPoint.manpowerRequired} personnel</strong> (a {(dayPoint.seasonalityVariancePct || 0) >= 0 ? '+' : ''}{dayPoint.seasonalityVariancePct}% cyclical variance). This highlights maintenance seasonality transitions between late-monsoon drainage / catenary moisture flashovers and dry-season mechanized tamping possession runs.
                  </p>
                </div>
              )}

              {/* Recurring Defect Pattern Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Recurring Defect Cluster Driver</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono text-[10px]">
                    Condition Alert
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{dayPoint.primaryDefectDriver}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Detected via track recording car (TRC) run, ultrasonic flaw detection (USFD), or thermal scanning.
                  Demands dedicated specialized teams and immediate safety possessory possession.
                </p>
              </div>

              {/* Recommended Action Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/80 space-y-2">
                <span className="text-[10px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Recommended Planner Resolution</span>
                </span>
                <p className="text-sm text-slate-100 font-semibold leading-relaxed">
                  {dayPoint.recommendedAction}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-[#0c142b] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTasksCsv}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Day Contributing Tasks Roster as CSV"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Day Tasks (CSV)</span>
            </button>

            {onSelectShiftDay && (
              <button
                onClick={() => {
                  onSelectShiftDay(dayPoint.dayNumber, dayPoint.date);
                  onClose();
                }}
                className="px-3 py-2 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jump to Day {dayPoint.dayNumber}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDeficit && onMobilizeReserveGang && (
              <button
                onClick={handleMobilize}
                disabled={hasMobilized}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                  hasMobilized
                    ? 'bg-emerald-700 text-white cursor-default'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60'
                }`}
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>
                  {hasMobilized
                    ? `Dispatched +${dayPoint.manpowerDeficit} Reserve`
                    : `Mobilize +${dayPoint.manpowerDeficit} Reserve Staff`}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
