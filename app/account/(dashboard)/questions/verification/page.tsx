"use client";
import { useEffect, useState } from "react";
import { getCurrentUser, getQuestionBank, reviewQuestion } from "@/lib/backend-store";
import type { Question } from "@/lib/types";
import { Button, Card, CardContent, Label, Textarea } from "@/components/ui";
import { QuestionImage } from "@/components/QuestionMedia";

export default function QuestionVerificationPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviewFilter, setReviewFilter] = useState("pending");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setQuestions(getQuestionBank()); setAllowed(["admin", "coordinator"].includes(getCurrentUser()?.role ?? "")); }
      catch { setError("Sual bankı yüklənmədi. Səhifəni yeniləyin."); }
      finally { setLoading(false); }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const approve = async (id: string, status: "verified" | "rejected" = "verified") => {
    setError(""); setSuccess("");
    const result = await reviewQuestion(id, status, reasons[id] ?? "");
    if (!result.success) { setError(result.error ?? "Sual təsdiqlənmədi."); return; }
    setQuestions(result.questions ?? []); setSuccess(status === "verified" ? "Sual təsdiqləndi." : "Sual səbəblə rədd edildi.");
  };
  const pending = questions.filter((question) => reviewFilter === "all" || (question.verification ?? "verified") === reviewFilter);
  return <div className="space-y-5">
    <div><h1 className="text-xl font-bold text-neutral-900">Sual Təsdiqi</h1><p className="mt-1 text-sm text-neutral-500">Gözləyən sualları yoxlayın. Təsdiq sual bankına aiddir; əvvəlki imtahan surətlərini dəyişmir.</p></div>
    {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}{success && <p role="status" className="text-sm text-success-fg">{success}</p>}
    {!allowed && !loading && <p className="text-sm text-neutral-500">Təsdiq üçün administrator və ya koordinator icazəsi lazımdır.</p>}
    <div className="space-y-2"><Label htmlFor="review-filter">Yoxlama vəziyyəti</Label><select id="review-filter" value={reviewFilter} onChange={(event) => { setReviewFilter(event.target.value); setError(""); setSuccess(""); }} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="pending">Gözləyən</option><option value="verified">Təsdiqlənmiş</option><option value="rejected">Rədd edilmiş</option><option value="all">Hamısı</option></select></div>
    {loading ? <p>Yüklənir…</p> : pending.length === 0 ? <p className="text-sm text-neutral-500">Seçilmiş vəziyyətdə sual yoxdur.</p> : pending.map((q) => <Card key={q.id}><CardContent className="space-y-3">
      <p className="text-xs text-neutral-500">{q.subject} · {q.grade} · {q.type} · {q.points ?? 1} bal</p>
      <p className="whitespace-pre-wrap font-medium">{q.text}</p><QuestionImage image={q.image} />
      <ul className="space-y-2">{q.options.map((option, index) => <li key={index} className={(Array.isArray(q.correct) ? q.correct.includes(index) : q.correct === index) ? "font-medium text-brand-700" : "text-neutral-600"}>{String.fromCharCode(65 + index)}) {option}<QuestionImage image={q.optionImages?.[index]} /></li>)}</ul>
      {q.explanation && <p className="text-sm text-neutral-500">İzah: {q.explanation}</p>}
      <p className="text-xs text-neutral-500">Vəziyyət: {q.verification === "pending" ? "Gözləyən" : q.verification === "rejected" ? "Rədd edilmiş" : "Təsdiqlənmiş"}</p>
      {!!q.reviewHistory?.length && <details><summary className="cursor-pointer text-sm">Yoxlama tarixçəsi ({q.reviewHistory.length})</summary><ol className="mt-2 space-y-2 text-sm text-neutral-600">{q.reviewHistory.map((review, index) => <li key={index}>{review.status === "verified" ? "Təsdiq" : "Rədd"} · {review.reviewerName} · {new Date(review.reviewedAt).toLocaleString("az-AZ")}{review.reason && <p>Səbəb: {review.reason}</p>}</li>)}</ol></details>}
      {allowed && q.verification === "pending" && <div className="space-y-2"><Label htmlFor={`reason-${q.id}`}>Rədd səbəbi (rədd üçün məcburidir)</Label><Textarea id={`reason-${q.id}`} maxLength={2000} value={reasons[q.id] ?? ""} onChange={(event) => { setReasons((values) => ({ ...values, [q.id]: event.target.value })); setError(""); setSuccess(""); }} /><div className="flex gap-2"><Button type="button" onClick={() => approve(q.id)}>Təsdiqlə</Button><Button type="button" variant="outline" onClick={() => approve(q.id, "rejected")}>Rədd et</Button></div></div>}
    </CardContent></Card>)}
  </div>;
}
