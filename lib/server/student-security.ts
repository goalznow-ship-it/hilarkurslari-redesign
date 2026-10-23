import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Question } from "../types";
function signature(id:string){const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)throw new Error('AUTH_SECRET must contain at least 32 characters');return createHmac('sha256',secret).update('exam-attempt:'+id).digest('hex');}
export function hasAttemptAccess(req:NextRequest,id:string){const token=req.cookies.get('kitabca_attempt_'+id)?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return false;return timingSafeEqual(Buffer.from(token),Buffer.from(signature(id)));}
export function setAttemptCookie(response:NextResponse,id:string){response.cookies.set('kitabca_attempt_'+id,signature(id),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:86400});return response;}
export function safeQuestionDTO(q:Question){return {id:q.id,text:q.text,options:q.options,type:q.type,points:q.points??1,image:q.image,optionImages:q.optionImages};}
export function safeEqualToken(left:string,right:string){return left.length===right.length&&timingSafeEqual(Buffer.from(left),Buffer.from(right));}
