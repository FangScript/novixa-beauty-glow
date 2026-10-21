import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/db/client";
import { isDatabaseAdmin } from "@/lib/security/identity";

export const SESSION_COOKIE = "novixa_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

export const isSecureCookie = () => process.env.NODE_ENV === "production";

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

      if (session && session.expiresAt > new Date() && isDatabaseAdmin(session.user)) {
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
    secure: isSecureCookie(),
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

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();
  const passwordHash = hashPassword(password);
  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  try {
    // Check if user exists but has no password (e.g. from newsletter subscription)
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    let user: { id: string; email: string; name: string };

    if (existingUser) {
      return {
        ok: false as const,
        error: "An account with this email already exists. Sign in or use account recovery.",
      };
    } else {
      // Create fresh user
      user = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          role: "CUSTOMER",
          emailVerifiedAt: null,
          sessions: {
            create: {
              id: sessionId,
              expiresAt,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_SESSION_COOKIE, rawSession, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });

    return { ok: true as const, user };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false as const, error: "An account with this email already exists." };
    }
    console.error("registerCustomer error:", error);
    return { ok: false as const, error: "Registration failed. Please try again." };
  }
}

export async function loginCustomer(email: string, password: string) {
  if (!databaseConfigured()) {
    return { ok: false as const, error: "Database is not configured." };
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (
    !user ||
    (user.role !== "CUSTOMER" && user.role !== "ADMIN") ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const rawSession = randomBytes(32).toString("base64url");
  const sessionId = hashSession(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  // Parallelize session creation and lastLogin update
  await Promise.all([
    prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } }),
    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => null),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: isSecureCookie(),
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

  try {
    const session = rawSession
      ? await prisma.session.findUnique({
          where: { id: hashSession(rawSession) },
          include: { user: true },
        })
      : null;

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
    } else {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      };
    }
  } catch {
    // Database failures must not authorize a session through another identity source.
  }

  return null;
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
          // Revoke credentials set by an unverified registrant before email verification.
          ...(!byEmail.emailVerifiedAt ? { passwordHash: null, sessions: { deleteMany: {} } } : {}),
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

  return {
    ok: true as const,
    rawSession,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
