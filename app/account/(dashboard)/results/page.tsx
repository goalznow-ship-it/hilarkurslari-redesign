import { Suspense } from "react";
import ResultsClient from "./ResultsClient";

export default function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-neutral-500">
          Yüklənir…
        </div>
      }
    >
      <ResultsClient searchParams={searchParams} />
    </Suspense>
  );
}
