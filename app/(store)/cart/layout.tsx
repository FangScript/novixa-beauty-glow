import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Bag | NOVIXA UK",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
