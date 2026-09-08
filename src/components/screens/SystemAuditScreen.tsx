import React, { useState } from 'react';
import {
  ServerCog,
  Server,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sliders,
  ShieldCheck,
  FileText,
  RefreshCw,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';
import { AuditLogEntry, SystemStatus } from '../../types';
import { checkBackendHealth, mockStore } from '../../services/api';

interface SystemAuditScreenProps {
  auditLogs: AuditLogEntry[];
  systemStatus: SystemStatus;
  onOpenBackendSettings: () => void;
  onRefreshData: () => void;
}

export const SystemAuditScreen: React.FC<SystemAuditScreenProps> = ({
  auditLogs,
  systemStatus,
  onOpenBackendSettings,
  onRefreshData,
}) => {
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    tested: boolean;
    online: boolean;
    message: string;
  } | null>(null);

  const handleTestHealth = async () => {
    setTestingHealth(true);
    const res = await checkBackendHealth(systemStatus.apiBaseUrl);
    setHealthResult({
      tested: true,
      online: res.online,
      message: res.message,
    });
    setTestingHealth(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ServerCog className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                System Architecture, Bridges & Audit Logs
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 12 / SYSTEM AUDIT & INTEGRITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end telemetry across Python REST API, Google Apps Script bridge, and immutable compliance audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenBackendSettings}
              className="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure API / Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* SYSTEM SUBSYSTEMS STATUS */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Core Railway Subsystems Status
            </h3>
            <p className="text-[11px] text-slate-400">
              Active engine and integration components powering decision support
            </p>
          </div>

          <button
            onClick={handleTestHealth}
            disabled={testingHealth}
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingHealth ? 'animate-spin' : ''}`} />
            Ping Services
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {/* Python Backend */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" /> Python Backend API
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  systemStatus.isMockMode
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {systemStatus.isMockMode ? 'MOCK / DEMO' : 'CONNECTED'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              URL: {systemStatus.apiBaseUrl}
            </div>
          </div>

          {/* Google Apps Script */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Google Apps Script
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                CONNECTED
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Bi-directional Webhook Gateway</div>
          </div>

          {/* Google Sheets */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Google Sheets DB
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                SYNCED
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Tabular Railway Ledger</div>
          </div>

          {/* Optimization Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Optimization Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Genetic / Heuristic Slot Optimizer</div>
          </div>

          {/* Conflict Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Conflict Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Spatial-Temporal Collision Detector</div>
          </div>

          {/* Validation Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Validation Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Deterministic 7-Point Safety Gate</div>
          </div>
        </div>

        {healthResult && (
          <div
            className={`mt-3 p-2.5 rounded text-xs font-mono flex items-center gap-2 ${
              healthResult.online
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {healthResult.online ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{healthResult.message}</span>
          </div>
        )}
      </div>

      {/* DATA COUNTS GRID */}
      <div className="bg-[#0a1020] p-5 rounded-xl border border-sky-950/80 shadow-inner">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-3">
          Active Registry Inventory Counts
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">CORRIDORS</span>
            <span className="text-lg font-bold text-sky-300 mt-1 block">4</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">ASSETS</span>
            <span className="text-lg font-bold text-blue-300 mt-1 block">28</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">TASKS</span>
            <span className="text-lg font-bold text-indigo-300 mt-1 block">60</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">DEFECTS</span>
            <span className="text-lg font-bold text-rose-300 mt-1 block">55</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">TRAINS</span>
            <span className="text-lg font-bold text-purple-300 mt-1 block">120</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">REQUESTS</span>
            <span className="text-lg font-bold text-emerald-300 mt-1 block">35</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">BLOCKS</span>
            <span className="text-lg font-bold text-cyan-300 mt-1 block">42</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">INITIAL CONFLICTS</span>
            <span className="text-lg font-bold text-amber-300 mt-1 block">23</span>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TRAIL */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Immutable Safety Audit Log Trail ({auditLogs.length} Events Recorded)
            </h3>
            <p className="text-[11px] text-slate-400">
              Timestamped log compliant with Indian Railways operations and safety directorate inspection protocols
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
            COMPLIANCE AUDIT
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0a1020] text-[11px] text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Action Description</th>
                <th className="py-2.5 px-3">Actor / Subsystem</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700">
                      {log.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 leading-relaxed">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                    {log.user}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        log.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : log.severity === 'WARNING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
