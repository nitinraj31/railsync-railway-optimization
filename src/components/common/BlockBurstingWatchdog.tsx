import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Radio,
  PlusCircle,
  ExternalLink,
  Languages,
  X,
} from 'lucide-react';
import { railwayAudio } from '../../services/railwayAudio';
import { i18n, Language } from '../../services/i18n';

interface BlockBurstingWatchdogProps {
  onOpenFormsModal: (formType?: 'T409' | 'T351') => void;
  onOpenHotkeysModal: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const BlockBurstingWatchdog: React.FC<BlockBurstingWatchdogProps> = ({
  onOpenFormsModal,
  onOpenHotkeysModal,
  language,
  onToggleLanguage,
}) => {
  // Live countdown state (in seconds): start with 12m 45s (765 seconds) to demonstrate caution/bursting watchdog
  const [secondsRemaining, setSecondsRemaining] = useState<number>(765);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(railwayAudio.getIsMuted());
  const [burstingStatus, setBurstingStatus] = useState<'ON_SCHEDULE' | 'WARNING' | 'BURSTING_CRITICAL' | 'COMPLETED'>('WARNING');
  const [extensionCount, setExtensionCount] = useState<number>(0);
  const [showExtensionToast, setShowExtensionToast] = useState<boolean>(false);
  const [trackFitConfirmed, setTrackFitConfirmed] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [autoRemoveCountdown, setAutoRemoveCountdown] = useState<number | null>(null);

  // Active block details
  const activeBlock = {
    id: 'BLK-081',
    name: language === 'HI' ? 'टर्नआउट 14B स्विच नवीनीकरण एवं डायनामिक ट्रैक स्टेबलाइजर' : 'Turnout 14B Switch Renewal & Track Stabilizer',
    corridor: 'C001 (New Delhi - Kanpur High-Speed)',
    section: 'KM 14/2 Ghaziabad Yard Up Line',
    inCharge: 'Er. Rajesh Verma (SSE / P-Way)',
    department: 'JOINT (P-WAY + TRD 25kV)',
    trafficImpact: 'Down Rajdhani Express 12423 holding at Sahibabad outer signal',
  };

  // Timer loop
  useEffect(() => {
    if (!isTimerRunning || trackFitConfirmed) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setBurstingStatus('BURSTING_CRITICAL');
          if (!isMuted) railwayAudio.playBurstingHooter();
          return 0;
        }
        const next = prev - 1;
        if (next < 300) {
          setBurstingStatus('BURSTING_CRITICAL');
          // Beep occasionally when critical (every 60s)
          if (next % 60 === 0 && !isMuted) {
            railwayAudio.playBurstingHooter();
          }
        } else if (next < 900) {
          setBurstingStatus('WARNING');
        } else {
          setBurstingStatus('ON_SCHEDULE');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, trackFitConfirmed, isMuted]);

  // Handle countdown for automatically removing popup after declaring track fit
  useEffect(() => {
    if (autoRemoveCountdown === null) return;
    if (autoRemoveCountdown <= 0) {
      setIsDismissed(true);
      return;
    }
    const timer = setTimeout(() => {
      setAutoRemoveCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoRemoveCountdown]);

  const handleToggleMute = () => {
    const nextMute = railwayAudio.toggleMute();
    setIsMuted(nextMute);
  };

  const handleRequestExtension = () => {
    setSecondsRemaining((prev) => prev + 900); // +15 mins
    setExtensionCount((prev) => prev + 1);
    setBurstingStatus('ON_SCHEDULE');
    setShowExtensionToast(true);
    railwayAudio.playStationChime();
    setTimeout(() => setShowExtensionToast(false), 5000);
  };

  const handleDeclareTrackFit = () => {
    setTrackFitConfirmed(true);
    setIsTimerRunning(false);
    setBurstingStatus('COMPLETED');
    railwayAudio.playSuccessTone();
    // Automatically remove popup from main screen after declaring track fit
    setAutoRemoveCountdown(3);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If dismissed by user or auto-removed after declaring track fit, remove completely from main screen
  if (isDismissed) {
    return null;
  }

  const isUrgent = burstingStatus === 'BURSTING_CRITICAL' || secondsRemaining < 300;
  const isWarning = burstingStatus === 'WARNING' && !trackFitConfirmed;

  return (
    <aside
      aria-label="Railway Block Bursting Watchdog"
      className="fixed bottom-3 right-3 z-40 max-w-lg w-full px-2 pointer-events-none"
    >
      <div
        className={`pointer-events-auto rounded-xl border shadow-2xl transition-all duration-300 backdrop-blur-md overflow-hidden ${
          trackFitConfirmed
            ? 'bg-slate-900/95 border-emerald-500/80 text-emerald-100 shadow-emerald-950/60'
            : isUrgent
            ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/80 animate-pulse'
            : isWarning
            ? 'bg-amber-950/95 border-amber-500/90 text-amber-100 shadow-amber-950/60'
            : 'bg-slate-900/95 border-sky-600/70 text-slate-100 shadow-cyan-950/60'
        }`}
      >
        {/* TOP BAR / HEADER */}
        <div className="p-3 flex items-center justify-between gap-2 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
                trackFitConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isUrgent
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-bounce'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              {trackFitConfirmed ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isUrgent ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </span>

            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-white">
                  {trackFitConfirmed
                    ? language === 'HI'
                      ? 'ट्रैक फिट - क्लीयरेंस स्वीकृत'
                      : 'TRACK FIT & CLEARED'
                    : isUrgent
                    ? language === 'HI'
                      ? 'ब्लॉक बर्स्टिंग चेतावनी!'
                      : 'BLOCK BURSTING RISK!'
                    : language === 'HI'
                    ? 'सक्रिय मेंटेनेंस ब्लॉक मॉनिटर'
                    : 'ACTIVE BLOCK WATCHDOG'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-sky-300">
                  {activeBlock.id}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {activeBlock.section}
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Countdown Badge */}
            <div
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs tracking-wider border flex items-center gap-1 ${
                trackFitConfirmed
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : isUrgent
                  ? 'bg-rose-900 text-rose-100 border-rose-400 animate-pulse'
                  : isWarning
                  ? 'bg-amber-900/80 text-amber-200 border-amber-500'
                  : 'bg-sky-950 text-sky-200 border-sky-600'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{trackFitConfirmed ? 'CLEARED' : formatTime(secondsRemaining)}</span>
            </div>

            {/* Mute Audio Siren */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={onToggleLanguage}
              title={`Current Language: ${language}. Click to switch to ${language === 'EN' ? 'Hindi' : 'English'}`}
              className="px-1.5 py-1 rounded-lg hover:bg-white/10 text-[10px] font-mono font-bold text-sky-300 border border-sky-700/50 flex items-center gap-1 cursor-pointer"
            >
              <Languages className="w-3 h-3 text-sky-400" />
              <span>{language === 'EN' ? 'हिंदी' : 'EN'}</span>
            </button>

            {/* Collapse / Expand */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Dismiss / Close Watchdog */}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close / Dismiss Watchdog popup from screen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EXPANDED CONTENT BODY */}
        {isExpanded && (
          <div className="p-3 text-xs space-y-2.5 bg-black/20 font-mono">
            {/* Block Context & Traffic Risk */}
            <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {language === 'HI' ? 'कार्य विनिर्देश:' : 'Work:'}{' '}
                  <strong className="text-slate-200">{activeBlock.name}</strong>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                  {activeBlock.department}
                </span>
              </div>
              <div className="text-[10px] text-amber-300/90 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{activeBlock.trafficImpact}</span>
              </div>
            </div>

            {/* Extension Toast Confirmation */}
            {showExtensionToast && (
              <div className="p-2 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {language === 'HI'
                    ? '15 मिनट का आपातकालीन ब्लॉक विस्तार स्वीकृत (+15m Granted by Section Controller)'
                    : '15-minute emergency extension granted. Down line signals adjusted.'}
                </span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!trackFitConfirmed ? (
                <>
                  {/* Declare Track Fit & Cleared */}
                  <button
                    onClick={handleDeclareTrackFit}
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-950 cursor-pointer"
                    title="Field gang confirms track is packed, OHE normalized, and speed certificate signed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'HI' ? 'ट्रैक फिट एवं संचालन (T/351)' : 'Declare Track Fit & Sign (T/351)'}</span>
                  </button>

                  {/* Request 15m Extension */}
                  <button
                    onClick={handleRequestExtension}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Request 15-minute extension from Section Controller"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{language === 'HI' ? '+15m विस्तार' : '+15m Extension'}</span>
                  </button>
                </>
              ) : (
                <div className="flex-1 p-2 rounded-lg bg-emerald-950/90 text-emerald-300 text-[11px] border border-emerald-600 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">
                        {language === 'HI' ? 'ट्रैक फिट घोषित एवं हस्ताक्षरित!' : 'Track Fit Declared & Signed!'}
                      </strong>
                      <span className="text-[10px] text-emerald-300/90">
                        {language === 'HI'
                          ? `मुख्य स्क्रीन से स्वतः हटाया जा रहा है (${autoRemoveCountdown || 1}s)...`
                          : `Automatically removing from screen in ${autoRemoveCountdown || 1}s...`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDismissed(true)}
                    className="px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-white text-[10px] border border-emerald-500 cursor-pointer"
                  >
                    {language === 'HI' ? 'अभी हटाएं' : 'Dismiss Now'}
                  </button>
                </div>
              )}

              {/* Digital Railway Form T/409 Caution Order */}
              <button
                onClick={() => onOpenFormsModal('T409')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Open Official Indian Railways Caution Order (Form T/409)"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'HI' ? 'सतर्कता T/409' : 'Caution T/409'}</span>
              </button>

              {/* Digital Railway Form T/351 Disconnection Memo */}
              <button
                onClick={() => onOpenFormsModal('T351')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Open Official Indian Railways Disconnection Memo (Form T/351)"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'HI' ? 'मेमो T/351' : 'Memo T/351'}</span>
              </button>

              {/* Keyboard Shortcuts Guide */}
              <button
                onClick={onOpenHotkeysModal}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                title="Section Controller Keyboard Hotkeys (?)"
              >
                <span className="text-[10px] font-bold">?</span>
                <span>{language === 'HI' ? 'हॉटकीज़' : 'Hotkeys'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
