import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'fr' | 'sw';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.home': 'Home Feed',
    'nav.businesses': 'Businesses',
    'nav.creator': 'Creator Hub',
    'nav.messages': 'Messages',
    'nav.search': 'Search',
    'nav.signin': 'Sign In',
    'nav.registerBiz': 'Register Business',
    'hero.title': 'The self-service commerce & creator platform for Africa.',
    'hero.subtitle': 'Connect with customers directly, manage your storefront, and grow independently.',
    'feed.composerPlaceholder': "Share business updates, product launches, or knowledge...",
    'feed.postBtn': 'Post to Community',
    'creator.earnings': 'Creator Earnings',
    'creator.views': 'Total Monetized Views',
    'creator.withdraw': 'Request Payout',
    'creator.threshold': 'Views required to withdraw',
    'biz.directoryTitle': 'African Business & Service Directory',
    'biz.searchPlaceholder': 'Search by business name, trade, or city...',
    'biz.registerHeading': 'List Your Business',
    'biz.registerSub': 'Create a verified digital storefront in minutes.',
  },
  fr: {
    'nav.home': 'Fil d’actualité',
    'nav.businesses': 'Entreprises',
    'nav.creator': 'Espace Créateur',
    'nav.messages': 'Messages',
    'nav.search': 'Recherche',
    'nav.signin': 'Se connecter',
    'nav.registerBiz': 'Enregistrer l’entreprise',
    'hero.title': 'La plateforme de commerce et de créateurs en libre-service pour l’Afrique.',
    'hero.subtitle': 'Connectez-vous directement avec vos clients, gérez votre vitrine et grandissez.',
    'feed.composerPlaceholder': "Partagez vos nouveautés, lancements ou conseils...",
    'feed.postBtn': 'Publier',
    'creator.earnings': 'Revenus du Créateur',
    'creator.views': 'Vues Monétisées',
    'creator.withdraw': 'Demander un retrait',
    'creator.threshold': 'Vues requises pour le retrait',
    'biz.directoryTitle': 'Annuaire des Entreprises et Services Africains',
    'biz.searchPlaceholder': 'Rechercher par nom, métier ou ville...',
    'biz.registerHeading': 'Enregistrez votre entreprise',
    'biz.registerSub': 'Créez une vitrine numérique vérifiée en quelques minutes.',
  },
  sw: {
    'nav.home': 'Ukurasa Mkuu',
    'nav.businesses': 'Biashara',
    'nav.creator': 'Kitovu cha Waundaji',
    'nav.messages': 'Ujumbe',
    'nav.search': 'Tafuta',
    'nav.signin': 'Ingia',
    'nav.registerBiz': 'Sajili Biashara',
    'hero.title': 'Jukwaa la biashara na waundaji wa kujitegemea la Afrika.',
    'hero.subtitle': 'Wasiliana moja kwa moja na wateja wako, simamia duka lako na ukue.',
    'feed.composerPlaceholder': 'Shiriki taarifa za biashara au uzinduzi wa bidhaa...',
    'feed.postBtn': 'Tuma Chapisho',
    'creator.earnings': 'Mapato ya Muundaji',
    'creator.views': 'Jumla ya Mitazamo',
    'creator.withdraw': 'Omba Malipo',
    'creator.threshold': 'Mitazamo inayohitajika kutoa fedha',
    'biz.directoryTitle': 'Orodha ya Biashara na Huduma za Kiafrika',
    'biz.searchPlaceholder': 'Tafuta kwa jina la biashara au jiji...',
    'biz.registerHeading': 'Sajili Biashara Yako',
    'biz.registerSub': 'Unda wasifu uliothibitishwa wa kidijitali ndani ya dakika chache.',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
