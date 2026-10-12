import React, { useState, useMemo } from 'react';
import {
  Clock,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Users,
  HardHat,
  Filter,
  Search,
  ArrowRightLeft,
  Calendar,
  Layers,
  Moon,
  Sun,
  Sunrise,
  ShieldAlert,
  Info,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Corridor, ManpowerGang, DepartmentType, CrewFatigueProfile } from '../../types';
import { mockStore } from '../../services/api';
import { crewFatigueService } from '../../services/crewFatigueService';
import { railwayAudio } from '../../services/railwayAudio';

interface GangDeploymentTimelineGanttProps {
  corridors: Corridor[];
  onReassignGang?: (gang: ManpowerGang) => void;
  onRefreshData?: () => void;
}

interface EnrichedGangDeployment {
  gang: ManpowerGang;
  corridor: Corridor;
  fatigueScore: number;
  fatigueRiskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  primaryFatigueDriver: string;
  consecutiveNightShifts: number;
  continuousDutyHours: number;
  sleepDebtHours: number;
  hoerCompliant: boolean;
  shiftStartHour: number;
  shiftEndHour: number;
  shiftDisplay: string;
  profile?: CrewFatigueProfile;
}

export const GangDeploymentTimelineGantt: React.FC<GangDeploymentTimelineGanttProps> = ({
  corridors,
  onReassignGang,
  onRefreshData,
}) => {
  // State filters
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<'ALL' | DepartmentType>('ALL');
  const [filterFatigueRisk, setFilterFatigueRisk] = useState<'ALL' | 'CRITICAL_HIGH' | 'MODERATE_LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGangId, setSelectedGangId] = useState<string | null>(null);
  const [hoveredGangId, setHoveredGangId] = useState<string | null>(null);

  // Time scale configuration: 24 hours (00:00 to 24:00)
  const hours = useMemo(() => Array.from({ length: 25 }, (_, i) => i), []);

  // Current operational hour (for vertical tracker line)
  const currentLocalHour = 8.28; // ~08:17 AM in 24h format

  // Data sources
  const gangs = useMemo<ManpowerGang[]>(() => {
    try {
      return mockStore.getManpowerGangs() || [];
    } catch {
      return [];
    }
  }, []);

  const fatigueProfiles = useMemo<CrewFatigueProfile[]>(() => {
    try {
      return crewFatigueService.getProfiles() || [];
    } catch {
      return [];
    }
  }, []);

  // Correlate gangs with fatigue analytics
  const enrichedGangs = useMemo<EnrichedGangDeployment[]>(() => {
    return gangs.map((g) => {
      const corridor = corridors.find((c) => c.id === g.corridorId) || {
        id: g.corridorId,
        name: `Corridor ${g.corridorId}`,
        code: g.corridorId,
        utilization: 75,
      } as Corridor;

      // Find matched staff profile or compute deterministic fatigue
      const matchedProfile = fatigueProfiles.find((p) => p.gangId === g.id);

      let fatigueScore = 32;
      let fatigueRiskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      let primaryFatigueDriver = 'Standard 8h day roster with 14h rest margin';
      let consecutiveNightShifts = 0;
      let continuousDutyHours = 8.0;
      let sleepDebtHours = 0.5;
      let hoerCompliant = true;

      // Shift window mapping
      let shiftStartHour = 6;
      let shiftEndHour = 14;
      let shiftDisplay = '06:00 – 14:00 (Day Shift)';

      if (g.shift === 'AFTERNOON_SHIFT') {
        shiftStartHour = 14;
        shiftEndHour = 22;
        shiftDisplay = '14:00 – 22:00 (Afternoon Shift)';
        fatigueScore = 48;
        fatigueRiskTier = 'MODERATE';
        primaryFatigueDriver = 'Extended evening shunting window, moderate rest gap';
        continuousDutyHours = 8.0;
        sleepDebtHours = 1.2;
      } else if (g.shift === 'NIGHT_MEGA_BLOCK') {
        shiftStartHour = 22;
        shiftEndHour = 6; // overnight
        shiftDisplay = '22:00 – 06:00 (Night Mega Block)';
        fatigueScore = 84;
        fatigueRiskTier = 'CRITICAL';
        primaryFatigueDriver = 'Circadian trough (02:00–04:00) + 3rd consecutive night shift';
        consecutiveNightShifts = 3;
        continuousDutyHours = 9.5;
        sleepDebtHours = 3.8;
        hoerCompliant = false;
      }

      // If gang is on standby
      if (g.status === 'STANDBY') {
        fatigueScore = Math.max(18, fatigueScore - 30);
        fatigueRiskTier = 'LOW';
        primaryFatigueDriver = 'Standby depot reserve; zero active track strain';
        continuousDutyHours = 4.0;
        sleepDebtHours = 0.0;
      }

      // If matched profile exists, use rich service profile
      if (matchedProfile) {
        fatigueScore = matchedProfile.circadianFatigueIndex;
        fatigueRiskTier = matchedProfile.riskTier;
        primaryFatigueDriver = matchedProfile.primaryFatigueDriver;
        consecutiveNightShifts = matchedProfile.consecutiveNightShifts;
        sleepDebtHours = matchedProfile.sleepDebtHours;
        hoerCompliant = !matchedProfile.currentRestDeficit;
      }

      return {
        gang: g,
        corridor,
        fatigueScore,
        fatigueRiskTier,
        primaryFatigueDriver,
        consecutiveNightShifts,
        continuousDutyHours,
        sleepDebtHours,
        hoerCompliant,
        shiftStartHour,
        shiftEndHour,
        shiftDisplay,
        profile: matchedProfile,
      };
    });
  }, [gangs, corridors, fatigueProfiles]);

  // Filtered dataset
  const filteredGangs = useMemo(() => {
    return enrichedGangs.filter((item) => {
      if (filterCorridor !== 'ALL' && item.gang.corridorId !== filterCorridor) return false;
      if (filterDepartment !== 'ALL' && item.gang.department !== filterDepartment) return false;
      if (filterFatigueRisk === 'CRITICAL_HIGH') {
        if (item.fatigueRiskTier !== 'CRITICAL' && item.fatigueRiskTier !== 'HIGH') return false;
      } else if (filterFatigueRisk === 'MODERATE_LOW') {
        if (item.fatigueRiskTier !== 'MODERATE' && item.fatigueRiskTier !== 'LOW') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.gang.name.toLowerCase().includes(q);
        const matchesSupervisor = item.gang.supervisor.toLowerCase().includes(q);
        const matchesId = item.gang.id.toLowerCase().includes(q);
        const matchesSection = item.gang.assignedSection.toLowerCase().includes(q);
        if (!matchesName && !matchesSupervisor && !matchesId && !matchesSection) return false;
      }
      return true;
    });
  }, [enrichedGangs, filterCorridor, filterDepartment, filterFatigueRisk, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = enrichedGangs.length;
    const critical = enrichedGangs.filter((g) => g.fatigueRiskTier === 'CRITICAL').length;
    const high = enrichedGangs.filter((g) => g.fatigueRiskTier === 'HIGH').length;
    const avgFatigue = total > 0 ? Math.round(enrichedGangs.reduce((s, g) => s + g.fatigueScore, 0) / total) : 38;
    const hoerViolations = enrichedGangs.filter((g) => !g.hoerCompliant).length;
    const activeOnTrack = enrichedGangs.filter((g) => g.gang.status === 'ACTIVE_ON_TRACK').length;

    return { total, critical, high, avgFatigue, hoerViolations, activeOnTrack };
  }, [enrichedGangs]);

  // Helper for Gantt bar visual styling based on fatigue
  const getFatigueColorClasses = (tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL') => {
    switch (tier) {
      case 'CRITICAL':
        return {
          bar: 'bg-rose-600/90 border-rose-400 text-rose-100 shadow-sm shadow-rose-950/60',
          badge: 'bg-rose-950 text-rose-300 border-rose-700/80 animate-pulse',
          dot: 'bg-rose-400',
          text: 'text-rose-400',
        };
      case 'HIGH':
        return {
          bar: 'bg-amber-600/90 border-amber-400 text-amber-100 shadow-sm shadow-amber-950/60',
          badge: 'bg-amber-950 text-amber-300 border-amber-700/80',
          dot: 'bg-amber-400',
          text: 'text-amber-400',
        };
      case 'MODERATE':
        return {
          bar: 'bg-yellow-600/80 border-yellow-400 text-yellow-100',
          badge: 'bg-yellow-950 text-yellow-300 border-yellow-700/80',
          dot: 'bg-yellow-400',
          text: 'text-yellow-400',
        };
      case 'LOW':
      default:
        return {
          bar: 'bg-emerald-600/85 border-emerald-400 text-emerald-100',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-700/80',
          dot: 'bg-emerald-400',
          text: 'text-emerald-400',
        };
    }
  };

  return (
    <div
      id="gang-deployment-timeline-gantt"
      className="bg-[#070e20] border border-sky-900/60 rounded-xl p-4 md:p-5 text-slate-200 transition-all shadow-xl"
    >
      {/* HEADER & SUMMARY RIBBON */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Gang Deployment Timeline &amp; Fatigue Telemetry</span>
            </h3>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
              GANTT 24H VIEW
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time hourly assignment timeline correlated with circadian strain profiles, continuous duty hours, and Indian Railways HOER safety rest ceilings.
          </p>
        </div>

        {/* SUMMARY STAT BADGES */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Deployed:</span>
            <span className="font-bold text-white">{stats.activeOnTrack} Gangs</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Avg Fatigue:</span>
            <span className="font-bold text-emerald-400">{stats.avgFatigue}%</span>
          </div>

          {stats.critical > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700 flex items-center gap-1.5 text-rose-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold">{stats.critical} Critical Fatigue</span>
            </div>
          )}
        </div>
      </div>

      {/* TOOLBAR CONTROLS: CORRIDOR, RISK, SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Corridor Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Corridor:</span>
            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer outline-none"
            >
              <option value="ALL">All Corridors</option>
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code || c.id} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Dept:</span>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="ENGINEERING">Civil Engineering (P-Way)</option>
              <option value="S&T">Signaling &amp; Telecom</option>
              <option value="TRACTION">Traction (TRD OHE)</option>
            </select>
          </div>

          {/* Fatigue Risk Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Fatigue Risk:</span>
            <select
              value={filterFatigueRisk}
              onChange={(e) => setFilterFatigueRisk(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL_HIGH">Critical &amp; High Only (&gt; 65%)</option>
              <option value="MODERATE_LOW">Moderate &amp; Low (&lt; 65%)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search gang, supervisor, section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs w-56 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* SHIFT COLOR CODE & CIRCADIAN WINDOW GUIDE */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-slate-950/70 border border-slate-800/80 rounded-lg mb-3 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300 uppercase">24-Hour Shifts:</span>
          <span className="flex items-center gap-1 text-sky-300">
            <Sun className="w-3 h-3 text-sky-400" />
            <span>06:00 – 14:00 Day Shift</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <Sunrise className="w-3 h-3 text-amber-400" />
            <span>14:00 – 22:00 Afternoon Shift</span>
          </span>
          <span className="flex items-center gap-1 text-purple-300">
            <Moon className="w-3 h-3 text-purple-400" />
            <span>22:00 – 06:00 Night Mega Block</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          <span>Circadian High-Risk Window: 02:00 – 04:00 AM</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* GANTT TIMELINE TABLE & CHART CONTAINER */}
      {/* ==================================================================== */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#040814]">
        {/* TIME SCALE HEADER BAR */}
        <div className="flex border-b border-slate-800 bg-[#070e20] text-[10px] font-mono text-slate-400">
          {/* Gang Info Label Column */}
          <div className="w-72 shrink-0 p-2.5 border-r border-slate-800 font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Maintenance Gang / Trade</span>
            <span className="text-[9px] text-slate-500">Corridor</span>
          </div>

          {/* Fatigue Telemetry Column */}
          <div className="w-48 shrink-0 p-2.5 border-r border-slate-800 font-bold uppercase text-slate-300">
            <span>Projected Fatigue</span>
          </div>

          {/* 24-Hour Time Grid Header */}
          <div className="flex-1 relative flex">
            {hours.slice(0, 24).map((h) => {
              const isCircadianTrough = h >= 2 && h <= 4;
              return (
                <div
                  key={h}
                  className={`flex-1 text-center py-2 border-r border-slate-800/50 text-[9px] ${
                    isCircadianTrough ? 'bg-rose-950/30 text-rose-300 font-bold' : ''
                  }`}
                >
                  {h.toString().padStart(2, '0')}:00
                </div>
              );
            })}

            {/* Vertical Marker for Current Time */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 pointer-events-none"
              style={{ left: `${(currentLocalHour / 24) * 100}%` }}
              title={`Current Time Marker: ${currentLocalHour}:00`}
            >
              <div className="w-2 h-2 -ml-[3px] -mt-1 bg-cyan-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* GANTT ROWS */}
        <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto">
          {filteredGangs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No maintenance gangs matched the selected filters.
            </div>
          ) : (
            filteredGangs.map((item) => {
              const { gang, corridor, fatigueScore, fatigueRiskTier, primaryFatigueDriver, shiftStartHour, shiftEndHour } = item;
              const isSelected = selectedGangId === gang.id;
              const colors = getFatigueColorClasses(fatigueRiskTier);

              // Calculate Gantt bar placement on 24h scale
              const isOvernight = shiftStartHour > shiftEndHour;
              const barLeftPct = (shiftStartHour / 24) * 100;
              const barWidthPct = isOvernight
                ? ((24 - shiftStartHour + shiftEndHour) / 24) * 100
                : ((shiftEndHour - shiftStartHour) / 24) * 100;

              return (
                <div
                  key={gang.id}
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setSelectedGangId(isSelected ? null : gang.id);
                  }}
                  onMouseEnter={() => setHoveredGangId(gang.id)}
                  onMouseLeave={() => setHoveredGangId(null)}
                  className={`flex items-center transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-950/40' : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Left Column: Gang Metadata */}
                  <div className="w-72 shrink-0 p-2.5 border-r border-slate-800/80 font-mono text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-100 truncate text-[11px]">
                        {gang.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-900 text-sky-300 border border-slate-700/70 shrink-0">
                        {corridor.code || gang.corridorId}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                      <span className="truncate">{gang.assignedSection}</span>
                      <span className="text-slate-300 font-bold">{gang.headcount} Staff</span>
                    </div>

                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                      Sup: {gang.supervisor}
                    </div>
                  </div>

                  {/* Middle Column: Fatigue Telemetry & Gauge */}
                  <div className="w-48 shrink-0 p-2.5 border-r border-slate-800/80 font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-black text-xs ${colors.text}`}>
                        {fatigueScore}%
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${colors.badge}`}>
                        {fatigueRiskTier}
                      </span>
                    </div>

                    {/* Miniature Fatigue Bar */}
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-1">
                      <div
                        className={`h-full ${
                          fatigueRiskTier === 'CRITICAL'
                            ? 'bg-rose-500'
                            : fatigueRiskTier === 'HIGH'
                            ? 'bg-amber-500'
                            : fatigueRiskTier === 'MODERATE'
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                        } rounded-full`}
                        style={{ width: `${Math.min(100, fatigueScore)}%` }}
                      />
                    </div>

                    <div className="text-[9px] text-slate-400 truncate" title={primaryFatigueDriver}>
                      {primaryFatigueDriver}
                    </div>
                  </div>

                  {/* Right Column: 24-Hour Gantt Timeline Bar Area */}
                  <div className="flex-1 relative h-14 flex items-center px-1">
                    {/* Hour grid lines */}
                    {hours.slice(0, 24).map((h) => (
                      <div
                        key={h}
                        className="flex-1 h-full border-r border-slate-800/30 pointer-events-none"
                      />
                    ))}

                    {/* Current Time Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/80 z-10 pointer-events-none"
                      style={{ left: `${(currentLocalHour / 24) * 100}%` }}
                    />

                    {/* Gantt Bar for Shift Assignment */}
                    {isOvernight ? (
                      // Overnight split bar (22:00 to 24:00, and 00:00 to 06:00)
                      <>
                        {/* Segment 1: 22:00 to 24:00 */}
                        <div
                          className={`absolute h-7 rounded border text-[10px] font-mono flex items-center justify-between px-2 font-bold ${colors.bar}`}
                          style={{
                            left: `${(22 / 24) * 100}%`,
                            width: `${(2 / 24) * 100}%`,
                          }}
                        >
                          <span className="truncate">Mega</span>
                        </div>
                        {/* Segment 2: 00:00 to 06:00 */}
                        <div
                          className={`absolute h-7 rounded border text-[10px] font-mono flex items-center justify-between px-2 font-bold ${colors.bar}`}
                          style={{
                            left: `0%`,
                            width: `${(6 / 24) * 100}%`,
                          }}
                        >
                          <span className="truncate">Night Block (00:00–06:00)</span>
                          {fatigueRiskTier === 'CRITICAL' && (
                            <span className="text-[9px] px-1 bg-black/40 rounded font-black text-white">
                              HOTSPOT
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      // Single continuous shift bar
                      <div
                        className={`absolute h-7 rounded border text-[10px] font-mono flex items-center justify-between px-2.5 font-bold transition-transform ${
                          colors.bar
                        } ${isSelected ? 'ring-2 ring-white scale-[1.01]' : ''}`}
                        style={{
                          left: `${barLeftPct}%`,
                          width: `${barWidthPct}%`,
                        }}
                      >
                        <span className="truncate">
                          {gang.shift === 'DAY_SHIFT' ? 'Day Window' : 'Afternoon Window'} ({item.shiftDisplay.split(' ')[0]})
                        </span>

                        <div className="flex items-center gap-1 text-[9px]">
                          <span>{gang.trade.replace('_', ' ')}</span>
                          {onReassignGang && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                railwayAudio.playBeep(780, 0.03);
                                onReassignGang(gang);
                              }}
                              className="ml-1 px-1.5 py-0.2 rounded bg-black/50 hover:bg-black/80 text-white font-bold transition-colors cursor-pointer"
                              title="Reassign this gang to balance fatigue or corridor load"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SELECTED GANG DETAIL CARD */}
      {selectedGangId && (
        <div className="mt-4 p-3.5 bg-slate-900 border border-sky-600/80 rounded-xl font-mono text-xs animate-in fade-in duration-150">
          {(() => {
            const selected = enrichedGangs.find((g) => g.gang.id === selectedGangId);
            if (!selected) return null;

            return (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{selected.gang.name}</span>
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px]">
                      {selected.gang.id}
                    </span>
                    <span className="text-slate-400">· Corridor {selected.gang.corridorId}</span>
                  </div>

                  <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                    <span>Supervisor: <strong>{selected.gang.supervisor}</strong></span>
                    <span>Headcount: <strong>{selected.gang.headcount} Personnel</strong></span>
                    <span>Shift: <strong>{selected.shiftDisplay}</strong></span>
                    <span>Fatigue Index: <strong className={selected.fatigueRiskTier === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}>{selected.fatigueScore}% ({selected.fatigueRiskTier})</strong></span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Operational Diagnosis: {selected.primaryFatigueDriver} (Continuous Duty: {selected.continuousDutyHours}h, Night Shifts: {selected.consecutiveNightShifts})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onReassignGang && (
                    <button
                      type="button"
                      onClick={() => onReassignGang(selected.gang)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Reassign / Rest Gang</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedGangId(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
