import { NextResponse } from "next/server";
import { products, searchProducts, type ProductCategory } from "@/lib/products/catalogue";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category") as ProductCategory | null;
  const gender = searchParams.get("gender");

  let list = q ? searchProducts(q) : products;

  if (category && category !== ("all" as ProductCategory)) {
    list = list.filter((p) => p.category === category);
  }

  if (gender && gender !== "all") {
    list = list.filter((p) => p.gender === gender);
  }

  return NextResponse.json({
    total: list.length,
    products: list,
  });
}
