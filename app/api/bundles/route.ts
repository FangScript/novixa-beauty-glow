import { NextResponse } from "next/server";
import { products } from "@/lib/products/catalogue";

export async function GET() {
  const bundles = products.filter(
    (p) => p.category === "bundle" || p.tags.includes("kit"),
  );

  return NextResponse.json({ bundles });
}
