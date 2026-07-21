export type Product = {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  isNew?: boolean;
  isSoldOut?: boolean;
};

export const featuredProducts: Product[] = [
  {
    id: "p_1",
    name: "7SS Core Snapback - Charcoal",
    price: "₱1,800",
    category: "Snapbacks",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600&h=800",
    isNew: true,
  },
  {
    id: "p_2",
    name: "Heavyweight Box Fit Tee - Warm Gold",
    price: "₱2,200",
    category: "Shirts",
    image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=600&h=800",
  },
  {
    id: "p_3",
    name: "Underground Fleece Hoodie - Black",
    price: "₱4,500",
    category: "Hoodies",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600&h=800",
  },
  {
    id: "p_4",
    name: "7SS Signature Fitted Cap",
    price: "₱2,000",
    category: "Fitted Caps",
    image: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?auto=format&fit=crop&q=80&w=600&h=800",
    isSoldOut: true,
  },
];

export const currentDrop = {
  title: "SEASON 4: THE ARCHIVE",
  description: "Our most requested pieces, re-engineered for the modern underground. Heavyweight cottons, precision fits, and unapologetic minimalism.",
  releaseDate: "Dropping soon",
  image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200&h=800",
};

export const popUpEvent = {
  name: "7SS Manila Pop-Up",
  location: "Makati City, Philippines",
  date: "2026-11-15T10:00:00+08:00", // ISO date string for countdown
  description: "Join us for an exclusive in-person experience. Limited pieces, early access to Season 4, and live DJ sets.",
};
