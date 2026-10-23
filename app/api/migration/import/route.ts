import { NextRequest, NextResponse } from "next/server";
import { importMigrationData } from "@/lib/server/migration";
import { readMigrationRequest } from "@/lib/server/migration-http";
import { requireAdmin } from "@/lib/server/auth-utils";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const data = await readMigrationRequest(req);
    const result = await importMigrationData(data,req.headers.get("x-reenroll-staff")==="1");
    return NextResponse.json({ success: result.success, errors: result.errors, counts: result.counts, preview: result.preview, enrollments:"enrollments" in result?result.enrollments:undefined }, {status:result.success?200:409,headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    if(error instanceof SyntaxError)return NextResponse.json({error:"JSON formatı və ya ölçüsü yanlışdır."},{status:400});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    console.error("Migration import failed");
    return NextResponse.json({ error: "İdxal zamanı xəta baş verdi." }, { status: 500 });
  }
}