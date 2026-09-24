import { CustomerAuthProvider } from "@/lib/auth/customer-context";
import { CommerceProviderBridge } from "@/components/layout/CommerceProviderBridge";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      <CommerceProviderBridge>
        <div className="flex min-h-screen flex-col justify-between">
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </CommerceProviderBridge>
    </CustomerAuthProvider>
  );
}
