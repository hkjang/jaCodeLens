'use client';

import { useLocale, Locale } from '@/app/providers';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const locales: { code: Locale; name: string; flag: string }[] = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = locales.find(l => l.code === locale) || locales[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-sm">{currentLocale.flag}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div 
            className="absolute right-0 mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-32"
            role="listbox"
            aria-label="Available languages"
          >
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => {
                  setLocale(loc.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  locale === loc.code ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}
                role="option"
                aria-selected={locale === loc.code}
              >
                <span>{loc.flag}</span>
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
