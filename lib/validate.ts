// lib/validate.ts

import { ZodError, ZodSchema } from "zod";
import { ApiError } from "@/lib/auth";

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors
        .map((e) => `${e.path.join(".") || "(root)"}: ${e.message}`)
        .join("; ");
      throw new ApiError(400, message, "VALIDATION_ERROR");
    }
    throw err;
  }
}

export async function parseJsonBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
  return parseOrThrow(schema, json);
}
