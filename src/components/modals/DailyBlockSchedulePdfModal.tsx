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
} from 'lucide-react';
import {
  Corridor,
  OptimizedBlock,
  PublicationInfo,
  ValidationResult,
  User,
} from '../../types';
import {
  DEFAULT_SIGN_OFF_OFFICERS,
  DailyBlockSchedulePdfOptions,
  downloadDailyBlockSchedulePdf,
  printDailyBlockSchedulePdf,
  getDailyBlockSchedulePdfBlobUrl,
} from '../../services/dailyBlockSchedulePdfService';

interface DailyBlockSchedulePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  validation?: ValidationResult | null;
  publicationState?: PublicationInfo | null;
  corridors?: Corridor[];
  blocks?: OptimizedBlock[];
  currentUser?: User | null;
}

export const DailyBlockSchedulePdfModal: React.FC<DailyBlockSchedulePdfModalProps> = ({
  isOpen,
  onClose,
  validation,
  publicationState,
  corridors = [],
  blocks = [],
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'OUTLINE' | 'PREVIEW'>('CONFIG');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form Fields
  const [division, setDivision] = useState(DEFAULT_SIGN_OFF_OFFICERS.division);
  const [zone, setZone] = useState(DEFAULT_SIGN_OFF_OFFICERS.zone);
  const [scheduleDate, setScheduleDate] = useState(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });
  const [gazetteRef, setGazetteRef] = useState(() => {
    const yr = new Date().getFullYear();
    const rnd = Math.floor(2000 + Math.random() * 8000);
    return publicationState?.approvalReference || `DRM/DLI/OPT/BLK/${yr}/${rnd}`;
  });

  const [drmName, setDrmName] = useState(DEFAULT_SIGN_OFF_OFFICERS.drmName);
  const [srDomName, setSrDomName] = useState(DEFAULT_SIGN_OFF_OFFICERS.srDomName);
  const [srDenName, setSrDenName] = useState(DEFAULT_SIGN_OFF_OFFICERS.srDenName);
  const [srDeeName, setSrDeeName] = useState(DEFAULT_SIGN_OFF_OFFICERS.srDeeName);
  const [srDsteName, setSrDsteName] = useState(DEFAULT_SIGN_OFF_OFFICERS.srDsteName);
  const [chiefPlannerName, setChiefPlannerName] = useState(
    currentUser?.name || DEFAULT_SIGN_OFF_OFFICERS.chiefPlannerName
  );
  const [specialDirectives, setSpecialDirectives] = useState(
    DEFAULT_SIGN_OFF_OFFICERS.specialDirectives
  );

  const isSafe = validation ? validation.status === 'SAFE_TO_PUBLISH' : true;
  const isPublished = publicationState?.currentState === 'PUBLISHED';
  const totalBlocksCount = blocks.length > 0 ? blocks.length : validation?.totalBlocks || 42;
  const totalDurationMinutes = blocks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  const totalHours = (totalDurationMinutes / 60).toFixed(1);

  const getPdfOptions = (): DailyBlockSchedulePdfOptions => ({
    validation,
    publicationState,
    corridors,
    blocks,
    division,
    zone,
    scheduleDate,
    drmName,
    srDomName,
    srDenName,
    srDeeName,
    srDsteName,
    chiefPlannerName,
    specialDirectives,
    gazetteRef,
  });

  // Generate in-memory preview URL when switching to PREVIEW tab
  useEffect(() => {
    let currentUrl: string | null = null;
    if (isOpen && activeTab === 'PREVIEW') {
      setIsGenerating(true);
      getPdfOptions();
      getDailyBlockSchedulePdfBlobUrl(getPdfOptions())
        .then((url) => {
          currentUrl = url;
          setPdfBlobUrl(url);
        })
        .catch((err) => console.error('Failed to generate PDF preview:', err))
        .finally(() => setIsGenerating(false));
    }

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [
    isOpen,
    activeTab,
    division,
    zone,
    scheduleDate,
    drmName,
    srDomName,
    srDenName,
    srDeeName,
    srDsteName,
    chiefPlannerName,
    specialDirectives,
    gazetteRef,
  ]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadDailyBlockSchedulePdf(getPdfOptions());
    } catch (err) {
      console.error('Download PDF failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printDailyBlockSchedulePdf(getPdfOptions());
    } catch (err) {
      console.error('Print PDF failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyVerificationToken = () => {
    const scheduleId = publicationState?.publishedScheduleId || 'SCH-IR-2026-8492';
    const token = `RAILSYNC-DRM-SIGNOFF-${scheduleId}-${Date.now().toString(36).toUpperCase()}`;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  return (
    <div
      id="daily-block-schedule-pdf-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[#0b1329] border border-sky-900/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200 font-sans">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-sky-900/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 shrink-0">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide uppercase">
                  Automated Daily Maintenance Block Report Generator
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/70 text-[10px] font-mono font-bold">
                  PDF FOR DIVISION HEAD SIGN-OFF
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Statutory report pulling real-time validation data, 7-point safety checklist, corridor allocation and DRM / branch officer sign-off matrix.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRIC RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono shrink-0">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Total Blocks</div>
              <div className="text-sm font-bold text-sky-200">
                {totalBlocksCount} Blocks ({totalHours}h)
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Validation Gate</div>
              <div className="text-sm font-bold text-emerald-300">
                {isPublished ? 'PUBLISHED & LOCKED' : isSafe ? 'SAFE (100% PASS)' : 'REQUIRES REVIEW'}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Sign-Off Officers</div>
              <div className="text-sm font-bold text-amber-200">DRM + 4 Branch Heads</div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">25kV OHE Permits</div>
              <div className="text-sm font-bold text-cyan-200">Synchronized & Cleared</div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs font-mono shrink-0">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-4 py-2 border-b-2 font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'CONFIG'
                ? 'border-sky-400 text-sky-200 bg-sky-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>1. Division Signatories & Parameters</span>
          </button>

          <button
            onClick={() => setActiveTab('OUTLINE')}
            className={`px-4 py-2 border-b-2 font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'OUTLINE'
                ? 'border-sky-400 text-sky-200 bg-sky-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Report Structure & 3-Page Outline</span>
          </button>

          <button
            onClick={() => setActiveTab('PREVIEW')}
            className={`px-4 py-2 border-b-2 font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'PREVIEW'
                ? 'border-sky-400 text-sky-200 bg-sky-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>3. Interactive PDF Preview</span>
            {isGenerating && <span className="animate-spin text-sky-400">⟳</span>}
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs font-mono space-y-4">
          {activeTab === 'CONFIG' && (
            <div className="space-y-4">
              {/* Presets and Division Info */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <span className="font-bold text-sky-300 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    Division & Gazette Metadata
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">Quick Presets:</span>
                    <button
                      onClick={() => {
                        setDivision('DELHI DIVISION (NR)');
                        setZone('NORTHERN RAILWAY');
                      }}
                      className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 hover:bg-sky-900"
                    >
                      Delhi (NR)
                    </button>
                    <button
                      onClick={() => {
                        setDivision('MUMBAI CENTRAL DIVISION (WR)');
                        setZone('WESTERN RAILWAY');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    >
                      Mumbai (WR)
                    </button>
                    <button
                      onClick={() => {
                        setDivision('HOWRAH DIVISION (ER)');
                        setZone('EASTERN RAILWAY');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    >
                      Howrah (ER)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Railway Zone
                    </label>
                    <input
                      type="text"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Operational Division
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Target Schedule Date
                    </label>
                    <input
                      type="text"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Gazette Sanction Reference No.
                    </label>
                    <input
                      type="text"
                      value={gazetteRef}
                      onChange={(e) => setGazetteRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Division Head Signatories Matrix */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="pb-2 border-b border-slate-800">
                  <span className="font-bold text-amber-300 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    Division Head Signatories (Official Names & Designations)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    These names will be printed on the official Page 3 approval matrix with signature lines, stamps, and date fields.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <label className="text-[10px] text-sky-400 uppercase font-bold block mb-1">
                      1. Divisional Railway Manager (DRM)
                    </label>
                    <input
                      type="text"
                      value={drmName}
                      onChange={(e) => setDrmName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      Grants final executive sanction under IR General Rules Chapter IV.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <label className="text-[10px] text-sky-400 uppercase font-bold block mb-1">
                      2. Sr. Divisional Operations Manager (Sr. DOM)
                    </label>
                    <input
                      type="text"
                      value={srDomName}
                      onChange={(e) => setSrDomName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      Certifies Line Clear corridors, timetable buffers & train regulation.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <label className="text-[10px] text-amber-400 uppercase font-bold block mb-1">
                      3. Sr. Divisional Engineer (Sr. DEN / Co-ordination)
                    </label>
                    <input
                      type="text"
                      value={srDenName}
                      onChange={(e) => setSrDenName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      Permanent Way track geometry, tamping speeds & safety clearance.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <label className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">
                      4. Sr. DEE (TRD) & Sr. DSTE (Traction & S&T)
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={srDeeName}
                        onChange={(e) => setSrDeeName(e.target.value)}
                        placeholder="Sr. DEE (TRD) Name"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                      />
                      <input
                        type="text"
                        value={srDsteName}
                        onChange={(e) => setSrDsteName(e.target.value)}
                        placeholder="Sr. DSTE Name"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Directives */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <label className="font-bold text-slate-200 text-xs block">
                  Special Operational Directives & Safety Pre-requisites (Printed on Page 3)
                </label>
                <textarea
                  rows={3}
                  value={specialDirectives}
                  onChange={(e) => setSpecialDirectives(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'OUTLINE' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-sky-300 uppercase tracking-wider">
                  Automated 3-Page Document Layout & Sign-Off Certification Summary
                </h3>

                {/* Page 1 Breakdown */}
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      PAGE 1: Official Gazette & Executive Safety Validation Certification
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Landscape A4
                    </span>
                  </div>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li>Ministry of Railways header, Zone, Division & Gazette reference number.</li>
                    <li>Official Memorandum for Division Head circulation & sign-off.</li>
                    <li>6-Key Metric Strip (Total blocks, Work hours, Department allocation).</li>
                    <li>
                      Validation Gate Verdict Box:{' '}
                      <strong className="text-emerald-400">
                        {isPublished ? 'SCHEDULE PUBLISHED' : isSafe ? 'SAFE TO PUBLISH (100% PASS)' : 'REQUIRES REVIEW'}
                      </strong>
                    </li>
                    <li>
                      Complete 7-Point Railway Safety Compliance Checklist Table (AutoTable) with
                      exact regulatory citations (Headway margin, 25kV OHE isolation, HOER limits,
                      point machine protection, emergency relief route, monsoon cushion).
                    </li>
                  </ul>
                </div>

                {/* Page 2 Breakdown */}
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">
                      PAGE 2: Corridor-by-Corridor Detailed Maintenance Block Schedule
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Landscape A4
                    </span>
                  </div>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li>
                      Complete tabular register of all {totalBlocksCount} maintenance blocks grouped
                      by corridor (C001 Northern Main Trunk, C002 Western DFC, C003 Freight, C004
                      Eastern Chord).
                    </li>
                    <li>
                      Block Reference, Corridor Name, Chainage KM, Start/End Time Window, Duration,
                      Department (P-Way, TRD, S&T), Priority & Assigned Gangs.
                    </li>
                    <li>
                      Traction line clear status (TSS Substation feeder isolation references) and
                      validation status.
                    </li>
                  </ul>
                </div>

                {/* Page 3 Breakdown */}
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">
                      PAGE 3: 25kV OHE Isolation, Special Directives & Formal Division Head Sign-Off Matrix
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Landscape A4
                    </span>
                  </div>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li>25kV OHE Traction Power Isolation table & earthing discharge rod permits.</li>
                    <li>Chief Controller Special Operational Directives and Speed Precautions.</li>
                    <li>
                      <strong>4 Formal Signatory Approval Boxes:</strong>
                      <ol className="list-decimal list-inside ml-4 mt-1 space-y-0.5 text-slate-300">
                        <li>
                          <strong>DRM</strong>: Final Sanction & Gazette Promulgation
                        </li>
                        <li>
                          <strong>Sr. DOM</strong>: Traffic Line Clear & Train Regulation
                        </li>
                        <li>
                          <strong>Sr. DEN (Co-ord)</strong>: Civil Track & P-Way Safety
                        </li>
                        <li>
                          <strong>Sr. DEE (TRD) & Sr. DSTE</strong>: 25kV Power Permit & Interlocking
                        </li>
                      </ol>
                    </li>
                    <li>
                      Digital Authorization Hash (SHA256) and QR Code for instant line-clear
                      verification by field Station Masters and PWIs.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PREVIEW' && (
            <div className="space-y-3">
              {isGenerating ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <Sparkles className="w-8 h-8 text-sky-400 animate-spin" />
                  <span className="text-sm font-bold text-slate-300">
                    Compiling 3-Page Formatted PDF for Division Head Sign-Off...
                  </span>
                </div>
              ) : pdfBlobUrl ? (
                <div className="rounded-xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
                  <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Live Formatted PDF Preview (Landscape 3 Pages)
                    </span>
                    <a
                      href={pdfBlobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Full Viewer</span>
                    </a>
                  </div>
                  <iframe
                    src={pdfBlobUrl}
                    title="Daily Maintenance Block Schedule PDF Preview"
                    className="w-full h-[520px] border-0"
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  Unable to load PDF preview. Click Download or Print below.
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Auth Ref: {gazetteRef.split('/').slice(-2).join('/')}</span>
            <span>•</span>
            <button
              onClick={handleCopyVerificationToken}
              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Token Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Verification Hash</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Direct Print Button */}
            <button
              id="print-daily-block-schedule-pdf-btn"
              onClick={handlePrint}
              disabled={isPrinting || isGenerating}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-600 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Send directly to browser print dialogue for physical signing"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isPrinting ? 'Preparing Print...' : 'Direct Print (Sign-Off)'}</span>
            </button>

            {/* Download Official PDF Button */}
            <button
              id="download-daily-block-schedule-pdf-btn"
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Download formatted 3-page PDF with official seal boxes"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download Printable PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
