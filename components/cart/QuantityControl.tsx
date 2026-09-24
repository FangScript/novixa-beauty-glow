"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function QuantityControl({
  quantity,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  quantity: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [val, setVal] = useState<string>(String(quantity));

  useEffect(() => {
    setVal(String(quantity));
  }, [quantity]);

  const commitChange = (num: number) => {
    let next = Math.round(num * 100) / 100;
    if (next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next);
  };

  const handleBlur = () => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < min) {
      commitChange(min > 0 ? min : 1);
    } else {
      commitChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center border border-border bg-white/40">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Decrease quantity"
        className="h-8 w-8 rounded-none hover:bg-black/5 text-foreground"
        onClick={() => commitChange(quantity - (quantity <= 1 && quantity > 0.5 ? 0.5 : step))}
      >
        <Minus size={13} />
      </Button>
      <input
        type="number"
        step="any"
        min={min}
        max={max}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-12 text-center text-xs font-medium bg-transparent outline-none border-x border-border/40 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Increase quantity"
        className="h-8 w-8 rounded-none hover:bg-black/5 text-foreground"
        onClick={() => commitChange(quantity + (quantity < 1 ? 0.5 : step))}
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
