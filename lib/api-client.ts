"use client";

const API_BASE = "";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Server error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function startExam(examId: string, fin: string, ticket: string) {
  const response = await fetch(`${API_BASE}/api/exams/${examId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fin, ticket }),
    credentials: "include",
  });
  return handleResponse<{
    success: boolean;
    attemptId: string;
    expiresAt: string;
    questions: Array<{ id: string; text: string; options: string[]; type: string; points: number; image?: { url: string; alt: string }; optionImages?: Array<{ url: string; alt: string } | null> }>;
    durationMin: number;
    answers: Array<number | number[] | null>;
  }>(response);
}

export async function saveAnswer(attemptId: string, answers: Array<number | number[] | null>, expectedVersion:string) {
  const response = await fetch(`${API_BASE}/api/exams/${encodeURIComponent(attemptId)}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, answers, expectedVersion }),
    credentials: "include",
  });
  return handleResponse<{ success: boolean; savedAt: string; revision:string }>(response);
}

export async function submitExam(attemptId: string, answers: Array<number | number[] | null>, expectedVersion:string) {
  const response = await fetch(`${API_BASE}/api/exams/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, answers, expectedVersion }),
    credentials: "include",
  });
  return handleResponse<{
    success: boolean;
    resultId: string;
    accessToken: string;
    score: number;
    correctCount: number;
    total: number;
    timeSpentSec: number;
  }>(response);
}

export async function getResultByToken(token: string) {
  const response = await fetch(`${API_BASE}/api/exams/result/result?token=${encodeURIComponent(token)}`, {
    credentials: "include",
  });
  return handleResponse<{
    id: string;
    examId: string;
    examTitle: string;
    fin: string;
    ticketCode: string;
    score: number;
    correctCount: number;
    total: number;
    startedAt: string;
    finishedAt: string;
    timeSpentSec: number;
    accessToken?: string;
    attemptId?: string;
    answers: Array<number | number[] | null>;
    analysis?: Array<{
      questionIndex: number;
      questionText: string;
      questionType: string;
      options: string[];
      given: number | number[] | null;
      isCorrect: boolean;
      earnedPoints: number;
      points: number;
      explanation?: string;
      optionImages?: Array<{ url: string; alt: string } | null>;
      image?: { url: string; alt: string };
    }>;
  }>(response);
}

export async function getActiveExams() {
 return handleResponse<{exams:import('./types').SafeExam[]}>(await fetch('/api/public/exams?active=true',{credentials:'same-origin',cache:'no-store'}));
}

export async function getAttempt(id:string){return handleResponse<{revision:string;exam:{id:string;title:string;subject:string;durationMin:number;questions:Array<Omit<import("./types").Question,"correct">>};answers:Array<number|number[]|null>;expiresAt:string}>(await fetch(`/api/attempts/${encodeURIComponent(id)}`,{credentials:"include",cache:"no-store"}));}
