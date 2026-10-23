import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import {persistQuestions} from "@/lib/server/question-service";
import {randomUUID} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getQuestions } from "@/lib/server/db/repositories";
import { requireRole } from "@/lib/server/auth-utils";
import { z } from "zod";

const questionCreateSchema = z.object({
  text: z.string().min(1).max(100000),
  options: z.array(z.string().min(1).max(10000)).min(2).max(100),
  correct: z.union([z.number().int(), z.array(z.number().int())]),
  type: z.enum(["single","multiple","true_false"]).default("single"),
  subject: z.string().max(10000).optional(),
  topic: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
  grade: z.string().max(10000).optional(),
  difficulty: z.enum(["Asan","Orta","Çətin"]).optional(),
  explanation: z.string().max(10000).optional(),
  points: z.number().positive().max(10000).default(1),
  image: z.object({ url: z.string().max(2048), alt: z.string().min(1).max(500) }).strict().optional(),
  optionImages: z.array(z.object({ url: z.string().max(2048), alt: z.string().min(1).max(500) }).strict().nullable()).optional(),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { searchParams } = new URL(req.url);
    const filters = {
      companyId:actor.companyId,
      subject: searchParams.get("subject") || undefined,
      grade: searchParams.get("grade") || undefined,
      topic: searchParams.get("topic") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      type: searchParams.get("type") as "single" | "true_false" | "multiple" | undefined,
      verification: searchParams.get("verification") as "pending" | "verified" | "rejected" | undefined,
    };
    const questions = await getQuestions(filters);
    return NextResponse.json({ questions });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if(error instanceof Error && error.message==="FORBIDDEN")return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    logFailure('Get questions error:', error);
    return NextResponse.json({ error: "Sual bankı yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const body = await readJson(req,4*1024*1024);
    const parsed = questionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const question = {...parsed.data,id:randomUUID()};
    await persistQuestions([question],undefined,actor.companyId);
    return NextResponse.json({ success: true, question });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create question error:', error);
    return NextResponse.json({ success: false, error: "Sual yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}