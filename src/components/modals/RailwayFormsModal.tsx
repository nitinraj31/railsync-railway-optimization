import React, { useState } from 'react';
import {
  FileText,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Send,
  Download,
  Languages,
  Train,
  ShieldCheck,
} from 'lucide-react';
import { Language } from '../../services/i18n';
import { railwayAudio } from '../../services/railwayAudio';

interface RailwayFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialForm?: 'T409' | 'T351';
  language: Language;
}

export const RailwayFormsModal: React.FC<RailwayFormsModalProps> = ({
  isOpen,
  onClose,
  initialForm = 'T409',
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'T409' | 'T351' | 'WHATSAPP_DISPATCH'>(initialForm);
  const [rtisPushed, setRtisPushed] = useState<boolean>(false);
  const [smsDispatched, setSmsDispatched] = useState<boolean>(false);
  const [t351Status, setT351Status] = useState<'DISCONNECTED' | 'RECONNECTED'>('DISCONNECTED');
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const [signedSuccessMessage, setSignedSuccessMessage] = useState<string | null>(null);

  // Auto-close modal countdown after signing and declaring track fit
  React.useEffect(() => {
    if (autoCloseCountdown === null) return;
    if (autoCloseCountdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => {
      setAutoCloseCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoCloseCountdown, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handlePushToRtis = () => {
    setRtisPushed(true);
    railwayAudio.playStationChime();
    setTimeout(() => setRtisPushed(false), 6000);
  };

  const handleSendSms = () => {
    setSmsDispatched(true);
    railwayAudio.playSuccessTone();
    setTimeout(() => setSmsDispatched(false), 6000);
  };

  const handleToggleT351 = () => {
    if (t351Status === 'DISCONNECTED') {
      setT351Status('RECONNECTED');
      railwayAudio.playSuccessTone();
      setSignedSuccessMessage(
        language === 'HI'
          ? 'पार्ट-II हस्ताक्षरित: पुनः संयोजन एवं ट्रैक फिट घोषित! स्टेशन मास्टर रिकॉर्ड अपडेटेड।'
          : 'Part-II Signed: Reconnection & Track Fit Declared! Station Master memo transmitted.'
      );
      // Automatically remove popup from main screen after declaring and signing
      setAutoCloseCountdown(2);
    } else {
      setT351Status('DISCONNECTED');
      setAutoCloseCountdown(null);
      setSignedSuccessMessage(null);
      railwayAudio.playStationChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-sky-500/60 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-600 text-sky-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {language === 'HI'
                    ? 'भारतीय रेल आधिकारिक प्रपत्र एवं कॉशन ऑर्डर'
                    : 'Indian Railways Official Digital Forms & Caution Orders'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  G&SR 4.09
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'HI'
                  ? 'सामान्य एवं सहायक नियमों के अंतर्गत डिजिटल रूप से मान्य सतर्कता आदेश एवं मेमो'
                  : 'Statutory railway safety memos prescribed under General and Subsidiary Rules'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print official document"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'HI' ? 'प्रिंट (Ctrl+P)' : 'Print Form'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('T409')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'T409'
                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Form T/409 (Caution Order / सतर्कता आदेश)</span>
          </button>

          <button
            onClick={() => setActiveTab('T351')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'T351'
                ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Form T/351 (Disconnection / डिस्कनेक्शन मेमो)</span>
          </button>

          <button
            onClick={() => setActiveTab('WHATSAPP_DISPATCH')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'WHATSAPP_DISPATCH'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Field Gang SMS/WhatsApp Dispatch</span>
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4">
          {/* TAB 1: FORM T/409 (CAUTION ORDER) */}
          {activeTab === 'T409' && (
            <div className="space-y-4">
              {/* Official IR Layout Box */}
              <div className="p-6 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-inner space-y-4">
                {/* Header */}
                <div className="text-center border-b border-slate-700 pb-3 space-y-1">
                  <div className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                    NORTHERN RAILWAY / उत्तर रेलवे (DELHI DIVISION / दिल्ली मंडल)
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">
                    FORM T/409 : CAUTION ORDER / सतर्कता आदेश
                  </div>
                  <div className="text-[11px] text-slate-400">
                    [Prescribed under G&SR 4.09 for Cautioning Loco Pilot & Train Manager of Maintenance Speed Restrictions]
                  </div>
                </div>

                {/* Meta details table */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">STATION FROM:</span>
                    <strong className="text-white">GHAZIABAD JN (GZB)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">STATION TO:</span>
                    <strong className="text-white">SAHIBABAD (SBB)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">LINE / DIRECTION:</span>
                    <strong className="text-amber-300">UP MAIN LINE</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">DATE & SERIAL:</span>
                    <strong className="text-sky-300">09-09-2026 / CO-841</strong>
                  </div>
                </div>

                {/* Caution order details */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 text-[11px] border-b border-slate-700">
                        <th className="p-2.5">BETWEEN KM</th>
                        <th className="p-2.5">SPEED RESTRICTION</th>
                        <th className="p-2.5">NATURE OF WORK</th>
                        <th className="p-2.5">OHE / TRACK STATUS</th>
                        <th className="p-2.5">WHISTLE CODE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      <tr className="bg-slate-900/40">
                        <td className="p-2.5 font-bold text-sky-300">KM 14/2 - KM 14/8</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                            30 KMPH
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200">
                          Turnout 14B High-Speed Switch Renewal & Track Stabilizer
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          OHE Charged, Track Fit with SR
                        </td>
                        <td className="p-2.5 text-amber-300">
                          Continuous Intermittent Whistling (W/L)
                        </td>
                      </tr>
                      <tr className="bg-slate-900/20">
                        <td className="p-2.5 font-bold text-sky-300">KM 28/4 - KM 34/2</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                            45 KMPH
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200">
                          Deep Screening of Ballast & USFD testing
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          Consolidation underway
                        </td>
                        <td className="p-2.5 text-amber-300">
                          Whistle freely approaching gang
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Endorsements */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-[11px]">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">ISSUED BY:</span>
                    <strong className="text-white">Station Master / GZB</strong>
                    <span className="text-slate-500 block text-[10px]">Digital Key: SM-GZB-4820</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">NOTED BY LOCO PILOT:</span>
                    <strong className="text-sky-300">P. K. Sharma (LP / Rajdhani 12423)</strong>
                    <span className="text-slate-500 block text-[10px]">RTIS Auto-Acknowledged 15:12 hrs</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">NOTED BY TRAIN MANAGER:</span>
                    <strong className="text-sky-300">R. C. Meena (Guard / HQ DLI)</strong>
                    <span className="text-slate-500 block text-[10px]">VHF Channel 1 Confirmed</span>
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-300 text-xs flex items-center gap-2">
                  <Train className="w-4 h-4 text-sky-400" />
                  <span>
                    {language === 'HI'
                      ? 'लोको पायलट के RTIS और SM कंसोल पर तत्काल इलेक्ट्रॉनिक प्रसारण:'
                      : 'Immediate electronic transmission to Loco Pilot RTIS & Station Master console:'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePushToRtis}
                    className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-sky-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{rtisPushed ? 'Transmitted to RTIS!' : 'Push Caution Order to Loco Pilot RTIS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORM T/351 (DISCONNECTION / RECONNECTION MEMO) */}
          {activeTab === 'T351' && (
            <div className="space-y-4">
              <div className="p-6 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-inner space-y-4">
                {/* Header */}
                <div className="text-center border-b border-slate-700 pb-3 space-y-1">
                  <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                    NORTHERN RAILWAY / उत्तर रेलवे
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">
                    FORM T/351 : DISCONNECTION & RECONNECTION NOTICE
                  </div>
                  <div className="text-[11px] text-slate-400">
                    [Prescribed under G&SR 3.51 for S&T, Electrical OHE Isolation & Civil Track Interlocking]
                  </div>
                </div>

                {/* Disconnection particulars */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">PART-I: DISCONNECTION NOTICE</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t351Status === 'DISCONNECTED'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      CURRENT STATUS: {t351Status}
                    </span>
                  </div>
                  <div className="text-slate-200">
                    To: <strong>Station Master / Ghaziabad</strong>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Please note that <strong>Point No. 14B & OHE Sub-Sector SP-GZB Up Line</strong> will be
                    disconnected from interlocking for maintenance from <strong>14:00 hrs</strong>. Signals
                    governing movement over this gear must be kept at 'ON'.
                  </p>
                  <div className="text-slate-400 text-[10px]">
                    Issued by: <strong>Er. Rajesh Verma (SSE / P-Way)</strong> & <strong>SSE (TRD)</strong> at 13:58 hrs.
                  </div>
                </div>

                {/* Reconnection particulars */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <span className="text-slate-400 block">PART-II: RECONNECTION & TRACK FIT CERTIFICATE</span>
                  <p className="text-slate-300 text-[11px]">
                    The above mentioned gear / track has been safely reconnected, tested with Point Machine, OHE
                    energized to 25kV, and is <strong>FIT FOR SAFE PASSAGE OF TRAINS</strong> with speed restriction
                    of 30 km/h.
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Joint Safety Sign-off:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SSE (P-Way) + SSE (TRD) + SSE (Signal) Signed</span>
                    </span>
                  </div>
                </div>

                {/* Auto-close notification banner after declaring and signing */}
                {signedSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-emerald-100">
                          {language === 'HI' ? 'हस्ताक्षर एवं घोषणा स्वीकृत' : 'Signed & Declared Track Fit'}
                        </strong>
                        <span className="text-[11px] text-emerald-300/90">{signedSuccessMessage}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-bold px-2 py-1 rounded bg-emerald-900 border border-emerald-600 text-emerald-200 animate-pulse">
                        {language === 'HI'
                          ? `स्वतः बंद हो रहा है: ${autoCloseCountdown}s`
                          : `Removing popup in ${autoCloseCountdown}s`}
                      </span>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 cursor-pointer"
                      >
                        {language === 'HI' ? 'अभी बंद करें' : 'Close Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* State Toggle Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleToggleT351}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md ${
                      t351Status === 'DISCONNECTED'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {t351Status === 'DISCONNECTED'
                        ? 'Sign Part-II: Reconnect & Declare Track Fit'
                        : `Part-II Signed & Declared (Removing in ${autoCloseCountdown || 1}s...)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIELD WHATSAPP / SMS DISPATCH */}
          {activeTab === 'WHATSAPP_DISPATCH' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Send className="w-4 h-4" />
                  <span>AUTOMATED CONTROL OFFICE & FIELD GANG TELEGRAM / SMS LOOP</span>
                </div>
                <p className="text-xs text-slate-300">
                  Transmits immediate field status to Section Controller, Divisional Operating Manager (Sr. DOM),
                  and Chief Controller WhatsApp group without manual phone dialing delays.
                </p>

                {/* Preview Message Box */}
                <div className="p-3 rounded-lg bg-black/60 border border-emerald-700/50 font-mono text-xs text-emerald-300 space-y-1">
                  <div className="text-[10px] text-slate-400 border-b border-white/10 pb-1 flex justify-between">
                    <span>TO: DLI-OPERATIONS-CONTROL-GROUP</span>
                    <span>AUTOMATIC TIMESTAMP: 15:28 HRS</span>
                  </div>
                  <p className="pt-1">
                    "SSE/P-Way GZB & SSE/TRD: Track Fit given for Up Line KM 14/2 Turnout 14B at 15:28 hrs.
                    Dynamic Stabilizer packing completed. T/351 reconnected. Caution Order 30 km/h enforced. Block
                    cleared for Down Rajdhani Express 12423."
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSendSms}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-950"
                  >
                    <Send className="w-4 h-4" />
                    <span>{smsDispatched ? 'Dispatched to All Channels!' : 'Dispatch Instant Field Status'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
