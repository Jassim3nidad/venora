import Link from "next/link";
import { CatalogCategory, ProductAvailability } from "../../data/catalog-queries";

interface CatalogSidebarProps {
  categories: CatalogCategory[];
  currentCategory?: string;
  currentAvailability?: ProductAvailability;
}

export default function CatalogSidebar({ categories, currentCategory, currentAvailability }: CatalogSidebarProps) {
  const getCategoryUrl = (slug: string) => {
    const params = new URLSearchParams();
    if (slug !== "all") params.set("category", slug);
    if (currentAvailability) params.set("availability", currentAvailability);
    return `/shop?${params.toString()}`;
  };

  const getAvailabilityUrl = (status: ProductAvailability | "all") => {
    const params = new URLSearchParams();
    if (currentCategory) params.set("category", currentCategory);
    if (status !== "all") params.set("availability", status);
    return `/shop?${params.toString()}`;
  };

  return (
    <div className="flex w-full flex-col gap-8 md:w-64 shrink-0">
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-text-primary">Categories</h4>
        <ul className="flex flex-col gap-2">
          <li>
            <Link 
              href={getCategoryUrl("all")} 
              className={`text-sm font-bold transition ${!currentCategory ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
            >
              All Products
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link 
                href={getCategoryUrl(cat.slug)} 
                className={`text-sm font-bold transition ${currentCategory === cat.slug ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-text-primary">Availability</h4>
        <ul className="flex flex-col gap-2">
          <li>
            <Link 
              href={getAvailabilityUrl("all")} 
              className={`text-sm font-bold transition ${!currentAvailability ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
            >
              Any Status
            </Link>
          </li>
          <li>
            <Link 
              href={getAvailabilityUrl("available")} 
              className={`text-sm font-bold transition ${currentAvailability === "available" ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
            >
              Available
            </Link>
          </li>
          <li>
            <Link 
              href={getAvailabilityUrl("coming_soon")} 
              className={`text-sm font-bold transition ${currentAvailability === "coming_soon" ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
            >
              Coming Soon
            </Link>
          </li>
          <li>
            <Link 
              href={getAvailabilityUrl("sold_out")} 
              className={`text-sm font-bold transition ${currentAvailability === "sold_out" ? "text-brand-500" : "text-text-secondary hover:text-text-primary"}`}
            >
              Sold Out
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
