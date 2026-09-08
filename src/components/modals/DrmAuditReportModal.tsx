import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  X,
  FileCheck,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { DrmAuditReportData } from '../../types';

interface DrmAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DrmAuditReportData | null;
}

export const DrmAuditReportModal: React.FC<DrmAuditReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopy = () => {
    const text = `
DIVISIONAL RAILWAY MANAGER (DRM) EXECUTIVE SAFETY AUDIT REPORT
==============================================================
REPORT ID: ${report.reportId}
DATE: ${report.generatedAt}
DIVISION: ${report.division} (${report.zone})
AUDITED BY: ${report.auditedBy}
SAFETY STATUS: ${report.safetyOfficerApproval}
--------------------------------------------------------------
METRICS:
- Total Conflicts Audited: ${report.totalConflictsAudited}
- Conflicts Formally Resolved: ${report.resolvedConflictsCount}
- Open Critical Conflicts: ${report.openCriticalCount}
- Passenger Zero-Tolerance Policy: ${report.zeroTolerancePassed ? 'PASSED' : 'ACTION REQUIRED'}
--------------------------------------------------------------
CORRIDOR AUDIT BREAKDOWN:
${report.corridorBreakdown.map((c) => `- ${c.corridorName} (${c.corridorId}): ${c.resolved} Resolved / ${c.open} Open [${c.status}]`).join('\n')}
--------------------------------------------------------------
EXECUTIVE SAFETY SUMMARY:
${report.executiveSummary}
==============================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="drm-audit-report-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-blue-800/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/60 bg-[#070e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-600/80 text-sky-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
                  DRM Executive Safety Audit Sign-Off
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  report.zeroTolerancePassed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {report.zeroTolerancePassed ? 'PASSED' : 'ACTION REQUIRED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory audit review for {report.division}, {report.zone} prior to timetable publishing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono text-slate-200">
          {/* Top Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            report.zeroTolerancePassed
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800 text-amber-200'
          }`}>
            {report.zeroTolerancePassed ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">
                  {report.zeroTolerancePassed
                    ? 'ZERO-TOLERANCE PASSENGER PATH SAFETY CLEARED'
                    : 'SAFETY REVIEW PENDING: UNRESOLVED HIGH-SPEED TRAIN OVERLAPS'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {report.executiveSummary}
              </p>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TOTAL CONFLICTS</span>
              <span className="text-xl font-bold text-slate-100">{report.totalConflictsAudited}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Audited Register</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">FORMALLY RESOLVED</span>
              <span className="text-xl font-bold text-emerald-400">{report.resolvedConflictsCount}</span>
              <span className="text-[10px] text-emerald-500/80 block mt-0.5">Slots Approved</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">OPEN CRITICAL</span>
              <span className="text-xl font-bold text-rose-400">{report.openCriticalCount}</span>
              <span className="text-[10px] text-rose-500/80 block mt-0.5">Passenger Clashes</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">KAVACH AUDIT</span>
              <span className="text-xl font-bold text-sky-400">CERTIFIED</span>
              <span className="text-[10px] text-sky-500/80 block mt-0.5">&gt;3.0 km Buffer</span>
            </div>
          </div>

          {/* Corridor-by-Corridor Breakdown */}
          <div className="space-y-2">
            <span className="text-slate-300 font-bold text-[11px] uppercase tracking-wider block">
              Corridor-Wise Conflict Resolution Audit Trail:
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070e1e] text-[10px] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Corridor Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Resolved</th>
                    <th className="py-2.5 px-3">Open Remaining</th>
                    <th className="py-2.5 px-3">Safety Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {report.corridorBreakdown.map((cb) => (
                    <tr key={cb.corridorId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{cb.corridorName}</td>
                      <td className="py-2.5 px-3 text-sky-400">{cb.corridorId}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{cb.resolved}</td>
                      <td className="py-2.5 px-3 text-slate-300">{cb.open}</td>
                      <td className="py-2.5 px-3">
                        {cb.status === 'CLEARED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            CLEARED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ATTENTION
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Sign-Off Footer Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>REPORT ID: <strong className="text-slate-200">{report.reportId}</strong></span>
              <span>AUDIT TIMESTAMP: <strong className="text-slate-200">{report.generatedAt}</strong></span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">ELECTRONIC AUDIT SIGN-OFF:</span>
                <span className="font-bold text-sky-300">{report.auditedBy}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SAFETY OFFICER VERDICT:</span>
                <span className="font-bold text-emerald-400">{report.safetyOfficerApproval}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-blue-900/60 bg-[#070e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Certified compliant with Railway Board Safety Circular 2026/CE-II/Track/5.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Audit Text'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-sky-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors border border-blue-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print DRM Report</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs font-mono cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
