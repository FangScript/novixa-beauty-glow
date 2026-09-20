import type { Product } from "./product";

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartEntry = {
  item: CartItem;
  product: Product;
};
