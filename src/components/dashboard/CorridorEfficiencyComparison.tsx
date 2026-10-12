import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Gauge,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Check,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  Sliders,
} from 'lucide-react';
import { Corridor, OptimizedBlock, Defect, ValidationResult } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';

interface CorridorEfficiencyComparisonProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  defects?: Defect[];
  validation?: ValidationResult;
  onNavigate?: (screen: string, itemData?: any) => void;
  onClose?: () => void;
}

interface CorridorComparisonDataPoint {
  corridorId: string;
  shortCode: string;
  fullName: string;
  healthScore: number;
  turnaroundTime: number;
  punctualityPct: number;
  utilizationPct: number;
  activeBlocksCount: number;
  efficiencyIndex: number;
  healthStatus: string;
  turnaroundStatus: string;
}

export const CorridorEfficiencyComparison: React.FC<CorridorEfficiencyComparisonProps> = ({
  corridors,
  blocks = [],
  defects = [],
  validation,
  onNavigate,
  onClose,
}) => {
  // Default selected corridors: select all corridors or at least first two
  const [selectedCorridorIds, setSelectedCorridorIds] = useState<string[]>(() => {
    return corridors.length >= 2 ? corridors.map((c) => c.id) : ['C001', 'C002'];
  });

  // Chart display options
  const [activeMetricFilter, setActiveMetricFilter] = useState<'BOTH' | 'HEALTH' | 'TURNAROUND'>('BOTH');

  // Baseline turnaround presets if blocks are empty
  const defaultTurnaroundMap: Record<string, number> = {
    C001: 76,
    C002: 84,
    C003: 88,
    C004: 68,
  };

  // ---------------------------------------------------------------------------
  // DATA CALCULATION FOR EACH CORRIDOR
  // ---------------------------------------------------------------------------
  const allCorridorMetrics = useMemo<CorridorComparisonDataPoint[]>(() => {
    return corridors.map((c) => {
      const cid = c.id;

      // 1. Calculate Network Health Score per corridor
      const corridorDefects = defects.filter((d) => d.corridorId === cid);
      const critDefects = corridorDefects.filter((d) => d.severity === 'CRITICAL').length;
      const util = c.utilization || 75;
      const utilPenalty = util * 0.12;
      const defectPenalty = Math.min(12, critDefects * 2.2);

      // Raw score
      const rawHealth = 100 - utilPenalty - defectPenalty;
      const healthScore = Number(Math.max(62, Math.min(98.5, rawHealth)).toFixed(1));

      // 2. Calculate Maintenance Turnaround Time (in minutes)
      const corridorBlocks = blocks.filter((b) => b.corridorId === cid);
      const durations = corridorBlocks.map((b) => b.durationMinutes || 90);
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
          : defaultTurnaroundMap[cid] || 80;

      // Handover turnaround clearance buffer
      const turnaroundTime = Math.max(55, Math.min(105, avgDuration - 6));

      // Punctuality rate
      const punctualityPct = Number((98.5 - (turnaroundTime > 90 ? (turnaroundTime - 90) * 1.5 : 0)).toFixed(1));

      // Composite efficiency index (Health Score / Turnaround in hours)
      const efficiencyIndex = Number(((healthScore / (turnaroundTime / 60)) * 0.8).toFixed(1));

      const healthStatus =
        healthScore >= 88 ? 'Optimal' : healthScore >= 80 ? 'Good' : 'Constrained';
      const turnaroundStatus =
        turnaroundTime <= 75 ? 'Rapid' : turnaroundTime <= 90 ? 'Standard' : 'Overrun Risk';

      return {
        corridorId: cid,
        shortCode: c.code || cid,
        fullName: c.name,
        healthScore,
        turnaroundTime,
        punctualityPct,
        utilizationPct: util,
        activeBlocksCount: corridorBlocks.length || 3,
        efficiencyIndex,
        healthStatus,
        turnaroundStatus,
      };
    });
  }, [corridors, blocks, defects]);

  // Filtered comparison data based on user selection
  const comparisonData = useMemo(() => {
    return allCorridorMetrics.filter((item) => selectedCorridorIds.includes(item.corridorId));
  }, [allCorridorMetrics, selectedCorridorIds]);

  // Validation flag: must have at least 2 corridors selected
  const hasMinimumSelection = selectedCorridorIds.length >= 2;

  // Toggle selection handler
  const handleToggleCorridor = (id: string) => {
    railwayAudio.playBeep(740, 0.02);
    if (selectedCorridorIds.includes(id)) {
      setSelectedCorridorIds(selectedCorridorIds.filter((cid) => cid !== id));
    } else {
      setSelectedCorridorIds([...selectedCorridorIds, id]);
    }
  };

  const handleSelectAll = () => {
    railwayAudio.playBeep(800, 0.03);
    setSelectedCorridorIds(corridors.map((c) => c.id));
  };

  const handleSelectTopTwo = () => {
    railwayAudio.playBeep(800, 0.03);
    setSelectedCorridorIds(corridors.slice(0, 2).map((c) => c.id));
  };

  // Compute best performing corridor in selected group
  const comparisonSummary = useMemo(() => {
    if (comparisonData.length < 2) return null;

    const highestHealth = [...comparisonData].sort((a, b) => b.healthScore - a.healthScore)[0];
    const fastestTurnaround = [...comparisonData].sort((a, b) => a.turnaroundTime - b.turnaroundTime)[0];
    const topEfficiency = [...comparisonData].sort((a, b) => b.efficiencyIndex - a.efficiencyIndex)[0];

    // Delta between highest and lowest health
    const healthValues = comparisonData.map((d) => d.healthScore);
    const healthDelta = Number((Math.max(...healthValues) - Math.min(...healthValues)).toFixed(1));

    // Delta between slowest and fastest turnaround
    const turnaroundValues = comparisonData.map((d) => d.turnaroundTime);
    const turnaroundDelta = Math.max(...turnaroundValues) - Math.min(...turnaroundValues);

    return {
      highestHealth,
      fastestTurnaround,
      topEfficiency,
      healthDelta,
      turnaroundDelta,
    };
  }, [comparisonData]);

  // Custom Recharts Tooltip
  const CustomGroupedBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CorridorComparisonDataPoint;
      return (
        <div className="bg-[#070e20]/95 backdrop-blur-md p-3 rounded-xl border border-sky-500/50 shadow-2xl text-xs font-mono text-slate-200 min-w-[220px]">
          <div className="pb-1.5 mb-2 border-b border-slate-800">
            <div className="font-bold text-white text-sm flex items-center justify-between">
              <span>{data.shortCode}</span>
              <span className="text-[10px] text-sky-400 font-normal">{data.healthStatus}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">{data.fullName}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                <span>Health Score:</span>
              </span>
              <span className="font-bold text-white text-sm">{data.healthScore}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Avg Turnaround:</span>
              </span>
              <span className="font-bold text-white text-sm">{data.turnaroundTime} mins</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Punctuality Rate:</span>
              <span className="text-emerald-400 font-semibold">{data.punctualityPct}%</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Efficiency Index:</span>
              <span className="text-purple-300 font-bold">{data.efficiencyIndex} pts</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="corridor-efficiency-comparison-panel"
      className="bg-[#070e20] border border-sky-800/60 rounded-xl p-4 md:p-5 mt-4 text-slate-200 transition-all shadow-xl relative animate-in fade-in duration-200"
    >
      {/* SECTION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-700/60">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide uppercase">
                Corridor Efficiency Comparison
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/60">
                SIDE-BY-SIDE TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compare Network Health Scores and Maintenance Turnaround Times across selected corridors.
            </p>
          </div>
        </div>

        {/* CONTROLS: CORRIDOR SELECTOR & METRIC FILTER */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Preset Buttons */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
          >
            All Corridors
          </button>
          <button
            type="button"
            onClick={handleSelectTopTwo}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
          >
            Top 2
          </button>

          {/* Metric View Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setActiveMetricFilter('BOTH');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeMetricFilter === 'BOTH'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setActiveMetricFilter('HEALTH');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeMetricFilter === 'HEALTH'
                  ? 'bg-sky-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Health %
            </button>
            <button
              type="button"
              onClick={() => {
                railwayAudio.playBeep(700, 0.02);
                setActiveMetricFilter('TURNAROUND');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                activeMetricFilter === 'TURNAROUND'
                  ? 'bg-amber-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Turnaround (mins)
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Close comparison panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CORRIDOR SELECTION CHIPS */}
      <div className="mb-4">
        <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Select 2 or More Corridors to Compare ({selectedCorridorIds.length} Selected):</span>
          {!hasMinimumSelection && (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Select at least 2 corridors</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {corridors.map((c) => {
            const isSelected = selectedCorridorIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleToggleCorridor(c.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950 text-sky-200 border-sky-500 ring-1 ring-sky-400/50 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    isSelected
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
                <span className="font-bold">{c.code || c.id}</span>
                <span className="text-[11px] text-slate-400">({c.name})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* WARNING IF LESS THAN 2 CORRIDORS SELECTED */}
      {!hasMinimumSelection ? (
        <div className="py-10 text-center text-slate-400 text-xs font-mono bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <div className="text-slate-200 font-bold text-sm">Insufficient Selection for Comparison</div>
          <div className="mt-1">
            Please check at least 2 corridors above to generate the side-by-side grouped bar chart.
          </div>
          <button
            type="button"
            onClick={handleSelectTopTwo}
            className="mt-3 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-mono text-xs font-bold cursor-pointer"
          >
            Select C001 &amp; C002
          </button>
        </div>
      ) : (
        <>
          {/* GROUPED BAR CHART CONTAINER */}
          <div className="bg-[#040814] rounded-xl p-3 md:p-4 border border-slate-800/90 mb-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-2">
                <span>Side-by-Side Performance Comparison</span>
                <span className="text-[10px] text-slate-500">· RDSO Maintenance Benchmarks</span>
              </span>

              {/* Legend with color dots */}
              <div className="flex items-center gap-4 text-[11px]">
                {(activeMetricFilter === 'BOTH' || activeMetricFilter === 'HEALTH') && (
                  <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <span className="w-3 h-3 rounded-sm bg-sky-400" />
                    <span>Network Health Score (%)</span>
                  </span>
                )}
                {(activeMetricFilter === 'BOTH' || activeMetricFilter === 'TURNAROUND') && (
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <span className="w-3 h-3 rounded-sm bg-amber-400" />
                    <span>Avg Turnaround (Mins)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Recharts Grouped Bar Chart */}
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  barGap={8}
                  barCategoryGap={24}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                  <XAxis
                    dataKey="shortCode"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#334155' }}
                  />

                  {/* Left Y-Axis for Health Score */}
                  <YAxis
                    yAxisId="health"
                    domain={[0, 100]}
                    stroke="#38bdf8"
                    tick={{ fill: '#7dd3fc', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#0284c7' }}
                    tickFormatter={(val) => `${val}%`}
                    orientation="left"
                  />

                  {/* Right Y-Axis for Turnaround Time (minutes) */}
                  <YAxis
                    yAxisId="turnaround"
                    domain={[0, 120]}
                    stroke="#f59e0b"
                    tick={{ fill: '#fcd34d', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#d97706' }}
                    tickFormatter={(val) => `${val}m`}
                    orientation="right"
                  />

                  <Tooltip content={<CustomGroupedBarTooltip />} />

                  {/* 85% Health Score Target Reference Line */}
                  <ReferenceLine
                    yAxisId="health"
                    y={85}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: 'Target Health 85%',
                      fill: '#38bdf8',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      position: 'insideTopLeft',
                    }}
                  />

                  {/* 90-Minute RDSO Turnaround Ceiling Reference Line */}
                  <ReferenceLine
                    yAxisId="turnaround"
                    y={90}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: 'Ceiling 90m',
                      fill: '#f59e0b',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      position: 'insideTopRight',
                    }}
                  />

                  {/* Bar 1: Network Health Score */}
                  {(activeMetricFilter === 'BOTH' || activeMetricFilter === 'HEALTH') && (
                    <Bar
                      yAxisId="health"
                      dataKey="healthScore"
                      name="Network Health Score (%)"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  )}

                  {/* Bar 2: Turnaround Time */}
                  {(activeMetricFilter === 'BOTH' || activeMetricFilter === 'TURNAROUND') && (
                    <Bar
                      yAxisId="turnaround"
                      dataKey="turnaroundTime"
                      name="Turnaround Time (Mins)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SUMMARY ANALYTICS RIBBON */}
          {comparisonSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4 font-mono text-xs">
              <div className="bg-[#0b162f] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Top Network Health</div>
                <div className="text-base font-bold text-sky-300 mt-0.5">
                  {comparisonSummary.highestHealth.shortCode}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {comparisonSummary.highestHealth.healthScore}% ({comparisonSummary.highestHealth.healthStatus})
                </div>
              </div>

              <div className="bg-[#0b162f] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Fastest Turnaround</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">
                  {comparisonSummary.fastestTurnaround.shortCode}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {comparisonSummary.fastestTurnaround.turnaroundTime} mins (
                  {90 - comparisonSummary.fastestTurnaround.turnaroundTime}m under ceiling)
                </div>
              </div>

              <div className="bg-[#0b162f] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Health Score Spread</div>
                <div className="text-base font-bold text-white mt-0.5">
                  &Delta; {comparisonSummary.healthDelta}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Variance across {comparisonData.length} corridors
                </div>
              </div>

              <div className="bg-[#0b162f] p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Turnaround Spread</div>
                <div className="text-base font-bold text-white mt-0.5">
                  &Delta; {comparisonSummary.turnaroundDelta} mins
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Gap between fastest &amp; slowest
                </div>
              </div>
            </div>
          )}

          {/* HEAD-TO-HEAD BREAKDOWN SCORECARD TABLE */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/90 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Corridor Sector</th>
                  <th className="py-2 px-3">Health Score</th>
                  <th className="py-2 px-3">Avg Turnaround</th>
                  <th className="py-2 px-3">Handover Punctuality</th>
                  <th className="py-2 px-3">Efficiency Rating</th>
                  <th className="py-2 px-3 text-right">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#070e1e]">
                {comparisonData.map((item) => (
                  <tr key={item.corridorId} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-100">{item.shortCode}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{item.fullName}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-400">{item.healthScore}%</span>
                        <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full"
                            style={{ width: `${item.healthScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">{item.turnaroundTime}m</span>
                        <span className="text-[10px] text-slate-400">
                          ({90 - item.turnaroundTime >= 0 ? `-${90 - item.turnaroundTime}m` : `+${item.turnaroundTime - 90}m`})
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                      {item.punctualityPct}%
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                        {item.efficiencyIndex} pts
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[10px] font-semibold ${
                          item.healthScore >= 85 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {item.healthStatus} / {item.turnaroundStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
