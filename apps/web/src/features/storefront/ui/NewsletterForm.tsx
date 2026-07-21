export default function NewsletterForm() {
  return (
    <section className="w-full bg-base py-24 border-t border-border">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h2 className="font-display text-2xl font-black uppercase tracking-widest text-text-primary mb-4 md:text-3xl">
          Join The Inner Circle
        </h2>
        <p className="text-sm text-text-secondary mb-8">
          Early access to drops, private events, and exclusive archives.
        </p>
        
        <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="ENTER YOUR EMAIL" 
            required
            className="flex-1 rounded-none border border-border bg-base px-4 py-3 text-sm font-bold uppercase tracking-widest text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button 
            type="submit"
            className="rounded-none bg-text-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-base transition hover:bg-brand-500"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
