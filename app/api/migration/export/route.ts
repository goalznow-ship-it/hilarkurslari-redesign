import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth-utils";
import type { NextRequest } from "next/server";
export async function GET(req: NextRequest) {
 try { await requireAdmin(req); return NextResponse.json({error:"Köhnə məlumatı həmin brauzerdə migrasiya səhifəsindən ixrac edin."},{status:410}); }
 catch(error){return NextResponse.json({error:"İcazəniz yoxdur."},{status:error instanceof Error&&error.message==="UNAUTHORIZED"?401:403});}
}
