import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import type { Prisma } from "@prisma/client";

const SESSION_COOKIE = "novixa_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const databaseConfigured = () => Boolean(process.env["DATABASE_URL"]);
const hashSession = (id: string) => createHash("sha256").update(id).digest("hex");
async function dbClient() {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
}
function verifyPassword(password: string, stored: string | null) {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function getAuthenticatedAdmin() {
  if (!databaseConfigured()) return null;
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  const db = await dbClient();
  try {
    const session = await db.session.findUnique({
      where: { id: hashSession(raw) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || session.user.role !== "ADMIN") {
      if (session) await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
      deleteCookie(SESSION_COOKIE, { path: "/" });
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.id,
    };
  } finally {
    await db.$disconnect();
  }
}
export async function loginAdminServer(email: string, password: string) {
  if (!databaseConfigured())
    return {
      ok: false as const,
      error: "Authentication is not configured. Add DATABASE_URL before signing in.",
    };
  const db = await dbClient();
  try {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash))
      return { ok: false as const, error: "Invalid administrator email or password." };
    const rawSession = randomBytes(32).toString("base64url");
    const sessionId = hashSession(rawSession);
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await db.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await db.adminAuditLog.create({ data: { userId: user.id, action: "LOGIN", resource: "AUTH" } });
    setCookie(SESSION_COOKIE, rawSession, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
    return { ok: true as const, admin: { id: user.id, email: user.email, name: user.name } };
  } finally {
    await db.$disconnect();
  }
}
export async function logoutAdminServer() {
  const raw = getCookie(SESSION_COOKIE);
  if (databaseConfigured() && raw) {
    const db = await dbClient();
    try {
      const session = await db.session.findUnique({ where: { id: hashSession(raw) } });
      if (session) {
        await db.adminAuditLog.create({
          data: { userId: session.userId, action: "LOGOUT", resource: "AUTH" },
        });
        await db.session.delete({ where: { id: session.id } });
      }
    } finally {
      await db.$disconnect();
    }
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true as const };
}
export async function recordAdminAuditServer(data: {
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !databaseConfigured()) return { ok: false as const };
  const db = await dbClient();
  try {
    await db.adminAuditLog.create({
      data: {
        userId: admin.id,
        action: data.action,
        resource: data.resource,
        ...(data.resourceId ? { resourceId: data.resourceId } : {}),
        ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
      },
    });
    return { ok: true as const };
  } finally {
    await db.$disconnect();
  }
}
