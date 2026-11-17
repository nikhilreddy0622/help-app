// Source-string translations. Keys are the exact English UI text.
// Start with the app shell; untranslated strings fall back to English.
// Extend each language's map to cover more screens over time.
export type Lang = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr' | 'bn';

type Dict = Record<string, string>;

const hi: Dict = {
  // tabs
  Home: 'होम',
  Explore: 'खोजें',
  Register: 'रजिस्टर',
  Jobs: 'नौकरियाँ',
  Profile: 'प्रोफ़ाइल',
  Messages: 'संदेश',
  Saved: 'सहेजे गए',
  'Saved professionals': 'सहेजे गए पेशेवर',
  // home
  'Discover services near you': 'अपने आस-पास सेवाएँ खोजें',
  'Find trusted professionals and businesses in your area.': 'अपने क्षेत्र में भरोसेमंद पेशेवर और व्यवसाय खोजें।',
  'Search for any service': 'कोई भी सेवा खोजें',
  'Available now nearby': 'अभी पास में उपलब्ध',
  'Looking for work?': 'काम की तलाश है?',
  'Browse jobs posted nearby': 'आस-पास पोस्ट की गई नौकरियाँ देखें',
  // common
  Search: 'खोजें',
  'See all': 'सभी देखें',
  'Sign out': 'साइन आउट',
  'Become a professional': 'पेशेवर बनें',
  Cancel: 'रद्द करें',
  Save: 'सहेजें',
  Continue: 'जारी रखें',
  Language: 'भाषा',
  Notifications: 'सूचनाएँ',
  Help: 'सहायता',
  // register screen
  'Grow your work on help': 'help के साथ अपना काम बढ़ाएँ',
  'Register as a professional': 'पेशेवर के रूप में रजिस्टर करें',
};

export const dictionaries: Partial<Record<Lang, Dict>> = {
  en: {},
  hi,
  // kn, ta, te, mr, bn: added as translations are provided
};
