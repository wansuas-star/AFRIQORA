import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'fr' | 'sw';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.satellite': 'Satellite Intel',
    'nav.spaceTech': 'Space Tech',
    'nav.businesses': 'Enterprise Directory',
    'nav.commercial': 'Commercial Hub',
    'nav.investigations': 'Investigative Workspace',
    'nav.search': 'Search',
    'nav.signin': 'Sign In',
    'nav.registerBiz': 'Register Enterprise',
    'hero.title': 'African Space Technology, Satellite Intelligence & Information Platform',
    'hero.subtitle': 'Multi-sensor Earth observation, SAR & optical analytics, and continental aerospace intelligence.',
    'biz.directoryTitle': 'African Enterprise & Technology Directory',
    'biz.searchPlaceholder': 'Search by enterprise name, sector, or city...',
    'biz.registerHeading': 'Register Your Enterprise',
    'biz.registerSub': 'Create a verified digital profile on the continental network.',
  },
  fr: {
    'nav.satellite': 'Renseignement Spatial',
    'nav.spaceTech': 'Technologies Spatiales',
    'nav.businesses': 'Annuaire des Entreprises',
    'nav.commercial': 'Pôle Commercial',
    'nav.investigations': 'Espace d’Enquête',
    'nav.search': 'Recherche',
    'nav.signin': 'Se connecter',
    'nav.registerBiz': 'Enregistrer l’entreprise',
    'hero.title': 'Plateforme Africaine de Technologies Spatiales, Renseignement Satellitaire et Information',
    'hero.subtitle': 'Observation de la Terre multi-capteurs, analyses SAR & optiques et veille aérospatiale.',
    'biz.directoryTitle': 'Annuaire des Entreprises et Technologies Africaines',
    'biz.searchPlaceholder': 'Rechercher par entreprise, secteur ou ville...',
    'biz.registerHeading': 'Enregistrez votre entreprise',
    'biz.registerSub': 'Créez un profil numérique vérifié sur le réseau continental.',
  },
  sw: {
    'nav.satellite': 'Ujasusi wa Setilaiti',
    'nav.spaceTech': 'Teknolojia ya Anga',
    'nav.businesses': 'Orodha ya Biashara',
    'nav.commercial': 'Kitovu cha Biashara',
    'nav.investigations': 'Eneo la Uchunguzi',
    'nav.search': 'Tafuta',
    'nav.signin': 'Ingia',
    'nav.registerBiz': 'Sajili Shirika',
    'hero.title': 'Jukwaa la Teknolojia ya Anga ya Afrika, Ujasusi wa Setilaiti na Habari',
    'hero.subtitle': 'Uchunguzi wa Dunia wa vitambuzi vingi, uchanganuzi wa SAR na macho, na taarifa za anga.',
    'biz.directoryTitle': 'Orodha ya Mashirika na Teknolojia za Kiafrika',
    'biz.searchPlaceholder': 'Tafuta kwa jina la shirika, sekta, au jiji...',
    'biz.registerHeading': 'Sajili Shirika Lako',
    'biz.registerSub': 'Unda wasifu uliothibitishwa wa kidijitali kwenye mtandao wa bara.',
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
