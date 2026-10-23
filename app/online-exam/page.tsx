"use client";

import { Suspense } from "react";
import OnlineExamClient from "./OnlineExamClient";

export default function OnlineExamPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 text-neutral-500">
        Yüklənir…
      </div>
    }>
      <OnlineExamClient />
    </Suspense>
  );
}