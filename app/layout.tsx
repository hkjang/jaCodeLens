import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getMessages, getLocale } from 'next-intl/server';
import SkipLink from '@/components/ui/SkipLink';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JacodeLens - AI Code Analysis",
  description: "Parallel AI-powered code analysis for enterprise teams",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipLink />
        <Providers messages={messages} locale={locale as 'ko' | 'en'}>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}



