import {NextRequest,NextResponse} from 'next/server';
import {requireRole,assertCompanyScope} from '@/lib/server/auth-utils';
import {getUser} from '@/lib/server/db/repositories';
import {issueEnrollment} from '@/lib/server/enrollment';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const actor=await requireRole(req,["admin"]);const {id}=await params;const user=await getUser(id);if(!user)throw Error("NOT_FOUND");assertCompanyScope(actor,user);const token=await issueEnrollment(id);return NextResponse.json({token},{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:'Şifrə qurulması başladılmadı.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:400});}
}
