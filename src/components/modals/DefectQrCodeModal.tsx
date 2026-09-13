import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HardHat,
  PhoneCall,
  MapPin,
  Camera,
  Sparkles,
  CheckCircle2,
  X,
  Radio,
  FileText,
  Clock,
  UserCheck,
  Layers,
} from 'lucide-react';
import { Defect, PriorityLevel } from '../../types';
import {
  generateDefectQrDataUrl,
  getDefectInspectionUrl,
  getDepartmentSafetyProtocols,
  DefectSafetyProtocol,
} from '../../services/defectQrCodeService';
import { railwayAudio } from '../../services/railwayAudio';

interface DefectQrCodeModalProps {
  defect: Defect | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDefectStatus?: (defectId: string, newStatus: Defect['status']) => void;
}

export const DefectQrCodeModal: React.FC<DefectQrCodeModalProps> = ({
  defect,
  isOpen,
  onClose,
  onUpdateDefectStatus,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SAFETY' | 'DETAILS'>('SAFETY');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const [checkedPpe, setCheckedPpe] = useState<Record<string, boolean>>({});
  const [currentStatus, setCurrentStatus] = useState<Defect['status']>(defect?.status || 'ANALYZED');
  const placardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defect) {
      setCurrentStatus(defect.status);
      generateDefectQrDataUrl(defect.defectId)
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [defect]);

  if (!isOpen || !defect) return null;

  const safetyProtocols: DefectSafetyProtocol = getDepartmentSafetyProtocols(defect);
  const inspectionUrl = getDefectInspectionUrl(defect.defectId);

  const handleCopyUrl = () => {
    railwayAudio.playBeep(650, 0.03);
    navigator.clipboard.writeText(inspectionUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    railwayAudio.playBeep(880, 0.05);
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Placard_${defect.defectId}_${defect.assetId}.png`;
    a.click();
  };

  const handlePrintPlacard = () => {
    railwayAudio.playBeep(750, 0.05);
    const printWindow = window.open('', '_blank', 'width=750,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Asset QR Placard - ${defect.defectId}</title>
  <style>
    @page { size: portrait; margin: 15mm; }
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; color: #0f172a; text-align: center; }
    .placard { border: 4px solid #0f172a; border-radius: 12px; padding: 25px; max-width: 480px; margin: 0 auto; background: #ffffff; }
    .railway-header { font-size: 11pt; font-weight: 800; letter-spacing: 1px; color: #0f172a; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-bottom: 15px; }
    .qr-img { width: 220px; height: 220px; margin: 10px auto; display: block; }
    .asset-title { font-size: 18pt; font-weight: 900; font-family: monospace; color: #0f172a; }
    .defect-id { font-size: 14pt; font-weight: 800; color: #dc2626; font-family: monospace; margin-top: 4px; }
    .chainage { font-size: 12pt; font-weight: 700; color: #475569; margin-top: 6px; }
    .caution { background: #fef2f2; border: 2px dashed #dc2626; color: #b91c1c; font-weight: 800; padding: 8px; border-radius: 6px; margin: 15px 0 10px; font-size: 10pt; }
    .footer-note { font-size: 8.5pt; color: #64748b; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="placard">
    <div class="railway-header">INDIAN RAILWAYS &bull; ASSET INSPECTION &amp; SAFETY TAG</div>
    <div class="asset-title">${defect.assetId}</div>
    <div class="defect-id">${defect.defectId}</div>
    <div class="chainage">${defect.geoCoordinates?.railwayChainageKm || defect.corridorId}</div>
    <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
    <div class="caution">CAUTION: ${defect.severity} DEFECT &bull; ${defect.speedRestrictionKmph ? `${defect.speedRestrictionKmph} km/h RESTRICTION` : 'SAFETY PROTOCOL MANDATORY'}</div>
    <p style="font-size: 9pt; font-weight: 600; color: #334155; margin: 5px 0;">SCAN WITH MOBILE CAMERA TO ACCESS REAL-TIME SAFETY PROTOCOLS &amp; INSPECTION DOSSIER</p>
    <div class="footer-note">Northern Railway &bull; Integrated Track Maintenance System (ITMS)</div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  const handleAcknowledge = () => {
    railwayAudio.playBeep(920, 0.08);
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAcknowledged(timeStr);
  };

  const handleStatusChange = (newStatus: Defect['status']) => {
    setCurrentStatus(newStatus);
    railwayAudio.playBeep(700, 0.04);
    if (onUpdateDefectStatus) {
      onUpdateDefectStatus(defect.defectId, newStatus);
    }
  };

  const togglePpe = (item: string) => {
    setCheckedPpe((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  return (
    <div
      id="defect-qr-code-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-blue-800/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-blue-900/60 bg-[#070e1e] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  Defect Field QR Placard & Safety Protocols
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    defect.severity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                      : defect.severity === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-sky-950 text-sky-300 border-sky-700'
                  }`}
                >
                  {defect.severity} PRIORITY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Asset: <strong className="text-sky-300">{defect.assetId}</strong> | Defect:{' '}
                <strong className="text-slate-200">{defect.defectId}</strong> |{' '}
                {defect.geoCoordinates?.railwayChainageKm || defect.corridorId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-close-qr-modal"
              onClick={() => {
                railwayAudio.playBeep(440, 0.03);
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#070d1d]">
          {/* Left Column: Physical Asset QR Placard & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* The Placard Card */}
            <div
              ref={placardRef}
              className="bg-white text-slate-900 rounded-xl p-4 sm:p-5 shadow-2xl border-4 border-slate-900 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Top Placard Label */}
              <div className="w-full pb-2 border-b-2 border-amber-500 mb-3 flex items-center justify-between">
                <span className="text-[9px] font-black tracking-wider uppercase font-mono text-slate-800">
                  INDIAN RAILWAYS &bull; ITMS
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono">
                  {defect.department}
                </span>
              </div>

              {/* Asset & Defect Headers */}
              <div className="font-mono font-black text-xl text-slate-950 tracking-tight">{defect.assetId}</div>
              <div className="font-mono font-bold text-sm text-rose-600 tracking-wide">{defect.defectId}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                {defect.geoCoordinates?.railwayChainageKm || defect.corridorId}
              </div>

              {/* QR Code Graphic */}
              <div className="my-3 p-2 bg-white rounded-lg border-2 border-slate-900 shadow-inner flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${defect.defectId}`}
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 font-mono text-xs">
                    Generating QR Code...
                  </div>
                )}
              </div>

              {/* Dynamic Caution Banner */}
              <div
                className={`w-full py-1.5 px-2 rounded-md font-mono text-xs font-black uppercase tracking-wider mb-2 border ${
                  defect.severity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-900 border-rose-400'
                    : defect.severity === 'HIGH'
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : 'bg-sky-100 text-sky-900 border-sky-400'
                }`}
              >
                {defect.speedRestrictionKmph
                  ? `CAUTION: ${defect.speedRestrictionKmph} KM/H RESTRICTION`
                  : `PRIORITY: ${defect.severity} DEFECT`}
              </div>

              <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                Scan with smartphone camera to open full inspection dossier, AI structural analysis &amp; mandatory safety protocols.
              </p>

              {/* Bottom Simulated Screw Mounts */}
              <div className="w-full mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>PLT-TAG #{defect.defectId.slice(-4)}</span>
                <span>SEC-{defect.corridorId}</span>
              </div>
            </div>

            {/* Placard Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-download-qr-image"
                onClick={handleDownloadQr}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Download QR code image as PNG"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                id="btn-print-qr-placard"
                onClick={handlePrintPlacard}
                className="px-3 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Print official asset tag placard"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Placard</span>
              </button>
            </div>

            {/* Direct Link / Copy Box */}
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Field Direct Link</span>
                </span>
                <button
                  type="button"
                  id="btn-copy-field-url"
                  onClick={handleCopyUrl}
                  className="text-sky-400 hover:text-sky-300 underline flex items-center gap-1 cursor-pointer font-mono"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 truncate select-all">
                {inspectionUrl}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Dossier & Safety Protocols (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="tab-safety-protocols"
                  onClick={() => {
                    setActiveTab('SAFETY');
                    railwayAudio.playBeep(650, 0.03);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'SAFETY'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HardHat className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mandatory Safety Protocols</span>
                </button>

                <button
                  type="button"
                  id="tab-inspection-details"
                  onClick={() => {
                    setActiveTab('DETAILS');
                    railwayAudio.playBeep(650, 0.03);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'DETAILS'
                      ? 'bg-sky-950 text-sky-300 border border-sky-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Inspection & Risk Dossier</span>
                </button>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Status:</span>
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as Defect['status'])}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                >
                  <option value="PENDING_PRIORITY_ANALYSIS">PENDING PRIORITY</option>
                  <option value="ANALYZED">ANALYZED</option>
                  <option value="SCHEDULED">SCHEDULED FOR REPAIR</option>
                  <option value="RECTIFIED">RECTIFIED & VERIFIED</option>
                </select>
              </div>
            </div>

            {/* TAB CONTENT: SAFETY PROTOCOLS */}
            {activeTab === 'SAFETY' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Protocol Header Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-[#181126] to-slate-950 border border-rose-900/60 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <h4 className="text-xs font-bold text-white font-mono uppercase">{safetyProtocols.title}</h4>
                  </div>
                  <p className="text-[11px] text-rose-300 font-mono">{safetyProtocols.irManualReference}</p>
                </div>

                {/* Critical Warning Notice */}
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/80 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 leading-relaxed font-mono text-[11px]">
                    <strong>STATUTORY WARNING:</strong> {safetyProtocols.warningNotice}
                  </div>
                </div>

                {/* Mandatory PPE Checklist */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5 uppercase">
                      <HardHat className="w-3.5 h-3.5 text-amber-400" />
                      <span>Required Personal Protective Equipment (PPE)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Check before entering cess / track</span>
                  </div>

                  <div className="space-y-1.5">
                    {safetyProtocols.mandatoryPpe.map((ppe, i) => (
                      <label
                        key={`ppe-${i}`}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                          checkedPpe[ppe]
                            ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!checkedPpe[ppe]}
                          onChange={() => togglePpe(ppe)}
                          className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="flex-1">{ppe}</span>
                        {checkedPpe[ppe] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sequential Field Execution Steps */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-200 font-mono uppercase block">
                    Sequential Protection & Repair Directives
                  </span>
                  {safetyProtocols.mandatorySteps.map((step) => (
                    <div
                      key={`step-${step.stepNumber}`}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-[10px] font-mono font-bold flex items-center justify-center text-slate-200">
                          {step.stepNumber}
                        </span>
                        <h5 className="text-xs font-bold text-slate-200 font-mono">{step.action}</h5>
                        {step.criticalRule && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 font-mono ml-auto">
                            CRITICAL RULE
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-slate-400 pl-7 leading-relaxed">{step.protocolDetail}</p>
                    </div>
                  ))}
                </div>

                {/* Emergency Contact Channels */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5 uppercase">
                    <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
                    <span>Emergency Railway Communication Channels</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {safetyProtocols.emergencyContacts.map((c, i) => (
                      <div key={`contact-${i}`} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono block">{c.role}</span>
                        <strong className="text-sky-300 font-mono text-[11px] block mt-0.5">{c.contactChannel}</strong>
                        <span className="text-[9px] text-slate-500 font-mono block">{c.authority}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* On-Site Crew Acknowledgement Banner */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {acknowledged ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Field Crew Protocol Acknowledged at {acknowledged}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        Field staff must confirm on-site protocol compliance.
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    id="btn-acknowledge-safety"
                    onClick={handleAcknowledge}
                    disabled={!!acknowledged}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 disabled:opacity-60 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{acknowledged ? 'Acknowledged On-Site' : 'Acknowledge Protocols On-Site'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INSPECTION DETAILS */}
            {activeTab === 'DETAILS' && (
              <div className="space-y-3.5 animate-in fade-in duration-150 text-xs">
                {/* Defect Overview Grid */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Asset ID</span>
                    <strong className="text-white font-mono text-sm">{defect.assetId}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Department</span>
                    <span className="text-slate-200 font-mono">{defect.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Detected Date</span>
                    <span className="text-slate-200 font-mono">{defect.detectedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Reported By</span>
                    <span className="text-sky-300 font-mono">{defect.reportedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Speed Restriction</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {defect.speedRestrictionKmph ? `${defect.speedRestrictionKmph} km/h Caution` : 'Normal Speed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Current Status</span>
                    <span className="text-emerald-400 font-mono font-bold">{currentStatus}</span>
                  </div>
                </div>

                {/* Defect Type & Full Description */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Defect Type & Description</span>
                  <h4 className="font-bold text-slate-100 text-xs">{defect.defectType}</h4>
                  <p className="text-slate-300 text-[11.5px] leading-relaxed pt-1">{defect.description}</p>
                </div>

                {/* AI Visual Analysis & Structural Risk */}
                {defect.aiVisualAnalysis && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-indigo-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-200 font-mono flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AI Structural Risk Diagnostic</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/80 text-indigo-200 border border-indigo-600 font-mono">
                        {defect.aiVisualAnalysis.suggestedPriority} PRIORITY ({defect.aiVisualAnalysis.confidencePercent}% conf)
                      </span>
                    </div>

                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      <strong className="text-slate-100">Structural Risk: </strong>
                      {defect.aiVisualAnalysis.structuralRiskSummary}
                    </p>

                    <div className="p-2 rounded bg-slate-900/90 border border-indigo-900/50 text-[11px] text-emerald-400 font-mono">
                      <strong>Recommended Immediate Action: </strong>
                      {defect.aiVisualAnalysis.recommendedImmediateAction}
                    </div>

                    {defect.aiVisualAnalysis.detectedVisualPatterns && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {defect.aiVisualAnalysis.detectedVisualPatterns.map((pat, idx) => (
                          <span
                            key={`pattern-${idx}`}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800"
                          >
                            &bull; {pat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Geodetic Coordinates */}
                {defect.geoCoordinates && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">
                          Precise Geodetic Position & Chainage
                        </span>
                        <strong className="text-white font-mono text-xs">
                          {defect.geoCoordinates.latitude.toFixed(6)}° N, {defect.geoCoordinates.longitude.toFixed(6)}° E
                        </strong>
                        <span className="text-amber-300 font-mono text-xs ml-2">
                          ({defect.geoCoordinates.railwayChainageKm || 'Track Post'})
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      &plusmn;{Math.round(defect.geoCoordinates.accuracyMeters || 1.8)}m margin
                    </span>
                  </div>
                )}

                {/* Photographic Evidence Card */}
                {defect.photoAttachment && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5 uppercase">
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
                        <span>Photographic Evidence</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Captured: {defect.photoAttachment.capturedAt ? new Date(defect.photoAttachment.capturedAt).toLocaleString() : 'Field'}
                      </span>
                    </div>

                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-56">
                      <img
                        src={defect.photoAttachment.dataUrl}
                        alt={`Photo evidence for ${defect.defectId}`}
                        className="max-h-56 w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {defect.photoAttachment.caption && (
                      <p className="text-[11px] text-slate-400 font-mono italic">
                        &ldquo;{defect.photoAttachment.caption}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#070e1e] border-t border-blue-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400 font-mono text-[11px]">
              Active Asset Tag &bull; Scannable by any standard mobile camera or Lens
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-test-open-link"
              onClick={() => {
                railwayAudio.playBeep(800, 0.04);
                window.open(inspectionUrl, '_blank');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open direct inspection link in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Simulate Mobile Scan</span>
            </button>

            <button
              type="button"
              id="btn-close-bottom"
              onClick={() => {
                railwayAudio.playBeep(440, 0.03);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
