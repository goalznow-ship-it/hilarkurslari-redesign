import { Suspense } from "react";
import EditExamClient from "./EditExamClient";

export default function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
          Yüklənir…
        </div>
      }
    >
      <EditExamSection params={params} />
    </Suspense>
  );
}

async function EditExamSection({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditExamClient id={id} />;
}

