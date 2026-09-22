import { getLiveProducts } from "@/lib/products/get-products";
import { ScentFinderClient } from "@/components/scent-finder/ScentFinderClient";

export const metadata = {
  title: "Interactive Scent Finder & Olfactive Concierge",
  description:
    "Discover your signature fragrance with the NOVIXA Scent Finder. Answer 4 sensory questions to unlock your personalized formulation match.",
};

export default async function ScentFinderPage() {
  const allProducts = await getLiveProducts();
  const fragrances = allProducts.filter((p) => p.category === "perfume");

  return <ScentFinderClient fragrances={fragrances} />;
}
