import {isSameOrigin} from "./origin";
import { NextRequest } from "next/server";
import { validateSession, getSessionCookieName } from "@/lib/server/auth";
import type { User } from "@/lib/types";

export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;
  return validateSession(token);
}

export async function requireAuth(req: NextRequest): Promise<User> {
  if (!["GET","HEAD","OPTIONS"].includes(req.method) && !isSameOrigin(req)) throw new Error("FORBIDDEN");
  const user = await getCurrentUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(req: NextRequest, roles: string[]): Promise<User> {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<User> {
  const user=await requireRole(req, ["admin"]);
  if(user.companyId)throw new Error("FORBIDDEN");
  return user;
}
export function assertCompanyScope(user:User,record:{companyId?:string|null}){if(user.companyId&&user.companyId!==record.companyId)throw new Error('FORBIDDEN');}
export function companyForWrite(user:User,companyId?:string):string|undefined;
export function companyForWrite(user:User,companyId:string|null|undefined):string|null|undefined;
export function companyForWrite(user:User,companyId?:string|null){if(user.companyId&&companyId&&companyId!==user.companyId)throw new Error('FORBIDDEN');return user.companyId??companyId;}
