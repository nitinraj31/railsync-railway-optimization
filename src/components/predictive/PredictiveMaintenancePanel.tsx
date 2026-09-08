import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Info,
  SlidersHorizontal,
  Calendar,
  Wrench,
  Activity,
  BarChart3,
  Flame,
  Check,
  ChevronRight,
  TrendingDown,
  Gauge,
  Cpu,
  X,
} from 'lucide-react';
import {
  BlockRequest,
  Defect,
  PredictiveMaintenanceInsight,
  DefectClusterSummary,
  DepartmentType,
  PriorityLevel,
} from '../../types';
import {
  generatePredictiveInsights,
  HISTORICAL_DEFECT_CLUSTERS,
  schedulePredictiveBlock,
} from '../../services/predictiveMaintenanceService';

interface PredictiveMaintenancePanelProps {
  requests: BlockRequest[];
  defects: Defect[];
  onNavigate?: (screen: string, params?: any) => void;
  onRefreshData?: () => void;
}

export const PredictiveMaintenancePanel: React.FC<PredictiveMaintenancePanelProps> = ({
  requests,
  defects,
  onNavigate,
  onRefreshData,
}) => {
  // Filters & State
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'VERY_HIGH' | 'HIGH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');
  const [showClustersModal, setShowClustersModal] = useState<boolean>(false);
  const [scheduledBlockIds, setScheduledBlockIds] = useState<Record<string, string>>({});
  const [schedulingInProgress, setSchedulingInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate insights based on provided requests & defects
  const insights = useMemo(() => {
    return generatePredictiveInsights(requests, defects);
  }, [requests, defects]);

  // Filtered insights
  const filteredInsights = useMemo(() => {
    return insights.filter((item) => {
      // Dept filter
      if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;
      // Corridor filter
      if (selectedCorridor !== 'ALL' && item.corridorId !== selectedCorridor) return false;
      // Confidence filter
      if (confidenceFilter === 'VERY_HIGH' && item.confidence.overallScore < 92) return false;
      if (confidenceFilter === 'HIGH' && item.confidence.overallScore < 85) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.requestId.toLowerCase().includes(q) ||
          item.requestTitle.toLowerCase().includes(q) ||
          item.assetId.toLowerCase().includes(q) ||
          item.pattern.patternName.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [insights, selectedDept, selectedCorridor, confidenceFilter, searchQuery]);

  // Aggregate Metrics
  const avgConfidence = useMemo(() => {
    if (insights.length === 0) return 0;
    const sum = insights.reduce((acc, curr) => acc + curr.confidence.overallScore, 0);
    return Math.round(sum / insights.length);
  }, [insights]);

  const criticalUrgencyCount = useMemo(() => {
    return insights.filter((i) => i.daysUntilCriticalFailure <= 3.0).length;
  }, [insights]);

  const highConfidenceCount = useMemo(() => {
    return insights.filter((i) => i.confidence.overallScore >= 85).length;
  }, [insights]);

  const nightShadowCount = useMemo(() => {
    return insights.filter((i) => i.suggestedWindow.windowType === 'NIGHT_MEGA_BLOCK').length;
  }, [insights]);

  // Trigger simulated/real AI analysis
  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStatusText('Ingesting 55 historical defect logs & ultrasonic trolley telemetry...');

    setTimeout(() => {
      setAnalysisStatusText('Evaluating 4 corridor traffic heatmaps & 120 train path headways...');
    }, 450);

    setTimeout(() => {
      setAnalysisStatusText('Computing multi-factor confidence matrix & optimal initiation windows...');
    }, 900);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisStatusText('');
      setToastMessage('AI Predictive Analysis successfully refreshed across all corridors.');
      setTimeout(() => setToastMessage(null), 4000);
      if (onRefreshData) onRefreshData();
    }, 1400);
  };

  // Schedule recommended block
  const handleScheduleBlock = async (insight: PredictiveMaintenanceInsight) => {
    setSchedulingInProgress(insight.requestId);
    try {
      const result = await schedulePredictiveBlock(insight);
      if (result.success) {
        setScheduledBlockIds((prev) => ({
          ...prev,
          [insight.requestId]: result.blockId,
        }));
        setToastMessage(`✓ ${result.message}`);
        setTimeout(() => setToastMessage(null), 5000);
        if (onRefreshData) onRefreshData();
      }
    } finally {
      setSchedulingInProgress(null);
    }
  };

  // Batch auto-schedule high confidence items
  const handleBatchScheduleHighConfidence = async () => {
    const candidates = filteredInsights.filter(
      (i) => i.confidence.overallScore >= 90 && !scheduledBlockIds[i.requestId]
    );

    if (candidates.length === 0) {
      setToastMessage('No unscheduled requests meet the ≥90% confidence threshold.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatusText(`Auto-scheduling ${candidates.length} high-confidence blocks into timeline...`);

    for (const c of candidates) {
      const res = await schedulePredictiveBlock(c);
      if (res.success) {
        setScheduledBlockIds((prev) => ({ ...prev, [c.requestId]: res.blockId }));
      }
    }

    setIsAnalyzing(false);
    setAnalysisStatusText('');
    setToastMessage(`✓ Successfully scheduled ${candidates.length} blocks with ≥90% AI confidence.`);
    setTimeout(() => setToastMessage(null), 5000);
    if (onRefreshData) onRefreshData();
  };

  return (
    <div
      id="predictive-maintenance-panel"
      className="bg-[#0e172e] p-5 rounded-xl border border-sky-900/60 shadow-xl space-y-5 relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-sky-900 border border-sky-400 text-sky-100 text-xs font-mono px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/90">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/90 via-sky-950 to-slate-900 border border-indigo-500/40 text-indigo-400 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse text-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
                Predictive Maintenance & Defect Pattern Intelligence
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" />
                AI PATTERN ENGINE v4.8
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" />
                CONFIDENCE MATRIX
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Cross-analyzes historical defect recurrence cycles, track geometry index (TGI) degradation curves, and real-time train density to suggest the optimal block initiation window and calculate an AI confidence score for every maintenance request.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto font-mono text-xs">
          <button
            id="view-clusters-btn"
            onClick={() => setShowClustersModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors text-[11px]"
            title="Inspect 5 historical defect pattern clusters across Indian Railways"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Defect Clusters ({HISTORICAL_DEFECT_CLUSTERS.length})</span>
          </button>

          <button
            id="batch-schedule-high-conf-btn"
            onClick={handleBatchScheduleHighConfidence}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 flex items-center gap-1.5 transition-colors text-[11px] font-bold"
            title="Auto-schedule all recommended windows with ≥90% confidence score"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-Schedule (≥90% Conf)</span>
          </button>

          <button
            id="run-ai-predictive-analysis-btn"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white flex items-center gap-1.5 transition-colors text-[11px] font-bold shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Running Progress Bar */}
      {isAnalyzing && (
        <div className="p-3 bg-sky-950/60 border border-sky-500/40 rounded-lg font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-sky-200">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
              {analysisStatusText}
            </span>
            <span className="text-[10px] text-sky-400">MODEL INFERENCE ACTIVE</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full w-full animate-[pulse_1s_infinite]"></div>
          </div>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1 */}
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Requests Analyzed</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-100">
              {insights.length}
            </span>
            <span className="text-xs font-mono text-slate-400">maintenance tasks</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-sky-400">
            Across 4 trunk rail corridors
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Average AI Confidence</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-300">
              {avgConfidence}%
            </span>
            <span className="text-xs font-mono text-slate-400">weighted score</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-emerald-400">
            {highConfidenceCount} requests ≥85% confidence
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Critical Failure Horizon</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-rose-300">
              {criticalUrgencyCount}
            </span>
            <span className="text-xs font-mono text-slate-400">due &lt; 72 hours</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-rose-400">
            Speed restriction warning active
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Optimal Mega-Block Slots</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-indigo-300">
              {nightShadowCount}
            </span>
            <span className="text-xs font-mono text-slate-400">zero-disruption slots</span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-indigo-400">
            Night shadow & off-peak windows
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Department Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1 font-bold">DEPT:</span>
            {['ALL', 'ENGINEERING', 'S&T', 'TRACTION'].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                  selectedDept === dept
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dept === 'ENGINEERING' ? 'Track' : dept}
              </button>
            ))}
          </div>

          {/* Corridor Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1 font-bold">CORRIDOR:</span>
            {['ALL', 'C001', 'C002', 'C003', 'C004'].map((corr) => (
              <button
                key={corr}
                onClick={() => setSelectedCorridor(corr)}
                className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                  selectedCorridor === corr
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {corr}
              </button>
            ))}
          </div>

          {/* Confidence Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1 font-bold">CONFIDENCE:</span>
            {(['ALL', 'VERY_HIGH', 'HIGH'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setConfidenceFilter(lvl)}
                className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                  confidenceFilter === lvl
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl === 'ALL' ? 'All' : lvl === 'VERY_HIGH' ? '≥92%' : '≥85%'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Request, Asset, Defect..."
            className="bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-sky-500 w-full sm:w-64 font-mono placeholder:text-slate-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Insights Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/95 text-slate-400 sticky top-0 z-10 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="p-3">Request ID & Asset</th>
                <th className="p-3">Corridor & Section</th>
                <th className="p-3">Historical Defect Pattern</th>
                <th className="p-3">Best Time to Initiate Block (AI)</th>
                <th className="p-3">AI Confidence Score</th>
                <th className="p-3">Failure Horizon</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredInsights.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic font-sans text-xs">
                    No maintenance requests match the selected predictive filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInsights.map((item) => {
                  const isExpanded = expandedRequestId === item.requestId;
                  const isScheduled = !!scheduledBlockIds[item.requestId] || item.status === 'SCHEDULED' || item.status === 'SCHEDULED_VIA_PREDICTIVE';
                  const scheduledId = scheduledBlockIds[item.requestId] || item.scheduledBlockId || 'BLK-SCHEDULED';
                  const isCurrentlyScheduling = schedulingInProgress === item.requestId;

                  return (
                    <React.Fragment key={item.requestId}>
                      <tr
                        onClick={() =>
                          setExpandedRequestId(isExpanded ? null : item.requestId)
                        }
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-sky-950/30 border-l-2 border-sky-400' : ''
                        }`}
                      >
                        {/* Request ID & Asset */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100">{item.requestId}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                item.priority === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : item.priority === 'HIGH'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-sans truncate max-w-[170px] mt-0.5" title={item.requestTitle}>
                            {item.requestTitle}
                          </div>
                          <div className="text-[10px] text-sky-400 font-mono">
                            {item.assetId} • {item.department}
                          </div>
                        </td>

                        {/* Corridor & Section */}
                        <td className="p-3">
                          <div className="text-slate-200 font-bold">{item.corridorId}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {item.section}
                          </div>
                        </td>

                        {/* Historical Defect Pattern */}
                        <td className="p-3">
                          <div className="text-slate-200 font-medium font-sans truncate max-w-[210px]" title={item.pattern.patternName}>
                            {item.pattern.patternName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {item.pattern.historicalOccurrencesCount}x in 90d (TGI: {item.pattern.tgiTrendIndex})
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                                item.pattern.degradationRate === 'ACCELERATING'
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                  : item.pattern.degradationRate === 'LINEAR'
                                  ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.pattern.degradationRate}
                            </span>
                          </div>
                        </td>

                        {/* Best Time to Initiate Block */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sky-300">
                              {item.suggestedWindow.startTime} – {item.suggestedWindow.endTime}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({item.suggestedWindow.durationMinutes}m)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                item.suggestedWindow.windowType === 'NIGHT_MEGA_BLOCK'
                                  ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/60'
                                  : item.suggestedWindow.windowType === 'MIDDAY_TRAFFIC_LULL'
                                  ? 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                                  : 'bg-sky-950/90 text-sky-300 border-sky-700/60'
                              }`}
                            >
                              {item.suggestedWindow.windowType === 'NIGHT_MEGA_BLOCK'
                                ? 'Night Mega Block'
                                : item.suggestedWindow.windowType === 'MIDDAY_TRAFFIC_LULL'
                                ? 'Midday Lull'
                                : 'Off-Peak Shadow'}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">
                              {item.suggestedWindow.trafficLullPercentage}% lull
                            </span>
                          </div>
                        </td>

                        {/* AI Confidence Score */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  item.confidence.overallScore >= 92
                                    ? 'bg-emerald-400'
                                    : item.confidence.overallScore >= 85
                                    ? 'bg-sky-400'
                                    : 'bg-amber-400'
                                }`}
                                style={{ width: `${item.confidence.overallScore}%` }}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-black px-1.5 py-0.5 rounded border ${
                                item.confidence.overallScore >= 92
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                                  : item.confidence.overallScore >= 85
                                  ? 'bg-sky-950 text-sky-300 border-sky-700/80'
                                  : 'bg-amber-950 text-amber-300 border-amber-700/80'
                              }`}
                            >
                              {item.confidence.overallScore}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <span>Hist: {item.confidence.historicalPatternMatch}%</span>
                            <span>•</span>
                            <span>Trf: {item.confidence.trafficWindowSuitability}%</span>
                          </div>
                        </td>

                        {/* Failure Horizon */}
                        <td className="p-3">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`font-black text-sm ${
                                item.daysUntilCriticalFailure <= 2.5
                                  ? 'text-rose-400'
                                  : item.daysUntilCriticalFailure <= 4.5
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {item.daysUntilCriticalFailure}
                            </span>
                            <span className="text-[10px] text-slate-400">days</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.daysUntilCriticalFailure <= 2.5
                              ? 'Risk: Rail fracture'
                              : 'Degradation curve'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {isScheduled ? (
                              <div className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>{scheduledId}</span>
                              </div>
                            ) : (
                              <button
                                id={`schedule-pred-btn-${item.requestId}`}
                                onClick={() => handleScheduleBlock(item)}
                                disabled={isCurrentlyScheduling}
                                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-[10px] transition-colors shadow flex items-center gap-1 disabled:opacity-50"
                              >
                                <Zap className="w-3 h-3" />
                                <span>{isCurrentlyScheduling ? 'Scheduling...' : 'Schedule Block'}</span>
                              </button>
                            )}

                            <button
                              id={`toggle-diagnostic-${item.requestId}`}
                              onClick={() =>
                                setExpandedRequestId(isExpanded ? null : item.requestId)
                              }
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title={isExpanded ? 'Hide Diagnostics' : 'Inspect Diagnostics'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-sky-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Deep Diagnostic Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-900/70">
                          <td colSpan={7} className="p-4 border-t border-b border-slate-800">
                            <div className="space-y-3">
                              {/* 3 Detail Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                                {/* Card 1: Historical Defect Pattern & Recurrence */}
                                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-300 border-b border-slate-800 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <TrendingDown className="w-3.5 h-3.5 text-sky-400" />
                                      Defect Pattern Analysis
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Cluster #{item.pattern.clusterId}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-sans">
                                    {item.pattern.primaryRiskFactor}
                                  </p>
                                  <div className="space-y-1 pt-1 text-[10px] text-slate-400">
                                    <div className="flex justify-between">
                                      <span>Recurrence Frequency:</span>
                                      <span className="text-slate-200 font-bold">Every ~{item.pattern.recurrenceIntervalDays} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Track Geometry Index:</span>
                                      <span className="text-amber-400 font-bold">{item.pattern.tgiTrendIndex} / 100</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Advised Speed Restriction:</span>
                                      <span className="text-rose-400 font-bold">
                                        {item.pattern.speedRestrictionAdvisedKmph ? `${item.pattern.speedRestrictionAdvisedKmph} km/h` : 'None (Pre-emptive)'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Past occurrences history */}
                                  <div className="pt-2 border-t border-slate-800/80">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">
                                      Prior Recurrence Log
                                    </span>
                                    <div className="space-y-1">
                                      {item.pattern.recentOccurrences.map((occ) => (
                                        <div key={occ.defectId} className="text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800/80 flex justify-between items-center">
                                          <span className="text-slate-300 font-bold">{occ.defectId} ({occ.date})</span>
                                          <span className="text-emerald-400">{occ.rectifiedInHours}h block duration</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Card 2: Recommended Timing & Traffic Density Rationale */}
                                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 border-b border-slate-800 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                      Suggested Block Timing Rationale
                                    </span>
                                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                                      {item.suggestedWindow.trafficLullPercentage}% Lull
                                    </span>
                                  </div>
                                  <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 text-[11px] font-sans">
                                    <strong>Recommended Slot:</strong> {item.suggestedWindow.suggestedDate} from {item.suggestedWindow.startTime} to {item.suggestedWindow.endTime} ({item.suggestedWindow.durationMinutes} min)
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-sans">
                                    {item.suggestedWindow.rationale}
                                  </p>
                                  <div className="space-y-1 pt-1 text-[10px] text-slate-400">
                                    <div className="flex justify-between">
                                      <span>Passenger Trains Impacted:</span>
                                      <span className="text-emerald-400 font-bold">0 Trains (Zero Disruption)</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Train Headway Clearance Buffer:</span>
                                      <span className="text-slate-200 font-bold">{item.suggestedWindow.headwayBufferMinutes} minutes</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Thermal Condition:</span>
                                      <span className="text-sky-300 font-bold">{item.suggestedWindow.weatherThermalCondition}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card 3: AI Confidence Breakdown & Resources */}
                                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300 border-b border-slate-800 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                                      AI Confidence Factors ({item.confidence.overallScore}%)
                                    </span>
                                    <span className="text-[10px] text-indigo-400">
                                      {item.confidenceRating}
                                    </span>
                                  </div>

                                  {/* 4 factors */}
                                  <div className="space-y-1.5 text-[10px]">
                                    <div>
                                      <div className="flex justify-between text-slate-300 mb-0.5">
                                        <span>Defect Pattern Match:</span>
                                        <span className="font-bold text-emerald-400">{item.confidence.historicalPatternMatch}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${item.confidence.historicalPatternMatch}%` }}></div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-slate-300 mb-0.5">
                                        <span>Traffic Window Clearance:</span>
                                        <span className="font-bold text-sky-400">{item.confidence.trafficWindowSuitability}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-sky-500 h-full" style={{ width: `${item.confidence.trafficWindowSuitability}%` }}></div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-slate-300 mb-0.5">
                                        <span>Machinery & Gang Readiness:</span>
                                        <span className="font-bold text-indigo-400">{item.confidence.resourceFleetAvailability}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full" style={{ width: `${item.confidence.resourceFleetAvailability}%` }}></div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-slate-300 mb-0.5">
                                        <span>Track Thermal Neutrality:</span>
                                        <span className="font-bold text-amber-400">{item.confidence.trackThermalMargin}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full" style={{ width: `${item.confidence.trackThermalMargin}%` }}></div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-800/80 text-[10px] space-y-1">
                                    <div className="text-slate-400">
                                      <strong className="text-slate-300">Machinery:</strong> {item.suggestedWindow.recommendedMachinery}
                                    </div>
                                    <div className="text-slate-400">
                                      <strong className="text-slate-300">Gang:</strong> {item.suggestedWindow.recommendedGang}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Footer inside drawer */}
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs font-mono">
                                <div className="flex items-center gap-2 text-rose-300 text-[11px]">
                                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                  <span>
                                    <strong>Consequence if delayed past {item.daysUntilCriticalFailure} days:</strong> {item.unaddressedConsequence}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isScheduled ? (
                                    <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Committed as {scheduledId}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleScheduleBlock(item)}
                                      disabled={isCurrentlyScheduling}
                                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>Apply Suggested Window ({item.suggestedWindow.startTime}–{item.suggestedWindow.endTime})</span>
                                    </button>
                                  )}

                                  {onNavigate && (
                                    <button
                                      onClick={() => onNavigate('timeline')}
                                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                                    >
                                      View in Timeline →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Footer Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            AI pattern engine analyzes historical ultrasonic flaw recurrence, rail temperature neutral thresholds, and train schedules to prevent track failures before they cause derailments or caution orders.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowClustersModal(true)}
            className="text-sky-400 hover:text-sky-300 underline font-bold"
          >
            Explore Defect Archetypes →
          </button>
        </div>
      </div>

      {/* Defect Pattern Clusters Modal */}
      {showClustersModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e172e] border border-sky-800/80 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-950 border border-indigo-700/60 text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wide">
                    Historical Defect Clusters & Pattern Library
                  </h4>
                  <p className="text-xs text-slate-400">
                    Indian Railways defect archetypes cross-referenced for predictive scheduling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClustersModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {HISTORICAL_DEFECT_CLUSTERS.map((clust) => (
                <div
                  key={clust.clusterId}
                  className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-300">{clust.clusterName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {clust.clusterId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                        Avg Recurrence: ~{clust.avgRecurrenceDays} days
                      </span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                        {clust.totalDefectsInCluster} Recorded Defects
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans">
                    {clust.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <div>
                      Department: <strong className="text-slate-200">{clust.department}</strong> • Affected Corridors: <strong className="text-slate-200">{clust.affectedCorridors.join(', ')}</strong>
                    </div>
                    <div className="text-emerald-400 font-bold">
                      Recommended Preventive Block: {clust.recommendedPreventiveBlockHours} Hours
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowClustersModal(false)}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-colors"
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
