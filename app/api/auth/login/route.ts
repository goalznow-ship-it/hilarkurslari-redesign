import {readJson,RequestBodyError} from "@/lib/server/request";
import {isSameOrigin} from "@/lib/server/origin";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/server/db/repositories";
import { hashPassword, verifyPassword, createSession, getSessionCookieName, getSessionCookieOptions } from "@/lib/server/auth";
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { checkRateLimit, getClientIdentifier } from "@/lib/server/rate-limiter";

const loginSchema = z.object({
  email: z.string().email("Duzgun e-poct yazin."),
  password: z.string().min(1, "Sifreni yazin.").max(256),
});

export async function POST(req: NextRequest) {
  try {
    if(!isSameOrigin(req))return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    const body = await readJson(req,16*1024);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const network = await checkRateLimit(getClientIdentifier(req), "api-default");
    if(!network.allowed)return NextResponse.json({success:false,error:"Çox cəhd. Bir qədər sonra yenidən yoxlayın."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((network.resetAt.getTime()-Date.now())/1000)))}});
    const rateLimit = await checkRateLimit(email.trim().toLowerCase(), "login");
    if (!network.allowed || !rateLimit.allowed) return NextResponse.json({success:false,error:"Çox cəhd. Bir qədər sonra yenidən yoxlayın."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((rateLimit.resetAt.getTime()-Date.now())/1000)))}});
    const user = await getUserByEmail(email);
    if (!user || !user.active || !user.passwordHash) {
      return NextResponse.json({ success: false, error: "Istifadeci adi ve ya sifre yanlisdir, yaxud hesab deaktivdir." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Istifadeci adi ve ya sifre yanlisdir, yaxud hesab deaktivdir." }, { status: 401 });
    }

    const replacementHash=user.passwordHash.startsWith("scrypt:")?undefined:await hashPassword(password);
    const token = await createSession(user.id,user.passwordHash,replacementHash);
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
    });
    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    return response;
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'İstifadəçi adı və ya şifrə yanlışdır.'},{status:401});
    logFailure('Login error:', error);
    return NextResponse.json({ success: false, error: "Giris zamani xeta bas verdi." }, { status: 500 });
  }
}