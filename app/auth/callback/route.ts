import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import prisma from "@/lib/db/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  // Resolve public domain safely (prevent internal Docker 0.0.0.0:8080 leaking to users)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";

  let publicBaseUrl = process.env.APP_URL || "https://www.novixaretail.com";
  if (
    host &&
    !host.includes("0.0.0.0") &&
    !host.includes("127.0.0.1") &&
    !host.includes("localhost")
  ) {
    publicBaseUrl = `${proto}://${host}`;
  }

  if (code) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://macpycxntatdcsxvckmr.supabase.co";
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_nOsrXBUwXTnAC-jZv_sa6g_BcwTK0QY";

    const response = NextResponse.redirect(`${publicBaseUrl}${next}`);

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("cookie") ?? "";
          if (!cookieHeader) return [];
          return cookieHeader.split("; ").map((cookie) => {
            const [name, ...rest] = cookie.split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        const user = data.user;
        const email = user.email?.toLowerCase().trim();
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email?.split("@")[0] ||
          "NOVIXA Member";

        if (email) {
          try {
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

        return response;
      } else if (error) {
        console.error("Supabase exchangeCodeForSession failed:", error);
      }
    } catch (err) {
      console.error("Auth callback exception:", err);
    }
  }

  return NextResponse.redirect(`${publicBaseUrl}/login?error=auth_exchange_failed`);
}

