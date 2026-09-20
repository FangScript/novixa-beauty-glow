import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessionInput = z.object({ email: z.string().email(), password: z.string().min(8) });

export const getCurrentAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthenticatedAdmin } = await import("./auth.server");
  return getAuthenticatedAdmin();
});

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => sessionInput.parse(data))
  .handler(async ({ data }) => {
    const { loginAdminServer } = await import("./auth.server");
    return loginAdminServer(data.email, data.password);
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutAdminServer } = await import("./auth.server");
  return logoutAdminServer();
});

export const requireAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthenticatedAdmin } = await import("./auth.server");
  const admin = await getAuthenticatedAdmin();
  if (!admin) throw new Response("Unauthorized", { status: 401 });
  return admin;
});

export const recordAdminAudit = createServerFn({ method: "POST" })
  .validator(
    (data: {
      action: string;
      resource: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { recordAdminAuditServer } = await import("./auth.server");
    return recordAdminAuditServer(data);
  });
