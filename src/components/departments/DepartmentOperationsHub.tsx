import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Zap,
  Radio,
  Train,
  ShieldCheck,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Users,
  Cpu,
  TrendingUp,
  Sparkles,
  Calendar,
  ChevronRight,
  RefreshCw,
  FileText,
  CheckCheck,
  Activity,
  GitMerge,
  Gauge,
  HelpCircle,
  ExternalLink,
  Flame,
  Printer,
  Download,
} from 'lucide-react';
import { DepartmentType, Corridor } from '../../types';
import { printOfficialBulletin, exportBulletinAsHTML } from '../../services/exportBulletinService';
import { mockStore } from '../../services/api';
import { DependencyConflictBanner } from '../conflicts/DependencyConflictBanner';

interface DepartmentOperationsHubProps {
  corridors: Corridor[];
  activeDepartmentFilter?: DepartmentType | 'ALL';
  onSelectDepartmentFilter?: (dept: DepartmentType | 'ALL') => void;
  onNavigate: (screen: string, itemData?: any) => void;
}

export interface DepartmentSummaryData {
  department: DepartmentType;
  title: string;
  hindiTitle: string;
  hodName: string;
  hodDesignation: string;
  healthScore: number;
  activeBlocksToday: number;
  pendingRequests: number;
  fleetAssignedCount: number;
  manpowerGangCount: number;
  criticalAlertCount: number;
  keyMetricLabel: string;
  keyMetricValue: string;
  keyMetricSub: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: any;
  bulletin: string;
  subsystems: {
    name: string;
    status: 'OPTIMAL' | 'MODERATE' | 'ATTENTION';
    metric: string;
  }[];
}

export interface JointBlockItem {
  id: string;
  name: string;
  corridorId: string;
  section: string;
  scheduledTime: string;
  durationMinutes: number;
  leadDepartment: DepartmentType;
  participatingDepartments: DepartmentType[];
  signoffs: {
    engineering: boolean;
    traction: boolean;
    st: boolean;
    operations: boolean;
    safety: boolean;
  };
  interlockProtocol: string;
  status: 'ALL_APPROVED' | 'PENDING_SIGNOFF' | 'CONFLICT_DETECTED';
}

