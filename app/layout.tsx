import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — latin-ext altçəkilməsi Azərbaycan hərflərini (ə, ı, ö, ü, ş, ç, ğ, İ) qapsayır
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kitabça — Hilal Kursları",
  description:
    "Azərbaycan dilində onlayn imtahan platforması: tələbələr imtahana daxil olur, nəticələr avtomatik yoxlanılır.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
