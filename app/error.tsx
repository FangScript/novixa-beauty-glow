"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <p className="text-[9px] uppercase tracking-[0.25em] text-rosewood font-semibold">
        Experience Interrupted
      </p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl text-foreground">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
        An unexpected error occurred while loading this experience. Please try refreshing.
      </p>
      <Button
        onClick={() => reset()}
        className="mt-8 rounded-none bg-ink text-white hover:bg-black px-7 py-5 text-[10px] font-semibold tracking-[0.14em]"
      >
        TRY AGAIN
      </Button>
    </div>
  );
}
