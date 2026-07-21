import Link from "next/link";
import { currentDrop } from "../data/mock-store";

export default function CampaignSection() {
  return (
    <section className="w-full bg-base py-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 md:flex-row lg:px-8">
        <div className="flex-1 w-full relative overflow-hidden rounded-sm group">
          <img 
            src={currentDrop.image} 
            alt={currentDrop.title} 
            className="w-full h-[500px] object-cover transition-transform duration-700 group-hover:scale-105 grayscale hover:grayscale-0"
          />
        </div>
        <div className="flex-1 flex flex-col items-start text-left">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500 mb-4">
            {currentDrop.releaseDate}
          </p>
          <h2 className="font-display text-4xl font-black uppercase tracking-widest text-text-primary mb-6 md:text-5xl">
            {currentDrop.title}
          </h2>
          <p className="text-lg text-text-secondary mb-8 max-w-md">
            {currentDrop.description}
          </p>
          <Link
            href="/collections/season-4"
            className="inline-flex items-center justify-center border-b border-text-primary pb-1 text-sm font-bold uppercase tracking-widest text-text-primary transition hover:border-brand-500 hover:text-brand-500"
          >
            Preview Collection
          </Link>
        </div>
      </div>
    </section>
  );
}
