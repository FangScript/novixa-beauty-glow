import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  copy,
  action = "/shop",
  actionLabel = "CONTINUE SHOPPING",
}: {
  title: string;
  copy: string;
  action?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border border-border/80 bg-white/30 py-20 px-6 text-center backdrop-blur-xs">
      <h2 className="font-display text-3xl tracking-tight text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">{copy}</p>
      <Button
        asChild
        className="mt-7 rounded-none bg-ink text-white hover:bg-black px-6 py-5 text-[10px] font-semibold tracking-[0.14em]"
      >
        <Link href={action} className="inline-flex items-center gap-2">
          {actionLabel} <ArrowRight size={14} />
        </Link>
      </Button>
    </div>
  );
}

export default EmptyState;
