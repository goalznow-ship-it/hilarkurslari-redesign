import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    const user = await validateSession(token);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId, active: user.active },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}