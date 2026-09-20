import { NextResponse } from "next/server";

export async function GET() {
  const categories = [
    { id: "perfume", name: "Perfumes", slug: "perfume", count: 12 },
    { id: "makeup", name: "Makeup", slug: "makeup", count: 6 },
    { id: "grooming", name: "Grooming", slug: "grooming", count: 4 },
    { id: "bundle", name: "Bundles", slug: "bundle", count: 4 },
    { id: "accessories", name: "Accessories", slug: "accessories", count: 2 },
  ];

  return NextResponse.json({ categories });
}
