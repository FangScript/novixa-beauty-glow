import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <p className="text-[9px] uppercase tracking-[0.25em] text-rosewood font-semibold">
        404 — Page Not Found
      </p>
      <h1 className="mt-3 font-display text-5xl md:text-6xl text-foreground">
        Lost in Luxury
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
        The fragrance or page you are looking for does not exist or has been relocated to another collection.
      </p>
      <Button asChild className="mt-8 rounded-none bg-ink text-white hover:bg-black px-7 py-5 text-[10px] font-semibold tracking-[0.14em]">
        <Link href="/" className="inline-flex items-center gap-2">
          RETURN HOME <ArrowRight size={14} />
        </Link>
      </Button>
    </div>
  );
}
