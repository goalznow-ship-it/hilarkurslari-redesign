import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { getExamResultByAccessToken } from "@/lib/server/db/repositories";
import { scoreAnswer } from "@/lib/store";
import type { Question } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params;
    const token = req.nextUrl.searchParams.get("token");
    if (!token || token.length<20 || token.length>200) return NextResponse.json({error:"Nəticə tapılmadı."},{status:404});
    const result = await getExamResultByAccessToken(token);
    if (!result) return NextResponse.json({ error: "Nəticə tapılmadı." }, { status: 404 });

    // Mask FIN for privacy
    const maskedFin = result.fin.slice(0, 3) + "****";
    const maskedTicket = result.ticketCode.slice(0, 4) + "-****";

    // Build answer analysis
    const questionsSnapshot = (result.questionsSnapshot as Question[]) || [];
    const analysis = result.answers.map((given: number | number[] | null, i) => {
      const q = questionsSnapshot[i];
      if (!q) return { questionIndex: i, given, isCorrect: false, earnedPoints: 0 };
      const scored = scoreAnswer(q, given);
      return {
        questionIndex: i,
        questionText: q.text,
        questionType: q.type,
        options: q.options,

        given,
        isCorrect: scored.isCorrect,
        earnedPoints: scored.earnedPoints,
        points: q.points ?? 1,
        explanation: q.explanation,
        image: q.image,
        optionImages: q.optionImages,
      };
    });

    return NextResponse.json({
      id: result.id,
      examId: result.examId,
      examTitle: result.examTitle,
      fin: maskedFin,
      ticketCode: maskedTicket,
      score: result.score,
      correctCount: result.correctCount,
      total: result.total,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      timeSpentSec: result.timeSpentSec,


      answers: result.answers,

      analysis,
    });
  } catch (error) {
    logFailure('Get result error:', error);
    return NextResponse.json({ error: "Nəticə yüklənmədi." }, { status: 500 });
  }
}