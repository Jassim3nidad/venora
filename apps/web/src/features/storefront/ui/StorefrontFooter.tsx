import Link from "next/link";

export default function StorefrontFooter() {
  return (
    <footer className="w-full bg-base py-12 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <Link href="/" className="font-display text-2xl font-black tracking-widest text-text-primary mb-2">
            7SS
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">
            Nonchalant Luxury. Underground Culture.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-center sm:text-left">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-primary mb-2">Shop</h4>
            <Link href="/collections/all" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">All Products</Link>
            <Link href="/collections/season-4" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Season 4</Link>
            <Link href="/collections/accessories" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Accessories</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-primary mb-2">Support</h4>
            <Link href="/faq" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">FAQ</Link>
            <Link href="/shipping" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Shipping & Returns</Link>
            <Link href="/contact" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Contact Us</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-primary mb-2">Legal</h4>
            <Link href="/terms" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Terms of Service</Link>
            <Link href="/privacy" className="text-sm font-bold text-text-secondary transition hover:text-brand-500">Privacy Policy</Link>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl px-4 lg:px-8 mt-12 text-center md:text-left">
        <p className="text-xs font-bold text-text-muted">
          &copy; {new Date().getFullYear()} 7TH SOUTH STREET. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
