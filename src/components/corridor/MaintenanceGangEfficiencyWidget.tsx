import React, { useState, useMemo } from 'react';
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
  Timer,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Download,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Info,
  Wrench,
  Users,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  FileText,
  X,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { ManpowerGang, Corridor, OptimizedBlock, DepartmentType } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';

export interface MaintenanceGangEfficiencyRecord {
  gangId: string;
  gangName: string;
  corridorId: string;
  corridorName: string;
  department: DepartmentType;
  trade: string;
  headcount: number;
  supervisor: string;
  assignedSection: string;
  blockId: string;
  taskTitle: string;
  date: string;
  shift: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number; // positive = overrun, negative = early clearance
  efficiencyPct: number;   // (planned / actual) * 100
  status: 'OPTIMAL_AHEAD' | 'ON_TIME' | 'MINOR_OVERRUN' | 'CRITICAL_OVERRUN';
  overrunReason?: string;
  operationalFactor: string;
  machineAssigned: string;
  speedRestrictionImpact: 'NONE' | 'AVOIDED' | 'CAUTION_ORDER_ISSUED';
  historicalBlocks: {
    blockId: string;
    date: string;
    plannedMinutes: number;
    actualMinutes: number;
    task: string;
  }[];
}

interface MaintenanceGangEfficiencyWidgetProps {
  gangs: ManpowerGang[];
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onNavigate?: (screen: string, itemData?: any) => void;
  className?: string;
}

