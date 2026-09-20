import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, AdminTable, AdminToolbar, TableCell, TableHeader } from "@/components/admin";
export const Route = createFileRoute("/admin/bundles")({ component: AdminBundles });
const bundles = [
  {
    name: "Complete Glam Bundle",
    products: 4,
    price: "Rs. 7,999",
    value: "Rs. 9,297",
    savings: "14%",
    status: "Active",
  },
  {
    name: "Signature Scent Duo",
    products: 2,
    price: "Rs. 8,499",
    value: "Rs. 9,999",
    savings: "15%",
    status: "Active",
  },
  {
    name: "The Soft Glam Edit",
    products: 4,
    price: "Rs. 6,499",
    value: "Rs. 7,399",
    savings: "12%",
    status: "Active",
  },
  {
    name: "Rituals for Two",
    products: 3,
    price: "Rs. 7,299",
    value: "Rs. 8,499",
    savings: "14%",
    status: "Draft",
  },
];
function AdminBundles() {
  return (
    <AdminShell
      title="Bundles"
      description="Create curated offers, select included products, and manage bundle savings."
    >
      <AdminToolbar placeholder="Search bundles" />
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
            <tr key={bundle.name} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium">{bundle.name}</TableCell>
              <TableCell>{bundle.products}</TableCell>
              <TableCell>{bundle.price}</TableCell>
              <TableCell className="text-[#776a61]">{bundle.value}</TableCell>
              <TableCell className="text-[#567149]">{bundle.savings}</TableCell>
              <TableCell>
                <span className="bg-[#e5dfd7] px-2 py-1 text-[9px] uppercase">{bundle.status}</span>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
