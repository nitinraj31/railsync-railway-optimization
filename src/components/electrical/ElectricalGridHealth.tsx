import React, { useState, useMemo } from 'react';
import {
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Cpu,
  Power,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Flame,
  BatteryCharging,
  BatteryWarning,
  Gauge,
  Workflow,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Corridor } from '../../types';

interface ElectricalGridHealthProps {
  corridors: Corridor[];
  onNavigate: (screen: string, itemData?: any) => void;
}

export type GridSimScenario = 'NORMAL' | 'PEAK_SURGE' | 'FEEDER_TRIP' | 'SIGNAL_AT_FAIL';

export interface SubstationData {
  id: string;
  code: string;
  name: string;
  corridorId: string;
  corridorName: string;
  ratedMva: number;
  currentMva: number;
  voltageKv: number;
  primaryGridKv: number; // 132kV or 220kV
  powerFactor: number;
  transformerTempC: number;
  feedersActive: number;
  totalFeeders: number;
  scadaStatus: 'ONLINE' | 'STANDBY' | 'WARNING' | 'ALERT';
  neutralSectionStatus: 'HEALTHY' | 'SURGE_MONITORED' | 'ISOLATED';
  signalingIpsBackupHours: number; // Battery headroom
  signalingAtFeedOk: boolean;
  maintenanceEquipmentFeedOk: boolean;
  vulnerabilityCount: number;
  vulnerabilities: {
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    target: 'SIGNALING' | 'TRACTION_OHE' | 'MAINTENANCE_FLEET';
    description: string;
    impact: string;
    mitigation: string;
  }[];
}

