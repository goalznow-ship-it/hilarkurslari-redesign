"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserCog, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getSession, getUsers } from "@/lib/store";
import type { User, UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  coordinator: "Koordinator",
  teacher: "Müəllim",
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => setUsers(getUsers()), 0);
    return () => clearTimeout(t);
  }, [router]);

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [users],
  );

  return (
    <div className="space-y-6">
      {/* Səhifə başlığı */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İstifadəçilər</h1>
          <p className="mt-1 text-sm text-slate-500">
            İmtahanları idarə edən administrator, koordinator və müəllim
            hesabları.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Users className="size-4 text-[#4a1c2c]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {users.filter((u) => u.active).length} aktiv
          </span>
        </div>
      </div>

      <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-[#4a1c2c]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Hesab siyahısı
            </h2>
          </div>
        </CardHeader>

        <CardContent className="px-0 py-0">
          {sorted.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              Hələ istifadəçi hesabı yoxdur.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 hover:bg-slate-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#4a1c2c]/10 text-xs font-bold text-[#4a1c2c]">
                    {user.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>

                  <span
                    className={
                      user.active
                        ? "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
                        : "inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"
                    }
                  >
                    <span
                      className={
                        user.active
                          ? "size-1.5 rounded-full bg-emerald-500"
                          : "size-1.5 rounded-full bg-slate-300"
                      }
                    />
                    {user.active ? "Aktiv" : "Deaktiv"}
                  </span>

                  {user.role === "admin" && (
                    <ShieldCheck className="size-4 shrink-0 text-slate-300" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
