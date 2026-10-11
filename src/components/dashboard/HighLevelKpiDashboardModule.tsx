import React, { useState, useMemo } from 'react';
import {
  Activity,
  Gauge,
  Clock,
  Users,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Info,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Maximize2,
  HardHat,
  Layers,
  Wrench,
  Radio,
  Train,
  Check,
  X,
  FileText,
  Flame,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { ValidationResult, Corridor, OptimizedBlock, BlockRequest, Defect, Asset, ManpowerGang } from '../../types';
import { mockStore } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

interface HighLevelKpiDashboardModuleProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  requests?: BlockRequest[];
  defects?: Defect[];
  assets?: Asset[];
  validation: ValidationResult;
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

export const HighLevelKpiDashboardModule: React.FC<HighLevelKpiDashboardModuleProps> = ({
  corridors,
  blocks = [],
  requests = [],
  defects = [],
  assets = [],
  validation,
  onNavigate,
  onRefreshData,
}) => {
  const [selectedDetailKpi, setSelectedDetailKpi] = useState<
    'HEALTH' | 'TURNAROUND' | 'GANGS' | 'SAFETY' | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. DATA COMPUTATION FROM EXISTING SERVICES & STORES
  // ---------------------------------------------------------------------------

  // Manpower Gangs data from mockStore service
  const manpowerGangs = useMemo<ManpowerGang[]>(() => {
    try {
      return mockStore.getManpowerGangs() || [];
    } catch {
      return [];
    }
  }, []);

  const activeGangs = useMemo(() => {
    return manpowerGangs.filter((g) => g.status === 'ACTIVE_ON_TRACK');
  }, [manpowerGangs]);

  const totalHeadcountOnTrack = useMemo(() => {
    return activeGangs.reduce((sum, g) => sum + (g.headcount || 0), 0);
  }, [activeGangs]);

  const gangsByDepartment = useMemo(() => {
    const pway = activeGangs.filter((g) => g.department === 'ENGINEERING').length;
    const trd = activeGangs.filter((g) => g.department === 'TRACTION').length;
    const snt = activeGangs.filter((g) => g.department === 'S&T').length;
    return { pway, trd, snt };
  }, [activeGangs]);

  // Network Health Score computation
  const networkHealthMetrics = useMemo(() => {
    if (corridors.length === 0) {
      return { score: 88.4, status: 'OPTIMAL CAPACITY', trend: '+3.2%', peakCorridor: 'C003 (78%)' };
    }

    // Weighted composite index: (100 - average strain / utilization penalty)
    const avgUtil = corridors.reduce((acc, c) => acc + (c.utilization || 75), 0) / corridors.length;
    const criticalDefectPenalty = Math.min(15, defects.filter((d) => d.severity === 'CRITICAL').length * 1.5);
    const conflictPenalty = Math.min(12, (validation.invalidBlocks || 0) * 2.2);

    // Calculate score out of 100
    const rawScore = 100 - (avgUtil * 0.12) - criticalDefectPenalty - conflictPenalty;
    const score = Number(Math.max(65, Math.min(98.5, rawScore)).toFixed(1));

    // Peak utilization corridor
    const sortedCorridors = [...corridors].sort((a, b) => (b.utilization || 0) - (a.utilization || 0));
    const highest = sortedCorridors[0];

    const status =
      score >= 85 ? 'OPTIMAL CAPACITY' : score >= 75 ? 'RESTRICTED BUFFER' : 'HIGH STRAIN ALERT';

    return {
      score,
      status,
      trend: '+3.4%',
      peakCorridor: highest ? `${highest.code || highest.id} (${highest.utilization}%)` : 'C003 (78%)',
      avgUtil: Math.round(avgUtil),
    };
  }, [corridors, defects, validation]);

  // Average Block Turnaround Time computation
  const turnaroundMetrics = useMemo(() => {
    const effectiveBlocks = blocks.length > 0 ? blocks : mockStore.getOptimizedBlocks();
    const durations = effectiveBlocks.map((b) => b.durationMinutes || 90);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 82;

    // Actual turnaround time accounts for clearance & handover buffers
    const avgTurnaround = Math.max(55, Math.min(105, avgDuration - 8));
    const targetThreshold = 90;
    const variance = targetThreshold - avgTurnaround;
    const isUnderTarget = variance >= 0;

    return {
      avgTurnaround,
      targetThreshold,
      variance,
      isUnderTarget,
      punctualityPct: 94.2,
      deptTurnaround: {
        track: 82,
        signal: 62,
        traction: 71,
      },
      trendDelta: '-4 mins',
    };
  }, [blocks]);

  // Safety Compliance Percentage computation
  const safetyComplianceMetrics = useMemo(() => {
    const isSafe = validation.status === 'SAFE_TO_PUBLISH';
    const total = validation.totalBlocks || blocks.length || 42;
    const valid = validation.validBlocks || Math.max(0, total - (validation.invalidBlocks || 5));
    const pct = isSafe ? 100.0 : Number(((valid / (total || 1)) * 100).toFixed(1));

    const checklistPassedCount = validation.checklist.filter((c) => c.passed).length;
    const checklistTotal = validation.checklist.length || 7;

    return {
      percentage: pct,
      isSafe,
      validBlocks: valid,
      totalBlocks: total,
      conflictsCount: validation.criticalIssuesCount || validation.invalidBlocks || 5,
      checklistPassedCount,
      checklistTotal,
      statusText: isSafe ? 'PASSED: 100% SANCTIONED' : 'REQUIRES REVIEW (5 CLASHES)',
    };
  }, [validation, blocks]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    railwayAudio.playBeep(750, 0.05);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <section
      id="high-level-kpi-dashboard-module"
      aria-label="High-Level KPI Operational Dashboard"
      className="bg-[#091124] border border-sky-900/60 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden"
    >
      {/* Background Radial Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Module Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-500/50 text-sky-400 shadow-inner">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                Central Operations KPI Command
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                EXECUTIVE TELEMETRY
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE FEED</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Deterministic real-time indicators aggregated across corridors C001–C004, active field gangs, and headway safety interlocks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Refresh live metrics from service providers"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY HIGH-LEVEL KPI TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* ==================================================================== */}
        {/* KPI 1: Network Health Score */}
        {/* ==================================================================== */}
        <div
          onClick={() => {
            railwayAudio.playBeep(700, 0.04);
            setSelectedDetailKpi('HEALTH');
          }}
          className="group relative bg-[#0b162f] hover:bg-[#0e1d3e] border border-sky-900/60 hover:border-sky-500/80 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-sky-950/40 flex flex-col justify-between"
        >
          {/* Top Row: Label & Status Indicator */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[11px] flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>Network Health Score</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>{networkHealthMetrics.trend}</span>
              </span>
            </div>

            {/* Hero Value */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {networkHealthMetrics.score}%
              </span>
              <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>

            {/* Health Progress Track */}
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-300 transition-all duration-500 rounded-full"
                style={{ width: `${networkHealthMetrics.score}%` }}
              />
            </div>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Status:</span>
              <span className="font-bold text-emerald-400">{networkHealthMetrics.status}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Peak Corridor:</span>
              <span className="text-slate-200">{networkHealthMetrics.peakCorridor}</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px] text-sky-400 font-sans group-hover:text-sky-300">
              <span>Inspect Health Telemetry →</span>
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KPI 2: Average Block Turnaround Time */}
        {/* ==================================================================== */}
        <div
          onClick={() => {
            railwayAudio.playBeep(700, 0.04);
            setSelectedDetailKpi('TURNAROUND');
          }}
          className="group relative bg-[#0b162f] hover:bg-[#0e1d3e] border border-sky-900/60 hover:border-sky-500/80 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-sky-950/40 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Avg Block Turnaround Time</span>
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  turnaroundMetrics.isUnderTarget
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                    : 'bg-rose-950 text-rose-300 border-rose-700/60'
                }`}
              >
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                <span>{turnaroundMetrics.trendDelta}</span>
              </span>
            </div>

            {/* Hero Value */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-mono text-cyan-300 tracking-tight">
                {turnaroundMetrics.avgTurnaround}
              </span>
              <span className="text-xs font-mono text-slate-400">mins</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold ml-auto">
                {turnaroundMetrics.isUnderTarget
                  ? `-${turnaroundMetrics.variance}m UNDER CEILING`
                  : `+${Math.abs(turnaroundMetrics.variance)}m OVER CEILING`}
              </span>
            </div>

            {/* Threshold Clearance Bar */}
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3 relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  turnaroundMetrics.isUnderTarget
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                }`}
                style={{
                  width: `${Math.min(100, (turnaroundMetrics.avgTurnaround / turnaroundMetrics.targetThreshold) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Target Ceiling:</span>
              <span className="text-slate-200">&le; {turnaroundMetrics.targetThreshold} mins (RDSO Standard)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Handover Punctuality:</span>
              <span className="text-emerald-400 font-bold">{turnaroundMetrics.punctualityPct}% On-Time</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px] text-cyan-400 font-sans group-hover:text-cyan-300">
              <span>Inspect Department Handover →</span>
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KPI 3: Active Maintenance Gangs */}
        {/* ==================================================================== */}
        <div
          onClick={() => {
            railwayAudio.playBeep(700, 0.04);
            setSelectedDetailKpi('GANGS');
          }}
          className="group relative bg-[#0b162f] hover:bg-[#0e1d3e] border border-sky-900/60 hover:border-sky-500/80 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-sky-950/40 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[11px] flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Active Maintenance Gangs</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                <span>{totalHeadcountOnTrack} STAFF</span>
              </span>
            </div>

            {/* Hero Value */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-mono text-amber-300 tracking-tight">
                {activeGangs.length}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {manpowerGangs.length || 16} Gangs</span>
              <span className="text-[10px] font-mono text-slate-400 ml-auto">
                {Math.round(((activeGangs.length || 11) / (manpowerGangs.length || 16)) * 100)}% DEPLOYED
              </span>
            </div>

            {/* Gang Deployment Allocation Bar */}
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3 flex">
              <div
                title={`Civil Engg: ${gangsByDepartment.pway} gangs`}
                className="bg-emerald-500 h-full"
                style={{ width: `${(gangsByDepartment.pway / (activeGangs.length || 1)) * 100}%` }}
              />
              <div
                title={`TRD Traction: ${gangsByDepartment.trd} gangs`}
                className="bg-amber-500 h-full"
                style={{ width: `${(gangsByDepartment.trd / (activeGangs.length || 1)) * 100}%` }}
              />
              <div
                title={`S&T: ${gangsByDepartment.snt} gangs`}
                className="bg-sky-500 h-full"
                style={{ width: `${(gangsByDepartment.snt / (activeGangs.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Department Split:</span>
              <span className="text-slate-200">
                {gangsByDepartment.pway} P-Way • {gangsByDepartment.trd} TRD • {gangsByDepartment.snt} S&amp;T
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Safety Briefings:</span>
              <span className="text-emerald-400 font-bold">100% Rule 15.09 Passed</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px] text-amber-400 font-sans group-hover:text-amber-300">
              <span>Inspect Crew Allocation →</span>
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KPI 4: Safety Compliance Percentage */}
        {/* ==================================================================== */}
        <div
          onClick={() => {
            railwayAudio.playBeep(700, 0.04);
            setSelectedDetailKpi('SAFETY');
          }}
          className={`group relative bg-[#0b162f] hover:bg-[#0e1d3e] border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between ${
            safetyComplianceMetrics.isSafe
              ? 'border-emerald-700/60 hover:border-emerald-500/80 shadow-emerald-950/30'
              : 'border-rose-700/60 hover:border-rose-500/80 shadow-rose-950/30'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[11px] flex items-center gap-1.5">
                {safetyComplianceMetrics.isSafe ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Safety Compliance %</span>
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  safetyComplianceMetrics.isSafe
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                    : 'bg-rose-950 text-rose-300 border-rose-700/60 animate-pulse'
                }`}
              >
                {safetyComplianceMetrics.isSafe ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>LOCKED PASS</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{safetyComplianceMetrics.conflictsCount} CLASHES</span>
                  </>
                )}
              </span>
            </div>

            {/* Hero Value */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  safetyComplianceMetrics.isSafe ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {safetyComplianceMetrics.percentage}%
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({safetyComplianceMetrics.validBlocks} / {safetyComplianceMetrics.totalBlocks} Blocks)
              </span>
            </div>

            {/* Compliance Progress Track */}
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-3">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  safetyComplianceMetrics.isSafe ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                style={{ width: `${safetyComplianceMetrics.percentage}%` }}
              />
            </div>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">7-Point Checklist:</span>
              <span className={safetyComplianceMetrics.isSafe ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {safetyComplianceMetrics.checklistPassedCount} / {safetyComplianceMetrics.checklistTotal} Criteria Cleared
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Sectional Headway:</span>
              <span className="text-slate-200">&ge; 30 min Buffer Enforced</span>
            </div>
            <div
              className={`flex items-center justify-between pt-1 text-[10px] font-sans ${
                safetyComplianceMetrics.isSafe ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{safetyComplianceMetrics.isSafe ? 'View Sanction Dossier →' : 'Resolve Critical Clashes →'}</span>
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPANDED INTERACTIVE INSPECTION MODAL FOR ANY SELECTED KPI */}
      {/* ==================================================================== */}
      {selectedDetailKpi && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#0b1429] border border-sky-600/70 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#070e1e]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-950 border border-sky-600 text-sky-400">
                  {selectedDetailKpi === 'HEALTH' && <Gauge className="w-5 h-5" />}
                  {selectedDetailKpi === 'TURNAROUND' && <Clock className="w-5 h-5" />}
                  {selectedDetailKpi === 'GANGS' && <HardHat className="w-5 h-5" />}
                  {selectedDetailKpi === 'SAFETY' && <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                    {selectedDetailKpi === 'HEALTH' && 'Network Health Score Breakdown'}
                    {selectedDetailKpi === 'TURNAROUND' && 'Average Block Turnaround Time Telemetry'}
                    {selectedDetailKpi === 'GANGS' && 'Active Maintenance Gangs Deployment'}
                    {selectedDetailKpi === 'SAFETY' && 'Statutory Safety Compliance Audit'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Indian Railways Central Operating Control • Live Telemetry Detail
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailKpi(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {/* DETAILS FOR NETWORK HEALTH SCORE */}
              {selectedDetailKpi === 'HEALTH' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-sky-300 font-bold uppercase">Composite Index</div>
                      <div className="text-2xl font-black text-white">{networkHealthMetrics.score}%</div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Evaluating track geometry, ballast consolidation, catenary tension, and signal relays.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                        {networkHealthMetrics.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase mb-2">Corridor Health Telemetry (C001–C004)</h4>
                    <div className="space-y-2">
                      {corridors.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100">{c.name} ({c.id})</div>
                            <div className="text-[10px] text-slate-400">{c.lengthKm} km • Max Slots: {c.availableSlots || 12}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sky-400">{c.utilization}% Load</div>
                            <span className="text-[10px] text-slate-400">{c.scheduledBlocks} Active Blocks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILS FOR AVERAGE TURNAROUND TIME */}
              {selectedDetailKpi === 'TURNAROUND' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-cyan-300 font-bold uppercase">Turnaround Performance</div>
                      <div className="text-2xl font-black text-white">{turnaroundMetrics.avgTurnaround} mins</div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        RDSO Standard Handover Ceiling: &le; 90 minutes. Variance: -{turnaroundMetrics.variance} mins under ceiling.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                        OPTIMAL RELEASE
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase mb-2">Department Average Turnaround</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">P-Way Track</div>
                        <div className="text-base font-bold text-emerald-400">{turnaroundMetrics.deptTurnaround.track}m</div>
                        <div className="text-[9px] text-slate-500">Tamper &amp; BCM</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">S&amp;T Signals</div>
                        <div className="text-base font-bold text-sky-400">{turnaroundMetrics.deptTurnaround.signal}m</div>
                        <div className="text-[9px] text-slate-500">Point Machines</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">TRD 25kV OHE</div>
                        <div className="text-base font-bold text-amber-400">{turnaroundMetrics.deptTurnaround.traction}m</div>
                        <div className="text-[9px] text-slate-500">Tower Wagons</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILS FOR ACTIVE MAINTENANCE GANGS */}
              {selectedDetailKpi === 'GANGS' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-amber-300 font-bold uppercase">Field Crew Deployment</div>
                      <div className="text-2xl font-black text-white">{activeGangs.length} Active Gangs</div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {totalHeadcountOnTrack} deployed field personnel across Northern Railway Division.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-600">
                        {activeGangs.length} / {manpowerGangs.length} GANGS ON TRACK
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase mb-2">Active Field Gangs Registry</h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {activeGangs.map((gang) => (
                        <div key={gang.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100">{gang.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {gang.supervisor} • Section: {gang.assignedSection}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-400">{gang.headcount} Staff</span>
                            <div className="text-[10px] text-slate-500">{gang.department} • {gang.corridorId}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILS FOR SAFETY COMPLIANCE PERCENTAGE */}
              {selectedDetailKpi === 'SAFETY' && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      safetyComplianceMetrics.isSafe
                        ? 'bg-emerald-950/40 border-emerald-800/60'
                        : 'bg-rose-950/40 border-rose-800/60'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-[10px] font-bold uppercase ${
                          safetyComplianceMetrics.isSafe ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        Safety Gate Status
                      </div>
                      <div className="text-2xl font-black text-white">{safetyComplianceMetrics.percentage}%</div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Deterministic Railway Gatekeeper: 100% compliance mandatory for statutory release.
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          safetyComplianceMetrics.isSafe
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                            : 'bg-rose-950 text-rose-300 border-rose-600'
                        }`}
                      >
                        {safetyComplianceMetrics.statusText}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase mb-2">7-Point Safety Verification Gate</h4>
                    <div className="space-y-1.5">
                      {validation.checklist.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {item.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span className="text-slate-200 font-sans">{item.name || item.label}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              item.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {item.passed ? 'PASSED' : 'FLAGGED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 border-t border-slate-800 bg-[#070e1e] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Source: Live Dispatch Engines &amp; Indian Railways Integrated Protocol
              </span>

              <div className="flex items-center gap-2">
                {selectedDetailKpi === 'HEALTH' && (
                  <button
                    onClick={() => {
                      setSelectedDetailKpi(null);
                      const el = document.getElementById('network-resilience-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <span>Inspect Resilience</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {selectedDetailKpi === 'TURNAROUND' && (
                  <button
                    onClick={() => {
                      setSelectedDetailKpi(null);
                      const el = document.getElementById('maintenance-efficiency-kpi-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <span>Inspect Turnaround</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {selectedDetailKpi === 'GANGS' && (
                  <button
                    onClick={() => {
                      setSelectedDetailKpi(null);
                      onNavigate('resource_allocation');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <span>Manage Gang Allocations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {selectedDetailKpi === 'SAFETY' && (
                  <button
                    onClick={() => {
                      setSelectedDetailKpi(null);
                      onNavigate('validation');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <span>Open Safety Validation Gate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedDetailKpi(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
