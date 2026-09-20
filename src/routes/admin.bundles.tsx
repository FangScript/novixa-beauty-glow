import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, AdminStatus, AdminTable, TableCell, TableHeader } from "@/components/admin";
import { listAdminBundles } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/bundles")({ component: AdminBundles });
type Bundle = {
  id: string;
  name: string;
  products: number;
  price: number;
  originalValue: number;
  status: string;
};
function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  useEffect(() => {
    listAdminBundles().then(setBundles);
  }, []);
  return (
    <AdminShell
      title="Bundles"
      description="Review persistent curated offers and bundle savings from the commerce database."
    >
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Bundle</th>
            <th className="px-4 py-3">Included products</th>
            <th className="px-4 py-3">Bundle price</th>
            <th className="px-4 py-3">Original value</th>
            <th className="px-4 py-3">Savings</th>
            <th className="px-4 py-3">Status</th>
          </TableHeader>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium">{bundle.name}</TableCell>
              <TableCell>{bundle.products}</TableCell>
              <TableCell>Rs. {bundle.price.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-[#776a61]">
                Rs. {bundle.originalValue.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-[#567149]">
                {bundle.originalValue
                  ? `${Math.round((1 - bundle.price / bundle.originalValue) * 100)}%`
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
