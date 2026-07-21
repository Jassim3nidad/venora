import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative flex h-[85vh] min-h-[600px] w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video 
           autoPlay 
           muted 
           loop 
           playsInline
           className="h-full w-full object-cover opacity-60"
           poster="https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=2000"
        >
          <source src="" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="font-display text-5xl font-black uppercase tracking-widest text-text-primary sm:text-6xl md:text-8xl animate-fade-in">
          Nonchalant Luxury.
        </h1>
        <p className="mt-4 max-w-xl text-lg font-medium text-text-secondary animate-slide-up sm:text-xl">
          Underground Culture. Premium streetwear designed for the few.
        </p>
        <Link
          href="/shop"
          className="mt-8 flex items-center justify-center gap-2 rounded-none border border-brand-500 bg-brand-500 px-8 py-4 text-sm font-bold uppercase tracking-widest text-base transition hover:bg-transparent hover:text-brand-500 animate-slide-up"
        >
          Explore Collection <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
