import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIA",
  description: "Mirada Mia — lecturas, voz y memoria evolutiva",
  applicationName: "MIA",
  appleWebApp: { capable: true, title: "MIA", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        {/* App Shell (mobile-first, centered on desktop) */}
        <div className="min-h-screen bg-[#1e0d0d] text-[#fcfcfc]">
          {/* Background gradient (bordó -> rojo oscuro) */}
          <div className="min-h-screen bg-[linear-gradient(180deg,#ab2323_0%,#1e0d0d_100%)]">
            {/* Centered container for desktop, full on mobile */}
            <div className="mx-auto min-h-screen w-full max-w-[440px]">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
