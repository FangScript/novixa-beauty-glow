"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { QuantityControl } from "@/components/cart/QuantityControl";
import { ProductCard } from "@/components/products/ProductCard";
import { formatPrice, products, registerLiveProducts, type Product } from "@/lib/products/catalogue";
import { useCommerce } from "@/lib/commerce/context";
import { ProductReviews } from "@/components/products/ProductReviews";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts?: Product[];
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    registerLiveProducts([product, ...(relatedProducts ?? [])]);
  }, [product, relatedProducts]);

  const wishlisted = isWishlisted(product.id);

  const related = (relatedProducts && relatedProducts.length > 0)
    ? relatedProducts
    : products
        .filter(
          (p) =>
            p.id !== product.id && (p.category === product.category || p.gender === product.gender),
        )
        .slice(0, 4);

  return (
    <PageShell eyebrow={product.category} title={product.name}>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {/* Product Gallery */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <div className="flex gap-2 sm:w-20 sm:flex-col">
            {product.images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setActiveImageIndex(i)}
                className={`aspect-square overflow-hidden border transition-all ${
                  activeImageIndex === i
                    ? "border-rosewood ring-1 ring-rosewood"
                    : "border-border/60"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="aspect-square flex-1 overflow-hidden bg-blush/20 border border-border/40">
            <img
              src={product.images[activeImageIndex] ?? product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:py-4">
          <a
            href="#reviews"
            className="inline-flex items-center gap-1 text-champagne hover:opacity-80 transition-opacity"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={13} fill="currentColor" />
            ))}
            <span className="ml-2 text-xs text-muted-foreground underline decoration-dotted">
              {product.rating} · ({product.reviewCount} customer reviews)
            </span>
          </a>

          <p className="mt-5 text-2xl font-medium">
            {product.salePrice ? (
              <>
                <span className="text-rosewood font-semibold">
                  {formatPrice(product.salePrice)}
                </span>{" "}
                <del className="ml-2 text-base font-normal text-muted-foreground">
                  {formatPrice(product.price)}
                </del>
              </>
            ) : (
              <span className="text-foreground">{formatPrice(product.price)}</span>
            )}
          </p>

          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-border py-5 text-xs text-muted-foreground">
            <span>
              Availability:{" "}
              <b className="text-foreground">
                {product.stock > 0 ? `${Math.round(product.stock)} in stock` : "Out of stock"}
              </b>
            </span>
            <span>
              SKU: <b className="text-foreground">{product.sku}</b>
            </span>
            {product.fragranceFamily && (
              <span>
                Fragrance Family: <b className="text-foreground">{product.fragranceFamily}</b>
              </span>
            )}
            {product.longevity && (
              <span>
                Longevity: <b className="text-foreground">{product.longevity}</b>
              </span>
            )}
            {product.shade && (
              <span>
                Shade: <b className="text-foreground">{product.shade}</b>
              </span>
            )}
            {product.finish && (
              <span>
                Finish: <b className="text-foreground">{product.finish}</b>
              </span>
            )}
            {product.coverage && (
              <span>
                Coverage: <b className="text-foreground">{product.coverage}</b>
              </span>
            )}
            {product.skinType && (
              <span>
                Skin Type: <b className="text-foreground">{product.skinType}</b>
              </span>
            )}
          </div>

          {product.topNotes && product.topNotes.length > 0 && (
            <div className="mt-5 space-y-1 text-xs">
              <p className="font-semibold uppercase tracking-wider text-[10px] text-foreground">
                Fragrance Notes:
              </p>
              <p className="text-muted-foreground">
                <strong>Top:</strong> {product.topNotes.join(", ")}
              </p>
              {product.middleNotes && (
                <p className="text-muted-foreground">
                  <strong>Heart:</strong> {product.middleNotes.join(", ")}
                </p>
              )}
              {product.baseNotes && (
                <p className="text-muted-foreground">
                  <strong>Base:</strong> {product.baseNotes.join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <QuantityControl
              quantity={quantity}
              min={0.1}
              onChange={(n) => setQuantity(Math.max(0.1, Math.min(product.stock, n)))}
            />
            <Button
              className="h-11 flex-1 rounded-none bg-ink text-white hover:bg-black text-[10px] font-semibold tracking-[0.14em] uppercase"
              disabled={!product.stock}
              onClick={() => addToCart(product.id, quantity)}
            >
              {product.stock ? "ADD TO BAG" : "OUT OF STOCK"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 rounded-none border-border ${wishlisted ? "text-rosewood" : "text-foreground"}`}
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
            >
              <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
            </Button>
          </div>

          <div className="mt-4">
            <Button
              asChild
              variant="ghost"
              className="rounded-none text-xs text-muted-foreground hover:text-foreground px-0"
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                <ArrowLeft size={14} />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div id="reviews">
        <ProductReviews
          productId={product.id}
          productSlug={product.slug}
          productName={product.name}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-border pt-12">
          <div className="mb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-rosewood">
              Curated Pairing
            </p>
            <h2 className="font-display text-3xl md:text-4xl">You May Also Like</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
