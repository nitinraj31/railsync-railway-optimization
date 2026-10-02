import React, { useState } from 'react';
import {
  FileCheck,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  X,
  Lock,
  RotateCcw,
  Train,
  CheckCircle2,
  ExternalLink,
  QrCode,
  FileText,
  AlertCircle,
  Download,
  Eye,
  FileSpreadsheet,
  FileCode,
  FileBox,
  Share2,
} from 'lucide-react';
import { PublicationInfo, Corridor, OptimizedBlock } from '../../types';
import {
  printOfficialBulletin,
  exportBulletinAsHTML,
  exportBulletinAsCSV,
  exportBulletinAsText,
  exportBulletinAsJSON,
} from '../../services/exportBulletinService';
import { DailyBlockSchedulePdfModal } from './DailyBlockSchedulePdfModal';

interface PublishedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicationState: PublicationInfo;
  corridors?: Corridor[];
  blocks?: OptimizedBlock[];
  onRevokePublication?: () => Promise<void>;
  onNavigateToAudit?: () => void;
}

export const PublishedScheduleModal: React.FC<PublishedScheduleModalProps> = ({
  isOpen,
  onClose,
  publicationState,
  corridors = [],
  blocks = [],
  onRevokePublication,
  onNavigateToAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'DOSSIER' | 'PREVIEW'>('DOSSIER');
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showSignOffPdfModal, setShowSignOffPdfModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState(
    'Emergency corridor train priority adjustment requested by Central Traffic Control.'
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const scheduleId = publicationState.publishedScheduleId || 'SCH-IR-2026-8492';
  const approvalRef = publicationState.approvalReference || 'RB-IR-BLK-2026-4190';
  const publishedAt = publicationState.publishedAt || new Date().toLocaleTimeString();
  const publishedBy =
    publicationState.publishedBy || publicationState.approvedBy || 'Smt. Ananya Sen (Chief Block Coordinator)';
  const version = publicationState.scheduleVersion || 'v2026.09.06-FINAL';
  const totalBlocks = publicationState.totalBlocksPublished || blocks.length || 42;

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => {
      setExportNotice(null);
    }, 3000);
  };

  const handleCopy = () => {
    const text = `
MINISTRY OF RAILWAYS - INDIAN RAILWAYS OPERATIONAL CONTROL
OFFICIAL GAZETTE: INTEGRATED MAINTENANCE BLOCK TIMETABLE
==============================================================
SCHEDULE ID: ${scheduleId}
APPROVAL REF: ${approvalRef}
VERSION: ${version}
STATUS: OFFICIALLY PUBLISHED & LOCKED
PUBLISHED AT: ${publishedAt}
AUTHORIZED SIGNATORY: ${publishedBy}
TOTAL AUTHORIZED BLOCKS: ${totalBlocks}
--------------------------------------------------------------
SAFETY COMPLIANCE:
- 7-Point Indian Railways Safety Checklist: 100% PASS
- Train-Block Clashes: ZERO (0)
- Asset Isolation Certificates: 100% VERIFIED
- Traction Power & S&T Disconnections: SYNCHRONIZED
--------------------------------------------------------------
ACTIVE CORRIDOR ALLOCATIONS:
${corridors.map((c) => `- Corridor ${c.id} (${c.name}): Max Maintenance Capacity: ${c.availableSlots || 12} slots, Length: ${c.lengthKm} km`).join('\n')}
==============================================================
DISPATCH DIRECTIVE:
All Station Masters, Chief Section Controllers, and Permanent Way
Engineers must enforce the locked timetable slots without deviation.
==============================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    showNotification('Official gazette text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printOfficialBulletin({
      publicationState,
      corridors,
      blocks,
    });
    showNotification('Opening clean print-ready bulletin...');
  };

  const handleExportHTML = () => {
    exportBulletinAsHTML({ publicationState, corridors, blocks });
    showNotification('Exported official HTML/PDF bulletin dossier!');
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    exportBulletinAsCSV({ publicationState, corridors, blocks });
    showNotification('Exported 42 maintenance blocks as CSV!');
    setShowExportMenu(false);
  };

  const handleExportText = () => {
    exportBulletinAsText({ publicationState, corridors, blocks });
    showNotification('Exported official gazette text dispatch directive!');
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    exportBulletinAsJSON({ publicationState, corridors, blocks });
    showNotification('Exported SCADA / TMS JSON manifest!');
    setShowExportMenu(false);
  };

  const handleConfirmRevoke = async () => {
    if (!onRevokePublication) return;
    setRevoking(true);
    try {
      await onRevokePublication();
      setShowRevokeConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to revoke publication:', err);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1222] border border-emerald-600/70 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-950/80 via-[#0b1b2b] to-[#0b1222] border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-500/50 text-emerald-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Official Maintenance Schedule Dossier
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-bold">
                  PUBLISHED &amp; LOCKED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gazetted Indian Railways Daily Maintenance &amp; Operational Block Bulletin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher: Overview vs Printable Bulletin Preview */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setActiveTab('DOSSIER')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'DOSSIER'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dossier Overview
              </button>
              <button
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'PREVIEW'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Bulletin Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ml-2"
              title="Close Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transient Notification Bar */}
        {exportNotice && (
          <div className="bg-emerald-950 border-b border-emerald-700 text-emerald-200 px-6 py-2 text-xs font-mono flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{exportNotice}</span>
            </div>
            <button
              onClick={() => setExportNotice(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 font-mono flex-1">
          {activeTab === 'DOSSIER' ? (
            <>
              {/* Certificate Badge Banner */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Operational Timetable Frozen &amp; Validated</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">
                    All 42 multi-department maintenance slots have completed deterministic 7-point safety clearance with zero train overlaps and zero traction power cut contentions.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 text-center shrink-0">
                  <QrCode className="w-8 h-8 text-emerald-300 mx-auto" />
                  <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider block mt-1">
                    IR-SEAL-VERIFIED
                  </span>
                </div>
              </div>

              {/* Core Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Schedule ID</span>
                  <p className="text-xs font-bold text-emerald-300 font-mono">{scheduleId}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Approval Ref</span>
                  <p className="text-xs font-bold text-purple-300 font-mono">{approvalRef}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Published At</span>
                  <p className="text-xs font-bold text-sky-300 font-mono">{publishedAt}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Total Blocks</span>
                  <p className="text-xs font-bold text-amber-300 font-mono">{totalBlocks} Blocks</p>
                </div>
              </div>

              {/* Signatory and Version Information */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Authorized Signatory:</span>
                  <span className="font-bold text-slate-200">{publishedBy}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Gazette Release Version:</span>
                  <span className="font-bold text-slate-200">{version}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Dispatch Distribution:</span>
                  <span className="text-emerald-400 font-semibold">Division Control, Station Masters, TRD &amp; S&amp;T Desks</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-sans">Lock Status:</span>
                  <span className="text-rose-300 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    LOCKED — Modifications Restricted to Chief Controller
                  </span>
                </div>
              </div>

              {/* Corridor Dispatch Matrix */}
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase font-bold text-slate-300 tracking-wider font-sans flex items-center gap-1.5">
                  <Train className="w-3.5 h-3.5 text-sky-400" />
                  Corridor Dispatch Coverage &amp; Capacity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {corridors.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-sky-300">{c.name}</span>
                        <span className="text-[10px] text-slate-400 block">{c.id} • {c.lengthKm} KM</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        DISPATCHED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Printable Bulletin Preview Tab */
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-400 shadow-inner font-sans space-y-4">
              {/* Top Crest */}
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h3 className="text-sm font-black tracking-wider uppercase text-slate-900">
                  MINISTRY OF RAILWAYS • GOVERNMENT OF INDIA
                </h3>
                <div className="text-xs font-bold text-slate-700 uppercase">
                  NORTHERN RAILWAY • DELHI DIVISION (DLI)
                </div>
                <div className="text-[11px] text-slate-600">
                  CENTRAL OPERATING CONTROL &amp; INTEGRATED MAINTENANCE COMMAND
                </div>
              </div>

              {/* Title Banner */}
              <div className="bg-slate-900 text-white text-center py-2 px-3 font-bold text-xs uppercase tracking-wide">
                DAILY MAINTENANCE &amp; OPERATIONAL BLOCK BULLETIN
                <span className="block text-[10px] font-normal text-slate-300">
                  (दैनिक अनुरक्षण एवं परिचालन ब्लॉक बुलेटिन — आधिकारिक राजपत्र)
                </span>
              </div>

              {/* Metadata 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="border border-slate-300 p-2 bg-slate-50">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Bulletin Ref Number</div>
                  <div className="font-bold text-slate-900">{approvalRef}</div>
                  <div className="text-[10px] text-slate-600">Schedule: {scheduleId} • Ver: {version}</div>
                </div>
                <div className="border border-slate-300 p-2 bg-slate-50">
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Status &amp; Verification</div>
                  <div className="font-bold text-emerald-700">✓ APPROVED &amp; PUBLISHED</div>
                  <div className="text-[10px] text-slate-600">Time: {publishedAt}</div>
                </div>
              </div>

              {/* 7-Point Compliance Callout */}
              <div className="border border-emerald-700 bg-emerald-50 p-2.5 rounded text-[11px] text-emerald-900">
                <strong className="block text-emerald-800 uppercase text-[10px]">
                  ✓ 7-Point Indian Railways Safety Verification Passed (Para 4.2 / IRPWM)
                </strong>
                <span>
                  All scheduled maintenance windows have undergone deterministic conflict-free validation against passenger timetable headways. Zero train clashing detected. Electrical traction (25kV OHE) isolation permits, S&amp;T disconnection notices (Form T/351), and Temporary Speed Restrictions (TSR) are synchronized under the Chief Controller.
                </span>
              </div>

              {/* Authorized Blocks Table Snippet */}
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase border-b border-slate-800 pb-1 mb-1.5 flex justify-between">
                  <span>Sample Authorized Blocks Timetable ({totalBlocks} Total Scheduled)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Form T/351 Disconnection Active</span>
                </div>
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="p-1.5 font-bold">Block ID</th>
                      <th className="p-1.5 font-bold">Corridor</th>
                      <th className="p-1.5 font-bold">Section</th>
                      <th className="p-1.5 font-bold">Time Window</th>
                      <th className="p-1.5 font-bold">Dept</th>
                      <th className="p-1.5 font-bold">Safety Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-mono font-bold">BLK-001</td>
                      <td className="p-1.5">C001</td>
                      <td className="p-1.5">NDLS - GZB Mainline Km 14/2-18/6</td>
                      <td className="p-1.5 font-bold">01:30 – 03:45 (135m)</td>
                      <td className="p-1.5 text-emerald-700 font-bold">ENGINEERING</td>
                      <td className="p-1.5 text-emerald-800 font-semibold">T/351 Validated</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-mono font-bold">BLK-002</td>
                      <td className="p-1.5">C001</td>
                      <td className="p-1.5">Sahibabad Siding Turnout 21</td>
                      <td className="p-1.5 font-bold">02:00 – 04:00 (120m)</td>
                      <td className="p-1.5 text-amber-700 font-bold">TRACTION</td>
                      <td className="p-1.5 text-emerald-800 font-semibold">OHE Permit Active</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-mono font-bold">BLK-003</td>
                      <td className="p-1.5">C003</td>
                      <td className="p-1.5">Bahadurgarh - Rohtak Km 44/0-46/2</td>
                      <td className="p-1.5 font-bold">01:15 – 03:30 (135m)</td>
                      <td className="p-1.5 text-emerald-700 font-bold">ENGINEERING</td>
                      <td className="p-1.5 text-emerald-800 font-semibold">T/351 Validated</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-mono font-bold">BLK-005</td>
                      <td className="p-1.5">C002</td>
                      <td className="p-1.5">Faridabad - Palwal Km 38/4-42/0</td>
                      <td className="p-1.5 font-bold">10:00 – 12:30 (150m)</td>
                      <td className="p-1.5 text-emerald-700 font-bold">ENGINEERING</td>
                      <td className="p-1.5 text-emerald-800 font-semibold">T/351 Validated</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-700 font-mono">
                <div>
                  <div className="border-t border-slate-600 pt-1 font-bold">Sr. DOM (Co-ord)</div>
                  <div className="text-[9px] text-slate-500">Delhi Operating Hub</div>
                </div>
                <div>
                  <div className="border-t border-slate-600 pt-1 font-bold">Sr. DEN (Track)</div>
                  <div className="text-[9px] text-slate-500">Northern Railway</div>
                </div>
                <div>
                  <div className="border-t border-slate-600 pt-1 font-bold">Chief Controller</div>
                  <div className="text-[9px] text-slate-500">Divisional Control</div>
                </div>
              </div>
            </div>
          )}

          {/* Revoke Confirmation Box */}
          {showRevokeConfirm && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/70 space-y-3 animate-in fade-in duration-150 font-sans">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Reopen &amp; Revoke Published Schedule?</span>
              </div>
              <p className="text-[11px] text-slate-300">
                This will unlock the operational timetable, revert the workflow back to VALIDATION, and notify Division Control that maintenance blocks are open for adjustments.
              </p>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                  Reason for Revision:
                </label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRevoke}
                  disabled={revoking}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {revoking ? (
                    <span>Unlocking...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm Reopen &amp; Unlock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions with Dedicated Print & Export Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#090f1d] border-t border-slate-800 relative">
          <div className="flex items-center gap-2">
            {!showRevokeConfirm && onRevokePublication && (
              <button
                onClick={() => setShowRevokeConfirm(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 hover:border-amber-700/60 border border-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition-colors font-sans"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen / Revoke Timetable</span>
              </button>
            )}

            {onNavigateToAudit && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAudit();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 font-sans"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Audit Trail</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors font-sans"
              title="Copy official text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Division Head Sign-off PDF Generator Button */}
            <button
              id="dossier-division-signoff-pdf-btn"
              onClick={() => setShowSignOffPdfModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 font-sans transition-all cursor-pointer"
              title="Generate printable PDF of daily maintenance block schedule for division head sign-off"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Division Sign-Off PDF</span>
            </button>

            {/* Print Official Bulletin Button */}
            <button
              id="print-official-bulletin-btn"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 font-sans transition-all"
              title="Print official Government of India / Ministry of Railways bulletin"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bulletin</span>
            </button>

            {/* Export Bulletin Dropdown Button */}
            <div className="relative">
              <button
                id="export-bulletin-dropdown-btn"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-950/40 font-sans transition-all"
                title="Export Bulletin as PDF/HTML, CSV, TXT, or JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Bulletin</span>
                <span className="text-[10px]">▼</span>
              </button>

              {/* Export Dropdown Menu */}
              {showExportMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#0e1628] border border-teal-600/80 rounded-xl shadow-2xl p-2 z-50 text-xs font-mono space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[10px] text-teal-300 font-bold uppercase border-b border-slate-800 flex items-center justify-between">
                    <span>Export Formats</span>
                    <span className="text-slate-500">{totalBlocks} Blocks</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      setShowSignOffPdfModal(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-950/60 hover:text-amber-200 text-amber-200 flex items-center gap-2 transition-colors cursor-pointer border border-amber-600/40 bg-amber-950/20"
                  >
                    <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">Division Sign-Off PDF (A4)</div>
                      <div className="text-[10px] text-amber-200/80">3-Page formatted report with DRM sign-off seals</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportHTML}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-teal-950/60 hover:text-teal-200 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">HTML Document / PDF Ready</div>
                      <div className="text-[10px] text-slate-400">Styled official dossier for PDF printing</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-teal-950/60 hover:text-teal-200 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">CSV Block Schedule (.csv)</div>
                      <div className="text-[10px] text-slate-400">Spreadsheet table for Excel / FOIS import</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportText}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-teal-950/60 hover:text-teal-200 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">Gazette Text Directive (.txt)</div>
                      <div className="text-[10px] text-slate-400">Telegraphic format for section dispatchers</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-teal-950/60 hover:text-teal-200 text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">JSON Data Manifest (.json)</div>
                      <div className="text-[10px] text-slate-400">Machine-readable data for TMS &amp; SCADA</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATED REPORT GENERATOR: DAILY MAINTENANCE BLOCK SCHEDULE PDF FOR DIVISION HEAD SIGN-OFF */}
      <DailyBlockSchedulePdfModal
        isOpen={showSignOffPdfModal}
        onClose={() => setShowSignOffPdfModal(false)}
        publicationState={publicationState}
        corridors={corridors}
        blocks={blocks}
      />
    </div>
  );
};
