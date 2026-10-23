import {versionMetadata} from "@/lib/server/exam-service";
import {recordVersion} from "@/lib/server/version";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/server/db/client";
import {hasAttemptAccess,safeQuestionDTO} from "@/lib/server/student-security";
import {migrationQuestion} from "@/lib/migration-format";
import {z} from "zod";
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!hasAttemptAccess(req,id))return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
 try{const attempt=await prisma.examAttempt.findUnique({where:{id},include:{version:true,exam:true}});if(!attempt)return NextResponse.json({error:"Tapılmadı."},{status:404});
 const metadata=versionMetadata.safeParse(attempt.version.metadata);const historical=metadata.success?metadata.data:attempt.exam;
 const questions=z.array(migrationQuestion).parse(attempt.version.questions);
 return NextResponse.json({revision:recordVersion(attempt.answers),exam:{id:attempt.examId,title:historical.title,subject:historical.subject,durationMin:historical.durationMin,questions:questions.map(safeQuestionDTO)},answers:questions.map((_,i)=>Array.isArray(attempt.answers)?attempt.answers[i]??null:null),expiresAt:attempt.expiredAt});
 }catch{return NextResponse.json({error:"İmtahan yüklənmədi."},{status:500});}
}
