import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({error:"Giriş məlumatlarını imtahana başlama əməliyyatında yoxlayın."},{status:410});}
