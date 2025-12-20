'use client';

import { RoleProvider } from '@/lib/contexts/RoleContext';
import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useState, useEffect } from 'react';

// Types for locale
export type Locale = 'ko' | 'en';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within Providers');
  }
  return context;
}

export function Providers({ 
  children,
  messages,
  locale: initialLocale = 'ko'
}: { 
  children: React.ReactNode;
  messages?: Record<string, any>;
  locale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currentMessages, setCurrentMessages] = useState(messages);

  useEffect(() => {
    // Load locale from cookie
    const savedLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    
    if (savedLocale && (savedLocale === 'ko' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = async (newLocale: Locale) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setLocaleState(newLocale);
    
    // Load new messages dynamically
    const newMessages = await import(`@/messages/${newLocale}.json`);
    setCurrentMessages(newMessages.default);
    
    // Reload to apply server-side changes
    window.location.reload();
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={currentMessages}>
        <RoleProvider>
          {children}
        </RoleProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

