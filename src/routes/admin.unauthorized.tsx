import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin/unauthorized")({ component: Unauthorized });
function Unauthorized() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f1eb] px-5 text-[#211b18]">
      <section className="max-w-md text-center">
        <p className="font-display text-4xl">NOVIXA</p>
        <p className="mt-8 text-[9px] uppercase tracking-[0.24em] text-[#8f5d48]">
          Access restricted
        </p>
        <h1 className="mt-3 font-display text-5xl">Administrator access required</h1>
        <p className="mt-5 text-sm leading-6 text-[#776a61]">
          Your account does not have the administrator role required to open the commerce console.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild className="rounded-none text-[10px] uppercase">
            <Link to="/admin/login">Admin sign in</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none text-[10px] uppercase">
            <Link to="/">Return to store</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
