import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  Check,
  RotateCcw,
  Sparkles,
  Radio,
  Trash2,
  Globe,
  Sliders,
  Info,
} from 'lucide-react';
import { railwayAudio } from '../../services/railwayAudio';

interface VoiceDictationInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  label?: string;
}

// Quick technical railway field defect phrases for high-noise fallback
const RAILWAY_FIELD_CHIPS = [
  { label: 'Weld Fracture', phrase: 'Transverse fatigue hairline crack detected on rail weld at gauge face.' },
  { label: 'OHE Dropper Snap', phrase: 'OHE contact wire dropper snapped with localized catenary sag.' },
  { label: 'Point Machine Fault', phrase: 'Point machine 102B reverse detection contact erratic during motorized throw.' },
  { label: 'Ballast Deficiency', phrase: 'Ballast shoulder deficiency of 150mm over 50-meter curve stretch.' },
  { label: 'Track Circuit Drop', phrase: 'Track circuit TC-204 intermittent relay drop under damp ballast conditions.' },
  { label: 'Fishplate Bolt Loose', phrase: 'Missing and loose fishplate bolts on insulated rail joint.' },
];

export const VoiceDictationInput: React.FC<VoiceDictationInputProps> = ({
  value,
  onChange,
  id = 'defect-description-input',
  placeholder = 'Describe track anomaly, kilometer mark, mast number, observed vibration or visual signs...',
  required = true,
  rows = 3,
  label = 'Description',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const [highNoiseMode, setHighNoiseMode] = useState(true);
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);

  // References for recognition and timer
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const timerRef = useRef<any>(null);

  // Check speech recognition API support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Timer for active recording
  useEffect(() => {
    if (isListening) {
      setListeningSeconds(0);
      timerRef.current = setInterval(() => {
        setListeningSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setListeningSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Clean stop of recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
    railwayAudio.playBeep(440, 0.08);
  }, []);

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorMessage(
        'Speech recognition is not natively supported by this browser engine. Use the quick railway field chips below.'
      );
      return;
    }

    setErrorMessage(null);
    setInterimTranscript('');
    baseTextRef.current = value;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = activeLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        railwayAudio.playBeep(880, 0.1);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTrans += transcriptChunk;
          } else {
            interimTrans += transcriptChunk;
          }
        }

        setInterimTranscript(interimTrans);

        if (finalTrans.trim()) {
          const currentBase = baseTextRef.current.trim();
          const separator = currentBase ? (currentBase.endsWith('.') ? ' ' : '. ') : '';
          const updated = currentBase + separator + finalTrans.trim();
          baseTextRef.current = updated;
          onChange(updated);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permission in your browser.'
          );
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening or subtle prompt in noisy environments
        } else if (event.error === 'audio-capture') {
          setErrorMessage('No microphone device detected or audio capture is unavailable.');
          setIsListening(false);
        } else if (event.error === 'network') {
          setErrorMessage('Speech recognition network error. Check connectivity.');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      setErrorMessage('Could not start voice recognition. Please try again.');
      setIsListening(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAppendPhrase = (phrase: string) => {
    const current = value.trim();
    const separator = current ? (current.endsWith('.') ? ' ' : '. ') : '';
    const next = current + separator + phrase;
    onChange(next);
    railwayAudio.playBeep(640, 0.05);
  };

  const handleClear = () => {
    onChange('');
    baseTextRef.current = '';
    setInterimTranscript('');
    if (isListening) {
      stopListening();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-1.5">
      {/* Field Toolbar & Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="block font-semibold text-slate-300 font-mono text-xs">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>

        <div className="flex items-center gap-1.5">
          {/* Language Selector for Speech */}
          <div className="flex items-center rounded-md bg-slate-950 border border-slate-800 p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveLang('en-IN');
                if (isListening) stopListening();
              }}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                activeLang === 'en-IN'
                  ? 'bg-sky-900 text-sky-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English (India - Railway Standard)"
            >
              EN-IN
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLang('hi-IN');
                if (isListening) stopListening();
              }}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                activeLang === 'hi-IN'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Hindi (India - हिन्दी)"
            >
              HI-IN
            </button>
          </div>

          {/* Quick Technical Phrases Toggle */}
          <button
            type="button"
            onClick={() => setShowQuickPhrases(!showQuickPhrases)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors border cursor-pointer ${
              showQuickPhrases
                ? 'bg-sky-950 text-sky-200 border-sky-600 font-semibold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Field technical quick phrase templates for noisy trackside"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Railway Terms</span>
          </button>

          {/* PRIMARY MICROPHONE VOICE-TO-TEXT BUTTON */}
          <button
            type="button"
            id="btn-voice-to-text-dictate"
            onClick={handleToggleVoice}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-900/60 border border-rose-400'
                : 'bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white shadow-sky-950/60 border border-sky-400/40'
            }`}
            title={
              isListening
                ? 'Click to stop voice dictation'
                : 'Click to start microphone speech-to-text dictation for defect description'
            }
          >
            {isListening ? (
              <>
                <Radio className="w-3.5 h-3.5 text-white animate-spin" />
                <span>STOP REC ({formatTimer(listeningSeconds)})</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-white" />
                <span>Dictate Notes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Recording Ambient Banner */}
      {isListening && (
        <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-600/90 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="font-mono">
              <strong className="text-rose-200">Microphone Active & Listening:</strong>{' '}
              <span className="text-slate-300">
                Speak defect details ({activeLang === 'en-IN' ? 'English' : 'हिन्दी'}).
              </span>
            </div>
          </div>

          {/* Animated Audio Wave bars */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-rose-300 font-mono mr-1">Noisy Track Filter: ON</span>
            <div className="flex items-end gap-0.5 h-4">
              <div className="w-1 bg-rose-400 animate-[bounce_0.6s_infinite] h-3 rounded-full"></div>
              <div className="w-1 bg-rose-300 animate-[bounce_0.4s_infinite] h-4 rounded-full"></div>
              <div className="w-1 bg-rose-500 animate-[bounce_0.7s_infinite] h-2 rounded-full"></div>
              <div className="w-1 bg-rose-400 animate-[bounce_0.5s_infinite] h-4 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Live Interim Speech Preview Badge */}
      {interimTranscript && (
        <div className="p-2 rounded bg-slate-950/90 border border-sky-500/80 text-sky-200 text-xs font-mono flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
          <div className="truncate">
            <span className="text-slate-400 mr-1 text-[11px]">Transcribing:</span>
            <span className="italic font-sans text-white">"{interimTranscript}"</span>
          </div>
        </div>
      )}

      {/* Error / Permission Guidance Banner */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/80 text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Voice Input Note</span>
          </div>
          <p className="text-[11px] text-amber-300/90">{errorMessage}</p>
        </div>
      )}

      {/* Main Textarea Container with Clear/Count Footer */}
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none transition-colors ${
            isListening
              ? 'border-rose-500/80 ring-1 ring-rose-500/50'
              : 'border-slate-700 focus:border-sky-500'
          }`}
          placeholder={placeholder}
          required={required}
        ></textarea>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-[10px] transition-colors cursor-pointer"
            title="Clear description text"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Field Quick Phrase Insert Chips for Harsh Railway Environments */}
      {showQuickPhrases && (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-300 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              Standard Railway Field Terminology
            </span>
            <span className="text-[10px] text-slate-500">Click to append to note</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RAILWAY_FIELD_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendPhrase(chip.phrase)}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-sky-950 hover:border-sky-700 text-slate-300 hover:text-sky-200 border border-slate-800 text-[10px] font-mono transition-colors text-left cursor-pointer"
                title={`Click to insert: "${chip.phrase}"`}
              >
                + {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Field Note / Tip */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-500" />
          <span>Noisy environment? Hold mic 5cm from mouth; state track chainage clearly.</span>
        </span>
        <span className="font-mono text-slate-500">{value.length} chars</span>
      </div>
    </div>
  );
};
