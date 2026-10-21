import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function readBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ApiError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  limit = 65536,
): Promise<z.infer<T>> {
  const bytes = await readBody(request, limit);
  let input: unknown;
  try {
    input = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new ApiError("Invalid JSON body.");
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      "Invalid request: " +
        parsed.error.issues
          .map((issue) => issue.path.join(".") + " " + issue.message)
          .join("; ")
          .slice(0, 400),
    );
  return parsed.data;
}

export function apiFailure(error: unknown, fallback = "Unable to process this request.") {
  return NextResponse.json(
    { ok: false, error: error instanceof ApiError ? error.message : fallback },
    { status: error instanceof ApiError ? error.status : 500 },
  );
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(256),
});
export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(256),
});

const buckets = new Map<string, { count: number; until: number }>();
/** Per-process defense; production ingress must also enforce distributed rate limits. */
export function limitAttempts(key: string, maximum = 10, now = Date.now()) {
  if (buckets.size >= 10000) {
    for (const [id, entry] of buckets) if (entry.until <= now) buckets.delete(id);
    if (buckets.size >= 10000 && !buckets.has(key))
      throw new ApiError("Please try again shortly.", 429);
  }
  const previous = buckets.get(key);
  const entry = previous && previous.until > now ? previous : { count: 0, until: now + 60000 };
  buckets.set(key, entry);
  if (++entry.count > maximum)
    throw new ApiError("Too many attempts. Please try again in a minute.", 429);
}
