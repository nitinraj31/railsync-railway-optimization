// Bilingual Translation Service for Indian Railways Operations (Hindi / English)
// Compliant with official Indian Railways terminology, Rajbhasha guidelines, and G&SR rules.

export type Language = 'EN' | 'HI';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

export const RAILWAY_DICTIONARY: Translations = {
  // Navigation & Screens
  'nav.command_center': { en: 'Command Center', hi: 'नियंत्रण केंद्र (कमांड सेंटर)' },
  'nav.conflicts': { en: 'Conflict Management', hi: 'विवाद एवं टकराव प्रबंधन' },
  'nav.timeline': { en: 'Block Timeline', hi: 'ब्लॉक समय-सारणी' },
  'nav.train_ops': { en: 'Train Operations', hi: 'रेल यातायात परिचालन' },
  'nav.validation': { en: 'Safety Validation Gate', hi: 'संरक्षा सत्यापन द्वार' },
  'nav.departments': { en: 'Department Hub', hi: 'विभागीय परिचालन केंद्र' },
  'nav.corridors': { en: 'Corridor Digital Twin', hi: 'कॉरिडोर डिजिटल ट्विन' },
  'nav.assets': { en: 'Maintenance Assets', hi: 'अनुरक्षण परिसंपत्तियां' },
  'nav.resources': { en: 'Resource Allocation', hi: 'संसाधन आवंटन' },
  'nav.requests': { en: 'Block Requests', hi: 'ब्लॉक मांग पत्र (Requisitions)' },
  'nav.defects': { en: 'Defect Reporting', hi: 'रेल पथ दोष रिपोर्टिंग' },
  'nav.shadow_block': { en: 'Shadow-Block Engine', hi: 'शैडो-ब्लॉक इंजन' },
  'nav.audit': { en: 'System Audit Log', hi: 'प्रणाली ऑडिट रिकॉर्ड' },
  'nav.caution_order': { en: 'Caution Order T/409', hi: 'सतर्कता आदेश (T/409)' },
  'nav.disconnection_memo': { en: 'Disconnection T/351', hi: 'डिस्कनेक्शन मेमो (T/351)' },

  // Operational Roles
  'role.controller': { en: 'Section Controller', hi: 'अनुभाग नियंत्रक' },
  'role.station_master': { en: 'Station Master', hi: 'स्टेशन मास्टर' },
  'role.pwi_sse': { en: 'SSE / P-Way Engineer', hi: 'वरिष्ठ खंड अभियंता (रेल पथ)' },
  'role.trd_sse': { en: 'SSE / Traction (TRD)', hi: 'वरिष्ठ खंड अभियंता (विद्युत TRD)' },
  'role.st_sse': { en: 'SSE / Signal & Telecom', hi: 'वरिष्ठ खंड अभियंता (सिग्नल)' },
  'role.chief_controller': { en: 'Chief Controller / DOM', hi: 'मुख्य नियंत्रक / मण्डल परिचालन प्रबंधक' },

  // Core Actions
  'action.propose_time_shift': { en: 'Propose Time Shift', hi: 'समय बदलाव प्रस्तावित करें' },
  'action.reconcile_conflict': { en: 'Quick Reconcile', hi: 'त्वरित समाधान' },
  'action.request_extension': { en: 'Request 15m Extension', hi: '15 मिनट विस्तार मांगें' },
  'action.declare_track_fit': { en: 'Track Fit & Reconnect', hi: 'ट्रैक फिट एवं पुनः संचालन' },
  'action.print_bulletin': { en: 'Print Official Bulletin', hi: 'आधिकारिक बुलेटिन प्रिंट करें' },
  'action.issue_caution_order': { en: 'Issue Form T/409', hi: 'सतर्कता आदेश T/409 जारी करें' },
  'action.issue_disconnection': { en: 'Issue Form T/351', hi: 'डिस्कनेक्शन मेमो T/351 जारी करें' },
  'action.hotkeys': { en: 'Hotkeys Guide', hi: 'कीबोर्ड शॉर्टकट' },
  'action.toggle_lang': { en: 'Switch Language', hi: 'भाषा बदलें' },
  'action.mute_audio': { en: 'Mute Siren', hi: 'सायरन म्यूट करें' },
  'action.unmute_audio': { en: 'Unmute Siren', hi: 'सायरन चालू करें' },

  // Alerts & Status
  'status.bursting_warning': { en: 'BLOCK BURSTING RISK', hi: 'ब्लॉक बर्स्टिंग का खतरा (अतिक्रमण)' },
  'status.bursting_desc': { en: 'Allocated block time expires shortly. Train operations will suffer ripple delay unless reconnected.', hi: 'आवंटित ब्लॉक समय समाप्त होने वाला है। पुनः कनेक्ट न होने पर ट्रेनों में विलंब होगा।' },
  'status.safe_to_publish': { en: 'Safe to Publish', hi: 'प्रकाशन हेतु सुरक्षित' },
  'status.requires_review': { en: 'Requires Review', hi: 'समीक्षा अपेक्षित' },
  'status.conflict_detected': { en: 'Conflict Detected', hi: 'टकराव का पता चला' },
  'status.optimal': { en: 'Optimal', hi: 'इष्टतम' },
  'status.dependency_conflict': { en: 'Electrical vs Track Dependency Conflict', hi: 'विद्युत (TRD) बनाम ट्रैक मेंटेनेंस टकराव' },
  'status.dependency_rule': { en: 'ACTM Vol II Para 20.3 & IRPWM Para 6.4 Violation', hi: 'एसीटीटीएम खंड 2 पैरा 20.3 एवं आईआरपीथडब्ल्यूएम पैरा 6.4 का उल्लंघन' },

  // Form Headers
  'forms.caution_title': { en: 'INDIAN RAILWAYS - FORM T/409 CAUTION ORDER', hi: 'भारतीय रेल - प्रपत्र टी/409 सतर्कता आदेश' },
  'forms.caution_sub': { en: 'Prescribed under General & Subsidiary Rules (G&SR) 4.09', hi: 'सामान्य एवं सहायक नियम (G&SR) 4.09 के अंतर्गत विहित' },
  'forms.disconnection_title': { en: 'INDIAN RAILWAYS - FORM T/351 DISCONNECTION / RECONNECTION MEMO', hi: 'भारतीय रेल - प्रपत्र टी/351 डिस्कनेक्शन / रिकनेक्शन मेमो' },
  'forms.disconnection_sub': { en: 'For S&T Gear, 25kV OHE Isolation and Track Circuit Disconnection', hi: 'सिग्नल उपकरण, 25kV OHE आइसोलेशन एवं ट्रैक सर्किट डिस्कनेक्शन हेतु' },
};

class I18nService {
  private currentLang: Language = 'EN';
  private listeners: Array<(lang: Language) => void> = [];

  constructor() {
    const saved = localStorage.getItem('railway_app_lang');
    if (saved === 'HI' || saved === 'EN') {
      this.currentLang = saved;
    }
  }

  public getLanguage(): Language {
    return this.currentLang;
  }

  public setLanguage(lang: Language) {
    this.currentLang = lang;
    localStorage.setItem('railway_app_lang', lang);
    this.notifyListeners();
  }

  public toggleLanguage(): Language {
    const newLang = this.currentLang === 'EN' ? 'HI' : 'EN';
    this.setLanguage(newLang);
    return newLang;
  }

  public subscribe(fn: (lang: Language) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.currentLang));
  }

  public t(key: string, defaultText?: string): string {
    const item = RAILWAY_DICTIONARY[key];
    if (!item) return defaultText || key;
    return this.currentLang === 'HI' ? item.hi : item.en;
  }

  public getBilingualLabel(key: string, separator: string = ' / '): string {
    const item = RAILWAY_DICTIONARY[key];
    if (!item) return key;
    return `${item.en}${separator}${item.hi}`;
  }
}

export const i18n = new I18nService();
