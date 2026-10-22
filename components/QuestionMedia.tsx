"use client";

import Image from "next/image";
import { useState } from "react";
import type { Question, QuestionImage as ImageData } from "@/lib/types";
import { isQuestionImageUrl, validQuestionImage } from "@/lib/questions";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function QuestionImage({ image }: { image?: ImageData | null }) {
  const [failed, setFailed] = useState("");
  if (!image || !validQuestionImage(image)) return null;
  if (failed === image.url) return <span className="block text-sm text-neutral-500">Şəkil yüklənmədi: {image.alt}</span>;
  return <Image unoptimized src={image.url} alt={image.alt} width={640} height={360} referrerPolicy="no-referrer" onError={() => setFailed(image.url)} className="my-2 h-auto max-h-64 w-auto max-w-full rounded-md object-contain" />;
}

export function QuestionMediaEditor({ question, onChange }: { question: Question; onChange: (question: Question) => void }) {
  const editImage = (index: number | null, field: "url" | "alt", value: string) => {
    const existing = index === null ? question.image : question.optionImages?.[index];
    const image = { url: existing?.url ?? "", alt: existing?.alt ?? "", [field]: value };
    const next = image.url || image.alt ? image : undefined;
    if (index === null) onChange({ ...question, image: next });
    else { const images = question.options.map((_, i) => i === index ? next ?? null : question.optionImages?.[i] ?? null); onChange({ ...question, optionImages: images }); }
  };
  const imageFields = (index: number | null, label: string) => {
    const image = index === null ? question.image : question.optionImages?.[index];
    const id = `${question.id}-image-${index ?? "question"}`;
    return <div key={id} className="space-y-2">
      <Label htmlFor={id}>{label} — şəkil ünvanı</Label>
      <Input id={id} value={image?.url ?? ""} maxLength={2048} placeholder="https://… və ya /…" onChange={(e) => editImage(index, "url", e.target.value)} />
      {image && <><Label htmlFor={`${id}-alt`}>Alternativ mətn — {label}</Label><Input id={`${id}-alt`} value={image.alt} maxLength={500} onChange={(e) => editImage(index, "alt", e.target.value)} />
        {image.url && !isQuestionImageUrl(image.url) && <p role="alert" className="text-sm text-danger-fg">Yalnız HTTPS və ya sayt daxilində şəkil ünvanı qəbul edilir. Base64 qəbul edilmir.</p>}
        <QuestionImage image={image} /></>}
    </div>;
  };
  return <details className="rounded-md border border-neutral-200 p-3">
    <summary className="cursor-pointer text-sm font-medium">Şəkillər, riyazi simvollar və izah</summary>
    <div className="mt-3 space-y-4">
      <p className="text-xs text-neutral-500">Yalnız şəkil ünvanı saxlanılır. Xarici şəkil silinə bilər; sabit, istifadəsinə icazəniz olan HTTPS mənbə seçin. Riyazi mətn Unicode kimi saxlanılır; LaTeX/Word düsturu çevrilmir.</p>
      <div className="flex flex-wrap gap-1" aria-label="Riyazi simvollar">{["²", "³", "√", "π", "α", "β", "θ", "≤", "≥", "≠", "±", "×", "÷", "∞", "∑", "∫", "½", "₁", "₂"].map((symbol) => <Button key={symbol} type="button" size="sm" variant="outline" aria-label={`${symbol} əlavə et`} onClick={() => onChange({ ...question, text: question.text + symbol })}>{symbol}</Button>)}</div>
      {imageFields(null, "Sual")}
      {question.type !== "true_false" && question.options.map((_, index) => imageFields(index, `${String.fromCharCode(65 + index)} variantı`))}
      <Label htmlFor={`${question.id}-explanation`}>İzah</Label><Textarea id={`${question.id}-explanation`} value={question.explanation ?? ""} onChange={(e) => onChange({ ...question, explanation: e.target.value })} />
    </div>
  </details>;
}
