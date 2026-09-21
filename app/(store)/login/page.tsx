"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, UserRound, Lock, Mail, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  invalid_state: "Security validation failed. Please try again.",
  no_code: "Google did not return an authorisation code.",
  token_failed: "Failed to exchange Google authorisation code. Please try again.",
  profile_failed: "Could not retrieve your Google profile. Please try again.",
  no_email: "Your Google account did not provide an email address.",
  db_error: "Account creation failed. Please try again.",
  oauth_failed: "Google sign-in failed. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/account";
  const { user, isLoading: authLoading, login, register } = useCustomerAuth();

  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Show OAuth error messages returned via ?error= param
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(GOOGLE_ERROR_MESSAGES[oauthError] || "Sign-in failed. Please try again.");
    }
  }, [searchParams]);

  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [user, authLoading, router, nextPath]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await login(signInForm.email, signInForm.password);
    if (!result.ok) {
      setError(result.error || "Sign in failed.");
      setIsSubmitting(false);
    } else {
      router.push(nextPath);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (registerForm.password !== registerForm.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (registerForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    const result = await register(registerForm.name, registerForm.email, registerForm.password);
    if (!result.ok) {
      setError(result.error || "Registration failed.");
      setIsSubmitting(false);
    } else {
      router.push(nextPath);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-rosewood" />
      </div>
    );
  }

  return (
    <PageShell eyebrow="Member Portal" title={tab === "signin" ? "Welcome Back" : "Create Account"}>
      <div className="mt-8 grid gap-8 lg:grid-cols-[480px_1fr]">
        {/* Form panel */}
        <div>
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            <button
              id="tab-signin"
              onClick={() => { setTab("signin"); setError(null); }}
              className={`pb-3 pr-6 text-xs uppercase tracking-[0.14em] transition-colors ${
                tab === "signin"
                  ? "border-b-2 border-rosewood text-rosewood font-semibold -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-register"
              onClick={() => { setTab("register"); setError(null); }}
              className={`pb-3 pl-6 text-xs uppercase tracking-[0.14em] transition-colors ${
                tab === "register"
                  ? "border-b-2 border-rosewood text-rosewood font-semibold -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-5 border border-[#c9765d] bg-[#fbf0ec] px-4 py-3 text-xs text-[#8f2d18]">
              {error}
            </div>
          )}

          {/* Google OAuth button */}
          <div className="mt-5">
            <a
              id="google-signin-btn"
              href={`/api/auth/customer/google?next=${encodeURIComponent(nextPath)}`}
              className="flex w-full items-center justify-center gap-3 border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-300"
            >
              {/* Google "G" logo */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="signin-email"
                  required
                  type="email"
                  placeholder="Email address"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-3 text-sm outline-none focus:border-rosewood transition-colors"
                />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="signin-password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-10 text-sm outline-none focus:border-rosewood transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button
                id="signin-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-none bg-ink py-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-black"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Signing in...
                  </span>
                ) : (
                  "Sign In to NOVIXA"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No account?{" "}
                <button
                  type="button"
                  onClick={() => { setTab("register"); setError(null); }}
                  className="text-rosewood underline underline-offset-2 hover:text-foreground"
                >
                  Create one for free
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="relative">
                <UserRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-name"
                  required
                  type="text"
                  placeholder="Full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-3 text-sm outline-none focus:border-rosewood transition-colors"
                />
              </div>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-email"
                  required
                  type="email"
                  placeholder="Email address"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-3 text-sm outline-none focus:border-rosewood transition-colors"
                />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min. 8 characters)"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-10 text-sm outline-none focus:border-rosewood transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-confirm"
                  required
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={registerForm.confirm}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirm: e.target.value })}
                  className="h-11 w-full border border-border bg-white/50 pl-9 pr-10 text-sm outline-none focus:border-rosewood transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button
                id="register-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-none bg-ink py-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-black"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Creating account...
                  </span>
                ) : (
                  "Create My NOVIXA Account"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already a member?{" "}
                <button
                  type="button"
                  onClick={() => { setTab("signin"); setError(null); }}
                  className="text-rosewood underline underline-offset-2 hover:text-foreground"
                >
                  Sign in instead
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Right panel — brand benefits */}
        <div className="hidden lg:flex flex-col justify-center border-l border-border pl-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-rosewood mb-6">
            Member Benefits
          </p>
          <div className="space-y-6">
            {[
              {
                icon: <Sparkles size={18} className="text-rosewood" />,
                title: "Order History & Tracking",
                desc: "Access all your past NOVIXA orders with live status and tracking numbers.",
              },
              {
                icon: <UserRound size={18} className="text-rosewood" />,
                title: "Saved Delivery Addresses",
                desc: "Store multiple delivery destinations for faster, frictionless checkout.",
              },
              {
                icon: <Lock size={18} className="text-rosewood" />,
                title: "Secure & Private",
                desc: "Your account is protected with industry-standard password hashing.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <p className="font-display text-lg text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-8">
            <p className="font-display text-3xl leading-tight text-foreground">
              Your fragrance journey, personalised.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              NOVIXA members get exclusive early access to limited releases and curated scent profiles.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-rosewood" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
