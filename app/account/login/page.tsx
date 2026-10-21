"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_PASSWORD, ADMIN_USER, getSession, setSession } from "@/lib/store";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // artıq girişisə → dashboard-a yönləndir
    if (getSession()) {
      router.replace("/account");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (user.trim() === ADMIN_USER && password === ADMIN_PASSWORD) {
      setSession(user.trim());
      router.push("/account");
    } else {
      setError("İstifadəçi adı və ya şifrə yanlışdır.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="flex items-center border-b border-gray-200 bg-white px-6 py-4 gap-3">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Kitabça Sistemi" className="h-9 w-9 rounded-lg" />
          <h1 className="text-xl font-bold text-gray-900">Kitabça Sistemi</h1>
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Panel Girişi</h2>
            <p className="text-sm text-gray-500 mb-6">İdarə panelinə daxil olun.</p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  İstifadəçi adı
                </label>
                <input
                  id="username"
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  autoComplete="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Şifrə
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-6 py-3 px-4 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Daxil ol
            </button>
          </div>

          <div className="mt-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 text-center">
            Demo giriş: <span className="font-mono font-semibold">{ADMIN_USER}</span> /{" "}
            <span className="font-mono font-semibold">{ADMIN_PASSWORD}</span>
          </div>
        </form>
      </main>
    </div>
  );
}