export const DepartmentOperationsHub: React.FC<DepartmentOperationsHubProps> = ({
  corridors,
  activeDepartmentFilter = 'ALL',
  onSelectDepartmentFilter,
  onNavigate,
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentType | 'ALL'>(activeDepartmentFilter);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showJointModal, setShowJointModal] = useState<boolean>(false);
  const [selectedJointBlock, setSelectedJointBlock] = useState<JointBlockItem | null>(null);
  const [jointBlocksState, setJointBlocksState] = useState<JointBlockItem[]>([
    {
      id: 'JB-2026-081',
      name: 'Turnout 14B High-Speed Switch Renewal & Point Overhaul',
      corridorId: 'C001',
      section: 'KM 14/2 Ghaziabad Yard Up Line',
      scheduledTime: '01:30 - 03:30 (Tomorrow)',
      durationMinutes: 120,
      leadDepartment: 'ENGINEERING',
      participatingDepartments: ['ENGINEERING', 'S&T', 'TRACTION', 'OPERATIONS'],
      signoffs: {
        engineering: true,
        traction: true,
        st: true,
        operations: true,
        safety: true,
      },
      interlockProtocol: 'T/351 Disconnection issued; 25kV OHE isolated at SP-GZB; Signal S-14 normalized',
      status: 'ALL_APPROVED',
    },
    {
      id: 'JB-2026-082',
      name: 'Level Crossing Gate LC-19 Track De-stressing & Axle Counter Shifting',
      corridorId: 'C003',
      section: 'KM 28/4 Bahadurgarh Section',
      scheduledTime: '02:00 - 04:00 (Tomorrow)',
      durationMinutes: 120,
      leadDepartment: 'S&T',
      participatingDepartments: ['S&T', 'ENGINEERING', 'OPERATIONS'],
      signoffs: {
        engineering: true,
        traction: false,
        st: true,
        operations: false,
        safety: true,
      },
      interlockProtocol: 'Gate Boom sensor disconnection; Dual HASSDAC Axle Counter recalibration protocol pending Operating signoff',
      status: 'PENDING_SIGNOFF',
    },
    {
      id: 'JB-2026-083',
      name: '25kV Catenary Stagger Adjustment with Track Lifting by Plasser 09-3X',
      corridorId: 'C002',
      section: 'KM 20/0 to 24/0 Faridabad High-Speed Spur',
      scheduledTime: '00:45 - 03:15 (Tonight)',
      durationMinutes: 150,
      leadDepartment: 'TRACTION',
      participatingDepartments: ['TRACTION', 'ENGINEERING', 'OPERATIONS', 'SAFETY'],
      signoffs: {
        engineering: true,
        traction: true,
        st: true,
        operations: true,
        safety: true,
      },
      interlockProtocol: 'Continuous Tie Tamper lifts track 25mm; Tower Wagon RUPS-OHE-08 elevates droppers simultaneously to maintain 5.5m contact wire clearance',
      status: 'ALL_APPROVED',
    },
    {
      id: 'JB-2026-084',
      name: 'Bridge 42 Girder Inspection & Overhead Feeder Slewing',
      corridorId: 'C004',
      section: 'KM 44/6 Anand Vihar - Hapur Section',
      scheduledTime: '02:15 - 04:45 (Tonight)',
      durationMinutes: 150,
      leadDepartment: 'ENGINEERING',
      participatingDepartments: ['ENGINEERING', 'TRACTION', 'SAFETY'],
      signoffs: {
        engineering: true,
        traction: false,
        st: true,
        operations: true,
        safety: true,
      },
      interlockProtocol: 'Under-slung cradle scaffold requires 25kV Feeder wire earth grounding; Traction isolation certificate awaited',
      status: 'PENDING_SIGNOFF',
    },
  ]);

  // Handle department filter selection
  const handleSelectDept = (dept: DepartmentType | 'ALL') => {
    setSelectedDept(dept);
    if (onSelectDepartmentFilter) {
      onSelectDepartmentFilter(dept);
    }
  };

  // Department Summaries data
  const departmentProfiles: Record<DepartmentType, DepartmentSummaryData> = useMemo(() => ({
    ENGINEERING: {
      department: 'ENGINEERING',
      title: 'Civil Engineering (Permanent Way & Bridges)',
      hindiTitle: 'इंजीनियरिंग विभाग (रेल पथ एवं पुल)',
      hodName: 'Rajesh Sharma',
      hodDesignation: 'Senior Divisional Engineer (Sr. DEN / Co-ord)',
      healthScore: 88,
      activeBlocksToday: 14,
      pendingRequests: 6,
      fleetAssignedCount: 6, // Heavy track machines
      manpowerGangCount: 18, // P-Way gangs & patrolmen
      criticalAlertCount: 1,
      keyMetricLabel: 'Track Geometry Index (TGI)',
      keyMetricValue: '84.6 / 100',
      keyMetricSub: 'RDSO Good Track Band (>80)',
      secondaryMetricLabel: 'USFD Rail Flaw Testing',
      secondaryMetricValue: '92.4% Done',
      color: 'emerald',
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-700/80',
      badgeText: 'text-emerald-300',
      icon: Wrench,
      bulletin:
        'C003 Shakurbasti turnout 14B requires packing before evening superfast rush; Rail temp currently 38.5°C ($T_d$ neutral band).',
      subsystems: [
        { name: 'Rail Head Integrity & USFD', status: 'OPTIMAL', metric: '0 Critical Flaws' },
        { name: 'Ballast Cushion & Drainage', status: 'MODERATE', metric: '62% Clean Ballast' },
        { name: 'Points & Turnouts Packing', status: 'ATTENTION', metric: 'Turnout 14B Due' },
        { name: 'Bridge Approaches & Expansion', status: 'OPTIMAL', metric: 'Deflection < 2mm' },
      ],
    },
    TRACTION: {
      department: 'TRACTION',
      title: 'Electrical Traction & Power Supply (TRD)',
      hindiTitle: 'विद्युत कर्षण विभाग (25kV OHE एवं सब-स्टेशन)',
      hodName: 'Pooja Nair',
      hodDesignation: 'Senior Divisional Electrical Engineer (Sr. DEE / TRD)',
      healthScore: 92,
      activeBlocksToday: 11,
      pendingRequests: 4,
      fleetAssignedCount: 4, // Tower Wagons RUPS
      manpowerGangCount: 12, // TRD line maintenance gangs
      criticalAlertCount: 0,
      keyMetricLabel: '25kV Catenary Voltage',
      keyMetricValue: '24.8 kV',
      keyMetricSub: 'Nominal 25.0 kV (5 TSS Online)',
      secondaryMetricLabel: 'Substation Peak Load',
      secondaryMetricValue: '72.8% Mean',
      color: 'amber',
      badgeBg: 'bg-amber-950/80',
      badgeBorder: 'border-amber-700/80',
      badgeText: 'text-amber-300',
      icon: Zap,
      bulletin:
        'TSS-SSB running at 89.6% capacity due to freight acceleration; SCADA sectioning post bridging primed via Bahadurgarh SP.',
      subsystems: [
        { name: '132/25kV Traction Sub-Stations', status: 'OPTIMAL', metric: '5/5 Synchronized' },
        { name: 'OHE Contact Wire Stagger & Wear', status: 'OPTIMAL', metric: 'Max 18.2% Wear' },
        { name: 'Neutral Section Auto-Dropping', status: 'OPTIMAL', metric: 'Transponders Tested' },
        { name: 'Tower Wagon Readiness', status: 'OPTIMAL', metric: '4/4 Vehicles Active' },
      ],
    },
    S_AND_T: {
      department: 'S&T',
      title: 'Signal & Telecommunication (S&T)',
      hindiTitle: 'सिग्नल एवं दूरसंचार विभाग (इंटरलॉकिंग एवं एक्सल काउंटर)',
      hodName: 'Vikram Malhotra',
      hodDesignation: 'Senior Divisional Signal & Telecom Engineer (Sr. DSTE)',
      healthScore: 94,
      activeBlocksToday: 8,
      pendingRequests: 3,
      fleetAssignedCount: 3, // S&T mobile inspection vans
      manpowerGangCount: 14, // Signal maintenance gangs & technicians
      criticalAlertCount: 0,
      keyMetricLabel: 'Electronic Interlocking Uptime',
      keyMetricValue: '99.96%',
      keyMetricSub: 'Dual Redundant Hot Standby',
      secondaryMetricLabel: 'Point Machine Throw Time',
      secondaryMetricValue: '3.8s Avg',
      color: 'sky',
      badgeBg: 'bg-sky-950/80',
      badgeBorder: 'border-sky-700/80',
      badgeText: 'text-sky-300',
      icon: Radio,
      bulletin:
        'Chander Nagar station Auxiliary Transformer feeding Electronic Interlocking active on IPS battery backup (5.2h headroom).',
      subsystems: [
        { name: 'Electronic Interlocking (EI)', status: 'OPTIMAL', metric: 'Fail-Safe Mode Active' },
        { name: 'Digital Axle Counters (HASSDAC)', status: 'OPTIMAL', metric: '0 False Resets' },
        { name: 'Electric Point Machines 220V', status: 'OPTIMAL', metric: 'Detection Latency 3.8s' },
        { name: 'OFC Optical Fiber Backbone', status: 'OPTIMAL', metric: 'Attenuation < 0.22dB' },
      ],
    },
    OPERATIONS: {
      department: 'OPERATIONS',
      title: 'Operating & Traffic Control',
      hindiTitle: 'परिचालन विभाग (यातायात नियंत्रण एवं समयबद्धता)',
      hodName: 'M. Hariprasad',
      hodDesignation: 'Chief Controller / Senior Divisional Operations Manager',
      healthScore: 91,
      activeBlocksToday: 35, // All corridors integrated
      pendingRequests: 7,
      fleetAssignedCount: 14, // All coordinated track machines
      manpowerGangCount: 48,
      criticalAlertCount: 0,
      keyMetricLabel: 'Mail/Express Punctuality',
      keyMetricValue: '94.8%',
      keyMetricSub: 'Vande Bharat / Rajdhani 100%',
      secondaryMetricLabel: 'Traffic Lull Slot Efficiency',
      secondaryMetricValue: '88.5%',
      color: 'indigo',
      badgeBg: 'bg-indigo-950/80',
      badgeBorder: 'border-indigo-700/80',
      badgeText: 'text-indigo-300',
      icon: Train,
      bulletin:
        'Section controllers granted 120-min integrated shadow block window between 01:30 and 03:30 across C001 and C002.',
      subsystems: [
        { name: 'Main Trunk Line Capacity Utilization', status: 'MODERATE', metric: '92% Peak Slot Usage' },
        { name: 'Headway Buffer to Vande Bharat', status: 'OPTIMAL', metric: '18.4 min Margin' },
        { name: 'Freight Staggering & Loop Holds', status: 'OPTIMAL', metric: '4 Rakes Regulated' },
        { name: 'Station Master Block Grants', status: 'OPTIMAL', metric: 'Electronic Tokenless' },
      ],
    },
    SAFETY: {
      department: 'SAFETY',
      title: 'Safety Directorate & Joint Clearance',
      hindiTitle: 'संरक्षा निदेशालय (संयुक्त प्रक्रिया आदेश एवं सतर्कता)',
      hodName: 'Arun Kulkarni',
      hodDesignation: 'Divisional Safety Officer (DSO) / CRS Liaison',
      healthScore: 96,
      activeBlocksToday: 18,
      pendingRequests: 2,
      fleetAssignedCount: 2, // Safety audit vehicles
      manpowerGangCount: 8, // Safety inspectors
      criticalAlertCount: 0,
      keyMetricLabel: 'Joint Procedure Orders (JPO)',
      keyMetricValue: '100% Valid',
      keyMetricSub: '3-Way Disconnection Verified',
      secondaryMetricLabel: 'Temporary Speed Restrictions',
      secondaryMetricValue: '6 TSRs Active',
      color: 'purple',
      badgeBg: 'bg-purple-950/80',
      badgeBorder: 'border-purple-700/80',
      badgeText: 'text-purple-300',
      icon: ShieldCheck,
      bulletin:
        'All 4 ongoing mechanized tamping blocks operating under 30 km/h caution order until first train passage certification.',
      subsystems: [
        { name: 'Disconnection / Reconnection (T/351)', status: 'OPTIMAL', metric: '18 Active Certificates' },
        { name: 'TSR Caution Order Board Posting', status: 'OPTIMAL', metric: 'GPS Geofenced' },
        { name: 'Track Machine Speed Limiters', status: 'OPTIMAL', metric: 'Max 50 km/h Transit' },
        { name: 'Gradients & Siding Derail Switches', status: 'OPTIMAL', metric: 'Interlocked Closed' },
      ],
    },
  }), []);

  // Filtered joint blocks based on department selection
  const filteredJointBlocks = useMemo(() => {
    if (selectedDept === 'ALL') return jointBlocksState;
    return jointBlocksState.filter(
      (jb) => jb.leadDepartment === selectedDept || jb.participatingDepartments.includes(selectedDept)
    );
  }, [jointBlocksState, selectedDept]);

  // Overall department metrics
  const aggregateMetrics = useMemo(() => {
    const list = Object.values(departmentProfiles);
    const avgHealth = Math.round(list.reduce((acc, d) => acc + d.healthScore, 0) / list.length);
    const totalBlocks = list.reduce((acc, d) => acc + d.activeBlocksToday, 0);
    const totalPending = list.reduce((acc, d) => acc + d.pendingRequests, 0);
    const totalFleet = list.reduce((acc, d) => acc + d.fleetAssignedCount, 0);
    const totalGangs = list.reduce((acc, d) => acc + d.manpowerGangCount, 0);
    const jointCoordinatedCount = jointBlocksState.filter((b) => b.status === 'ALL_APPROVED').length;

    return {
      avgHealth,
      totalBlocks,
      totalPending,
      totalFleet,
      totalGangs,
      jointCoordinatedCount,
      totalJoint: jointBlocksState.length,
    };
  }, [departmentProfiles, jointBlocksState]);

  // Toggle joint signoff simulation
  const handleToggleSignoff = (blockId: string, deptKey: keyof JointBlockItem['signoffs']) => {
    setJointBlocksState((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const newSignoffs = { ...b.signoffs, [deptKey]: !b.signoffs[deptKey] };
        const allApproved = Object.values(newSignoffs).every(Boolean);
        return {
          ...b,
          signoffs: newSignoffs,
          status: allApproved ? 'ALL_APPROVED' : 'PENDING_SIGNOFF',
        };
      })
    );
  };

  return (
    <div
      id="department-operations-hub-card"
      className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md p-5 space-y-5 transition-all"
    >
      {/* HEADER WITH MULTI-DEPARTMENT CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 font-mono">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg border bg-blue-950/80 border-blue-800/60 text-blue-400 shrink-0 mt-0.5">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-100 uppercase tracking-wide">
                Department-Wise Operations Hub (रेलवे विभागीय कमान केंद्र)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" />
                5 RAILWAY DEPARTMENTS
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {aggregateMetrics.avgHealth}% OVERALL CO-ORDINATION HEALTH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Eliminates departmental silos across <strong>Engineering (P-Way)</strong>, <strong>Electrical (Traction TRD)</strong>, <strong>S&T (Interlocking)</strong>, <strong>Operating (Traffic Control)</strong>, and <strong>Safety</strong> through automated Joint Procedure Orders (JPO) and interlocked block permissions.
            </p>
          </div>
        </div>

        {/* QUICK JUMP TO REQUISITION / ASSETS */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto text-xs">
          <button
            onClick={() => onNavigate('submit_request', { department: selectedDept === 'ALL' ? 'ENGINEERING' : selectedDept })}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Requisition Block</span>
          </button>
          <button
            onClick={() => onNavigate('maintenance_assets', { department: selectedDept === 'ALL' ? undefined : selectedDept })}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>View Assets</span>
          </button>
          <button
            id="print-dept-bulletin-btn"
            onClick={() => {
              printOfficialBulletin({
                corridors,
                customNotes: `Department Operations Directive: ${selectedDept === 'ALL' ? 'All 5 Operating Departments (Joint Coordination)' : selectedDept}`,
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Print Official Departmental Operations Bulletin"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bulletin</span>
          </button>
          <button
            id="export-dept-bulletin-btn"
            onClick={() => {
              exportBulletinAsHTML({
                corridors,
                customNotes: `Department Operations Directive: ${selectedDept === 'ALL' ? 'All 5 Operating Departments (Joint Coordination)' : selectedDept}`,
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Export Official Departmental Bulletin as HTML / PDF Dossier"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Bulletin</span>
          </button>
        </div>
      </div>

      {/* DEPARTMENT SELECTOR TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono text-xs">
        <button
          onClick={() => handleSelectDept('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'ALL'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Departments (Overview)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 ml-0.5">
            5/5
          </span>
        </button>

        <button
          onClick={() => handleSelectDept('ENGINEERING')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'ENGINEERING'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-emerald-400" />
          <span>Engineering (P-Way)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 ml-0.5">
            TGI 84.6
          </span>
        </button>

        <button
          onClick={() => handleSelectDept('TRACTION')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'TRACTION'
              ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-900/40'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Electrical (TRD & OHE)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 ml-0.5">
            24.8 kV
          </span>
        </button>

        <button
          onClick={() => handleSelectDept('S&T')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'S&T'
              ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-900/40'
              : 'text-slate-400 hover:text-sky-300 hover:bg-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-sky-400" />
          <span>Signal & Telecom (S&T)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 ml-0.5">
            99.96%
          </span>
        </button>

        <button
          onClick={() => handleSelectDept('OPERATIONS')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'OPERATIONS'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40'
              : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900'
          }`}
        >
          <Train className="w-3.5 h-3.5 text-indigo-400" />
          <span>Operations (Control)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 ml-0.5">
            94.8% Punctual
          </span>
        </button>

        <button
          onClick={() => handleSelectDept('SAFETY')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedDept === 'SAFETY'
              ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-900/40'
              : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Safety Directorate</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 ml-0.5">
            JPO 100%
          </span>
        </button>
      </div>

      {/* CROSS-DEPARTMENTAL DEPENDENCY CONFLICT ALERT & PROPOSE TIME SHIFT */}
      {(selectedDept === 'ALL' || selectedDept === 'TRACTION' || selectedDept === 'ENGINEERING') && (
        <DependencyConflictBanner
          key={`dept-conflict-${refreshKey}`}
          conflicts={mockStore.getConflicts()}
          onRefreshConflicts={() => setRefreshKey((k) => k + 1)}
          onNavigateToConflicts={() => onNavigate('conflicts')}
          className="mb-4"
        />
      )}

      {/* DEPARTMENT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {Object.values(departmentProfiles)
          .filter((profile) => selectedDept === 'ALL' || profile.department === selectedDept)
          .map((profile) => {
            const Icon = profile.icon;
            const isSelected = selectedDept === profile.department;

            return (
              <div
                key={profile.department}
                className={`p-4 rounded-xl border transition-all relative overflow-hidden bg-slate-900/70 hover:bg-slate-900/90 ${
                  isSelected
                    ? 'border-sky-500 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top: Department Name, Designation, Health Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg border ${profile.badgeBg} ${profile.badgeBorder} ${profile.badgeText}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white uppercase tracking-wide">
                        {profile.title.split('(')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400">{profile.hindiTitle}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                      profile.healthScore >= 90
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {profile.healthScore}% Readiness
                  </span>
                </div>

                {/* HOD Officer Lead */}
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] mb-3">
                  <div className="text-slate-400 text-[10px]">Departmental Officer Lead:</div>
                  <div className="font-bold text-slate-200">{profile.hodName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{profile.hodDesignation}</div>
                </div>

                {/* Key Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{profile.keyMetricLabel}</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">{profile.keyMetricValue}</div>
                    <div className="text-[9px] text-slate-500 truncate">{profile.keyMetricSub}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{profile.secondaryMetricLabel}</div>
                    <div className="text-sm font-bold text-sky-400 mt-0.5">{profile.secondaryMetricValue}</div>
                    <div className="text-[9px] text-slate-500">
                      {profile.activeBlocksToday} Active Blocks
                    </div>
                  </div>
                </div>

                {/* Subsystem Health Matrix */}
                <div className="space-y-1.5 mb-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/70 text-[10px]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Subsystem Telemetry</span>
                    <span className="text-slate-500">Status</span>
                  </div>
                  {profile.subsystems.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5 border-t border-slate-800/40">
                      <span className="text-slate-300 truncate mr-2">{sub.name}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          sub.status === 'OPTIMAL'
                            ? 'text-emerald-400'
                            : sub.status === 'MODERATE'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {sub.metric}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Real-time Departmental Directive / Bulletin */}
                <div className="p-2 rounded-lg bg-blue-950/20 border border-blue-900/40 text-[10px] text-slate-300 mb-3 flex items-start gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{profile.bulletin}</span>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span>{profile.fleetAssignedCount} Machines</span>
                    <span>•</span>
                    <span>{profile.manpowerGangCount} Gangs</span>
                  </div>

                  <button
                    onClick={() => {
                      handleSelectDept(profile.department);
                      onNavigate('resource_allocation', { department: profile.department });
                    }}
                    className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <span>Manage Resources</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* CROSS-DEPARTMENTAL JOINT BLOCKS & INTERLOCK COORDINATION TABLE */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Cross-Departmental Joint Blocks Matrix (संयुक्त ब्लॉक समन्वय)
              </h4>
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {aggregateMetrics.jointCoordinatedCount} / {aggregateMetrics.totalJoint} Coordinated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-departmental works requiring simultaneous Engineering, Electrical, S&T, and Operating sign-offs to eliminate isolated track blocking and redundant train delays.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Signed Off
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3 h-3" /> Awaiting Clearance
            </span>
          </div>
        </div>

        {/* Joint Blocks Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Block ID & Activity</th>
                <th className="p-3">Corridor & Section</th>
                <th className="p-3">Window</th>
                <th className="p-3">Lead Dept</th>
                <th className="p-3 text-center">Engineering</th>
                <th className="p-3 text-center">Electrical</th>
                <th className="p-3 text-center">S&T</th>
                <th className="p-3 text-center">Operating</th>
                <th className="p-3 text-center">Safety</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30 text-[11px]">
              {filteredJointBlocks.map((block) => (
                <tr key={block.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white text-xs">{block.name}</div>
                    <div className="text-[10px] text-slate-500">{block.id}</div>
                  </td>

                  <td className="p-3">
                    <div className="text-slate-200 font-semibold">{block.corridorId}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{block.section}</div>
                  </td>

                  <td className="p-3">
                    <div className="text-slate-300">{block.scheduledTime}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{block.durationMinutes} min</div>
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                      {block.leadDepartment}
                    </span>
                  </td>

                  {/* Sign-off columns with interactive click to sign/unsign */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSignoff(block.id, 'engineering')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        block.signoffs.engineering
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                          : 'text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-300'
                      }`}
                      title="Toggle Engineering Signoff"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSignoff(block.id, 'traction')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        block.signoffs.traction
                          ? 'text-amber-400 bg-amber-950/60 border border-amber-800'
                          : 'text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-300'
                      }`}
                      title="Toggle Electrical / Traction Signoff"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSignoff(block.id, 'st')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        block.signoffs.st
                          ? 'text-sky-400 bg-sky-950/60 border border-sky-800'
                          : 'text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-300'
                      }`}
                      title="Toggle S&T Signoff"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSignoff(block.id, 'operations')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        block.signoffs.operations
                          ? 'text-indigo-400 bg-indigo-950/60 border border-indigo-800'
                          : 'text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-300'
                      }`}
                      title="Toggle Operations Signoff"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleSignoff(block.id, 'safety')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        block.signoffs.safety
                          ? 'text-purple-400 bg-purple-950/60 border border-purple-800'
                          : 'text-slate-500 bg-slate-950 border border-slate-800 hover:text-slate-300'
                      }`}
                      title="Toggle Safety Directorate Signoff"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>

                  <td className="p-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        block.status === 'ALL_APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                      }`}
                    >
                      {block.status === 'ALL_APPROVED' ? 'LOCKED & SAFE' : 'AWAITING SIGNOFF'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEPARTMENT COLLABORATION BANNER & QUICK SYNC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Smart Joint Procedure Order (JPO) Engine:</strong> Automatically combines track tamping, OHE wire inspection, and point machine overhauling into single shadow windows, saving an average of 4.2 hours of passenger train delay daily.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('shadow_block')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Shadow Block Planner</span>
          </button>
          <button
            onClick={() => onNavigate('conflict_management')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Resolve Conflicts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
