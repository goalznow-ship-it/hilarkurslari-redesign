import { NextResponse } from "next/server";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static validation(message: string) { return new AppError(message, 400, "VALIDATION_ERROR"); }
  static unauthorized(message: string = "Giriş tələb olunur.") { return new AppError(message, 401, "UNAUTHORIZED"); }
  static forbidden(message: string = "İcazəniz yoxdur.") { return new AppError(message, 403, "FORBIDDEN"); }
  static notFound(message: string = "Tapılmadı.") { return new AppError(message, 404, "NOT_FOUND"); }
  static conflict(message: string) { return new AppError(message, 409, "CONFLICT"); }
  static rateLimited(message: string = "Çox çox cəhd.") { return new AppError(message, 429, "RATE_LIMITED"); }
  static internal(message: string = "Server xətası.") { return new AppError(message, 500, "INTERNAL_ERROR"); }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validasiya xətası", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (error.name === "PrismaClientKnownRequestError") {
      const prismaError = error as Error & { code?: string };
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { success: false, error: "Bu məlumat artıq mövcuddur.", code: "CONFLICT" },
          { status: 409 }
        );
      }
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { success: false, error: "Əlaqəli məlumat tapılmadı.", code: "FOREIGN_KEY_VIOLATION" },
          { status: 400 }
        );
      }
    }

    console.error("Unhandled API error:", error);
    return NextResponse.json(
      { success: false, error: "Server xətası.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  console.error("Unknown error:", error);
  return NextResponse.json(
    { success: false, error: "Server xətası.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

export function validateEnv(): void {
  const required = ["DATABASE_URL", "AUTH_SECRET"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long");
  }
}

export function validateDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
  }
}