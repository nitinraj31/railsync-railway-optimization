import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Bell,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  RefreshCw,
  ExternalLink,
  Zap,
  PlayCircle,
  Eye,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { User, UserRole, AppNotification, SystemStatus, PublicationWorkflowState } from '../../types';
import { mockStore, getSystemStatus } from '../../services/api';
import { MOCK_USERS } from '../../data/mockData';

interface NavbarProps {
  currentUser: User | null;
  onSelectRole: (role: UserRole) => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  onOpenDemoWalkthrough: () => void;
  onOpenBackendSettings: () => void;
  presentationMode: boolean;
  onTogglePresentationMode: () => void;
  onNavigate: (screen: string) => void;
  validationStatus: 'SAFE_TO_PUBLISH' | 'REQUIRES_REVIEW';
  conflictsCount: number;
  publicationState?: PublicationWorkflowState;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectRole,
  onLogout,
  onOpenSearch,
  onOpenDemoWalkthrough,
  onOpenBackendSettings,
  presentationMode,
  onTogglePresentationMode,
  onNavigate,
  validationStatus,
  conflictsCount,
  publicationState,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'NOTIF-DEP-1',
      title: '⚡🛠️ Dependency Conflict Flagged',
      message: 'Electrical Block BLK-T012 conflicts with concurrent Track Tamper Block BLK-E014 on C003. "Propose Time Shift" available.',
      severity: 'CRITICAL',
      timestamp: 'Just now',
      read: false,
      targetScreen: 'conflicts',
    },
    {
      id: 'NOTIF-1',
      title: 'Validation Gate Alert',
      message: 'Critical train-block overlaps require resolution before publication.',
      severity: 'CRITICAL',
      timestamp: '3m ago',
      read: false,
      targetScreen: 'validation',
    },
    {
      id: 'NOTIF-2',
      title: 'New Maintenance Request',
      message: 'Er. Rajesh Verma submitted REQ-2026-035 for Asset A018 on C003.',
      severity: 'INFO',
      timestamp: '15m ago',
      read: false,
      targetScreen: 'requests',
    },
    {
      id: 'NOTIF-3',
      title: 'Google Sheets Synced',
      message: 'Bi-directional sync completed with Python REST API & Apps Script.',
      severity: 'SUCCESS',
      timestamp: '32m ago',
      read: true,
      targetScreen: 'system',
    },
  ]);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    pythonBackend: false,
    googleAppsScript: true,
    googleSheets: true,
    optimizationEngine: true,
    conflictEngine: true,
    validationEngine: true,
    isMockMode: true,
    apiBaseUrl: mockStore.getBaseUrl(),
    lastSyncTime: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    getSystemStatus().then(setSystemStatus);
    const interval = setInterval(() => {
      getSystemStatus().then(setSystemStatus);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { title: string; color: string }> = {
    SUPER_ADMIN: { title: 'SUPER ADMIN', color: 'bg-purple-950/80 text-purple-300 border-purple-800/60' },
    RAILWAY_PLANNER: { title: 'RAILWAY PLANNER', color: 'bg-blue-950/80 text-blue-300 border-blue-800/60' },
    ENGINEERING_OFFICER: { title: 'ENGG OFFICER', color: 'bg-amber-950/80 text-amber-300 border-amber-800/60' },
    ST_OFFICER: { title: 'S&T OFFICER', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' },
    TRACTION_OFFICER: { title: 'TRACTION OFFICER', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' },
    CONTROL_ROOM: { title: 'CONTROL ROOM', color: 'bg-orange-950/80 text-orange-300 border-orange-800/60' },
    VIEWER: { title: 'VIEWER (READ ONLY)', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 bg-[#0c1427]/95 border-b border-sky-900/30 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shadow-md">
      {/* Left: System Status & Quick Indicator */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-sky-950/60 border border-sky-800/50 text-xs font-mono text-sky-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold tracking-wide">SYSTEM ONLINE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">CONTROL CELL</span>
        </div>

        {/* Backend & Sheets Bridge Status */}
        <button
          onClick={onOpenBackendSettings}
          title="Configure Python REST API endpoint & Sync Mode"
          className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-mono text-slate-300 transition-colors"
        >
          <Server className="w-3.5 h-3.5 text-sky-400" />
          <span>API:</span>
          <span className={systemStatus.isMockMode ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            {systemStatus.isMockMode ? 'MOCK / DEMO' : 'PYTHON LIVE'}
          </span>
          <span className="text-slate-600">/</span>
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">SHEETS SYNC</span>
          <SlidersHorizontal className="w-3 h-3 text-slate-400 ml-1" />
        </button>

        {/* Safety Gate Indicator */}
        {publicationState?.currentState === 'PUBLISHED' ? (
          <button
            onClick={() => onNavigate('validation')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-600 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900/60 text-xs font-semibold transition-colors shadow-sm"
            title="Timetable is Published and Locked. Click to view Gazette."
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SCHEDULE: PUBLISHED</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('validation')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
              validationStatus === 'SAFE_TO_PUBLISH'
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-rose-950/60 border-rose-700/50 text-rose-300 hover:bg-rose-900/40 animate-pulse'
            }`}
          >
            {validationStatus === 'SAFE_TO_PUBLISH' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SAFETY GATE: SAFE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  SAFETY GATE: {conflictsCount} CONFLICTS
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Center / Right: Actions & Tools */}
      <div className="flex items-center gap-2.5">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-300 transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Search Asset, Block, Train, Request...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 rounded">
            ⌘K
          </kbd>
        </button>

        {/* SIH Live Demo Walkthrough Trigger */}
        <button
          onClick={onOpenDemoWalkthrough}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/50 text-xs font-medium text-white shadow-lg shadow-blue-900/40 transition-all transform active:scale-95"
        >
          <PlayCircle className="w-3.5 h-3.5 text-sky-200" />
          <span className="font-semibold tracking-wide">SIH DEMO MODE</span>
        </button>

        {/* Presentation Mode Toggle */}
        <button
          onClick={onTogglePresentationMode}
          title={presentationMode ? 'Exit Presentation Mode' : 'Enter 2-Minute Presentation Mode'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
            presentationMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{presentationMode ? 'PRESENTATION ON' : 'PITCH MODE'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 relative transition-colors"
            title="Operational Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[#0e172e] border border-sky-900/50 shadow-2xl z-50 p-3 overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Operational Alerts
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto mt-2 space-y-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.targetScreen) onNavigate(n.targetScreen);
                      setShowNotifications(false);
                    }}
                    className={`p-2.5 rounded cursor-pointer transition-colors ${
                      n.read ? 'bg-transparent hover:bg-slate-800/40' : 'bg-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {n.severity === 'CRITICAL' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : n.severity === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-200">{n.title}</p>
                          <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current User Profile & Role Switcher */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900 border border-sky-900/40 hover:border-sky-700/60 text-left transition-all"
            >
              <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center text-xs font-bold text-white border border-blue-400/40">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[140px] leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-sky-400 font-mono tracking-wider">
                  {currentUser.department}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg bg-[#0e172e] border border-sky-800/40 shadow-2xl z-50 p-3 backdrop-blur-md">
                <div className="pb-3 border-b border-slate-800">
                  <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{currentUser.designation}</div>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${
                        roleLabels[currentUser.role]?.color || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {roleLabels[currentUser.role]?.title || currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Quick Role Switcher for SIH Evaluators */}
                <div className="pt-2.5 pb-2">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5 px-1">
                    Demo Role Switcher (Live SIH Persona)
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {MOCK_USERS.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectRole(u.role);
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors ${
                          currentUser.id === u.id
                            ? 'bg-blue-900/40 text-sky-200 border border-sky-700/50'
                            : 'hover:bg-slate-800/70 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {roleLabels[u.role]?.title} ({u.department})
                          </span>
                        </div>
                        {currentUser.id === u.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <button
                    onClick={() => {
                      onOpenBackendSettings();
                      setShowUserMenu(false);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <Server className="w-3 h-3" /> API Config
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
