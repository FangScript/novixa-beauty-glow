import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.novixaretail.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/shop",
          "/shop/*",
          "/products/*",
          "/women",
          "/men",
          "/bundles",
          "/shipping",
          "/returns",
          "/contact",
          "/privacy",
          "/terms",
          "/images/*",
          "/uploads/*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/account",
          "/account/*",
          "/checkout",
          "/checkout/*",
          "/cart",
          "/wishlist",
          "/auth/*",
          "/*?*sort=",
          "/*?*filter=",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/*", "/api/*", "/account/*", "/checkout/*", "/cart", "/wishlist"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
