import Link from "next/link";
import { CatalogProduct } from "../../data/catalog-queries";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const isAvailable = product.availability === "available";
  const isSoldOut = product.availability === "sold_out";

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-border rounded-sm">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-base/50 flex items-center justify-center text-text-muted text-xs font-bold uppercase tracking-widest">
            No Image
          </div>
        )}

        {product.is_new && (
          <div className="absolute left-3 top-3 bg-base px-2 py-1 text-[10px] font-black uppercase tracking-widest text-text-primary shadow-sm">
            New
          </div>
        )}
        {isSoldOut && (
          <div className="absolute left-3 top-3 bg-red-900 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
            Sold Out
          </div>
        )}
        {!isAvailable && !isSoldOut && (
          <div className="absolute left-3 top-3 bg-brand-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-base shadow-sm">
            Coming Soon
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col">
        {product.category_name && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">
            {product.category_name}
          </p>
        )}
        <h3 className="text-sm font-bold text-text-primary mb-2 line-clamp-1">
          {product.title}
        </h3>
        <p className="font-display font-bold text-brand-500 text-sm">
          ₱{product.base_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </Link>
  );
}
