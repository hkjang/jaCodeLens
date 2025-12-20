'use client';

import { useTranslations } from 'next-intl';

interface SkipLinkProps {
  href?: string;
  className?: string;
}

/**
 * SkipLink - Accessibility component for keyboard users
 * When focused, shows a link to skip to main content
 */
export default function SkipLink({ 
  href = '#main-content',
  className = ''
}: SkipLinkProps) {
  const t = useTranslations('accessibility');

  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only
        focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:rounded-lg
        focus:bg-blue-600 focus:text-white focus:font-medium
        focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400
        transition-all
        ${className}
      `}
    >
      {t('skipToContent')}
    </a>
  );
}
