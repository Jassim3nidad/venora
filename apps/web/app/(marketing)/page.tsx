import HeroSection from "@/features/storefront/ui/HeroSection";
import CampaignSection from "@/features/storefront/ui/CampaignSection";
import PopUpCountdown from "@/features/storefront/ui/PopUpCountdown";
import ProductGrid from "@/features/storefront/ui/ProductGrid";
import BrandStory from "@/features/storefront/ui/BrandStory";
import NewsletterForm from "@/features/storefront/ui/NewsletterForm";

export default function MarketingHomePage() {
  return (
    <div className="flex w-full flex-col">
      <HeroSection />
      <CampaignSection />
      <PopUpCountdown />
      <ProductGrid />
      <BrandStory />
      <NewsletterForm />
    </div>
  );
}
