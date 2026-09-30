import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LocaleProvider } from "@/components/healtrip/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_LOCALE, dirFor, type Locale } from "@/lib/locale";
import "./globals.css";

const geistSans = Geist({ variable: "--font-latin", subsets: ["latin"] });

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HealTrip+ Assistant",
  description: "Describe your case and get a next step and matching doctors from a verified catalog.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = saved === "en" || saved === "ar" ? saved : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${geistSans.variable} ${plexArabic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
