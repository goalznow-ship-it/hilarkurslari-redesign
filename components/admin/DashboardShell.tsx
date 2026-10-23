"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BellOff,
  Building2,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Command,
  CreditCard,
  FileCheck2,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
  Wifi,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
} from "@/components/ui";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clearSession, getCurrentUser, canAccessPage, refreshAdminState } from "@/lib/backend-store";

const NAV_GROUPS = [
  {
    label: "ÜMUMİ",
    items: [
      { href: "/account", label: "İdarəetmə Paneli", icon: LayoutDashboard },
      { href: "/account/reports", label: "Hesabatlıq", icon: BarChart3 },
      { href: "/account/migration", label: "Məlumat migrasiyası", icon: FileCheck2 },
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
      {
        href: "/account/classes",
        label: "Siniflər & Qruplar",
        icon: Network,
      },
      { href: "/account/users", label: "İstifadəçilər", icon: Users },
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
  {
    label: "SATIŞ",
    items: [
      { href: "/account/seller-sales", label: "Bilet Satışı", icon: CreditCard },
    ],
  },
];

const BREADCRUMB: Record<string, { section: string; page: string }> = {
  "/account": { section: "Kitabça", page: "İdarəetmə Paneli" },
  "/account/reports": { section: "Kitabça", page: "Hesabatlıq" },
  "/account/seller-sales": { section: "Satış", page: "Bilet Satışı" },
  "/account/online-exams": { section: "Kitabça", page: "Onlayn İmtahanlar" },
  "/account/companies": { section: "Təşkilat", page: "Şirkətlər" },
  "/account/years": { section: "Təşkilat", page: "Tədris İlləri" },
  "/account/classes": { section: "Təşkilat", page: "Siniflər & Qruplar" },
  "/account/users": { section: "Təşkilat", page: "İstifadəçilər" },
  "/account/exams": { section: "Məzmun", page: "İmtahanlar" },
  "/account/exams/new": { section: "Məzmun", page: "Yeni imtahan" },
  "/account/results": { section: "Məzmun", page: "Nəticələr" },
  "/account/questions": { section: "Məzmun", page: "Suallar" },
  "/account/questions/verification": { section: "Məzmun", page: "Sual Təsdiqi" },
};

const PAGE_INDEX = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, section: g.label })),
);

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  // Active account and route permissions are rechecked on navigation and cross-tab changes.
  useEffect(() => {
    const check = async () => {
      try {
        setReady(false);
        await refreshAdminState();
        setLoadError("");
        const account = getCurrentUser();
        setUser(account ?? null);
        if (!account) { setReady(false); router.replace("/admin/login"); return; }
        if (!canAccessPage(account, pathname)) { setReady(false); router.replace(account.role === "seller" ? "/account/seller-sales" : "/account"); return; }
        setCollapsed(window.localStorage.getItem("kitabca.sidebar.collapsed") === "1");
        setReady(true);
      } catch { setReady(false); setLoadError("Serverə qoşulmaq mümkün olmadı və ya sessiya bitdi. Yenidən daxil olun."); }
    };
    const t = setTimeout(check, 0);
    const expired=()=>{setReady(false);router.replace("/admin/login");};
    window.addEventListener("kitabca:session-expired",expired);
    window.addEventListener("storage", check);
    return () => { clearTimeout(t); window.removeEventListener("kitabca:session-expired",expired);window.removeEventListener("storage", check); };
  }, [router, pathname]);

  // ⌘K / Ctrl+K — global axtarış
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      window.localStorage.setItem("kitabca.sidebar.collapsed", v ? "0" : "1");
      return !v;
    });
  };

  const handleLogout = async () => {
    try { await clearSession(); setUser(null); setReady(false); router.push("/admin/login"); }
    catch { alert("Çıxış yadda saxlanılmadı. Yenidən cəhd edin."); }
  };

  const crumb = useMemo(() => {
    if (BREADCRUMB[pathname]) return BREADCRUMB[pathname];
    if (pathname.startsWith("/account/exams/")) {
      return { section: "Məzmun", page: "İmtahan redaktəsi" };
    }
    return { section: "Kitabça", page: "İdarəetmə Paneli" };
  }, [pathname]);

  const paletteResults = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const pages = PAGE_INDEX.filter((item) => user && canAccessPage(user, item.href));
    if (!q) return pages;
    return pages.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.section.toLowerCase().includes(q),
    );
  }, [paletteQuery, user]);

  return (
    <div className="admin-shell min-h-[100dvh] bg-neutral-50">
      {/* ===== Sol Yan Menyu ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-neutral-200 bg-white transition-[width,transform] duration-200 ease-out lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Loqo + collapse */}
        <div
          className={cn(
            "flex h-20 items-center border-b border-neutral-200/70 px-4",
            collapsed ? "justify-center px-0" : "justify-between",
          )}
        >
          {!collapsed && (
            <Link href="/account" className="brand-lockup" aria-label="Kitabça — ana səhifə">
              <Image
                src="/hilal-original.png"
                alt="Hilal Kursları"
                width={44}
                height={44}
                priority
                className="size-11 object-contain"
              />
              <span><strong>Hilal Kursları</strong><small>İdarəetmə paneli</small></span>
            </Link>
          )}
          {collapsed && (
            <Link href="/account" aria-label="Kitabça — ana səhifə">
              <Image src="/hilal-original.png" alt="Hilal Kursları" width={40} height={40} />
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 lg:hidden"
            aria-label="Menyunu bağla"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menyu qrupları */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Panel bölmələri"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mb-2 h-px bg-neutral-200" />}
              <ul className="space-y-0.5">
                {group.items.filter((item) => user && canAccessPage(user, item.href)).map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors duration-150",
                          collapsed ? "justify-center px-2" : "px-3",
                          active
                            ? "bg-brand-100/70 font-semibold text-brand-800"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                        )}
                      >
                        {active && (
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-700" />
                        )}
                        <item.icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-brand-700" : "text-neutral-400",
                          )}
                        />
                        {!collapsed && item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse düyməsi */}
        <div className="hidden border-t border-neutral-200 p-3 lg:block">
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Menyunu genişlət" : "Menyunu yığ"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                Menyu yığ
              </>
            )}
          </button>
        </div>

        {/* İstifadəçi kartı */}
        <div className="border-t border-neutral-200 p-3">
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen((v) => !v);
                setNotiOpen(false);
              }}
              aria-label="Profil menyusu"
              aria-expanded={menuOpen}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-100",
                collapsed && "justify-center px-0",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                AD
              </span>
              {!collapsed && (
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-800">
                    {user?.name ?? "Admin"}
                  </span>
                  <span className="truncate text-xs text-neutral-500">
                    {user?.email}
                  </span>
                </span>
              )}
            </button>

            {menuOpen && !collapsed && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 bottom-full z-50 mb-2 w-56 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {user?.name ?? "Admin"}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger transition-colors hover:bg-danger-soft"
                  >
                    <LogOut className="size-4" />
                    Çıxış
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobil örtük */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Məzmun hissəsi ===== */}
      <div
        className={cn(
          "flex min-h-[100dvh] flex-col transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-64",
        )}
      >
        {/* Yuxarı panel */}
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden"
            aria-label="Menyunu aç"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/account" className="shrink-0 lg:hidden" aria-label="Hilal Kursları"><Image src="/hilal-original.png" alt="Hilal Kursları" width={30} height={30} /></Link>

          {/* Breadcrumb */}
          <nav aria-label="Yol" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden text-neutral-500 sm:block">{crumb.section}</li>
              <li className="hidden sm:block" aria-hidden="true">
                <ChevronRight className="size-3.5 text-neutral-300" />
              </li>
              <li className="truncate font-medium text-neutral-900">
                {crumb.page}
              </li>
            </ol>
          </nav>

          {/* Global axtarış */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-700 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Axtar…</span>
            <kbd className="flex items-center gap-0.5 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-500">
              <Command className="size-2.5" />K
            </kbd>
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden"
            aria-label="Axtarış"
          >
            <Search className="size-5" />
          </button>

          {/* Bildirişlər */}
          <div className="relative">
            <button
              onClick={() => {
                setNotiOpen((v) => !v);
                setMenuOpen(false);
              }}
              className="relative rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100"
              aria-label="Bildirişlər"
              aria-expanded={notiOpen}
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
            </button>
            {notiOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotiOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <p className="text-sm font-semibold text-neutral-800">
                      Bildirişlər
                    </p>
                    <button
                      onClick={() => setNotiOpen(false)}
                      className="text-neutral-400 transition-colors hover:text-neutral-700"
                      aria-label="Bağla"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <BellOff className="size-6 text-neutral-300" />
                    <p className="text-sm text-neutral-500">Yeni bildiriş yoxdur.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Əsas məzmun */}
        <main id="main-content" className="mx-auto w-full max-w-[1480px] min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {loadError && <p role="alert" className="p-4 text-danger-fg">{loadError} <Link href="/admin/login">Daxil ol</Link></p>}{!ready && !loadError && <p role="status" className="p-4">Yüklənir…</p>}{ready && user && canAccessPage(user, pathname) ? children : null}
        </main>
      </div>

      {/* ===== Global axtarış palitrası ===== */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="top-[18%] max-w-lg translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Global axtarış</DialogTitle>
          <DialogDescription className="sr-only">
            Panel bölmələri arasında axtarış
          </DialogDescription>
          <div className="border-b border-neutral-200 p-3">
            <Input
              autoFocus
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Bölmə axtar…"
              aria-label="Bölmə axtar"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {paletteResults.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">
                Heç nə tapılmadı.
              </li>
            )}
            {paletteResults.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => {
                    setPaletteOpen(false);
                    setPaletteQuery("");
                    router.push(item.href);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-neutral-100"
                >
                  <item.icon className="size-4 shrink-0 text-neutral-400" />
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    {item.label}
                  </span>
                  <span className="text-xs text-neutral-400">{item.section}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
