import CatalogSkeleton from "@/features/storefront/ui/catalog/CatalogSkeleton";

export default function ShopLoading() {
  return (
    <div className="w-full flex-1 bg-base">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        <CatalogSkeleton />
      </div>
    </div>
  );
}
