import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { getExams } from "@/lib/server/db/repositories";
import { examStatus } from "@/lib/helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const exams = await getExams();

    let filtered = exams.filter((e) => e.onlineEnabled && e.questions.length > 0 && e.ticketCodes.length > 0);
    if (activeOnly) {
      const now = Date.now();
      filtered = filtered.filter((e) => examStatus(e, now) === "active");
    }

    // Transform to safe DTO (no correct answers)
    const safeExams = filtered.map((exam) => ({
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      durationMin: exam.durationMin,
      questionCount:exam.questions.length,

      onlineEnabled: exam.onlineEnabled,
      status: examStatus(exam),
    }));

    return NextResponse.json({ exams: safeExams });
  } catch (error) {
    logFailure('Get public exams error:', error);
    return NextResponse.json({ error: "İmtahanlar yüklənmədi." }, { status: 500 });
  }
}