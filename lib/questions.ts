import type { Question, QuestionImage } from "./types";

export function isQuestionImageUrl(value: string): boolean {
  if (!value || value.length > 2048 || /[\s\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}

export function validQuestionImage(image: QuestionImage): boolean {
  return typeof image?.url === "string" && isQuestionImageUrl(image.url) && typeof image.alt === "string" && !!image.alt.trim() && image.alt.length <= 500;
}

export function cloneQuestion(question: Question, id = question.id): Question {
  return { ...question, id, reviewHistory: question.reviewHistory?.map((review) => ({ ...review })), options: [...question.options], correct: Array.isArray(question.correct) ? [...question.correct] : question.correct,
    tags: question.tags ? [...question.tags] : undefined, image: question.image ? { ...question.image } : undefined,
    optionImages: question.optionImages?.map((image) => image ? { ...image } : null) };
}

export type QuestionFilters = { search?: string; subject?: string; grade?: string; topic?: string; difficulty?: string; type?: string };
export function matchesQuestion(question: Question, filters: QuestionFilters): boolean {
  const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase("az");
  for (const field of ["subject", "grade", "topic", "difficulty", "type"] as const) {
    if (filters[field] && filters[field] !== "all" && (question[field] ?? (field === "type" ? "single" : "")) !== filters[field]) return false;
  }
  const text = [question.text, question.subject, question.grade, question.topic, question.difficulty, ...(question.tags ?? []), ...question.options].filter(Boolean).join(" ");
  return !filters.search?.trim() || normalize(text).includes(normalize(filters.search.trim()));
}
