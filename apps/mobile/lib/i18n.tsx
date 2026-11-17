import React, { createContext, useContext, useMemo } from 'react';
import { useSession } from '@/lib/session';
import { dictionaries, type Lang } from '@/lib/translations';

interface I18n { lang: Lang; t: (en: string) => string }
const Ctx = createContext<I18n>({ lang: 'en', t: (s) => s });

/** Source-string i18n: wrap visible English text in t('…'); it returns the translation
 *  for the user's chosen language, or the English string itself when untranslated. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  const lang = ((me?.preferredLanguage as Lang) in dictionaries ? (me?.preferredLanguage as Lang) : 'en');
  const value = useMemo<I18n>(() => {
    const dict = dictionaries[lang] ?? {};
    return { lang, t: (en: string) => dict[en] ?? en };
  }, [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx).lang;
