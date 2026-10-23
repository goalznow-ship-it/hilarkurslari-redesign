import {isSameOrigin} from "@/lib/server/origin";
import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSessionCookieName, getSessionCookieOptions } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  try {
    if(!isSameOrigin(req))return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (token) await deleteSession(token);
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), "", { ...getSessionCookieOptions(), maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Çıxış zamanı xəta baş verdi." }, { status: 500 });
  }
}