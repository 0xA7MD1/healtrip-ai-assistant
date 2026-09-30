import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/healtrip/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dirFor, LOCALE_COOKIE, parseLocale } from "@/lib/locale-config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-latin", subsets: ["latin"] });

const ibmArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Medical Assistant",
  description: "Describe your case and get a next step and matching verified doctors.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${geistSans.variable} ${ibmArabic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider initialLocale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
