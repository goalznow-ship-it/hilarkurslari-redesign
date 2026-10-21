"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BellOff,
  Building2,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getSession } from "@/lib/store";

const NAV_GROUPS = [
  {
    label: "ÜMUMİ",
    items: [
      { href: "/account", label: "İdarəetmə Paneli", icon: LayoutDashboard },
      { href: "/account/reports", label: "Hesabatlıq", icon: BarChart3 },
      {
        href: "/account/online-exams",
        label: "Onlayn İmtahanlar",
        icon: Wifi,
      },
    ],
  },
  {
    label: "TƏŞKİLAT",
    items: [
      { href: "/account/companies", label: "Şirkətlər", icon: Building2 },
      { href: "/account/years", label: "Tədris İlləri", icon: CalendarRange },
      { href: "/account/classes", label: "Siniflər & Qruplar", icon: Network },
    ],
  },
  {
    label: "MƏZMUN",
    items: [
      { href: "/account/exams", label: "İmtahanlar", icon: ClipboardList },
      { href: "/account/results", label: "Nəticələr", icon: FileCheck2 },
      { href: "/account/questions", label: "Suallar", icon: FileQuestion },
      {
        href: "/account/questions/verification",
        label: "Sual Təsdiqi",
        icon: BadgeCheck,
      },
    ],
  },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sessiya qorunsuzluğu — login olmayan istifadəçi loginə yönləndirilir
  useEffect(() => {
    const t = setTimeout(() => {
      if (!getSession()) {
        router.replace("/account/login");
        return;
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/account/login");
  };

  const handleNotiOpen = () => {
    setNotiOpen((v) => !v);
    setMenuOpen(false);
  };

  const handleMenuOpen = () => {
    setMenuOpen((v) => !v);
    setNotiOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Sol Yan Menyu ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#2a111b] transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Loqo + brend */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <Link
            href="/account"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="rounded-lg bg-white px-3 py-2 inline-flex">
              <Image
                src="/hilal-logo.png"
                alt="Hilal Kursları"
                width={768}
                height={240}
                priority
                className="w-[132px] h-auto"
              />
            </span>
          </Link>
          <span className="flex-1" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
            aria-label="Menyu bağla"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menyu qrupları */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                          active
                            ? "bg-[#4a1c2c] text-white font-medium"
                            : "text-white/70 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-white" : "text-[#c99aab]",
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[11px] text-white/35">Kitabça Sistemi • Demo v0.1</p>
        </div>
      </aside>

      {/* Mobil keçid üçün ortaq örtük */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Məzmun hissəsi ===== */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Yuxarı header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-md p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Menyu aç"
            >
              <Menu className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Təşkilat seçimi */}
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Building2 className="size-4 text-[#4a1c2c]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Hilal Kursları
              </span>
            </div>

            {/* Bildirişlər */}
            <div className="relative">
              <button
                onClick={handleNotiOpen}
                className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Bildirişlər"
              >
                <Bell className="size-5" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
              </button>
              {notiOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotiOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">Bildirişlər</p>
                      <button
                        onClick={() => setNotiOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Bağla"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <BellOff className="size-6 text-slate-300" />
                      <p className="text-sm text-slate-500">Yeni bildiriş yoxdur.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* İstifadəçi profili */}
            <div className="relative">
              <button
                onClick={handleMenuOpen}
                aria-label="Profil menyusu"
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-100 cursor-pointer"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[#4a1c2c] text-xs font-bold text-white">
                  AD
                </span>
                <span className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-slate-800">AD</span>
                  <span className="text-[11px] text-slate-500">
                    admin@hilalkurslari.az
                  </span>
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-14 z-50 w-60 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#4a1c2c] text-xs font-bold text-white">
                        AD
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">AD</p>
                        <p className="truncate text-xs text-slate-500">
                          admin@hilalkurslari.az
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      Çıxış
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Əsas məzmun */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {ready ? children : null}
        </main>
      </div>
    </div>
  );
}
