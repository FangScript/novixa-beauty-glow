import { CommerceProvider } from "@/lib/commerce/context";
import { CustomerAuthProvider } from "@/lib/auth/customer-context";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      <CommerceProvider>
        <div className="flex min-h-screen flex-col justify-between">
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </CommerceProvider>
    </CustomerAuthProvider>
  );
}

