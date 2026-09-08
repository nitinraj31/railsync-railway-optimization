import React, { useState } from 'react';
import {
  Wrench,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  GitFork,
  ArrowRight,
} from 'lucide-react';
import { Asset, MaintenanceTask, DepartmentType, PriorityLevel } from '../../types';

interface MaintenanceAssetsScreenProps {
  assets: Asset[];
  tasks: MaintenanceTask[];
  onNavigateToBlockTimeline: () => void;
}

export const MaintenanceAssetsScreen: React.FC<MaintenanceAssetsScreenProps> = ({
  assets,
  tasks,
  onNavigateToBlockTimeline,
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TASKS'>('ASSETS');

  // Filters
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredAssets = assets.filter((a) => {
    if (filterDept !== 'ALL' && a.department !== filterDept) return false;
    if (filterCorridor !== 'ALL' && a.corridorId !== filterCorridor) return false;
    if (filterPriority !== 'ALL' && a.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredTasks = tasks.filter((t) => {
    if (filterDept !== 'ALL' && t.department !== filterDept) return false;
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.assetId.toLowerCase().includes(q) ||
        t.taskType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Railway Infrastructure & Maintenance Registry
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 8 / ASSETS & WORK ORDERS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative inventory of 28 physical railway assets and 60 periodic maintenance task schedules across Civil, S&T, and Traction directorates.
            </p>
          </div>

          {/* Sub-View Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('ASSETS')}
              className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                activeTab === 'ASSETS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TAB 1: ASSETS (28)
            </button>
            <button
              onClick={() => setActiveTab('TASKS')}
              className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                activeTab === 'TASKS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TAB 2: TASKS (60)
            </button>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#0a1020] p-4 rounded-xl border border-sky-950/80 shadow-inner flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={activeTab === 'ASSETS' ? 'Search Asset ID, Name...' : 'Search Task ID, Asset...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="ENGINEERING">Civil Track & Bridges</option>
            <option value="S&T">Signaling & Telecom</option>
            <option value="TRACTION">Electrical Traction (TRD)</option>
          </select>

          {activeTab === 'ASSETS' && (
            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Corridors</option>
              <option value="C001">C001 (Main Trunk)</option>
              <option value="C002">C002 (High-Speed)</option>
              <option value="C003">C003 (Mixed Link)</option>
              <option value="C004">C004 (Branch)</option>
            </select>
          )}

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* TAB 1: ASSETS TABLE (28 ASSETS) */}
      {activeTab === 'ASSETS' && (
        <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Railway Physical Assets ({filteredAssets.length} of 28 Filtered)
              </h3>
              <p className="text-[11px] text-slate-400">
                Track segments, points, signals, 25kV OHE catenary sections, and traction substations
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
              PHYSICAL ASSETS
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Asset ID</th>
                  <th className="py-2.5 px-3">Asset Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Asset Type</th>
                  <th className="py-2.5 px-3">Installed</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Last Overhaul</th>
                  <th className="py-2.5 px-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-300">{a.id}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{a.name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.department}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{a.corridorId}</td>
                    <td className="py-2.5 px-3 text-slate-400">{a.type}</td>
                    <td className="py-2.5 px-3 text-slate-400">{a.installationYear}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          a.condition === 'CRITICAL'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : a.condition === 'POOR'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {a.condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{a.lastMaintenanceDate}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          a.priority === 'CRITICAL'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : a.priority === 'HIGH'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {a.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MAINTENANCE TASKS TABLE (60 TASKS) */}
      {activeTab === 'TASKS' && (
        <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Periodic Maintenance Task Schedule ({filteredTasks.length} of 60 Tasks)
              </h3>
              <p className="text-[11px] text-slate-400">
                Work orders mapped to assets with required window duration and block assignments
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
              60 WORK ORDERS
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Task ID</th>
                  <th className="py-2.5 px-3">Asset ID</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Task Description</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Preferred Window</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-300">{t.id}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-semibold">{t.assetId}</td>
                    <td className="py-2.5 px-3 text-slate-300">{t.department}</td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[200px]">
                      {t.taskType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{t.durationMinutes} min</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          t.priority === 'CRITICAL'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : t.priority === 'HIGH'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{t.preferredTimeWindow}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          t.status === 'SCHEDULED'
                            ? 'bg-blue-950/80 text-sky-300 border-blue-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-sky-400">
                      {t.assignedBlockId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
