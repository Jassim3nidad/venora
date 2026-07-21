import { CatalogProduct } from "../../data/catalog-queries";
import ProductCard from "./ProductCard";

export default function CatalogGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
