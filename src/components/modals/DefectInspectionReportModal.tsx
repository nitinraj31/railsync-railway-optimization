import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Copy,
  Check,
  Gauge,
  MapPin,
  Camera,
  Layers,
  ChevronRight,
  Eye,
  FileCode,
} from 'lucide-react';
import { Defect } from '../../types';
import {
  calculateReportSummaryStats,
  getStructuralRiskSummary,
  downloadDefectInspectionPdf,
  printDefectInspectionReport,
  generateDefectInspectionHtml,
} from '../../services/defectInspectionReportPdfService';
import { railwayAudio } from '../../services/railwayAudio';

interface DefectInspectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredDefects: Defect[];
  allDefects: Defect[];
  activeFilterSummary?: string;
  inspectorName?: string;
  reportTitle?: string;
}

export const DefectInspectionReportModal: React.FC<DefectInspectionReportModalProps> = ({
  isOpen,
  onClose,
  filteredDefects,
  allDefects,
  activeFilterSummary = 'Active Filtered Registry',
  inspectorName = 'Senior Section Engineer (P-Way / Safety)',
  reportTitle = 'PERMANENT WAY & INFRASTRUCTURE MAINTENANCE INSPECTION REPORT',
}) => {
  // Option: report on filtered subset or all defects
  const [scope, setScope] = useState<'FILTERED' | 'ALL'>('FILTERED');
  const [includeStructuralCards, setIncludeStructuralCards] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccessName, setDownloadSuccessName] = useState<string | null>(null);

  const selectedDefects = useMemo(() => {
    return scope === 'FILTERED' ? filteredDefects : allDefects;
  }, [scope, filteredDefects, allDefects]);

  const stats = useMemo(() => {
    return calculateReportSummaryStats(selectedDefects);
  }, [selectedDefects]);

  if (!isOpen) return null;

  const reportRef = `IR-INSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-7420`;
  const reportDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleDownloadPdf = () => {
    try {
      setIsDownloading(true);
      railwayAudio.playBeep(880, 0.06);
      const filename = downloadDefectInspectionPdf({
        defects: selectedDefects,
        reportTitle,
        division: 'DELHI DIVISION (NR)',
        zone: 'NORTHERN RAILWAY',
        inspectedBy: inspectorName,
        filterSummary: scope === 'FILTERED' ? activeFilterSummary : 'All Logged Corridor Defects',
      });
      setDownloadSuccessName(filename);
      setTimeout(() => setDownloadSuccessName(null), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    railwayAudio.playBeep(750, 0.05);
    printDefectInspectionReport({
      defects: selectedDefects,
      reportTitle,
      division: 'DELHI DIVISION (NR)',
      zone: 'NORTHERN RAILWAY',
      inspectedBy: inspectorName,
      filterSummary: scope === 'FILTERED' ? activeFilterSummary : 'All Logged Corridor Defects',
    });
  };

  const handleExportHtml = () => {
    railwayAudio.playBeep(700, 0.04);
    const html = generateDefectInspectionHtml({
      defects: selectedDefects,
      reportTitle,
      division: 'DELHI DIVISION (NR)',
      zone: 'NORTHERN RAILWAY',
      inspectedBy: inspectorName,
      filterSummary: scope === 'FILTERED' ? activeFilterSummary : 'All Logged Corridor Defects',
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IR_Maintenance_Inspection_Report_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    railwayAudio.playBeep(600, 0.03);
    const text = `INDIAN RAILWAYS - PERMANENT WAY & INFRASTRUCTURE MAINTENANCE INSPECTION REPORT
REF: ${reportRef} | DATE: ${reportDate} | DIVISION: DELHI DIVISION (NR)
SCOPE: ${scope === 'FILTERED' ? activeFilterSummary : 'All Logged Defects'} (${selectedDefects.length} DEFECTS)
================================================================================
STATISTICAL METRICS:
- Total Logged Defects: ${stats.totalDefects}
- Critical Severity: ${stats.criticalCount} | High Severity: ${stats.highCount}
- AI Evaluated Defects: ${stats.aiEvaluatedCount} (Avg Confidence: ${stats.avgConfidence}%)
- AI Critical Risk Classifications: ${stats.aiCriticalCount}
- Imposed Speed Restrictions / Caution Orders: ${stats.speedRestrictionCount}
================================================================================
EXECUTIVE SUMMARY:
AI Computer Vision and Structural Diagnostics flagged ${stats.aiCriticalCount} critical-risk items requiring urgent possession blocks.

DEFECT RECORDS & STRUCTURAL RISK SUMMARIES:
${selectedDefects
  .map((d, i) => {
    const risk = getStructuralRiskSummary(d);
    return `${i + 1}. [${d.defectId}] ${d.assetId} | ${d.defectType}
   - Reported Severity: ${d.severity} | AI Priority: ${risk.aiPriority} (${risk.confidence}% conf)
   - Structural Risk: ${risk.riskSummary}
   - Recommended Remedy: ${risk.recommendedAction}
   - Caution Order: ${risk.cautionOrder}
   - Location: ${d.geoCoordinates?.railwayChainageKm || 'Corridor'}`;
  })
  .join('\n\n')}
================================================================================
CERTIFICATION:
Inspected By: ${inspectorName}
AI Risk Validation: Divisional Safety Officer (Safety Audit Cell)
Possession Authority: Sr. Divisional Engineer (Co-ord / Track)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Critical defects for highlighted structural profiles
  const highRiskDefects = selectedDefects.filter(
    (d) => d.severity === 'CRITICAL' || d.aiVisualAnalysis?.suggestedPriority === 'CRITICAL'
  );

  return (
    <div
      id="defect-inspection-report-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-blue-800/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-blue-900/60 bg-[#070e1e] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  Maintenance Inspection Report (PDF)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600/70 font-mono">
                  INDIAN RAILWAYS P-WAY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Engineering Inspection Dossier with AI Priorities & Structural Risk Summaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-close-inspection-modal"
              onClick={() => {
                railwayAudio.playBeep(440, 0.03);
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Close report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Report Scope:</span>
            </span>

            {/* Scope Selection Tabs */}
            <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700">
              <button
                type="button"
                id="btn-scope-filtered"
                onClick={() => {
                  setScope('FILTERED');
                  railwayAudio.playBeep(650, 0.03);
                }}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  scope === 'FILTERED'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Current Filtered ({filteredDefects.length})
              </button>
              <button
                type="button"
                id="btn-scope-all"
                onClick={() => {
                  setScope('ALL');
                  railwayAudio.playBeep(650, 0.03);
                }}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                  scope === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All Registered ({allDefects.length})
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer font-mono text-[11px]">
              <input
                type="checkbox"
                checked={includeStructuralCards}
                onChange={(e) => setIncludeStructuralCards(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>Include High-Risk Structural Cards</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">
              Ref: <strong className="text-amber-300">{reportRef}</strong>
            </span>
          </div>
        </div>

        {/* Statistical Overview Strip */}
        <div className="px-5 py-3 bg-gradient-to-r from-[#0b1b36] via-[#09152b] to-[#0b1b36] border-b border-blue-900/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="block text-[10px] uppercase font-bold text-slate-400 font-mono">Defects in Report</span>
              <span className="text-lg font-bold text-white font-mono">{stats.totalDefects}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/80">
              <span className="block text-[10px] uppercase font-bold text-rose-400 font-mono">Critical Severity</span>
              <span className="text-lg font-bold text-rose-300 font-mono">{stats.criticalCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/80">
              <span className="block text-[10px] uppercase font-bold text-amber-400 font-mono">High Severity</span>
              <span className="text-lg font-bold text-amber-300 font-mono">{stats.highCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/80">
              <span className="block text-[10px] uppercase font-bold text-indigo-300 font-mono">AI Evaluated</span>
              <span className="text-lg font-bold text-indigo-200 font-mono">
                {stats.aiEvaluatedCount}{' '}
                <span className="text-xs text-indigo-400 font-normal">({stats.avgConfidence}% conf)</span>
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-700/80">
              <span className="block text-[10px] uppercase font-bold text-rose-400 font-mono">AI Critical Risk</span>
              <span className="text-lg font-bold text-rose-200 font-mono">{stats.aiCriticalCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/80">
              <span className="block text-[10px] uppercase font-bold text-sky-400 font-mono">Speed Restrictions</span>
              <span className="text-lg font-bold text-sky-300 font-mono">{stats.speedRestrictionCount} Active</span>
            </div>
          </div>
        </div>

        {/* Scrollable Document Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#070d1d] text-slate-200">
          {/* Document Simulated Sheet */}
          <div className="bg-[#0b152d] border border-slate-700/80 rounded-xl p-5 shadow-2xl space-y-4">
            {/* Sheet Banner */}
            <div className="border-b-2 border-amber-500 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                  GOVERNMENT OF INDIA &bull; MINISTRY OF RAILWAYS
                </span>
                <h3 className="text-base sm:text-lg font-bold text-amber-300 font-mono mt-0.5">
                  PERMANENT WAY & INFRASTRUCTURE MAINTENANCE INSPECTION REPORT
                </h3>
                <p className="text-xs text-slate-300">
                  Northern Railway &bull; Delhi Division &bull; Integrated Track Monitoring & Safety Directorate
                </p>
              </div>
              <div className="text-left sm:text-right font-mono text-[11px] text-slate-400 space-y-0.5">
                <div>
                  REF: <strong className="text-slate-100">{reportRef}</strong>
                </div>
                <div>
                  TIMESTAMP: <strong className="text-slate-200">{reportDate}</strong>
                </div>
                <div>
                  SCOPE: <span className="text-amber-300">{scope === 'FILTERED' ? activeFilterSummary : 'All Defects'}</span>
                </div>
              </div>
            </div>

            {/* Executive Structural Risk Directive */}
            <div className="p-3 rounded-lg bg-slate-900/90 border-l-4 border-blue-500 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sky-300 font-mono">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>EXECUTIVE TRACK SAFETY & STRUCTURAL INTEGRITY DIRECTIVE</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                This statutory engineering dossier compiles <strong className="text-white">{selectedDefects.length} defect records</strong> across operational corridors.
                Computer vision & acoustic frequency analysis has diagnosed{' '}
                <strong className="text-rose-300">{stats.aiCriticalCount} critical structural vulnerabilities</strong> requiring priority maintenance blocks to prevent service disruptions, brittle fractures, or rail separation under dynamic 25T axle loads.
              </p>
            </div>

            {/* Defect Structural Risk Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800">
                    <th className="py-2.5 px-3">Defect ID & Asset</th>
                    <th className="py-2.5 px-2">Dept</th>
                    <th className="py-2.5 px-3">Defect Description</th>
                    <th className="py-2.5 px-2 text-center">Reported</th>
                    <th className="py-2.5 px-2 text-center">AI Priority & Conf</th>
                    <th className="py-2.5 px-3">Structural Risk Summary & Action</th>
                    <th className="py-2.5 px-2">Caution Order</th>
                    <th className="py-2.5 px-2">Chainage / GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {selectedDefects.map((defect) => {
                    const risk = getStructuralRiskSummary(defect);
                    const isCrit = risk.aiPriority === 'CRITICAL' || defect.severity === 'CRITICAL';
                    const isHigh = risk.aiPriority === 'HIGH' || defect.severity === 'HIGH';

                    return (
                      <tr
                        key={defect.defectId}
                        className={`hover:bg-slate-900/60 transition-colors ${
                          isCrit ? 'bg-rose-950/20' : isHigh ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 align-top font-mono">
                          <strong className="text-white block">{defect.defectId}</strong>
                          <span className="text-[10px] text-slate-400 block">{defect.assetId}</span>
                          <span className="text-[9px] text-sky-400 block">{defect.corridorId}</span>
                        </td>

                        <td className="py-2.5 px-2 align-top">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {defect.department}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <div className="font-semibold text-slate-200 text-[11.5px]">{defect.defectType}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            {defect.description}
                          </div>
                          {defect.photoAttachment && (
                            <span className="inline-flex items-center gap-1 text-[9.5px] text-sky-400 font-mono mt-1">
                              <Camera className="w-3 h-3" />
                              <span>Photo Evidence Attached</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-2 align-top text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              defect.severity === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300 border-rose-700'
                                : defect.severity === 'HIGH'
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : defect.severity === 'MEDIUM'
                                ? 'bg-sky-950 text-sky-300 border-sky-700'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {defect.severity}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 align-top text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              risk.aiPriority === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-200 border-rose-600 shadow-sm'
                                : risk.aiPriority === 'HIGH'
                                ? 'bg-amber-950 text-amber-200 border-amber-600'
                                : risk.aiPriority === 'MEDIUM'
                                ? 'bg-sky-950 text-sky-200 border-sky-600'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {risk.aiPriority}
                          </span>
                          <span className="block text-[9.5px] font-mono text-indigo-300 mt-0.5">
                            {risk.confidence}% conf
                          </span>
                        </td>

                        <td className="py-2.5 px-3 align-top max-w-sm">
                          <div className="text-[11px] text-slate-300 font-sans leading-relaxed">
                            <span className="font-semibold text-slate-100">Risk: </span>
                            {risk.riskSummary}
                          </div>
                          <div className="text-[10.5px] text-emerald-400 font-sans mt-1">
                            <span className="font-semibold text-emerald-300">Action: </span>
                            {risk.recommendedAction}
                          </div>
                        </td>

                        <td className="py-2.5 px-2 align-top font-mono">
                          {risk.cautionOrder !== 'None' && !risk.cautionOrder.includes('Normal') ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700 block text-center">
                              {risk.cautionOrder}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block text-center">Normal</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2 align-top font-mono text-[10px] text-slate-400">
                          {defect.geoCoordinates?.railwayChainageKm ? (
                            <div className="text-amber-300 font-semibold">{defect.geoCoordinates.railwayChainageKm}</div>
                          ) : defect.geoCoordinates ? (
                            <div>
                              {defect.geoCoordinates.latitude.toFixed(3)}°N
                              <br />
                              {defect.geoCoordinates.longitude.toFixed(3)}°E
                            </div>
                          ) : (
                            <span className="text-slate-500">Corridor Post</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* High-Risk Structural Cards Deep-Dive (Optional toggle) */}
            {includeStructuralCards && highRiskDefects.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wider">
                    High Structural Risk Failure Modes & Engineering Diagnostics ({highRiskDefects.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {highRiskDefects.slice(0, 4).map((d) => {
                    const r = getStructuralRiskSummary(d);
                    return (
                      <div
                        key={`high-risk-${d.defectId}`}
                        className="p-3 rounded-lg bg-slate-900/80 border border-rose-800/60 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                              CRITICAL RISK
                            </span>
                            <strong className="text-white font-mono">{d.defectId}</strong>
                            <span className="text-slate-400 font-mono text-[10px]">{d.assetId}</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300">
                            {d.geoCoordinates?.railwayChainageKm || d.corridorId}
                          </span>
                        </div>
                        <h5 className="font-semibold text-rose-200 text-xs">{d.defectType}</h5>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{r.riskSummary}</p>
                        <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10.5px]">
                          <span className="text-emerald-400 font-mono">Remedy: {r.recommendedAction}</span>
                          <span className="text-amber-400 font-bold font-mono">{r.cautionOrder}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Official Indian Railways Sign-off Block */}
            <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  INSPECTED & REPORTED BY
                </span>
                <span className="font-bold text-white block mt-1">{inspectorName}</span>
                <span className="text-[11px] text-slate-400 block">SSE / Permanent Way, IR Safety Cell</span>
                <div className="mt-3 pt-2 border-t border-dashed border-slate-700 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Certified Field Log Recorded</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  AI RISK VALIDATION & AUDIT
                </span>
                <span className="font-bold text-indigo-300 block mt-1">Divisional Safety Officer</span>
                <span className="text-[11px] text-slate-400 block">Safety Directorate & Track Audit Cell</span>
                <div className="mt-3 pt-2 border-t border-dashed border-slate-700 text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Risk Model Verified ({stats.avgConfidence}% avg)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  POSSESSION & CLOSURE SANCTION
                </span>
                <span className="font-bold text-amber-300 block mt-1">Sr. Divisional Engineer (Co-ord)</span>
                <span className="text-[11px] text-slate-400 block">Delhi Operating Control / Northern Railway</span>
                <div className="mt-3 pt-2 border-t border-dashed border-slate-700 text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Statutory Maintenance Sanctioned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#070e1e] border-t border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {downloadSuccessName && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Downloaded: {downloadSuccessName}</span>
              </span>
            )}
            {!downloadSuccessName && (
              <span className="text-xs text-slate-400 font-mono">
                {selectedDefects.length} Defects compiled into A4 Landscape report
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-copy-report-summary"
              onClick={handleCopySummary}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy formatted plain text summary to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied Summary' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              id="btn-export-html-dossier"
              onClick={handleExportHtml}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export self-contained HTML inspection dossier"
            >
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>HTML Dossier</span>
            </button>

            <button
              type="button"
              id="btn-print-inspection-report"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-700 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open print dialog to print or save as PDF via system browser"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Print / System PDF</span>
            </button>

            <button
              type="button"
              id="btn-download-official-pdf"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer disabled:opacity-50"
              title="Generate and download formatted PDF file"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isDownloading ? 'Generating PDF...' : 'Download Official PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
