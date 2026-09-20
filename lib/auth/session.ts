import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/db/client";

export const SESSION_COOKIE = "novixa_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export function hashSession(id: string) {
  return createHash("sha256").update(id).digest("hex");
}

export async function getAuthenticatedAdmin() {
  if (!databaseConfigured()) return null;
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawSession) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: hashSession(rawSession) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || session.user.role !== "ADMIN") {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("Failed to authenticate admin session:", error);
    return null;
  }
}

export async function loginAdmin(email: string, password: string) {
  if (!databaseConfigured()) {
    return {
      ok: false as const,
      error: "Authentication is not configured. Add DATABASE_URL before signing in.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "Invalid administrator email or password." };
  }

  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.adminAuditLog.create({
    data: { userId: user.id, action: "LOGIN", resource: "AUTH" },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return {
    ok: true as const,
    admin: { id: user.id, email: user.email, name: user.name },
  };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;

  if (databaseConfigured() && rawSession) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: hashSession(rawSession) },
      });
      if (session) {
        await prisma.adminAuditLog.create({
          data: { userId: session.userId, action: "LOGOUT", resource: "AUTH" },
        });
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
    } catch {
      // Ignored during logout
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  return { ok: true as const };
}
