import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Wrench,
  Users,
  HardHat,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Zap,
  MapPin,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import {
  DayContributingTask,
  AssignedGangInfo,
  TaskMachineryRequirement,
} from '../../services/resourceForecastService';
import { DailyForecastPoint, DepartmentType } from '../../types';

export type SortField =
  | 'id'
  | 'title'
  | 'department'
  | 'priority'
  | 'staffShortfall'
  | 'staffRequired'
  | 'allocatedStaff'
  | 'machineryHours'
  | 'timeSlot'
  | 'primaryGang';

export type SortDirection = 'asc' | 'desc';

interface DayTasksSortableTableProps {
  tasks: DayContributingTask[];
  dayPoint: DailyForecastPoint;
  onMobilizeReserveGang?: (count: number) => void;
}

export const DayTasksSortableTable: React.FC<DayTasksSortableTableProps> = ({
  tasks,
  dayPoint,
  onMobilizeReserveGang,
}) => {
  const [sortField, setSortField] = useState<SortField>('staffShortfall');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<'ALL' | DepartmentType>('ALL');
  const [filterDeficitOnly, setFilterDeficitOnly] = useState<boolean>(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRowExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Expand / collapse all rows
  const toggleExpandAll = () => {
    if (expandedTaskIds.size === tasks.length) {
      setExpandedTaskIds(new Set());
    } else {
      setExpandedTaskIds(new Set(tasks.map((t) => t.id)));
    }
  };

  // Handle header sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // By default sort deficits or numeric values descending, text ascending
      if (['staffShortfall', 'staffRequired', 'machineryHours', 'allocatedStaff'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Filter tasks based on search, department, and deficit toggle
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return tasks.filter((task) => {
      // Deficit filter
      if (filterDeficitOnly && !task.isDeficitContributor && task.staffShortfall === 0) {
        return false;
      }

      // Department filter
      if (filterDepartment !== 'ALL' && task.department !== filterDepartment) {
        return false;
      }

      // Text search across ID, title, asset, section, gang names, gang leads, machine names
      if (q) {
        const matchesBasic =
          task.id.toLowerCase().includes(q) ||
          task.title.toLowerCase().includes(q) ||
          task.assetName.toLowerCase().includes(q) ||
          task.section.toLowerCase().includes(q) ||
          task.statutoryRule.toLowerCase().includes(q);

        const matchesGang = task.assignedGangs.some(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.lead.toLowerCase().includes(q) ||
            g.depot.toLowerCase().includes(q)
        );

        const matchesMachine =
          task.requiredMachinery.some((m) => m.toLowerCase().includes(q)) ||
          task.machineryDetails?.some((m) => m.name.toLowerCase().includes(q));

        if (!matchesBasic && !matchesGang && !matchesMachine) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, filterDepartment, filterDeficitOnly]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const priorityWeight: Record<string, number> = {
      CRITICAL: 3,
      HIGH: 2,
      MEDIUM: 1,
    };

    return [...filteredTasks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department);
          break;
        case 'priority':
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        case 'staffShortfall':
          comparison = a.staffShortfall - b.staffShortfall;
          break;
        case 'staffRequired':
          comparison = a.requiredStaff.total - b.requiredStaff.total;
          break;
        case 'allocatedStaff':
          comparison = a.allocatedStaff - b.allocatedStaff;
          break;
        case 'machineryHours':
          comparison = a.machineryHours - b.machineryHours;
          break;
        case 'timeSlot':
          comparison = a.timeSlot.localeCompare(b.timeSlot);
          break;
        case 'primaryGang': {
          const gangA = a.assignedGangs[0]?.name || '';
          const gangB = b.assignedGangs[0]?.name || '';
          comparison = gangA.localeCompare(gangB);
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasks, sortField, sortDirection]);

  // Summary computations
  const summary = useMemo(() => {
    const totalMachineryHours = tasks.reduce((sum, t) => sum + (t.machineryHours || 0), 0);
    const totalStaffRequired = tasks.reduce((sum, t) => sum + t.requiredStaff.total, 0);
    const totalStaffAllocated = tasks.reduce((sum, t) => sum + t.allocatedStaff, 0);
    const totalShortfall = tasks.reduce((sum, t) => sum + t.staffShortfall, 0);
    const uniqueGangsCount = new Set(tasks.flatMap((t) => t.assignedGangs.map((g) => g.id))).size;

    return {
      totalMachineryHours: Math.round(totalMachineryHours * 10) / 10,
      totalStaffRequired,
      totalStaffAllocated,
      totalShortfall,
      uniqueGangsCount,
    };
  }, [tasks]);

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 ml-1 inline-block" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-400 ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-400 ml-1 inline-block" />
    );
  };

  return (
    <div className="space-y-3.5 text-xs font-sans text-slate-200">
      {/* SUMMARY BANNER FOR SELECTED DEFICIT DAY TASKS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#070c1b] border border-slate-800 text-[11px] font-mono">
        {/* Total Tasks & Gangs */}
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Work Orders / Gangs</span>
            <HardHat className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base font-bold text-white mt-1">
            {tasks.length} Tasks <span className="text-slate-400 text-xs">/ {summary.uniqueGangsCount} Gangs</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Day {dayPoint.dayNumber} Possession Roster
          </div>
        </div>

        {/* Required Machinery Hours */}
        <div className="p-2 rounded-lg bg-slate-900/90 border border-amber-900/40">
          <div className="text-amber-400 text-[10px] uppercase flex items-center justify-between">
            <span>Machinery Hours</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-300 mt-1">
            {summary.totalMachineryHours} hrs
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {dayPoint.machinerySlotsRequired} Track Machine Slots
          </div>
        </div>

        {/* Staff Allocated / Demanded */}
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
            <span>Manned / Required</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base font-bold text-white mt-1">
            {summary.totalStaffAllocated} <span className="text-slate-400 text-xs">/ {summary.totalStaffRequired}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {Math.round((summary.totalStaffAllocated / Math.max(1, summary.totalStaffRequired)) * 100)}% Roster Filled
          </div>
        </div>

        {/* Total Shortfall / Deficit */}
        <div
          className={`p-2 rounded-lg border ${
            summary.totalShortfall > 0
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <div className="text-[10px] uppercase flex items-center justify-between">
            <span>Staff Shortfall Gap</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-base font-bold mt-1 font-mono">
            {summary.totalShortfall > 0 ? `-${summary.totalShortfall} Staff` : '0 (Fully Manned)'}
          </div>
          <div className="text-[10px] mt-0.5">
            {summary.totalShortfall > 0 ? 'Requires Standby Reserve' : 'No Critical Deficit'}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task, asset, gang lead, or machinery (e.g., 'tamper', 'flaw', 'gang #04')..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070c1b] border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs text-slate-200 placeholder-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter chips & expand-all button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Department selector */}
          <div className="inline-flex rounded-lg bg-[#070c1b] p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setFilterDepartment('ALL')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterDepartment === 'ALL'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Depts
            </button>
            <button
              onClick={() => setFilterDepartment('ENGINEERING')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterDepartment === 'ENGINEERING'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="P-Way Track Maintenance"
            >
              P-Way
            </button>
            <button
              onClick={() => setFilterDepartment('S&T')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterDepartment === 'S&T'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Signal & Telecommunication"
            >
              S&T
            </button>
            <button
              onClick={() => setFilterDepartment('TRACTION')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterDepartment === 'TRACTION'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="TRD Electrical Catenary"
            >
              TRD
            </button>
          </div>

          {/* Deficit only toggle */}
          <button
            onClick={() => setFilterDeficitOnly(!filterDeficitOnly)}
            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer border ${
              filterDeficitOnly
                ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                : 'bg-[#070c1b] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle only tasks with personnel shortfall"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Deficits Only</span>
          </button>

          {/* Expand/Collapse All */}
          <button
            onClick={toggleExpandAll}
            className="px-2 py-1 rounded-md text-[11px] font-mono bg-[#070c1b] border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Expand or collapse gang roster breakdown"
          >
            {expandedTaskIds.size === tasks.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* SORTABLE DATA TABLE */}
      <div className="rounded-xl border border-slate-800 bg-[#070d1e] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            {/* TABLE HEADER */}
            <thead>
              <tr className="bg-[#0b142c] text-slate-300 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider select-none">
                {/* Expander Icon */}
                <th className="py-2.5 px-2 w-8 text-center text-slate-500">#</th>

                {/* Task ID & Title */}
                <th
                  onClick={() => handleSort('title')}
                  className="py-2.5 px-3 font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <span className="flex items-center">
                    Task / Work Order
                    {renderSortArrow('title')}
                  </span>
                </th>

                {/* Department */}
                <th
                  onClick={() => handleSort('department')}
                  className="py-2.5 px-2.5 font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <span className="flex items-center">
                    Dept
                    {renderSortArrow('department')}
                  </span>
                </th>

                {/* Assigned Gangs */}
                <th
                  onClick={() => handleSort('primaryGang')}
                  className="py-2.5 px-3 font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <span className="flex items-center">
                    Assigned Gang(s) & In-Charge
                    {renderSortArrow('primaryGang')}
                  </span>
                </th>

                {/* Required Machinery Hours */}
                <th
                  onClick={() => handleSort('machineryHours')}
                  className="py-2.5 px-3 font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <span className="flex items-center">
                    Machine Hours
                    {renderSortArrow('machineryHours')}
                  </span>
                </th>

                {/* Staff Demanded vs Allocated */}
                <th
                  onClick={() => handleSort('staffRequired')}
                  className="py-2.5 px-3 font-semibold hover:text-white cursor-pointer transition-colors"
                >
                  <span className="flex items-center">
                    Staff Demanded
                    {renderSortArrow('staffRequired')}
                  </span>
                </th>

                {/* Deficit Shortfall */}
                <th
                  onClick={() => handleSort('staffShortfall')}
                  className="py-2.5 px-3 font-semibold hover:text-white cursor-pointer transition-colors text-right"
                >
                  <span className="flex items-center justify-end">
                    Shortfall Gap
                    {renderSortArrow('staffShortfall')}
                  </span>
                </th>

                {/* Priority */}
                <th
                  onClick={() => handleSort('priority')}
                  className="py-2.5 px-2.5 font-semibold hover:text-white cursor-pointer transition-colors text-center"
                >
                  <span className="flex items-center justify-center">
                    Priority
                    {renderSortArrow('priority')}
                  </span>
                </th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-800/80">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No maintenance tasks found matching filters for Day {dayPoint.dayNumber}.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => {
                  const isExpanded = expandedTaskIds.has(task.id);
                  const hasShortfall = task.staffShortfall > 0;

                  return (
                    <React.Fragment key={task.id}>
                      <tr
                        onClick={() => toggleRowExpanded(task.id)}
                        className={`transition-colors cursor-pointer group ${
                          hasShortfall
                            ? 'hover:bg-rose-950/20 bg-rose-950/5'
                            : 'hover:bg-slate-800/40 bg-transparent'
                        }`}
                      >
                        {/* Expand chevron */}
                        <td className="py-2.5 px-2 text-center text-slate-500 group-hover:text-slate-300">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 inline text-sky-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 inline" />
                          )}
                        </td>

                        {/* Task / Work Order */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200 group-hover:text-white text-[11px] leading-tight line-clamp-1">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                            <span className="text-sky-400 font-bold">{task.id}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-slate-400" title={task.assetName}>
                              {task.assetName}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400 truncate max-w-[110px]" title={task.section}>
                              {task.section}
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>{task.timeSlot}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold inline-block ${
                              task.department === 'ENGINEERING'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : task.department === 'S&T'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {task.department === 'ENGINEERING'
                              ? 'P-Way'
                              : task.department === 'S&T'
                              ? 'S&T Signal'
                              : 'TRD Elect.'}
                          </span>
                        </td>

                        {/* Assigned Gang(s) */}
                        <td className="py-2.5 px-3">
                          {task.assignedGangs.length > 0 ? (
                            <div className="space-y-1">
                              {task.assignedGangs.map((gang) => (
                                <div key={gang.id} className="flex flex-col">
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                                    <HardHat className="w-3 h-3 text-sky-400 shrink-0" />
                                    <span className="truncate max-w-[170px]" title={gang.name}>
                                      {gang.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-mono">
                                    <span className="text-amber-300/90 font-medium">{gang.lead}</span>
                                    <span>•</span>
                                    <span>{gang.assignedCount} staff</span>
                                    <span
                                      className={`px-1 rounded text-[8.5px] font-bold ${
                                        gang.status === 'SHORT_STAFFED'
                                          ? 'bg-rose-950 text-rose-300'
                                          : 'bg-emerald-950 text-emerald-300'
                                      }`}
                                    >
                                      {gang.status === 'SHORT_STAFFED' ? 'Short' : 'OK'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[10px]">Unassigned</span>
                          )}
                        </td>

                        {/* Required Machinery Hours */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono font-bold text-amber-300 text-xs">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{task.machineryHours} hrs</span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 truncate max-w-[130px] font-mono mt-0.5" title={task.requiredMachinery.join(', ')}>
                            {task.requiredMachinery[0] || 'Manual Tools Only'}
                            {task.requiredMachinery.length > 1 && ` (+${task.requiredMachinery.length - 1} units)`}
                          </div>
                        </td>

                        {/* Staff Demanded vs Allocated */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                          <div className="flex items-baseline gap-1 text-xs">
                            <span className="font-bold text-white">{task.allocatedStaff}</span>
                            <span className="text-slate-400 text-[10px]">/ {task.requiredStaff.total}</span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">
                            {task.requiredStaff.trackmen > 0 && `${task.requiredStaff.trackmen} Trackmen `}
                            {task.requiredStaff.signalTechs > 0 && `${task.requiredStaff.signalTechs} S&T `}
                            {task.requiredStaff.oheLinesmen > 0 && `${task.requiredStaff.oheLinesmen} OHE `}
                            {task.requiredStaff.safetyLookouts > 0 && `+${task.requiredStaff.safetyLookouts} Lookouts`}
                          </div>
                        </td>

                        {/* Deficit Shortfall */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono">
                          {hasShortfall ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-bold shadow-sm shadow-rose-950/60">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>-{task.staffShortfall} Staff</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Balanced</span>
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold inline-block ${
                              task.priority === 'CRITICAL'
                                ? 'bg-rose-900 text-rose-200 border border-rose-700'
                                : task.priority === 'HIGH'
                                ? 'bg-amber-900 text-amber-200 border border-amber-700'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                      </tr>

                      {/* EXPANDED ROW DETAILS */}
                      {isExpanded && (
                        <tr className="bg-[#050a18] border-b border-slate-800/80">
                          <td colSpan={8} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Left Column: Assigned Gang Breakdown */}
                              <div className="p-3 rounded-lg bg-[#0b1226] border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono text-sky-400 font-bold border-b border-slate-800 pb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    <HardHat className="w-3.5 h-3.5" />
                                    <span>Assigned Maintenance Gangs & Personnel</span>
                                  </span>
                                  <span>{task.allocatedStaff} Staff Allocated</span>
                                </div>

                                <div className="space-y-2 pt-1">
                                  {task.assignedGangs.map((gang) => (
                                    <div
                                      key={gang.id}
                                      className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col gap-1 text-[11px]"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">{gang.name}</span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                            gang.status === 'SHORT_STAFFED'
                                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          }`}
                                        >
                                          {gang.status}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                                        <div>
                                          Gang In-Charge: <strong className="text-amber-300">{gang.lead}</strong>
                                        </div>
                                        <div>
                                          Assigned Strength: <strong className="text-white">{gang.assignedCount} staff</strong>
                                        </div>
                                        <div>
                                          Depot Base: <span className="text-slate-300">{gang.depot}</span>
                                        </div>
                                        <div>
                                          Trade Specialty: <span className="text-sky-300">{gang.trade}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Statutory Rule Mandate */}
                                <div className="p-2 rounded bg-slate-950 border border-slate-800/70 text-[10px] font-mono text-slate-400 flex items-start gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-slate-300">Statutory Regulation:</strong> {task.statutoryRule}
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Required Machinery & Operating Hours Details */}
                              <div className="p-3 rounded-lg bg-[#0b1226] border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-bold border-b border-slate-800 pb-1.5">
                                  <span className="flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>Required Machinery Units & Operating Hours</span>
                                  </span>
                                  <span>{task.machineryHours} Total Hours</span>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  {task.machineryDetails && task.machineryDetails.length > 0 ? (
                                    task.machineryDetails.map((mach, mIdx) => (
                                      <div
                                        key={mIdx}
                                        className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-[11px]"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-slate-200">{mach.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                            <span>Slots: {mach.slots}</span>
                                            {mach.engineCode && (
                                              <>
                                                <span>•</span>
                                                <span className="text-sky-400">Unit ID: {mach.engineCode}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold text-[11px]">
                                            {mach.hours} hrs
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic py-2">
                                      Track inspection & manual portable testing tools only.
                                    </div>
                                  )}
                                </div>

                                {/* Deficit Impact / Reason */}
                                {hasShortfall ? (
                                  <div className="p-2 rounded bg-rose-950/40 border border-rose-800/70 text-[10px] text-rose-300 flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="font-bold flex items-center gap-1 text-rose-200">
                                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                                        <span>Deficit Bottleneck Impact:</span>
                                      </div>
                                      <div className="text-rose-300/90 leading-relaxed font-sans">
                                        {task.deficitContributionReason}
                                      </div>
                                    </div>

                                    {onMobilizeReserveGang && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onMobilizeReserveGang(task.staffShortfall);
                                        }}
                                        className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-mono text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-sm"
                                        title="Mobilize standby reserve for this specific task shortfall"
                                      >
                                        Deploy +{task.staffShortfall}
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/70 text-[10px] text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Work order is fully staffed according to safety & track machine regulations.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER SUMMARY */}
        <div className="p-3 bg-[#0a1228] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white">{sortedTasks.length}</strong> of{' '}
              <strong className="text-white">{tasks.length}</strong> tasks
            </span>
            <span>•</span>
            <span>Click any row to expand gang roster and machinery slot breakdown</span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Total Machine Hours: <strong className="text-amber-300">{summary.totalMachineryHours} hrs</strong>
            </span>
            <span>•</span>
            <span>
              Shortfall Gap:{' '}
              <strong className={summary.totalShortfall > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {summary.totalShortfall > 0 ? `-${summary.totalShortfall} staff` : 'Balanced'}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
