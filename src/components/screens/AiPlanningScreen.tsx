import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Database,
  Cpu,
  GitCommit,
  RefreshCw,
} from 'lucide-react';
import { OptimizedBlock, DepartmentType, PriorityLevel } from '../../types';
import { generateOptimizedPlan } from '../../services/api';
import { ExplainableAiDrawer } from './ExplainableAiDrawer';

interface AiPlanningScreenProps {
  blocks: OptimizedBlock[];
  onRefreshBlocks: () => void;
  onNavigate: (screen: string, data?: any) => void;
  isGeneratingPlan?: boolean;
}

export const AiPlanningScreen: React.FC<AiPlanningScreenProps> = ({
  blocks,
  onRefreshBlocks,
  onNavigate,
  isGeneratingPlan = false,
}) => {
  const [runningPipeline, setRunningPipeline] = useState(isGeneratingPlan);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(9); // 9 = Completed
  const [selectedBlockForXai, setSelectedBlockForXai] = useState<OptimizedBlock | null>(null);

  // Filters
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterConflictOnly, setFilterConflictOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pipelineStages = [
    { num: 1, name: 'Data Ingestion', desc: 'Requests, Tasks, Defects & Train Schedules' },
    { num: 2, name: 'Multi-Department Priority Analysis', desc: 'Weightings across Track, S&T, OHE' },
    { num: 3, name: 'Defect Matching', desc: 'OMS & Footplate speed restriction logs' },
    { num: 4, name: 'Corridor Capacity Analysis', desc: '48 Slot bounds on C001–C004' },
    { num: 5, name: 'Train Schedule Headway Analysis', desc: '120 Train paths & passenger headways' },
    { num: 6, name: 'Genetic Algorithm / Heuristic Optimization', desc: 'Multi-objective Pareto space exploration' },
    { num: 7, name: 'Train-Block Conflict Detection', desc: 'Overlap intersection matrix calculation' },
    { num: 8, name: 'Multi-Objective Scoring', desc: 'Safety margin & passenger delay optimization' },
    { num: 9, name: 'Final Validation Gate', desc: 'Readiness verdict & safety lock check' },
  ];

  const handleGeneratePlan = async () => {
    setRunningPipeline(true);
    setActivePipelineStep(1);

    // Simulate progressive animation through stages for high SIH visual appeal
    for (let step = 1; step <= 9; step++) {
      setActivePipelineStep(step);
      // Brief delay per stage
      await new Promise((resolve) => setTimeout(resolve, 320));
    }

    try {
      await generateOptimizedPlan();
      onRefreshBlocks();
    } catch (e) {
      console.error('Failed to generate plan:', e);
    } finally {
      setRunningPipeline(false);
    }
  };

  const filteredBlocks = blocks.filter((b) => {
    if (filterCorridor !== 'ALL' && b.corridorId !== filterCorridor) return false;
    if (filterDepartment !== 'ALL' && b.department !== filterDepartment) return false;
    if (filterConflictOnly && !b.hasConflict) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.blockId.toLowerCase().includes(q) ||
        b.taskId.toLowerCase().includes(q) ||
        b.assetId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const conflictsCount = blocks.filter((b) => b.hasConflict).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                AI Planning & Optimization Engine
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 4 / HEURISTIC CORE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-department constraint satisfaction engine. Ingests requests, tasks, and train timetables to generate conflict-aware maintenance blocks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGeneratePlan}
              disabled={runningPipeline}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transform active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${runningPipeline ? 'animate-spin' : ''}`} />
              <span>{runningPipeline ? 'OPTIMIZING SCHEDULE...' : 'GENERATE OPTIMIZED PLAN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* INPUTS SUMMARY BAR */}
      <div className="bg-[#0a1020] p-4 rounded-xl border border-sky-950/80 shadow-inner">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-2">
          Ingested Operational Datasets (Exact SIH Hackathon Scope)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Block Requests</span>
            <span className="font-bold text-sky-300">35 Ingested</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Maintenance Tasks</span>
            <span className="font-bold text-blue-300">60 Tasks</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Track Defects</span>
            <span className="font-bold text-rose-300">55 Tracked</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Train Schedules</span>
            <span className="font-bold text-indigo-300">120 Trains</span>
          </div>
          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
            <span className="text-slate-400">Active Corridors</span>
            <span className="font-bold text-emerald-300">4 (C001–C004)</span>
          </div>
        </div>
      </div>

      {/* 9-STAGE PIPELINE PROGRESSION ANIMATION */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Optimization Pipeline Architecture
            </h3>
            <p className="text-[11px] text-slate-400">
              Deterministic constraint processing + heuristic genetic slot assignment
            </p>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              runningPipeline
                ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}
          >
            {runningPipeline ? `STAGE ${activePipelineStep} OF 9` : 'OPTIMIZATION COMPLETE (42 BLOCKS)'}
          </span>
        </div>

        {/* 9 Stages Visual Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {pipelineStages.map((stage) => {
            const isCompleted = activePipelineStep > stage.num || (!runningPipeline && activePipelineStep === 9);
            const isCurrent = runningPipeline && activePipelineStep === stage.num;
            return (
              <div
                key={stage.num}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  isCurrent
                    ? 'bg-blue-900/60 border-sky-400 ring-2 ring-sky-500/40 text-white'
                    : isCompleted
                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-500">0{stage.num}</span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isCurrent && <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />}
                </div>
                <div className="font-semibold text-[11px] leading-tight truncate">
                  {stage.name}
                </div>
                <div className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {stage.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GENERATED 42 BLOCKS TABLE */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Optimized Blocks Schedule ({blocks.length} Generated)
              </h3>
              {conflictsCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {conflictsCount} CONFLICTS REQUIRING RESOLUTION
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Each block displays conflict status and explainability rationale via "Why This Slot?"
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search Block, Task, Asset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono w-44 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Corridors</option>
              <option value="C001">C001</option>
              <option value="C002">C002</option>
              <option value="C003">C003</option>
              <option value="C004">C004</option>
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Depts</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="S&T">S&T</option>
              <option value="TRACTION">Traction</option>
            </select>

            <button
              onClick={() => setFilterConflictOnly(!filterConflictOnly)}
              className={`px-2.5 py-1.5 rounded border text-xs font-mono transition-colors ${
                filterConflictOnly
                  ? 'bg-rose-950/80 border-rose-700 text-rose-200 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {filterConflictOnly ? 'Conflicts Only ⚠' : 'Show All Blocks'}
            </button>
          </div>
        </div>

        {/* Blocks Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Block ID</th>
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Dept</th>
                <th className="py-2.5 px-3">Corridor</th>
                <th className="py-2.5 px-3">Scheduled Slot</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Conflict Status</th>
                <th className="py-2.5 px-3 text-right">Explainability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredBlocks.map((b, idx) => (
                <tr key={`${b.blockId}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-sky-300">{b.blockId}</td>
                  <td className="py-2.5 px-3 text-slate-300">{b.taskId}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">{b.assetId}</td>
                  <td className="py-2.5 px-3 text-slate-300">{b.department}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-bold">{b.corridorId}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="font-semibold">{b.startTime}</span> –{' '}
                    <span className="font-semibold">{b.endTime}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        b.priority === 'CRITICAL'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          : b.priority === 'HIGH'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {b.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {b.hasConflict ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800 font-bold inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> CONFLICT ⚠
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> NO CONFLICT
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedBlockForXai(b)}
                      className="px-2 py-1 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-sky-300 text-[10px] font-mono flex items-center gap-1 ml-auto"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>WHY THIS SLOT?</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explainable AI Drawer */}
      <ExplainableAiDrawer
        block={selectedBlockForXai}
        onClose={() => setSelectedBlockForXai(null)}
        onNavigateToConflict={(blockId) => onNavigate('conflicts', { blockId })}
      />
    </div>
  );
};
