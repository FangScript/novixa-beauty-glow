import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell, QuantityControl, ProductCard } from "@/components/storefront";
import { formatPrice, getProduct, products, useCommerce } from "@/lib/commerce";
export const Route = createFileRoute("/products/$slug")({ component: ProductDetail });
function ProductDetail() {
  const { slug } = Route.useParams();
  const product = getProduct(slug);
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  if (!product)
    return (
      <PageShell title="Product not found">
        <Link to="/shop" className="mt-8 inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={15} /> Back to shop
        </Link>
      </PageShell>
    );
  const related = products
    .filter(
      (p) =>
        p.id !== product.id && (p.category === product.category || p.gender === product.gender),
    )
    .slice(0, 4);
  return (
    <PageShell eyebrow={product.category} title={product.name}>
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <div className="flex gap-2 sm:w-20 sm:flex-col">
            {product.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setImage(i)}
                className={`aspect-square overflow-hidden border ${image === i ? "border-rosewood" : "border-transparent"}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="aspect-square flex-1 overflow-hidden bg-blush">
            <img
              src={product.images[image]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="lg:py-8">
          <div className="flex items-center gap-1 text-champagne">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={13} fill="currentColor" />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {product.rating} · {product.reviewCount} reviews
            </span>
          </div>
          <p className="mt-5 text-2xl font-semibold">
            {product.salePrice ? (
              <>
                <span className="text-rosewood">{formatPrice(product.salePrice)}</span>{" "}
                <del className="ml-2 text-base font-normal text-muted-foreground">
                  {formatPrice(product.price)}
                </del>
              </>
            ) : (
              formatPrice(product.price)
            )}
          </p>
          <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            {product.description}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-border py-5 text-xs">
            <span>
              In stock: <b>{product.stock}</b>
            </span>
            <span>
              SKU: <b>{product.sku}</b>
            </span>
            {product.fragranceFamily && (
              <span>
                Family: <b>{product.fragranceFamily}</b>
              </span>
            )}
            {product.longevity && (
              <span>
                Longevity: <b>{product.longevity}</b>
              </span>
            )}
          </div>
          <div className="mt-7 flex items-center gap-3">
            <QuantityControl
              quantity={quantity}
              onChange={(n) => setQuantity(Math.max(1, Math.min(product.stock, n)))}
            />
            <Button
              className="h-10 flex-1 rounded-none text-[10px] tracking-[0.14em]"
              disabled={!product.stock}
              onClick={() => addToCart(product.id, quantity)}
            >
              ADD TO CART
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-none"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
            >
              <Heart fill={isWishlisted(product.id) ? "currentColor" : "none"} />
            </Button>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20 border-t border-border pt-10">
          <h2 className="text-3xl">You may also like</h2>
          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
