import {NextResponse} from 'next/server';
import {prisma} from '@/lib/server/db/client';
export async function GET(){
 try{
  const [schema]=await prisma.$queryRaw<Array<{ready:boolean}>>`SELECT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name='20261023050000_academic_year_relations' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS ready`;
  if(!schema.ready)throw Error('SCHEMA_NOT_READY');
  return NextResponse.json({status:'healthy'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unhealthy'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
