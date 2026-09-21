"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, UserRound, Lock, Mail, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";

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
