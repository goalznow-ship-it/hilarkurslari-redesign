import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: [
    { path: "../public/fonts/geist-latin.woff2", weight: "100 900" },
    { path: "../public/fonts/geist-latin-ext.woff2", weight: "100 900" },
  ],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kitabça — Hilal Kursları",
  description:
    "Azərbaycan dilində onlayn imtahan platforması: tələbələr imtahana daxil olur, nəticələr avtomatik yoxlanılır.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
