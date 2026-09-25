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

  if (rawSession) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: hashSession(rawSession) },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date() && session.user.role === "ADMIN") {
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          sessionId: session.id,
        };
      }
      if (session && session.expiresAt <= new Date()) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
    } catch (error) {
      console.error("Failed to authenticate admin session:", error);
    }
  }

  // Fallback: check Supabase auth
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const isAdmin =
        user.user_metadata?.role === "ADMIN" ||
        (process.env.ADMIN_EMAIL && user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
      if (isAdmin) {
        return {
          id: user.id,
          email: user.email || "admin@novixa.com",
          name: user.user_metadata?.name || "Administrator",
          role: "ADMIN" as const,
          sessionId: user.id,
        };
      }
    }
  } catch {}

  return null;
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

// ─── Customer Authentication ────────────────────────────────────────────────

export const CUSTOMER_SESSION_COOKIE = "novixa_customer_session";

export async function registerCustomer(name: string, email: string, password: string) {
  if (!databaseConfigured()) {
    return { ok: false as const, error: "Database is not configured." };
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return { ok: false as const, error: "An account with this email already exists." };
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name } };
}

export async function loginCustomer(email: string, password: string) {
  if (!databaseConfigured()) {
    return { ok: false as const, error: "Database is not configured." };
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || user.role !== "CUSTOMER" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name } };
}

export async function getAuthenticatedCustomer() {
  if (!databaseConfigured()) return null;
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!rawSession) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: hashSession(rawSession) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || session.user.role !== "CUSTOMER") {
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
    };
  } catch {
    return null;
  }
}

export async function logoutCustomer() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (databaseConfigured() && rawSession) {
    try {
      await prisma.session
        .delete({ where: { id: hashSession(rawSession) } })
        .catch(() => undefined);
    } catch {
      // Ignored
    }
  }

  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
  return { ok: true as const };
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

export async function loginWithGoogle(googleId: string, email: string, name: string) {
  if (!databaseConfigured()) {
    return { ok: false as const, error: "Database is not configured." };
  }

  // 1. Try to find by googleId first
  let user = await prisma.user.findUnique({ where: { googleId } });

  // 2. Try to find by email (link existing password account)
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (byEmail) {
      // Link googleId to existing account
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
    }
  }

  // 3. Create new customer account
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        googleId,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(), // Google emails are pre-verified
        lastLoginAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // 4. Create session
  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name } };
}
