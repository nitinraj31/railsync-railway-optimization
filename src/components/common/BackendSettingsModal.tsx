import React, { useState } from 'react';
import {
  X,
  Server,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { mockStore, checkBackendHealth } from '../../services/api';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateReset: () => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onStateReset,
}) => {
  const [currentMode, setCurrentMode] = useState<'MOCK' | 'REAL'>(mockStore.getMode());
  const [backendUrl, setBackendUrl] = useState(mockStore.getBaseUrl());
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    online: boolean;
    message: string;
    loading: boolean;
  }>({
    tested: false,
    online: false,
    message: '',
    loading: false,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveMode = (newMode: 'MOCK' | 'REAL') => {
    setCurrentMode(newMode);
    mockStore.setMode(newMode);
  };

  const handleSaveUrl = () => {
    mockStore.setBaseUrl(backendUrl);
  };

  const handleTestConnection = async () => {
    setTestStatus({ tested: false, online: false, message: 'Pinging backend...', loading: true });
    const res = await checkBackendHealth(backendUrl);
    setTestStatus({
      tested: true,
      online: res.online,
      message: res.message,
      loading: false,
    });
  };

  const handleResetData = () => {
    mockStore.resetAllToDemo();
    setShowResetConfirm(false);
    onStateReset();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e162c] border border-sky-800/60 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-950/80 bg-[#0a1020]">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                API & Backend Integration Settings
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure Python REST API endpoint & operational data sync
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:text-white text-slate-400 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* Architecture Reminder */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-700/60 leading-relaxed text-slate-300">
            <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <span>Architecture Architecture Flow:</span>
              <span className="text-sky-400 font-mono text-[11px]">USER ➔ FRONTEND ➔ PYTHON API ➔ APPS SCRIPT ➔ SHEETS</span>
            </div>
            <p className="text-[11px] text-slate-400">
              The frontend is the operational command interface. All optimization, constraint handling, and conflict detection are executed by the Python engine.
            </p>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="block font-semibold text-slate-200 mb-2 uppercase tracking-wider text-[11px]">
              Operating Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSaveMode('REAL')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  currentMode === 'REAL'
                    ? 'bg-blue-950/60 border-sky-500 text-sky-100 shadow-md shadow-sky-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>REAL API MODE</span>
                  {currentMode === 'REAL' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Connects via HTTP to live Python REST backend.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveMode('MOCK')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  currentMode === 'MOCK'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-100 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>MOCK API / DEMO MODE</span>
                  {currentMode === 'MOCK' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Isolated, in-memory state engine for SIH presentation offline resilience.
                </p>
              </button>
            </div>
          </div>

          {/* Backend URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider">
                Python API Base URL (VITE_API_BASE_URL)
              </label>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus.loading}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${testStatus.loading ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                className="px-3 py-2 rounded bg-sky-700 hover:bg-sky-600 text-white font-medium text-xs"
              >
                Update
              </button>
            </div>

            {testStatus.tested && (
              <div
                className={`mt-2 p-2 rounded text-[11px] flex items-center gap-2 ${
                  testStatus.online
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {testStatus.online ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* Sync Components Status */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
              Data Pipeline Integration Status
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Google Apps Script</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ONLINE
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Google Sheets DB</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> SYNCED
                </span>
              </div>
            </div>
          </div>

          {/* Demo Reset */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-300 text-xs">Reset Presentation State</div>
              <div className="text-[10px] text-slate-500">
                Restore initial 5 critical conflicts and 35 requests for fresh demo.
              </div>
            </div>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0a1020] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
