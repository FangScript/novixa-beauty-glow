"use client";

import { useState } from "react";
import { AdminShell, AdminStatus, AdminTable, TableCell, TableHeader } from "@/components/admin";

type Bundle = {
  id: string;
  name: string;
  products: number;
  price: number;
  originalValue: number;
  status: string;
};

const initialBundles: Bundle[] = [
  {
    id: "b1",
    name: "Complete Glam Makeup Bundle",
    products: 4,
    price: 7999,
    originalValue: 10496,
    status: "ACTIVE",
  },
  {
    id: "b2",
    name: "Gentleman Grooming Ritual",
    products: 3,
    price: 5999,
    originalValue: 7497,
    status: "ACTIVE",
  },
  {
    id: "b3",
    name: "Duo Luxe Fragrance Wardrobe",
    products: 2,
    price: 8499,
    originalValue: 10498,
    status: "ACTIVE",
  },
  {
    id: "b4",
    name: "Flawless Base & Tool Kit",
    products: 3,
    price: 3899,
    originalValue: 4797,
    status: "ACTIVE",
  },
];

export default function AdminBundlesPage() {
  const [bundles] = useState<Bundle[]>(initialBundles);

  return (
    <AdminShell
      title="Bundles"
      description="Review curated luxury offers and bundle savings from the commerce database."
    >
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Bundle Name</th>
            <th className="px-4 py-3">Included Products</th>
            <th className="px-4 py-3">Bundle Price</th>
            <th className="px-4 py-3">Original Value</th>
            <th className="px-4 py-3">Savings</th>
            <th className="px-4 py-3">Status</th>
          </TableHeader>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{bundle.name}</TableCell>
              <TableCell className="text-[#776a61]">{bundle.products} items</TableCell>
              <TableCell className="font-semibold">Rs. {bundle.price.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-[#776a61] line-through">
                Rs. {bundle.originalValue.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-[#4b6742] font-semibold">
                {bundle.originalValue
                  ? `${Math.round((1 - bundle.price / bundle.originalValue) * 100)}% off`
                  : "—"}
              </TableCell>
              <TableCell>
                <AdminStatus tone={bundle.status === "ACTIVE" ? "positive" : "warning"}>
                  {bundle.status}
                </AdminStatus>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
