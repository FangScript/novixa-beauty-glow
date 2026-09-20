import { products } from "../src/lib/commerce/catalogue";
const count = (key: "category" | "gender") =>
  products.reduce<Record<string, number>>((result, product) => {
    result[product[key]] = (result[product[key]] ?? 0) + 1;
    return result;
  }, {});
console.log(
  JSON.stringify(
    {
      total: products.length,
      category: count("category"),
      gender: count("gender"),
      menPerfumes: products.filter((p) => p.gender === "men" && p.category === "perfume").length,
      womenPerfumes: products.filter((p) => p.gender === "women" && p.category === "perfume")
        .length,
      womenMakeup: products.filter((p) => p.gender === "women" && p.category === "makeup").length,
      menGrooming: products.filter((p) => p.gender === "men" && p.category === "grooming").length,
      womenGrooming: products.filter((p) => p.gender === "women" && p.category === "grooming")
        .length,
    },
    null,
    2,
  ),
);
