import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account | NOVIXA UK",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
