"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ExamForm from "@/components/ExamForm";
import { getSession } from "@/lib/store";

export default function NewExamPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) router.replace("/account/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
          <h1 className="font-bold text-gray-900">Yeni imtahan</h1>
          <Link
            href="/account"
            className="ml-auto text-sm font-medium text-blue-600 hover:underline"
          >
            ← İdarə panelinə qayıt
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <ExamForm mode="create" />
      </main>
    </div>
  );
}
