"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center border border-border bg-white/40">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Decrease quantity"
        className="h-8 w-8 rounded-none hover:bg-black/5"
        onClick={() => onChange(quantity - 1)}
      >
        <Minus size={13} />
      </Button>
      <span className="w-8 text-center text-xs font-medium">{quantity}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Increase quantity"
        className="h-8 w-8 rounded-none hover:bg-black/5"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={13} />
      </Button>
    </div>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove item"
      onClick={onClick}
      className="text-muted-foreground hover:text-rosewood"
    >
      <X size={15} />
    </Button>
  );
}
