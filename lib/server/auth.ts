import { randomBytes, timingSafeEqual, scrypt } from "node:crypto";
import { prisma } from "@/lib/server/db/client";
import type { User, UserRole } from "@/lib/types";

const SESSION_COOKIE = "kitabca_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TOKEN_BYTES = 32;

function toUser(u: { id: string; name: string; email: string; role: string; active: boolean; passwordHash: string; companyId: string | null; sellerExamIds: string[] }): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    active: u.active,
    passwordHash: u.passwordHash,
    companyId: u.companyId ?? undefined,
    sellerExamIds: u.sellerExamIds ?? [],
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveScrypt(password, salt);
  return `scrypt:16384:8:5:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts=storedHash.split(':');
  const legacy=parts.length===2;
  if(!legacy&&(parts.length!==6||parts.slice(0,4).join(':')!=='scrypt:16384:8:5'))return false;
  const [saltHex,hashHex]=legacy?parts:parts.slice(4);
  if(!/^[a-f0-9]{32}$/.test(saltHex??'')||!/^[a-f0-9]{64}$/.test(hashHex??''))return false;
  const hash=await deriveScrypt(password,Buffer.from(saltHex,'hex'),legacy?1:5);
  return timingSafeEqual(hash,Buffer.from(hashHex,'hex'));
}

function deriveScrypt(password: string, salt: Buffer, parallelism=5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, { N: 16384, r: 8, p: parallelism, maxmem: 64 * 1024 * 1024 }, (err: Error | null, derivedKey: Buffer) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("hex");
}

export async function createSession(userId: string,expectedPasswordHash?:string,replacementHash?:string): Promise<string> {
  const token=generateSessionToken(),expiresAt=new Date(Date.now()+SESSION_TTL_DAYS*86400000);
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user=await tx.user.findUnique({where:{id:userId}});
    if(!user?.active||(expectedPasswordHash&&user.passwordHash!==expectedPasswordHash))throw Error('UNAUTHORIZED');
    if(replacementHash)await tx.user.update({where:{id:userId},data:{passwordHash:replacementHash}});
    await tx.session.create({data:{userId,token,expiresAt}});return token;
  });
}

export async function validateSession(token: string): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }
  if (!session.user.active) return null;
  return toUser(session.user);
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_DAYS * 86400,
    path: "/",
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}