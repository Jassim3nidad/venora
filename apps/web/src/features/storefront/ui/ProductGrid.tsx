import Link from "next/link";
import { featuredProducts } from "../data/mock-store";

export default function ProductGrid() {
  return (
    <section className="w-full bg-base py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center mb-12 text-center">
          <h2 className="font-display text-3xl font-black uppercase tracking-widest text-text-primary md:text-4xl">
            Latest Arrivals
          </h2>
          <Link
            href="/shop"
            className="mt-4 border-b border-text-secondary pb-1 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary transition hover:border-brand-500 hover:text-brand-500"
          >
            View All Products
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="group flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-border">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                {product.isNew && (
                  <div className="absolute left-3 top-3 bg-base px-2 py-1 text-[10px] font-black uppercase tracking-widest text-text-primary">
                    New
                  </div>
                )}
                {product.isSoldOut && (
                  <div className="absolute left-3 top-3 bg-red-900 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Sold Out
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col items-center text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">
                  {product.category}
                </p>
                <h3 className="text-sm font-bold text-text-primary mb-2">
                  {product.name}
                </h3>
                <p className="font-display font-bold text-brand-500">
                  {product.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
