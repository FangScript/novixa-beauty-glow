"use client";

import { useMemo } from "react";
import { Sparkles, Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products/catalogue";
import { useCommerce } from "@/lib/commerce/context";

export type DynamicBundle = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalValue: number;
  status: string;
  savings?: number;
  products?: number;
  items: Array<{
    productId: string;
    quantity: number;
    name: string;
    image: string;
  }>;
};

export function BundleCard({ bundle }: { bundle: DynamicBundle }) {
  const { addToCart } = useCommerce();

  const savingsPct = useMemo(() => {
    if (bundle.savings !== undefined) return bundle.savings;
    if (bundle.originalValue > bundle.price) {
      return Math.round((1 - bundle.price / bundle.originalValue) * 100);
    }
    return 0;
  }, [bundle]);

  const handleAddBundle = () => {
    if (bundle.items.length === 0) {
      toast.info(`Bundle "${bundle.name}" is currently being curated.`);
      return;
    }

    bundle.items.forEach((item) => {
      addToCart(item.productId, item.quantity || 1);
    });

    toast.success(`"${bundle.name}" set (${bundle.items.length} items) added to your shopping bag.`);
  };

  return (
    <article className="border border-[#d9cec5] bg-white/70 p-6 flex flex-col justify-between transition-all hover:border-[#8f5d48] hover:shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 bg-[#8f5d48]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8f5d48]">
            <Sparkles size={10} />
            Exclusive Bundle
          </span>
          {savingsPct > 0 && (
            <span className="bg-[#4b6742] text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Save {savingsPct}%
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-2xl text-[#211b18]">{bundle.name}</h3>
        {bundle.description && (
          <p className="mt-2 text-xs text-[#776a61] line-clamp-2 leading-relaxed">
            {bundle.description}
          </p>
        )}

        {/* Thumbnail Preview of Included Items */}
        {bundle.items.length > 0 && (
          <div className="mt-4 border-t border-[#f0eae4] pt-4">
            <p className="text-[10px] uppercase tracking-wider text-[#776a61] mb-2">
              Includes {bundle.items.length} Curated Essentials:
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {bundle.items.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="flex items-center gap-1.5 bg-[#fbf9f7] border border-[#e8dfd8] px-2 py-1 text-[11px] shrink-0"
                >
                  <img
                    src={item.image || "/images/product-perfume.jpg"}
                    alt={item.name}
                    className="h-6 w-6 object-cover"
                  />
                  <span className="max-w-[130px] truncate text-[#211b18]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-5 flex items-baseline gap-2.5">
          <span className="font-display text-2xl font-semibold text-[#211b18]">
            {formatPrice(bundle.price)}
          </span>
          {bundle.originalValue > bundle.price && (
            <del className="text-xs text-[#8f8279] line-through">
              {formatPrice(bundle.originalValue)}
            </del>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#f0eae4]">
        <Button
          onClick={handleAddBundle}
          className="w-full rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em] py-5 font-semibold"
        >
          <ShoppingBag size={13} className="mr-2" />
          Add Complete Set to Bag
        </Button>
      </div>
    </article>
  );
}
