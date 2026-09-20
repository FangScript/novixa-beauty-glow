import { createFileRoute } from "@tanstack/react-router";
import {
  AdminShell,
  AdminTable,
  AdminToolbar,
  MetricCard,
  TableCell,
  TableHeader,
} from "@/components/admin";
export const Route = createFileRoute("/admin/customers")({ component: AdminCustomers });
const customers = [
  {
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    orders: 8,
    spent: "Rs. 38,492",
    joined: "Aug 2026",
  },
  {
    name: "Mira Shah",
    email: "mira@example.com",
    orders: 5,
    spent: "Rs. 24,995",
    joined: "Jul 2026",
  },
  {
    name: "Arjun Mehta",
    email: "arjun@example.com",
    orders: 3,
    spent: "Rs. 11,897",
    joined: "Sep 2026",
  },
  {
    name: "Zara Ali",
    email: "zara@example.com",
    orders: 11,
    spent: "Rs. 62,840",
    joined: "Jun 2026",
  },
];
function AdminCustomers() {
  return (
    <AdminShell
      title="Customers"
      description="Understand customer value and prepare the account experience for real user data."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total customers" value="1,248" detail="86 new this month" />
        <MetricCard label="Repeat rate" value="42%" detail="+5.2% this quarter" />
        <MetricCard label="Average order" value="Rs. 3,842" detail="Across all customers" />
      </div>
      <div className="mt-8">
        <AdminToolbar placeholder="Search by name or email" />
        <div className="mt-6">
          <AdminTable>
            <TableHeader>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Lifetime value</th>
              <th className="px-4 py-3">Joined</th>
            </TableHeader>
            {customers.map((customer) => (
              <tr key={customer.email} className="border-b border-[#e7ddd5] last:border-0">
                <TableCell>
                  <p className="font-medium">{customer.name}</p>
                  <p className="mt-1 text-[10px] text-[#8f8279]">{customer.email}</p>
                </TableCell>
                <TableCell>{customer.orders}</TableCell>
                <TableCell>{customer.spent}</TableCell>
                <TableCell>{customer.joined}</TableCell>
              </tr>
            ))}
          </AdminTable>
        </div>
      </div>
    </AdminShell>
  );
}