export const MaintenanceGangEfficiencyWidget: React.FC<MaintenanceGangEfficiencyWidgetProps> = ({
  gangs,
  corridors,
  blocks = [],
  onNavigate,
  className = '',
}) => {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'EFFICIENCY' | 'VARIANCE' | 'PLANNED' | 'ACTUAL' | 'NAME'>('VARIANCE');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [chartViewMode, setChartViewMode] = useState<'GROUPED_BAR' | 'VARIANCE_DELTA' | 'EFFICIENCY_PCT'>('GROUPED_BAR');
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [selectedGangDetail, setSelectedGangDetail] = useState<MaintenanceGangEfficiencyRecord | null>(null);

  // Corridor lookup helper
  const corridorMap = useMemo(() => {
    const map = new Map<string, string>();
    corridors.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [corridors]);

  // ---------------------------------------------------------------------------
  // DATA DERIVATION: GANG EFFICIENCY RECORDS
  // ---------------------------------------------------------------------------
  const efficiencyRecords = useMemo<MaintenanceGangEfficiencyRecord[]>(() => {
    // Generate realistic, consistent maintenance block turnaround records for all gangs
    const benchmarkData: Record<string, {
      plannedMin: number;
      actualMin: number;
      taskTitle: string;
      reason: string;
      factor: string;
      machine: string;
      speedImpact: 'NONE' | 'AVOIDED' | 'CAUTION_ORDER_ISSUED';
      history: { blockId: string; date: string; plannedMin: number; actualMin: number; task: string }[];
    }> = {
      'GANG-ENG-C01-A': {
        plannedMin: 90,
        actualMin: 82,
        taskTitle: 'Deep Ballast Screening & High-Speed Tensor Alignment (KM 14)',
        reason: 'Accelerated rail tensioning via digital stress monitors and rapid gang staging.',
        factor: 'Optimal hydraulic tensor pressure maintained throughout block.',
        machine: 'Plasser 09-3X Dynamic Tamper + Ballast Regulator',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T008', date: '2026-09-02', plannedMin: 90, actualMin: 85, task: 'Continuous Rail Welding' },
          { blockId: 'BLK-T004', date: '2026-08-28', plannedMin: 120, actualMin: 112, task: 'Sleeper Spacing Overhaul' },
          { blockId: 'BLK-T001', date: '2026-08-22', plannedMin: 60, actualMin: 58, task: 'Fishplate Lubrication & Fastener Torque' },
        ],
      },
      'GANG-ENG-C01-B': {
        plannedMin: 75,
        actualMin: 73,
        taskTitle: 'Turnout Sleeper Renewal & Pandrol Fastening Overhaul',
        reason: 'Flawless clip extraction and torque wrench calibration.',
        factor: 'Staged components pre-placed on cess line 20 mins prior to block.',
        machine: 'Unomatic Point Tamper',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T014', date: '2026-09-01', plannedMin: 75, actualMin: 72, task: 'Switch Rail Replacement' },
          { blockId: 'BLK-T009', date: '2026-08-26', plannedMin: 90, actualMin: 88, task: 'Diamond Crossing Re-packing' },
        ],
      },
      'GANG-SNT-C01': {
        plannedMin: 60,
        actualMin: 55,
        taskTitle: 'Point Machine Stroke Calibration & Electronic Interlocking Loop Test',
        reason: 'Automated diagnostic test set validated point detection contact on first pass.',
        factor: 'Dual S&T engineers tested both Normal & Reverse positions in parallel.',
        machine: 'Electronic Interlocking Fluke Multi-Loop Analyzer',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T020', date: '2026-09-03', plannedMin: 60, actualMin: 56, task: 'Track Circuit Bond Wire Replacement' },
          { blockId: 'BLK-T015', date: '2026-08-29', plannedMin: 45, actualMin: 42, task: 'Axle Counter Reset & Drift Recalibration' },
        ],
      },
      'GANG-TRC-C01': {
        plannedMin: 90,
        actualMin: 106,
        taskTitle: '25kV OHE Catenary Dropper Staggering & Neutral Section Inspection',
        reason: 'Tower wagon siding shunting delay caused 16-minute block overrun.',
        factor: 'High crosswinds required safety isolation confirmation delay from Substation TSS-01.',
        machine: 'Four-Wheeler Diesel Tower Wagon (TW-01)',
        speedImpact: 'CAUTION_ORDER_ISSUED',
        history: [
          { blockId: 'BLK-T012', date: '2026-09-04', plannedMin: 90, actualMin: 104, task: 'Contact Wire Wear Measurement' },
          { blockId: 'BLK-T006', date: '2026-08-27', plannedMin: 75, actualMin: 82, task: 'Insulator Washing & De-greasing' },
        ],
      },
      'GANG-SFT-C01': {
        plannedMin: 60,
        actualMin: 58,
        taskTitle: 'Caution Order Banner Flag Installation & Lookout Radar Perimeter',
        reason: 'Rapid perimeter deployment conforming to G&SR 4.13 safety mandate.',
        factor: 'Radio transceivers checked and pre-synchronized with Central Control.',
        machine: 'Portable Doppler Track Lookout Sentinel & Radar Sirens',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-SFT-02', date: '2026-09-03', plannedMin: 60, actualMin: 58, task: 'Night Block Perimeter Protection' },
          { blockId: 'BLK-SFT-01', date: '2026-08-30', plannedMin: 60, actualMin: 59, task: 'Mega Block Flagger Marshalling' },
        ],
      },
      'GANG-ENG-C02': {
        plannedMin: 90,
        actualMin: 88,
        taskTitle: 'Freight Loop Ultrasonic Flaw Testing (USFD) & Rail Defect Tagging',
        reason: 'USFD flaw detection car traversed 14 km section without transducer failure.',
        factor: 'Probe couplant fluid temperature preheated to prevent ultrasonic attenuation.',
        machine: 'Digital USFD Flaw Car (Sperry Rail System)',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T025', date: '2026-09-02', plannedMin: 90, actualMin: 87, task: 'Turnout Lead Rail Sonar Inspection' },
          { blockId: 'BLK-T018', date: '2026-08-25', plannedMin: 100, actualMin: 98, task: 'Weld Integrity Radiographic Cross-check' },
        ],
      },
      'GANG-SNT-C02': {
        plannedMin: 60,
        actualMin: 72,
        taskTitle: 'Axle Counter Resetting & Block Proving Track Circuit Renewal',
        reason: 'Signal cable insulation splice impedance fault took 12 mins to isolate.',
        factor: 'Damp ballast conditions along freight siding degraded bond resistance.',
        machine: 'High-Frequency Time Domain Reflectometer (TDR)',
        speedImpact: 'CAUTION_ORDER_ISSUED',
        history: [
          { blockId: 'BLK-T028', date: '2026-09-01', plannedMin: 60, actualMin: 68, task: 'Point Motor Gear Lubrication' },
          { blockId: 'BLK-T021', date: '2026-08-26', plannedMin: 45, actualMin: 51, task: 'Relay Interlocking Contact Burnishing' },
        ],
      },
      'GANG-TRC-C02': {
        plannedMin: 80,
        actualMin: 76,
        taskTitle: 'Traction Substation Feeder Line Isolator Servicing (Tuglakabad Yard)',
        reason: 'Smooth breaker isolation and earthing rod clamping completed in 15 mins.',
        factor: 'Experienced TRD crew completed jumper wire crimping rapidly.',
        machine: 'Aerial Articulated Platform Boom Truck',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T031', date: '2026-09-03', plannedMin: 80, actualMin: 78, task: 'Surge Arrester Grounding Verification' },
          { blockId: 'BLK-T024', date: '2026-08-28', plannedMin: 90, actualMin: 86, task: 'Section Insulator Arc Chute Renewal' },
        ],
      },
      'GANG-SFT-C02': {
        plannedMin: 60,
        actualMin: 60,
        taskTitle: 'Freight Siding Shunting Flagger Protection & Derailment Trap Check',
        reason: 'Zero deviation from standard 60-minute window.',
        factor: 'Complete synchronization with Section Traffic Controller (SCOR).',
        machine: 'Solar-Powered LED Flare Sentry Units',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-SFT-04', date: '2026-09-02', plannedMin: 60, actualMin: 60, task: 'Yard Fouling Point Protection' },
        ],
      },
      'GANG-ENG-C03-A': {
        plannedMin: 120,
        actualMin: 138,
        taskTitle: 'Track Realignment & Dynamic Track Stabilization (KM 28–34)',
        reason: 'DTS hydraulic vibration motor overheat required 18-minute cooldown cycle.',
        factor: 'Extremely dense stone ballast resisted initial tamping depth penetration.',
        machine: 'Dynamic Track Stabilizer (DTS) + High-Output Tamper',
        speedImpact: 'CAUTION_ORDER_ISSUED',
        history: [
          { blockId: 'BLK-T035', date: '2026-09-04', plannedMin: 120, actualMin: 135, task: 'Cant Correction & Rail Levelling' },
          { blockId: 'BLK-T029', date: '2026-08-30', plannedMin: 110, actualMin: 122, task: 'Ballast Compaction & Shoulder Profile' },
        ],
      },
      'GANG-ENG-C03-B': {
        plannedMin: 90,
        actualMin: 84,
        taskTitle: 'High-Speed Rail Flange Grinding & Corrugation Removal',
        reason: 'Rail Grinder (RGM) completed 6-pass profile rectification 6 mins early.',
        factor: 'Sharp diamond grinding stones delivered target rail head curvature on pass 5.',
        machine: '20-Stone Rail Grinder Machine (RGM-72)',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T040', date: '2026-09-03', plannedMin: 90, actualMin: 85, task: 'Switch Diamond Profile Grinding' },
          { blockId: 'BLK-T033', date: '2026-08-27', plannedMin: 90, actualMin: 86, task: 'Curve Gauge Face Rail Dressing' },
        ],
      },
      'GANG-SNT-C03': {
        plannedMin: 70,
        actualMin: 66,
        taskTitle: 'Automatic Block Signalling (ABS) Signal Post 4-Aspect Overhaul',
        reason: 'LED signal lamp cluster replacement and aspect voltage setting completed swiftly.',
        factor: 'Pre-assembled LED modules permitted plug-and-play installation.',
        machine: 'S&T Signal Ladder Carrier & Digital Luxmeter',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T045', date: '2026-09-02', plannedMin: 70, actualMin: 67, task: 'Track Relay Q-Series Contact Testing' },
          { blockId: 'BLK-T037', date: '2026-08-26', plannedMin: 60, actualMin: 58, task: 'Level Crossing Interlocked Boom Test' },
        ],
      },
      'GANG-TRC-C03': {
        plannedMin: 90,
        actualMin: 114,
        taskTitle: 'Catenary Wire Tension Balance Weight Replacement & Pull-Off Arm Alignment',
        reason: 'Winch cable jam during tension weight counter-hoisting incurred 24m delay.',
        factor: 'Restricted corridor clearance slowed crane boom articulation.',
        machine: '8-Wheeler Heavy Tower Wagon (TW-03)',
        speedImpact: 'CAUTION_ORDER_ISSUED',
        history: [
          { blockId: 'BLK-T050', date: '2026-09-04', plannedMin: 90, actualMin: 110, task: '25kV Current Collector Pantograph Inspection' },
          { blockId: 'BLK-T042', date: '2026-08-29', plannedMin: 85, actualMin: 99, task: 'Substation Transformer Bushing Testing' },
        ],
      },
      'GANG-SFT-C03': {
        plannedMin: 60,
        actualMin: 57,
        taskTitle: 'High-Speed Mainline Banner Marshalling & GPS Beacon Deployment',
        reason: 'Immediate GPS telemetry link established with Divisional Control within 3 mins.',
        factor: 'All 6 lookouts equipped with IR-compliant tactical headlamps and siren horns.',
        machine: 'GPS-Synced Track Safety Warning Array',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-SFT-06', date: '2026-09-03', plannedMin: 60, actualMin: 58, task: 'High-Speed Corridor Block Protection' },
        ],
      },
      'GANG-ENG-C04': {
        plannedMin: 90,
        actualMin: 89,
        taskTitle: 'Bridge Bearing Greasing & Expansion Gap Laser Profiling (KM 08)',
        reason: 'Laser sensor scan completed bearing alignment audit within scheduled timeline.',
        factor: 'Hydraulic torque jacking cradle secured bridge girder seamlessly.',
        machine: 'Heavy Hydraulic Jacking Console & Laser Micrometer',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T055', date: '2026-09-01', plannedMin: 90, actualMin: 91, task: 'Abutment Retaining Wall Anchor Check' },
          { blockId: 'BLK-T048', date: '2026-08-25', plannedMin: 80, actualMin: 80, task: 'Steel Girder Ultrasonic Flaw Testing' },
        ],
      },
      'GANG-SNT-C04': {
        plannedMin: 60,
        actualMin: 59,
        taskTitle: 'Palwal Yard Route Relay Interlocking (RRI) Contact Burnishing',
        reason: 'Executed on schedule with 100% route verification test clearances.',
        factor: 'Checklist compliance confirmed via digital validation tablet.',
        machine: 'RRI Diagnostic Test Simulator',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T060', date: '2026-09-02', plannedMin: 60, actualMin: 60, task: 'Point Machine Detection Slide Adjustment' },
        ],
      },
      'GANG-TRC-C04': {
        plannedMin: 85,
        actualMin: 81,
        taskTitle: 'Section Insulator Arc Chute Renewal & Contact Wire Polishing',
        reason: 'Contact wire height verified 4 mins ahead of block release deadline.',
        factor: 'Fast-setting composite insulator brackets eliminated curing wait time.',
        machine: 'Self-Propelled OHE Inspection Car',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T065', date: '2026-09-03', plannedMin: 85, actualMin: 83, task: 'Dropper Wire Tension Equilibrium Test' },
        ],
      },
      'GANG-SFT-C04': {
        plannedMin: 60,
        actualMin: 58,
        taskTitle: 'Palwal Section Flagger Vigilance & Caution Board Positioning',
        reason: 'Caution boards erected at 1,200m distance conforming precisely to G&SR 15.09.',
        factor: 'Lookouts posted at 250m intervals with VHF walkie-talkie link.',
        machine: 'VHF Handheld Security Radios & Portable Siren',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-SFT-08', date: '2026-09-01', plannedMin: 60, actualMin: 59, task: 'Level Crossing Night Flare Protection' },
        ],
      },
      'GANG-RESERVE-ENG-01': {
        plannedMin: 90,
        actualMin: 86,
        taskTitle: 'Auxiliary Ballast Regulating & Rapid Tamping Intervention',
        reason: 'Reserve gang deployed on short-notice track smoothing window with high speed.',
        factor: 'Full machinery complement pre-fueled and ready at siding.',
        machine: 'Ballast Shoulder Regulator (BR-04)',
        speedImpact: 'AVOIDED',
        history: [
          { blockId: 'BLK-T070', date: '2026-08-31', plannedMin: 90, actualMin: 87, task: 'Emergency Rail Clamp Installation' },
        ],
      },
      'GANG-RESERVE-SNT-01': {
        plannedMin: 60,
        actualMin: 56,
        taskTitle: 'Division Standby Point Motor Replacement Drill',
        reason: 'Pre-assembled spare motor swapped and bolted down in under 56 mins.',
        factor: 'Quick-disconnect wiring harnesses utilized for rapid motor swap.',
        machine: 'Point Machine Hydraulic Hoist Carrier',
        speedImpact: 'NONE',
        history: [
          { blockId: 'BLK-T075', date: '2026-08-30', plannedMin: 60, actualMin: 57, task: 'Spare Axle Counter Board Calibration' },
        ],
      },
    };

    return gangs.map((gang, index) => {
      const benchmark = benchmarkData[gang.id] || {
        plannedMin: 90,
        actualMin: 88,
        taskTitle: `Sectional Maintenance & Inspection in ${gang.assignedSection}`,
        reason: 'Standard maintenance block execution conforming to IRTMM regulations.',
        factor: 'Normal weather conditions and standard machinery response.',
        machine: 'Multi-Tool Mechanical Rig',
        speedImpact: 'NONE' as const,
        history: [
          { blockId: `BLK-M0${index + 1}`, date: '2026-09-01', plannedMin: 90, actualMin: 88, task: 'Standard Inspection' },
        ],
      };

      // If simulation is active (10-min pre-block staging discipline), reduce actual time by 8-12% for overrun gangs
      let actualMin = benchmark.actualMin;
      if (simulationActive && actualMin > benchmark.plannedMin) {
        const reduction = Math.round((actualMin - benchmark.plannedMin) * 0.7) + 3;
        actualMin = Math.max(benchmark.plannedMin - 2, actualMin - reduction);
      }

      const varianceMinutes = actualMin - benchmark.plannedMin;
      const efficiencyPct = Number(((benchmark.plannedMin / actualMin) * 100).toFixed(1));

      let status: MaintenanceGangEfficiencyRecord['status'] = 'ON_TIME';
      if (varianceMinutes < -1) {
        status = 'OPTIMAL_AHEAD';
      } else if (varianceMinutes <= 0) {
        status = 'ON_TIME';
      } else if (varianceMinutes <= 15) {
        status = 'MINOR_OVERRUN';
      } else {
        status = 'CRITICAL_OVERRUN';
      }

      return {
        gangId: gang.id,
        gangName: gang.name,
        corridorId: gang.corridorId,
        corridorName: corridorMap.get(gang.corridorId) || gang.corridorId,
        department: gang.department,
        trade: gang.trade.replace(/_/g, ' '),
        headcount: gang.headcount,
        supervisor: gang.supervisor,
        assignedSection: gang.assignedSection,
        blockId: `BLK-${gang.id.replace('GANG-', '')}`,
        taskTitle: benchmark.taskTitle,
        date: '2026-09-05',
        shift: gang.shift.replace(/_/g, ' '),
        plannedMinutes: benchmark.plannedMin,
        actualMinutes: actualMin,
        varianceMinutes,
        efficiencyPct,
        status,
        overrunReason: benchmark.reason,
        operationalFactor: benchmark.factor,
        machineAssigned: benchmark.machine,
        speedRestrictionImpact: benchmark.speedImpact,
        historicalBlocks: benchmark.history,
      };
    });
  }, [gangs, corridorMap, simulationActive]);

  // ---------------------------------------------------------------------------
  // FILTERING & SORTING
  // ---------------------------------------------------------------------------
  const filteredAndSortedRecords = useMemo(() => {
    let result = efficiencyRecords.filter((rec) => {
      // Corridor filter
      if (selectedCorridorFilter !== 'ALL' && rec.corridorId !== selectedCorridorFilter) {
        return false;
      }
      // Department filter
      if (selectedDeptFilter !== 'ALL' && rec.department !== selectedDeptFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter === 'ON_TIME' && rec.varianceMinutes > 0) {
        return false;
      }
      if (selectedStatusFilter === 'OVERRUN' && rec.varianceMinutes <= 0) {
        return false;
      }
      if (selectedStatusFilter === 'CRITICAL' && rec.status !== 'CRITICAL_OVERRUN') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.gangName.toLowerCase().includes(q);
        const matchId = rec.gangId.toLowerCase().includes(q);
        const matchSup = rec.supervisor.toLowerCase().includes(q);
        const matchTask = rec.taskTitle.toLowerCase().includes(q);
        const matchSec = rec.assignedSection.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSup && !matchTask && !matchSec) {
          return false;
        }
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'EFFICIENCY':
          cmp = a.efficiencyPct - b.efficiencyPct;
          break;
        case 'VARIANCE':
          cmp = a.varianceMinutes - b.varianceMinutes;
          break;
        case 'PLANNED':
          cmp = a.plannedMinutes - b.plannedMinutes;
          break;
        case 'ACTUAL':
          cmp = a.actualMinutes - b.actualMinutes;
          break;
        case 'NAME':
          cmp = a.gangName.localeCompare(b.gangName);
          break;
        default:
          cmp = a.varianceMinutes - b.varianceMinutes;
      }
      return sortDirection === 'DESC' ? -cmp : cmp;
    });

    return result;
  }, [
    efficiencyRecords,
    selectedCorridorFilter,
    selectedDeptFilter,
    selectedStatusFilter,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  // ---------------------------------------------------------------------------
  // AGGREGATE SUMMARY METRICS
  // ---------------------------------------------------------------------------
  const summaryStats = useMemo(() => {
    const list = efficiencyRecords;
    if (list.length === 0) {
      return {
        avgEfficiency: 100,
        onTimeCount: 0,
        totalGangs: 0,
        onTimePct: 100,
        totalPlannedMin: 0,
        totalActualMin: 0,
        netVarianceMin: 0,
        criticalOverrunCount: 0,
        topGang: null,
        delayedGang: null,
      };
    }

    const totalPlanned = list.reduce((sum, r) => sum + r.plannedMinutes, 0);
    const totalActual = list.reduce((sum, r) => sum + r.actualMinutes, 0);
    const avgEff = Number((list.reduce((sum, r) => sum + r.efficiencyPct, 0) / list.length).toFixed(1));
    const onTime = list.filter((r) => r.varianceMinutes <= 0).length;
    const critical = list.filter((r) => r.status === 'CRITICAL_OVERRUN').length;
    const netVariance = totalActual - totalPlanned;

    // Top efficient
    const sortedByEff = [...list].sort((a, b) => b.efficiencyPct - a.efficiencyPct);
    const topGang = sortedByEff[0];
    const delayedGang = sortedByEff[sortedByEff.length - 1];

    return {
      avgEfficiency: avgEff,
      onTimeCount: onTime,
      totalGangs: list.length,
      onTimePct: Number(((onTime / list.length) * 100).toFixed(1)),
      totalPlannedMin: totalPlanned,
      totalActualMin: totalActual,
      netVarianceMin: netVariance,
      criticalOverrunCount: critical,
      topGang,
      delayedGang,
    };
  }, [efficiencyRecords]);

  // Chart data transformation
  const chartData = useMemo(() => {
    return filteredAndSortedRecords.map((r) => {
      // Short gang label for clean display on X axis
      const shortId = r.gangId.replace('GANG-', '');
      return {
        gangId: r.gangId,
        shortId,
        gangName: r.gangName,
        corridorId: r.corridorId,
        planned: r.plannedMinutes,
        actual: r.actualMinutes,
        variance: r.varianceMinutes,
        efficiencyPct: r.efficiencyPct,
        status: r.status,
        supervisor: r.supervisor,
        taskTitle: r.taskTitle,
        machine: r.machineAssigned,
        reason: r.overrunReason,
      };
    });
  }, [filteredAndSortedRecords]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleSortToggle = (field: typeof sortField) => {
    railwayAudio.playBeep(720, 0.02);
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      setSortDirection('DESC');
    }
  };

  const handleExportCsv = () => {
    railwayAudio.playBeep(850, 0.04);
    const headers = [
      'Gang ID',
      'Gang Name',
      'Corridor ID',
      'Corridor Name',
      'Department',
      'Trade',
      'Headcount',
      'Supervisor',
      'Assigned Section',
      'Task Title',
      'Planned Time (Mins)',
      'Actual Time (Mins)',
      'Variance (Mins)',
      'Efficiency %',
      'Turnaround Status',
      'Overrun / Performance Factor',
      'Assigned Machinery',
      'Speed Restriction Impact',
    ];

    const rows = filteredAndSortedRecords.map((r) => [
      `"${r.gangId}"`,
      `"${r.gangName}"`,
      `"${r.corridorId}"`,
      `"${r.corridorName}"`,
      `"${r.department}"`,
      `"${r.trade}"`,
      r.headcount,
      `"${r.supervisor}"`,
      `"${r.assignedSection}"`,
      `"${r.taskTitle}"`,
      r.plannedMinutes,
      r.actualMinutes,
      r.varianceMinutes,
      r.efficiencyPct,
      `"${r.status}"`,
      `"${r.overrunReason || r.operationalFactor}"`,
      `"${r.machineAssigned}"`,
      `"${r.speedRestrictionImpact}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maintenance_Gang_Efficiency_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="maintenance-gang-efficiency-widget"
      data-testid="maintenance-gang-efficiency-widget"
      className={`bg-[#0b1428] rounded-2xl border border-sky-900/70 p-5 md:p-6 shadow-2xl relative overflow-hidden text-slate-100 ${className}`}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ===================================================================== */}
      {/* 1. TOP HEADER & TELEMETRY BADGES */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-inner">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-wide uppercase">
                  Maintenance Gang Efficiency
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  PLANNED VS ACTUAL DURATION
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-sky-400" />
                  <span>BLOCK TURNAROUND AUDIT</span>
                </span>
                {simulationActive && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse">
                    SIMULATION: 10M PRE-STAGING BUFFER ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Comparative analysis of planned sanctioned duration against actual track block execution time for each maintenance gang. Identifies operational overruns, machine coordination delays, and fast turnaround crews.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Simulation Toggle */}
          <button
            type="button"
            id="btn-simulate-staging-buffer"
            onClick={() => {
              railwayAudio.playBeep(880, 0.03);
              setSimulationActive(!simulationActive);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              simulationActive
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-slate-700 hover:text-white'
            }`}
            title="Simulate 10-Minute Pre-Block Tool & Machine Staging discipline under IRTMM guidelines"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Pre-Staging Buffer</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            id="btn-export-gang-efficiency-csv"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Export Gang Efficiency comparison dataset as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Audit (CSV)</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. HIGH-LEVEL AGGREGATE KPI CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* KPI 1: Network Average Efficiency */}
        <div className="bg-[#091122] border border-cyan-900/60 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Network Gang Efficiency</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-200 border border-cyan-800 font-mono">
              COMPOSITE
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {summaryStats.avgEfficiency}%
            </span>
            <span
              className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                summaryStats.avgEfficiency >= 100
                  ? 'text-emerald-400'
                  : summaryStats.avgEfficiency >= 90
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {summaryStats.avgEfficiency >= 100 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{summaryStats.avgEfficiency >= 100 ? 'ON TARGET' : 'PACE LAG'}</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>IRTMM Standard: &ge;90%</span>
            <span className="text-cyan-400">{summaryStats.totalGangs} active crews</span>
          </div>
        </div>

        {/* KPI 2: On-Time Clearance Rate */}
        <div className="bg-[#091122] border border-emerald-900/60 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>On-Time Clearance</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-200 border border-emerald-800 font-mono">
              PUNCTUALITY
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {summaryStats.onTimePct}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({summaryStats.onTimeCount}/{summaryStats.totalGangs} gangs)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Blocks Cleared Within Window</span>
            <span className="text-emerald-400 font-bold">Zero Line Fouling</span>
          </div>
        </div>

        {/* KPI 3: Total Planned vs Actual Time */}
        <div className="bg-[#091122] border border-sky-900/60 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Planned vs Actual Hours</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-950 text-sky-200 border border-sky-800 font-mono">
              NET VARIANCE
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {(summaryStats.totalActualMin / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {(summaryStats.totalPlannedMin / 60).toFixed(1)}h plan
            </span>
          </div>
          <div className="text-[10px] font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Net Deviation:</span>
            <span
              className={`font-bold ${
                summaryStats.netVarianceMin <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {summaryStats.netVarianceMin <= 0
                ? `${summaryStats.netVarianceMin} min (Early)`
                : `+${summaryStats.netVarianceMin} min Overrun`}
            </span>
          </div>
        </div>

        {/* KPI 4: Critical Overrun Alerts */}
        <div className="bg-[#091122] border border-rose-900/60 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Critical Overruns (&gt;15m)</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 text-rose-200 border border-rose-800 font-mono">
              DISRUPTION RISK
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {summaryStats.criticalOverrunCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              of {summaryStats.totalGangs} crews
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Caution Order Risk:</span>
            <span
              className={`font-bold ${
                summaryStats.criticalOverrunCount === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summaryStats.criticalOverrunCount === 0 ? 'CLEARED' : 'INVESTIGATION REQ'}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. CHART VIEW CONTROLS & FILTERS */}
      {/* ===================================================================== */}
      <div className="bg-[#081020] rounded-xl border border-slate-800 p-3.5 mb-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Chart Display Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              id="chart-mode-grouped-bar"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setChartViewMode('GROUPED_BAR');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                chartViewMode === 'GROUPED_BAR'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Planned vs Actual (Minutes)</span>
            </button>

            <button
              type="button"
              id="chart-mode-variance-delta"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setChartViewMode('VARIANCE_DELTA');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                chartViewMode === 'VARIANCE_DELTA'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Variance Delta (&plusmn; Mins)</span>
            </button>

            <button
              type="button"
              id="chart-mode-efficiency-pct"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setChartViewMode('EFFICIENCY_PCT');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                chartViewMode === 'EFFICIENCY_PCT'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Efficiency % Rating</span>
            </button>
          </div>

          {/* Search Gang/Supervisor/Task */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gang, supervisor, task..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>Filter By:</span>
          </span>

          {/* Corridor Filter */}
          <select
            value={selectedCorridorFilter}
            onChange={(e) => {
              railwayAudio.playBeep(750, 0.02);
              setSelectedCorridorFilter(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Corridors (C001–C004)</option>
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              railwayAudio.playBeep(750, 0.02);
              setSelectedDeptFilter(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Departments</option>
            <option value="ENGINEERING">PWI Track Maintenance</option>
            <option value="S&T">S&T Point & Interlocking</option>
            <option value="TRACTION">TRD 25kV Catenary</option>
            <option value="SAFETY">Safety Lookout Marshals</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => {
              railwayAudio.playBeep(750, 0.02);
              setSelectedStatusFilter(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Turnaround Outcomes</option>
            <option value="ON_TIME">On-Time / Early Clearance (&le; Planned)</option>
            <option value="OVERRUN">Overrun Exceeded (&gt; Planned)</option>
            <option value="CRITICAL">Critical Overrun (&gt; 15 min delay)</option>
          </select>

          {/* Reset Filters */}
          {(selectedCorridorFilter !== 'ALL' ||
            selectedDeptFilter !== 'ALL' ||
            selectedStatusFilter !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={() => {
                railwayAudio.playBeep(650, 0.02);
                setSelectedCorridorFilter('ALL');
                setSelectedDeptFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-cyan-400 hover:text-cyan-300 underline text-[11px] ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. COMPARATIVE INTERACTIVE CHART (SIDE-BY-SIDE BARS) */}
      {/* ===================================================================== */}
      <div className="bg-[#081020] rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              {chartViewMode === 'GROUPED_BAR' && 'Comparative Block Execution Duration (Planned vs Actual Minutes)'}
              {chartViewMode === 'VARIANCE_DELTA' && 'Execution Variance Delta (Minutes Ahead / Behind Schedule)'}
              {chartViewMode === 'EFFICIENCY_PCT' && 'Gang Efficiency Performance Benchmark Ratio (%)'}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            {chartViewMode === 'GROUPED_BAR' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                  <span>Planned Time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>Actual (On-Time)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                  <span>Actual (Overrun)</span>
                </div>
              </>
            )}
            {chartViewMode === 'VARIANCE_DELTA' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>Negative: Early Clearance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                  <span>Positive: Overrun</span>
                </div>
              </>
            )}
            {chartViewMode === 'EFFICIENCY_PCT' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>&ge; 100% On/Ahead of Time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                  <span>&lt; 100% Slower than Planned</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'GROUPED_BAR' ? (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const gid = e.activePayload[0].payload.gangId;
                    const rec = efficiencyRecords.find((r) => r.gangId === gid);
                    if (rec) {
                      railwayAudio.playBeep(800, 0.03);
                      setSelectedGangDetail(rec);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortId"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  label={{
                    value: 'Duration (Minutes)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isOverrun = d.actual > d.planned;
                      return (
                        <div className="bg-[#070e1e] border border-cyan-800 p-3.5 rounded-xl shadow-2xl text-xs font-mono max-w-sm">
                          <div className="font-bold text-cyan-300 border-b border-slate-800 pb-1.5 mb-2">
                            {d.gangName} ({d.gangId})
                          </div>
                          <div className="space-y-1.5 text-slate-300 text-[11px]">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Corridor:</span>
                              <span className="font-bold text-white">{d.corridorId}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-sky-400 font-semibold">Planned Duration:</span>
                              <span className="font-bold text-sky-200">{d.planned} mins</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className={isOverrun ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                Actual Duration:
                              </span>
                              <span className={`font-bold ${isOverrun ? 'text-rose-200' : 'text-emerald-200'}`}>
                                {d.actual} mins
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-slate-800 pt-1">
                              <span className="text-slate-400">Variance:</span>
                              <span
                                className={`font-bold ${
                                  d.variance <= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {d.variance <= 0 ? `${d.variance}m (Early)` : `+${d.variance}m (Overrun)`}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Efficiency Score:</span>
                              <span className="font-bold text-cyan-300">{d.efficiencyPct}%</span>
                            </div>
                            <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                              <span className="font-semibold text-slate-300">Work Note: </span>
                              {d.reason}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  label={{ value: 'Standard 90m Window', fill: '#64748b', fontSize: 9, position: 'top' }}
                />
                <Bar dataKey="planned" name="Planned Minutes" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual Minutes" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const isOverrun = entry.actual > entry.planned;
                    const isCritical = entry.variance > 15;
                    const color = isCritical ? '#f43f5e' : isOverrun ? '#f59e0b' : '#10b981';
                    return <Cell key={`cell-actual-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            ) : chartViewMode === 'VARIANCE_DELTA' ? (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const gid = e.activePayload[0].payload.gangId;
                    const rec = efficiencyRecords.find((r) => r.gangId === gid);
                    if (rec) {
                      railwayAudio.playBeep(800, 0.03);
                      setSelectedGangDetail(rec);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortId"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  label={{
                    value: 'Delta (Mins +/-)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#070e1e] border border-cyan-800 p-3 rounded-xl shadow-xl text-xs font-mono">
                          <div className="font-bold text-white mb-1">{d.gangName}</div>
                          <div className="text-slate-300 space-y-1 text-[11px]">
                            <div>Planned: {d.planned}m | Actual: {d.actual}m</div>
                            <div className={d.variance <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              Variance: {d.variance > 0 ? `+${d.variance}m Overrun` : `${d.variance}m Early`}
                            </div>
                            <div className="text-slate-400 text-[10px]">{d.reason}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Bar dataKey="variance" name="Variance Delta" radius={[4, 4, 4, 4]}>
                  {chartData.map((entry, index) => {
                    const color = entry.variance > 15 ? '#f43f5e' : entry.variance > 0 ? '#f59e0b' : '#10b981';
                    return <Cell key={`cell-variance-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const gid = e.activePayload[0].payload.gangId;
                    const rec = efficiencyRecords.find((r) => r.gangId === gid);
                    if (rec) {
                      railwayAudio.playBeep(800, 0.03);
                      setSelectedGangDetail(rec);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortId"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  domain={[60, 120]}
                  label={{
                    value: 'Efficiency Ratio (%)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#070e1e] border border-cyan-800 p-3 rounded-xl shadow-xl text-xs font-mono">
                          <div className="font-bold text-white mb-1">{d.gangName}</div>
                          <div className="text-slate-300 text-[11px]">
                            Efficiency: <span className="font-bold text-cyan-300">{d.efficiencyPct}%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {d.efficiencyPct >= 100 ? 'Ahead of Planned Schedule' : 'Exceeded Planned Duration Window'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={100}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  label={{ value: '100% Par Target', fill: '#10b981', fontSize: 9, position: 'top' }}
                />
                <Bar dataKey="efficiencyPct" name="Efficiency %" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const color = entry.efficiencyPct >= 100 ? '#10b981' : entry.efficiencyPct >= 90 ? '#38bdf8' : '#f43f5e';
                    return <Cell key={`cell-eff-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. GANG PERFORMANCE AUDIT ROSTER TABLE */}
      {/* ===================================================================== */}
      <div className="bg-[#081020] rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Gang-by-Gang Block Execution Telemetry ({filteredAndSortedRecords.length} Gangs)
            </h3>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Click any row to inspect historical block logs and equipment pairings
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px]">
                <th
                  onClick={() => handleSortToggle('NAME')}
                  className="py-2.5 px-3.5 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Gang &amp; Supervisor</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold">Corridor &amp; Section</th>
                <th className="py-2.5 px-3 font-semibold">Maintenance Task</th>
                <th
                  onClick={() => handleSortToggle('PLANNED')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Planned</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('ACTUAL')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Actual</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('VARIANCE')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Variance</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('EFFICIENCY')}
                  className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Efficiency %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAndSortedRecords.map((rec) => {
                const isOverrun = rec.varianceMinutes > 0;
                const isCritical = rec.status === 'CRITICAL_OVERRUN';

                return (
                  <tr
                    key={rec.gangId}
                    onClick={() => {
                      railwayAudio.playBeep(820, 0.02);
                      setSelectedGangDetail(rec);
                    }}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                  >
                    {/* Gang & Supervisor */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {rec.gangName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{rec.gangId}</span>
                        <span>•</span>
                        <span>{rec.supervisor}</span>
                      </div>
                    </td>

                    {/* Corridor & Section */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {rec.corridorId}
                        </span>
                        <span className="text-slate-300 text-[11px] truncate max-w-[140px]" title={rec.assignedSection}>
                          {rec.assignedSection}
                        </span>
                      </div>
                    </td>

                    {/* Task */}
                    <td className="py-3 px-3">
                      <div className="text-slate-200 text-[11px] line-clamp-1" title={rec.taskTitle}>
                        {rec.taskTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        Machine: {rec.machineAssigned}
                      </div>
                    </td>

                    {/* Planned */}
                    <td className="py-3 px-3 text-right text-sky-300 font-bold">
                      {rec.plannedMinutes}m
                    </td>

                    {/* Actual */}
                    <td className="py-3 px-3 text-right font-bold">
                      <span className={isCritical ? 'text-rose-400' : isOverrun ? 'text-amber-400' : 'text-emerald-400'}>
                        {rec.actualMinutes}m
                      </span>
                    </td>

                    {/* Variance */}
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${
                          rec.varianceMinutes <= 0
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            : isCritical
                            ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                            : 'bg-amber-950/80 border-amber-700 text-amber-300'
                        }`}
                      >
                        {rec.varianceMinutes <= 0
                          ? `${rec.varianceMinutes}m`
                          : `+${rec.varianceMinutes}m`}
                      </span>
                    </td>

                    {/* Efficiency % */}
                    <td className="py-3 px-3 text-center font-bold">
                      <span
                        className={`${
                          rec.efficiencyPct >= 100
                            ? 'text-emerald-400'
                            : rec.efficiencyPct >= 90
                            ? 'text-sky-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {rec.efficiencyPct}%
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          rec.status === 'OPTIMAL_AHEAD'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : rec.status === 'ON_TIME'
                            ? 'bg-sky-950 text-sky-300 border-sky-700'
                            : rec.status === 'MINOR_OVERRUN'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                        }`}
                      >
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Details Link */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          railwayAudio.playBeep(850, 0.02);
                          setSelectedGangDetail(rec);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. EXPANDED GANG DETAIL MODAL / AUDIT DOSSIER */}
      {/* ===================================================================== */}
      {selectedGangDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#0b1429] border border-cyan-600/70 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#070e1e]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-600 text-cyan-400">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                    {selectedGangDetail.gangName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Gang ID: <span className="text-cyan-400 font-bold">{selectedGangDetail.gangId}</span> • Corridor {selectedGangDetail.corridorId} ({selectedGangDetail.corridorName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGangDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              {/* Top Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#081020] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">PLANNED TIME</div>
                  <div className="text-base font-bold text-sky-400 mt-0.5">
                    {selectedGangDetail.plannedMinutes} mins
                  </div>
                </div>

                <div className="bg-[#081020] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">ACTUAL TIME</div>
                  <div
                    className={`text-base font-bold mt-0.5 ${
                      selectedGangDetail.varianceMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedGangDetail.actualMinutes} mins
                  </div>
                </div>

                <div className="bg-[#081020] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">VARIANCE</div>
                  <div
                    className={`text-base font-bold mt-0.5 ${
                      selectedGangDetail.varianceMinutes <= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {selectedGangDetail.varianceMinutes <= 0
                      ? `${selectedGangDetail.varianceMinutes}m`
                      : `+${selectedGangDetail.varianceMinutes}m`}
                  </div>
                </div>

                <div className="bg-[#081020] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">EFFICIENCY RATIO</div>
                  <div className="text-base font-bold text-cyan-300 mt-0.5">
                    {selectedGangDetail.efficiencyPct}%
                  </div>
                </div>
              </div>

              {/* Progress Visualizer */}
              <div className="bg-[#081020] p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-slate-300 font-semibold">Block Execution Timeline Benchmark</span>
                  <span className="text-slate-400">
                    Par: {selectedGangDetail.plannedMinutes}m / Taken: {selectedGangDetail.actualMinutes}m
                  </span>
                </div>
                <div className="relative w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedGangDetail.varianceMinutes > 15
                        ? 'bg-rose-500'
                        : selectedGangDetail.varianceMinutes > 0
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedGangDetail.actualMinutes / Math.max(selectedGangDetail.plannedMinutes * 1.3, 120)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>Start (0m)</span>
                  <span className="text-sky-400">Planned Window ({selectedGangDetail.plannedMinutes}m)</span>
                  <span>Full Clearance</span>
                </div>
              </div>

              {/* Operational Narrative & Factors */}
              <div className="bg-[#081020] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Execution Analysis &amp; Field Factors</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-slate-400">Work Description: </span>
                  {selectedGangDetail.taskTitle}
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-slate-400">Turnaround Rationale: </span>
                  {selectedGangDetail.overrunReason}
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-slate-400">Field Condition: </span>
                  {selectedGangDetail.operationalFactor}
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Machinery Deployed: </span>
                  <span className="text-purple-300 font-bold">{selectedGangDetail.machineAssigned}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Speed Restriction Outcome: </span>
                  <span
                    className={`font-bold ${
                      selectedGangDetail.speedRestrictionImpact === 'AVOIDED'
                        ? 'text-emerald-400'
                        : selectedGangDetail.speedRestrictionImpact === 'CAUTION_ORDER_ISSUED'
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {selectedGangDetail.speedRestrictionImpact === 'AVOIDED'
                      ? 'CAUTION ORDER AVOIDED - NORMAL SPEED RESTORED'
                      : selectedGangDetail.speedRestrictionImpact === 'CAUTION_ORDER_ISSUED'
                      ? 'TEMPORARY SPEED RESTRICTION (TSR) MANDATED (30 KM/H)'
                      : 'NO SPEED IMPACT'}
                  </span>
                </div>
              </div>

              {/* Historical Blocks Executed by this Gang */}
              <div className="bg-[#081020] p-3.5 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recent Maintenance Block History (Audit Log)</span>
                </div>
                <div className="space-y-1.5">
                  {selectedGangDetail.historicalBlocks.map((hb, i) => (
                    <div
                      key={`hist-${i}`}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{hb.task}</div>
                        <div className="text-[10px] text-slate-400">
                          {hb.blockId} • {hb.date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-slate-300">
                          Planned: {hb.plannedMinutes}m | Actual:{' '}
                          <span
                            className={
                              hb.actualMinutes > hb.plannedMinutes ? 'text-rose-400' : 'text-emerald-400'
                            }
                          >
                            {hb.actualMinutes}m
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-bold ${
                            hb.actualMinutes <= hb.plannedMinutes ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {hb.actualMinutes <= hb.plannedMinutes ? 'CLEARED ON TIME' : `+${hb.actualMinutes - hb.plannedMinutes}m OVERRUN`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-[#070e1e] flex items-center justify-between">
              <div className="text-[10px] text-slate-400">
                Supervisor: {selectedGangDetail.supervisor} ({selectedGangDetail.headcount} men)
              </div>
              <button
                type="button"
                onClick={() => setSelectedGangDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Close Audit Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
