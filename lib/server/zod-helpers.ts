import { z } from "zod";

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validasiya xətası";
}