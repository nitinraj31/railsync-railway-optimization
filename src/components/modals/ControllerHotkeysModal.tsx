import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';
import { Language } from '../../services/i18n';

interface ControllerHotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ControllerHotkeysModal: React.FC<ControllerHotkeysModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1', en: 'Command Center Dashboard', hi: 'नियंत्रण केंद्र (कमांड सेंटर)' },
    { key: '2', en: 'Conflict Management & Reconcile', hi: 'विवाद एवं टकराव प्रबंधन' },
    { key: '3', en: 'Block Schedule Timeline', hi: 'ब्लॉक समय-सारणी' },
    { key: '4', en: 'Train Operations & Delay Model', hi: 'ट्रेन परिचालन एवं विलंब मॉडल' },
    { key: '5', en: 'Safety Validation Gate', hi: 'संरक्षा सत्यापन द्वार' },
    { key: '6', en: 'Corridor Digital Twin & Simulator', hi: 'कॉरिडोर डिजिटल ट्विन' },
    { key: '7', en: 'Department Operations Hub (JPO)', hi: 'विभागीय परिचालन केंद्र (JPO)' },
    { key: '8', en: 'Maintenance Machinery & Assets', hi: 'अनुरक्षण मशीनरी एवं परिसंपत्तियां' },
    { key: '9', en: 'Moving Shadow-Block Engine', hi: 'शैडो-ब्लॉक इंजन' },
    { key: 'T / F', en: 'Official Railway Forms (T/409 & T/351)', hi: 'आधिकारिक प्रपत्र T/409 एवं T/351' },
    { key: 'L', en: 'Switch Language (EN / हिंदी)', hi: 'भाषा बदलें (EN / हिंदी)' },
    { key: 'M', en: 'Mute / Unmute Railway Audio Siren', hi: 'रेलवे सायरन म्यूट/अनम्यूट' },
    { key: 'P', en: 'Print Official Railway Bulletin', hi: 'आधिकारिक बुलेटिन प्रिंट करें' },
    { key: '?', en: 'Toggle Hotkeys Cheat Sheet', hi: 'शॉर्टकट गाइड प्रदर्शित करें' },
    { key: 'Esc', en: 'Close Active Modal / Dialog', hi: 'संवाद बंद करें' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-sky-500/70 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden font-mono">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-600 text-sky-300">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>
                  {language === 'HI'
                    ? 'रेलवे सेक्शन कंट्रोलर कीबोर्ड शॉर्टकट्स'
                    : 'Section Controller Fast Keyboard Shortcuts'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900 text-sky-200 border border-sky-600">
                  HOTKEYS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'HI'
                  ? 'हाई-डेंसिटी कंट्रोल रूम में बिना माउस के त्वरित नेविगेशन एवं ऑपरेशन हेतु'
                  : 'High-density control room shortcuts for rapid mouse-free block operations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {shortcuts.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3"
              >
                <span className="text-slate-300 text-[11px] truncate">
                  {language === 'HI' ? item.hi : item.en}
                </span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-600 font-bold text-xs shadow-sm shrink-0">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-[11px] text-sky-300 flex items-center gap-2 mt-3">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              {language === 'HI'
                ? 'टिप: कीबोर्ड पर कभी भी "L" दबाकर हिंदी अथवा इंग्लिश में स्विच कर सकते हैं।'
                : 'Tip: Press "L" anywhere on your keyboard to instantly toggle between English and Hindi.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
