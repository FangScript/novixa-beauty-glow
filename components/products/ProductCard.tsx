"use client";

import Link from "next/link";
import { Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type Product } from "@/lib/products/catalogue";
import { useCommerce } from "@/lib/commerce/context";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();
  const wishlisted = isWishlisted(product.id);

  return (
    <article className="group relative flex flex-col justify-between">
      <div>
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-blush/30">
            <img
              src={product.images[0]}
              alt={product.name}
              className="editorial-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {product.badge && (
              <span className="absolute left-3 top-3 bg-background/90 px-2 py-1 text-[8px] font-semibold tracking-[0.1em] backdrop-blur-xs">
                {product.badge}
              </span>
            )}
          </div>
          <h3 className="mt-4 min-h-10 font-display text-lg leading-snug tracking-tight text-foreground transition-colors group-hover:text-rosewood">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-sm font-medium">
          {product.salePrice ? (
            <>
              <span className="text-rosewood font-semibold">{formatPrice(product.salePrice)}</span>{" "}
              <del className="ml-1 text-xs font-normal text-muted-foreground">
                {formatPrice(product.price)}
              </del>
            </>
          ) : (
            <span className="text-foreground">{formatPrice(product.price)}</span>
          )}
        </p>
        <div
          className="my-2.5 flex items-center gap-1 text-champagne"
          aria-label={`${product.rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={11} fill="currentColor" />
          ))}
          <span className="ml-1 text-[10px] text-muted-foreground">({product.reviewCount})</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-none text-[9px] font-semibold tracking-[0.12em] uppercase transition-all hover:bg-ink hover:text-white"
          disabled={!product.stock}
          onClick={() => addToCart(product.id)}
        >
          {product.stock ? "ADD TO BAG" : "OUT OF STOCK"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle wishlist"
          onClick={() => toggleWishlist(product.id)}
          className={`rounded-none border border-border/50 ${wishlisted ? "text-rosewood" : "text-foreground"}`}
        >
          <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
        </Button>
      </div>
    </article>
  );
}

export default ProductCard;
