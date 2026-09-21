import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/db/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const email = user.email?.toLowerCase().trim();
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email?.split("@")[0] ||
        "NOVIXA Member";

      if (email) {
        try {
          // Upsert Prisma user record so relational dependencies (orders, carts) stay linked
          await prisma.user.upsert({
            where: { email },
            update: {
              lastLoginAt: new Date(),
              emailVerifiedAt: user.email_confirmed_at
                ? new Date(user.email_confirmed_at)
                : new Date(),
            },
            create: {
              id: user.id,
              email,
              name,
              role: "CUSTOMER",
              emailVerifiedAt: user.email_confirmed_at
                ? new Date(user.email_confirmed_at)
                : new Date(),
              lastLoginAt: new Date(),
            },
          });
        } catch (dbErr) {
          console.error("Prisma user sync error in Supabase callback:", dbErr);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page or login with error instruction
  return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
}
