import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Bug,
  BrainCircuit,
  CalendarClock,
  AlertTriangle,
  GitFork,
  Wrench,
  Train,
  ShieldCheck,
  ServerCog,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Radio,
  Users,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  userRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  presentationMode: boolean;
  conflictsCount: number;
  pendingRequestsCount: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  allowedRoles: UserRole[];
  presentationAllowed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  userRole,
  collapsed,
  onToggleCollapse,
  presentationMode,
  conflictsCount,
  pendingRequestsCount,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'command_center',
      label: 'Command Center',
      icon: LayoutDashboard,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: true,
    },
    {
      id: 'requests',
      label: 'Submit Request',
      icon: FilePlus2,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
      ],
      presentationAllowed: false,
    },
    {
      id: 'defects',
      label: 'Defect Reporting',
      icon: Bug,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
      ],
      presentationAllowed: false,
    },
    {
      id: 'planning',
      label: 'AI Planning',
      icon: BrainCircuit,
      badge: 'AI',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      allowedRoles: ['SUPER_ADMIN', 'RAILWAY_PLANNER', 'CONTROL_ROOM', 'VIEWER'],
      presentationAllowed: true,
    },
    {
      id: 'shadow_block',
      label: 'Shadow-Block Engine',
      icon: Radio,
      badge: 'WORLD 1ST',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: true,
    },
    {
      id: 'timeline',
      label: 'Block Timeline',
      icon: CalendarClock,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: true,
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      icon: AlertTriangle,
      badge: conflictsCount > 0 ? conflictsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: true,
    },
    {
      id: 'corridors',
      label: 'Corridors',
      icon: GitFork,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: false,
    },
    {
      id: 'maintenance_assets',
      label: 'Maintenance & Assets',
      icon: Wrench,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'VIEWER',
      ],
      presentationAllowed: false,
    },
    {
      id: 'resource_allocation',
      label: 'Resource Allocation',
      icon: Users,
      badge: 'RDSO',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'ENGINEERING_OFFICER',
        'ST_OFFICER',
        'TRACTION_OFFICER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: true,
    },
    {
      id: 'trains',
      label: 'Trains',
      icon: Train,
      allowedRoles: [
        'SUPER_ADMIN',
        'RAILWAY_PLANNER',
        'CONTROL_ROOM',
        'VIEWER',
      ],
      presentationAllowed: false,
    },
    {
      id: 'validation',
      label: 'Final Validation',
      icon: ShieldCheck,
      badge: conflictsCount > 0 ? 'LOCKED' : 'READY',
      badgeColor:
        conflictsCount > 0
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      allowedRoles: ['SUPER_ADMIN', 'RAILWAY_PLANNER', 'CONTROL_ROOM', 'VIEWER'],
      presentationAllowed: true,
    },
    {
      id: 'system',
      label: 'System & Audit',
      icon: ServerCog,
      allowedRoles: ['SUPER_ADMIN', 'RAILWAY_PLANNER', 'VIEWER'],
      presentationAllowed: false,
    },
  ];

  // Filter based on Presentation mode & role
  const visibleItems = navItems.filter((item) => {
    if (presentationMode) {
      return item.presentationAllowed;
    }
    // In demo / SIH evaluators, Super Admin or Planner can see everything, other roles see authorized screens
    if (userRole === 'SUPER_ADMIN' || userRole === 'RAILWAY_PLANNER') {
      return true;
    }
    return item.allowedRoles.includes(userRole);
  });

  return (
    <aside
      className={`bg-[#0a1020] border-r border-sky-950/60 flex flex-col justify-between transition-all duration-300 shrink-0 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-sky-900/30">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-black tracking-wider shadow-lg shadow-sky-500/20 shrink-0 border border-sky-300/30">
                RS
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wider text-slate-100 uppercase font-mono flex items-center gap-1.5">
                  RAILSYNC
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </span>
                <span className="text-[10px] text-sky-400 font-mono tracking-tight truncate">
                  AI BLOCK SCHEDULER
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-black text-xs shadow-md border border-sky-300/30">
              RS
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Presentation Mode banner if active */}
        {presentationMode && !collapsed && (
          <div className="m-3 p-2 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>2-Min SIH Pitch Mode: Showing primary 5 workflows</span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-2 space-y-1 mt-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-sky-200 border border-sky-500/40 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 text-left truncate tracking-wide">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-sky-950/60 bg-[#080d19]/80 text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>SMART INDIA HACKATHON</span>
            <span className="text-emerald-400">SIH-2026</span>
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Decision-support software for railway maintenance & conflict resolution.
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-sky-950/60 text-center text-[10px] font-mono text-slate-400">
          SIH
        </div>
      )}
    </aside>
  );
};
