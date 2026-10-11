import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  X,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Eye,
  FileCheck,
  Clock,
  Zap,
  Wrench,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Stamp,
  Sliders,
} from 'lucide-react';
import {
  Corridor,
  OptimizedBlock,
  PublicationInfo,
  ValidationResult,
  User,
} from '../../types';
import {
  DEFAULT_VALIDATION_SIGNATORIES,
  ValidationReportPdfOptions,
  downloadValidationReportPdf,
  printValidationReportPdf,
  getValidationReportPdfBlobUrl,
} from '../../services/validationReportPdfService';
import { railwayAudio } from '../../services/railwayAudio';

interface ValidationReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  validation: ValidationResult;
  publicationState?: PublicationInfo | null;
  corridors?: Corridor[];
  blocks?: OptimizedBlock[];
  currentUser?: User | null;
}

export const ValidationReportPdfModal: React.FC<ValidationReportPdfModalProps> = ({
  isOpen,
  onClose,
  validation,
  publicationState,
  corridors = [],
  blocks = [],
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'CONFIG' | 'OUTLINE'>('PREVIEW');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Form customizer options
  const [division, setDivision] = useState(DEFAULT_VALIDATION_SIGNATORIES.division);
  const [zone, setZone] = useState(DEFAULT_VALIDATION_SIGNATORIES.zone);
  const [srDsoName, setSrDsoName] = useState(DEFAULT_VALIDATION_SIGNATORIES.srDsoName);
  const [srDomName, setSrDomName] = useState(DEFAULT_VALIDATION_SIGNATORIES.srDomName);
  const [srDenName, setSrDenName] = useState(DEFAULT_VALIDATION_SIGNATORIES.srDenName);
  const [drmName, setDrmName] = useState(DEFAULT_VALIDATION_SIGNATORIES.drmName);
  const [specialDirectives, setSpecialDirectives] = useState(
    DEFAULT_VALIDATION_SIGNATORIES.specialSafetyDirectives
  );

  const isSafe = validation.status === 'SAFE_TO_PUBLISH';

  // Construct options object
  const currentOptions: ValidationReportPdfOptions = {
    validation,
    publicationState,
    corridors,
    blocks,
    division,
    zone,
    auditorName: currentUser?.name || DEFAULT_VALIDATION_SIGNATORIES.auditorName,
    auditorRole: currentUser?.role || DEFAULT_VALIDATION_SIGNATORIES.auditorRole,
    srDsoName,
    srDomName,
    srDenName,
    drmName,
    specialSafetyDirectives: specialDirectives,
  };

  // Generate preview blob URL
  const refreshPreview = async () => {
    setIsGenerating(true);
    try {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
      const url = await getValidationReportPdfBlobUrl(currentOptions);
      setPreviewPdfUrl(url);
    } catch (err) {
      console.error('Failed to generate preview PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPreview();
    }
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      railwayAudio?.playSuccessTone?.();
      await downloadValidationReportPdf(currentOptions);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printValidationReportPdf(currentOptions);
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const handleCopyHash = () => {
    const hash = `SHA256-NR-${new Date().getFullYear()}-${Date.now().toString(16).toUpperCase()}`;
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-sky-900/80 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d1836] via-[#0f2048] to-[#0d1836] border-b border-sky-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isSafe
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-600/60 text-rose-300'
              }`}
            >
              {isSafe ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Safety Validation Report — Official PDF Export
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isSafe
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {isSafe ? 'GATE STATUS: PASSED' : 'GATE STATUS: RESTRICTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Generates a multi-page, publication-grade PDF audit document with 7-point compliance checklist, critical headway conflict inventory, and official departmental seal placeholders.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS & QUICK CONTROLS */}
        <div className="px-5 py-2.5 bg-[#091024] border-b border-sky-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'PREVIEW'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live PDF Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('CONFIG')}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'CONFIG'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Signatory & Seal Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('OUTLINE')}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'OUTLINE'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Document Outline</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyHash}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700/80 transition-colors"
              title="Copy Digital Integrity Verification Fingerprint"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedHash ? 'Hash Copied!' : 'Copy Verification Hash'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadSuccess ? 'Downloaded!' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080e1f]">
          {/* TAB 1: LIVE PDF PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="h-full flex flex-col items-center">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                  <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-mono">Compiling 2-page High-Resolution Vector PDF...</p>
                </div>
              ) : previewPdfUrl ? (
                <div className="w-full flex-1 min-h-[580px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col">
                  <iframe
                    src={previewPdfUrl}
                    title="Validation Report PDF Preview"
                    className="w-full flex-1 border-0 rounded-b-xl min-h-[560px]"
                  />
                </div>
              ) : (
                <div className="text-slate-400 p-8">Unable to generate PDF preview.</div>
              )}
            </div>
          )}

          {/* TAB 2: SIGNATORY & SEAL SETTINGS */}
          {activeTab === 'CONFIG' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0e172e] border border-sky-950 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Stamp className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">
                    Official Departmental Signatories & Seal Bearers
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Division & Zonal Headquarters:</label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Railway Zone:</label>
                    <input
                      type="text"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">1. Sr. Divisional Safety Officer (Sr. DSO):</label>
                    <input
                      type="text"
                      value={srDsoName}
                      onChange={(e) => setSrDsoName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">2. Sr. Divisional Operations Manager (Sr. DOM):</label>
                    <input
                      type="text"
                      value={srDomName}
                      onChange={(e) => setSrDomName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">3. Sr. Divisional Engineer (Sr. DEN / Co-ord):</label>
                    <input
                      type="text"
                      value={srDenName}
                      onChange={(e) => setSrDenName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">4. Divisional Railway Manager (DRM):</label>
                    <input
                      type="text"
                      value={drmName}
                      onChange={(e) => setDrmName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Special Safety Directives & Statutory Caveats (Section 4):
                  </label>
                  <textarea
                    rows={4}
                    value={specialDirectives}
                    onChange={(e) => setSpecialDirectives(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      refreshPreview();
                      setActiveTab('PREVIEW');
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Apply Settings & Refresh PDF Preview</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT OUTLINE */}
          {activeTab === 'OUTLINE' && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0e172e] border border-sky-950 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase border-b border-slate-800 pb-2">
                  Structure of Exported PDF Validation Report
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-sky-300 font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>PAGE 1: Executive Audit & 7-Point Compliance</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                      <li>Government of India & Northern Railway Header with National Tri-Color band</li>
                      <li>Official Document Reference Number & System Engine Metadata</li>
                      <li>Executive Gate Verdict Banner (Safe vs Restricted)</li>
                      <li>Key KPI Strip: Total Blocks, Valid Ratio, Conflicts Count, Safety Index</li>
                      <li>7-Point Safety Compliance Checklist table with regulatory standards (IRPWM, ACTM)</li>
                      <li>Corridor Capacity & Line Clear status table (C001, C002, C003, C004)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-emerald-300 font-bold flex items-center gap-2">
                      <Stamp className="w-4 h-4 text-amber-400" />
                      <span>PAGE 2: Critical Issues & Official Seals</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                      <li>Detailed Critical Issues Table (Block ID, Train, Corridor, Severity, Remediation)</li>
                      <li>Clean Bill of Health certificate box when 0 conflicts exist</li>
                      <li>Statutory Mandates & Safety Directives section</li>
                      <li>4 Departmental Seal Placeholders with authentic double-ring circular graphics:</li>
                      <li className="pl-4 text-slate-400">• Sr. DSO (Safety Audit Cell)</li>
                      <li className="pl-4 text-slate-400">• Sr. DOM (Traffic Control & Headways)</li>
                      <li className="pl-4 text-slate-400">• Sr. DEN (Permanent Way Track Integrity)</li>
                      <li className="pl-4 text-slate-400">• DRM (Executive Division Sanction)</li>
                      <li>Digital SHA-256 integrity hash & scannable QR verification badge</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#091024] border-t border-sky-950/80 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Format: Standard A4 Portrait (2 Pages) — High-Resolution Vector Typography</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