export const ElectricalGridHealth: React.FC<ElectricalGridHealthProps> = ({
  corridors,
  onNavigate,
}) => {
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>('ALL');
  const [activeScenario, setActiveScenario] = useState<GridSimScenario>('NORMAL');
  const [selectedSubstation, setSelectedSubstation] = useState<SubstationData | null>(null);
  const [showBridgingModal, setShowBridgingModal] = useState<boolean>(false);
  const [bridgingTargetTss, setBridgingTargetTss] = useState<string>('TSS-01');
  const [bridgingSuccess, setBridgingSuccess] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Base Traction Sub-Stations (TSS) Telemetry
  const baseSubstations: SubstationData[] = useMemo(() => [
    {
      id: 'TSS-01',
      code: 'TSS-GZB',
      name: 'Ghaziabad Junction Traction Sub-Station',
      corridorId: 'C001',
      corridorName: 'Northern Main Trunk (NDLS - GZB)',
      ratedMva: 30,
      currentMva: 21.8,
      voltageKv: 25.2,
      primaryGridKv: 220,
      powerFactor: 0.97,
      transformerTempC: 56,
      feedersActive: 2,
      totalFeeders: 2,
      scadaStatus: 'ONLINE',
      neutralSectionStatus: 'HEALTHY',
      signalingIpsBackupHours: 6.5,
      signalingAtFeedOk: true,
      maintenanceEquipmentFeedOk: true,
      vulnerabilityCount: 0,
      vulnerabilities: [],
    },
    {
      id: 'TSS-02',
      code: 'TSS-FDB',
      name: 'Faridabad / Ballabgarh 25kV Traction Sub-Station',
      corridorId: 'C002',
      corridorName: 'Southern High-Speed Spur (NDLS - FDB)',
      ratedMva: 30,
      currentMva: 24.6,
      voltageKv: 24.8,
      primaryGridKv: 220,
      powerFactor: 0.96,
      transformerTempC: 62,
      feedersActive: 2,
      totalFeeders: 2,
      scadaStatus: 'ONLINE',
      neutralSectionStatus: 'HEALTHY',
      signalingIpsBackupHours: 5.2,
      signalingAtFeedOk: true,
      maintenanceEquipmentFeedOk: true,
      vulnerabilityCount: 1,
      vulnerabilities: [
        {
          id: 'V-02-1',
          severity: 'WARNING',
          target: 'TRACTION_OHE',
          description: 'Catenary Jumper Contact Thermal Rise (+14°C over ambient) at KM 22/4',
          impact: 'Potential pantograph flashover during 130 km/h Vande Bharat acceleration',
          mitigation: 'Schedule thermovision scan with Tower Wagon RUPS-OHE-12',
        },
      ],
    },
    {
      id: 'TSS-03',
      code: 'TSS-SSB',
      name: 'Shakurbasti / Nangloi Heavy Freight Sub-Station',
      corridorId: 'C003',
      corridorName: 'Western Heavy Freight & Passenger (SSB - ROK)',
      ratedMva: 25,
      currentMva: 22.4,
      voltageKv: 23.9,
      primaryGridKv: 132,
      powerFactor: 0.93,
      transformerTempC: 68,
      feedersActive: 2,
      totalFeeders: 2,
      scadaStatus: 'WARNING',
      neutralSectionStatus: 'SURGE_MONITORED',
      signalingIpsBackupHours: 4.0,
      signalingAtFeedOk: true,
      maintenanceEquipmentFeedOk: true,
      vulnerabilityCount: 2,
      vulnerabilities: [
        {
          id: 'V-03-1',
          severity: 'WARNING',
          target: 'TRACTION_OHE',
          description: 'Substation load at 89.6% rated capacity due to 58-wagon BOXN rake simultaneous start',
          impact: 'Voltage dip to 23.4 kV at Rohtak outer loop; reduces locomotive tractive effort',
          mitigation: 'Stagger freight departure by 6 mins or bridge via Bahadurgarh SP',
        },
        {
          id: 'V-03-2',
          severity: 'INFO',
          target: 'MAINTENANCE_FLEET',
          description: 'Auxiliary line block isolation interlock pending for night tamping on Down line',
          impact: 'Plasser 09-3X machine holding at Nangloi siding awaiting de-energization confirmation',
          mitigation: 'Auto-verify VCB-03 earthing discharge rods before block start',
        },
      ],
    },
    {
      id: 'TSS-04',
      code: 'TSS-HAP',
      name: 'Hapur / Moradabad Feeder Sub-Station',
      corridorId: 'C004',
      corridorName: 'Eastern Mixed Express Link (ANVT - MB)',
      ratedMva: 30,
      currentMva: 17.5,
      voltageKv: 25.4,
      primaryGridKv: 132,
      powerFactor: 0.98,
      transformerTempC: 51,
      feedersActive: 2,
      totalFeeders: 2,
      scadaStatus: 'ONLINE',
      neutralSectionStatus: 'HEALTHY',
      signalingIpsBackupHours: 7.0,
      signalingAtFeedOk: true,
      maintenanceEquipmentFeedOk: true,
      vulnerabilityCount: 0,
      vulnerabilities: [],
    },
    {
      id: 'TSS-05',
      code: 'TSS-TMD',
      name: 'Central Base Track Machine Depot & Siding TSS',
      corridorId: 'CENTRAL_DEPOT',
      corridorName: 'Central Base Track Machine Depot (C-TMD)',
      ratedMva: 20,
      currentMva: 11.2,
      voltageKv: 25.1,
      primaryGridKv: 132,
      powerFactor: 0.98,
      transformerTempC: 48,
      feedersActive: 2,
      totalFeeders: 2,
      scadaStatus: 'ONLINE',
      neutralSectionStatus: 'HEALTHY',
      signalingIpsBackupHours: 8.5,
      signalingAtFeedOk: true,
      maintenanceEquipmentFeedOk: true,
      vulnerabilityCount: 0,
      vulnerabilities: [],
    },
  ], []);

  // Compute live scenario-adjusted substations
  const liveSubstations: SubstationData[] = useMemo(() => {
    return baseSubstations.map((sub) => {
      const copy = { ...sub, vulnerabilities: [...sub.vulnerabilities] };

      if (activeScenario === 'PEAK_SURGE') {
        if (copy.id === 'TSS-03') {
          copy.currentMva = 24.1; // 96.4%
          copy.voltageKv = 22.8;
          copy.transformerTempC = 74;
          copy.scadaStatus = 'ALERT';
          copy.vulnerabilityCount = 3;
          copy.vulnerabilities.unshift({
            id: 'V-SURGE-1',
            severity: 'CRITICAL',
            target: 'TRACTION_OHE',
            description: 'CRITICAL LOAD SURGE: 96.4% MVA threshold breached. Catenary voltage depressed to 22.8 kV',
            impact: 'Risk of thermal trip on 25kV VCB-31; freight tractive power severely limited',
            mitigation: 'Implement instant SCADA auto-bridging from Shakurbasti auxiliary feeder',
          });
        }
        if (copy.id === 'TSS-02') {
          copy.currentMva = 27.2; // 90.6%
          copy.voltageKv = 24.1;
          copy.transformerTempC = 67;
          copy.scadaStatus = 'WARNING';
        }
      } else if (activeScenario === 'FEEDER_TRIP') {
        if (copy.id === 'TSS-01') {
          copy.feedersActive = 1;
          copy.currentMva = 13.2;
          copy.voltageKv = 23.4;
          copy.scadaStatus = 'ALERT';
          copy.vulnerabilityCount = 2;
          copy.vulnerabilities.unshift({
            id: 'V-TRIP-1',
            severity: 'CRITICAL',
            target: 'TRACTION_OHE',
            description: 'Feeder F1 (Ghaziabad Up Line) TRIPPED on overcurrent fault (Distance Relay Zone 1)',
            impact: 'C001 Up Line OHE isolated; Rajdhani TR102 and EMU 64002 holding at Sahibabad outer signal',
            mitigation: 'Activate Sectioning Post (SP) bridging interrupter to draw power from Anand Vihar TSS-04',
          });
        }
      } else if (activeScenario === 'SIGNAL_AT_FAIL') {
        if (copy.id === 'TSS-02') {
          copy.signalingAtFeedOk = false;
          copy.signalingIpsBackupHours = 2.2;
          copy.scadaStatus = 'WARNING';
          copy.vulnerabilityCount = 2;
          copy.vulnerabilities.unshift({
            id: 'V-SIG-1',
            severity: 'CRITICAL',
            target: 'SIGNALING',
            description: '25kV/230V Auxiliary Transformer (AT) feeding Electronic Interlocking at Chander Nagar TRIPPED',
            impact: 'Signaling running on battery UPS (2.2h runtime remaining). Station signals fail-safe to RED if battery drains',
            mitigation: 'Auto-start standby 15kVA silent diesel generator & dispatch S&T electrical supervisor',
          });
        }
      }

      return copy;
    });
  }, [baseSubstations, activeScenario]);

  // Filtered substations
  const filteredSubstations = useMemo(() => {
    if (selectedCorridorFilter === 'ALL') return liveSubstations;
    return liveSubstations.filter((s) => s.corridorId === selectedCorridorFilter);
  }, [liveSubstations, selectedCorridorFilter]);

  // Overall Grid Health Metrics
  const gridMetrics = useMemo(() => {
    const total = liveSubstations.length;
    const totalRatedMva = liveSubstations.reduce((sum, s) => sum + s.ratedMva, 0);
    const totalCurrentMva = liveSubstations.reduce((sum, s) => sum + s.currentMva, 0);
    const avgLoadPct = Math.round((totalCurrentMva / totalRatedMva) * 100);
    const avgVoltage = (
      liveSubstations.reduce((sum, s) => sum + s.voltageKv, 0) / total
    ).toFixed(1);

    const totalVulnerabilities = liveSubstations.reduce((sum, s) => sum + s.vulnerabilityCount, 0);
    const criticalVulns = liveSubstations.reduce(
      (sum, s) => sum + s.vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
      0
    );

    const signalingAtOkCount = liveSubstations.filter((s) => s.signalingAtFeedOk).length;
    const signalingAtHealthPct = Math.round((signalingAtOkCount / total) * 100);

    // Grid Stability Score (0 - 100)
    let stabilityScore = 100;
    if (avgLoadPct > 80) stabilityScore -= 12;
    if (avgLoadPct > 90) stabilityScore -= 20;
    if (criticalVulns > 0) stabilityScore -= criticalVulns * 15;
    if (totalVulnerabilities > criticalVulns) stabilityScore -= (totalVulnerabilities - criticalVulns) * 4;
    if (signalingAtHealthPct < 100) stabilityScore -= 18;
    stabilityScore = Math.max(25, Math.min(100, stabilityScore));

    let stabilityTier: 'EXCELLENT' | 'STABLE' | 'ELEVATED_RISK' | 'CRITICAL_GRID' = 'STABLE';
    if (stabilityScore >= 92) stabilityTier = 'EXCELLENT';
    else if (stabilityScore >= 78) stabilityTier = 'STABLE';
    else if (stabilityScore >= 60) stabilityTier = 'ELEVATED_RISK';
    else stabilityTier = 'CRITICAL_GRID';

    return {
      totalRatedMva,
      totalCurrentMva: Number(totalCurrentMva.toFixed(1)),
      avgLoadPct,
      avgVoltage,
      totalVulnerabilities,
      criticalVulns,
      signalingAtHealthPct,
      stabilityScore,
      stabilityTier,
    };
  }, [liveSubstations]);

  // 24-Hour Load & Voltage Stability Profile for chart
  const hourlyStabilityData = useMemo(() => {
    return [
      { hour: '00:00', loadMva: 48, voltageKv: 25.4, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '02:00', loadMva: 42, voltageKv: 25.6, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '04:00', loadMva: 52, voltageKv: 25.3, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '06:00', loadMva: 82, voltageKv: 24.9, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '08:00', loadMva: 98, voltageKv: 24.4, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '10:00', loadMva: 104, voltageKv: 24.1, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '12:00', loadMva: 88, voltageKv: 24.8, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '14:00', loadMva: 92, voltageKv: 24.6, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '16:00', loadMva: 108, voltageKv: 23.9, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '18:00', loadMva: 116, voltageKv: 23.6, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '20:00', loadMva: 102, voltageKv: 24.2, stableZoneMin: 22.5, stableZoneMax: 26.5 },
      { hour: '22:00', loadMva: 74, voltageKv: 25.0, stableZoneMin: 22.5, stableZoneMax: 26.5 },
    ];
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleExecuteBridging = () => {
    setBridgingSuccess(true);
    setTimeout(() => {
      setBridgingSuccess(false);
      setShowBridgingModal(false);
      setActiveScenario('NORMAL');
    }, 1500);
  };

  // Helper for load percentage badge styling
  const getLoadBadgeClasses = (loadPct: number) => {
    if (loadPct >= 90) {
      return 'bg-rose-950 text-rose-300 border-rose-700 font-bold animate-pulse';
    } else if (loadPct >= 80) {
      return 'bg-amber-950 text-amber-300 border-amber-700 font-bold';
    } else if (loadPct >= 65) {
      return 'bg-sky-950 text-sky-300 border-sky-700';
    } else {
      return 'bg-emerald-950 text-emerald-300 border-emerald-700';
    }
  };

  return (
    <div
      id="electrical-grid-health-card"
      className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md p-5 space-y-5 transition-all"
    >
      {/* HEADER WITH REAL-TIME TELEMETRY & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg border bg-amber-950/80 border-amber-800/60 text-amber-400 shrink-0 mt-0.5">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                Electrical Grid Health & Traction Telemetry
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                25kV SCADA FEED
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${
                  gridMetrics.stabilityTier === 'EXCELLENT'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : gridMetrics.stabilityTier === 'STABLE'
                    ? 'bg-sky-950 text-sky-300 border-sky-700'
                    : gridMetrics.stabilityTier === 'ELEVATED_RISK'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                }`}
              >
                {gridMetrics.stabilityScore}% GRID STABILITY ({gridMetrics.stabilityTier.replace('_', ' ')})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitors 25kV AC traction substation loads, catenary voltage stability, and auxiliary AT power feeds to prevent train stalling, signaling fail-safe trips, and maintenance equipment isolation delays.
            </p>
          </div>
        </div>

        {/* SCENARIO SIMULATOR SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto font-mono text-xs">
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              id="grid-sim-normal-btn"
              onClick={() => setActiveScenario('NORMAL')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                activeScenario === 'NORMAL'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Normal Grid
            </button>
            <button
              id="grid-sim-surge-btn"
              onClick={() => setActiveScenario('PEAK_SURGE')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                activeScenario === 'PEAK_SURGE'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Peak Surge
            </button>
            <button
              id="grid-sim-trip-btn"
              onClick={() => setActiveScenario('FEEDER_TRIP')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                activeScenario === 'FEEDER_TRIP'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feeder Trip
            </button>
            <button
              id="grid-sim-signaling-btn"
              onClick={() => setActiveScenario('SIGNAL_AT_FAIL')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                activeScenario === 'SIGNAL_AT_FAIL'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Signal AT Outage
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh SCADA Grid Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TOP LEVEL GRID METRICS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Total Substation Load</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">
            {gridMetrics.totalCurrentMva} / {gridMetrics.totalRatedMva} MVA
          </div>
          <div className="text-[10px] text-slate-500">{gridMetrics.avgLoadPct}% Fleet Utilization</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Mean 25kV Catenary Voltage</div>
          <div className="text-lg font-bold text-sky-400 mt-0.5">{gridMetrics.avgVoltage} kV</div>
          <div className="text-[10px] text-slate-500">Nominal 25.0 kV (±10%)</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Signaling AT Feed Health</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {gridMetrics.signalingAtHealthPct}% Active
          </div>
          <div className="text-[10px] text-slate-500">Auto-Changeover IPS Ready</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Grid Frequency</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">49.98 Hz</div>
          <div className="text-[10px] text-slate-500">Limit: 50.0 Hz ± 0.2</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] text-slate-400">Maintenance Fleet Feeds</div>
          <div className="text-lg font-bold text-sky-300 mt-0.5">100% Certified</div>
          <div className="text-[10px] text-slate-500">Tower Wagon & Tamping Bays</div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            gridMetrics.criticalVulns > 0
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : gridMetrics.totalVulnerabilities > 0
              ? 'bg-amber-950/40 border-amber-800 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <div className="text-[10px]">Active Grid Vulnerabilities</div>
          <div className="text-lg font-bold mt-0.5 flex items-center gap-1">
            {gridMetrics.criticalVulns > 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : gridMetrics.totalVulnerabilities > 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{gridMetrics.totalVulnerabilities} Identified</span>
          </div>
          <div className="text-[10px]">
            {gridMetrics.criticalVulns > 0
              ? `${gridMetrics.criticalVulns} Immediate Outages`
              : 'Zero Critical Tripping'}
          </div>
        </div>
      </div>

      {/* FILTER & CORRIDOR SELECTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-[11px] font-bold flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            CORRIDOR:
          </span>

          <button
            onClick={() => setSelectedCorridorFilter('ALL')}
            className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              selectedCorridorFilter === 'ALL'
                ? 'bg-amber-950/80 text-amber-200 border border-amber-600/70 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Corridors (5 TSS)
          </button>

          {corridors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCorridorFilter(c.id)}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
                selectedCorridorFilter === c.id
                  ? 'bg-amber-950/80 text-amber-200 border border-amber-600/70 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {c.id} ({c.name.split(' ')[0]})
            </button>
          ))}

          <button
            onClick={() => setSelectedCorridorFilter('CENTRAL_DEPOT')}
            className={`px-2.5 py-1 rounded transition-colors text-[11px] cursor-pointer ${
              selectedCorridorFilter === 'CENTRAL_DEPOT'
                ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-600/70 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Central TMD
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>132kV / 220kV Grid Synced</span>
          <span className="text-slate-600">•</span>
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>RDSO Traction Manual Vol II</span>
        </div>
      </div>

      {/* SUBSTATION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSubstations.map((sub) => {
          const loadPct = Math.round((sub.currentMva / sub.ratedMva) * 100);
          const hasCritical = sub.vulnerabilities.some((v) => v.severity === 'CRITICAL');
          const hasWarning = sub.vulnerabilities.some((v) => v.severity === 'WARNING');

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubstation(sub)}
              className={`p-4 rounded-xl border transition-all cursor-pointer font-mono relative overflow-hidden bg-slate-900/60 hover:bg-slate-900/90 ${
                hasCritical
                  ? 'border-rose-700/80 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/50'
                  : hasWarning
                  ? 'border-amber-700/70'
                  : 'border-slate-800 hover:border-sky-700/70'
              }`}
            >
              {/* Card Top: Code, ID, SCADA status */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold text-[10px]">
                    {sub.code}
                  </span>
                  <span className="font-bold text-white text-xs">{sub.id}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold ${
                      sub.scadaStatus === 'ONLINE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : sub.scadaStatus === 'WARNING'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                    }`}
                  >
                    SCADA {sub.scadaStatus}
                  </span>
                </div>
              </div>

              {/* Substation Name & Corridor */}
              <div className="text-xs font-semibold text-slate-100 truncate">
                {sub.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate mb-3">
                {sub.corridorName} ({sub.primaryGridKv}kV Supply)
              </div>

              {/* Load Progress Bar & Voltage Metrics */}
              <div className="space-y-1.5 mb-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Traction Load:</span>
                  <span className="font-bold text-slate-200">
                    {sub.currentMva} / {sub.ratedMva} MVA{' '}
                    <span className={`px-1 rounded text-[9px] border ml-1 ${getLoadBadgeClasses(loadPct)}`}>
                      {loadPct}%
                    </span>
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      loadPct >= 90
                        ? 'bg-rose-500'
                        : loadPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, loadPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Catenary V:</span>
                    <span className={sub.voltageKv < 24.0 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                      {sub.voltageKv} kV
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Feeders:</span>
                    <span className={sub.feedersActive < sub.totalFeeders ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {sub.feedersActive} / {sub.totalFeeders} Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-system Status Row */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/80 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-sky-400" />
                  <span className="text-slate-400">Signaling AT:</span>
                  <span className={sub.signalingAtFeedOk ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {sub.signalingAtFeedOk ? 'OK' : 'TRIPPED'}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-400">UPS:</span>
                  <span className="text-slate-200 font-bold">{sub.signalingIpsBackupHours}h</span>
                </div>
              </div>

              {/* Vulnerabilities Callout if any */}
              {sub.vulnerabilities.length > 0 ? (
                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/40 text-[10px] space-y-1">
                  <div className="flex items-center gap-1 text-rose-300 font-bold">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{sub.vulnerabilities.length} Operational Risk(s)</span>
                  </div>
                  <div className="text-slate-300 truncate">
                    {sub.vulnerabilities[0].description}
                  </div>
                </div>
              ) : (
                <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30 text-[10px] text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Traction & Signaling Stable
                  </span>
                  <span className="text-slate-500">Nominal</span>
                </div>
              )}

              {/* Card Footer Action */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-[10px]">
                <span className="text-slate-500">Transformer Oil: {sub.transformerTempC}°C</span>
                <span className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-bold">
                  <span>Inspect Telemetry</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 24-HOUR TRACTION LOAD & VOLTAGE STABILITY GRAPH */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              24-Hour Grid Load Profile vs. 25kV Catenary Voltage Stability
            </h4>
            <p className="text-[11px] text-slate-400">
              Correlates train traffic acceleration density with substation load (MVA) and voltage sag margins.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              Substation Load (MVA)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
              Catenary Voltage (kV)
            </span>
          </div>
        </div>

        <div className="h-52 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyStabilityData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
              <YAxis yAxisId="left" stroke="#f59e0b" fontSize={10} domain={[30, 140]} />
              <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={10} domain={[20, 28]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="loadMva"
                fill="#f59e0b"
                fillOpacity={0.15}
                stroke="#f59e0b"
                strokeWidth={2}
                name="Load (MVA)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="voltageKv"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#38bdf8' }}
                name="Voltage (kV)"
              />
              <ReferenceLine yAxisId="right" y={22.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min Voltage Limit (22.5kV)', fill: '#ef4444', fontSize: 9 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OUTAGE PREVENTION & OPERATIONAL ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>SCADA Safety Interlock:</strong> Prior to releasing any Tower Wagon OHE isolation block, SCADA verifies adjacent feeder bridging to protect passenger train schedule slots.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setShowBridgingModal(true);
              setBridgingTargetTss('TSS-01');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Simulate Feeder Bridging (SP)</span>
          </button>
          <button
            onClick={() => onNavigate('maintenance_assets', { department: 'TRACTION' })}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Traction Assets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DETAILED SUBSTATION MODAL */}
      {selectedSubstation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border border-sky-800/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl font-mono animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{selectedSubstation.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                    {selectedSubstation.code}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Serving Corridor: {selectedSubstation.corridorName} • Primary Grid: {selectedSubstation.primaryGridKv}kV
                </div>
              </div>

              <button
                onClick={() => setSelectedSubstation(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Electrical Subsystem Diagnostic Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Traction Load (MVA)</div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {selectedSubstation.currentMva} / {selectedSubstation.ratedMva}
                </div>
                <div className="text-[10px] text-slate-500">
                  {Math.round((selectedSubstation.currentMva / selectedSubstation.ratedMva) * 100)}% of Rating
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Catenary Voltage</div>
                <div className="text-base font-bold text-sky-400 mt-0.5">
                  {selectedSubstation.voltageKv} kV
                </div>
                <div className="text-[10px] text-slate-500">Nominal 25.0 kV</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Power Factor (cos φ)</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {selectedSubstation.powerFactor} Lag
                </div>
                <div className="text-[10px] text-slate-500">Capacitor Bank Active</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Signaling AT Feed (230V)</div>
                <div className="text-base font-bold mt-0.5 flex items-center gap-1">
                  {selectedSubstation.signalingAtFeedOk ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> TRIPPED
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">UPS: {selectedSubstation.signalingIpsBackupHours}h Available</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Transformer Core Temp</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {selectedSubstation.transformerTempC}°C
                </div>
                <div className="text-[10px] text-slate-500">Trip Alarm at 85°C</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Neutral Section Health</div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {selectedSubstation.neutralSectionStatus}
                </div>
                <div className="text-[10px] text-slate-500">Magnetic Transponders OK</div>
              </div>
            </div>

            {/* Vulnerabilities and Outage Hazards */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Identified Outages & Signaling Equipment Impact
              </div>

              {selectedSubstation.vulnerabilities.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No potential electrical outages or signaling disruptions identified for this substation.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSubstation.vulnerabilities.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        v.severity === 'CRITICAL'
                          ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                          : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {v.description}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 uppercase">
                          Target: {v.target.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <strong>Impact:</strong> {v.impact}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <strong>RDSO Mitigation:</strong> {v.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedSubstation(null);
                  onNavigate('resource_allocation', { corridorId: selectedSubstation.corridorId, tab: 'MACHINERY' });
                }}
                className="text-sky-400 hover:text-sky-300 underline text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Tower Wagon & Power Block Dispatch</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBridgingTargetTss(selectedSubstation.id);
                    setShowBridgingModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>Execute SCADA Bridging</span>
                </button>
                <button
                  onClick={() => setSelectedSubstation(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCADA FEEDER BRIDGING SIMULATION MODAL */}
      {showBridgingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border border-amber-600/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase">
                  Execute SCADA Sectioning Post (SP) Bridging
                </h4>
              </div>
              <button
                onClick={() => setShowBridgingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When a Traction Sub-Station experiences an overload or feeder trip, the Remote Control Centre (RCC) can close the Sectioning Post (SP) bridging interrupter. This transfers the catenary load to the adjacent healthy sub-station, maintaining uninterrupted 25kV power for train traction and signaling ATs.
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="text-slate-400 text-[10px]">Select Target Sub-Station for Load Transfer:</div>
              <div className="flex flex-wrap gap-2">
                {liveSubstations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setBridgingTargetTss(s.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      bridgingTargetTss === s.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {s.code} ({s.id})
                  </button>
                ))}
              </div>
            </div>

            {bridgingSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SCADA Bridging Command Executed! OHE catenary power stabilized across adjacent section.</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBridgingModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBridging}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Close Bridging Interrupter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
