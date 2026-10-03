import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { en } from './en';
import { ar } from './ar';

export type Lang = 'en' | 'ar';
const dicts: Record<Lang, Record<string, string>> = { en, ar };

interface LangCtx {
    lang: Lang;
    dir: 'ltr' | 'rtl';
    t: (key: string, fallback?: string) => string;
    setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({ lang: 'en', dir: 'ltr', t: (k) => k, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) as Lang | null;
        return saved === 'ar' || saved === 'en' ? saved : 'en';
    });
    const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        const root = document.documentElement;
        root.lang = lang;
        root.dir = dir;
        try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
    }, [lang, dir]);

    // Look up a key in the active language, fall back to English, then to the provided
    // fallback / the key itself — so untranslated strings still render (in English).
    const t = (key: string, fallback?: string) =>
        dicts[lang][key] ?? dicts.en[key] ?? fallback ?? key;

    return <Ctx.Provider value={{ lang, dir, t, setLang: setLangState }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
